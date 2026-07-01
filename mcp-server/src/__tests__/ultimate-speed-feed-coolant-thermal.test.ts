/**
 * Coolant DIRECT thermal cooling -- SFC-WIRING-MS0 gap #9-residue (slot:oscar).
 *
 * The SFC interface temperature was coolant-INSENSITIVE: cuttingTemperature() takes no coolant
 * argument, so coolant changed reported temp only INDIRECTLY (via a coolant-dependent Vc). Because
 * cryogenic/through-tool EARN a higher Vc, the engine reported a HIGHER interface temp under cryo
 * than under flood -- backwards (cryo removes cutting-zone heat). This wires a DIRECT multiplicative
 * cooling factor (CANONICAL_COOLANT_TEMP_FACTOR: dry 1.0 -> cryogenic 0.65) onto temp_C.
 *
 * temp_C feeds thermal_margin / thermal_damage_risk / wear-mechanism / thermal-overload AND the
 * thermal tool-life cap -> life_minutes/cost (a cooler process correctly predicts longer thermal-
 * limited life). It does NOT relax any Vc / feed / force / spindle-power / workholding safety clamp
 * (those read sfc.forces, not temp_C) -- so it cannot relax a safety bound.
 * No-coolant -> factor 1.0 (the bulk of the gauntlet is byte-unchanged).
 *
 * Reference anchors (CANONICAL_COOLANT_TEMP_FACTOR, constants.ts): Hong & Ding (2001) LN2 cutting-
 * zone temperature drop; Shokrani et al. (2012) cryogenic vs flood/dry; Boothroyd & Knight coolant
 * heat-extraction. Factors are conservative cutting-zone temperature ratios, not a single magic number.
 */
import { describe, it, expect } from "vitest";
import {
  CANONICAL_COOLANT_TEMP_FACTOR,
  getCoolantTempFactor,
} from "../physics/constants.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const BASE = {
  material: "inconel", iso_group: "S", tool_diameter_mm: 10, flutes: 4,
  operation: "milling", cut_type: "roughing", axial_depth_mm: 3, radial_depth_mm: 5,
};
const calc = (o: Record<string, unknown>) =>
  ultimateSpeedFeedEngine.calculate({ ...BASE, ...o } as never);
const temp = (coolant?: string) =>
  calc(coolant ? { coolant } : {}).thermal.interface_temp_C.value;

describe("getCoolantTempFactor (gap #9-residue DIRECT cooling)", () => {
  it("returns the canonical factor for each known coolant (reference values)", () => {
    expect(getCoolantTempFactor("dry")).toBe(1.0);
    expect(getCoolantTempFactor("air_blast")).toBe(0.97);
    expect(getCoolantTempFactor("mist")).toBe(0.95);
    expect(getCoolantTempFactor("mql")).toBe(0.92);
    expect(getCoolantTempFactor("flood")).toBe(0.88);
    expect(getCoolantTempFactor("through_tool")).toBe(0.82);
    expect(getCoolantTempFactor("cryogenic")).toBe(0.65);
  });

  it("no coolant / unknown coolant -> 1.0 (neutral; bulk gauntlet unchanged)", () => {
    expect(getCoolantTempFactor(undefined)).toBe(1.0);
    expect(getCoolantTempFactor("")).toBe(1.0);
    expect(getCoolantTempFactor("does_not_exist")).toBe(1.0);
  });

  it("is case-insensitive (operator may pass 'Flood' / 'CRYOGENIC')", () => {
    expect(getCoolantTempFactor("Flood")).toBe(0.88);
    expect(getCoolantTempFactor("CRYOGENIC")).toBe(0.65);
  });

  it("canonical table invariants: every factor in (0,1], dry is the 1.0 anchor", () => {
    expect(CANONICAL_COOLANT_TEMP_FACTOR.dry).toBe(1.0);
    for (const [k, v] of Object.entries(CANONICAL_COOLANT_TEMP_FACTOR)) {
      expect(v, k).toBeGreaterThan(0);
      expect(v, k).toBeLessThanOrEqual(1.0);
    }
  });

  it("monotone cooling: dry >= air_blast >= mist >= mql >= flood >= through_tool >= cryogenic", () => {
    const f = CANONICAL_COOLANT_TEMP_FACTOR;
    expect(f.dry).toBeGreaterThanOrEqual(f.air_blast);
    expect(f.air_blast).toBeGreaterThanOrEqual(f.mist);
    expect(f.mist).toBeGreaterThanOrEqual(f.mql);
    expect(f.mql).toBeGreaterThanOrEqual(f.flood);
    expect(f.flood).toBeGreaterThanOrEqual(f.through_tool);
    expect(f.through_tool).toBeGreaterThanOrEqual(f.cryogenic);
  });
});

describe("UltimateSpeedFeed interface temp is coolant-sensitive (the wired behavior)", () => {
  it("cryogenic reports a LOWER interface temp than flood (was BACKWARDS: cryo > flood)", () => {
    // The exact regression that gauntlet-r2 'cryogenic + inconel: thermal risk should be lower'
    // surfaced: cryo's Vc boost previously pushed its reported temp ABOVE flood.
    expect(temp("cryogenic")).toBeLessThan(temp("flood"));
  });

  it("any cooling coolant reports <= the dry/no-coolant baseline at matched geometry (across ISO groups)", () => {
    // Cover BOTH a high-Vc-boost regime (S/inconel: cryo Vc-mult ~1.6) and a low-boost one
    // (N/aluminum) so the invariant holds where the coolant Vc boost is largest vs smallest --
    // the cooling factor must still dominate net (boost^0.4 x factor <= 1).
    const fixtures: ReadonlyArray<readonly [string, string]> = [
      ["inconel", "S"], ["aluminum", "N"],
    ];
    for (const [material, iso_group] of fixtures) {
      const dry = calc({ material, iso_group }).thermal.interface_temp_C.value; // factor 1.0
      for (const c of ["air_blast", "mist", "mql", "flood", "through_tool", "cryogenic"]) {
        const t = calc({ material, iso_group, coolant: c }).thermal.interface_temp_C.value;
        expect(t, `${material}/${c}`).toBeLessThanOrEqual(dry);
      }
    }
  });

  it("REPORT-ONLY: applying the cooling factor never produces a non-finite or negative temp", () => {
    for (const c of ["dry", "flood", "cryogenic", "through_tool"]) {
      const t = temp(c);
      expect(Number.isFinite(t), c).toBe(true);
      expect(t, c).toBeGreaterThan(0);
    }
  });
});
