import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type LoaderType = "vanilla" | "fabric" | "forge" | "neoforge";

export interface LoaderVersion {
  id: string;
  stable?: boolean;
}

const FABRIC_META = "https://meta.fabricmc.net/v2";
const FORGE_MAVEN = "https://maven.minecraftforge.net/net/minecraftforge/forge";
const NEOFORGE_MAVEN = "https://maven.neoforged.net/releases/net/neoforged/neoforge";
const TIMEOUT = 20000;

async function getMetadata(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`Превышено время ожидания: ${url}`));
        }, TIMEOUT);
      });
      const response = await Promise.race([fetch(url, { signal: controller.signal }), timeout]);
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) throw new Error(`HTTP ${response.status}: ${url}`);
        lastError = new Error(`HTTP ${response.status}: ${url}`);
        continue;
      }
      return response;
    } catch (error) {
      if (error instanceof Error && /^HTTP 4(?!29)/.test(error.message)) throw error;
      lastError = error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Не удалось получить данные ${url}: ${detail}`);
}

async function getJson<T>(url: string): Promise<T> {
  return (await getMetadata(url)).json() as Promise<T>;
}

function validateVersion(value: string, label: string): void {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/.test(value) || value.includes("..")) {
    throw new Error(`Недопустимая ${label}`);
  }
}

export async function listLoaderVersions(
  type: LoaderType,
  minecraftVersion: string
): Promise<LoaderVersion[]> {
  validateVersion(minecraftVersion, "версия Minecraft");
  if (!["vanilla", "fabric", "forge", "neoforge"].includes(type)) throw new Error("Неизвестный загрузчик");
  if (type === "vanilla") return [{ id: "vanilla", stable: true }];
  if (type === "fabric") {
    const list = await getJson<Array<{ loader: { version: string; stable: boolean } }>>(
      `${FABRIC_META}/versions/loader/${encodeURIComponent(minecraftVersion)}`
    );
    return list.map(({ loader }) => ({ id: loader.version, stable: loader.stable }));
  }

  if (type === "forge") {
    const url = `${FORGE_MAVEN}/maven-metadata.xml`;
    const xml = await (await getMetadata(url)).text();
    if (!xml) throw new Error("Forge вернул пустой список версий");
    const versions = [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
      .map((match) => match[1]!)
      .filter((value) => value.startsWith(`${minecraftVersion}-`))
      .map((value) => value.slice(minecraftVersion.length + 1))
      .filter((value) => !value.toLowerCase().includes("alpha"));
    return versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map((id) => ({ id, stable: true }));
  }

  const legacy = minecraftVersion === "1.20.1";
  const match = /^1\.(\d+)(?:\.(\d+))?$/.exec(minecraftVersion);
  const modern = /^(\d{2,})\.(\d+)(?:\.(\d+))?$/.exec(minecraftVersion);
  if (!legacy && !match && !modern) return [];
  const artifact = legacy ? "forge" : "neoforge";
  const { versions } = await getJson<{ versions: string[] }>(
    `https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/${artifact}`
  );
  const prefix = legacy ? "1.20.1-" : match ? `${match[1]}.${match[2] ?? "0"}.` : `${modern![1]}.${modern![2]}.${modern![3] ?? "0"}.`;
  return versions
    .filter((version) => version.startsWith(prefix))
    .map((version) => ({ id: legacy ? version.slice(prefix.length) : version, stable: !/-(?:alpha|beta|rc)/i.test(version) }))
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
}

function installerUrl(type: Exclude<LoaderType, "vanilla">, mcVersion: string, loaderVersion: string) {
  if (type === "fabric") {
    return `${FABRIC_META}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`;
  }
  if (type === "forge") {
    const full = `${mcVersion}-${loaderVersion}`;
    return `${FORGE_MAVEN}/${full}/forge-${full}-installer.jar`;
  }
  if (mcVersion === "1.20.1") {
    const full = `${mcVersion}-${loaderVersion}`;
    return `https://maven.neoforged.net/releases/net/neoforged/forge/${full}/forge-${full}-installer.jar`;
  }
  return `${NEOFORGE_MAVEN}/${encodeURIComponent(loaderVersion)}/neoforge-${encodeURIComponent(loaderVersion)}-installer.jar`;
}

export function installedLoaderId(type: LoaderType, mcVersion: string, loaderVersion: string) {
  if (type === "fabric") return `${mcVersion}-fabric-loader-${loaderVersion}`;
  if (type === "forge") return `${mcVersion}-forge-${loaderVersion}`;
  if (type === "neoforge") return mcVersion === "1.20.1" ? `${mcVersion}-forge-${loaderVersion}` : `neoforge-${loaderVersion}`;
  return mcVersion;
}

export async function installLoader(
  type: LoaderType,
  mcVersion: string,
  loaderVersion: string,
  root: string,
  onLog: (line: string) => void,
  signal?: AbortSignal,
  javaPath?: string
): Promise<string> {
  validateVersion(mcVersion, "версия Minecraft");
  if (!["vanilla", "fabric", "forge", "neoforge"].includes(type)) throw new Error("Неизвестный загрузчик");
  if (type === "vanilla") return mcVersion;
  validateVersion(loaderVersion, "версия загрузчика");
  signal?.throwIfAborted();
  const id = installedLoaderId(type, mcVersion, loaderVersion);
  const versionsDir = join(root, "versions");
  const versionFile = join(versionsDir, id, `${id}.json`);
  if (existsSync(versionFile)) return id;
  mkdirSync(versionsDir, { recursive: true });

  if (type === "fabric") {
    onLog(`Получаю профиль Fabric ${loaderVersion} для Minecraft ${mcVersion}...`);
    const response = await fetch(installerUrl(type, mcVersion, loaderVersion), {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT)]) : AbortSignal.timeout(TIMEOUT),
    });
    if (!response.ok) throw new Error(`Не удалось получить профиль Fabric: HTTP ${response.status}`);
    const profile = await response.json() as Record<string, unknown>;
    profile.id = id;
    profile.inheritsFrom = mcVersion;
    mkdirSync(join(versionsDir, id), { recursive: true });
    writeFileSync(versionFile, JSON.stringify(profile, null, 2), "utf8");
    return id;
  }

  const url = installerUrl(type, mcVersion, loaderVersion);
  onLog(`Скачиваю установщик ${type} ${loaderVersion}...`);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT)]) : AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error(`Установщик ${type}: HTTP ${response.status}`);
  const installerPath = join(root, "installers", `${type}-${loaderVersion}-installer.jar`);
  mkdirSync(join(root, "installers"), { recursive: true });
  writeFileSync(installerPath, Buffer.from(await response.arrayBuffer()));

  onLog(`Устанавливаю ${type} в ${root}...`);
  await new Promise<void>((resolve, reject) => {
    const args = ["-jar", installerPath, "--installClient", root];
    const child = spawn(javaPath || "java", args, { windowsHide: true });
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => onLog(String(chunk).trim()));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += String(chunk);
      onLog(String(chunk).trim());
    });
    const abort = () => child.kill();
    signal?.addEventListener("abort", abort, { once: true });
    child.on("error", (error) => reject(new Error(`Не удалось запустить Java: ${error.message}`)));
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) return reject(new DOMException("Загрузка отменена", "AbortError"));
      if (code !== 0) return reject(new Error(`${type} installer завершился с кодом ${code}: ${stderr.slice(-1000)}`));
      resolve();
    });
  });

  if (!existsSync(versionFile)) throw new Error(`${type} установился, но профиль версии не найден`);
  return id;
}
