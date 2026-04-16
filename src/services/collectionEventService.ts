import type { AppState, CollectionEvent, CollectionStatus, WasteStream } from "../domain/types.js";

const VALID_STATUSES: CollectionStatus[] = ["scheduled", "delayed", "cancelled"];
const VALID_STREAMS: WasteStream[] = ["garbage", "recycling", "organics"];

export interface UpdateCollectionEventInput {
  date?: string;
  streams?: string[];
  status?: string;
  notes?: string;
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizeStreams(streams: string[] | undefined, fallback: WasteStream[]): WasteStream[] {
  if (!streams) {
    return fallback;
  }

  const normalized = Array.from(
    new Set(
      streams
        .map((stream) => stream.trim().toLowerCase())
        .filter((stream): stream is WasteStream => VALID_STREAMS.includes(stream as WasteStream))
    )
  );

  if (normalized.length === 0) {
    throw new Error("At least one valid stream is required.");
  }

  return normalized;
}

function normalizeStatus(status: string | undefined, fallback: CollectionStatus): CollectionStatus {
  if (!status) {
    return fallback;
  }

  const normalized = status.trim().toLowerCase() as CollectionStatus;
  if (!VALID_STATUSES.includes(normalized)) {
    throw new Error(`Unsupported collection status "${status}".`);
  }

  return normalized;
}

export class CollectionEventService {
  update(state: AppState, eventId: string, input: UpdateCollectionEventInput): { state: AppState; event: CollectionEvent } {
    const existing = state.collectionEvents.find((event) => event.id === eventId);
    if (!existing) {
      throw new Error(`Collection event ${eventId} not found.`);
    }

    if (input.date !== undefined && !isIsoDate(input.date)) {
      throw new Error("date must use YYYY-MM-DD format.");
    }

    const updated: CollectionEvent = {
      ...existing,
      date: input.date ?? existing.date,
      streams: normalizeStreams(input.streams, existing.streams),
      status: normalizeStatus(input.status, existing.status),
      notes: input.notes?.trim() || undefined,
      source: existing.source
    };

    return {
      event: updated,
      state: {
        ...state,
        collectionEvents: state.collectionEvents.map((event) => (event.id === eventId ? updated : event))
      }
    };
  }
}
