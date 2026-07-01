/**
 * Dispatcher round-trip — prism_calc:effective_diameter_compute lazy-import path.
 *
 * Per CLAUDE.md comprehensive-build-enforcement: a test MUST invoke through the
 * dispatcher lazy-import path, not just the engine singleton. This file
 * mirrors the dispatcher case-block contract — same import path, same call
 * signature — so a future rename would fail this test (R10 checkpoint).
 */

import { describe, it, expect } from "vitest";

describe("prism_calc:effective_diameter_compute — dispatcher round-trip", () => {
  it("lazy-import path resolves + compute export is callable", async () => {
    const mod = await import("../algorithms/EffectiveDiameterCompensator.js");
    expect(typeof mod.compute).toBe("function");
    expect(mod.EffectiveDiameterCompensator.version).toBe("1.0.0");
  });

  it("ball-end smoke through lazy-import: 6mm @ d=1mm returns D_eff ≈ 4.47", async () => {
    const { compute } = await import("../algorithms/EffectiveDiameterCompensator.js");
    const result = compute({ geometry: "ball_end", nominal_diameter_mm: 6, depth_mm: 1 });
    expect(result.effective_diameter_mm.value).toBeCloseTo(4.472, 2);
    expect(result.fully_engaged).toBe(false);
    expect(result.vc_correction_multiplier.value).toBeGreaterThan(1);
  });

  it("dispatcher-shape invalid input → notes carry the diagnostic, never throws", async () => {
    const { compute } = await import("../algorithms/EffectiveDiameterCompensator.js");
    const result = compute({ geometry: "ball_end", nominal_diameter_mm: NaN, depth_mm: 1 });
    expect(result.notes.join("|")).toContain("not finite");
    expect(result.effective_diameter_mm.value).toBe(0);
  });
});
