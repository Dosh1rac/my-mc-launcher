import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { launch, type LaunchOptions } from "../core";

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: "#0f1117",
    autoHideMenuBar: true,
    title: "my-mc-launcher",
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

ipcMain.handle("launcher:start", async (_event, options: LaunchOptions) => {
  try {
    await launch(
      {
        version: options?.version ?? "1.20.1",
        memoryMax: options?.memoryMax ?? "2G",
        memoryMin: options?.memoryMin ?? "1G",
        offline: Boolean(options?.offline),
        username: options?.username,
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
