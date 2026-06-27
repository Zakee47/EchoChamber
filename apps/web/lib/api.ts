import type {
  CreateRoomRequest,
  CreateRoomResponse,
  DeepWikiIndexResponse,
  ListExpertsResponse,
  ListRoomsResponse,
  RosterEntry,
  SuggestPanelResponse,
} from "@echochamber/shared";
import { API_ROUTES } from "@echochamber/shared";
import { SERVER_URL, USE_MOCK } from "./config";
import { FALLBACK_ROSTER } from "./roster";
import { MOCK_ROOMS, type LobbyRoom } from "./mockData";
import { suggestPanel } from "./suggest";

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      // Keep the UI responsive even if the orchestrator is slow/absent.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getExperts(): Promise<RosterEntry[]> {
  const real = await tryFetch<ListExpertsResponse>(API_ROUTES.experts);
  if (real?.experts?.length) return real.experts;
  return FALLBACK_ROSTER;
}

export async function getRooms(): Promise<LobbyRoom[]> {
  const real = await tryFetch<ListRoomsResponse>(API_ROUTES.rooms);
  if (real?.rooms?.length) {
    return real.rooms.map((r) => ({
      ...r,
      category: "product",
      participants: r.status === "in_room" ? 1 : 0,
      live: r.status === "in_room",
      hostBlurb: r.status === "in_room" ? "Live now" : "Upcoming",
    }));
  }
  return MOCK_ROOMS;
}

export async function postSuggestPanel(
  topic: string,
  roster: RosterEntry[],
): Promise<SuggestPanelResponse> {
  if (!USE_MOCK) {
    const real = await tryFetch<SuggestPanelResponse>(API_ROUTES.suggestPanel, {
      method: "POST",
      body: JSON.stringify({ topic }),
    });
    if (real) return real;
  }
  // mock fallback (and default in mock mode)
  await new Promise((r) => setTimeout(r, 650));
  return suggestPanel(topic, roster);
}

export async function postCreateRoom(req: CreateRoomRequest): Promise<CreateRoomResponse> {
  if (!USE_MOCK) {
    const real = await tryFetch<CreateRoomResponse>(API_ROUTES.rooms, {
      method: "POST",
      body: JSON.stringify(req),
    });
    if (real) return real;
  }
  return { roomId: `r_${Math.random().toString(36).slice(2, 8)}` };
}

export async function postDeepWikiIndex(name: string): Promise<DeepWikiIndexResponse> {
  if (!USE_MOCK) {
    const real = await tryFetch<DeepWikiIndexResponse>(API_ROUTES.deepwikiIndex, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (real) return real;
  }
  return { jobId: `dw_${Math.random().toString(36).slice(2, 8)}` };
}
