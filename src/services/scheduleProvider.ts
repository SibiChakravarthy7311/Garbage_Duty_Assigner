import type { CollectionEvent } from "../domain/types.js";

export interface ScheduleProvider {
  sync(): Promise<CollectionEvent[]>;
}
