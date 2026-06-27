// ─────────────────────────────────────────────────────────────────────────
// Adapter interfaces — the contract between the orchestrator (apps/server)
// and the integration packages (voice, grounding, deepwiki).
//
// Each package exports a factory returning an implementation of its interface,
// plus a mock implementation so the orchestrator and web app run with no keys.
// The orchestrator depends ONLY on these interfaces, never on a vendor SDK.
// ─────────────────────────────────────────────────────────────────────────

import type {
  DeepWikiProgress,
  GroundingChunk,
  PersonaRecord,
  VoiceProfile,
} from "./types.js";

// ── LLM (Gemini) ───────────────────────────────────────────────────────────

export interface LLMGenerateParams {
  systemPrompt: string;
  /** assembled user/context turn (transcript + grounding + debate directive). */
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LLMAdapter {
  /** Single-shot generation (returns full text). */
  generate(params: LLMGenerateParams): Promise<string>;
  /** Streaming generation; yields text deltas. */
  generateStream(params: LLMGenerateParams): AsyncIterable<string>;
  /** Classify a topic into a category + tags to seed agent selection. */
  classifyTopic(topic: string): Promise<{ category: string; tags: string[] }>;
}

// ── STT (speech → text) ──────────────────────────────────────────────────

export interface STTAdapter {
  /** Transcribe an utterance (e.g. PTT release) to text. */
  transcribe(audio: Uint8Array, mimeType: string): Promise<string>;
}

// ── TTS (SLNG) ─────────────────────────────────────────────────────────────

export interface TTSResult {
  /** url or data-uri the frontend can play. */
  url: string;
  mimeType: string;
  durationMs?: number;
}

export interface TTSAdapter {
  /** Synthesize text with a given expert voice profile. */
  synthesize(text: string, voice: VoiceProfile): Promise<TTSResult>;
}

// ── Grounding / RAG (Superlinked SIE) ──────────────────────────────────────

export interface GroundingProvider {
  /** Embed grounding chunks (cache embeddings on the records). */
  embedChunks(chunks: GroundingChunk[]): Promise<GroundingChunk[]>;
  /** Retrieve the top-k most relevant chunks for a query. */
  retrieve(
    query: string,
    chunks: GroundingChunk[],
    topK?: number,
  ): Promise<GroundingChunk[]>;
  /**
   * Optional anti-hallucination check on generated text given allowed
   * grounding. Returns true if the text is grounded/safe to speak.
   */
  guardrail?(text: string, allowed: GroundingChunk[]): Promise<boolean>;
}

// ── DeepWiki (Tavily + SIE) ────────────────────────────────────────────────

export interface DeepWikiProvider {
  /**
   * Build a persona for an arbitrary expert name at runtime, emitting
   * progress events via onProgress, resolving to the finished persona.
   */
  buildPersona(
    name: string,
    jobId: string,
    onProgress: (p: DeepWikiProgress) => void,
  ): Promise<PersonaRecord>;
}

/** Bundle of all adapters the orchestrator needs, so wiring is one object. */
export interface AdapterBundle {
  llm: LLMAdapter;
  stt: STTAdapter;
  tts: TTSAdapter;
  grounding: GroundingProvider;
  deepwiki: DeepWikiProvider;
}
