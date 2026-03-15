import type { CollectionEvent } from "../domain/types.js";

function shiftIsoDate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

export function normalizeCollectionEvents(events: CollectionEvent[]): CollectionEvent[] {
  const sortedEvents = events
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));

  return sortedEvents.map((event, index) => ({
    ...event,
    weekStart: index === 0 ? shiftIsoDate(event.date, -7) : sortedEvents[index - 1]!.date,
    weekEnd: event.date
  }));
}
