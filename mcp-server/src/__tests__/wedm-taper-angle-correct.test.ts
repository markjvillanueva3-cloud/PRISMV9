import { describe, it, expect } from "vitest";
import { wedmWireDeflectionEngine } from "../engines/WEDMWireDeflectionEngine.js";

/**
 * Tests for WEDMWireDeflectionEngine.correctTaperAngle (U-WEDM-TAPER-CORRECT).
 * Reference values are derived from FIRST PRINCIPLES inside each test (never a magic number):
 * in the tensioned-string regime delta = F*L/(8T) => 4*delta/L = F/(2T), so the bow angle is
 * theta_bow = atan(F/(2T)), independent of span/taper. The engine must reproduce this via its
 * own calculateDeflection/calculateDeflectionAngle path.
 */
const base = {
  discharge_force_N: 0.05,
  wire_tension_N: 15,
  wire_diameter_mm: 0.25,
  modulus_GPa: 110,
  guide_span_mm: 300,
};
const R2D = 180 / Math.PI;

describe("WEDMWireDeflectionEngine.correctTaperAngle", () => {
  it("string regime: bow = atan(F/2T) (span-independent) and programmed = target - bow", () => {
    const expectedBow = Math.atan(base.discharge_force_N / (2 * base.wire_tension_N)) * R2D;
    const r = wedmWireDeflectionEngine.correctTaperAngle({ ...base, target_taper_deg: 15 });
    expect(r.converged).toBe(true);
    expect(r.clamped).toBe(false);
    expect(r.bow_angle_deg).toBeCloseTo(expectedBow, 4);           // ~0.09549 deg
    expect(r.programmed_taper_deg).toBeCloseTo(15 - expectedBow, 4);
    expect(r.correction_deg).toBeCloseTo(expectedBow, 4);
    expect(r.residual_deg).toBe(0);
  });

  it("invertibility invariant: programmed + forward-bow(programmed) == target (round-trip via engine physics)", () => {
    for (const target of [5, 10, 20, 30]) {
      const r = wedmWireDeflectionEngine.correctTaperAngle({ ...base, target_taper_deg: target });
      const effSpan = base.guide_span_mm / Math.cos((r.programmed_taper_deg * Math.PI) / 180);
      const delta = wedmWireDeflectionEngine.calculateDeflection(
        base.discharge_force_N, base.wire_tension_N, effSpan, base.wire_diameter_mm, base.modulus_GPa,
      );
      const bowFwd = wedmWireDeflectionEngine.calculateDeflectionAngle(delta, effSpan);
      expect(r.programmed_taper_deg + bowFwd).toBeCloseTo(target, 3); // default bow_direction=+1
    }
  });

  it("bending-stiffness regime (lambda<5: STIFF/thick wire at low tension) applies the stiffness factor and still inverts", () => {
    // Thin wire RAISES lambda toward the string regime; the bending else-branch is reached with a
    // stiff/thick wire at low tension. d=0.25/T=0.5/span=30 -> lambda~4.6 < 5 (verified below).
    const bend = { discharge_force_N: 0.02, wire_tension_N: 0.5, wire_diameter_mm: 0.25, modulus_GPa: 110, guide_span_mm: 30 };
    const r = wedmWireDeflectionEngine.correctTaperAngle({ ...bend, target_taper_deg: 10 });
    const effSpan = bend.guide_span_mm / Math.cos((r.programmed_taper_deg * Math.PI) / 180);
    // Prove we are actually in the bending regime: lambda<5 AND deflection strictly below the string value
    // (the else-branch multiplies by factor = 1/(1 + pi^2*E*I/(T*L^2)) < 1) -- so a bug in that branch fails here.
    const I = (Math.PI * bend.wire_diameter_mm ** 4) / 64;
    const lambda = effSpan * Math.sqrt(bend.wire_tension_N / (bend.modulus_GPa * 1000 * I));
    expect(lambda).toBeLessThan(5);
    const stringDelta = (bend.discharge_force_N * effSpan) / (8 * bend.wire_tension_N);
    expect(r.deflection_mm).toBeLessThan(stringDelta); // stiffness factor < 1 was applied (bending branch exercised)
    // invertibility still holds in the bending regime
    const bowFwd = wedmWireDeflectionEngine.calculateDeflectionAngle(r.deflection_mm, effSpan);
    expect(r.programmed_taper_deg + bowFwd).toBeCloseTo(10, 3);
    expect(r.converged).toBe(true);
  });

  it("higher discharge force => larger bow => larger correction (monotonic; ~doubles when force doubles)", () => {
    const rLo = wedmWireDeflectionEngine.correctTaperAngle({ ...base, discharge_force_N: 0.05, target_taper_deg: 15 });
    const rHi = wedmWireDeflectionEngine.correctTaperAngle({ ...base, discharge_force_N: 0.10, target_taper_deg: 15 });
    expect(rHi.correction_deg).toBeGreaterThan(rLo.correction_deg);
    expect(rHi.correction_deg).toBeCloseTo(2 * rLo.correction_deg, 3); // atan near-linear at small angle
  });

  it("straight cut (target 0): bow uncorrectable by pre-tilt -> clamp to 0 + residual + warning (R12, no silent out-of-range)", () => {
    const expectedBow = Math.atan(base.discharge_force_N / (2 * base.wire_tension_N)) * R2D;
    const r = wedmWireDeflectionEngine.correctTaperAngle({ ...base, target_taper_deg: 0 });
    expect(r.programmed_taper_deg).toBe(0);            // never negative
    expect(r.clamped).toBe(true);
    expect(r.residual_deg).toBeCloseTo(expectedBow, 4);
    expect(r.warning).toMatch(/exceeds target|uncorrectable/i);
  });

  it("inward bow driving programmed over guide max -> clamp to max + residual", () => {
    const F = 1.0;
    const expectedBow = Math.atan(F / (2 * base.wire_tension_N)) * R2D; // ~1.909 deg
    const r = wedmWireDeflectionEngine.correctTaperAngle({
      ...base, discharge_force_N: F, target_taper_deg: 30, bow_direction: -1, max_taper_deg: 30,
    });
    expect(r.programmed_taper_deg).toBe(30);           // clamped to max
    expect(r.clamped).toBe(true);
    expect(r.residual_deg).toBeCloseTo(expectedBow, 3);
    expect(r.warning).toMatch(/exceeds guide max/i);
  });

  it("throws descriptive errors on non-positive tension and negative target", () => {
    expect(() => wedmWireDeflectionEngine.correctTaperAngle({ ...base, wire_tension_N: 0, target_taper_deg: 15 })).toThrow(/tension/i);
    expect(() => wedmWireDeflectionEngine.correctTaperAngle({ ...base, target_taper_deg: -5 })).toThrow(/target_taper_deg/i);
  });

  it("uses WEDM_TAPER_SPEC defaults when guide_span/max_taper omitted", () => {
    const r = wedmWireDeflectionEngine.correctTaperAngle({
      target_taper_deg: 10, discharge_force_N: 0.05, wire_tension_N: 15, wire_diameter_mm: 0.25, modulus_GPa: 110,
    });
    expect(r.converged).toBe(true);
    expect(r.effective_span_mm).toBeGreaterThan(0);
    expect(r.programmed_taper_deg).toBeLessThan(10);   // corrected down by the bow
    expect(r.programmed_taper_deg).toBeGreaterThan(9.8);
  });
});
