/**
 * SpringbackPredictionEngine — PHASE23 wiring tests.
 *
 * Validates elastic-recovery model on thin-walls (cantilever beam),
 * thin-floors (plate bending), and rib/web/flange features. Asserts:
 *   - Cantilever deflection follows F·h³/(3EI) ordering vs fixed-fixed
 *     (factor-of-64 ratio between cantilever and fixed-fixed beams)
 *   - Springback ≤ max_deflection (springback is fraction that recovers)
 *   - within_tolerance flips correctly across the threshold
 *   - Compensation overcut ~85% of springback
 *   - Recommendations populate for low-stiffness / out-of-tolerance cases
 *   - AtomicValue envelope (value/unit/formula/confidence) is honored
 */
import { describe, it, expect } from "vitest";
import {
  SpringbackPredictionEngine,
  springbackPredictionEngine,
  type SpringbackInput,
} from "../engines/SpringbackPredictionEngine.js";

function thinWallInput(overrides: Partial<SpringbackInput> = {}): SpringbackInput {
  return {
    feature: {
      type: "thin_wall",
      thickness_mm: 2,
      height_mm: 30,
      length_mm: 80,
      support_condition: "cantilever",
    },
    material: {
      iso_group: "P",        // steel — E=210 GPa
    },
    cutting: {
      radial_force_n: 200,
      axial_depth_mm: 1,
      feed_per_tooth_mm: 0.05,
      passes: 2,
    },
    tolerance_mm: 0.05,
    ...overrides,
  };
}

describe("SpringbackPredictionEngine", () => {
  it("singleton is a real SpringbackPredictionEngine instance", () => {
    expect(springbackPredictionEngine).toBeInstanceOf(SpringbackPredictionEngine);
  });

  it("compute returns AtomicValue with mm unit and Ratchev formula", () => {
    const out = springbackPredictionEngine.compute(thinWallInput());
    expect(out.unit).toBe("mm");
    expect(out.formula).toContain("Ratchev");
    expect(out.confidence).toBe(0.75);
  });

  it("cantilever deflection > fixed-fixed for identical geometry/load", () => {
    const cant = springbackPredictionEngine.compute(thinWallInput()).value;
    const fixed = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 2,
          height_mm: 30,
          length_mm: 80,
          support_condition: "fixed_fixed",
        },
      }),
    ).value;
    // Beam theory: cantilever δ = FL³/(3EI), fixed-fixed = FL³/(192EI)
    // ratio = 192/3 = 64
    expect(cant.max_deflection_mm).toBeGreaterThan(fixed.max_deflection_mm);
    const ratio = cant.max_deflection_mm / Math.max(fixed.max_deflection_mm, 1e-9);
    expect(ratio).toBeGreaterThan(50);
    expect(ratio).toBeLessThan(80);
  });

  it("simply_supported deflection sits between cantilever and fixed-fixed", () => {
    const cant = springbackPredictionEngine.compute(thinWallInput()).value;
    const ss = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 2,
          height_mm: 30,
          length_mm: 80,
          support_condition: "simply_supported",
        },
      }),
    ).value;
    const fixed = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 2,
          height_mm: 30,
          length_mm: 80,
          support_condition: "fixed_fixed",
        },
      }),
    ).value;
    expect(ss.max_deflection_mm).toBeLessThan(cant.max_deflection_mm);
    expect(ss.max_deflection_mm).toBeGreaterThan(fixed.max_deflection_mm);
  });

  it("springback ≤ max_deflection (elastic component cannot exceed total)", () => {
    const v = springbackPredictionEngine.compute(thinWallInput()).value;
    expect(v.springback_mm).toBeLessThanOrEqual(v.max_deflection_mm);
    expect(v.springback_mm).toBeGreaterThanOrEqual(0);
  });

  it("within_tolerance true when force is tiny and tolerance is loose", () => {
    const v = springbackPredictionEngine.compute(
      thinWallInput({
        cutting: {
          radial_force_n: 5,
          axial_depth_mm: 0.2,
          feed_per_tooth_mm: 0.02,
          passes: 1,
        },
        tolerance_mm: 1.0,
      }),
    ).value;
    expect(v.within_tolerance).toBe(true);
  });

  it("within_tolerance false when force is huge and tolerance is tight", () => {
    const v = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 1,
          height_mm: 50,
          length_mm: 80,
          support_condition: "cantilever",
        },
        cutting: {
          radial_force_n: 800,
          axial_depth_mm: 2,
          feed_per_tooth_mm: 0.1,
          passes: 1,
        },
        tolerance_mm: 0.001,
      }),
    ).value;
    expect(v.within_tolerance).toBe(false);
    expect(v.total_error_mm).toBeGreaterThan(0.001);
  });

  it("compensation overcut ≈ 85% of springback", () => {
    const v = springbackPredictionEngine.compute(thinWallInput()).value;
    const expected = v.springback_mm * 0.85;
    // engine rounds to 4 decimals
    expect(Math.abs(v.compensation.overcut_mm - expected)).toBeLessThan(0.01);
  });

  it("compensation strategy string responds to stiffness ratio", () => {
    const stiff = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 10,
          height_mm: 5,
          length_mm: 80,
          support_condition: "fixed_fixed",
        },
        cutting: {
          radial_force_n: 1,
          axial_depth_mm: 0.1,
          feed_per_tooth_mm: 0.02,
          passes: 1,
        },
      }),
    ).value;
    expect(typeof stiff.compensation.strategy).toBe("string");
    expect(stiff.compensation.strategy.length).toBeGreaterThan(0);
  });

  it("recommends overcut compensation when overcut > tolerance/2", () => {
    const v = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 1.5,
          height_mm: 40,
          length_mm: 80,
          support_condition: "cantilever",
        },
        cutting: {
          radial_force_n: 300,
          axial_depth_mm: 1,
          feed_per_tooth_mm: 0.05,
          passes: 2,
        },
        tolerance_mm: 0.02,
      }),
    ).value;
    const hasOvercut = v.recommendations.some(r => r.toLowerCase().includes("overcut"));
    expect(hasOvercut).toBe(true);
  });

  it("flags H/t > 15 cantilever as very flexible", () => {
    const v = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_wall",
          thickness_mm: 1,
          height_mm: 30,           // H/t = 30 > 15
          length_mm: 80,
          support_condition: "cantilever",
        },
      }),
    ).value;
    const hasFlex = v.recommendations.some(r => r.toLowerCase().includes("flexible") || r.toLowerCase().includes("h/t"));
    expect(hasFlex).toBe(true);
  });

  it("thin_floor uses plate-bending model (different from cantilever wall)", () => {
    const wall = springbackPredictionEngine.compute(thinWallInput()).value;
    const floor = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "thin_floor",
          thickness_mm: 2,
          height_mm: 30,
          length_mm: 80,
          support_condition: "simply_supported",
        },
      }),
    ).value;
    // Different formula → different deflection (not equal)
    expect(floor.max_deflection_mm).not.toBe(wall.max_deflection_mm);
    expect(Number.isFinite(floor.max_deflection_mm)).toBe(true);
  });

  it("aluminum (N) has higher deflection than steel (P) at same load", () => {
    const steel = springbackPredictionEngine.compute(thinWallInput()).value;
    const alu = springbackPredictionEngine.compute(
      thinWallInput({ material: { iso_group: "N" } }),
    ).value;
    // Aluminum E=70 GPa vs steel E=210 GPa → ~3x more deflection
    expect(alu.max_deflection_mm).toBeGreaterThan(steel.max_deflection_mm);
  });

  it("explicit youngs_modulus_gpa overrides ISO-group default", () => {
    const def = springbackPredictionEngine.compute(thinWallInput()).value;
    const overridden = springbackPredictionEngine.compute(
      thinWallInput({ material: { iso_group: "P", youngs_modulus_gpa: 100 } }),
    ).value;
    // E=100 instead of 210 → larger deflection
    expect(overridden.max_deflection_mm).toBeGreaterThan(def.max_deflection_mm);
  });

  it("natural_frequency_hz is positive for valid wall geometry", () => {
    const v = springbackPredictionEngine.compute(thinWallInput()).value;
    expect(v.natural_frequency_hz).toBeGreaterThan(0);
    expect(Number.isFinite(v.natural_frequency_hz)).toBe(true);
  });

  it("rib feature follows wall (cantilever-style) path, returns finite deflection", () => {
    const v = springbackPredictionEngine.compute(
      thinWallInput({
        feature: {
          type: "rib",
          thickness_mm: 3,
          height_mm: 25,
          length_mm: 60,
          support_condition: "cantilever",
        },
      }),
    ).value;
    expect(v.max_deflection_mm).toBeGreaterThan(0);
    expect(Number.isFinite(v.max_deflection_mm)).toBe(true);
  });

  it("class instances are independent of singleton", () => {
    const fresh = new SpringbackPredictionEngine();
    expect(fresh).not.toBe(springbackPredictionEngine);
    const v = fresh.compute(thinWallInput()).value;
    expect(v.max_deflection_mm).toBeGreaterThan(0);
  });
});
