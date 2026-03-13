import { loadConfig } from "../config.js";
import { FileStore } from "../data/fileStore.js";
import { createDefaultState } from "../data/defaultState.js";
import { createId } from "../lib/id.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new FileStore(config.stateFile, config.houseAddress, config.appTimezone, config.scheduleSource);

  const state = createDefaultState(config.houseAddress, config.appTimezone, config.scheduleSource);

  state.housemates = [
    {
      id: createId("housemate"),
      name: "Roommate 1",
      roomNumber: "1",
      whatsappNumber: "+19025550001",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Roommate 2",
      roomNumber: "2",
      whatsappNumber: "+19025550002",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Roommate 3",
      roomNumber: "3",
      whatsappNumber: "+19025550003",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Roommate 4",
      roomNumber: "4",
      whatsappNumber: "+19025550004",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Roommate 5",
      roomNumber: "5",
      whatsappNumber: "+19025550005",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Vacant Room",
      roomNumber: "6",
      whatsappNumber: "+19025550006",
      isActive: false,
      notes: "Vacant"
    }
  ];

  state.rooms = [
    { id: createId("room"), label: "Room 1", isActive: true, occupantId: state.housemates[0]?.id },
    { id: createId("room"), label: "Room 2", isActive: true, occupantId: state.housemates[1]?.id },
    { id: createId("room"), label: "Room 3", isActive: true, occupantId: state.housemates[2]?.id },
    { id: createId("room"), label: "Room 4", isActive: true, occupantId: state.housemates[3]?.id },
    { id: createId("room"), label: "Room 5", isActive: true, occupantId: state.housemates[4]?.id },
    { id: createId("room"), label: "Room 6", isActive: false, occupantId: state.housemates[5]?.id },
    { id: createId("room"), label: "Room 7", isActive: false }
  ];

  await store.save(state);
  console.log(`Seeded state file at ${config.stateFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
