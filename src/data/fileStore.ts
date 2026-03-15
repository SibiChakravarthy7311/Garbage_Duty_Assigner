import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultState } from "./defaultState.js";
import type { AppState } from "../domain/types.js";
import { normalizeCollectionEvents } from "../services/collectionEventUtils.js";

export class FileStore {
  constructor(
    private readonly stateFile: string,
    private readonly address: string,
    private readonly timezone: string,
    private readonly scheduleSource: "file" | "halifax"
  ) {}

  async load(): Promise<AppState> {
    try {
      const raw = await fs.readFile(this.stateFile, "utf8");
      const state = JSON.parse(raw) as AppState;
      return {
        ...state,
        collectionEvents: normalizeCollectionEvents(state.collectionEvents ?? [])
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }

      const initial = createDefaultState(this.address, this.timezone, this.scheduleSource);
      await this.save(initial);
      return initial;
    }
  }

  async save(state: AppState): Promise<void> {
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2), "utf8");
  }
}
