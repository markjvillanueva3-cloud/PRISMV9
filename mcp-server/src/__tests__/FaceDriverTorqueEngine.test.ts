/**
 * FaceDriverTorqueEngine Test Suite
 */
import { describe, it, expect } from "vitest";
import { faceDriverTorqueEngine } from "../engines/FaceDriverTorqueEngine.js";

const driver = {
  pin_count: 4,
  pin_diameter_mm: 6,
  penetration_depth_mm: 1.0,
  pin_circle_radius_mm: 25,
  pin_hardness_hrc: 58,
};

const part = {
  name: "4140",
  yield_strength_mpa: 655,
  hardness_hrc: 28,
};

describe("FaceDriverTorqueEngine", () => {
  it("computes positive max torque for sound config", () => {
    const r = faceDriverTorqueEngine.analyze(driver, part);
    expect(r.max_torque_nm).toBeGreaterThan(0);
  });

  it("bite area = count × diameter × penetration", () => {
    const r = faceDriverTorqueEngine.analyze(driver, part);
    expect(r.bite_area_total_mm2).toBeCloseTo(24, 0); // 4 × 6 × 1 = 24
  });

  it("warns when pins softer than part", () => {
    const hardPart = { ...part, hardness_hrc: 62 };
    const r = faceDriverTorqueEngine.analyze(driver, hardPart);
    expect(r.pins_harder_than_part).toBe(false);
    expect(r.warnings.some((w) => /deform/i.test(w))).toBe(true);
  });

  it("warns when pin count < 3", () => {
    const r = faceDriverTorqueEngine.analyze({ ...driver, pin_count: 2 }, part);
    expect(r.warnings.some((w) => /pins/.test(w))).toBe(true);
  });

  it("warns on shallow penetration < 0.5mm", () => {
    const r = faceDriverTorqueEngine.analyze(
      { ...driver, penetration_depth_mm: 0.3 },
      part
    );
    expect(r.warnings.some((w) => /shallow/i.test(w))).toBe(true);
  });

  it("computes safety factor vs required torque", () => {
    const r = faceDriverTorqueEngine.analyze(driver, part, 100);
    expect(r.safety_factor_vs_required).toBeDefined();
    expect(r.safety_factor_vs_required!).toBeGreaterThan(0);
  });

  it("warns on safety factor < 1.5", () => {
    const r = faceDriverTorqueEngine.analyze(driver, part, 10000);
    expect(r.warnings.some((w) => /safety factor/i.test(w))).toBe(true);
  });

  it("recommendPenetration inverts the formula", () => {
    const rec = faceDriverTorqueEngine.recommendPenetration(
      500,
      {
        pin_count: 4,
        pin_diameter_mm: 6,
        pin_circle_radius_mm: 25,
        pin_hardness_hrc: 58,
      },
      part
    );
    expect(rec.penetration_depth_mm).toBeGreaterThan(0);
    expect(rec.achievable).toBe(true);
  });

  it("recommendPenetration flags impractical depths", () => {
    const rec = faceDriverTorqueEngine.recommendPenetration(
      100000,
      {
        pin_count: 4,
        pin_diameter_mm: 6,
        pin_circle_radius_mm: 25,
        pin_hardness_hrc: 58,
      },
      part
    );
    expect(rec.achievable).toBe(false);
  });

  it("per-pin force scales with yield strength", () => {
    const softer = faceDriverTorqueEngine.analyze(driver, { ...part, yield_strength_mpa: 300 });
    const harder = faceDriverTorqueEngine.analyze(driver, { ...part, yield_strength_mpa: 1200 });
    expect(harder.per_pin_force_n).toBeGreaterThan(softer.per_pin_force_n);
  });

  it("max torque scales with pin count", () => {
    const fewer = faceDriverTorqueEngine.analyze({ ...driver, pin_count: 3 }, part);
    const more = faceDriverTorqueEngine.analyze({ ...driver, pin_count: 8 }, part);
    expect(more.max_torque_nm).toBeGreaterThan(fewer.max_torque_nm);
  });

  it("getStats reports formula + safety factor", () => {
    const s = faceDriverTorqueEngine.getStats();
    expect(s.formula).toContain("T_max");
    expect(s.safety_factor).toBe(0.7);
  });
});
