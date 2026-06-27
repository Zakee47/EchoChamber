# EchoChamber — AI Expert Roundtable

A web app where you open a live **voice room** with AI avatars of real startup
experts (Paul Graham, Elena Verna, Keith Rabois, Ryo Lu, Eric Ries, Boris
Cherny, …). The avatars are **grounded in each expert's real published content**
and **debate each other and you in real time** — you control the panel, the
debate intensity, and can index any new expert on demand via **DeepWiki**.

Full spec in [`docs/EXPERT_ROUNDTABLE_TECHNICAL_PRD.md`](docs/EXPERT_ROUNDTABLE_TECHNICAL_PRD.md).
Grounded knowledge bases for the 6 demo experts in
[`docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md`](docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md).

## Monorepo layout

```
packages/shared      @echochamber/shared    Types + REST/WS contract + adapter interfaces  (DO NOT FORK)
packages/voice       @echochamber/voice     Gemini (LLM+STT) + SLNG (TTS) adapters
packages/grounding   @echochamber/grounding Superlinked SIE retrieval + persona assembly
packages/deepwiki    @echochamber/deepwiki  Tavily + SIE runtime expert indexing
apps/server          @echochamber/server    Orchestrator: turn-taking, agent selection, WS
apps/web             @echochamber/web        Next.js web app (lobby, create-room, room view, DeepWiki)
data/personas        roster.json + grounded knowledge bases
docs/                PRD, battle plan, system prompts, grounding strategy
```

Each workstream has a `BUILD.md` with its exact scope and the interfaces it owns.

## Sponsor tools

| Tool | Role | Package |
|------|------|---------|
| Google Gemini | LLM brain (agent generation, topic classify, STT) | `voice` |
| SLNG | Per-expert voice profiles / TTS | `voice` |
| Tavily | Search + extract for grounding prep + DeepWiki | `deepwiki` |
| Superlinked SIE | Embeddings / rerank / structured output / guardrails | `grounding`, `deepwiki` |

## Running locally

```bash
npm install
cp .env.example .env        # fill keys, or leave ECHO_ADAPTER_MODE=mock to run key-free
npm run typecheck           # builds shared + integration packages
npm run dev:server          # orchestrator on :8787
npm run dev:web             # web app on :3000
```

`ECHO_ADAPTER_MODE=mock` runs the entire stack with deterministic stubs and **no
API keys** — use it for UI work. Set `ECHO_ADAPTER_MODE=real` once keys are set.

## Golden rule for parallel work

The contract in `@echochamber/shared` is the single source of truth. Implement
the interfaces; don't change their shapes without coordinating. Stay inside your
workstream's directory.
