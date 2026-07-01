/**
 * Tool-life uncertainty band -- Taylor-sensitivity-aware (SFC-WIRING-MS0 gap #7, slot:oscar).
 *
 * The SFC already reported `uncertainty.tool_life` via monteCarloUncertainty, but with INLINE,
 * MATERIAL-BLIND CVs ([0.20, 0.10]) -- so every material got the same life scatter, ignoring that
 * Taylor life T=(C/V)^(1/n) is FAR more sensitive for low-n materials (the 1/n exponent amplifies
 * the C/V parameter scatter). This wires `stochasticToolWearEngine.fosmTaylorLife` with the canonical
 * CANONICAL_TAYLOR_LIFE_CV (ISO 3685 scatter) so the reported life band is propagated through the
 * REAL Taylor params: low-n (superalloy n=0.18, hardened n=0.15) report a WIDER band than high-n
 * (aluminum n=0.40). Report-only; ci_95_low floored at 0 (a tool life cannot be negative). The
 * existing 5 invariant tests (cv>0, CI brackets nominal, cv>speed-cv, finite) are preserved.
 *
 * Determinism: fosmTaylorLife AND monteCarloUncertainty are both ANALYTICAL (FOSM / RSS, no random
 * sampling despite the "monteCarlo" name), so the SFC stays deterministic.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing",
  axial_depth_mm: 3, radial_depth_mm: 5,
};
const calc = (o: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);
const lifeCv = (o: Record<string, unknown>) => calc(o).uncertainty.tool_life.cv_pct;

describe("UltimateSpeedFeed tool-life uncertainty (gap #7: Taylor-sensitivity-aware band)", () => {
  it("low-n materials report a WIDER life CV than high-n (1/n amplifies Taylor scatter)", () => {
    const aluminum = lifeCv({ material: "aluminum", iso_group: "N" });            // n=0.40 (high)
    const superalloy = lifeCv({ material: "inconel", iso_group: "S" });           // n=0.18 (low)
    const hardened = lifeCv({ material: "steel", iso_group: "P", hardness_hb: 500 }); // -> ISO-H n=0.15
    expect(superalloy).toBeGreaterThan(aluminum);
    expect(hardened).toBeGreaterThan(aluminum);
  });

  it("life CV exceeds cutting-speed CV (life amplified by 1/n) -- key invariant, now physics-derived", () => {
    const r = calc({ material: "steel", iso_group: "P" });
    expect(r.uncertainty.tool_life.cv_pct).toBeGreaterThan(r.uncertainty.cutting_speed.cv_pct);
  });

  it("CI brackets the point estimate; ci_95_low floored at 0 (no negative tool life); finite", () => {
    const r = calc({ material: "steel", iso_group: "P", hardness_hb: 550 }); // low-n -> widest band
    const u = r.uncertainty.tool_life;
    expect(u.ci_95_low).toBeGreaterThanOrEqual(0);
    expect(u.ci_95_low).toBeLessThan(r.tool_life.life_minutes.value);
    expect(u.ci_95_high).toBeGreaterThan(r.tool_life.life_minutes.value);
    expect(Number.isFinite(u.cv_pct)).toBe(true);
  });

  it("DETERMINISTIC: the band is analytical (no random sampling), so repeat calls are byte-identical", () => {
    const a = lifeCv({ material: "steel", iso_group: "P" });
    const b = lifeCv({ material: "steel", iso_group: "P" });
    expect(a).toBe(b);
  });
});
