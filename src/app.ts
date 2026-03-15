import path from "node:path";
import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { FileStore } from "./data/fileStore.js";
import { AssignmentService } from "./services/assignmentService.js";
import { ConsoleNotificationService } from "./services/consoleNotificationService.js";
import { FileScheduleProvider } from "./services/fileScheduleProvider.js";
import { HalifaxScheduleProvider } from "./services/halifaxScheduleProvider.js";
import { HousemateService } from "./services/housemateService.js";
import { RotationService } from "./services/rotationService.js";
import { TelegramNotificationService } from "./services/telegramNotificationService.js";
import { adminCredentialsMatch, clearAdminSession, isAdminAuthenticated, setAdminSession } from "./lib/adminAuth.js";
import { getZonedDateTimeParts } from "./lib/zonedDateTime.js";
import { renderAdminPage } from "./ui/adminPage.js";
import type { CreateHousemateInput } from "./services/housemateService.js";
import type { NotificationService } from "./services/notificationService.js";
import type { ScheduleProvider } from "./services/scheduleProvider.js";

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  const store = new FileStore(config.stateFile, config.houseAddress, config.appTimezone, config.scheduleSource);
  const rotationService = new RotationService();
  const assignmentService = new AssignmentService(rotationService);
  const housemateService = new HousemateService();

  const scheduleProvider: ScheduleProvider =
    config.scheduleSource === "halifax"
      ? new HalifaxScheduleProvider(config.houseAddress, config.halifaxImportFile, config.halifaxPlaceId)
      : new FileScheduleProvider(path.resolve(process.cwd(), "./data/sampleSchedule.json"));

  const notificationService: NotificationService =
    config.telegramBotToken && config.telegramChatId
      ? new TelegramNotificationService(config.telegramBotToken, config.telegramChatId)
      : new ConsoleNotificationService();

  function requireAdmin(request: Parameters<typeof isAdminAuthenticated>[0], reply: Fastify.FastifyReply): boolean {
    if (isAdminAuthenticated(request, config)) {
      return true;
    }

    reply.status(403).send({ error: "Admin access required." });
    return false;
  }

  app.get("/health", async () => ({ ok: true }));
  app.get("/", async (_, reply) => reply.type("text/html").send(renderAdminPage()));
  app.get("/admin", async (_, reply) => reply.type("text/html").send(renderAdminPage()));

  app.get("/api/admin/session", async (request) => ({
    isAdmin: isAdminAuthenticated(request, config),
    username: config.adminUsername
  }));

  app.post("/api/admin/login", async (request, reply) => {
    const input = request.body as { username?: string; password?: string };
    if (!adminCredentialsMatch(input.username, input.password, config)) {
      clearAdminSession(reply);
      return reply.status(401).send({ error: "Invalid admin credentials." });
    }

    setAdminSession(reply, config);
    return { ok: true, username: config.adminUsername };
  });

  app.post("/api/admin/logout", async (_, reply) => {
    clearAdminSession(reply);
    return { ok: true };
  });

  app.get("/api/dashboard", async (request) => {
    const state = await store.load();
    const today = getZonedDateTimeParts(config.appTimezone).date;
    return {
      state,
      auth: {
        isAdmin: isAdminAuthenticated(request, config),
        username: config.adminUsername
      },
      nextAssignmentPreview: assignmentService.previewNextAssignment(state, today) ?? null
    };
  });

  app.get("/api/state", async () => store.load());

  app.get("/api/housemates", async () => {
    const state = await store.load();
    return state.housemates;
  });

  app.post("/api/housemates", async (request, reply) => {
    if (!requireAdmin(request, reply)) {
      return;
    }

    const input = request.body as {
      name?: string;
      roomNumber?: string;
      whatsappNumber?: string;
      isActive?: boolean;
      notes?: string;
    };

    if (!input.name || !input.roomNumber) {
      return reply
        .status(400)
        .send({ error: "name and roomNumber are required." });
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
    return reply.status(201).send(result.housemate);
  });

  app.patch("/api/housemates/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) {
      return;
    }

    const params = request.params as { id: string };
    const input = request.body as {
      name?: string;
      roomNumber?: string;
      whatsappNumber?: string;
      isActive?: boolean;
      notes?: string;
      skipNextTurn?: boolean;
    };

    try {
      const state = await store.load();
      const result = housemateService.update(state, params.id, input);
      const skipOnceHousemateIds = new Set(result.state.rotation.skipOnceHousemateIds ?? []);
      if (input.skipNextTurn === true) {
        skipOnceHousemateIds.add(params.id);
      } else if (input.skipNextTurn === false) {
        skipOnceHousemateIds.delete(params.id);
      }

      const updatedState = {
        ...result.state,
        rotation: {
          ...result.state.rotation,
          skipOnceHousemateIds: Array.from(skipOnceHousemateIds)
        }
      };
      await store.save(updatedState);
      return result.housemate;
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.post("/api/housemates/reorder", async (request, reply) => {
    if (!requireAdmin(request, reply)) {
      return;
    }

    const input = request.body as { orderedIds?: string[] };
    if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
      return reply.status(400).send({ error: "orderedIds must be a non-empty array." });
    }

    try {
      const state = await store.load();
      const result = housemateService.reorder(state, input.orderedIds);
      await store.save(result.state);
      return { ok: true, housemates: result.housemates };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  app.get("/api/assignments", async () => {
    const state = await store.load();
    return state.assignments;
  });

  app.post("/api/assignments/current/reassign-next", async (_, reply) => {
    if (!requireAdmin(_, reply)) {
      return;
    }

    try {
      const state = await store.load();
      const today = getZonedDateTimeParts(config.appTimezone).date;
      const updatedState = assignmentService.reassignCurrentWeekToNextPerson(state, today);
      await store.save(updatedState);
      return { ok: true };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  app.post("/api/assignments/current/complete", async (_, reply) => {
    if (!requireAdmin(_, reply)) {
      return;
    }

    try {
      const state = await store.load();
      const today = getZonedDateTimeParts(config.appTimezone).date;
      const updatedState = assignmentService.confirmCurrentWeekCompleted(state, today);
      await store.save(updatedState);
      return { ok: true };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  app.post("/api/assignments/current/carry-over", async (_, reply) => {
    if (!requireAdmin(_, reply)) {
      return;
    }

    try {
      const state = await store.load();
      const today = getZonedDateTimeParts(config.appTimezone).date;
      const updatedState = assignmentService.carryCurrentWeekToNext(state, today);
      await store.save(updatedState);
      return { ok: true };
    } catch (error) {
      return reply.status(400).send({ error: (error as Error).message });
    }
  });

  app.post("/api/jobs/sync-schedule", async (request, reply) => {
    try {
      const events = await scheduleProvider.sync();
      const state = await store.load();
      const updatedState = assignmentService.syncCollectionEvents(state, events);
      await store.save(updatedState);
      return { synced: events.length, events };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.post("/api/jobs/run-weekly-duty", async (request, reply) => {
    if (!requireAdmin(request, reply)) {
      return;
    }

    try {
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
          adminUrl: `${config.appBaseUrl}/admin`
        });
        state = assignmentService.markPrimaryReminderSent(state, result.assignment.id);
      }

      await store.save(state);
      return { created: true, assignment: result.assignment };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.post("/api/jobs/resend-weekly", async (request, reply) => {
    if (!requireAdmin(request, reply)) {
      return;
    }

    try {
      let state = await store.load();
      const today = getZonedDateTimeParts(config.appTimezone).date;
      const events = await scheduleProvider.sync();
      state = assignmentService.syncCollectionEvents(state, events);
      const assignment = assignmentService.getActiveAssignment(state, today);

      if (!assignment) {
        await store.save(state);
        return { resent: false, reason: "No active assignment found." };
      }

      const context = assignmentService.getAssignmentContext(state, assignment);
      await notificationService.sendWeeklyStart({
        assignment,
        assignee: context.assignee,
        collectionEvent: context.collectionEvent,
        address: state.config.address,
        adminUrl: `${config.appBaseUrl}/admin`
      });

      await store.save(state);
      return { resent: true, assignmentId: assignment.id };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  app.post("/api/jobs/send-completion-check", async (_, reply) => {
    if (!requireAdmin(_, reply)) {
      return;
    }

    try {
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
        adminUrl: `${config.appBaseUrl}/admin`
      });
      state = assignmentService.markCompletionCheckSent(state, assignment.id);
      await store.save(state);
      return { sent: true, assignmentId: assignment.id };
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  return { app, config };
}
