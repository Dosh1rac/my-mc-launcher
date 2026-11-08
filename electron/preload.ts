import { contextBridge, ipcRenderer } from "electron";

type Unsubscribe = () => void;

function on<T>(channel: string, callback: (payload: T) => void): Unsubscribe {
  const handler = (_event: Electron.IpcRendererEvent, payload: T) =>
    callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("launcher", {
  start: (options: unknown) => ipcRenderer.invoke("launcher:start", options),
  openExternal: (url: string) =>
    ipcRenderer.invoke("launcher:open-external", url),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: unknown) =>
    ipcRenderer.invoke("settings:update", patch),
  getVersion: () => ipcRenderer.invoke("app:version"),
  getSystemInfo: () => ipcRenderer.invoke("system:info"),
  getJavaInfo: () => ipcRenderer.invoke("system:java"),
  pickJava: () => ipcRenderer.invoke("system:java-pick"),
  resetJava: () => ipcRenderer.invoke("system:java-reset"),
  openJavaDownload: () => ipcRenderer.invoke("system:java-download-page"),
  installJava: (major: number) => ipcRenderer.invoke("system:java-install", major),
  onJavaProgress: (cb: (message: string) => void) => on("system:java-progress", cb),
  listProfiles: () => ipcRenderer.invoke("profiles:list"),
  saveProfile: (name: string) => ipcRenderer.invoke("profiles:save", name),

  listVersions: () => ipcRenderer.invoke("versions:list"),
  listLoaderVersions: (type: string, minecraftVersion: string) =>
    ipcRenderer.invoke("loaders:list", type, minecraftVersion),
  installLoader: (request: unknown) => ipcRenderer.invoke("loaders:install", request),
  downloadVersion: (versionId: string) =>
    ipcRenderer.invoke("versions:download", versionId),
  cancelDownload: () => ipcRenderer.invoke("versions:cancel"),

  importContent: (type: string) => ipcRenderer.invoke("content:import", type),
  importPack: () => ipcRenderer.invoke("pack:import"),
  onPackProgress: (cb: (message: string) => void) => on("pack:progress", cb),
  searchContent: (type: string, query: string, offset: number) => ipcRenderer.invoke("content:search", type, query, offset),
  installedVersions: () => ipcRenderer.invoke("versions:installed"),
  installContent: (type: string, project: string, world?: string) => ipcRenderer.invoke("content:install", type, project, world),
  listWorlds: () => ipcRenderer.invoke("content:worlds"),
  installedContent: (type: string, world?: string) => ipcRenderer.invoke("content:installed", type, world),
  pickFolder: () => ipcRenderer.invoke("dialog:pick-folder"),
  openPath: (path: string) => ipcRenderer.invoke("shell:open-path", path),

  onLog: (cb: (line: string) => void) => on("launcher:log", cb),
  onProgress: (
    cb: (info: { type: string; task: number; total: number }) => void
  ) => on("launcher:progress", cb),
  onDownload: (
    cb: (info: { name: string; current: number; total: number }) => void
  ) => on("launcher:download", cb),
  onStarted: (cb: (pid: number | undefined) => void) =>
    on("launcher:started", cb),
  onClose: (cb: (code: number | null) => void) => on("launcher:close", cb),
  onDeviceCode: (
    cb: (info: { verificationUri: string; userCode: string }) => void
  ) => on("launcher:device-code", cb),
  onVersionProgress: (
    cb: (info: {
      phase: string;
      current: number;
      total: number;
      label?: string;
    }) => void
  ) => on("versions:progress", cb),
});
