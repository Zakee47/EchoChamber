// ─────────────────────────────────────────────────────────────────────────
// Core domain types for EchoChamber — the AI Expert Roundtable.
// These are the single source of truth shared across the web app, the
// orchestrator server, and every integration package. Do not fork these.
// ─────────────────────────────────────────────────────────────────────────

export type ExpertCategory =
  | "product"
  | "design"
  | "growth"
  | "vc"
  | "engineering"
  | "founder";

/** 1 = deep-grounded demo expert, 2 = condensed, 3 = runtime DeepWiki-generated. */
export type GroundingTier = 1 | 2 | 3;

export type DebateIntensity = 1 | 2 | 3; // 1 Collaborative · 2 Balanced · 3 Heated

export interface VoiceProfile {
  /** SLNG voice id. */
  voiceId: string;
  /** -1..1 relative pitch shift. */
  pitch?: number;
  /** speech rate multiplier, ~0.8..1.2. */
  pace?: number;
  tone?: string;
}

export interface NaturalTension {
  /** id of the expert this persona tends to disagree with. */
  with: string;
  /** topic/area of the disagreement, e.g. "pricing", "plg". */
  topic: string;
}

/** A retrievable unit of grounding (one real opinion / framework / story). */
export interface GroundingChunk {
  id: string;
  /** short topic key, e.g. "freemium-vs-trial". */
  topic: string;
  text: string;
  /** cached embedding vector (filled by the grounding layer). */
  embedding?: number[];
  /** optional public source attribution, e.g. "Lenny's Podcast, 2024". */
  source?: string;
}

/** Full persona record. The catalog (lobby/picker) uses only the light fields. */
export interface PersonaRecord {
  id: string;
  name: string;
  category: ExpertCategory;
  title: string;
  tier: GroundingTier;
  avatar: { image?: string; color: string; initials: string };
  voiceProfile: VoiceProfile;
  expertiseTags: string[];
  naturalTensions: NaturalTension[];
  /** Persona system prompt: sections 1-4, 6, 7 (identity..roundtable behavior). */
  systemPrompt: string;
  /** Section 5 — retrievable real positions. Empty for skeleton (Tier 2/3) experts. */
  groundingChunks: GroundingChunk[];
  /** true once a DeepWiki job has produced/enriched this persona at runtime. */
  generated?: boolean;
}

/** Lightweight roster entry for grids and pickers. */
export interface RosterEntry {
  id: string;
  name: string;
  category: ExpertCategory;
  title: string;
  tier: GroundingTier;
  avatar: { image?: string; color: string; initials: string };
  expertiseTags: string[];
}

export type RoomStatus = "lobby" | "creating" | "in_room" | "ended";

export interface Room {
  roomId: string;
  topic: string;
  panel: string[]; // persona ids
  debateIntensity: DebateIntensity;
  status: RoomStatus;
  createdAt: number;
}

export type SpeakerId = string | "user";

export interface TranscriptEntry {
  id: string;
  speaker: SpeakerId;
  text: string;
  ts: number;
  /** id of the transcript entry this one is reacting to. */
  refersTo?: string;
  /** true while text is still streaming in. */
  partial?: boolean;
}

export type VisualCardType = "takeaway" | "framework" | "action_item";

export interface VisualCard {
  id: string;
  type: VisualCardType;
  text: string;
  attribution: string; // persona id
  ts: number;
}

export interface HandRaise {
  agentId: string;
  reason: string;
  ts: number;
}

export interface ExpertPosition {
  agentId: string;
  summary: string;
}

export interface SessionSummary {
  roomId: string;
  problem: string;
  positions: ExpertPosition[];
  agreements: string[];
  disagreements: string[];
  nextSteps: string[];
  keyTakeaways: string[];
  transcript: TranscriptEntry[];
}

/** Stages emitted while a DeepWiki persona is being built at runtime. */
export type DeepWikiStage =
  | "searching"
  | "found_sources"
  | "parsing"
  | "building_persona"
  | "embedding"
  | "ready"
  | "error";

export interface DeepWikiProgress {
  jobId: string;
  stage: DeepWikiStage;
  found?: number;
  message?: string;
  /** present when stage === "ready". */
  persona?: PersonaRecord;
}
