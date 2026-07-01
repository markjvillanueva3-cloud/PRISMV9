/**
 * Tests for QuotingCalibrationEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT10.
 *
 * Verifies: deterministic derivation, multiplicative-factor math, clamp guards,
 * apply() per-customer + global + balanced fall-throughs, measureImprovement()
 * homogeneous-correction theorem (post_signed = (pre_signed/100 + 1) × f × 100 − 100).
 */
import { describe, it, expect } from "vitest";
import { QuotingCalibrationEngine } from "../engines/QuotingCalibrationEngine.js";
import type { AccuracyReport, PerCustomerBias } from "../engines/QuotingTrainingLoopEngine.js";

const engine = new QuotingCalibrationEngine();

function makeReport(opts: {
  mean_signed_pct_error: number;
  mape_pct?: number;
  per_customer_bias: PerCustomerBias[];
  total_predicted?: number;
}): AccuracyReport {
  const total = opts.total_predicted ?? (opts.per_customer_bias.reduce((s, b) => s + b.record_count, 0) || 100);
  return {
    ok: true,
    total_records: total,
    total_predicted: total,
    total_skipped: 0,
    metrics: {
      mae_usd: 50,
      rmse_usd: 75,
      mape_pct: opts.mape_pct ?? Math.abs(opts.mean_signed_pct_error) + 5,
      mean_signed_pct_error: opts.mean_signed_pct_error,
    },
    per_customer_bias: opts.per_customer_bias,
    worst_5_records: [],
    best_5_records: [],
    psi_delta_fed_count: 0,
  };
}

describe("derive — guard rails", () => {
  it("report.ok=false → ok=false reason='report-not-ok'", () => {
    const empty: AccuracyReport = {
      ok: false, total_records: 0, total_predicted: 0, total_skipped: 0,
      metrics: { mae_usd: 0, rmse_usd: 0, mape_pct: 0, mean_signed_pct_error: 0 },
      per_customer_bias: [], worst_5_records: [], best_5_records: [], psi_delta_fed_count: 0,
    };
    const r = engine.derive(empty);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("report-not-ok");
  });

  it("report.total_predicted=0 → reason='no-predicted-records'", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: 0, per_customer_bias: [], total_predicted: 0 }));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-predicted-records");
  });
});

describe("derive — global factor math (signed_pct → 100/(100+signed_pct))", () => {
  it("signed +100% → global factor 0.5 (clamps within bounds)", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: 100, per_customer_bias: [] }));
    expect(r.ok).toBe(true);
    expect(r.global.factor).toBeCloseTo(0.5, 4);
    expect(r.global.factor_clamped).toBe(false);
  });

  it("signed +146.2% (JM-Die observed) → factor 100/246.2 ≈ 0.4061", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: 146.2, per_customer_bias: [] }));
    expect(r.ok).toBe(true);
    expect(r.global.factor).toBeCloseTo(100 / 246.2, 4);
  });

  it("signed -50% (under-predicting) → factor 100/50 = 2.0", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: -50, per_customer_bias: [] }));
    expect(r.ok).toBe(true);
    expect(r.global.factor).toBeCloseTo(2.0, 4);
  });

  it("signed within ±5% balanced band → factor=1.0", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: 3, per_customer_bias: [] }));
    expect(r.ok).toBe(true);
    expect(r.global.factor).toBe(1.0);
    expect(r.global.rationale).toContain("balanced band");
  });

  it("extreme positive bias clamps at maxF=5", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: -98, per_customer_bias: [] }), { maxF: 5 });
    expect(r.global.factor).toBe(5);
    expect(r.global.factor_clamped).toBe(true);
  });

  it("extreme negative would clamp at minF=0.2", () => {
    const r = engine.derive(makeReport({ mean_signed_pct_error: 1000, per_customer_bias: [] }), { minFactor: 0.2 });
    // raw = 100/1100 = 0.0909 → clamps to 0.2
    expect(r.global.factor).toBe(0.2);
    expect(r.global.factor_clamped).toBe(true);
  });
});

describe("derive — per-customer factors", () => {
  it("per-customer with ≥minRecords gets its own factor; <minRecords skipped to global", () => {
    const r = engine.derive(makeReport({
      mean_signed_pct_error: 50,
      per_customer_bias: [
        { customer: "ACME", record_count: 10, mean_pct_error: 100, mean_abs_pct_error: 100, systematic_direction: "over-predicting" },
        { customer: "WIDGET", record_count: 1, mean_pct_error: 200, mean_abs_pct_error: 200, systematic_direction: "over-predicting" },
        { customer: "SMALL", record_count: 5, mean_pct_error: -30, mean_abs_pct_error: 30, systematic_direction: "under-predicting" },
      ],
    }), { minRecordsForCustomer: 3 });
    expect(r.ok).toBe(true);
    expect(r.per_customer).toHaveLength(2);              // ACME + SMALL
    const acme = r.per_customer.find(c => c.customer === "ACME")!;
    const small = r.per_customer.find(c => c.customer === "SMALL")!;
    expect(acme.factor).toBeCloseTo(0.5, 4);             // 100/200
    expect(small.factor).toBeCloseTo(100 / 70, 4);       // 1.4286
    expect(r.notes.some(n => n.includes("WIDGET"))).toBe(true);
  });

  it("per-customer list sorted by record_count desc", () => {
    const r = engine.derive(makeReport({
      mean_signed_pct_error: 50,
      per_customer_bias: [
        { customer: "C-LOW", record_count: 4, mean_pct_error: 10, mean_abs_pct_error: 10, systematic_direction: "over-predicting" },
        { customer: "C-HIGH", record_count: 20, mean_pct_error: 10, mean_abs_pct_error: 10, systematic_direction: "over-predicting" },
        { customer: "C-MID", record_count: 10, mean_pct_error: 10, mean_abs_pct_error: 10, systematic_direction: "over-predicting" },
      ],
    }));
    expect(r.per_customer.map(c => c.customer)).toEqual(["C-HIGH", "C-MID", "C-LOW"]);
  });
});

describe("derive — determinism (R10)", () => {
  it("same report → identical CalibrationFactors body (modulo generated_at)", () => {
    const report = makeReport({
      mean_signed_pct_error: 67.3,
      per_customer_bias: [
        { customer: "X", record_count: 8, mean_pct_error: 80, mean_abs_pct_error: 80, systematic_direction: "over-predicting" },
        { customer: "Y", record_count: 12, mean_pct_error: 45, mean_abs_pct_error: 45, systematic_direction: "over-predicting" },
      ],
    });
    const a = engine.derive(report);
    const b = engine.derive(report);
    expect(a.global).toEqual(b.global);
    expect(a.per_customer).toEqual(b.per_customer);
    expect(a.source_report_signature).toBe(b.source_report_signature);
  });
});

describe("apply — routing", () => {
  const report = makeReport({
    mean_signed_pct_error: 100,            // global factor 0.5
    per_customer_bias: [
      { customer: "ACME", record_count: 10, mean_pct_error: 200, mean_abs_pct_error: 200, systematic_direction: "over-predicting" },
    ],
  });
  const factors = engine.derive(report);

  it("with matching customer → uses per-customer factor (ACME 1/3 ≈ 0.333)", () => {
    const r = engine.apply(factors, 300, { customer: "ACME" });
    expect(r.factor_source).toBe("per-customer");
    expect(r.corrected_usd).toBeCloseTo(100, 1);          // 300 × 1/3
  });

  it("unknown customer → falls back to global factor 0.5", () => {
    const r = engine.apply(factors, 200, { customer: "UNKNOWN" });
    expect(r.factor_source).toBe("global");
    expect(r.corrected_usd).toBeCloseTo(100, 1);          // 200 × 0.5
  });

  it("no customer → global factor 0.5", () => {
    const r = engine.apply(factors, 200);
    expect(r.factor_source).toBe("global");
    expect(r.corrected_usd).toBeCloseTo(100, 1);
  });

  it("balanced-band global (factor=1) + no customer → balanced-pass-through", () => {
    const balanced = engine.derive(makeReport({ mean_signed_pct_error: 0, per_customer_bias: [] }));
    const r = engine.apply(balanced, 200);
    expect(r.factor_source).toBe("balanced-pass-through");
    expect(r.corrected_usd).toBe(200);
  });

  it("non-finite or zero input → pass-through unchanged", () => {
    const r1 = engine.apply(factors, 0);
    const r2 = engine.apply(factors, NaN);
    expect(r1.corrected_usd).toBe(0);
    expect(r2.factor_source).toBe("balanced-pass-through");
  });
});

describe("measureImprovement — closed-loop verification", () => {
  it("homogeneous correction collapses |signed_bias| toward 0 and reduces MAPE", () => {
    const report = makeReport({
      mean_signed_pct_error: 146.2,
      mape_pct: 171.9,
      per_customer_bias: [
        { customer: "A", record_count: 50, mean_pct_error: 146.2, mean_abs_pct_error: 146.2, systematic_direction: "over-predicting" },
        { customer: "B", record_count: 50, mean_pct_error: 146.2, mean_abs_pct_error: 146.2, systematic_direction: "over-predicting" },
      ],
    });
    const factors = engine.derive(report);
    const m = engine.measureImprovement(report, factors);
    expect(m.pre.mean_signed_pct_error).toBeCloseTo(146.2, 1);
    expect(Math.abs(m.post.mean_signed_pct_error)).toBeLessThan(1);  // exact correction collapses bias
    expect(m.bias_reduction_pct).toBeGreaterThan(99);
  });

  it("mixed customer bias → per-customer correction beats global-only", () => {
    const report = makeReport({
      mean_signed_pct_error: 100,
      mape_pct: 100,
      per_customer_bias: [
        { customer: "RICH",  record_count: 50, mean_pct_error: 150, mean_abs_pct_error: 150, systematic_direction: "over-predicting" },
        { customer: "POOR",  record_count: 50, mean_pct_error: 50,  mean_abs_pct_error: 50,  systematic_direction: "over-predicting" },
      ],
    });
    const factors = engine.derive(report);
    const m = engine.measureImprovement(report, factors);
    expect(m.mape_reduction_pct).toBeGreaterThan(95);
    expect(Math.abs(m.post.mean_signed_pct_error)).toBeLessThan(1);
  });

  it("empty per_customer_bias → returns pre==post (no buckets to correct through)", () => {
    const report = makeReport({ mean_signed_pct_error: 50, per_customer_bias: [], total_predicted: 100 });
    const factors = engine.derive(report);
    const m = engine.measureImprovement(report, factors);
    expect(m.post.mape_pct).toBe(m.pre.mape_pct);
    expect(m.mape_reduction_pct).toBe(0);
  });
});
