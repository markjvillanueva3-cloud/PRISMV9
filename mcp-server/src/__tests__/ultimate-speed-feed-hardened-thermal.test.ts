/**
 * Hardened-steel thermal kc consistency -- SFC-WIRING-MS0 (slot:oscar; thermal follow-up to
 * U-SFC-KC-EFFECTIVE-ISO-FORCE).
 *
 * The Kienzle FORCE path uses the canonical ISO-H specific force (forceKc11=3200) when the hardness
 * H-switch fires (base ISO-P steel, HB>400). This unit makes the THERMAL interface temp use the SAME
 * forceKc11 instead of the base steel kc (1800): a hardened cut has higher specific energy -> more
 * heat, so the reported interface temp rises -> tighter thermal-risk / wear-mechanism / thermal
 * tool-life advisory (the SAFE direction). Report-only (no hard thermal clamp). hSwitched=false ->
 * forceKc11===mat.kc1_1, so soft and already-ISO-H inputs are byte-identical.
 *
 * cutting_speed_mpm pins Vc and tool_coating pins the coating temp limit, so the comparison isolates
 * the kc switch from the H-switch's Vc derate and from coating-default differences.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  material: "steel", tool_diameter_mm: 10, flutes: 4, operation: "milling", cut_type: "roughing",
  axial_depth_mm: 3, radial_depth_mm: 5, feed_per_tooth_mm: 0.1,
  cutting_speed_mpm: 80,   // pin Vc -> isolate the kc switch from the H-switch Vc derate
  tool_coating: "TiAlN",   // pin coating limit -> thermal_margin strictly tracks temp
};
const calc = (o: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);

describe("UltimateSpeedFeed hardened-steel thermal kc consistency (thermal follow-up)", () => {
  it("at PINNED Vc, hardened steel (HB500, kc 3200) reports a HIGHER interface temp than soft (HB200, kc 1800)", () => {
    const soft = calc({ hardness_hb: 200 }); // base ISO-P, force kc 1800
    const hard = calc({ hardness_hb: 500 }); // H-switch fires, force kc 3200
    expect(hard.thermal.interface_temp_C.value).toBeGreaterThan(soft.thermal.interface_temp_C.value);
  });

  it("the higher hardened temp TIGHTENS the thermal advisory (margin <= soft, SAFE direction)", () => {
    const soft = calc({ hardness_hb: 200 });
    const hard = calc({ hardness_hb: 500 });
    expect(hard.thermal.thermal_margin_pct.value).toBeLessThanOrEqual(soft.thermal.thermal_margin_pct.value);
  });

  it("soft steel (no H-switch) thermal output stays finite + positive (byte-identical path)", () => {
    const t = calc({ hardness_hb: 200 }).thermal.interface_temp_C.value;
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThan(0);
  });

  it("already-ISO-H material (d2) is NOT double-switched -- thermal uses its own profile kc, finite+positive", () => {
    // d2 hSwitched=false -> forceKc11===mat.kc1_1 (its profile 3200), so the thermal kc is unchanged
    const t = calc({ material: "d2" }).thermal.interface_temp_C.value;
    expect(Number.isFinite(t)).toBe(true);
    expect(t).toBeGreaterThan(0);
  });
});
