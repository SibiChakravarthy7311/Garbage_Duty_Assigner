import path from "node:path";
import { loadConfig } from "../config.js";
import { FileStore } from "../data/fileStore.js";
import { AssignmentService } from "../services/assignmentService.js";
import { ConsoleNotificationService } from "../services/consoleNotificationService.js";
import { FileScheduleProvider } from "../services/fileScheduleProvider.js";
import { HalifaxScheduleProvider } from "../services/halifaxScheduleProvider.js";
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

  let state = await store.load();
  const today = getZonedDateTimeParts(config.appTimezone).date;
  const events = await scheduleProvider.sync();
  state = assignmentService.syncCollectionEvents(state, events);

  const assignment = assignmentService.getActiveAssignment(state, today);
  if (!assignment) {
    await store.save(state);
    console.log("No active assignment found.");
    return;
  }

  const context = assignmentService.getAssignmentContext(state, assignment);
  if (!assignmentService.isBackupReminderDue(assignment, context.collectionEvent, config.appTimezone)) {
    await store.save(state);
    console.log(`Day-before reminder is not due for assignment ${assignment.id}.`);
    return;
  }

  await notificationService.sendCollectionBackup({
    assignment,
    assignee: context.assignee,
    collectionEvent: context.collectionEvent,
    address: state.config.address,
    adminUrl: `${config.appBaseUrl}/admin`
  });
  state = assignmentService.markBackupReminderSent(state, assignment.id);
  await store.save(state);
  console.log(`Day-before reminder sent for assignment ${assignment.id}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
