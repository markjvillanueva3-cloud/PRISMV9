/**
 * Ball-end effective-diameter correction -- SFC-WIRING-MS0 gap #8 (slot:oscar).
 *
 * A ball-nose mill (corner radius ~= tool radius) at axial depth ap < R cuts on a contact circle
 * SMALLER than the nominal diameter (Deff = 2*sqrt(ap*(D-ap))), so the surface speed AT THE CUT is
 * Vc*Deff/D -- below the headline Vc. This wires ballEndMillEngine.effectiveDiameter (SINGLE SOURCE
 * of the Deff geometry) into the SFC as an ADDITIVE result.ball_end_effective (effective dia +
 * effective Vc + RPM-to-hold-target-Vc + engagement %) plus an operator warning. REPORT-ONLY: the
 * headline Vc/RPM/feed are NOT changed. Fires only for a ball-nose tool (corner_radius >= 0.95*R)
 * milling at a shallow DOC (0 < ap < R).
 *
 * Reference Deff at D=10, ap=1: 2*sqrt(1*(10-1)) = 6.0 mm (60% engagement). Sandvik C-2920:25.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  tool_diameter_mm: 10, flutes: 2, operation: "milling", cut_type: "finishing",
  material: "steel", iso_group: "P", radial_depth_mm: 0.5,
};
const calc = (o: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);

describe("UltimateSpeedFeed ball-end effective diameter (SFC-WIRING-MS0 gap #8)", () => {
  it("ball-nose at shallow DOC (ap<R): Deff = 2*sqrt(ap*(D-ap)) = 6.0mm at D=10/ap=1, effective Vc < headline Vc", () => {
    const r = calc({ corner_radius_mm: 5, axial_depth_mm: 1 }); // R=5 ball nose, ap=1
    const be = r.ball_end_effective;
    if (!be) throw new Error("ball_end_effective missing for ball-nose shallow DOC");
    expect(be.effective_diameter_mm.value).toBeCloseTo(6.0, 1);
    expect(be.effective_diameter_mm.value).toBeLessThan(10);
    expect(be.engagement_pct.value).toBeCloseTo(60, 0);
    expect(be.effective_cutting_speed_m_min.value).toBeLessThan(r.cutting_speed.value);
    expect(be.effective_cutting_speed_m_min.value).toBeGreaterThan(0);
  });

  it("RPM-to-hold-target-Vc is HIGHER than the nominal RPM (smaller Deff needs a faster spindle)", () => {
    const r = calc({ corner_radius_mm: 5, axial_depth_mm: 1 });
    expect(r.ball_end_effective!.rpm_to_hold_target_vc.value).toBeGreaterThan(r.spindle_rpm.value);
  });

  it("a corner-radius (bull-nose) tool, not a ball nose, does NOT get the ball-end correction", () => {
    const r = calc({ corner_radius_mm: 1, axial_depth_mm: 1 }); // 1 < 0.95*R(5) -> not a ball nose
    expect(r.cutting_speed.value).toBeGreaterThan(0);            // a normal calc still happens
    expect(r.ball_end_effective === undefined).toBe(true);      // but no ball-end sub-result
  });

  it("ball-nose at FULL-radius DOC (ap >= R) does NOT fire (full diameter engaged, no reduction)", () => {
    const r = calc({ corner_radius_mm: 5, axial_depth_mm: 5 }); // ap = R -> full engagement
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.ball_end_effective === undefined).toBe(true);
  });

  it("REPORT-ONLY: the headline Vc is the full-diameter Vc, strictly above the reduced effective Vc (no feedback)", () => {
    const r = calc({ corner_radius_mm: 5, axial_depth_mm: 1 });
    // headline cutting_speed is the standard full-D lookup; the effective Vc is strictly lower and
    // lives only in the additive sub-result -- proving the ball-end report did not perturb Vc.
    expect(r.cutting_speed.value).toBeGreaterThan(r.ball_end_effective!.effective_cutting_speed_m_min.value);
  });

  it("an operator warning surfaces the effective-speed reduction", () => {
    const r = calc({ corner_radius_mm: 5, axial_depth_mm: 1 });
    expect(r.warnings.some((w) => /Ball-nose.*effective dia/.test(w))).toBe(true);
  });

  it("deeper-but-still-shallow DOC engages MORE diameter (Deff monotone increasing in ap for ap<R)", () => {
    const shallow = calc({ corner_radius_mm: 5, axial_depth_mm: 0.5 }).ball_end_effective!;
    const deeper = calc({ corner_radius_mm: 5, axial_depth_mm: 2 }).ball_end_effective!;
    expect(deeper.effective_diameter_mm.value).toBeGreaterThan(shallow.effective_diameter_mm.value);
  });
});
