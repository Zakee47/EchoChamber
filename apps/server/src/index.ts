// EchoChamber orchestrator server — STARTER STUB.
//
// This compiles and runs in mock mode: serves the roster and accepts WS
// connections per room. The orchestrator child (apps/server) replaces the
// turn-taking placeholder with the real engine described in BUILD.md / PRD §6.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { WebSocketServer, type WebSocket } from "ws";
import dotenv from "dotenv";
import {
  API_ROUTES,
  type ClientMessage,
  type ServerMessage,
  type ExpertCategory,
  type GroundingTier,
  type RosterEntry,
} from "@echochamber/shared";
import { createLLMAdapter, createSTTAdapter, createTTSAdapter } from "@echochamber/voice";
import { createGroundingProvider } from "@echochamber/grounding";
import { createDeepWikiProvider } from "@echochamber/deepwiki";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const MODE = (process.env.ECHO_ADAPTER_MODE === "real" ? "real" : "mock") as "real" | "mock";

const adapters = {
  llm: createLLMAdapter({ geminiApiKey: process.env.GEMINI_API_KEY, mode: MODE }),
  stt: createSTTAdapter({ geminiApiKey: process.env.GEMINI_API_KEY, mode: MODE }),
  tts: createTTSAdapter({ slngApiKey: process.env.SLNG_API_KEY, mode: MODE }),
  grounding: createGroundingProvider({ superlinkedApiKey: process.env.SUPERLINKED_API_KEY, mode: MODE }),
  deepwiki: createDeepWikiProvider({ tavilyApiKey: process.env.TAVILY_API_KEY, mode: MODE }),
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rosterPath = resolve(__dirname, "../../../data/personas/roster.json");

interface RosterFile {
  experts: Array<{
    id: string;
    name: string;
    category: ExpertCategory;
    title: string;
    tier: GroundingTier;
    avatar: { color: string; initials: string; image?: string };
    expertiseTags: string[];
  }>;
}

function loadRoster(): RosterEntry[] {
  const raw = JSON.parse(readFileSync(rosterPath, "utf8")) as RosterFile;
  return raw.experts;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, mode: MODE }));

app.get(API_ROUTES.experts, (_req, res) => {
  res.json({ experts: loadRoster() });
});

// TODO(child:server): implement suggest-panel, rooms CRUD, deepwiki index.

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  const send = (m: ServerMessage) => ws.send(JSON.stringify(m));
  ws.on("message", async (data) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      send({ type: "error", message: "invalid json" });
      return;
    }
    // Placeholder echo so the frontend can integrate against a live socket.
    if (msg.type === "user_utterance") {
      const text = msg.text ?? (await adapters.stt.transcribe(new Uint8Array(), "audio/wav"));
      const reply = await adapters.llm.generate({
        systemPrompt: "You are a helpful startup advisor.",
        userPrompt: text,
      });
      send({ type: "speaker_state", agentId: "elena-verna", state: "speaking" });
      send({
        type: "transcript",
        entry: { id: `t_${Date.now()}`, speaker: "elena-verna", text: reply, ts: Date.now() },
      });
      send({ type: "speaker_state", agentId: "elena-verna", state: "done" });
    }
  });
});

const PORT = Number(process.env.PORT ?? 8787);
server.listen(PORT, () => {
  console.log(`[echochamber] orchestrator (${MODE} mode) on :${PORT}`);
});
