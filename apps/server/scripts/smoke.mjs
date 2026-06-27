// Mock-mode smoke test: drives a full multi-agent turn over the REST + WS API.
//
//   node apps/server/scripts/smoke.mjs           (server must be running)
//
// Verifies: suggest-panel → create room → connect WS → user utterance →
// selection (2-3 streamed responses + reactor per intensity) → cards → summary.

import WebSocket from "ws";

const BASE = process.env.ECHO_BASE_URL ?? "http://localhost:8787";
const WS_BASE = BASE.replace(/^http/, "ws");

const TIER1 = [
  "elena-verna",
  "keith-rabois",
  "paul-graham",
  "ryo-lu",
  "eric-ries",
  "boris-cherny",
];

async function json(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const counters = {
  speakers: new Set(),
  reactions: 0,
  finalTranscripts: 0,
  cards: 0,
  audio: 0,
  handRaises: 0,
  summary: false,
};

function onMessage(raw) {
  const msg = JSON.parse(raw.toString());
  switch (msg.type) {
    case "speaker_state":
      if (msg.state === "speaking") process.stdout.write(`\n[${msg.agentId}] `);
      break;
    case "transcript":
      if (msg.entry.partial === false && msg.entry.speaker !== "user") {
        counters.finalTranscripts++;
        counters.speakers.add(msg.entry.speaker);
        if (msg.entry.refersTo) counters.reactions++;
        console.log(`\n  -> ${msg.entry.speaker}${msg.entry.refersTo ? " (reacts)" : ""}: ${msg.entry.text}`);
      }
      break;
    case "card":
      counters.cards++;
      console.log(`  [card:${msg.card.type}] ${msg.card.text} (${msg.card.attribution})`);
      break;
    case "audio":
      counters.audio++;
      break;
    case "hand_raise":
      counters.handRaises++;
      console.log(`  [hand] ${msg.handRaise.agentId}: ${msg.handRaise.reason}`);
      break;
    case "summary":
      counters.summary = true;
      console.log(`\n=== SUMMARY ===\nproblem: ${msg.summary.problem}`);
      console.log(`positions: ${msg.summary.positions.map((p) => p.agentId).join(", ")}`);
      console.log(`agreements: ${msg.summary.agreements.length}, disagreements: ${msg.summary.disagreements.length}, nextSteps: ${msg.summary.nextSteps.length}`);
      console.log(`takeaways: ${msg.summary.keyTakeaways.length}, transcript entries: ${msg.summary.transcript.length}`);
      break;
    case "error":
      console.error(`  [error] ${msg.message}`);
      break;
    default:
      break;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const experts = await json("/api/experts");
  console.log(`experts: ${experts.experts.length}`);

  const suggestion = await json("/api/rooms/suggest-panel", {
    topic: "Should we go freemium or sales-led for our B2B SaaS?",
  });
  console.log(`suggest-panel: ${suggestion.panel.join(", ")}`);
  console.log(`  rationale: ${suggestion.rationale}`);

  const { roomId } = await json("/api/rooms", {
    topic: "Should we go freemium or sales-led for our B2B SaaS?",
    panel: TIER1,
    intensity: 3,
  });
  console.log(`room: ${roomId}`);

  const ws = new WebSocket(`${WS_BASE}/ws/rooms/${roomId}`);
  await new Promise((res, rej) => {
    ws.on("open", res);
    ws.on("error", rej);
  });
  ws.on("message", onMessage);

  ws.send(JSON.stringify({ type: "user_utterance", text: "Should we go freemium or sales-led for our B2B SaaS?" }));
  await sleep(2500);

  ws.send(JSON.stringify({ type: "mention", agentId: "keith-rabois", text: "Keith, isn't freemium a trap at enterprise scale?" }));
  await sleep(2000);

  ws.send(JSON.stringify({ type: "set_intensity", level: 1 }));
  ws.send(JSON.stringify({ type: "continue_debate" }));
  await sleep(2000);

  ws.send(JSON.stringify({ type: "end_session" }));
  await sleep(1500);
  ws.close();

  console.log("\n\n=== RESULTS ===");
  console.log(JSON.stringify({
    distinctSpeakers: [...counters.speakers],
    finalTranscripts: counters.finalTranscripts,
    reactions: counters.reactions,
    cards: counters.cards,
    audio: counters.audio,
    handRaises: counters.handRaises,
    summary: counters.summary,
  }, null, 2));

  const ok =
    counters.speakers.size >= 2 &&
    counters.finalTranscripts >= 3 &&
    counters.cards >= 1 &&
    counters.audio >= 1 &&
    counters.summary;
  console.log(ok ? "\nSMOKE PASS" : "\nSMOKE FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
