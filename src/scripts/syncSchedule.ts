import path from "node:path";
import { loadConfig } from "../config.js";
import { FileStore } from "../data/fileStore.js";
import { AssignmentService } from "../services/assignmentService.js";
import { FileScheduleProvider } from "../services/fileScheduleProvider.js";
import { HalifaxScheduleProvider } from "../services/halifaxScheduleProvider.js";
import { RotationService } from "../services/rotationService.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new FileStore(config.stateFile, config.houseAddress, config.appTimezone, config.scheduleSource);
  const assignmentService = new AssignmentService(new RotationService());

  const provider =
    config.scheduleSource === "halifax"
      ? new HalifaxScheduleProvider(config.houseAddress, config.halifaxImportFile, config.halifaxPlaceId)
      : new FileScheduleProvider(path.resolve(process.cwd(), "./data/sampleSchedule.json"));

  const events = await provider.sync();
  const state = await store.load();
  const updatedState = assignmentService.syncCollectionEvents(state, events);
  await store.save(updatedState);

  console.log(`Synced ${events.length} collection events.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
