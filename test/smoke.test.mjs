import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildApp } from "../dist/app.js";

const ENV_KEYS = [
  "APP_PORT",
  "APP_TIMEZONE",
  "HOUSE_ADDRESS",
  "APP_BASE_URL",
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "SCHEDULE_SOURCE",
  "STATE_FILE",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "HALIFAX_IMPORT_FILE",
  "HALIFAX_PLACE_ID"
];

async function createTestApp(options = {}) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "garbage-duty-assigner-"));
  const stateFile = path.join(tempDir, "state.json");
  const halifaxImportFile = path.join(tempDir, "halifaxImport.json");

  if (options.initialState) {
    await fs.writeFile(stateFile, JSON.stringify(options.initialState, null, 2), "utf8");
  }

  if (options.halifaxImportEvents) {
    await fs.writeFile(halifaxImportFile, JSON.stringify(options.halifaxImportEvents, null, 2), "utf8");
  }

  const previousEnv = new Map();
  for (const key of ENV_KEYS) {
    previousEnv.set(key, process.env[key]);
  }

  process.env.APP_PORT = "0";
  process.env.APP_TIMEZONE = options.timezone ?? "America/Halifax";
  process.env.HOUSE_ADDRESS = "5835 Balmoral Road, Halifax, NS, B3H1A5";
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "changeme";
  process.env.SCHEDULE_SOURCE = options.scheduleSource ?? "file";
  process.env.STATE_FILE = stateFile;
  process.env.TELEGRAM_BOT_TOKEN = "";
  process.env.TELEGRAM_CHAT_ID = "";
  if (options.halifaxImportEvents) {
    process.env.HALIFAX_IMPORT_FILE = halifaxImportFile;
  } else {
    process.env.HALIFAX_IMPORT_FILE = "";
  }
  process.env.HALIFAX_PLACE_ID = options.halifaxPlaceId ?? "";

  const { app } = await buildApp();

  return {
    app,
    stateFile,
    cleanup: async () => {
      await app.close();
      for (const key of ENV_KEYS) {
        const value = previousEnv.get(key);
        if (value === undefined) {
          delete process.env[key];
          continue;
        }

        process.env[key] = value;
      }
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  };
}

async function readState(stateFile) {
  return JSON.parse(await fs.readFile(stateFile, "utf8"));
}

async function loginAsAdmin(app) {
  const response = await app.inject({
    method: "POST",
    url: "/api/admin/login",
    payload: {
      username: "admin",
      password: "changeme"
    }
  });

  assert.equal(response.statusCode, 200);
  return String(response.headers["set-cookie"]).split(";")[0];
}

function createHousemate(id, name, roomNumber) {
  return {
    id,
    name,
    roomNumber,
    isActive: true
  };
}

function createCollectionEvent(id, today) {
  return {
    id,
    date: today,
    weekStart: today,
    weekEnd: today,
    streams: ["garbage"],
    status: "scheduled",
    source: "test"
  };
}

function createAssignment(id, assigneeId, collectionEventId, weekStart, weekEnd) {
  return {
    id,
    assigneeId,
    collectionEventId,
    weekStart,
    weekEnd,
    status: "assigned",
    completionStatus: "pending",
    createdAt: new Date().toISOString()
  };
}

test("health, admin page, dashboard session, and raw state endpoints work against a fresh file-backed store", async () => {
  const context = await createTestApp();

  try {
    const healthResponse = await context.app.inject({ method: "GET", url: "/health" });
    assert.equal(healthResponse.statusCode, 200);
    assert.deepEqual(healthResponse.json(), { ok: true });

    const adminResponse = await context.app.inject({ method: "GET", url: "/admin" });
    assert.equal(adminResponse.statusCode, 200);
    assert.match(adminResponse.body, /<!doctype html>/i);
    assert.match(adminResponse.body, /Garbage Duty Admin/);

    const stateResponse = await context.app.inject({ method: "GET", url: "/api/state" });
    assert.equal(stateResponse.statusCode, 200);
    assert.deepEqual(stateResponse.json(), {
      config: {
        address: "5835 Balmoral Road, Halifax, NS, B3H1A5",
        timezone: "America/Halifax",
        scheduleSource: "file"
      },
      housemates: [],
      rooms: [],
      collectionEvents: [],
      assignments: [],
      rotation: {}
    });

    const dashboardResponse = await context.app.inject({ method: "GET", url: "/api/dashboard" });
    assert.equal(dashboardResponse.statusCode, 200);
    assert.equal(dashboardResponse.json().auth.isAdmin, false);
    assert.equal(dashboardResponse.json().nextAssignmentPreview, null);
  } finally {
    await context.cleanup();
  }
});

test("housemate edits require admin login and persist through the API", async () => {
  const context = await createTestApp();

  try {
    const forbiddenResponse = await context.app.inject({
      method: "POST",
      url: "/api/housemates",
      payload: {
        name: "Sibi",
        roomNumber: "3"
      }
    });

    assert.equal(forbiddenResponse.statusCode, 403);

    const adminCookie = await loginAsAdmin(context.app);
    const createResponse = await context.app.inject({
      method: "POST",
      url: "/api/housemates",
      headers: {
        cookie: adminCookie
      },
      payload: {
        name: "Sibi",
        roomNumber: "3",
        whatsappNumber: "+19025550003"
      }
    });

    assert.equal(createResponse.statusCode, 201);
    const created = createResponse.json();
    assert.equal(created.name, "Sibi");
    assert.equal(created.roomNumber, "3");
    assert.equal(created.isActive, true);

    const updateResponse = await context.app.inject({
      method: "PATCH",
      url: `/api/housemates/${created.id}`,
      headers: {
        cookie: adminCookie
      },
      payload: {
        name: "Sibi C",
        notes: "Prefers WhatsApp reminders",
        skipNextTurn: true
      }
    });

    assert.equal(updateResponse.statusCode, 200);
    const updated = updateResponse.json();
    assert.equal(updated.name, "Sibi C");
    assert.equal(updated.notes, "Prefers WhatsApp reminders");

    const state = await readState(context.stateFile);
    assert.equal(state.housemates.length, 1);
    assert.equal(state.housemates[0]?.name, "Sibi C");
    assert.equal(state.housemates[0]?.notes, "Prefers WhatsApp reminders");
    assert.deepEqual(state.rotation.skipOnceHousemateIds, [created.id]);
  } finally {
    await context.cleanup();
  }
});

test("schedule sync imports sample events in file mode", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-03-13T16:00:00.000Z") });
  const context = await createTestApp();

  try {
    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/sync-schedule"
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.synced, 4);
    assert.equal(body.events[0]?.id, "event_2026_03_16");

    const state = await readState(context.stateFile);
    assert.equal(state.collectionEvents.length, 4);
    assert.equal(state.collectionEvents[3]?.id, "event_2026_04_06");
  } finally {
    await context.cleanup();
    t.mock.timers.reset();
  }
});

test("viewer can sync Halifax but only admin can run weekly-duty actions", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-03-13T16:00:00.000Z") });
  const context = await createTestApp();

  try {
    const syncResponse = await context.app.inject({
      method: "POST",
      url: "/api/jobs/sync-schedule"
    });

    assert.equal(syncResponse.statusCode, 200);

    const forbiddenWeeklyResponse = await context.app.inject({
      method: "POST",
      url: "/api/jobs/run-weekly-duty"
    });

    assert.equal(forbiddenWeeklyResponse.statusCode, 403);

    const adminCookie = await loginAsAdmin(context.app);
    await context.app.inject({
      method: "POST",
      url: "/api/housemates",
      headers: {
        cookie: adminCookie
      },
      payload: {
        name: "Sibi",
        roomNumber: "3"
      }
    });

    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/run-weekly-duty",
      headers: {
        cookie: adminCookie
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.created, true);
    assert.equal(body.assignment.weekStart, "2026-03-09");
    assert.equal(body.assignment.weekEnd, "2026-03-16");

    const state = await readState(context.stateFile);
    assert.equal(state.assignments.length, 1);
    assert.equal(state.assignments[0]?.primaryReminderSentAt, "2026-03-13T16:00:00.000Z");
    assert.equal(state.assignments[0]?.assigneeId, state.housemates[0]?.id);
  } finally {
    await context.cleanup();
    t.mock.timers.reset();
  }
});

test("dashboard preview exposes the next predicted assignee", async () => {
  const context = await createTestApp({
    initialState: {
      config: {
        address: "5835 Balmoral Road, Halifax, NS, B3H1A5",
        timezone: "America/Halifax",
        scheduleSource: "file"
      },
      housemates: [
        createHousemate("housemate_1", "Mandeep", "1"),
        createHousemate("housemate_2", "Sibi", "3"),
        createHousemate("housemate_3", "Gowri", "7"),
        createHousemate("housemate_4", "Ishita", "6")
      ],
      rooms: [],
      collectionEvents: [
        {
          id: "event_current",
          date: "2026-03-16",
          weekStart: "2026-03-09",
          weekEnd: "2026-03-16",
          streams: ["garbage"],
          status: "scheduled",
          source: "test"
        },
        {
          id: "event_next",
          date: "2026-03-23",
          weekStart: "2026-03-23",
          weekEnd: "2026-03-23",
          streams: ["recycling"],
          status: "scheduled",
          source: "test"
        }
      ],
      assignments: [
        createAssignment("assignment_current", "housemate_4", "event_current", "2026-03-09", "2026-03-16")
      ],
      rotation: {
        lastAssignedHousemateId: "housemate_4",
        skipOnceHousemateIds: ["housemate_3", "housemate_1"]
      }
    }
  });

  try {
    const response = await context.app.inject({
      method: "GET",
      url: "/api/dashboard"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().state.collectionEvents[1].weekStart, "2026-03-16");
    assert.deepEqual(response.json().nextAssignmentPreview, {
      assigneeId: "housemate_2",
      collectionEventId: "event_next",
      weekStart: "2026-03-16",
      weekEnd: "2026-03-23",
      selectionMode: "rotation",
      skippedHousemateIds: ["housemate_1"]
    });
  } finally {
    await context.cleanup();
  }
});

test("halifax import sync normalizes malformed week windows before persisting state", async () => {
  const context = await createTestApp({
    scheduleSource: "halifax",
    halifaxImportEvents: [
      {
        id: "event_2026_03_16",
        date: "2026-03-16",
        weekStart: "2026-03-09",
        weekEnd: "2026-03-16",
        streams: ["garbage"],
        status: "scheduled",
        source: "halifax-import"
      },
      {
        id: "event_2026_03_23",
        date: "2026-03-23",
        weekStart: "2026-03-23",
        weekEnd: "2026-03-23",
        streams: ["recycling"],
        status: "scheduled",
        source: "halifax-import"
      }
    ]
  });

  try {
    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/sync-schedule"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().events[1]?.weekStart, "2026-03-16");
    assert.equal(response.json().events[1]?.weekEnd, "2026-03-23");

    const state = await readState(context.stateFile);
    assert.equal(state.collectionEvents[1]?.weekStart, "2026-03-16");
    assert.equal(state.collectionEvents[1]?.weekEnd, "2026-03-23");
  } finally {
    await context.cleanup();
  }
});

test("halifax live place id takes priority over import-file fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function (url, options) {
    assert.match(String(url), /\/api\/places\/PLACE123\/services\/330\/events/);
    assert.equal(options.headers["X-Recollect-Place"], "PLACE123:330");

    return {
      ok: true,
      async json() {
        return {
          events: [
            {
              day: "2026-03-16",
              flags: [
                {
                  name: "Garbage",
                  event_type: "pickup"
                }
              ]
            },
            {
              day: "2026-03-23",
              flags: [
                {
                  name: "Recycling",
                  event_type: "pickup"
                }
              ]
            }
          ]
        };
      }
    };
  };

  const context = await createTestApp({
    scheduleSource: "halifax",
    halifaxPlaceId: "PLACE123",
    halifaxImportEvents: [
      {
        id: "event_wrong",
        date: "2026-12-31",
        weekStart: "2026-12-31",
        weekEnd: "2026-12-31",
        streams: ["garbage"],
        status: "scheduled",
        source: "halifax-import"
      }
    ]
  });

  try {
    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/sync-schedule"
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().events[0]?.date, "2026-03-16");
    assert.equal(response.json().events[1]?.weekStart, "2026-03-16");
    assert.equal(response.json().events[1]?.source, "halifax-live");
  } finally {
    globalThis.fetch = originalFetch;
    await context.cleanup();
  }
});

test("send-completion-check requires admin and returns a no-op response when no assignment is active", async () => {
  const context = await createTestApp();

  try {
    const forbiddenResponse = await context.app.inject({
      method: "POST",
      url: "/api/jobs/send-completion-check"
    });

    assert.equal(forbiddenResponse.statusCode, 403);

    const adminCookie = await loginAsAdmin(context.app);
    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/send-completion-check",
      headers: {
        cookie: adminCookie
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      sent: false,
      reason: "No active assignment found."
    });
  } finally {
    await context.cleanup();
  }
});

test("send-completion-check marks an active assignment when the reminder is due", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-03-16T16:00:00.000Z") });
  const today = "2026-03-16";
  const housemate = createHousemate("housemate_1", "Sibi", "3");
  const collectionEvent = createCollectionEvent("event_due_today", today);
  const assignment = createAssignment("assignment_due_today", housemate.id, collectionEvent.id, "2026-03-09", today);

  const context = await createTestApp({
    initialState: {
      config: {
        address: "5835 Balmoral Road, Halifax, NS, B3H1A5",
        timezone: "America/Halifax",
        scheduleSource: "file"
      },
      housemates: [housemate],
      rooms: [],
      collectionEvents: [collectionEvent],
      assignments: [assignment],
      rotation: {
        lastAssignedHousemateId: housemate.id
      }
    }
  });

  try {
    const adminCookie = await loginAsAdmin(context.app);
    const response = await context.app.inject({
      method: "POST",
      url: "/api/jobs/send-completion-check",
      headers: {
        cookie: adminCookie
      }
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      sent: true,
      assignmentId: assignment.id
    });

    const state = await readState(context.stateFile);
    assert.equal(state.assignments[0]?.completionCheckSentAt, "2026-03-16T16:00:00.000Z");
    assert.equal(state.assignments[0]?.completionStatus, "pending");
  } finally {
    await context.cleanup();
    t.mock.timers.reset();
  }
});
