#!/usr/bin/env node
/**
 * Готовит файлы для GitHub Release.
 *
 * electron-builder кладёт сборки с версией в имени:
 *   dist/VOID-Setup-1.2.0.exe
 *   dist/VOID-Portable-1.2.0.exe
 *
 * Сайт скачивает файлы по постоянным адресам:
 *   .../releases/latest/download/VOID-Setup.exe
 *   .../releases/latest/download/VOID-Portable.exe
 *
 * Поэтому здесь файлы копируются в release/ с постоянными именами
 * и рядом пишется SHA256SUMS.txt.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

const tag = process.env.GITHUB_REF_NAME;
if (tag && tag !== `v${version}`) {
  throw new Error(`Тег ${tag} не совпадает с версией package.json (v${version})`);
}

// DIST_DIR позволяет проверить скрипт на сборке из другой папки,
// например: $env:DIST_DIR="dist-1.2.0"; npm run release:assets
const distDir = process.env.DIST_DIR || "dist";
const targets = [
  [`${distDir}/VOID-Setup-${version}.exe`, "VOID-Setup.exe"],
  [`${distDir}/VOID-Portable-${version}.exe`, "VOID-Portable.exe"],
];

const output = join(root, "release");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

function sha256(file) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", chunk => hash.update(chunk))
      .on("end", () => resolveHash(hash.digest("hex")))
      .on("error", reject);
  });
}

const sums = [];
for (const [source, name] of targets) {
  const from = join(root, source);
  const to = join(output, name);
  await copyFile(from, to);
  const hash = await sha256(to);
  sums.push(`${hash}  ${name}`);
  console.log(`✓ ${name} ← ${source}`);
}

await writeFile(join(output, "SHA256SUMS.txt"), `${sums.join("\n")}\n`);
console.log(`Готово: ${output}`);
