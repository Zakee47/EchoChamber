# Workstream: DeepWiki runtime indexing (`packages/deepwiki`)

You own **only** `packages/deepwiki`. Keep exports (`createDeepWikiProvider`,
`mockDeepWikiProvider`) and the `DeepWikiProvider` interface stable.

## Implement `createDeepWikiProvider` (Tavily + Superlinked SIE)

`buildPersona(name, jobId, onProgress)` → `PersonaRecord`, emitting
`DeepWikiProgress` at each stage (target < 60s):

1. **Tavily SEARCH** (`TAVILY_API_KEY`) — 3–5 queries, e.g.
   `"<name> startup advice"`, `"<name> frameworks opinions"`,
   `"<name> interview transcript"`, `"<name> essays"`, `"<name> philosophy"`.
   → emit `searching`, then `found_sources` with count.
2. **Tavily EXTRACT** — full text of the top ~10–15 results. → emit `parsing`.
3. **Superlinked SIE document→markdown** — clean each page to markdown.
4. **Superlinked SIE structured output** (schema = persona sections) — extract
   `worldview[]`, `communicationStyle`, `naturalTensions[]`, `knownPositions[]`.
   Assemble a `systemPrompt` from the template + these sections. → emit
   `building_persona`.
5. **Embed** grounding chunks (reuse `@echochamber/grounding` if convenient, or
   SIE directly) and cache. → emit `embedding`.
6. → emit `ready` with the finished `PersonaRecord` (tier 3, `generated: true`,
   a category guess, initials avatar, default voice profile).

Quality bar: the generated persona MUST include grounding rules and a
"known positions" section so it behaves like a Tier-2 expert, not a generic mask.
Cap sources; throttle; handle Tavily/SIE errors by emitting `stage: "error"`.

## Done =

`tsc -b` passes; with real keys, indexing a name (e.g. "Jason Fried") yields a
usable persona within ~60s; mock still works without keys. Open a PR into `main`.
