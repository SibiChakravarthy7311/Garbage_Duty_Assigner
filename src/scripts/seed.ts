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
      name: "Mandeep",
      roomNumber: "1",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Sibi",
      roomNumber: "3",
      whatsappNumber: "+17828826094",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Hariesh",
      roomNumber: "2",
      whatsappNumber: "+17828826857",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Venkatraman",
      roomNumber: "4",
      whatsappNumber: "+17828825419",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Kabilesh",
      roomNumber: "5",
      whatsappNumber: "+17828828843",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Ishita",
      roomNumber: "6",
      whatsappNumber: "+12268835757",
      isActive: true
    },
    {
      id: createId("housemate"),
      name: "Gowri",
      roomNumber: "7",
      whatsappNumber: "+17828825663",
      isActive: true
    }
  ];

  state.rooms = [
    { id: createId("room"), label: "Room 1", isActive: true, occupantId: state.housemates[0]?.id },
    { id: createId("room"), label: "Room 2", isActive: true, occupantId: state.housemates[2]?.id },
    { id: createId("room"), label: "Room 3", isActive: true, occupantId: state.housemates[1]?.id },
    { id: createId("room"), label: "Room 4", isActive: true, occupantId: state.housemates[3]?.id },
    { id: createId("room"), label: "Room 5", isActive: true, occupantId: state.housemates[4]?.id },
    { id: createId("room"), label: "Room 6", isActive: true, occupantId: state.housemates[5]?.id },
    { id: createId("room"), label: "Room 7", isActive: true, occupantId: state.housemates[6]?.id }
  ];

  state.rotation.lastAssignedHousemateId = state.housemates[3]?.id;

  await store.save(state);
  console.log(`Seeded state file at ${config.stateFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
