import fs from "node:fs";
import path from "node:path";

function loadEnvFile(): void {
  const envFile = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envFile)) {
    return;
  }

  const content = fs.readFileSync(envFile, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }
}

export interface RuntimeConfig {
  port: number;
  stateFile: string;
  appTimezone: string;
  houseAddress: string;
  appBaseUrl: string;
  scheduleSource: "file" | "halifax";
  telegramBotToken?: string;
  telegramChatId?: string;
  halifaxImportFile?: string;
  halifaxPlaceId?: string;
}

export function loadConfig(): RuntimeConfig {
  loadEnvFile();
  const scheduleSource = process.env.SCHEDULE_SOURCE === "halifax" ? "halifax" : "file";

  return {
    port: Number(process.env.APP_PORT ?? "3000"),
    stateFile: path.resolve(process.cwd(), process.env.STATE_FILE ?? "./data/state.json"),
    appTimezone: process.env.APP_TIMEZONE ?? "America/Halifax",
    houseAddress: process.env.HOUSE_ADDRESS ?? "Halifax, NS",
    appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
    scheduleSource,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    halifaxImportFile: process.env.HALIFAX_IMPORT_FILE,
    halifaxPlaceId: process.env.HALIFAX_PLACE_ID
  };
}
