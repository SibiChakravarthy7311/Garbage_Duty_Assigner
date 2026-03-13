import { createId } from "../lib/id.js";
import { nowIso, todayIsoDate } from "../lib/time.js";
import { getZonedDateTimeParts } from "../lib/zonedDateTime.js";
import type { AppState, Assignment, CollectionEvent, Housemate, Room } from "../domain/types.js";
import { RotationService } from "./rotationService.js";

export class AssignmentService {
  constructor(private readonly rotationService: RotationService) {}

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
    const eventById = new Map(state.collectionEvents.map((event) => [event.id, event]));

    for (const event of events) {
      eventById.set(event.id, event);
    }

    return {
      ...state,
      collectionEvents: [...eventById.values()].sort((left, right) => left.date.localeCompare(right.date))
    };
  }

  getActiveAssignment(state: AppState, today = todayIsoDate()): Assignment | undefined {
    return state.assignments.find((assignment) => assignment.weekStart <= today && assignment.weekEnd >= today);
  }

  assignCurrentWeek(state: AppState, today = todayIsoDate()): { state: AppState; assignment?: Assignment } {
    const existing = this.getActiveAssignment(state, today);
    if (existing) {
      return { state, assignment: existing };
    }

    const currentEvent = state.collectionEvents.find(
      (event) => event.status !== "cancelled" && event.weekStart <= today && event.weekEnd >= today
    );
    if (!currentEvent) {
      return { state };
    }

    const eligibleHousemates = state.housemates.filter((housemate) => this.isHousemateEligible(housemate, state.rooms));
    const forcedAssignee = state.rotation.nextForcedHousemateId
      ? eligibleHousemates.find((housemate) => housemate.id === state.rotation.nextForcedHousemateId)
      : undefined;
    const rotationResult = forcedAssignee
      ? undefined
      : this.rotationService.getNextAssignee(
          eligibleHousemates,
          state.rotation.lastAssignedHousemateId,
          state.rotation.skipOnceHousemateIds ?? []
        );
    const assignee = forcedAssignee ?? rotationResult?.assignee;
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
        assignments: [...state.assignments, assignment],
        rotation: {
          lastAssignedHousemateId: assignee.id,
          nextForcedHousemateId: forcedAssignee ? undefined : state.rotation.nextForcedHousemateId,
          skipOnceHousemateIds: forcedAssignee
            ? state.rotation.skipOnceHousemateIds
            : (state.rotation.skipOnceHousemateIds ?? []).filter(
                (id) => !(rotationResult?.consumedSkipIds ?? []).includes(id)
              )
        }
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
    const assignment = this.getActiveAssignment(state, today);
    if (!assignment) {
      throw new Error("No active assignment found.");
    }

    const eligibleHousemates = state.housemates.filter((housemate) => this.isHousemateEligible(housemate, state.rooms));
    const next = this.rotationService.getNextAssignee(eligibleHousemates, assignment.assigneeId);

    return {
      ...state,
      assignments: state.assignments.map((entry) =>
        entry.id === assignment.id
          ? {
              ...entry,
              actualPerformerId: next.assignee.id,
              reassignedToNextPerson: true,
              carryOverToNextWeek: true,
              status: "reassigned"
            }
          : entry
      ),
      rotation: {
        ...state.rotation,
        nextForcedHousemateId: assignment.assigneeId,
        skipOnceHousemateIds: Array.from(new Set([...(state.rotation.skipOnceHousemateIds ?? []), next.assignee.id]))
      }
    };
  }

  confirmCurrentWeekCompleted(state: AppState, today = todayIsoDate()): AppState {
    const assignment = this.getActiveAssignment(state, today);
    if (!assignment) {
      throw new Error("No active assignment found.");
    }

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
      )
    };
  }

  carryCurrentWeekToNext(state: AppState, today = todayIsoDate()): AppState {
    const assignment = this.getActiveAssignment(state, today);
    if (!assignment) {
      throw new Error("No active assignment found.");
    }

    const replacementId =
      assignment.reassignedToNextPerson && assignment.actualPerformerId && assignment.actualPerformerId !== assignment.assigneeId
        ? assignment.actualPerformerId
        : undefined;

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
        ...state.rotation,
        nextForcedHousemateId: assignment.assigneeId,
        skipOnceHousemateIds: (state.rotation.skipOnceHousemateIds ?? []).filter((id) => id !== replacementId)
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
}
