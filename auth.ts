import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Авторизация Microsoft → Xbox Live → Minecraft Services.
 *
 * Поток:
 *   1. device code: просим у Microsoft код, пользователь вводит его в браузере
 *   2. опрашиваем token endpoint, пока пользователь не подтвердит вход
 *   3. меняем Microsoft access_token на Xbox Live token (XBL)
 *   4. меняем XBL на XSTS token с RelyingParty = api.minecraftservices.com
 *   5. меняем XSTS на Minecraft access_token
 *   6. получаем профиль (uuid + ник)
 */

const TENANT = "consumers";
const SCOPE = "XboxLive.signin offline_access";
const DEVICE_CODE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/devicecode`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const SESSION_PATH = "auth/session.json";

// В GUI сессия лежит в userData (папка установки может быть только для чтения).
function sessionPath(): string {
  return process.env.VOID_SESSION_PATH?.trim() || SESSION_PATH;
}

// Токены Microsoft сохраняются отдельно и сразу после входа: если Minecraft
// Services отклонит запрос, повторная попытка не потребует нового кода.
interface PendingMs {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

function pendingMsPath(): string {
  return sessionPath().replace(/\.json$/i, ".ms.json");
}

export function loadPendingMs(): PendingMs | null {
  const file = pendingMsPath();
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as PendingMs;
  } catch {
    return null;
  }
}

function savePendingMs(token: any) {
  const file = pendingMsPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expires_at: Date.now() + (token.expires_in ?? 3600) * 1000,
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
}

export function clearPendingMs() {
  const file = pendingMsPath();
  if (existsSync(file)) unlinkSync(file);
}

export interface Session {
  client_id: string;
  ms: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  minecraft: {
    access_token: string;
    expires_at: number;
    uuid: string;
    name: string;
    xuid: string;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postForm(
  url: string,
  body: Record<string, string>
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  return res.json();
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; ok: boolean; data: any }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

// --- 1. Device code flow ----------------------------------------------------

export interface DeviceCodeInfo {
  verificationUri: string;
  userCode: string;
}

async function deviceCodeLogin(
  clientId: string,
  onDeviceCode?: (info: DeviceCodeInfo) => void
) {
  const start = await postForm(DEVICE_CODE_URL, {
    client_id: clientId,
    scope: SCOPE,
  });

  if (!start.device_code) {
    throw new Error(
      `Microsoft не выдал код: ${start.error_description ?? JSON.stringify(start)}`
    );
  }

  const info: DeviceCodeInfo = {
    verificationUri: start.verification_uri,
    userCode: start.user_code,
  };

  if (onDeviceCode) {
    onDeviceCode(info);
  } else {
    console.log("");
    console.log("Откройте в браузере:", info.verificationUri);
    console.log("И введите код:      ", info.userCode);
    console.log("");
    console.log("Жду подтверждения входа...");
  }

  let intervalMs = (start.interval ?? 5) * 1000;
  const deadline = Date.now() + (start.expires_in ?? 900) * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalMs);

    const token = await postForm(TOKEN_URL, {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: clientId,
      device_code: start.device_code,
    });

    if (token.access_token) return token;

    if (token.error === "authorization_pending") continue;
    if (token.error === "slow_down") {
      intervalMs += 5000;
      continue;
    }

    throw new Error(
      `Ошибка входа: ${token.error_description ?? token.error ?? "неизвестно"}`
    );
  }

  throw new Error("Код истёк. Запустите вход заново.");
}

async function refreshMicrosoft(clientId: string, refreshToken: string) {
  const token = await postForm(TOKEN_URL, {
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
    scope: SCOPE,
  });

  if (!token.access_token) {
    throw new Error(
      `Не удалось обновить токен: ${token.error_description ?? token.error}`
    );
  }

  return {
    ...token,
    // Microsoft не всегда присылает новый refresh_token
    refresh_token: token.refresh_token ?? refreshToken,
  };
}

// --- 2. Xbox Live → XSTS → Minecraft ---------------------------------------

async function authenticateXbox(msAccessToken: string) {
  const xbl = await postJson("https://user.auth.xboxlive.com/user/authenticate", {
    Properties: {
      AuthMethod: "RPS",
      SiteName: "user.auth.xboxlive.com",
      RpsTicket: `d=${msAccessToken}`,
    },
    RelyingParty: "http://auth.xboxlive.com",
    TokenType: "JWT",
  });

  if (!xbl.ok || !xbl.data?.Token) {
    throw new Error(`Xbox Live отклонил вход: ${JSON.stringify(xbl.data)}`);
  }

  const uhs = xbl.data.DisplayClaims.xui[0].uhs as string;

  const xsts = await postJson("https://xsts.auth.xboxlive.com/xsts/authorize", {
    Properties: {
      SandboxId: "RETAIL",
      UserTokens: [xbl.data.Token],
    },
    RelyingParty: "rp://api.minecraftservices.com/",
    TokenType: "JWT",
  });

  if (!xsts.ok || !xsts.data?.Token) {
    const hints: Record<number, string> = {
      2148916233:
        "У аккаунта нет профиля Xbox. Войдите на xbox.com и создайте его.",
      2148916235: "Xbox Live недоступен в регионе аккаунта.",
      2148916238:
        "Аккаунт ребёнка. Взрослый должен добавить его в семейную группу Microsoft.",
    };
    const code = xsts.data?.XErr;
    throw new Error(hints[code] ?? `XSTS отклонил запрос: ${JSON.stringify(xsts.data)}`);
  }

  return {
    uhs,
    xstsToken: xsts.data.Token as string,
    xuid: xsts.data.DisplayClaims.xui[0].xid as string,
  };
}

async function loginMinecraft(xstsToken: string, uhs: string) {
  const res = await postJson(
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    { identityToken: `XBL3.0 x=${uhs};${xstsToken}` }
  );

  if (res.status === 403) {
    const message = String(res.data?.errorMessage ?? "");
    if (message.toLowerCase().includes("invalid app registration")) {
      throw new Error(
        "Minecraft Services не принял client ID приложения.\n" +
          `Ответ сервера: ${JSON.stringify(res.data)}\n` +
          "Если заявка на allowlist уже одобрена — проверь, что одобрен именно этот client ID " +
          "и что прошло немного времени после одобрения."
      );
    }
  }

  if (!res.ok || !res.data?.access_token) {
    throw new Error(
      `Minecraft Services отклонил вход: ${JSON.stringify(res.data)}`
    );
  }

  return res.data as { access_token: string; expires_in: number };
}

async function getProfile(mcAccessToken: string) {
  const res = await fetch(
    "https://api.minecraftservices.com/minecraft/profile",
    { headers: { Authorization: `Bearer ${mcAccessToken}` } }
  );

  if (res.status === 404) {
    throw new Error(
      "На этом аккаунте нет Minecraft: Java Edition (или профиль недоступен)."
    );
  }

  const profile: any = await res.json();
  if (!res.ok || !profile?.id) {
    throw new Error(`Не удалось получить профиль: ${JSON.stringify(profile)}`);
  }

  return profile as { id: string; name: string };
}

// --- 3. Полный цикл и кэш сессии -------------------------------------------

async function fullLogin(clientId: string, ms: any): Promise<Session> {
  const xbox = await authenticateXbox(ms.access_token);
  const mc = await loginMinecraft(xbox.xstsToken, xbox.uhs);
  const profile = await getProfile(mc.access_token);

  return {
    client_id: clientId,
    ms: {
      access_token: ms.access_token,
      refresh_token: ms.refresh_token,
      expires_at: Date.now() + (ms.expires_in ?? 3600) * 1000,
    },
    minecraft: {
      access_token: mc.access_token,
      expires_at: Date.now() + (mc.expires_in ?? 86400) * 1000,
      uuid: profile.id,
      name: profile.name,
      xuid: xbox.xuid,
    },
  };
}

export function loadSession(): Session | null {
  const file = sessionPath();
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  const file = sessionPath();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(session, null, 2), {
    mode: 0o600,
  });
}

export function clearSession() {
  const file = sessionPath();
  if (existsSync(file)) unlinkSync(file);
}

/**
 * Явный вход по кнопке в GUI: всегда запускает device-code flow,
 * чтобы можно было сменить аккаунт.
 */
export async function signIn(
  clientId: string,
  onDeviceCode?: (info: DeviceCodeInfo) => void
): Promise<Session> {
  const ms = await deviceCodeLogin(clientId, onDeviceCode);
  savePendingMs(ms);
  const session = await fullLogin(clientId, ms);
  saveSession(session);
  clearPendingMs();
  return session;
}

/**
 * Вход с повторным использованием уже полученного токена Microsoft.
 * Полезно, если Minecraft Services временно отклонил запрос: следующий клик
 * по «Войти» не потребует нового кода.
 */
export async function signInCached(
  clientId: string,
  onDeviceCode?: (info: DeviceCodeInfo) => void
): Promise<Session> {
  const pending = loadPendingMs();

  let ms: any;
  if (pending) {
    try {
      ms = await refreshMicrosoft(clientId, pending.refresh_token);
      savePendingMs(ms);
    } catch {
      clearPendingMs();
    }
  }

  if (!ms) {
    ms = await deviceCodeLogin(clientId, onDeviceCode);
    savePendingMs(ms);
  }

  const session = await fullLogin(clientId, ms);
  saveSession(session);
  clearPendingMs();
  return session;
}

/**
 * Возвращает рабочую сессию:
 * - если есть сохранённая и токен Minecraft ещё жив — используем её;
 * - иначе обновляем Microsoft-токен по refresh_token;
 * - если обновить не вышло — полный вход через device code.
 */
export async function ensureAuth(
  clientId: string,
  onDeviceCode?: (info: DeviceCodeInfo) => void
): Promise<Session> {
  const saved = loadSession();

  if (saved && saved.client_id === clientId) {
    const mcAlive = saved.minecraft.expires_at - Date.now() > 5 * 60 * 1000;

    if (mcAlive) {
      console.log("Использую сохранённую сессию.");
      return saved;
    }

    try {
      console.log("Обновляю токены...");
      const ms = await refreshMicrosoft(clientId, saved.ms.refresh_token);
      const session = await fullLogin(clientId, ms);
      saveSession(session);
      return session;
    } catch (err) {
      console.warn("Не удалось обновить сессию:", (err as Error).message);
      console.warn("Потребуется войти заново.");
    }
  }

  const ms = await deviceCodeLogin(clientId, onDeviceCode);
  console.log("Вход подтверждён, получаю токены Minecraft...");
  const session = await fullLogin(clientId, ms);
  saveSession(session);
  return session;
}
