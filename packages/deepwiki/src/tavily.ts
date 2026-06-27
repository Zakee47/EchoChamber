// Tavily Search + Extract API client for DeepWiki runtime indexing.

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyExtractResult {
  url: string;
  raw_content: string;
}

/** Run 3-5 diverse queries for an expert name, dedup by URL. */
export async function tavilySearch(
  apiKey: string,
  name: string,
): Promise<TavilySearchResult[]> {
  const queries = [
    `${name} startup advice`,
    `${name} frameworks opinions`,
    `${name} interview transcript`,
    `${name} essays`,
    `${name} philosophy`,
  ];

  const allResults: TavilySearchResult[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const res = await fetch(TAVILY_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: 5,
          search_depth: "basic",
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Tavily search ${res.status}: ${body}`);
      }

      const data = (await res.json()) as { results: TavilySearchResult[] };
      for (const r of data.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          allResults.push(r);
        }
      }
    } catch (err) {
      // Swallow per-query errors; continue with remaining queries.
      if (allResults.length === 0 && query === queries[queries.length - 1]) {
        throw err; // re-throw only if every query failed
      }
    }
  }

  return allResults;
}

/** Extract full page content for a batch of URLs. */
export async function tavilyExtract(
  apiKey: string,
  urls: string[],
): Promise<TavilyExtractResult[]> {
  if (urls.length === 0) return [];

  const results: TavilyExtractResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    try {
      const res = await fetch(TAVILY_EXTRACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, urls: batch }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Tavily extract ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        results: TavilyExtractResult[];
        failed_results?: { url: string; error: string }[];
      };
      results.push(...data.results);
    } catch {
      // Continue with remaining batches on failure.
    }
  }

  return results;
}
