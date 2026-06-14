/**
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-SF-CSS-CHIPLOAD
 *
 * Engine-surface contract test for CSSChipLoadInvariantCoordinatorEngine wired
 * into prism_calc:css_chipload_analyze.
 *
 * Verifies Kienzle / Kronenberg physics invariants:
 *   - computeRPM = 1000·Vc / (π·D)  (G96 CSS conversion)
 *   - computeChipThickness = f·sin(κ_r)  (chip-geometry definition)
 *   - computeKienzleForce = kc1.1·b·h^(1-mc)  (Kienzle cutting-force law)
 *   - computeCompensatedFeed round-trips chip-thickness invariant
 *   - validateSlewRate true iff |Δf|/Δt ≤ max
 *   - analyze() emits a valid result, rpm_clamp respected when Vc/D would
 *     drive RPM above max_spindle_rpm, face-center risk flagged when end
 *     diameter < 5 mm during facing
 *
 * Sister to [[reference_iter4_gilbert_clean_attribution_2026_05_20]] and
 * [[reference_iter5_barpitch_2026_05_20]] (if extracted) — third pure-math
 * SF wire in a row. No NN, no random-init.
 */
import { describe, it, expect } from "vitest";
import { CSSChipLoadInvariantCoordinatorEngine } from "../engines/CSSChipLoadInvariantCoordinatorEngine.js";

const STEEL_FACING = {
  cutting_speed_m_min: 200,
  base_feed_mm_rev: 0.25,
  lead_angle_deg: 90,
  depth_of_cut_mm: 1.5,
  diameter_start_mm: 100,
  diameter_end_mm: 20,    // facing toward center
  material_kc1_1_MPa: 2100, // ISO group M (canonical)
  material_mc: 0.25,
  max_spindle_rpm: 4000,
  spindle_accel_time_ms: 300,
  max_feed_slew_rate_mm_rev_s: 50,
  z_travel_mm: 5,
};

describe("U-WIRE-BACKLOG-SF-CSS-CHIPLOAD — css_chipload engine surface", () => {
  it("computeRPM: matches RPM = 1000·Vc / (π·D)", () => {
    const Vc = 200, D = 50;
    const expectedRpm = (1000 * Vc) / (Math.PI * D);
    expect(CSSChipLoadInvariantCoordinatorEngine.computeRPM(Vc, D)).toBeCloseTo(expectedRpm, 6);
  });

  it("computeRPM: returns Infinity at diameter <= 0 (singularity guard)", () => {
    expect(CSSChipLoadInvariantCoordinatorEngine.computeRPM(200, 0)).toBe(Infinity);
    expect(CSSChipLoadInvariantCoordinatorEngine.computeRPM(200, -1)).toBe(Infinity);
  });

  it("computeChipThickness: matches f·sin(κ_r) — 90° gives f directly", () => {
    expect(CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(0.25, 90)).toBeCloseTo(0.25, 6);
    expect(CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(0.25, 45)).toBeCloseTo(0.25 * Math.SQRT1_2, 6);
  });

  it("computeKienzleForce: matches kc1.1·b·h^(1-mc)", () => {
    const kc = 2100, b = 1.5, h = 0.25, mc = 0.25;
    const expected = kc * b * Math.pow(h, 1 - mc);
    expect(CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(kc, b, h, mc)).toBeCloseTo(expected, 6);
  });

  it("computeKienzleForce: chip thickness <= 0 returns 0 (no contact)", () => {
    expect(CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(2100, 1.5, 0, 0.25)).toBe(0);
    expect(CSSChipLoadInvariantCoordinatorEngine.computeKienzleForce(2100, 1.5, -0.1, 0.25)).toBe(0);
  });

  it("computeCompensatedFeed round-trips chip-thickness invariant", () => {
    const targetH = 0.20, leadDeg = 60;
    const f = CSSChipLoadInvariantCoordinatorEngine.computeCompensatedFeed(targetH, leadDeg);
    const hRecovered = CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(f, leadDeg);
    expect(hRecovered).toBeCloseTo(targetH, 6);
  });

  it("validateSlewRate: true iff |Δf|/Δt ≤ max", () => {
    // Δf=10 over 1s, max=50 → slew=10, passes
    expect(CSSChipLoadInvariantCoordinatorEngine.validateSlewRate(0.10, 0.20, 1, 50)).toBe(true);
    // Δf=100 over 1s, max=50 → slew=100, fails
    expect(CSSChipLoadInvariantCoordinatorEngine.validateSlewRate(0.10, 100.10, 1, 50)).toBe(false);
    // Boundary: zero time → always fails (singularity guard)
    expect(CSSChipLoadInvariantCoordinatorEngine.validateSlewRate(0.10, 0.20, 0, 50)).toBe(false);
  });

  it("analyze: returns a valid result shape with required fields", () => {
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze(STEEL_FACING);
    expect(typeof r.valid).toBe("boolean");
    expect(typeof r.target_chip_thickness_mm).toBe("number");
    expect(typeof r.chip_thickness_variation_percent).toBe("number");
    expect(Array.isArray(r.transition_points)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(Array.isArray(r.feed_compensation_segments)).toBe(true);
    expect(typeof r.physics_validation.slew_rate_satisfied).toBe("boolean");
    expect(typeof r.physics_validation.accel_time_satisfied).toBe("boolean");
    expect(typeof r.physics_validation.rpm_clamp_satisfied).toBe("boolean");
  });

  it("analyze: target_chip_thickness equals computeChipThickness(base_feed, lead_angle)", () => {
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze(STEEL_FACING);
    const expected = CSSChipLoadInvariantCoordinatorEngine.computeChipThickness(
      STEEL_FACING.base_feed_mm_rev,
      STEEL_FACING.lead_angle_deg,
    );
    expect(r.target_chip_thickness_mm).toBeCloseTo(expected, 6);
  });

  it("analyze: rpm_clamp_satisfied is true when Vc/D never drives RPM past max", () => {
    // 100m/min at 50mm gives 636 rpm — well below 4000
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze({
      ...STEEL_FACING,
      cutting_speed_m_min: 100,
      diameter_start_mm: 50,
      diameter_end_mm: 50,
    });
    expect(r.physics_validation.rpm_clamp_satisfied).toBe(true);
  });

  it("analyze: clamped_fraction > 0 when Vc·1000/πD > max_spindle_rpm at some step", () => {
    // 200 m/min on small diameter (1mm end) WILL clamp
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze({
      ...STEEL_FACING,
      cutting_speed_m_min: 200,
      diameter_start_mm: 50,
      diameter_end_mm: 1,    // → required RPM = 63662, max=4000 ⇒ clamp
      max_spindle_rpm: 4000,
    });
    expect(r.clamped_fraction).toBeGreaterThan(0);
  });

  it("analyze: face_center_risk flagged when facing brings diameter below 5mm", () => {
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze({
      ...STEEL_FACING,
      diameter_start_mm: 50,
      diameter_end_mm: 2,   // facing, end < 5mm
    });
    expect(r.face_center_risk).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("analyze: transitions array has 21 entries (diameterSteps=20 inclusive)", () => {
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze(STEEL_FACING);
    expect(r.transition_points.length).toBe(21);
  });

  it("analyze: force_variation_percent and chip_thickness_variation_percent are non-negative", () => {
    const r = CSSChipLoadInvariantCoordinatorEngine.analyze(STEEL_FACING);
    expect(r.force_variation_percent).toBeGreaterThanOrEqual(0);
    expect(r.chip_thickness_variation_percent).toBeGreaterThanOrEqual(0);
  });

  it("analyze: throws on invalid input (e.g. negative cutting_speed)", () => {
    expect(() => CSSChipLoadInvariantCoordinatorEngine.analyze({
      ...STEEL_FACING,
      cutting_speed_m_min: -100,
    })).toThrow();
  });
});
