// Adapter bundle wiring. Builds the AdapterBundle from each package's exported
// factory, honoring ECHO_ADAPTER_MODE (mock vs real). The orchestrator depends
// ONLY on the @echochamber/shared interfaces — never on a vendor SDK.

import type { AdapterBundle } from "@echochamber/shared";
import {
  createLLMAdapter,
  createSTTAdapter,
  createTTSAdapter,
} from "@echochamber/voice";
import { createGroundingProvider } from "@echochamber/grounding";
import { createDeepWikiProvider } from "@echochamber/deepwiki";

export type AdapterMode = "real" | "mock";

export function resolveMode(): AdapterMode {
  return process.env.ECHO_ADAPTER_MODE === "real" ? "real" : "mock";
}

export function buildAdapterBundle(mode: AdapterMode): AdapterBundle {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const slngApiKey = process.env.SLNG_API_KEY;
  const slngBaseUrl = process.env.SLNG_BASE_URL;
  const slngModel = process.env.SLNG_MODEL;
  const superlinkedApiKey = process.env.SUPERLINKED_API_KEY;
  const superlinkedBaseUrl = process.env.SUPERLINKED_BASE_URL;
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  return {
    llm: createLLMAdapter({ geminiApiKey, mode }),
    stt: createSTTAdapter({ geminiApiKey, mode }),
    tts: createTTSAdapter({ slngApiKey, slngBaseUrl, slngModel, mode }),
    grounding: createGroundingProvider({
      superlinkedApiKey,
      superlinkedBaseUrl,
      mode,
    }),
    deepwiki: createDeepWikiProvider({
      tavilyApiKey,
      superlinkedApiKey,
      superlinkedBaseUrl,
      geminiApiKey,
      mode,
    }),
  };
}
