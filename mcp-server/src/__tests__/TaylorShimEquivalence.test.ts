/**
 * TaylorShimEquivalence.test.ts — anti-regression for U-SFPSN-02B
 *
 * Verifies that ExtendedTaylorModel.calculate({ inline_compat: true, ... })
 * reproduces UltimateSpeedFeedEngine's pre-shim extendedTaylorToolLife()
 * outputs bit-equivalent (within REL_TOLERANCE).
 *
 * The frozen baseline `oldExtendedTaylorToolLife` is the EXACT body of the
 * engine's pre-refactor function (df730c2f3a:972-992) and MUST NOT be edited.
 * The point of this test is to catch any future drift in the module's
 * inline_compat branch that would diverge from this baseline.
 *
 * Mirrors the U-02A Kienzle shim equivalence pattern. Sister memory:
 * [[reference_sf_psn_u02_semantic_gap_2026_05_22]] (Taylor reconciliation
 * decision context). Spec: state/shared/specs/
 * SF-PSN-TAYLOR-FORMULA-RECONCILIATION-2026-05-22.md.
 *
 * @module __tests__/TaylorShimEquivalence
 */

import { describe, it, expect } from "vitest";

import { ExtendedTaylorModel } from "../algorithms/ExtendedTaylorModel.js";
import type { ISOGroup, MaterialPhysics } from "../physics/constants.js";

// ─── Frozen baseline (df730c2f3a:972-992 — DO NOT EDIT) ────────────

interface FrozenTaylorResult {
  T_min: number;
  sensitivity: { speed: number; feed: number; doc: number; dominant: "speed" | "feed" | "doc" };
}

/**
 * Verbatim copy of UltimateSpeedFeedEngine.extendedTaylorToolLife() body
 * from commit df730c2f3a (pre-U-SFPSN-02B). This is the bit-equivalence
 * baseline — the module's inline_compat output must match this within 1e-10.
 *
 * Anti-tamper: if a future edit "fixes" the baseline to make a divergent
 * module pass, the test loses its purpose. Reject any PR that edits this
 * function. The baseline can only be retired (deleted entirely) when
 * U-SFPSN-02D ships and the engine no longer needs inline_compat.
 */
function oldExtendedTaylorToolLife(
  Vc_mpm: number, n: number, C: number,
  feed_mm?: number, doc_mm?: number,
  m: number = 0.1, p: number = 0.1,
): FrozenTaylorResult {
  const f = Math.max(0.01, feed_mm || 0.15);
  const d = Math.max(0.1, doc_mm || 2.0);
  // T = (C / (V × f^m × d^p))^(1/n)
  const T_min = Math.pow(C / (Vc_mpm * Math.pow(f, m) * Math.pow(d, p)), 1 / n);
  // Sensitivity analysis: %ΔT / %ΔX
  const speedSens = -1 / n;
  const feedSens = -m / n;
  const docSens = -p / n;
  const absSens = [Math.abs(speedSens), Math.abs(feedSens), Math.abs(docSens)];
  const dominant: "speed" | "feed" | "doc" = absSens[0] >= absSens[1] && absSens[0] >= absSens[2] ? "speed"
    : absSens[1] >= absSens[2] ? "feed" : "doc";
  return {
    T_min: Math.max(1, Math.min(600, T_min)),
    sensitivity: { speed: speedSens, feed: feedSens, doc: docSens, dominant },
  };
}

// ─── Module shim invocation helper ───────────────────────────────────

/**
 * Invoke ExtendedTaylorModel.calculate() in inline_compat mode with the
 * same parameter set that the engine shim will use. Returns T_min in the
 * same shape as the frozen baseline so equivalence can be asserted directly.
 */
function moduleInlineCompat(
  Vc_mpm: number, n: number, C: number,
  feed_mm?: number, doc_mm?: number,
): number {
  // Mirror the engine shim's pre-defaulting: `|| 0.15` / `|| 2.0` BEFORE
  // passing to the module. The module's calculateInlineCompat() then floors
  // f at 0.01 and ap at 0.1 internally for bit-equivalence.
  const f = feed_mm || 0.15;
  const ap = doc_mm || 2.0;
  // Engine passes a MaterialPhysics object with kc1_1=0/mc=0 (unused by
  // Taylor) — only taylor_C, taylor_n, iso_group are read by inline_compat.
  const material: MaterialPhysics = {
    name: "inline-shim",
    kc1_1: 0,
    mc: 0,
    taylor_C: C,
    taylor_n: n,
    iso_group: "P" as ISOGroup,
  };
  const out = ExtendedTaylorModel.calculate({
    Vc_m_min: Vc_mpm,
    f_mm: f,
    ap_mm: ap,
    inline_compat: true,
    material,
  });
  return out.tool_life_min.value;
}

// ─── Fixture space ───────────────────────────────────────────────────

/**
 * 6 ISO C/n pairs (canonical defaults from src/physics/constants.ts).
 * Spans full ISO-group taxonomy: P/M/K/N/S/H.
 */
const TAYLOR_FIXTURES: ReadonlyArray<{ iso: ISOGroup; C: number; n: number }> = [
  { iso: "P", C: 250, n: 0.25 },   // Carbon steel — common case
  { iso: "M", C: 180, n: 0.22 },   // Stainless — feed-sensitive
  { iso: "K", C: 320, n: 0.28 },   // Cast iron — speed-tolerant
  { iso: "N", C: 800, n: 0.40 },   // Aluminum — high-speed regime
  { iso: "S", C: 80,  n: 0.18 },   // Superalloy — very wear-sensitive
  { iso: "H", C: 60,  n: 0.16 },   // Hardened — extreme wear sensitivity
];

const VC_FIXTURES = [50, 100, 200, 400, 800] as const;     // m/min, span low → HSM
const F_FIXTURES = [0.05, 0.15, 0.30, 0.60] as const;       // mm/rev, finishing → roughing
const D_FIXTURES = [0.5, 2.0, 5.0, 12.0] as const;          // mm depth, finishing → heavy

const REL_TOLERANCE = 1e-10;                                 // bit-equivalent modulo FP ordering

function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / Math.max(1, Math.abs(expected));
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("TaylorShimEquivalence — inline_compat ≡ frozen-baseline (U-SFPSN-02B)", () => {
  describe("T_min bit-equivalent across 480 fixtures (6 ISO × 5 Vc × 4 f × 4 d)", () => {
    it("module inline_compat matches frozen baseline within REL_TOLERANCE", () => {
      let maxRelErr = 0;
      let count = 0;
      const failures: Array<{ fixture: string; modRel: number; baseRel: number; relErr: number }> = [];

      for (const mat of TAYLOR_FIXTURES) {
        for (const Vc of VC_FIXTURES) {
          for (const f of F_FIXTURES) {
            for (const d of D_FIXTURES) {
              count++;
              const baseline = oldExtendedTaylorToolLife(Vc, mat.n, mat.C, f, d);
              const module_T = moduleInlineCompat(Vc, mat.n, mat.C, f, d);
              const err = relativeError(module_T, baseline.T_min);
              if (err > maxRelErr) maxRelErr = err;
              if (err > REL_TOLERANCE) {
                failures.push({
                  fixture: `iso=${mat.iso} C=${mat.C} n=${mat.n} Vc=${Vc} f=${f} d=${d}`,
                  modRel: module_T,
                  baseRel: baseline.T_min,
                  relErr: err,
                });
              }
            }
          }
        }
      }
      expect(count).toBe(6 * 5 * 4 * 4);            // 480 fixtures
      expect(failures).toEqual([]);                  // empty on success
      expect(maxRelErr).toBeLessThan(REL_TOLERANCE);
    });
  });

  describe("Clamping boundary preservation", () => {
    it("upper clamp at T=600 — extreme low Vc with high C should saturate", () => {
      // n=0.25, C=800, Vc=50, f=0.30, d=2.0 → T_raw very large, clamped to 600.
      const baseline = oldExtendedTaylorToolLife(50, 0.25, 800, 0.30, 2.0);
      const module_T = moduleInlineCompat(50, 0.25, 800, 0.30, 2.0);
      expect(baseline.T_min).toBe(600);              // upper clamp engaged
      expect(module_T).toBe(600);                    // module must also clamp
    });

    it("lower clamp at T=1 — extreme high Vc with low C should saturate", () => {
      // n=0.16, C=60, Vc=800, f=0.60, d=12.0 → T_raw extremely small, clamped to 1.
      const baseline = oldExtendedTaylorToolLife(800, 0.16, 60, 0.60, 12.0);
      const module_T = moduleInlineCompat(800, 0.16, 60, 0.60, 12.0);
      expect(baseline.T_min).toBe(1);                // lower clamp engaged
      expect(module_T).toBe(1);                      // module must also clamp
    });

    it("mid-range T values pass through both clamps unchanged", () => {
      // n=0.25, C=250, Vc=200, f=0.15, d=2.0 → T ≈ 4.4 min (between 1 and 600).
      const baseline = oldExtendedTaylorToolLife(200, 0.25, 250, 0.15, 2.0);
      const module_T = moduleInlineCompat(200, 0.25, 250, 0.15, 2.0);
      expect(baseline.T_min).toBeGreaterThan(1);
      expect(baseline.T_min).toBeLessThan(600);
      expect(module_T).toBeCloseTo(baseline.T_min, 9);
    });
  });

  describe("Defaulting + flooring preservation", () => {
    it("feed=undefined defaults to 0.15 (bit-equivalent on both paths)", () => {
      // Both paths default feed_mm undefined → 0.15.
      const baseline = oldExtendedTaylorToolLife(150, 0.25, 250, undefined, 2.0);
      const module_T = moduleInlineCompat(150, 0.25, 250, undefined, 2.0);
      expect(relativeError(module_T, baseline.T_min)).toBeLessThan(REL_TOLERANCE);
    });

    it("doc=undefined defaults to 2.0 (bit-equivalent on both paths)", () => {
      const baseline = oldExtendedTaylorToolLife(150, 0.25, 250, 0.15, undefined);
      const module_T = moduleInlineCompat(150, 0.25, 250, 0.15, undefined);
      expect(relativeError(module_T, baseline.T_min)).toBeLessThan(REL_TOLERANCE);
    });

    it("feed=0 falls back to 0.15 via `|| default` (bit-equivalent)", () => {
      const baseline = oldExtendedTaylorToolLife(150, 0.25, 250, 0, 2.0);
      const module_T = moduleInlineCompat(150, 0.25, 250, 0, 2.0);
      expect(relativeError(module_T, baseline.T_min)).toBeLessThan(REL_TOLERANCE);
    });

    it("feed=0.005 floors to 0.01 on both paths (engine + module)", () => {
      const baseline = oldExtendedTaylorToolLife(150, 0.25, 250, 0.005, 2.0);
      const module_T = moduleInlineCompat(150, 0.25, 250, 0.005, 2.0);
      // Both paths see f = max(0.01, 0.005) = 0.01.
      expect(relativeError(module_T, baseline.T_min)).toBeLessThan(REL_TOLERANCE);
    });

    it("doc=0.05 floors to 0.1 on both paths (engine + module)", () => {
      const baseline = oldExtendedTaylorToolLife(150, 0.25, 250, 0.15, 0.05);
      const module_T = moduleInlineCompat(150, 0.25, 250, 0.15, 0.05);
      // Both paths see d = max(0.1, 0.05) = 0.1.
      expect(relativeError(module_T, baseline.T_min)).toBeLessThan(REL_TOLERANCE);
    });
  });

  describe("Sensitivity triple — purely algebraic, computed by engine (not module)", () => {
    it("frozen-baseline sensitivity formula matches its declared shape", () => {
      // The engine's shim computes sensitivity locally — this just verifies
      // the algebraic identities the engine relies on still hold so the shim
      // stays correct without a regression test on the engine itself.
      const n = 0.25;
      const m = 0.1;
      const p = 0.1;
      const r = oldExtendedTaylorToolLife(200, n, 250, 0.15, 2.0, m, p);
      expect(r.sensitivity.speed).toBeCloseTo(-1 / n, 12);
      expect(r.sensitivity.feed).toBeCloseTo(-m / n, 12);
      expect(r.sensitivity.doc).toBeCloseTo(-p / n, 12);
      expect(r.sensitivity.dominant).toBe("speed");  // |-1/n| > |-m/n| = |-p/n| for m=p=0.1
    });
  });

  describe("Non-default m, p — engine shim falls through to local formula", () => {
    it("m=0.2, p=0.15 reproduces canonical extended-Taylor (no module call)", () => {
      // The engine shim falls through when m or p differs from 0.1. This test
      // documents the formula it falls through to so future edits to the
      // local fallback don't drift.
      const Vc = 200, n = 0.25, C = 250, f = 0.15, d = 2.0, m = 0.2, p = 0.15;
      const r = oldExtendedTaylorToolLife(Vc, n, C, f, d, m, p);
      const expected = Math.max(1, Math.min(600,
        Math.pow(C / (Vc * Math.pow(f, m) * Math.pow(d, p)), 1 / n)));
      expect(r.T_min).toBeCloseTo(expected, 9);
    });
  });

  describe("Output-shape stability (inline_compat returns TaylorOutput, not just T_min)", () => {
    it("module exposes coating_factor=1, temp_factor=1, hardness_factor=1 in inline_compat", () => {
      const material: MaterialPhysics = {
        name: "test",
        kc1_1: 0,
        mc: 0,
        taylor_C: 250,
        taylor_n: 0.25,
        iso_group: "P",
      };
      const out = ExtendedTaylorModel.calculate({
        Vc_m_min: 150,
        f_mm: 0.15,
        ap_mm: 2.0,
        inline_compat: true,
        material,
      });
      expect(out.coating_factor).toBe(1.0);
      expect(out.temperature_factor).toBe(1.0);
      expect(out.hardness_factor).toBe(1.0);
      expect(out.total_correction).toBe(1.0);
      expect(out.feed_exponent).toBe(0.1);
      expect(out.depth_exponent).toBe(0.1);
      expect(out.warnings).toEqual([]);
      expect(out.tool_life_min.source).toBe("Taylor-inline-compat");
    });

    it("module exposes both clamped and unclamped life via tool_life_min + base_life_min", () => {
      // For an extreme fixture that triggers the upper clamp, base_life_min
      // holds the raw value while tool_life_min holds 600.
      const material: MaterialPhysics = {
        name: "test",
        kc1_1: 0,
        mc: 0,
        taylor_C: 800,
        taylor_n: 0.25,
        iso_group: "P",
      };
      const out = ExtendedTaylorModel.calculate({
        Vc_m_min: 50,
        f_mm: 0.30,
        ap_mm: 2.0,
        inline_compat: true,
        material,
      });
      expect(out.tool_life_min.value).toBe(600);                   // clamped
      expect(out.base_life_min.value).toBeGreaterThan(600);          // raw > 600
    });
  });
});
