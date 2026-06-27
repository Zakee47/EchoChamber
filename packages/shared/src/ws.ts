import type {
  DebateIntensity,
  DeepWikiProgress,
  HandRaise,
  SessionSummary,
  TranscriptEntry,
  VisualCard,
} from "./types.js";

// ── Client → Server ────────────────────────────────────────────────────────

export interface UserUtteranceMsg {
  type: "user_utterance";
  /** transcribed text; when sending raw audio use audioBase64 instead. */
  text?: string;
  /** base64-encoded audio chunk for server-side STT (PTT release). */
  audioBase64?: string;
  mimeType?: string;
}

export interface SetIntensityMsg {
  type: "set_intensity";
  level: DebateIntensity;
}

export interface MentionMsg {
  type: "mention";
  agentId: string;
  text: string;
}

export interface AdmitHandMsg {
  type: "admit_hand";
  agentId: string;
}

export interface ContinueDebateMsg {
  type: "continue_debate";
}

export interface EndSessionMsg {
  type: "end_session";
}

export type ClientMessage =
  | UserUtteranceMsg
  | SetIntensityMsg
  | MentionMsg
  | AdmitHandMsg
  | ContinueDebateMsg
  | EndSessionMsg;

// ── Server → Client ──────────────────────────────────────────────────────

export type SpeakerState = "thinking" | "speaking" | "done";

export interface SpeakerStateMsg {
  type: "speaker_state";
  agentId: string;
  state: SpeakerState;
}

export interface TranscriptMsg {
  type: "transcript";
  entry: TranscriptEntry;
}

export interface AudioMsg {
  type: "audio";
  agentId: string;
  /** url or data-uri to the synthesized audio for this transcript entry. */
  url: string;
  /** matches TranscriptEntry.id so the client can align audio with text. */
  entryId: string;
  /** ordering within the turn. */
  seq: number;
}

export interface HandRaiseMsg {
  type: "hand_raise";
  handRaise: HandRaise;
}

export interface CardMsg {
  type: "card";
  card: VisualCard;
}

export interface DeepWikiProgressMsg {
  type: "deepwiki_progress";
  progress: DeepWikiProgress;
}

export interface SummaryMsg {
  type: "summary";
  summary: SessionSummary;
}

export interface ErrorMsg {
  type: "error";
  message: string;
  fatal?: boolean;
}

export type ServerMessage =
  | SpeakerStateMsg
  | TranscriptMsg
  | AudioMsg
  | HandRaiseMsg
  | CardMsg
  | DeepWikiProgressMsg
  | SummaryMsg
  | ErrorMsg;
