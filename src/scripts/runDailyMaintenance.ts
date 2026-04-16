import path from "node:path";
import { loadConfig } from "../config.js";
import { FileStore } from "../data/fileStore.js";
import { AssignmentService } from "../services/assignmentService.js";
import { ConsoleNotificationService } from "../services/consoleNotificationService.js";
import { FileScheduleProvider } from "../services/fileScheduleProvider.js";
import { HalifaxScheduleProvider } from "../services/halifaxScheduleProvider.js";
import { runDailyMaintenance } from "../services/maintenanceService.js";
import { RotationService } from "../services/rotationService.js";
import { TelegramNotificationService } from "../services/telegramNotificationService.js";
import { getZonedDateTimeParts } from "../lib/zonedDateTime.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new FileStore(config.stateFile, config.houseAddress, config.appTimezone, config.scheduleSource);
  const assignmentService = new AssignmentService(new RotationService());
  const scheduleProvider =
    config.scheduleSource === "halifax"
      ? new HalifaxScheduleProvider(config.houseAddress, config.halifaxImportFile, config.halifaxPlaceId)
      : new FileScheduleProvider(path.resolve(process.cwd(), "./data/sampleSchedule.json"));
  const notificationService =
    config.telegramBotToken && config.telegramChatId
      ? new TelegramNotificationService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleNotificationService();

  const state = await store.load();
  const today = getZonedDateTimeParts(config.appTimezone).date;
  const result = await runDailyMaintenance({
    state,
    today,
    timeZone: config.appTimezone,
    appBaseUrl: config.appBaseUrl,
    scheduleProvider,
    assignmentService,
    notificationService
  });

  await store.save(result.state);
  console.log(JSON.stringify({
    syncedEvents: result.syncedEvents,
    assignmentCreated: result.assignmentCreated,
    weeklyReminderSent: result.weeklyReminderSent,
    dayBeforeReminderSent: result.dayBeforeReminderSent,
    completionCheckSent: result.completionCheckSent,
    assignmentId: result.assignment?.id ?? null
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
