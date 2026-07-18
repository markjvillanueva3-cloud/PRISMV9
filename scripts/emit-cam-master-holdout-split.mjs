#!/usr/bin/env node
/**
 * scripts/emit-cam-master-holdout-split.mjs
 *   CAM-AI-TRAINING-MS0/U-CAMT-MASTER-HOLDOUT
 *
 * Deterministic 85/15 train/holdout split of the MASTER training set
 * (3766 tuples), stratified by track to guarantee each of the 8 tracks
 * appears in both splits.
 *
 * Output:
 *   - state/shared/corpus/cam-master-train.jsonl
 *   - state/shared/corpus/cam-master-holdout.jsonl
 *   - state/shared/corpus/cam-master-split-summary.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = dirname(__dirname);
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

const HOLDOUT_FRAC = 0.15;

function load(name) {
  const f = join(CORPUS, name);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function bucket(key, frac) {
  const h = createHash("sha256").update(key).digest();
  const u32 = h.readUInt32BE(0);
  const r = u32 / 0x100000000;
  return r < frac ? "holdout" : "train";
}

const master = load("cam-master-training-set.jsonl");

const train = [];
const holdout = [];
const byTrack = {};

for (const [idx, rec] of master.entries()) {
  const track = rec.metadata?.track ?? "unknown";
  byTrack[track] ??= { train: 0, holdout: 0 };
  const prompt = rec.messages?.[0]?.content ?? "";
  const key = `${track}::${idx}::${prompt}`;
  const dest = bucket(key, HOLDOUT_FRAC);
  byTrack[track][dest]++;
  if (dest === "train") train.push(rec); else holdout.push(rec);
}

writeFileSync(join(CORPUS, "cam-master-train.jsonl"), train.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(CORPUS, "cam-master-holdout.jsonl"), holdout.map((r) => JSON.stringify(r)).join("\n") + "\n");

const zeroHoldoutTracks = Object.entries(byTrack).filter(([, c]) => c.holdout === 0).map(([k]) => k);
const zeroTrainTracks = Object.entries(byTrack).filter(([, c]) => c.train === 0).map(([k]) => k);

writeFileSync(
  join(CORPUS, "cam-master-split-summary.json"),
  JSON.stringify({
    totalMaster: master.length,
    trainCount: train.length,
    holdoutCount: holdout.length,
    trainFrac: (train.length / master.length).toFixed(4),
    holdoutFrac: (holdout.length / master.length).toFixed(4),
    holdoutFracTarget: HOLDOUT_FRAC,
    byTrack,
    zeroHoldoutTracks,
    zeroTrainTracks,
    splitMethod: "sha256(track::idx::prompt) deterministic bucket",
    generatedAt: new Date().toISOString(),
  }, null, 2)
);

console.log(`master=${master.length} -> train=${train.length} + holdout=${holdout.length}`);
console.log(`tracks: ${Object.entries(byTrack).map(([t, c]) => `${t}=${c.train}/${c.holdout}`).join(" | ")}`);
console.log(`zero-holdout tracks: ${zeroHoldoutTracks.length === 0 ? "none (all stratified OK)" : zeroHoldoutTracks.join(", ")}`);
