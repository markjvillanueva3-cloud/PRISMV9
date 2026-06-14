/**
 * KienzleShimEquivalence — SF-PSN-WIRE-MS0/U-SFPSN-02A regression gate.
 *
 * Verifies that the new `kienzleCuttingForce` (which delegates to
 * `KienzleForceModel.calculate()` via the behaviour-preserving shim) returns
 * outputs bit-equivalent to the OLD inline formula at every realistic input
 * combination the engine's public API would ever pass.
 *
 * The OLD inline formula is embedded below as `oldKienzleCuttingForce`, taken
 * verbatim from UltimateSpeedFeedEngine.ts:848-863 in commit `df730c2f3a`
 * (the last commit before this shim landed). DO NOT EDIT this function — it
 * is the frozen regression baseline. Any future evolution of the shim must
 * keep `kienzleCuttingForce()`'s outputs identical to it (within float ε).
 *
 * Coverage: 180 fixtures = 6 ISO-group kc1.1/mc pairs × 5 chip thicknesses
 *   × 2 chip widths × 3 rake angles (incl. clamp-triggering γ = ±30°).
 *
 * Tolerance: relative |new - old| / max(1, |old|) ≤ 1e-12 (bit-equivalent
 * modulo floating-point ordering — both paths compute identical expressions).
 */

import { describe, it, expect } from "vitest";
import { kienzleCuttingForce } from "../engines/UltimateSpeedFeedEngine.js";

// ─── Frozen baseline: OLD inline formula from df730c2f3a:848-863 ─────────────
//
// FROZEN — do not edit. Engineering edits to the SHIM must keep this function's
// outputs identical (within float ε). If you change the FORMULA itself (not the
// composition), update U-SFPSN-02B/C reconciliation spec first.
function oldKienzleCuttingForce(
  kc1_1: number, mc: number, ap_mm: number, hex_mm: number,
  _ae_mm?: number, _Dc_mm?: number,
  rakeAngleDeg?: number,
): { Fc: number; Kc: number; Kc_uncorrected: number } {
  const h = Math.max(0.001, hex_mm);
  const Kc_uncorrected = kc1_1 * Math.pow(h, -mc);
  const gamma0 = rakeAngleDeg ?? 0;
  const rakeCorrection = 1 - 0.01 * gamma0;
  const Kc = Kc_uncorrected * Math.max(0.7, Math.min(1.3, rakeCorrection));
  const b = ap_mm;
  const Fc = Kc * b * h;
  return { Fc, Kc, Kc_uncorrected };
}

// ─── Fixture generation ─────────────────────────────────────────────────────

interface Fixture {
  kc1_1: number; mc: number; h: number; ap: number; gamma: number;
  iso_label: string;
}

const ISO_GROUPS = [
  { kc1_1: 1800, mc: 0.25, iso_label: "P-steel" },
  { kc1_1: 2100, mc: 0.28, iso_label: "M-stainless" },
  { kc1_1: 1100, mc: 0.20, iso_label: "K-cast-iron" },
  { kc1_1: 700,  mc: 0.21, iso_label: "N-aluminum" },
  { kc1_1: 2800, mc: 0.31, iso_label: "S-superalloy" },
  { kc1_1: 3200, mc: 0.30, iso_label: "H-hardened" },
];

// Realistic engine-usage range: every call site floors hex_mm at 0.01mm before
// calling kienzleCuttingForce() (see UltimateSpeedFeedEngine.ts call site at
// :2018 — `Math.max(0.01, ...)`). The module's chip_thickness_mm.min is 0.01,
// matching this practical floor. The shim is therefore tested across the
// engine's actual operating range; h ∈ [0.001, 0.01) is degenerate-input
// territory the public API never produces.
const CHIP_THICKNESSES_MM = [0.01, 0.05, 0.15, 0.30, 1.50];  // covers fine finishing → heavy roughing
const CHIP_WIDTHS_MM      = [1.0, 6.0];                        // typical milling ap range
const RAKE_ANGLES_DEG     = [-30, 0, 30];                      // clamp boundaries + default

const FIXTURES: Fixture[] = [];
for (const iso of ISO_GROUPS) {
  for (const h of CHIP_THICKNESSES_MM) {
    for (const ap of CHIP_WIDTHS_MM) {
      for (const gamma of RAKE_ANGLES_DEG) {
        FIXTURES.push({ kc1_1: iso.kc1_1, mc: iso.mc, h, ap, gamma, iso_label: iso.iso_label });
      }
    }
  }
}

// ─── Equivalence assertion ──────────────────────────────────────────────────

const REL_TOLERANCE = 1e-12;  // bit-equivalent within float epsilon

function relDiff(a: number, b: number): number {
  return Math.abs(a - b) / Math.max(1, Math.abs(b));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("U-SFPSN-02A — KienzleForceModel shim bit-equivalence to inline baseline", () => {
  it("generated 180 fixtures across 6 ISO groups × 5 h × 2 ap × 3 γ", () => {
    expect(FIXTURES.length).toBe(180);
    expect(FIXTURES.every(f => f.kc1_1 > 0)).toBe(true);
    expect(FIXTURES.every(f => f.h > 0)).toBe(true);
  });

  it("Fc matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: Array<{ fx: Fixture; old: number; neu: number; rel: number }> = [];
    for (const fx of FIXTURES) {
      const oldR = oldKienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const neuR = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const rel = relDiff(neuR.Fc, oldR.Fc);
      if (rel > REL_TOLERANCE) failures.push({ fx, old: oldR.Fc, neu: neuR.Fc, rel });
    }
    if (failures.length > 0) {
      const sample = failures.slice(0, 5).map(f =>
        `[${f.fx.iso_label} h=${f.fx.h} ap=${f.fx.ap} γ=${f.fx.gamma}] old=${f.old.toFixed(6)} new=${f.neu.toFixed(6)} rel=${f.rel.toExponential(3)}`
      ).join("\n  ");
      throw new Error(`${failures.length}/${FIXTURES.length} Fc fixtures exceed ${REL_TOLERANCE} relative tolerance. First 5:\n  ${sample}`);
    }
    expect(failures.length).toBe(0);
  });

  it("Kc matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: number[] = [];
    for (const fx of FIXTURES) {
      const oldR = oldKienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const neuR = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      if (relDiff(neuR.Kc, oldR.Kc) > REL_TOLERANCE) failures.push(FIXTURES.indexOf(fx));
    }
    expect(failures).toEqual([]);
  });

  it("Kc_uncorrected matches inline baseline to ≤1e-12 relative on every fixture", () => {
    const failures: number[] = [];
    for (const fx of FIXTURES) {
      const oldR = oldKienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const neuR = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      if (relDiff(neuR.Kc_uncorrected, oldR.Kc_uncorrected) > REL_TOLERANCE) failures.push(FIXTURES.indexOf(fx));
    }
    expect(failures).toEqual([]);
  });

  it("rake clamp [0.7, 1.3] applies bit-identically at γ = ±30° boundary", () => {
    // At γ = -30 → unclamped = 1.30 → clamped = 1.30 (boundary, no clamping)
    // At γ = +30 → unclamped = 0.70 → clamped = 0.70 (boundary, no clamping)
    // The boundaries themselves don't trigger clamping but verify formula match.
    const fxNeg30 = { kc1_1: 1800, mc: 0.25, h: 0.15, ap: 2.0, gamma: -30 };
    const fxPos30 = { kc1_1: 1800, mc: 0.25, h: 0.15, ap: 2.0, gamma:  30 };
    for (const fx of [fxNeg30, fxPos30]) {
      const oldR = oldKienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const neuR = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      expect(relDiff(neuR.Fc, oldR.Fc)).toBeLessThan(REL_TOLERANCE);
      expect(relDiff(neuR.Kc, oldR.Kc)).toBeLessThan(REL_TOLERANCE);
    }
  });

  it("rake clamp engages bit-identically at γ = ±50° (outside [-30, 30])", () => {
    // At γ = -50 → unclamped = 1.50 → clamped to 1.30 in both implementations.
    // At γ = +50 → unclamped = 0.50 → clamped to 0.70 in both implementations.
    // This is the critical case where the shim's manual clamp must match the
    // engine's inline clamp (module itself does NOT clamp).
    const cases = [
      { gamma: -50, expectedRakeCorr: 1.30 },
      { gamma:  50, expectedRakeCorr: 0.70 },
    ];
    for (const c of cases) {
      const old = oldKienzleCuttingForce(1800, 0.25, 2.0, 0.15, undefined, undefined, c.gamma);
      const neu = kienzleCuttingForce(1800, 0.25, 2.0, 0.15, undefined, undefined, c.gamma);
      // Bit-equivalence of the clamped output.
      expect(relDiff(neu.Fc, old.Fc)).toBeLessThan(REL_TOLERANCE);
      // Sanity: the clamp actually fired (Kc/Kc_uncorrected ≈ expected clamp value).
      const observedRakeCorr = neu.Kc / neu.Kc_uncorrected;
      expect(Math.abs(observedRakeCorr - c.expectedRakeCorr)).toBeLessThan(1e-9);
    }
  });

  it("edge-radius effect remains DISABLED across all fixtures (h ≥ 0.005 >> 3·0.001 = 0.003)", () => {
    // The shim passes edge_radius_mm: 0.001 specifically so the module's
    // edge correction (h < 3·edge_radius) never triggers for h > 0.003mm.
    // Verifying by checking that Kc_uncorrected exactly equals kc1_1 × h^(-mc)
    // (the bare module Kc with no edge correction folded in).
    for (const fx of FIXTURES) {
      const r = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const h = Math.max(0.001, fx.h);
      const expected = fx.kc1_1 * Math.pow(h, -fx.mc);
      expect(relDiff(r.Kc_uncorrected, expected)).toBeLessThan(REL_TOLERANCE);
    }
  });

  it("documents the h-floor semantic gap: shim diverges from inline for h < 0.01mm (module clamps at 0.01, inline clamps at 0.001)", () => {
    // The inline implementation floors hex_mm at 0.001mm; KienzleForceModel
    // clamps chip_thickness_mm to its VALID_RANGES.chip_thickness_mm.min = 0.01.
    // The shim therefore diverges from the inline baseline for h ∈ [0.001, 0.01).
    // This is acceptable because every engine call site already supplies
    // hex_mm ≥ 0.01 (UltimateSpeedFeedEngine.ts:2018 uses Math.max(0.01, ...))
    // — h < 0.01 is degenerate-input territory the public API never produces.
    // This test EXISTS to document the gap so any future caller passing h < 0.01
    // is on notice. If the gap ever needs closing, the shim must add its own
    // pre-clamp at h < 0.01 falling back to the inline formula.
    const oldR = oldKienzleCuttingForce(1800, 0.25, 2.0, 0.005 /* below module's min */, undefined, undefined, 0);
    const neuR = kienzleCuttingForce(1800, 0.25, 2.0, 0.005, undefined, undefined, 0);
    // Documented gap: shim Kc reflects h=0.01 floor, inline Kc reflects h=0.005.
    // Verify direction (shim Kc < inline Kc because h_module=0.01 > h_inline=0.005,
    // and Kc = kc1_1 × h^(-mc) decreases with increasing h).
    expect(neuR.Kc_uncorrected).toBeLessThan(oldR.Kc_uncorrected);
    // The OLD path uses h=0.005 → Kc_uncorrected ≈ 1800 × 0.005^(-0.25) ≈ 6781.
    const expectedOldKc = 1800 * Math.pow(0.005, -0.25);
    expect(relDiff(oldR.Kc_uncorrected, expectedOldKc)).toBeLessThan(REL_TOLERANCE);
    // The NEW (shim) path uses h=0.01 → Kc_uncorrected ≈ 1800 × 0.01^(-0.25) ≈ 5697.
    const expectedNewKc = 1800 * Math.pow(0.01, -0.25);
    expect(relDiff(neuR.Kc_uncorrected, expectedNewKc)).toBeLessThan(REL_TOLERANCE);
  });

  it("milestone exit condition: 50+ fixtures × Fc/Kc/Kc_uncorrected within 1e-6 (envelope target)", () => {
    // Restates the milestone's exit_condition #2 ("50+ fixtures all within 1e-6")
    // and verifies satisfaction simultaneously across all 3 output channels.
    expect(FIXTURES.length).toBeGreaterThanOrEqual(50);
    const envTol = 1e-6;
    for (const fx of FIXTURES) {
      const oldR = oldKienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      const neuR = kienzleCuttingForce(fx.kc1_1, fx.mc, fx.ap, fx.h, undefined, undefined, fx.gamma);
      expect(relDiff(neuR.Fc, oldR.Fc)).toBeLessThan(envTol);
      expect(relDiff(neuR.Kc, oldR.Kc)).toBeLessThan(envTol);
      expect(relDiff(neuR.Kc_uncorrected, oldR.Kc_uncorrected)).toBeLessThan(envTol);
    }
  });
});
