/**
 * ExpandingMandrelEngine Test Suite
 */

import { describe, it, expect } from "vitest";
import { expandingMandrelEngine } from "../engines/ExpandingMandrelEngine.js";

function baseInput(overrides: Partial<any> = {}): any {
  return {
    mandrel: {
      nominal_od_mm: 50.0,
      expanded_od_mm: 50.05,
      grip_length_mm: 40,
      material: "4140",
    },
    part: {
      bore_id_mm: 50.0,
      material: "4140",
      outer_od_mm: 100,
      mass_kg: 2.5,
      wall_thickness_mm: 25,
    },
    actuator_force_n: 5000,
    rpm: 2000,
    mu: 0.15,
    ...overrides,
  };
}

describe("ExpandingMandrelEngine", () => {
  it("computes grip pressure from interference fit", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    // p = E × δ / D = 205000 × 0.05 / 50 = 205 MPa
    expect(r.grip_pressure_mpa).toBeCloseTo(205, 0);
  });

  it("warns on zero interference", () => {
    const r = expandingMandrelEngine.analyze(
      baseInput({
        mandrel: { nominal_od_mm: 50, expanded_od_mm: 50, grip_length_mm: 40, material: "4140" },
      })
    );
    expect(r.warnings.some((w) => /interference/i.test(w))).toBe(true);
  });

  it("computes contact area correctly", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    // π × 50 × 40 ≈ 6283 mm²
    expect(r.contact_area_mm2).toBeCloseTo(6283, 0);
  });

  it("computes max transmitted torque", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    expect(r.max_transmitted_torque_nm).toBeGreaterThan(0);
  });

  it("centrifugal loss rises with RPM", () => {
    const lowRpm = expandingMandrelEngine.analyze(baseInput({ rpm: 500 }));
    const highRpm = expandingMandrelEngine.analyze(baseInput({ rpm: 5000 }));
    expect(highRpm.centrifugal_loss_mpa).toBeGreaterThan(lowRpm.centrifugal_loss_mpa);
  });

  it("caps max_safe_rpm based on centrifugal limits", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    expect(r.max_safe_rpm).toBeGreaterThan(0);
  });

  it("flags high-RPM as unsafe", () => {
    const r = expandingMandrelEngine.analyze(baseInput({ rpm: 100000 }));
    expect(r.grips_safely).toBe(false);
    expect(r.warnings.some((w) => /RPM/i.test(w))).toBe(true);
  });

  it("detects cutting torque exceeding grip capacity", () => {
    const r = expandingMandrelEngine.analyze(
      baseInput({ cutting_force_n: 100000 })
    );
    expect(r.grips_safely).toBe(false);
    expect(r.warnings.some((w) => /slip/i.test(w))).toBe(true);
  });

  it("reports radial deformation when wall thickness provided", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    expect(r.radial_deformation_um).toBeDefined();
    expect(r.radial_deformation_um!).toBeGreaterThan(0);
  });

  it("warns when radial deformation exceeds 20 μm", () => {
    const r = expandingMandrelEngine.analyze(
      baseInput({
        mandrel: {
          nominal_od_mm: 100,
          expanded_od_mm: 100.1, // match bore + interference
          grip_length_mm: 40,
          material: "4140",
        },
        part: {
          bore_id_mm: 100,
          material: "4140",
          outer_od_mm: 150,
          wall_thickness_mm: 1.5, // thin wall
        },
      })
    );
    expect(r.warnings.some((w) => /deformation|ovality/i.test(w))).toBe(true);
  });

  it("warns when grip pressure exceeds 60% of yield", () => {
    const r = expandingMandrelEngine.analyze(
      baseInput({
        mandrel: {
          nominal_od_mm: 50,
          expanded_od_mm: 50.2, // large interference
          grip_length_mm: 40,
          material: "4140",
        },
      })
    );
    expect(r.warnings.some((w) => /yield/i.test(w))).toBe(true);
  });

  it("safety_factor > 1 for nominal grip", () => {
    const r = expandingMandrelEngine.analyze(baseInput());
    expect(r.safety_factor).toBeGreaterThan(1);
  });

  it("recommendExpansion inverts the grip pressure formula", () => {
    const { expanded_od_mm, interference_mm } =
      expandingMandrelEngine.recommendExpansion(50.0, 100);
    // p = E × δ / D → δ = p × D / E = 100 × 50 / 205000 ≈ 0.0244
    expect(interference_mm).toBeCloseTo(0.0244, 3);
    expect(expanded_od_mm).toBeCloseTo(50.0244, 3);
  });

  it("getStats reports supported materials + formulas", () => {
    const s = expandingMandrelEngine.getStats();
    expect(s.supported_mandrel_materials).toContain("4140");
    expect(s.supported_part_materials).toContain("Ti-6Al-4V");
    expect(s.formulas.length).toBe(3);
  });
});
