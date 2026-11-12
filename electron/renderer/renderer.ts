import "./space";

type Theme = "dark" | "light" | "pink";
type LoaderType = "vanilla" | "fabric" | "forge" | "neoforge";

interface Settings {
  theme: Theme;
  version: string;
  gameDir: string;
  memoryGb: number;
  showSnapshots: boolean;
  offlineMode: boolean;
  loaderType: LoaderType;
  loaderVersion: string;
  javaPath: string;
}

interface SystemInfo {
  totalMem: number;
  freeMem: number;
  cpus: number;
  platform: string;
  arch: string;
}

interface VersionSummary {
  id: string;
  type: string;
  releaseTime: string;
  installed: boolean;
}

interface VersionListResult {
  versions: VersionSummary[];
  error?: string;
}

interface DownloadProgress {
  phase: string;
  current: number;
  total: number;
  label?: string;
}

interface DownloadResult {
  ok: boolean;
  canceled?: boolean;
  error?: string;
}

type ProgressInfo = { type: string; task: number; total: number };
type DownloadInfo = { name: string; current: number; total: number };
type DeviceCode = { verificationUri: string; userCode: string };
type LaunchResult = { ok: boolean; error?: string };

interface LaunchOptions {
  version?: string;
  root?: string;
  memoryMax?: string;
  memoryMin?: string;
  offline?: boolean;
  username?: string;
}

interface LauncherApi {
  start(options: LaunchOptions): Promise<LaunchResult>;
  openExternal(url: string): Promise<void>;

  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  getVersion(): Promise<string>;
  getUpdateState(): Promise<{ status: string; version?: string; percent?: number; message?: string }>;
  installUpdate(): Promise<{ ok: boolean }>;
  checkForUpdates(): Promise<unknown>;
  onUpdateState(cb: (info: { status: string; version?: string; percent?: number; message?: string }) => void): () => void;
  getSystemInfo(): Promise<SystemInfo>;
  getJavaInfo(): Promise<{ ok: boolean; text: string }>;
  pickJava(): Promise<{ path: string; text: string } | null>;
  resetJava(): Promise<Settings>;
  openJavaDownload(): Promise<void>;
  installJava(major: number): Promise<{ path: string }>;
  onJavaProgress(cb: (message: string) => void): () => void;
  listProfiles(): Promise<Array<{ name: string; gameDir: string; version: string; loaderType: LoaderType; loaderVersion: string }>>;
  saveProfile(name: string): Promise<Array<{ name: string; gameDir: string; version: string; loaderType: LoaderType; loaderVersion: string }>>;

  listVersions(): Promise<VersionListResult>;
  listLoaderVersions(type: LoaderType, minecraftVersion: string): Promise<{
    versions: Array<{ id: string; stable?: boolean }>;
    error?: string;
  }>;
  installLoader(request: { type: LoaderType; minecraftVersion: string; loaderVersion: string }): Promise<DownloadResult & { id?: string }>;
  downloadVersion(versionId: string): Promise<DownloadResult>;
  cancelDownload(): Promise<{ ok: boolean }>;

  importContent(type: string): Promise<{ ok: boolean; canceled?: boolean; installed?: string[]; skipped?: string[]; folder?: string; error?: string }>;
  importPack(): Promise<{ ok?: boolean; canceled?: boolean; folder?: string; name?: string; message?: string; error?: string; warning?: string; version?: string; loaderType?: LoaderType; loaderVersion?: string; dependencies?: Record<string, string> }>;
  onPackProgress(cb: (message: string) => void): () => void;
  searchContent(type: string, query: string, offset: number): Promise<{ total: number; hits: Array<{ id: string; title: string; description: string; downloads: number; author: string; icon?: string; categories: string[] }> }>;
  installedVersions(): Promise<Array<{ id: string; version: string; loaderType: LoaderType; loaderVersion: string }>>;
  installContent(type: string, project: string, world?: string): Promise<{ name: string; dependencies: number }>;
  listWorlds(): Promise<string[]>;
  installedContent(type: string, world?: string): Promise<Array<{ id: string; enabled: boolean }>>;
  toggleContent(type: string, world: string, id: string, enabled: boolean): Promise<void>;
  pickFolder(): Promise<string | null>;
  openPath(path: string): Promise<{ ok: boolean; error?: string }>;

  onLog(cb: (line: string) => void): () => void;
  onProgress(cb: (info: ProgressInfo) => void): () => void;
  onDownload(cb: (info: DownloadInfo) => void): () => void;
  onStarted(cb: (pid: number | undefined) => void): () => void;
  onClose(cb: (code: number | null) => void): () => void;
  onDeviceCode(cb: (info: DeviceCode) => void): () => void;
  getAuthState(): Promise<AuthState>;
  signIn(): Promise<{ ok: boolean; error?: string } & Partial<Exclude<AuthState, { signedIn: false }>>>;
  signOut(): Promise<{ ok: boolean }>;
  onAuthState(cb: (state: AuthState) => void): () => void;
  onVersionProgress(cb: (info: DownloadProgress) => void): () => void;
}

type AuthState =
  | { signedIn: false }
  | { signedIn: true; name: string; uuid: string };

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

const contentEl = $<HTMLElement>("content");

const playBtn = $<HTMLButtonElement>("play");
const offlineEl = $<HTMLInputElement>("offline");
const nicknameEl = $<HTMLInputElement>("nickname");
const statusTextEl = $<HTMLSpanElement>("statusText");
const statusPercentEl = $<HTMLSpanElement>("statusPercent");
const barEl = $<HTMLDivElement>("bar");
const logEl = $<HTMLPreElement>("log");
const clearLogBtn = $<HTMLButtonElement>("clearLog");
const authCard = $<HTMLElement>("authCard");
const authLink = $<HTMLButtonElement>("authLink");
const authCode = $<HTMLButtonElement>("authCode");
const accountHint = $<HTMLParagraphElement>("accountHint");
const accountName = $<HTMLElement>("accountName");
const accountSub = $<HTMLElement>("accountSub");
const accountAvatarText = $<HTMLElement>("accountAvatarText");
const accountAvatarImg = $<HTMLImageElement>("accountAvatarImg");
const signInBtn = $<HTMLButtonElement>("signIn");
const signOutBtn = $<HTMLButtonElement>("signOut");
const nicknameField = $<HTMLElement>("nicknameField");

const headerVersion = $<HTMLElement>("headerVersion");
const versionChip = $<HTMLElement>("versionChip");
const memoryChip = $<HTMLElement>("memoryChip");

const showSnapshots = $<HTMLInputElement>("showSnapshots");
const versionSearch = $<HTMLInputElement>("versionSearch");
const versionList = $<HTMLDivElement>("versionList");
const versionsCount = $<HTMLElement>("versionsCount");
const selectedVersion = $<HTMLElement>("selectedVersion");
const loaderTypeEl = $<HTMLSelectElement>("loaderType");
const loaderVersionEl = $<HTMLSelectElement>("loaderVersion");
const loaderVersionRow = $<HTMLElement>("loaderVersionRow");
const loaderHint = $<HTMLElement>("loaderHint");
const downloadBtn = $<HTMLButtonElement>("downloadBtn");
const cancelDownloadBtn = $<HTMLButtonElement>("cancelDownloadBtn");
const openGameFolder = $<HTMLButtonElement>("openGameFolder");
const dlStatus = $<HTMLElement>("dlStatus");
const dlPercent = $<HTMLElement>("dlPercent");
const dlBar = $<HTMLDivElement>("dlBar");
const downloadHint = $<HTMLElement>("downloadHint");

const themeValue = $<HTMLElement>("themeValue");
const gameDirEl = $<HTMLElement>("gameDir");
const pickFolderBtn = $<HTMLButtonElement>("pickFolder");
const memorySettings = $<HTMLInputElement>("memorySettings");
const memValueSettings = $<HTMLElement>("memValueSettings");
const memMin = $<HTMLElement>("memMin");
const memMax = $<HTMLElement>("memMax");
const ramHint = $<HTMLElement>("ramHint");
const systemInfo = $<HTMLElement>("systemInfo");
const resetSettingsBtn = $<HTMLButtonElement>("resetSettings");

let settings: Settings = {
  theme: "dark",
  version: "1.20.1",
  gameDir: "",
  memoryGb: 4,
  showSnapshots: false,
  loaderType: "vanilla",
  loaderVersion: "",
  javaPath: "",
};
let system: SystemInfo | null = null;
let versions: VersionSummary[] = [];
let versionsLoaded = false;
let versionsLoading = false;
let downloading = false;
let currentView = "play";
let memorySaveTimer: ReturnType<typeof setTimeout> | undefined;
let logLines: string[] = [];
let authUrl = "https://www.microsoft.com/link";

const THEME_NAMES: Record<Theme, string> = {
  dark: "Тёмная",
  light: "Светлая",
  pink: "Розовая",
};

const THEME_SUBS: Record<Theme, string> = {
  dark: "deep space",
  light: "lavender sky",
  pink: "rose nebula",
};

let appVersion = "1.5.0";

const brandSub = $<HTMLElement>("brandSub");

/* ---------- Индикатор обновления ---------- */

const updateBadge = $<HTMLButtonElement>("updateBadge");
const updateInfo = $<HTMLElement>("updateInfo");
const checkUpdateBtn = $<HTMLButtonElement>("checkUpdate");
let updateInstallReady = false;

const UPDATE_TEXTS: Record<string, string> = {
  checking: "Проверяю обновления...",
  latest: "У тебя последняя версия VOID.",
  error: "Не удалось проверить обновления. Проверь интернет или попробуй позже.",
};

function renderUpdateState(state: { status: string; version?: string; percent?: number; message?: string }) {
  updateInstallReady = false;
  updateBadge.classList.add("hidden");
  if (state.status === "checking") {
    updateInfo.textContent = UPDATE_TEXTS.checking;
    return;
  }
  if (state.status === "downloading" && state.version) {
    updateBadge.textContent = `⟳ ${state.version} · ${state.percent ?? 0}%`;
    updateBadge.classList.remove("hidden");
    updateInfo.textContent = `Обновление ${state.version} скачивается...`;
    return;
  }
  if (state.status === "downloaded" && state.version) {
    updateBadge.textContent = `✓ ${state.version} готова — перезапустить`;
    updateBadge.classList.remove("hidden");
    updateInstallReady = true;
    updateInfo.textContent = `Обновление ${state.version} готово. Можно перезапустить сразу — установка займёт несколько секунд.`;
    return;
  }
  if (state.status === "latest" || state.status === "error") {
    updateInfo.textContent = UPDATE_TEXTS[state.status];
  }
}

updateBadge.addEventListener("click", () => {
  if (updateInstallReady) void window.launcher.installUpdate();
});

checkUpdateBtn.addEventListener("click", async () => {
  checkUpdateBtn.disabled = true;
  try { await window.launcher.checkForUpdates(); }
  finally { checkUpdateBtn.disabled = false; }
});

window.launcher.onUpdateState(renderUpdateState);
void window.launcher.getUpdateState().then(renderUpdateState).catch(() => {});

/* ---------- Тема ---------- */

function applyTheme(theme: Theme) {
  const next = theme in THEME_NAMES ? theme : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // ignore
  }

  themeValue.textContent = THEME_NAMES[next];
  brandSub.textContent = `${appVersion} · ${THEME_SUBS[next]}`;
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-pick]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.themePick === next)
    );
}

/* ---------- Лог и статус ---------- */

function appendLog(line: string) {
  for (const part of line.split(/\r?\n/)) {
    if (part.trim()) logLines.push(part);
  }
  if (logLines.length > 800) {
    logLines.splice(0, logLines.length - 800);
  }
  logEl.textContent = logLines.join("\n");
  logEl.scrollTop = logEl.scrollHeight;
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

function setDownloadProgress(percent: number) {
  const value = Math.max(0, Math.min(100, percent));
  dlBar.style.width = `${value}%`;
  dlPercent.textContent = value > 0 ? `${Math.round(value)}%` : "";
}

/* ---------- Настройки ---------- */

function persist(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  window.launcher
    .updateSettings(patch)
    .then((next) => {
      settings = next;
      applyTheme(next.theme);
      updateHeader();
    })
    .catch((error) => {
      appendLog(`[error] Настройки: ${(error as Error).message ?? error}`);
    });
}

function updateHeader() {
  headerVersion.textContent = settings.version;
  versionChip.textContent = settings.version;
  memoryChip.textContent = `${settings.memoryGb} ГБ`;
  selectedVersion.textContent = settings.version;
  updateDownloadState();
}

function updateDownloadState() {
  selectedVersion.textContent = settings.version;

  const info = versions.find((item) => item.id === settings.version);
  if (!downloading && settings.loaderType !== "vanilla") {
    downloadBtn.textContent = "Установить";
    downloadHint.textContent = "Сначала скачивается Minecraft, затем устанавливается выбранный загрузчик. Для Forge и NeoForge необходима подходящая Java.";
    return;
  }
  if (!downloading) {
    downloadBtn.textContent = info?.installed ? "Перекачать" : "Скачать";
    downloadHint.textContent = info?.installed
      ? "Версия уже есть на диске. Можно скачать заново или сразу запускать."
      : "Скачиваются версия, библиотеки и ассеты. Уже загруженные файлы пропускаются.";
  }
}

function maxMemoryGb(): number {
  if (!system) return 8;
  return Math.max(1, Math.floor(system.totalMem / 1024 ** 3));
}

function setMemoryLabel(gb: number) {
  memValueSettings.textContent = `${gb} ГБ`;
  memoryChip.textContent = `${gb} ГБ`;
}

function setupMemory() {
  const max = maxMemoryGb();
  const value = Math.max(1, Math.min(max, settings.memoryGb));

  settings.memoryGb = value;
  memorySettings.min = "1";
  memorySettings.max = String(max);
  memorySettings.value = String(value);
  memMin.textContent = "1 ГБ";
  memMax.textContent = `${max} ГБ`;
  setMemoryLabel(value);

  if (system) {
    const total = Math.round(system.totalMem / 1024 ** 3);
    const free = (system.freeMem / 1024 ** 3).toFixed(1);
    ramHint.textContent = `Всего ОЗУ: ${total} ГБ · свободно сейчас: ${free} ГБ. Доступно до ${max} ГБ; лучше не выделять больше половины.`;
    systemInfo.textContent = `${platformName(system.platform)} · ${system.cpus} потоков · ${total} ГБ ОЗУ`;
  }
}

function syncSettingsUI() {
  applyTheme(settings.theme);
  gameDirEl.textContent = settings.gameDir || "-";
  gameDirEl.title = settings.gameDir;
  showSnapshots.checked = settings.showSnapshots;
  offlineEl.checked = settings.offlineMode;
  setupMemory();
}

function platformName(value: string): string {
  if (value === "win32") return "Windows";
  if (value === "darwin") return "macOS";
  if (value === "linux") return "Linux";
  return value;
}

/* ---------- Навигация ---------- */

function showView(name: string) {
  currentView = name;

  document
    .querySelectorAll<HTMLElement>("[data-view]")
    .forEach((view) => view.classList.toggle("active", view.dataset.view === name));

  document
    .querySelectorAll<HTMLElement>("[data-nav]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.nav === name)
    );

  contentEl.scrollTop = 0;

  if (name === "versions") {
    if (!versionsLoaded && !versionsLoading) void loadVersions();
    void loadLoaderVersions();
  }

  if (name === "settings") {
    syncSettingsUI();
  }
  if (name === "content") { catalogOffset = 0; void searchCatalog(); }
  if (name === "play") void refreshInstalled();
}

/* ---------- Версии ---------- */

function emptyState(text: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.textContent = text;
  return div;
}

function versionTypeLabel(type: string): string {
  switch (type) {
    case "release":
      return "release";
    case "snapshot":
      return "snapshot";
    case "old_beta":
      return "old beta";
    case "old_alpha":
      return "old alpha";
    case "local":
      return "локальная";
    default:
      return type;
  }
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function renderVersions() {
  const query = versionSearch.value.trim().toLowerCase();
  const includeSnapshots = showSnapshots.checked;

  const filtered = versions.filter((version) => {
    if (
      !includeSnapshots &&
      version.type !== "release" &&
      version.type !== "local"
    ) {
      return false;
    }
    return !query || version.id.toLowerCase().includes(query);
  });

  versionsCount.textContent = `${filtered.length} ${pluralVersions(
    filtered.length
  )}`;

  versionList.replaceChildren();

  for (const version of filtered.slice(0, 500)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "version-item" + (version.id === settings.version ? " selected" : "");

    const id = document.createElement("span");
    id.className = "version-id";
    id.textContent = version.id;

    const meta = document.createElement("span");
    meta.className = "version-meta";
    meta.textContent = [versionTypeLabel(version.type), formatDate(version.releaseTime)]
      .filter(Boolean)
      .join(" · ");

    if (version.installed) {
      const badge = document.createElement("span");
      badge.className = "installed-badge";
      badge.textContent = " · установлена";
      meta.append(badge);
    }

    button.append(id, meta);
    button.addEventListener("click", () => selectVersion(version.id));
    versionList.append(button);
  }

  if (filtered.length === 0) {
    versionList.append(emptyState("Ничего не найдено"));
  }
}

function pluralVersions(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "версия";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return "версии";
  }
  return "версий";
}

function selectVersion(id: string) {
  settings.version = id;
  persist({ version: id });
  updateHeader();
  renderVersions();
  void loadLoaderVersions();
}

async function loadVersions(force = false) {
  if (versionsLoading) return;

  versionsLoading = true;
  if (force) versionsLoaded = false;

  versionList.replaceChildren(emptyState("Загрузка списка версий..."));

  try {
    const result = await window.launcher.listVersions();
    versions = result.versions;
    versionsLoaded = true;

    if (result.error) {
      appendLog(`[warn] Список версий: ${result.error}`);
    }

    renderVersions();
    updateHeader();

    if (versions.length === 0) {
      versionList.replaceChildren(
        emptyState(result.error ?? "Список версий пуст")
      );
    }
  } catch (error) {
    versionList.replaceChildren(
      emptyState("Не удалось загрузить список версий")
    );
    appendLog(`[error] Версии: ${(error as Error).message ?? error}`);
  } finally {
    versionsLoading = false;
  }
}

/* ---------- Загрузчики ---------- */

let loaderRequest = 0;
async function loadLoaderVersions() {
  const request = ++loaderRequest;
  const type = settings.loaderType;
  const minecraftVersion = settings.version;
  loaderTypeEl.value = type;
  loaderVersionRow.classList.toggle("hidden", type === "vanilla");
  loaderVersionEl.replaceChildren();
  if (type === "vanilla") {
    loaderHint.textContent = "Обычная версия Minecraft без загрузчика модов.";
    updateDownloadState();
    return;
  }
  loaderHint.textContent = "Получаю совместимые версии загрузчика...";
  loaderVersionEl.disabled = true;
  try {
    if (typeof window.launcher.listLoaderVersions !== "function") {
      throw new Error("Перезапустите приложение, чтобы обновить загрузчики.");
    }
    const result = await window.launcher.listLoaderVersions(type, minecraftVersion);
    if (request !== loaderRequest) return;
    if (result.error) throw new Error(result.error);
    for (const version of result.versions) {
      const option = document.createElement("option");
      option.value = version.id;
      option.textContent = version.id + (version.stable === false ? " · beta" : "");
      loaderVersionEl.append(option);
    }
    if (result.versions.some((v) => v.id === settings.loaderVersion)) {
      loaderVersionEl.value = settings.loaderVersion;
    }
    loaderHint.textContent = result.versions.length
      ? `Доступно версий: ${result.versions.length}`
      : "Для этой версии Minecraft загрузчик не найден.";
    loaderVersionEl.disabled = !result.versions.length;
  } catch (error) {
    if (request !== loaderRequest) return;
    loaderHint.textContent = `Не удалось получить версии: ${(error as Error).message}`;
  }
  updateDownloadState();
}

loaderTypeEl.addEventListener("change", () => {
  const type = loaderTypeEl.value as LoaderType;
  persist({ loaderType: type, loaderVersion: "" });
  void loadLoaderVersions();
});

const contentType = $<HTMLSelectElement>("contentType");
const profileSelect = $<HTMLSelectElement>("profileSelect");
let profiles: Array<{ name: string; gameDir: string; version: string; loaderType: LoaderType; loaderVersion: string }> = [];
async function refreshProfiles() {
  profiles = await window.launcher.listProfiles();
  profileSelect.replaceChildren(new Option("Текущая папка", ""));
  profiles.forEach((profile, index) => profileSelect.add(new Option(profile.name, String(index))));
  const selected = profiles.findIndex(profile => profile.gameDir === settings.gameDir);
  profileSelect.value = selected < 0 ? "" : String(selected);
}
$("saveProfile").addEventListener("click", async () => {
  const name = $<HTMLInputElement>("profileName").value.trim();
  if (!name) { $("installedHint").textContent = "Введите название сборки."; return; }
  try { await window.launcher.saveProfile(name); await refreshProfiles(); $("installedHint").textContent = "Сборка сохранена в списке."; }
  catch (error) { $("installedHint").textContent = `Ошибка: ${(error as Error).message}`; }
});
profileSelect.addEventListener("change", async () => {
  if (!profileSelect.value) return;
  const profile = profiles[Number(profileSelect.value)];
  if (!profile) return;
  try {
    settings = await window.launcher.updateSettings({ gameDir: profile.gameDir, version: profile.version, loaderType: profile.loaderType, loaderVersion: profile.loaderVersion });
    versionsLoaded = false; updateHeader(); syncSettingsUI(); await refreshInstalled();
    $("installedHint").textContent = `Выбрана сборка: ${profile.name}`;
  } catch (error) { $("installedHint").textContent = `Ошибка: ${(error as Error).message}`; }
});
async function refreshJava() {
  try { const info = await window.launcher.getJavaInfo(); $("javaInfo").textContent = info.text; }
  catch (error) { $("javaInfo").textContent = `Ошибка Java: ${(error as Error).message}`; }
}
$("refreshJava").addEventListener("click", () => void refreshJava());
$("pickJava").addEventListener("click", async () => {
  try { const result = await window.launcher.pickJava(); if (result) { settings.javaPath = result.path; $("javaInfo").textContent = `${result.path} · ${result.text}`; } }
  catch (error) { $("javaInfo").textContent = `Ошибка выбора Java: ${(error as Error).message}`; }
});
$("resetJava").addEventListener("click", async () => {
  try { settings = await window.launcher.resetJava(); await refreshJava(); }
  catch (error) { $("javaInfo").textContent = `Ошибка: ${(error as Error).message}`; }
});
$("downloadJava").addEventListener("click", () => { void window.launcher.openJavaDownload(); });
window.launcher.onJavaProgress(message => { $("javaInstallStatus").textContent = message; });
$("installJava").addEventListener("click", async () => {
  const button = $<HTMLButtonElement>("installJava"); button.disabled = true;
  try { const result = await window.launcher.installJava(Number($<HTMLSelectElement>("javaVersion").value)); settings.javaPath = result.path; $("javaInstallStatus").textContent = `Установлено: ${result.path}`; await refreshJava(); }
  catch (error) { $("javaInstallStatus").textContent = `Ошибка установки: ${(error as Error).message}`; }
  finally { button.disabled = false; }
});
const importPackButton = $<HTMLButtonElement>("importPack");
window.launcher.onPackProgress(message => { $("packStatus").textContent = message; });
importPackButton.addEventListener("click", async () => {
  importPackButton.disabled = true;
  try {
    const result = await window.launcher.importPack();
    if (result.canceled) return;
    if (!result.ok) throw new Error(result.error);
    if (result.folder) {
      const patch: Partial<Settings> = { gameDir: result.folder };
      if (result.version) { patch.version = result.version; patch.loaderType = result.loaderType ?? "vanilla"; patch.loaderVersion = result.loaderVersion ?? ""; }
      else { patch.loaderType = "vanilla"; patch.loaderVersion = ""; }
      settings = await window.launcher.updateSettings(patch);
      await window.launcher.saveProfile(result.name || "Импортированная сборка");
      await refreshProfiles();
      versionsLoaded = false;
      updateHeader();
      await refreshInstalled();
    }
    $("packStatus").textContent = `${result.name}: ${result.warning || result.message} Выбрана папка: ${result.folder}. ${result.warning ? "Вы можете повторить установку во вкладке «Версии»." : ""}`;
  } catch (error) { $("packStatus").textContent = `Ошибка импорта: ${(error as Error).message}`; }
  finally { importPackButton.disabled = false; }
});
const installedVersion = $<HTMLSelectElement>("installedVersion");
let localVersions: Array<{ id: string; version: string; loaderType: LoaderType; loaderVersion: string }> = [];
async function refreshInstalled() {
  try {
    localVersions = await window.launcher.installedVersions();
    installedVersion.replaceChildren();
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = localVersions.length ? "Выбери установленную версию" : "Установленные версии не найдены"; installedVersion.append(placeholder);
    for (const item of localVersions) {
      const option = document.createElement("option"); option.value = item.id; option.textContent = item.id; installedVersion.append(option);
      if (item.version === settings.version && item.loaderType === settings.loaderType && item.loaderVersion === settings.loaderVersion) installedVersion.value = item.id;
    }
  } catch (error) { $("installedHint").textContent = `Ошибка: ${(error as Error).message}`; }
}
$("refreshInstalled").addEventListener("click", () => void refreshInstalled());
installedVersion.addEventListener("change", async () => {
  const item = localVersions.find((entry) => entry.id === installedVersion.value);
  if (!item) return;
  try {
    settings = await window.launcher.updateSettings({ version: item.version, loaderType: item.loaderType, loaderVersion: item.loaderVersion });
    updateHeader();
    $("installedHint").textContent = `Выбрано: ${item.id}`;
  } catch (error) { $("installedHint").textContent = `Ошибка: ${(error as Error).message}`; }
});
const contentWorld = $<HTMLSelectElement>("contentWorld");
const catalogStatus = $<HTMLElement>("catalogStatus");
const contentResults = $<HTMLElement>("contentResults");
let catalogRequest = 0;
let catalogOffset = 0;
let catalogTotal = 0;
contentType.addEventListener("change", async () => {
  catalogRequest++;
  catalogOffset = 0;
  contentResults.replaceChildren();
  $("worldRow").classList.toggle("hidden", contentType.value !== "datapack");
  if (contentType.value === "datapack") {
    try {
      const worlds = await window.launcher.listWorlds();
      contentWorld.replaceChildren(...worlds.map((world) => { const option = document.createElement("option"); option.value = world; option.textContent = world; return option; }));
    } catch (error) { catalogStatus.textContent = `Ошибка: ${(error as Error).message}`; }
  }
  void searchCatalog();
});
contentWorld.addEventListener("change", () => { catalogOffset = 0; void searchCatalog(); });
$("contentSearch").addEventListener("click", () => { catalogOffset = 0; void searchCatalog(); });
$("catalogPrev").addEventListener("click", () => { catalogOffset = Math.max(0, catalogOffset - 30); void searchCatalog(); });
$("catalogNext").addEventListener("click", () => { if (catalogOffset + 30 < catalogTotal) { catalogOffset += 30; void searchCatalog(); } });
async function searchCatalog() {
  const request = ++catalogRequest;
  const type = contentType.value;
  contentResults.replaceChildren();
  catalogStatus.textContent = "Поиск в Modrinth...";
  try {
    const [page, installedRows] = await Promise.all([
      window.launcher.searchContent(type, $<HTMLInputElement>("contentQuery").value.trim(), catalogOffset),
      window.launcher.installedContent(type, contentWorld.value),
    ]);
    if (request !== catalogRequest) return;
    const installed = new Map(installedRows.map(row => [row.id, row.enabled]));
    catalogTotal = page.total;
    $("catalogPage").textContent = `Страница ${Math.floor(catalogOffset / 30) + 1} из ${Math.max(1, Math.ceil(catalogTotal / 30))}`;
    ($("catalogPrev") as HTMLButtonElement).disabled = catalogOffset === 0;
    ($("catalogNext") as HTMLButtonElement).disabled = catalogOffset + 30 >= catalogTotal;
    catalogStatus.textContent = `Найдено: ${catalogTotal} · Minecraft ${settings.version}` + (type === "mod" && settings.loaderType === "vanilla" ? " · Для установки выбери загрузчик во вкладке «Версии»." : "");
    for (const project of page.hits) {
      const row = document.createElement("div"); row.className = "catalog-item";
      const icon = document.createElement("div"); icon.className = "catalog-icon";
      if (project.icon && /^https:\/\/cdn\.modrinth\.com\//.test(project.icon)) { const image = document.createElement("img"); image.src = project.icon; image.alt = ""; image.referrerPolicy = "no-referrer"; icon.append(image); } else icon.textContent = "✦";
      const info = document.createElement("div");
      const title = document.createElement("strong"); title.textContent = project.title;
      const author = document.createElement("span"); author.className = "catalog-author"; author.textContent = ` · ${project.author}`;
      const description = document.createElement("p"); description.className = "hint"; description.textContent = project.description;
      const meta = document.createElement("p"); meta.className = "hint"; meta.textContent = `↓ ${project.downloads.toLocaleString("ru-RU")} · ${(project.categories ?? []).slice(0, 4).join(" · ")}`;
      info.append(title, author, description, meta);
      const button = document.createElement("button"); button.className = "ghost"; button.textContent = "Установить";
      const syncButton = () => {
        const state = installed.get(project.id);
        button.classList.remove("installed", "off");
        if (state === undefined) { button.textContent = "Установить"; button.disabled = false; return; }
        button.disabled = false;
        if (state) { button.classList.add("installed"); button.textContent = "✓ Включён"; }
        else { button.classList.add("off"); button.textContent = "✗ Отключён"; }
      };
      syncButton();
      button.addEventListener("click", async () => {
        button.disabled = true;
        const state = installed.get(project.id);
        if (state === undefined) {
          try {
            if (type === "datapack" && !contentWorld.value) throw new Error("Сначала выбери мир");
            catalogStatus.textContent = `Скачивание: ${project.title}...`;
            const result = await window.launcher.installContent(type, project.id, contentWorld.value);
            catalogStatus.textContent = `Установлен файл ${result.name}.` + (result.dependencies ? ` Требуется зависимостей: ${result.dependencies}; установи их отдельно на странице проекта Modrinth.` : "");
            installed.set(project.id, true);
            syncButton();
          } catch (error) { catalogStatus.textContent = `Ошибка: ${(error as Error).message}`; button.disabled = false; }
          return;
        }
        try {
          const next = !state;
          await window.launcher.toggleContent(type, contentWorld.value, project.id, next);
          installed.set(project.id, next);
          syncButton();
          catalogStatus.textContent = next ? `${project.title}: включён.` : `${project.title}: отключён (файл переименован в .disabled).`;
        } catch (error) { catalogStatus.textContent = `Ошибка: ${(error as Error).message}`; }
        button.disabled = false;
      });
      row.append(icon, info, button); contentResults.append(row);
    }
  } catch (error) { if (request === catalogRequest) catalogStatus.textContent = `Ошибка поиска: ${(error as Error).message}`; }
}

document.querySelectorAll<HTMLButtonElement>("[data-import]").forEach((button) => {
  button.addEventListener("click", async () => {
    const status = $<HTMLElement>("contentStatus");
    button.disabled = true;
    try {
      const result = await window.launcher.importContent(button.dataset.import ?? "");
      if (result.canceled) return;
      if (!result.ok) throw new Error(result.error ?? "Ошибка установки");
      status.textContent = `Скопировано: ${result.installed?.length ?? 0}, пропущено (уже существует): ${result.skipped?.length ?? 0}. Папка: ${result.folder}`;
    } catch (error) {
      status.textContent = `Ошибка: ${(error as Error).message}`;
    } finally {
      button.disabled = false;
    }
  });
});

/* ---------- Скачивание версии ---------- */

downloadBtn.addEventListener("click", async () => {
  if (downloading) return;
  if (settings.loaderType !== "vanilla" && !loaderVersionEl.value) {
    dlStatus.textContent = "Выберите доступную версию загрузчика.";
    return;
  }

  downloading = true;
  loaderTypeEl.disabled = true;
  loaderVersionEl.disabled = true;
  downloadBtn.disabled = true;
  cancelDownloadBtn.classList.remove("hidden");
  dlStatus.textContent = "Начинаю загрузку...";
  setDownloadProgress(0);

  try {
    const type = settings.loaderType;
    const mcVersion = settings.version;
    const loaderVersion = loaderVersionEl.value;
    let result = await window.launcher.downloadVersion(mcVersion);
    if (result.ok && type !== "vanilla") {
      if (!loaderVersion) throw new Error("Выберите версию загрузчика");
      dlStatus.textContent = `Установка ${type} ${loaderVersion}...`;
      result = await window.launcher.installLoader({ type, minecraftVersion: mcVersion, loaderVersion });
      if (result.ok) {
        settings = await window.launcher.updateSettings({ loaderType: type, loaderVersion, version: mcVersion });
        updateHeader();
      }
    }

    if (result.ok) {
      setDownloadProgress(100);
      dlStatus.textContent = "Готово — версия скачана";
      versionsLoaded = false;
      await loadVersions(true);
    } else if (result.canceled) {
      dlStatus.textContent = "Загрузка отменена";
    } else {
      dlStatus.textContent = result.error ?? "Ошибка загрузки";
      appendLog(`[error] ${result.error ?? "Ошибка загрузки"}`);
    }
  } catch (error) {
    dlStatus.textContent = "Ошибка загрузки";
    appendLog(`[error] ${(error as Error).message ?? error}`);
  } finally {
    downloading = false;
    loaderTypeEl.disabled = false;
    loaderVersionEl.disabled = !loaderVersionEl.options.length;
    downloadBtn.disabled = false;
    cancelDownloadBtn.classList.add("hidden");
    updateDownloadState();
  }
});

cancelDownloadBtn.addEventListener("click", () => {
  dlStatus.textContent = "Отмена...";
  void window.launcher.cancelDownload();
});

window.launcher.onVersionProgress((progress) => {
  if (!downloading) return;

  const percent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  setDownloadProgress(percent);

  const phaseNames: Record<string, string> = {
    version: "JSON версии",
    client: "Клиент",
    libraries: "Библиотеки",
    assets: "Ассеты",
    logging: "Лог-конфиг",
    done: "Готово",
  };

  const phase = phaseNames[progress.phase] ?? progress.phase;
  dlStatus.textContent = progress.label
    ? `${phase} · ${progress.label}`
    : phase;
});

/* ---------- Папка и темы ---------- */

pickFolderBtn.addEventListener("click", async () => {
  const folder = await window.launcher.pickFolder();
  if (!folder) return;

  settings.gameDir = folder;
  await window.launcher.updateSettings({ gameDir: folder });
  gameDirEl.textContent = folder;
  gameDirEl.title = folder;

  versionsLoaded = false;
  versions = [];
  if (currentView === "versions") {
    void loadVersions(true);
  }
});

openGameFolder.addEventListener("click", () => {
  if (settings.gameDir) void window.launcher.openPath(settings.gameDir);
});

document
  .querySelectorAll<HTMLButtonElement>("[data-theme-pick]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themePick as Theme;
      settings.theme = theme;
      applyTheme(theme);
      void window.launcher.updateSettings({ theme });
    });
  });

resetSettingsBtn.addEventListener("click", async () => {
  const max = maxMemoryGb();
  const memoryGb = Math.max(2, Math.min(8, Math.round(max / 4)));

  settings = await window.launcher.updateSettings({
    theme: "dark",
    memoryGb,
    version: "1.20.1",
    showSnapshots: false,
  });

  applyTheme(settings.theme);
  showSnapshots.checked = settings.showSnapshots;
  setupMemory();
  updateHeader();
  renderVersions();
  versionsLoaded = false;
  await loadVersions(true);
});

showSnapshots.addEventListener("change", () => {
  settings.showSnapshots = showSnapshots.checked;
  persist({ showSnapshots: showSnapshots.checked });
  renderVersions();
});

versionSearch.addEventListener("input", renderVersions);

memorySettings.addEventListener("input", () => {
  const gb = Number(memorySettings.value);
  settings.memoryGb = gb;
  setMemoryLabel(gb);

  clearTimeout(memorySaveTimer);
  memorySaveTimer = setTimeout(() => persist({ memoryGb: gb }), 300);
});

document.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.nav;
    if (target) showView(target);
  });
});

/* ---------- Аккаунт и запуск ---------- */

let authState: AuthState = { signedIn: false };

function setAvatar(letter: string, uuid?: string) {
  accountAvatarText.textContent = letter || "?";
  accountAvatarText.classList.remove("hidden");
  accountAvatarImg.classList.add("hidden");
  if (!uuid) {
    accountAvatarImg.removeAttribute("src");
    return;
  }
  accountAvatarImg.onload = () => {
    accountAvatarText.classList.add("hidden");
    accountAvatarImg.classList.remove("hidden");
  };
  accountAvatarImg.onerror = () => {
    accountAvatarText.classList.remove("hidden");
    accountAvatarImg.classList.add("hidden");
  };
  accountAvatarImg.src = `https://mc-heads.net/avatar/${uuid}/72`;
}

function renderAccount() {
  const offline = offlineEl.checked;

  nicknameField.classList.toggle("hidden", !offline);
  signInBtn.classList.toggle("hidden", offline || authState.signedIn);
  signOutBtn.classList.toggle("hidden", offline || !authState.signedIn);

  if (offline) {
    const nick = nicknameEl.value.trim() || "Player";
    accountName.textContent = `Офлайн: ${nick}`;
    accountSub.textContent = "Офлайн-профиль";
    accountHint.innerHTML =
      "Офлайн-профиль подходит для одиночной игры и серверов с <code>online-mode=false</code>.";
    setAvatar(nick.charAt(0).toUpperCase());
    return;
  }

  if (authState.signedIn) {
    accountName.textContent = authState.name;
    accountSub.textContent = "Microsoft · вход выполнен";
    accountHint.innerHTML =
      "Лицензионный вход активен: работают скины и серверы с <code>online-mode=true</code>.";
    setAvatar(authState.name.charAt(0).toUpperCase(), authState.uuid);
  } else {
    accountName.textContent = "Гость";
    accountSub.textContent = "Вход не выполнен";
    accountHint.innerHTML =
      "Нажмите «Войти» — откроется страница Microsoft с кодом. Пароль вводится только на сайте Microsoft.";
    setAvatar("?");
  }
}

function resetPlayButton() {
  playBtn.disabled = false;
  playBtn.textContent = "Играть";
}

function updateAccountHint() {
  renderAccount();
}

offlineEl.addEventListener("change", () => {
  updateAccountHint();
  persist({ offlineMode: offlineEl.checked });
});

nicknameEl.addEventListener("input", () => {
  if (offlineEl.checked) renderAccount();
});

signInBtn.addEventListener("click", async () => {
  if (signInBtn.disabled) return;
  signInBtn.disabled = true;
  signInBtn.textContent = "Ожидание...";
  authCard.classList.remove("hidden");
  authCode.textContent = "---------";
  setStatus("Ожидание входа в Microsoft...", 0);

  const result = await window.launcher.signIn();

  signInBtn.disabled = false;
  signInBtn.textContent = "Войти";

  if (!result.ok) {
    authCard.classList.add("hidden");
    appendLog(`[auth] ${result.error ?? "не удалось войти"}`);
    setStatus(result.error ?? "Вход не выполнен", 0, true);
    renderAccount();
    return;
  }

  authCard.classList.add("hidden");
  authState = { signedIn: true, name: result.name ?? "", uuid: result.uuid ?? "" };
  renderAccount();
  setStatus(`Вход выполнен: ${result.name ?? ""}`);
});

signOutBtn.addEventListener("click", async () => {
  await window.launcher.signOut();
  authState = { signedIn: false };
  renderAccount();
  appendLog("Вы вышли из аккаунта Microsoft.");
});

window.launcher.onAuthState((state) => {
  authState = state;
  renderAccount();
  if (state.signedIn) authCard.classList.add("hidden");
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
  if (playBtn.disabled) return;

  playBtn.disabled = true;
  playBtn.textContent = "Запуск...";
  authCard.classList.add("hidden");
  logLines = [];
  logEl.textContent = "";
  setStatus("Подготовка...", 0);

  const result = await window.launcher.start({
    version: settings.version,
    root: settings.gameDir,
    memoryMax: `${settings.memoryGb}G`,
    memoryMin: `${Math.min(settings.memoryGb, 2)}G`,
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
  authCard.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

/* ---------- Старт ---------- */

async function bootstrap() {
  const initialTheme =
    (document.documentElement.dataset.theme as Theme | undefined) ?? "dark";
  applyTheme(initialTheme);

  try {
    settings = await window.launcher.getSettings();
  } catch (error) {
    appendLog(`[error] Настройки: ${(error as Error).message ?? error}`);
  }

  try {
    appVersion = await window.launcher.getVersion();
  } catch {
    // остаётся версия из сборки
  }

  try {
    system = await window.launcher.getSystemInfo();
  } catch {
    system = null;
  }

  applyTheme(settings.theme);
  setupMemory();
  syncSettingsUI();
  updateHeader();
  updateAccountHint();
  void window.launcher
    .getAuthState()
    .then((state) => {
      authState = state;
      renderAccount();
    })
    .catch(() => {});
  void refreshInstalled();
  void refreshProfiles().catch(error => appendLog(`[error] Профили: ${error.message}`));
  void refreshJava();
}

void bootstrap();
