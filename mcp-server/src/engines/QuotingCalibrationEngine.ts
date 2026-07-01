/**
 * QuotingCalibrationEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT10
 *
 * Closes the OUTER loop of the self-improving quoting system. Where
 * QuotingTrainingLoopEngine (U-QT01) measures bias, this engine ACTS on it:
 *
 *   AccuracyReport (per-customer bias + global signed bias)
 *      → CalibrationFactors (multiplicative corrections per customer + global)
 *      → applyTo(predicted_usd, customer) → corrected_usd
 *
 * Math: FMV = ((time_h × rate) + material × markup) × (1+overhead) × (1+margin)
 *   All four input scalars enter linearly into FMV. If the corpus reveals
 *   signed bias of +X% (i.e. predicted ≈ actual × (1 + X/100)) then the single
 *   multiplicative output correction factor f = 100/(100+X) restores actual.
 *   Equivalently we could scale machine_rate or setup_time by f — output-side
 *   correction is the safest because it never reaches negative time.
 *
 * Per R5 (model-for-judgment): pure deterministic math, no LLM in the loop.
 * Per R10 (reproducibility): given the same AccuracyReport, derive() returns
 * identical CalibrationFactors. Per R12 (fail-loud): empty/zero-record reports
 * return ok:false with reason — engine never invents factors out of thin air.
 *
 * @milestone JM-DIE-QUOTE-TRAINING-MS0/U-QT10-CALIBRATION
 * @author slot:charlie /goal-18 iter2, 2026-05-25
 */

import type { AccuracyReport, PerCustomerBias } from "./QuotingTrainingLoopEngine.js";
import {
  chainOfVerificationEngine,
  type VerificationClaim,
  type VerificationQuestion,
  type Verifier,
  type VerificationResult,
} from "./ChainOfVerificationEngine.js";

/** A per-customer (or "*") multiplicative correction factor. */
export interface CalibrationFactor {
  customer: string;            // exact customer key OR "*" for global fallback
  record_count: number;
  signed_pct_error_observed: number;
  factor: number;              // multiply FMV by this to restore actuals
  factor_clamped: boolean;     // true if raw factor exceeded clamp bounds
  rationale: string;
}

export interface CalibrationFactors {
  ok: boolean;
  generated_at: string;        // ISO-8601
  source_report_signature: string;
  global: CalibrationFactor;
  per_customer: CalibrationFactor[];
  notes: string[];
  reason?: string;
}

export interface DeriveOptions {
  /** Minimum records per customer to derive a per-customer factor (below → global). */
  minRecordsForCustomer?: number;
  /** Lower clamp on factor — protects against negative/zero from extreme outliers. */
  minFactor?: number;
  /** Upper clamp on factor — protects against runaway from single-record customers. */
  maxFactor?: number;
  /** Treat |signed_pct_error| ≤ this as no-bias (factor=1.0). */
  balancedBandPct?: number;
}

export interface ApplyOptions {
  /** Customer key for per-customer lookup; undefined → global only. */
  customer?: string;
}

export interface CalibrationApplyResult {
  predicted_usd: number;
  corrected_usd: number;
  factor_used: number;
  factor_source: "per-customer" | "global" | "balanced-pass-through";
}

const DEFAULT_MIN_RECORDS = 3;
const DEFAULT_MIN_FACTOR = 0.20;   // never reduce by more than 5×
const DEFAULT_MAX_FACTOR = 5.0;    // never amplify by more than 5×
const DEFAULT_BALANCED_BAND_PCT = 5;

export class QuotingCalibrationEngine {
  /**
   * Derive multiplicative correction factors from an AccuracyReport.
   * Global factor is derived from `metrics.mean_signed_pct_error`.
   * Per-customer factors are derived from `per_customer_bias[]`.
   */
  derive(report: AccuracyReport, opts: DeriveOptions = {}): CalibrationFactors {
    const generated_at = new Date().toISOString();
    const empty: CalibrationFactors = {
      ok: false,
      generated_at,
      source_report_signature: "",
      global: this.unitFactor("*", 0, "report-invalid"),
      per_customer: [],
      notes: [],
    };
    if (!report || !report.ok) return { ...empty, reason: "report-not-ok" };
    if (report.total_predicted <= 0) return { ...empty, reason: "no-predicted-records" };

    const minRecords = opts.minRecordsForCustomer ?? DEFAULT_MIN_RECORDS;
    const minF = opts.minFactor ?? DEFAULT_MIN_FACTOR;
    const maxF = opts.maxFactor ?? DEFAULT_MAX_FACTOR;
    const band = opts.balancedBandPct ?? DEFAULT_BALANCED_BAND_PCT;

    const globalSignedPct = report.metrics.mean_signed_pct_error;
    const global = this.factorFromSignedPct({
      customer: "*",
      record_count: report.total_predicted,
      signedPct: globalSignedPct,
      band,
      minF,
      maxF,
    });

    const per: CalibrationFactor[] = [];
    const notes: string[] = [];
    for (const b of report.per_customer_bias) {
      if (b.record_count < minRecords) {
        notes.push(`skip[${b.customer}]: only ${b.record_count} record(s) < min ${minRecords} → use global`);
        continue;
      }
      per.push(this.factorFromSignedPct({
        customer: b.customer,
        record_count: b.record_count,
        signedPct: b.mean_pct_error,
        band,
        minF,
        maxF,
      }));
    }
    per.sort((a, b) => b.record_count - a.record_count);

    return {
      ok: true,
      generated_at,
      source_report_signature: this.signature(report),
      global,
      per_customer: per,
      notes,
    };
  }

  /**
   * Apply calibration to a predicted FMV. Prefers per-customer factor; falls
   * back to global. If both are within the balanced band → pass-through.
   */
  apply(factors: CalibrationFactors, predicted_usd: number, opts: ApplyOptions = {}): CalibrationApplyResult {
    if (!isFinite(predicted_usd) || predicted_usd <= 0) {
      return { predicted_usd, corrected_usd: predicted_usd, factor_used: 1, factor_source: "balanced-pass-through" };
    }
    if (!factors.ok) {
      return { predicted_usd, corrected_usd: predicted_usd, factor_used: 1, factor_source: "balanced-pass-through" };
    }
    if (opts.customer) {
      const match = factors.per_customer.find(c => c.customer === opts.customer);
      if (match) {
        return {
          predicted_usd,
          corrected_usd: round2(predicted_usd * match.factor),
          factor_used: match.factor,
          factor_source: "per-customer",
        };
      }
    }
    if (Math.abs(factors.global.factor - 1) < 1e-9) {
      return { predicted_usd, corrected_usd: predicted_usd, factor_used: 1, factor_source: "balanced-pass-through" };
    }
    return {
      predicted_usd,
      corrected_usd: round2(predicted_usd * factors.global.factor),
      factor_used: factors.global.factor,
      factor_source: "global",
    };
  }

  /**
   * Apply calibration to all per-record predictions in a fresh report and
   * recompute headline MAPE / signed bias. Used to verify that the derived
   * factors actually reduce the measured error on a held-out (or the same)
   * record set.
   */
  measureImprovement(report: AccuracyReport, factors: CalibrationFactors): {
    pre: { mape_pct: number; mean_signed_pct_error: number };
    post: { mape_pct: number; mean_signed_pct_error: number };
    mape_reduction_pct: number;
    bias_reduction_pct: number;
  } {
    if (!report.ok || report.total_predicted <= 0) {
      return { pre: { mape_pct: 0, mean_signed_pct_error: 0 }, post: { mape_pct: 0, mean_signed_pct_error: 0 }, mape_reduction_pct: 0, bias_reduction_pct: 0 };
    }
    // Reconstruct per-record predictions from worst_5 + best_5 union? No — we don't have all records here.
    // measureImprovement is designed for the case where the caller passes the SAME report and we model
    // the homogeneous correction: each record's pct_error becomes (pct_error_pre - 100*(1 - factor)) / factor.
    // Equivalently: predicted_post = predicted_pre * factor; new pct_error = (predicted_post - actual)/actual * 100
    //             = (predicted_pre * factor - actual)/actual * 100 = (pct_error_pre/100 + 1) * factor * 100 - 100.
    // We approximate by applying the per-customer factor (or global fallback) to the headline metrics — exact
    // when all records of a customer share the same factor (which they do here by construction).
    const pre = {
      mape_pct: report.metrics.mape_pct,
      mean_signed_pct_error: report.metrics.mean_signed_pct_error,
    };

    // For an exact post-calibration aggregate we need the per-record set. The caller passes the same report;
    // we use per_customer_bias as the bucketed projection (record_count weighted means).
    let sumWeightedAbsPct = 0;
    let sumWeightedSignedPct = 0;
    let sumWeights = 0;
    for (const b of report.per_customer_bias) {
      const f = this.lookupFactor(factors, b.customer);
      const postSigned = (b.mean_pct_error / 100 + 1) * f * 100 - 100;
      const postAbs = Math.abs(postSigned);
      sumWeightedAbsPct += postAbs * b.record_count;
      sumWeightedSignedPct += postSigned * b.record_count;
      sumWeights += b.record_count;
    }
    if (sumWeights === 0) {
      return { pre, post: pre, mape_reduction_pct: 0, bias_reduction_pct: 0 };
    }
    const post = {
      mape_pct: sumWeightedAbsPct / sumWeights,
      mean_signed_pct_error: sumWeightedSignedPct / sumWeights,
    };
    const mape_reduction_pct = pre.mape_pct > 0 ? ((pre.mape_pct - post.mape_pct) / pre.mape_pct) * 100 : 0;
    const bias_reduction_pct = Math.abs(pre.mean_signed_pct_error) > 0
      ? ((Math.abs(pre.mean_signed_pct_error) - Math.abs(post.mean_signed_pct_error)) / Math.abs(pre.mean_signed_pct_error)) * 100
      : 0;
    return {
      pre: { mape_pct: round2(pre.mape_pct), mean_signed_pct_error: round2(pre.mean_signed_pct_error) },
      post: { mape_pct: round2(post.mape_pct), mean_signed_pct_error: round2(post.mean_signed_pct_error) },
      mape_reduction_pct: round2(mape_reduction_pct),
      bias_reduction_pct: round2(bias_reduction_pct),
    };
  }

  /**
   * U-COV-QUOTING — derive() + Chain-of-Verification verifying every factor.
   *
   * For each derived factor (global + per-customer), generates 3-5 verification
   * questions and runs them through ChainOfVerificationEngine. The verifier is
   * a pure sanity-check function over the factor's input/output relationship —
   * no LLM in the loop, no I/O. If any critical-severity check conflicts, the
   * `cov.shouldEscalate` flag flips and the operator is asked to review before
   * the factors land in `state/shared/calibration/quoting-calibration-active.json`.
   *
   * Closes the U-QT11 follow-up named in [[reference_quoting_calibration_u_qt10_2026_05_25]].
   *
   * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-QUOTING
   * @author slot:charlie 2026-05-25 (continuing /goal-19)
   */
  async deriveWithCoV(
    report: AccuracyReport,
    opts: DeriveOptions = {}
  ): Promise<{
    factors: CalibrationFactors;
    cov: VerificationResult;
    safe_to_activate: boolean;
  }> {
    const factors = this.derive(report, opts);

    const claim: VerificationClaim = {
      claimId: `quoting-calibration-${factors.generated_at}`,
      domain: "quoting-calibration",
      summary: factors.ok
        ? `Global factor ${factors.global.factor.toFixed(4)} derived from signed bias ${factors.global.signed_pct_error_observed.toFixed(2)}% (n=${factors.global.record_count})`
        : `Calibration not derivable: ${factors.reason ?? "unknown"}`,
      initialVerdict: factors.ok ? "derived" : "not-derivable",
      initialConfidence: factors.ok ? Math.min(1, factors.global.record_count / 30) : 0,
      payload: { factors, report },
    };

    const questions = this.buildCovQuestions(factors, opts);
    // Pure sync verifier — performs no I/O. Consults the factor object itself
    // for sanity invariants (clamp range, signedPct math, per-customer count).
    const verifier: (q: VerificationQuestion) => ReturnType<Verifier> = (q) => this.verifyFactorQuestion(q, factors, opts);

    const cov = await chainOfVerificationEngine.verify(claim, questions, verifier);
    const safe_to_activate = factors.ok && !cov.shouldEscalate &&
      (cov.verdict === "confirmed" || cov.verdict === "confirmed_with_caveat");

    return { factors, cov, safe_to_activate };
  }

  /** Build the CoV question set from derived factors. */
  private buildCovQuestions(factors: CalibrationFactors, opts: DeriveOptions): VerificationQuestion[] {
    const minF = opts.minFactor ?? DEFAULT_MIN_FACTOR;
    const maxF = opts.maxFactor ?? DEFAULT_MAX_FACTOR;
    const band = opts.balancedBandPct ?? DEFAULT_BALANCED_BAND_PCT;

    const q: VerificationQuestion[] = [
      {
        id: "global-factor-in-clamp",
        question: `Is global factor ${factors.global.factor} inside the safety clamp [${minF}, ${maxF}]?`,
        severity: "critical",
        kind: "factor-clamp",
        context: { factor: factors.global.factor, minF, maxF },
      },
      {
        id: "global-factor-math-consistent",
        question: `Is the global factor consistent with f = 100/(100+signed_pct) for signed_pct=${factors.global.signed_pct_error_observed}%?`,
        severity: "critical",
        kind: "factor-math",
        context: { factor: factors.global.factor, signed_pct: factors.global.signed_pct_error_observed, band },
      },
      {
        id: "factors-not-runaway",
        question: `Are no per-customer factors hitting both upper AND lower clamp simultaneously (impossible state)?`,
        severity: "high",
        kind: "factor-sanity",
      },
      {
        id: "record-count-sufficient",
        question: `Does the global factor's record count (${factors.global.record_count}) meet the minimum sample size of 10?`,
        severity: "medium",
        kind: "sample-size",
        context: { record_count: factors.global.record_count, min: 10 },
      },
      {
        id: "per-customer-record-thresholds",
        question: `Did every derived per-customer factor have ≥minRecordsForCustomer records (no silent override of the threshold)?`,
        severity: "medium",
        kind: "threshold-discipline",
        context: { minRecordsForCustomer: opts.minRecordsForCustomer ?? DEFAULT_MIN_RECORDS, perCustomerCount: factors.per_customer.length },
      },
    ];
    return q;
  }

  /** Pure sanity verifier — no I/O, pure inspection of derived factors. */
  private verifyFactorQuestion(
    q: VerificationQuestion,
    factors: CalibrationFactors,
    opts: DeriveOptions
  ): ReturnType<Verifier> {
    const minF = opts.minFactor ?? DEFAULT_MIN_FACTOR;
    const maxF = opts.maxFactor ?? DEFAULT_MAX_FACTOR;
    const minRec = opts.minRecordsForCustomer ?? DEFAULT_MIN_RECORDS;

    switch (q.id) {
      case "global-factor-in-clamp": {
        const f = factors.global.factor;
        const inside = f >= minF && f <= maxF;
        return {
          questionId: q.id,
          outcome: inside ? "confirms" : "conflicts",
          evidence: inside
            ? `factor ${f.toFixed(4)} inside [${minF}, ${maxF}]`
            : `factor ${f.toFixed(4)} OUTSIDE clamp [${minF}, ${maxF}] — clamp guard failed`,
          confidence: 1,
        };
      }
      case "global-factor-math-consistent": {
        const signedPct = factors.global.signed_pct_error_observed;
        const expectedRaw = Math.abs(signedPct) <= (opts.balancedBandPct ?? DEFAULT_BALANCED_BAND_PCT)
          ? 1.0
          : 100 / (100 + signedPct);
        const expected = Math.min(maxF, Math.max(minF, expectedRaw));
        const actual = factors.global.factor;
        const diff = Math.abs(expected - actual);
        const matches = diff < 0.001;
        return {
          questionId: q.id,
          outcome: matches ? "confirms" : "conflicts",
          evidence: matches
            ? `derived factor ${actual.toFixed(4)} matches f=100/(100+${signedPct})=${expected.toFixed(4)}`
            : `derived factor ${actual.toFixed(4)} differs from expected ${expected.toFixed(4)} (diff ${diff.toFixed(4)})`,
          confidence: matches ? 1 : 0.95,
        };
      }
      case "factors-not-runaway": {
        const bothClampedSame = factors.per_customer.some(c => c.factor === minF) &&
                                factors.per_customer.some(c => c.factor === maxF);
        return {
          questionId: q.id,
          outcome: bothClampedSame ? "conflicts" : "confirms",
          evidence: bothClampedSame
            ? "some customers hit min-clamp AND some hit max-clamp — likely degenerate input"
            : "no simultaneous upper+lower clamp impacts detected",
          confidence: 0.9,
        };
      }
      case "record-count-sufficient": {
        const n = factors.global.record_count;
        if (n >= 30) {
          return { questionId: q.id, outcome: "confirms", evidence: `n=${n} ≥ recommended 30`, confidence: 1 };
        } else if (n >= 10) {
          return { questionId: q.id, outcome: "uncertain", evidence: `n=${n} between minimum 10 and recommended 30`, confidence: 0.6 };
        }
        return { questionId: q.id, outcome: "conflicts", evidence: `n=${n} below minimum 10 records — factors statistically weak`, confidence: 0.9 };
      }
      case "per-customer-record-thresholds": {
        const violators = factors.per_customer.filter(c => c.record_count < minRec);
        return {
          questionId: q.id,
          outcome: violators.length === 0 ? "confirms" : "conflicts",
          evidence: violators.length === 0
            ? `all ${factors.per_customer.length} per-customer factors have ≥${minRec} records`
            : `${violators.length} per-customer factor(s) violate min-records threshold`,
          confidence: 1,
        };
      }
      default:
        return {
          questionId: q.id,
          outcome: "uncertain",
          evidence: `no verifier registered for question id "${q.id}"`,
          confidence: 0.5,
        };
    }
  }

  // --- internals -----------------------------------------------------------

  private factorFromSignedPct(opts: {
    customer: string;
    record_count: number;
    signedPct: number;
    band: number;
    minF: number;
    maxF: number;
  }): CalibrationFactor {
    const { customer, record_count, signedPct, band, minF, maxF } = opts;
    if (Math.abs(signedPct) <= band) {
      return {
        customer,
        record_count,
        signed_pct_error_observed: round2(signedPct),
        factor: 1.0,
        factor_clamped: false,
        rationale: `within ±${band}% balanced band — no correction needed`,
      };
    }
    // raw = actual / predicted = 1 / (1 + signedPct/100); equivalent to 100 / (100 + signedPct).
    // Guard the denominator: signedPct ≤ -100 would mean "predicted negative or zero", which can't happen here
    // because FMV is always positive — but defensive clamping below covers it anyway.
    const denom = 100 + signedPct;
    const raw = denom > 0 ? 100 / denom : maxF;
    const clamped = Math.min(maxF, Math.max(minF, raw));
    const factor_clamped = clamped !== raw;
    return {
      customer,
      record_count,
      signed_pct_error_observed: round2(signedPct),
      factor: round4(clamped),
      factor_clamped,
      rationale: factor_clamped
        ? `raw ${raw.toFixed(4)} clamped to [${minF}, ${maxF}] band`
        : `signedPct ${signedPct.toFixed(1)}% → multiplicative correction ${clamped.toFixed(4)}`,
    };
  }

  private unitFactor(customer: string, record_count: number, rationale: string): CalibrationFactor {
    return { customer, record_count, signed_pct_error_observed: 0, factor: 1.0, factor_clamped: false, rationale };
  }

  private lookupFactor(factors: CalibrationFactors, customer: string): number {
    const match = factors.per_customer.find(c => c.customer === customer);
    if (match) return match.factor;
    return factors.global.factor;
  }

  private signature(report: AccuracyReport): string {
    // Stable, deterministic signature for the upstream report — no hashing dependency.
    const customers = report.per_customer_bias.map(b => `${b.customer}:${b.record_count}`).sort().join("|");
    return `n=${report.total_predicted};mape=${report.metrics.mape_pct.toFixed(2)};signed=${report.metrics.mean_signed_pct_error.toFixed(2)};cust=${customers}`;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const quotingCalibrationEngine = new QuotingCalibrationEngine();
