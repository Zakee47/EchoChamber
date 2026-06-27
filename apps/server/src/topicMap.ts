// Topic → agent mapping table (from docs/SYSTEM_PROMPTS.md § Agent selection
// heuristics). Used to seed agent selection: when a topic's keywords match an
// entry, the listed experts get a score boost (lead > supporting).

export interface TopicMapEntry {
  /** keywords that, if present in the topic/tags, activate this mapping. */
  keywords: string[];
  /** ordered persona ids: first is the "lead", the rest are supporting. */
  agents: string[];
}

export const TOPIC_AGENT_MAP: TopicMapEntry[] = [
  { keywords: ["pricing", "monetization", "monetize", "willingness", "packaging"], agents: ["madhavan-ramanujam", "elena-verna", "andrew-wilkinson"] },
  { keywords: ["plg", "growth loop", "growth loops", "freemium", "activation", "retention"], agents: ["elena-verna", "casey-winters", "amol-avasare"] },
  { keywords: ["fundraising", "fundraise", "raise", "funding", "investors", "vc"], agents: ["elad-gil", "keith-rabois", "paul-graham"] },
  { keywords: ["hiring", "hire", "team", "talent", "recruiting"], agents: ["keith-rabois", "melanie-perkins", "brian-chesky"] },
  { keywords: ["product strategy", "strategy", "roadmap", "prioritization"], agents: ["lenny-rachitsky", "shreyas-doshi", "melissa-perri"] },
  { keywords: ["design", "design process", "ux", "craft"], agents: ["jenny-wen", "ryo-lu", "max-schoening"] },
  { keywords: ["ai tools", "coding", "ai coding", "agents", "agentic"], agents: ["boris-cherny", "scott-wu", "michael-truell"] },
  { keywords: ["consumer", "consumer product", "social", "viral"], agents: ["evan-spiegel", "mark-pincus", "brian-chesky"] },
  { keywords: ["scaling", "scale", "hypergrowth"], agents: ["elad-gil", "fiona-fung", "melanie-perkins"] },
  { keywords: ["early-stage", "early stage", "idea", "mvp", "validation", "lean"], agents: ["paul-graham", "eric-ries", "andrew-wilkinson"] },
  { keywords: ["engineering org", "engineering", "developer", "dev productivity"], agents: ["fiona-fung", "guillermo-rauch", "boris-cherny"] },
  { keywords: ["ai product", "ai products", "ai-native", "ai native"], agents: ["cat-wu", "amol-avasare", "boris-cherny"] },
];

/** Return agent boosts for a topic string + classifier tags. */
export function topicBoosts(topic: string, tags: string[]): Map<string, number> {
  const haystack = (topic + " " + tags.join(" ")).toLowerCase();
  const boosts = new Map<string, number>();
  for (const entry of TOPIC_AGENT_MAP) {
    if (!entry.keywords.some((k) => haystack.includes(k))) continue;
    entry.agents.forEach((id, i) => {
      const boost = i === 0 ? 4 : 2;
      boosts.set(id, Math.max(boosts.get(id) ?? 0, boost));
    });
  }
  return boosts;
}
