import type { CollectionEvent } from "../domain/types.js";

export const sampleSchedule: CollectionEvent[] = [
  {
    id: "event_2026_03_16",
    date: "2026-03-16",
    weekStart: "2026-03-09",
    weekEnd: "2026-03-16",
    streams: ["garbage", "organics"],
    status: "scheduled",
    source: "sample"
  },
  {
    id: "event_2026_03_23",
    date: "2026-03-23",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-23",
    streams: ["recycling"],
    status: "scheduled",
    source: "sample"
  },
  {
    id: "event_2026_03_30",
    date: "2026-03-31",
    weekStart: "2026-03-23",
    weekEnd: "2026-03-31",
    streams: ["garbage", "organics"],
    status: "delayed",
    source: "sample",
    notes: "Delayed one day"
  },
  {
    id: "event_2026_04_06",
    date: "2026-04-06",
    weekStart: "2026-03-31",
    weekEnd: "2026-04-06",
    streams: ["recycling"],
    status: "scheduled",
    source: "sample"
  }
];
