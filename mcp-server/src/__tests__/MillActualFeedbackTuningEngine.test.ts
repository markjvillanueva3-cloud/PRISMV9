import { describe, it, expect } from "vitest";
import {
  millActualFeedbackTuningEngine as eng,
  DEFAULT_ALPHA,
  DEFAULT_OUTLIER_REJECT_FOLD,
  type MillFeedbackTuningInput,
  type MillOpCalibrationRecord,
} from "../engines/MillActualFeedbackTuningEngine.js";

function rec(o: Partial<MillOpCalibrationRecord> = {}): MillOpCalibrationRecord {
  return {
    op: "rough_pocket",
    tool_id: "EM10_4F",
    cutting_speed_m_min: 200,
    predicted_cycle_time_s: 60,
    actual_cycle_time_s: 60,
    predicted_tool_life_s: 1200,
    actual_tool_life_s: 1200,
    ...o,
  };
}

function nominal(records: MillOpCalibrationRecord[] = []): MillFeedbackTuningInput {
  return {
    records: records.length > 0 ? records : [rec()],
    taylor: { EM10_4F: { C: 200, n: 0.25 } },
  };
}

describe("MillActualFeedbackTuningEngine", () => {
  it("getStats: 7 parameters tuned, 3 mill-canonical extensions, Taylor/Altintas refs", () => {
    const s = eng.getStats();
    expect(s.alpha_default).toBe(DEFAULT_ALPHA);
    expect(s.parameters_tuned).toEqual([
      "Taylor C", "cycle_time_k", "baseline_scrap_rate", "kc_scale",
      "fz_scale", "adaptive_ae_scale", "chatter_threshold_scale",
    ]);
    expect(s.mill_canonical_extensions).toEqual([
      "fz_scale", "adaptive_ae_scale", "chatter_threshold_scale",
    ]);
    expect(s.reference).toMatch(/Taylor|Altintas|ISO 3685/);
  });

  it("throws on invalid inputs (missing + non-array records + missing taylor)", () => {
    expect(() => eng.tune(null as never)).toThrow(/input required/);
    expect(() => eng.tune({ records: undefined as never, taylor: {} })).toThrow(/records\[\] required/);
    expect(() => eng.tune({ records: [], taylor: undefined as never })).toThrow(/taylor map required/);
  });

  it("no actual deviation → outputs unchanged (residuals all 1.0)", () => {
    const r = eng.tune(nominal());
    expect(r.residual_ratios.avg_time_ratio).toBeCloseTo(1.0, 4);
    expect(r.residual_ratios.avg_tool_life_ratio).toBeCloseTo(1.0, 4);
    expect(r.cycle_time_k_new).toBeCloseTo(1.0, 4);
  });

  it("actual cycle 2× predicted → cycle_time_k tunes to 1.25 (α=0.25 smoothing)", () => {
    const r = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 120 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(r.cycle_time_k_new).toBeCloseTo(1.25, 4);
    expect(r.residual_ratios.avg_time_ratio).toBe(2.0);
  });

  it("actual tool life half predicted → tl ratio 0.5, NOT rejected (within 3x fold)", () => {
    const r = eng.tune({
      records: [rec({ predicted_tool_life_s: 1200, actual_tool_life_s: 600 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(r.residual_ratios.avg_tool_life_ratio).toBe(0.5);
    expect(r.records_rejected_outlier).toBe(0);
  });

  it("actual cycle 10× predicted → REJECTED as outlier (beyond 3x fold)", () => {
    const r = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 600 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(r.records_rejected_outlier).toBeGreaterThanOrEqual(1);
    expect(r.residual_ratios.avg_time_ratio).toBe(1);
  });

  it("fz tuning: actual fz 1.5× predicted → fz_scale new = 1.125", () => {
    const r = eng.tune({
      records: [rec({ predicted_fz_mm_tooth: 0.05, actual_fz_mm_tooth: 0.075 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      fz_scale: 1.0,
    });
    expect(r.fz_scale_new).toBeCloseTo(1.125, 3);
    expect(r.residual_ratios.avg_fz_ratio).toBeCloseTo(1.5, 3);
  });

  it("adaptive ae tuning: actual 0.5× predicted → ae_scale new = 0.875", () => {
    const r = eng.tune({
      records: [rec({ predicted_ae_mm: 1.0, actual_ae_mm: 0.5 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      adaptive_ae_scale: 1.0,
    });
    expect(r.adaptive_ae_scale_new).toBeCloseTo(0.875, 3);
    expect(r.residual_ratios.avg_ae_ratio).toBeCloseTo(0.5, 3);
  });

  it("chatter threshold: 2× chatter than predicted → threshold scale = 1.25", () => {
    const r = eng.tune({
      records: [rec({ predicted_chatter_events_per_min: 1, actual_chatter_events_per_min: 2 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      chatter_threshold_scale: 1.0,
    });
    expect(r.chatter_threshold_scale_new).toBeCloseTo(1.25, 3);
    expect(r.residual_ratios.avg_chatter_ratio).toBeCloseTo(2.0, 3);
  });

  it("chatter threshold: zero predicted skipped (no division), stays at 1.0", () => {
    const r = eng.tune({
      records: [rec({ predicted_chatter_events_per_min: 0, actual_chatter_events_per_min: 0 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(r.residual_ratios.avg_chatter_ratio).toBe(1);
    expect(r.chatter_threshold_scale_new).toBeCloseTo(1.0, 4);
  });

  it("Taylor refit: V=200, T_min=10, n=0.25 → C_sample=355.66, C_new=238.92", () => {
    const r = eng.tune({
      records: [rec({ cutting_speed_m_min: 200, predicted_tool_life_s: 600, actual_tool_life_s: 600 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    const updated = r.taylor_updates["EM10_4F"];
    expect(updated?.C).toBeCloseTo(238.92, 1);
    expect(updated?.n).toBe(0.25);
  });

  it("Taylor refit skipped when tool_id has no prior entry in taylor map", () => {
    const r = eng.tune({
      records: [rec({ tool_id: "UNKNOWN_TOOL" })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(Object.keys(r.taylor_updates)).toEqual([]);
  });

  it("scrap-rate baseline tunes to weighted mean: 0.02 → 0.04 for actual=0.10", () => {
    const r = eng.tune({
      records: [rec({ actual_scrap_rate: 0.10 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      baseline_scrap_rate: 0.02,
    });
    expect(r.baseline_scrap_rate_new).toBeCloseTo(0.04, 3);
  });

  it("scrap-rate clamped: actual=1.5 → clamped to 1.0 → baseline new=0.265", () => {
    const r = eng.tune({
      records: [rec({ actual_scrap_rate: 1.5 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      baseline_scrap_rate: 0.02,
    });
    expect(r.baseline_scrap_rate_new).toBeCloseTo(0.265, 3);
  });

  it("kc_scale: actual power 1.2× predicted → kc_scale new = 1.05", () => {
    const r = eng.tune({
      records: [rec({ predicted_spindle_power_kw: 5, actual_spindle_power_kw: 6 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      kc_scale: 1.0,
    });
    expect(r.kc_scale_new).toBeCloseTo(1.05, 3);
  });

  it("alpha=0.5 (vs default 0.25) doubles smoothing weight → cycle_time_k = 1.5 vs 1.25", () => {
    const r_default = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 120 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    const r_high = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 120 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      alpha: 0.5,
    });
    expect(r_default.cycle_time_k_new).toBeCloseTo(1.25, 4);
    expect(r_high.cycle_time_k_new).toBeCloseTo(1.5, 4);
  });

  it("alpha clamped to [0, 1]: -1 → 0 (no movement), 5 → 1 (full observation)", () => {
    const r_neg = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 120 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      alpha: -1,
    });
    const r_big = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 120 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      alpha: 5,
    });
    expect(r_neg.cycle_time_k_new).toBeCloseTo(1.0, 4);
    expect(r_big.cycle_time_k_new).toBeCloseTo(2.0, 4);
  });

  it("custom outlier_reject_ratio=1.5 rejects ratio 2.5 that default 3.0 accepts", () => {
    const r_default = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 150 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    const r_tight = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 150 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
      outlier_reject_ratio: 1.5,
    });
    expect(r_default.records_rejected_outlier).toBe(0);
    expect(r_tight.records_rejected_outlier).toBeGreaterThanOrEqual(1);
  });

  it("multiple records → mean of ratios pre-smoothing: 1.33 + 1.67 → 1.5", () => {
    const r = eng.tune({
      records: [
        rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 80 }),
        rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 100 }),
      ],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    expect(r.residual_ratios.avg_time_ratio).toBeCloseTo(1.5, 3);
  });

  it("variability ≥3: bulk-roughing + finishing + drilling — all 3 tool_ids tracked in updates", () => {
    const r = eng.tune({
      records: [
        rec({ op: "rough", tool_id: "EM12_3F", cutting_speed_m_min: 250,
          predicted_tool_life_s: 1800, actual_tool_life_s: 1500 }),
        rec({ op: "finish", tool_id: "EM6_4F", cutting_speed_m_min: 300,
          predicted_tool_life_s: 1200, actual_tool_life_s: 1400 }),
        rec({ op: "drill", tool_id: "DRILL_5MM", cutting_speed_m_min: 150,
          predicted_tool_life_s: 600, actual_tool_life_s: 580 }),
      ],
      taylor: {
        EM12_3F: { C: 250, n: 0.25 },
        EM6_4F: { C: 300, n: 0.20 },
        DRILL_5MM: { C: 100, n: 0.15 },
      },
    });
    expect(Object.keys(r.taylor_updates).sort()).toEqual(["DRILL_5MM", "EM12_3F", "EM6_4F"]);
    // Each Taylor update has finite numeric C and same n
    expect(r.taylor_updates.EM12_3F?.n).toBe(0.25);
    expect(r.taylor_updates.EM6_4F?.n).toBe(0.20);
    expect(r.taylor_updates.DRILL_5MM?.n).toBe(0.15);
    expect(Number.isFinite(r.taylor_updates.EM12_3F?.C)).toBe(true);
    expect(Number.isFinite(r.taylor_updates.EM6_4F?.C)).toBe(true);
    expect(Number.isFinite(r.taylor_updates.DRILL_5MM?.C)).toBe(true);
  });

  it("reasoning narrates each tuned parameter with α and before/after", () => {
    const r = eng.tune(nominal());
    expect(r.reasoning.some(s => /Cycle k:/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Kienzle kc scale:/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Mill fz scale:/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Mill ae scale:/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Mill chatter threshold scale:/.test(s))).toBe(true);
  });

  it("determinism: same input twice → identical results", () => {
    const i = nominal([
      rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 75 }),
      rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 65 }),
    ]);
    expect(eng.tune(i)).toEqual(eng.tune(i));
  });

  it("adversarial: empty records → all 4 numeric outputs stay exactly at 1.0 baseline", () => {
    const r = eng.tune({ records: [], taylor: {} });
    expect(r.cycle_time_k_new).toBe(1.0);
    expect(r.fz_scale_new).toBe(1.0);
    expect(r.adaptive_ae_scale_new).toBe(1.0);
    expect(r.chatter_threshold_scale_new).toBe(1.0);
    expect(r.records_used).toBe(0);
  });

  it("adversarial: negative actual time → rejected outlier (ratio <= 0)", () => {
    const r = eng.tune({
      records: [rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: -10 })],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    // negative actuals are rejected by the > 0 guard in helper
    expect(r.residual_ratios.avg_time_ratio).toBe(1); // fallback
  });

  it("default outlier reject ratio is 3.0", () => {
    expect(DEFAULT_OUTLIER_REJECT_FOLD).toBe(3.0);
  });

  it("records_used + records_rejected_outlier equals total records count for unambiguous cases", () => {
    // 2 records, 1 huge outlier → 1 used, 1 rejected
    const r = eng.tune({
      records: [
        rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 60 }),
        rec({ predicted_cycle_time_s: 60, actual_cycle_time_s: 1000 }),
      ],
      taylor: { EM10_4F: { C: 200, n: 0.25 } },
    });
    // Each record contributes to BOTH time + tl ratios; rejection counts both
    // axes. records_used = records.length - rejected.
    expect(r.records_used + r.records_rejected_outlier).toBe(2);
  });
});
