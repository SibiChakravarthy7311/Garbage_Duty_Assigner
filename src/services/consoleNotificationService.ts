import type { NotificationService } from "./notificationService.js";
import type { WeeklyDutyNotification } from "../domain/types.js";
import { formatBackupReminderMessage, formatCompletionCheckMessage, formatWeeklyDutyMessage } from "./messageFormatter.js";

export class ConsoleNotificationService implements NotificationService {
  async sendWeeklyStart(notification: WeeklyDutyNotification): Promise<void> {
    console.log(formatWeeklyDutyMessage(notification));
  }

  async sendCollectionBackup(notification: WeeklyDutyNotification): Promise<void> {
    console.log(formatBackupReminderMessage(notification));
  }

  async sendCompletionCheck(notification: WeeklyDutyNotification): Promise<void> {
    console.log(formatCompletionCheckMessage(notification));
  }
}
