import "./space";

type ProgressInfo = { type: string; task: number; total: number };
type DownloadInfo = { name: string; current: number; total: number };
type DeviceCode = { verificationUri: string; userCode: string };
type LaunchResult = { ok: boolean; error?: string };

interface LaunchOptions {
  version?: string;
  memoryMax?: string;
  memoryMin?: string;
  offline?: boolean;
  username?: string;
}

interface LauncherApi {
  start(options: LaunchOptions): Promise<LaunchResult>;
  openExternal(url: string): Promise<void>;
  onLog(cb: (line: string) => void): () => void;
  onProgress(cb: (info: ProgressInfo) => void): () => void;
  onDownload(cb: (info: DownloadInfo) => void): () => void;
  onStarted(cb: (pid: number | undefined) => void): () => void;
  onClose(cb: (code: number | null) => void): () => void;
  onDeviceCode(cb: (info: DeviceCode) => void): () => void;
}

declare global {
  interface Window {
    launcher: LauncherApi;
  }
}

export {};

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Элемент #${id} не найден`);
  return el as T;
};

const playBtn = $<HTMLButtonElement>("play");
const offlineEl = $<HTMLInputElement>("offline");
const nicknameEl = $<HTMLInputElement>("nickname");
const memoryEl = $<HTMLInputElement>("memory");
const memValueEl = $<HTMLSpanElement>("memValue");
const statusTextEl = $<HTMLSpanElement>("statusText");
const statusPercentEl = $<HTMLSpanElement>("statusPercent");
const barEl = $<HTMLDivElement>("bar");
const logEl = $<HTMLPreElement>("log");
const clearLogBtn = $<HTMLButtonElement>("clearLog");
const authCard = $<HTMLElement>("authCard");
const authLink = $<HTMLButtonElement>("authLink");
const authCode = $<HTMLButtonElement>("authCode");
const accountHint = $<HTMLParagraphElement>("accountHint");

let running = false;
let logLines: string[] = [];
let authUrl = "https://www.microsoft.com/link";

function resetPlayButton() {
  running = false;
  playBtn.disabled = false;
  playBtn.textContent = "Играть";
}

function setProgress(percent: number) {
  const value = Math.max(0, Math.min(100, percent));
  barEl.style.width = `${value}%`;
  statusPercentEl.textContent = value > 0 ? `${Math.round(value)}%` : "";
}

function setStatus(text: string, percent?: number, isError = false) {
  statusTextEl.textContent = text;
  statusTextEl.classList.toggle("error", isError);
  if (percent !== undefined) setProgress(percent);
}

function appendLog(line: string) {
  for (const part of line.split(/\r?\n/)) {
    if (part.trim()) logLines.push(part);
  }
  if (logLines.length > 600) {
    logLines.splice(0, logLines.length - 600);
  }
  logEl.textContent = logLines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}

function updateAccountHint() {
  accountHint.innerHTML = offlineEl.checked
    ? "Офлайн-профиль подходит для одиночной игры и серверов с <code>online-mode=false</code>."
    : "Вход через Microsoft: откроется страница с кодом. Пароль вводится только на сайте Microsoft.";
  nicknameEl.disabled = !offlineEl.checked;
}

offlineEl.addEventListener("change", updateAccountHint);

memoryEl.addEventListener("input", () => {
  memValueEl.textContent = `${memoryEl.value} ГБ`;
});

clearLogBtn.addEventListener("click", () => {
  logLines = [];
  logEl.textContent = "";
});

authLink.addEventListener("click", () => {
  window.launcher.openExternal(authUrl);
});

authCode.addEventListener("click", async () => {
  const code = authCode.textContent?.trim() ?? "";
  if (!code || code.startsWith("-")) return;
  await navigator.clipboard.writeText(code);
  const previous = authCode.textContent;
  authCode.textContent = "скопировано";
  setTimeout(() => {
    authCode.textContent = previous;
  }, 1200);
});

playBtn.addEventListener("click", async () => {
  if (running) return;

  running = true;
  playBtn.disabled = true;
  playBtn.textContent = "Запуск...";
  authCard.classList.add("hidden");
  logLines = [];
  logEl.textContent = "";
  setStatus("Подготовка...", 0);

  const memory = Number(memoryEl.value);

  const result = await window.launcher.start({
    version: "1.20.1",
    memoryMax: `${memory}G`,
    memoryMin: `${Math.min(memory, 2)}G`,
    offline: offlineEl.checked,
    username: nicknameEl.value.trim() || "Player",
  });

  if (!result.ok) {
    appendLog(`[error] ${result.error}`);
    setStatus(result.error ?? "Ошибка запуска", 0, true);
    resetPlayButton();
  }
});

window.launcher.onLog((line) => appendLog(line));

window.launcher.onProgress((info) => {
  if (info.total > 0) {
    setProgress((info.task / info.total) * 100);
    setStatus(`Скачивание (${info.type}): ${info.task}/${info.total}`);
  }
});

window.launcher.onDownload((info) => {
  if (info.name) setStatus(`Скачивание: ${info.name}`);
});

window.launcher.onDeviceCode(({ verificationUri, userCode }) => {
  authUrl = verificationUri;
  authLink.textContent = verificationUri.replace(/^https?:\/\//, "");
  authCode.textContent = userCode;
  authCard.classList.remove("hidden");
  setStatus("Ожидание входа в Microsoft...", 0);
});

window.launcher.onStarted((pid) => {
  appendLog(`Minecraft запущен${pid ? `, PID ${pid}` : ""}`);
  setStatus("Игра запущена");
  setProgress(100);
});

window.launcher.onClose((code) => {
  appendLog(`Игра завершилась. Код: ${code}`);
  setStatus("Игра закрыта", 0);
  resetPlayButton();
});

updateAccountHint();
