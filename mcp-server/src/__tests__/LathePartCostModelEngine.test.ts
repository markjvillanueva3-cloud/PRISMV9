import { describe, it, expect } from "vitest";
import { lathePartCostModelEngine } from "../engines/LathePartCostModelEngine.js";

const baseInput = {
  cycle_time_s: 300, // 5 min
  machine_rate_per_hr: 60, // $60/hr
  operations: [
    {
      op: "rough_turn",
      cycle_time_s: 180,
      tool_life_s: 1800,
      insert_cost: 12,
      edges_per_insert: 4,
      holder_amort_per_edge: 0.5,
    },
    {
      op: "finish_turn",
      cycle_time_s: 120,
      tool_life_s: 2400,
      insert_cost: 15,
      edges_per_insert: 2,
    },
  ],
  part_mass_kg: 0.8,
  waste_mass_kg: 0.2,
  material_price_per_kg: 4.0,
  setup_time_s: 1800,
  setup_rate_per_hr: 80,
  batch_size: 50,
};

describe("LathePartCostModelEngine", () => {
  it("computes machine bucket = cycle_hr * rate", () => {
    const r = lathePartCostModelEngine.compute(baseInput);
    // 300s = 0.0833hr × $60 = $5.00
    expect(r.buckets.machine).toBeCloseTo(5.0, 2);
  });

  it("per-op tool cost includes insert + holder amort / edge", () => {
    const r = lathePartCostModelEngine.compute(baseInput);
    // rough_turn: (12/4 + 0.5)/1800 × 180 = 3.5/1800 × 180 = $0.35
    expect(r.per_op_tool_cost["rough_turn"]).toBeCloseTo(0.35, 2);
    // finish_turn: (15/2)/2400 × 120 = 7.5/2400 × 120 = $0.375 → round2 = 0.38
    expect(r.per_op_tool_cost["finish_turn"]).toBeCloseTo(0.38, 2);
  });

  it("material bucket = (part + waste) * price", () => {
    const r = lathePartCostModelEngine.compute(baseInput);
    // (0.8 + 0.2) × 4 = $4.00
    expect(r.buckets.material).toBeCloseTo(4.0, 2);
  });

  it("setup bucket amortized over batch", () => {
    const r = lathePartCostModelEngine.compute(baseInput);
    // 1800s = 0.5hr × $80 / 50 = $0.80
    expect(r.buckets.setup).toBeCloseTo(0.8, 2);
  });

  it("quality bucket scales with scrap rate", () => {
    const low = lathePartCostModelEngine.compute({ ...baseInput, scrap_rate: 0.01 });
    const high = lathePartCostModelEngine.compute({ ...baseInput, scrap_rate: 0.10 });
    expect(high.buckets.quality).toBeGreaterThan(low.buckets.quality);
  });

  it("energy bucket respects power and price", () => {
    const r = lathePartCostModelEngine.compute({
      ...baseInput,
      spindle_power_kw: 10,
      energy_price_per_kwh: 0.15,
    });
    // 10kW × 0.0833hr × $0.15 = $0.125
    expect(r.buckets.energy).toBeCloseTo(0.125, 2);
  });

  it("secondary ops sum correctly", () => {
    const r = lathePartCostModelEngine.compute({
      ...baseInput,
      secondary_ops: [
        { name: "deburr", cost: 0.5 },
        { name: "wash", cost: 0.3 },
        { name: "inspect", cost: 0.75 },
      ],
    });
    expect(r.buckets.secondary).toBeCloseTo(1.55, 2);
  });

  it("total_cost_with_scrap_amortized = sum of all buckets", () => {
    const r = lathePartCostModelEngine.compute({ ...baseInput, scrap_rate: 0.05 });
    const sum =
      r.buckets.machine +
      r.buckets.tool +
      r.buckets.material +
      r.buckets.setup +
      r.buckets.quality +
      r.buckets.energy +
      r.buckets.secondary;
    expect(r.total_cost_with_scrap_amortized).toBeCloseTo(sum, 2);
  });

  it("breakdown percentages sum to ~100", () => {
    const r = lathePartCostModelEngine.compute({ ...baseInput, scrap_rate: 0.02 });
    const pctSum = Object.values(r.breakdown_pct).reduce((s, v) => s + v, 0);
    expect(pctSum).toBeCloseTo(100, 0);
  });

  it("throws on batch_size <= 0", () => {
    expect(() =>
      lathePartCostModelEngine.compute({ ...baseInput, batch_size: 0 }),
    ).toThrow(/batch_size/);
  });

  it("skips ops with zero tool life", () => {
    const r = lathePartCostModelEngine.compute({
      ...baseInput,
      operations: [
        {
          op: "bad",
          cycle_time_s: 60,
          tool_life_s: 0,
          insert_cost: 10,
          edges_per_insert: 1,
        },
      ],
    });
    expect(r.per_op_tool_cost["bad"]).toBeUndefined();
  });

  it("clamps scrap rate to [0,1]", () => {
    const r = lathePartCostModelEngine.compute({ ...baseInput, scrap_rate: 1.5 });
    // Scrap clamped to 1 → perPartInvested × 10 (cap)
    expect(r.buckets.quality).toBeGreaterThan(0);
  });

  it("getStats returns 7 bucket names", () => {
    expect(lathePartCostModelEngine.getStats().buckets.length).toBe(7);
  });
});
