import { D1Store, type D1DatabaseLike } from "./data/d1Store.js";
import { sampleSchedule } from "./data/sampleSchedule.js";
import type { AppState, CollectionEvent } from "./domain/types.js";
import { getZonedDateTimeParts } from "./lib/zonedDateTime.js";
import {
  adminCredentialsMatch,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  isAdminAuthenticated
} from "./lib/workerAdminAuth.js";
import { AssignmentService } from "./services/assignmentService.js";
import { ConsoleNotificationService } from "./services/consoleNotificationService.js";
import { HousemateService, type CreateHousemateInput } from "./services/housemateService.js";
import type { NotificationService } from "./services/notificationService.js";
import { RecollectScheduleProvider } from "./services/recollectScheduleProvider.js";
import { RotationService } from "./services/rotationService.js";
import type { ScheduleProvider } from "./services/scheduleProvider.js";
import { TelegramNotificationService } from "./services/telegramNotificationService.js";
import { renderAdminPage } from "./ui/adminPage.js";

interface D1Database extends D1DatabaseLike {}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface ScheduledControllerLike {
  cron: string;
}

interface WorkerEnv {
  DB: D1Database;
  APP_TIMEZONE?: string;
  HOUSE_ADDRESS?: string;
  APP_BASE_URL?: string;
  SCHEDULE_SOURCE?: "file" | "halifax";
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  HALIFAX_PLACE_ID?: string;
}

interface WorkerConfig {
  db: D1Database;
  appTimezone: string;
  houseAddress: string;
  appBaseUrl?: string;
  scheduleSource: "file" | "halifax";
  adminUsername: string;
  adminPassword: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  halifaxPlaceId?: string;
}

function loadWorkerConfig(env: WorkerEnv): WorkerConfig {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding DB is required.");
  }

  if (!env.HOUSE_ADDRESS) {
    throw new Error("HOUSE_ADDRESS is required.");
  }

  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required.");
  }

  return {
    db: env.DB,
    appTimezone: env.APP_TIMEZONE ?? "America/Halifax",
    houseAddress: env.HOUSE_ADDRESS,
    appBaseUrl: env.APP_BASE_URL,
    scheduleSource: env.SCHEDULE_SOURCE === "halifax" ? "halifax" : "file",
    adminUsername: env.ADMIN_USERNAME,
    adminPassword: env.ADMIN_PASSWORD,
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    halifaxPlaceId: env.HALIFAX_PLACE_ID
  };
}

class StaticScheduleProvider implements ScheduleProvider {
  constructor(private readonly events: CollectionEvent[]) {}

  async sync(): Promise<CollectionEvent[]> {
    return this.events.map((event) => ({ ...event }));
  }
}

function createServices(config: WorkerConfig): {
  store: D1Store;
  assignmentService: AssignmentService;
  housemateService: HousemateService;
  scheduleProvider: ScheduleProvider;
  notificationService: NotificationService;
} {
  const store = new D1Store(config.db, config.houseAddress, config.appTimezone, config.scheduleSource);
  const assignmentService = new AssignmentService(new RotationService());
  const housemateService = new HousemateService();
  const scheduleProvider =
    config.scheduleSource === "halifax"
      ? (() => {
          if (!config.halifaxPlaceId) {
            throw new Error("HALIFAX_PLACE_ID is required when SCHEDULE_SOURCE=halifax on Cloudflare.");
          }

          return new RecollectScheduleProvider(config.halifaxPlaceId);
        })()
      : new StaticScheduleProvider(sampleSchedule);
  const notificationService =
    config.telegramBotToken && config.telegramChatId
      ? new TelegramNotificationService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleNotificationService();

  return {
    store,
    assignmentService,
    housemateService,
    scheduleProvider,
    notificationService
  };
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function html(markup: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(markup, { ...init, headers });
}

function requestBaseUrl(request: Request, config: WorkerConfig): string {
  return config.appBaseUrl ?? new URL(request.url).origin;
}

async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

async function requireAdmin(request: Request, config: WorkerConfig): Promise<Response | undefined> {
  if (await isAdminAuthenticated(request, config)) {
    return undefined;
  }

  return json({ error: "Admin access required." }, { status: 403 });
}

async function runSyncSchedule(config: WorkerConfig): Promise<{ state: AppState; events: CollectionEvent[] }> {
  const { store, assignmentService, scheduleProvider } = createServices(config);
  const events = await scheduleProvider.sync();
  const state = assignmentService.syncCollectionEvents(await store.load(), events);
  await store.save(state);
  return { state, events };
}

async function runWeeklyDuty(
  config: WorkerConfig,
  adminUrl: string
): Promise<{ created: boolean; reason?: string; assignmentId?: string }> {
  const { store, assignmentService, scheduleProvider, notificationService } = createServices(config);
  let state = await store.load();
  const today = getZonedDateTimeParts(config.appTimezone).date;
  const events = await scheduleProvider.sync();
  state = assignmentService.syncCollectionEvents(state, events);

  const result = assignmentService.assignCurrentWeek(state, today);
  state = result.state;

  if (!result.assignment) {
    await store.save(state);
    return { created: false, reason: "No eligible collection event found." };
  }

  const context = assignmentService.getAssignmentContext(state, result.assignment);
  if (assignmentService.isPrimaryReminderDue(result.assignment, config.appTimezone)) {
    await notificationService.sendWeeklyStart({
      assignment: result.assignment,
      assignee: context.assignee,
      collectionEvent: context.collectionEvent,
      address: state.config.address,
      adminUrl
    });
    state = assignmentService.markPrimaryReminderSent(state, result.assignment.id);
  }

  await store.save(state);
  return { created: true, assignmentId: result.assignment.id };
}

async function runCompletionCheck(
  config: WorkerConfig,
  adminUrl: string
): Promise<{ sent: boolean; reason?: string; assignmentId?: string }> {
  const { store, assignmentService, notificationService } = createServices(config);
  let state = await store.load();
  const today = getZonedDateTimeParts(config.appTimezone).date;
  const assignment = assignmentService.getActiveAssignment(state, today);
  if (!assignment) {
    return { sent: false, reason: "No active assignment found." };
  }

  if (!assignmentService.isCompletionCheckDue(assignment, config.appTimezone)) {
    return { sent: false, reason: "Completion check is not due yet." };
  }

  const context = assignmentService.getAssignmentContext(state, assignment);
  await notificationService.sendCompletionCheck({
    assignment,
    assignee: context.assignee,
    collectionEvent: context.collectionEvent,
    address: state.config.address,
    adminUrl
  });
  state = assignmentService.markCompletionCheckSent(state, assignment.id);
  await store.save(state);
  return { sent: true, assignmentId: assignment.id };
}

async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const config = loadWorkerConfig(env);
  const { store, assignmentService, housemateService, scheduleProvider, notificationService } = createServices(config);
  const url = new URL(request.url);
  const pathname = url.pathname;

  try {
    if (request.method === "GET" && pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method === "GET" && (pathname === "/" || pathname === "/admin")) {
      return html(renderAdminPage());
    }

    if (request.method === "GET" && pathname === "/api/admin/session") {
      return json({
        isAdmin: await isAdminAuthenticated(request, config),
        username: config.adminUsername
      });
    }

    if (request.method === "POST" && pathname === "/api/admin/login") {
      const input = await readJson<{ username?: string; password?: string }>(request);
      if (!adminCredentialsMatch(input.username, input.password, config)) {
        return json(
          { error: "Invalid admin credentials." },
          { status: 401, headers: { "Set-Cookie": clearAdminSessionCookie() } }
        );
      }

      return json(
        { ok: true, username: config.adminUsername },
        { headers: { "Set-Cookie": await createAdminSessionCookie(config) } }
      );
    }

    if (request.method === "POST" && pathname === "/api/admin/logout") {
      return json({ ok: true }, { headers: { "Set-Cookie": clearAdminSessionCookie() } });
    }

    if (request.method === "GET" && pathname === "/api/dashboard") {
      const state = await store.load();
      const today = getZonedDateTimeParts(config.appTimezone).date;
      return json({
        state,
        auth: {
          isAdmin: await isAdminAuthenticated(request, config),
          username: config.adminUsername
        },
        nextAssignmentPreview: assignmentService.previewNextAssignment(state, today) ?? null
      });
    }

    if (request.method === "GET" && pathname === "/api/state") {
      return json(await store.load());
    }

    if (request.method === "GET" && pathname === "/api/housemates") {
      const state = await store.load();
      return json(state.housemates);
    }

    if (request.method === "POST" && pathname === "/api/housemates") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      const input = await readJson<{
        name?: string;
        roomNumber?: string;
        whatsappNumber?: string;
        isActive?: boolean;
        notes?: string;
      }>(request);

      if (!input.name || !input.roomNumber) {
        return json({ error: "name and roomNumber are required." }, { status: 400 });
      }

      const state = await store.load();
      const createInput: CreateHousemateInput = {
        name: input.name,
        roomNumber: input.roomNumber,
        whatsappNumber: input.whatsappNumber,
        isActive: input.isActive,
        notes: input.notes
      };
      const result = housemateService.create(state, createInput);
      await store.save(result.state);
      return json(result.housemate, { status: 201 });
    }

    if (request.method === "PATCH" && pathname.startsWith("/api/housemates/")) {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      const housemateId = pathname.slice("/api/housemates/".length);
      const input = await readJson<{
        name?: string;
        roomNumber?: string;
        whatsappNumber?: string;
        isActive?: boolean;
        notes?: string;
        skipNextTurn?: boolean;
      }>(request);

      try {
        const state = await store.load();
        const result = housemateService.update(state, housemateId, input);
        const skipOnceHousemateIds = new Set(result.state.rotation.skipOnceHousemateIds ?? []);
        if (input.skipNextTurn === true) {
          skipOnceHousemateIds.add(housemateId);
        } else if (input.skipNextTurn === false) {
          skipOnceHousemateIds.delete(housemateId);
        }

        const updatedState = {
          ...result.state,
          rotation: {
            ...result.state.rotation,
            skipOnceHousemateIds: Array.from(skipOnceHousemateIds)
          }
        };

        await store.save(updatedState);
        return json(result.housemate);
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 404 });
      }
    }

    if (request.method === "POST" && pathname === "/api/housemates/reorder") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      const input = await readJson<{ orderedIds?: string[] }>(request);
      if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
        return json({ error: "orderedIds must be a non-empty array." }, { status: 400 });
      }

      try {
        const state = await store.load();
        const result = housemateService.reorder(state, input.orderedIds);
        await store.save(result.state);
        return json({ ok: true, housemates: result.housemates });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (request.method === "GET" && pathname === "/api/assignments") {
      const state = await store.load();
      return json(state.assignments);
    }

    if (request.method === "POST" && pathname === "/api/assignments/current/reassign-next") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        const state = await store.load();
        const today = getZonedDateTimeParts(config.appTimezone).date;
        const updatedState = assignmentService.reassignCurrentWeekToNextPerson(state, today);
        await store.save(updatedState);
        return json({ ok: true });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (request.method === "POST" && pathname === "/api/assignments/current/complete") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        const state = await store.load();
        const today = getZonedDateTimeParts(config.appTimezone).date;
        const updatedState = assignmentService.confirmCurrentWeekCompleted(state, today);
        await store.save(updatedState);
        return json({ ok: true });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (request.method === "POST" && pathname === "/api/assignments/current/carry-over") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        const state = await store.load();
        const today = getZonedDateTimeParts(config.appTimezone).date;
        const updatedState = assignmentService.carryCurrentWeekToNext(state, today);
        await store.save(updatedState);
        return json({ ok: true });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 400 });
      }
    }

    if (request.method === "POST" && pathname === "/api/jobs/sync-schedule") {
      try {
        const events = await scheduleProvider.sync();
        const state = assignmentService.syncCollectionEvents(await store.load(), events);
        await store.save(state);
        return json({ synced: events.length, events });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
      }
    }

    if (request.method === "POST" && pathname === "/api/jobs/run-weekly-duty") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        const result = await runWeeklyDuty(config, `${requestBaseUrl(request, config)}/admin`);
        if (!result.created) {
          return json({ created: false, reason: result.reason });
        }

        const state = await store.load();
        const assignment = state.assignments.find((entry) => entry.id === result.assignmentId);
        return json({ created: true, assignment });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
      }
    }

    if (request.method === "POST" && pathname === "/api/jobs/resend-weekly") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        let state = await store.load();
        const today = getZonedDateTimeParts(config.appTimezone).date;
        const events = await scheduleProvider.sync();
        state = assignmentService.syncCollectionEvents(state, events);
        const assignment = assignmentService.getActiveAssignment(state, today);
        if (!assignment) {
          await store.save(state);
          return json({ resent: false, reason: "No active assignment found." });
        }

        const context = assignmentService.getAssignmentContext(state, assignment);
        await notificationService.sendWeeklyStart({
          assignment,
          assignee: context.assignee,
          collectionEvent: context.collectionEvent,
          address: state.config.address,
          adminUrl: `${requestBaseUrl(request, config)}/admin`
        });

        await store.save(state);
        return json({ resent: true, assignmentId: assignment.id });
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
      }
    }

    if (request.method === "POST" && pathname === "/api/jobs/send-completion-check") {
      const unauthorized = await requireAdmin(request, config);
      if (unauthorized) {
        return unauthorized;
      }

      try {
        const result = await runCompletionCheck(config, `${requestBaseUrl(request, config)}/admin`);
        return json(result);
      } catch (error) {
        return json({ error: (error as Error).message }, { status: 500 });
      }
    }

    return json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
}

async function handleScheduled(_: ScheduledControllerLike, env: WorkerEnv): Promise<void> {
  const config = loadWorkerConfig(env);
  const adminUrl = `${config.appBaseUrl ?? "https://example.com"}/admin`;
  await runSyncSchedule(config);
  await runWeeklyDuty(config, adminUrl);
  await runCompletionCheck(config, adminUrl);
}

const worker = {
  fetch(request: Request, env: WorkerEnv, _ctx: ExecutionContextLike): Promise<Response> {
    return handleRequest(request, env);
  },
  scheduled(controller: ScheduledControllerLike, env: WorkerEnv, ctx: ExecutionContextLike): void {
    ctx.waitUntil(handleScheduled(controller, env));
  }
};

export default worker;
