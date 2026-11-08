import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, rename } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as yauzl from "yauzl";

export async function installJava(root: string, major: number, progress: (text: string) => void): Promise<string> {
  if (process.platform !== "win32" || process.arch !== "x64") throw new Error("Автоустановка доступна только для Windows x64");
  if (![8, 17, 21, 25].includes(major)) throw new Error("Неподдерживаемая версия Java");
  progress("Получаю сведения о Java от Adoptium...");
  const metadata = await fetch(`https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=x64&image_type=jre&os=windows&vendor=eclipse`, { signal: AbortSignal.timeout(30000) });
  if (!metadata.ok) throw new Error(`Adoptium: HTTP ${metadata.status}`);
  const assets = await metadata.json() as any[];
  const pkg = assets[0]?.binary?.package;
  if (!pkg || typeof pkg.link !== "string" || !/^https:\/\/github\.com\/adoptium\//.test(pkg.link) || !/^[a-f0-9]{64}$/i.test(pkg.checksum) || !Number.isSafeInteger(pkg.size) || pkg.size <= 0 || pkg.size > 300 * 1024 * 1024) throw new Error("Некорректные сведения об архиве Java");
  await mkdir(root, { recursive: true });
  const work = await mkdtemp(join(root, ".download-"));
  try {
    progress(`Скачиваю Java ${major}...`);
    const response = await fetch(pkg.link, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error(`Ошибка скачивания Java: HTTP ${response.status}`);
    const reader = response.body.getReader(); const chunks: Buffer[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > pkg.size) { await reader.cancel(); throw new Error("Размер архива Java не совпадает"); } chunks.push(Buffer.from(value)); progress(`Java ${major}: ${Math.round(size / pkg.size * 100)}%`); }
    const data = Buffer.concat(chunks);
    if (size !== pkg.size || createHash("sha256").update(data).digest("hex") !== pkg.checksum.toLowerCase()) throw new Error("Проверка SHA-256 архива Java не пройдена");
    const archive = join(work, "java.zip"); await import("node:fs/promises").then(fs => fs.writeFile(archive, data));
    const output = join(work, "runtime"); await mkdir(output);
    progress("Распаковываю Java...");
    const zip = await new Promise<yauzl.ZipFile>((res, rej) => yauzl.open(archive, { lazyEntries: true, validateEntrySizes: true }, (err, file) => err || !file ? rej(err) : res(file)));
    let count = 0, total = 0;
    await new Promise<void>((res, rej) => {
      zip.on("error", rej); zip.on("end", res);
      zip.on("entry", async (entry: yauzl.Entry) => {
        try {
          const name = entry.fileName;
          if (++count > 20000 || (total += entry.uncompressedSize) > 1024 ** 3 || name.includes("\\") || name.includes(":") || name.startsWith("/") || name.split("/").some(p => p === ".." || p === ".") || (entry.externalFileAttributes >>> 16 & 0o170000) === 0o120000) throw new Error("Недопустимое содержимое архива Java");
          const dest = resolve(output, name);
          if (!dest.startsWith(resolve(output) + sep)) throw new Error("Недопустимый путь в архиве Java");
          if (name.endsWith("/")) await mkdir(dest, { recursive: true });
          else { await mkdir(join(dest, ".."), { recursive: true }); const input = await new Promise<NodeJS.ReadableStream>((r, j) => zip.openReadStream(entry, (e, stream) => e || !stream ? j(e) : r(stream))); await pipeline(input, createWriteStream(dest, { flags: "wx" })); }
          zip.readEntry();
        } catch (error) { zip.close(); rej(error); }
      }); zip.readEntry();
    });
    const dirs = (await readdir(output, { withFileTypes: true })).filter(e => e.isDirectory());
    if (dirs.length !== 1) throw new Error("Не найдена папка Java в архиве");
    const java = join(output, dirs[0]!.name, "bin", "java.exe");
    await promisify(execFile)(java, ["-version"], { timeout: 15000, windowsHide: true });
    const destination = join(root, `java-${major}-${Date.now()}`);
    await rename(output, destination);
    return join(destination, dirs[0]!.name, "bin", "java.exe");
  } finally { await rm(work, { recursive: true, force: true }); }
}
