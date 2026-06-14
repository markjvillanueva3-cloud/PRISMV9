/**
 * Tests that the SFC axes propagate THROUGH the 9-axis orchestrator surface
 * (OSCAR-SFC-9AXIS-MS0/U-OSC-ALTS-FACTOR).
 *
 * Bug (SFC-VENDOR-COMPARISON-2026-06-09 finding 2): tool_material / coolant / machine_rigidity
 * were factored into UltimateSpeedFeedEngine's PRIMARY Vc, but the orchestrator's default
 * PRISM-optimized mode (buildModeRecommendation) reads sfc.alternatives.balanced.vc, and the
 * alternatives were computed as baseVc x strategy x hardness WITHOUT those factors -- so the
 * axes were inert on the orchestrator surface the comparator + CAD/CAM consume
 * (carbide vc == hss vc). The fix applies the same factors to the alternatives.
 *
 * These tests assert the axes now move recommendation.cutting_speed_mpm THROUGH the
 * orchestrator (not just the engine singleton) -- R15: round-trip through the surface a
 * consumer uses. They would FAIL again if the alts dropped the factors.
 */

import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";

function recVc(overrides: {
  tool_material?: string;
  coolant?: string;
  rigidity?: string;
}): number {
  const input: any = {
    material: { name: "AISI 4140 Alloy Steel", iso_group: "P" },
    tooling: { tool_diameter_mm: 12, flutes: 4, tool_material: overrides.tool_material },
    toolpath: { operation: "milling", cut_type: "roughing" },
  };
  if (overrides.coolant) input.coolant = { type: overrides.coolant };
  if (overrides.rigidity) input.machine = { rigidity: overrides.rigidity };
  return speedFeedNineAxisOrchestratorEngine.run(input).recommendation.cutting_speed_mpm;
}

describe("9-axis orchestrator -- axes now reach the recommendation via the alternatives (U-OSC-ALTS-FACTOR)", () => {
  it("tool_material moves the orchestrator recommendation: HSS < carbide < ceramic", () => {
    const carbide = recVc({ tool_material: "carbide" });
    const hss = recVc({ tool_material: "hss" });
    const ceramic = recVc({ tool_material: "ceramic" });
    expect(hss).toBeLessThan(carbide);      // was carbide == hss == 140 before the fix
    expect(carbide).toBeLessThan(ceramic);
    expect(hss / carbide).toBeCloseTo(0.35, 1); // tracks the canonical tool-material factor
  }, 30000);

  it("coolant moves the orchestrator recommendation: dry < flood on steel", () => {
    const flood = recVc({ tool_material: "carbide", coolant: "flood" });
    const dry = recVc({ tool_material: "carbide", coolant: "dry" });
    expect(dry).toBeLessThan(flood);        // dry derates steel via CoolantVcModifier 8.5
  }, 30000);

  it("machine_rigidity moves the orchestrator recommendation: low < high", () => {
    const low = recVc({ tool_material: "carbide", rigidity: "low" });
    const high = recVc({ tool_material: "carbide", rigidity: "high" });
    expect(low).toBeLessThan(high);
  }, 30000);

  it("an unspecified-axis run is unaffected (all factors 1.0) -- carbide default is the anchor", () => {
    // Omitting tool_material/coolant/rigidity must leave the recommendation at the
    // base x strategy x hardness value (axisVcMult = 1.0), so existing behaviour is preserved.
    const bare = recVc({});
    const explicitCarbideNoCoolant = recVc({ tool_material: "carbide" });
    // carbide factor is 1.0 and no coolant/rigidity -> identical to the bare default
    expect(explicitCarbideNoCoolant).toBeCloseTo(bare, 5);
  }, 30000);
});
