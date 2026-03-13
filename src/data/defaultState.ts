import type { AppState } from "../domain/types.js";

export function createDefaultState(address: string, timezone: string, scheduleSource: "file" | "halifax"): AppState {
  return {
    config: {
      address,
      timezone,
      scheduleSource
    },
    housemates: [],
    rooms: [],
    collectionEvents: [],
    assignments: [],
    rotation: {}
  };
}
