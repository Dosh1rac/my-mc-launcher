import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { arch, platform } from "node:os";
import { dirname, join } from "node:path";

const MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const RESOURCES_URL = "https://resources.download.minecraft.net";
const USER_AGENT = "my-mc-launcher/1.0";
const NETWORK_TIMEOUT_MS = 25000;

export interface VersionSummary {
  id: string;
  type: string;
  releaseTime: string;
  installed: boolean;
}

export interface VersionListResult {
  versions: VersionSummary[];
  error?: string;
}

export type DownloadPhase =
  | "version"
  | "client"
  | "libraries"
  | "assets"
  | "logging"
  | "done";

export interface DownloadProgress {
  phase: DownloadPhase;
  current: number;
  total: number;
  label?: string;
}

export interface DownloadCallbacks {
  onProgress?: (progress: DownloadProgress) => void;
  onLog?: (line: string) => void;
  signal?: AbortSignal;
}

interface DownloadFileInfo {
  path?: string;
  url: string;
  sha1?: string;
  size?: number;
}

interface Library {
  name: string;
  downloads?: {
    artifact?: DownloadFileInfo;
    classifiers?: Record<string, DownloadFileInfo>;
  };
  natives?: Record<string, string>;
  rules?: Rule[];
}

interface Rule {
  action: "allow" | "disallow";
  os?: { name?: string; arch?: string; version?: string };
  features?: Record<string, boolean>;
}

interface VersionJson {
  id: string;
  type: string;
  assets: string;
  assetIndex?: DownloadFileInfo & { id: string };
  downloads?: { client?: DownloadFileInfo };
  libraries?: Library[];
  logging?: {
    client?: {
      file?: DownloadFileInfo & { id: string };
    };
  };
}

interface ManifestEntry {
  id: string;
  type: string;
  url: string;
  releaseTime: string;
}

interface Manifest {
  latest: { release: string; snapshot: string };
  versions: ManifestEntry[];
}

const OS_NAME =
  platform() === "win32"
    ? "windows"
    : platform() === "darwin"
      ? "osx"
      : "linux";

function abortError(): Error {
  const error = new Error("Загрузка отменена");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(NETWORK_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchManifest(): Promise<Manifest> {
  return fetchJson<Manifest>(MANIFEST_URL);
}

function installedVersions(root: string): Set<string> {
  const result = new Set<string>();
  const versionsDir = join(root, "versions");

  try {
    for (const name of readdirSync(versionsDir)) {
      if (existsSync(join(versionsDir, name, `${name}.jar`))) {
        result.add(name);
      }
    }
  } catch {
    // Папки ещё нет — это нормально.
  }

  return result;
}

export async function listVersions(root: string): Promise<VersionListResult> {
  const installed = installedVersions(root);

  try {
    const manifest = await fetchManifest();
    return {
      versions: manifest.versions.map((entry) => ({
        id: entry.id,
        type: entry.type,
        releaseTime: entry.releaseTime,
        installed: installed.has(entry.id),
      })),
    };
  } catch (error) {
    // Без интернета показываем хотя бы то, что уже лежит на диске.
    const versions: VersionSummary[] = [];
    try {
      for (const name of readdirSync(join(root, "versions"))) {
        if (existsSync(join(root, "versions", name, `${name}.json`))) {
          versions.push({
            id: name,
            type: "local",
            releaseTime: "",
            installed: installed.has(name),
          });
        }
      }
    } catch {
      // ignore
    }

    return {
      versions,
      error:
        (error as Error).message ??
        "Не удалось получить список версий Minecraft",
    };
  }
}

function rulesAllow(rules?: Rule[]): boolean {
  if (!rules || rules.length === 0) return true;

  let allowed = false;

  for (const rule of rules) {
    if (rule.features) continue;

    if (rule.os) {
      if (rule.os.name && rule.os.name !== OS_NAME) continue;
      if (rule.os.arch && rule.os.arch !== arch()) continue;
    }

    allowed = rule.action === "allow";
  }

  return allowed;
}

function mavenPath(name: string, classifier?: string): string {
  const [group = "", artifact = "", version = ""] = name.split(":");
  const fileName = `${artifact}-${version}${
    classifier ? `-${classifier}` : ""
  }.jar`;
  return `${group.replace(/\./g, "/")}/${artifact}/${version}/${fileName}`;
}

function libraryPath(info: DownloadFileInfo, library: Library): string {
  if (info.path) return info.path;
  return mavenPath(library.name, undefined);
}

async function downloadFile(
  url: string,
  destination: string,
  expected: DownloadFileInfo | undefined,
  signal?: AbortSignal
): Promise<void> {
  if (existsSync(destination)) {
    try {
      const existing = statSync(destination);
      if (
        existing.size > 0 &&
        (!expected?.size || existing.size === expected.size)
      ) {
        return;
      }
    } catch {
      // файл мог исчезнуть — скачаем заново
    }
  }

  throwIfAborted(signal);

  const timeout = AbortSignal.timeout(NETWORK_TIMEOUT_MS);
  const response = await fetch(url, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (expected?.size && buffer.length !== expected.size) {
    throw new Error(
      `Размер не совпал: ${url} (${buffer.length} вместо ${expected.size})`
    );
  }

  if (
    expected?.sha1 &&
    createHash("sha1").update(buffer).digest("hex") !== expected.sha1
  ) {
    throw new Error(`SHA-1 не совпал: ${url}`);
  }

  mkdirSync(dirname(destination), { recursive: true });
  const temp = `${destination}.tmp`;

  try {
    writeFileSync(temp, buffer);
    renameSync(temp, destination);
  } catch (error) {
    rmSync(temp, { force: true });
    throw error;
  }
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= items.length) return;

        throwIfAborted(signal);
        await worker(items[index] as T, index);
      }
    }
  );

  await Promise.all(workers);
}

interface FileTask {
  url: string;
  destination: string;
  expected: DownloadFileInfo;
  label: string;
}

export async function downloadVersion(
  versionId: string,
  root: string,
  callbacks: DownloadCallbacks = {}
): Promise<void> {
  const { signal } = callbacks;
  throwIfAborted(signal);

  callbacks.onLog?.(`Получаю манифест версий...`);
  const manifest = await fetchManifest();
  const entry = manifest.versions.find((item) => item.id === versionId);

  if (!entry) {
    throw new Error(`Версия ${versionId} не найдена в манифесте Mojang`);
  }

  callbacks.onLog?.(
    `Версия ${entry.id} (${entry.type}), выпущена ${entry.releaseTime}`
  );
  callbacks.onProgress?.({
    phase: "version",
    current: 0,
    total: 1,
    label: `${versionId}.json`,
  });

  const versionJson = await fetchJson<VersionJson>(entry.url, signal);
  const versionDir = join(root, "versions", versionId);
  mkdirSync(versionDir, { recursive: true });
  writeFileSync(
    join(versionDir, `${versionId}.json`),
    JSON.stringify(versionJson, null, 2),
    "utf8"
  );
  callbacks.onProgress?.({
    phase: "version",
    current: 1,
    total: 1,
    label: `${versionId}.json`,
  });

  if (versionJson.downloads?.client) {
    callbacks.onProgress?.({
      phase: "client",
      current: 0,
      total: 1,
      label: `${versionId}.jar`,
    });
    await downloadFile(
      versionJson.downloads.client.url,
      join(versionDir, `${versionId}.jar`),
      versionJson.downloads.client,
      signal
    );
    callbacks.onProgress?.({
      phase: "client",
      current: 1,
      total: 1,
      label: `${versionId}.jar`,
    });
  }

  // --- Библиотеки ---
  const libraryTasks: FileTask[] = [];

  for (const library of versionJson.libraries ?? []) {
    if (!rulesAllow(library.rules)) continue;

    const artifact = library.downloads?.artifact;
    if (artifact?.url) {
      libraryTasks.push({
        url: artifact.url,
        destination: join(root, "libraries", libraryPath(artifact, library)),
        expected: artifact,
        label: library.name,
      });
    }

    const nativeKey = library.natives?.[OS_NAME]?.replace(
      "${arch}",
      arch() === "x64" ? "64" : "32"
    );

    if (nativeKey) {
      const nativeInfo = library.downloads?.classifiers?.[nativeKey];
      if (nativeInfo?.url) {
        libraryTasks.push({
          url: nativeInfo.url,
          destination: join(
            root,
            "libraries",
            nativeInfo.path ?? mavenPath(library.name, nativeKey)
          ),
          expected: nativeInfo,
          label: `${library.name}:${nativeKey}`,
        });
      }
    }
  }

  let librariesDone = 0;
  callbacks.onProgress?.({
    phase: "libraries",
    current: 0,
    total: libraryTasks.length,
    label: "библиотеки",
  });

  await runPool(
    libraryTasks,
    6,
    async (task) => {
      await downloadFile(task.url, task.destination, task.expected, signal);
      librariesDone += 1;
      callbacks.onProgress?.({
        phase: "libraries",
        current: librariesDone,
        total: libraryTasks.length,
        label: task.label,
      });
    },
    signal
  );

  // --- Ассеты ---
  if (versionJson.assetIndex) {
    const indexPath = join(
      root,
      "assets",
      "indexes",
      `${versionJson.assetIndex.id}.json`
    );
    await downloadFile(
      versionJson.assetIndex.url,
      indexPath,
      versionJson.assetIndex,
      signal
    );

    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      objects: Record<string, { hash: string; size: number }>;
    };
    const objects = Object.values(index.objects ?? {});
    let assetsDone = 0;

    callbacks.onProgress?.({
      phase: "assets",
      current: 0,
      total: objects.length,
      label: `индекс ${versionJson.assetIndex.id}`,
    });

    await runPool(
      objects,
      10,
      async (object) => {
        const prefix = object.hash.slice(0, 2);
        await downloadFile(
          `${RESOURCES_URL}/${prefix}/${object.hash}`,
          join(root, "assets", "objects", prefix, object.hash),
          { url: "", sha1: object.hash, size: object.size },
          signal
        );
        assetsDone += 1;
        callbacks.onProgress?.({
          phase: "assets",
          current: assetsDone,
          total: objects.length,
          label: `ассеты ${assetsDone}/${objects.length}`,
        });
      },
      signal
    );
  }

  // --- Конфиг логирования ---
  const logFile = versionJson.logging?.client?.file;
  if (logFile?.url) {
    callbacks.onProgress?.({
      phase: "logging",
      current: 0,
      total: 1,
      label: logFile.id,
    });
    await downloadFile(
      logFile.url,
      join(root, "assets", "log_configs", logFile.id),
      logFile,
      signal
    );
    callbacks.onProgress?.({
      phase: "logging",
      current: 1,
      total: 1,
      label: logFile.id,
    });
  }

  callbacks.onLog?.(`Версия ${versionId} готова.`);
  callbacks.onProgress?.({
    phase: "done",
    current: 1,
    total: 1,
    label: versionId,
  });
}
