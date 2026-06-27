# Workstream: Voice pipeline (`packages/voice`)

You own **only** `packages/voice`. Implement the real adapters; keep the public
exports (`createLLMAdapter`, `createSTTAdapter`, `createTTSAdapter`, and the
`mock*` ones) and the `@echochamber/shared` interfaces (`LLMAdapter`,
`STTAdapter`, `TTSAdapter`) stable.

## Implement

1. **`createLLMAdapter` (Google Gemini)** — `GEMINI_API_KEY`.
   - `generate` / `generateStream`: short (2–3 sentence) persona turns; honor
     `systemPrompt`, `userPrompt`, `maxOutputTokens`, `temperature`; stream text
     deltas for low latency.
   - `classifyTopic(topic)` → `{ category, tags[] }` (one fast call; constrain
     category to the 6 roster categories).
   - Use the official `@google/genai` SDK. Cap output length hard.
2. **`createSTTAdapter` (Gemini transcription)** — transcribe PTT audio
   (`Uint8Array` + mimeType) → text. Browser Web Speech API may handle STT on the
   client too; still provide a working server-side fallback here.
3. **`createTTSAdapter` (SLNG)** — `SLNG_API_KEY`, `SLNG_BASE_URL`.
   - `synthesize(text, voiceProfile)` → `{ url, mimeType, durationMs? }`.
   - Map each expert's `VoiceProfile` (voiceId/pitch/pace/tone) to SLNG params;
     stream for sub-100ms TTFB where possible. Return a URL or data-URI the
     browser can play.

## Latency

Target < 3s to first audio per agent: stream LLM text, start TTS on the first
sentence boundary, keep responses short. Document any SLNG voice-catalog limits
you hit (how many distinct voices are actually available) in your PR.

## Test

Add a small script (e.g. `npm run smoke`) that, with real keys, generates one
line and synthesizes it. Confirm `tsc -b` passes and mocks still work when keys
are absent. Open a PR into `main`.
