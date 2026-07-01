/**
 * R9 tests for the CORE helix-dependent axial force (U-OSC-SFC-HELIX-CORE-FORCE, task 11).
 *
 * Replaces the legacy fixed Fa = 0.2*Fc (which ignored helix -- a 0deg straight flute and a 45deg
 * tool got identical axial force) with the mechanistic Fa = Fc*tan(lambda), capped at tan(50deg).
 * Per the design spec (state/shared/specs/SFC-HELIX-CORE-FORCE-SPEC-2026-06-29.md, Option C):
 *   - radial Fr stays material/rake-driven (UNTOUCHED) -> deflection + workholding only TIGHTEN;
 *   - helix-absent path keeps the validated fixed ratio (401-gauntlet stays byte-identical).
 *
 * These tests pin: non-regression (helix absent -> 0.2), monotonicity, the tan(50deg) cap, the
 * beta=0 -> Fa~0 physical limit, adversarial fallback, the Fr/Fc-untouched invariant (proves only
 * Fa moved), and the SAFETY direction (higher helix -> higher resultant, never more permissive).
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  iso_group: "P" as const,
  tool_diameter_mm: 10,
  flutes: 4,
  operation: "milling" as const,
  cut_type: "roughing" as const,
  axial_depth_mm: 6,
  radial_depth_pct: 40,
};
const ratioAxial = (helix?: number, variable_helix?: boolean) => {
  const r = ultimateSpeedFeedEngine.calculate({
    ...BASE,
    ...(helix != null ? { helix_angle_deg: helix } : {}),
    ...(variable_helix != null ? { variable_helix } : {}),
  });
  return { Fa: r.forces.axial_force_N.value, Fc: r.forces.tangential_force_N.value, Fr: r.forces.radial_force_N.value, Fres: r.forces.resultant_force_N.value };
};

describe("UltimateSpeedFeedEngine -- core helix-dependent axial force (Option C)", () => {
  it("NON-REGRESSION: helix ABSENT keeps the fixed Fa = 0.2*Fc baseline", () => {
    const { Fa, Fc } = ratioAxial();
    expect(Fc).toBeGreaterThan(0);
    expect(Fa / Fc).toBeCloseTo(0.2, 1); // within rounding of the legacy fixed milling ratio
  });

  it("resolves Fa = Fc*tan(helix) for a milling op (45deg ~= Fc, 10deg ~= 0.176*Fc)", () => {
    const lo = ratioAxial(10);
    const hi = ratioAxial(45);
    expect(lo.Fa / lo.Fc).toBeCloseTo(Math.tan((10 * Math.PI) / 180), 1); // ~0.176
    expect(lo.Fa / lo.Fc).not.toBeCloseTo(0.2, 2); // load-bearing: must NOT be the legacy fixed 0.2 baseline
    expect(hi.Fa / hi.Fc).toBeCloseTo(1.0, 1); // tan(45) = 1.0
  });

  it("MONOTONE: a higher helix yields a higher axial force (45deg > 30deg > 10deg)", () => {
    const a10 = ratioAxial(10).Fa;
    const a30 = ratioAxial(30).Fa;
    const a45 = ratioAxial(45).Fa;
    expect(a30).toBeGreaterThan(a10);
    expect(a45).toBeGreaterThan(a30);
  });

  it("CAP: helix=70deg is capped at tan(50deg)~=1.19*Fc, NOT the unbounded tan(70deg)=2.75*Fc", () => {
    const { Fa, Fc } = ratioAxial(70);
    expect(Fa / Fc).toBeCloseTo(Math.tan((50 * Math.PI) / 180), 1); // ~1.19, capped
    expect(Fa / Fc).toBeLessThan(1.3); // proves NOT 2.75 (uncapped tan(70))
  });

  it("STRAIGHT FLUTE: helix=0deg -> axial force ~= 0 (the physical limit the fixed 0.2 violated)", () => {
    const { Fa, Fc } = ratioAxial(0);
    expect(Fa / Fc).toBeLessThan(0.02); // tan(0) = 0
  });

  it("ADVERSARIAL: NaN and negative helix fall back to the fixed 0.2 ratio (no crash)", () => {
    const nan = ratioAxial(Number.NaN);
    const neg = ratioAxial(-15);
    expect(nan.Fa / nan.Fc).toBeCloseTo(0.2, 1); // Number.isFinite(NaN) === false -> else branch
    expect(neg.Fa / neg.Fc).toBeCloseTo(0.2, 1); // helix < 0 guard -> else branch
  });

  it("INVARIANT: Fc and Fr are UNTOUCHED by helix (Option C changes ONLY the axial component)", () => {
    const none = ratioAxial();
    const h45 = ratioAxial(45);
    const h70 = ratioAxial(70);
    // tangential (Fc, Kienzle) and radial (Fr = 0.3*Fc) must be identical across helix values
    expect(h45.Fc).toBe(none.Fc);
    expect(h70.Fc).toBe(none.Fc);
    expect(h45.Fr).toBe(none.Fr);
    expect(h70.Fr).toBe(none.Fr);
  });

  it("SAFETY: a high-helix cell's resultant force is NOT LOWER than the no-helix baseline", () => {
    // checkWorkholding (NineAxis) reads resultant_force_N: higher resultant -> lower safety factor
    // -> more conservative. A high-helix cut must never produce a SMALLER resultant than the
    // fixed-ratio baseline (that would be a more-permissive verdict).
    const none = ratioAxial().Fres;
    const h45 = ratioAxial(45).Fres;
    const h70 = ratioAxial(70).Fres;
    expect(h45).toBeGreaterThanOrEqual(none);
    expect(h70).toBeGreaterThanOrEqual(h45);
  });
});
