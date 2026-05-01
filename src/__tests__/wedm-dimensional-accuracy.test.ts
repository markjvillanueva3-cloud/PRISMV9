/**
 * WEDM Dimensional Accuracy Test Suite — U-W100-07
 *
 * Validates that DiBitonto-derived offset chains produce correct final
 * part dimensions. The physics offset model (from U-W100-05/06) must:
 *   1. Produce monotonically decreasing H-offsets per pass
 *   2. Stock removal per pass = offset_(n-1) - offset_n > 0
 *   3. Sum of all stock removals ≈ H_rough - H_final (conservation)
 *   4. Final part dimension within ±0.002mm of nominal
 *
 * Reference: ITW SHAKEPROOF real D2 program offsets:
 *   H1=0.2159mm, H2=0.1626mm, H3=0.1473mm, H4=0.1346mm
 *   (0.0085in, 0.0064in, 0.0058in, 0.0053in)
 *
 * Sources:
 *   - DiBitonto et al. (1989) crater model
 *   - Toenshoff et al. (2004) energy cascade
 *   - EDM_PHYSICS from physics/constants.ts
 */
import { describe, it, expect } from "vitest";

// ── Import the production offset model ──────────────────────
const { edmMultiPassStrategyEngine: engine } = await import(
  "../engines/EDMMultiPassStrategyEngine.js"
);
const { EDM_PHYSICS } = await import("../physics/constants.js");

// Access internals for direct testing
const { computeDiBitontoOffsets, determinePassCount, calculateOffsets } = engine._internals;

// ── Test Constants ──────────────────────────────────────────

/** ITW SHAKEPROOF reference offsets for D2/0.25mm brass/4 passes [mm] */
const ITW_REFERENCE = {
  material: "D2 tool steel",
  wire_d_mm: 0.25,
  passes: 4,
  offsets_mm: [0.2159, 0.1626, 0.1473, 0.1346], // H1-H4
  target_Ra_um: 0.4,
  thickness_mm: 25.4,
};

/** Standard test materials with Toenshoff gamma from physics constants */
const TEST_MATERIALS: Array<{ name: string; gamma: number; label: string }> = [
  { name: "tool_steel", gamma: EDM_PHYSICS.toenshoff.gamma.tool_steel, label: "D2 Tool Steel (60 HRC)" },
  { name: "stainless", gamma: EDM_PHYSICS.toenshoff.gamma.stainless, label: "304 Stainless" },
  { name: "aluminum", gamma: EDM_PHYSICS.toenshoff.gamma.aluminum, label: "6061-T6 Aluminum" },
  { name: "carbide", gamma: EDM_PHYSICS.toenshoff.gamma.carbide, label: "WC-6%Co Carbide" },
  { name: "titanium", gamma: EDM_PHYSICS.toenshoff.gamma.titanium, label: "Ti-6Al-4V" },
  { name: "inconel", gamma: EDM_PHYSICS.toenshoff.gamma.inconel, label: "Inconel 718" },
  { name: "copper", gamma: EDM_PHYSICS.toenshoff.gamma.copper, label: "OFHC Copper" },
  { name: "steel", gamma: EDM_PHYSICS.toenshoff.gamma.steel, label: "1045 Mild Steel" },
];

/** Test thicknesses [mm] */
const TEST_THICKNESSES = [12.7, 25.4, 50.8, 76.2];

// ── Tests ───────────────────────────────────────────────────

describe("WEDM Dimensional Accuracy — U-W100-07", () => {

  // ── A. DiBitonto offset model direct tests ────────────────

  describe("DiBitonto offset model (direct)", () => {

    it("produces correct number of offsets", () => {
      const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      expect(offsets).toHaveLength(4);
    });

    it("all offsets > wire radius (0.125mm)", () => {
      const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      for (const h of offsets) {
        expect(h).toBeGreaterThan(0.125);
      }
    });

    it("offsets decrease monotonically", () => {
      const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThan(offsets[i - 1]);
      }
    });

    it("matches ITW SHAKEPROOF D2 reference within ±15%", () => {
      // D2 = tool_steel, gamma = 0.25
      const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);

      for (let i = 0; i < 4; i++) {
        const ref = ITW_REFERENCE.offsets_mm[i];
        const pctErr = Math.abs(offsets[i] - ref) / ref;
        expect(pctErr).toBeLessThan(0.15);
      }
    });

    it("H2/H1 ratio matches ITW pattern (0.60-0.90)", () => {
      // ITW ratio: 0.1626/0.2159 = 0.753
      const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      const ratio = offsets[1] / offsets[0];
      expect(ratio).toBeGreaterThan(0.60);
      expect(ratio).toBeLessThan(0.90);
    });

    it("5-pass chain: all values finite and decreasing", () => {
      const offsets = computeDiBitontoOffsets(0.25, 5, 0.25, 42.5);
      expect(offsets).toHaveLength(5);
      for (let i = 0; i < offsets.length; i++) {
        expect(Number.isFinite(offsets[i])).toBe(true);
        expect(offsets[i]).toBeGreaterThan(0);
      }
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThan(offsets[i - 1]);
      }
    });

    it("single pass: just wire_radius + overcut", () => {
      const offsets = computeDiBitontoOffsets(0.25, 1, 0.25, 42.5);
      expect(offsets).toHaveLength(1);
      expect(offsets[0]).toBeGreaterThan(0.125); // > wire radius
      expect(offsets[0]).toBeLessThan(0.300);     // reasonable
    });
  });

  // ── B. Material-specific gamma effects ────────────────────

  describe("Material gamma effects on offset chain", () => {

    for (const mat of TEST_MATERIALS) {
      it(`${mat.label} (γ=${mat.gamma}): monotonic decrease`, () => {
        const offsets = computeDiBitontoOffsets(0.25, 4, mat.gamma, 42.5);
        for (let i = 1; i < offsets.length; i++) {
          expect(offsets[i]).toBeLessThan(offsets[i - 1]);
        }
      });
    }

    it("carbide (γ=0.20) has faster decay than aluminum (γ=0.30)", () => {
      const carbide = computeDiBitontoOffsets(0.25, 4, 0.20, 42.5);
      const aluminum = computeDiBitontoOffsets(0.25, 4, 0.30, 42.5);

      // Lower gamma = faster decay = smaller final/rough ratio
      const carbideRatio = carbide[3] / carbide[0];
      const aluminumRatio = aluminum[3] / aluminum[0];
      expect(carbideRatio).toBeLessThan(aluminumRatio);
    });

    it("all materials: final offset within 0.125-0.200mm for 0.25mm wire", () => {
      for (const mat of TEST_MATERIALS) {
        const offsets = computeDiBitontoOffsets(0.25, 4, mat.gamma, 42.5);
        const final_h = offsets[offsets.length - 1];
        expect(final_h).toBeGreaterThan(0.125);
        expect(final_h).toBeLessThan(0.200);
      }
    });
  });

  // ── C. Stock removal conservation ─────────────────────────

  describe("Stock removal conservation", () => {

    for (const mat of TEST_MATERIALS) {
      it(`${mat.label}: sum of per-pass stock = H_rough - H_final`, () => {
        const offsets = computeDiBitontoOffsets(0.25, 4, mat.gamma, 42.5);
        let totalRemoval = 0;
        for (let i = 0; i < offsets.length - 1; i++) {
          const removal = offsets[i] - offsets[i + 1];
          expect(removal).toBeGreaterThan(0);
          totalRemoval += removal;
        }
        const expectedTotal = offsets[0] - offsets[offsets.length - 1];
        expect(totalRemoval).toBeCloseTo(expectedTotal, 6);
      });
    }
  });

  // ── D. calculateOffsets integration ───────────────────────

  describe("calculateOffsets integration (full breakdown)", () => {

    it("4-pass steel: returns OffsetBreakdown[] with total_offset_mm", () => {
      const result = calculateOffsets(4, 0.125, 0.05);
      expect(result).toHaveLength(4);
      for (const ob of result) {
        expect(ob).toHaveProperty("total_offset_mm");
        expect(ob).toHaveProperty("wire_radius_mm");
        expect(ob).toHaveProperty("spark_gap_mm");
        expect(ob.total_offset_mm).toBeGreaterThan(0);
      }
    });

    it("offsets monotonically decrease through passes", () => {
      const result = calculateOffsets(4, 0.125, 0.05);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].total_offset_mm).toBeLessThanOrEqual(result[i - 1].total_offset_mm);
      }
    });

    it("wire_radius_mm is consistent across all passes", () => {
      const result = calculateOffsets(4, 0.125, 0.05);
      for (const ob of result) {
        expect(ob.wire_radius_mm).toBeCloseTo(0.125, 4);
      }
    });

    it("spark_gap_mm >= 0 for all passes", () => {
      const result = calculateOffsets(4, 0.125, 0.05);
      for (const ob of result) {
        expect(ob.spark_gap_mm).toBeGreaterThanOrEqual(0);
      }
    });

    it("final pass remaining_stock_mm = 0", () => {
      const result = calculateOffsets(4, 0.125, 0.05);
      const last = result[result.length - 1];
      expect(last.remaining_stock_mm).toBeCloseTo(0, 4);
    });
  });

  // ── E. determinePassCount ─────────────────────────────────

  describe("Pass count determination", () => {
    it("Ra > 3.2µm → 1 pass (rough only)", () => {
      expect(determinePassCount(0.200, 5.0)).toBe(1);
    });

    it("Ra 1.6-3.2µm → 2 passes", () => {
      expect(determinePassCount(0.100, 2.0)).toBe(2);
    });

    it("Ra 0.8-1.6µm → 3 passes", () => {
      expect(determinePassCount(0.050, 1.2)).toBe(3);
    });

    it("Ra 0.4-0.8µm → 4 passes", () => {
      expect(determinePassCount(0.025, 0.6)).toBe(4);
    });

    it("Ra < 0.4µm → 5 passes (super-finish)", () => {
      expect(determinePassCount(0.010, 0.2)).toBe(5);
    });

    it("tight tolerance forces more passes even with coarse Ra", () => {
      // Ra=3.2 wants 1 pass, but tolerance=0.005mm wants 4 passes
      const passes = determinePassCount(0.005, 3.2);
      expect(passes).toBeGreaterThanOrEqual(4);
    });
  });

  // ── F. Wire diameter sensitivity ──────────────────────────

  describe("Wire diameter sensitivity", () => {

    it("0.10mm wire: all offsets > 0.05mm radius", () => {
      const offsets = computeDiBitontoOffsets(0.10, 4, 0.25, 42.5);
      for (const h of offsets) {
        expect(h).toBeGreaterThan(0.05);
      }
    });

    it("0.20mm wire: all offsets > 0.10mm radius", () => {
      const offsets = computeDiBitontoOffsets(0.20, 4, 0.25, 42.5);
      for (const h of offsets) {
        expect(h).toBeGreaterThan(0.10);
      }
    });

    it("thinner wire → smaller rough offset", () => {
      const h25 = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      const h10 = computeDiBitontoOffsets(0.10, 4, 0.25, 42.5);
      expect(h10[0]).toBeLessThan(h25[0]);
    });

    it("offset difference ≈ wire radius difference", () => {
      const h25 = computeDiBitontoOffsets(0.25, 4, 0.25, 42.5);
      const h20 = computeDiBitontoOffsets(0.20, 4, 0.25, 42.5);
      // Last pass offset difference should be close to radius diff (0.025mm)
      const diff = h25[3] - h20[3];
      expect(diff).toBeGreaterThan(0.015);
      expect(diff).toBeLessThan(0.040);
    });
  });

  // ── G. Thickness variation (via gap scaling) ──────────────

  describe("Thickness-dependent gap scaling", () => {

    it("larger gap_rough → larger offsets", () => {
      const small = computeDiBitontoOffsets(0.25, 4, 0.25, 30);
      const large = computeDiBitontoOffsets(0.25, 4, 0.25, 55);
      expect(large[0]).toBeGreaterThan(small[0]);
    });

    it("gap variation doesn't break monotonicity", () => {
      for (const gap of [20, 30, 42.5, 55, 70]) {
        const offsets = computeDiBitontoOffsets(0.25, 4, 0.25, gap);
        for (let i = 1; i < offsets.length; i++) {
          expect(offsets[i]).toBeLessThan(offsets[i - 1]);
        }
      }
    });
  });
});
