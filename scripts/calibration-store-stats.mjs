#!/usr/bin/env node
/**
 * calibration-store-stats.mjs -- observability for the accumulated OCR calibration corpus
 * (U-XRAY-CALIB-STATS). Units A+B (U-XRAY-CALIB-ACCUMULATE / U-XRAY-PROGRAM-GT-CALIB) grow a durable
 * calibration-sample store across nightly runs, but the corpus is invisible until a full run prints its
 * report. This CLI reports the corpus state on demand: total samples, the synthetic-gt vs program-gt
 * source breakdown, the isotonic reliability verdict, and how many more samples are needed to cross
 * MIN_RELIABLE -- so an operator can SEE the closed-loop calibration accruing toward trustworthy tiers.
 *
 * USAGE:
 *   node scripts/calibration-store-stats.mjs [--store <path>] [--json]
 * Reads (never writes) the store; absent store -> 0 samples (not an error).
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv } from "node:process";

import { loadCalibrationStore, summarizeCalibrationStore } from "./lib/calibration-sample-store.mjs";
import { calibrateAgreement } from "./lib/ocr-training-loop-lib.mjs";
import { MIN_RELIABLE_SAMPLES } from "./lib/isotonic-calibrator.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = argv.slice(2);
const get = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const STORE = get("--store", join(REPO_ROOT, "state", "shared", "ocr-training-loop", "calibration-samples.jsonl"));
const json = args.includes("--json");

const samples = loadCalibrationStore(STORE);
const sum = summarizeCalibrationStore(samples);
const cal = calibrateAgreement(samples);
const toReliable = Math.max(0, MIN_RELIABLE_SAMPLES - sum.total);

const out = {
  store: STORE,
  total: sum.total,
  bySource: sum.bySource,
  correctRate: sum.correctRate,
  reliable: cal.reliable,
  minReliableSamples: MIN_RELIABLE_SAMPLES,
  samples_to_reliable: toReliable,
  byF: cal.byF,
};

if (json) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const verdict = out.reliable
    ? "RELIABLE"
    : `under-powered (need ${toReliable} more samples for reliable @ >=${MIN_RELIABLE_SAMPLES})`;
  console.log(`calibration corpus: ${out.total} samples -- ${verdict}`);
  console.log(`  by source: ${JSON.stringify(out.bySource)}   correctRate ${out.correctRate}`);
  for (const b of out.byF) console.log(`  f=${b.f}: isotonic ${b.isotonic}  (n=${b.n})`);
  console.log(`  store: ${out.store}`);
}
