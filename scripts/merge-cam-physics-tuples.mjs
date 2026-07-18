#!/usr/bin/env node
/**
 * scripts/merge-cam-physics-tuples.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-PHYSICS-MERGE
 *
 * Merge the 4 physics-grounded LoRA tuple files into one unified
 * physics-grounded corpus + sanity-check coverage.
 *
 * Sources:
 *   - cam-speeds-feeds-tuples.jsonl    (210 tuples)
 *   - cam-tool-life-tuples.jsonl       (726 tuples)
 *   - cam-kienzle-force-tuples.jsonl   (264 tuples)
 *   - cam-deflection-tuples.jsonl      (320 tuples)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

function load(name) {
  const f = join(CORPUS, name);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

const sources = [
  "cam-speeds-feeds-tuples.jsonl",
  "cam-tool-life-tuples.jsonl",
  "cam-kienzle-force-tuples.jsonl",
  "cam-deflection-tuples.jsonl",
];

const merged = [];
const perSource = {};
const byKind = {};

for (const src of sources) {
  const recs = load(src);
  perSource[src] = recs.length;
  for (const r of recs) {
    merged.push(r);
    const kind = r.metadata?.kind ?? "unknown";
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }
}

writeFileSync(
  join(CORPUS, "cam-physics-tuples-merged.jsonl"),
  merged.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

writeFileSync(
  join(CORPUS, "cam-physics-tuples-summary.json"),
  JSON.stringify({
    totalTuples: merged.length,
    perSource,
    byKind,
    physicsCoverage: {
      speedsFeeds: byKind["speeds-feeds-recommendation"] ?? 0,
      toolLife: byKind["tool-life-prediction"] ?? 0,
      kienzleForce: byKind["kienzle-force-prediction"] ?? 0,
      deflection: byKind["deflection-prediction"] ?? 0,
    },
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`physics-tuples merged: ${merged.length}`);
for (const [k, v] of Object.entries(byKind)) console.log(`  ${k}: ${v}`);
