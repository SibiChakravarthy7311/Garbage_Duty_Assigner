import { createDefaultState } from "./defaultState.js";
import type { AppState } from "../domain/types.js";
import { normalizeCollectionEvents } from "../services/collectionEventUtils.js";

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatement;
}

interface AppStateRow {
  value: string;
}

const APP_STATE_KEY = "primary";

export class D1Store {
  constructor(
    private readonly db: D1DatabaseLike,
    private readonly address: string,
    private readonly timezone: string,
    private readonly scheduleSource: "file" | "halifax"
  ) {}

  async load(): Promise<AppState> {
    const row = await this.db
      .prepare("SELECT value FROM app_state WHERE id = ?")
      .bind(APP_STATE_KEY)
      .first<AppStateRow>();

    if (!row) {
      const initial = createDefaultState(this.address, this.timezone, this.scheduleSource);
      await this.save(initial);
      return initial;
    }

    const state = JSON.parse(row.value) as AppState;
    return {
      ...state,
      collectionEvents: normalizeCollectionEvents(state.collectionEvents ?? [])
    };
  }

  async save(state: AppState): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO app_state (id, value, updated_at) VALUES (?, ?, ?) " +
          "ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
      )
      .bind(APP_STATE_KEY, JSON.stringify(state), new Date().toISOString())
      .run();
  }
}
