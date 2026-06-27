// @echochamber/grounding — Superlinked SIE retrieval + persona assembly.
//
// Responsibilities:
//  - embed grounding chunks, retrieve top-k per turn (instruction-following rerank)
//  - assemble per-expert system prompts (sections 1-4,6,7) from source content
//  - optional anti-hallucination guardrail pass
//  - load the persona catalog from data/personas

import type {
  GroundingChunk,
  GroundingProvider,
} from "@echochamber/shared";
import { createSuperlinkedProvider } from "./superlinked.js";

export type { GroundingProvider } from "@echochamber/shared";

export interface GroundingConfig {
  superlinkedApiKey?: string;
  superlinkedBaseUrl?: string;
  mode?: "real" | "mock";
}

// ── Mock provider (keyword overlap; key-free) ───────────────────────────────

export const mockGroundingProvider: GroundingProvider = {
  async embedChunks(chunks: GroundingChunk[]) {
    return chunks.map((c) => ({ ...c, embedding: c.embedding ?? [c.text.length] }));
  },
  async retrieve(query: string, chunks: GroundingChunk[], topK = 4) {
    const q = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
    const scored = chunks
      .map((c) => {
        const words = (c.topic + " " + c.text).toLowerCase().split(/\W+/);
        const score = words.reduce((n, w) => (q.has(w) ? n + 1 : n), 0);
        return { c, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.c);
  },
  async guardrail() {
    return true;
  },
};

// ── Factory ─────────────────────────────────────────────────────────────────

export function createGroundingProvider(cfg: GroundingConfig): GroundingProvider {
  if (cfg.mode === "mock" || !cfg.superlinkedApiKey) return mockGroundingProvider;
  return createSuperlinkedProvider({
    apiKey: cfg.superlinkedApiKey,
    baseUrl: cfg.superlinkedBaseUrl ?? "https://api.superlinked.com",
  });
}

// ── Re-exports from persona module ──────────────────────────────────────────

export {
  loadPersonas,
  loadGroundedPersonas,
  getPersona,
  buildGroundingChunks,
} from "./personas.js";
