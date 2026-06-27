# Workstream: Grounding / RAG + persona assembly (`packages/grounding`)

You own **only** `packages/grounding` and the persona data under
`data/personas/`. Keep exports (`createGroundingProvider`,
`mockGroundingProvider`) and the `GroundingProvider` interface stable.

## Implement

1. **`createGroundingProvider` (Superlinked SIE)** — `SUPERLINKED_API_KEY`,
   `SUPERLINKED_BASE_URL` (OpenAI-compatible `/v1`).
   - `embedChunks(chunks)` → embeddings cached on each chunk.
   - `retrieve(query, chunks, topK=4)` → instruction-following **rerank** so a
     "pricing" question returns pricing opinions, not a career story.
   - `guardrail(text, allowed)` → post-generation check that flags fabricated
     specifics (stretch; mock returns true).
2. **Persona loader + assembler** — export helpers the server uses:
   - Load `data/personas/roster.json` (catalog).
   - Build full `PersonaRecord`s by combining the roster with the skeleton
     prompts in `docs/SYSTEM_PROMPTS.md` (sections 1–4, 6, 7) and, for the **6
     Tier-1 experts**, the grounded knowledge bases in
     `docs/CONTENT_GROUNDING_STRATEGY_COMPLETE.md` (Elena Verna, Keith Rabois,
     Paul Graham, Ryo Lu, Eric Ries, Boris Cherny) parsed into
     `groundingChunks[]` (one chunk per real opinion/framework/story, with a
     `topic` key and `source`).
   - Tier-2 experts get 5–8 condensed positions if time; otherwise skeleton
     prompt only (fine for MVP).
   - Write the assembled records to `data/personas/grounded/*.json` (committed)
     and/or expose a `loadPersonas(): PersonaRecord[]` function.
3. Bake the **anti-hallucination grounding rules** into every assembled prompt
   (sections from the system-prompt template).

## Done =

`tsc -b` passes; `retrieve` returns sensibly ranked chunks for the 6 Tier-1
experts; mock still works without keys. Open a PR into `main`.
