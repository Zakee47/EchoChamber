// Real Superlinked SIE provider — OpenAI-compatible /v1 endpoint.
// Uses embeddings for chunk caching and instruction-following rerank
// so a "pricing" question returns pricing opinions, not career stories.

import type { GroundingChunk, GroundingProvider } from "@echochamber/shared";

export interface SuperlinkedConfig {
  apiKey: string;
  baseUrl: string;
}

/** Cosine similarity between two vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) * (a[i] ?? 0);
    normB += (b[i] ?? 0) * (b[i] ?? 0);
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function createSuperlinkedProvider(cfg: SuperlinkedConfig): GroundingProvider {
  const { apiKey, baseUrl } = cfg;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  async function embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: texts,
        model: "embedding",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SIE embeddings failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return json.data.map((d) => d.embedding);
  }

  async function rerank(
    query: string,
    documents: string[],
    topK: number,
    instruction?: string,
  ): Promise<Array<{ index: number; relevance_score: number }>> {
    const res = await fetch(`${baseUrl}/v1/rerank`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "rerank",
        query,
        documents,
        top_n: topK,
        ...(instruction ? { instruction } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`SIE rerank failed (${res.status}): ${body}`);
    }
    const json = (await res.json()) as {
      results: Array<{ index: number; relevance_score: number }>;
    };
    return json.results;
  }

  return {
    async embedChunks(chunks: GroundingChunk[]): Promise<GroundingChunk[]> {
      // Only embed chunks that don't already have embeddings
      const needsEmbed = chunks.filter((c) => !c.embedding || c.embedding.length === 0);
      if (needsEmbed.length === 0) return chunks;

      // Batch in groups of 64 (typical SIE limit)
      const batchSize = 64;
      const results = [...chunks];
      for (let i = 0; i < needsEmbed.length; i += batchSize) {
        const batch = needsEmbed.slice(i, i + batchSize);
        const texts = batch.map((c) => `[${c.topic}] ${c.text}`);
        const embeddings = await embed(texts);
        for (let j = 0; j < batch.length; j++) {
          const chunkToUpdate = results.find((r) => r.id === batch[j]!.id);
          if (chunkToUpdate) {
            chunkToUpdate.embedding = embeddings[j]!;
          }
        }
      }
      return results;
    },

    async retrieve(
      query: string,
      chunks: GroundingChunk[],
      topK = 4,
    ): Promise<GroundingChunk[]> {
      if (chunks.length === 0) return [];
      if (chunks.length <= topK) return chunks;

      // Use instruction-following rerank for topic-aware retrieval
      const documents = chunks.map((c) => `[${c.topic}] ${c.text}`);
      const instruction =
        "Rank documents by relevance to the query topic. " +
        "Prefer documents whose topic directly matches the question subject. " +
        "A pricing question should return pricing opinions, not career stories.";

      try {
        const ranked = await rerank(query, documents, topK, instruction);
        return ranked.map((r) => chunks[r.index]!);
      } catch {
        // Fallback: use embedding similarity if rerank endpoint unavailable
        const queryEmbedding = (await embed([query]))[0]!;
        const scored = chunks
          .filter((c) => c.embedding && c.embedding.length > 0)
          .map((c) => ({
            chunk: c,
            score: cosineSimilarity(queryEmbedding, c.embedding!),
          }))
          .sort((a, b) => b.score - a.score);
        return scored.slice(0, topK).map((s) => s.chunk);
      }
    },

    async guardrail(text: string, allowed: GroundingChunk[]): Promise<boolean> {
      // Use chat completions to check if generated text is grounded
      const allowedContent = allowed
        .map((c) => `[${c.topic}]: ${c.text}`)
        .join("\n\n");

      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "guardrail",
          messages: [
            {
              role: "system",
              content:
                "You are a grounding guardrail. Check if the given text makes claims that are supported by the allowed knowledge base. " +
                "Respond with JSON: {\"grounded\": true} if the text is grounded, or {\"grounded\": false, \"reason\": \"...\"} if it contains fabricated specifics.",
            },
            {
              role: "user",
              content: `ALLOWED KNOWLEDGE BASE:\n${allowedContent}\n\nTEXT TO CHECK:\n${text}`,
            },
          ],
          temperature: 0,
          max_tokens: 100,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        // Fail open — if guardrail service is unavailable, allow the text
        return true;
      }

      const json = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      try {
        const content = json.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(content) as { grounded?: boolean };
        return parsed.grounded !== false;
      } catch {
        return true;
      }
    },
  };
}
