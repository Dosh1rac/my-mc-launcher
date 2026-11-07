import { writeFileSync } from "node:fs";
import { Client, Authenticator } from "minecraft-launcher-core";

const launcher = new Client();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {

  const auth = await Authenticator.getAuth("Player");

  const opts = {
    authorization: auth,
    root: "./.minecraft",
    version: {
      number: "1.20.1",
      type: "release",
    },
    memory: {
      max: "2G",
      min: "1G",
    },

  };

  launcher.on("debug", (msg) => console.log("[debug]", msg));
  launcher.on("data", (msg) => console.log("[game]", msg.toString().trim()));

  launcher.on("arguments", (args: string[]) => {
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
  });

  launcher.on("progress", (e) =>
    console.log(`[progress] ${e.type}: ${e.task}/${e.total}`)
  );

  launcher.on("download-status", (e) =>
    console.log(`[download] ${e.type} ${e.name} ${e.current}/${e.total}`)
  );

  launcher.on("close", (code) => console.log("Игра завершилась. Код:", code));

  console.log("Скачиваю файлы и запускаю Minecraft...");
  const proc = await launcher.launch(opts);

  if (!proc) {
    throw new Error("MCLC не смог запустить процесс Java");
  }

  console.log("Minecraft запущен, PID:", proc.pid);
}

main().catch((err) => {
  console.error("Ошибка запуска:", err);
  process.exit(1);
});
