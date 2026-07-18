/**
 * LATHE-WIRE-MS0/U-LATHE-CHUCK-JAW-WIRE — real-behavior tests for the chuck-jaw force safety surface.
 *
 * Two things ship here: (1) a FIX to ChuckJawForceEngine's degenerate is_safe verdict (it tested
 * sf >= SAFETY_FACTOR_MIN, double-counting the 2.5x already baked into requiredWithSafety → is_safe
 * was structurally false for EVERY rotating job; physics-review confirmed the fix sf >= 1.0 is a
 * correctness fix, not a softening — the 2.5x stays enforced in requiredWithSafety). (2) the wiring
 * of calculate + validate onto prism_turning.
 *
 * The first test is the fail-on-revert REGRESSION ORACLE: the physics-reviewer's worked case
 * (2 kg part, 800 rpm, 2.47x margin) MUST report is_safe=true. Pre-fix it reported false.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { chuckJawForceEngine as chuck } from "../engines/ChuckJawForceEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);

// Physics-reviewer's worked case: a manifestly-safe rotating part (sf ≈ 2.47, well within max safe rpm).
const safePart = {
  chuck_type: "3_jaw_power" as const,
  jaw_type: "hard" as const,
  num_jaws: 3,
  workpiece_mass_kg: 2,
  workpiece_od_mm: 60,
  workpiece_length_mm: 100,
  gripping_diameter_mm: 50,
  gripping_length_mm: 25,
  spindle_rpm: 800,
  max_spindle_rpm: 4000,
  cutting_force_tangential_N: 800,
  cutting_force_radial_N: 200,
  cutting_force_axial_N: 300,
};

describe("U-LATHE-CHUCK-JAW-WIRE — degenerate is_safe FIX (regression oracle)", () => {
  it("a manifestly-safe rotating part reports is_safe=true (PRE-FIX this was structurally false for ALL rpm>0)", () => {
    const r = chuck.calculate(safePart);
    expect(r.is_safe).toBe(true);
    // sf lands in the healthy post-fix band: above the base requirement (1.0), at/below the 2.5x design margin.
    expect(r.safety_factor).toBeGreaterThan(1.0);
    expect(r.safety_factor).toBeLessThanOrEqual(2.5);
    expect(r.required_gripping_force_N).toBeGreaterThan(0);
    expect(r.max_safe_rpm).toBeGreaterThan(safePart.spindle_rpm);
  });

  it("a tiny-grip high-rpm part (jaw centrifugal grip-loss exceeds grip) is correctly flagged UNSAFE", () => {
    // 3 mm grip on a 5 kg part at 4000 rpm with negligible cutting load: jaw centrifugal force
    // dominates → sf collapses below 1.0 → the part would be thrown. The gate MUST catch this
    // (post-fix is_safe still discriminates real danger; it is not always-true).
    const danger = chuck.calculate({
      ...safePart,
      workpiece_mass_kg: 5,
      workpiece_od_mm: 5,
      gripping_diameter_mm: 3,
      jaw_type: "soft",
      spindle_rpm: 4000,
      max_spindle_rpm: 6000,
      cutting_force_tangential_N: 1,
      cutting_force_radial_N: 1,
      cutting_force_axial_N: 1,
    });
    expect(danger.safety_factor).toBeLessThan(1.0);
    expect(danger.is_safe).toBe(false);
    expect(danger.recommendations.some((r) => /SAFETY/i.test(r))).toBe(true);
  });
});

describe("U-LATHE-CHUCK-JAW-WIRE — physics + result shape", () => {
  it("centrifugal force grows with rpm² (doubling rpm ~quadruples it)", () => {
    const lo = chuck.calculate({ ...safePart, spindle_rpm: 500 });
    const hi = chuck.calculate({ ...safePart, spindle_rpm: 1000 });
    expect(hi.centrifugal_force_N).toBeGreaterThan(lo.centrifugal_force_N);
    // F_cf = m·ω²·r → 2× rpm ⇒ ~4× force (allow slack for rounding)
    expect(hi.centrifugal_force_N / Math.max(1, lo.centrifugal_force_N)).toBeGreaterThan(3);
  });

  it("a thin-walled part is flagged high deformation risk", () => {
    const thin = chuck.calculate({ ...safePart, workpiece_od_mm: 51, gripping_diameter_mm: 50 }); // 0.5mm wall
    expect(thin.workpiece_deformation_risk).toBe("high");
  });

  it("validate mirrors calculate's verdict and returns a message", () => {
    const v = chuck.validate(safePart);
    expect(v.safe).toBe(chuck.calculate(safePart).is_safe);
    expect(typeof v.message).toBe("string");
    expect(v.message.length).toBeGreaterThan(0);
  });
});

describe("U-LATHE-CHUCK-JAW-WIRE — dispatcher + schema wiring", () => {
  it("turningDispatcher has ACTIONS entries + the grouped case for both chuck-jaw actions", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of ["lathe_chuck_jaw_force", "lathe_chuck_jaw_validate"]) {
      expect(src.includes(`"${a}",`)).toBe(true);
      expect(src.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("schema requires the core force inputs; rejects missing mass + bad jaw_type enum + null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_chuck_jaw_force!.safeParse(safePart).success).toBe(true);
    expect(m.lathe_chuck_jaw_validate!.safeParse(safePart).success).toBe(true);
    const { workpiece_mass_kg: _omit, ...noMass } = safePart;
    expect(m.lathe_chuck_jaw_force!.safeParse(noMass).success).toBe(false); // missing required mass
    expect(m.lathe_chuck_jaw_force!.safeParse({ ...safePart, jaw_type: "bogus" }).success).toBe(false); // bad enum
    expect(m.lathe_chuck_jaw_force!.safeParse(null).success).toBe(false);
  });
});
