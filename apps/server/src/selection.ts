// Agent selection (PRD §6.2) + reactor selection (§6.3).
//
//   classify topic → score panel members (category + expertise + topic-map,
//   minus a no-repeat penalty) → pick top 2 → ensure ≥1 DISSENTER drawn from
//   naturalTensions → 2-3 agents. High-scoring unselected members become
//   hand-raisers surfaced to the user.

import type {
  HandRaise,
  LLMAdapter,
  PersonaRecord,
} from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";
import { topicBoosts } from "./topicMap.js";

export interface SelectionInput {
  topic: string;
  /** active panel persona ids. */
  panel: string[];
  /** ids of agents who spoke in the immediately previous turn (no-repeat). */
  recentSpeakers: string[];
  catalog: PersonaCatalog;
  llm: LLMAdapter;
}

export interface SelectionResult {
  selected: PersonaRecord[];
  handRaisers: HandRaise[];
}

interface Scored {
  persona: PersonaRecord;
  score: number;
  reason: string;
}

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/\W+/).filter(Boolean);
}

function scorePanel(
  personas: PersonaRecord[],
  category: string,
  tags: string[],
  topicWords: string[],
  boosts: Map<string, number>,
  recentSpeakers: string[],
): Scored[] {
  const wantTags = new Set([...tags, ...topicWords]);
  return personas
    .map((persona) => {
      let score = 0;
      const reasons: string[] = [];

      if (persona.category === category) {
        score += 3;
        reasons.push(`${category} expert`);
      }

      let tagHits = 0;
      for (const tag of persona.expertiseTags) {
        const t = tag.toLowerCase();
        if (wantTags.has(t) || [...wantTags].some((w) => t.includes(w) || w.includes(t))) {
          tagHits += 1;
          if (reasons.length < 3) reasons.push(tag);
        }
      }
      score += tagHits * 2;

      const boost = boosts.get(persona.id);
      if (boost) {
        score += boost;
        if (boost >= 4) reasons.unshift("topic lead");
      }

      if (recentSpeakers.includes(persona.id)) score -= 5; // no-repeat penalty

      // tiny tier preference so deeply-grounded experts win close ties
      score += (4 - persona.tier) * 0.25;

      return {
        persona,
        score,
        reason: reasons.length ? reasons.join(", ") : "relevant perspective",
      };
    })
    .sort((a, b) => b.score - a.score);
}

/** Does `a` have a defined natural tension with `b` (either direction)? */
function hasTension(a: PersonaRecord, b: PersonaRecord): boolean {
  return (
    a.naturalTensions.some((t) => t.with === b.id) ||
    b.naturalTensions.some((t) => t.with === a.id)
  );
}

export async function selectAgents(
  input: SelectionInput,
): Promise<SelectionResult> {
  const { topic, panel, recentSpeakers, catalog, llm } = input;
  const personas = panel
    .map((id) => catalog.get(id))
    .filter((p): p is PersonaRecord => Boolean(p));

  if (personas.length === 0) return { selected: [], handRaisers: [] };

  let category = "";
  let tags: string[] = [];
  try {
    const c = await llm.classifyTopic(topic);
    category = c.category;
    tags = c.tags;
  } catch {
    tags = tokenize(topic).slice(0, 4);
  }

  const boosts = topicBoosts(topic, tags);
  const scored = scorePanel(
    personas,
    category,
    tags,
    tokenize(topic),
    boosts,
    recentSpeakers,
  );

  const selected = scored.slice(0, 2).map((s) => s.persona);

  // Ensure at least one DISSENTER: a member with a natural tension vs. a
  // currently-selected agent. If the top 2 don't already disagree, pull in the
  // best-scoring remaining candidate who does.
  const top2Disagree =
    selected.length === 2 && hasTension(selected[0]!, selected[1]!);
  if (!top2Disagree) {
    const dissenter = scored
      .slice(2)
      .find((s) => selected.some((sel) => hasTension(s.persona, sel)));
    if (dissenter) {
      selected.push(dissenter.persona);
    } else if (scored.length > selected.length) {
      // No structured tension available — add the next best voice so the turn
      // still has more than one perspective.
      selected.push(scored[selected.length]!.persona);
    }
  }

  const selectedIds = new Set(selected.map((p) => p.id));
  const handRaisers: HandRaise[] = scored
    .filter((s) => !selectedIds.has(s.persona.id) && s.score >= 3)
    .slice(0, 2)
    .map((s) => ({ agentId: s.persona.id, reason: s.reason, ts: Date.now() }));

  return { selected: selected.slice(0, 3), handRaisers };
}

/**
 * Pick a reactor with a natural tension vs. the last speaker, preferring panel
 * members who did not just speak. Returns null if no suitable reactor exists.
 */
export function selectReactor(
  lastSpeaker: PersonaRecord,
  panel: string[],
  recentSpeakers: string[],
  catalog: PersonaCatalog,
): PersonaRecord | null {
  const candidates = panel
    .map((id) => catalog.get(id))
    .filter((p): p is PersonaRecord => Boolean(p) && p!.id !== lastSpeaker.id)
    .filter((p) => hasTension(p, lastSpeaker));

  if (candidates.length === 0) return null;

  const fresh = candidates.filter((p) => !recentSpeakers.includes(p.id));
  const pool = fresh.length > 0 ? fresh : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick ?? null;
}

/**
 * Suggest a 4-5 expert panel for a topic (REST POST /api/rooms/suggest-panel).
 * Scores the entire catalog, takes the strongest matches, and ensures the panel
 * contains at least one natural-tension pair so the room can actually debate.
 */
export async function suggestPanel(
  topic: string,
  catalog: PersonaCatalog,
  llm: LLMAdapter,
): Promise<{ panel: string[]; rationale: string }> {
  let category = "";
  let tags: string[] = [];
  try {
    const c = await llm.classifyTopic(topic);
    category = c.category;
    tags = c.tags;
  } catch {
    tags = tokenize(topic).slice(0, 4);
  }

  const boosts = topicBoosts(topic, tags);
  const scored = scorePanel(
    catalog.list(),
    category,
    tags,
    tokenize(topic),
    boosts,
    [],
  );

  const panel = scored.slice(0, 4).map((s) => s.persona);
  const hasPair = panel.some((a, i) =>
    panel.slice(i + 1).some((b) => hasTension(a, b)),
  );
  if (!hasPair) {
    const dissenter = scored
      .slice(4)
      .find((s) => panel.some((p) => hasTension(s.persona, p)));
    if (dissenter) panel.push(dissenter.persona);
  }
  if (panel.length < 5 && scored.length > panel.length) {
    const ids = new Set(panel.map((p) => p.id));
    const filler = scored.find((s) => !ids.has(s.persona.id));
    if (filler) panel.push(filler.persona);
  }

  const lead = scored[0];
  const rationale = lead
    ? `For "${topic}", ${lead.persona.name} leads (${lead.reason}); the panel ` +
      `pairs complementary and dissenting views so the experts debate rather ` +
      `than agree.`
    : `Suggested panel for "${topic}".`;

  return { panel: panel.slice(0, 5).map((p) => p.id), rationale };
}

/** Topic of the natural tension between two personas, for prompt flavor. */
export function tensionTopic(
  a: PersonaRecord,
  b: PersonaRecord,
): string | undefined {
  return (
    a.naturalTensions.find((t) => t.with === b.id)?.topic ??
    b.naturalTensions.find((t) => t.with === a.id)?.topic
  );
}
