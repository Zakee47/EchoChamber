// Per-agent context assembly (PRD §5.1, §6.5): persona prompt is the system
// instruction; the user turn is built from retrieved grounding + recent
// transcript + the debate-intensity directive + cross-reference instructions.

import type {
  GroundingChunk,
  GroundingProvider,
  PersonaRecord,
  TranscriptEntry,
} from "@echochamber/shared";
import { INTENSITY, type DebateIntensity } from "@echochamber/shared";

const RECENT_TURNS = 8;

export interface ContextInput {
  persona: PersonaRecord;
  topic: string;
  transcript: TranscriptEntry[];
  intensity: DebateIntensity;
  grounding: GroundingProvider;
  /** entry this agent is explicitly reacting to (reactor / @mention). */
  refersTo?: TranscriptEntry;
  /** display-name resolver for transcript speakers. */
  nameOf: (speaker: string) => string;
}

export interface AssembledContext {
  systemPrompt: string;
  userPrompt: string;
  /** grounding actually used, for the optional guardrail pass. */
  used: GroundingChunk[];
}

export async function assembleContext(
  input: ContextInput,
): Promise<AssembledContext> {
  const { persona, topic, transcript, intensity, grounding, refersTo, nameOf } =
    input;

  const recent = transcript.slice(-RECENT_TURNS);
  const query = `${topic} ${recent.map((e) => e.text).join(" ")}`.slice(0, 2000);

  let used: GroundingChunk[] = [];
  if (persona.groundingChunks.length > 0) {
    try {
      used = await grounding.retrieve(query, persona.groundingChunks, 4);
    } catch {
      used = persona.groundingChunks.slice(0, 4);
    }
  }

  const directive = INTENSITY[intensity].directive;

  const parts: string[] = [];
  parts.push(`TOPIC: ${topic}`);

  if (used.length > 0) {
    parts.push(
      "RELEVANT POSITIONS FROM YOUR OWN KNOWLEDGE BASE (ground your answer in these):\n" +
        used.map((c) => `- ${c.text}`).join("\n"),
    );
  }

  if (recent.length > 0) {
    parts.push(
      "RECENT TRANSCRIPT:\n" +
        recent
          .map((e) => `${nameOf(e.speaker)}: ${e.text}`)
          .join("\n"),
    );
  }

  if (refersTo) {
    parts.push(
      `REACT DIRECTLY to what ${nameOf(refersTo.speaker)} just said: "${refersTo.text}". ` +
        `Reference them by name.`,
    );
  }

  parts.push(`DEBATE DIRECTIVE (${INTENSITY[intensity].label}): ${directive}`);
  parts.push(
    "Respond in 2-3 sentences, in your own voice. Reference other panelists by " +
      "name where relevant. Do not invent metrics or quotes you don't have.",
  );

  return {
    systemPrompt: persona.systemPrompt,
    userPrompt: parts.join("\n\n"),
    used,
  };
}
