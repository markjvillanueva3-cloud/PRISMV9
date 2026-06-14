/**
 * SandvikTurningForceShimEquivalence.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-02C-B (slot:juliett, 2026-05-23).
 *
 * Bit-equivalence between the engine's pre-shim inline sandvikTurningForce()
 * (UltimateSpeedFeedEngine.ts line 953 pre-2026-05-23) and the post-shim
 * SandvikTurningForceModel.calculateTangentialCompat() static method.
 *
 * Formula (verbatim relocation from Sandvik Coromant cutting-force docs):
 *   Ft = kc0.4 × ap × fn / fn^mc
 *   Ft_corrected = Ft × sin(kapr_rad)
 *   safetyPct = 90 (Sandvik design rule)
 *
 * Frozen baseline embedded verbatim from the pre-shim engine — provides
 * the bit-equivalent comparand for fixtures across (kc0.4, mc, ap, fn, kapr).
 *
 * Pattern matches U-SFPSN-02A KienzleShim / U-SFPSN-03 JaegerShim /
 * U-SFPSN-04 StabilityShim / U-SFPSN-05 GilbertShim / U-SFPSN-02C-A FlankWearShim.
 */

import { describe, it, expect } from "vitest";
import { SandvikTurningForceModel } from "../algorithms/SandvikTurningForceModel.js";

// Frozen baseline — verbatim relocation of pre-shim sandvikTurningForce (UltimateSpeedFeedEngine.ts:953)
function oldSandvikTurningForce(
  kc0_4: number, mc: number, ap_mm: number, fn_mm: number,
  kapr_deg: number = 90,
): { Ft: number; safetyPct: number } {
  const Ft = kc0_4 * ap_mm * fn_mm / Math.pow(Math.max(0.01, fn_mm), mc);
  const kaprRad = (kapr_deg * Math.PI) / 180;
  const Ft_corrected = Ft * Math.sin(kaprRad);
  const safetyPct = 90;
  return { Ft: Ft_corrected, safetyPct };
}

const REL_TOLERANCE = 1e-12;
const KC04_VALUES = [1500, 1800, 2100, 2800, 3200];      // 5 — ISO P/M/K/N/S/H specific cutting forces (N/mm²)
const MC_VALUES = [0.18, 0.20, 0.22, 0.25, 0.28];        // 5 — Kienzle feed exponents
const AP_VALUES = [0.5, 1.0, 2.0, 4.0];                  // 4 — depths of cut (mm)
const FN_VALUES = [0.05, 0.1, 0.2, 0.4];                 // 4 — feeds per rev (mm)
const KAPR_VALUES = [45, 60, 75, 90, 95];                // 5 — entering angles (deg)

function relDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
}

describe("SF-PSN-WIRE-MS0/U-SFPSN-02C-B — SandvikTurningForceModel shim bit-equivalence to inline sandvikTurningForce", () => {
  it("bit-equivalence on full fixture grid (5 kc0.4 × 5 mc × 4 ap × 4 fn × 5 kapr = 2000 fixtures) at REL_TOLERANCE 1e-12", () => {
    let fixtures = 0;
    let maxRelDiffFt = 0;
    for (const kc of KC04_VALUES) {
      for (const mc of MC_VALUES) {
        for (const ap of AP_VALUES) {
          for (const fn of FN_VALUES) {
            for (const kapr of KAPR_VALUES) {
              const baseline = oldSandvikTurningForce(kc, mc, ap, fn, kapr);
              const shim = SandvikTurningForceModel.calculateTangentialCompat(kc, mc, ap, fn, kapr);
              maxRelDiffFt = Math.max(maxRelDiffFt, relDiff(shim.Ft, baseline.Ft));
              expect(shim.safetyPct).toBe(90);
              fixtures++;
            }
          }
        }
      }
    }
    expect(fixtures).toBe(2000);
    expect(maxRelDiffFt).toBeLessThan(REL_TOLERANCE);
  });

  it("feed clamp at 0.01 fires identically — fn=0.005 produces same Ft as fn=0.01 in the denominator", () => {
    const baseline = oldSandvikTurningForce(1800, 0.25, 2, 0.005, 90);
    const shim = SandvikTurningForceModel.calculateTangentialCompat(1800, 0.25, 2, 0.005, 90);
    expect(shim.Ft).toBe(baseline.Ft);
  });

  it("KAPR=90 produces sin(90°)=1, so Ft_corrected equals raw Ft within fp precision", () => {
    const kc = 1800, mc = 0.25, ap = 2, fn = 0.2;
    const shim = SandvikTurningForceModel.calculateTangentialCompat(kc, mc, ap, fn, 90);
    const expectedRawFt = kc * ap * fn / Math.pow(Math.max(0.01, fn), mc);
    expect(Math.abs(shim.Ft - expectedRawFt)).toBeLessThan(1e-9);
  });

  it("KAPR=45 produces sin(45°)≈0.707, Ft_corrected = raw_Ft × sin(45°)", () => {
    const kc = 1800, mc = 0.25, ap = 2, fn = 0.2;
    const shim = SandvikTurningForceModel.calculateTangentialCompat(kc, mc, ap, fn, 45);
    const rawFt = kc * ap * fn / Math.pow(Math.max(0.01, fn), mc);
    const expected = rawFt * Math.sin(Math.PI / 4);
    expect(Math.abs(shim.Ft - expected)).toBeLessThan(1e-9);
  });

  it("safetyPct is exactly 90 for every call (Sandvik design rule, never weakened)", () => {
    const cases = [
      [1500, 0.20, 1, 0.1, 90], [3200, 0.28, 4, 0.4, 45], [1800, 0.18, 0.5, 0.05, 75],
    ] as const;
    for (const [kc, mc, ap, fn, kapr] of cases) {
      const shim = SandvikTurningForceModel.calculateTangentialCompat(kc, mc, ap, fn, kapr);
      expect(shim.safetyPct).toBe(90);
    }
  });

  it("KAPR defaults to 90 when not provided (matches engine signature default)", () => {
    const withExplicit = SandvikTurningForceModel.calculateTangentialCompat(1800, 0.25, 2, 0.2, 90);
    const withDefault = SandvikTurningForceModel.calculateTangentialCompat(1800, 0.25, 2, 0.2);
    expect(withDefault.Ft).toBe(withExplicit.Ft);
  });

  it("force scales linearly with ap (engineering invariant: doubling ap doubles Ft for fixed fn/kc/mc/kapr)", () => {
    const f1 = SandvikTurningForceModel.calculateTangentialCompat(1800, 0.25, 1, 0.2, 90);
    const f2 = SandvikTurningForceModel.calculateTangentialCompat(1800, 0.25, 2, 0.2, 90);
    expect(f2.Ft / f1.Ft).toBeCloseTo(2.0, 12);
  });
});
