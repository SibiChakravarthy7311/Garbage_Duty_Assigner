import { loadConfig } from "../config.js";
import { TelegramNotificationService } from "../services/telegramNotificationService.js";

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.telegramBotToken || !config.telegramChatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must both be set.");
  }

  const notifier = new TelegramNotificationService(config.telegramBotToken, config.telegramChatId);
  const timestamp = new Date().toISOString();

  await notifier.sendTestMessage(`Garbage Duty Assigner test message sent at ${timestamp}`);
  console.log(`Telegram test message sent to chat ${config.telegramChatId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
