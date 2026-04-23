/**
 * ChatterStabilityPlugin — PhysicsPlugin wrapper for ChatterStabilityLobeEngine
 *
 * Level 5. Altintas-Budak (1995) stability lobe analysis:
 *   a_lim = -1 / (2 × Ks × α_xx × Re[G(ωc)])
 *
 * FES loop participant: stability limits depend on force coefficients and
 * tool stiffness. Engagement changes from stability assessment feed back
 * to force recalculation on the next middle-loop iteration.
 *
 * @module engines/plugins/ChatterStabilityPlugin
 * @see ChatterStabilityLobeEngine — underlying stability computation
 */

import type {
  PhysicsPlugin,
  PhysicsPluginDescriptor,
  PluginContext,
  PluginOutput,
} from "../PhysicsFusionOrchestrator.types.js";

let _engine: any = null;

function getEngine() {
  if (!_engine) {
    try {
      _engine = require("../ChatterStabilityLobeEngine.js").chatterStabilityLobeEngine;
    } catch {
      _engine = null;
    }
  }
  return _engine;
}

const descriptor: PhysicsPluginDescriptor = {
  id: "chatter_stability",
  name: "Chatter Stability (Altintas-Budak)",
  level: 5,
  min_tier: 2,
  depends_on: ["kienzle_force", "tool_deflection"],
  feedback_from: [],
  loop: "FES",
  outputs: ["max_stable_ap_mm", "optimal_rpm", "p_chatter"],
  skip_penalty: 0.12,
  description: "Stability lobe diagram for chatter avoidance with optimal RPM selection",
};

class ChatterStabilityPluginImpl implements PhysicsPlugin {
  readonly descriptor = descriptor;

  canRun(ctx: PluginContext): boolean {
    const p = ctx.params;
    // Need tool geometry and either machine stiffness data or stiffness from deflection plugin
    const hasToolData = typeof p.tool_diameter_mm === "number" && typeof p.flutes === "number";
    const hasRpm = typeof p.machine_max_rpm === "number" || typeof p.spindle_rpm === "number";
    return hasToolData && hasRpm;
  }

  compute(ctx: PluginContext): PluginOutput {
    const p = ctx.params;
    const warnings: string[] = [];
    const formulas: string[] = ["Altintas-Budak: a_lim = -1/(2·Ks·α_xx·Re[G(ωc)])"];

    const D = p.tool_diameter_mm as number;
    const flutes = p.flutes as number;
    const overhang = (p.tool_stickout_mm as number) ?? D * 3;
    const toolMat = (p.tool_material as string) ?? "carbide";
    const maxRpm = (p.machine_max_rpm as number) ?? (p.spindle_rpm as number) ?? 10000;
    const minRpm = (p.machine_min_rpm as number) ?? Math.max(500, maxRpm * 0.1);
    const ae = (p.radial_depth_mm as number) ?? D * 0.5;
    const kc1_1 = (p.kc1_1 as number) ?? 1800; // ISO P default — CANONICAL_KIENZLE.P.kc1_1

    // Use stiffness from deflection plugin if available
    const stiffnessFromDeflection = ctx.state.values.stiffness_N_per_um;
    const stiffness = (p.system_stiffness_n_um as number)
      ?? stiffnessFromDeflection
      ?? undefined;
    const naturalFreq = (p.natural_frequency_hz as number) ?? undefined;
    const dampingRatio = (p.damping_ratio as number) ?? 0.03;

    const engine = getEngine();
    let maxStableAp: number;
    let optimalRpm: number;
    let pChatter: number;

    if (engine) {
      try {
        const result = engine.compute({
          tool: {
            diameter_mm: D,
            flute_count: flutes,
            overhang_mm: overhang,
            material: toolMat as "carbide" | "hss" | "cermet",
          },
          workpiece: {
            iso_group: ctx.iso_group,
            kc11_mpa: kc1_1,
          },
          machine: {
            natural_frequency_hz: naturalFreq,
            damping_ratio: dampingRatio,
            stiffness_n_um: stiffness,
            max_rpm: maxRpm,
            min_rpm: minRpm,
          },
          cutting: {
            radial_immersion_ratio: ae / D,
            up_milling: false, // conventional milling default
          },
        });
        maxStableAp = result.max_stable_ap_mm;
        optimalRpm = result.optimal_rpm;
        // Compute chatter probability from current ap vs limit
        const currentAp = (p.axial_depth_mm as number) ?? 3;
        pChatter = currentAp > maxStableAp
          ? Math.min(1.0, (currentAp - maxStableAp) / maxStableAp)
          : 0;
        if (result.recommendations) warnings.push(...result.recommendations);
      } catch (e: any) {
        warnings.push(`ChatterStabilityLobeEngine error: ${e.message}`);
        ({ maxStableAp, optimalRpm, pChatter } =
          this._fallback(D, flutes, kc1_1, stiffness, p));
        formulas.push("Fallback: simplified stability estimate");
      }
    } else {
      ({ maxStableAp, optimalRpm, pChatter } =
        this._fallback(D, flutes, kc1_1, stiffness, p));
      formulas.push("Inline stability estimate (engine unavailable)");
    }

    return {
      values: {
        max_stable_ap_mm: maxStableAp,
        optimal_rpm: optimalRpm,
        p_chatter: pChatter,
      },
      confidence: stiffness !== undefined ? 0.75 : 0.55,
      formulas_used: formulas,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private _fallback(
    D: number,
    flutes: number,
    kc1_1: number,
    stiffness: number | undefined,
    p: Record<string, unknown>,
  ) {
    // Simplified Altintas (2012) Eq. 3.45: a_lim ≈ 2·ζ·k / (Ks·Z)
    // where ζ = damping ratio, Ks ≈ kc1_1/2
    const Ks = kc1_1 / 2; // N/mm²
    const k = stiffness !== undefined ? stiffness * 1000 : 15000; // N/mm default
    const zeta = (p.damping_ratio as number) ?? 0.03; // typical machine damping
    const maxStableAp = (2 * zeta * k) / (Ks * flutes);
    // Optimal RPM: use middle of range as rough estimate
    const maxRpm = (p.machine_max_rpm as number) ?? 10000;
    const optimalRpm = maxRpm * 0.7;
    const currentAp = (p.axial_depth_mm as number) ?? 3;
    const pChatter = currentAp > maxStableAp
      ? Math.min(1.0, (currentAp - maxStableAp) / maxStableAp)
      : 0;
    return { maxStableAp, optimalRpm, pChatter };
  }
}

export const chatterStabilityPlugin = new ChatterStabilityPluginImpl();
