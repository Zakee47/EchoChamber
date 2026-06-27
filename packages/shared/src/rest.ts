import type { DebateIntensity, RosterEntry, Room } from "./types.js";

// GET /api/experts
export interface ListExpertsResponse {
  experts: RosterEntry[];
}

// POST /api/rooms/suggest-panel
export interface SuggestPanelRequest {
  topic: string;
}
export interface SuggestPanelResponse {
  panel: string[]; // persona ids, 4–5
  rationale: string;
}

// POST /api/rooms
export interface CreateRoomRequest {
  topic: string;
  panel: string[];
  intensity: DebateIntensity;
}
export interface CreateRoomResponse {
  roomId: string;
}

// GET /api/rooms
export interface ListRoomsResponse {
  rooms: Room[];
}

// GET /api/rooms/:roomId
export interface GetRoomResponse {
  room: Room;
}

// POST /api/deepwiki/index
export interface DeepWikiIndexRequest {
  name: string;
}
export interface DeepWikiIndexResponse {
  jobId: string;
}

export const API_ROUTES = {
  experts: "/api/experts",
  suggestPanel: "/api/rooms/suggest-panel",
  rooms: "/api/rooms",
  room: (roomId: string) => `/api/rooms/${roomId}`,
  deepwikiIndex: "/api/deepwiki/index",
  ws: (roomId: string) => `/ws/rooms/${roomId}`,
} as const;
