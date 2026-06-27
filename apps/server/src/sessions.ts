// Session manager: one Session per active room, created lazily when the first
// WebSocket client connects to that room.

import type { AdapterBundle } from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";
import type { RoomStore } from "./store.js";
import { Session } from "./session.js";

export class SessionManager {
  private sessions = new Map<string, Session>();

  constructor(
    private readonly store: RoomStore,
    private readonly catalog: PersonaCatalog,
    private readonly adapters: AdapterBundle,
  ) {}

  ensure(roomId: string): Session | undefined {
    const existing = this.sessions.get(roomId);
    if (existing) return existing;
    const room = this.store.get(roomId);
    if (!room) return undefined;
    const session = new Session(room, this.catalog, this.adapters, (id) => {
      this.store.setStatus(id, "ended");
    });
    this.sessions.set(roomId, session);
    return session;
  }

  get(roomId: string): Session | undefined {
    return this.sessions.get(roomId);
  }
}
