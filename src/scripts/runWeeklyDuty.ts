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
  const provider =
    config.scheduleSource === "halifax"
      ? new HalifaxScheduleProvider(config.houseAddress, config.halifaxImportFile, config.halifaxPlaceId)
      : new FileScheduleProvider(path.resolve(process.cwd(), "./data/sampleSchedule.json"));

  let state = await store.load();
  const today = getZonedDateTimeParts(config.appTimezone).date;
  const events = await provider.sync();
  state = assignmentService.syncCollectionEvents(state, events);

  const result = assignmentService.assignCurrentWeek(state, today);
  state = result.state;

  if (!result.assignment) {
    console.log("No duty assignment was created.");
    await store.save(state);
    return;
  }

  const { assignee, collectionEvent } = assignmentService.getAssignmentContext(state, result.assignment);
  const notifier =
    config.telegramBotToken && config.telegramChatId
      ? new TelegramNotificationService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleNotificationService();

  const reminderDue = assignmentService.isPrimaryReminderDue(result.assignment, config.appTimezone);
  const alreadySent = Boolean(result.assignment.primaryReminderSentAt);
  let sentThisRun = false;

  if (reminderDue) {
    await notifier.sendWeeklyStart({
      assignment: result.assignment,
      assignee,
      collectionEvent,
      address: state.config.address,
      adminUrl: `${config.appBaseUrl}/admin`
    });
    state = assignmentService.markPrimaryReminderSent(state, result.assignment.id);
    sentThisRun = true;
  }

  await store.save(state);
  if (sentThisRun) {
    console.log(`Assignment ${result.assignment.id} saved and weekly reminder sent for ${assignee.name}.`);
  } else if (alreadySent) {
    console.log(`Assignment ${result.assignment.id} already had its weekly reminder sent for ${assignee.name}.`);
  } else {
    console.log(`Assignment ${result.assignment.id} saved for ${assignee.name}. Weekly reminder will send at 12:00 PM on ${result.assignment.weekStart}.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
