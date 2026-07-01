/**
 * UltimateSpeedFeedEngine hardened-steel FORCE switch -- SFC-WIRING-MS0 (slot:oscar, kc-vs-effectiveIso fix).
 *
 * When the hardness H-switch fires (base ISO-P steel driven to ISO-H by HB>400 / HRC), the Kienzle
 * cutting force now uses the canonical ISO-H specific cutting force (kc1.1 1800->3200, mc 0.25->0.30),
 * not the base-steel kc -- closing the force/power/torque UNDER-prediction on the hardened state
 * (previously under-conservative power + spindle-load + workholding + chatter margins). Safe direction:
 * a higher kc RAISES force -> tighter clamps. An already-hardened material profile (iso already H, e.g.
 * "hardened_steel"/"d2") is NOT double-switched (hSwitched=false -> uses its own profile kc).
 *
 * Supersedes the prior force-caveat honesty unit (U-SFC-HARDENED-FORCE-CAVEAT), which only WARNED that
 * the force was under-predicted; this unit FIXES it, so the warning is updated accordingly (R9 intended
 * improvement -- the old "under-predicted" assertions are replaced, not weakened).
 *
 * Reference: CANONICAL_KIENZLE (constants.ts) H = {kc1_1:3200, mc:0.30} vs P = {1800, 0.25}; Sandvik
 * Coromant General Turning; ISO 3685:1993. The force-path change carries physics-reviewer + safety-physics.
 */
import { describe, it, expect } from "vitest";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  material: "steel", tool_diameter_mm: 10, flutes: 4, operation: "milling",
  cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5,
};
const calc = (o: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);

describe("UltimateSpeedFeed hardened-steel force switch (kc-vs-effectiveIso fix)", () => {
  // --- WARNING (updated from the obsolete under-predicted caveat) ---
  it("H-switch (steel HB>400) warns ISO-H Vc/feed AND ISO-H cutting force applied; keeps 'hardened'", () => {
    const w = calc({ hardness_hb: 500 }).warnings;
    expect(w.some((s) => /hardened/.test(s))).toBe(true);
    expect(w.some((s) => /ISO-H Vc\/feed AND ISO-H cutting force/.test(s))).toBe(true);
  });

  it("the OLD misleading texts are GONE (no 'switching to ISO H parameters', no 'under-predicted')", () => {
    const w = calc({ hardness_hb: 500 }).warnings;
    expect(w.some((s) => /switching to ISO H parameters/.test(s))).toBe(false);
    expect(w.some((s) => /under-predicted/.test(s))).toBe(false);
  });

  it("soft steel (HB below the 400 threshold) -> no H-switch, force stays on base ISO-P kc1.1=1800", () => {
    const w = calc({ hardness_hb: 200 }).warnings;
    expect(w.some((s) => /ISO-H cutting force/.test(s))).toBe(false);
    const f = calc({ hardness_hb: 200, feed_per_tooth_mm: 0.1 }).formulas_used;
    expect(f.some((s) => /Kc = Kc1\.1.*\b1800\b/.test(s))).toBe(true);
  });

  // --- FORCE MAGNITUDE (the actual fix; these FAIL on revert -> R9) ---
  it("DIRECT proof: hardened-steel Kc trace uses the ISO-H kc1.1 (3200), not base steel (1800)", () => {
    const f = calc({ hardness_hb: 500, feed_per_tooth_mm: 0.1 }).formulas_used;
    expect(f.some((s) => /Kc = Kc1\.1.*3200/.test(s))).toBe(true);
    expect(f.some((s) => /Kc = Kc1\.1.*\b1800\b/.test(s))).toBe(false);
  });

  it("at MATCHED feed, hardened tangential force > soft by ~the kc ratio (1.5x-2.5x), SAFE direction", () => {
    const fz = 0.1; // fix the chip thickness so the kc switch is isolated from the Vc/feed derate
    const soft = calc({ hardness_hb: 200, feed_per_tooth_mm: fz });
    const hard = calc({ hardness_hb: 500, feed_per_tooth_mm: fz });
    const ratio = hard.forces.tangential_force_N.value / soft.forces.tangential_force_N.value;
    expect(ratio).toBeGreaterThan(1.5); // kc 1800->3200 = 1.78x; H mc 0.30 vs soft-profile mc 0.26 lifts it to ~2.0 at h<1
    expect(ratio).toBeLessThan(2.5);    // physically bounded -- a fix, not a runaway
  });

  it("torque + resultant force rise (the under-conservative force/workholding margin is closed)", () => {
    const fz = 0.1;
    const soft = calc({ hardness_hb: 200, feed_per_tooth_mm: fz });
    const hard = calc({ hardness_hb: 500, feed_per_tooth_mm: fz });
    // torque (Fc x Dc/2) and resultant (proportional to Fc) are FORCE-based, so at matched chip
    // geometry they isolate the kc switch and correctly rise. Power is NOT asserted here: P = Fc x Vc
    // and the H-switch also derates Vc, so a hardened-vs-soft power comparison is confounded (the
    // Vc collapse can outweigh the higher Fc -- hardened steel runs slow, so spindle power can be
    // LOWER even though cutting force is higher; the workholding FORCE margin is the binding fix).
    expect(hard.forces.torque_Nm.value).toBeGreaterThan(soft.forces.torque_Nm.value);
    expect(hard.forces.resultant_force_N.value).toBeGreaterThan(soft.forces.resultant_force_N.value);
  });

  // --- NO DOUBLE-SWITCH on an already-hardened profile (the hSwitched guard) ---
  it("already-ISO-H material (d2 @ HRC62) is NOT double-switched -- uses its own kc, no 'vs base' note", () => {
    const r = calc({ material: "d2", hardness_hrc: 62 });
    expect(r.resolved.iso_group).toBe("H");
    // d2 resolves to ISO-H from its OWN profile; effectiveIso === iso -> hSwitched false -> no canonical
    // -group switch note (the note only fires when a BASE ISO-P steel is driven to H by hardness).
    expect(r.warnings.some((s) => /vs base/.test(s))).toBe(false);
    // and the force still correctly uses the hardened kc (3200), just via the material profile not the switch
    expect(r.formulas_used.some((s) => /Kc = Kc1\.1.*3200/.test(s))).toBe(true);
  });
});
