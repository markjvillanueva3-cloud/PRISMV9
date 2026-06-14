/**
 * QuotingClosedLoopEngine — autonomous self-improving / self-learning controller
 * for the quoting system.
 *
 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-CORE (slot:charlie iter46 2026-05-26).
 *
 * Composes the 5 existing quoting substrate engines into ONE closed loop:
 *
 *   ┌─ observe ─┐   ┌─ compare ──┐   ┌─ detect ──┐   ┌─ act ──────┐
 *   │ Outcomes  │──▶│ Accuracy   │──▶│ Drift     │──▶│ Retrain   │
 *   │ Feed      │   │ Loop       │   │           │   │ Calibrate │
 *   └───────────┘   └────────────┘   └───────────┘   └────┬──────┘
 *                                                         │
 *                          ┌──────────────────────────────┘
 *                          ▼
 *                   ┌──────────────┐
 *                   │ Validate vs  │     pass → promote ──▶ ActiveFactorLoader
 *                   │ holdout      │     fail → rollback (keep current)
 *                   └──────────────┘
 *
 * Composes (does NOT replace):
 *   - QuotingTrainingLoopEngine.run(records) → AccuracyReport (measure)
 *   - QuotingCalibrationEngine.deriveWithCoV(report) → factors + CoV verdict (learn)
 *   - QuotingActiveFactorLoaderEngine — atomic temp+rename of active-factor JSON (act)
 *   - QuoteOutcomeFeedEngine — capture quote→actual outcomes (observe)
 *   - QuoteOutcomePSIDeltaBridgeEngine — feed psi_delta back to PSN (telemetry)
 *
 * The loop is intentionally SMALL — the heavy lifting is in the composed
 * engines. This engine's job is the GLUE: decide WHEN to run each stage,
 * gate promotions on validation, and emit an auditable cycle record.
 *
 * Single-cycle today (`runCycle()`); a scheduler wraps this for autonomous
 * execution (cron / Stop-hook). Pure compositional + fail-soft — every
 * stage records its outcome in the cycle record; a stage failure does
 * NOT abort the cycle, it just degrades the verdict.
 *
 * KEY DESIGN DECISIONS (Karpathy R1–R4):
 *   - CLASSIFY: closed-loop control problem (observe → measure → decide → act
 *     → validate → telemeter), with the actuator being the active-factor JSON.
 *   - TECHNIQUE: stage-by-stage pipeline with structured CycleResult; each
 *     stage either succeeds with data or fails with a reason; no throws.
 *   - EDGE CASES: empty outcome batch (no new data since last run),
 *     accuracy report missing (training loop failed), CoV verdict UNSAFE
 *     (calibration rejected the new factors), holdout regression (validation
 *     failed), promotion-write failure, persistence-store failure.
 *   - FAILURE MODES: every stage returns a structured result; cycle records
 *     all attempted stages; rollback is the default on any validation
 *     failure (never overwrite the active-factor JSON without verifying it).
 */

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { log } from "../utils/Logger.js";

// ─── Loosely-typed deps so the engine composes existing modules without ─────
// hard import coupling. Adoption is opt-in: pass real deps in production,
// inject mocks in tests. Matches PipelineRegistryBridge dep-injection pattern.
// (Strong types would require importing concrete engines that may not exist
// in all build configurations; PRISM convention is to type-stub at the
// boundary and trust the composed engine's contract.)

export interface QuoteOutcomeRecord {
  quote_id: string;
  customer?: string;
  part_id?: string;
  doc_date?: string;
  predicted_quote_usd: number;
  actual_invoice_usd?: number | null;  // null until the outcome lands
  accepted?: boolean | null;            // null = no signal yet
  material?: string;
  machine_class?: string;
  observed_at?: string;
}

export interface AccuracyReport {
  sample_size: number;
  mape_pct: number;             // mean absolute percent error
  hit_rate_15pct: number;       // fraction within ±15%
  hit_rate_10pct: number;       // fraction within ±10%
  bias_pct: number;             // mean signed error (negative = under-quoting)
  // Optional richer fields the calibration engine may consume.
  residuals?: number[];
  by_customer?: Record<string, { n: number; mape_pct: number }>;
  by_machine_class?: Record<string, { n: number; mape_pct: number }>;
}

export interface CalibrationFactors {
  // Opaque to this engine — passed straight through to the active-factor
  // loader after validation. The CoV verdict + factor shape live in the
  // QuotingCalibrationEngine contract.
  [key: string]: unknown;
}

export interface CoVVerdict {
  safe_to_activate: boolean;
  confidence: number;
  reasoning?: string;
  rejected_reasons?: string[];
}

export interface OutcomeProvenance {
  /** real = provably from realized actuals; synthetic = constant/placeholder
   *  markers; empty = no usable realized actuals at all;
   *  error = infra/source failure (e.g. ERP read crashed) -- signals carries
   *  the error message so the operator can diagnose. mayPromote is false. */
  verdict: "real" | "synthetic" | "empty" | "error";
  /** True ONLY for `real`. A false value blocks the live active-factor write
   *  (fail-closed on the quote-time path). */
  mayPromote: boolean;
  /** Count of outcomes carrying a finite, positive realized actual. */
  real_outcome_count: number;
  /** Concrete evidence for the verdict (for logs + the cycle report). */
  signals: string[];
}

export type CycleStage =
  | "observed"
  | "measured"
  | "drift_evaluated"
  | "retrained"
  | "validated"
  | "promoted"
  | "rolled_back"
  | "telemetered";

export interface StageResult<T = unknown> {
  stage: CycleStage;
  ok: boolean;
  data?: T;
  reason?: string;
  duration_ms?: number;
}

export interface CycleResult {
  cycle_id: string;
  started_at: string;
  finished_at: string;
  verdict:
    | "PROMOTED"          // new factors validated + written to active-factor JSON
    | "NO_DRIFT_NO_OP"    // accuracy still healthy, no retrain triggered
    | "ROLLED_BACK"       // retrained but validation failed; current factors kept
    | "WITHHELD_SYNTHETIC" // retrained + improved, but outcomes were synthetic/placeholder -- live write withheld
    | "INSUFFICIENT_DATA" // fewer than min_sample_size outcomes since last run
    | "STAGE_FAILED";     // a stage threw a structured failure; cycle aborted early
  stages: StageResult[];
  accuracy_before?: AccuracyReport;
  accuracy_after?: AccuracyReport;
  drift_detected: boolean;
  factors_promoted?: CalibrationFactors;
  /** Provenance classification of the observed outcome batch (set once the
   *  batch passes the min-sample gate). Drives whether factors may reach the
   *  live quote-time active-factor file. */
  provenance?: OutcomeProvenance;
  /** Factors retrained + validated but WITHHELD from the live path because the
   *  outcome batch was not provably real. Returned for observability; never
   *  written to the active-factor JSON. */
  factors_withheld?: CalibrationFactors;
  warnings: string[];
}

export interface ClosedLoopDeps {
  /** Fetch outcomes recorded since the given ISO timestamp. */
  fetchOutcomes: (sinceIso?: string) => Promise<QuoteOutcomeRecord[]>;
  /** Run the QuotingTrainingLoopEngine on the outcome batch. */
  runAccuracy: (records: QuoteOutcomeRecord[]) => Promise<AccuracyReport>;
  /** Run the QuotingCalibrationEngine — derive new factors + CoV verdict. */
  deriveWithCoV: (report: AccuracyReport) => Promise<{ factors: CalibrationFactors; verdict: CoVVerdict }>;
  /** Apply the candidate factors to a held-out validation set. */
  validateOnHoldout: (factors: CalibrationFactors, holdout: QuoteOutcomeRecord[]) => Promise<AccuracyReport>;
  /** Write the active-factor JSON atomically. Returns the written path. */
  writeActiveFactors: (factors: CalibrationFactors) => Promise<string>;
  /** Optional: feed psi_delta back to the PSN autonomy loop. Fired ONLY on the
   *  PROMOTED path -- the applied mape improvement. */
  feedPSIDelta?: (delta: number) => Promise<void>;
  /** Optional self-learning telemetry: fired on EVERY terminal verdict (promote /
   *  withhold / rollback / no-drift / insufficient / stage-failed), so the PSN
   *  autonomy loop learns the cycle's full self-behavior distribution -- not just
   *  the applied promotions feedPSIDelta reports. Pure observation: it NEVER alters
   *  a gate or verdict, and a thrown feedOutcome is swallowed (telemetry must never
   *  break the cycle -- R12 fail-soft). U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY. */
  feedOutcome?: (signal: CycleOutcomeSignal) => Promise<void>;
}

/** Compact self-learning signal emitted once per cycle to deps.feedOutcome.
 *  Complements feedPSIDelta (PROMOTED-only) by reporting EVERY verdict so the PSN
 *  can learn how often the loop withholds / rolls back / sees no drift -- those
 *  are learning signals too (a high withhold rate = a data-provenance problem; a
 *  high rollback rate = drift the calibration cannot fix). */
export interface CycleOutcomeSignal {
  cycle_id: string;
  verdict: CycleResult["verdict"];
  drift_detected: boolean;
  /** mape improvement (before - after); null when no after-accuracy was computed
   *  (INSUFFICIENT_DATA / NO_DRIFT_NO_OP / a STAGE_FAILED before validation). For
   *  WITHHELD_SYNTHETIC + ROLLED_BACK this is the improvement that was NOT applied. */
  mape_delta: number | null;
  /** True ONLY for PROMOTED -- the factors actually reached the live quote-time path. */
  applied: boolean;
  /** Provenance verdict when the batch was classified (real/synthetic/empty), else null. */
  provenance: OutcomeProvenance["verdict"] | null;
}

export interface CycleOptions {
  /** ISO timestamp — only ingest outcomes recorded after this. */
  sinceIso?: string;
  /** Minimum outcome count before a cycle does anything. Default 20. */
  minSampleSize?: number;
  /** Holdout fraction (0..1) for validation. Default 0.2. */
  holdoutFraction?: number;
  /** Drift trigger: retrain when MAPE > this. Default 18 (%). */
  driftMapeThresholdPct?: number;
  /** Drift trigger: retrain when |bias_pct| > this. Default 8. */
  driftBiasThresholdPct?: number;
  /** Promotion gate: new MAPE must beat current by at least this (%). Default 1 (must improve). */
  promotionMinImprovementPct?: number;
  /** Promotion gate: max acceptable regression (%). Default 0.5 — block if new is worse by more than this. */
  promotionRegressionTolerancePct?: number;
  /** When set, write the cycle record to disk after each run. */
  cycleLogPath?: string;
  /** Escape hatch -- when true, a synthetic/placeholder outcome batch MAY
   *  promote factors to the live path (controlled experiments only; logged in
   *  warnings). Default false (fail-closed: production quoting must never train
   *  on synthetic distributions -- charlie soul refuse). */
  allowSyntheticPromotion?: boolean;
}

const DEFAULT_OPTIONS: Required<Omit<CycleOptions, "sinceIso" | "cycleLogPath">> = {
  minSampleSize: 20,
  holdoutFraction: 0.2,
  driftMapeThresholdPct: 18,
  driftBiasThresholdPct: 8,
  promotionMinImprovementPct: 1,
  promotionRegressionTolerancePct: 0.5,
  allowSyntheticPromotion: false,
};

// ─── Stage helpers ──────────────────────────────────────────────────────────
// Each helper is a pure async function — returns StageResult so the cycle
// continues recording on failure. No throws.

async function stage<T>(
  stage_name: CycleStage,
  fn: () => Promise<T>,
): Promise<StageResult<T>> {
  const t0 = Date.now();
  try {
    const data = await fn();
    return { stage: stage_name, ok: true, data, duration_ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { stage: stage_name, ok: false, reason: msg, duration_ms: Date.now() - t0 };
  }
}

/**
 * Stratified train/holdout split — deterministic given the records'
 * insertion order. We keep insertion order for testability; production
 * may want time-stratified splits but that's a follow-up unit.
 */
export function splitTrainHoldout<T>(records: T[], holdoutFraction: number): { train: T[]; holdout: T[] } {
  const n = records.length;
  if (n === 0) return { train: [], holdout: [] };
  const cleanFrac = Math.max(0, Math.min(0.5, holdoutFraction));
  const holdoutCount = Math.max(1, Math.floor(n * cleanFrac));
  // Holdout is the LAST N records — most recent outcomes are the best
  // generalization signal for the next prediction window.
  return {
    train: records.slice(0, n - holdoutCount),
    holdout: records.slice(n - holdoutCount),
  };
}

/**
 * Drift detection — flags retrain when either the MAPE or the absolute
 * bias exceeds the threshold. Simple two-signal gate; the next-iter unit
 * (U-QP-CLOSED-LOOP-DRIFT-V2) can add CUSUM / Page-Hinkley / KS-test for
 * distributional drift on residuals.
 */
export function detectDrift(
  report: AccuracyReport,
  thresholds: { mape: number; bias: number },
): { drift: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (report.mape_pct > thresholds.mape) {
    reasons.push(`mape ${report.mape_pct.toFixed(2)}% > threshold ${thresholds.mape}%`);
  }
  if (Math.abs(report.bias_pct) > thresholds.bias) {
    reasons.push(`|bias| ${Math.abs(report.bias_pct).toFixed(2)}% > threshold ${thresholds.bias}%`);
  }
  return { drift: reasons.length > 0, reasons };
}

/**
 * Promotion gate — compare new vs current accuracy on the holdout.
 * Two-condition gate: (1) new MAPE must be better than current by at
 * least `minImprovementPct` AND (2) new MAPE must not regress by more
 * than `regressionTolerancePct`. This protects against drift in the
 * other direction (over-fitting the train set into a holdout regression).
 *
 * Special case: when `current` is missing (cold-start), promote on any
 * sane report (drift was already detected upstream).
 */
export function shouldPromote(
  newReport: AccuracyReport,
  currentReport: AccuracyReport | undefined,
  thresholds: { minImprovementPct: number; regressionTolerancePct: number },
): { promote: boolean; reason: string } {
  if (!currentReport) {
    return { promote: true, reason: "cold-start: no current report to compare against" };
  }
  const delta = currentReport.mape_pct - newReport.mape_pct; // positive == new is better
  if (delta >= thresholds.minImprovementPct) {
    return { promote: true, reason: `new MAPE ${newReport.mape_pct.toFixed(2)} beats current ${currentReport.mape_pct.toFixed(2)} by ${delta.toFixed(2)}%` };
  }
  if (delta < -thresholds.regressionTolerancePct) {
    return { promote: false, reason: `new MAPE ${newReport.mape_pct.toFixed(2)} regresses from current ${currentReport.mape_pct.toFixed(2)} by ${(-delta).toFixed(2)}%` };
  }
  return { promote: false, reason: `new MAPE ${newReport.mape_pct.toFixed(2)} did not improve current ${currentReport.mape_pct.toFixed(2)} enough (Δ=${delta.toFixed(2)}%)` };
}

/** Placeholder/bootstrap markers seen in curated quoting fixtures (e.g.
 *  docustrata-invoices.curated.json: source "manual-curation-bootstrap",
 *  part_id "INTERNAL-FIX-01") plus generic test/synthetic ids. Case-insensitive
 *  substring match -- a real customer/part id must not contain these tokens. */
const PLACEHOLDER_MARKERS: readonly string[] = [
  "manual-curation-bootstrap",
  "internal-fix",
  "placeholder",
  "synthetic",
  "bootstrap-sample",
  "dummy",
];

/**
 * Classify whether an observed outcome batch is provably REAL or is
 * synthetic/placeholder data that must never train factors reaching the live
 * quote-time active-factor file (charlie soul refuse:
 * training-on-stale-bootstrap-distribution-without-freshness-preflight).
 *
 * A batch is `real` ONLY when it AFFIRMATIVELY proves realness:
 *   (1) at least `minRealOutcomes` records carry a finite, positive
 *       actual_invoice_usd (a realized actual -- not the null-until-landed
 *       default), AND
 *   (2) predicted_quote_usd is non-degenerate -- more than one distinct value
 *       across the batch (the synthetic runner stamps a single constant anchor,
 *       e.g. 100, across every record), AND
 *   (3) no record carries a placeholder/bootstrap marker.
 * Otherwise `synthetic` (has actuals but degenerate/placeholder) or `empty`
 * (no usable realized actuals at all). FAIL-CLOSED on the live path:
 * withholding a write is reversible; promoting synthetic factors poisons real
 * customer quotes and is not. Pure + side-effect-free; never throws.
 *
 * NOTE: a constant predicted->actual MARKUP ratio (synthetic-revenue corpus,
 * match_pct=0) is NOT yet detected here -- it is covered upstream by
 * scripts/lib/quoting-baseline-guard.mjs (synthetic_revenue_dominant) and is a
 * documented follow-up for the OODA path if that corpus is ever wired to it.
 */
export function classifyOutcomeProvenance(
  outcomes: QuoteOutcomeRecord[],
  options: { minRealOutcomes?: number } = {},
): OutcomeProvenance {
  const list = Array.isArray(outcomes) ? outcomes : [];
  const minRealOutcomes = Math.max(1, options.minRealOutcomes ?? 1);
  const signals: string[] = [];

  const realActuals = list.filter(
    (o) =>
      o != null &&
      typeof o.actual_invoice_usd === "number" &&
      Number.isFinite(o.actual_invoice_usd) &&
      (o.actual_invoice_usd as number) > 0,
  );
  const real_outcome_count = realActuals.length;

  if (real_outcome_count === 0) {
    signals.push(
      `no realized actuals -- 0/${list.length} records carry a finite positive actual_invoice_usd`,
    );
    return { verdict: "empty", mayPromote: false, real_outcome_count: 0, signals };
  }

  const markerHit = list.find((o) => {
    const hay = `${o?.quote_id ?? ""}|${o?.customer ?? ""}|${o?.part_id ?? ""}`.toLowerCase();
    return PLACEHOLDER_MARKERS.some((m) => hay.includes(m));
  });
  if (markerHit) {
    const hay = `${markerHit.quote_id ?? ""}|${markerHit.customer ?? ""}|${markerHit.part_id ?? ""}`;
    signals.push(`placeholder marker present (e.g. "${hay}")`);
    return { verdict: "synthetic", mayPromote: false, real_outcome_count, signals };
  }

  const distinctPredicted = new Set(
    list
      .map((o) => o?.predicted_quote_usd)
      .filter((v) => typeof v === "number" && Number.isFinite(v)),
  );
  if (list.length > 1 && distinctPredicted.size <= 1) {
    signals.push(
      `degenerate predicted_quote_usd -- ${distinctPredicted.size} distinct value across ${list.length} records (synthetic constant-anchor signature)`,
    );
    return { verdict: "synthetic", mayPromote: false, real_outcome_count, signals };
  }

  if (real_outcome_count < minRealOutcomes) {
    signals.push(
      `only ${real_outcome_count} realized actual(s) -- need ${minRealOutcomes} to prove realness`,
    );
    return { verdict: "synthetic", mayPromote: false, real_outcome_count, signals };
  }

  signals.push(
    `${real_outcome_count}/${list.length} records carry realized actuals; ${distinctPredicted.size} distinct predicted_quote_usd; no placeholder markers`,
  );
  return { verdict: "real", mayPromote: true, real_outcome_count, signals };
}

/** Structural subset of OutboundPriceIndexEngine.PriceMatchResult that the outbound
 *  alignment gate reads. Duck-typed so this gate stays decoupled from the index engine
 *  and is unit-testable with plain literals. */
export interface OutboundMatchLike {
  ok?: boolean;
  verdict?: "aligned" | "predicted-high" | "predicted-low" | "insufficient-data" | string;
  medianRatio?: number | null;
  alignTolerance?: number;
  referenceReliable?: boolean;
  reliabilityVerdict?: "ok" | "insufficient-reference" | "degenerate-reference" | string;
}

export interface OutboundAlignmentGate {
  /** aligned = predicted price distribution matches JM's real sold prices (or runs LOW -- leaving
   *  bid on the table is not a margin hazard); withheld-outbound-drift = a RELIABLE reference shows
   *  predicted-HIGH drift beyond tolerance (promoting would push quotes above realized reality);
   *  unverified = reference not statistically usable -- directional only. */
  verdict: "aligned" | "withheld-outbound-drift" | "unverified";
  /** true ONLY for withheld-outbound-drift. unverified (unreliable reference) and aligned both =>
   *  false: a directional-only reference must NEVER veto a MAPE-validated real-data improvement, and
   *  an aligned/low prediction is fine. Fail-closed lives ONLY on the reliable-drift path. */
  block: boolean;
  signals: string[];
}

/**
 * Outbound-price alignment gate -- a SECONDARY, conservative promote check answering
 * "does the cycle's predicted PRICE distribution align with JM's REAL sold-price
 * distribution?" from OutboundPriceIndexEngine.compareToPredicted output (PRICE-grain;
 * the per-part-job FMV grain compares against `against:"line"` ext_price).
 *
 * Decision:
 *   - reference NOT usable (match missing / ok:false / referenceReliable:false) -> `unverified`,
 *     block:false. Directional-only: a thin/degenerate reference neither GRANTS nor VETOES
 *     promotion (the underlying shouldPromote + provenance already validated the real data).
 *   - RELIABLE reference + verdict `predicted-high` + medianRatio > 1 + tolerance ->
 *     `withheld-outbound-drift`, block:true (promoting would push quotes above JM's realized
 *     sold prices). Fail-closed: withholding a write is reversible.
 *   - otherwise (`aligned` / `predicted-low`) -> `aligned`, block:false.
 *
 * Tolerance is taken from the engine-echoed `match.alignTolerance` (or an explicit
 * `driftTolerance` override) -- NEVER re-inlined here (no margin/price constant in this engine).
 * Pure + side-effect-free; never throws.
 *
 * NOTE (2026-06-09, RESOLVED 2026-06-11 by U-QP-OUTBOUND-FLOOR-SPIKE-GUARD): JM's real
 * `against:"line"` ext_price reference carries an OCR-`$1` FLOOR-spike (median ~1.005 with a ~51%
 * mass at the $1 minimum across the high+medium gate) while its IQR stays wide. The original
 * IQR-collapse reliability check missed this and read `referenceReliable:true` on noise, so
 * real-magnitude predictions read a FALSE `predicted-high`. OutboundPriceIndexEngine
 * .assessReferenceReliability now adds a floor-spike guard (dominant min-mass + median-pinned-to-
 * floor) that correctly marks such a reference `degenerate-reference`, so this gate returns
 * `unverified` (block:false, directional-only) and the OCR-noise reference no longer FALSE-vetoes a
 * real provenance-validated improvement. POSITIVE outbound guarding (a real veto from a CLEAN
 * reference) still awaits deeper OCR extraction that strips the $1 floor mass; until then the gate
 * is honest-but-directional on the real corpus.
 */
export function gateOutboundAlignment(
  match: OutboundMatchLike | null | undefined,
  options: { driftTolerance?: number } = {},
): OutboundAlignmentGate {
  const signals: string[] = [];
  const tol =
    typeof options.driftTolerance === "number" && options.driftTolerance > 0
      ? options.driftTolerance
      : typeof match?.alignTolerance === "number" && match.alignTolerance > 0
        ? match.alignTolerance
        : null;

  if (!match || match.ok === false || match.referenceReliable !== true) {
    signals.push(
      `outbound reference not reliable (reliabilityVerdict=${match?.reliabilityVerdict ?? "n/a"}, ok=${match?.ok ?? "n/a"}) -- alignment is directional-only; does not grant or veto promotion`,
    );
    return { verdict: "unverified", block: false, signals };
  }

  const ratio =
    typeof match.medianRatio === "number" && Number.isFinite(match.medianRatio) ? match.medianRatio : null;

  // Block only on HIGH drift (ratio > 1 + tol). Low drift (ratio < 1) never blocks -- under-pricing
  // is bid left on the table, not a margin hazard. Gate on the ratio directly: the engine's own
  // `verdict` is just medianRatio-vs-alignTolerance, so the ratio is the real signal and a tighter
  // `driftTolerance` override stays meaningful.
  if (tol !== null && ratio !== null && ratio > 1 + tol) {
    signals.push(
      `predicted price distribution runs HIGH vs JM real sold prices (medianRatio ${ratio.toFixed(3)} > 1 + ${tol}, engine verdict ${match.verdict ?? "n/a"}); promoting would push quotes further above realized reality`,
    );
    return { verdict: "withheld-outbound-drift", block: true, signals };
  }

  signals.push(
    `outbound alignment ${match.verdict ?? "n/a"} (medianRatio ${ratio === null ? "n/a" : ratio.toFixed(3)}, tol ${tol ?? "n/a"}); reference reliable`,
  );
  return { verdict: "aligned", block: false, signals };
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class QuotingClosedLoopEngine {
  /**
   * Run ONE complete closed-loop cycle.
   *
   * Verdict is set on the FIRST condition met:
   *   1. INSUFFICIENT_DATA  → outcome batch < minSampleSize
   *   2. NO_DRIFT_NO_OP     → drift gate did not fire
   *   3. ROLLED_BACK        → retrained but validation failed
   *   4. PROMOTED           → retrained, validated, factors written
   *   5. STAGE_FAILED       → any required stage threw
   */
  static async runCycle(
    deps: ClosedLoopDeps,
    options: CycleOptions = {},
  ): Promise<CycleResult> {
    const result = await QuotingClosedLoopEngine.computeCycle(deps, options);
    // Self-learning telemetry on EVERY verdict (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY).
    // Strictly post-compute + fail-soft: it observes the finished result and can
    // NEVER alter the verdict or break the cycle (R12). feedPSIDelta stays the
    // PROMOTED-only applied-improvement channel; feedOutcome is the full-distribution
    // channel the PSN learns the loop's own behavior from.
    if (deps.feedOutcome) {
      try {
        await deps.feedOutcome(toOutcomeSignal(result));
      } catch (e) {
        log.warn("QuotingClosedLoop feedOutcome telemetry failed (non-fatal)", {
          cycle_id: result.cycle_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return result;
  }

  /** The cycle pipeline itself -- verdict logic only. Wrapped by runCycle, which
   *  adds the fail-soft feedOutcome telemetry. Kept private so the public surface
   *  is runCycle (telemetry-complete); split out so the verdict logic stays a pure
   *  single-responsibility pipeline. */
  private static async computeCycle(
    deps: ClosedLoopDeps,
    options: CycleOptions = {},
  ): Promise<CycleResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cycle_id = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const started_at = new Date().toISOString();
    const stages: StageResult[] = [];
    const warnings: string[] = [];

    // 1. Observe — pull recent outcomes.
    const observed = await stage<QuoteOutcomeRecord[]>("observed", () => deps.fetchOutcomes(opts.sinceIso));
    stages.push(observed);
    const outcomes = observed.ok && Array.isArray(observed.data) ? observed.data : [];

    if (!observed.ok) {
      return finalize({ cycle_id, started_at, verdict: "STAGE_FAILED", stages, drift_detected: false, warnings });
    }
    if (outcomes.length < opts.minSampleSize) {
      warnings.push(`only ${outcomes.length} outcomes since ${opts.sinceIso ?? "epoch"} — need ${opts.minSampleSize}`);
      return finalize({ cycle_id, started_at, verdict: "INSUFFICIENT_DATA", stages, drift_detected: false, warnings });
    }

    // 1b. Classify provenance -- a synthetic/placeholder/empty outcome batch
    //     must NEVER train factors that reach the live quote-time active-factor
    //     file (charlie soul refuse: training-on-stale-bootstrap-distribution).
    const provenance = classifyOutcomeProvenance(outcomes);
    if (provenance.verdict === "empty") {
      warnings.push(`no real actuals -- ${provenance.signals.join("; ")}`);
      return finalize({ cycle_id, started_at, verdict: "INSUFFICIENT_DATA", stages, provenance, drift_detected: false, warnings });
    }

    // 2. Measure — accuracy on the full batch.
    const measured = await stage<AccuracyReport>("measured", () => deps.runAccuracy(outcomes));
    stages.push(measured);
    if (!measured.ok || !measured.data) {
      return finalize({ cycle_id, started_at, verdict: "STAGE_FAILED", stages, drift_detected: false, warnings });
    }
    const accuracy_before = measured.data;

    // 3. Detect drift — decide whether to retrain.
    const drift = detectDrift(accuracy_before, {
      mape: opts.driftMapeThresholdPct,
      bias: opts.driftBiasThresholdPct,
    });
    stages.push({ stage: "drift_evaluated", ok: true, data: drift });

    if (!drift.drift) {
      return finalize({
        cycle_id, started_at, verdict: "NO_DRIFT_NO_OP", stages,
        accuracy_before, drift_detected: false, warnings,
      });
    }

    // 4. Retrain — derive new factors via CoV-gated calibration.
    const retrained = await stage<{ factors: CalibrationFactors; verdict: CoVVerdict }>(
      "retrained",
      () => deps.deriveWithCoV(accuracy_before),
    );
    stages.push(retrained);
    if (!retrained.ok || !retrained.data) {
      return finalize({ cycle_id, started_at, verdict: "STAGE_FAILED", stages, accuracy_before, drift_detected: true, warnings });
    }
    if (!retrained.data.verdict.safe_to_activate) {
      warnings.push(`CoV verdict UNSAFE — ${retrained.data.verdict.rejected_reasons?.join("; ") ?? "no reason given"}`);
      return finalize({
        cycle_id, started_at, verdict: "ROLLED_BACK", stages,
        accuracy_before, drift_detected: true, warnings,
      });
    }

    // 5. Validate — apply factors to a held-out subset.
    const { holdout } = splitTrainHoldout(outcomes, opts.holdoutFraction);
    const validated = await stage<AccuracyReport>(
      "validated",
      () => deps.validateOnHoldout(retrained.data!.factors, holdout),
    );
    stages.push(validated);
    if (!validated.ok || !validated.data) {
      return finalize({ cycle_id, started_at, verdict: "STAGE_FAILED", stages, accuracy_before, drift_detected: true, warnings });
    }
    const accuracy_after = validated.data;

    // 6. Promote OR rollback.
    const gate = shouldPromote(accuracy_after, accuracy_before, {
      minImprovementPct: opts.promotionMinImprovementPct,
      regressionTolerancePct: opts.promotionRegressionTolerancePct,
    });

    // 6a. Provenance gate -- even a statistically-improved factor set must NOT
    //     reach the live quote-time active-factor file when the outcomes were
    //     not provably real. Fail-closed: withholding a write is reversible;
    //     promoting synthetic-trained factors poisons real customer quotes.
    if (gate.promote && !provenance.mayPromote && !opts.allowSyntheticPromotion) {
      warnings.push(
        `promotion WITHHELD -- outcomes classified ${provenance.verdict} (${provenance.signals.join("; ")}); synthetic/placeholder-trained factors must not reach the live quote-time path`,
      );
      stages.push({ stage: "promoted", ok: false, reason: `withheld-${provenance.verdict}` });
      return finalize({
        cycle_id, started_at, verdict: "WITHHELD_SYNTHETIC", stages,
        accuracy_before, accuracy_after, drift_detected: true,
        provenance, factors_withheld: retrained.data!.factors, warnings,
      });
    }
    if (gate.promote && !provenance.mayPromote && opts.allowSyntheticPromotion) {
      warnings.push(
        `SYNTHETIC PROMOTION OVERRIDE (allowSyntheticPromotion=true) -- ${provenance.verdict} factors written to the live path; NOT for production quoting`,
      );
    }

    if (!gate.promote) {
      warnings.push(`promotion blocked — ${gate.reason}`);
      stages.push({ stage: "rolled_back", ok: true, reason: gate.reason });
      return finalize({
        cycle_id, started_at, verdict: "ROLLED_BACK", stages,
        accuracy_before, accuracy_after, drift_detected: true, warnings,
      });
    }

    const promoted = await stage<string>("promoted", () => deps.writeActiveFactors(retrained.data!.factors));
    stages.push(promoted);
    if (!promoted.ok) {
      warnings.push(`active-factor write failed — ${promoted.reason}`);
      return finalize({
        cycle_id, started_at, verdict: "ROLLED_BACK", stages,
        accuracy_before, accuracy_after, drift_detected: true, warnings,
      });
    }

    // 7. Telemeter — feed psi_delta back to PSN if a feeder was provided.
    if (deps.feedPSIDelta) {
      const psiDelta = accuracy_before.mape_pct - accuracy_after.mape_pct;
      const telemetered = await stage<void>("telemetered", () => deps.feedPSIDelta!(psiDelta));
      stages.push(telemetered);
    }

    const result = finalize({
      cycle_id, started_at, verdict: "PROMOTED", stages,
      accuracy_before, accuracy_after, drift_detected: true,
      factors_promoted: retrained.data.factors,
      provenance,
      warnings,
    });

    if (opts.cycleLogPath) {
      await QuotingClosedLoopEngine.appendCycleLog(opts.cycleLogPath, result);
    }
    return result;
  }

  /**
   * Append a cycle record to the JSONL audit log. Atomic write of the
   * single line; the log is intentionally line-delimited so concurrent
   * cycles never corrupt each other (file-write ops are single-syscall
   * for a single short line on POSIX + Windows NTFS append-mode).
   */
  static async appendCycleLog(path: string, result: CycleResult): Promise<void> {
    try {
      await fs.mkdir(dirname(path), { recursive: true });
      await fs.appendFile(path, JSON.stringify(result) + "\n", "utf8");
    } catch (e) {
      log.warn("QuotingClosedLoop cycle-log append failed", { path, error: e instanceof Error ? e.message : String(e) });
    }
  }

  /** Expose constants so tests + callers can introspect the gate thresholds. */
  static readonly DEFAULTS = Object.freeze(DEFAULT_OPTIONS);
}

function finalize(partial: Omit<CycleResult, "finished_at">): CycleResult {
  return { ...partial, finished_at: new Date().toISOString() };
}

/** Project a finished CycleResult into the compact self-learning signal fed to
 *  deps.feedOutcome. Pure + total (every verdict maps); mape_delta is null unless
 *  BOTH before+after accuracy were computed. U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY. */
export function toOutcomeSignal(result: CycleResult): CycleOutcomeSignal {
  const mape_delta =
    result.accuracy_before && result.accuracy_after
      ? result.accuracy_before.mape_pct - result.accuracy_after.mape_pct
      : null;
  return {
    cycle_id: result.cycle_id,
    verdict: result.verdict,
    drift_detected: result.drift_detected,
    mape_delta,
    applied: result.verdict === "PROMOTED",
    provenance: result.provenance?.verdict ?? null,
  };
}

export const quotingClosedLoopEngine = QuotingClosedLoopEngine;
export default quotingClosedLoopEngine;
