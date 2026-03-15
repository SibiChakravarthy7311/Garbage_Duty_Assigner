import assert from "node:assert/strict";
import test from "node:test";
import worker from "../dist/worker.js";

class FakeD1Statement {
  constructor(store, query) {
    this.store = store;
    this.query = query;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async first() {
    if (this.query.startsWith("SELECT value FROM app_state")) {
      const row = this.store.rows.get(this.values[0]);
      return row ? { value: row.value } : null;
    }

    throw new Error(`Unsupported first() query: ${this.query}`);
  }

  async run() {
    if (this.query.startsWith("INSERT INTO app_state")) {
      const [id, value, updatedAt] = this.values;
      this.store.rows.set(id, { value, updatedAt });
      return { success: true };
    }

    throw new Error(`Unsupported run() query: ${this.query}`);
  }
}

class FakeD1Database {
  constructor() {
    this.rows = new Map();
  }

  prepare(query) {
    return new FakeD1Statement(this, query);
  }
}

function createEnv() {
  return {
    DB: new FakeD1Database(),
    APP_TIMEZONE: "America/Halifax",
    HOUSE_ADDRESS: "5835 Balmoral Road, Halifax, NS, B3H1A5",
    APP_BASE_URL: "https://example.workers.dev",
    SCHEDULE_SOURCE: "file",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "changeme",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: ""
  };
}

const noopContext = {
  waitUntil() {}
};

test("worker health and fresh state endpoints work with D1-backed storage", async () => {
  const env = createEnv();

  const health = await worker.fetch(new Request("https://example.workers.dev/health"), env, noopContext);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });

  const state = await worker.fetch(new Request("https://example.workers.dev/api/state"), env, noopContext);
  assert.equal(state.status, 200);
  assert.deepEqual(await state.json(), {
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
});

test("worker admin login and housemate creation persist through D1", async () => {
  const env = createEnv();

  const login = await worker.fetch(
    new Request("https://example.workers.dev/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "changeme" })
    }),
    env,
    noopContext
  );

  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /garbage_duty_admin=/);

  const create = await worker.fetch(
    new Request("https://example.workers.dev/api/housemates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie
      },
      body: JSON.stringify({
        name: "Sibi",
        roomNumber: "3"
      })
    }),
    env,
    noopContext
  );

  assert.equal(create.status, 201);
  const created = await create.json();
  assert.equal(created.name, "Sibi");

  const state = await worker.fetch(new Request("https://example.workers.dev/api/state"), env, noopContext);
  const body = await state.json();
  assert.equal(body.housemates.length, 1);
  assert.equal(body.housemates[0].name, "Sibi");
});
