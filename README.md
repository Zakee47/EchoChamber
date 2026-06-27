# EchoChamber

**AI Expert Roundtable — live voice rooms with grounded AI avatars of real startup experts**

> Imagine walking into a room with Elena Verna, Paul Graham, Ryo Lu, Brian Chesky, and Boris Cherny — all at once — to discuss YOUR startup problem. They debate each other, challenge your assumptions, and give you advice grounded in everything they've ever published. Any expert, any combination, any problem.

---

## What is EchoChamber?

EchoChamber is a multi-agent AI platform that delivers real-time, voice-based roundtable discussions between AI-generated digital twins of real startup experts and human users. Think **"Clubhouse for AI advisors."**

A user describes a startup problem, the platform assembles a panel of 4–5 expert avatars, and those avatars **debate each other and the user in real time** — each with a distinct voice, grounded in their real published content.

### Key Features

- **30 expert avatars** across 6 categories (Product, Design, Growth, VC, Engineering, Founders) — each with a unique system prompt, voice profile, and expertise tags
- **Grounded personas** — not generic LLM masks, but avatars that cite real frameworks, opinions, and stories from each expert's actual published content (e.g., Elena Verna on PLG, Keith Rabois on barrels vs. ammunition, Paul Graham on doing things that don't scale)
- **Multi-agent debate** — experts actively disagree, reference each other by name, and surface philosophical tensions
- **Debate intensity slider** — Collaborative / Balanced / Heated — visibly changes confrontation behavior mid-session (20% / 50% / 80% reactor probability)
- **Smart panel suggestion** — describe a problem, get a suggested panel with rationale; swap experts freely
- **Push-to-talk voice input** — speak to the room, agents respond with distinct voices
- **Visual insight cards** — auto-extracted frameworks, takeaways, and action items with speaker attribution
- **Hand-raising** — relevant agents not on the panel signal they want to speak; user admits them
- **Session summary** — end a session to get a structured summary with per-expert positions, agreements, disagreements, and next steps
- **DeepWiki** — index any new expert on demand from their public content in under 60 seconds

---

## Architecture

```
+----------------------------------------------------------------------+
|                     Next.js Frontend (desktop)                        |
|  Lobby · Create-Room · Room View (avatars, transcript, cards)         |
|  Push-to-talk · debate slider · @mention · hand-raise                 |
+----------^--------------------------------------------+--------------+
           | WebSocket                                  | REST
+----------+--------------------------------------------v--------------+
|                  Orchestration Server (Node.js)                       |
|  Turn-taking engine · Agent selection · Debate intensity · Cards      |
+---------+----------------+----------------+---------------------+-----+
          |                |                |                     |
    +-----v-----+   +------v------+   +-----v------+   +---------v------+
    | Gemini    |   | Superlinked |   |   SLNG     |   |  Tavily        |
    | LLM + STT|   | SIE (RAG)  |   |  TTS       |   |  Search+Extract|
    +-----------+   +-------------+   +------------+   +----------------+
```

---

## Monorepo Structure

```
packages/shared      @echochamber/shared     Types, REST/WS contracts, adapter interfaces (source of truth)
packages/voice       @echochamber/voice      Gemini LLM/STT + SLNG TTS adapters
packages/grounding   @echochamber/grounding  Superlinked SIE retrieval + persona assembly
packages/deepwiki    @echochamber/deepwiki   Tavily + SIE runtime expert indexing
apps/server          @echochamber/server     Orchestrator: turn-taking, agent selection, WebSocket
apps/web             @echochamber/web        Next.js frontend (lobby, create-room, room view, DeepWiki)
data/personas/       roster.json — 30-expert registry
docs/                PRD, battle plan, system prompts, grounding strategy
```

---

## Tech Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Frontend | Next.js 14, React, Tailwind CSS | 4-screen web app with real-time WebSocket |
| LLM Brain | Google Gemini (`gemini-3.5-flash`) | Agent response generation, topic classification, STT |
| Voice / TTS | SLNG | Distinct per-expert voice profiles, low-latency synthesis |
| Content Grounding | Superlinked SIE | Embeddings, instruction-following reranking, structured output, guardrails |
| Expert Indexing | Tavily | Search + extract for DeepWiki runtime persona building |
| Orchestration | Node.js + Express + ws | Turn-taking engine, agent selection, debate intensity |
| Storage (MVP) | In-memory + JSON | No database; cached embeddings |

---

## Expert Roster (30 Experts)

### Product
Lenny Rachitsky · Shreyas Doshi · Melissa Perri · Cat Wu · Nikhyl Singhal

### Design
Jenny Wen · **Ryo Lu** · Max Schoening · Dylan Field · Scott Belsky

### Growth
**Elena Verna** · Amol Avasare · Casey Winters · Andrew Chen · Madhavan Ramanujam

### VCs / Investors
**Keith Rabois** · Sam Lessin · **Paul Graham** · Elad Gil · Andrew Wilkinson

### Engineering
Guillermo Rauch · Fiona Fung · **Boris Cherny** · Scott Wu · Michael Truell

### Founders / CEOs
Brian Chesky · Evan Spiegel · **Eric Ries** · Mark Pincus · Melanie Perkins

**Bold** = Tier-1 deep-grounded demo expert (6 total, with ~2000 tokens of real curated opinions each). Remaining 24 have condensed Tier-2 prompts. Any new expert can be indexed at runtime via DeepWiki (Tier 3).

---

## Content Grounding (Three-Tier Strategy)

The grounding strategy is what separates EchoChamber from "an LLM wearing a costume":

| Tier | Who | How | Tokens/Expert |
|------|-----|-----|---------------|
| **Tier 1: Deep** | 6 demo experts | 15–20 real opinions, frameworks, and stories extracted from podcast transcripts and essays | ~2000 |
| **Tier 2: Condensed** | Remaining 24 | 5–8 key positions distilled from Tavily search | ~500 |
| **Tier 3: DeepWiki** | Any new expert | Live Tavily search + extract → SIE doc-to-markdown → structured output → persona generated on the fly | Dynamic |

Per-turn retrieval uses Superlinked SIE embed + rerank to pull the 3–4 most relevant grounding chunks for the current topic — so a pricing question pulls pricing opinions, not career stories.

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Installation

```bash
git clone https://github.com/Zakee47/EchoChamber.git
cd EchoChamber
npm install
```

### Configuration

```bash
cp .env.example .env
```

Fill in API keys, or leave `ECHO_ADAPTER_MODE=mock` to run the entire stack **with no API keys** (deterministic stubs for all external services).

| Variable | Service | Required? |
|----------|---------|-----------|
| `GEMINI_API_KEY` | Google Gemini (LLM + STT) | For real mode |
| `SLNG_API_KEY` | SLNG (TTS) | For real mode |
| `TAVILY_API_KEY` | Tavily (DeepWiki) | For real mode |
| `SUPERLINKED_API_KEY` | Superlinked SIE (RAG) | For real mode |
| `ECHO_ADAPTER_MODE` | `mock` or `real` | Defaults to `mock` |

### Running

```bash
# Build/typecheck shared packages
npm run typecheck

# Start the orchestrator server (port 8787)
npm run dev:server

# Start the web app (port 3000)
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

### 1. Create a Room
Describe your startup problem → the platform suggests a panel of 4–5 experts with a rationale → swap or add experts → set debate intensity → start.

### 2. The Roundtable
Agents discuss your problem in turns. Each turn:
1. **Agent selection** — orchestrator picks the 2–3 most relevant experts (by topic match + expertise + natural tensions)
2. **Context assembly** — persona prompt + retrieved grounding + recent transcript + debate intensity directive
3. **Generation** — Gemini streams a 2–3 sentence response (text appears live in the transcript)
4. **Voice synthesis** — SLNG produces audio with the expert's unique voice profile
5. **Reactor check** — based on debate intensity, a second agent may spontaneously challenge the first (using natural tensions)
6. **Visual cards** — every 3–4 responses, frameworks and takeaways are extracted and shown in the sidebar

### 3. User Interaction
- **Push-to-talk** — hold to speak, agents respond to your input
- **@mention** — tag a specific expert to force a response ("@Paul, should I raise funding?")
- **Hand-raise** — admit relevant agents who want to join the conversation
- **Intensity slider** — adjust debate heat mid-session

### 4. Session Output
End the session to get:
- Structured summary (problem, positions, agreements, disagreements, next steps)
- Full attributed transcript
- Accumulated takeaway cards
- Copy/download everything

---

## API Overview

### REST

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/experts` | List all 30 experts |
| `POST` | `/api/rooms/suggest-panel` | Get a suggested panel for a topic |
| `POST` | `/api/rooms` | Create a room |
| `GET` | `/api/rooms` | List rooms |
| `GET` | `/api/rooms/:roomId` | Get room details |
| `POST` | `/api/deepwiki/index` | Start indexing a new expert |

### WebSocket (`/ws/rooms/:roomId`)

**Client → Server:** `user_utterance`, `set_intensity`, `mention`, `admit_hand`, `continue_debate`, `end_session`

**Server → Client:** `speaker_state`, `transcript`, `audio`, `hand_raise`, `card`, `deepwiki_progress`, `summary`, `error`

Full contract defined in [`packages/shared/src/ws.ts`](packages/shared/src/ws.ts) and [`packages/shared/src/rest.ts`](packages/shared/src/rest.ts).

---

## Mock Mode

The entire stack runs with `ECHO_ADAPTER_MODE=mock` and **no API keys**:

- The server uses deterministic stubs for all adapters (LLM, STT, TTS, grounding, DeepWiki)
- The web frontend includes an in-browser mock orchestrator that simulates the complete roundtable experience — agents take turns, reference each other, raise hands, and emit all event types
- Useful for UI development, demos, and testing without any external dependencies

---

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/PRD.md`](docs/PRD.md) | Comprehensive Product Requirements Document (full spec) |
| [`docs/BATTLE_PLAN_v2.md`](docs/BATTLE_PLAN_v2.md) | Strategy and execution plan |
| [`docs/EXPERT_ROUNDTABLE_TECHNICAL_PRD.md`](docs/EXPERT_ROUNDTABLE_TECHNICAL_PRD.md) | Original technical PRD |
| [`docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md`](docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md) | Grounding strategy + Tier-1 knowledge bases |
| [`docs/SYSTEM_PROMPTS.md`](docs/SYSTEM_PROMPTS.md) | All 30 expert system prompts |

---

## Development

### Golden Rule

The contract in `@echochamber/shared` is the single source of truth. Implement the interfaces; don't change their shapes without coordinating. Each workstream has a `BUILD.md` with its exact scope.

### Typecheck

```bash
npm run typecheck
```

### Project Structure

Each package/app is self-contained:
- **`packages/shared`** — types, REST/WS contracts, adapter interfaces, intensity config
- **`packages/voice`** — Gemini LLM/STT + SLNG TTS adapters (mock + real)
- **`packages/grounding`** — Superlinked SIE retrieval + persona assembly with Tier-1 grounding
- **`packages/deepwiki`** — Tavily search/extract + SIE/Gemini structured output pipeline
- **`apps/server`** — full orchestrator with REST API, WebSocket turn engine, agent selection, visual cards, session summary
- **`apps/web`** — Next.js 14 frontend with 4 screens, audio queue, PTT, mock/real connection modes

---

## License

Private — all rights reserved.
