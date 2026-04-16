export type WasteStream = "garbage" | "recycling" | "organics";

export type CollectionStatus = "scheduled" | "delayed" | "cancelled";

export interface Housemate {
  id: string;
  name: string;
  roomNumber: string;
  whatsappNumber?: string;
  isActive: boolean;
  notes?: string;
}

export interface Room {
  id: string;
  label: string;
  isActive: boolean;
  occupantId?: string;
}

export interface CollectionEvent {
  id: string;
  date: string;
  weekStart: string;
  weekEnd: string;
  streams: WasteStream[];
  status: CollectionStatus;
  source: string;
  notes?: string;
}

export interface Assignment {
  id: string;
  collectionEventId: string;
  assigneeId: string;
  weekStart: string;
  weekEnd: string;
  primaryReminderSentAt?: string;
  backupReminderSentAt?: string;
  completionCheckSentAt?: string;
  completionConfirmedAt?: string;
  completionStatus?: "pending" | "completed" | "not_completed";
  actualPerformerId?: string;
  reassignedToNextPerson?: boolean;
  carryOverToNextWeek?: boolean;
  status: "assigned" | "reassigned" | "completed" | "missed";
  createdAt: string;
}

export interface RotationState {
  lastAssignedHousemateId?: string;
}

export interface AppConfigState {
  address: string;
  timezone: string;
  scheduleSource: "file" | "halifax";
}

export interface AppState {
  config: AppConfigState;
  housemates: Housemate[];
  rooms: Room[];
  collectionEvents: CollectionEvent[];
  assignments: Assignment[];
  rotation: RotationState;
}

export interface WeeklyDutyNotification {
  assignment: Assignment;
  assignee: Housemate;
  collectionEvent: CollectionEvent;
  address: string;
  adminUrl?: string;
}
