/**
 * PPG Chip Thinning Compensation — Category B11.4 (10 scenarios)
 *
 * Validates chip thinning feed compensation:
 * - h_eff = fz × sqrt(ae / (D - ae))  for ae < D/2
 * - At light radial engagement, actual chip is thinner → feed must increase
 * - Compensation factor = 1 / sqrt(ae / (D - ae)) when ae < D/2
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// CHIP THINNING MODEL
// ============================================================================

/**
 * Calculate effective chip thickness for a given ae/D ratio.
 * h_eff = fz × sqrt(ae / (D - ae))  [simplified for ae ≤ D/2]
 * For ae > D/2: h_eff ≈ fz (no thinning)
 */
function effectiveChipThickness(fz: number, ae: number, D: number): number {
  if (ae >= D / 2) return fz; // no thinning at ≥50% stepover
  if (ae <= 0 || D <= 0) return 0;
  return fz * Math.sqrt(ae / (D - ae));
}

/**
 * Calculate the feed compensation factor to maintain target chip thickness.
 * fz_adjusted = fz_target / sqrt(ae / (D - ae))
 */
function chipThinningFactor(ae: number, D: number): number {
  if (ae >= D / 2) return 1.0;
  if (ae <= 0 || D <= 0) return 1.0;
  return 1.0 / Math.sqrt(ae / (D - ae));
}

// ============================================================================
// B11.4: CHIP THINNING
// ============================================================================

describe("PPG B11.4: Chip Thinning Compensation", () => {
  const D = 12.7; // 1/2" endmill diameter (mm)

  // -------------------------------------------------------------------
  // ae/D ratios and thinning factors
  // -------------------------------------------------------------------
  describe("Thinning Factor at Various ae/D Ratios", () => {
    it("ae/D = 0.50 (half width) → factor = 1.0 (no adjustment)", () => {
      const ae = D * 0.5;
      const factor = chipThinningFactor(ae, D);
      expect(factor).toBeCloseTo(1.0, 2);
    });

    it("ae/D = 0.25 → factor ≈ 1.73", () => {
      const ae = D * 0.25;
      const factor = chipThinningFactor(ae, D);
      // 1/sqrt(0.25/(1-0.25)) = 1/sqrt(0.333) = 1.732
      expect(factor).toBeCloseTo(1.73, 1);
    });

    it("ae/D = 0.10 → factor ≈ 3.0", () => {
      const ae = D * 0.10;
      const factor = chipThinningFactor(ae, D);
      // 1/sqrt(0.10/(1-0.10)) = 1/sqrt(0.111) = 3.0
      expect(factor).toBeCloseTo(3.0, 1);
    });

    it("ae/D = 0.05 → factor ≈ 4.36", () => {
      const ae = D * 0.05;
      const factor = chipThinningFactor(ae, D);
      // 1/sqrt(0.05/0.95) = 1/sqrt(0.0526) = 4.36
      expect(factor).toBeCloseTo(4.36, 1);
    });

    it("ae/D = 0.02 → factor ≈ 7.0", () => {
      const ae = D * 0.02;
      const factor = chipThinningFactor(ae, D);
      // 1/sqrt(0.02/0.98) = 1/sqrt(0.0204) = 7.0
      expect(factor).toBeCloseTo(7.0, 0);
    });
  });

  // -------------------------------------------------------------------
  // Effective chip thickness
  // -------------------------------------------------------------------
  describe("Effective Chip Thickness", () => {
    it("at ae=D/2 (50% stepover), h_eff = fz", () => {
      const fz = 0.15;
      const ae = D * 0.5;
      const h_eff = effectiveChipThickness(fz, ae, D);
      expect(h_eff).toBeCloseTo(fz, 4);
    });

    it("at ae=D*0.10, h_eff = 0.15 × 0.333 = 0.050mm (very thin)", () => {
      const fz = 0.15;
      const ae = D * 0.10;
      const h_eff = effectiveChipThickness(fz, ae, D);
      expect(h_eff).toBeCloseTo(0.050, 2);
    });

    it("thin chip requires feed increase to maintain MRR", () => {
      const fz_target = 0.15;
      const ae = D * 0.10;
      const factor = chipThinningFactor(ae, D);
      const fz_adjusted = fz_target * factor;
      // Adjusted feed should be ~3× the nominal
      expect(fz_adjusted).toBeCloseTo(0.45, 1);
      expect(fz_adjusted).toBeGreaterThan(fz_target);
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("ae=0 → factor = 1.0 (guard)", () => {
      const factor = chipThinningFactor(0, D);
      expect(factor).toBe(1.0);
    });

    it("ae > D/2 → factor = 1.0 (no compensation needed)", () => {
      const factor = chipThinningFactor(D * 0.75, D);
      expect(factor).toBe(1.0);
    });

    it("ae = D (full slotting) → factor = 1.0", () => {
      const factor = chipThinningFactor(D, D);
      expect(factor).toBe(1.0);
    });
  });
});
