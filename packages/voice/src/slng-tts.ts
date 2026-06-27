import type { TTSAdapter, TTSResult, VoiceProfile } from "@echochamber/shared";

// SLNG Unified API (https://docs.slng.ai/execution-layer/unified-api).
// The model is encoded in the URL path; the request body is identical across
// providers: { voice, text }. Default target is SLNG-hosted Deepgram Aura 2.
const DEFAULT_BASE_URL = "https://api.slng.ai/v1/bridges/unmute/tts";
const DEFAULT_MODEL = "slng/deepgram/aura:2-en";

// Verified-working Aura 2 English voices, used to give each expert a distinct
// voice when their persona doesn't already specify an `aura-2-*-en` id.
const VOICE_POOL = [
  "aura-2-orion-en",
  "aura-2-arcas-en",
  "aura-2-apollo-en",
  "aura-2-zeus-en",
  "aura-2-atlas-en",
  "aura-2-draco-en",
  "aura-2-orpheus-en",
  "aura-2-jupiter-en",
  "aura-2-mars-en",
  "aura-2-pluto-en",
  "aura-2-saturn-en",
  "aura-2-hyperion-en",
  "aura-2-asteria-en",
  "aura-2-thalia-en",
  "aura-2-luna-en",
  "aura-2-athena-en",
  "aura-2-hera-en",
  "aura-2-andromeda-en",
  "aura-2-aurora-en",
  "aura-2-iris-en",
  "aura-2-cordelia-en",
  "aura-2-callista-en",
] as const;

const AURA_VOICE_RE = /^aura-2-[a-z]+-en$/;

/** Resolve a persona voiceId to a valid Aura 2 voice. Passes through real Aura
 *  ids; deterministically maps any placeholder (e.g. `slng_paul-graham`). */
function resolveVoice(voiceId: string | undefined): string {
  if (voiceId && AURA_VOICE_RE.test(voiceId)) return voiceId;
  const key = voiceId ?? "default";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h << 5) - h + key.charCodeAt(i);
  return VOICE_POOL[Math.abs(h) % VOICE_POOL.length]!;
}

export function createSlngTTS(
  apiKey: string,
  baseUrl?: string,
  model?: string,
): TTSAdapter {
  const base = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const modelPath = (model ?? DEFAULT_MODEL).replace(/^\/+/, "").replace(/\/+$/, "");
  const url = `${base}/${modelPath}`;

  return {
    async synthesize(text: string, voice: VoiceProfile): Promise<TTSResult> {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify({ voice: resolveVoice(voice.voiceId), text }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(
          `SLNG TTS error ${res.status} at ${url}: ${errText.slice(0, 200)}`,
        );
      }

      return parseResponse(res);
    },
  };
}

async function parseResponse(res: Response): Promise<TTSResult> {
  const contentType = res.headers.get("content-type") ?? "audio/wav";

  // If SLNG returns JSON with a URL, use that directly.
  if (contentType.includes("application/json")) {
    const json: unknown = await res.json();
    const obj = json as Record<string, unknown>;
    if (typeof obj["url"] === "string") {
      return {
        url: obj["url"],
        mimeType:
          typeof obj["mime_type"] === "string"
            ? obj["mime_type"]
            : "audio/wav",
        durationMs:
          typeof obj["duration_ms"] === "number"
            ? obj["duration_ms"]
            : undefined,
      };
    }
  }

  // Binary audio → data URI.
  const arrayBuf = await res.arrayBuffer();
  const b64 = Buffer.from(arrayBuf).toString("base64");
  const mime = contentType.split(";")[0]?.trim() ?? "audio/wav";
  const durationMs = estimateDuration(arrayBuf.byteLength, mime);

  return {
    url: `data:${mime};base64,${b64}`,
    mimeType: mime,
    durationMs,
  };
}

function estimateDuration(bytes: number, mime: string): number | undefined {
  // Aura 2 returns 16-bit mono PCM WAV at 24 kHz (48000 bytes/sec).
  if (mime.includes("wav") || mime.includes("pcm")) {
    return Math.round(((Math.max(0, bytes - 44)) / 48000) * 1000);
  }
  if (mime.includes("mpeg") || mime.includes("mp3")) {
    return Math.round(((bytes * 8) / 128000) * 1000);
  }
  return undefined;
}
