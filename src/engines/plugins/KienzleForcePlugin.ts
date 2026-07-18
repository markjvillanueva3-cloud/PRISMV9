/**
 * KienzleForcePlugin — PhysicsPlugin wrapper for KienzleForceModelEngine
 *
 * Level 1 (first in chain). Computes cutting forces via Kienzle model:
 *   Fc = kc1.1 × h^(-mc) × ap × ae (corrected for rake, wear, speed)
 *
 * FTW loop participant: force feeds temperature, temperature feeds back
 * via thermal softening correction on subsequent iterations.
 *
 * @module engines/plugins/KienzleForcePlugin
 * @see KienzleForceModelEngine — underlying force computation
 * @see PhysicsFusionOrchestrator.types — PhysicsPlugin interface
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _engine = require("../KienzleForceModelEngine.js").kienzleForceModelEngine;
    } catch {
      _engine = null;
    }
  }
  return _engine;
}

const descriptor: PhysicsPluginDescriptor = {
  id: "kienzle_force",
  name: "Kienzle Force Model",
  level: 1,
  min_tier: 1,
  depends_on: [],
  feedback_from: ["cutting_temperature"],
  loop: "FTW",
  outputs: ["Fc_N", "Ff_N", "Fp_N", "torque_Nm", "power_kW"],
  skip_penalty: 0.30,
  description: "Kienzle specific cutting force model with rake/wear/speed corrections",
};

class KienzleForcePluginImpl implements PhysicsPlugin {
  readonly descriptor = descriptor;

  canRun(ctx: PluginContext): boolean {
    const p = ctx.params;
    // Minimum: need kc1_1, mc, feed, and at least one depth
    return (
      typeof p.kc1_1 === "number" &&
      typeof p.mc === "number" &&
      typeof p.feed_per_tooth_mm === "number" &&
      typeof p.axial_depth_mm === "number"
    );
  }

  compute(ctx: PluginContext): PluginOutput {
    const p = ctx.params;
    const engine = getEngine();
    const warnings: string[] = [];
    const formulas: string[] = ["Kienzle: kc = kc1.1 × h^(-mc)"];

    const kc1_1 = p.kc1_1 as number;
    const mc = p.mc as number;
    const fz = p.feed_per_tooth_mm as number;
    const ap = p.axial_depth_mm as number;
    const ae = (p.radial_depth_mm as number) ?? (p.tool_diameter_mm as number) ?? 10;
    const D = (p.tool_diameter_mm as number) ?? 12;
    const flutes = (p.flutes as number) ?? 4;
    const Vc = (p.cutting_speed_mpm as number) ?? 100;
    const approach = (p.approach_angle_deg as number) ?? 90;
    const rake = (p.rake_angle_deg as number) ?? 6;
    const wear = (p.flank_wear_mm as number) ?? 0;

    // Thermal softening feedback: if temperature is high, material softens
    const interfaceTemp = ctx.state.values.interface_temp_C;
    let thermalFactor = 1.0;
    if (interfaceTemp !== undefined && interfaceTemp > 600) {
      // ~2% reduction per 100°C above 600°C (empirical, steel-family)
      thermalFactor = Math.max(0.80, 1.0 - 0.02 * ((interfaceTemp - 600) / 100));
      formulas.push(`Thermal softening: factor=${thermalFactor.toFixed(3)}`);
    }

    let Fc: number, Ff: number, Fp: number, power: number, torque: number;

    if (engine) {
      try {
        const result = engine.calculateForceComponents({
          operation: "milling",
          kc1_1: kc1_1 * thermalFactor,
          mc,
          feed_mm: fz,
          depth_of_cut_mm: ap,
          radial_depth_mm: ae,
          cutting_speed_mpm: Vc,
          tool_diameter_mm: D,
          flutes,
          approach_angle_deg: approach,
          rake_angle_deg: rake,
          flank_wear_mm: wear,
        });
        Fc = result.Fc ?? result.main_cutting_force_Fc ?? 0;
        Ff = result.Ff ?? result.feed_force_Ff ?? Fc * 0.5;
        Fp = result.Fp ?? result.passive_force_Fp ?? Fc * 0.3;
        power = result.power_kW ?? result.cutting_power_Pc ?? 0;
        torque = result.torque_Nm ?? 0;
        if (result.warnings) warnings.push(...result.warnings);
      } catch (e: any) {
        warnings.push(`KienzleForceModelEngine error: ${e.message}`);
        // Fallback: manual Kienzle calculation
        const h = fz * Math.sin((approach * Math.PI) / 180);
        const hSafe = Math.max(h, 0.001);
        // Canonical Kienzle: Fc = kc1.1 × ap × h^(1-mc) [Altintas (2012) Eq. 2.5]
        Fc = kc1_1 * thermalFactor * ap * Math.pow(hSafe, 1 - mc);
        Ff = Fc * 0.5;
        Fp = Fc * 0.3;
        power = (Fc * Vc) / 60000;
        torque = D > 0 ? (Fc * D) / (2 * 1000) : 0;
        formulas.push("Fallback: inline Kienzle");
      }
    } else {
      // No engine available — inline Kienzle
      const h = fz * Math.sin((approach * Math.PI) / 180);
      const kc = kc1_1 * thermalFactor * Math.pow(Math.max(h, 0.001), -mc);
      Fc = kc * ap * fz;
      Ff = Fc * 0.5;
      Fp = Fc * 0.3;
      power = (Fc * Vc) / 60000;
      torque = D > 0 ? (Fc * D) / (2 * 1000) : 0;
      formulas.push("Inline Kienzle (engine unavailable)");
    }

    return {
      values: {
        Fc_N: Fc,
        Ff_N: Ff,
        Fp_N: Fp,
        torque_Nm: torque,
        power_kW: power,
      },
      confidence: 0.90,
      formulas_used: formulas,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

export const kienzleForcePlugin = new KienzleForcePluginImpl();
