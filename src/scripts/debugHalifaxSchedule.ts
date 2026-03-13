import { loadConfig } from "../config.js";

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

function isPickupFlag(flag: RecollectFlag): boolean {
  return flag.event_type === "pickup" || flag.opts?.event_type === "pickup";
}

function mapFlagToLabel(flag: RecollectFlag): string {
  return flag.subject ?? flag.name ?? "unknown";
}

function shiftIsoDate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.halifaxPlaceId) {
    throw new Error("HALIFAX_PLACE_ID must be set in .env to debug the Halifax/ReCollect feed.");
  }

  const serviceId = 330;
  const today = new Date().toISOString().slice(0, 10);
  const after = shiftIsoDate(today, -35);
  const before = shiftIsoDate(today, 120);
  const url = new URL(`https://api.recollect.net/api/places/${config.halifaxPlaceId}/services/${serviceId}/events`);
  url.searchParams.set("nomerge", "1");
  url.searchParams.set("hide", "reminder_only");
  url.searchParams.set("after", after);
  url.searchParams.set("before", before);
  url.searchParams.set("locale", "en");
  url.searchParams.set("include_message", "email");
  url.searchParams.set("_", Math.floor(Date.now() / 1000).toString());

  const response = await fetch(url, {
    headers: {
      "X-Recollect-Place": `${config.halifaxPlaceId}:${serviceId}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Halifax ReCollect debug fetch failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  console.log("Payload type:", Array.isArray(payload) ? "array" : typeof payload);
  console.log("Payload preview:", JSON.stringify(payload, null, 2).slice(0, 4000));

  const eventList = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { events?: unknown[] }).events)
    ? ((payload as { events: RecollectEvent[] }).events)
    : [];
  const pickupEvents = eventList
    .map((event) => ({
      day: event.day,
      pickups: (event.flags ?? []).filter(isPickupFlag).map(mapFlagToLabel)
    }))
    .filter((event) => event.pickups.length > 0);

  console.log(`Address: ${config.houseAddress}`);
  console.log(`Place ID: ${config.halifaxPlaceId}`);
  console.log(`Range: ${after} to ${before}`);
  console.log("");
  console.log("Pickup events:");

  for (const event of pickupEvents) {
    console.log(`- ${event.day}: ${event.pickups.join(", ")}`);
  }

  console.log("");
  console.log("Raw event count:", eventList.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
