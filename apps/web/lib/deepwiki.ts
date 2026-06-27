"use client";

import type { DeepWikiProgress, ExpertCategory, RosterEntry } from "@echochamber/shared";
import { postDeepWikiIndex } from "./api";
import { CATEGORY_COLORS } from "./config";

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const CATEGORY_GUESS: Array<[RegExp, ExpertCategory]> = [
  [/design|figma|brand/i, "design"],
  [/growth|market|plg/i, "growth"],
  [/invest|vc|capital|partner/i, "vc"],
  [/engineer|cto|developer|code/i, "engineering"],
  [/product|pm/i, "product"],
];

export interface DeepWikiRunHandlers {
  onProgress: (p: DeepWikiProgress) => void;
  onReady: (entry: RosterEntry) => void;
}

/**
 * Mock-drives the DeepWiki indexing UX. Stages mirror the PRD §8.2 flow and the
 * `DeepWikiStage` contract. A real jobId is requested from the server when
 * available so the wiring matches production.
 */
export async function runDeepWiki(name: string, handlers: DeepWikiRunHandlers): Promise<void> {
  const { jobId } = await postDeepWikiIndex(name).catch(() => ({ jobId: `dw_${Date.now()}` }));
  const category = CATEGORY_GUESS.find(([re]) => re.test(name))?.[1] ?? "founder";

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const found = 8 + Math.floor(Math.random() * 9);

  handlers.onProgress({ jobId, stage: "searching", message: `Searching the web for "${name}"…` });
  await wait(1100);
  handlers.onProgress({ jobId, stage: "found_sources", found, message: `Found ${found} sources` });
  await wait(900);
  handlers.onProgress({ jobId, stage: "parsing", found, message: "Parsing content with Superlinked SIE…" });
  await wait(1200);
  handlers.onProgress({ jobId, stage: "building_persona", message: "Building persona & known positions…" });
  await wait(1300);
  handlers.onProgress({ jobId, stage: "embedding", message: "Embedding grounding chunks…" });
  await wait(900);

  const entry: RosterEntry = {
    id: slug(name) || `expert-${Date.now()}`,
    name: name.trim(),
    category,
    title: "Indexed via DeepWiki",
    tier: 3,
    avatar: { color: CATEGORY_COLORS[category] ?? "#7c5cff", initials: initials(name) || "?" },
    expertiseTags: ["deepwiki", category],
  };

  handlers.onProgress({ jobId, stage: "ready", message: "Avatar ready", persona: undefined });
  handlers.onReady(entry);
}
