// EchoChamber orchestrator server.
//
// REST API + WebSocket turn engine for the AI Expert Roundtable. Holds all
// state in memory (rooms, sessions, persona catalog). Depends only on the
// @echochamber/shared interfaces and the package factories — no vendor SDKs.
//
// See apps/server/BUILD.md and docs/EXPERT_ROUNDTABLE_TECHNICAL_PRD.md §6, §11.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import type { Socket } from "node:net";
import express from "express";
import cors from "cors";
import { WebSocketServer, type WebSocket } from "ws";
import dotenv from "dotenv";
import type {
  ClientMessage,
  DeepWikiProgress,
  ServerMessage,
} from "@echochamber/shared";
import { buildAdapterBundle, resolveMode } from "./adapters.js";
import { loadPersonaCatalog } from "./personas.js";
import { RoomStore } from "./store.js";
import { SessionManager } from "./sessions.js";
import { buildRestRouter } from "./rest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const MODE = resolveMode();
const adapters = buildAdapterBundle(MODE);
const catalog = loadPersonaCatalog();
const store = new RoomStore();
const sessions = new SessionManager(store, catalog, adapters);

// Every connected socket, used to fan out DeepWiki progress events (which are
// not scoped to a single room).
const allSockets = new Set<WebSocket>();
function broadcastDeepWiki(progress: DeepWikiProgress): void {
  const msg: ServerMessage = { type: "deepwiki_progress", progress };
  const data = JSON.stringify(msg);
  for (const ws of allSockets) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) =>
  res.json({ ok: true, mode: MODE, experts: catalog.list().length }),
);

app.use(
  buildRestRouter({ catalog, store, llm: adapters.llm, deepwiki: adapters.deepwiki, broadcastDeepWiki }),
);

const server = createServer(app);

// Manual upgrade routing so we can support both room sockets
// (/ws/rooms/:roomId) and a lobby socket (/ws) for DeepWiki progress.
const wss = new WebSocketServer({ noServer: true });
const ROOM_WS = /^\/ws\/rooms\/([^/?]+)/;

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  const path = url.split("?")[0] ?? "";
  const roomMatch = ROOM_WS.exec(path);
  const isLobby = path === "/ws" || path === "/ws/lobby";

  if (!roomMatch && !isLobby) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket as Socket, head, (ws) => {
    allSockets.add(ws);
    ws.on("close", () => allSockets.delete(ws));

    if (!roomMatch) return; // lobby socket: DeepWiki progress only

    const roomId = decodeURIComponent(roomMatch[1]!);
    const session = sessions.ensure(roomId);
    if (!session) {
      ws.send(JSON.stringify({ type: "error", message: `room ${roomId} not found`, fatal: true } satisfies ServerMessage));
      ws.close();
      return;
    }
    session.attach(ws);

    ws.on("message", (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "invalid json" } satisfies ServerMessage));
        return;
      }
      void session.handle(ws, msg);
    });
  });
});

const PORT = Number(process.env.PORT ?? 8787);
server.listen(PORT, () => {
  console.log(
    `[echochamber] orchestrator (${MODE} mode) on :${PORT} — ${catalog.list().length} experts loaded`,
  );
});
