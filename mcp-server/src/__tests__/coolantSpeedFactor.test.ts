/**
 * Tests for wiring the coolant Vc factor into the SFC engine (OSCAR-SFC-9AXIS-MS0/U-OSC-COOLANT-VC).
 *
 * Closes the operator-found inert axis: the SFC accepted a coolant type but it never changed
 * Vc (flood ≡ dry returned the same speed). The fix is NOT a new table — the existing speed-
 * feed algorithm 8.5 (`CoolantVcModifier`, 6 ISO × 5 coolant, cited+tested+dispatcher-wired)
 * already modelled coolant→Vc; it simply was never consumed by UltimateSpeedFeedEngine.calculate().
 * This unit wires it in. These tests verify (a) the canonical model's material-dependence and
 * (b) that it now flows through the engine. The algorithm's own table values are covered by
 * CoolantVcModifier.test.ts — here we assert the SFC behaviour, not re-test the table.
 *
 * Canonical model (CoolantVcModifier): flood = 1.0 reference for ALL groups; dry derates every
 * wet group with material-dependent magnitude (dry-S 0.55 ≪ dry-P 0.78 < dry-K 0.92); cryogenic
 * lifts superalloys (S 1.60). A single global scalar can't span 0.55→0.92 → the matrix is required.
 */

import { describe, it, expect } from "vitest";
import { getMultipliers as getCoolantVcMultipliers } from "../algorithms/CoolantVcModifier.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

describe("CoolantVcModifier — the canonical coolant model the SFC now consumes (U-OSC-COOLANT-VC)", () => {
  it("flood is the 1.0 reference for every ISO group", () => {
    for (const iso of ["P", "M", "K", "N", "S", "H"] as const) {
      expect(getCoolantVcMultipliers({ iso_group: iso, coolant: "flood" }).vc_multiplier.value).toBe(1.0);
    }
  });

  it("dry derates every wet group, but the magnitude is MATERIAL-DEPENDENT (dry-S ≪ dry-P < dry-K)", () => {
    // THE claim a single global scalar cannot represent: the same 'dry' choice costs a
    // superalloy far more speed (heat-sensitive) than cast iron (graphite self-lubricates).
    const dryP = getCoolantVcMultipliers({ iso_group: "P", coolant: "dry" }).vc_multiplier.value;
    const dryK = getCoolantVcMultipliers({ iso_group: "K", coolant: "dry" }).vc_multiplier.value;
    const dryS = getCoolantVcMultipliers({ iso_group: "S", coolant: "dry" }).vc_multiplier.value;
    expect(dryP).toBeLessThan(1.0);
    expect(dryK).toBeLessThan(1.0);
    expect(dryS).toBeLessThan(1.0);
    expect(dryS).toBeLessThan(dryP);   // superalloy loses most going dry
    expect(dryP).toBeLessThan(dryK);   // cast iron loses least going dry
  });

  it("cryogenic RAISES sustainable Vc on superalloys (S > 1.0) — the documented LN2 lift", () => {
    expect(getCoolantVcMultipliers({ iso_group: "S", coolant: "cryogenic" }).vc_multiplier.value).toBeGreaterThan(1.0);
    // and the superalloy cryo lift is the strongest in the catalog (vs steel)
    expect(getCoolantVcMultipliers({ iso_group: "S", coolant: "cryogenic" }).vc_multiplier.value)
      .toBeGreaterThan(getCoolantVcMultipliers({ iso_group: "P", coolant: "cryogenic" }).vc_multiplier.value);
  });
});

describe("UltimateSpeedFeedEngine — coolant now changes Vc via algorithm 8.5 (the wiring proof)", () => {
  const steel = {
    material: "AISI 4140 Alloy Steel",
    iso_group: "P" as const,
    tool_diameter_mm: 12,
    flutes: 4,
    operation: "milling" as const,
  };
  const inco = { material: "Inconel 718", iso_group: "S" as const, tool_diameter_mm: 12, flutes: 4, operation: "milling" as const };

  it("dry steel yields a LOWER Vc than flood steel (the 0.78 derate flows through)", () => {
    const flood = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "flood" });
    const dry = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "dry" });
    expect(dry.cutting_speed.value).toBeLessThan(flood.cutting_speed.value);
    expect(dry.cutting_speed.value / flood.cutting_speed.value).toBeCloseTo(0.78, 1);
  }, 30000);

  it("MATERIAL-DEPENDENCE flows through: going dry costs a superalloy MORE speed than steel", () => {
    // ratio = dry/flood within each material; hFactor/base cancel. dry-S (0.55) < dry-P (0.78).
    const steelRatio = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "dry" }).cutting_speed.value
      / ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "flood" }).cutting_speed.value;
    const incoRatio = ultimateSpeedFeedEngine.calculate({ ...inco, coolant: "dry" }).cutting_speed.value
      / ultimateSpeedFeedEngine.calculate({ ...inco, coolant: "flood" }).cutting_speed.value;
    expect(incoRatio).toBeLessThan(steelRatio); // superalloy derates harder — not a global scalar
  }, 45000);

  it("cryogenic on Inconel (S) yields a HIGHER Vc than flood (the LN2 lift flows through)", () => {
    const flood = ultimateSpeedFeedEngine.calculate({ ...inco, coolant: "flood" });
    const cryo = ultimateSpeedFeedEngine.calculate({ ...inco, coolant: "cryogenic" });
    expect(cryo.cutting_speed.value).toBeGreaterThan(flood.cutting_speed.value);
  }, 30000);

  it("coolant-kind mapping: air_blast→dry, through_tool→flood (the 7→5 bridge)", () => {
    const dry = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "dry" }).cutting_speed.value;
    const airBlast = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "air_blast" }).cutting_speed.value;
    const flood = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "flood" }).cutting_speed.value;
    const throughTool = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "through_tool" }).cutting_speed.value;
    expect(airBlast).toBeCloseTo(dry, 5);          // air_blast → dry (minimal cooling, conservative)
    expect(throughTool).toBeCloseTo(flood, 5);     // through_tool → flood (HPC boost needs algo 8.7 pressure inputs)
  }, 45000);

  it("SAFETY: an UNSPECIFIED coolant does NOT change Vc (factor 1.0, gauntlet-preserving, no double-count)", () => {
    // The base Vc already assumes the regime's recommended coolant; omitting coolant must leave
    // Vc untouched. flood is the algorithm's 1.0 reference, so no-coolant must equal explicit-flood
    // — otherwise the 401-assert gauntlet (which never passes coolant) would shift.
    const noCoolant = ultimateSpeedFeedEngine.calculate({ ...steel });
    const explicitFlood = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "flood" });
    expect(noCoolant.cutting_speed.value).toBeCloseTo(explicitFlood.cutting_speed.value, 5);
    const explicitDry = ultimateSpeedFeedEngine.calculate({ ...steel, coolant: "dry" });
    expect(explicitDry.cutting_speed.value).toBeLessThan(noCoolant.cutting_speed.value); // explicit dry opts into the derate
  }, 45000);
});
