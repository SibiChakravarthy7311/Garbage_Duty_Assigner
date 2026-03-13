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

  app.get("/health", async () => ({ ok: true }));
  app.get("/", async (_, reply) => reply.type("text/html").send(renderAdminPage()));
  app.get("/admin", async (_, reply) => reply.type("text/html").send(renderAdminPage()));

  app.get("/api/state", async () => store.load());

  app.get("/api/housemates", async () => {
    const state = await store.load();
    return state.housemates;
  });

  app.post("/api/housemates", async (request, reply) => {
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
    const params = request.params as { id: string };
    const input = request.body as {
      name?: string;
      roomNumber?: string;
      whatsappNumber?: string;
      isActive?: boolean;
      notes?: string;
    };

    try {
      const state = await store.load();
      const result = housemateService.update(state, params.id, input);
      await store.save(result.state);
      return result.housemate;
    } catch (error) {
      return reply.status(404).send({ error: (error as Error).message });
    }
  });

  app.get("/api/assignments", async () => {
    const state = await store.load();
    return state.assignments;
  });

  app.post("/api/assignments/current/reassign-next", async (_, reply) => {
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
