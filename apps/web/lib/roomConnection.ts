import type {
  ClientMessage,
  DebateIntensity,
  RosterEntry,
  ServerMessage,
  TranscriptEntry,
  VisualCard,
  VisualCardType,
} from "@echochamber/shared";
import { API_ROUTES, INTENSITY } from "@echochamber/shared";
import { WS_URL } from "./config";
import { GENERIC_LINES, PERSONA_LINES, REACTOR_OPENERS } from "./personaLines";

export interface RoomConnection {
  send(msg: ClientMessage): void;
  onMessage(cb: (m: ServerMessage) => void): () => void;
  close(): void;
}

// ── Real WebSocket connection (used when the orchestrator is available) ──────
class RealRoomConnection implements RoomConnection {
  private ws: WebSocket;
  private listeners = new Set<(m: ServerMessage) => void>();
  private queue: ClientMessage[] = [];

  constructor(roomId: string) {
    this.ws = new WebSocket(`${WS_URL}${API_ROUTES.ws(roomId)}`);
    this.ws.onopen = () => {
      this.queue.forEach((m) => this.ws.send(JSON.stringify(m)));
      this.queue = [];
    };
    this.ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data as string) as ServerMessage;
        this.listeners.forEach((l) => l(m));
      } catch {
        /* ignore malformed frames */
      }
    };
  }

  send(msg: ClientMessage) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else this.queue.push(msg);
  }

  onMessage(cb: (m: ServerMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  close() {
    this.listeners.clear();
    try {
      this.ws.close();
    } catch {
      /* noop */
    }
  }
}

// ── In-browser mock orchestrator ─────────────────────────────────────────────
const CARD_TYPES: VisualCardType[] = ["takeaway", "framework", "action_item"];

class MockRoomConnection implements RoomConnection {
  private listeners = new Set<(m: ServerMessage) => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private seq = 0;
  private turn = 0;
  private intensity: DebateIntensity;
  private lastSpeaker: string | null = null;
  private entrySpeaker = new Map<string, string>();
  private closed = false;

  constructor(
    private panel: string[],
    private roster: RosterEntry[],
    intensity: DebateIntensity,
  ) {
    this.intensity = intensity;
    // Kick the room off so it never feels dead.
    this.later(() => this.runTurn("Let's get into it — what should we be debating?"), 600);
  }

  private name(id: string): string {
    return this.roster.find((r) => r.id === id)?.name ?? id;
  }

  private later(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.closed) fn();
    }, ms);
    this.timers.add(t);
  }

  private emit(m: ServerMessage) {
    if (this.closed) return;
    this.listeners.forEach((l) => l(m));
  }

  private lineFor(id: string, refName?: string): string {
    const pool = PERSONA_LINES[id] ?? GENERIC_LINES;
    const base = pool[Math.floor(Math.random() * pool.length)] ?? GENERIC_LINES[0]!;
    if (refName) {
      const opener = REACTOR_OPENERS[Math.floor(Math.random() * REACTOR_OPENERS.length)]!;
      return `${opener.replace("{name}", refName)} ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
    }
    return base;
  }

  /** Stream one agent's response: thinking → streamed transcript → audio → done. */
  private speak(
    agentId: string,
    refersTo: string | undefined,
    startDelay: number,
  ): { entryId: string; doneAt: number } {
    const entryId = `t_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    this.entrySpeaker.set(entryId, agentId);
    const refName = refersTo ? this.name(this.entrySpeaker.get(refersTo) ?? "") : undefined;
    const text = this.lineFor(agentId, refName);
    const words = text.split(" ");

    this.later(() => this.emit({ type: "speaker_state", agentId, state: "thinking" }), startDelay);

    let acc = "";
    const streamStart = startDelay + 650;
    words.forEach((w, i) => {
      this.later(() => {
        if (i === 0) this.emit({ type: "speaker_state", agentId, state: "speaking" });
        acc = acc ? `${acc} ${w}` : w;
        const entry: TranscriptEntry = {
          id: entryId,
          speaker: agentId,
          text: acc,
          ts: Date.now(),
          refersTo,
          partial: i < words.length - 1,
        };
        this.emit({ type: "transcript", entry });
      }, streamStart + i * 70);
    });

    const speakMs = words.length * 70;
    const audioDur = Math.max(1400, speakMs + 400);
    this.later(() => {
      this.seq += 1;
      // tone:<freqHz>:<durationMs> — the audio queue synthesizes this so the
      // room is audibly "speaking" without bundling audio assets.
      const freq = 180 + (hashId(agentId) % 320);
      this.emit({
        type: "audio",
        agentId,
        url: `tone:${freq}:${audioDur}`,
        entryId,
        seq: this.seq,
      });
    }, streamStart + 120);

    const doneAt = streamStart + speakMs + 200;
    this.later(() => this.emit({ type: "speaker_state", agentId, state: "done" }), doneAt);
    this.lastSpeaker = agentId;
    return { entryId, doneAt };
  }

  private maybeCard(agentId: string, delay: number) {
    this.turn += 1;
    if (this.turn % 2 !== 0) return;
    const type = CARD_TYPES[this.turn % CARD_TYPES.length]!;
    const text = cardText(type, this.name(agentId));
    this.later(() => {
      const card: VisualCard = {
        id: `c_${Date.now()}`,
        type,
        text,
        attribution: agentId,
        ts: Date.now(),
      };
      this.emit({ type: "card", card });
    }, delay);
  }

  private maybeHandRaise(speakers: string[], delay: number) {
    const idle = this.panel.filter((p) => !speakers.includes(p));
    if (idle.length === 0) return;
    if (Math.random() > INTENSITY[this.intensity].reactionProbability) return;
    const agentId = idle[Math.floor(Math.random() * idle.length)]!;
    this.later(
      () =>
        this.emit({
          type: "hand_raise",
          handRaise: { agentId, reason: "wants to add a counterpoint", ts: Date.now() },
        }),
      delay,
    );
  }

  private runTurn(_prompt: string, forced?: string) {
    if (this.panel.length === 0) return;
    const speakers: string[] = [];
    const lead = forced ?? this.pick(this.lastSpeaker);
    speakers.push(lead);

    const leadTurn = this.speak(lead, undefined, 200);
    let cursor = leadTurn.doneAt;
    this.maybeCard(lead, cursor + 100);

    // Reactor based on debate intensity.
    if (Math.random() < INTENSITY[this.intensity].reactionProbability) {
      const reactor = this.pick(lead, speakers);
      if (reactor) {
        speakers.push(reactor);
        cursor = this.speak(reactor, leadTurn.entryId, cursor + 400).doneAt;
        this.maybeCard(reactor, cursor + 100);
      }
    }

    this.maybeHandRaise(speakers, cursor + 600);
  }

  private pick(exclude: string | null, also: string[] = []): string {
    const pool = this.panel.filter((p) => p !== exclude && !also.includes(p));
    const from = pool.length ? pool : this.panel;
    return from[Math.floor(Math.random() * from.length)]!;
  }

  send(msg: ClientMessage) {
    switch (msg.type) {
      case "set_intensity":
        this.intensity = msg.level;
        break;
      case "user_utterance": {
        const text = msg.text ?? "(voice)";
        this.emit({
          type: "transcript",
          entry: { id: `t_${Date.now()}`, speaker: "user", text, ts: Date.now() },
        });
        this.later(() => this.runTurn(text), 500);
        break;
      }
      case "mention":
        this.emit({
          type: "transcript",
          entry: { id: `t_${Date.now()}`, speaker: "user", text: `@${this.name(msg.agentId)} ${msg.text}`, ts: Date.now() },
        });
        this.later(() => this.runTurn(msg.text, msg.agentId), 400);
        break;
      case "admit_hand":
        this.later(() => this.runTurn("", msg.agentId), 200);
        break;
      case "continue_debate":
        this.later(() => this.runTurn("continue"), 200);
        break;
      case "end_session":
        this.emitSummary();
        break;
    }
  }

  private emitSummary() {
    const positions = this.panel.map((id) => ({
      agentId: id,
      summary: (PERSONA_LINES[id]?.[0] ?? GENERIC_LINES[0]!).replace(/\.$/, ""),
    }));
    this.later(
      () =>
        this.emit({
          type: "summary",
          summary: {
            roomId: "mock",
            problem: "Session debate",
            positions,
            agreements: [
              "Talk to real users before over-investing in any single bet.",
              "Whatever you pick, instrument it so you can tell if it's working.",
            ],
            disagreements: [
              `${this.name(this.panel[0] ?? "")} and ${this.name(this.panel[1] ?? "")} disagree on how aggressive to be.`,
              "Raise capital vs. stay lean was genuinely contested.",
            ],
            nextSteps: [
              "Run one cheap experiment this week to test the riskiest assumption.",
              "Pick a single north-star metric and align the team behind it.",
              "Revisit pricing as a value-metric, not an afterthought.",
            ],
            keyTakeaways: positions.slice(0, 3).map((p) => p.summary),
            transcript: [],
          },
        }),
      400,
    );
  }

  onMessage(cb: (m: ServerMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  close() {
    this.closed = true;
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this.listeners.clear();
  }
}

function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cardText(type: VisualCardType, name: string): string {
  switch (type) {
    case "framework":
      return ["Barrels vs. Ammo", "Build–Measure–Learn", "LNO Framework", "Growth Loops", "Cold-Start Theory"][
        Math.floor(Math.random() * 5)
      ]!;
    case "action_item":
      return `Action: ${name} suggests running one cheap experiment this week.`;
    default:
      return `Takeaway: ${name} — retention is the truest signal of fit.`;
  }
}

export function createRoomConnection(
  roomId: string,
  opts: { panel: string[]; roster: RosterEntry[]; intensity: DebateIntensity; useMock: boolean },
): RoomConnection {
  if (opts.useMock) return new MockRoomConnection(opts.panel, opts.roster, opts.intensity);
  return new RealRoomConnection(roomId);
}
