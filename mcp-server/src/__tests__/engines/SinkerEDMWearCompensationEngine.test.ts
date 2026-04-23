/**
 * SinkerEDMWearCompensationEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS56
 */
import { describe, it, expect } from "vitest";
import {
  SinkerEDMWearCompensationEngine,
  sinkerEDMWearCompensationEngine,
  type WearCompensationInput,
} from "../../engines/SinkerEDMWearCompensationEngine.js";

function baseInput(overrides: Partial<WearCompensationInput> = {}): WearCompensationInput {
  return {
    wear_ratio_pct: 15,
    cavity_depth_mm: 20,
    cavity_area_mm2: 600,
    electrode_material: "graphite_fine",
    aspect_ratio: 1.0,
    depth_tolerance_mm: 0.02,
    ...overrides,
  };
}

describe("SinkerEDMWearCompensationEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(sinkerEDMWearCompensationEngine).toBeInstanceOf(SinkerEDMWearCompensationEngine);
  });

  it("throws on negative wear_ratio_pct", () => {
    expect(() => sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: -1 }))).toThrow(/wear_ratio/);
  });

  it("throws on NaN wear_ratio_pct", () => {
    expect(() => sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: Number.NaN }))).toThrow(/wear_ratio/);
  });

  it("throws on non-positive depth or area", () => {
    expect(() => sinkerEDMWearCompensationEngine.plan(baseInput({ cavity_depth_mm: 0 }))).toThrow(/depth/);
    expect(() => sinkerEDMWearCompensationEngine.plan(baseInput({ cavity_area_mm2: 0 }))).toThrow(/area/);
  });

  it("picks single_sacrificial for low wear + normal AR", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 8 }));
    expect(out.strategy).toBe("single_sacrificial");
    expect(out.total_electrodes).toBe(1);
    expect(out.per_electrode[0].role).toBe("rough");
    expect(out.per_electrode[0].depth_fraction).toBeCloseTo(1.0, 6);
  });

  it("picks rough_and_finish for moderate wear", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 25 }));
    expect(out.strategy).toBe("rough_and_finish");
    expect(out.total_electrodes).toBe(2);
    expect(out.per_electrode[0].role).toBe("rough");
    expect(out.per_electrode[1].role).toBe("finish");
    expect(out.per_electrode[0].depth_fraction + out.per_electrode[1].depth_fraction).toBeCloseTo(1.0, 6);
  });

  it("picks rough_and_finish on tight depth tolerance even if wear is low", () => {
    const out = sinkerEDMWearCompensationEngine.plan(
      baseInput({ wear_ratio_pct: 10, depth_tolerance_mm: 0.01 }),
    );
    expect(out.strategy).toBe("rough_and_finish");
  });

  it("picks sacrificial_stack for high wear", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 45 }));
    expect(out.strategy).toBe("sacrificial_stack");
    expect(out.total_electrodes).toBe(3);
    expect(out.per_electrode[2].role).toBe("finish");
    // Depth fractions sum to 1.0
    const sum = out.per_electrode.reduce((s, p) => s + p.depth_fraction, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it("picks sacrificial_stack for very deep cavity (AR>5) regardless of wear", () => {
    const out = sinkerEDMWearCompensationEngine.plan(
      baseInput({ wear_ratio_pct: 10, aspect_ratio: 7 }),
    );
    expect(out.strategy).toBe("sacrificial_stack");
  });

  it("rough_oversize scales linearly with wear_ratio × depth", () => {
    const low = sinkerEDMWearCompensationEngine.plan(
      baseInput({ wear_ratio_pct: 10, cavity_depth_mm: 10 }),
    );
    const high = sinkerEDMWearCompensationEngine.plan(
      baseInput({ wear_ratio_pct: 10, cavity_depth_mm: 40 }),
    );
    // 4× depth should give ≈ 4× oversize
    expect(high.rough_oversize_mm / low.rough_oversize_mm).toBeCloseTo(4.0, 2);
  });

  it("rough_oversize applies safety factor", () => {
    const sfDefault = sinkerEDMWearCompensationEngine.plan(baseInput());
    const sfCustom = sinkerEDMWearCompensationEngine.plan(baseInput({ safety_factor: 2.0 }));
    // 2.0/1.3 ≈ 1.538 ratio
    expect(sfCustom.rough_oversize_mm / sfDefault.rough_oversize_mm).toBeCloseTo(2.0 / 1.3, 2);
  });

  it("redress interval reflects material wear rate (CuW > graphite)", () => {
    const graphite = sinkerEDMWearCompensationEngine.plan(
      baseInput({ electrode_material: "graphite_fine" }),
    );
    const cuW = sinkerEDMWearCompensationEngine.plan(
      baseInput({ electrode_material: "copper_tungsten" }),
    );
    // CuW wears 0.006 mm/min vs graphite 0.012 → 2× longer redress interval
    expect(cuW.per_electrode[0].redress_interval_min).toBeGreaterThan(
      graphite.per_electrode[0].redress_interval_min,
    );
  });

  it("flags extreme wear ratio with material-swap recommendation", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 60 }));
    expect(out.notes.some((n) => /copper-tungsten/i.test(n))).toBe(true);
  });

  it("flags small electrode face as higher effective wear rate", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ cavity_area_mm2: 30 }));
    expect(out.notes.some((n) => /small electrode face/i.test(n))).toBe(true);
  });

  it("flags extreme tight depth tolerance", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ depth_tolerance_mm: 0.003 }));
    expect(out.notes.some((n) => /dedicated finish electrode/i.test(n))).toBe(true);
  });

  it("total_wear_budget is sum of per-electrode budgets", () => {
    const out = sinkerEDMWearCompensationEngine.plan(baseInput({ wear_ratio_pct: 25 }));
    const sum = out.per_electrode.reduce((s, p) => s + p.wear_budget_mm, 0);
    expect(out.total_wear_budget_mm).toBeCloseTo(sum, 3);
  });

  it("pure — identical inputs → identical plan", () => {
    const a = sinkerEDMWearCompensationEngine.plan(baseInput());
    const b = sinkerEDMWearCompensationEngine.plan(baseInput());
    expect(a).toEqual(b);
  });
});
