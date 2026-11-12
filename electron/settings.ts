import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { totalmem } from "node:os";

export type Theme = "dark" | "light" | "pink";

export interface Settings {
  theme: Theme;
  version: string;
  gameDir: string;
  memoryGb: number;
  showSnapshots: boolean;
  offlineMode: boolean;
  loaderType: "vanilla" | "forge" | "fabric" | "neoforge";
  loaderVersion: string;
  javaPath: string;
}

const THEMES: Theme[] = ["dark", "light", "pink"];

export function totalMemoryGb(): number {
  return Math.max(1, Math.floor(totalmem() / 1024 ** 3));
}

function defaultMemory(): number {
  return Math.max(2, Math.min(8, Math.round(totalMemoryGb() / 4)));
}

function defaults(): Settings {
  return {
    theme: "dark",
    version: "1.20.1",
    gameDir: app.isPackaged ? join(app.getPath("appData"), ".void-minecraft") : resolve(process.cwd(), ".minecraft"),
    memoryGb: defaultMemory(),
    showSnapshots: false,
    offlineMode: true,
    loaderType: "vanilla",
    loaderVersion: "",
    javaPath: "",
  };
}

function settingsFile(): string {
  return join(app.getPath("userData"), "settings.json");
}

let cached: Settings | null = null;

function sanitize(input: Settings): Settings {
  const fallback = defaults();
  const maxMemory = totalMemoryGb();

  return {
    theme: THEMES.includes(input.theme) ? input.theme : fallback.theme,
    version:
      typeof input.version === "string" && input.version.trim()
        ? input.version.trim()
        : fallback.version,
    gameDir:
      typeof input.gameDir === "string" && input.gameDir.trim()
        ? resolve(input.gameDir)
        : fallback.gameDir,
    memoryGb: Math.max(
      1,
      Math.min(
        maxMemory,
        Math.round(Number(input.memoryGb) || fallback.memoryGb)
      )
    ),
    showSnapshots: Boolean(input.showSnapshots),
    offlineMode: input.offlineMode !== false,
    loaderType: ["vanilla", "forge", "fabric", "neoforge"].includes(input.loaderType)
      ? input.loaderType
      : "vanilla",
    loaderVersion:
      typeof input.loaderVersion === "string" ? input.loaderVersion.trim() : "",
    javaPath: typeof input.javaPath === "string" ? input.javaPath.trim() : "",
  };
}

export function getSettings(): Settings {
  if (cached) return { ...cached };

  const fallback = defaults();
  try {
    const raw = JSON.parse(readFileSync(settingsFile(), "utf8")) as Partial<Settings>;
    cached = sanitize({ ...fallback, ...raw });
  } catch {
    cached = fallback;
  }

  return { ...cached };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = sanitize({ ...getSettings(), ...patch });
  cached = next;

  const file = settingsFile();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(next, null, 2), "utf8");

  return { ...next };
}
