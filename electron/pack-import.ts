import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import * as yauzl from "yauzl";

function target(root: string, name: string) {
  if (!name || name.includes("\\") || name.startsWith("/") || name.includes(":")) throw new Error(`Недопустимый путь: ${name}`);
  const parts = name.split("/");
  if (parts.some(p => p === ".." || p === "." || (p === "" && parts.at(-1) !== ""))) throw new Error(`Недопустимый путь: ${name}`);
  const result = resolve(root, name);
  if (!result.startsWith(resolve(root) + sep)) throw new Error(`Недопустимый путь: ${name}`);
  return result;
}

async function unpack(file: string, destination: string, mrpack: boolean) {
  const zip = await new Promise<yauzl.ZipFile>((resolveZip, reject) => yauzl.open(file, { lazyEntries: true, validateEntrySizes: true }, (err, z) => err || !z ? reject(err) : resolveZip(z)));
  let count = 0, size = 0;
  await new Promise<void>((done, reject) => {
    zip.on("error", reject);
    zip.on("end", done);
    zip.on("entry", async (entry: yauzl.Entry) => {
      try {
        if (++count > 20000 || (size += entry.uncompressedSize) > 2 * 1024 ** 3) throw new Error("Архив слишком большой");
        if ((entry.externalFileAttributes >>> 16 & 0o170000) === 0o120000) throw new Error("Символические ссылки в архиве запрещены");
        const name = entry.fileName;
        let relative = name;
        if (mrpack) {
          if (name === "modrinth.index.json") relative = name;
          else if (name.startsWith("overrides/")) relative = name.slice(10);
          else if (name.startsWith("client-overrides/")) relative = name.slice(17);
          else { zip.readEntry(); return; }
        }
        if (!relative) { zip.readEntry(); return; }
        const output = target(destination, relative);
        if (name.endsWith("/")) await mkdir(output, { recursive: true });
        else {
          await mkdir(dirname(output), { recursive: true });
          const stream = await new Promise<NodeJS.ReadableStream>((res, rej) => zip.openReadStream(entry, (err, input) => err || !input ? rej(err) : res(input)));
          await pipeline(stream, createWriteStream(output, { flags: "wx" }));
        }
        zip.readEntry();
      } catch (error) { zip.close(); reject(error); }
    });
    zip.readEntry();
  });
}

export async function importPack(file: string, instances: string, onProgress: (message: string) => void) {
  const mrpack = file.toLowerCase().endsWith(".mrpack");
  if (!mrpack && !file.toLowerCase().endsWith(".zip")) throw new Error("Поддерживаются только .mrpack и .zip");
  await mkdir(instances, { recursive: true });
  const folder = await mkdtemp(join(instances, "import-"));
  try {
    onProgress("Распаковка архива...");
    await unpack(file, folder, mrpack);
    if (!mrpack) return { folder, name: basename(file), message: "ZIP распакован. Проверьте структуру папок; версию игры и загрузчик нужно установить вручную." };
    const index = JSON.parse(await readFile(join(folder, "modrinth.index.json"), "utf8"));
    if (index.formatVersion !== 1 || index.game !== "minecraft" || !Array.isArray(index.files) || index.files.length > 20000) throw new Error("Некорректный формат Modrinth");
    for (const [i, item] of index.files.entries()) {
      if (item.env?.client === "unsupported") continue;
      if (!item.hashes?.sha512 || !/^[a-f0-9]{128}$/i.test(item.hashes.sha512) || !Array.isArray(item.downloads)) throw new Error("Нет безопасной проверки файла сборки");
      const output = target(folder, item.path);
      const url = item.downloads.find((u: unknown) => typeof u === "string" && /^https:\/\/cdn\.modrinth\.com\//i.test(u));
      if (!url) throw new Error(`Неподдерживаемый источник: ${item.path}`);
      onProgress(`Скачивание ${i + 1}/${index.files.length}: ${item.path}`);
      const response = await fetch(url, { signal: AbortSignal.timeout(120000), redirect: "error" });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${item.path}`);
      if (!Number.isSafeInteger(item.fileSize) || item.fileSize < 0 || item.fileSize > 256 * 1024 ** 2) throw new Error("Недопустимый размер файла");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Пустой ответ сервера");
      const chunks: Buffer[] = []; let length = 0;
      while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > item.fileSize) { await reader.cancel(); throw new Error("Размер файла не совпадает"); } chunks.push(Buffer.from(value)); }
      const data = Buffer.concat(chunks);
      if (length !== item.fileSize || createHash("sha512").update(data).digest("hex") !== item.hashes.sha512.toLowerCase()) throw new Error(`Ошибка проверки SHA-512: ${item.path}`);
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, data, { flag: "wx" });
    }
    return { folder, name: String(index.name || basename(file)), dependencies: index.dependencies, message: "Файлы сборки скачаны." };
  } catch (error) { await rm(folder, { recursive: true, force: true }); throw error; }
}
