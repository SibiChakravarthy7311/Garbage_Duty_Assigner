import { createId } from "../lib/id.js";
import { nowIso, todayIsoDate } from "../lib/time.js";
import { getZonedDateTimeParts } from "../lib/zonedDateTime.js";
import type { AppState, Assignment, CollectionEvent, Housemate, Room } from "../domain/types.js";
import { normalizeCollectionEvents } from "./collectionEventUtils.js";
import { RotationService } from "./rotationService.js";

export interface NextAssignmentPreview {
  assigneeId: string;
  collectionEventId: string;
  weekStart: string;
  weekEnd: string;
}

export interface UpdateAssignmentInput {
  assigneeId?: string;
  actualPerformerId?: string | null;
  weekStart?: string;
  weekEnd?: string;
  status?: Assignment["status"];
  completionStatus?: Assignment["completionStatus"];
  primaryReminderSentAt?: string | null;
  backupReminderSentAt?: string | null;
  completionCheckSentAt?: string | null;
  completionConfirmedAt?: string | null;
  reassignedToNextPerson?: boolean;
  carryOverToNextWeek?: boolean;
}

function shiftIsoDate(date: string, deltaDays: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + deltaDays);
  return shifted.toISOString().slice(0, 10);
}

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function normalizeOptionalTimestamp(value: string | null | undefined, fallback: string | undefined): string | undefined {
  if (value === undefined) {
    return fallback;
  }

  if (value === null || value.trim() === "") {
    return undefined;
  }

  return value.trim();
}

export class AssignmentService {
  constructor(private readonly rotationService: RotationService) {}

  private approvalWindowReached(approvalDate: string, timeZone: string, now = new Date()): boolean {
    const zonedNow = getZonedDateTimeParts(timeZone, now);
    if (zonedNow.date > approvalDate) {
      return true;
    }

    if (zonedNow.date < approvalDate) {
      return false;
    }

    return zonedNow.hour > 8 || (zonedNow.hour === 8 && zonedNow.minute >= 0);
  }

  private assertApprovalWindowReached(state: AppState, assignment: Assignment, timeZone: string, now = new Date()): void {
    const collectionEvent = state.collectionEvents.find((event) => event.id === assignment.collectionEventId);
    const approvalDate = collectionEvent?.date ?? assignment.weekEnd;

    if (!this.approvalWindowReached(approvalDate, timeZone, now)) {
      throw new Error(`Approval is available only after 8:00 a.m. on ${approvalDate}.`);
    }
  }

  private isHousemateEligible(housemate: Housemate, rooms: Room[]): boolean {
    if (!housemate.isActive) {
      return false;
    }

    const room = rooms.find((entry) => entry.occupantId === housemate.id);
    if (!room) {
      return true;
    }

    return room.isActive;
  }

  syncCollectionEvents(state: AppState, events: CollectionEvent[]): AppState {
    return {
      ...state,
      collectionEvents: normalizeCollectionEvents(events)
    };
  }

  getActiveAssignment(state: AppState, today = todayIsoDate()): Assignment | undefined {
    return state.assignments.find((assignment) => assignment.weekStart <= today && assignment.weekEnd >= today);
  }

  getAssignmentById(state: AppState, assignmentId: string): Assignment | undefined {
    return state.assignments.find((assignment) => assignment.id === assignmentId);
  }

  private isAssignmentResolved(assignment: Assignment): boolean {
    return assignment.completionStatus === "completed" || assignment.completionStatus === "not_completed";
  }

  getPendingApprovalAssignment(state: AppState, today = todayIsoDate()): Assignment | undefined {
    return state.assignments
      .slice()
      .sort((left, right) => right.weekEnd.localeCompare(left.weekEnd))
      .find((assignment) => assignment.weekEnd < today && !this.isAssignmentResolved(assignment));
  }

  getAssignmentAwaitingDecision(state: AppState, today = todayIsoDate()): Assignment | undefined {
    const activeAssignment = this.getActiveAssignment(state, today);
    if (activeAssignment && !this.isAssignmentResolved(activeAssignment)) {
      return activeAssignment;
    }

    return this.getPendingApprovalAssignment(state, today);
  }

  previewNextAssignment(state: AppState, today = todayIsoDate()): NextAssignmentPreview | undefined {
    const eligibleHousemates = state.housemates.filter((housemate) => this.isHousemateEligible(housemate, state.rooms));
    if (eligibleHousemates.length === 0) {
      return undefined;
    }

    const activeAssignment = this.getActiveAssignment(state, today);
    if (this.getAssignmentAwaitingDecision(state, today)) {
      return undefined;
    }

    const nextEvent = activeAssignment
      ? state.collectionEvents.find(
          (event) => event.status !== "cancelled" && event.weekStart > activeAssignment.weekStart
        )
      : state.collectionEvents.find(
          (event) => event.status !== "cancelled" && event.weekStart <= today && event.weekEnd >= today
        ) ??
        state.collectionEvents.find((event) => event.status !== "cancelled" && event.weekStart > today);
    if (!nextEvent) {
      return undefined;
    }

    const rotationResult = this.rotationService.getNextAssignee(
      eligibleHousemates,
      activeAssignment?.assigneeId ?? state.rotation.lastAssignedHousemateId
    );

    return {
      assigneeId: rotationResult.assignee.id,
      collectionEventId: nextEvent.id,
      weekStart: nextEvent.weekStart,
      weekEnd: nextEvent.weekEnd
    };
  }

  assignCurrentWeek(state: AppState, today = todayIsoDate()): { state: AppState; assignment?: Assignment; blockedByPendingApproval?: boolean } {
    const existing = this.getActiveAssignment(state, today);
    if (existing) {
      return { state, assignment: existing };
    }

    if (this.getPendingApprovalAssignment(state, today)) {
      return { state, blockedByPendingApproval: true };
    }

    const currentEvent = state.collectionEvents.find(
      (event) => event.status !== "cancelled" && event.weekStart <= today && event.weekEnd >= today
    );
    if (!currentEvent) {
      return { state };
    }

    const eligibleHousemates = state.housemates.filter((housemate) => this.isHousemateEligible(housemate, state.rooms));
    const rotationResult = this.rotationService.getNextAssignee(
      eligibleHousemates,
      state.rotation.lastAssignedHousemateId
    );
    const assignee = rotationResult.assignee;
    if (!assignee) {
      throw new Error("Unable to resolve next assignee.");
    }
    const assignment: Assignment = {
      id: createId("assignment"),
      collectionEventId: currentEvent.id,
      assigneeId: assignee.id,
      weekStart: currentEvent.weekStart,
      weekEnd: currentEvent.weekEnd,
      status: "assigned",
      createdAt: nowIso()
    };

    return {
      assignment,
      state: {
        ...state,
        assignments: [...state.assignments, assignment]
      }
    };
  }

  getAssignmentContext(state: AppState, assignment: Assignment): { assignee: Housemate; collectionEvent: CollectionEvent } {
    const assignee = state.housemates.find((housemate) => housemate.id === assignment.assigneeId);
    if (!assignee) {
      throw new Error(`Housemate ${assignment.assigneeId} not found.`);
    }

    const collectionEvent = state.collectionEvents.find((event) => event.id === assignment.collectionEventId);
    if (!collectionEvent) {
      throw new Error(`Collection event ${assignment.collectionEventId} not found.`);
    }

    return { assignee, collectionEvent };
  }

  markPrimaryReminderSent(state: AppState, assignmentId: string, sentAt = nowIso()): AppState {
    return {
      ...state,
      assignments: state.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, primaryReminderSentAt: sentAt } : assignment
      )
    };
  }

  markBackupReminderSent(state: AppState, assignmentId: string, sentAt = nowIso()): AppState {
    return {
      ...state,
      assignments: state.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, backupReminderSentAt: sentAt } : assignment
      )
    };
  }

  reassignCurrentWeekToNextPerson(state: AppState, today = todayIsoDate()): AppState {
    throw new Error("Reassigning to the next housemate is disabled.");
  }

  confirmCurrentWeekCompleted(state: AppState, timeZone: string, today = todayIsoDate(), now = new Date()): AppState {
    const assignment = this.getAssignmentAwaitingDecision(state, today);
    if (!assignment) {
      throw new Error("No assignment is awaiting admin approval.");
    }
    this.assertApprovalWindowReached(state, assignment, timeZone, now);

    const completedById = assignment.actualPerformerId ?? assignment.assigneeId;

    return {
      ...state,
      assignments: state.assignments.map((entry) =>
        entry.id === assignment.id
          ? {
              ...entry,
              actualPerformerId: entry.actualPerformerId ?? entry.assigneeId,
              completionStatus: "completed",
              completionConfirmedAt: nowIso(),
              carryOverToNextWeek: false,
              status: "completed"
            }
          : entry
      ),
      rotation: {
        ...state.rotation,
        lastAssignedHousemateId: completedById
      }
    };
  }

  carryCurrentWeekToNext(state: AppState, timeZone: string, today = todayIsoDate(), now = new Date()): AppState {
    const assignment = this.getAssignmentAwaitingDecision(state, today);
    if (!assignment) {
      throw new Error("No assignment is awaiting admin approval.");
    }
    this.assertApprovalWindowReached(state, assignment, timeZone, now);

    return {
      ...state,
      assignments: state.assignments.map((entry) =>
        entry.id === assignment.id
          ? {
              ...entry,
              completionStatus: "not_completed",
              completionConfirmedAt: nowIso(),
              carryOverToNextWeek: true,
              status: "missed"
            }
          : entry
      ),
      rotation: {
        ...state.rotation
      }
    };
  }

  isPrimaryReminderDue(assignment: Assignment, timeZone: string, now = new Date()): boolean {
    if (assignment.primaryReminderSentAt) {
      return false;
    }

    const zonedNow = getZonedDateTimeParts(timeZone, now);
    if (zonedNow.date < assignment.weekStart) {
      return false;
    }

    if (zonedNow.date > assignment.weekStart) {
      return true;
    }

    return zonedNow.hour > 12 || (zonedNow.hour === 12 && zonedNow.minute >= 0);
  }

  isBackupReminderDue(assignment: Assignment, collectionEvent: CollectionEvent, timeZone: string, now = new Date()): boolean {
    if (assignment.backupReminderSentAt || assignment.completionStatus === "completed") {
      return false;
    }

    const reminderDate = shiftIsoDate(collectionEvent.date, -1);
    const zonedNow = getZonedDateTimeParts(timeZone, now);
    if (zonedNow.date !== reminderDate) {
      return false;
    }

    return zonedNow.hour > 18 || (zonedNow.hour === 18 && zonedNow.minute >= 0);
  }

  isCompletionCheckDue(assignment: Assignment, timeZone: string, now = new Date()): boolean {
    if (assignment.completionCheckSentAt || assignment.completionStatus === "completed") {
      return false;
    }

    const zonedNow = getZonedDateTimeParts(timeZone, now);
    if (zonedNow.date < assignment.weekEnd) {
      return false;
    }

    if (zonedNow.date > assignment.weekEnd) {
      return true;
    }

    return zonedNow.hour > 11 || (zonedNow.hour === 11 && zonedNow.minute >= 0);
  }

  markCompletionCheckSent(state: AppState, assignmentId: string, sentAt = nowIso()): AppState {
    return {
      ...state,
      assignments: state.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, completionCheckSentAt: sentAt, completionStatus: assignment.completionStatus ?? "pending" } : assignment
      )
    };
  }

  updateAssignment(state: AppState, assignmentId: string, input: UpdateAssignmentInput): { state: AppState; assignment: Assignment } {
    const existing = this.getAssignmentById(state, assignmentId);
    if (!existing) {
      throw new Error(`Assignment ${assignmentId} not found.`);
    }

    if (input.weekStart !== undefined && !isIsoDate(input.weekStart)) {
      throw new Error("weekStart must use YYYY-MM-DD format.");
    }

    if (input.weekEnd !== undefined && !isIsoDate(input.weekEnd)) {
      throw new Error("weekEnd must use YYYY-MM-DD format.");
    }

    if (input.assigneeId && !state.housemates.some((housemate) => housemate.id === input.assigneeId)) {
      throw new Error(`Housemate ${input.assigneeId} not found.`);
    }

    const actualPerformerId =
      input.actualPerformerId === null
        ? undefined
        : input.actualPerformerId === undefined
          ? existing.actualPerformerId
          : input.actualPerformerId;

    if (actualPerformerId && !state.housemates.some((housemate) => housemate.id === actualPerformerId)) {
      throw new Error(`Housemate ${actualPerformerId} not found.`);
    }

    const updated: Assignment = {
      ...existing,
      assigneeId: input.assigneeId ?? existing.assigneeId,
      actualPerformerId,
      weekStart: input.weekStart ?? existing.weekStart,
      weekEnd: input.weekEnd ?? existing.weekEnd,
      status: input.status ?? existing.status,
      completionStatus: input.completionStatus ?? existing.completionStatus,
      primaryReminderSentAt: normalizeOptionalTimestamp(input.primaryReminderSentAt, existing.primaryReminderSentAt),
      backupReminderSentAt: normalizeOptionalTimestamp(input.backupReminderSentAt, existing.backupReminderSentAt),
      completionCheckSentAt: normalizeOptionalTimestamp(input.completionCheckSentAt, existing.completionCheckSentAt),
      completionConfirmedAt: normalizeOptionalTimestamp(input.completionConfirmedAt, existing.completionConfirmedAt),
      reassignedToNextPerson: input.reassignedToNextPerson ?? existing.reassignedToNextPerson,
      carryOverToNextWeek: input.carryOverToNextWeek ?? existing.carryOverToNextWeek
    };

    if (updated.weekStart > updated.weekEnd) {
      throw new Error("weekStart cannot be after weekEnd.");
    }

    return {
      assignment: updated,
      state: {
        ...state,
        assignments: state.assignments.map((assignment) => (assignment.id === assignmentId ? updated : assignment))
      }
    };
  }
}
