"use client";

import type { DebateIntensity, RosterEntry } from "@echochamber/shared";

export interface RoomDraft {
  roomId: string;
  topic: string;
  panel: string[];
  intensity: DebateIntensity;
}

const ROOM_KEY = (id: string) => `echo_room_${id}`;
const DEEPWIKI_KEY = "echo_deepwiki_experts";

export function saveRoomDraft(draft: RoomDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ROOM_KEY(draft.roomId), JSON.stringify(draft));
}

export function loadRoomDraft(roomId: string): RoomDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(ROOM_KEY(roomId));
  return raw ? (JSON.parse(raw) as RoomDraft) : null;
}

export function loadDeepWikiExperts(): RosterEntry[] {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(DEEPWIKI_KEY);
  return raw ? (JSON.parse(raw) as RosterEntry[]) : [];
}

export function addDeepWikiExpert(entry: RosterEntry) {
  if (typeof window === "undefined") return;
  const current = loadDeepWikiExperts().filter((e) => e.id !== entry.id);
  sessionStorage.setItem(DEEPWIKI_KEY, JSON.stringify([entry, ...current]));
}
