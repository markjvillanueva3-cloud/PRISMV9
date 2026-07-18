#!/usr/bin/env node
/**
 * scripts/merge-cam-lora-datasets.mjs — CAM-AI-TRAINING-MS0/U-CAMT-LORA-MERGE
 *
 * Merge v1 (4-prompt) and v2 (7-prompt) LoRA datasets into a single
 * deduplicated training corpus. Dedup key = JSON.stringify(messages).
 *
 * Output: state/shared/corpus/cam-lora-dataset-merged.jsonl
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

const v1 = load("cam-lora-dataset.jsonl");
const v2 = load("cam-lora-dataset-v2.jsonl");

const seen = new Set();
const merged = [];
for (const rec of [...v1, ...v2]) {
  const key = JSON.stringify(rec.messages);
  if (seen.has(key)) continue;
  seen.add(key);
  merged.push(rec);
}

const out = join(CORPUS, "cam-lora-dataset-merged.jsonl");
writeFileSync(out, merged.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(
  join(CORPUS, "cam-lora-dataset-merged-summary.json"),
  JSON.stringify({
    totalMerged: merged.length,
    v1Count: v1.length,
    v2Count: v2.length,
    deduplicatedFrom: v1.length + v2.length,
    generatedAt: new Date().toISOString(),
  }, null, 2),
);
console.log(`v1=${v1.length} + v2=${v2.length} merged-dedup → ${merged.length} tuples → ${out}`);
