# AI Expert Roundtable — Battle Plan v2 (Final)

> Updated with all decisions from our planning session.
> 30 experts, 6 categories, debate intensity slider, smart panel suggestions, visual cards.

---

## The Pitch (30 seconds)

"Imagine walking into a room with Elena Verna, Paul Graham, Ryo Lu, Brian Chesky, and Boris Cherny — all at once — to discuss YOUR startup problem. They debate each other, challenge your assumptions, and give you advice grounded in everything they've ever published. Any expert, any combination, any problem. That's what we built."

---

## Core Product Decisions (Locked In)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Expert roster | 30 experts, 6 categories | Product, Design, Growth, VCs, Engineering, Founders |
| Panel selection | AI suggests a panel + user can swap | Best of both: smart defaults, user control |
| Turn-taking | 2-3 agents per turn + hand-raising + user moderation | Focused debate, not cacophony |
| Debate intensity | User-controlled slider (Collaborative → Balanced → Heated) | Killer demo feature |
| Room UI | Voice + transcript + visual cards (takeaways, frameworks) | Rich but not overwhelming |
| Session output | Summary + full transcript | User walks away with value |
| Doc upload | Cut from hackathon — future feature | Smart scope cut |
| Product name | TBD — founder will decide | Not blocking |

---

## 30 Expert Avatars — Final Roster

### Product (5)
1. **Lenny Rachitsky** — Data-driven growth, retention, systematic frameworks
2. **Shreyas Doshi** — High-agency PM, LNO framework, pre-mortems
3. **Melissa Perri** — Product ops, outcome > output, "The Build Trap"
4. **Cat Wu** — AI-native product at Anthropic, eng-to-PM path
5. **Nikhyl Singhal** — Unfiltered truth about PM careers, The Skip

### Design (5)
6. **Jenny Wen** — "The design process is dead," AI-first design
7. **Ryo Lu** — Designers ship code, "it's all the same thing," ryOS, soulful AI design
8. **Max Schoening** — Agency > skills, tiny core theory, designers coding
9. **Dylan Field** — Design tooling, craft as moat, Figma
10. **Scott Belsky** — The messy middle, first mile UX, creative tools

### Growth (5)
11. **Elena Verna** — PLG queen, freemium > trial, product-led sales
12. **Amol Avasare** — Anthropic's $1B→$19B growth, activation, CASH system
13. **Casey Winters** — Growth loops, marketplace growth, sustainable vs hackish
14. **Andrew Chen** — Network effects, cold start problem, a16z
15. **Madhavan Ramanujam** — Pricing & monetization, willingness to pay

### VCs / Investors (5)
16. **Keith Rabois** — Barrels vs ammo, talent, "PM role is dying"
17. **Sam Lessin** — Contrarian AI takes, founder etiquette, cycles
18. **Paul Graham** — Do things that don't scale, YC philosophy, schlep blindness
19. **Elad Gil** — Scaling 10→10k, High Growth Handbook, fundraising
20. **Andrew Wilkinson** — Boring businesses, bootstrapping vs VC, Tiny

### Engineering (5)
21. **Guillermo Rauch** — Ship fast, prompts > code, Vercel/Next.js
22. **Fiona Fung** — 8x code output, AI-pilled eng org, 25yr perspective
23. **Boris Cherny** — Post-coding world, agentic dev, Claude Code
24. **Scott Wu** — Autonomous AI engineers, Devin, architects vs bricklayers
25. **Michael Truell** — AI-assisted coding, Cursor, IDE as product

### Founders / CEOs (5)
26. **Brian Chesky** — Founder mode, killing bureaucracy, Airbnb
27. **Evan Spiegel** — Consumer product, distribution moats, tiny design teams
28. **Eric Ries** — Lean Startup, validated learning, governance
29. **Mark Pincus** — Proven/Better/New, instincts vs ideas, Zynga
30. **Melanie Perkins** — $42B from Australia, homegrown talent, Canva

### Source Breakdown
- 26 Lenny's Podcast guests
- 4 wider ecosystem (Paul Graham, Elad Gil, Andrew Chen, Ryo Lu)

---

## Architecture (Unchanged from v1)

### Three Sponsor Tools
| Tool | Role | Integration Point |
|------|------|-------------------|
| **Google DeepMind (Gemini Live API)** | Core brain — each agent is a Gemini session with persona prompt + RAG context | Voice-to-voice, native audio, function calling for RAG |
| **Tavily** | DeepWiki avatar builder — search and extract expert content on demand | Real-time search + extraction API |
| **SLNG** | Voice infrastructure — routing, distinct voice profiles per agent, low latency | Model-agnostic TTS, sub-100ms TTFB |

### Voice Pipeline (Recommended: Option A)
- Gemini Live API native audio for each agent
- SLNG for voice routing and optimization
- Push-to-talk for demo reliability

---

## UI Screens (3 screens for hackathon)

### Screen 1: Room Lobby
- Grid of available/live rooms
- "Create Room" button
- Each room card shows: topic, which experts are in the room, participant count

### Screen 2: Create Room Flow
1. User describes their problem/topic in 1-2 sentences
2. Platform auto-suggests a panel of 4-5 experts (using topic→agent mapping)
3. User can swap experts: tap an expert to see alternatives from same or other categories
4. Debate intensity slider: Collaborative ←→ Balanced ←→ Heated
5. "Start Session" button

### Screen 3: Room View (HERO SCREEN)
**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Topic: "Should I focus on product or sales?"       │
│  Debate intensity: [====●=========] Balanced        │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   ┌──┐  ┌──┐        │  LIVE TRANSCRIPT             │
│   │E1│  │E2│        │                              │
│   └──┘  └──┘        │  Elena: "Your activation     │
│      ┌──┐           │  metric should be..."        │
│      │🎤│ (user)    │                              │
│      └──┘           │  Keith: "I disagree.          │
│   ┌──┐  ┌──┐        │  The real question is..."    │
│   │E3│  │E4│        │                              │
│   └──┘  └──┘        │  ✋ Paul wants to speak       │
│                      │                              │
│  [Push to Talk]      │──────────────────────────────│
│                      │  KEY TAKEAWAYS               │
│  ┌────────────────┐  │  • "Barrels vs ammo" (Keith) │
│  │@Elena  @Keith  │  │  • "Test pricing first"      │
│  │ Tag an expert  │  │    (Madhavan)                │
│  └────────────────┘  │                              │
├──────────────────────┴──────────────────────────────┤
│  [End Session → Get Summary + Transcript]           │
└─────────────────────────────────────────────────────┘
```

**UI elements:**
- Circular avatars in a panel arrangement — active speaker has glowing/pulsing border
- Hand-raise indicator: "✋ [Name] wants to speak" — user can tap to let them in
- @mention bar: user types @Name to call on a specific expert
- Debate intensity slider: adjustable mid-session
- Live transcript panel with agent-attributed text
- Visual cards panel: auto-extracted key takeaways, frameworks mentioned, action items
- Push-to-talk button (large, center-bottom)

### Screen 4 (BONUS): DeepWiki Builder
- Input field: "Enter expert name"
- Progress UI: Searching → Found 15 sources → Parsing content → Building persona → Avatar ready
- New avatar card appears in the expert picker
- Powered by Tavily search + extraction

---

## Orchestrator Logic

### Panel Suggestion Algorithm
```
User describes topic → Extract keywords →
  1. Match keywords to CATEGORY (growth, product, design, VC, eng, founder)
  2. Select 2 agents from primary category
  3. Select 1-2 agents from adjacent categories that create tension
  4. Select 1 "wildcard" agent who brings unexpected perspective
  5. Present suggested panel to user with "Why these experts" rationale
```

### Turn-Taking Engine
```
User message arrives →
  1. Add to transcript
  2. Select 2-3 most relevant agents (by topic + expertise mapping)
  3. Generate responses sequentially
  4. After each response, check debate_intensity probability:
     - Roll random: if < intensity_threshold, select a reactor agent
     - Reactor must be someone who has NATURAL TENSIONS with the speaker
     - Reactor references what was just said
  5. Check for hand-raisers: agents whose expertise strongly matches
     but weren't selected — show hand-raise indicator to user
  6. If user @mentions an agent, that agent responds next regardless
  7. Stream all responses to frontend via WebSocket
```

### Visual Cards Generation
```
After every 3-4 agent responses:
  - Extract key frameworks mentioned (e.g., "Barrels vs Ammo," "PLG," "Proven/Better/New")
  - Extract action items or advice
  - Generate a "Key Takeaway" card with attribution
  - Update the sidebar in real-time
```

---

## Hour-by-Hour Schedule (8 hours)

### Hours 1-2: Orchestrator + Prompts
- Load all 30 system prompts into the project
- Build the orchestrator logic (turn-taking, agent selection, debate intensity)
- Test multi-agent text chat with 3 agents in terminal
- Verify Gemini API works with persona prompts
- **Milestone: working text-based multi-agent conversation**

### Hours 3-4: Voice Integration
- Integrate Gemini Live API for voice output
- Set up SLNG for voice routing and distinct agent voices
- Assign voice profiles per agent (pitch, pace, tone)
- Test latency — aim for <3 seconds per agent turn
- Implement push-to-talk for user input
- **Milestone: agents speak their responses aloud with distinct voices**

### Hours 5-6: Frontend UI
- Build Room View (hero screen) with React/Next.js
- Implement: avatar panel, transcript sidebar, visual cards
- Build debate intensity slider
- Build @mention and hand-raising UI
- Build Room Creation flow with panel suggestion
- Build Room Lobby (simple grid)
- **Milestone: demo-ready UI with real data flowing through**

### Hours 7-8: Polish + Record
- Pre-test the exact demo scenario 3+ times
- Record screen demo (3-3.5 minutes following the demo script)
- Add loading states, transitions, error handling
- Prepare live demo fallback
- If time permits: build DeepWiki builder with Tavily integration
- **Milestone: recorded demo + live demo ready**

---

## Demo Script (for screen recording)

**[0:00-0:15]** Open on room lobby. Show pre-built rooms.
"Welcome to [Product Name]. Your AI expert roundtable."

**[0:15-0:40]** Create a new room. Type: "I'm building a B2B SaaS for restaurant inventory management. 3 pilot customers, no revenue yet. Should I focus on product or sales?"

Show the platform suggesting a panel: Elena Verna (Growth), Keith Rabois (VC), Eric Ries (Founder), Madhavan Ramanujam (Pricing).

User swaps Eric Ries for Paul Graham. Sets debate intensity to "Heated."

**[0:40-2:00]** THE HERO MOMENT. Enter room. Agents discuss:
- Elena pushes PLG and freemium
- Keith challenges: "Do you have a barrel? Who's your 10x person?"
- Madhavan: "Have you tested willingness to pay with those 3 pilots?"
- Paul Graham: "3 customers is a signal. Do things that don't scale. Personally deliver for them."
- Elena reacts to Keith: "You can't just hire your way to product-market fit..."
- Keith fires back (high debate intensity)

Show hand-raise: "✋ Casey Winters wants to speak" — user taps, Casey joins with growth loop perspective.

**[2:00-2:20]** User @mentions Paul Graham: "Paul, should I raise funding?"
Paul gives a direct, concise answer. Others react.

**[2:20-2:40]** Show visual cards updating in real-time with key takeaways.

**[2:40-3:00]** End session. Show summary + full transcript generation.

**[3:00-3:20]** BONUS: Show DeepWiki. Type "Build avatar for Jason Fried."
Tavily searches → content found → "Building persona..." → Jason Fried avatar appears in expert picker.

**[3:20-3:30]** Close with vision. "Every founder deserves world-class advisors. Now 30 of the best minds in startups are in your pocket. And with DeepWiki, any expert can be indexed in 60 seconds."

---

## Risk Mitigations (Updated)

| Risk | Mitigation |
|------|------------|
| Voice latency kills demo | Push-to-talk, 2-3 sentence max responses, pre-generate "thinking..." audio |
| 30 experts too many to demo | Only show 5-6 in the demo — the roster proves scale in the pitch |
| All agents sound too similar | Different voice profiles via SLNG + visual differentiation (unique colors, avatars) |
| Debate intensity feels fake | Natural tensions are baked into system prompts — agents genuinely disagree |
| Panel suggestion is wrong | Have 2-3 pre-tested topic→panel mappings ready for demo |
| API rate limits during live demo | Cache the demo scenario, have recorded backup |
| DeepWiki indexing is slow | Start Tavily search before switching to that section of demo |
| Agents say something the real person wouldn't | Grounding rules in every prompt: "When unsure, say you haven't spoken about that" |

---

## What to Skip (Still Applies)

- Auth/login → hardcode demo user
- Database → JSON files + in-memory state
- Mobile responsiveness → desktop only
- Multiple concurrent users → single user demo
- Persistent chat history → fresh each session
- Payment/subscription → irrelevant
- Onboarding flow → jump straight to room lobby
- Document upload → cut from MVP (future feature)

---

## Tech Stack (Final)

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | Next.js + React | Fast scaffold, real-time WebSocket support |
| Voice Brain | Gemini Live API | Native voice-to-voice, sponsor tool |
| Voice Infra | SLNG | Distinct voices, low latency routing, sponsor tool |
| Expert Indexing | Tavily | Search + extract for DeepWiki, sponsor tool |
| Orchestration | Custom Node.js | Turn-taking, agent selection, debate intensity |
| RAG Storage | In-memory JSON (demo) | Pre-chunked expert content, good enough for hackathon |
| Coding Help | Devin | Boilerplate while you focus on UX and prompts |

---

## Files in This Deliverable

1. **BATTLE_PLAN_v2.md** — This file. Complete strategy and execution plan.
2. **SYSTEM_PROMPTS.md** — All 30 expert system prompts + orchestrator instructions + debate intensity mapping + topic→agent selection heuristics.

**Both files are ready. No code has been written. Clock is ticking — go build.**
