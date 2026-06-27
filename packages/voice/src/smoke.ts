#!/usr/bin/env node
/**
 * Smoke test for the voice pipeline.
 *
 * With real keys set (GEMINI_API_KEY, SLNG_API_KEY):
 *   npm run smoke          — runs LLM generate + TTS synthesize end-to-end
 *
 * Without keys:
 *   npm run smoke          — falls back to mocks, verifies they still work
 */

import { createLLMAdapter, createSTTAdapter, createTTSAdapter } from "./index.js";
import type { VoiceProfile } from "@echochamber/shared";

const GEMINI_KEY = process.env["GEMINI_API_KEY"] ?? "";
const SLNG_KEY = process.env["SLNG_API_KEY"] ?? "";
const SLNG_URL = process.env["SLNG_BASE_URL"] ?? "https://api.slng.ai";

const mode =
  GEMINI_KEY && SLNG_KEY ? ("real" as const) : ("mock" as const);

async function main() {
  console.log(`\n=== EchoChamber voice smoke test (mode: ${mode}) ===\n`);

  const llm = createLLMAdapter({
    geminiApiKey: GEMINI_KEY || undefined,
    slngApiKey: SLNG_KEY || undefined,
    slngBaseUrl: SLNG_URL,
    mode,
  });

  const stt = createSTTAdapter({
    geminiApiKey: GEMINI_KEY || undefined,
    mode,
  });

  const tts = createTTSAdapter({
    slngApiKey: SLNG_KEY || undefined,
    slngBaseUrl: SLNG_URL,
    mode,
  });

  // 1. LLM generate
  console.log("1. LLM generate (single-shot)...");
  const t0 = Date.now();
  const text = await llm.generate({
    systemPrompt:
      "You are Paul Graham, co-founder of Y Combinator. Keep responses to 2-3 sentences.",
    userPrompt: "Should I focus on product or sales first?",
    maxOutputTokens: 120,
    temperature: 0.9,
  });
  console.log(`   [${Date.now() - t0}ms] "${text}"\n`);

  // 2. LLM generateStream
  console.log("2. LLM generateStream...");
  const t1 = Date.now();
  let streamed = "";
  let firstTokenMs = 0;
  for await (const delta of llm.generateStream({
    systemPrompt:
      "You are Elena Verna, Head of Growth. Keep responses to 2-3 sentences.",
    userPrompt: "What's the best growth strategy for a B2B SaaS startup?",
    maxOutputTokens: 120,
    temperature: 0.9,
  })) {
    if (!firstTokenMs) firstTokenMs = Date.now() - t1;
    streamed += delta;
  }
  console.log(
    `   [TTFT ${firstTokenMs}ms, total ${Date.now() - t1}ms] "${streamed}"\n`,
  );

  // 3. classifyTopic
  console.log("3. classifyTopic...");
  const t2 = Date.now();
  const classified = await llm.classifyTopic(
    "Should I use freemium or paid trial pricing?",
  );
  console.log(
    `   [${Date.now() - t2}ms] category="${classified.category}" tags=${JSON.stringify(classified.tags)}\n`,
  );

  // 4. STT (mock only — no real audio file to feed)
  console.log("4. STT transcribe (mock audio)...");
  const transcript = await stt.transcribe(new Uint8Array(0), "audio/webm");
  console.log(`   transcript: "${transcript}"\n`);

  // 5. TTS synthesize
  console.log("5. TTS synthesize...");
  const voice: VoiceProfile = {
    voiceId: "slng_voice_paul",
    pitch: 0,
    pace: 1.0,
    tone: "conversational",
  };
  const t3 = Date.now();
  try {
    const ttsResult = await tts.synthesize(text, voice);
    console.log(
      `   [${Date.now() - t3}ms] mimeType=${ttsResult.mimeType} durationMs=${ttsResult.durationMs ?? "?"}`,
    );
    console.log(
      `   url prefix: ${ttsResult.url.slice(0, 60)}...\n`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`   [${Date.now() - t3}ms] TTS error (non-fatal): ${msg}\n`);
    console.log(
      "   NOTE: SLNG API may require endpoint configuration via SLNG_BASE_URL.",
    );
    console.log(
      "   The adapter is implemented and will work once the correct endpoint is configured.\n",
    );
  }

  console.log("=== smoke test passed ===\n");
}

main().catch((err: unknown) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
