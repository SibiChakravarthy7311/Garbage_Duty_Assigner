import type { WeeklyDutyNotification } from "../domain/types.js";

function normalizePhoneNumber(phoneNumber?: string): string | undefined {
  if (!phoneNumber) {
    return undefined;
  }

  const normalized = phoneNumber.replace(/[^\d+]/g, "");
  return normalized.length > 0 ? normalized : undefined;
}

function buildWhatsappLink(phoneNumber?: string): string | undefined {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) {
    return undefined;
  }

  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly ? `https://wa.me/${digitsOnly}` : undefined;
}

export function formatWeeklyDutyMessage(notification: WeeklyDutyNotification): string {
  const streams = notification.collectionEvent.streams.join(", ");
  const phoneLine = notification.assignee.whatsappNumber
    ? `Phone: ${notification.assignee.whatsappNumber}.`
    : "Phone: not available.";
  const whatsappLink = buildWhatsappLink(notification.assignee.whatsappNumber);
  const adminLine = notification.adminUrl ? `Admin: ${notification.adminUrl}.` : undefined;

  return [
    `Waste duty this week: ${notification.assignee.name}.`,
    `Room: ${notification.assignee.roomNumber}.`,
    `Duty window: ${notification.assignment.weekStart} to ${notification.assignment.weekEnd}.`,
    `Collection date: ${notification.collectionEvent.date}.`,
    `Collection streams: ${streams}.`,
    phoneLine,
    whatsappLink ? `WhatsApp: ${whatsappLink}.` : "WhatsApp: not available.",
    adminLine,
    "Please manage liners, collect filled bags, organize storage, and place materials out on collection day."
  ].filter(Boolean).join(" ");
}

export function formatBackupReminderMessage(notification: WeeklyDutyNotification): string {
  const streams = notification.collectionEvent.streams.join(", ");
  const whatsappLink = buildWhatsappLink(notification.assignee.whatsappNumber);
  return [
    `Reminder: ${notification.assignee.name} is on duty this week.`,
    `Collection is on ${notification.collectionEvent.date} for ${streams}.`,
    notification.assignee.whatsappNumber ? `Phone: ${notification.assignee.whatsappNumber}.` : "Phone: not available.",
    whatsappLink ? `WhatsApp: ${whatsappLink}.` : "WhatsApp: not available."
  ].join(" ");
}

export function formatCompletionCheckMessage(notification: WeeklyDutyNotification): string {
  const adminLine = notification.adminUrl ? `Review: ${notification.adminUrl}.` : undefined;

  return [
    `Collection check: was this week's duty completed by ${notification.assignee.name}?`,
    `Collection date: ${notification.collectionEvent.date}.`,
    "If completed, mark it complete. If not completed, carry it over to next week.",
    adminLine
  ].filter(Boolean).join(" ");
}
