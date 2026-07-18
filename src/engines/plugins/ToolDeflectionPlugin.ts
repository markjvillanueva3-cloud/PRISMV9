/**
 * ToolDeflectionPlugin — PhysicsPlugin wrapper for ToolDeflectionPredictionEngine
 *
 * Level 4. Euler-Bernoulli cantilever deflection:
 *   δ = F × L³ / (3 × E × I)  with flute correction on I
 *
 * FDT loop participant: force drives deflection, deflection feeds back to
 * tolerance assessment on outer loop iteration.
 *
 * Also caches stiffness k = 3EI/L³ for stability lobe calculations (L5).
 *
 * @module engines/plugins/ToolDeflectionPlugin
 * @see ToolDeflectionPredictionEngine — underlying deflection computation
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
      _engine = require("../ToolDeflectionPredictionEngine.js").toolDeflectionPredictionEngine;
    } catch {
      _engine = null;
    }
  }
  return _engine;
}

/** Young's modulus [GPa] by tool material — from CANONICAL_TOOL_MODULUS (constants.ts) */
const TOOL_MODULUS: Record<string, number> = {
  carbide: 600, hss: 210, ceramic: 380, cermet: 400,
  cbn: 680, pcd: 850,
};

const descriptor: PhysicsPluginDescriptor = {
  id: "tool_deflection",
  name: "Tool Deflection (Euler-Bernoulli)",
  level: 4,
  min_tier: 2,
  depends_on: ["kienzle_force"],
  feedback_from: [],
  loop: "FDT",
  outputs: ["deflection_um", "dimensional_error_um", "stiffness_N_per_um"],
  skip_penalty: 0.10,
  description: "Cantilever tool deflection with flute correction and stepped shaft model",
};

class ToolDeflectionPluginImpl implements PhysicsPlugin {
  readonly descriptor = descriptor;

  canRun(ctx: PluginContext): boolean {
    const p = ctx.params;
    // Need tool diameter and either a computed force or explicit force
    const hasForce = ctx.state.values.Fc_N !== undefined || typeof p.cutting_force_N === "number";
    return typeof p.tool_diameter_mm === "number" && hasForce;
  }

  compute(ctx: PluginContext): PluginOutput {
    const p = ctx.params;
    const warnings: string[] = [];
    const formulas: string[] = ["Euler-Bernoulli: δ = F·L³/(3·E·I)"];

    const D = p.tool_diameter_mm as number;
    const Fc = ctx.state.values.Fc_N ?? (p.cutting_force_N as number) ?? 500;
    // Radial force component drives deflection (perpendicular to tool axis)
    const Fp = ctx.state.values.Fp_N ?? Fc * 0.3;
    const toolMaterial = (p.tool_material as string) ?? "carbide";
    const overhang = (p.tool_stickout_mm as number) ??
      (p.flute_length_mm as number) ??
      D * 3; // Default 3xD stickout
    const flutes = (p.flutes as number) ?? 4;
    const tolerance = (p.feature_tolerance_mm as number) ?? undefined;

    const engine = getEngine();
    let deflection: number;
    let dimError: number;
    let stiffness: number;

    if (engine) {
      try {
        const result = engine.calculate({
          tool_diameter_mm: D,
          tool_overhang_mm: overhang,
          cutting_force_N: Fp, // Radial/passive force drives deflection
          force_direction: "radial",
          tool_material: toolMaterial,
          flute_count: flutes,
          tolerance_target_mm: tolerance,
        });
        deflection = typeof result.static_deflection_um === "object"
          ? result.static_deflection_um.value
          : result.static_deflection_um;
        dimError = typeof result.dimensional_error_um === "object"
          ? result.dimensional_error_um.value
          : result.dimensional_error_um;
        stiffness = typeof result.stiffness_N_per_um === "object"
          ? result.stiffness_N_per_um.value
          : result.stiffness_N_per_um;
        if (result.recommendations) {
          for (const r of result.recommendations) {
            warnings.push(r);
          }
        }
      } catch (e: any) {
        warnings.push(`ToolDeflectionPredictionEngine error: ${e.message}`);
        ({ deflection, dimError, stiffness } =
          this._fallback(D, overhang, Fp, toolMaterial, flutes));
        formulas.push("Fallback: inline Euler-Bernoulli");
      }
    } else {
      ({ deflection, dimError, stiffness } =
        this._fallback(D, overhang, Fp, toolMaterial, flutes));
      formulas.push("Inline Euler-Bernoulli (engine unavailable)");
    }

    return {
      values: {
        deflection_um: deflection,
        dimensional_error_um: dimError,
        stiffness_N_per_um: stiffness,
      },
      confidence: 0.85,
      formulas_used: formulas,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private _fallback(
    D: number,
    L: number,
    F: number,
    toolMaterial: string,
    flutes: number,
  ) {
    const E_GPa = TOOL_MODULUS[toolMaterial] ?? 580;
    const E = E_GPa * 1e3; // GPa → N/mm²
    const I_solid = (Math.PI * Math.pow(D, 4)) / 64; // mm⁴
    // Flute correction factor (less material = less stiffness)
    const fluteFactors: Record<number, number> = { 1: 0.50, 2: 0.65, 3: 0.72, 4: 0.78, 5: 0.82, 6: 0.85 };
    const ff = fluteFactors[flutes] ?? 0.78;
    const I = I_solid * ff;
    // δ = F·L³/(3·E·I) in mm, convert to µm
    const deflection_mm = (F * Math.pow(L, 3)) / (3 * E * I);
    const deflection = deflection_mm * 1000; // µm
    const dimError = deflection * 2; // Both sides of part
    const stiffness = deflection > 0 ? F / deflection : Infinity; // N/µm
    return { deflection, dimError, stiffness };
  }
}

export const toolDeflectionPlugin = new ToolDeflectionPluginImpl();
