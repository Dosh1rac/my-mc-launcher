import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

type Kind = "mod" | "shader" | "resourcepack" | "datapack";
const kinds: Kind[] = ["mod", "shader", "resourcepack", "datapack"];
const headers = { "User-Agent": "VOID-Launcher/1.0 (Minecraft launcher)" };

async function api(path: string): Promise<any> {
  const response = await fetch(`https://api.modrinth.com/v2${path}`, { headers, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Modrinth: HTTP ${response.status}`);
  return response.json();
}

function validate(kind: Kind, game: string, loader: string) {
  if (!kinds.includes(kind) || typeof game !== "string" || !/^[\w.+-]{1,80}$/.test(game)) throw new Error("Неверный тип или версия игры");
  if (!["vanilla", "fabric", "forge", "neoforge"].includes(loader)) throw new Error("Неизвестный загрузчик");
}

export async function searchContent(kind: Kind, query: string, game: string, loader: string, offset = 0) {
  validate(kind, game, loader);
  if (typeof query !== "string" || query.length > 200) throw new Error("Некорректный поиск");
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000) throw new Error("Недопустимая страница");
  const facets = [[`project_type:${kind}`], [`versions:${game}`]];
  if (kind === "mod" && loader !== "vanilla") facets.push([`categories:${loader}`]);
  const params = new URLSearchParams({ query, facets: JSON.stringify(facets), limit: "30", offset: String(offset) });
  const result = await api(`/search?${params}`);
  return { total: result.total_hits, hits: result.hits.map((hit: any) => ({ id: hit.project_id, title: hit.title, description: hit.description, downloads: hit.downloads, author: hit.author, icon: hit.icon_url, categories: hit.categories })) };
}

export async function installedContent(root: string, kind: Kind, world?: string): Promise<string[]> {
  if (!kinds.includes(kind)) throw new Error("Неизвестный тип содержимого");
  if (kind === "datapack" && (!world || !(await listWorlds(root)).includes(world))) return [];
  let records: Record<string, { kind: string; world?: string; path: string }>;
  try { records = JSON.parse(await readFile(join(root, ".void-content.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const result: string[] = [];
  for (const [id, record] of Object.entries(records)) {
    if (record.kind !== kind || (kind === "datapack" && record.world !== world)) continue;
    if (!record.path || basename(record.path) !== record.path) continue;
    const folder = kind === "datapack" ? join(root, "saves", world!, "datapacks") : join(root, { mod: "mods", shader: "shaderpacks", resourcepack: "resourcepacks" }[kind]);
    try { if ((await stat(join(folder, record.path))).isFile()) result.push(id); } catch { /* removed */ }
  }
  return result;
}

export async function listWorlds(root: string) {
  try {
    const entries = await readdir(join(root, "saves"), { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function installContent(root: string, kind: Kind, project: string, game: string, loader: string, world?: string) {
  validate(kind, game, loader);
  if (typeof project !== "string" || !/^[A-Za-z0-9]{8}$/.test(project)) throw new Error("Некорректный проект");
  if (kind === "mod" && loader === "vanilla") throw new Error("Для модов выберите загрузчик");
  const params = new URLSearchParams({ game_versions: JSON.stringify([game]) });
  if (kind === "mod") params.set("loaders", JSON.stringify([loader]));
  if (kind === "shader") params.set("loaders", JSON.stringify(["iris", "optifine"]));
  if (kind === "resourcepack") params.set("loaders", JSON.stringify(["minecraft"]));
  if (kind === "datapack") params.set("loaders", JSON.stringify(["datapack"]));
  const versions = await api(`/project/${project}/version?${params}`);
  const version = versions.find((v: any) => v.files?.some((f: any) => f.primary && f.hashes?.sha512)) ?? versions.find((v: any) => v.files?.some((f: any) => f.hashes?.sha512));
  if (!version) throw new Error("Совместимая версия с проверочной суммой не найдена");
  const file = version.files.find((f: any) => f.primary && f.hashes?.sha512) ?? version.files.find((f: any) => f.hashes?.sha512);
  const name = file.filename;
  if (typeof name !== "string" || basename(name) !== name || !new RegExp(kind === "mod" ? "\\.jar$" : "\\.zip$", "i").test(name)) throw new Error("Недопустимое имя файла");
  let directory: string;
  if (kind === "datapack") {
    if (!world || !(await listWorlds(root)).includes(world)) throw new Error("Выберите существующий мир");
    const saves = await realpath(join(root, "saves"));
    const worldPath = await realpath(join(saves, world));
    if (dirname(worldPath) !== saves) throw new Error("Недопустимая папка мира");
    directory = join(worldPath, "datapacks");
  } else directory = join(root, { mod: "mods", shader: "shaderpacks", resourcepack: "resourcepacks" }[kind]);
  const url = new URL(file.url);
  if (url.protocol !== "https:" || url.hostname !== "cdn.modrinth.com") throw new Error("Недопустимый адрес файла");
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(120000), redirect: "error" });
  if (!response.ok) throw new Error(`Ошибка скачивания: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 256 * 1024 * 1024 || createHash("sha512").update(bytes).digest("hex") !== file.hashes.sha512) throw new Error("Размер или SHA-512 файла не совпадает");
  await mkdir(directory, { recursive: true });
  const tempDir = await mkdtemp(join(directory, ".void-"));
  try {
    const temp = join(tempDir, "download");
    await writeFile(temp, bytes);
    await copyFile(temp, resolve(directory, name), constants.COPYFILE_EXCL);
  } finally { await rm(tempDir, { recursive: true, force: true }); }
  const manifest = join(root, ".void-content.json");
  let records: Record<string, unknown> = {};
  try { records = JSON.parse(await readFile(manifest, "utf8")); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  records[project] = { kind, world, path: name };
  await writeFile(manifest, JSON.stringify(records, null, 2), "utf8");
  const dependencies = (version.dependencies ?? []).filter((d: any) => d.dependency_type === "required").length;
  return { name, dependencies };
}
