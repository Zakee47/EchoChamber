import type { RosterEntry, ExpertCategory } from "@echochamber/shared";

/** Keyword → (category weight, tag hints) used by the mock panel suggester. */
const TOPIC_SIGNALS: Array<{
  match: RegExp;
  categories: Partial<Record<ExpertCategory, number>>;
  tags: string[];
  label: string;
}> = [
  {
    match: /pric|monetiz|revenue|paywall|willingness|packag|freemium|trial|subscription/i,
    categories: { growth: 3, vc: 1, product: 1 },
    tags: ["pricing", "monetization", "freemium", "plg", "willingness-to-pay", "packaging"],
    label: "pricing & monetization",
  },
  {
    match: /retention|activation|churn|engagement|onboarding|growth loop|plg|viral|acqui/i,
    categories: { growth: 3, product: 2 },
    tags: ["retention", "activation", "growth-loops", "plg", "network-effects"],
    label: "growth & retention",
  },
  {
    match: /fundrais|raise|round|vc|valuation|invest|cap table|dilution/i,
    categories: { vc: 3, founder: 1 },
    tags: ["fundraising", "scaling", "hypergrowth", "bootstrapping"],
    label: "fundraising & financing",
  },
  {
    match: /hir|team|talent|org|manage|leadership|culture|coo|recruit/i,
    categories: { vc: 2, product: 1, founder: 2 },
    tags: ["talent", "hiring", "leadership", "org-change", "scaling-teams"],
    label: "team & org building",
  },
  {
    match: /design|ux|brand|craft|interface|aesthetic/i,
    categories: { design: 3, product: 1 },
    tags: ["design-process", "craft", "first-mile-ux", "design-tooling"],
    label: "design & craft",
  },
  {
    match: /ai|agent|llm|code|engineer|infra|devin|cursor|claude|ship/i,
    categories: { engineering: 3, product: 1 },
    tags: ["agentic-dev", "ai-coding", "ship-fast", "autonomous-agents", "developer-productivity"],
    label: "AI & engineering",
  },
  {
    match: /marketplace|two-sided|network|cold.?start|supply|demand/i,
    categories: { growth: 3, founder: 1 },
    tags: ["network-effects", "cold-start", "marketplace-growth"],
    label: "marketplace dynamics",
  },
  {
    match: /mvp|validate|lean|experiment|iterate|product market fit|pmf|roadmap|strategy/i,
    categories: { product: 3, founder: 2 },
    tags: ["lean-startup", "mvp", "product-strategy", "outcomes", "validated-learning"],
    label: "product strategy & validation",
  },
  {
    match: /founder|company building|vision|mission|scale|consumer/i,
    categories: { founder: 3, vc: 1 },
    tags: ["founder-mode", "company-building", "consumer-product", "design-led"],
    label: "company building",
  },
];

export interface SuggestResult {
  panel: string[];
  rationale: string;
}

/** Local, deterministic stand-in for POST /api/rooms/suggest-panel. */
export function suggestPanel(topic: string, roster: RosterEntry[]): SuggestResult {
  const signals = TOPIC_SIGNALS.filter((s) => s.match.test(topic));
  const catWeights: Partial<Record<ExpertCategory, number>> = {};
  const tags = new Set<string>();
  const labels: string[] = [];
  for (const s of signals) {
    labels.push(s.label);
    for (const [cat, w] of Object.entries(s.categories)) {
      catWeights[cat as ExpertCategory] = (catWeights[cat as ExpertCategory] ?? 0) + (w ?? 0);
    }
    s.tags.forEach((t) => tags.add(t));
  }

  const scored = roster
    .map((e) => {
      let score = (catWeights[e.category] ?? 0) * 2;
      score += e.expertiseTags.filter((t) => tags.has(t)).length * 3;
      if (e.tier === 1) score += 1.5; // favor deep-grounded demo experts
      score += Math.random() * 0.5; // light jitter for variety
      return { e, score };
    })
    .sort((a, b) => b.score - a.score);

  // Take the top scorers, but spread across at least 3 categories for a real debate.
  const panel: RosterEntry[] = [];
  const seenCats = new Set<ExpertCategory>();
  for (const { e } of scored) {
    if (panel.length >= 5) break;
    const catCount = panel.filter((p) => p.category === e.category).length;
    if (catCount >= 2 && seenCats.size < 3) continue;
    panel.push(e);
    seenCats.add(e.category);
  }
  while (panel.length < 4) {
    const next = scored.find((s) => !panel.includes(s.e));
    if (!next) break;
    panel.push(next.e);
  }

  const names = panel.map((p) => p.name);
  const focus = labels[0] ?? "your problem";
  const rationale =
    `Your question reads as a ${focus} problem, so I assembled a panel that will ` +
    `genuinely disagree: ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}. ` +
    `${panel[0]?.name} anchors the core take, while the others bring counter-positions from ` +
    `${[...seenCats].join(", ")} so you hear the tension, not an echo chamber.`;

  return { panel: panel.map((p) => p.id), rationale };
}
