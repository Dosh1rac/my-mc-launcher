// Загружаем .env, если он есть (Node 20.12+).
// Файл .env в git не попадает — там может лежать что-то приватное.
try {
  process.loadEnvFile(".env");
} catch {
  // .env ещё не создан — это нормально
}

// Публичный client ID приложения VOID (одобрен Mojang для входа Minecraft).
// Нужен как запасной вариант: в собранном EXE рядом нет .env.
const DEFAULT_CLIENT_ID = "018f817a-1618-41bc-86cd-6fc29bd08da2";

export const CLIENT_ID = (process.env.MS_CLIENT_ID ?? "").trim() || DEFAULT_CLIENT_ID;
