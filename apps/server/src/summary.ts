// Session summary (PRD §14). On end_session, produce a structured summary:
// problem, per-expert positions, agreements, disagreements, next steps,
// key takeaways, + full transcript. LLM-generated when possible, with a
// deterministic fallback so the summary always renders (mock mode).

import type {
  LLMAdapter,
  SessionSummary,
  TranscriptEntry,
  VisualCard,
} from "@echochamber/shared";
import type { PersonaCatalog } from "./personas.js";

export interface SummaryInput {
  roomId: string;
  topic: string;
  transcript: TranscriptEntry[];
  cards: VisualCard[];
  catalog: PersonaCatalog;
  llm: LLMAdapter;
}

export async function buildSummary(input: SummaryInput): Promise<SessionSummary> {
  const { roomId, topic, transcript, cards, catalog, llm } = input;

  const speakers = [...new Set(transcript.filter((e) => e.speaker !== "user").map((e) => e.speaker))];
  const transcriptText = transcript
    .map((e) => `${catalog.get(e.speaker)?.name ?? e.speaker}: ${e.text}`)
    .join("\n");

  const systemPrompt =
    "You summarize an expert roundtable. Return ONLY JSON: " +
    '{"problem":string,"positions":[{"agentId":string,"summary":string}],' +
    '"agreements":string[],"disagreements":string[],"nextSteps":string[],"keyTakeaways":string[]}. ' +
    `Valid agentIds: ${speakers.join(", ")}.`;

  try {
    const raw = await llm.generate({
      systemPrompt,
      userPrompt: `TOPIC: ${topic}\n\nTRANSCRIPT:\n${transcriptText}`,
      temperature: 0.3,
      maxOutputTokens: 800,
    });
    const parsed = parseSummary(raw, roomId, transcript, speakers, catalog);
    if (parsed) return parsed;
  } catch {
    // fall through to heuristic
  }

  return heuristicSummary(roomId, topic, transcript, cards, speakers, catalog);
}

function parseSummary(
  raw: string,
  roomId: string,
  transcript: TranscriptEntry[],
  speakers: string[],
  catalog: PersonaCatalog,
): SessionSummary | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  const positions = Array.isArray(obj.positions)
    ? obj.positions
        .map((p) => {
          if (typeof p !== "object" || p === null) return null;
          const rec = p as Record<string, unknown>;
          const agentId = typeof rec.agentId === "string" ? rec.agentId : "";
          const summary = typeof rec.summary === "string" ? rec.summary : "";
          if (!agentId || !summary || !catalog.get(agentId)) return null;
          return { agentId, summary };
        })
        .filter((p): p is { agentId: string; summary: string } => p !== null)
    : [];

  if (positions.length === 0) return null;

  return {
    roomId,
    problem: typeof obj.problem === "string" ? obj.problem : "",
    positions,
    agreements: strArr(obj.agreements),
    disagreements: strArr(obj.disagreements),
    nextSteps: strArr(obj.nextSteps),
    keyTakeaways: strArr(obj.keyTakeaways),
    transcript,
  };
}

function heuristicSummary(
  roomId: string,
  topic: string,
  transcript: TranscriptEntry[],
  cards: VisualCard[],
  speakers: string[],
  catalog: PersonaCatalog,
): SessionSummary {
  const positions = speakers.map((id) => {
    const lastLine = [...transcript].reverse().find((e) => e.speaker === id);
    return { agentId: id, summary: lastLine?.text ?? "" };
  });

  const names = speakers.map((id) => catalog.get(id)?.name ?? id);
  const reacted = transcript.some((e) => e.refersTo);

  return {
    roomId,
    problem: topic,
    positions,
    agreements:
      names.length > 1
        ? [`${names.join(", ")} engaged on "${topic}".`]
        : [],
    disagreements: reacted
      ? ["Panelists challenged each other's positions during the debate."]
      : [],
    nextSteps: [
      "Review the attributed transcript and takeaway cards.",
      "Re-run with a higher debate intensity to surface more tension.",
    ],
    keyTakeaways: cards.map((c) => c.text).slice(0, 5),
    transcript,
  };
}
