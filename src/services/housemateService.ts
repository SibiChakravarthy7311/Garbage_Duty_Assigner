import { createId } from "../lib/id.js";
import type { AppState, Housemate } from "../domain/types.js";

export interface CreateHousemateInput {
  name: string;
  roomNumber: string;
  whatsappNumber?: string;
  isActive?: boolean;
  notes?: string;
}

export interface UpdateHousemateInput {
  name?: string;
  roomNumber?: string;
  whatsappNumber?: string;
  isActive?: boolean;
  notes?: string;
}

export class HousemateService {
  create(state: AppState, input: CreateHousemateInput): { state: AppState; housemate: Housemate } {
    const housemate: Housemate = {
      id: createId("housemate"),
      name: input.name.trim(),
      roomNumber: input.roomNumber.trim(),
      whatsappNumber: input.whatsappNumber?.trim(),
      isActive: input.isActive ?? true,
      notes: input.notes?.trim()
    };

    return {
      housemate,
      state: {
        ...state,
        housemates: [...state.housemates, housemate]
      }
    };
  }

  update(state: AppState, housemateId: string, input: UpdateHousemateInput): { state: AppState; housemate: Housemate } {
    const existing = state.housemates.find((housemate) => housemate.id === housemateId);
    if (!existing) {
      throw new Error(`Housemate ${housemateId} not found.`);
    }

    const updated: Housemate = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      roomNumber: input.roomNumber?.trim() ?? existing.roomNumber,
      whatsappNumber: input.whatsappNumber?.trim() ?? existing.whatsappNumber,
      isActive: input.isActive ?? existing.isActive,
      notes: input.notes?.trim() ?? existing.notes
    };

    return {
      housemate: updated,
      state: {
        ...state,
        housemates: state.housemates.map((housemate) => (housemate.id === housemateId ? updated : housemate))
      }
    };
  }
}
