// Загружаем .env, если он есть (Node 20.12+).
// Файл .env в git не попадает — там может лежать что-то приватное.
try {
  process.loadEnvFile(".env");
} catch {
  // .env ещё не создан — это нормально
}

export const CLIENT_ID = (process.env.MS_CLIENT_ID ?? "").trim();
