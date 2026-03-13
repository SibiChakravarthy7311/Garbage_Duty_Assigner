import path from "node:path";
import { loadConfig } from "../config.js";
import { FileStore } from "../data/fileStore.js";
import { ConsoleNotificationService } from "../services/consoleNotificationService.js";
import { FileScheduleProvider } from "../services/fileScheduleProvider.js";
import { HalifaxScheduleProvider } from "../services/halifaxScheduleProvider.js";
import { AssignmentService } from "../services/assignmentService.js";
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

  const assignment = state.assignments.find((entry) => entry.weekStart <= today && entry.weekEnd >= today);
  if (!assignment) {
    console.log("No active weekly assignment exists to resend.");
    await store.save(state);
    return;
  }

  const { assignee, collectionEvent } = assignmentService.getAssignmentContext(state, assignment);
  const notifier =
    config.telegramBotToken && config.telegramChatId
      ? new TelegramNotificationService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleNotificationService();

  await notifier.sendWeeklyStart({
    assignment,
    assignee,
    collectionEvent,
    address: state.config.address,
    adminUrl: `${config.appBaseUrl}/admin`
  });

  await store.save(state);
  console.log(`Weekly reminder resent for ${assignee.name} using assignment ${assignment.id}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
