# Workstream: Web frontend (`apps/web`)

You own **only** `apps/web`. Do not modify `packages/*` or `apps/server`. The
API/WS contract is fixed in `@echochamber/shared` — import types from there.

## Build

Scaffold **Next.js (App Router, TypeScript, Tailwind)** inside `apps/web`, then
build these screens (desktop-first; design is yours — be tasteful and modern,
inspired by Clubhouse but a polished web app, not a phone clone):

1. **Lobby / Explore** — grid of live & upcoming rooms (topic, expert avatars,
   participant count) + "Create Room". An interests/categories strip
   (Product, Design, Growth, VC, Engineering, Founders) like the reference.
2. **Create Room flow** — free-text problem → call `POST /api/rooms/suggest-panel`
   → show suggested 4–5 experts + "why these experts" rationale → user can swap
   experts (from `GET /api/experts`) → debate-intensity slider
   (Collaborative / Balanced / Heated) → "Start Session" (`POST /api/rooms`).
3. **Room View (hero)** — circular expert avatars in a roundtable arrangement
   with the user mic seat centered; **active speaker glows/pulses**; live
   attributed transcript streaming in; "✋ [Name] wants to speak" inline;
   visual cards sidebar (takeaways / frameworks / action items); large
   **push-to-talk** button; `@mention` bar; debate slider (adjustable
   mid-session); "End Session → Summary + Transcript".
4. **DeepWiki builder** — name input → streamed progress
   (Searching → Found N → Parsing → Building persona → Ready) → new avatar card
   appears in the picker. (`POST /api/deepwiki/index`, progress over WS.)

## Real-time

Connect to the orchestrator WebSocket at `${NEXT_PUBLIC_WS_URL}/ws/rooms/:roomId`.
Handle all `ServerMessage` types (`speaker_state`, `transcript`, `audio`,
`hand_raise`, `card`, `deepwiki_progress`, `summary`, `error`) and send
`ClientMessage` types. Maintain a **sequential audio playback queue** (one
speaker audible at a time) keyed off `audio.seq`; render transcript text as soon
as it streams so the room never feels dead. Microphone PTT: capture audio, send
`user_utterance` (text via Web Speech API is fine for MVP, or base64 audio).

## Integrate against the server

Run the orchestrator in mock mode (`ECHO_ADAPTER_MODE=mock npm run dev:server`)
— it serves `/api/experts` and a live WS so you can build without real keys.

## Done = 

`npm run dev:web` boots; all 4 screens navigable; room view animates speaker
state and plays the audio queue; works end-to-end against the mock server.
Open a PR into `main`.
