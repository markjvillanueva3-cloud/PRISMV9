import { describe, it, expect } from "vitest";
import {
  millCSSOptimizerEngine as eng,
  type MillCSSBaseInput,
  type MillCSSHelicalInput,
  type MillCSSBallNoseInput,
  type MillCSSFaceMillInput,
  type MillCSSEnvelopeInput,
} from "../engines/MillCSSOptimizerEngine.js";

function base(o: Partial<MillCSSBaseInput> = {}): MillCSSBaseInput {
  return {
    Vc_m_min: 200,
    tool_diameter_mm: 10,
    rated_max_rpm: 15000,
    ...o,
  };
}

describe("MillCSSOptimizerEngine", () => {
  it("getStats lists 5 modes + canonical references", () => {
    const s = eng.getStats();
    expect(s.modes.length).toBe(5);
    expect(s.modes[0]).toMatch(/optimize/);
    expect(s.canonical_reference).toMatch(/Sandvik.*Milling Application Guide/);
    expect(s.canonical_reference).toMatch(/Kennametal/);
  });

  it("optimize(): nominal Vc=200, D=10, rated=15000 → rpm ≈ 6366 (= 1000*200/(π*10))", () => {
    const r = eng.optimize(base());
    // 1000 * 200 / (π * 10) = 6366.197...
    expect(r.recommended_rpm).toBe(6366);
    expect(r.clamped).toBe(false);
    expect(r.effective_vc_m_min).toBeCloseTo(200, 0);
    expect(r.vc_target_match_pct).toBeCloseTo(100, 0);
  });

  it("optimize(): rpm above rated_max → clamped to rated_max with reasoning", () => {
    const r = eng.optimize(base({ Vc_m_min: 500, rated_max_rpm: 10000 })); // ideal=15915 > 10000
    expect(r.clamped).toBe(true);
    expect(r.recommended_rpm).toBe(10000);
    expect(r.effective_vc_m_min).toBeCloseTo((Math.PI * 10 * 10000) / 1000, 1);
    expect(r.vc_target_match_pct).toBeLessThan(100);
    expect(r.reasoning.some(s => /exceeds rated.*clamped/.test(s))).toBe(true);
  });

  it("optimize(): rpm below min → clamped up", () => {
    const r = eng.optimize(base({ Vc_m_min: 1, tool_diameter_mm: 100, min_rpm: 50 })); // ideal=3.18
    expect(r.clamped).toBe(true);
    expect(r.recommended_rpm).toBe(50);
  });

  it("optimize() throws on invalid base inputs", () => {
    expect(() => eng.optimize(base({ Vc_m_min: 0 }))).toThrow(/Vc_m_min must be > 0/);
    expect(() => eng.optimize(base({ tool_diameter_mm: 0 }))).toThrow(/tool_diameter_mm must be > 0/);
    expect(() => eng.optimize(base({ rated_max_rpm: 0 }))).toThrow(/rated_max_rpm must be > 0/);
  });

  it("optimizeForHelicalInterpolation: hole=20, tool=10 → effective_D=10, rpm=6366", () => {
    const input: MillCSSHelicalInput = { ...base(), hole_diameter_mm: 20 };
    const r = eng.optimizeForHelicalInterpolation(input);
    expect(r.effective_cut_diameter_mm).toBe(10);
    expect(r.recommended_rpm).toBe(6366); // same as base case since effective_D = tool_D here
    expect(r.reasoning.some(s => /Effective cut diameter 10.*hole_D 20.*tool_D 10/.test(s))).toBe(true);
  });

  it("optimizeForHelicalInterpolation: hole=15, tool=10 → effective_D=5, rpm doubles", () => {
    const input: MillCSSHelicalInput = { ...base(), hole_diameter_mm: 15 };
    const r = eng.optimizeForHelicalInterpolation(input);
    expect(r.effective_cut_diameter_mm).toBe(5);
    expect(r.recommended_rpm).toBe(Math.round((1000 * 200) / (Math.PI * 5))); // 12732
  });

  it("optimizeForHelicalInterpolation throws when hole_D <= tool_D", () => {
    expect(() => eng.optimizeForHelicalInterpolation({ ...base(), hole_diameter_mm: 10 }))
      .toThrow(/hole_diameter_mm must be > tool_diameter_mm/);
  });

  it("optimizeForBallNoseEffective: tilt 30° + D=10 → effective_D=5 (D*sin30=5)", () => {
    const input: MillCSSBallNoseInput = { ...base(), tilt_angle_deg: 30 };
    const r = eng.optimizeForBallNoseEffective(input);
    expect(r.effective_cut_diameter_mm).toBe(5);
    expect(r.recommended_rpm).toBe(Math.round((1000 * 200) / (Math.PI * 5)));
    expect(r.rubbing_risk).toBe(false);
  });

  it("optimizeForBallNoseEffective: tilt 0° → effective_D=0 → clamped rpm, rubbing risk", () => {
    const input: MillCSSBallNoseInput = { ...base(), tilt_angle_deg: 0 };
    const r = eng.optimizeForBallNoseEffective(input);
    expect(r.effective_cut_diameter_mm).toBe(0);
    expect(r.recommended_rpm).toBe(15000);
    expect(r.effective_vc_m_min).toBe(0);
    expect(r.rubbing_risk).toBe(true);
    expect(r.reasoning.some(s => /below floor.*increase tilt/.test(s))).toBe(true);
    expect(r.min_tilt_angle_deg).toBeGreaterThan(0);
  });

  it("optimizeForBallNoseEffective: tilt 1° (very small) → high rubbing risk, suggests min_tilt_angle", () => {
    const input: MillCSSBallNoseInput = { ...base(), tilt_angle_deg: 1, min_effective_vc_m_min: 60 };
    const r = eng.optimizeForBallNoseEffective(input);
    expect(r.rubbing_risk).toBe(true);
    // min_tilt to achieve 60 m/min at 15000 rpm with D=10: effective_D = 1000*60/(π*15000) ≈ 1.273
    // arcsin(1.273/10) ≈ 7.31°
    expect(r.min_tilt_angle_deg).toBeCloseTo(7.3, 0);
  });

  it("optimizeForBallNoseEffective throws on tilt out of [0, 90]", () => {
    expect(() => eng.optimizeForBallNoseEffective({ ...base(), tilt_angle_deg: -1 } as MillCSSBallNoseInput))
      .toThrow(/tilt_angle_deg must be in \[0, 90\]/);
    expect(() => eng.optimizeForBallNoseEffective({ ...base(), tilt_angle_deg: 91 } as MillCSSBallNoseInput))
      .toThrow(/tilt_angle_deg must be in \[0, 90\]/);
  });

  it("optimizeForFaceMillPeriphery: D=10 mean, face_max=10, periph<=envelope → no exceed", () => {
    const input: MillCSSFaceMillInput = {
      ...base(),
      face_mill_max_diameter_mm: 10,
      max_peripheral_vc_m_min: 300,
    };
    const r = eng.optimizeForFaceMillPeriphery(input);
    expect(r.peripheral_vc_m_min).toBeCloseTo(200, 0);
    expect(r.exceeds_peripheral_envelope).toBe(false);
  });

  it("optimizeForFaceMillPeriphery: face_max > mean diameter → peripheral_vc > target Vc, may exceed envelope", () => {
    const input: MillCSSFaceMillInput = {
      ...base({ tool_diameter_mm: 10 }), // RPM tuned for 10mm
      face_mill_max_diameter_mm: 50,     // periphery 5x mean
      max_peripheral_vc_m_min: 250,      // envelope < 5x Vc=200=1000
    };
    const r = eng.optimizeForFaceMillPeriphery(input);
    expect(r.peripheral_vc_m_min).toBeCloseTo(1000, 0); // π * 50 * 6366 / 1000 ≈ 1000
    expect(r.exceeds_peripheral_envelope).toBe(true);
    expect(r.reasoning.some(s => /Reduce RPM to.*peripheral Vc envelope/.test(s))).toBe(true);
  });

  it("optimizeForFaceMillPeriphery throws on invalid face_mill_max_diameter_mm", () => {
    expect(() => eng.optimizeForFaceMillPeriphery({ ...base(), face_mill_max_diameter_mm: 0, max_peripheral_vc_m_min: 300 } as MillCSSFaceMillInput))
      .toThrow(/face_mill_max_diameter_mm must be > 0/);
  });

  it("effectiveVcEnvelope: angles [30,60,90] → effective_D scales with sin()", () => {
    const input: MillCSSEnvelopeInput = { ...base(), engagement_angles_deg: [30, 60, 90] };
    const r = eng.effectiveVcEnvelope(input);
    expect(r.per_angle.length).toBe(3);
    expect(r.per_angle[0].effective_d_mm).toBeCloseTo(5, 1);    // 10 * sin(30°) = 5
    expect(r.per_angle[1].effective_d_mm).toBeCloseTo(8.66, 1); // 10 * sin(60°) ≈ 8.66
    expect(r.per_angle[2].effective_d_mm).toBeCloseTo(10, 1);   // 10 * sin(90°) = 10
    // min_vc is at 30° (smallest effective_D)
    expect(r.min_effective_vc_m_min).toBeLessThan(r.max_effective_vc_m_min);
  });

  it("effectiveVcEnvelope: very low engagement angle (10°) → drops below 50% target → warning", () => {
    const input: MillCSSEnvelopeInput = { ...base(), engagement_angles_deg: [10, 90] };
    const r = eng.effectiveVcEnvelope(input);
    expect(r.reasoning.some(s => /below 50% target/.test(s))).toBe(true);
  });

  it("effectiveVcEnvelope throws on empty angles array", () => {
    expect(() => eng.effectiveVcEnvelope({ ...base(), engagement_angles_deg: [] }))
      .toThrow(/engagement_angles_deg array required/);
  });

  it("effectiveVcEnvelope: recommended_rpm clamps to rated_max when needed", () => {
    const input: MillCSSEnvelopeInput = {
      ...base({ Vc_m_min: 1000, rated_max_rpm: 5000 }),
      engagement_angles_deg: [90],
    };
    const r = eng.effectiveVcEnvelope(input);
    expect(r.recommended_rpm).toBe(5000); // clamped
  });

  it("recommended_rpm is monotonic decreasing as tool_diameter_mm increases (same Vc)", () => {
    const r1 = eng.optimize(base({ tool_diameter_mm: 5 })).recommended_rpm;
    const r2 = eng.optimize(base({ tool_diameter_mm: 10 })).recommended_rpm;
    const r3 = eng.optimize(base({ tool_diameter_mm: 50 })).recommended_rpm;
    expect(r1).toBeGreaterThan(r2);
    expect(r2).toBeGreaterThan(r3);
  });
});
