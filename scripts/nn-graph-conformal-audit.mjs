#!/usr/bin/env node
/**
 * nn-graph-conformal-audit.mjs -- CAM-ML-CLOSEDLOOP / NN-GRAPH tier-5 conformal coverage audit
 * (ledger INDIA-REMAINING-WORK #9, slot:india 2026-06-16).
 *
 * Verifies the split-conformal marginal-coverage guarantee  P(Y in S(X)) >= 1 - alpha
 * for the GNN tier-5 holdout. WIRES the two EXISTING engines (R8 -- no reinvention of the
 * LAC math or the rolling-coverage counter):
 *   - CrossProcessConformalClassificationEngine.calibrate/predictionSet  (LAC split-conformal)
 *   - ConformalCalibrationMonitorEngine.configure/record/status          (rolling empirical coverage)
 *
 * INDIA DISCIPLINE ENCODED IN CODE (R12 -- never a softened/misleading metric):
 *   (1) REFUSES to emit a coverage number when the test holdout has fewer than
 *       MIN_MEANINGFUL_N (== the monitor's MIN_WINDOW_SIZE, 20) samples. A coverage rate
 *       on <20 samples has a binomial CI too wide to mean anything (at n=13, p=0.9 the 95%
 *       CI is roughly +-0.16). The fix is ref-pool/holdout GROWTH, not a smaller window.
 *   (2) WARNS (and flags the result untrustworthy) when most predictions fall back to the
 *       FULL label set -- that happens when the calibration set is too small, which makes
 *       empirical coverage trivially ~1.0 and NOT a real calibration signal.
 *
 * The audit is decoupled from the heavy GNN predictor: it consumes a predictions artifact
 * (one {probs, label} per ghost). Produce that artifact with a full-softmax predictor pass
 * over the holdout (graphsage-predictor) -- which is the separate heavy/scheduled-task step.
 *
 * Usage:
 *   node scripts/nn-graph-conformal-audit.mjs --predictions <file.jsonl> [--alpha 0.1]
 *        [--cal-fraction 0.5] [--tolerance 0.05] [--json] [--strict]
 * where each JSONL line is {"probs":[p0..p(K-1) summing to 1], "label": <int in [0,K)>}.
 *   --strict : exit non-zero if the marginal guarantee is NOT met (for CI gating).
 *
 * @module scripts/nn-graph-conformal-audit
 */

import fs from "node:fs";

/** Matches ConformalCalibrationMonitorEngine.MIN_WINDOW_SIZE -- the floor below which the
 *  empirical-coverage estimate is too noisy to be honest. */
export const MIN_MEANINGFUL_N = 20;
const DEFAULT_ALPHA = 0.1;
const DEFAULT_CAL_FRACTION = 0.5;
const DEFAULT_TOLERANCE = 0.05;
/** Above this full-set rate the empirical coverage is trivially inflated -> untrustworthy. */
const FULLSET_WARN_RATE = 0.5;

const CONFORMAL_DIST = new URL("../mcp-server/dist/engines/CrossProcessConformalClassificationEngine.js", import.meta.url);
const MONITOR_DIST = new URL("../mcp-server/dist/engines/ConformalCalibrationMonitorEngine.js", import.meta.url);

/**
 * Deterministic calibration/test split (first `calFraction` = calibration, rest = test).
 * Conformal validity assumes (X,Y) exchangeability between the two splits -- the caller is
 * responsible for shuffling the holdout upstream if the source order is informative.
 */
export function splitCalTest(pairs, calFraction = DEFAULT_CAL_FRACTION) {
  const nCal = Math.floor(pairs.length * calFraction);
  return { cal: pairs.slice(0, nCal), test: pairs.slice(nCal) };
}

/**
 * Pure audit core. Engines are injected (opts.Conformal / opts.Monitor) so tests run against
 * the REAL engines with synthetic data; the CLI defaults to the built dist engines.
 * Returns {ok:false, error} on refusal/invalid input, or {ok:true, ...report} on success.
 */
export async function runConformalAudit(pairs, opts = {}) {
  const alpha = opts.alpha ?? DEFAULT_ALPHA;
  const calFraction = opts.calFraction ?? DEFAULT_CAL_FRACTION;
  const tolerance = opts.tolerance ?? DEFAULT_TOLERANCE;
  const minTestN = opts.minTestN ?? MIN_MEANINGFUL_N;

  if (!Array.isArray(pairs) || pairs.length === 0) {
    return { ok: false, error: "no prediction pairs supplied (need an array of {probs, label})" };
  }
  if (!(alpha > 0 && alpha < 1)) {
    return { ok: false, error: `alpha must be in (0,1); got ${alpha}` };
  }

  const Conformal = opts.Conformal ?? (await import(CONFORMAL_DIST.href)).CrossProcessConformalClassificationEngine;
  const Monitor = opts.Monitor ?? (await import(MONITOR_DIST.href)).ConformalCalibrationMonitorEngine;

  const { cal, test } = splitCalTest(pairs, calFraction);

  // (1) REFUSE-GATE -- india discipline: no coverage number on a meaningless holdout.
  if (test.length < minTestN) {
    return {
      ok: false,
      refused: true,
      error:
        `insufficient holdout: n_test=${test.length} < MIN=${minTestN}. A conformal coverage rate ` +
        `on <${minTestN} samples has a binomial CI too wide to be meaningful -- grow the ` +
        `ref-pool/holdout first; do NOT report a coverage on this n.`,
      nTest: test.length,
      nCal: cal.length,
    };
  }
  if (cal.length < 1) {
    return { ok: false, error: `empty calibration split (calFraction=${calFraction} of n=${pairs.length}); need >=1 calibration pair` };
  }

  // Fresh calibration each run (append:false replaces the engine's module state).
  const calRes = Conformal.calibrate({ pairs: cal, append: false });
  if (!calRes.ok) return { ok: false, error: `calibration failed: ${calRes.message}` };

  Monitor.reset();
  const cfg = Monitor.configure({ windowSize: test.length, alpha });
  if (!cfg.ok) return { ok: false, error: `monitor configure failed: ${cfg.message}` };

  const numClasses = test[0]?.probs?.length ?? cal[0].probs.length;

  // P2-fix: bound-check test labels against numClasses BEFORE the loop. The conformal
  // engine validates cal labels (line 324 of the engine), but test labels flow only
  // through the monitor schema which accepts any nonnegative integer -- an out-of-range
  // test label (e.g. mis-encoded ghost-class id) would silently never appear in any
  // prediction set, inflating the miss rate and giving an honestly-computed but
  // garbage-input coverage rate. Refuse rather than report a misleading number.
  for (let i = 0; i < test.length; i += 1) {
    const tl = test[i].label;
    if (!Number.isInteger(tl) || tl < 0 || tl >= numClasses) {
      return { ok: false, error: `test label at index ${i} = ${tl} outside valid class range [0, ${numClasses})` };
    }
  }

  let fullSetCount = 0;
  let lastStatus = null;
  for (const t of test) {
    const ps = Conformal.predictionSet({ probs: t.probs, alpha });
    if (!ps.ok) return { ok: false, error: `predictionSet failed: ${ps.message}` };
    if (ps.fullSet) fullSetCount += 1;
    // predictionSet guarantees a NON-EMPTY set (Sadinle 2019: c in S iff probs[c] >= 1-qHat,
    // else the argmax is included on a degenerate threshold), so ps.classes.length >= 1 always.
    // A miss is therefore a genuine "true class not in the set" (true class is a non-argmax that
    // fails the threshold), NOT an empty set. If a future engine contract regressed to emitting
    // [], the monitor's own min(1) validation below fails loud rather than silently miscounting.
    const rec = Monitor.record({ predictedSet: ps.classes, actualLabel: t.label });
    if (!rec.ok) return { ok: false, error: `monitor record failed: ${rec.message}` };
    lastStatus = rec.status;
  }

  const status = lastStatus ?? Monitor.status();
  const empirical = status.empiricalCoverage;
  const target = status.targetCoverage; // 1 - alpha
  const fullSetRate = fullSetCount / test.length;
  const trustworthy = fullSetRate <= FULLSET_WARN_RATE;
  return {
    ok: true,
    alpha,
    nCal: cal.length,
    nTest: test.length,
    numClasses,
    empiricalCoverage: empirical,
    targetCoverage: target,
    // The marginal guarantee allows a finite-sample slack of `tolerance` below target.
    marginalGuaranteeMet: empirical >= target - tolerance,
    tolerance,
    fullSetCount,
    fullSetRate,
    trustworthy,
    fullSetWarning: trustworthy
      ? null
      : `WARNING: ${(fullSetRate * 100).toFixed(0)}% of predictions fell back to the FULL label set ` +
        `(calibration too small, n_cal=${cal.length}) -- empirical coverage is trivially inflated and NOT a real signal.`,
    calibrationStats: calRes.stats,
    drifting: status.drifting,
  };
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

/** Coerce a CLI numeric arg, throwing a clear error rather than silently turning NaN. */
function parseFiniteNumber(name, raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`--${name} must be a finite number; got ${JSON.stringify(raw)}`);
  return n;
}

export function parseArgs(argv) {
  const out = { predictions: null, alpha: DEFAULT_ALPHA, calFraction: DEFAULT_CAL_FRACTION, tolerance: DEFAULT_TOLERANCE, json: false, strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--predictions") out.predictions = argv[++i];
    else if (a === "--alpha") out.alpha = parseFiniteNumber("alpha", argv[++i]);
    else if (a === "--cal-fraction") out.calFraction = parseFiniteNumber("cal-fraction", argv[++i]);
    else if (a === "--tolerance") out.tolerance = parseFiniteNumber("tolerance", argv[++i]);
    else if (a === "--json") out.json = true;
    else if (a === "--strict") out.strict = true;
  }
  return out;
}

/** Parse a predictions JSONL into [{probs, label}]. Skips blank lines; throws on a malformed line. */
export function parsePredictionsJsonl(text) {
  const pairs = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (err) {
      throw new Error(`predictions line ${i + 1}: not valid JSON (${err.message})`);
    }
    if (!Array.isArray(obj.probs) || !Number.isInteger(obj.label)) {
      throw new Error(`predictions line ${i + 1}: expected {probs:number[], label:int}`);
    }
    pairs.push({ probs: obj.probs, label: obj.label });
  }
  return pairs;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.predictions) {
    console.error("usage: node scripts/nn-graph-conformal-audit.mjs --predictions <file.jsonl> [--alpha 0.1] [--cal-fraction 0.5] [--tolerance 0.05] [--json] [--strict]");
    process.exit(2);
  }
  let pairs;
  try {
    pairs = parsePredictionsJsonl(fs.readFileSync(args.predictions, "utf8"));
  } catch (err) {
    console.error(`FAILED to load predictions: ${err.message}`);
    process.exit(2);
  }
  const report = await runConformalAudit(pairs, { alpha: args.alpha, calFraction: args.calFraction, tolerance: args.tolerance });
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!report.ok) {
    console.error(`REFUSED/FAILED: ${report.error}`);
  } else {
    console.log(`conformal coverage audit (alpha=${report.alpha}): empirical=${report.empiricalCoverage.toFixed(4)} target=${report.targetCoverage.toFixed(4)} ` +
      `guaranteeMet=${report.marginalGuaranteeMet} n_cal=${report.nCal} n_test=${report.nTest} trustworthy=${report.trustworthy}`);
    if (report.fullSetWarning) console.warn(report.fullSetWarning);
  }
  // Exit codes: 2 = refused/failed/untrustworthy-under-strict; 1 = ran but guarantee not
  // met (only under --strict); 0 = ok.
  // P1-fix: under --strict an UNTRUSTWORTHY run is treated as REFUSED (exit 2), not a silent
  // CI pass. The "trivially full-set -> empirical=1.0 -> guarantee met" path is the exact
  // false-green the india invariant exists to prevent.
  if (!report.ok) process.exit(2);
  if (args.strict && report.ok && !report.trustworthy) process.exit(2);
  if (args.strict && !report.marginalGuaranteeMet) process.exit(1);
  process.exit(0);
}

// run-if-main guard (Windows-safe: compare resolved paths).
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href;
if (isMain) {
  main().catch((err) => {
    console.error(`conformal-audit crashed: ${err.stack || err}`);
    process.exit(2);
  });
}
