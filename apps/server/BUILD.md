# Workstream: Orchestrator + WebSocket server (`apps/server`)

You own **only** `apps/server`. Do not modify `apps/web` or the `packages/*`
implementations (you may rely on their exported factories + mocks). Treat
`@echochamber/shared` as fixed; if you genuinely need a contract change, note it
in your PR rather than editing types unilaterally.

## Build (PRD §6 is the source of truth)

Replace the starter stub with the real engine:

1. **REST**: `GET /api/experts`, `POST /api/rooms/suggest-panel`,
   `POST /api/rooms`, `GET /api/rooms`, `GET /api/rooms/:roomId`,
   `POST /api/deepwiki/index`. In-memory store keyed by `roomId` (no DB).
2. **Session state machine**: LOBBY → CREATING → IN_ROOM
   (IDLE / USER_SPEAKING / TRANSCRIBING / SELECTING / AGENT_TURN /
   HAND_RAISE_WAIT) → END_SESSION → SUMMARY.
3. **Agent selection** (`selectAgents`): classify topic (via `llm.classifyTopic`
   or grounding embeddings) → score panel members (category + expertise match +
   no-repeat penalty) → pick top 2 → ensure at least one DISSENTER from
   `naturalTensions` → 2–3 agents. Compute hand-raisers (high-score, unselected).
4. **Turn engine**: for each selected agent (sequential): assemble context
   (persona prompt + `grounding.retrieve(topic, chunks)` + recent transcript +
   `INTENSITY[level].directive`), call `llm.generateStream`, stream `transcript`
   then `tts.synthesize` → emit `audio`. After each agent, roll
   `random() < INTENSITY[level].reactionProbability` → pick a **reactor** with a
   natural tension vs. the last speaker; reactor references the prior line.
5. **Moderation**: `@mention` forces an agent next; `admit_hand` lets a
   hand-raiser speak next; `set_intensity` takes effect next turn.
6. **Visual cards**: every 3–4 responses, async `llm` call extracts frameworks /
   action items / takeaways with attribution → emit `card` (never block the turn).
7. **Summary** on `end_session`: problem, per-expert positions, agreements,
   disagreements, next steps, full transcript → emit `summary`.
8. **DeepWiki**: on index request, run `deepwiki.buildPersona` and forward
   `DeepWikiProgress` over WS; add the persona to the in-memory catalog.

## Adapters

Build the `AdapterBundle` from the package factories, honoring
`ECHO_ADAPTER_MODE` (mock vs real). Depend only on the interfaces in
`@echochamber/shared` — never import a vendor SDK directly here.

## Done =

`ECHO_ADAPTER_MODE=mock npm run dev:server` runs a full multi-agent turn over WS
(selection → 2–3 streamed responses → reactor per intensity → cards → summary),
and `ECHO_ADAPTER_MODE=real` works once packages land. Open a PR into `main`.
