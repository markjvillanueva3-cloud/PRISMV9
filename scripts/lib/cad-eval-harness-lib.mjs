#!/usr/bin/env node
/**
 * cad-eval-harness-lib.mjs -- DELTA-CAD-COMPLETION / U-DELTA-EVAL-HARNESS (dimension modality).
 *
 * THE "TEST" HALF of the CAD closed-loop train/test foundation. The integrity subsystem
 * (cad-holdout-guard + cad-trainset-leakguard + geom-50/ocr-150 splits) guarantees the trainset is
 * disjoint from the eval splits; THIS scores a model's predictions on those HELD-OUT parts -- the only
 * trustworthy accuracy signal (the model never saw them, by the leak-guard's construction).
 *
 * COMPOSES, does not rebuild: the dimension scorer already exists (scripts/lib/dimension-set-score.mjs,
 * xray -- optimal bipartite, type-aware). delta's value-add is (a) HELD-OUT DISCIPLINE: score ONLY
 * parts that are in the frozen eval split (a prediction for a NON-held part is flagged -- evaluating on
 * a training part would be the train/test leak this whole subsystem exists to prevent), (b) a deterministic
 * PASS/FAIL GATE (R12 -- a held-out F1 below threshold fails loud, never a vague "looks fine"), and (c) it
 * ties the held splits + the existing scorer into one eval surface india's model output plugs into.
 *
 * Scope: this lib is the DIMENSION/OCR modality (composes dimension-set-score over ocr-150-style splits).
 * The GEOMETRY modality (predicted B-Rep vs geom-50 truth via CADGeometryComparisonEngine, a TS engine)
 * is a noted follow-up -- it crosses the .mjs/TS-engine boundary and is wired separately.
 *
 * Pure: no I/O (the runner loads the split + the predictions/truth files and passes them in).
 */
import { scoreDimensionSet, aggregateScores } from "./dimension-set-score.mjs";
import { normIdentity } from "./cad-trainset-leakguard-lib.mjs";
import { normalizePath } from "./cad-holdout-guard.mjs";

/**
 * The canonical eval key for a held-split entry. ocr-150 carries part_number_normalized (the natural
 * eval key). geom-50 carries only abs_path -> keyed by the FULL normalized path, NOT the basename stem:
 * distinct held parts can share a stem (test_box.step vs test_box.iges; or PD1083 in two dirs), and
 * collapsing them would UNDERCOUNT heldTotal and INFLATE coverage -- the dangerous direction for an eval
 * denominator (a predicted twin marks the merged key scored, the un-predicted twin silently drops out).
 * The freezer dedups by normalized path, so the full path is unique per held part. Prediction keys are
 * normIdentity-normalized the same way, so an abs_path prediction key matches its held entry.
 */
export function heldEntryKey(entry) {
  if (!entry || typeof entry !== "object") return "";
  const pn = normIdentity(entry.part_number_normalized ?? entry.part_number ?? "");
  if (pn) return pn;
  if (typeof entry.abs_path === "string") return normIdentity(normalizePath(entry.abs_path));
  return "";
}

/** Build the Set of held part keys from a frozen split's `held` array (or a bare entry array). */
export function heldKeySet(splitOrEntries) {
  const entries = Array.isArray(splitOrEntries)
    ? splitOrEntries
    : (splitOrEntries && Array.isArray(splitOrEntries.held) ? splitOrEntries.held : []);
  const set = new Set();
  for (const e of entries) {
    const k = heldEntryKey(e);
    if (k) set.add(k);
  }
  return set;
}

/** Normalize a {key->dims[]} map (plain object or Map) to a Map keyed by normalized part identity. */
function toKeyedMap(byPart) {
  const out = new Map();
  if (!byPart) return out;
  const entries = byPart instanceof Map ? byPart.entries() : Object.entries(byPart);
  for (const [k, v] of entries) {
    const nk = normIdentity(String(k));
    if (nk) out.set(nk, v);
  }
  return out;
}

/**
 * Evaluate model predictions against ground truth on the HELD-OUT eval parts only.
 * @param {object|Map} predByPart  {part_id -> extracted dims[]}  (the model's output)
 * @param {object|Map} truthByPart {part_id -> truth dims[]}      (answer-key dims for the held parts)
 * @param {Set<string>|string[]|object} held  held key Set, key array, or a frozen split object
 * @param {{pct?:number, absMm?:number, typeAware?:boolean}} [opts] forwarded to scoreDimensionSet
 * @returns {{aggregate:object, perPart:Array, scored:number, heldTotal:number,
 *            missingPrediction:string[], missingTruth:string[], nonHeldPredictions:string[]}}
 */
export function evalHeldOut(predByPart, truthByPart, held, opts = {}) {
  const heldSet = held instanceof Set ? held : new Set(heldKeySet(held));
  const preds = toKeyedMap(predByPart);
  const truth = toKeyedMap(truthByPart);

  const perPart = [];
  const scores = [];
  const missingPrediction = []; // held + has truth, but the model produced no prediction
  const missingTruth = [];      // held + has a prediction, but no answer-key truth to score against
  const nonHeldPredictions = []; // a prediction for a part NOT in the eval split (train-part leak into eval)

  // Flag any prediction whose part is not held -- evaluating on a non-held part is a train/test leak.
  for (const k of preds.keys()) {
    if (!heldSet.has(k)) nonHeldPredictions.push(k);
  }

  for (const key of heldSet) {
    const hasPred = preds.has(key);
    const hasTruth = truth.has(key);
    if (!hasTruth) { if (hasPred) missingTruth.push(key); continue; }
    if (!hasPred) { missingPrediction.push(key); continue; }
    const s = scoreDimensionSet(preds.get(key), truth.get(key), opts);
    scores.push(s);
    perPart.push({ part: key, f1: s.f1, precision: s.precision, recall: s.recall, mae_mm: s.mae_mm, matched: s.matched, n_truth: s.n_truth, n_extracted: s.n_extracted });
  }

  return {
    aggregate: aggregateScores(scores),
    perPart,
    scored: scores.length,
    heldTotal: heldSet.size,
    missingPrediction,
    missingTruth,
    nonHeldPredictions,
  };
}

export const DEFAULT_MIN_F1 = 0.9;       // held-out micro-F1 pass floor
export const DEFAULT_MAX_MAE_MM = 0.5;   // held-out mean abs dimensional error ceiling (mm)
export const DEFAULT_MIN_COVERAGE = 0.5; // fraction of held parts that must be scorable (have pred+truth)

/**
 * Deterministic PASS/FAIL gate over an evalHeldOut result (R12 -- explicit, never "looks fine").
 * @returns {{pass:boolean, reasons:string[], micro_f1:number|null, mean_mae_mm:number|null, coverage:number}}
 */
export function gateEval(evalResult, opts = {}) {
  const minF1 = Number.isFinite(opts.minF1) ? opts.minF1 : DEFAULT_MIN_F1;
  const maxMae = Number.isFinite(opts.maxMaeMm) ? opts.maxMaeMm : DEFAULT_MAX_MAE_MM;
  const minCov = Number.isFinite(opts.minCoverage) ? opts.minCoverage : DEFAULT_MIN_COVERAGE;
  const agg = (evalResult && evalResult.aggregate) || {};
  const heldTotal = evalResult && Number.isFinite(evalResult.heldTotal) ? evalResult.heldTotal : 0;
  const scored = evalResult && Number.isFinite(evalResult.scored) ? evalResult.scored : 0;
  const coverage = heldTotal > 0 ? +(scored / heldTotal).toFixed(4) : 0;
  const reasons = [];

  if (scored === 0) reasons.push("no held parts were scorable (0 predictions matched truth) -- cannot evaluate");
  if (coverage < minCov) reasons.push(`coverage ${coverage} < ${minCov} (too few held parts have both a prediction and truth)`);
  const f1 = agg.micro_f1;
  if (f1 === null || f1 === undefined) reasons.push("micro_f1 is null (no scorable parts)");
  else if (f1 < minF1) reasons.push(`micro_f1 ${f1} < ${minF1}`);
  const mae = agg.mean_mae_mm;
  if (Number.isFinite(mae) && mae > maxMae) reasons.push(`mean_mae_mm ${mae} > ${maxMae}`);
  else if (scored > 0 && (mae === null || mae === undefined)) reasons.push("mean_mae_mm unmeasurable -- 0 dims matched on every scored part");
  if (evalResult && Array.isArray(evalResult.nonHeldPredictions) && evalResult.nonHeldPredictions.length) {
    reasons.push(`${evalResult.nonHeldPredictions.length} prediction(s) for NON-held parts (eval contamination)`);
  }

  return { pass: reasons.length === 0, reasons, micro_f1: f1 ?? null, mean_mae_mm: Number.isFinite(mae) ? mae : null, coverage };
}
