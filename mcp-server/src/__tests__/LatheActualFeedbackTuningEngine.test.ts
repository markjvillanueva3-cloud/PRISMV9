import { describe, it, expect } from "vitest";
import { latheActualFeedbackTuningEngine } from "../engines/LatheActualFeedbackTuningEngine.js";

describe("LatheActualFeedbackTuningEngine", () => {
  const taylor = { "T1": { C: 200, n: 0.25 } };

  it("no drift → ratios are 1", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.residual_ratios.avg_time_ratio).toBeCloseTo(1, 2);
    expect(r.residual_ratios.avg_tool_life_ratio).toBeCloseTo(1, 2);
  });

  it("time ratio > 1 → cycle_time_k increases", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      cycle_time_k: 1.0,
      alpha: 0.5,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 90, // 1.5× prediction
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.cycle_time_k_new).toBeGreaterThan(1.0);
  });

  it("tool life actual > predicted → Taylor C increases", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      alpha: 1.0, // full adaptation
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 1800,
        },
      ],
    });
    // C_new = 150 × (30min)^0.25 ≈ 150 × 2.34 = 351
    expect(r.taylor_updates["T1"]?.C).toBeGreaterThan(200);
  });

  it("Taylor exponent n preserved", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 1800,
        },
      ],
    });
    expect(r.taylor_updates["T1"]?.n).toBe(0.25);
  });

  it("power ratio > 1 → kc_scale increases", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      kc_scale: 1.0,
      alpha: 0.5,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
          predicted_spindle_power_kw: 8,
          actual_spindle_power_kw: 10,
        },
      ],
    });
    expect(r.kc_scale_new).toBeGreaterThan(1.0);
  });

  it("scrap rate trends toward actual", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      baseline_scrap_rate: 0.02,
      alpha: 0.5,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
          actual_scrap_rate: 0.08,
        },
      ],
    });
    expect(r.baseline_scrap_rate_new).toBeGreaterThan(0.02);
    expect(r.baseline_scrap_rate_new).toBeLessThan(0.08);
  });

  it("rejects outliers beyond fold ratio", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      outlier_reject_ratio: 3.0,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 600, // 10× outlier
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.records_rejected_outlier).toBeGreaterThan(0);
  });

  it("alpha=0 → no change", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      alpha: 0,
      cycle_time_k: 1.0,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 120,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 1800,
        },
      ],
    });
    expect(r.cycle_time_k_new).toBeCloseTo(1.0, 3);
    expect(r.taylor_updates["T1"]?.C).toBeCloseTo(200, 0);
  });

  it("alpha=1 → full adaptation (replace with observed)", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      alpha: 1.0,
      cycle_time_k: 1.0,
      records: [
        {
          op: "rough",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 90, // 1.5×
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.cycle_time_k_new).toBeCloseTo(1.5, 1);
  });

  it("averages multiple records per tool", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      alpha: 1.0,
      records: [
        {
          op: "rough1",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
        {
          op: "rough2",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    // Both records give identical Taylor refit samples: C = 150 × 15^0.25 ≈ 295.2
    // With alpha=1.0, C_new = mean → same value regardless of count (avg identity)
    expect(r.taylor_updates["T1"]?.C).toBeCloseTo(295.2, 0);
  });

  it("records_used reflects accepted records", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      records: [
        {
          op: "a",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.records_used).toBe(1);
  });

  it("returns reasoning strings", () => {
    const r = latheActualFeedbackTuningEngine.tune({
      taylor,
      records: [
        {
          op: "a",
          tool_id: "T1",
          cutting_speed_m_min: 150,
          predicted_cycle_time_s: 60,
          actual_cycle_time_s: 60,
          predicted_tool_life_s: 900,
          actual_tool_life_s: 900,
        },
      ],
    });
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(r.reasoning.some((s) => s.includes("Residual"))).toBe(true);
  });

  it("getStats returns parameter names", () => {
    const s = latheActualFeedbackTuningEngine.getStats();
    expect(s.parameters_tuned).toContain("Taylor C");
    expect(s.alpha_default).toBe(0.25);
  });
});
