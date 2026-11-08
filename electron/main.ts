import { basename, extname, join } from "node:path";
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { arch, cpus, freemem, platform, totalmem } from "node:os";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { launch, type LaunchOptions } from "../core";
import { getSettings, updateSettings, type Settings } from "./settings";
import {
  downloadVersion,
  listVersions,
  type DownloadProgress,
} from "./downloader";
import { installLoader, installedLoaderId, listLoaderVersions, type LoaderType } from "./loaders";
import { searchContent, installContent, installedContent, listWorlds } from "./content";
import { importPack } from "./pack-import";
import { installJava } from "./java";

let win: BrowserWindow | null = null;
let downloadController: AbortController | null = null;
let installingJava = false;

function createWindow() {
  const theme = getSettings().theme;
  const backgroundColor =
    theme === "light" ? "#f7f3ff" : theme === "pink" ? "#fff4fa" : "#04020b";

  win = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    backgroundColor,
    autoHideMenuBar: true,
    title: "VOID",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env["ELECTRON_RENDERER_URL"];
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  win.on("closed", () => {
    win = null;
  });
}

function send(channel: string, payload: unknown) {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

ipcMain.handle("settings:get", () => getSettings());
ipcMain.handle("app:version", () => app.getVersion());

ipcMain.handle(
  "settings:update",
  (_event, patch: Partial<Settings> | undefined) =>
    updateSettings(patch ?? {})
);

ipcMain.handle("system:info", () => ({
  totalMem: totalmem(),
  freeMem: freemem(),
  cpus: cpus().length,
  platform: platform(),
  arch: arch(),
}));

ipcMain.handle("system:java", async () => {
  try {
    const result = await promisify(execFile)(getSettings().javaPath || "java", ["-version"], { timeout: 10000, windowsHide: true });
    return { ok: true, text: (result.stderr || result.stdout).trim() };
  } catch (error) { return { ok: false, text: `Java не найдена: ${(error as Error).message}` }; }
});
ipcMain.handle("system:java-pick", async () => {
  const options: Electron.OpenDialogOptions = { title: "Выберите java.exe или javaw.exe", properties: ["openFile"], filters: [{ name: "Java", extensions: ["exe"] }] };
  const selected = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  const path = selected.filePaths[0];
  if (selected.canceled || !path) return null;
  if (!/^javaw?\.exe$/i.test(basename(path))) throw new Error("Выберите файл java.exe или javaw.exe");
  const result = await promisify(execFile)(path, ["-version"], { timeout: 10000, windowsHide: true });
  updateSettings({ javaPath: path });
  return { path, text: (result.stderr || result.stdout).trim() };
});
ipcMain.handle("system:java-reset", () => updateSettings({ javaPath: "" }));
ipcMain.handle("system:java-download-page", () => shell.openExternal("https://adoptium.net/temurin/releases/"));
ipcMain.handle("system:java-install", async (_event, major: number) => {
  if (installingJava) throw new Error("Установка Java уже идёт");
  installingJava = true;
  try {
    const path = await installJava(join(app.getPath("userData"), "runtimes"), major, message => send("system:java-progress", message));
    updateSettings({ javaPath: path });
    return { path };
  } finally { installingJava = false; }
});

ipcMain.handle("profiles:list", async () => {
  try { const value = JSON.parse(await readFile(join(app.getPath("userData"), "profiles.json"), "utf8")); return Array.isArray(value) ? value : []; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
});
ipcMain.handle("profiles:save", async (_event, name: string) => {
  if (typeof name !== "string" || !name.trim() || name.length > 100) throw new Error("Введите название до 100 символов");
  const file = join(app.getPath("userData"), "profiles.json");
  let profiles: Array<{ name: string; gameDir: string; version: string; loaderType: string; loaderVersion: string }> = [];
  try { const value = JSON.parse(await readFile(file, "utf8")); if (!Array.isArray(value)) throw new Error("Некорректный файл профилей"); profiles = value; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const s = getSettings();
  const existing = profiles.find(p => p.gameDir === s.gameDir);
  if (existing) Object.assign(existing, { name: name.trim(), version: s.version, loaderType: s.loaderType, loaderVersion: s.loaderVersion });
  else profiles.push({ name: name.trim(), gameDir: s.gameDir, version: s.version, loaderType: s.loaderType, loaderVersion: s.loaderVersion });
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(file, JSON.stringify(profiles, null, 2), "utf8");
  return profiles;
});

ipcMain.handle("content:search", async (_event, kind, query, offset) => {
  const s = getSettings();
  return searchContent(kind, query, s.version, s.loaderType, offset);
});
ipcMain.handle("versions:installed", async () => {
  const root = getSettings().gameDir;
  try {
    const entries = await readdir(join(root, "versions"), { withFileTypes: true });
    const versions = await Promise.all(entries.filter(e => e.isDirectory()).map(async e => {
      try {
        const json = JSON.parse(await readFile(join(root, "versions", e.name, `${e.name}.json`), "utf8"));
        const fabric = /^(.+)-fabric-loader-(.+)$/.exec(e.name);
        const forge = /^(.+)-forge-(.+)$/.exec(e.name);
        const neo = /^neoforge-(.+)$/.exec(e.name);
        if (fabric) return { id: e.name, version: fabric[1], loaderType: "fabric", loaderVersion: fabric[2] };
        if (forge && json.inheritsFrom) return { id: e.name, version: json.inheritsFrom, loaderType: "forge", loaderVersion: forge[2] };
        if (neo && json.inheritsFrom) return { id: e.name, version: json.inheritsFrom, loaderType: "neoforge", loaderVersion: neo[1] };
        if (!json.inheritsFrom && await import("node:fs/promises").then(fs => fs.stat(join(root, "versions", e.name, `${e.name}.jar`)).then(() => true, () => false))) return { id: e.name, version: e.name, loaderType: "vanilla", loaderVersion: "" };
      } catch { /* неполная версия */ }
      return null;
    }));
    return versions.filter(Boolean);
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
});
ipcMain.handle("content:worlds", () => listWorlds(getSettings().gameDir));
ipcMain.handle("pack:import", async () => {
  if (downloadController) return { ok: false, error: "Другая загрузка уже идёт" };
  const options: Electron.OpenDialogOptions = { title: "Выберите сборку", properties: ["openFile"], filters: [{ name: "Сборки Minecraft", extensions: ["mrpack", "zip"] }] };
  const choice = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  if (choice.canceled || !choice.filePaths[0]) return { canceled: true };
  try {
    const controller = new AbortController();
    downloadController = controller;
    try {
      const result = await importPack(choice.filePaths[0], join(app.getPath("userData"), "instances"), message => send("pack:progress", message));
      let warning = "";
      const deps = result.dependencies as Record<string, string> | undefined;
      const version = deps?.minecraft;
      let type: LoaderType = "vanilla";
      let loaderVersion = "";
      if (deps?.["fabric-loader"]) { type = "fabric"; loaderVersion = deps["fabric-loader"]; }
      else if (deps?.neoforge) { type = "neoforge"; loaderVersion = deps.neoforge; }
      else if (deps?.forge) { type = "forge"; loaderVersion = deps.forge; }
      if (version && /^[A-Za-z0-9][A-Za-z0-9._+-]{0,127}$/.test(version) && !version.includes("..")) {
        try {
          send("pack:progress", `Установка Minecraft ${version}...`);
          await downloadVersion(version, result.folder, { signal: controller.signal, onProgress: p => send("pack:progress", `${p.phase}: ${p.current}/${p.total}`) });
          if (type !== "vanilla") {
            send("pack:progress", `Установка ${type} ${loaderVersion}...`);
            await installLoader(type, version, loaderVersion, result.folder, line => send("pack:progress", line), controller.signal, getSettings().javaPath);
          }
        } catch (error) { warning = `Не удалось установить игру или загрузчик: ${(error as Error).message}. Файлы сборки сохранены.`; }
      } else if (deps) warning = "Не указана корректная версия Minecraft; установите игру вручную.";
      return { ok: true, ...result, version, loaderType: type, loaderVersion, warning };
    } finally { downloadController = null; }
  } catch (error) { return { ok: false, error: (error as Error).message }; }
});
ipcMain.handle("content:installed", (_event, kind, world) => installedContent(getSettings().gameDir, kind, world));
ipcMain.handle("content:toggle", async (_event, kind, world, id, enabled) => {
  await toggleContent(getSettings().gameDir, kind, world, id, enabled);
  return { ok: true };
});
ipcMain.handle("content:install", async (_event, kind, project, world) => {
  const s = getSettings();
  return installContent(s.gameDir, kind, project, s.version, s.loaderType, world);
});

ipcMain.handle("dialog:pick-folder", async () => {
  const options: Electron.OpenDialogOptions = {
    title: "Папка для файлов Minecraft",
    properties: ["openDirectory", "createDirectory"],
  };

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle("content:import", async (_event, type: string) => {
  const folders: Record<string, string> = {
    mod: "mods", shader: "shaderpacks", resourcepack: "resourcepacks",
  };
  const folder = folders[type];
  if (!folder) return { ok: false, error: "Неизвестный тип содержимого" };
  const extensions = type === "mod" ? ["jar"] : ["zip"];
  const options: Electron.OpenDialogOptions = {
    title: "Выберите файлы для установки",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: type === "mod" ? "Моды Minecraft" : "Архивы Minecraft", extensions }],
  };
  const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  if (result.canceled) return { ok: false, canceled: true };
  const destination = join(getSettings().gameDir, folder);
  await mkdir(destination, { recursive: true });
  const installed: string[] = [];
  const skipped: string[] = [];
  for (const source of result.filePaths) {
    const name = basename(source);
    if (!extensions.includes(extname(name).slice(1).toLowerCase())) {
      skipped.push(name);
      continue;
    }
    try {
      await copyFile(source, join(destination, name), constants.COPYFILE_EXCL);
      installed.push(name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") skipped.push(name);
      else throw error;
    }
  }
  return { ok: true, installed, skipped, folder: destination };
});

ipcMain.handle("shell:open-path", async (_event, path: string) => {
  if (typeof path === "string" && path.trim()) {
    const error = await shell.openPath(path);
    return { ok: !error, error: error || undefined };
  }
  return { ok: false, error: "Путь не задан" };
});

ipcMain.handle("versions:list", async () => {
  const settings = getSettings();
  return listVersions(settings.gameDir);
});

ipcMain.handle(
  "loaders:list",
  async (_event, type: LoaderType, minecraftVersion: string) => {
    if (!["vanilla", "fabric", "forge", "neoforge"].includes(type)) {
      return { versions: [], error: "Неизвестный загрузчик" };
    }
    try {
      return { versions: await listLoaderVersions(type, minecraftVersion) };
    } catch (error) {
      return { versions: [], error: (error as Error).message ?? String(error) };
    }
  }
);

ipcMain.handle(
  "loaders:install",
  async (_event, request: { type: LoaderType; minecraftVersion: string; loaderVersion: string }) => {
    if (downloadController) return { ok: false, error: "Загрузка уже идёт" };
    if (!request || !["fabric", "forge", "neoforge"].includes(request.type)) {
      return { ok: false, error: "Неизвестный загрузчик" };
    }
    const controller = new AbortController();
    downloadController = controller;
    const root = getSettings().gameDir;
    try {
      const id = await installLoader(request.type, request.minecraftVersion, request.loaderVersion, root,
        (line) => send("launcher:log", line), controller.signal, getSettings().javaPath);
      return { ok: true, id };
    } catch (error) {
      if (controller.signal.aborted || (error as Error)?.name === "AbortError") {
        return { ok: false, canceled: true, error: "Установка отменена" };
      }
      const message = (error as Error)?.message ?? String(error);
      send("launcher:log", `[error] ${message}`);
      return { ok: false, error: message };
    } finally {
      downloadController = null;
    }
  }
);

ipcMain.handle("versions:download", async (_event, versionId: string) => {
  if (downloadController) {
    return { ok: false, error: "Загрузка уже идёт" };
  }

  if (typeof versionId !== "string" || !versionId.trim()) {
    return { ok: false, error: "Версия не выбрана" };
  }

  const settings = getSettings();
  const controller = new AbortController();
  downloadController = controller;

  let lastSent = 0;
  const onProgress = (progress: DownloadProgress) => {
    const now = Date.now();
    if (progress.phase !== "done" && now - lastSent < 90) return;
    lastSent = now;
    send("versions:progress", progress);
  };

  try {
    await downloadVersion(versionId, settings.gameDir, {
      signal: controller.signal,
      onProgress,
      onLog: (line) => send("launcher:log", line),
    });

    return { ok: true };
  } catch (error) {
    const aborted =
      controller.signal.aborted || (error as Error)?.name === "AbortError";

    if (aborted) {
      send("launcher:log", "Загрузка версии отменена.");
      return { ok: false, canceled: true, error: "Загрузка отменена" };
    }

    const message = (error as Error)?.message ?? String(error);
    send("launcher:log", `[error] ${message}`);
    return { ok: false, error: message };
  } finally {
    downloadController = null;
  }
});

ipcMain.handle("versions:cancel", () => {
  downloadController?.abort();
  return { ok: true };
});

ipcMain.handle("launcher:start", async (_event, options: LaunchOptions) => {
  if (downloadController) {
    return {
      ok: false,
      error: "Дождитесь окончания загрузки версии или отмените её.",
    };
  }

  const settings = getSettings();

  try {
    const version = options?.version ?? settings.version;
    await launch(
      {
        version,
        root: options?.root ?? settings.gameDir,
        javaPath: settings.javaPath || undefined,
        memoryMax: options?.memoryMax ?? `${settings.memoryGb}G`,
        memoryMin:
          options?.memoryMin ??
          `${Math.min(settings.memoryGb, 2)}G`,
        offline: Boolean(options?.offline),
        username: options?.username,
        loader: {
          type: settings.loaderType,
          version: settings.loaderVersion,
          customVersion:
            settings.loaderType === "vanilla"
              ? undefined
              : installedLoaderId(
                  settings.loaderType,
                  version,
                  settings.loaderVersion
                ),
        },
      },
      {
        onLog: (line) => send("launcher:log", line),
        onProgress: (info) => send("launcher:progress", info),
        onDownload: (info) => send("launcher:download", info),
        onStarted: (pid) => send("launcher:started", pid),
        onClose: (code) => send("launcher:close", code),
        onDeviceCode: (info) => send("launcher:device-code", info),
      }
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
});

ipcMain.handle("launcher:open-external", async (_event, url: string) => {
  if (typeof url === "string" && /^https:\/\//.test(url)) {
    await shell.openExternal(url);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on("update-available", () => {
  send("launcher:log", "Найдено обновление, скачиваю...");
});

autoUpdater.on("update-downloaded", () => {
  send("launcher:log", "Обновление скачано. Оно установится при следующем запуске.");
});

app.whenReady().then(() => {
  if (!app.isPackaged) return;
  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    send("launcher:log", `[update] Проверка обновления не удалась: ${(error as Error).message}`);
  });
});

