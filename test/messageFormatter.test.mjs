import assert from "node:assert/strict";
import test from "node:test";
import { formatWeeklyDutyMessage } from "../dist/services/messageFormatter.js";

function createNotification(overrides = {}) {
  return {
    assignment: {
      id: "assignment_1",
      collectionEventId: "event_1",
      assigneeId: "housemate_1",
      weekStart: "2026-03-09",
      weekEnd: "2026-03-16",
      status: "assigned",
      createdAt: "2026-03-09T16:00:00.000Z"
    },
    assignee: {
      id: "housemate_1",
      name: "Ishita",
      roomNumber: "6",
      whatsappNumber: "+12268835757",
      isActive: true
    },
    collectionEvent: {
      id: "event_1",
      date: "2026-03-16",
      weekStart: "2026-03-09",
      weekEnd: "2026-03-16",
      streams: ["garbage"],
      status: "scheduled",
      source: "test"
    },
    address: "5835 Balmoral Road, Halifax, NS, B3H1A5",
    adminUrl: "http://localhost:3000/admin",
    ...overrides
  };
}

test("weekly duty message matches the required garbage-only template", () => {
  const message = formatWeeklyDutyMessage(createNotification());

  assert.equal(
    message,
    [
      "Waste Duty Reminder",
      "",
      "This week's waste duty is Ishita (Room 6).",
      "",
      "Duty window: March 9, 2026 to March 16, 2026",
      "Collection day: Monday, March 16, 2026",
      "Pickup this week: Garbage",
      "",
      "Please make sure the following is taken care of before collection:",
      "- replace liners where needed",
      "- collect and tie filled garbage bags from common areas",
      "- tidy and organize the waste storage area",
      "- place garbage out for pickup before 8:00 a.m.",
      "",
      "If helpful, put everything out the night before so it is ready on time.",
      "",
      "Thanks for handling it."
    ].join("\n")
  );
});

test("weekly duty message formats multi-stream reminders without contact or admin metadata", () => {
  const message = formatWeeklyDutyMessage(
    createNotification({
      collectionEvent: {
        id: "event_2",
        date: "2026-03-23",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-23",
        streams: ["recycling", "organics"],
        status: "scheduled",
        source: "test"
      },
      assignment: {
        id: "assignment_2",
        collectionEventId: "event_2",
        assigneeId: "housemate_1",
        weekStart: "2026-03-16",
        weekEnd: "2026-03-23",
        status: "assigned",
        createdAt: "2026-03-16T16:00:00.000Z"
      }
    })
  );

  assert.match(message, /Pickup this week: Recycling and Organics/);
  assert.match(message, /Collection day: Monday, March 23, 2026/);
  assert.match(message, /- collect and sort recyclable materials properly/);
  assert.match(message, /- empty and secure organics bags or bins/);
  assert.match(message, /- place recycling and organics out for pickup before 8:00 a\.m\./);
  assert.doesNotMatch(message, /WhatsApp|Phone:|Admin:|Review:|http:\/\/localhost/);
});
