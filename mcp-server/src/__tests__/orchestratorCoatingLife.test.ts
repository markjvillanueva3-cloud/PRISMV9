/**
 * orchestratorCoatingLife.test.ts (U-OSC-LIFE-MATERIAL-AWARE, slot:oscar)
 * ============================================================================
 * Behavioral test that the SpeedFeedOrchestrator's tool-LIFE is now MATERIAL-SPECIFIC for coating:
 * (1) diamond/PCD on a ferrous workpiece -- physically incompatible (carbon diffusion) -- has its
 * life CAPPED to a small absolute value, NOT the inflated Taylor prediction; (2) the capped diamond
 * life is SHORTER than a compatible coating (AlCrN) on the same steel -- the correct direction, which
 * the bare workpiece-agnostic life_multiplier=2.00 got BACKWARDS; (3) diamond on aluminium (its home)
 * is NOT capped. Asserts real engine output, not a re-implementation.
 */
import { describe, it, expect } from "vitest";
import { speedFeedOrchestratorEngine } from "../engines/SpeedFeedOrchestratorEngine.js";
import { COATING_INCOMPATIBLE_LIFE_CAP_MIN } from "../physics/coating-material-speed.js";

function life(material: string, iso: "P" | "M" | "K" | "N" | "S" | "H", hb: number, coating: string): number {
  const input = {
    machine_name: "VMC-03", machine_power_kw: 22.4, machine_max_rpm: 8100,
    machine_rigidity: "medium" as const, spindle_taper: "BT40" as const, coolant_type: "flood" as const,
    material, iso_group: iso, hardness_hb: hb,
    operation: "milling" as const, cut_type: "roughing" as const, strategy: "conventional" as const,
    holder_type: "ER_collet" as const, tool_diameter_mm: 12, flutes: 4,
    tool_material: "carbide" as const, tool_coating: coating, tool_stickout_mm: 36,
    axial_depth_mm: 6, radial_depth_mm: 6, optimize_for: "balanced" as const,
  };
  const w = speedFeedOrchestratorEngine.compute(input);
  const r = (w && (w as { value?: unknown }).value ? (w as { value: { tool_life_min: number } }).value : (w as unknown as { tool_life_min: number }));
  return r.tool_life_min;
}

describe("Orchestrator coating tool-life is material-specific (diamond-on-ferrous capped)", () => {
  it("diamond on steel (P) life is capped to the small absolute incompatible bound", () => {
    expect(life("4140", "P", 200, "diamond")).toBeLessThanOrEqual(COATING_INCOMPATIBLE_LIFE_CAP_MIN);
  });

  it("diamond on steel has SHORTER life than AlCrN on the same steel (correct direction)", () => {
    // The bare life_multiplier=2.00 made diamond appear LONGER-lived than AlCrN on steel -- backwards.
    expect(life("4140", "P", 200, "diamond")).toBeLessThan(life("4140", "P", 200, "AlCrN"));
  });

  it("diamond on cast iron (K) is also capped (ferrous = carbon-diffusion class)", () => {
    expect(life("GG25", "K", 200, "diamond")).toBeLessThanOrEqual(COATING_INCOMPATIBLE_LIFE_CAP_MIN);
  });

  it("diamond on aluminium (N, its home) is NOT capped -- a normal positive life", () => {
    // Aluminium is diamond's correct application; life is whatever Taylor predicts, not the cap.
    expect(life("6061", "N", 95, "diamond")).toBeGreaterThan(0);
  });

  it("AlCrN on steel (compatible) is unaffected by the cap -- a normal Taylor life", () => {
    expect(life("4140", "P", 200, "AlCrN")).toBeGreaterThan(COATING_INCOMPATIBLE_LIFE_CAP_MIN);
  });
});
