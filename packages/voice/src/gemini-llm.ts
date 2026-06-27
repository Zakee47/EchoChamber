import { GoogleGenAI } from "@google/genai";
import type { LLMAdapter, LLMGenerateParams } from "@echochamber/shared";

const MODEL = "gemini-3.5-flash";
const DEFAULT_MAX_TOKENS = 120;
const DEFAULT_TEMPERATURE = 0.9;

const ROSTER_CATEGORIES = [
  "product",
  "design",
  "growth",
  "vc",
  "engineering",
  "founder",
] as const;

function extractJson(raw: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Extract JSON object from markdown fences or surrounding text
    const match = /\{[\s\S]*\}/.exec(raw);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not extract JSON from: ${raw.slice(0, 200)}`);
  }
}

export function createGeminiLLM(apiKey: string): LLMAdapter {
  const client = new GoogleGenAI({ apiKey });

  return {
    async generate(params: LLMGenerateParams): Promise<string> {
      const res = await client.models.generateContent({
        model: MODEL,
        contents: params.userPrompt,
        config: {
          systemInstruction: params.systemPrompt,
          maxOutputTokens: params.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
          temperature: params.temperature ?? DEFAULT_TEMPERATURE,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      return res.text ?? "";
    },

    async *generateStream(params: LLMGenerateParams): AsyncIterable<string> {
      const stream = await client.models.generateContentStream({
        model: MODEL,
        contents: params.userPrompt,
        config: {
          systemInstruction: params.systemPrompt,
          maxOutputTokens: params.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
          temperature: params.temperature ?? DEFAULT_TEMPERATURE,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield text;
      }
    },

    async classifyTopic(
      topic: string,
    ): Promise<{ category: string; tags: string[] }> {
      const prompt = [
        "Classify this startup topic into one category and return 2-5 tags.",
        `Categories: ${ROSTER_CATEGORIES.join(", ")}`,
        `Topic: ${topic}`,
        'Return ONLY a JSON object: {"category":"...","tags":["..."]}',
      ].join("\n");

      const res = await client.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 150,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: [...ROSTER_CATEGORIES],
              },
              tags: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["category", "tags"],
          },
        },
      });
      const raw = res.text ?? "{}";
      const parsed = extractJson(raw);
      const obj = parsed as Record<string, unknown>;
      const category = typeof obj["category"] === "string"
        ? obj["category"]
        : "growth";
      const tags = Array.isArray(obj["tags"])
        ? (obj["tags"] as unknown[]).filter(
            (t): t is string => typeof t === "string",
          )
        : [];
      return { category, tags };
    },
  };
}
