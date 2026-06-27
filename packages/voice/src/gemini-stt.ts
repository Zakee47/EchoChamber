import { GoogleGenAI } from "@google/genai";
import type { STTAdapter } from "@echochamber/shared";

const MODEL = "gemini-3.5-flash";

export function createGeminiSTT(apiKey: string): STTAdapter {
  const client = new GoogleGenAI({ apiKey });

  return {
    async transcribe(audio: Uint8Array, mimeType: string): Promise<string> {
      const base64 = Buffer.from(audio).toString("base64");
      const res = await client.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: { mimeType, data: base64 },
              },
              {
                text: "Transcribe the audio exactly. Return only the spoken text, no commentary.",
              },
            ],
          },
        ],
        config: {
          temperature: 0.0,
          maxOutputTokens: 500,
        },
      });
      return (res.text ?? "").trim();
    },
  };
}
