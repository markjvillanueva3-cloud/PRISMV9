#!/usr/bin/env node
/**
 * calibration-sample-store.mjs -- durable cross-run accumulation of agreement
 * calibration samples for the blueprint-OCR closed loop (and any other
 * isotonic-agreement calibrator that is starved for samples per single run).
 *
 * Why this exists: `blueprint-ocr-training-loop.mjs` PHASE-1 calibrates
 * P(consensus dim correct | agreement fraction f) from ~24 synthetic-GT prints
 * PER RUN, then THROWS the samples away. `MIN_RELIABLE_SAMPLES` (isotonic-
 * calibrator.mjs) is 50, so a single nightly run is permanently `reliable:false`
 * -- the gold/silver trust tiers can never be trusted, P2.9 (per-type calibration)
 * is "dormant-without-volume", and the operator must hand-verify every tier.
 * Accumulating each run's samples into a durable append-only store lets the
 * calibration cross MIN_RELIABLE over a handful of nightly runs WITHOUT any new
 * GPU work, model, or data-acquisition -- the samples already exist, they were
 * just discarded.
 *
 * A sample is `{ f:number(0<f<=1], correct:boolean }` -- the only two fields the
 * calibrator reads. The store additionally tags each row with `source`
 * (e.g. "synthetic-gt" | "program-gt") and `ts` (ISO) for provenance/audit, so
 * a future unit can weight or filter by source (real program-GT samples are
 * stronger evidence than synthetic). `calibrateAgreement` ignores the extra
 * fields, so mixing sources is forward-compatible and additive.
 *
 * DOMAIN-NEUTRAL on purpose (R15): the logic stores `{f,correct}` observations,
 * nothing blueprint-specific. The SAME under-powered-calibration problem exists
 * for the GNN isotonic calibrator (NN-GRAPH) and SFC calibration -- this module
 * is cloneable to those callers (point a different store path at it). Kept in
 * scripts/lib/ (not engines/blueprint-vision/) for that reuse.
 *
 * The pure functions (parse / merge / serialize) carry no fs/fetch and are
 * exhaustively node:test-covered; the thin I/O wrappers (load / append) are the
 * only fs-touching surface. Consistent with the scripts/lib/*.mjs + node:test
 * convention.
 */

import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Default ring-buffer ceiling. Keeps the store bounded (the most-recent N
 * samples) so it reflects the CURRENT model lineup -- an ensemble upgrade should
 * not be out-voted forever by stale samples from a retired model set. 5000 is
 * ~200 nightly runs at 24 samples/run; far above MIN_RELIABLE, small on disk.
 */
export const DEFAULT_SAMPLE_CAP = 5000;

/**
 * Pure: a usable calibration sample is `f` finite in (0,1] and `correct` a
 * strict boolean. Non-conforming rows are NOT trusted (a NaN/0/>1 fraction or a
 * truthy-but-not-boolean `correct` would silently poison the isotonic fit).
 * @param {*} s
 * @returns {boolean}
 */
export function isValidSample(s) {
  return (
    s != null &&
    typeof s === "object" &&
    Number.isFinite(s.f) &&
    s.f > 0 &&
    s.f <= 1 &&
    typeof s.correct === "boolean"
  );
}

/**
 * Pure: tolerant JSONL parse of a calibration store's text. One JSON object per
 * line; blank lines, malformed JSON, and invalid samples (see isValidSample) are
 * SKIPPED (never throw -- a torn last line from a reaper-killed append must not
 * lose the whole accumulated corpus). Preserves provenance fields (source/ts).
 * @param {string} text
 * @returns {Array<{f:number, correct:boolean, source?:string, ts?:string}>}
 */
export function parseCalibrationStore(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const out = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let obj;
    try {
      obj = JSON.parse(t);
    } catch {
      continue; // malformed (e.g. torn final line) -- skip, keep the rest
    }
    if (isValidSample(obj)) out.push(obj);
  }
  return out;
}

/**
 * Pure: merge persisted + fresh samples into the calibration set, ring-buffered
 * to `cap` keeping the MOST-RECENT samples (fresh is appended last, so this run's
 * samples are always retained; the oldest persisted are dropped first). Invalid
 * rows on either side are filtered (defensive -- `fresh` from the runner is
 * already clean, but a hand-edited store may not be).
 * @param {Array} persisted
 * @param {Array} fresh
 * @param {{cap?:number}} [opts]
 * @returns {{merged:Array, persistedCount:number, freshCount:number, totalBeforeCap:number, capped:boolean, cap:number}}
 */
export function mergeCalibrationSamples(persisted, fresh, opts = {}) {
  const cap = Number.isFinite(opts.cap) && opts.cap > 0 ? Math.floor(opts.cap) : DEFAULT_SAMPLE_CAP;
  const p = (Array.isArray(persisted) ? persisted : []).filter(isValidSample);
  const f = (Array.isArray(fresh) ? fresh : []).filter(isValidSample);
  const combined = p.concat(f);
  const totalBeforeCap = combined.length;
  const capped = totalBeforeCap > cap;
  // Keep the most-recent `cap` (tail). fresh is at the tail, so it always survives
  // a cap unless `fresh` alone exceeds `cap` (in which case keep its newest `cap`).
  const merged = capped ? combined.slice(totalBeforeCap - cap) : combined;
  return { merged, persistedCount: p.length, freshCount: f.length, totalBeforeCap, capped, cap };
}

/**
 * Pure: serialize samples to JSONL (one object per line, trailing newline).
 * @param {Array} samples
 * @returns {string}
 */
export function serializeCalibrationSamples(samples) {
  const arr = (Array.isArray(samples) ? samples : []).filter(isValidSample);
  if (arr.length === 0) return "";
  return arr.map((s) => JSON.stringify(s)).join("\n") + "\n";
}

/**
 * Pure: stamp fresh samples with provenance (source + ts) for the append. Only
 * the valid samples are stamped; existing source/ts on a sample are preserved.
 * @param {Array} samples
 * @param {{source?:string, ts?:string}} [meta]
 * @returns {Array<{f:number, correct:boolean, source:string, ts:string}>}
 */
export function stampSamples(samples, meta = {}) {
  const source = typeof meta.source === "string" && meta.source ? meta.source : "synthetic-gt";
  const ts = typeof meta.ts === "string" && meta.ts ? meta.ts : new Date().toISOString();
  return (Array.isArray(samples) ? samples : []).filter(isValidSample).map((s) => ({
    f: s.f,
    correct: s.correct,
    source: typeof s.source === "string" && s.source ? s.source : source,
    ts: typeof s.ts === "string" && s.ts ? s.ts : ts,
  }));
}

/**
 * Pure: summarize a sample set for the observability CLI -- total, correct rate, and the per-source
 * breakdown (so an operator can see how much of the accumulated corpus is real "program-gt" vs
 * "synthetic-gt"). Invalid rows are filtered. Does NOT compute the isotonic fit (the CLI pairs this
 * with calibrateAgreement for the reliability verdict).
 * @param {Array} samples
 * @returns {{total:number, correct:number, incorrect:number, correctRate:number, bySource:Object}}
 */
export function summarizeCalibrationStore(samples) {
  const valid = (Array.isArray(samples) ? samples : []).filter(isValidSample);
  const bySource = {};
  let correct = 0;
  for (const s of valid) {
    const src = typeof s.source === "string" && s.source ? s.source : "unknown";
    bySource[src] = (bySource[src] || 0) + 1;
    if (s.correct) correct++;
  }
  return {
    total: valid.length,
    correct,
    incorrect: valid.length - correct,
    correctRate: valid.length ? +(correct / valid.length).toFixed(4) : 0,
    bySource,
  };
}

// -- thin I/O wrappers (the only fs-touching surface) ------------------------

/**
 * Load + parse a calibration store. Absent file -> [] (first run is empty, never
 * an error). A read/parse failure on an existing file does NOT throw -- it returns
 * what parsed (parseCalibrationStore is line-tolerant) so a partly-corrupt store
 * degrades to fewer samples, never a crash that kills the nightly run.
 * @param {string} path
 * @returns {Array<{f:number, correct:boolean, source?:string, ts?:string}>}
 */
export function loadCalibrationStore(path) {
  if (!path || !existsSync(path)) return [];
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  return parseCalibrationStore(text);
}

/**
 * Append fresh samples to the store (append-only, provenance-stamped). Creates
 * the parent dir if missing. Returns the count actually written (valid samples).
 * Best-effort: an append failure is surfaced via the return (-1) but never throws
 * -- losing a single run's append must not crash the loop.
 * @param {string} path
 * @param {Array} samples
 * @param {{source?:string, ts?:string}} [meta]
 * @returns {number} count written, or -1 on I/O failure
 */
export function appendCalibrationStore(path, samples, meta = {}) {
  const stamped = stampSamples(samples, meta);
  if (!path || stamped.length === 0) return 0;
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, serializeCalibrationSamples(stamped));
    return stamped.length;
  } catch {
    return -1;
  }
}

/**
 * Reset (truncate) the store. Used by an explicit --reset-calibration-store, NOT
 * by --fresh (the print-resume cursor and the cross-run calibration corpus are
 * orthogonal -- wiping the resume cursor must not discard accumulated calibration).
 * @param {string} path
 * @returns {boolean} true if reset (or already absent)
 */
export function resetCalibrationStore(path) {
  if (!path) return false;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "");
    return true;
  } catch {
    return false;
  }
}
