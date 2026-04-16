import type { CollectionEvent, WasteStream } from "../domain/types.js";

const STREAM_ORDER: WasteStream[] = ["garbage", "recycling", "organics"];

function shiftIsoDate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

export function sortWasteStreams(streams: WasteStream[]): WasteStream[] {
  const uniqueStreams = new Set(streams);
  return STREAM_ORDER.filter((stream) => uniqueStreams.has(stream));
}

function normalizeEventStreams(event: CollectionEvent): WasteStream[] {
  const baseStreams = sortWasteStreams(event.streams);
  if (
    event.source === "halifax-live" &&
    !baseStreams.includes("organics") &&
    (baseStreams.includes("garbage") || baseStreams.includes("recycling"))
  ) {
    return sortWasteStreams([...baseStreams, "organics"]);
  }

  return baseStreams;
}

export function normalizeCollectionEvents(events: CollectionEvent[]): CollectionEvent[] {
  const mergedByDate = new Map<string, CollectionEvent>();

  for (const event of events) {
    const normalizedStreams = normalizeEventStreams(event);
    const existing = mergedByDate.get(event.date);
    if (!existing) {
      mergedByDate.set(event.date, {
        ...event,
        streams: normalizedStreams
      });
      continue;
    }

    mergedByDate.set(event.date, {
      ...existing,
      streams: sortWasteStreams([...existing.streams, ...normalizedStreams]),
      status: existing.status === "scheduled" ? event.status : existing.status,
      source: existing.source || event.source,
      notes: existing.notes ?? event.notes
    });
  }

  const sortedEvents = [...mergedByDate.values()].sort((left, right) => left.date.localeCompare(right.date));

  return sortedEvents.map((event, index) => ({
    ...event,
    weekStart: index === 0 ? shiftIsoDate(event.date, -7) : sortedEvents[index - 1]!.date,
    weekEnd: event.date
  }));
}
