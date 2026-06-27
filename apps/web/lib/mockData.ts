import type { Room } from "@echochamber/shared";

export interface LobbyRoom extends Room {
  /** UI-only enrichment for the lobby grid. */
  category: string;
  participants: number;
  live: boolean;
  hostBlurb: string;
}

const now = Date.now();

export const MOCK_ROOMS: LobbyRoom[] = [
  {
    roomId: "r_live_pricing",
    topic: "Freemium vs. free trial for our PLG motion?",
    panel: ["elena-verna", "madhavan-ramanujam", "andrew-wilkinson", "keith-rabois"],
    debateIntensity: 3,
    status: "in_room",
    createdAt: now - 1000 * 60 * 12,
    category: "growth",
    participants: 214,
    live: true,
    hostBlurb: "Heated debate on monetization strategy",
  },
  {
    roomId: "r_live_founder",
    topic: "Should a technical founder go founder-mode or hire a COO?",
    panel: ["paul-graham", "brian-chesky", "keith-rabois", "elad-gil"],
    debateIntensity: 2,
    status: "in_room",
    createdAt: now - 1000 * 60 * 5,
    category: "founder",
    participants: 488,
    live: true,
    hostBlurb: "Scaling yourself as the company grows",
  },
  {
    roomId: "r_live_ai",
    topic: "Is hand-written code dead in the agentic era?",
    panel: ["boris-cherny", "scott-wu", "guillermo-rauch", "michael-truell"],
    debateIntensity: 3,
    status: "in_room",
    createdAt: now - 1000 * 60 * 2,
    category: "engineering",
    participants: 731,
    live: true,
    hostBlurb: "Claude Code vs. Devin vs. Cursor",
  },
  {
    roomId: "r_live_design",
    topic: "Does design craft still create a moat?",
    panel: ["ryo-lu", "dylan-field", "jenny-wen", "scott-belsky"],
    debateIntensity: 2,
    status: "in_room",
    createdAt: now - 1000 * 60 * 22,
    category: "design",
    participants: 156,
    live: true,
    hostBlurb: "Soulful software in an AI world",
  },
  {
    roomId: "r_up_retention",
    topic: "Our activation is great but retention is leaking. Where do we look first?",
    panel: ["lenny-rachitsky", "casey-winters", "amol-avasare", "shreyas-doshi"],
    debateIntensity: 2,
    status: "lobby",
    createdAt: now + 1000 * 60 * 45,
    category: "product",
    participants: 0,
    live: false,
    hostBlurb: "Starts in 45 min",
  },
  {
    roomId: "r_up_fundraise",
    topic: "Raise now at a flat round, or bootstrap to profitability?",
    panel: ["sam-lessin", "andrew-wilkinson", "elad-gil", "paul-graham"],
    debateIntensity: 3,
    status: "lobby",
    createdAt: now + 1000 * 60 * 90,
    category: "vc",
    participants: 0,
    live: false,
    hostBlurb: "Starts in 1.5 hrs",
  },
  {
    roomId: "r_up_marketplace",
    topic: "Cold-start problem for a two-sided marketplace — which side first?",
    panel: ["andrew-chen", "casey-winters", "lenny-rachitsky", "elena-verna"],
    debateIntensity: 2,
    status: "lobby",
    createdAt: now + 1000 * 60 * 120,
    category: "growth",
    participants: 0,
    live: false,
    hostBlurb: "Starts in 2 hrs",
  },
  {
    roomId: "r_up_canva",
    topic: "Going global from day one vs. nailing one market?",
    panel: ["melanie-perkins", "brian-chesky", "evan-spiegel", "andrew-chen"],
    debateIntensity: 1,
    status: "lobby",
    createdAt: now + 1000 * 60 * 180,
    category: "founder",
    participants: 0,
    live: false,
    hostBlurb: "Starts at 6pm",
  },
];
