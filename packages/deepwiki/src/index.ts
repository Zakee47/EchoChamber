// @echochamber/deepwiki — runtime expert indexing (Tavily + Superlinked SIE).
//
// Flow: Tavily search (3-5 queries) -> Tavily extract -> SIE doc->markdown ->
// SIE structured output (PersonaRecord schema) -> embed chunks -> ready.
// Emits DeepWikiProgress events throughout; target < 60s.

import type {
  DeepWikiProgress,
  DeepWikiProvider,
  PersonaRecord,
} from "@echochamber/shared";

import { createRealProvider } from "./provider.js";

export interface DeepWikiConfig {
  tavilyApiKey?: string;
  superlinkedApiKey?: string;
  superlinkedBaseUrl?: string;
  geminiApiKey?: string;
  mode?: "real" | "mock";
}

function slug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Mock provider (key-free; simulates staged progress) ─────────────────────

export const mockDeepWikiProvider: DeepWikiProvider = {
  async buildPersona(
    name: string,
    jobId: string,
    onProgress: (p: DeepWikiProgress) => void,
  ): Promise<PersonaRecord> {
    const steps: DeepWikiProgress[] = [
      { jobId, stage: "searching" },
      { jobId, stage: "found_sources", found: 12 },
      { jobId, stage: "parsing" },
      { jobId, stage: "building_persona" },
      { jobId, stage: "embedding" },
    ];
    for (const s of steps) {
      onProgress(s);
      await new Promise((r) => setTimeout(r, 250));
    }
    const id = slug(name);
    const persona: PersonaRecord = {
      id,
      name,
      category: "founder",
      title: `Indexed via DeepWiki`,
      tier: 3,
      avatar: { color: "#64748B", initials: initials(name) },
      voiceProfile: { voiceId: `slng_${id}` },
      expertiseTags: [],
      naturalTensions: [],
      systemPrompt: `You are ${name}. (DeepWiki-generated persona — mock.)`,
      groundingChunks: [],
      generated: true,
    };
    onProgress({ jobId, stage: "ready", persona });
    return persona;
  },
};

// ── Factory ─────────────────────────────────────────────────────────────────

export function createDeepWikiProvider(cfg: DeepWikiConfig): DeepWikiProvider {
  if (cfg.mode === "mock" || !cfg.tavilyApiKey) return mockDeepWikiProvider;
  return createRealProvider(cfg);
}
