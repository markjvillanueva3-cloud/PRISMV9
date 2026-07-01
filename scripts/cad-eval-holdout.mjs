#!/usr/bin/env node
/**
 * cad-eval-holdout.mjs -- DELTA-CAD-COMPLETION / U-DELTA-EVAL-HARNESS runner (dimension modality).
 *
 * Scores a model's predictions on a FROZEN held-out eval split (geom-50 / ocr-150) -- the "test" half of
 * the CAD closed-loop. Composes cad-eval-harness-lib (held-out discipline + gate) over the existing
 * dimension-set-score. The trainset the model trained on was made disjoint from this split by the
 * leak-guard (curate --holdout), so this is the trustworthy accuracy signal.
 *
 * This runner DEFINES delta's eval-input contract; india's model output adapts to it (delta owns the
 * eval surface, india owns producing predictions). It NEVER runs a model -- it consumes prediction +
 * truth JSON files.
 *
 * Usage:
 *   node scripts/cad-eval-holdout.mjs --split <split.json> --predictions <preds.json> --truth <truth.json>
 *        [--min-f1 0.9] [--max-mae-mm 0.5] [--min-coverage 0.5] [--tol-pct 1.0] [--tol-abs-mm 0.05] [--json]
 * Contract: predictions.json and truth.json are { "<part_id>": [<dim>, ...], ... } where <dim> is a
 *   number (mm) or {nominal_mm,type?} (see dimension-set-score.dimToMm). part_id matches the split's
 *   part_number_normalized (ocr) OR the full abs_path (geom) -- whichever the held entry carries; both
 *   are normIdentity-normalized, so pass either the raw part number or the raw path as the key.
 *   --tol-pct / --tol-abs-mm tune the dimension match window (forwarded to scoreDimensionSet).
 * Exit: 0 gate PASS | 1 gate FAIL | 2 bad args/IO.
 */
import { readFileSync, existsSync } from "node:fs";
import { argv, exit } from "node:process";
import { evalHeldOut, gateEval, DEFAULT_MIN_F1, DEFAULT_MAX_MAE_MM, DEFAULT_MIN_COVERAGE } from "./lib/cad-eval-harness-lib.mjs";

function loadJson(path, label) {
  if (!path) { process.stderr.write(`[eval-holdout] missing --${label}\n`); exit(2); }
  if (!existsSync(path)) { process.stderr.write(`[eval-holdout] --${label} not found: ${path}\n`); exit(2); }
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { process.stderr.write(`[eval-holdout] --${label} is not valid JSON: ${e && e.message ? e.message : e}\n`); exit(2); }
}

function main() {
  const args = argv.slice(2);
  const get = (f, d = null) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
  const num = (f, d) => { const v = get(f); const n = v == null ? d : Number(v); return Number.isFinite(n) ? n : d; };
  const jsonOut = args.includes("--json");

  const split = loadJson(get("--split"), "split");
  const predictions = loadJson(get("--predictions"), "predictions");
  const truth = loadJson(get("--truth"), "truth");

  const opts = {};
  const pct = num("--tol-pct"); if (pct != null) opts.pct = pct;
  const absMm = num("--tol-abs-mm"); if (absMm != null) opts.absMm = absMm;

  const minF1 = num("--min-f1", undefined);
  const maxMaeMm = num("--max-mae-mm", undefined);
  const minCoverage = num("--min-coverage", undefined);
  // R12 auditability: a CI line that passes a threshold BELOW the default contract (a lower f1/coverage
  // floor or a higher mae ceiling) can quietly neuter the eval gate. Surface it loudly rather than let
  // it pass silently -- operator freedom preserved, "silently neutered in CI" failure mode removed.
  const weakened = [];
  if (minF1 != null && minF1 < DEFAULT_MIN_F1) weakened.push(`min-f1=${minF1} (<default ${DEFAULT_MIN_F1})`);
  if (minCoverage != null && minCoverage < DEFAULT_MIN_COVERAGE) weakened.push(`min-coverage=${minCoverage} (<default ${DEFAULT_MIN_COVERAGE})`);
  if (maxMaeMm != null && maxMaeMm > DEFAULT_MAX_MAE_MM) weakened.push(`max-mae-mm=${maxMaeMm} (>default ${DEFAULT_MAX_MAE_MM})`);
  if (weakened.length) console.error(`[eval-holdout] gate WEAKENED below the default contract: ${weakened.join(", ")}`);

  const result = evalHeldOut(predictions, truth, split, opts);
  const gate = gateEval(result, { minF1, maxMaeMm, minCoverage });

  if (jsonOut) {
    console.log(JSON.stringify({ gate, aggregate: result.aggregate, scored: result.scored, heldTotal: result.heldTotal,
      coverage: gate.coverage, missingPrediction: result.missingPrediction.length, missingTruth: result.missingTruth.length,
      nonHeldPredictions: result.nonHeldPredictions.length }, null, 2));
  } else {
    console.log(`[eval-holdout] held=${result.heldTotal} scored=${result.scored} coverage=${gate.coverage}`);
    console.log(`  micro_f1=${result.aggregate.micro_f1} precision=${result.aggregate.micro_precision} recall=${result.aggregate.micro_recall} mean_mae_mm=${result.aggregate.mean_mae_mm}`);
    console.log(`  missing-prediction=${result.missingPrediction.length} missing-truth=${result.missingTruth.length} non-held-predictions=${result.nonHeldPredictions.length}`);
    console.log(`  GATE: ${gate.pass ? "PASS" : "FAIL"}${gate.reasons.length ? " -- " + gate.reasons.join("; ") : ""}`);
  }
  exit(gate.pass ? 0 : 1);
}

main();
