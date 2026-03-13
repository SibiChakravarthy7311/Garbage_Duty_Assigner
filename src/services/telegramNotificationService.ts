import type { WeeklyDutyNotification } from "../domain/types.js";
import type { NotificationService } from "./notificationService.js";
import { formatBackupReminderMessage, formatCompletionCheckMessage, formatWeeklyDutyMessage } from "./messageFormatter.js";

export class TelegramNotificationService implements NotificationService {
  constructor(
    private readonly botToken: string,
    private readonly chatId: string
  ) {}

  async sendWeeklyStart(notification: WeeklyDutyNotification): Promise<void> {
    await this.sendMessage(formatWeeklyDutyMessage(notification));
  }

  async sendCollectionBackup(notification: WeeklyDutyNotification): Promise<void> {
    await this.sendMessage(formatBackupReminderMessage(notification));
  }

  async sendCompletionCheck(notification: WeeklyDutyNotification): Promise<void> {
    await this.sendMessage(formatCompletionCheckMessage(notification));
  }

  async sendTestMessage(text: string): Promise<void> {
    await this.sendMessage(text);
  }

  private async sendMessage(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: this.chatId,
        text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram send failed: ${response.status} ${errorText}`);
    }
  }
}
