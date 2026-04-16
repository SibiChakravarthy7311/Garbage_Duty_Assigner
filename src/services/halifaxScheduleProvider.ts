import fs from "node:fs/promises";
import path from "node:path";
import type { CollectionEvent } from "../domain/types.js";
import { normalizeCollectionEvents, sortWasteStreams } from "./collectionEventUtils.js";
import type { ScheduleProvider } from "./scheduleProvider.js";

interface RecollectFlag {
  name?: string;
  subject?: string;
  event_type?: string;
  opts?: {
    event_type?: string;
  };
}

interface RecollectEvent {
  day: string;
  flags?: RecollectFlag[];
}

interface RecollectEventsPayload {
  events?: RecollectEvent[];
}

function mapFlagToStream(flag: RecollectFlag): "garbage" | "recycling" | "organics" | undefined {
  const values = [flag.name, flag.subject].filter(Boolean).join(" ").toLowerCase();

  if (values.includes("garbage")) {
    return "garbage";
  }

  if (values.includes("organic")) {
    return "organics";
  }

  if (values.includes("recycling") || values.includes("recyclables") || values.includes("paperbag")) {
    return "recycling";
  }

  return undefined;
}

function isPickupFlag(flag: RecollectFlag): boolean {
  return flag.event_type === "pickup" || flag.opts?.event_type === "pickup";
}

function shiftIsoDate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

function extractEvents(payload: unknown): RecollectEvent[] {
  if (Array.isArray(payload)) {
    return payload as RecollectEvent[];
  }

  if (payload && typeof payload === "object" && Array.isArray((payload as RecollectEventsPayload).events)) {
    return (payload as RecollectEventsPayload).events ?? [];
  }

  throw new Error("Halifax ReCollect response did not contain an events array.");
}

export class HalifaxScheduleProvider implements ScheduleProvider {
  constructor(
    private readonly address: string,
    private readonly importFile?: string,
    private readonly placeId?: string
  ) {}

  async sync(): Promise<CollectionEvent[]> {
    if (this.placeId) {
      return this.syncFromRecollect();
    }

    if (this.importFile) {
      const raw = await fs.readFile(path.resolve(process.cwd(), this.importFile), "utf8");
      const events = JSON.parse(raw) as CollectionEvent[];
      return normalizeCollectionEvents(events);
    }

    throw new Error(
      `Halifax schedule sync is not fully implemented yet for address "${this.address}". ` +
        "Set HALIFAX_PLACE_ID for direct ReCollect event fetch, use HALIFAX_IMPORT_FILE=./data/halifaxImport.json as a fallback import workflow, " +
        "or keep SCHEDULE_SOURCE=file for the local sample schedule."
    );
  }

  private async syncFromRecollect(): Promise<CollectionEvent[]> {
    const serviceId = 330;
    const today = new Date().toISOString().slice(0, 10);
    const after = shiftIsoDate(today, -35);
    const before = shiftIsoDate(today, 120);
    const url = new URL(`https://api.recollect.net/api/places/${this.placeId}/services/${serviceId}/events`);
    url.searchParams.set("nomerge", "1");
    url.searchParams.set("hide", "reminder_only");
    url.searchParams.set("after", after);
    url.searchParams.set("before", before);
    url.searchParams.set("locale", "en");
    url.searchParams.set("include_message", "email");
    url.searchParams.set("_", Math.floor(Date.now() / 1000).toString());

    const response = await fetch(url, {
      headers: {
        "X-Recollect-Place": `${this.placeId}:${serviceId}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Halifax ReCollect fetch failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const groupedStreams = new Map<string, Set<"garbage" | "recycling" | "organics">>();

    for (const event of extractEvents(payload)) {
      const streams = groupedStreams.get(event.day) ?? new Set<"garbage" | "recycling" | "organics">();
      for (const flag of event.flags ?? []) {
        if (!isPickupFlag(flag)) {
          continue;
        }

        const stream = mapFlagToStream(flag);
        if (stream) {
          streams.add(stream);
        }
      }

      if (streams.size > 0) {
        groupedStreams.set(event.day, streams);
      }
    }

    const pickupDays = [...groupedStreams.entries()]
      .map(([day, streams]) => {
        const normalizedStreams = sortWasteStreams([...streams]);
        const shouldIncludeOrganics =
          !normalizedStreams.includes("organics") &&
          (normalizedStreams.includes("garbage") || normalizedStreams.includes("recycling"));

        return {
          day,
          streams: shouldIncludeOrganics ? sortWasteStreams([...normalizedStreams, "organics"]) : normalizedStreams
        };
      })
      .sort((left, right) => left.day.localeCompare(right.day));

    return normalizeCollectionEvents(pickupDays.map((event, index) => ({
      id: `event_${event.day.replace(/-/g, "_")}`,
      date: event.day,
      weekStart: index === 0 ? shiftIsoDate(event.day, -7) : pickupDays[index - 1].day,
      weekEnd: event.day,
      streams: event.streams,
      status: "scheduled",
      source: "halifax-live"
    })));
  }
}
