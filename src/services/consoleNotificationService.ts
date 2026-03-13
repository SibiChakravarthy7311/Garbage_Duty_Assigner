import type { NotificationService } from "./notificationService.js";
import type { WeeklyDutyNotification } from "../domain/types.js";

function formatStreams(streams: string[]): string {
  return streams.join(", ");
}

export class ConsoleNotificationService implements NotificationService {
  async sendWeeklyStart(notification: WeeklyDutyNotification): Promise<void> {
    console.log(
      [
        `Weekly duty notification for ${notification.assignee.name}`,
        `Room: ${notification.assignee.roomNumber}`,
        `Duty window: ${notification.assignment.weekStart} to ${notification.assignment.weekEnd}`,
        `Collection date: ${notification.collectionEvent.date}`,
        `Streams: ${formatStreams(notification.collectionEvent.streams)}`,
        `Address: ${notification.address}`
      ].join(" | ")
    );
  }

  async sendCollectionBackup(notification: WeeklyDutyNotification): Promise<void> {
    console.log(
      [
        `Backup collection reminder for ${notification.assignee.name}`,
        `Collection date: ${notification.collectionEvent.date}`,
        `Streams: ${formatStreams(notification.collectionEvent.streams)}`
      ].join(" | ")
    );
  }

  async sendCompletionCheck(notification: WeeklyDutyNotification): Promise<void> {
    console.log(
      [
        `Completion check for ${notification.assignee.name}`,
        `Collection date: ${notification.collectionEvent.date}`,
        notification.adminUrl ? `Admin: ${notification.adminUrl}` : ""
      ].filter(Boolean).join(" | ")
    );
  }
}
