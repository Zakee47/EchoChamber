# AI Expert Roundtable — Technical PRD

> **Status:** Draft v1 for build kickoff
> **Scope:** Hackathon MVP (8-hour build) with a clearly marked post-hackathon / production roadmap.
> **Source docs:** `BATTLE_PLAN_v2.md`, `CONTENT_GROUNDING_STRATEGY.md`, `SYSTEM_PROMPTS.md`
> **Voice stack decision:** Gemini Live API + SLNG (primary), per battle plan.

---

## 1. Overview

### 1.1 Product summary
A Clubhouse-style platform where a user opens a live **voice room** populated by AI avatars of real startup experts (Paul Graham, Elena Verna, Brian Chesky, Keith Rabois, etc.). The avatars are **grounded in each expert's actual published content** and **debate each other and the user in real time**, disagreeing, building on each other, and giving personalized advice. The user:

- Describes a problem; the platform **suggests a panel** of 4–5 experts and the user can swap any of them.
- Controls a **debate-intensity slider** (Collaborative → Balanced → Heated).
- Moderates via **push-to-talk**, **@mentions**, and **hand-raise** prompts.
- Walks away with a **summary + full transcript** and live **visual takeaway cards**.
- Can **index any new expert on demand** ("DeepWiki") by scraping their public content.

### 1.2 Goals (MVP)
| # | Goal | Success criterion |
|---|------|-------------------|
| G1 | Multi-agent voice roundtable that feels real | 3–5 distinct expert voices respond to a prompt in a single turn, referencing each other |
| G2 | Grounded personas (not generic LLM) | Tier-1 experts cite their real frameworks/positions verbatim from source content |
| G3 | Controllable debate | Intensity slider visibly changes agreement vs. confrontation behavior mid-session |
| G4 | Demo-reliable latency | < 3 s to first audio per agent turn; full turn (3 agents) playable without dead air |
| G5 | DeepWiki "wow" | New expert indexed from a name → usable avatar card in < 60 s |
| G6 | Session value | End session produces summary + attributed transcript + takeaway cards |

### 1.3 Non-goals (MVP)
Auth/login (hardcoded demo user), persistent DB (in-memory + JSON), mobile responsiveness (desktop only), multiple concurrent users, payments, onboarding, document upload, cross-session history. All listed in §16 as production roadmap.

---

## 2. Sponsor tools & their roles

| Tool | Role in this product | Integration surface |
|------|----------------------|---------------------|
| **Google DeepMind — Gemini Live API** | Core brain. Each expert turn is a Gemini generation with persona system prompt + grounding context. Optionally native-audio for low-latency single-agent moments. | Text generation + (optional) native audio; function calling for retrieval. |
| **SLNG** | Voice infrastructure. Distinct per-expert voice profiles, low-latency TTS routing, model-agnostic. Turns agent text into attributed audio. | TTS streaming (sub-100 ms TTFB target), one voice profile per expert. |
| **Tavily** | Content acquisition. Search + extract expert public content for grounding (Tier 2 prep) and for DeepWiki (Tier 3 runtime). | Search API + Extract API. |
| **Superlinked (SIE — Self-hosted Inference Engine)** | Open-source inference for the grounding/RAG layer. Embeddings + rerankers for retrieving the right opinions per turn; **document-to-markdown** to clean Tavily-scraped pages; **structured output** to auto-generate persona JSON for DeepWiki; **content guardrails** to enforce anti-hallucination grounding. Apache-2.0, runs in our cloud. | OpenAI-compatible `/v1` endpoint; embed / rerank / OCR / structured-output / guardrail calls. |

> **Why Superlinked here:** the grounding strategy (3 tiers) is fundamentally a retrieval + content-cleaning + structured-extraction problem. SIE gives us self-hosted embeddings + instruction-following rerankers (so a "pricing" question pulls Madhavan's *pricing* opinions, not his career story), document-to-markdown for messy scraped HTML, and schema-valid structured output for turning raw scraped text into a persona record — all without sending prompts/documents to a frontier lab.

---

## 3. Personas / target users

| User | Need | How product serves it |
|------|------|----------------------|
| Early-stage founder | World-class, conflicting advice on a specific problem | Picks a panel, hears experts debate their actual situation |
| Operator / PM / designer | A "second opinion" from named thought leaders | Topic→panel suggestion, @mention specific expert |
| Hackathon judges (demo) | See the wow in 3 minutes | Pre-tested scenario, heated debate, DeepWiki live index |

---

## 4. System architecture

### 4.1 High-level
```
┌──────────────────────────────────────────────────────────────────────┐
│                          Next.js Frontend (desktop)                    │
│  Lobby · Create-Room flow · Room View (avatars, transcript, cards)     │
│  Push-to-talk capture · debate slider · @mention · hand-raise          │
└───────────▲───────────────────────────────────────────┬──────────────┘
            │ WebSocket (events: transcript, audio refs,  │ REST (rooms,
            │ speaker state, cards, hand-raises)          │ panel suggest,
            │                                             │ DeepWiki)
┌───────────┴─────────────────────────────────────────────▼──────────────┐
│                     Orchestration Server (Node.js)                      │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Turn-taking│  │ Agent select│  │ Debate-intens│  │ Visual-cards   │ │
│  │  engine    │  │  heuristics │  │  reaction rng│  │  extractor     │ │
│  └─────┬──────┘  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│        │ per-agent context (persona + grounding + transcript)          │
└────────┼────────────────┼────────────────┼──────────────────┼──────────┘
         │                │                │                  │
   ┌─────▼─────┐   ┌──────▼──────┐   ┌─────▼──────┐   ┌────────▼────────┐
   │ Gemini    │   │ Superlinked │   │   SLNG     │   │  Tavily         │
   │ (text /   │   │ SIE: embed, │   │  TTS per-  │   │  search+extract │
   │ native    │   │ rerank, OCR,│   │  expert    │   │  (Tier2 prep,   │
   │ audio)    │   │ structured, │   │  voice     │   │  DeepWiki)      │
   │           │   │ guardrail   │   │            │   │                 │
   └───────────┘   └─────────────┘   └────────────┘   └─────────────────┘
                           │
                  ┌────────▼─────────┐
                  │ Persona Store     │  (JSON files + in-memory index;
                  │ + grounding chunks│   embeddings cached for retrieval)
                  └───────────────────┘
```

### 4.2 Components
- **Frontend (Next.js + React):** renders three core screens + DeepWiki, owns audio playback queue and the PTT mic capture. Communicates over a single WebSocket for live session events and REST for setup actions.
- **Orchestration server (Node.js):** the brain that decides *who speaks, in what order, and how combatively*. Holds room state in memory. Streams events to the frontend.
- **Persona store:** 30 persona records (JSON), each with system prompt + grounding chunks (Tier 1 deep, Tier 2 condensed, Tier 3 generated). Embeddings for chunks cached for retrieval.
- **Inference adapters:** thin clients for Gemini, SLNG, Tavily, and Superlinked SIE.

### 4.3 Why an orchestrator (not one mega-prompt)
A single LLM impersonating 5 people produces homogenized, low-tension output and one voice. We instead run **one persona generation per speaking agent** so each gets its own grounding, voice, and natural-tension behavior; the orchestrator only decides selection, ordering, and reactions.

---

## 5. Voice pipeline (the crux)

### 5.1 Turn-based, push-to-talk pipeline (recommended MVP)
Rationale: a roundtable is **turn-based**, not full-duplex. PTT + sequential generation is far more demo-reliable than open-mic interruption and lets us control voice identity per expert.

```
[User holds PTT] → mic audio
   → STT (Gemini transcription)  ── user_message text
   → Orchestrator.selectAgents(topic, transcript, panel) → [agentA, agentB, agentC]
   → for each agent (sequential):
        ctx = personaPrompt(agent)
            + retrieveGrounding(agent, topic)         // Superlinked embed+rerank
            + recentTranscript
            + debateDirective(intensity)
        text = Gemini.generate(ctx)                   // 2–3 sentences
        stream text → frontend (transcript appears live)
        audio = SLNG.tts(text, voiceProfile[agent])   // stream, sub-100ms TTFB
        stream audio ref → frontend playback queue
        roll = random()
        if roll < intensityThreshold(intensity):
            reactor = selectReactor(agent, transcript) // someone with a natural tension
            (repeat generation+tts for reactor, referencing agent's last line)
   → check hand-raisers → emit hand_raise events (no audio until user admits)
```

### 5.2 Why text→TTS rather than pure native-audio voice-to-voice
- **Voice identity:** 30 *distinct* experts need 30 distinguishable voices. SLNG voice profiles give controllable, repeatable identities; Gemini native-audio voices are limited and harder to map 1:1 to named people.
- **Attribution & transcript:** generating text first gives us the exact attributed transcript and the source material for visual cards for free.
- **Control:** we can enforce 2–3 sentence limits, inject "react to what X just said," and apply guardrails before any audio is synthesized.

> **Native-audio option (kept in back pocket):** for a single deep-dive answer to an @mentioned expert, Gemini Live native audio can be used to shave latency. Treated as an enhancement, not the core path.

### 5.3 Latency budget (target < 3 s to first audio per agent)
| Stage | Target | Notes |
|-------|--------|-------|
| STT of user PTT | ~300–600 ms | after release; can stream |
| Grounding retrieval (SIE embed+rerank) | < 150 ms | small local index, cached embeddings |
| Gemini first token | ~400–800 ms | short prompts, 2–3 sentence cap |
| Gemini full 2–3 sentences | ~1–1.5 s | stream text to UI immediately |
| SLNG TTS TTFB | < 100 ms | begin audio while text still streaming |
| **First audio out** | **< 3 s** | overlap stages; show "thinking…" shimmer |

Mitigations: parallelize retrieval with prompt assembly; start TTS on first sentence boundary; pre-generate a short "thinking" cue per voice; cap response length hard.

### 5.4 Audio playback (frontend)
Single sequential **playback queue**; only one agent audible at a time. Active speaker = glowing/pulsing avatar border. Transcript line renders as soon as text streams (before audio finishes) so the room never feels dead.

---

## 6. Orchestrator engine

### 6.1 Session state machine
```
LOBBY → CREATING (panel suggested, user edits) → IN_ROOM
IN_ROOM states:
  IDLE            ── waiting for user PTT or "continue debate"
  USER_SPEAKING   ── capturing PTT
  TRANSCRIBING    ── STT in flight
  SELECTING       ── orchestrator picks agents
  AGENT_TURN      ── generating + speaking (loops over selected agents + reactors)
  HAND_RAISE_WAIT ── showing raised hands, awaiting user admit/ignore
  IDLE ←──────────┘
END_SESSION → SUMMARY (generate summary + transcript export)
```

### 6.2 Agent selection (from `SYSTEM_PROMPTS.md` heuristics)
Inputs: user topic text, running transcript, active panel, debate intensity.
```
selectAgents(topic, transcript, panel):
  1. classify topic → category + specific tags (pricing, PLG, fundraising, design process, …)
  2. score each panel member: category match + specific-expertise match + recency penalty
     (don't pick the same agent twice in a row)
  3. pick top 2; ensure at least one DISSENTER (someone whose NATURAL TENSIONS conflict
     with the majority position) is included → 2–3 agents
  4. compute hand-raisers: high-scoring agents NOT selected → surface to user
```
The topic→agent mapping table in `SYSTEM_PROMPTS.md` (e.g. *Pricing → Madhavan lead, Elena counter, Andrew Wilkinson profitability*) seeds the classifier. Classification can be a fast Gemini call returning `{category, tags[]}` or a Superlinked embedding match of the topic against per-expert expertise vectors.

### 6.3 Debate intensity
| Level | Label | Reaction prob | Behavior directive injected into prompt |
|-------|-------|---------------|------------------------------------------|
| 1 | Collaborative | 20% | "Build on prior points; disagree only gently." |
| 2 | Balanced | 50% | "Respectfully challenge; offer alternatives." |
| 3 | Heated | 80% | "Actively debate; lean into your natural tensions; be direct but professional." |
After each agent, roll `random() < prob` → if true, pick a **reactor** who has a defined natural tension with the last speaker; reactor's prompt is told to reference the prior line. Slider is adjustable mid-session and takes effect on the next turn.

### 6.4 Hand-raising & user moderation
- **Hand-raise:** unselected high-relevance agents emit `hand_raise` events; UI shows "✋ [Name] wants to speak." User taps to admit → that agent speaks next.
- **@mention / direct address:** `@Name` or "what do you think, [Name]?" forces that agent to respond next, overriding selection.

### 6.5 Cross-referencing
Each agent prompt receives the recent transcript and is instructed to reference panelists by name ("I disagree with what Keith just said…"). This is what makes it read as a real debate.

---

## 7. Content grounding & RAG

### 7.1 Three-tier strategy (from `CONTENT_GROUNDING_STRATEGY.md`)
| Tier | Who | Method | Tokens | Storage |
|------|-----|--------|--------|---------|
| **1 Deep** | 5–6 demo experts | 15–20 real opinions/frameworks/stories extracted from transcripts, pasted into a `KNOWLEDGE BASE` prompt section | ~2000/expert | persona JSON |
| **2 Condensed** | remaining ~24 | 5–8 key positions distilled from Tavily search | ~500/expert | persona JSON |
| **3 Runtime (DeepWiki)** | any new expert | live Tavily search+extract → SIE clean+structure → persona generated on the fly | — | created at runtime |

### 7.2 Retrieval per turn
For larger grounded experts, we don't dump the whole knowledge base every turn. Instead:
```
retrieveGrounding(agent, topic):
  qvec = SIE.embed(topic + recentTranscript)
  hits = SIE.rerank(qvec, agent.groundingChunks, topK=4)   // instruction-following reranker
  return hits.text   // the most relevant 3–4 opinions for THIS question
```
This keeps prompts short (latency) and on-topic (a pricing question pulls pricing opinions). For Tier-1 experts with ~2000 tokens, retrieval is optional but improves focus at high panel counts.

### 7.3 Persona prompt structure (per `SYSTEM_PROMPTS.md`)
1. Identity & background → 2. Worldview → 3. Communication style → 4. Natural tensions → 5. **Knowledge base / known positions** (the grounding) → 6. Grounding rules (anti-hallucination) → 7. Roundtable behavior (2–3 sentences, cross-reference, etc.).

### 7.4 Anti-hallucination guardrail
Grounding rules in-prompt ("If you haven't covered it, say so; never invent metrics/quotes"). Optionally enforced with **Superlinked guardrail** (`granite-guardian`) as a post-generation check that flags fabricated specifics before TTS; on flag, regenerate with a stricter directive. MVP: prompt-level rules; guardrail call is a stretch enhancement.

---

## 8. DeepWiki — runtime expert indexing

### 8.1 Flow
```
User types "Jason Fried"
 → Tavily SEARCH: 3–5 queries
     ["Jason Fried startup advice", "Jason Fried frameworks opinions",
      "Jason Fried interview transcript", "Jason Fried essays", "37signals philosophy"]
 → Tavily EXTRACT: full text of top 10–15 results
 → Superlinked SIE document-to-markdown: clean each page → markdown
 → Superlinked SIE structured output (schema = PersonaRecord): extract
     worldview[], communicationStyle, naturalTensions[], knownPositions[]
 → assemble system prompt from template + generated sections
 → embed grounding chunks (SIE) → cache
 → emit new avatar card → appears in expert picker
```

### 8.2 Progress UX
`Searching… → Found N sources → Parsing content → Building persona → Avatar ready`, streamed over WebSocket. Target < 60 s. Demo tip (from battle plan): kick off the Tavily search *before* switching to the DeepWiki section so it feels instant.

### 8.3 Quality bar
Generated persona must include grounding rules and a "known positions" section so the new avatar behaves like Tier-2 experts, not a generic mask.

---

## 9. Expert roster & persona data model

30 experts across 6 categories (Product, Design, Growth, VC, Engineering, Founders) — full list in `BATTLE_PLAN_v2.md`. 26 are Lenny's Podcast guests (transcript archive is the primary content source); 4 are wider ecosystem (Paul Graham essays, Elad Gil handbook, Andrew Chen blog, Ryo Lu podcasts/posts).

### 9.1 PersonaRecord schema
```jsonc
{
  "id": "elena-verna",
  "name": "Elena Verna",
  "category": "growth",
  "title": "Head of Growth, Lovable",
  "tier": 1,
  "avatar": { "image": "/avatars/elena.png", "color": "#7C3AED" },
  "voiceProfile": {                       // SLNG
    "voiceId": "slng_voice_eleven",
    "pitch": 0, "pace": 1.05, "tone": "authoritative"
  },
  "expertiseTags": ["plg", "freemium", "activation", "pls", "monetization"],
  "naturalTensions": [                    // drives reactor selection
    { "with": "madhavan-ramanujam", "topic": "pricing" },
    { "with": "keith-rabois", "topic": "plg-at-enterprise" }
  ],
  "systemPrompt": "You are Elena Verna...",     // sections 1–4,6,7
  "groundingChunks": [                          // section 5, retrievable
    { "id": "ev-001", "topic": "freemium-vs-trial",
      "text": "Freemium is always better than trial for PLG...", "embedding": [/* cached */] }
  ]
}
```

### 9.2 Roster catalog (lobby/picker)
Lightweight list of `{id, name, category, title, avatar}` for the grid; full record loaded when an expert enters a room.

---

## 10. Room & session data models

```jsonc
// Room
{
  "roomId": "r_8x2",
  "topic": "Should I focus on product or sales?",
  "panel": ["elena-verna", "keith-rabois", "madhavan-ramanujam", "paul-graham"],
  "debateIntensity": 2,                  // 1|2|3
  "status": "in_room",                   // lobby|creating|in_room|ended
  "createdAt": 1719500000
}

// TranscriptEntry
{ "id":"t_001", "speaker":"elena-verna"|"user", "text":"...", "ts":..., "refersTo":"t_000"? }

// VisualCard
{ "id":"c_001", "type":"takeaway"|"framework"|"action_item",
  "text":"Barrels vs ammo", "attribution":"keith-rabois", "ts":... }

// HandRaise
{ "agentId":"casey-winters", "reason":"growth loops", "ts":... }

// SessionSummary (on end)
{ "roomId":"r_8x2", "summary":"...", "keyTakeaways":[...], "transcript":[TranscriptEntry] }
```
MVP persistence: in-memory map keyed by `roomId`, optional JSON snapshot to disk. No DB.

---

## 11. API & WebSocket contract

### 11.1 REST
| Method | Path | Body → Returns |
|--------|------|----------------|
| `GET` | `/api/experts` | → roster catalog |
| `POST` | `/api/rooms/suggest-panel` | `{ topic }` → `{ panel[], rationale }` |
| `POST` | `/api/rooms` | `{ topic, panel, intensity }` → `{ roomId }` |
| `GET` | `/api/rooms` | → lobby list |
| `POST` | `/api/deepwiki/index` | `{ name }` → `{ jobId }` (progress via WS) |

### 11.2 WebSocket (`/ws/rooms/:roomId`)
**Client → server**
```jsonc
{ "type":"user_utterance", "audio": <stream> | "text": "..." }
{ "type":"set_intensity", "level": 3 }
{ "type":"mention", "agentId":"paul-graham", "text":"should I raise funding?" }
{ "type":"admit_hand", "agentId":"casey-winters" }
{ "type":"end_session" }
```
**Server → client**
```jsonc
{ "type":"speaker_state", "agentId":"elena-verna", "state":"speaking"|"done" }
{ "type":"transcript", "entry": TranscriptEntry }          // streamed, may be partial
{ "type":"audio", "agentId":"elena-verna", "url": "...", "seq": 3 }
{ "type":"hand_raise", "handRaise": HandRaise }
{ "type":"card", "card": VisualCard }
{ "type":"deepwiki_progress", "jobId":"...", "stage":"parsing", "found": 15 }
{ "type":"summary", "summary": SessionSummary }
```

---

## 12. Frontend (screens & components)

### 12.1 Screen 1 — Lobby
Grid of room cards (topic, expert avatars, participant count) + "Create Room."

### 12.2 Screen 2 — Create Room flow
1. Free-text problem (1–2 sentences). 2. `suggest-panel` → 4–5 experts with "why these experts" rationale. 3. Swap experts (tap → alternatives from same/other category). 4. Debate-intensity slider. 5. "Start Session."

### 12.3 Screen 3 — Room View (hero)
- **Avatar panel:** circular avatars in roundtable arrangement; active speaker glows; user mic seat in center.
- **Live transcript:** agent-attributed, streams in real time; "✋ [Name] wants to speak" inline.
- **Visual cards sidebar:** key takeaways / frameworks / action items, attributed, updating live.
- **Controls:** large push-to-talk button; @mention bar; debate slider (adjustable mid-session); "End Session → Summary + Transcript."

### 12.4 Screen 4 — DeepWiki builder
Name input → streamed progress UI → new avatar card lands in the picker.

### 12.5 Frontend state
WebSocket-driven store: `speakerState`, `transcript[]`, `cards[]`, `handRaises[]`, `audioQueue[]`, `intensity`. Audio queue plays sequentially; transcript and cards are append-only.

---

## 13. Visual cards generation
After every 3–4 agent responses, a lightweight Gemini call extracts: named frameworks ("Barrels vs Ammo", "PLG", "Proven/Better/New"), action items, and key takeaways — each with speaker attribution — and pushes `card` events. Runs async so it never blocks the voice turn.

---

## 14. Session output
On `end_session`: generate a structured **summary** (problem, positions per expert, points of agreement/disagreement, recommended next steps) + **full attributed transcript** + the accumulated **takeaway cards**. Exportable (copy / download). This is the user's takeaway value.

---

## 15. Non-functional requirements & demo reliability
| Area | Requirement |
|------|-------------|
| Latency | < 3 s to first audio/agent; full 3-agent turn with no dead air |
| Reliability | Pre-cache the scripted demo scenario; recorded backup video; "thinking" audio cue |
| Distinctiveness | Unique SLNG voice + color + avatar per expert |
| Rate limits | Cache demo turns; throttle DeepWiki; pre-warm Tavily search |
| Fidelity | Grounding rules in every prompt; (stretch) SIE guardrail pass |
| Privacy posture (sponsor story) | Superlinked SIE keeps grounding prompts/documents in our own cloud |

---

## 16. Tech stack
| Layer | Tool |
|-------|------|
| Frontend | Next.js + React, WebSocket client, Web Audio playback |
| Voice brain | Gemini Live API (text + optional native audio) |
| Voice infra | SLNG (per-expert TTS) |
| Content acquisition | Tavily (search + extract) |
| Inference / RAG | Superlinked SIE (embed, rerank, doc→markdown, structured output, guardrail) |
| Orchestration | Custom Node.js server |
| Storage (MVP) | In-memory + JSON; cached embeddings |
| Coding help | Devin |

---

## 17. Build plan (maps to the 8-hour battle plan)
| Block | Deliverable | Milestone |
|-------|-------------|-----------|
| Hrs 1–2 | Load 30 prompts; orchestrator (selection, turn-taking, intensity); SIE retrieval; 3-agent text chat in terminal | Working text multi-agent conversation |
| Hrs 3–4 | Gemini voice + SLNG per-expert voices; PTT; latency tuning | Agents speak aloud, distinct voices |
| Hrs 5–6 | Room View, transcript, cards, slider, @mention/hand-raise, create flow, lobby; (if time) Tavily DeepWiki | Demo-ready UI with live data |
| Hrs 7–8 | Rehearse scenario ×3, record 3–3.5 min demo, polish, fallback | Recorded + live demo ready |

Grounding work (parallel, per `CONTENT_GROUNDING_STRATEGY.md`): Tier-1 deep grounding for the 6 demo experts first (~2–3 h); Tier-2 condensed for the rest if time; everyone else runs on skeleton prompts (fine — they're cosmetic in the roster).

---

## 18. Risks & mitigations
| Risk | Mitigation |
|------|------------|
| Voice latency kills demo | PTT, 2–3 sentence cap, pre-gen "thinking" audio, overlap stages |
| Agents sound similar | SLNG distinct voices + color/avatar differentiation |
| Debate feels fake | Natural tensions baked into prompts; reactor selection uses them |
| Wrong panel suggestion | 2–3 pre-tested topic→panel mappings for demo |
| Rate limits mid-demo | Cache scenario; recorded backup |
| Agent says something the real person wouldn't | Grounding rules + (stretch) SIE guardrail |
| DeepWiki too slow | Start Tavily search before switching screens; cap sources |

---

## 19. Open questions / decisions needed
1. **SLNG access & voice catalog** — do we have API keys + enough distinct voices to map ~6 demo experts (ideally 30)? Fallback TTS if not?
2. **Gemini Live quota** — concurrent sessions / rate limits for multi-agent turns during a live demo?
3. **Superlinked SIE hosting** — managed grant vs. self-host on our cloud for the hackathon? GPU availability for embed/rerank/OCR?
4. **Lenny's transcript archive** — confirm we can download/use the Dropbox archive for grounding extraction.
5. **STT choice** — Gemini transcription vs. SLNG vs. browser SpeechRecognition for PTT input?
6. **Demo scenario lock** — which exact topic + panel + intensity do we hard-rehearse? (Battle plan suggests the restaurant-inventory B2B SaaS scenario.)
7. **Product name** — TBD per battle plan; needed for lobby/branding.

---

## 20. Post-hackathon / production roadmap
| Theme | What changes from MVP |
|-------|------------------------|
| **Multi-user & rooms** | Real concurrency; Clubhouse-style audiences who can listen and request to speak; presence/state sync (e.g. a realtime backend). |
| **Auth & accounts** | Login, profiles, saved rooms & transcripts. |
| **Persistence** | Real DB for rooms, transcripts, personas; vector store for grounding (SIE embeddings persisted). |
| **Full 30+ grounding** | All experts at Tier-1 depth; continuous re-indexing of new content; freshness jobs. |
| **DeepWiki at scale** | Caching, dedup, quality scoring, moderation of scraped content; legal/likeness review. |
| **Full-duplex voice** | Native-audio interruption/barge-in; overlapping speech handling; smarter VAD. |
| **Mobile** | Responsive + native app. |
| **Likeness & rights** | Consent/licensing model for using real people's voices and content; disclaimers; opt-out. |
| **Safety** | Stronger guardrails, citation surfacing ("source: episode X"), hallucination monitoring. |
| **Monetization** | Subscriptions, premium panels, team workspaces. |
| **Document upload (deferred MVP feature)** | Ground a session in the user's own deck/docs alongside experts. |

---

## Appendix A — Orchestrator system prompt (from `SYSTEM_PROMPTS.md`)
Turn-taking rules, debate-intensity mapping, and the topic→agent table are specified verbatim in `SYSTEM_PROMPTS.md` (§ Orchestrator Instructions) and are the source of truth for §6.

## Appendix B — Grounding example
`CONTENT_GROUNDING_STRATEGY.md` contains a full Elena Verna before/after (skeleton vs. grounded) that is the template for all Tier-1 knowledge bases.
