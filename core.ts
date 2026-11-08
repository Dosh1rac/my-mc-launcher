import { Client, Authenticator } from "minecraft-launcher-core";
import { ensureAuth } from "./auth";
import { CLIENT_ID } from "./config";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface LaunchOptions {
  version?: string;
  root?: string;
  javaPath?: string;
  memoryMax?: string;
  memoryMin?: string;
  offline?: boolean;
  username?: string;
  // Поддержка лоадеров
  loader?: {
    type: "forge" | "fabric" | "neoforge" | "vanilla";
    version?: string;
    customVersion?: string;
  };
}

export interface LaunchCallbacks {
  onLog?: (line: string) => void;
  onProgress?: (info: { type: string; task: number; total: number }) => void;
  onDownload?: (info: { name: string; current: number; total: number }) => void;
  onArguments?: (args: string[]) => void;
  onStarted?: (pid: number | undefined) => void;
  onClose?: (code: number | null) => void;
  onDeviceCode?: (info: { verificationUri: string; userCode: string }) => void;
}

async function resolveAuthorization(
  options: LaunchOptions,
  callbacks: LaunchCallbacks
) {
  if (options.offline) {
    const name = options.username?.trim() || "Player";
    callbacks.onLog?.(`Офлайн-профиль: ${name}`);
    return Authenticator.getAuth(name);
  }

  if (!CLIENT_ID) {
    throw new Error(
      "Не задан MS_CLIENT_ID. Проверьте файл .env в папке проекта."
    );
  }

  const session = await ensureAuth(CLIENT_ID, callbacks.onDeviceCode);
  callbacks.onLog?.(`Вход выполнен: ${session.minecraft.name}`);

  return {
    access_token: session.minecraft.access_token,
    client_token: session.minecraft.access_token,
    uuid: session.minecraft.uuid,
    name: session.minecraft.name,
    user_properties: "{}",
    meta: {
      type: "msa" as const,
      xuid: session.minecraft.xuid,
      clientId: CLIENT_ID,
    },
  };
}

export async function launch(
  options: LaunchOptions = {},
  callbacks: LaunchCallbacks = {}
) {
  const client = new Client();
  const log = (line: string) => callbacks.onLog?.(line);

  const isVanilla = !options.loader || options.loader.type === "vanilla";
  const customVersion = options.loader?.customVersion;
  if (!isVanilla) {
    if (!customVersion || !/^[A-Za-z0-9][A-Za-z0-9._+-]{0,255}$/.test(customVersion) || customVersion.includes("..")) {
      throw new Error("Некорректная версия загрузчика");
    }
    if (!existsSync(join(options.root ?? "./.minecraft", "versions", customVersion, `${customVersion}.json`))) {
      throw new Error("Профиль загрузчика не найден. Сначала установите загрузчик.");
    }
  }
  const authorization = await resolveAuthorization(options, callbacks);

  client.on("debug", (msg) => log(String(msg)));
  client.on("data", (msg) => log(String(msg).trim()));

  client.on("progress", (event: any) =>
    callbacks.onProgress?.({
      type: event.type,
      task: event.task,
      total: event.total,
    })
  );

  client.on("download-status", (event: any) =>
    callbacks.onDownload?.({
      name: event.name,
      current: event.current,
      total: event.total,
    })
  );

  client.on("arguments", (args: string[]) => callbacks.onArguments?.(args));
  client.on("close", (code: number | null) => callbacks.onClose?.(code));

  const proc = await client.launch({
    authorization,
    root: options.root ?? "./.minecraft",
    ...(options.javaPath ? { javaPath: options.javaPath } : {}),
    version: {
      number: options.version ?? "1.20.1",
      type: "release",
      ...(isVanilla ? {} : { custom: customVersion ?? options.version }),
    },
    memory: {
      max: options.memoryMax ?? "4G",
      min: options.memoryMin ?? "2G",
    },
  });

  if (!proc) {
    throw new Error("MCLC не смог запустить процесс Java");
  }

  callbacks.onStarted?.(proc.pid);
  return client;
}
