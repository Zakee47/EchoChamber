import type { TTSAdapter, TTSResult, VoiceProfile } from "@echochamber/shared";

const DEFAULT_BASE_URL = "https://api.slng.ai";

// Candidate endpoints to try (SLNG API docs are not publicly available).
const TTS_PATHS = [
  "/v1/audio/speech",
  "/v1/tts",
  "/v1/speech",
  "/v1/synthesize",
] as const;

export function createSlngTTS(apiKey: string, baseUrl?: string): TTSAdapter {
  const base = (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");

  return {
    async synthesize(
      text: string,
      voice: VoiceProfile,
    ): Promise<TTSResult> {
      // Build the request body with voice profile params
      const body: Record<string, unknown> = {
        text,
        input: text,
        voice: voice.voiceId,
        voice_id: voice.voiceId,
        model: "tts-1",
        response_format: "mp3",
      };
      if (voice.pitch !== undefined) body["pitch"] = voice.pitch;
      if (voice.pace !== undefined) body["speed"] = voice.pace;
      if (voice.tone !== undefined) body["tone"] = voice.tone;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      };

      const payload = JSON.stringify(body);
      let lastError = "";

      for (const path of TTS_PATHS) {
        const res = await fetch(`${base}${path}`, {
          method: "POST",
          headers,
          body: payload,
        });

        if (res.status === 404) {
          lastError = `${path} -> 404`;
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(
            `SLNG TTS error ${res.status} at ${path}: ${errText.slice(0, 200)}`,
          );
        }

        return parseResponse(res);
      }

      throw new Error(
        `SLNG TTS: no working endpoint found at ${base} (tried ${TTS_PATHS.join(", ")}). Last: ${lastError}`,
      );
    },
  };
}

async function parseResponse(res: Response): Promise<TTSResult> {
  const contentType = res.headers.get("content-type") ?? "audio/mpeg";

  // If SLNG returns JSON with a URL, use that directly
  if (contentType.includes("application/json")) {
    const json: unknown = await res.json();
    const obj = json as Record<string, unknown>;
    if (typeof obj["url"] === "string") {
      return {
        url: obj["url"],
        mimeType:
          typeof obj["mime_type"] === "string"
            ? obj["mime_type"]
            : "audio/mpeg",
        durationMs:
          typeof obj["duration_ms"] === "number"
            ? obj["duration_ms"]
            : undefined,
      };
    }
  }

  // Binary audio → data URI
  const arrayBuf = await res.arrayBuffer();
  const b64 = Buffer.from(arrayBuf).toString("base64");
  const mime = contentType.split(";")[0]?.trim() ?? "audio/mpeg";
  const durationMs = estimateDuration(arrayBuf.byteLength, mime);

  return {
    url: `data:${mime};base64,${b64}`,
    mimeType: mime,
    durationMs,
  };
}

function estimateDuration(bytes: number, mime: string): number | undefined {
  if (mime.includes("mpeg") || mime.includes("mp3")) {
    return Math.round((bytes * 8) / 128000 * 1000);
  }
  return undefined;
}
