import { appendFileSync } from "node:fs";
import { signInCached } from "./auth";
import { CLIENT_ID } from "./config";

const LOG = "D:/Temp/opencode/auth-retry.log";
const log = (line: string) => appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`, "utf8");

process.env.VOID_SESSION_PATH = "D:/Temp/opencode/auth-session.json";

log(`try client=${CLIENT_ID}`);

signInCached(CLIENT_ID, (info) => log(`CODE ${info.userCode} ${info.verificationUri}`))
  .then((session) => {
    log(`OK name=${session.minecraft.name} uuid=${session.minecraft.uuid}`);
    process.exit(0);
  })
  .catch((error) => {
    log(`FAIL ${(error as Error).message.split("\n")[0]}`);
    process.exit(1);
  });
