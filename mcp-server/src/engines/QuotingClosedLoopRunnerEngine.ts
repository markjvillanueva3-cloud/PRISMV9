/**
 * QuotingClosedLoopRunnerEngine — concrete-dep wiring for the iter46
 * QuotingClosedLoopEngine controller.
 *
 * QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-RUNNER (slot:charlie iter47 2026-05-26).
 *
 * iter46 shipped the closed-loop controller with DI-mocked deps; this engine
 * is the GLUE that lets the cycle run against the real substrate. Wires
 * iter46's ClosedLoopDeps interface to:
 *
 *   - QuotingTrainingLoopEngine.run() → AccuracyReport (the measure step)
 *   - QuotingCalibrationEngine.deriveWithCoV() → factors + CoV (the retrain step)
 *   - QuoteOutcomeFeedEngine.feed() → PSI delta to PSN leg #10 (telemetry)
 *   - Atomic JSON write to quoting-calibration-active.json (the actuator)
 *
 * Contract-adapt layer absorbs three shape mismatches:
 *
 *   1. AccuracyReport — substrate emits `{ok, metrics:{mape_pct,
 *      mean_signed_pct_error, ...}, per_customer_bias, ...}`; iter46 expects
 *      `{sample_size, mape_pct, bias_pct, hit_rate_15pct, hit_rate_10pct}`.
 *      adaptAccuracyReport() projects substrate→cycle. Hit-rates default to
 *      0 (substrate does not return per-record predictions in aggregate
 *      mode; iter46's drift gate only consumes mape_pct + bias_pct, so 0 is
 *      honest, not a stub).
 *
 *   2. CoV verdict — substrate's deriveWithCoV returns `{factors, cov,
 *      safe_to_activate}` (top-level bool); iter46 expects `{factors,
 *      verdict:{safe_to_activate, confidence, reasoning, rejected_reasons}}`.
 *      Adapter wraps the bool + CoV summary into the verdict object.
 *
 *   3. CalibrationFactors — substrate's body has `{ok, global:{factor,...},
 *      per_customer:[...]}` shape; iter46 treats factors as opaque
 *      pass-through. Adapter forwards the substrate body unmodified.
 *
 * NO side effects at import time. Single export: `buildLiveDeps(opts)`
 * returns a fully-populated ClosedLoopDeps object. CLI consumers wrap this
 * in `QuotingClosedLoopEngine.runCycle(deps, options)`.
 */

import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  quotingTrainingLoopEngine,
  type QuoteBaselineRecord,
  type AccuracyReport as SubstrateAccuracyReport,
} from "./QuotingTrainingLoopEngine.js";
import {
  quotingCalibrationEngine,
  type CalibrationFactors as SubstrateFactors,
} from "./QuotingCalibrationEngine.js";
import { QuoteOutcomeFeedEngine } from "./QuoteOutcomeFeedEngine.js";
import type {
  ClosedLoopDeps,
  QuoteOutcomeRecord as CycleOutcome,
  AccuracyReport as CycleAccuracyReport,
  CalibrationFactors as CycleFactors,
  CoVVerdict,
  CycleOutcomeSignal,
} from "./QuotingClosedLoopEngine.js";

// ─── Named constants (no magic numbers in expressions below) ────────────────

/** Default path written by writeActiveFactors. Matches the path
 *  QuotingActiveFactorLoaderEngine reads on every quote-time call. */
export const DEFAULT_ACTIVE_FACTOR_PATH = resolve(
  process.cwd(),
  "state/shared/calibration/quoting-calibration-active.json",
);

/** Default JSONL ledger for the full per-cycle outcome distribution
 *  (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY). One line per cycle, EVERY verdict --
 *  the PSN autonomy loop + drift-alert read this to learn how often the loop
 *  promotes / withholds / rolls back / sees no drift. Append-only; the cycle
 *  never reads it back, so concurrent single-line appends never corrupt. */
export const DEFAULT_OUTCOME_LEDGER_PATH = resolve(
  process.cwd(),
  "state/shared/quoting/quoting-cycle-outcomes.jsonl",
);

/** Substrate training-loop defaults — only used to stamp synthetic baseline
 *  records when the cycle outcome shape lacks operational fields. */
const SUBSTRATE_DEFAULT_TIME_IN_CUT_S = 600;
const SUBSTRATE_DEFAULT_MATERIAL_SPEND_USD = 75;
const SUBSTRATE_DEFAULT_MACHINE_RATE_USD_PER_HR = 95;

/** Confidence ramp for the verdict — at SAMPLE_SIZE_CONFIDENCE_CEILING+
 *  records the confidence is capped at 1.0. Below that, linear ramp from 0. */
const SAMPLE_SIZE_CONFIDENCE_CEILING = 30;

/** Reference figure used to derive the PSI delta synthetic outcome — quoted
 *  cost is held at this value so the substrate's clamp computes the delta
 *  symmetrically around the same anchor. */
const PSI_DELTA_SYNTHETIC_QUOTED_USD = 100;

/** Hit-rate bands (informational only — iter46 drift gate ignores these,
 *  the cycle's promotion gate compares mape_pct head-to-head). */
const HIT_RATE_DEFAULT_INFORMATIONAL_ONLY = 0;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BuildLiveDepsOptions {
  /** How the cycle pulls fresh outcome records each iteration. */
  loadOutcomes: (sinceIso?: string) => Promise<CycleOutcome[]>;
  /** Override the active-factor write path (tests use tmpdir; production
   *  defaults to DEFAULT_ACTIVE_FACTOR_PATH). */
  activeFactorPath?: string;
  /** Forward measurement-pass psi_delta signals to PSNAutonomyLoopEngine.
   *  Default false — we only want the production cycle to feed PSN, not
   *  the validation pass (otherwise validation pollutes the signal). */
  feedPsnAutonomy?: boolean;
  /** Outcome-feed bridge override (DI for tests). */
  outcomeFeed?: QuoteOutcomeFeedEngine;
  /** Override the per-cycle outcome-ledger path (tests use tmpdir; production
   *  defaults to DEFAULT_OUTCOME_LEDGER_PATH). The full-distribution telemetry
   *  channel that complements the PROMOTED-only outcomeFeed/psi_delta. */
  outcomeLedgerPath?: string;
  /** Override the machine rate ($/hr) stamped onto every baseline record.
   *  Defaults to the substrate's $95/hr placeholder. Set this to the
   *  triangulated $120/hr (iter51 finding) or whatever the operator
   *  confirms. The substrate's MAPE/bias math consumes this when projecting
   *  predicted_cost from cycle time × rate + material. */
  defaultMachineRate?: number;
  /** Override the per-record material spend ($) stamped onto baseline records.
   *  Defaults to substrate $75. iter51 evidence suggests JM Die per-job
   *  material is $80-200; mid-band $130 is a defensible override. */
  defaultMaterialSpend?: number;
  /** Per-outcome override function. When provided, the runner calls this
   *  for EACH outcome and prefers its return values over the flat defaults
   *  above. Returning {} for an outcome falls back to the flat defaults.
   *  This is how DocuStrataMaterialPriorEngine wires in — driver maps each
   *  outcome's material grade to a per-job spend bracket. */
  perRecordOverrides?: (outcome: CycleOutcome) => { machineRate?: number; materialSpend?: number; timeInCutS?: number };
}

// ─── Pure helpers ──────────────────────────────────────────────────────────

/**
 * Project a cycle-shaped outcome into the substrate's baseline record shape.
 * The cycle uses `predicted_quote_usd` + `actual_invoice_usd`; the substrate
 * wants `actual_revenue_usd` + operational fields (time_in_cut, etc.). When
 * the operational fields are missing the substrate defaults take over —
 * iter46's MAPE calc only consumes the revenue side, so the stamped values
 * affect the SUBSTRATE's projection of cost (fmv) not the labels.
 */
export function toBaselineRecord(
  o: CycleOutcome,
  overrides?: { machineRate?: number; materialSpend?: number; timeInCutS?: number },
): QuoteBaselineRecord {
  return {
    customer: o.customer ?? "unknown",
    part_id: o.part_id ?? o.quote_id,
    doc_date: o.doc_date ?? null,
    actual_revenue_usd: o.actual_invoice_usd ?? o.predicted_quote_usd,
    estimated_time_in_cut_s: overrides?.timeInCutS ?? SUBSTRATE_DEFAULT_TIME_IN_CUT_S,
    estimated_material_spend_usd: overrides?.materialSpend ?? SUBSTRATE_DEFAULT_MATERIAL_SPEND_USD,
    machine_rate_usd_per_hr: overrides?.machineRate ?? SUBSTRATE_DEFAULT_MACHINE_RATE_USD_PER_HR,
  };
}

/**
 * Adapt the substrate AccuracyReport into the cycle's contract. Hit-rates
 * default to HIT_RATE_DEFAULT_INFORMATIONAL_ONLY (0) since the substrate's
 * aggregate report does not expose per-record predictions; iter46's drift
 * gate consumes mape_pct + bias_pct only, so 0 is honest informational
 * baseline rather than a fabricated number.
 */
export function adaptAccuracyReport(
  report: SubstrateAccuracyReport,
  sample_size: number,
): CycleAccuracyReport {
  return {
    sample_size,
    mape_pct: report.metrics.mape_pct,
    bias_pct: report.metrics.mean_signed_pct_error,
    hit_rate_15pct: HIT_RATE_DEFAULT_INFORMATIONAL_ONLY,
    hit_rate_10pct: HIT_RATE_DEFAULT_INFORMATIONAL_ONLY,
  };
}

/**
 * Apply substrate CalibrationFactors to a list of cycle outcomes — multiplies
 * each `predicted_quote_usd` by the per-customer factor (or global factor as
 * fallback). Pure — never mutates inputs. Used by validateOnHoldout to
 * project the candidate factors onto the holdout set BEFORE re-measuring.
 */
export function applyFactorsToOutcomes(
  outcomes: CycleOutcome[],
  factors: SubstrateFactors,
): CycleOutcome[] {
  if (!factors.ok) return outcomes;
  const perCustomer = new Map<string, number>();
  for (const c of factors.per_customer) perCustomer.set(c.customer, c.factor);
  const globalFactor = factors.global.factor;
  return outcomes.map((o) => {
    const customerFactor = o.customer ? perCustomer.get(o.customer) : undefined;
    const f: number = customerFactor ?? globalFactor;
    return { ...o, predicted_quote_usd: o.predicted_quote_usd * f };
  });
}

/**
 * Atomic temp+rename JSON write. Verifies the serialized payload round-trips
 * to a non-null object BEFORE the rename commits — protects against a
 * serializer bug overwriting the active-factor file with garbage.
 */
async function atomicWriteJson(path: string, payload: unknown): Promise<string> {
  const serialized = JSON.stringify(payload, null, 2);
  const roundTrip: unknown = JSON.parse(serialized);
  if (typeof roundTrip !== "object" || roundTrip === null) {
    throw new Error("atomicWriteJson: serialized payload did not round-trip to an object");
  }
  await fs.mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.writeFile(tmp, serialized, "utf8");
  await fs.rename(tmp, path);
  return path;
}

/**
 * Wrap substrate's deriveWithCoV() result into iter46's CoVVerdict shape.
 * `safe_to_activate` carries straight through; `confidence` is a linear
 * ramp on global record_count up to the ceiling; `rejected_reasons` is
 * populated from CoV followups when shouldEscalate fires.
 */
function adaptCoVVerdict(result: {
  factors: SubstrateFactors;
  cov?: { verdict?: string; shouldEscalate?: boolean; followups?: Array<{ question?: string }> };
  safe_to_activate: boolean;
}): CoVVerdict {
  const recordCount = result.factors.ok ? result.factors.global.record_count ?? 0 : 0;
  const confidence = result.factors.ok
    ? Math.min(1, recordCount / SAMPLE_SIZE_CONFIDENCE_CEILING)
    : 0;
  const rejected = result.cov?.shouldEscalate
    ? (result.cov.followups?.map((f) => f.question ?? "cov-followup") ?? ["cov-escalation"])
    : undefined;
  return {
    safe_to_activate: result.safe_to_activate,
    confidence,
    reasoning: result.cov?.verdict,
    rejected_reasons: rejected,
  };
}

// ─── Live-deps builder ──────────────────────────────────────────────────────

/**
 * Build a fully-populated ClosedLoopDeps ready to pass to
 * `QuotingClosedLoopEngine.runCycle()`. The returned object closes over
 * the substrate engines + the supplied `loadOutcomes` source; the cycle
 * controller never sees the substrate directly.
 */
export function buildLiveDeps(opts: BuildLiveDepsOptions): ClosedLoopDeps {
  const activePath = opts.activeFactorPath ?? DEFAULT_ACTIVE_FACTOR_PATH;
  const feedPsnAutonomy = opts.feedPsnAutonomy ?? false;
  const outcomeFeed = opts.outcomeFeed ?? new QuoteOutcomeFeedEngine();
  const outcomeLedgerPath = opts.outcomeLedgerPath ?? DEFAULT_OUTCOME_LEDGER_PATH;
  const flatOverrides = {
    machineRate: opts.defaultMachineRate,
    materialSpend: opts.defaultMaterialSpend,
  };
  const resolveOverrides = (o: CycleOutcome) => {
    const perRecord = opts.perRecordOverrides?.(o) ?? {};
    return {
      machineRate: perRecord.machineRate ?? flatOverrides.machineRate,
      materialSpend: perRecord.materialSpend ?? flatOverrides.materialSpend,
      timeInCutS: perRecord.timeInCutS,
    };
  };

  return {
    fetchOutcomes: async (sinceIso?: string) => opts.loadOutcomes(sinceIso),

    runAccuracy: async (records) => {
      const baselineRecords = records.map((r) => toBaselineRecord(r, resolveOverrides(r)));
      const report = quotingTrainingLoopEngine.run(baselineRecords, { feedPsnAutonomy });
      if (!report.ok) {
        throw new Error(
          `runAccuracy: training loop returned not-ok (${report.reason ?? "unknown"})`,
        );
      }
      return adaptAccuracyReport(report, records.length);
    },

    deriveWithCoV: async (report) => {
      const synthetic: SubstrateAccuracyReport = {
        ok: true,
        total_records: report.sample_size,
        total_predicted: report.sample_size,
        total_skipped: 0,
        metrics: {
          mae_usd: 0,
          rmse_usd: 0,
          mape_pct: report.mape_pct,
          mean_signed_pct_error: report.bias_pct,
        },
        per_customer_bias: [],
        worst_5_records: [],
        best_5_records: [],
        psi_delta_fed_count: 0,
      };
      const result = await quotingCalibrationEngine.deriveWithCoV(synthetic);
      const verdict = adaptCoVVerdict(result);
      // iter46 treats factors as opaque pass-through; the cycle uses them
      // only to forward to validateOnHoldout + writeActiveFactors. Cast is
      // intentional + safe — the runner is the SOLE consumer of the body.
      const factors = result.factors as unknown as CycleFactors;
      return { factors, verdict };
    },

    validateOnHoldout: async (factors, holdout) => {
      const substrateFactors = factors as unknown as SubstrateFactors;
      const adjusted = applyFactorsToOutcomes(holdout, substrateFactors);
      const baselineRecords = adjusted.map((r) => toBaselineRecord(r, resolveOverrides(r)));
      const report = quotingTrainingLoopEngine.run(baselineRecords, { feedPsnAutonomy: false });
      if (!report.ok) {
        throw new Error(
          `validateOnHoldout: training loop returned not-ok (${report.reason ?? "unknown"})`,
        );
      }
      return adaptAccuracyReport(report, holdout.length);
    },

    writeActiveFactors: async (factors) => atomicWriteJson(activePath, factors),

    feedPSIDelta: async (delta) => {
      const synthetic = {
        quote_id: `cycle-psi-${Date.now()}`,
        quoted_cost_usd: PSI_DELTA_SYNTHETIC_QUOTED_USD,
        actual_cost_usd: PSI_DELTA_SYNTHETIC_QUOTED_USD * (1 + delta / 100),
      };
      const result = outcomeFeed.feed(synthetic);
      if (!result.fed) {
        throw new Error(`feedPSIDelta: outcome-feed rejected synthetic (${result.reason})`);
      }
    },

    feedOutcome: async (signal: CycleOutcomeSignal) => {
      // Append the full-distribution self-learning signal to the cycle-outcomes
      // ledger (U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY). One JSONL line per cycle, every
      // verdict -- the PSN autonomy loop + drift-alert read this to learn the loop's
      // own promote/withhold/rollback/no-drift distribution. Append is single-syscall
      // for a short line (corruption-safe under concurrent cycles). The engine wraps
      // this call fail-soft, so a write error degrades telemetry without breaking the
      // cycle; we still ensure the dir exists first so the common path succeeds.
      const line = JSON.stringify({ ...signal, fed_at: new Date().toISOString() }) + "\n";
      await fs.mkdir(dirname(outcomeLedgerPath), { recursive: true });
      await fs.appendFile(outcomeLedgerPath, line, "utf8");
    },
  };
}

export const quotingClosedLoopRunnerEngine = {
  buildLiveDeps,
  applyFactorsToOutcomes,
  toBaselineRecord,
  adaptAccuracyReport,
  DEFAULT_ACTIVE_FACTOR_PATH,
};
export default quotingClosedLoopRunnerEngine;
