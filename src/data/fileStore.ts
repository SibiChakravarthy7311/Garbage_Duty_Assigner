import fs from "node:fs/promises";
import path from "node:path";
import { createDefaultState } from "./defaultState.js";
import type { AppState, Assignment } from "../domain/types.js";
import { normalizeCollectionEvents } from "../services/collectionEventUtils.js";
import { getZonedDateTimeParts } from "../lib/zonedDateTime.js";

const MAX_PAST_ASSIGNMENTS = 7;

function trimAssignments(assignments: Assignment[], timezone: string): Assignment[] {
  const today = getZonedDateTimeParts(timezone).date;
  const sortedAssignments = assignments
    .slice()
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart) || left.createdAt.localeCompare(right.createdAt));
  const pastAssignments = sortedAssignments.filter((assignment) => assignment.weekEnd < today);
  const retainedPastAssignments = pastAssignments.slice(-MAX_PAST_ASSIGNMENTS);
  const activeOrFutureAssignments = sortedAssignments.filter((assignment) => assignment.weekEnd >= today);
  return [...retainedPastAssignments, ...activeOrFutureAssignments];
}

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
        collectionEvents: normalizeCollectionEvents(state.collectionEvents ?? []),
        assignments: trimAssignments(state.assignments ?? [], this.timezone)
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
    const normalizedState: AppState = {
      ...state,
      collectionEvents: normalizeCollectionEvents(state.collectionEvents ?? []),
      assignments: trimAssignments(state.assignments ?? [], this.timezone)
    };
    await fs.mkdir(path.dirname(this.stateFile), { recursive: true });
    await fs.writeFile(this.stateFile, JSON.stringify(normalizedState, null, 2), "utf8");
  }
}
