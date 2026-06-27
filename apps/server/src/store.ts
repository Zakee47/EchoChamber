// In-memory room store (no DB). Keyed by roomId.

import type { DebateIntensity, Room } from "@echochamber/shared";

let seq = 0;
function genRoomId(): string {
  seq += 1;
  return `r_${Date.now().toString(36)}${seq.toString(36)}`;
}

export class RoomStore {
  private rooms = new Map<string, Room>();

  create(topic: string, panel: string[], intensity: DebateIntensity): Room {
    const room: Room = {
      roomId: genRoomId(),
      topic,
      panel,
      debateIntensity: intensity,
      status: "in_room",
      createdAt: Date.now(),
    };
    this.rooms.set(room.roomId, room);
    return room;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  list(): Room[] {
    return [...this.rooms.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  setStatus(roomId: string, status: Room["status"]): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = status;
  }
}
