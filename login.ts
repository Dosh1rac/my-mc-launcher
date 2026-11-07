import { ensureAuth } from "./auth";
import { CLIENT_ID } from "./config";

if (!CLIENT_ID) {
  console.error(
    "Не задан MS_CLIENT_ID.\n" +
      "1. Скопируйте .env.example в .env\n" +
      "2. Вставьте Application (client) ID из Azure Portal"
  );
  process.exit(1);
}

ensureAuth(CLIENT_ID)
  .then((session) => {
    console.log("");
    console.log("Готово!");
    console.log("  Ник:  ", session.minecraft.name);
    console.log("  UUID: ", session.minecraft.uuid);
    console.log("  XUID: ", session.minecraft.xuid);
    console.log("");
    console.log("Сессия сохранена в auth/session.json (в git не попадает).");
  })
  .catch((err) => {
    console.error("Ошибка входа:", err?.message ?? err);
    process.exit(1);
  });
