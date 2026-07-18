/**
 * ThreadTurningEngine — external 60° depth-of-thread regression test.
 *
 * Guards the fix for the spurious ×0.625 factor that cut every 60° thread
 * 0.625× too shallow (oversize minor diameter → GO ring-gauge reject).
 *
 * Reference geometry (Machinery's Handbook Ch.20 "Threading"; ISO 68-1):
 *   Fundamental-triangle height  H  = 0.86603·P
 *   External 60° thread height   h3 = 17·H/24 = 0.61343·P  (radial infeed)
 *   External minor diameter      d3 = D_major − 2·h3
 * hFactor for metric_60 / un_60 encodes h3/P = 0.6134, so the radial
 * depth-of-thread is exactly pitch × 0.6134 — never ×0.625 that value again.
 * Coherent with ThreadCalculationEngine (H = 0.6134·P, minor = D − 2H) and
 * SinglePointThreadEngine (DEPTH_FACTOR 0.6134 as the full total depth).
 */

import { describe, it, expect } from "vitest";
import { threadTurningEngine } from "../engines/ThreadTurningEngine.js";

// ISO 68-1 external 60° thread height h3/P (= 17H/24). Hand-derived reference,
// NOT re-imported from the engine — the test must fail if the engine drifts.
const H3_OVER_P = 0.6134;

describe("ThreadTurningEngine — external 60° depth-of-thread (h3 = 0.6134·P)", () => {
  it("M10×1.5 external: full radial depth 0.6134·P and minor Ø = D − 2·h3 (not the ×0.625 undercut)", () => {
    const r = threadTurningEngine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      thread_form: "metric_60",
      is_external: true,
    });

    // h3 = 1.5 × 0.6134 = 0.9201 mm radial infeed
    expect(r.thread_depth.value).toBeCloseTo(H3_OVER_P * 1.5, 2); // 0.9201 → 0.92
    // minor = 10 − 2·0.9201 = 8.1598 → 8.16 (matches ThreadCalculationEngine)
    expect(r.minor_diameter.value).toBeCloseTo(8.16, 2);

    // Regression guard: the removed ×0.625 gave 0.575 mm / Ø8.85 — must be GONE.
    expect(r.thread_depth.value).not.toBeCloseTo(0.575, 2);
    expect(r.minor_diameter.value).not.toBeCloseTo(8.85, 2);

    // Invariant: for a single-point external thread the radial infeed IS the
    // thread height, so thread_depth must equal thread_height.
    expect(r.thread_depth.value).toBeCloseTo(r.thread_height.value, 3);
  });

  it("depth-of-thread invariant: thread_depth = pitch × 0.6134 and minor = D − 2·(pitch×0.6134) across pitches", () => {
    const cases: Array<{ p: number; d: number; minor: number }> = [
      { p: 1.25, d: 8, minor: 6.47 },  // M8×1.25:  h3 0.76675 → minor 6.4665
      { p: 1.5, d: 10, minor: 8.16 },  // M10×1.5:  h3 0.9201  → minor 8.1598
      { p: 2.5, d: 20, minor: 16.93 }, // M20×2.5:  h3 1.5335  → minor 16.933
    ];
    for (const c of cases) {
      const r = threadTurningEngine.calculate({
        pitch_mm: c.p,
        major_diameter_mm: c.d,
        thread_form: "metric_60",
        is_external: true,
      });
      expect(r.thread_depth.value).toBeCloseTo(H3_OVER_P * c.p, 2);
      expect(r.minor_diameter.value).toBeCloseTo(c.minor, 2);
      // Algebraic tie: diametral undercut = 2× the radial infeed depth.
      expect(c.d - 2 * r.thread_depth.value).toBeCloseTo(r.minor_diameter.value, 1);
    }
  });

  it("un_60 form uses the same 0.6134·P external height as metric_60", () => {
    const un = threadTurningEngine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      thread_form: "un_60",
      is_external: true,
    });
    expect(un.thread_depth.value).toBeCloseTo(H3_OVER_P * 1.5, 2);
    expect(un.minor_diameter.value).toBeCloseTo(8.16, 2);
  });

  it("internal 60° thread: ×0.625 removed on the +2H branch too (major-side = D + 2·h3)", () => {
    const r = threadTurningEngine.calculate({
      pitch_mm: 1.5,
      major_diameter_mm: 10,
      thread_form: "metric_60",
      is_external: false,
    });
    // 10 + 2×0.9201 = 11.8402 → 11.84 ; the removed ×0.625 bug gave 11.15
    expect(r.minor_diameter.value).toBeCloseTo(11.84, 2);
    expect(r.minor_diameter.value).not.toBeCloseTo(11.15, 2);
  });
});
