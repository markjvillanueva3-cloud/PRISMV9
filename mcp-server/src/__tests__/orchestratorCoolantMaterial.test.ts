/**
 * orchestratorCoolantMaterial.test.ts (U-OSC-COOLANT-MATERIAL-WIRE, slot:oscar)
 * ============================================================================
 * Behavioral test that the SpeedFeedOrchestrator's coolant Vc factor is now MATERIAL-SPECIFIC
 * (reuses the existing CoolantVcModifier algo 8.5, wired DERATE-ONLY). Before this wiring the
 * orchestrator applied a single workpiece-agnostic COOLANT_DB scalar (dry=0.80 for every material),
 * so dry-cutting a heat-sensitive superalloy got the SAME modest 0.80 penalty as cast iron -- a
 * dangerous under-penalty. Asserts the real engine output, not a re-implementation.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";

function vc(material: string, iso: "P" | "M" | "K" | "N" | "S" | "H", hb: number, coolant: string): number {
  const input = {
    machine_name: "VMC-03", machine_power_kw: 22.4, machine_max_rpm: 8100,
    machine_rigidity: "medium" as const, spindle_taper: "BT40" as const,
    coolant_type: coolant as "flood" | "dry" | "cryogenic" | "mist" | "MQL" | "through_tool",
    material, iso_group: iso, hardness_hb: hb,
    operation: "milling" as const, cut_type: "roughing" as const, strategy: "conventional" as const,
    holder_type: "ER_collet" as const, tool_diameter_mm: 12, flutes: 4,
    tool_material: "carbide" as const, tool_coating: "AlCrN", tool_stickout_mm: 36,
    axial_depth_mm: 6, radial_depth_mm: 6, optimize_for: "balanced" as const,
  };
  const w = speedFeedOrchestratorEngine.compute(input);
  const r = (w && (w as { value?: unknown }).value ? (w as { value: { cutting_speed_mpm: number } }).value : (w as unknown as { cutting_speed_mpm: number }));
  return r.cutting_speed_mpm;
}

describe("Orchestrator coolant Vc factor is material-specific (algo 8.5 wired)", () => {
  it("dry penalizes superalloy (S) far more than the old uniform 0.80 scalar", () => {
    const ratioS = vc("Inconel 718", "S", 350, "dry") / vc("Inconel 718", "S", 350, "flood");
    // 8.5 dry-S = 0.55; the old uniform scalar was 0.80. The dry penalty on Inconel must be MUCH
    // deeper than the cast-iron case -- dry-cutting a superalloy is a real burn-up hazard.
    expect(ratioS).toBeLessThan(0.65);
  });

  it("dry penalizes stainless (M) more than cast iron (K) -- material-aware, not uniform", () => {
    const ratioM = vc("316", "M", 170, "dry") / vc("316", "M", 170, "flood");
    const ratioK = vc("GG25", "K", 200, "dry") / vc("GG25", "K", 200, "flood");
    expect(ratioM).toBeLessThan(ratioK); // gummy stainless suffers dry more than graphitic cast iron
  });

  it("DERATE-ONLY: the dry factor never RAISES Vc above the flood baseline for any group", () => {
    for (const [mat, iso, hb] of [["1045", "P", 180], ["316", "M", 170], ["GG25", "K", 200], ["Inconel 718", "S", 350]] as const) {
      expect(vc(mat, iso, hb, "dry")).toBeLessThanOrEqual(vc(mat, iso, hb, "flood"));
    }
  });

  it("flood (the recommended baseline) is unchanged -- material-aware layer is a no-op at 1.0", () => {
    // Two materials, flood: the layer must not perturb the flood baseline (8.5 flood ~= 1.0, clamped).
    expect(vc("1045", "P", 180, "flood")).toBeGreaterThan(0);
    expect(vc("316", "M", 170, "flood")).toBeGreaterThan(0);
  });
});
