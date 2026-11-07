import { writeFileSync } from "node:fs";
import { launch } from "./core";

const DRY_RUN = process.argv.includes("--dry-run");
const OFFLINE = process.argv.includes("--offline");

async function main() {
  await launch(
    { offline: OFFLINE || DRY_RUN },
    {
      onLog: (line) => console.log(line),

      onProgress: (p) =>
        console.log(`[progress] ${p.type}: ${p.task}/${p.total}`),

      onDownload: (d) =>
        console.log(`[download] ${d.name} ${d.current}/${d.total}`),

      onDeviceCode: ({ verificationUri, userCode }) => {
        console.log("");
        console.log("Откройте в браузере:", verificationUri);
        console.log("И введите код:      ", userCode);
        console.log("");
      },

      onArguments: (args) => {
        writeFileSync("last-launch-args.json", JSON.stringify(args, null, 2));

        const cpIndex = args.indexOf("-cp");
        const classPath = cpIndex !== -1 ? args[cpIndex + 1] : "";
        const mainClass = cpIndex !== -1 ? args[cpIndex + 2] : "?";

        console.log("");
        console.log("=== Аргументы запуска ===");
        console.log("Всего аргументов:     ", args.length);
        console.log("Записей в classpath:  ", classPath.split(";").length);
        console.log("mainClass:            ", mainClass);
        console.log("Сохранено в:           last-launch-args.json");

        if (DRY_RUN) {
          console.log("Режим --dry-run: Java не запускаем.");
          process.exit(0);
        }
      },

      onStarted: (pid) => console.log("Minecraft запущен, PID:", pid),

      onClose: (code) => console.log("Игра завершилась. Код:", code),
    }
  );
}

main().catch((err) => {
  console.error("Ошибка запуска:", err?.message ?? err);
  process.exit(1);
});
