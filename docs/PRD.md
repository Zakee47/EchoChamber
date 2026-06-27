# EchoChamber -- Product Requirements Document

> **Version:** 1.0  
> **Status:** Living document  
> **Last updated:** 2026-06-27  
> **Source material:** `BATTLE_PLAN_v2.md`, `EXPERT_ROUNDTABLE_TECHNICAL_PRD.md`, `CONTENT_GROUNDING_STRATEGY_COMPLETE.md`, `SYSTEM_PROMPTS.md`, merged PRs #1--#5, implemented codebase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision and Goals](#3-product-vision-and-goals)
4. [Target Users and Personas](#4-target-users-and-personas)
5. [Core Concepts and Glossary](#5-core-concepts-and-glossary)
6. [System Architecture](#6-system-architecture)
7. [Monorepo Structure](#7-monorepo-structure)
8. [Expert Roster and Persona Data Model](#8-expert-roster-and-persona-data-model)
9. [Content Grounding Strategy (Three-Tier)](#9-content-grounding-strategy-three-tier)
10. [Voice Pipeline](#10-voice-pipeline)
11. [Orchestrator Engine](#11-orchestrator-engine)
12. [DeepWiki -- Runtime Expert Indexing](#12-deepwiki----runtime-expert-indexing)
13. [API and WebSocket Contract](#13-api-and-websocket-contract)
14. [Frontend Screens and UX](#14-frontend-screens-and-ux)
15. [Adapter Pattern and Vendor Integration](#15-adapter-pattern-and-vendor-integration)
16. [Data Models](#16-data-models)
17. [Non-Functional Requirements](#17-non-functional-requirements)
18. [Implementation Status](#18-implementation-status)
19. [Known Limitations and Open Questions](#19-known-limitations-and-open-questions)
20. [Production Roadmap](#20-production-roadmap)
21. [Risk Mitigations](#21-risk-mitigations)
22. [Appendix A -- Expert Roster (30 Experts)](#appendix-a----expert-roster-30-experts)
23. [Appendix B -- Demo Script](#appendix-b----demo-script)
24. [Appendix C -- Environment and Configuration](#appendix-c----environment-and-configuration)

---

## 1. Executive Summary

EchoChamber is a **multi-agent AI platform** that delivers real-time, voice-based roundtable discussions between AI-generated digital twins of real startup experts and human users. Think "Clubhouse for AI advisors" -- a user describes a startup problem, the platform assembles a panel of 4--5 expert avatars (Paul Graham, Elena Verna, Keith Rabois, etc.), and those avatars **debate each other and the user in real time** using distinct voices, grounded in each expert's real published content.

**The pitch (30 seconds):**

> "Imagine walking into a room with Elena Verna, Paul Graham, Ryo Lu, Brian Chesky, and Boris Cherny -- all at once -- to discuss YOUR startup problem. They debate each other, challenge your assumptions, and give you advice grounded in everything they've ever published. Any expert, any combination, any problem. That's what we built."

The platform distinguishes itself through:
- **Grounded personas** -- not generic LLM masks, but avatars that cite real frameworks, opinions, and stories from each expert's actual published content
- **Multi-agent debate** -- experts actively disagree, reference each other by name, and surface philosophical tensions (e.g., Elena Verna vs. Madhavan Ramanujam on freemium vs. pricing)
- **User-controlled debate intensity** -- a slider from Collaborative to Heated that visibly changes confrontation behavior mid-session
- **DeepWiki** -- index any new expert on demand from their public content in under 60 seconds

---

## 2. Problem Statement

Early-stage founders and operators face a critical gap: they need **high-quality, conflicting advice** from experienced practitioners, but world-class advisors are inaccessible, expensive, and rarely disagree with each other in front of you. Existing AI assistants provide single-perspective, generic answers that lack the nuance, tension, and attribution that make real advisory conversations valuable.

**Core insight:** a single LLM impersonating 5 experts produces homogenized, low-tension output with one voice. EchoChamber solves this by running **one persona-grounded generation per speaking agent**, giving each its own retrieved context, voice profile, and natural-tension behavior -- the orchestrator only decides selection, ordering, and reactions.

---

## 3. Product Vision and Goals

### 3.1 MVP Goals

| # | Goal | Success Criterion |
|---|------|-------------------|
| G1 | Multi-agent voice roundtable that feels real | 3--5 distinct expert voices respond to a prompt in a single turn, referencing each other |
| G2 | Grounded personas (not generic LLM) | Tier-1 experts cite their real frameworks/positions verbatim from source content |
| G3 | Controllable debate | Intensity slider visibly changes agreement vs. confrontation behavior mid-session |
| G4 | Demo-reliable latency | < 3s to first audio per agent turn; full turn (3 agents) playable without dead air |
| G5 | DeepWiki "wow" | New expert indexed from a name to a usable avatar card in < 60s |
| G6 | Session value | End session produces summary + attributed transcript + takeaway cards |

### 3.2 MVP Non-Goals

- Authentication/login (hardcoded demo user)
- Persistent database (in-memory + JSON)
- Mobile responsiveness (desktop only)
- Multiple concurrent users
- Payments/subscription
- Onboarding flow
- Document upload (deferred to post-MVP)
- Cross-session history

---

## 4. Target Users and Personas

| User | Need | How EchoChamber Serves It |
|------|------|---------------------------|
| **Early-stage founder** | World-class, conflicting advice on a specific problem | Picks a panel, hears experts debate their actual situation with grounded positions |
| **Operator / PM / designer** | A "second opinion" from named thought leaders | Topic-based panel suggestion, @mention to call on a specific expert |
| **Hackathon judges (demo)** | See the wow in 3 minutes | Pre-tested scenario, heated debate mode, DeepWiki live indexing |

---

## 5. Core Concepts and Glossary

| Term | Definition |
|------|-----------|
| **Orchestrator** | Central Node.js server managing turn-taking, agent selection, debate flow, and real-time WebSocket communication |
| **PersonaRecord** | Comprehensive data schema for an expert avatar -- identity, voice profile, system prompt, grounding chunks, natural tensions |
| **Grounding** | Anchoring AI responses in verified expert content (real opinions, frameworks, stories) rather than generic LLM knowledge |
| **Grounding Chunk** | A retrievable unit of real content -- one opinion, framework, or story from an expert's actual published work |
| **Debate Intensity** | User-controlled slider (1=Collaborative, 2=Balanced, 3=Heated) controlling reaction probability and prompt tone |
| **Natural Tension** | Pre-defined philosophical conflict between two specific experts on a topic (e.g., Elena vs. Madhavan on pricing) |
| **Reactor** | Agent triggered to spontaneously challenge the current speaker based on natural tensions and intensity probability |
| **Hand-Raising** | UI signal where unselected but relevant agents request a turn; user taps to admit |
| **DeepWiki** | Automated pipeline for building new expert personas on-demand by scraping public content (Tavily) and generating a structured persona (SIE/Gemini) |
| **Visual Cards** | Auto-extracted frameworks, takeaways, and action items shown in a sidebar during the session |
| **AdapterBundle** | Interface-first pattern bundling all external service adapters (LLM, STT, TTS, Grounding, DeepWiki), enabling mock vs. real mode switching |
| **Expert Tier** | Ranking system for depth of grounding: Tier 1 (deep, ~2000 tokens), Tier 2 (condensed, ~500 tokens), Tier 3 (runtime-generated via DeepWiki) |
| **PTT (Push-to-Talk)** | User input model -- hold to speak, release to send |
| **SpeakerState** | Agent lifecycle: `thinking` -> `speaking` -> `done` |
| **SLNG** | External TTS service providing distinct, low-latency voice profiles per expert |
| **Superlinked SIE** | Self-hosted inference engine for embeddings, reranking, doc cleanup, structured output, and content guardrails |

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
+----------------------------------------------------------------------+
|                     Next.js Frontend (desktop)                        |
|  Lobby - Create-Room flow - Room View (avatars, transcript, cards)    |
|  Push-to-talk capture - debate slider - @mention - hand-raise         |
+----------^--------------------------------------------+--------------+
           | WebSocket (events: transcript, audio refs, | REST (rooms,
           | speaker state, cards, hand-raises)         | panel suggest,
           |                                            | DeepWiki)
+----------+--------------------------------------------v--------------+
|                  Orchestration Server (Node.js)                       |
|  +------------+  +-------------+  +--------------+ +----------------+ |
|  | Turn-taking|  | Agent select|  | Debate-intens| | Visual-cards   | |
|  |  engine    |  |  heuristics |  |  reaction rng| |  extractor     | |
|  +-----+------+  +------+------+  +------+-------+ +-------+--------+ |
|        |  per-agent context (persona + grounding + transcript)        |
+---------+----------------+----------------+---------------------+-----+
          |                |                |                     |
    +-----v-----+   +------v------+   +-----v------+   +---------v------+
    | Gemini    |   | Superlinked |   |   SLNG     |   |  Tavily        |
    | (LLM +   |   | SIE: embed, |   |  TTS per-  |   |  search+extract|
    | STT)     |   | rerank, OCR,|   |  expert    |   |  (DeepWiki)    |
    |           |   | structured, |   |  voice     |   |                |
    |           |   | guardrail   |   |            |   |                |
    +-----------+   +------+------+   +------------+   +----------------+
                           |
                  +--------v---------+
                  | Persona Store     |  (JSON files + in-memory index;
                  | + grounding chunks|   embeddings cached for retrieval)
                  +-------------------+
```

### 6.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Frontend (Next.js + React)** | Renders 4 screens (lobby, create, room, DeepWiki); owns audio playback queue and PTT mic capture; communicates over a single WebSocket for live session events and REST for setup actions |
| **Orchestration Server (Node.js + Express + ws)** | The brain that decides who speaks, in what order, and how combatively; holds room state in memory; streams events to the frontend |
| **Persona Store** | 30 persona records (JSON), each with system prompt + grounding chunks; 6 demo experts have deep Tier-1 grounding; embeddings cached for retrieval |
| **Inference Adapters** | Thin clients wrapping Gemini (LLM/STT), SLNG (TTS), Tavily (search/extract), and Superlinked SIE (embed/rerank/structured output/guardrails) behind stable interfaces |

### 6.3 Design Rationale: Why an Orchestrator (Not One Mega-Prompt)

A single LLM impersonating 5 people produces homogenized, low-tension output and one voice. EchoChamber instead runs **one persona generation per speaking agent** so each gets:
- Its own grounding context (retrieved per-turn by topic relevance)
- Its own voice profile (via SLNG)
- Its own natural-tension behavior (reactor selection)

The orchestrator only decides selection, ordering, and reactions.

---

## 7. Monorepo Structure

```
echochamber/
  packages/shared/       @echochamber/shared     Types + REST/WS contract + adapter interfaces (DO NOT FORK)
  packages/voice/        @echochamber/voice      Gemini (LLM+STT) + SLNG (TTS) adapters
  packages/grounding/    @echochamber/grounding  Superlinked SIE retrieval + persona assembly
  packages/deepwiki/     @echochamber/deepwiki   Tavily + SIE runtime expert indexing
  apps/server/           @echochamber/server     Orchestrator: turn-taking, agent selection, WS
  apps/web/              @echochamber/web        Next.js web app (lobby, create-room, room view, DeepWiki)
  data/personas/         roster.json + grounded knowledge bases
  docs/                  PRD, battle plan, system prompts, grounding strategy
```

**Golden rule:** the contract in `@echochamber/shared` is the single source of truth. All workstreams implement the interfaces; no one changes their shapes without coordinating.

---

## 8. Expert Roster and Persona Data Model

### 8.1 Roster Overview

30 experts across 6 categories, primarily sourced from Lenny's Podcast guests (26) plus 4 wider-ecosystem experts:

| Category | Experts |
|----------|---------|
| **Product** (5) | Lenny Rachitsky, Shreyas Doshi, Melissa Perri, Cat Wu, Nikhyl Singhal |
| **Design** (5) | Jenny Wen, Ryo Lu*, Ryo Lu, Max Schoening, Dylan Field, Scott Belsky |
| **Growth** (5) | Elena Verna*, Amol Avasare, Casey Winters, Andrew Chen, Madhavan Ramanujam |
| **VCs/Investors** (5) | Keith Rabois*, Sam Lessin, Paul Graham*, Elad Gil, Andrew Wilkinson |
| **Engineering** (5) | Guillermo Rauch, Fiona Fung, Boris Cherny*, Scott Wu, Michael Truell |
| **Founders/CEOs** (5) | Brian Chesky, Evan Spiegel, Eric Ries*, Mark Pincus, Melanie Perkins |

\* = Tier-1 deep-grounded demo expert (6 total)

### 8.2 PersonaRecord Schema

```typescript
interface PersonaRecord {
  id: string;                    // e.g. "elena-verna"
  name: string;                  // "Elena Verna"
  category: ExpertCategory;      // "growth"
  title: string;                 // "Head of Growth, Lovable"
  tier: GroundingTier;           // 1 | 2 | 3
  avatar: {
    image?: string;              // "/avatars/elena.png"
    color: string;               // "#10B981"
    initials: string;            // "EV"
  };
  voiceProfile: VoiceProfile;    // SLNG voice config
  expertiseTags: string[];       // ["plg", "freemium", "activation", "pls"]
  naturalTensions: NaturalTension[];  // drives reactor selection
  systemPrompt: string;          // 7-section persona prompt
  groundingChunks: GroundingChunk[];  // retrievable real positions
  generated?: boolean;           // true for DeepWiki-created personas
}
```

### 8.3 System Prompt Structure (per expert)

Every expert's system prompt follows a consistent 7-section structure:

1. **Identity & Background** -- who they are, where they've worked
2. **Worldview** -- core beliefs that drive their advice (5--7 bullets)
3. **Communication Style** -- how they sound, speech patterns, catchphrases
4. **Natural Tensions** -- who they disagree with and why (drives reactor selection)
5. **Knowledge Base / Known Positions** -- the grounding (Tier 1: ~2000 tokens of real opinions; Tier 2: ~500 tokens of condensed positions)
6. **Grounding Rules** -- anti-hallucination directives ("If you haven't spoken about that, say so; never invent metrics/quotes")
7. **Roundtable Behavior** -- how to act in multi-agent discussions (2--3 sentences, cross-reference, etc.)

### 8.4 Tier-1 Demo Experts (Deep Grounding)

These 6 experts have full, hand-curated knowledge bases (~15--20 real opinions per expert) extracted from podcast transcripts and essays:

| Expert | Category | Key Grounding Areas |
|--------|----------|-------------------|
| **Elena Verna** | Growth | PLG, freemium vs. trial, product-led sales, AI-native growth at Lovable |
| **Keith Rabois** | VC | Barrels vs. ammunition, talent/hiring, ugly babies thesis, PM role dying, operating tempo |
| **Paul Graham** | VC | Do things that don't scale, founder mode, schlep blindness, superlinear returns |
| **Ryo Lu** | Design | "It's all the same thing," soulful software vs. AI slop, getting close to the material, ryOS |
| **Eric Ries** | Founder | Lean Startup in the AI era, financial gravity, governance (Long-Term Benefit Trust), conviction vs. validation |
| **Boris Cherny** | Engineering | Coding is solved, 100% AI-written code, parallel agents, three principles, Claude Code origin |

**Natural tension matrix (demo room):**
- Elena vs. Keith on PLG at enterprise scale
- Elena vs. Madhavan on freemium vs. pricing
- Paul Graham vs. Eric Ries on conviction vs. validation
- Ryo Lu vs. Boris Cherny on design/craft vs. pure AI automation
- Keith vs. Elena on whether to talk to customers
- Eric Ries vs. Paul Graham/Keith on founder mode vs. lean methodology

---

## 9. Content Grounding Strategy (Three-Tier)

### 9.1 The Problem

A system prompt without real opinions is a costume, not a person.

**Without grounding:**
> User: "Should I go freemium or paid trial?"  
> Elena agent: "I generally recommend freemium for most B2B companies..." *(generic LLM wearing an Elena mask)*

**With grounding:**
> User: "Should I go freemium or paid trial?"  
> Elena agent: "Freemium. Always. Here's why -- at SurveyMonkey, we tested this extensively. Trials create urgency, but urgency is the wrong emotion for product-led growth. You want habit formation, not deadline pressure. Miro didn't hire their first salesperson until $5-7M ARR because the free product was doing the selling." *(Elena's ACTUAL position from Lenny's Podcast)*

### 9.2 Three Tiers

| Tier | Who | Method | Tokens/Expert | Implementation |
|------|-----|--------|---------------|----------------|
| **Tier 1: Deep** | 6 demo experts | 15--20 real opinions/frameworks/stories extracted from transcripts, pasted into KNOWLEDGE BASE prompt section | ~2000 | Pre-curated, committed as grounding JSON; retrievable per-turn via SIE embed+rerank |
| **Tier 2: Condensed** | Remaining 24 experts | 5--8 key positions distilled from Tavily search at prep time | ~500 | Pre-generated KNOWN POSITIONS section in system prompt |
| **Tier 3: Runtime (DeepWiki)** | Any new expert | Live Tavily search+extract -> SIE doc-to-markdown -> SIE/Gemini structured output -> persona generated on the fly | Dynamic | Created at runtime; emitted as DeepWiki progress events |

### 9.3 Retrieval Per Turn

For Tier-1 experts with large grounding knowledge bases, context is **retrieved per-turn** rather than dumped entirely:

```
retrieveGrounding(agent, topic):
  qvec = SIE.embed(topic + recentTranscript)
  hits = SIE.rerank(qvec, agent.groundingChunks, topK=4)
  return hits.text   // the most relevant 3-4 opinions for THIS question
```

This keeps prompts short (latency) and on-topic (a pricing question pulls pricing opinions, not career stories).

### 9.4 Content Sources

- **26 of 30 experts:** Lenny's Podcast transcripts (public Dropbox archive, 10,000--20,000 words per expert)
- **Paul Graham:** paulgraham.com essays (200+ public essays)
- **Elad Gil:** High Growth Handbook + blog
- **Andrew Chen:** andrewchen.com blog + "The Cold Start Problem"
- **Ryo Lu:** Dialectic podcast, a16z podcast, LinkedIn posts, 12 Golden Rules

### 9.5 Extraction Process

For each expert, these are extracted from source material:
1. **Strong opinions** -- definitive statements ("Freemium. Always.")
2. **Signature frameworks** -- named models (Barrels vs. Ammunition, LNO, PLG)
3. **Specific stories** -- real examples from their experience ("When I was at Miro, we...")
4. **Contrarian takes** -- where they disagree with conventional wisdom
5. **Specific advice** -- tactical recommendations ("Don't hire a VP of Sales until $10M ARR")

### 9.6 Anti-Hallucination Guardrails

- **Prompt-level:** grounding rules in every system prompt ("If you haven't covered it, say so; never invent metrics/quotes; flag when you're extrapolating")
- **Post-generation (stretch):** Superlinked guardrail (`granite-guardian`-based) as a post-gen check that flags fabricated specifics before TTS; on flag, regenerate with stricter directive. Currently prompt-level only in MVP.

---

## 10. Voice Pipeline

### 10.1 Turn-Based, Push-to-Talk Pipeline

The roundtable is **turn-based**, not full-duplex. PTT + sequential generation is far more demo-reliable than open-mic interruption and enables distinct per-expert voice identity.

```
[User holds PTT] -> mic audio
  -> STT (Gemini transcription)  -- user_message text
  -> Orchestrator.selectAgents(topic, transcript, panel) -> [agentA, agentB, agentC]
  -> for each agent (sequential):
       ctx = personaPrompt(agent)
           + retrieveGrounding(agent, topic)         // Superlinked embed+rerank
           + recentTranscript
           + debateDirective(intensity)
       text = Gemini.generate(ctx)                   // 2-3 sentences
       stream text -> frontend (transcript appears live)
       audio = SLNG.tts(text, voiceProfile[agent])   // stream, sub-100ms TTFB
       stream audio ref -> frontend playback queue
       roll = random()
       if roll < intensityThreshold(intensity):
           reactor = selectReactor(agent, transcript) // someone with a natural tension
           (repeat generation+tts for reactor, referencing agent's last line)
  -> check hand-raisers -> emit hand_raise events (no audio until user admits)
```

### 10.2 Why Text-to-TTS (Not Pure Native Audio)

| Reason | Explanation |
|--------|-------------|
| **Voice identity** | 30 distinct experts need 30 distinguishable voices. SLNG voice profiles are controllable and repeatable; Gemini native-audio voices are limited. |
| **Attribution & transcript** | Generating text first gives exact attributed transcript and source material for visual cards for free. |
| **Control** | Can enforce 2--3 sentence limits, inject "react to what X just said," and apply guardrails before audio is synthesized. |

> **Native-audio option (back pocket):** for a single deep-dive answer to an @mentioned expert, Gemini Live native audio can shave latency. Treated as an enhancement, not the core path.

### 10.3 Latency Budget (Target: < 3s to First Audio Per Agent)

| Stage | Target | Notes |
|-------|--------|-------|
| STT of user PTT | ~300--600ms | After release; can stream |
| Grounding retrieval (SIE embed+rerank) | < 150ms | Small local index, cached embeddings |
| Gemini first token | ~400--800ms | Short prompts, 2--3 sentence cap; `gemini-3.5-flash` with thinking disabled |
| Gemini full 2--3 sentences | ~1--1.5s | Stream text to UI immediately |
| SLNG TTS TTFB | < 100ms | Begin audio while text still streaming |
| **First audio out** | **< 3s** | Overlap stages; show "thinking" shimmer |

**Mitigations:** parallelize retrieval with prompt assembly; start TTS on first sentence boundary; pre-generate a short "thinking" cue per voice; cap response length.

### 10.4 Audio Playback (Frontend)

Single sequential **playback queue**; only one agent audible at a time. Active speaker = glowing/pulsing avatar border. Transcript line renders as soon as text streams (before audio finishes) so the room never feels dead. Mock mode uses Web Audio-synthesized tones.

### 10.5 Implemented Adapters

| Adapter | Implementation | Status |
|---------|---------------|--------|
| **Gemini LLM** (`createGeminiLLM`) | `@google/genai` SDK, `gemini-3.5-flash`, thinking disabled (`thinkingBudget: 0`); `generate()`, `generateStream()`, `classifyTopic()` | Working (~800ms TTFT streaming, ~950ms classify) |
| **Gemini STT** (`createGeminiSTT`) | `gemini-3.5-flash` multimodal; sends audio as inline base64 | Working |
| **SLNG TTS** (`createSlngTTS`) | Maps VoiceProfile to SLNG request params; tries multiple endpoint paths; handles JSON-URL and binary responses | Implemented; SLNG API returning 404 on all candidate TTS endpoints -- adapter ready, awaiting correct `SLNG_BASE_URL` |

---

## 11. Orchestrator Engine

### 11.1 Session State Machine

```
LOBBY -> CREATING (panel suggested, user edits) -> IN_ROOM
IN_ROOM states:
  IDLE            -- waiting for user PTT or "continue debate"
  USER_SPEAKING   -- capturing PTT
  TRANSCRIBING    -- STT in flight
  SELECTING       -- orchestrator picks agents
  AGENT_TURN      -- generating + speaking (loops over selected agents + reactors)
  HAND_RAISE_WAIT -- showing raised hands, awaiting user admit/ignore
  IDLE <----------/
END_SESSION -> SUMMARY (generate summary + transcript export)
```

### 11.2 Agent Selection Algorithm

```
selectAgents(topic, transcript, panel):
  1. classify topic -> category + specific tags
     (pricing, PLG, fundraising, design process, ...)
  2. score each panel member:
       category match + specific-expertise match + topic-map boost
       - no-repeat penalty (don't pick same agent twice in a row)
  3. pick top 2; ensure at least one DISSENTER
     (someone whose naturalTensions conflict with the majority position)
     -> 2-3 agents
  4. compute hand-raisers:
     high-scoring agents NOT selected -> surface to user
```

The topic-to-agent mapping table (e.g., *Pricing -> Madhavan lead, Elena counter, Andrew Wilkinson profitability*) seeds the classifier. Classification uses a fast Gemini call returning `{category, tags[]}`.

### 11.3 Panel Suggestion Algorithm

```
User describes topic -> Extract keywords ->
  1. Match keywords to CATEGORY (growth, product, design, VC, eng, founder)
  2. Select 2 agents from primary category
  3. Select 1-2 agents from adjacent categories that create tension
  4. Select 1 "wildcard" agent who brings unexpected perspective
  5. Present suggested panel to user with "Why these experts" rationale
```

### 11.4 Debate Intensity System

| Level | Label | Reaction Prob | Behavior Directive Injected Into Prompt |
|-------|-------|---------------|----------------------------------------|
| 1 | **Collaborative** | 20% | "Build on prior points; disagree only gently and find common ground." |
| 2 | **Balanced** | 50% | "Respectfully challenge weak assumptions and offer concrete alternatives." |
| 3 | **Heated** | 80% | "Actively debate. Lean into your natural tensions, name who you disagree with, and be direct but professional." |

After each agent speaks, the system rolls `random() < reactionProbability`. If true, it selects a **reactor** -- an agent with a defined natural tension with the last speaker. The reactor's prompt is instructed to reference the prior agent's last statement.

The slider is adjustable **mid-session** and takes effect on the next turn.

### 11.5 Turn Engine (Implemented)

```
runTurn(topic, forced?):
  apply pendingIntensity            // set_intensity takes effect next turn
  selected = forced ? [forced] : selectAgents(...)
  for persona in selected:                               // sequential
    entry = runAgentResponse(persona)                    // thinking->speaking->done
      ctx  = assembleContext(persona, grounding.retrieve, transcript, directive)
      for delta in llm.generateStream(ctx): emit transcript{partial:true}
      emit transcript{partial:false}; tts.synthesize -> emit audio
    if random() < INTENSITY[level].reactionProbability:
      reactor = selectReactor(lastSpeaker, panel, recentSpeakers)
      runAgentResponse(reactor, refersTo=entry)          // references prior line
    maybeEmitCards()                                      // every 3-4 responses, async
  recentSpeakers = thisTurnSpeakers                      // feeds no-repeat penalty
```

### 11.6 Context Assembly (Per Agent)

For each agent turn, the context prompt is assembled from:
1. **Persona system prompt** (sections 1--4, 6, 7)
2. **Retrieved grounding** (`grounding.retrieve(topic + recent transcript, persona.chunks, topK=4)`)
3. **Recent transcript** (last N entries for cross-referencing)
4. **Debate directive** (`INTENSITY[level].directive`)
5. **React-to instruction** (if this is a reactor: "Reference and challenge what [Agent] just said about...")

### 11.7 Hand-Raising and User Moderation

- **Hand-raise:** unselected high-relevance agents emit `hand_raise` events; UI shows "X wants to speak." User taps to admit -> that agent speaks next.
- **@mention / direct address:** user types `@Name` or "what do you think, [Name]?" -> forces that agent to respond next, overriding selection.
- **`set_intensity`:** applies on the next turn.
- **`continue_debate`:** triggers a new turn without user audio input.

### 11.8 Visual Cards Generation

After every 3--4 agent responses, an async LLM call extracts:
- Named frameworks ("Barrels vs Ammo", "PLG", "Proven/Better/New")
- Action items
- Key takeaways

Each card is attributed to the speaker and pushed via `card` events. The extraction runs asynchronously and never blocks the voice turn. In mock mode, deterministic fallback cards are generated.

### 11.9 Session Summary

On `end_session`, the orchestrator generates a structured summary:
- Problem statement
- Per-expert positions (what each expert argued)
- Points of agreement
- Points of disagreement
- Recommended next steps
- Key takeaways
- Full attributed transcript

Exportable via copy/download from the frontend.

---

## 12. DeepWiki -- Runtime Expert Indexing

### 12.1 Pipeline

```
User types "Jason Fried"
  |-> emit("searching")
  |     Tavily SEARCH: 5 queries
  |       ["Jason Fried startup advice", "Jason Fried frameworks opinions",
  |        "Jason Fried interview transcript", "Jason Fried essays",
  |        "37signals philosophy"]
  |-> emit("found_sources", { found: N })
  |     Tavily EXTRACT: full text of top 10-15 results
  |-> emit("parsing")
  |     SIE doc-to-markdown: clean each page -> markdown (parallelized, concurrency=5)
  |-> emit("building_persona")
  |     SIE structured output (schema = PersonaRecord):
  |       { worldview[], communicationStyle, naturalTensions[], knownPositions[] }
  |     Fallback: Gemini structured output if SIE unavailable
  |     assembleSystemPrompt(name, extracted)  // 7-section template
  |-> emit("embedding")
  |     SIE embed(chunkTexts) // OpenAI-compat /v1/embeddings
  |-> emit("ready", { persona })
        PersonaRecord { tier:3, generated:true, groundingChunks, systemPrompt }
```

### 12.2 Key Design Decisions

- **SIE primary, Gemini fallback:** structured output tries SIE `/v1/chat/completions` first; falls back to Gemini REST API if SIE is unavailable
- **Grounding quality:** generated `systemPrompt` includes all 7 sections -- matches Tier-2 expert prompt structure
- **Parallelized doc cleanup:** `sieDocToMarkdown` runs batches with concurrency=5 to stay within the 60s SLA
- **Error handling:** per-query Tavily errors are swallowed (continues with remaining); SIE failures fall back gracefully; unrecoverable errors emit `stage:"error"` with message

### 12.3 Progress UX

`Searching... -> Found N sources -> Parsing content -> Building persona -> Embedding -> Avatar ready`, streamed over WebSocket. Target < 60s.

**Demo tip:** kick off the Tavily search *before* switching to the DeepWiki section so it feels instant.

---

## 13. API and WebSocket Contract

### 13.1 REST Endpoints

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/experts` | -- | `{ experts: RosterEntry[] }` |
| `POST` | `/api/rooms/suggest-panel` | `{ topic: string }` | `{ panel: string[], rationale: string }` |
| `POST` | `/api/rooms` | `{ topic, panel: string[], intensity: 1\|2\|3 }` | `{ roomId: string }` |
| `GET` | `/api/rooms` | -- | `{ rooms: Room[] }` |
| `GET` | `/api/rooms/:roomId` | -- | `{ room: Room }` |
| `POST` | `/api/deepwiki/index` | `{ name: string }` | `{ jobId: string }` (progress via WS) |
| `GET` | `/health` | -- | `{ ok: true, mode: "mock"\|"real" }` |

### 13.2 WebSocket Protocol (`/ws/rooms/:roomId`)

**Client -> Server:**

| Type | Payload | Behavior |
|------|---------|----------|
| `user_utterance` | `{ text?: string, audioBase64?: string, mimeType?: string }` | Triggers STT (if audio) then a full turn |
| `set_intensity` | `{ level: 1\|2\|3 }` | Takes effect on next turn |
| `mention` | `{ agentId: string, text: string }` | Forces that agent to respond next |
| `admit_hand` | `{ agentId: string }` | Admits a hand-raiser to speak next |
| `continue_debate` | `{}` | Triggers a new turn without user audio |
| `end_session` | `{}` | Generates summary and ends the session |

**Server -> Client:**

| Type | Payload | Description |
|------|---------|-------------|
| `speaker_state` | `{ agentId, state: "thinking"\|"speaking"\|"done" }` | Drives avatar glow/pulse |
| `transcript` | `{ entry: TranscriptEntry }` | Streamed; may be partial (`partial: true`) |
| `audio` | `{ agentId, url, entryId, seq }` | Audio URL for playback queue |
| `hand_raise` | `{ handRaise: { agentId, reason, ts } }` | Shows "X wants to speak" |
| `card` | `{ card: VisualCard }` | Takeaway/framework/action item |
| `deepwiki_progress` | `{ progress: DeepWikiProgress }` | Pipeline stage updates |
| `summary` | `{ summary: SessionSummary }` | End-of-session output |
| `error` | `{ message, fatal? }` | Error notification |

### 13.3 Additional WebSocket Path

`/ws/lobby` (or `/ws` without a room) accepts connections for receiving `deepwiki_progress` events without joining a room -- used by the DeepWiki builder screen.

---

## 14. Frontend Screens and UX

### 14.1 Screen 1: Lobby / Explore (`/`)

- Hero section with product branding
- Category strip: Product / Design / Growth / VC / Engineering / Founders
- Grid of live and upcoming room cards, each showing:
  - Topic
  - Stacked expert avatar circles
  - Participant count
- "Create Room" CTA button

### 14.2 Screen 2: Create Room (`/create`)

1. Free-text problem description (1--2 sentences)
2. `POST /api/rooms/suggest-panel` -> show suggested 4--5 experts with "Why these experts" rationale
3. User can swap/add experts from the full roster (tapping an expert shows alternatives from same or other categories)
4. Debate intensity slider: Collaborative <-> Balanced <-> Heated
5. "Start Session" button -> `POST /api/rooms` -> navigate to room

### 14.3 Screen 3: Room View (`/room/[roomId]`) -- Hero Screen

```
+-----------------------------------------------------+
|  Topic: "Should I focus on product or sales?"        |
|  Debate intensity: [====o=========] Balanced         |
+-----------------------+-----------------------------+
|                       |                             |
|   [E1]  [E2]          |  LIVE TRANSCRIPT            |
|      [mic]            |                             |
|   [E3]  [E4]          |  Elena: "Your activation    |
|                       |  metric should be..."       |
|  [Push to Talk]       |                             |
|                       |  Keith: "I disagree..."     |
|  [@Elena  @Keith      |                             |
|   Tag an expert]      |  hand_raise Paul wants to speak   |
+-----------------------+-----------------------------+
|                       |  KEY TAKEAWAYS              |
|                       |  - "Barrels vs ammo" (Keith)|
|                       |  - "Test pricing first"     |
|                       |    (Madhavan)               |
+-----------------------+-----------------------------+
|  [End Session -> Get Summary + Transcript]           |
+-----------------------------------------------------+
```

**UI elements:**
- Circular avatars in a roundtable arrangement; active speaker has glowing/pulsing border with color matching their category
- User microphone seat centered in the roundtable
- Hand-raise indicator: "X wants to speak" -- user taps to admit
- @mention bar: user tags specific experts to force a response
- Debate intensity slider: adjustable mid-session
- Live transcript panel with agent-attributed text, streaming caret for partial messages, "replying to" pills for reactor responses
- Visual cards sidebar: auto-extracted takeaways, frameworks, action items with speaker attribution
- Large push-to-talk button (Web Speech API with text fallback)
- End Session button -> summary + transcript (copy/download)

**Theme:** Clubhouse-inspired with a light, clean aesthetic; supports both light and dark themes with a one-click toggle.

### 14.4 Screen 4: DeepWiki Builder (`/deepwiki`)

- Name input field ("Enter expert name")
- Streamed progress UI: Searching -> Found N sources -> Parsing content -> Building persona -> Embedding -> Avatar ready
- Progress stages update in real time via WebSocket
- New avatar card appears in the expert picker upon completion

### 14.5 Frontend State Management

WebSocket-driven store maintaining:
- `speakerState` -- which agent is thinking/speaking/done
- `transcript[]` -- append-only with partial/final updates
- `cards[]` -- visual insight cards, append-only
- `handRaises[]` -- active hand-raise notifications
- `audioQueue[]` -- sequential playback queue keyed by `seq`
- `intensity` -- current debate level

### 14.6 Mock vs. Real Mode

The frontend has a dual-mode architecture:
- **`RealRoomConnection`** -- connects to the orchestrator's WebSocket, buffers outgoing messages until open
- **`MockRoomConnection`** -- simulates the whole roundtable in-browser: agents take turns, reference each other, raise hands, and emit all event types per the contract. Reaction probability scales with debate intensity.

Toggle: `NEXT_PUBLIC_USE_MOCK=true|false` (default `true`). The mock mode is fully demoable with no server or API keys.

---

## 15. Adapter Pattern and Vendor Integration

### 15.1 AdapterBundle Interface

```typescript
interface AdapterBundle {
  llm: LLMAdapter;        // Gemini -- generate, generateStream, classifyTopic
  stt: STTAdapter;        // Gemini -- transcribe audio to text
  tts: TTSAdapter;        // SLNG -- synthesize text with expert voice profile
  grounding: GroundingProvider;  // Superlinked SIE -- embed, retrieve, guardrail
  deepwiki: DeepWikiProvider;    // Tavily + SIE -- buildPersona pipeline
}
```

### 15.2 Vendor Mapping

| Tool | Role | Package | Adapter |
|------|------|---------|---------|
| **Google Gemini** (`gemini-3.5-flash`) | Core LLM brain (agent generation, topic classification, STT) | `@echochamber/voice` | `createGeminiLLM`, `createGeminiSTT` |
| **SLNG** | Per-expert voice profiles / low-latency TTS | `@echochamber/voice` | `createSlngTTS` |
| **Tavily** | Search + extract for grounding prep and DeepWiki runtime indexing | `@echochamber/deepwiki` | `tavilySearch`, `tavilyExtract` |
| **Superlinked SIE** | Embeddings, reranking, doc-to-markdown, structured output, content guardrails | `@echochamber/grounding`, `@echochamber/deepwiki` | `createGroundingProvider`, `sieDocToMarkdown`, `sieStructuredOutput`, `sieEmbed` |

### 15.3 Mock vs. Real Mode

Every adapter has a mock implementation that runs with no API keys:
- `ECHO_ADAPTER_MODE=mock` (env var) -> all adapters return deterministic stubs
- `ECHO_ADAPTER_MODE=real` -> real vendor API calls
- Graceful fallback: if a real key is missing, the factory falls back to mock for that specific adapter

This enables:
- UI development without any API keys
- Full end-to-end demo with mock data
- Incremental integration as vendor access is confirmed

### 15.4 Superlinked SIE Integration Details

The Superlinked SIE is a self-hosted, Apache-2.0 licensed inference engine providing:

| Capability | API | Use Case |
|------------|-----|----------|
| **Embeddings** | `POST /v1/embeddings` | Embedding grounding chunks for retrieval; embedding DeepWiki content |
| **Reranking** | `POST /v1/rerank` | Instruction-following rerank for per-turn grounding retrieval (cosine-similarity fallback) |
| **Doc-to-Markdown** | `POST /v1/chat/completions` | Cleaning Tavily-scraped HTML into clean markdown for DeepWiki |
| **Structured Output** | `POST /v1/chat/completions` (JSON schema) | Auto-generating persona JSON for DeepWiki |
| **Guardrails** | `POST /v1/chat/completions` (granite-guardian) | Anti-hallucination check on generated text (stretch goal) |

**Privacy advantage:** SIE keeps grounding prompts and documents in your own cloud -- no data sent to frontier labs for the RAG layer.

---

## 16. Data Models

### 16.1 Core Types

```typescript
type ExpertCategory = "product" | "design" | "growth" | "vc" | "engineering" | "founder";
type GroundingTier = 1 | 2 | 3;
type DebateIntensity = 1 | 2 | 3;  // Collaborative | Balanced | Heated
type RoomStatus = "lobby" | "creating" | "in_room" | "ended";
type SpeakerId = string | "user";
type VisualCardType = "takeaway" | "framework" | "action_item";
type DeepWikiStage = "searching" | "found_sources" | "parsing" | "building_persona"
                   | "embedding" | "ready" | "error";
type SpeakerState = "thinking" | "speaking" | "done";
```

### 16.2 Room

```typescript
interface Room {
  roomId: string;
  topic: string;
  panel: string[];          // persona ids
  debateIntensity: DebateIntensity;
  status: RoomStatus;
  createdAt: number;
}
```

### 16.3 TranscriptEntry

```typescript
interface TranscriptEntry {
  id: string;
  speaker: SpeakerId;
  text: string;
  ts: number;
  refersTo?: string;   // id of the entry this one is reacting to
  partial?: boolean;   // true while text is still streaming
}
```

### 16.4 VisualCard

```typescript
interface VisualCard {
  id: string;
  type: VisualCardType;
  text: string;
  attribution: string;  // persona id
  ts: number;
}
```

### 16.5 HandRaise

```typescript
interface HandRaise {
  agentId: string;
  reason: string;
  ts: number;
}
```

### 16.6 SessionSummary

```typescript
interface SessionSummary {
  roomId: string;
  problem: string;
  positions: ExpertPosition[];   // { agentId, summary }
  agreements: string[];
  disagreements: string[];
  nextSteps: string[];
  keyTakeaways: string[];
  transcript: TranscriptEntry[];
}
```

### 16.7 VoiceProfile

```typescript
interface VoiceProfile {
  voiceId: string;       // SLNG voice id
  pitch?: number;        // -1..1 relative pitch shift
  pace?: number;         // speech rate multiplier, ~0.8..1.2
  tone?: string;
}
```

### 16.8 GroundingChunk

```typescript
interface GroundingChunk {
  id: string;
  topic: string;         // short topic key, e.g. "freemium-vs-trial"
  text: string;
  embedding?: number[];  // cached embedding vector
  source?: string;       // e.g. "Lenny's Podcast, 2024"
}
```

### 16.9 DeepWikiProgress

```typescript
interface DeepWikiProgress {
  jobId: string;
  stage: DeepWikiStage;
  found?: number;
  message?: string;
  persona?: PersonaRecord;  // present when stage === "ready"
}
```

### 16.10 MVP Persistence

In-memory map keyed by `roomId`, optional JSON snapshot to disk. No database.

---

## 17. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Latency** | < 3s to first audio per agent; full 3-agent turn playable without dead air |
| **Reliability** | Pre-cache the scripted demo scenario; recorded backup video; "thinking" audio cue |
| **Distinctiveness** | Unique SLNG voice + category color + avatar per expert |
| **Rate limits** | Cache demo turns; throttle DeepWiki; pre-warm Tavily search |
| **Fidelity** | Grounding rules in every prompt; stretch: SIE guardrail pass |
| **Privacy** | Superlinked SIE keeps grounding prompts/documents in our own cloud |
| **Mock mode** | Entire stack runs with `ECHO_ADAPTER_MODE=mock` and no API keys |
| **TypeScript** | `tsc -b` passes across all packages; strict mode |
| **Node version** | >= 20 |

---

## 18. Implementation Status

### 18.1 Merged PRs

| PR | Workstream | Key Deliverables | Status |
|----|-----------|-----------------|--------|
| **#1** `feat(deepwiki)` | `packages/deepwiki` | Tavily search+extract, SIE doc-to-markdown (parallelized), SIE structured output with Gemini fallback, embedding, full `buildPersona` pipeline | Merged |
| **#2** `feat(grounding)` | `packages/grounding` | Superlinked SIE provider (embed, rerank, cosine fallback, guardrail), persona assembly for all 30 experts, Tier-1 grounded knowledge bases for 6 demo experts | Merged |
| **#3** `feat(voice)` | `packages/voice` | Gemini LLM adapter (`gemini-3.5-flash`, generate/stream/classify), Gemini STT adapter, SLNG TTS adapter (multi-endpoint), smoke test harness | Merged |
| **#4** `feat(server)` | `apps/server` | Full orchestrator: REST API, WebSocket turn engine, agent selection, context assembly, debate intensity, reactor selection, visual cards, session summary, DeepWiki integration | Merged |
| **#5** `feat(web)` | `apps/web` | All 4 screens (lobby, create, room, DeepWiki), mock+real room connection, audio queue, PTT via Web Speech API, Clubhouse-inspired theme | Merged |

### 18.2 Post-Merge Fixes

- `fix(voice): use SLNG Unified API for TTS (Deepgram Aura 2)` -- updated TTS adapter
- `chore(voice): upgrade to gemini-3.5-flash` -- model upgrade
- `fix(web): thread reactor transcript entries by entry id` -- "replying to" pill rendering
- `feat(web): Clubhouse-inspired light theme` + `feat(web): app-wide Clubhouse theme + transcript bookmarking`

### 18.3 What Works End-to-End

- **Mock mode:** full stack runs with `ECHO_ADAPTER_MODE=mock` and no API keys. The web frontend's in-browser mock orchestrator simulates the complete roundtable experience.
- **Real mode (partial):** Gemini LLM and STT adapters are verified working. SLNG TTS adapter is implemented but awaiting correct endpoint configuration.
- **Typecheck:** `tsc -b` passes across all packages.

---

## 19. Known Limitations and Open Questions

### 19.1 Known Limitations

| Limitation | Notes |
|-----------|-------|
| **SLNG TTS endpoints** | The SLNG API at `https://api.slng.ai` returned 404 on all candidate TTS paths during initial testing. Adapter is fully implemented and will work once the correct `SLNG_BASE_URL` / endpoint path is configured. |
| **24 experts at Tier 2 only** | Remaining 24 experts run on skeleton prompts with condensed positions; only the 6 demo experts have deep Tier-1 grounding. Fine for demo but limited for production. |
| **In-memory only** | No persistent storage; all room state is lost on server restart. |
| **Single-user** | No auth, no concurrent multi-user support. |
| **Desktop only** | No mobile responsiveness. |
| **No document upload** | Users cannot upload their own pitch decks or docs for grounding. |

### 19.2 Open Questions

1. **SLNG voice catalog:** how many distinct voices are available? Can we map 30 experts to unique voice profiles?
2. **Gemini Live quota:** concurrent sessions / rate limits for multi-agent turns during a live demo?
3. **Superlinked SIE hosting:** managed grant vs. self-host? GPU availability for embed/rerank/OCR?
4. **STT choice finalization:** Gemini transcription vs. SLNG vs. browser SpeechRecognition for PTT input?
5. **Demo scenario lock:** which exact topic + panel + intensity to hard-rehearse? (Battle plan suggests the restaurant-inventory B2B SaaS scenario.)
6. **Product name:** TBD per battle plan.

---

## 20. Production Roadmap

| Theme | What Changes from MVP |
|-------|----------------------|
| **Multi-user & rooms** | Real concurrency; Clubhouse-style audiences who can listen and request to speak; presence/state sync via a realtime backend |
| **Auth & accounts** | Login, profiles, saved rooms and transcripts |
| **Persistence** | Real DB for rooms, transcripts, personas; vector store for grounding (SIE embeddings persisted) |
| **Full 30+ grounding** | All experts at Tier-1 depth; continuous re-indexing of new content; freshness jobs |
| **DeepWiki at scale** | Caching, dedup, quality scoring, moderation of scraped content; legal/likeness review |
| **Full-duplex voice** | Native-audio interruption/barge-in; overlapping speech handling; smarter VAD |
| **Mobile** | Responsive web + native app |
| **Likeness & rights** | Consent/licensing model for using real people's voices and content; disclaimers; opt-out |
| **Safety** | Stronger guardrails, citation surfacing ("source: episode X"), hallucination monitoring |
| **Monetization** | Subscriptions, premium panels, team workspaces |
| **Document upload** | Ground a session in the user's own deck/docs alongside expert content |
| **Cross-session history** | Save and resume sessions; browse past transcripts and summaries |
| **Expert community** | Allow real experts to verify/curate their own persona data |

---

## 21. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Voice latency kills demo | PTT, 2--3 sentence cap, pre-gen "thinking" audio, overlap stages, Gemini thinking disabled |
| 30 experts too many to demo | Only show 5--6 in the demo; the roster proves scale in the pitch |
| All agents sound too similar | Different voice profiles via SLNG + visual differentiation (unique colors, avatars, category badges) |
| Debate intensity feels fake | Natural tensions are baked into system prompts; reactor selection uses real philosophical conflicts |
| Panel suggestion is wrong | 2--3 pre-tested topic-to-panel mappings ready for demo |
| API rate limits during live demo | Cache the demo scenario; have recorded backup |
| DeepWiki indexing is slow | Start Tavily search before switching to that section of demo |
| Agents say something the real person wouldn't | Grounding rules in every prompt; SIE guardrail as stretch enhancement |
| SLNG endpoints unavailable | Multi-path TTS adapter tries `/v1/audio/speech`, `/v1/tts`, `/v1/speech`, `/v1/synthesize`; mock fallback |
| Superlinked SIE down | Cosine-similarity fallback for reranking; Gemini fallback for structured output in DeepWiki |

---

## Appendix A -- Expert Roster (30 Experts)

### Product (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 1 | Lenny Rachitsky | Newsletter & Podcast, ex-Airbnb | 2 | retention, growth, pm-craft, frameworks, north-star |
| 2 | Shreyas Doshi | ex-Stripe, Twitter, Google | 2 | high-agency, lno, pre-mortems, product-taste |
| 3 | Melissa Perri | CEO Produx Labs, "The Build Trap" | 2 | product-strategy, product-ops, outcomes, roadmaps |
| 4 | Cat Wu | Head of Product, Claude Code (Anthropic) | 2 | ai-native-product, shipping-cadence, technical-pm |
| 5 | Nikhyl Singhal | Founder The Skip, ex-Meta/Google | 2 | pm-careers, leadership, org-change |

### Design (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 6 | Jenny Wen | Head of Design, Claude (Anthropic) | 2 | design-process, ai-first-design, craft |
| 7 | Ryo Lu | Head of Design, Cursor | 1 | design-engineering, soulful-software, cursor, taste, ryos |
| 8 | Max Schoening | Head of Product, Notion | 2 | agency, tiny-core, design-coding |
| 9 | Dylan Field | CEO & Co-founder, Figma | 2 | design-tooling, craft-moat, collaboration, figma |
| 10 | Scott Belsky | ex-CPO Adobe, "The Messy Middle" | 2 | messy-middle, first-mile-ux, creative-tools |

### Growth (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 11 | Elena Verna | Head of Growth, Lovable | 1 | plg, freemium, activation, pls, monetization |
| 12 | Amol Avasare | Growth, Anthropic | 2 | activation, growth-systems, cash-framework |
| 13 | Casey Winters | ex-CPO Eventbrite, Pinterest, Grubhub | 2 | growth-loops, marketplace-growth, retention |
| 14 | Andrew Chen | General Partner, a16z | 2 | network-effects, cold-start, viral-growth |
| 15 | Madhavan Ramanujam | Partner, Simon-Kucher; "Monetizing Innovation" | 2 | pricing, monetization, willingness-to-pay, packaging |

### VCs / Investors (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 16 | Keith Rabois | General Partner, Khosla Ventures | 1 | barrels-vs-ammo, talent, hiring, operating-tempo, contrarian |
| 17 | Sam Lessin | Partner, Slow Ventures | 2 | contrarian-ai, founder-etiquette, market-cycles |
| 18 | Paul Graham | Co-founder, Y Combinator | 1 | do-things-that-dont-scale, startup-ideas, schlep-blindness, founder-mode, determination |
| 19 | Elad Gil | Investor, "High Growth Handbook" | 2 | scaling, fundraising, hypergrowth |
| 20 | Andrew Wilkinson | Co-founder, Tiny | 2 | bootstrapping, profitability, boring-businesses, holding-co |

### Engineering (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 21 | Guillermo Rauch | CEO, Vercel | 2 | ship-fast, prompts-over-code, frontend, nextjs |
| 22 | Fiona Fung | Engineering Leader, AI-pilled org | 2 | ai-eng-org, developer-productivity, scaling-teams |
| 23 | Boris Cherny | Creator of Claude Code (Anthropic) | 1 | agentic-dev, claude-code, post-coding, parallel-agents, latent-demand |
| 24 | Scott Wu | CEO, Cognition (Devin) | 2 | autonomous-agents, devin, architects-vs-bricklayers |
| 25 | Michael Truell | CEO & Co-founder, Cursor | 2 | ai-coding, cursor, ide-as-product |

### Founders / CEOs (5)
| # | Name | Title | Tier | Expertise Tags |
|---|------|-------|------|----------------|
| 26 | Brian Chesky | CEO & Co-founder, Airbnb | 2 | founder-mode, design-led, company-building |
| 27 | Evan Spiegel | CEO & Co-founder, Snap | 2 | consumer-product, distribution-moats, small-design-teams |
| 28 | Eric Ries | Author, "The Lean Startup" | 1 | lean-startup, mvp, validated-learning, build-measure-learn, governance |
| 29 | Mark Pincus | Founder, Zynga | 2 | proven-better-new, instincts, consumer |
| 30 | Melanie Perkins | CEO & Co-founder, Canva | 2 | product-led, homegrown-talent, global-from-day-one |

---

## Appendix B -- Demo Script

**Duration:** 3--3.5 minutes

**[0:00--0:15]** Open on room lobby. Show pre-built rooms.
> "Welcome to EchoChamber. Your AI expert roundtable."

**[0:15--0:40]** Create a new room. Type: "I'm building a B2B SaaS for restaurant inventory management. 3 pilot customers, no revenue yet. Should I focus on product or sales?"

Show the platform suggesting a panel: Elena Verna (Growth), Keith Rabois (VC), Eric Ries (Founder), Madhavan Ramanujam (Pricing). User swaps Eric Ries for Paul Graham. Sets debate intensity to "Heated."

**[0:40--2:00]** THE HERO MOMENT. Enter room. Agents discuss:
- Elena pushes PLG and freemium
- Keith challenges: "Do you have a barrel? Who's your 10x person?"
- Madhavan: "Have you tested willingness to pay with those 3 pilots?"
- Paul Graham: "3 customers is a signal. Do things that don't scale. Personally deliver for them."
- Elena reacts to Keith: "You can't just hire your way to product-market fit..."
- Keith fires back (high debate intensity)

Show hand-raise: "Casey Winters wants to speak" -- user taps, Casey joins with growth loop perspective.

**[2:00--2:20]** User @mentions Paul Graham: "Paul, should I raise funding?" Paul gives a direct, concise answer. Others react.

**[2:20--2:40]** Show visual cards updating in real-time with key takeaways.

**[2:40--3:00]** End session. Show summary + full transcript generation.

**[3:00--3:20]** BONUS: Show DeepWiki. Type "Build avatar for Jason Fried." Tavily searches -> content found -> "Building persona..." -> Jason Fried avatar appears in expert picker.

**[3:20--3:30]** Close with vision.
> "Every founder deserves world-class advisors. Now 30 of the best minds in startups are in your pocket. And with DeepWiki, any expert can be indexed in 60 seconds."

---

## Appendix C -- Environment and Configuration

### Environment Variables

```bash
# Google Gemini -- core LLM brain (agent generation, topic classification, STT)
GEMINI_API_KEY=

# SLNG -- per-expert voice profiles / TTS
SLNG_API_KEY=
SLNG_BASE_URL=https://api.slng.ai

# Tavily -- search + extract for grounding prep and DeepWiki runtime indexing
TAVILY_API_KEY=

# Superlinked SIE -- embeddings / rerank / structured output / guardrails
SUPERLINKED_API_KEY=
SUPERLINKED_BASE_URL=

# Server
PORT=8787
NEXT_PUBLIC_SERVER_URL=http://localhost:8787
NEXT_PUBLIC_WS_URL=ws://localhost:8787

# Feature flags
ECHO_ADAPTER_MODE=mock    # "mock" for no-key dev; "real" for live APIs
NEXT_PUBLIC_USE_MOCK=true  # frontend mock orchestrator
```

### Running Locally

```bash
npm install
cp .env.example .env        # fill keys, or leave ECHO_ADAPTER_MODE=mock
npm run typecheck            # builds shared + integration packages
npm run dev:server           # orchestrator on :8787
npm run dev:web              # web app on :3000
```

`ECHO_ADAPTER_MODE=mock` runs the entire stack with deterministic stubs and no API keys.
