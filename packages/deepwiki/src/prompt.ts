// System prompt template + PersonaRecord assembly for DeepWiki-generated experts.

import type {
  ExpertCategory,
  GroundingChunk,
  NaturalTension,
  PersonaRecord,
  VoiceProfile,
} from "@echochamber/shared";

import type { ExtractedPersona } from "./sie.js";

// Category colors from roster.json
const CATEGORY_COLORS: Record<ExpertCategory, string> = {
  product: "#6366F1",
  design: "#EC4899",
  growth: "#10B981",
  vc: "#F59E0B",
  engineering: "#3B82F6",
  founder: "#8B5CF6",
};

const VALID_CATEGORIES = new Set<string>([
  "product",
  "design",
  "growth",
  "vc",
  "engineering",
  "founder",
]);

function toCategory(raw: string): ExpertCategory {
  const lower = raw.toLowerCase().trim();
  if (VALID_CATEGORIES.has(lower)) return lower as ExpertCategory;
  return "founder"; // safe default
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** Build the system prompt from extracted persona fields. */
export function assembleSystemPrompt(
  name: string,
  extracted: ExtractedPersona,
): string {
  const worldviewLines = extracted.worldview
    .map((w) => `- ${w}`)
    .join("\n");

  const tensionLines = extracted.naturalTensions
    .map((t) => `- On ${t.topic}: ${t.position}`)
    .join("\n");

  const positionLines = extracted.knownPositions
    .map((p) => {
      const src = p.source ? ` (${p.source})` : "";
      return `On ${p.topic}:\n- "${p.position}"${src}`;
    })
    .join("\n\n");

  return `You are ${name}. ${extracted.background}

WORLDVIEW:
${worldviewLines}

COMMUNICATION STYLE:
${extracted.communicationStyle}

NATURAL TENSIONS:
${tensionLines}

KNOWLEDGE BASE — REAL OPINIONS AND POSITIONS:

${positionLines}

GROUNDING RULES:
- When you don't have specific knowledge from your actual writings or interviews, say "Based on my general philosophy..." or "I haven't spoken about this publicly, but my instinct is..."
- Never claim to have said something you didn't actually say
- Stay in character but acknowledge the limits of what's been indexed about you
- You can reason from your known positions to adjacent topics, but flag when you're extrapolating
- Prefer quoting or closely paraphrasing your real positions over making things up

ROUNDTABLE BEHAVIOR:
- Keep responses to 2-3 sentences in roundtable format
- React to what others say — agree, disagree, build on their points
- Reference your real positions and frameworks when relevant
- Ask the user clarifying questions when the topic is vague
- You're direct and opinionated — don't hedge excessively`;
}

/** Build grounding chunks from extracted known positions. */
export function buildGroundingChunks(
  personaId: string,
  extracted: ExtractedPersona,
  embeddings?: number[][],
): GroundingChunk[] {
  return extracted.knownPositions.map((p, i) => ({
    id: `${personaId}-${String(i + 1).padStart(3, "0")}`,
    topic: p.topic,
    text: p.position,
    source: p.source,
    embedding: embeddings?.[i],
  }));
}

/** Build natural tensions from extracted data. */
function buildTensions(
  extracted: ExtractedPersona,
): NaturalTension[] {
  return extracted.naturalTensions.map((t) => ({
    with: "general", // no specific expert id for runtime-generated personas
    topic: t.topic,
  }));
}

/** Default voice profile for runtime-generated personas. */
const DEFAULT_VOICE: VoiceProfile = {
  voiceId: "slng_default",
  pitch: 0,
  pace: 1.0,
};

/** Assemble the final PersonaRecord from all extracted + computed data. */
export function assemblePersonaRecord(
  name: string,
  extracted: ExtractedPersona,
  systemPrompt: string,
  groundingChunks: GroundingChunk[],
): PersonaRecord {
  const category = toCategory(extracted.category);
  const id = slug(name);

  return {
    id,
    name,
    category,
    title: extracted.title || `Indexed via DeepWiki`,
    tier: 3,
    avatar: {
      color: CATEGORY_COLORS[category],
      initials: initials(name),
    },
    voiceProfile: DEFAULT_VOICE,
    expertiseTags: extracted.expertiseTags.slice(0, 8),
    naturalTensions: buildTensions(extracted),
    systemPrompt,
    groundingChunks,
    generated: true,
  };
}
