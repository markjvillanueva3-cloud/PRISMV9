/**
 * FlankWearVBShimEquivalence.test.ts
 *
 * Anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-02C-A (slot:juliett, 2026-05-23).
 *
 * Bit-equivalence between the engine's pre-shim inline predictFlankWear()
 * (UltimateSpeedFeedEngine.ts line 1089 pre-2026-05-23) and the post-shim
 * ToolWearPrediction.predictFlankWearVBCompat() static method.
 *
 * Formula (verbatim relocation from MIT 2.008, empirical tool wear coefficients):
 *   baseRate = a × hardness_factor × coolant_factor × (Vc/100)^b × (max(0.01, feed)/0.1)^c
 *   VB_15min = baseRate × √15
 *   time_to_03mm = (0.3 / baseRate)² clamped to 600 min
 *   time_to_06mm = (0.6 / baseRate)² clamped to 600 min
 *
 * Frozen baseline embedded verbatim from the pre-shim engine — provides
 * the bit-equivalent comparand for fixtures across (Vc, feed, HB, toolMat, coolant).
 *
 * Pattern matches U-SFPSN-02A KienzleShim / U-SFPSN-03 JaegerShim /
 * U-SFPSN-04 StabilityShim / U-SFPSN-05 GilbertShim.
 */

import { describe, it, expect } from "vitest";
import { ToolWearPrediction } from "../algorithms/ToolWearPrediction.js";

// Frozen baseline — verbatim relocation of pre-shim predictFlankWear (UltimateSpeedFeedEngine.ts:1089)
const OLD_WEAR_COEFFICIENTS: Record<string, { a: number; b: number; c: number }> = {
  hss:     { a: 0.001,   b: 1.5, c: 0.3 },
  carbide: { a: 0.0003,  b: 1.2, c: 0.2 },
  cermet:  { a: 0.00025, b: 1.1, c: 0.18 },
  ceramic: { a: 0.0001,  b: 0.9, c: 0.15 },
  cbn:     { a: 0.00005, b: 0.7, c: 0.1 },
  pcd:     { a: 0.00003, b: 0.6, c: 0.08 },
};

function oldPredictFlankWear(
  Vc_mpm: number, feed_mm: number, hardness_hb: number,
  toolMat: string, hasCoolant: boolean,
): { VB_15min: number; time_to_03mm: number; time_to_06mm: number } {
  const { a, b, c } = OLD_WEAR_COEFFICIENTS[toolMat] || OLD_WEAR_COEFFICIENTS.carbide;
  const hFactor = hardness_hb / 200;
  const coolFactor = hasCoolant ? 0.7 : 1.0;
  const baseRate = a * coolFactor * hFactor
    * Math.pow(Vc_mpm / 100, b) * Math.pow(Math.max(0.01, feed_mm) / 0.1, c);
  const VB_15 = baseRate * Math.sqrt(15);
  const time03 = Math.pow(0.3 / baseRate, 2);
  const time06 = Math.pow(0.6 / baseRate, 2);
  return { VB_15min: VB_15, time_to_03mm: Math.min(600, time03), time_to_06mm: Math.min(600, time06) };
}

const REL_TOLERANCE = 1e-12;
const TOOL_MATS = ["hss", "carbide", "cermet", "ceramic", "cbn", "pcd"];
const VC_VALUES = [50, 100, 150, 200, 300];
const FEED_VALUES = [0.05, 0.1, 0.2, 0.4];
const HB_VALUES = [120, 200, 300];
const COOLANT_VALUES = [true, false];

function relDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
}

describe("SF-PSN-WIRE-MS0/U-SFPSN-02C-A — FlankWearVBCompat shim bit-equivalence to inline predictFlankWear", () => {
  it("bit-equivalence on full fixture grid (6 toolMat × 5 Vc × 4 feed × 3 HB × 2 coolant = 720 fixtures) at REL_TOLERANCE 1e-12", () => {
    let fixtures = 0;
    let maxRelDiffVB = 0;
    let maxRelDiff03 = 0;
    let maxRelDiff06 = 0;
    for (const toolMat of TOOL_MATS) {
      for (const Vc of VC_VALUES) {
        for (const feed of FEED_VALUES) {
          for (const hb of HB_VALUES) {
            for (const coolant of COOLANT_VALUES) {
              const baseline = oldPredictFlankWear(Vc, feed, hb, toolMat, coolant);
              const shim = ToolWearPrediction.predictFlankWearVBCompat(Vc, feed, hb, toolMat, coolant);
              maxRelDiffVB = Math.max(maxRelDiffVB, relDiff(shim.VB_15min, baseline.VB_15min));
              maxRelDiff03 = Math.max(maxRelDiff03, relDiff(shim.time_to_03mm, baseline.time_to_03mm));
              maxRelDiff06 = Math.max(maxRelDiff06, relDiff(shim.time_to_06mm, baseline.time_to_06mm));
              fixtures++;
            }
          }
        }
      }
    }
    expect(fixtures).toBe(720);
    expect(maxRelDiffVB).toBeLessThan(REL_TOLERANCE);
    expect(maxRelDiff03).toBeLessThan(REL_TOLERANCE);
    expect(maxRelDiff06).toBeLessThan(REL_TOLERANCE);
  });

  it("unknown toolMat key falls back to carbide coefficients identically in shim vs baseline", () => {
    const baseline = oldPredictFlankWear(150, 0.2, 200, "diamond_coated_unknown", true);
    const shim = ToolWearPrediction.predictFlankWearVBCompat(150, 0.2, 200, "diamond_coated_unknown", true);
    expect(shim.VB_15min).toBe(baseline.VB_15min);
    expect(shim.time_to_03mm).toBe(baseline.time_to_03mm);
    expect(shim.time_to_06mm).toBe(baseline.time_to_06mm);
  });

  it("feed clamp at 0.01 mm fires identically in both — feed=0.005 produces same VB as feed=0.01", () => {
    const shimAtClamp = ToolWearPrediction.predictFlankWearVBCompat(150, 0.005, 200, "carbide", false);
    const shimAtFloor = ToolWearPrediction.predictFlankWearVBCompat(150, 0.01, 200, "carbide", false);
    expect(shimAtClamp.VB_15min).toBe(shimAtFloor.VB_15min);
  });

  it("time_to_03mm and time_to_06mm cap at exactly 600 min for low Vc/feed combos that would otherwise predict thousands of minutes", () => {
    // PCD on aluminum at low speed/feed produces extremely long predicted life
    const result = ToolWearPrediction.predictFlankWearVBCompat(30, 0.05, 80, "pcd", true);
    expect(result.time_to_03mm).toBe(600);
    expect(result.time_to_06mm).toBe(600);
  });

  it("coolant factor 0.7 vs 1.0 produces exactly the 0.7× ratio on VB_15min (engineering invariant)", () => {
    const withCoolant = ToolWearPrediction.predictFlankWearVBCompat(150, 0.2, 200, "carbide", true);
    const noCoolant = ToolWearPrediction.predictFlankWearVBCompat(150, 0.2, 200, "carbide", false);
    expect(withCoolant.VB_15min / noCoolant.VB_15min).toBeCloseTo(0.7, 12);
  });

  it("hardness factor scales linearly — HB=400 produces exactly 2× VB of HB=200 (engineering invariant)", () => {
    const hb200 = ToolWearPrediction.predictFlankWearVBCompat(150, 0.2, 200, "carbide", true);
    const hb400 = ToolWearPrediction.predictFlankWearVBCompat(150, 0.2, 400, "carbide", true);
    expect(hb400.VB_15min / hb200.VB_15min).toBeCloseTo(2.0, 12);
  });

  it("module exports WEAR_COEFFICIENTS_COMPAT with the 6 documented tool material rows", () => {
    expect(Object.keys(ToolWearPrediction.WEAR_COEFFICIENTS_COMPAT).sort()).toEqual(
      ["carbide", "cbn", "ceramic", "cermet", "hss", "pcd"]
    );
    // Each row must have exactly the 3 documented coefficients
    for (const row of Object.values(ToolWearPrediction.WEAR_COEFFICIENTS_COMPAT)) {
      expect(Object.keys(row).sort()).toEqual(["a", "b", "c"]);
    }
  });

  it("WEAR_COEFFICIENTS_COMPAT.carbide is exactly { a: 0.0003, b: 1.2, c: 0.2 } (frozen-baseline check)", () => {
    expect(ToolWearPrediction.WEAR_COEFFICIENTS_COMPAT.carbide).toEqual({ a: 0.0003, b: 1.2, c: 0.2 });
  });
});
