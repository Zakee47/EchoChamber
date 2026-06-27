// Canned, opinionated lines per persona for the in-browser mock orchestrator.
// These are flavor only — the real orchestrator generates grounded responses.

export const PERSONA_LINES: Record<string, string[]> = {
  "paul-graham": [
    "Do things that don't scale first. Talk to ten users by hand before you automate anything.",
    "The most common mistake is building something nobody wants. Default to launching too early.",
    "Founder mode beats manager mode here — stay close to the details that matter.",
  ],
  "keith-rabois": [
    "Hire barrels, not ammunition. One person who can own this end-to-end is worth five who can't.",
    "Increase your operating tempo. Most startups die of indecision, not competition.",
    "I'd be contrarian here: the consensus answer is usually already priced in.",
  ],
  "elena-verna": [
    "Freemium beats a trial every time for PLG — your free tier is your best acquisition channel.",
    "Don't confuse activation with retention. You can have great onboarding and still leak users.",
    "Build a growth loop, not a funnel. Funnels end; loops compound.",
  ],
  "madhavan-ramanujam": [
    "Talk about price on day one. Willingness-to-pay is a design input, not an afterthought.",
    "Package around value metrics customers already understand, or your pricing won't land.",
    "The biggest pricing mistake is leaving money on the table by underpricing your power users.",
  ],
  "andrew-wilkinson": [
    "Honestly? Bootstrap to profitability. A boring, cash-flowing business buys you total freedom.",
    "Raising money is signing up for a job with a board. Make sure you actually want that.",
    "Profit is a feature. It lets you ignore everyone's advice, including mine.",
  ],
  "eric-ries": [
    "Frame it as a hypothesis and run the smallest experiment that gives you validated learning.",
    "Build, measure, learn. If you can't measure the outcome, you're not really iterating.",
    "Your MVP is the minimum thing that tests the riskiest assumption — nothing more.",
  ],
  "boris-cherny": [
    "Let agents do the bricklaying. Your job is increasingly to be the architect and reviewer.",
    "There's huge latent demand once coding gets cheap — build for the work people couldn't afford before.",
    "Run agents in parallel. The bottleneck is your ability to specify, not to type.",
  ],
  "ryo-lu": [
    "Software should have soul. Taste is the moat when everyone can ship features fast.",
    "Design and engineering aren't separate steps anymore — the prototype is the spec.",
    "Sweat the details users feel but can't name. That's where craft lives.",
  ],
  "brian-chesky": [
    "Go founder-mode: get into the details. Delegation without context is just abdication.",
    "Design the whole experience end-to-end, not just the screens.",
    "A 11-star experience starts by imagining what's absurd, then walking it back.",
  ],
  "lenny-rachitsky": [
    "Pick one north-star metric and ruthlessly align the team behind it.",
    "Retention is the truest signal of product-market fit — start there before growth.",
    "Steal like a PM: most great frameworks are borrowed and adapted, not invented.",
  ],
  "shreyas-doshi": [
    "Sort your work into LNO — leverage, neutral, overhead — and spend your energy accordingly.",
    "Run a pre-mortem. Imagine it's failed in six months and ask why.",
    "High agency is the trait that predicts success more than almost anything else.",
  ],
  "casey-winters": [
    "What's the growth loop? If retention is leaking, the loop is broken upstream.",
    "Marketplaces grow by fixing the constrained side first — usually supply.",
    "Acquisition without retention is just renting users.",
  ],
  "andrew-chen": [
    "Solve the cold-start problem one atomic network at a time, not all at once.",
    "Network effects are your defensibility — design the product so each user adds value for the next.",
    "Beware the law of shitty clickthroughs: every channel decays.",
  ],
  "scott-wu": [
    "Think architects vs. bricklayers — autonomous agents change who does what on the team.",
    "The leverage is in clearly specifying the problem; the implementation is increasingly solved.",
    "Reliability is the whole game for agents. Demos are easy; trust is hard.",
  ],
  "guillermo-rauch": [
    "Ship fast and iterate in production. Prompts over code where you can get away with it.",
    "The frontend is the product for most users — invest there disproportionately.",
    "Make the right thing the easy thing and your team will move fast by default.",
  ],
  "dylan-field": [
    "Craft is a moat, but only if it compounds into collaboration and workflow.",
    "Design tools win when they make the whole team faster, not just designers.",
  ],
  "elad-gil": [
    "At this stage, raise more than you think you need — optionality is cheap insurance.",
    "Hypergrowth breaks every system you have; hire ahead of the breakage.",
  ],
  "sam-lessin": [
    "The contrarian read: the AI hype is mispricing a lot of these bets.",
    "Founder etiquette matters more than founders think when the market turns.",
  ],
};

export const GENERIC_LINES = [
  "Let me push back on that — I don't think the data actually supports it.",
  "I'd frame the trade-off differently, and I think it changes the answer.",
  "Here's where I'd start if this were my company.",
  "That's the conventional wisdom, but the conventional wisdom is often wrong here.",
];

export const REACTOR_OPENERS = [
  "I have to disagree with {name} —",
  "Building on what {name} said,",
  "{name} is half right, but",
  "Respectfully, {name}, that misses something:",
];
