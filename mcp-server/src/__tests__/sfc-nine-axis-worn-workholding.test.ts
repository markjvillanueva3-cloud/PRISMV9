/**
 * R9 cross-engine test for the flank-wear WORKHOLDING consequence (U-OSC-SFC-FLANK-WEAR-FORCE step 2).
 * ====================================================================================================
 * SpeedFeedNineAxisOrchestratorEngine.checkWorkholding sizes the required clamp from the FRESH cutting
 * force (sfc.forces.resultant_force_N). As flank wear grows the in-plane force rises to
 * sfc.forces.cutting_force_worn_N (= F_fresh*(1+Cw*VB), emitted by UltimateSpeedFeedEngine), so the
 * required clamp grows and the retention safety factor falls by the same multiplier.
 *
 * The wiring is ADDITIVE + NON-REGRESSING: the headline workholding_check.feasible/safety_factor stay on
 * the FRESH force; an ADDITIVE note surfaces the worn-force clamp, and a flip WARNING fires only when the
 * FRESH tool is held but the WORN tool is not. This pins: (1) the worn note appears; (2) the end-of-life
 * flip warning fires when sized into the flip band; (3) a generous clamp is feasible fresh with NO false
 * flip. Self-calibrating: it reads the engine's OWN fresh required clamp and sizes the available clamp so
 * the fresh SF lands just inside its gate -> a value-real test that fails if the worn scaling is reverted.
 */
import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine, type NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

const MAT = { iso_group: "P" as const, name: "AISI 1018" };
const TOOLING = { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" as const };
// Heavy roughing carbide -> VB_max=0.6, Cw=1.5 -> worn multiplier m = 1+1.5*0.6 = 1.90.
const TOOLPATH = { operation: "milling" as const, cut_type: "roughing" as const, axial_depth_mm: 6, radial_depth_mm: 4.8 };

function workholdingCheck(clampKn: number) {
  const input = {
    material: MAT, tooling: TOOLING, toolpath: TOOLPATH, mode: "prism_optimized" as const,
    workholding: { type: "kurt_vise", clamp_force_available_kn: clampKn },
  } as NineAxisInput;
  return speedFeedNineAxisOrchestratorEngine.run(input).workholding_check;
}

describe("nine-axis worn-workholding consequence (U-OSC-SFC-FLANK-WEAR-FORCE step 2 cross-engine)", () => {
  it("emits an additive end-of-life flank-wear clamp note", () => {
    const wc = workholdingCheck(10000); // generous clamp
    expect(wc.notes.join(" | ")).toMatch(/End-of-life flank wear/i);
    expect(wc.required_clamp_force_kn).toBeGreaterThan(0);
  });

  it("FLIP: holds the FRESH tool (feasible) but flags INADEQUATE at the wear limit", () => {
    // Probe the fresh required clamp, then size available so fresh SF ~1.6 (>=1.5 -> feasible) while
    // worn SF = 1.6/1.90 ~ 0.84 (<1.5 -> flip). available = required_fresh * 1.6.
    const reqFresh = workholdingCheck(100000).required_clamp_force_kn;
    const wc = workholdingCheck(reqFresh * 1.6);
    expect(wc.feasible).toBe(true); // FRESH tool holds -> headline verdict unchanged (non-regression)
    expect(wc.safety_factor).toBeGreaterThanOrEqual(1.5);
    expect(wc.notes.join(" | ")).toMatch(/INADEQUATE at the wear limit/i);
  });

  it("NON-REGRESSION: a generous clamp is feasible fresh with NO false worn-flip warning", () => {
    const wc = workholdingCheck(100000);
    expect(wc.feasible).toBe(true);
    expect(wc.notes.join(" | ")).toMatch(/End-of-life flank wear/i); // note present
    expect(wc.notes.join(" | ")).not.toMatch(/INADEQUATE at the wear limit/i); // but no flip warning
  });

  it("the worn required clamp is LARGER than the fresh required clamp (conservative direction)", () => {
    // The note quotes 'required clamp X kN' at the worn force; X must exceed the fresh required clamp by
    // the ~1.90x force multiplier. Parse it back out of the note and compare to the headline fresh value.
    const wc = workholdingCheck(10000);
    const note = wc.notes.find((n) => /End-of-life flank wear/i.test(n)) ?? "";
    const m = note.match(/required clamp ([\d.]+) kN/i);
    const wornReq = m ? parseFloat(m[1]) : 0;
    expect(wornReq).toBeGreaterThan(wc.required_clamp_force_kn); // worn clamp need > fresh clamp need
    expect(wornReq / wc.required_clamp_force_kn).toBeCloseTo(1.9, 1); // by the carbide-roughing multiplier
  });
});
