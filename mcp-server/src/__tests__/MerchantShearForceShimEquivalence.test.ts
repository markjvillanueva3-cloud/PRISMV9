/**
 * MerchantShearForceShimEquivalence.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-02C-C (slot:juliett, 2026-05-23).
 *
 * Bit-equivalence between the engine's pre-shim inline merchantForce() +
 * merchantShearAngle() (UltimateSpeedFeedEngine.ts lines 1110 + 1118
 * pre-2026-05-23) and the post-shim MerchantShearForceModel static methods.
 *
 * Formula (Ernst-Merchant 1945, verbatim relocation):
 *   shear angle:  φ = π/4 - β/2 + γ/2, clamped to [5°, 45°]
 *   shear plane area: As = ap × feed / sin(φ)
 *   shear force: Fs = τs × As
 *   cutting force: Fc = Fs × cos(β-γ) / cos(φ+β-γ)
 *   thrust force: Ft = Fs × sin(β-γ) / cos(φ+β-γ)
 *   chip ratio: r = sin(φ) / cos(φ-γ)
 *
 * Pattern matches U-SFPSN-02A/03/04/05/02C-A/02C-B shims.
 */

import { describe, it, expect } from "vitest";
import { MerchantShearForceModel } from "../algorithms/MerchantShearForceModel.js";

// Frozen baseline — verbatim relocation of pre-shim merchantShearAngle (UltimateSpeedFeedEngine.ts:1110)
function oldMerchantShearAngle(rakeAngle_deg: number, frictionCoeff: number): number {
  const beta = Math.atan(frictionCoeff);
  const gamma = rakeAngle_deg * Math.PI / 180;
  const phi = Math.PI / 4 - beta / 2 + gamma / 2;
  return Math.max(5, Math.min(45, phi * 180 / Math.PI));
}

// Frozen baseline — verbatim relocation of pre-shim merchantForce (UltimateSpeedFeedEngine.ts:1118)
function oldMerchantForce(
  shearStrength_MPa: number, ap_mm: number, feed_mm: number,
  rakeAngle_deg: number, frictionCoeff: number,
): { Fc: number; Ft: number; shearAngle: number; chipRatio: number } {
  const phi_deg = oldMerchantShearAngle(rakeAngle_deg, frictionCoeff);
  const phi = phi_deg * Math.PI / 180;
  const gamma = rakeAngle_deg * Math.PI / 180;
  const beta = Math.atan(frictionCoeff);
  const As = (ap_mm * feed_mm) / Math.sin(phi);
  const Fs = shearStrength_MPa * As;
  const Fc = Fs * Math.cos(beta - gamma) / Math.cos(phi + beta - gamma);
  const Ft = Fs * Math.sin(beta - gamma) / Math.cos(phi + beta - gamma);
  const chipRatio = Math.sin(phi) / Math.cos(phi - gamma);
  return { Fc, Ft, shearAngle: phi_deg, chipRatio };
}

const REL_TOLERANCE = 1e-12;
const TAU_VALUES = [200, 400, 600, 800];                 // 4 — shear strengths (MPa) — Al to titanium
const AP_VALUES = [0.5, 1.0, 2.0, 4.0];                  // 4
const FEED_VALUES = [0.05, 0.1, 0.2, 0.4];               // 4
const RAKE_VALUES = [-10, 0, 5, 10, 15];                 // 5 — negative through positive rakes
const MU_VALUES = [0.3, 0.5, 0.7, 1.0];                  // 4 — friction coefficients

function relDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
}

describe("SF-PSN-WIRE-MS0/U-SFPSN-02C-C — MerchantShearForceModel shim bit-equivalence to inline merchantForce + merchantShearAngle", () => {
  it("calculateShearAngleCompat bit-equivalence on (rake × μ) grid (5 × 4 = 20 fixtures) at REL_TOLERANCE 1e-12", () => {
    let fixtures = 0;
    let maxRelDiff = 0;
    for (const rake of RAKE_VALUES) {
      for (const mu of MU_VALUES) {
        const baseline = oldMerchantShearAngle(rake, mu);
        const shim = MerchantShearForceModel.calculateShearAngleCompat(rake, mu);
        maxRelDiff = Math.max(maxRelDiff, relDiff(shim, baseline));
        fixtures++;
      }
    }
    expect(fixtures).toBe(20);
    expect(maxRelDiff).toBeLessThan(REL_TOLERANCE);
  });

  it("calculateForcesCompat bit-equivalence on full grid (4 τ × 4 ap × 4 feed × 5 rake × 4 μ = 1280 fixtures) at REL_TOLERANCE 1e-12 on Fc/Ft/shearAngle/chipRatio", () => {
    let fixtures = 0;
    let maxRelDiffFc = 0, maxRelDiffFt = 0, maxRelDiffPhi = 0, maxRelDiffRatio = 0;
    for (const tau of TAU_VALUES) {
      for (const ap of AP_VALUES) {
        for (const feed of FEED_VALUES) {
          for (const rake of RAKE_VALUES) {
            for (const mu of MU_VALUES) {
              const baseline = oldMerchantForce(tau, ap, feed, rake, mu);
              const shim = MerchantShearForceModel.calculateForcesCompat(tau, ap, feed, rake, mu);
              maxRelDiffFc = Math.max(maxRelDiffFc, relDiff(shim.Fc, baseline.Fc));
              maxRelDiffFt = Math.max(maxRelDiffFt, relDiff(shim.Ft, baseline.Ft));
              maxRelDiffPhi = Math.max(maxRelDiffPhi, relDiff(shim.shearAngle, baseline.shearAngle));
              maxRelDiffRatio = Math.max(maxRelDiffRatio, relDiff(shim.chipRatio, baseline.chipRatio));
              fixtures++;
            }
          }
        }
      }
    }
    expect(fixtures).toBe(1280);
    expect(maxRelDiffFc).toBeLessThan(REL_TOLERANCE);
    expect(maxRelDiffFt).toBeLessThan(REL_TOLERANCE);
    expect(maxRelDiffPhi).toBeLessThan(REL_TOLERANCE);
    expect(maxRelDiffRatio).toBeLessThan(REL_TOLERANCE);
  });

  it("shear angle clamp fires identically at extreme positive rake — calculateShearAngleCompat(80, 0.1) returns exactly 45°", () => {
    const shim = MerchantShearForceModel.calculateShearAngleCompat(80, 0.1);
    expect(shim).toBe(45);
  });

  it("shear angle clamp fires identically at extreme negative rake — calculateShearAngleCompat(-90, 2.0) returns exactly 5°", () => {
    const shim = MerchantShearForceModel.calculateShearAngleCompat(-90, 2.0);
    expect(shim).toBe(5);
  });

  it("Fc scales linearly with τs (engineering invariant: 2× shear strength → 2× cutting force for fixed geometry)", () => {
    const f1 = MerchantShearForceModel.calculateForcesCompat(400, 2, 0.2, 5, 0.5);
    const f2 = MerchantShearForceModel.calculateForcesCompat(800, 2, 0.2, 5, 0.5);
    expect(f2.Fc / f1.Fc).toBeCloseTo(2.0, 12);
    expect(f2.Ft / f1.Ft).toBeCloseTo(2.0, 12);
  });

  it("Fc scales linearly with ap × feed (engineering invariant: shear plane area is linear in ap × feed)", () => {
    const f1 = MerchantShearForceModel.calculateForcesCompat(400, 1, 0.1, 5, 0.5);
    const f2 = MerchantShearForceModel.calculateForcesCompat(400, 2, 0.2, 5, 0.5);
    expect(f2.Fc / f1.Fc).toBeCloseTo(4.0, 12);
  });

  it("merchantShearAngle and merchantForce.shearAngle agree (same call, two surfaces)", () => {
    const phi = MerchantShearForceModel.calculateShearAngleCompat(5, 0.5);
    const result = MerchantShearForceModel.calculateForcesCompat(400, 2, 0.2, 5, 0.5);
    expect(result.shearAngle).toBe(phi);
  });
});
