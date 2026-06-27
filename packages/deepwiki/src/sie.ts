// Superlinked SIE client — OpenAI-compatible /v1 endpoint.
// Provides: doc-to-markdown cleanup, structured persona extraction, embeddings.

export interface SieConfig {
  apiKey: string;
  baseUrl: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sieHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

/** Basic text cleanup fallback when SIE is unavailable. */
export function basicCleanup(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Document-to-markdown ────────────────────────────────────────────────────

/** Clean raw page text to structured markdown via SIE chat/completions. */
export async function sieDocToMarkdown(
  cfg: SieConfig,
  rawTexts: string[],
): Promise<string[]> {
  const results: string[] = [];

  for (const raw of rawTexts) {
    const truncated = raw.slice(0, 12_000);
    try {
      const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: sieHeaders(cfg.apiKey),
        body: JSON.stringify({
          model: "default",
          messages: [
            {
              role: "system",
              content:
                "Convert the following raw web page text to clean, well-structured markdown. " +
                "Remove navigation, ads, cookie banners, headers, footers, and irrelevant boilerplate. " +
                "Keep only the substantive article, essay, or interview content. Output clean markdown only.",
            },
            { role: "user", content: truncated },
          ],
          max_tokens: 6000,
          temperature: 0,
        }),
      });

      if (!res.ok) throw new Error(`SIE doc-to-md ${res.status}`);

      const data = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      results.push(data.choices[0]?.message?.content ?? basicCleanup(truncated));
    } catch {
      results.push(basicCleanup(truncated));
    }
  }

  return results;
}

// ── Structured persona extraction ───────────────────────────────────────────

export interface ExtractedPersona {
  background: string;
  title: string;
  category: string;
  expertiseTags: string[];
  worldview: string[];
  communicationStyle: string;
  naturalTensions: { topic: string; position: string }[];
  knownPositions: { topic: string; position: string; source?: string }[];
}

const PERSONA_EXTRACTION_PROMPT = `You are a structured information extractor. Given a collection of articles, interviews, essays, and other content by or about a specific person, extract a structured persona profile.

Return a JSON object with these exact fields:
- "background": a 1-2 sentence professional background summary
- "title": their current or most notable professional title/role (keep concise)
- "category": one of "product", "design", "growth", "vc", "engineering", "founder" — pick the best fit
- "expertiseTags": array of 4-8 lowercase topic tags (e.g. "plg", "pricing", "hiring")
- "worldview": array of 4-8 core beliefs/principles that drive their advice (each a 1-2 sentence statement)
- "communicationStyle": a paragraph describing how they communicate (tone, mannerisms, catchphrases)
- "naturalTensions": array of 2-4 objects with "topic" and "position" fields describing areas where they hold strong/contrarian views
- "knownPositions": array of 6-12 objects with "topic", "position", and optional "source" fields — their most notable real opinions with direct quotes or close paraphrases

Focus on REAL, SPECIFIC positions with quotes where possible. Do not invent opinions.
Return valid JSON only — no markdown fences, no commentary.`;

/** Extract structured persona fields from cleaned content via SIE. */
export async function sieStructuredOutput(
  cfg: SieConfig,
  name: string,
  markdownContent: string,
): Promise<ExtractedPersona> {
  const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: sieHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: "default",
      messages: [
        { role: "system", content: PERSONA_EXTRACTION_PROMPT },
        {
          role: "user",
          content: `Extract a structured persona profile for **${name}** from the following content:\n\n${markdownContent.slice(0, 30_000)}`,
        },
      ],
      max_tokens: 4000,
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SIE structured output ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const raw = data.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as ExtractedPersona;
}

// ── Gemini fallback for structured persona extraction ────────────────────────

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/** Fallback: extract persona via Gemini when SIE is unavailable. */
export async function geminiStructuredOutput(
  geminiApiKey: string,
  name: string,
  markdownContent: string,
): Promise<ExtractedPersona> {
  const res = await fetch(`${GEMINI_URL}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                PERSONA_EXTRACTION_PROMPT +
                `\n\nExtract a structured persona profile for **${name}** from the following content:\n\n` +
                markdownContent.slice(0, 30_000),
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 4000,
        temperature: 0,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini structured output ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  const raw = data.candidates[0]?.content?.parts[0]?.text ?? "{}";
  return JSON.parse(raw) as ExtractedPersona;
}

// ── Embeddings ──────────────────────────────────────────────────────────────

/** Embed text chunks via SIE's OpenAI-compatible embeddings endpoint. */
export async function sieEmbed(
  cfg: SieConfig,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch(`${cfg.baseUrl}/v1/embeddings`, {
    method: "POST",
    headers: sieHeaders(cfg.apiKey),
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: texts,
    }),
  });

  if (!res.ok) {
    throw new Error(`SIE embed ${res.status}`);
  }

  const data = (await res.json()) as {
    data: { embedding: number[] }[];
  };
  return data.data.map((d) => d.embedding);
}

/** Simple hash-based fallback embeddings (deterministic, low-quality). */
export function fallbackEmbed(texts: string[]): number[][] {
  return texts.map((t) => {
    const vec = new Array<number>(64).fill(0);
    for (let i = 0; i < t.length; i++) {
      vec[i % 64] = (vec[i % 64]! + t.charCodeAt(i)) % 256;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  });
}
