/**
 * SurfaceFinishPlugin — PhysicsPlugin wrapper for SurfaceFinishPredictorEngine
 *
 * Level 6 (last in chain). Brammertz kinematic roughness:
 *   Ra = fz² / (32 × r_e) × 1000  [µm]
 *
 * Single-pass (no loop): runs once after all convergence loops complete.
 * Uses converged force and deflection values for dynamic waviness correction.
 *
 * @module engines/plugins/SurfaceFinishPlugin
 * @see SurfaceFinishPredictorEngine — underlying surface finish computation
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
      _engine = require("../SurfaceFinishPredictorEngine.js").surfaceFinishPredictorEngine;
    } catch {
      _engine = null;
    }
  }
  return _engine;
}

/** Material Ra correction factors (empirical) */
const MATERIAL_RA_FACTOR: Record<string, number> = {
  P: 1.00, M: 1.10, K: 0.95, N: 0.85, S: 1.15, H: 1.05,
};

/** Coolant Ra correction factors */
const COOLANT_RA_FACTOR: Record<string, number> = {
  flood: 0.92, mist: 0.96, MQL: 0.90, mql: 0.90,
  dry: 1.15, cryogenic: 0.88, through_tool: 0.90,
};

const descriptor: PhysicsPluginDescriptor = {
  id: "surface_finish",
  name: "Surface Finish (Brammertz)",
  level: 6,
  min_tier: 1,
  depends_on: ["kienzle_force"],
  feedback_from: [],
  // No loop — single-pass after convergence
  outputs: ["predicted_Ra_um", "predicted_Rz_um", "scallop_um"],
  skip_penalty: 0.08,
  description: "Brammertz kinematic roughness with material/coolant/deflection corrections",
};

class SurfaceFinishPluginImpl implements PhysicsPlugin {
  readonly descriptor = descriptor;

  canRun(ctx: PluginContext): boolean {
    const p = ctx.params;
    return typeof p.feed_per_tooth_mm === "number" && typeof p.tool_diameter_mm === "number";
  }

  compute(ctx: PluginContext): PluginOutput {
    const p = ctx.params;
    const warnings: string[] = [];
    const formulas: string[] = ["Brammertz: Ra = fz²/(32·r_e) × 1000"];

    const fz = p.feed_per_tooth_mm as number;
    const D = p.tool_diameter_mm as number;
    const re = (p.corner_radius_mm as number) ?? D * 0.05; // Default 5% of D
    const edgeRadius = (p.edge_radius_mm as number) ?? 0.010; // 10µm default
    const ae = (p.radial_depth_mm as number) ?? D * 0.5;
    const ap = (p.axial_depth_mm as number) ?? 3;
    const rpm = (p.spindle_rpm as number) ?? 5000;
    const feedRate = (p.feed_rate_mmmin as number) ?? (fz * (p.flutes as number ?? 4) * rpm);
    const coolant = (p.coolant_type as string) ?? "flood";

    const engine = getEngine();
    let Ra: number, Rz: number, scallop: number;

    if (engine && typeof engine.brammertzRa === "function") {
      try {
        const brResult = engine.brammertzRa(fz, re, edgeRadius * 1000); // edge in µm
        Ra = brResult.ra_um;
        Rz = brResult.rt_um ?? Ra * 4;

        // Scallop height for ball/bullnose endmills
        if (typeof engine.scallopHeight === "function") {
          scallop = engine.scallopHeight(ae, { diameter_mm: D, corner_radius_mm: re });
        } else {
          scallop = this._scallopFallback(ae, D, re);
        }

        // Apply material and coolant corrections
        const matFactor = MATERIAL_RA_FACTOR[ctx.iso_group] ?? 1.0;
        const coolFactor = COOLANT_RA_FACTOR[coolant] ?? 1.0;
        Ra *= matFactor * coolFactor;
        Rz *= matFactor * coolFactor;

        // Dynamic waviness contribution from deflection
        const deflection = ctx.state.values.deflection_um;
        if (deflection !== undefined && deflection > 0) {
          const waviness = Math.min(50, deflection * 0.1); // ~10% of deflection
          Ra = Math.sqrt(Ra * Ra + waviness * waviness);
          formulas.push("Dynamic waviness from tool deflection");
        }
      } catch (e: any) {
        warnings.push(`SurfaceFinishPredictorEngine error: ${e.message}`);
        ({ Ra, Rz, scallop } = this._fallback(fz, re, ae, D, ctx.iso_group, coolant, ctx.state.values.deflection_um));
        formulas.push("Fallback: inline Brammertz");
      }
    } else {
      ({ Ra, Rz, scallop } = this._fallback(fz, re, ae, D, ctx.iso_group, coolant, ctx.state.values.deflection_um));
      formulas.push("Inline Brammertz (engine unavailable)");
    }

    return {
      values: {
        predicted_Ra_um: Ra,
        predicted_Rz_um: Rz,
        scallop_um: scallop,
      },
      confidence: 0.80,
      formulas_used: formulas,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private _fallback(
    fz: number,
    re: number,
    ae: number,
    D: number,
    isoGroup: string,
    coolant: string,
    deflection_um?: number,
  ) {
    // Brammertz: Ra = fz² / (32 × r_e) × 1000 [µm]
    const r = Math.max(re, 0.1); // mm, prevent division by zero
    let Ra = (fz * fz) / (32 * r) * 1000; // µm
    const Rz = Ra * 4; // Approximate Rz ≈ 4×Ra

    // Material and coolant corrections
    const matFactor = MATERIAL_RA_FACTOR[isoGroup] ?? 1.0;
    const coolFactor = COOLANT_RA_FACTOR[coolant] ?? 1.0;
    Ra *= matFactor * coolFactor;

    // Scallop
    const scallop = this._scallopFallback(ae, D, re);

    // Waviness from deflection
    if (deflection_um !== undefined && deflection_um > 0) {
      const waviness = Math.min(50, deflection_um * 0.1);
      Ra = Math.sqrt(Ra * Ra + waviness * waviness);
    }

    return { Ra, Rz: Rz * matFactor * coolFactor, scallop };
  }

  private _scallopFallback(ae: number, D: number, re: number): number {
    // Ball/bullnose scallop: h = R - sqrt(R² - (ae/2)²) in µm
    const R = re > 0 ? re : D / 2;
    if (ae / 2 >= R) return R * 1000; // Full engagement
    return (R - Math.sqrt(R * R - (ae / 2) * (ae / 2))) * 1000;
  }
}

export const surfaceFinishPlugin = new SurfaceFinishPluginImpl();
