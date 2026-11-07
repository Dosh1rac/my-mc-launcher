import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const MC_DIR = "./.minecraft";
const VERSION = "1.20.1";
const versionDir = join(MC_DIR, "versions", VERSION);

const version = JSON.parse(
  readFileSync(join(versionDir, `${VERSION}.json`), "utf8")
);

const hr = () => console.log("-".repeat(72));
const mb = (bytes: number) => (bytes / 1048576).toFixed(1) + " MB";

// --- Правила совместимости библиотек (rules) -------------------------------
type Rule = {
  action: "allow" | "disallow";
  os?: { name?: string; arch?: string };
};

function allowedOn(rules: Rule[] | undefined, osName = "windows"): boolean {
  if (!rules) return true;
  let allowed = false;
  for (const rule of rules) {
    if (rule.os?.name && rule.os.name !== osName) continue;
    allowed = rule.action === "allow";
  }
  return allowed;
}

console.log("");
console.log("ВЕРСИЯ");
hr();
console.log("id:           ", version.id);
console.log("type:         ", version.type);
console.log("mainClass:    ", version.mainClass);
console.log(
  "Java:         ",
  version.javaVersion?.component,
  "(major",
  version.javaVersion?.majorVersion + ")"
);
console.log(
  "assets index: ",
  version.assetIndex.id,
  "| суммарно",
  mb(version.assetIndex.totalSize)
);
console.log("");

// --- Библиотеки -------------------------------------------------------------
const libraries = version.libraries as any[];
const forWindows = libraries.filter((lib) => allowedOn(lib.rules));
// В современных версиях native-библиотеки лежат отдельными записями
// с классификатором в имени, например org.lwjgl:lwjgl:3.3.1:natives-windows
const nativeLibs = forWindows.filter((lib) => lib.name.includes(":natives-"));
const withArtifact = forWindows.filter((lib) => lib.downloads?.artifact);
const classpathBytes = withArtifact.reduce(
  (sum, lib) => sum + (lib.downloads.artifact.size ?? 0),
  0
);

console.log("БИБЛИОТЕКИ");
hr();
console.log("всего в JSON:        ", libraries.length);
console.log("подходят для Windows:", forWindows.length);
console.log("из них natives:      ", nativeLibs.length);
console.log("попадут в classpath: ", withArtifact.length, "|", mb(classpathBytes));
console.log("");
console.log("Первые 5 библиотек classpath:");
for (const lib of withArtifact.slice(0, 5)) {
  console.log("  -", lib.name, "|", mb(lib.downloads.artifact.size ?? 0));
}
console.log("");
console.log("Пример natives-библиотеки (Windows):");
const nativeExample = nativeLibs.find((lib) => lib.name.includes("natives-windows"));
if (nativeExample) console.log(JSON.stringify(nativeExample, null, 2));
console.log("");

// --- Ассеты ----------------------------------------------------------------
const indexFile = join(MC_DIR, "assets", "indexes", `${version.assetIndex.id}.json`);
if (existsSync(indexFile)) {
  const index = JSON.parse(readFileSync(indexFile, "utf8"));
  const objects = Object.values(index.objects) as any[];
  const total = objects.reduce((sum, obj) => sum + obj.size, 0);
  console.log("АССЕТЫ");
  hr();
  console.log("файлов в индексе:", objects.length, "|", mb(total));
  console.log("пример объекта:  ", JSON.stringify(objects[0]));
  console.log("лежит в:         ", join(MC_DIR, "assets", "objects", "<первые 2 символа хеша>", "<хеш>"));
  console.log("");
}

// --- Шаблоны аргументов -----------------------------------------------------
console.log("ШАБЛОНЫ JVM-АРГУМЕНТОВ (из version.json)");
hr();
for (const arg of version.arguments.jvm) {
  console.log("  ", typeof arg === "string" ? arg : JSON.stringify(arg));
}
console.log("");

console.log("ШАБЛОНЫ ИГРОВЫХ АРГУМЕНТОВ (первые 24)");
hr();
for (const arg of version.arguments.game.slice(0, 24)) {
  console.log("  ", typeof arg === "string" ? arg : JSON.stringify(arg));
}
console.log("");
console.log("Все ${...} подставляются лаунчером: ник, uuid, токен, пути, версия.");
console.log("");
