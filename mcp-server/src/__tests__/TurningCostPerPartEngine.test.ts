/**
 * TurningCostPerPartEngine — per-engine tests (MS10 / U-LPE01-02)
 */
import { describe, it, expect } from "vitest";
import { turningCostPerPartEngine } from "../engines/TurningCostPerPartEngine.js";

function base() {
  return {
    cycle_time_min: 2.5,
    loaded_rate_per_hr: 120,
    tool_cost_per_part: 1.5,
    blank_weight_kg: 0.25,
    material_price_per_kg: 8,
    setup_time_min: 30,
    batch_size: 100,
    scrap_rate: 0.02,
    part_value_per_part: 15,
    machine_kw: 12,
    energy_price_per_kwh: 0.12,
    secondary_ops_per_part: 0.5,
  };
}

describe("TurningCostPerPartEngine", () => {
  it("returns exactly 7 buckets", () => {
    const r = turningCostPerPartEngine.calculate(base());
    expect(r.buckets).toHaveLength(7);
  });

  it("bucket percentages sum to ~100%", () => {
    const r = turningCostPerPartEngine.calculate(base());
    const sum = r.buckets.reduce((s, b) => s + b.percent_of_total, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("machine_time = cycle_hr × loaded_rate", () => {
    const r = turningCostPerPartEngine.calculate(base());
    const mt = r.buckets.find(b => b.name === "machine_time")!;
    // 2.5/60 × 120 = 5.00
    expect(mt.cost_per_part).toBeCloseTo(5.0, 2);
  });

  it("setup = (setup_hr × loaded) / batch_size", () => {
    const r = turningCostPerPartEngine.calculate(base());
    const s = r.buckets.find(b => b.name === "setup")!;
    // 30/60 × 120 / 100 = 0.60
    expect(s.cost_per_part).toBeCloseTo(0.6, 2);
  });

  it("quality = scrap_rate × part_value + rework", () => {
    const r = turningCostPerPartEngine.calculate({ ...base(), rework_cost_per_part: 0.3 });
    const q = r.buckets.find(b => b.name === "quality")!;
    // 0.02 × 15 + 0.3 = 0.60
    expect(q.cost_per_part).toBeCloseTo(0.6, 2);
  });

  it("energy = cycle_hr × kW × $/kWh", () => {
    const r = turningCostPerPartEngine.calculate(base());
    const e = r.buckets.find(b => b.name === "energy")!;
    // 2.5/60 × 12 × 0.12 = 0.06
    expect(e.cost_per_part).toBeCloseTo(0.06, 3);
  });

  it("material_cost applies remnant credit", () => {
    const r = turningCostPerPartEngine.calculate({
      ...base(),
      recoverable_remnant_credit_per_part: 0.5,
    });
    const m = r.buckets.find(b => b.name === "material_cost")!;
    // 0.25 × 8 − 0.5 = 1.50
    expect(m.cost_per_part).toBeCloseTo(1.5, 2);
  });

  it("dominant_bucket = machine_time for the default case", () => {
    const r = turningCostPerPartEngine.calculate(base());
    expect(r.dominant_bucket).toBe("machine_time");
  });

  it("regime = Vc_min_cost when tool_cost dominates", () => {
    const r = turningCostPerPartEngine.calculate({
      ...base(),
      tool_cost_per_part: 50,
      cycle_time_min: 0.5,
      setup_time_min: 0,
      blank_weight_kg: 0.01,
      part_value_per_part: 1,
      scrap_rate: 0,
      secondary_ops_per_part: 0,
      machine_kw: 1,
    });
    expect(r.dominant_bucket).toBe("tool_cost");
    expect(r.recommended_regime).toBe("Vc_min_cost");
  });

  it("regime = Vc_max_production when setup dominates (tiny batch)", () => {
    const r = turningCostPerPartEngine.calculate({
      ...base(),
      setup_time_min: 120,
      batch_size: 1,
      cycle_time_min: 0.2,
      tool_cost_per_part: 0.1,
      blank_weight_kg: 0.01,
      secondary_ops_per_part: 0,
      scrap_rate: 0,
    });
    expect(r.dominant_bucket).toBe("setup");
    expect(r.recommended_regime).toBe("Vc_max_production");
  });

  it("regime = Vc_max_profit by default", () => {
    const r = turningCostPerPartEngine.calculate(base());
    expect(r.recommended_regime).toBe("Vc_max_profit");
  });

  it("flags total exceeding caller benchmark", () => {
    const r = turningCostPerPartEngine.calculate({ ...base(), benchmark_max_per_part: 0.1 });
    expect(r.within_benchmark).toBe(false);
    expect(r.warnings.some(w => /exceeds benchmark/.test(w))).toBe(true);
  });

  it("passes when total is below caller benchmark", () => {
    const r = turningCostPerPartEngine.calculate({ ...base(), benchmark_max_per_part: 100 });
    expect(r.within_benchmark).toBe(true);
  });

  it("warns on high scrap_rate > 10%", () => {
    const r = turningCostPerPartEngine.calculate({ ...base(), scrap_rate: 0.15 });
    expect(r.warnings.some(w => /scrap_rate/.test(w))).toBe(true);
  });

  it("handles batch_size=0 with warning", () => {
    const r = turningCostPerPartEngine.calculate({ ...base(), batch_size: 0 });
    expect(r.warnings.some(w => /batch_size/.test(w))).toBe(true);
  });

  it("total_cost_per_part equals sum of bucket costs", () => {
    const r = turningCostPerPartEngine.calculate(base());
    const sum = r.buckets.reduce((s, b) => s + b.cost_per_part, 0);
    expect(r.total_cost_per_part).toBeCloseTo(sum, 2);
  });
});
