/**
 * ChuckJawForceEngine Physics Validation Tests
 * Verifies the centrifugal grip-loss / required-grip physics that the lathe print->program
 * pipeline relies on for its chuck-jaw overspeed advisory (U-W-WIRE-CHUCK-JAW-GRIP).
 * R9: behavioral / monotonic invariants on the actual force physics (no stub asserts).
 */
import { describe, it, expect } from "vitest";
import { chuckJawForceEngine } from "../engines/ChuckJawForceEngine.js";

// A representative 50mm steel bar in a 3-jaw power chuck under a 1.5kN tangential cut.
const baseInput = {
  chuck_type: "3_jaw_power" as const,
  jaw_type: "hard" as const,
  num_jaws: 3,
  workpiece_mass_kg: 2.0,
  workpiece_od_mm: 50,
  workpiece_length_mm: 150,
  gripping_diameter_mm: 50,
  gripping_length_mm: 30,
  spindle_rpm: 1500,
  max_spindle_rpm: 4000,
  cutting_force_tangential_N: 1500,
  cutting_force_radial_N: 600,
  cutting_force_axial_N: 750,
};

describe("ChuckJawForceEngine - centrifugal grip-loss physics", () => {
  it("centrifugal force grows with the SQUARE of spindle RPM (F_cf = m*omega^2*r)", () => {
    const lo = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 1000 });
    const hi = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 2000 });
    // 2x rpm -> ~4x centrifugal force
    expect(hi.centrifugal_force_N / Math.max(lo.centrifugal_force_N, 1)).toBeCloseTo(4, 0);
  });

  it("grip-loss percentage increases monotonically with RPM (jaws thrown outward)", () => {
    const r1000 = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 1000 });
    const r3000 = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 3000 });
    expect(r3000.grip_loss_at_rpm_pct).toBeGreaterThan(r1000.grip_loss_at_rpm_pct);
  });

  it("required gripping force increases with the cutting force", () => {
    const light = chuckJawForceEngine.calculate({ ...baseInput, cutting_force_tangential_N: 500 });
    const heavy = chuckJawForceEngine.calculate({ ...baseInput, cutting_force_tangential_N: 3000 });
    expect(heavy.required_gripping_force_N).toBeGreaterThan(light.required_gripping_force_N);
  });

  it("max_safe_rpm is finite + positive for a normal part (the overspeed ceiling the pipeline flags)", () => {
    const r = chuckJawForceEngine.calculate(baseInput);
    expect(Number.isFinite(r.max_safe_rpm)).toBe(true);
    expect(r.max_safe_rpm).toBeGreaterThan(0);
  });

  it("a heavier workpiece at the same RPM loses MORE grip (centrifugal scales with mass)", () => {
    const light = chuckJawForceEngine.calculate({ ...baseInput, workpiece_mass_kg: 1.0 });
    const heavy = chuckJawForceEngine.calculate({ ...baseInput, workpiece_mass_kg: 5.0 });
    expect(heavy.centrifugal_force_N).toBeGreaterThan(light.centrifugal_force_N);
  });

  it("returns a well-formed result (is_safe boolean, deformation-risk enum, recommendations)", () => {
    const r = chuckJawForceEngine.calculate(baseInput);
    expect(typeof r.is_safe).toBe("boolean");
    expect(["none", "low", "high"]).toContain(r.workpiece_deformation_risk);
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("a collet (higher num/clamp uniformity) and a 3-jaw both produce a finite required grip", () => {
    const collet = chuckJawForceEngine.calculate({ ...baseInput, chuck_type: "collet", num_jaws: 1 });
    const jaw3 = chuckJawForceEngine.calculate({ ...baseInput, chuck_type: "3_jaw_power", num_jaws: 3 });
    expect(collet.required_gripping_force_N).toBeGreaterThan(0);
    expect(jaw3.required_gripping_force_N).toBeGreaterThan(0);
  });

  it("min_chuck_pressure_bar is positive for a real grip requirement", () => {
    const r = chuckJawForceEngine.calculate(baseInput);
    expect(r.min_chuck_pressure_bar).toBeGreaterThan(0);
  });

  it("higher jaw friction (soft jaws) needs LESS gripping force than low-friction hard jaws", () => {
    const hard = chuckJawForceEngine.calculate({ ...baseInput, jaw_type: "hard" }); // lower mu -> more grip
    const soft = chuckJawForceEngine.calculate({ ...baseInput, jaw_type: "soft" }); // higher mu -> less grip
    expect(soft.required_gripping_force_N).toBeLessThan(hard.required_gripping_force_N);
  });

  it("a benign low-RPM cut has far less grip-loss than a high-RPM cut (centrifugal screen works)", () => {
    const benign = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 400 });
    const fast = chuckJawForceEngine.calculate({ ...baseInput, spindle_rpm: 3500 });
    expect(benign.grip_loss_at_rpm_pct).toBeLessThan(fast.grip_loss_at_rpm_pct);
  });
});
