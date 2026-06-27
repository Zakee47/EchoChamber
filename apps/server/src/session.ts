// Per-room session: the IN_ROOM state machine + the turn engine that drives a
// full multi-agent turn (selection → streamed responses → reactor → cards) and
// the summary on end. One Session per room; many WS clients may attach.

import type { WebSocket } from "ws";
import type {
  AdapterBundle,
  ClientMessage,
  HandRaise,
  PersonaRecord,
  Room,
  ServerMessage,
  TranscriptEntry,
  VisualCard,
} from "@echochamber/shared";
import { INTENSITY, type DebateIntensity } from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";
import { selectAgents, selectReactor } from "./selection.js";
import { assembleContext } from "./context.js";
import { extractCards } from "./cards.js";
import { buildSummary } from "./summary.js";

export type SessionState =
  | "idle"
  | "user_speaking"
  | "transcribing"
  | "selecting"
  | "agent_turn"
  | "hand_raise_wait"
  | "end_session"
  | "summary";

let entrySeq = 0;
function genEntryId(): string {
  entrySeq += 1;
  return `t_${Date.now().toString(36)}${entrySeq.toString(36)}`;
}

export class Session {
  readonly roomId: string;
  private state: SessionState = "idle";
  private intensity: DebateIntensity;
  private pendingIntensity: DebateIntensity | null = null;
  private currentTopic: string;

  private readonly transcript: TranscriptEntry[] = [];
  private readonly cards: VisualCard[] = [];
  private handRaises: HandRaise[] = [];
  private recentSpeakers: string[] = [];

  private responseCount = 0;
  private nextCardThreshold = 3;
  private audioSeq = 0;
  private busy = false;
  private ended = false;

  private readonly sockets = new Set<WebSocket>();

  constructor(
    private readonly room: Room,
    private readonly catalog: PersonaCatalog,
    private readonly adapters: AdapterBundle,
    private readonly onEnd: (roomId: string) => void,
  ) {
    this.roomId = room.roomId;
    this.intensity = room.debateIntensity;
    this.currentTopic = room.topic;
  }

  // ── socket management ─────────────────────────────────────────────────────

  attach(ws: WebSocket): void {
    this.sockets.add(ws);
    ws.on("close", () => this.sockets.delete(ws));
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  private broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const ws of this.sockets) {
      if (ws.readyState === ws.OPEN) ws.send(data);
    }
  }

  private setState(state: SessionState): void {
    this.state = state;
  }

  getState(): SessionState {
    return this.state;
  }

  private nameOf = (speaker: string): string =>
    speaker === "user" ? "User" : this.catalog.get(speaker)?.name ?? speaker;

  // ── inbound messages ──────────────────────────────────────────────────────

  async handle(ws: WebSocket, msg: ClientMessage): Promise<void> {
    switch (msg.type) {
      case "user_utterance":
        await this.onUserUtterance(msg.text, msg.audioBase64, msg.mimeType);
        break;
      case "set_intensity":
        this.pendingIntensity = msg.level;
        break;
      case "mention":
        await this.onMention(msg.agentId, msg.text);
        break;
      case "admit_hand":
        await this.onAdmitHand(msg.agentId);
        break;
      case "continue_debate":
        await this.runTurn({ topic: this.currentTopic });
        break;
      case "end_session":
        await this.endSession();
        break;
      default:
        this.send(ws, { type: "error", message: "unknown message type" });
    }
  }

  private async onUserUtterance(
    text?: string,
    audioBase64?: string,
    mimeType?: string,
  ): Promise<void> {
    if (this.ended) return;
    let utterance = text?.trim() ?? "";
    if (!utterance && audioBase64) {
      this.setState("transcribing");
      try {
        const audio = Uint8Array.from(Buffer.from(audioBase64, "base64"));
        utterance = (
          await this.adapters.stt.transcribe(audio, mimeType ?? "audio/wav")
        ).trim();
      } catch {
        this.broadcast({ type: "error", message: "transcription failed" });
        this.setState("idle");
        return;
      }
    }
    if (!utterance) {
      this.broadcast({ type: "error", message: "empty utterance" });
      return;
    }
    this.currentTopic = utterance;
    this.pushUserEntry(utterance);
    await this.runTurn({ topic: utterance });
  }

  private async onMention(agentId: string, text: string): Promise<void> {
    if (this.ended) return;
    if (!this.catalog.get(agentId)) {
      this.broadcast({ type: "error", message: `unknown agent ${agentId}` });
      return;
    }
    const t = text?.trim();
    if (t) {
      this.currentTopic = t;
      this.pushUserEntry(t);
    }
    await this.runTurn({ topic: this.currentTopic, forced: agentId });
  }

  private async onAdmitHand(agentId: string): Promise<void> {
    if (this.ended) return;
    this.handRaises = this.handRaises.filter((h) => h.agentId !== agentId);
    await this.runTurn({ topic: this.currentTopic, forced: agentId });
  }

  private pushUserEntry(text: string): void {
    const entry: TranscriptEntry = {
      id: genEntryId(),
      speaker: "user",
      text,
      ts: Date.now(),
    };
    this.transcript.push(entry);
    this.broadcast({ type: "transcript", entry });
  }

  // ── turn engine ───────────────────────────────────────────────────────────

  private async runTurn(opts: {
    topic: string;
    forced?: string;
  }): Promise<void> {
    if (this.ended) return;
    if (this.busy) {
      this.broadcast({ type: "error", message: "a turn is already in progress" });
      return;
    }
    this.busy = true;
    try {
      if (this.pendingIntensity !== null) {
        this.intensity = this.pendingIntensity;
        this.pendingIntensity = null;
      }

      let selected: PersonaRecord[];
      if (opts.forced) {
        const p = this.catalog.get(opts.forced);
        if (!p) return;
        selected = [p];
        this.setState("agent_turn");
      } else {
        this.setState("selecting");
        const result = await selectAgents({
          topic: opts.topic,
          panel: this.room.panel,
          recentSpeakers: this.recentSpeakers,
          catalog: this.catalog,
          llm: this.adapters.llm,
        });
        selected = result.selected;
        this.handRaises = result.handRaisers;
        for (const h of result.handRaisers) {
          this.broadcast({ type: "hand_raise", handRaise: h });
        }
        this.setState("agent_turn");
      }

      if (selected.length === 0) {
        this.broadcast({ type: "error", message: "no agents available to respond" });
        return;
      }

      const turnSpeakers: string[] = [];
      let lastEntry: TranscriptEntry | null = null;

      for (const persona of selected) {
        const entry = await this.runAgentResponse(opts.topic, persona, null);
        if (entry) {
          lastEntry = entry;
          turnSpeakers.push(persona.id);
        }

        const prob = INTENSITY[this.intensity].reactionProbability;
        if (lastEntry && Math.random() < prob) {
          const reactor = selectReactor(
            persona,
            this.room.panel,
            [...this.recentSpeakers, ...turnSpeakers],
            this.catalog,
          );
          if (reactor) {
            const rEntry = await this.runAgentResponse(
              opts.topic,
              reactor,
              lastEntry,
            );
            if (rEntry) {
              lastEntry = rEntry;
              turnSpeakers.push(reactor.id);
            }
          }
        }

        this.maybeEmitCards();
      }

      this.recentSpeakers = turnSpeakers;
      this.setState(this.handRaises.length > 0 ? "hand_raise_wait" : "idle");
    } finally {
      this.busy = false;
    }
  }

  private async runAgentResponse(
    topic: string,
    persona: PersonaRecord,
    refersTo: TranscriptEntry | null,
  ): Promise<TranscriptEntry | null> {
    this.broadcast({ type: "speaker_state", agentId: persona.id, state: "thinking" });

    const ctx = await assembleContext({
      persona,
      topic,
      transcript: this.transcript,
      intensity: this.intensity,
      grounding: this.adapters.grounding,
      refersTo: refersTo ?? undefined,
      nameOf: this.nameOf,
    });

    const entryId = genEntryId();
    this.broadcast({ type: "speaker_state", agentId: persona.id, state: "speaking" });

    let text = "";
    try {
      for await (const delta of this.adapters.llm.generateStream({
        systemPrompt: ctx.systemPrompt,
        userPrompt: ctx.userPrompt,
        maxOutputTokens: 220,
        temperature: 0.8,
      })) {
        text += delta;
        this.broadcast({
          type: "transcript",
          entry: {
            id: entryId,
            speaker: persona.id,
            text: text.trim(),
            ts: Date.now(),
            refersTo: refersTo?.id,
            partial: true,
          },
        });
      }
    } catch {
      this.broadcast({
        type: "error",
        message: `generation failed for ${persona.name}`,
      });
    }

    text = text.trim();
    if (!text) {
      this.broadcast({ type: "speaker_state", agentId: persona.id, state: "done" });
      return null;
    }

    // Optional anti-hallucination guardrail (PRD §7.4): best-effort, advisory.
    if (this.adapters.grounding.guardrail && ctx.used.length > 0) {
      try {
        await this.adapters.grounding.guardrail(text, ctx.used);
      } catch {
        /* guardrail is advisory in the MVP */
      }
    }

    const entry: TranscriptEntry = {
      id: entryId,
      speaker: persona.id,
      text,
      ts: Date.now(),
      refersTo: refersTo?.id,
      partial: false,
    };
    this.transcript.push(entry);
    this.broadcast({ type: "transcript", entry });

    try {
      const audio = await this.adapters.tts.synthesize(text, persona.voiceProfile);
      this.broadcast({
        type: "audio",
        agentId: persona.id,
        url: audio.url,
        entryId,
        seq: this.audioSeq++,
      });
    } catch {
      /* missing audio is handled gracefully by the client */
    }

    this.broadcast({ type: "speaker_state", agentId: persona.id, state: "done" });
    this.responseCount += 1;
    return entry;
  }

  /** Fire-and-forget card extraction every 3-4 agent responses. */
  private maybeEmitCards(): void {
    if (this.responseCount < this.nextCardThreshold) return;
    this.nextCardThreshold = this.responseCount + 3 + Math.floor(Math.random() * 2);
    const recent = this.transcript.slice(-8);
    void extractCards(recent, this.catalog, this.adapters.llm)
      .then((cards) => {
        for (const card of cards) {
          this.cards.push(card);
          this.broadcast({ type: "card", card });
        }
      })
      .catch(() => {
        /* cards never block or fail the turn */
      });
  }

  // ── end ───────────────────────────────────────────────────────────────────

  private async endSession(): Promise<void> {
    if (this.ended) return;
    this.ended = true;
    this.setState("end_session");
    const summary = await buildSummary({
      roomId: this.roomId,
      topic: this.room.topic,
      transcript: this.transcript,
      cards: this.cards,
      catalog: this.catalog,
      llm: this.adapters.llm,
    });
    this.setState("summary");
    this.broadcast({ type: "summary", summary });
    this.onEnd(this.roomId);
  }
}
