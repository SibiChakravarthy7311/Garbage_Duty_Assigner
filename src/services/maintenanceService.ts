import type { AppState, Assignment } from "../domain/types.js";
import type { NotificationService } from "./notificationService.js";
import type { ScheduleProvider } from "./scheduleProvider.js";
import { AssignmentService } from "./assignmentService.js";

export interface MaintenanceRunOptions {
  state: AppState;
  today: string;
  timeZone: string;
  appBaseUrl: string;
  scheduleProvider: ScheduleProvider;
  assignmentService: AssignmentService;
  notificationService: NotificationService;
}

export interface MaintenanceRunResult {
  state: AppState;
  syncedEvents: number;
  assignmentCreated: boolean;
  weeklyReminderSent: boolean;
  dayBeforeReminderSent: boolean;
  completionCheckSent: boolean;
  assignment?: Assignment;
}

export async function runDailyMaintenance(options: MaintenanceRunOptions): Promise<MaintenanceRunResult> {
  const {
    scheduleProvider,
    assignmentService,
    notificationService,
    timeZone,
    today,
    appBaseUrl
  } = options;

  const events = await scheduleProvider.sync();
  let state = assignmentService.syncCollectionEvents(options.state, events);

  const assignmentResult = assignmentService.assignCurrentWeek(state, today);
  state = assignmentResult.state;

  const assignment = assignmentResult.assignment ?? assignmentService.getActiveAssignment(state, today);
  let weeklyReminderSent = false;
  let dayBeforeReminderSent = false;
  let completionCheckSent = false;

  if (assignment) {
    const context = assignmentService.getAssignmentContext(state, assignment);
    const notification = {
      assignment,
      assignee: context.assignee,
      collectionEvent: context.collectionEvent,
      address: state.config.address,
      adminUrl: `${appBaseUrl}/admin`
    };

    if (assignmentService.isPrimaryReminderDue(assignment, timeZone)) {
      await notificationService.sendWeeklyStart(notification);
      state = assignmentService.markPrimaryReminderSent(state, assignment.id);
      weeklyReminderSent = true;
    }

    const refreshedAssignment = assignmentService.getAssignmentById(state, assignment.id) ?? assignment;
    const refreshedContext = assignmentService.getAssignmentContext(state, refreshedAssignment);
    const refreshedNotification = {
      assignment: refreshedAssignment,
      assignee: refreshedContext.assignee,
      collectionEvent: refreshedContext.collectionEvent,
      address: state.config.address,
      adminUrl: `${appBaseUrl}/admin`
    };

    if (assignmentService.isBackupReminderDue(refreshedAssignment, refreshedContext.collectionEvent, timeZone)) {
      await notificationService.sendCollectionBackup(refreshedNotification);
      state = assignmentService.markBackupReminderSent(state, refreshedAssignment.id);
      dayBeforeReminderSent = true;
    }

    const latestAssignment = assignmentService.getAssignmentById(state, refreshedAssignment.id) ?? refreshedAssignment;
    if (assignmentService.isCompletionCheckDue(latestAssignment, timeZone)) {
      const latestContext = assignmentService.getAssignmentContext(state, latestAssignment);
      await notificationService.sendCompletionCheck({
        assignment: latestAssignment,
        assignee: latestContext.assignee,
        collectionEvent: latestContext.collectionEvent,
        address: state.config.address,
        adminUrl: `${appBaseUrl}/admin`
      });
      state = assignmentService.markCompletionCheckSent(state, latestAssignment.id);
      completionCheckSent = true;
    }
  }

  return {
    state,
    syncedEvents: events.length,
    assignmentCreated: Boolean(assignmentResult.assignment),
    weeklyReminderSent,
    dayBeforeReminderSent,
    completionCheckSent,
    assignment
  };
}
