// Persona catalog loader.
//
// BUILD.md: "prefer a loader from @echochamber/grounding if present; otherwise
// read data/personas/roster.json + assemble from docs." The grounding package
// currently exports no loader, so we assemble PersonaRecords here from the three
// source-of-truth docs:
//   - data/personas/roster.json          → light roster fields (id, category, …)
//   - docs/SYSTEM_PROMPTS.md             → persona system prompts (sections 1-4,6,7)
//                                          + NATURAL TENSIONS prose → naturalTensions[]
//   - docs/CONTENT_GROUNDING_..._COMPLETE → Tier-1 KNOWLEDGE BASE → groundingChunks[]
//
// The 6 Tier-1 experts (Elena Verna, Keith Rabois, Paul Graham, Ryo Lu,
// Eric Ries, Boris Cherny) get their full grounded knowledge bases.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type {
  ExpertCategory,
  GroundingChunk,
  GroundingTier,
  NaturalTension,
  PersonaRecord,
  RosterEntry,
  VoiceProfile,
} from "@echochamber/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const ROSTER_PATH = resolve(REPO_ROOT, "data/personas/roster.json");
const PROMPTS_PATH = resolve(REPO_ROOT, "docs/SYSTEM_PROMPTS.md");
const GROUNDING_PATH = resolve(
  REPO_ROOT,
  "docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md",
);

interface RosterRaw {
  experts: Array<{
    id: string;
    name: string;
    category: ExpertCategory;
    title: string;
    tier: GroundingTier;
    avatar: { color: string; initials: string; image?: string };
    expertiseTags: string[];
  }>;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Markdown helpers ────────────────────────────────────────────────────────

/** Extract the first fenced ``` code block that follows a heading line. */
function codeBlockAfter(lines: string[], headingIdx: number): string {
  let i = headingIdx + 1;
  while (i < lines.length && !lines[i]!.startsWith("```")) i++;
  if (i >= lines.length) return "";
  const start = i + 1;
  let end = start;
  while (end < lines.length && !lines[end]!.startsWith("```")) end++;
  return lines.slice(start, end).join("\n");
}

/** name → persona system prompt (the fenced block under each `### N. Name`). */
function parseSystemPrompts(md: string): Map<string, string> {
  const lines = md.split("\n");
  const out = new Map<string, string>();
  const heading = /^###\s+\d+\.\s+(.+?)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const m = heading.exec(lines[i]!);
    if (!m) continue;
    const name = m[1]!.trim();
    const block = codeBlockAfter(lines, i);
    if (block) out.set(name, block);
  }
  return out;
}

/** name → Tier-1 KNOWLEDGE BASE block (fenced block under `### Expert N: Name — …`). */
function parseKnowledgeBases(md: string): Map<string, string> {
  const lines = md.split("\n");
  const out = new Map<string, string>();
  const heading = /^###\s+Expert\s+\d+:\s+(.+?)\s+[—-]\s+.+$/;
  for (let i = 0; i < lines.length; i++) {
    const m = heading.exec(lines[i]!);
    if (!m) continue;
    const name = m[1]!.trim();
    const block = codeBlockAfter(lines, i);
    if (block) out.set(name, block);
  }
  return out;
}

/**
 * Parse a Tier-1 KNOWLEDGE BASE block into retrievable grounding chunks.
 * Bullets are grouped under `On <topic>:` sub-headers; each bullet becomes one
 * chunk so retrieval can pull the few most relevant opinions per turn.
 */
function parseGroundingChunks(
  personaId: string,
  block: string,
): GroundingChunk[] {
  const chunks: GroundingChunk[] = [];
  let topic = "general";
  let current: string | null = null;
  let n = 0;

  const flush = () => {
    if (current === null) return;
    const text = current.replace(/\s+/g, " ").replace(/^["']|["']$/g, "").trim();
    if (text.length > 0) {
      chunks.push({ id: `${personaId}-${String(++n).padStart(3, "0")}`, topic, text });
    }
    current = null;
  };

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (/^KNOWLEDGE BASE/i.test(line)) continue;
    const topicMatch = /^On\s+(.+?):\s*$/i.exec(line);
    if (topicMatch) {
      flush();
      topic = slug(topicMatch[1]!);
      continue;
    }
    if (line.startsWith("- ")) {
      flush();
      current = line.slice(2);
    } else if (current !== null) {
      current += " " + line; // continuation of the previous bullet
    }
  }
  flush();
  return chunks;
}

/**
 * Derive structured naturalTensions from the prose NATURAL TENSIONS section of a
 * persona prompt by matching other roster members by name.
 */
function parseNaturalTensions(
  prompt: string,
  nameToId: Map<string, string>,
): NaturalTension[] {
  const section = sectionBody(prompt, "NATURAL TENSIONS");
  if (!section) return [];
  const tensions: NaturalTension[] = [];
  const seen = new Set<string>();
  const names = [...nameToId.keys()].sort((a, b) => b.length - a.length);

  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("- ")) continue;
    const text = line.slice(2);
    for (const name of names) {
      if (!text.includes(name)) continue;
      const id = nameToId.get(name)!;
      if (seen.has(id)) continue;
      seen.add(id);
      tensions.push({ with: id, topic: deriveTensionTopic(text) });
    }
  }
  return tensions;
}

function deriveTensionTopic(text: string): string {
  const m = /\bon\s+([a-z][\w-]*)/i.exec(text);
  if (m) return slug(m[1]!);
  return "general";
}

/** Return the body between an ALLCAPS header line and the next ALLCAPS header. */
function sectionBody(prompt: string, header: string): string | null {
  const lines = prompt.split("\n");
  const headerRe = new RegExp(`^${header}\\s*:?\\s*$`, "i");
  const nextHeaderRe = /^[A-Z][A-Z &/]+:?\s*$/;
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i]!.trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = start;
  while (end < lines.length && !nextHeaderRe.test(lines[end]!.trim())) end++;
  return lines.slice(start, end).join("\n");
}

// ── Voice profile synthesis (roster has no voiceProfile) ─────────────────────

const CATEGORY_TONE: Record<ExpertCategory, string> = {
  product: "measured",
  design: "thoughtful",
  growth: "authoritative",
  vc: "provocative",
  engineering: "analytical",
  founder: "visionary",
};

// Explicit, gender-appropriate Aura 2 voices for the Tier-1 demo experts so the
// flagship panel sounds distinct. Everyone else is assigned deterministically
// from the pool below.
const TIER1_VOICES: Record<string, string> = {
  "elena-verna": "aura-2-asteria-en",
  "keith-rabois": "aura-2-orion-en",
  "paul-graham": "aura-2-arcas-en",
  "ryo-lu": "aura-2-apollo-en",
  "eric-ries": "aura-2-zeus-en",
  "boris-cherny": "aura-2-atlas-en",
};

// Verified-working Aura 2 English voices (SLNG-hosted Deepgram).
const VOICE_POOL = [
  "aura-2-draco-en",
  "aura-2-orpheus-en",
  "aura-2-jupiter-en",
  "aura-2-mars-en",
  "aura-2-pluto-en",
  "aura-2-saturn-en",
  "aura-2-hyperion-en",
  "aura-2-thalia-en",
  "aura-2-luna-en",
  "aura-2-athena-en",
  "aura-2-hera-en",
  "aura-2-andromeda-en",
  "aura-2-aurora-en",
  "aura-2-iris-en",
  "aura-2-cordelia-en",
  "aura-2-callista-en",
];

function synthVoiceProfile(id: string, category: ExpertCategory): VoiceProfile {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  const pitch = Math.round(((Math.abs(h) % 100) / 100 - 0.5) * 10) / 10; // -0.5..0.4
  const pace = Math.round((0.92 + ((Math.abs(h >> 3) % 24) / 100)) * 100) / 100; // ~0.92..1.15
  const voiceId =
    TIER1_VOICES[id] ?? VOICE_POOL[Math.abs(h) % VOICE_POOL.length]!;
  return { voiceId, pitch, pace, tone: CATEGORY_TONE[category] };
}

// ── Public loader ────────────────────────────────────────────────────────────

export interface PersonaCatalog {
  list(): PersonaRecord[];
  get(id: string): PersonaRecord | undefined;
  roster(): RosterEntry[];
  /** Add/replace a persona at runtime (DeepWiki-generated experts). */
  add(p: PersonaRecord): void;
}

export function loadPersonaCatalog(): PersonaCatalog {
  const roster = JSON.parse(readFileSync(ROSTER_PATH, "utf8")) as RosterRaw;
  const prompts = parseSystemPrompts(readFileSync(PROMPTS_PATH, "utf8"));
  const knowledge = parseKnowledgeBases(readFileSync(GROUNDING_PATH, "utf8"));

  const nameToId = new Map<string, string>();
  for (const e of roster.experts) nameToId.set(e.name, e.id);

  const byId = new Map<string, PersonaRecord>();
  for (const e of roster.experts) {
    const basePrompt =
      prompts.get(e.name) ?? `You are ${e.name}, ${e.title}.`;
    const kbBlock = knowledge.get(e.name);
    const groundingChunks = kbBlock ? parseGroundingChunks(e.id, kbBlock) : [];

    // For Tier-1 experts, fold the knowledge base into the system prompt as
    // section 5 (between NATURAL TENSIONS and GROUNDING RULES), per the docs.
    const systemPrompt = kbBlock
      ? insertKnowledgeBase(basePrompt, kbBlock)
      : basePrompt;

    byId.set(e.id, {
      id: e.id,
      name: e.name,
      category: e.category,
      title: e.title,
      tier: e.tier,
      avatar: e.avatar,
      voiceProfile: synthVoiceProfile(e.id, e.category),
      expertiseTags: e.expertiseTags,
      naturalTensions: parseNaturalTensions(basePrompt, nameToId),
      systemPrompt,
      groundingChunks,
    });
  }

  return {
    list: () => [...byId.values()],
    get: (id) => byId.get(id),
    roster: () =>
      [...byId.values()].map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        title: p.title,
        tier: p.tier,
        avatar: p.avatar,
        expertiseTags: p.expertiseTags,
      })),
    add: (p) => {
      byId.set(p.id, p);
      if (!nameToId.has(p.name)) nameToId.set(p.name, p.id);
    },
  };
}

function insertKnowledgeBase(prompt: string, kbBlock: string): string {
  const kb = kbBlock.trim();
  const lines = prompt.split("\n");
  const idx = lines.findIndex((l) => /^GROUNDING RULES\s*:?\s*$/i.test(l.trim()));
  if (idx === -1) return `${prompt}\n\n${kb}`;
  return [...lines.slice(0, idx), kb, "", ...lines.slice(idx)].join("\n");
}
