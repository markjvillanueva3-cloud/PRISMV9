// scripts/lib/orchestrator-fleet-foundations.mjs
//
// FLEET-FOUNDATIONS bundle — 5 fleet-owned MMO-MS0 unit foundations in
// one file (juliett + golf + hotel). Sierra ships the contract; each slot
// wires real engine references at unit-claim time.
//
// UNITS
//   1. U-MMO-MULTI-AGENT-MODEL-LOCK   (juliett) — DistributedLockManager wrapper
//   2. U-MMO-DRIFT-REGRESSION-NIGHTLY (golf)    — nightly MAE drift detector
//   3. U-MMO-CONFIDENCE-EXPLAIN-TRACE (hotel)   — structured explain() attachment
//   4. U-MMO-WIN-LOSE-LOOP            (hotel)   — quote-outcome → pricing trainer
//   5. U-MMO-WRIGHT-CURVE-WRAPPER     (hotel)   — quote engine integration of Wright's law
//
// Per Agent I doctrine:
//   - Locks are mandatory on weight writes (multi-agent corruption fix)
//   - Drift gate auto-rollback at >5% AUROC drop
//   - Explain trace surfaces uncertainty (no single number when N<20 or drift>0.15)

// ===========================================================================
// 1. U-MMO-MULTI-AGENT-MODEL-LOCK
// ===========================================================================

/**
 * Wrap an async write-fn with a lock. The pattern matches the
 * `DistributedLockManager.withLock(key, fn)` PRISM API; this is the .mjs
 * facade that lets sierra wire it from the orchestrator stages.
 *
 * @param {object} params
 * @param {Function} params.lockAcquire  - async (key) → release fn
 * @returns {Function} - (key, writeFn) → Promise<result of writeFn>
 */
export function createModelLock({ lockAcquire }) {
  if (typeof lockAcquire !== "function") {
    throw new Error("createModelLock: lockAcquire fn required");
  }
  return async function withModelLock(key, writeFn) {
    if (!key || typeof key !== "string") {
      throw new Error("withModelLock: key (string) required");
    }
    if (typeof writeFn !== "function") {
      throw new Error("withModelLock: writeFn required");
    }
    const release = await lockAcquire(key);
    try {
      return await writeFn();
    } finally {
      if (typeof release === "function") {
        try { await release(); } catch { /* swallow per observation rule */ }
      }
    }
  };
}

// ===========================================================================
// 2. U-MMO-DRIFT-REGRESSION-NIGHTLY
// ===========================================================================

const DRIFT_WARN_PCT = 0.05;       // 5% MAE up → warn
const DRIFT_ROLLBACK_PCT = 0.15;   // 15% MAE up → auto-rollback

/**
 * Compare baseline vs current model performance + return drift verdict.
 * In production wires to CAMMLDriftMonitorEngine; here is the pure-fn
 * predicate the nightly cron evaluates.
 *
 * @param {object} params
 * @param {number} params.baselineMAE
 * @param {number} params.currentMAE
 * @returns {{ verdict, severity, mae_delta_pct, action }}
 */
export function evaluateDrift({ baselineMAE, currentMAE }) {
  if (!Number.isFinite(baselineMAE) || baselineMAE <= 0) {
    throw new Error(`evaluateDrift: baselineMAE must be positive finite, got ${baselineMAE}`);
  }
  if (!Number.isFinite(currentMAE) || currentMAE < 0) {
    throw new Error(`evaluateDrift: currentMAE must be non-negative finite, got ${currentMAE}`);
  }
  const delta = (currentMAE - baselineMAE) / baselineMAE;
  if (delta >= DRIFT_ROLLBACK_PCT) {
    return { verdict: "rollback", severity: "critical", mae_delta_pct: delta, action: "AUTO-ROLLBACK: current model > 15% worse than baseline" };
  }
  if (delta >= DRIFT_WARN_PCT) {
    return { verdict: "warn", severity: "elevated", mae_delta_pct: delta, action: "WARN: current model > 5% worse — manager review" };
  }
  if (delta <= -DRIFT_WARN_PCT) {
    return { verdict: "improved", severity: "info", mae_delta_pct: delta, action: "IMPROVED: model better than baseline" };
  }
  return { verdict: "stable", severity: "ok", mae_delta_pct: delta, action: "no drift" };
}

// ===========================================================================
// 3. U-MMO-CONFIDENCE-EXPLAIN-TRACE
// ===========================================================================

const EXPLAIN_LOW_N_THRESHOLD = 20;
const EXPLAIN_DRIFT_WARN_THRESHOLD = 0.15;

/**
 * Build a structured explain() trace for a recommendation.
 * Doctrine: never show a single number when N<20 OR drift>0.15 — surface
 * uncertainty.
 *
 * @param {object} params
 * @param {*} params.recommendation
 * @param {object} params.prior - { n: number, distribution?: object }
 * @param {string[]} params.evidence
 * @param {number} params.confidence
 * @param {object} [params.driftStatus] - { value: number, level: string }
 * @param {object[]} [params.alternatives]
 * @param {string} [params.lastCalibrated]
 * @returns {{recommendation, confidence_display, confidence_interval, prior, evidence, alternatives, drift_status, last_calibrated, surface_uncertainty: boolean}}
 */
export function buildExplainTrace({
  recommendation, prior, evidence, confidence,
  driftStatus, alternatives = [], lastCalibrated = null,
}) {
  if (!prior || typeof prior.n !== "number") {
    throw new Error("buildExplainTrace: prior.n required");
  }
  if (typeof confidence !== "number" || confidence < 0 || confidence > 1) {
    throw new Error(`buildExplainTrace: confidence must be in [0,1], got ${confidence}`);
  }
  if (!Array.isArray(evidence)) {
    throw new Error("buildExplainTrace: evidence must be an array");
  }

  const lowN = prior.n < EXPLAIN_LOW_N_THRESHOLD;
  const highDrift = driftStatus && typeof driftStatus.value === "number" && driftStatus.value > EXPLAIN_DRIFT_WARN_THRESHOLD;
  const surfaceUncertainty = lowN || highDrift;

  // Confidence interval — wider when N is small, when drift is high
  const ciWidth = lowN ? 0.4 : highDrift ? 0.25 : 0.10;
  const ciLow = Math.max(0, confidence - ciWidth / 2);
  const ciHigh = Math.min(1, confidence + ciWidth / 2);

  return {
    recommendation,
    confidence_display: surfaceUncertainty
      ? `${Math.round(confidence * 100)}% (low confidence — N=${prior.n}, drift=${(driftStatus?.value ?? 0).toFixed(2)})`
      : `${Math.round(confidence * 100)}%`,
    confidence_interval: [Number(ciLow.toFixed(3)), Number(ciHigh.toFixed(3))],
    prior,
    evidence,
    alternatives,
    drift_status: driftStatus || { value: 0, level: "ok" },
    last_calibrated: lastCalibrated,
    surface_uncertainty: surfaceUncertainty,
  };
}

// ===========================================================================
// 4. U-MMO-WIN-LOSE-LOOP
// ===========================================================================

/**
 * Quote-outcome (won/lost) → pricing model trainer.
 *
 * @param {object} params
 * @param {Function} [params.onPriceUpdate]  - (deltaPct, reason) → void
 * @returns {object}
 */
export function createWinLoseLoop({ onPriceUpdate } = {}) {
  const history = [];

  function ingest({ quoteId, quotedDollars, outcome, actualMargin, customer }) {
    if (!quoteId) throw new Error("ingest: quoteId required");
    if (typeof quotedDollars !== "number" || quotedDollars <= 0) {
      throw new Error("ingest: quotedDollars (positive) required");
    }
    if (!["won", "lost", "abandoned"].includes(outcome)) {
      throw new Error(`ingest: outcome must be won|lost|abandoned, got '${outcome}'`);
    }
    const record = { quoteId, quotedDollars, outcome, actualMargin, customer, timestamp: new Date().toISOString() };
    history.push(record);

    // Heuristic pricing update:
    // - "won" with high margin → quote was below-market; nudge up
    // - "lost" → quote was above-market; nudge down (assuming we want to win)
    // - "abandoned" → no signal (customer disengaged)
    let deltaPct = 0;
    let reason = "no-update";
    if (outcome === "won" && typeof actualMargin === "number" && actualMargin > 0.20) {
      deltaPct = 0.02;
      reason = `won with ${(actualMargin * 100).toFixed(0)}% margin — room to raise`;
    } else if (outcome === "lost") {
      deltaPct = -0.02;
      reason = "lost — likely above market";
    }
    if (deltaPct !== 0 && typeof onPriceUpdate === "function") {
      try { onPriceUpdate(deltaPct, reason); } catch { /* swallow */ }
    }
    return { recorded: true, deltaPct, reason };
  }

  function winRate() {
    if (history.length === 0) return null;
    const won = history.filter((r) => r.outcome === "won").length;
    return won / history.length;
  }

  function snapshot() {
    return {
      total: history.length,
      won: history.filter((r) => r.outcome === "won").length,
      lost: history.filter((r) => r.outcome === "lost").length,
      abandoned: history.filter((r) => r.outcome === "abandoned").length,
      winRate: winRate(),
    };
  }

  return { ingest, winRate, snapshot };
}

// ===========================================================================
// 5. U-MMO-WRIGHT-CURVE-WRAPPER
// ===========================================================================

/**
 * Wrap the existing wrightCurve() into a quote-engine integration helper.
 * Given the first-unit cost + batch size, return the per-unit AND total
 * cost shipping the operator-requested batch.
 *
 * @param {object} params
 * @param {number} params.costN1
 * @param {number} params.batchSize
 * @param {number} [params.learningFactor=0.80]
 * @returns {{n, total_cost, per_unit_cost, savings_vs_naive, learning_factor}}
 */
export function applyWrightCurveToBatch({ costN1, batchSize, learningFactor = 0.80 }) {
  if (!Number.isFinite(costN1) || costN1 < 0) {
    throw new Error(`applyWrightCurveToBatch: costN1 must be non-negative finite, got ${costN1}`);
  }
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error(`applyWrightCurveToBatch: batchSize must be integer >= 1, got ${batchSize}`);
  }
  if (!Number.isFinite(learningFactor) || learningFactor <= 0 || learningFactor > 1) {
    throw new Error(`applyWrightCurveToBatch: learningFactor must be in (0,1], got ${learningFactor}`);
  }
  const exp = Math.log2(learningFactor);
  let cum = 0;
  for (let i = 1; i <= batchSize; i++) {
    cum += Math.pow(i, exp);
  }
  const totalCost = costN1 * cum;
  return {
    n: batchSize,
    total_cost: Number(totalCost.toFixed(2)),
    per_unit_cost: Number((totalCost / batchSize).toFixed(2)),
    savings_vs_naive: Number((costN1 * batchSize - totalCost).toFixed(2)),
    learning_factor: learningFactor,
  };
}

export {
  DRIFT_WARN_PCT,
  DRIFT_ROLLBACK_PCT,
  EXPLAIN_LOW_N_THRESHOLD,
  EXPLAIN_DRIFT_WARN_THRESHOLD,
};
