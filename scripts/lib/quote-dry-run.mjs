// scripts/lib/quote-dry-run.mjs
//
// U-MMO-QUOTE-DRY-RUN — the visible thesis of MASTER-MACHINIST-ORCHESTRATOR-MS0.
//
// The dry-run quote = the orchestrator pipeline shell running in "estimate"
// mode, with quote-specific overlays:
//   - Wright's 80% learning curve (batch-size pricing)
//   - alt_methods from METHOD-ROUTER (CAM vs macro vs conversational)
//   - risk_premium for low-confidence stages
//   - margin_floor + should_cost (theoretical optimum)
//   - win_probability from QuoteAnalyticsEngine priors (when wired)
//
// The point of the dry-run: every dollar traces to a pipeline stage. Quote-
// actual variance collapses because the same engines that quoted will execute.
//
// COMPOSES WITH
//   - orchestrator-pipeline-shell.mjs (estimate mode → decomposition + bands)
//   - QuoteEstimatorEngine + JobCostingEngine + QuoteToShipOrchestratorEngine
//     (the 3 wired engines per Agent K — wrapped here, not duplicated)
//
// DOCTRINE
//   - R12 (fail-loud): GAMMA-tier quotes surface "I don't know" honestly.
//   - Never present a single number when uncertainty is large; always 3 bands.
//   - Wright's curve = canonical learning-curve model (T_n = T_1 * n^(log2(b)))
//     where b is the learning factor (0.80 for typical machining).
//
// Per the MASTER-MACHINIST-ORCHESTRATOR-MS0 spec § "Quote dry-run output contract".

import { createPipeline, aggregateDecomposition } from "./orchestrator-pipeline-shell.mjs";

// ---------------------------------------------------------------------------
// CONSTANTS — Wright's learning curve + risk premium tuning
// ---------------------------------------------------------------------------

// Wright's law: T_n = T_1 * n^(log2(b)). Default b=0.80 means each doubling
// of cumulative output reduces unit time by 20% (typical for setup-heavy
// machining; precision parts run closer to 0.85). Per CLAUDE.md Quoting
// Expert Mode and `feedback_high_roi_backend_first_slot_queue`.
export const WRIGHT_DEFAULT_LEARNING_FACTOR = 0.80;

// Risk premium scales: low_confidence_stage_count → percentage to add as
// risk_premium. Tuned to typical shop quoting practice — operators add
// 8-12% on jobs with >3 unknowns, 15-25% on >6 unknowns.
const RISK_PREMIUM_TIERS = Object.freeze([
  { max_low_conf: 0, premium_pct: 0.0 },   // perfect knowledge
  { max_low_conf: 2, premium_pct: 0.03 },  // mild unknowns
  { max_low_conf: 4, premium_pct: 0.08 },  // moderate
  { max_low_conf: 6, premium_pct: 0.15 },  // many unknowns
  { max_low_conf: Infinity, premium_pct: 0.25 }, // throw the dart
]);

const LOW_CONFIDENCE_THRESHOLD = 0.6;

// ---------------------------------------------------------------------------
// WRIGHT'S LEARNING CURVE
// ---------------------------------------------------------------------------

/**
 * Wright's law unit time multiplier at cumulative quantity n.
 * Returns the per-unit time factor relative to the first unit (T_1=1).
 *
 * @param {number} n - cumulative units produced (1-indexed)
 * @param {number} [learningFactor=WRIGHT_DEFAULT_LEARNING_FACTOR]
 * @returns {number}
 */
export function wrightUnitFactor(n, learningFactor = WRIGHT_DEFAULT_LEARNING_FACTOR) {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`wrightUnitFactor: n must be >= 1, got ${n}`);
  }
  if (learningFactor <= 0 || learningFactor > 1) {
    throw new Error(`wrightUnitFactor: learningFactor must be in (0, 1], got ${learningFactor}`);
  }
  // T_n / T_1 = n^(log2(b))
  const exp = Math.log2(learningFactor);
  return Math.pow(n, exp);
}

/**
 * Cumulative time for first n units under Wright's law (T_1 normalized to 1).
 * Used to estimate total job time for a batch of N parts when only the
 * first-unit time is known.
 *
 * @param {number} n
 * @param {number} [learningFactor]
 * @returns {number}
 */
export function wrightCumulativeFactor(n, learningFactor = WRIGHT_DEFAULT_LEARNING_FACTOR) {
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`wrightCumulativeFactor: n must be >= 1, got ${n}`);
  }
  let sum = 0;
  for (let i = 1; i <= Math.floor(n); i++) {
    sum += wrightUnitFactor(i, learningFactor);
  }
  return sum;
}

/**
 * Compute Wright curve for the three standard batch sizes operators care
 * about: N=1 (prototype), N=10 (small run), N=100 (production).
 *
 * @param {number} costN1 - first-unit cost in dollars
 * @param {number} [learningFactor]
 * @returns {{n1: number, n10: number, n100: number, perUnit_n10: number, perUnit_n100: number}}
 */
export function wrightCurve(costN1, learningFactor = WRIGHT_DEFAULT_LEARNING_FACTOR) {
  if (!Number.isFinite(costN1) || costN1 < 0) {
    throw new Error(`wrightCurve: costN1 must be a non-negative finite number, got ${costN1}`);
  }
  const n1 = costN1;
  const cum10 = costN1 * wrightCumulativeFactor(10, learningFactor);
  const cum100 = costN1 * wrightCumulativeFactor(100, learningFactor);
  return {
    n1: round2(n1),
    n10: round2(cum10),
    n100: round2(cum100),
    perUnit_n10: round2(cum10 / 10),
    perUnit_n100: round2(cum100 / 100),
  };
}

// ---------------------------------------------------------------------------
// RISK PREMIUM
// ---------------------------------------------------------------------------

/**
 * Risk-premium percentage based on how many low-confidence stages are in
 * the decomposition. More unknowns → larger buffer.
 *
 * @param {object[]} decomposition - from pipeline.run().decomposition
 * @param {number} [threshold=LOW_CONFIDENCE_THRESHOLD]
 * @returns {{ low_confidence_count: number, premium_pct: number }}
 */
export function computeRiskPremium(decomposition, threshold = LOW_CONFIDENCE_THRESHOLD) {
  if (!Array.isArray(decomposition)) {
    throw new Error("computeRiskPremium: decomposition must be an array");
  }
  const lowCount = decomposition.filter((s) => (s.confidence ?? 0) < threshold).length;
  for (const tier of RISK_PREMIUM_TIERS) {
    if (lowCount <= tier.max_low_conf) {
      return { low_confidence_count: lowCount, premium_pct: tier.premium_pct };
    }
  }
  return { low_confidence_count: lowCount, premium_pct: 0.25 };
}

// ---------------------------------------------------------------------------
// SHOULD-COST + MARGIN FLOOR
// ---------------------------------------------------------------------------

/**
 * Should-cost = theoretical minimum: every stage runs at its highest declared
 * confidence (i.e. we hit best-case across the board). Office uses this as
 * the "no slack" benchmark for negotiation.
 *
 * Margin floor = should_cost + minimum acceptable margin (default 8%).
 *
 * @param {object[]} decomposition
 * @param {object} [opts]
 * @param {number} [opts.minimumMarginPct=0.08]
 * @returns {{ should_cost: number, margin_floor: number }}
 */
export function computeShouldCost(decomposition, opts = {}) {
  const { minimumMarginPct = 0.08 } = opts;
  // should_cost: each stage's cost scaled by its declared confidence
  // (high confidence = predictable cost; low confidence = wider band but
  // should_cost trims it toward the lower bound).
  let should_cost = 0;
  for (const stage of decomposition) {
    const conf = Math.max(stage.confidence ?? 0.5, 0.5);
    should_cost += (stage.cost ?? 0) * conf;
  }
  return {
    should_cost: round2(should_cost),
    margin_floor: round2(should_cost * (1 + minimumMarginPct)),
  };
}

// ---------------------------------------------------------------------------
// QUOTE DRY-RUN — top-level
// ---------------------------------------------------------------------------

/**
 * Run a dry-run quote for an RFQ. The pipeline runs in "estimate" mode;
 * the result is the spec's quote_dry_run output contract.
 *
 * @param {object} params
 * @param {object} params.rfq - initial input to the pipeline
 * @param {object} params.pipeline - pre-configured pipeline (caller registers stages)
 * @param {number} [params.batchSize=1] - N for Wright's curve
 * @param {number} [params.learningFactor]
 * @param {object[]} [params.altMethods] - METHOD-ROUTER alternates if available
 * @param {number} [params.winProbability] - from QuoteAnalyticsEngine if available
 * @param {number} [params.minimumMarginPct]
 * @returns {object} - per spec § "Quote dry-run output contract"
 */
export function quoteDryRun(params) {
  const {
    rfq, pipeline, batchSize: _batchSize = 1, learningFactor = WRIGHT_DEFAULT_LEARNING_FACTOR,
    altMethods = [], winProbability = null, minimumMarginPct = 0.08,
  } = params;

  if (!rfq || typeof rfq !== "object") {
    throw new Error("quoteDryRun: rfq object required");
  }
  if (!pipeline || typeof pipeline.run !== "function") {
    throw new Error("quoteDryRun: pipeline with .run() required");
  }
  if (pipeline.mode !== "estimate") {
    throw new Error(`quoteDryRun: pipeline must be in 'estimate' mode, got '${pipeline.mode}' — never quote from an execute-mode pipeline`);
  }

  // Run the pipeline
  const run = pipeline.run(rfq);
  const decomposition = run.decomposition;
  const totals = run.totals;

  // Risk premium
  const risk = computeRiskPremium(decomposition);

  // Should-cost
  const sc = computeShouldCost(decomposition, { minimumMarginPct });

  // Apply Wright curve to the P50 cost for batch pricing
  const curve = wrightCurve(totals.cost_p50, learningFactor);

  // Apply risk premium to all three bands
  const premium = risk.premium_pct;
  const quote_low_p50 = {
    dollars: round2(totals.cost_p50 * (1 + premium)),
    lead_days: roundUp(totals.duration_total_sec / 3600 / 8),  // 8hr workday baseline
    confidence: confidenceLabel(totals.cost_p50, totals.quote_reliability),
  };
  const quote_med_p95 = {
    dollars: round2(totals.cost_p95 * (1 + premium)),
    lead_days: roundUp(totals.duration_total_sec / 3600 / 8 * 1.2),  // 20% schedule buffer
    confidence: confidenceLabel(totals.cost_p95, totals.quote_reliability),
  };
  const quote_high_p99 = {
    dollars: round2(totals.cost_p99 * (1 + premium)),
    lead_days: roundUp(totals.duration_total_sec / 3600 / 8 * 1.5),
    confidence: confidenceLabel(totals.cost_p99, totals.quote_reliability),
  };

  return {
    quote_low_p50,
    quote_med_p95,
    quote_high_p99,
    decomposition: decomposition.map((s) => ({
      stage: s.stage,
      cost: s.cost,
      source: s.engineRef,
      confidence: s.confidence,
      evidence: s.evidence,
    })),
    alt_methods: altMethods,
    should_cost: sc.should_cost,
    margin_floor: sc.margin_floor,
    risk_premium: round2(totals.cost_p50 * premium),
    win_probability: winProbability,
    wright_curve: curve,
    quote_reliability: totals.quote_reliability,
    deferred_stages: totals.deferred_stages,
    errored_stages: totals.errored_stages,
    run_metadata: run.run_metadata,
    summary: summarizeQuote(quote_low_p50, quote_med_p95, quote_high_p99, totals.quote_reliability),
  };
}

/**
 * @param {object} low
 * @param {object} med
 * @param {object} high
 * @param {string} reliability
 * @returns {string}
 */
export function summarizeQuote(low, med, high, reliability) {
  return `Quote ${reliability}: $${low.dollars}/p50 → $${med.dollars}/p95 (rec) → $${high.dollars}/p99 · lead ${med.lead_days}d`;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function round2(n) {
  return Math.round(n * 100) / 100;
}

function roundUp(n) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.ceil(n);
}

function confidenceLabel(_cost, reliability) {
  // Maps the reliability tier (from pipeline aggregation) to a stakeholder-
  // facing confidence percentage. Per the MASTER-MACHINIST spec § "Risk-tier
  // transparency": ALPHA-93% / BETA-65% / GAMMA-40%.
  if (reliability === "ALPHA") return 0.93;
  if (reliability === "BETA") return 0.65;
  return 0.40;
}

// ---------------------------------------------------------------------------
// CONVENIENCE — build a default-noop pipeline for cold-start quoting
// ---------------------------------------------------------------------------

/**
 * Build a pipeline with no stage adapters registered. Useful when an RFQ
 * arrives before any sierra units have shipped — surface a GAMMA-tier quote
 * with all 16 stages deferred, honestly under-estimating + flagging gaps.
 *
 * @returns {ReturnType<typeof createPipeline>}
 */
export function buildDefaultEstimatePipeline() {
  return createPipeline({ mode: "estimate" });
}

// Re-export aggregator helper for callers that want to use it directly.
export { aggregateDecomposition };
