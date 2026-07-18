/**
 * Nine-axis runout: tool_holder.type LIVE + NO double-count (U-OSC-HOLDER-RUNOUT-DEDUP)
 * ====================================================================================
 * U-OSC-RUNOUT-LIFE-DERATE made UltimateSpeedFeedEngine fold the runout life reduction directly
 * into tool_life.life_minutes. But SpeedFeedNineAxisOrchestratorEngine ALREADY had a compensating
 * workaround (U-OSC-HOLDER-RUNOUT-LIFE): it read sfc.runout_impact.life_reduction_pct and did
 * `life *= keep`. With the engine now derating, the orchestrator's `life` (= sfc.tool_life
 * .life_minutes, already derated) was being derated a SECOND time -> tool_life_min ~ raw * keep^2.
 *
 * This suite pins BOTH facts:
 *  1. tool_holder.type genuinely moves the recommendation's tool_life_min (type -> default TIR
 *     via HOLDER_RUNOUT_TIR_UM -> engine derate). The axis is LIVE, not inert.
 *  2. The runout derate is applied EXACTLY ONCE. The orchestrator's per-call runout factor must
 *     match the engine's OWN single-derate factor -- not its square. On the double-count bug this
 *     test FAILS (orchFactor ~ engineFactor^2, far below engineFactor).
 *
 * Ratio methodology: orchFactor compares runout vs no-runout through the SAME orchestrator path,
 * so every OTHER derate (workholding, balance clamp, rigidity) cancels and only the runout derate
 * remains. engineFactor is the ground-truth single derate from the core engine for the same inputs.
 */

import { describe, it, expect } from "vitest";
import { speedFeedNineAxisOrchestratorEngine, type NineAxisInput } from "../engines/SpeedFeedNineAxisOrchestratorEngine.js";
import { ultimateSpeedFeedEngine } from "../engines/UltimateSpeedFeedEngine.js";

const MAT = { iso_group: "P" as const, name: "AISI 1018" };
const TOOLING = { tool_diameter_mm: 12, flutes: 4, tool_material: "carbide" as const };
const TOOLPATH = { operation: "milling" as const, cut_type: "roughing" as const, axial_depth_mm: 6, radial_depth_mm: 4.8 };

function orchLife(holder?: Record<string, unknown>, toolpathOverride?: Record<string, unknown>): number {
  const input = {
    material: MAT, tooling: TOOLING, toolpath: toolpathOverride ?? TOOLPATH, mode: "prism_optimized" as const,
    ...(holder ? { tool_holder: holder } : {}),
  } as NineAxisInput;
  return speedFeedNineAxisOrchestratorEngine.run(input).recommendation.tool_life_min;
}

// Mirror of translateToUltimate() for the same inputs, so the engine's single-derate factor is the
// correct ground truth to compare the orchestrator's factor against.
function engineLife(holderRunoutMm?: number): number {
  return ultimateSpeedFeedEngine.calculate({
    material: "AISI 1018", iso_group: "P",
    tool_diameter_mm: 12, flutes: 4, tool_material: "carbide",
    operation: "milling", cut_type: "roughing", axial_depth_mm: 6, radial_depth_mm: 4.8,
    optimize_for: "balanced",
    ...(holderRunoutMm !== undefined ? { holder_runout_mm: holderRunoutMm } : {}),
  }).tool_life.life_minutes.value;
}

describe("nine-axis runout: tool_holder.type LIVE + no double-count (U-OSC-HOLDER-RUNOUT-DEDUP)", () => {
  it("tool_holder.type moves tool_life_min (type -> default TIR -> engine derate -> shorter life)", () => {
    // Use a LIGHT finishing cut. At the heavy roughing TOOLPATH the optimized life is ~8 min, where the
    // small er_collet-vs-hsk TIR derate (12um vs 3um, ~2%) is REAL but rounds away to 8==8 in the integer
    // tool_life_min field. A finishing cut lengthens life (~46-47 min) so the live derate clears integer
    // rounding. (2026-06-23: the axis IS live -- proven 46 < 47 -- the prior roughing operating point just
    // rounded the small effect to equality; corrected the operating point, NOT the assertion intent.)
    const FIN = { ...TOOLPATH, cut_type: "finishing" as const, axial_depth_mm: 1, radial_depth_mm: 1 };
    const erCollet = orchLife({ type: "er_collet" }, FIN); // HOLDER_RUNOUT_TIR_UM.er_collet = 12um
    const hsk = orchLife({ type: "hsk_a63" }, FIN);         // HOLDER_RUNOUT_TIR_UM.hsk_a63 = 3um
    expect(erCollet).toBeGreaterThan(0);
    expect(hsk).toBeGreaterThan(0);
    expect(erCollet).toBeLessThan(hsk); // higher TIR -> shorter life: the axis is LIVE
  });

  it("runout derate is applied ONCE -- orchestrator does not re-derate the engine's derated life", () => {
    const HR = 0.040; // 40um holder runout -> a large, unambiguous reduction
    const orchFactor = orchLife({ runout_tir_um: 40 }) / orchLife();
    const engineFactor = engineLife(HR) / engineLife();
    expect(engineFactor).toBeLessThan(1); // sanity: 40um TIR genuinely shortens life
    // SINGLE derate: orchFactor ~ engineFactor. DOUBLE-count: orchFactor ~ engineFactor^2 (far lower).
    expect(orchFactor).toBeCloseTo(engineFactor, 1); // within 0.05
    // Hard anti-double-count guard: orchFactor must sit well above the squared (double) value.
    expect(orchFactor).toBeGreaterThan(engineFactor * engineFactor + 0.03);
  });
});
