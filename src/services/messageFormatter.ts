import type { WeeklyDutyNotification, WasteStream } from "../domain/types.js";

function parseIsoDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDate(date: string, includeWeekday: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: includeWeekday ? "long" : undefined,
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parseIsoDate(date));
}

function titleCaseStream(stream: WasteStream): string {
  switch (stream) {
    case "garbage":
      return "Garbage";
    case "recycling":
      return "Recycling";
    case "organics":
      return "Organics";
  }
}

function joinNaturally(values: string[]): string {
  if (values.length === 1) {
    return values[0] ?? "";
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatStreamLabel(streams: WasteStream[]): string {
  return joinNaturally(streams.map(titleCaseStream));
}

function buildChecklist(streams: WasteStream[]): string[] {
  const uniqueStreams = Array.from(new Set(streams));
  const bullets: string[] = ["replace liners where needed"];

  if (uniqueStreams.includes("garbage")) {
    bullets.push("collect and tie filled garbage bags from common areas");
  }

  if (uniqueStreams.includes("recycling")) {
    bullets.push("collect and sort recyclable materials properly");
  }

  if (uniqueStreams.includes("organics")) {
    bullets.push("empty and secure organics bags or bins");
  }

  bullets.push("tidy and organize the waste storage area");
  bullets.push(`place ${formatStreamLabel(uniqueStreams).toLowerCase()} out for pickup before 8:00 a.m.`);

  return bullets;
}

export function formatWeeklyDutyMessage(notification: WeeklyDutyNotification): string {
  const streamLabel = formatStreamLabel(notification.collectionEvent.streams);
  const checklist = buildChecklist(notification.collectionEvent.streams);

  return [
    "Waste Duty Reminder",
    "",
    `This week's waste duty is ${notification.assignee.name}.`,
    "",
    `Duty window: ${formatDate(notification.assignment.weekStart, false)} to ${formatDate(notification.assignment.weekEnd, false)}`,
    `Collection day: ${formatDate(notification.collectionEvent.date, true)}`,
    `Pickup this week: ${streamLabel}`,
    "",
    "Please make sure the following is taken care of before collection:",
    ...checklist.map((item) => `- ${item}`),
    "",
    "If helpful, put everything out the night before so it is ready on time.",
    "",
    "Thanks for handling it."
  ].join("\n");
}

export function formatBackupReminderMessage(notification: WeeklyDutyNotification): string {
  return formatWeeklyDutyMessage(notification);
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
