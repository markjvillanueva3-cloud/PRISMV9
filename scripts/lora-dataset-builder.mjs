#!/usr/bin/env node
// scripts/lora-dataset-builder.mjs
//
// U-LORA-MASTER-CORPUS-TRAINER (dataset-builder scope) — substrate primitive
// for the CAM-AI LoRA training pipeline. Reads a tuple corpus + a track
// classifier, stratifies into per-track train/val splits with seeded RNG,
// emits NEW-file JSONL datasets under mcp-server/data/lora-datasets/.
//
// Scope: dataset assembly only. Actual fine-tune (Python + transformers +
// GPU) is downstream — wired separately. This unit closes audit-2026-05-26
// finding #5 (CAM-AI-TRAINING-MS0 3,766 tuples shipped 5/26 by kilo but had
// NO consumer wired). With this script, the operator can `node scripts/
// lora-dataset-builder.mjs --corpus <path> --track-field <field>` and get
// 8 (or N) per-track JSONLs ready for fine-tune.
//
// Pure-function library + CLI. Pure-RNG (mulberry32 seeded) for reproducible
// train/val splits. Article-1 NEW-file safety: never overwrites existing
// datasets — emits with `.new.jsonl` suffix; operator promotes.

import fs from "node:fs";
import path from "node:path";

const DEFAULT_VAL_FRACTION = 0.15;
const DEFAULT_SEED = 42;
const SCHEMA_VERSION = 1;

/**
 * mulberry32 — fast, reproducible 32-bit PRNG. Same seed → same sequence.
 * Used for deterministic train/val splits.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with a seeded RNG. Reproducible.
 */
export function shuffle(arr, seed = DEFAULT_SEED) {
  const out = arr.slice();
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Read a JSONL corpus from disk. Returns array of parsed objects. Corrupt
 * lines silently skipped.
 */
export function readCorpus(corpusPath) {
  if (!fs.existsSync(corpusPath)) {
    throw new Error(`readCorpus: corpus file not found at ${corpusPath}`);
  }
  const raw = fs.readFileSync(corpusPath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const out = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

/**
 * Group tuples by a track field. Tuples whose track field is missing or
 * non-string go into `_unclassified`. Returns Map<track, tuples[]>.
 */
export function groupByTrack(tuples, trackField) {
  if (!trackField || typeof trackField !== "string") {
    throw new Error("groupByTrack: trackField must be a non-empty string");
  }
  const map = new Map();
  for (const t of tuples) {
    if (!t || typeof t !== "object") continue;
    const raw = t[trackField];
    const track = typeof raw === "string" && raw.length > 0 ? raw : "_unclassified";
    let bucket = map.get(track);
    if (!bucket) {
      bucket = [];
      map.set(track, bucket);
    }
    bucket.push(t);
  }
  return map;
}

/**
 * Stratified train/val split. For each track, shuffle then take last
 * floor(N * valFraction) as val (with min 1 if N >= 2). Seeded RNG.
 */
export function stratifiedSplit(grouped, opts = {}) {
  const { valFraction = DEFAULT_VAL_FRACTION, seed = DEFAULT_SEED } = opts;
  if (typeof valFraction !== "number" || valFraction <= 0 || valFraction >= 1) {
    throw new Error("stratifiedSplit: valFraction must be in (0, 1)");
  }
  const splits = {};
  for (const [track, tuples] of grouped) {
    const shuffled = shuffle(tuples, seed + hashString(track));
    const valN = tuples.length >= 2 ? Math.max(1, Math.floor(tuples.length * valFraction)) : 0;
    const trainN = tuples.length - valN;
    splits[track] = {
      train: shuffled.slice(0, trainN),
      val: shuffled.slice(trainN),
      n: tuples.length,
      trainN,
      valN,
    };
  }
  return splits;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Write splits to disk. NEW-file suffix per article-1 mistake #4 safety
 * (no silent overwrite). Returns {trainPath, valPath, manifestPath}.
 */
export function writeSplits(splits, outputDir, opts = {}) {
  ensureDir(outputDir);
  const written = {};
  for (const [track, split] of Object.entries(splits)) {
    const safeTrack = track.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 64);
    const trainPath = path.join(outputDir, `${safeTrack}-train.new.jsonl`);
    const valPath = path.join(outputDir, `${safeTrack}-val.new.jsonl`);
    fs.writeFileSync(trainPath, split.train.map((t) => JSON.stringify(t)).join("\n") + (split.train.length ? "\n" : ""));
    fs.writeFileSync(valPath, split.val.map((t) => JSON.stringify(t)).join("\n") + (split.val.length ? "\n" : ""));
    written[track] = { trainPath, valPath, trainN: split.trainN, valN: split.valN };
  }
  const manifestPath = path.join(outputDir, "manifest.new.json");
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    builtAt: new Date().toISOString(),
    valFraction: opts.valFraction ?? DEFAULT_VAL_FRACTION,
    seed: opts.seed ?? DEFAULT_SEED,
    trackCount: Object.keys(splits).length,
    totalTuples: Object.values(splits).reduce((s, x) => s + x.n, 0),
    tracks: written,
    note: "NEW-file shadow tier per article-1 mistake #4 safety. Operator promotes via: mv <track>-train.new.jsonl <track>-train.jsonl",
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return { manifestPath, manifest };
}

/** Top-level: corpus path → splits on disk. */
export function buildDatasets({ corpusPath, trackField, outputDir, valFraction, seed }) {
  const tuples = readCorpus(corpusPath);
  if (tuples.length === 0) {
    throw new Error(`buildDatasets: corpus at ${corpusPath} contained 0 valid tuples`);
  }
  const grouped = groupByTrack(tuples, trackField);
  const splits = stratifiedSplit(grouped, { valFraction, seed });
  return writeSplits(splits, outputDir, { valFraction, seed });
}

// ─── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--corpus") out.corpusPath = argv[++i];
    else if (a === "--track-field") out.trackField = argv[++i];
    else if (a === "--out") out.outputDir = argv[++i];
    else if (a === "--val") out.valFraction = Number(argv[++i]);
    else if (a === "--seed") out.seed = Number(argv[++i]);
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.corpusPath) {
    console.error("# Missing --corpus <path>. Usage:");
    console.error("#   node scripts/lora-dataset-builder.mjs --corpus <corpus.jsonl> --track-field <field> --out <dir>");
    console.error("#   [--val 0.15] [--seed 42] [--dry-run]");
    process.exit(2);
  }
  if (!args.trackField) {
    console.error("# Missing --track-field <field-name> (e.g. 'track', 'cam_strategy', 'operation_type')");
    process.exit(2);
  }
  const outputDir = args.outputDir || "mcp-server/data/lora-datasets";

  if (args.dryRun) {
    const tuples = readCorpus(args.corpusPath);
    const grouped = groupByTrack(tuples, args.trackField);
    const summary = {};
    for (const [k, v] of grouped) summary[k] = v.length;
    console.log(`# DRY RUN — ${tuples.length} tuples across ${grouped.size} track(s):`);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const { manifestPath, manifest } = buildDatasets({
    corpusPath: args.corpusPath,
    trackField: args.trackField,
    outputDir,
    valFraction: args.valFraction,
    seed: args.seed,
  });
  console.log(`# Wrote ${manifest.trackCount} per-track split(s) (${manifest.totalTuples} tuples)`);
  console.log(`# Manifest: ${manifestPath}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
