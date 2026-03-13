import type { Housemate } from "../domain/types.js";

export interface RotationResult {
  assignee: Housemate;
  consumedSkipIds: string[];
}

export class RotationService {
  getNextAssignee(housemates: Housemate[], lastAssignedHousemateId?: string, skipOnceHousemateIds: string[] = []): RotationResult {
    const activeHousemates = housemates.filter((housemate) => housemate.isActive);

    if (activeHousemates.length === 0) {
      throw new Error("No active housemates are available for assignment.");
    }

    if (!lastAssignedHousemateId) {
      const consumedSkipIds: string[] = [];
      for (const housemate of activeHousemates) {
        if (skipOnceHousemateIds.includes(housemate.id)) {
          consumedSkipIds.push(housemate.id);
          continue;
        }

        return { assignee: housemate, consumedSkipIds };
      }

      return { assignee: activeHousemates[0], consumedSkipIds: [] };
    }

    const lastIndex = activeHousemates.findIndex((housemate) => housemate.id === lastAssignedHousemateId);
    if (lastIndex === -1) {
      return this.getNextAssignee(activeHousemates, undefined, skipOnceHousemateIds);
    }

    const consumedSkipIds: string[] = [];
    for (let offset = 1; offset <= activeHousemates.length; offset += 1) {
      const candidate = activeHousemates[(lastIndex + offset) % activeHousemates.length];
      if (skipOnceHousemateIds.includes(candidate.id)) {
        consumedSkipIds.push(candidate.id);
        continue;
      }

      return { assignee: candidate, consumedSkipIds };
    }

    return { assignee: activeHousemates[(lastIndex + 1) % activeHousemates.length], consumedSkipIds: [] };
  }
}
