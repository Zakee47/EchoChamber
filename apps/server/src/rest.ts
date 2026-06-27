// REST API (PRD §11.1). All state is in-memory via RoomStore / the persona
// catalog — no DB.

import { Router } from "express";
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  DebateIntensity,
  DeepWikiIndexRequest,
  DeepWikiIndexResponse,
  DeepWikiProgress,
  GetRoomResponse,
  LLMAdapter,
  ListExpertsResponse,
  ListRoomsResponse,
  DeepWikiProvider,
  SuggestPanelRequest,
  SuggestPanelResponse,
} from "@echochamber/shared";
import { API_ROUTES } from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";
import type { RoomStore } from "./store.js";
import { suggestPanel } from "./selection.js";

export interface RestDeps {
  catalog: PersonaCatalog;
  store: RoomStore;
  llm: LLMAdapter;
  deepwiki: DeepWikiProvider;
  /** forward a DeepWiki progress event to all connected WS clients. */
  broadcastDeepWiki: (progress: DeepWikiProgress) => void;
}

let jobSeq = 0;
function genJobId(): string {
  jobSeq += 1;
  return `dw_${Date.now().toString(36)}${jobSeq.toString(36)}`;
}

function isIntensity(n: unknown): n is DebateIntensity {
  return n === 1 || n === 2 || n === 3;
}

export function buildRestRouter(deps: RestDeps): Router {
  const { catalog, store, llm, deepwiki, broadcastDeepWiki } = deps;
  const router = Router();

  // GET /api/experts → roster catalog
  router.get(API_ROUTES.experts, (_req, res) => {
    const body: ListExpertsResponse = { experts: catalog.roster() };
    res.json(body);
  });

  // POST /api/rooms/suggest-panel → { panel[], rationale }
  router.post(API_ROUTES.suggestPanel, async (req, res) => {
    const { topic } = (req.body ?? {}) as Partial<SuggestPanelRequest>;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic is required" });
    }
    const result = await suggestPanel(topic, catalog, llm);
    const body: SuggestPanelResponse = result;
    res.json(body);
  });

  // POST /api/rooms → { roomId }
  router.post(API_ROUTES.rooms, (req, res) => {
    const { topic, panel, intensity } = (req.body ?? {}) as Partial<CreateRoomRequest>;
    if (!topic || typeof topic !== "string") {
      return res.status(400).json({ error: "topic is required" });
    }
    if (!Array.isArray(panel) || panel.length === 0) {
      return res.status(400).json({ error: "panel must be a non-empty array" });
    }
    const unknown = panel.filter((id) => !catalog.get(id));
    if (unknown.length > 0) {
      return res.status(400).json({ error: `unknown persona ids: ${unknown.join(", ")}` });
    }
    const level: DebateIntensity = isIntensity(intensity) ? intensity : 2;
    const room = store.create(topic, panel, level);
    const body: CreateRoomResponse = { roomId: room.roomId };
    res.status(201).json(body);
  });

  // GET /api/rooms → lobby list
  router.get(API_ROUTES.rooms, (_req, res) => {
    const body: ListRoomsResponse = { rooms: store.list() };
    res.json(body);
  });

  // GET /api/rooms/:roomId
  router.get("/api/rooms/:roomId", (req, res) => {
    const room = store.get(req.params.roomId);
    if (!room) return res.status(404).json({ error: "room not found" });
    const body: GetRoomResponse = { room };
    res.json(body);
  });

  // POST /api/deepwiki/index → { jobId }; progress streamed over WS
  router.post(API_ROUTES.deepwikiIndex, (req, res) => {
    const { name } = (req.body ?? {}) as Partial<DeepWikiIndexRequest>;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    const jobId = genJobId();
    const body: DeepWikiIndexResponse = { jobId };
    res.status(202).json(body);

    // Build the persona asynchronously, forwarding progress to all clients and
    // adding the finished persona to the in-memory catalog.
    void deepwiki
      .buildPersona(name, jobId, (p) => broadcastDeepWiki(p))
      .then((persona) => {
        catalog.add(persona);
      })
      .catch((err: unknown) => {
        broadcastDeepWiki({
          jobId,
          stage: "error",
          message: err instanceof Error ? err.message : "deepwiki failed",
        });
      });
  });

  return router;
}
