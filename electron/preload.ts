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
});
