// Visual card extraction (PRD §13). Runs async so it never blocks a voice turn:
// a lightweight LLM call pulls named frameworks / action items / key takeaways
// (with speaker attribution) from the recent transcript. Falls back to a
// deterministic heuristic when the LLM doesn't return parseable JSON (mock mode).

import type {
  LLMAdapter,
  TranscriptEntry,
  VisualCard,
  VisualCardType,
} from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";

let cardSeq = 0;
function genId(): string {
  cardSeq += 1;
  return `c_${Date.now().toString(36)}${cardSeq.toString(36)}`;
}

const CARD_TYPES: VisualCardType[] = ["takeaway", "framework", "action_item"];

export async function extractCards(
  recent: TranscriptEntry[],
  catalog: PersonaCatalog,
  llm: LLMAdapter,
): Promise<VisualCard[]> {
  const agentLines = recent.filter((e) => e.speaker !== "user");
  if (agentLines.length === 0) return [];

  const transcriptText = agentLines
    .map((e) => `${e.speaker}: ${e.text}`)
    .join("\n");

  const systemPrompt =
    "You extract concise visual cards from an expert roundtable transcript. " +
    'Return ONLY a JSON array of objects: {"type":"takeaway"|"framework"|"action_item","text":string,"attribution":<persona id>}. ' +
    "Max 3 cards. text under 12 words.";

  try {
    const raw = await llm.generate({
      systemPrompt,
      userPrompt: transcriptText,
      temperature: 0.2,
      maxOutputTokens: 300,
    });
    const parsed = parseCards(raw, catalog);
    if (parsed.length > 0) return parsed;
  } catch {
    // fall through to heuristic
  }

  return heuristicCards(agentLines);
}

function parseCards(raw: string, catalog: PersonaCatalog): VisualCard[] {
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  let arr: unknown;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(arr)) return [];

  const cards: VisualCard[] = [];
  for (const item of arr.slice(0, 3)) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!text) continue;
    const type =
      typeof rec.type === "string" && CARD_TYPES.includes(rec.type as VisualCardType)
        ? (rec.type as VisualCardType)
        : "takeaway";
    const attrId =
      typeof rec.attribution === "string" ? rec.attribution : "";
    const attribution = catalog.get(attrId) ? attrId : "";
    cards.push({ id: genId(), type, text, attribution, ts: Date.now() });
  }
  return cards;
}

const FRAMEWORK_HINTS = [
  "framework",
  "barrels",
  "plg",
  "freemium",
  "mvp",
  "loop",
  "tiny core",
  "founder mode",
  "validated learning",
];

function heuristicCards(agentLines: TranscriptEntry[]): VisualCard[] {
  const last = agentLines.slice(-2);
  return last.map((entry) => {
    const lower = entry.text.toLowerCase();
    const isFramework = FRAMEWORK_HINTS.some((h) => lower.includes(h));
    const text = trimSentence(entry.text);
    return {
      id: genId(),
      type: isFramework ? "framework" : "takeaway",
      text,
      attribution: entry.speaker,
      ts: Date.now(),
    };
  });
}

function trimSentence(text: string): string {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > 90 ? first.slice(0, 87).trimEnd() + "…" : first;
}
