import { describe, it, expect } from "vitest";
import {
  millPartCostModelEngine as eng,
  type MillPartCostInput,
} from "../engines/MillPartCostModelEngine.js";

function nominal(o: Partial<MillPartCostInput> = {}): MillPartCostInput {
  return {
    cycle_time_s: 600,
    machine_rate_per_hr: 90,
    operations: [
      { op: "rough_pocket", cycle_time_s: 300, tool_life_s: 600, tool_cost: 50, edges_per_tool: 4 },
      { op: "finish_face", cycle_time_s: 200, tool_life_s: 1200, tool_cost: 30, edges_per_tool: 4 },
    ],
    part_mass_kg: 0.5,
    waste_mass_kg: 0.1,
    material_price_per_kg: 10,
    setup_time_s: 1800,
    setup_rate_per_hr: 50,
    batch_size: 100,
    scrap_rate: 0.02,
    spindle_power_kw: 5,
    energy_price_per_kwh: 0.15,
    secondary_ops: [{ name: "deburr", cost: 1 }, { name: "wash", cost: 1 }],
    fixture_amort_total: 500,
    ...o,
  };
}

describe("MillPartCostModelEngine", () => {
  it("getStats reports 8 buckets + fixture as mill-canonical extension", () => {
    const s = eng.getStats();
    expect(s.buckets).toEqual(["machine", "tool", "material", "setup", "quality", "energy", "secondary", "fixture"]);
    expect(s.mill_canonical_extensions).toEqual(["fixture"]);
    expect(s.reference).toMatch(/Armarego|Trent.*Wright|ISO 3685|SME/);
  });

  it("throws on missing or invalid inputs", () => {
    expect(() => eng.compute({} as never)).toThrow(/cycle_time_s must be >= 0/);
    expect(() => eng.compute(nominal({ batch_size: 0 }))).toThrow(/batch_size must be > 0/);
    expect(() => eng.compute(nominal({ part_mass_kg: -1 }))).toThrow(/part_mass_kg must be >= 0/);
  });

  it("machine bucket = cycle_hr × machine_rate", () => {
    const r = eng.compute(nominal());
    // 600s = 1/6 hr; 1/6 × 90 = $15
    expect(r.buckets.machine).toBe(15);
  });

  it("tool bucket sums per-op amortization: edge_cost / tool_life × cycle_time", () => {
    const r = eng.compute(nominal());
    // Op 1: edge=50/4=$12.5; amort/sec=12.5/600=0.0208; × 300s = $6.25
    // Op 2: edge=30/4=$7.5;  amort/sec=7.5/1200=0.00625; × 200s = $1.25
    // Total = $7.5
    expect(r.buckets.tool).toBeCloseTo(7.5, 2);
    expect(r.per_op_tool_cost["rough_pocket"]).toBeCloseTo(6.25, 2);
    expect(r.per_op_tool_cost["finish_face"]).toBeCloseTo(1.25, 2);
  });

  it("material bucket = (part + waste) × price", () => {
    const r = eng.compute(nominal());
    // (0.5 + 0.1) × 10 = $6
    expect(r.buckets.material).toBe(6);
  });

  it("setup bucket = setup_hr × rate / batch_size", () => {
    const r = eng.compute(nominal());
    // 1800s = 0.5hr; 0.5 × 50 / 100 = $0.25
    expect(r.buckets.setup).toBe(0.25);
  });

  it("quality bucket = scrap_rate × (material + machine)", () => {
    const r = eng.compute(nominal());
    // 0.02 × (6 + 15) = $0.42
    expect(r.buckets.quality).toBeCloseTo(0.42, 2);
  });

  it("energy bucket = power_kW × cycle_hr × price/kWh", () => {
    const r = eng.compute(nominal());
    // 5 × (600/3600) × 0.15 = $0.125
    expect(r.buckets.energy).toBeCloseTo(0.125, 3);
  });

  it("secondary bucket sums named ops", () => {
    const r = eng.compute(nominal());
    expect(r.buckets.secondary).toBe(2);
  });

  it("fixture bucket = fixture_amort_total / batch_size (MILL-CANONICAL 8th bucket)", () => {
    const r = eng.compute(nominal());
    expect(r.buckets.fixture).toBe(5); // 500 / 100
  });

  it("total = sum of all 8 buckets", () => {
    const r = eng.compute(nominal());
    const expected = 15 + 7.5 + 6 + 0.25 + 0.42 + 0.125 + 2 + 5;
    expect(r.total_cost).toBeCloseTo(expected, 2);
  });

  it("total_cost_with_scrap_amortized = total / (1 - scrap_rate)", () => {
    const r = eng.compute(nominal());
    expect(r.total_cost_with_scrap_amortized).toBeCloseTo(r.total_cost / 0.98, 2);
  });

  it("breakdown_pct sums to ~100 across all buckets", () => {
    const r = eng.compute(nominal());
    const sum = Object.values(r.breakdown_pct).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it("zero fixture cost handled correctly (no fixture bucket text in reasoning)", () => {
    const r = eng.compute(nominal({ fixture_amort_total: 0 }));
    expect(r.buckets.fixture).toBe(0);
    expect(r.reasoning.every(s => !/Fixture amort/.test(s))).toBe(true);
  });

  it("zero energy params → energy bucket = 0", () => {
    const r = eng.compute(nominal({ spindle_power_kw: 0, energy_price_per_kwh: 0 }));
    expect(r.buckets.energy).toBe(0);
  });

  it("scrap rate 0 → total = total_with_scrap_amortized", () => {
    const r = eng.compute(nominal({ scrap_rate: 0 }));
    expect(r.total_cost).toBeCloseTo(r.total_cost_with_scrap_amortized, 4);
  });

  it("scrap rate 0.5 → 2x scrap-amortized cost (every other part scraps)", () => {
    const r = eng.compute(nominal({ scrap_rate: 0.5 }));
    expect(r.total_cost_with_scrap_amortized).toBeCloseTo(r.total_cost / 0.5, 1);
  });

  it("per_op_tool_cost has entry per operation", () => {
    const r = eng.compute(nominal());
    expect(Object.keys(r.per_op_tool_cost)).toEqual(["rough_pocket", "finish_face"]);
  });

  it("operations with tool_life_s=0 produce 0 tool cost for that op (no division by zero)", () => {
    const r = eng.compute(nominal({
      operations: [
        { op: "no_life_op", cycle_time_s: 100, tool_life_s: 0, tool_cost: 50, edges_per_tool: 4 },
        { op: "normal_op", cycle_time_s: 200, tool_life_s: 1000, tool_cost: 30, edges_per_tool: 4 },
      ],
    }));
    expect(r.per_op_tool_cost["no_life_op"]).toBe(0);
    expect(r.per_op_tool_cost["normal_op"]).toBeGreaterThan(0);
  });

  it("holder_amort_per_edge adds to tool cost (e.g., shrink-fit holder wear)", () => {
    const rWithout = eng.compute(nominal({
      operations: [{ op: "op", cycle_time_s: 300, tool_life_s: 600, tool_cost: 50, edges_per_tool: 4 }],
    }));
    const rWith = eng.compute(nominal({
      operations: [{ op: "op", cycle_time_s: 300, tool_life_s: 600, tool_cost: 50, edges_per_tool: 4, holder_amort_per_edge: 1 }],
    }));
    expect(rWith.buckets.tool).toBeGreaterThan(rWithout.buckets.tool);
  });

  it("batch_size scales setup AND fixture buckets (1/N each)", () => {
    const r1 = eng.compute(nominal({ batch_size: 1 }));
    const r100 = eng.compute(nominal({ batch_size: 100 }));
    expect(r1.buckets.setup).toBeCloseTo(r100.buckets.setup * 100, 2);
    expect(r1.buckets.fixture).toBeCloseTo(r100.buckets.fixture * 100, 2);
  });

  it("reasoning array narrates per-bucket cost with values", () => {
    const r = eng.compute(nominal());
    expect(r.reasoning.some(s => /Machine \$15/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Material \$6/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Fixture amort \$5/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Total \$/.test(s))).toBe(true);
  });

  it("empty operations array → tool bucket = 0", () => {
    const r = eng.compute(nominal({ operations: [] }));
    expect(r.buckets.tool).toBe(0);
    expect(r.per_op_tool_cost).toEqual({});
  });
});
