#!/usr/bin/env node
/**
 * build-cad-geometry-composition-dataset.mjs -- producer: STEP-corpus per-class geometric composition
 * -> Alpaca CAD-generation training dataset (U-CAD-GEOM-COMPOSITION, slot:india 2026-06-11).
 *
 * Reads cad-corpus-step-geometry-report.json (per-class surface-primitive counts mined from 665
 * JM-Die STEP files), converts each class into a surface-composition training pair via
 * scripts/lib/cad-geometry-composition-to-training.mjs, and writes
 * state/shared/lora/cad-geometry-composition-dataset.jsonl. Registered as an advisory
 * lora-training-jsonl source in build-fleet-training-corpus-inventory.mjs so the fleet assembler
 * folds it into the CAD-gen corpus -- the TOPOLOGY-prior sibling of the GT feature-priors + fix
 * corrections (NO assembler change; manifest-driven).
 *
 * Usage:
 *   node scripts/build-cad-geometry-composition-dataset.mjs            # dry-run counts
 *   node scripts/build-cad-geometry-composition-dataset.mjs --out      # write the dataset
 *   node scripts/build-cad-geometry-composition-dataset.mjs --json
 */

import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";

import { reportToCompositionPairs } from "./lib/cad-geometry-composition-to-training.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_REPORT = env.PRISM_CAD_CORPUS_REPORT || path.join(ROOT, "mcp-server", "data", "state", "cad-corpus-step-geometry-report.json");
const DEFAULT_OUT = path.join(ROOT, "state", "shared", "lora", "cad-geometry-composition-dataset.jsonl");

/** Build the dataset from the report. Pure w.r.t. the injected reader -> testable. */
export function buildDataset({ report = DEFAULT_REPORT, readFileImpl = fs.readFileSync } = {}) {
  let parsed = null;
  let present = true;
  try { parsed = JSON.parse(readFileImpl(report, "utf8")); } catch { present = false; }
  const rows = reportToCompositionPairs(parsed);
  const classes = parsed && Array.isArray(parsed.per_class) ? parsed.per_class.length : 0;
  return { rows, present, classes, uniquePairs: rows.length };
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
  const summary = { reportPresent: ds.present, classes: ds.classes, uniquePairs: ds.uniquePairs };
  if (write) {
    writeJsonlAtomic(DEFAULT_OUT, ds.rows);
    summary.written = DEFAULT_OUT;
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  } else {
    process.stdout.write(`cad geometry composition -> CAD-gen training: ${ds.uniquePairs} pairs from ${ds.classes} classes${ds.present ? "" : " [REPORT ABSENT]"}\n`);
    if (write) process.stdout.write(`Wrote -> ${DEFAULT_OUT}\n`);
    else process.stdout.write("(dry-run; pass --out to write)\n");
  }
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();

export { DEFAULT_REPORT, DEFAULT_OUT };
