import fs from "node:fs/promises";
import path from "node:path";
import type { CollectionEvent } from "../domain/types.js";
import type { ScheduleProvider } from "./scheduleProvider.js";

export class FileScheduleProvider implements ScheduleProvider {
  constructor(private readonly scheduleFile: string) {}

  async sync(): Promise<CollectionEvent[]> {
    const raw = await fs.readFile(path.resolve(this.scheduleFile), "utf8");
    const events = JSON.parse(raw) as CollectionEvent[];
    return events.sort((left, right) => left.date.localeCompare(right.date));
  }
}
