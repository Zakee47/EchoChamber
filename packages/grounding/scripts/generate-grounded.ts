// Script: generate grounded persona JSON files to data/personas/grounded/.
// Run with: npx tsx packages/grounding/scripts/generate-grounded.ts

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPersonas } from "../src/personas.js";

const thisFile = fileURLToPath(import.meta.url);
const thisDir = dirname(thisFile);
const repoRoot = resolve(thisDir, "..", "..", "..");
const outputDir = resolve(repoRoot, "data", "personas", "grounded");

mkdirSync(outputDir, { recursive: true });

const personas = loadPersonas();
const tier1 = personas.filter((p) => p.tier === 1);

console.log(`Writing ${tier1.length} Tier-1 grounded persona files...`);

for (const persona of tier1) {
  const filename = `${persona.id}.json`;
  const filepath = resolve(outputDir, filename);
  writeFileSync(filepath, JSON.stringify(persona, null, 2) + "\n", "utf-8");
  console.log(`  ✓ ${filename} (${persona.groundingChunks.length} chunks)`);
}

console.log(`\nDone. Output: ${outputDir}`);
