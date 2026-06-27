import type { DebateIntensity } from "./types.js";

export interface IntensityConfig {
  level: DebateIntensity;
  label: string;
  /** probability that a reactor is triggered after an agent speaks. */
  reactionProbability: number;
  /** directive injected into each agent prompt for this level. */
  directive: string;
}

export const INTENSITY: Record<DebateIntensity, IntensityConfig> = {
  1: {
    level: 1,
    label: "Collaborative",
    reactionProbability: 0.2,
    directive: "Build on prior points; disagree only gently and find common ground.",
  },
  2: {
    level: 2,
    label: "Balanced",
    reactionProbability: 0.5,
    directive: "Respectfully challenge weak assumptions and offer concrete alternatives.",
  },
  3: {
    level: 3,
    label: "Heated",
    reactionProbability: 0.8,
    directive:
      "Actively debate. Lean into your natural tensions, name who you disagree with, and be direct but professional.",
  },
};

export function intensityConfig(level: DebateIntensity): IntensityConfig {
  return INTENSITY[level];
}
