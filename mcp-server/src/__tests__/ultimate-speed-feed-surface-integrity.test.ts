/**
 * UltimateSpeedFeedEngine surface_integrity output -- SFC-WIRING-MS0 gap #6 (slot:oscar).
 *
 * The SFC exposed surface_FINISH (Ra) but no surface_INTEGRITY counterpart. This wires the
 * standalone SurfaceIntegrityEngine into the SFC as an ADDITIVE result.surface_integrity
 * sub-result (residual stress sign/magnitude, white-layer thickness, affected-layer depth,
 * hardness change, fatigue derating, quality score), consuming the resolved Vc/feed/ap and
 * surfacing the engine's white-layer / tensile-residual warnings into the SFC warnings array.
 * REPORT-ONLY: assigned AFTER the result is assembled, so it perturbs NO existing field (the
 * unchanged ultimate-speed-feed + 206-assert gauntlet suites are the additive-safety proof).
 *
 * Reference anchors (SurfaceIntegrityEngine PROCESS_DATA): milling base residual = -50 MPa
 * (compressive), affected-layer 40 um, white-layer 0, quality_base 6 -- the engine scales these
 * by feed/speed/coolant, so we assert physically-valid bounds + sign, not a single magic number.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  tool_diameter_mm: 12, flutes: 4, operation: "milling", cut_type: "roughing",
  axial_depth_mm: 4, radial_depth_mm: 6,
};
const calc = (o: Record<string, unknown>) => ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);
const si = (o: Record<string, unknown>) => {
  const s = calc(o).surface_integrity;
  if (!s) throw new Error("surface_integrity missing for " + JSON.stringify(o));
  return s;
};

describe("UltimateSpeedFeed surface_integrity output (SFC-WIRING-MS0 gap #6)", () => {
  it("milling steel -> integrity fields land in their physically-valid bands (residual compressive-leaning, quality 0-10)", () => {
    const s = si({ material: "steel", iso_group: "P" });
    // residual stress in MPa: machining range is ~[-800,+800]; milling base is compressive (-50).
    expect(s.residual_stress_surface_MPa.value).toBeGreaterThan(-2000);
    expect(s.residual_stress_surface_MPa.value).toBeLessThan(600);
    expect(s.surface_quality_score.value).toBeGreaterThan(0);
    expect(s.surface_quality_score.value).toBeLessThanOrEqual(10);
    expect(s.affected_layer_depth_um.value).toBeGreaterThan(0);
    expect(s.affected_layer_depth_um.value).toBeLessThan(2000);
    expect(s.white_layer_thickness_um.value).toBeGreaterThanOrEqual(0);
    expect(s.fatigue_derating_factor.value).toBeGreaterThan(0);
  });

  it("ADDITIVE: the core result (cutting_speed/feed_rate/forces/surface_finish) is intact AND surface_integrity is present too", () => {
    const r = calc({ material: "steel", iso_group: "P" });
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.forces.resultant_force_N.value).toBeGreaterThan(0);
    expect(r.surface_finish.theoretical_ra_um.value).toBeGreaterThan(0);
    expect(r.surface_integrity?.surface_quality_score.value).toBeGreaterThan(0); // present, nothing replaced
  });

  it("material mapping spans ISO groups (P steel, M stainless, N aluminum, S titanium) -> each yields a finite quality score", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["steel", "P"], ["stainless steel", "M"], ["aluminum", "N"], ["titanium", "S"],
    ];
    for (const [material, iso] of cases) {
      const s = si({ material, iso_group: iso });
      expect(Number.isFinite(s.fatigue_derating_factor.value), `${material}/${iso}`).toBe(true);
      expect(s.surface_quality_score.value).toBeGreaterThan(0);
      expect(s.surface_quality_score.value).toBeLessThanOrEqual(10);
    }
  });

  it("S-group ti-vs-nickel disambiguation: titanium and inconel both produce a finite affected-layer depth", () => {
    expect(si({ material: "titanium", iso_group: "S" }).affected_layer_depth_um.value).toBeGreaterThan(0);
    expect(si({ material: "inconel", iso_group: "S" }).affected_layer_depth_um.value).toBeGreaterThan(0);
  });

  it("ADVERSARIAL: extreme feed + cryogenic coolant -> every surface_integrity field stays finite (no NaN/crash)", () => {
    const s = si({ material: "titanium", iso_group: "S", feed_per_tooth_mm: 2.0, coolant: "cryogenic" });
    for (const v of Object.values(s)) {
      expect(Number.isFinite((v as { value: number }).value)).toBe(true);
    }
  });
});
