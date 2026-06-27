// Real DeepWiki buildPersona pipeline — Tavily + SIE + Gemini fallback.

import type {
  DeepWikiProgress,
  DeepWikiProvider,
  PersonaRecord,
} from "@echochamber/shared";

import type { DeepWikiConfig } from "./index.js";
import { tavilySearch, tavilyExtract } from "./tavily.js";
import {
  type SieConfig,
  sieDocToMarkdown,
  sieStructuredOutput,
  geminiStructuredOutput,
  sieEmbed,
  fallbackEmbed,
  basicCleanup,
  type ExtractedPersona,
} from "./sie.js";
import {
  assembleSystemPrompt,
  buildGroundingChunks,
  assemblePersonaRecord,
} from "./prompt.js";

/** Merge all extracted documents into a single content block. */
function mergeContent(docs: string[], maxChars = 40_000): string {
  let merged = "";
  for (const doc of docs) {
    const remaining = maxChars - merged.length;
    if (remaining <= 0) break;
    if (doc.length > remaining) {
      merged += doc.slice(0, remaining);
      break;
    }
    merged += doc + "\n\n---\n\n";
  }
  return merged;
}

export function createRealProvider(cfg: DeepWikiConfig): DeepWikiProvider {
  const tavilyKey = cfg.tavilyApiKey!;
  const hasSie = !!(cfg.superlinkedApiKey && cfg.superlinkedBaseUrl);
  const hasGemini = !!cfg.geminiApiKey;

  const sieCfg: SieConfig | null = hasSie
    ? { apiKey: cfg.superlinkedApiKey!, baseUrl: cfg.superlinkedBaseUrl! }
    : null;

  return {
    async buildPersona(
      name: string,
      jobId: string,
      onProgress: (p: DeepWikiProgress) => void,
    ): Promise<PersonaRecord> {
      try {
        // ── Stage 1: Tavily Search ──────────────────────────────────────
        onProgress({ jobId, stage: "searching" });
        const searchResults = await tavilySearch(tavilyKey, name);

        if (searchResults.length === 0) {
          throw new Error(`No search results found for "${name}"`);
        }

        // ── Stage 2: Found sources ──────────────────────────────────────
        const urls = searchResults.map((r) => r.url);
        onProgress({ jobId, stage: "found_sources", found: urls.length });

        // ── Stage 3: Tavily Extract + cleanup ───────────────────────────
        const extractUrls = urls.slice(0, 15);
        const extracted = await tavilyExtract(tavilyKey, extractUrls);
        onProgress({ jobId, stage: "parsing" });

        // Clean raw content to markdown
        let cleaned: string[];
        const rawTexts = extracted
          .map((e) => e.raw_content)
          .filter((t) => t && t.length > 100);

        if (rawTexts.length === 0) {
          // Fall back to search result snippets
          cleaned = searchResults.map((r) => `## ${r.title}\n\n${r.content}`);
        } else if (sieCfg) {
          cleaned = await sieDocToMarkdown(sieCfg, rawTexts);
        } else {
          cleaned = rawTexts.map(basicCleanup);
        }

        const mergedContent = mergeContent(cleaned);

        // ── Stage 4: Structured persona extraction ──────────────────────
        let persona: ExtractedPersona;
        if (sieCfg) {
          try {
            persona = await sieStructuredOutput(sieCfg, name, mergedContent);
          } catch {
            // SIE failed; try Gemini fallback
            if (hasGemini) {
              persona = await geminiStructuredOutput(
                cfg.geminiApiKey!,
                name,
                mergedContent,
              );
            } else {
              throw new Error(
                "Structured output failed: SIE unavailable, no Gemini fallback",
              );
            }
          }
        } else if (hasGemini) {
          persona = await geminiStructuredOutput(
            cfg.geminiApiKey!,
            name,
            mergedContent,
          );
        } else {
          throw new Error(
            "No LLM configured for structured output (need SIE or Gemini key)",
          );
        }

        onProgress({ jobId, stage: "building_persona" });

        // Assemble system prompt
        const systemPrompt = assembleSystemPrompt(name, persona);

        // ── Stage 5: Embed grounding chunks ─────────────────────────────
        onProgress({ jobId, stage: "embedding" });

        const chunkTexts = persona.knownPositions.map((p) => p.position);
        let embeddings: number[][] | undefined;

        if (sieCfg && chunkTexts.length > 0) {
          try {
            embeddings = await sieEmbed(sieCfg, chunkTexts);
          } catch {
            embeddings = fallbackEmbed(chunkTexts);
          }
        } else if (chunkTexts.length > 0) {
          embeddings = fallbackEmbed(chunkTexts);
        }

        const personaId = name
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        const groundingChunks = buildGroundingChunks(
          personaId,
          persona,
          embeddings,
        );

        // ── Stage 6: Ready ──────────────────────────────────────────────
        const record = assemblePersonaRecord(
          name,
          persona,
          systemPrompt,
          groundingChunks,
        );

        onProgress({ jobId, stage: "ready", persona: record });
        return record;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        onProgress({ jobId, stage: "error", message });
        throw err;
      }
    },
  };
}
