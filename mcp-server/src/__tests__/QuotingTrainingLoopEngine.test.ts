/**
 * Tests for QuotingTrainingLoopEngine — JM-DIE-QUOTE-TRAINING-MS0 / U-QT01.
 * Concrete value assertions on accuracy math + per-customer bias detection.
 */
import { describe, it, expect } from "vitest";
import {
  QuotingTrainingLoopEngine,
  isContaminatedBaselineRecord,
  DEFAULT_PLACEHOLDER_REVENUE_FLOOR_USD,
  type QuoteBaselineRecord,
} from "../engines/QuotingTrainingLoopEngine.js";

const eng = new QuotingTrainingLoopEngine();

function rec(overrides: Partial<QuoteBaselineRecord> & { actual_revenue_usd: number }): QuoteBaselineRecord {
  return {
    customer: "TESTCO",
    part_id: "TESTPART",
    doc_date: "2024-06-15",
    estimated_time_in_cut_s: 600,
    estimated_material_spend_usd: 75,
    machine_rate_usd_per_hr: 95,
    ...overrides,
  };
}

describe("QuotingTrainingLoopEngine.run — basic accuracy math", () => {
  it("empty records → ok=false, reason='no-baseline-records'", () => {
    const r = eng.run([]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no-baseline-records");
    expect(r.total_records).toBe(0);
  });

  it("single record produces MAE === abs_error of that record", () => {
    const r = eng.run([rec({ actual_revenue_usd: 100 })]);
    expect(r.ok).toBe(true);
    expect(r.total_predicted).toBe(1);
    expect(r.total_skipped).toBe(0);
    expect(r.metrics.mae_usd).toBeCloseTo(r.worst_5_records[0].abs_error_usd, 6);
    // RMSE === MAE for a single record (sqrt(x^2) = x)
    expect(r.metrics.rmse_usd).toBeCloseTo(r.metrics.mae_usd, 6);
  });

  it("skips records with actual_revenue_usd <= 0 (R12 — never pretends prediction worked)", () => {
    const r = eng.run([
      rec({ actual_revenue_usd: 100 }),
      rec({ actual_revenue_usd: 0 }),
      rec({ actual_revenue_usd: -50 }),
    ]);
    expect(r.total_records).toBe(3);
    expect(r.total_predicted).toBe(1);
    expect(r.total_skipped).toBe(2);
  });

  it("all records bad → reason='all-records-skipped'", () => {
    const r = eng.run([rec({ actual_revenue_usd: 0 }), rec({ actual_revenue_usd: -1 })]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("all-records-skipped");
    expect(r.total_skipped).toBe(2);
  });
});

describe("QuotingTrainingLoopEngine.run — MAPE math", () => {
  it("MAPE = mean( |pct_error| ) across all predictions", () => {
    const r = eng.run([
      rec({ customer: "A", part_id: "1", actual_revenue_usd: 50 }),
      rec({ customer: "A", part_id: "2", actual_revenue_usd: 500 }),
    ]);
    expect(r.total_predicted).toBe(2);
    const computed = (Math.abs(r.worst_5_records[0].pct_error) + Math.abs(r.worst_5_records[1].pct_error)) / 2;
    expect(r.metrics.mape_pct).toBeCloseTo(computed, 4);
  });

  it("mean_signed_pct_error preserves direction (over-prediction yields positive)", () => {
    const r = eng.run([rec({ actual_revenue_usd: 25 })]); // >= $20 floor; FMV >> $25 -> positive signed error
    expect(r.metrics.mean_signed_pct_error).toBeGreaterThan(0);
  });
});

describe("QuotingTrainingLoopEngine.run — per-customer bias", () => {
  it("groups predictions by customer and produces one bias entry per customer", () => {
    const r = eng.run([
      rec({ customer: "ACME", part_id: "1", actual_revenue_usd: 100 }),
      rec({ customer: "ACME", part_id: "2", actual_revenue_usd: 200 }),
      rec({ customer: "BETA", part_id: "1", actual_revenue_usd: 150 }),
    ]);
    expect(r.per_customer_bias.length).toBe(2);
    const acme = r.per_customer_bias.find((b) => b.customer === "ACME");
    const beta = r.per_customer_bias.find((b) => b.customer === "BETA");
    expect(acme?.record_count).toBe(2);
    expect(beta?.record_count).toBe(1);
  });

  it("classifies systematic_direction='over-predicting' when mean_pct_error > +5%", () => {
    const r = eng.run([
      rec({ customer: "ACME", actual_revenue_usd: 25 }),
      rec({ customer: "ACME", actual_revenue_usd: 25 }),
    ]);
    const acme = r.per_customer_bias.find((b) => b.customer === "ACME");
    expect(acme?.systematic_direction).toBe("over-predicting");
    expect(acme?.mean_pct_error).toBeGreaterThan(5);
  });
});

describe("QuotingTrainingLoopEngine.run — worst/best record surfacing", () => {
  it("worst_5_records sorted by abs_error_usd DESC; best_5 sorted ASC", () => {
    const r = eng.run([
      rec({ part_id: "huge-error", actual_revenue_usd: 25 }), // >= $20 floor; FMV still >> $25 -> largest error
      rec({ part_id: "medium", actual_revenue_usd: 100 }),
      rec({ part_id: "small", actual_revenue_usd: 200 }),
    ]);
    expect(r.worst_5_records[0].part_id).toBe("huge-error");
    expect(r.worst_5_records[0].abs_error_usd).toBeGreaterThanOrEqual(r.worst_5_records[r.worst_5_records.length - 1].abs_error_usd);
    expect(r.best_5_records[0].abs_error_usd).toBeLessThanOrEqual(r.best_5_records[r.best_5_records.length - 1].abs_error_usd);
  });
});

describe("QuotingTrainingLoopEngine.run — psi_delta feed counter", () => {
  it("feedPsnAutonomy=false (default) → psi_delta_fed_count=0", () => {
    const r = eng.run([rec({ actual_revenue_usd: 100 })]);
    expect(r.psi_delta_fed_count).toBe(0);
  });
  it("feedPsnAutonomy=true → psi_delta_fed_count === total_predicted", () => {
    const r = eng.run([
      rec({ customer: "A", actual_revenue_usd: 100 }),
      rec({ customer: "B", actual_revenue_usd: 150 }),
    ], { feedPsnAutonomy: true });
    expect(r.psi_delta_fed_count).toBe(2);
  });
});

describe("QuotingTrainingLoopEngine.recommendImprovements", () => {
  it("ok=false report → returns single string 'no-data-to-recommend-from'", () => {
    const r = eng.run([]);
    const recs = eng.recommendImprovements(r);
    expect(recs).toEqual(["no-data-to-recommend-from"]);
  });

  it("global bias > 5% surfaces 'global-bias' recommendation with direction string", () => {
    const r = eng.run([
      rec({ customer: "A", actual_revenue_usd: 25 }), // >= $20 floor; FMV ~$700 -> strong over-prediction bias
      rec({ customer: "B", actual_revenue_usd: 25 }),
      rec({ customer: "C", actual_revenue_usd: 25 }),
    ]);
    const recs = eng.recommendImprovements(r);
    const globalBias = recs.find((s) => s.startsWith("global-bias:")) ?? "";
    expect(globalBias.length).toBeGreaterThan(0);
    expect(globalBias).toContain("over-predicts");
  });

  it("high MAPE (>25%) surfaces 'high-mape' recommendation pointing at per-part defaults", () => {
    const r = eng.run([rec({ actual_revenue_usd: 25 }), rec({ actual_revenue_usd: 1000000 })]);
    const recs = eng.recommendImprovements(r);
    expect(recs.some((s) => s.startsWith("high-mape"))).toBe(true);
  });
});

describe("Per-record overrides — engine uses record-level fields when present", () => {
  it("longer estimated_time_in_cut_s yields higher predicted_fmv_usd", () => {
    const a = eng.run([rec({ estimated_time_in_cut_s: 100, actual_revenue_usd: 100 })]);
    const b = eng.run([rec({ estimated_time_in_cut_s: 6000, actual_revenue_usd: 100 })]);
    expect(b.worst_5_records[0].predicted_fmv_usd).toBeGreaterThan(a.worst_5_records[0].predicted_fmv_usd);
  });
});

describe("QuotingTrainingLoopEngine.run — predicted_fmv_usd_all (U-QP-TRAIN-PREDICTED-EXPOSE)", () => {
  it("exposes ALL per-record predicted FMVs — length === total_predicted, every value finite>0", () => {
    const r = eng.run([
      rec({ customer: "A", part_id: "1", actual_revenue_usd: 100 }),
      rec({ customer: "A", part_id: "2", actual_revenue_usd: 500 }),
      rec({ customer: "B", part_id: "1", actual_revenue_usd: 250 }),
    ]);
    expect(r.predicted_fmv_usd_all.length).toBe(3);
    expect(r.predicted_fmv_usd_all.length).toBe(r.total_predicted);
    expect(r.predicted_fmv_usd_all.every((v) => Number.isFinite(v) && v > 0)).toBe(true);
  });

  it("the full set equals the per-record predictions (matches worst_5 for n<=5)", () => {
    const r = eng.run([
      rec({ part_id: "1", actual_revenue_usd: 25 }),
      rec({ part_id: "2", actual_revenue_usd: 100 }),
      rec({ part_id: "3", actual_revenue_usd: 200 }),
    ]);
    const fromAll = [...r.predicted_fmv_usd_all].sort((a, b) => a - b);
    const fromWorst = r.worst_5_records.map((p) => p.predicted_fmv_usd).sort((a, b) => a - b);
    expect(fromAll).toEqual(fromWorst); // n=3 ≤ 5, so worst_5 covers every prediction
  });

  it("excludes skipped records (1 valid + 2 invalid → length 1)", () => {
    const r = eng.run([
      rec({ actual_revenue_usd: 100 }),
      rec({ actual_revenue_usd: 0 }),
      rec({ actual_revenue_usd: -5 }),
    ]);
    expect(r.predicted_fmv_usd_all.length).toBe(1);
    expect(r.predicted_fmv_usd_all[0]).toBe(r.worst_5_records[0].predicted_fmv_usd);
  });

  it("empty / all-skipped → predicted_fmv_usd_all is []", () => {
    expect(eng.run([]).predicted_fmv_usd_all.length).toBe(0);
    expect(eng.run([rec({ actual_revenue_usd: 0 })]).predicted_fmv_usd_all.length).toBe(0);
  });

  it("preserves prediction (input) order — first (short time) < second (long time)", () => {
    const r = eng.run([
      rec({ part_id: "short", estimated_time_in_cut_s: 100, actual_revenue_usd: 100 }),
      rec({ part_id: "long", estimated_time_in_cut_s: 6000, actual_revenue_usd: 100 }),
    ]);
    expect(r.predicted_fmv_usd_all.length).toBe(2);
    expect(r.predicted_fmv_usd_all[0]).toBeLessThan(r.predicted_fmv_usd_all[1]);
  });
});

// ---- U2 (QUOTING-OPTIMAL): contamination sanitizer ----

describe("isContaminatedBaselineRecord — synthetic/placeholder detection", () => {
  it("flags the $10 bootstrap placeholder (below the $20 floor)", () => {
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 10 }))).toBe(true);
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 19.99 }))).toBe(true);
  });

  it("keeps a real sub-floor edge at exactly the floor and above", () => {
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 20 }))).toBe(false);
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 308.77 }))).toBe(false);
  });

  it("flags machine-catalog rows (MACHINE MODELS FOR LEARNING customer)", () => {
    expect(isContaminatedBaselineRecord(rec({
      customer: "MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION",
      part_id: "OKUMA GENOS M460V-5AX",
      actual_revenue_usd: 500,
    }))).toBe(true);
  });

  it("flags CLAUDE-* and BASEBALL synthetic customers", () => {
    expect(isContaminatedBaselineRecord(rec({ customer: "CLAUDE - 3D MODELS", actual_revenue_usd: 500 }))).toBe(true);
    expect(isContaminatedBaselineRecord(rec({ customer: "BASEBALL PARTS", actual_revenue_usd: 500 }))).toBe(true);
  });

  it("flags non-finite / null records (R12 fail-safe)", () => {
    expect(isContaminatedBaselineRecord(null)).toBe(true);
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: NaN }))).toBe(true);
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: Infinity }))).toBe(true);
  });

  it("keeps a legitimate FONTANA/AGRATI real record", () => {
    expect(isContaminatedBaselineRecord(rec({ customer: "FONTANA", part_id: "13644", actual_revenue_usd: 308.77 }))).toBe(false);
    expect(isContaminatedBaselineRecord(rec({ customer: "AGRATI", part_id: "X-22", actual_revenue_usd: 975.13 }))).toBe(false);
  });

  it("respects a custom placeholder floor", () => {
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 50 }), 100)).toBe(true);
    expect(isContaminatedBaselineRecord(rec({ actual_revenue_usd: 50 }), 25)).toBe(false);
  });

  it("DEFAULT_PLACEHOLDER_REVENUE_FLOOR_USD is $20", () => {
    expect(DEFAULT_PLACEHOLDER_REVENUE_FLOOR_USD).toBe(20);
  });
});

describe("QuotingTrainingLoopEngine.run — contamination filtering", () => {
  it("drops contaminated rows and reports total_skipped_contaminated", () => {
    const r = eng.run([
      rec({ customer: "FONTANA", actual_revenue_usd: 308.77 }), // real, kept
      rec({ customer: "AGRATI", actual_revenue_usd: 975.13 }), // real, kept
      rec({ actual_revenue_usd: 10 }), // placeholder, dropped
      rec({ customer: "MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION", actual_revenue_usd: 500 }), // machine-catalog, dropped
      rec({ customer: "CLAUDE - PDF PRINTS", actual_revenue_usd: 500 }), // synthetic, dropped
    ]);
    expect(r.ok).toBe(true);
    expect(r.total_records).toBe(5);
    expect(r.total_predicted).toBe(2);
    expect(r.total_skipped).toBe(3);
    expect(r.total_skipped_contaminated).toBe(3);
  });

  it("a corpus of ONLY contamination -> ok=false, all-records-skipped, contaminated count exposed", () => {
    const r = eng.run([
      rec({ actual_revenue_usd: 10 }),
      rec({ customer: "BASEBALL PARTS", actual_revenue_usd: 5 }),
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("all-records-skipped");
    expect(r.total_skipped_contaminated).toBe(2);
  });

  it("clean corpus -> zero contaminated, all predicted", () => {
    const r = eng.run([
      rec({ customer: "FONTANA", actual_revenue_usd: 308.77 }),
      rec({ customer: "AGRATI", actual_revenue_usd: 975.13 }),
    ]);
    expect(r.total_skipped_contaminated).toBe(0);
    expect(r.total_predicted).toBe(2);
  });
});
