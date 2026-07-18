#!/usr/bin/env node
/**
 * scripts/merge-cam-master-training-set.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-MASTER-MERGE
 *
 * Final mega-merge: stack every LoRA/instruction-tuning tuple track
 * (templates + physics + param-reco + cross-system translation) into
 * ONE master training jsonl. Deduplicates by JSON.stringify(messages).
 *
 * Output:
 *   - state/shared/corpus/cam-master-training-set.jsonl
 *   - state/shared/corpus/cam-master-training-set-summary.json
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

const tracks = [
  { name: "template-lora-v2",         file: "cam-lora-dataset-merged.jsonl" },
  { name: "physics-grounded",         file: "cam-physics-tuples-merged.jsonl" },
  { name: "param-recommendation",     file: "cam-param-recommendation.jsonl" },
  { name: "cross-system-translation", file: "cam-cross-system-translation.jsonl" },
  { name: "iso286-fit",               file: "cam-iso286-fit-tuples.jsonl" },
  { name: "surface-finish",           file: "cam-surface-finish-tuples.jsonl" },
  { name: "coolant-decision",         file: "cam-coolant-decision-tuples.jsonl" },
  { name: "operator-gate",            file: "cam-operator-gate-tuples.jsonl" },
];

const seen = new Set();
const merged = [];
const perTrack = {};
const byKind = {};
let dupes = 0;

for (const track of tracks) {
  const recs = load(track.file);
  let kept = 0;
  for (const rec of recs) {
    const key = JSON.stringify(rec.messages);
    if (seen.has(key)) { dupes++; continue; }
    seen.add(key);
    // Annotate origin track
    const augmented = {
      ...rec,
      metadata: { ...(rec.metadata ?? {}), track: track.name },
    };
    merged.push(augmented);
    const kind = rec.metadata?.kind ?? track.name;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    kept++;
  }
  perTrack[track.name] = { source: recs.length, kept };
  console.log(`${track.name}: source=${recs.length} kept=${kept}`);
}

writeFileSync(
  join(CORPUS, "cam-master-training-set.jsonl"),
  merged.map((r) => JSON.stringify(r)).join("\n") + "\n"
);

writeFileSync(
  join(CORPUS, "cam-master-training-set-summary.json"),
  JSON.stringify({
    totalTuples: merged.length,
    duplicatesSkipped: dupes,
    perTrack,
    byKind,
    tracks: tracks.map((t) => t.name),
    provenance: {
      realDataOnly: true,
      sourceMilestone: "CAM-AI-TRAINING-MS0",
      sourceSlot: "kilo",
      operatorConstraint: "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)",
    },
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`\nMASTER training set: ${merged.length} tuples (${dupes} dupes skipped)`);
console.log(`Tracks: ${tracks.map((t) => `${t.name}=${perTrack[t.name].kept}`).join(" | ")}`);
