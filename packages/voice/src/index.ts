// @echochamber/voice — Gemini (LLM + STT) and SLNG (TTS) adapters.
//
// The orchestrator imports these factories and uses ECHO_ADAPTER_MODE to pick
// real vs mock. The mocks below let the whole stack run with NO API keys.

import type {
  LLMAdapter,
  LLMGenerateParams,
  STTAdapter,
  TTSAdapter,
  TTSResult,
  VoiceProfile,
} from "@echochamber/shared";

import { createGeminiLLM } from "./gemini-llm.js";
import { createGeminiSTT } from "./gemini-stt.js";
import { createSlngTTS } from "./slng-tts.js";

export interface VoiceConfig {
  geminiApiKey?: string;
  slngApiKey?: string;
  slngBaseUrl?: string;
  slngModel?: string;
  mode?: "real" | "mock";
}

// ── Mocks (deterministic, key-free) ─────────────────────────────────────────

const MOCK_LINES = [
  "Here's how I'd frame it: focus on the one thing only you can do.",
  "I'd push back on that — the data usually tells a different story.",
  "Do things that don't scale first; the scalable version comes later.",
  "That's a pricing question masquerading as a product question.",
];

export const mockLLM: LLMAdapter = {
  async generate({ userPrompt }: LLMGenerateParams) {
    const i = Math.abs(hash(userPrompt)) % MOCK_LINES.length;
    return MOCK_LINES[i]!;
  },
  async *generateStream(params: LLMGenerateParams) {
    const text = await this.generate(params);
    for (const word of text.split(" ")) yield word + " ";
  },
  async classifyTopic(topic: string) {
    return { category: "growth", tags: topic.toLowerCase().split(/\s+/).slice(0, 4) };
  },
};

export const mockSTT: STTAdapter = {
  async transcribe() {
    return "Should I focus on product or sales right now?";
  },
};

export const mockTTS: TTSAdapter = {
  async synthesize(text: string, _voice: VoiceProfile): Promise<TTSResult> {
    // 1 byte of silence as a data URI; frontend treats missing audio gracefully.
    return { url: "data:audio/wav;base64,UklGRiQAAABXQVZF", mimeType: "audio/wav", durationMs: Math.min(8000, text.length * 60) };
  },
};

// ── Real factories ──────────────────────────────────────────────────────────

export function createLLMAdapter(cfg: VoiceConfig): LLMAdapter {
  if (cfg.mode === "mock" || !cfg.geminiApiKey) return mockLLM;
  return createGeminiLLM(cfg.geminiApiKey);
}

export function createSTTAdapter(cfg: VoiceConfig): STTAdapter {
  if (cfg.mode === "mock" || !cfg.geminiApiKey) return mockSTT;
  return createGeminiSTT(cfg.geminiApiKey);
}

export function createTTSAdapter(cfg: VoiceConfig): TTSAdapter {
  if (cfg.mode === "mock" || !cfg.slngApiKey) return mockTTS;
  return createSlngTTS(cfg.slngApiKey, cfg.slngBaseUrl, cfg.slngModel);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}
