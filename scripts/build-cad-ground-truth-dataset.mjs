#!/usr/bin/env node
/**
 * build-cad-ground-truth-dataset.mjs -- producer: delta's CAD class-prototype GROUND-TRUTH catalogs
 * -> Alpaca CAD-generation training dataset (U-CAD-GT-FEATURE-PRIORS, slot:india 2026-06-11).
 *
 * Scans state/shared/ocr-ground-truth/cad-prototype-<class>-*.json (the per-class GT catalogs
 * derive-ground-truth-from-cad.mjs mined from 662 JM-Die STEP files), converts each into
 * class->feature-prior Alpaca pairs via scripts/lib/cad-ground-truth-to-training.mjs, dedups, and
 * writes state/shared/lora/cad-ground-truth-dataset.jsonl. That file is registered as an advisory
 * lora-training-jsonl source in build-fleet-training-corpus-inventory.mjs, so
 * assemble-fleet-lora-corpus.mjs folds it into the corpus the CAD-gen fine-tune consumes -- the
 * POSITIVE-prior sibling of build-cad-fix-training-dataset.mjs (NO assembler change; manifest-driven).
 *
 * Usage:
 *   node scripts/build-cad-ground-truth-dataset.mjs            # dry-run counts
 *   node scripts/build-cad-ground-truth-dataset.mjs --out      # write the dataset
 *   node scripts/build-cad-ground-truth-dataset.mjs --json     # machine-readable
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { gtArtifactsToTrainingPairs } from "./lib/cad-ground-truth-to-training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_GT_DIR = path.join(ROOT, "state", "shared", "ocr-ground-truth");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "cad-ground-truth-dataset.jsonl");

/**
 * Load the GT catalog objects from `gtDir` (files matching cad-prototype-*.json). Returns
 * { artifacts, files, invalid } -- malformed JSON files are counted, never throw (fail-soft).
 * Pure w.r.t. the injected reader/lister -> testable.
 */
export function loadGtArtifacts({ gtDir = DEFAULT_GT_DIR, readdirImpl = fs.readdirSync, readFileImpl = fs.readFileSync } = {}) {
  let names = [];
  try { names = readdirImpl(gtDir); } catch { return { artifacts: [], files: 0, invalid: 0 }; }
  const matched = names.filter((n) => n.startsWith("cad-prototype-") && n.endsWith(".json")).sort();
  const artifacts = [];
  let invalid = 0;
  for (const name of matched) {
    try {
      artifacts.push(JSON.parse(readFileImpl(path.join(gtDir, name), "utf8")));
    } catch { invalid += 1; }
  }
  return { artifacts, files: matched.length, invalid };
}

/** Build the deduped dataset from the GT dir. */
export function buildDataset(opts = {}) {
  const { artifacts, files, invalid } = loadGtArtifacts(opts);
  const rows = gtArtifactsToTrainingPairs(artifacts, opts);
  const classes = new Set(artifacts.map((a) => a && a.part_class).filter(Boolean)).size;
  return { rows, files, invalid, classes, uniquePairs: rows.length };
}

function writeJsonlAtomic(outPath, rows) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
  fs.renameSync(tmp, outPath);
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const ds = buildDataset();
  const summary = { gtFiles: ds.files, classes: ds.classes, uniquePairs: ds.uniquePairs, invalid: ds.invalid };
  if (write) {
    writeJsonlAtomic(DEFAULT_OUT, ds.rows);
    summary.written = DEFAULT_OUT;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`cad-GT catalogs -> CAD-gen training: ${ds.uniquePairs} unique pairs from ${ds.classes} classes (${ds.files} GT files, ${ds.invalid} invalid)\n`);
    if (write) process.stdout.write(`Wrote -> ${DEFAULT_OUT}\n`);
    else process.stdout.write("(dry-run; pass --out to write)\n");
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_GT_DIR, DEFAULT_OUT };
