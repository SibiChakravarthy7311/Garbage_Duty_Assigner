import type { WeeklyDutyNotification } from "../domain/types.js";

export interface NotificationService {
  sendWeeklyStart(notification: WeeklyDutyNotification): Promise<void>;
  sendCollectionBackup(notification: WeeklyDutyNotification): Promise<void>;
  sendCompletionCheck(notification: WeeklyDutyNotification): Promise<void>;
}
