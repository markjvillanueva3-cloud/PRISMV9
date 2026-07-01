/**
 * CuttingTemperaturePlugin — PhysicsPlugin wrapper for CuttingTemperatureEngine
 *
 * Level 2 (after force). Predicts tool-chip interface temperature via Loewen-Shaw:
 *   T = C × Vc^0.4 × f^0.2 × material_correction
 *
 * FTW loop participant: depends on force (heat input proportional to cutting power).
 * Temperature feeds back to force via thermal softening on next iteration.
 *
 * @module engines/plugins/CuttingTemperaturePlugin
 * @see CuttingTemperatureEngine — underlying thermal computation
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
      _engine = require("../CuttingTemperatureEngine.js").cuttingTemperatureEngine;
    } catch {
      _engine = null;
    }
  }
  return _engine;
}

/** Map ISOGroup to CuttingTemperatureEngine material_type */
const ISO_TO_MATERIAL: Record<string, string> = {
  P: "steel",
  M: "stainless",
  K: "cast_iron",
  N: "aluminum",
  S: "titanium",
  H: "steel", // hardened steel still uses steel thermal model
};

const descriptor: PhysicsPluginDescriptor = {
  id: "cutting_temperature",
  name: "Cutting Temperature (Loewen-Shaw)",
  level: 2,
  min_tier: 2,
  depends_on: ["kienzle_force"],
  feedback_from: [],
  loop: "FTW",
  outputs: ["interface_temp_C", "chip_temp_C", "tool_temp_C", "thermal_damage_risk"],
  skip_penalty: 0.10,
  description: "Loewen-Shaw cutting temperature with coolant and coating corrections",
};

class CuttingTemperaturePluginImpl implements PhysicsPlugin {
  readonly descriptor = descriptor;

  canRun(ctx: PluginContext): boolean {
    const p = ctx.params;
    // Need speed and feed at minimum; force should be available from L1
    return (
      typeof p.cutting_speed_mpm === "number" &&
      typeof p.feed_per_tooth_mm === "number"
    );
  }

  compute(ctx: PluginContext): PluginOutput {
    const p = ctx.params;
    const warnings: string[] = [];
    const formulas: string[] = ["Loewen-Shaw: T = C × Vc^0.4 × f^0.2"];

    const Vc = p.cutting_speed_mpm as number;
    const fz = p.feed_per_tooth_mm as number;
    const ap = (p.axial_depth_mm as number) ?? 3;
    const materialType = ISO_TO_MATERIAL[ctx.iso_group] ?? "steel";
    const coating = (p.tool_coating as string) ?? "TiAlN";
    const coolant = (p.coolant_type as string) ?? "flood";
    const engine = getEngine();

    let interfaceTemp: number;
    let chipTemp: number;
    let toolTemp: number;
    let thermalDamageRisk: number;

    if (engine) {
      try {
        const result = engine.calculate({
          cutting_speed_mpm: Vc,
          feed_mm: fz,
          depth_of_cut_mm: ap,
          material_type: materialType,
          tool_coating: coating,
          coolant,
        });
        // Extract numeric values (engine may return AtomicValue objects)
        interfaceTemp = typeof result.interface_temperature === "object"
          ? result.interface_temperature.value
          : result.interface_temperature;
        chipTemp = typeof result.chip_temperature === "object"
          ? result.chip_temperature.value
          : result.chip_temperature;
        toolTemp = typeof result.tool_temperature === "object"
          ? result.tool_temperature.value
          : result.tool_temperature;
        thermalDamageRisk = typeof result.thermal_damage_risk === "object"
          ? result.thermal_damage_risk.value
          : (result.thermal_damage_risk ?? 0);
        if (result.warnings) warnings.push(...result.warnings);
      } catch (e: any) {
        warnings.push(`CuttingTemperatureEngine error: ${e.message}`);
        ({ interfaceTemp, chipTemp, toolTemp, thermalDamageRisk } =
          this._fallback(Vc, fz, materialType, coolant));
        formulas.push("Fallback: inline Loewen-Shaw");
      }
    } else {
      ({ interfaceTemp, chipTemp, toolTemp, thermalDamageRisk } =
        this._fallback(Vc, fz, materialType, coolant));
      formulas.push("Inline Loewen-Shaw (engine unavailable)");
    }

    return {
      values: {
        interface_temp_C: interfaceTemp,
        chip_temp_C: chipTemp,
        tool_temp_C: toolTemp,
        thermal_damage_risk: thermalDamageRisk,
      },
      confidence: 0.80,
      formulas_used: formulas,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private _fallback(
    Vc: number,
    fz: number,
    materialType: string,
    coolant: string,
  ) {
    // Simplified Loewen-Shaw: T_interface ≈ C × Vc^0.4 × f^0.2
    const materialC: Record<string, number> = {
      steel: 300, stainless: 340, cast_iron: 250,
      aluminum: 180, titanium: 400, inconel: 420,
    };
    const coolantFactor: Record<string, number> = {
      flood: 0.65, mist: 0.80, MQL: 0.75, mql: 0.75,
      dry: 1.0, cryogenic: 0.45, through_tool: 0.60,
    };
    const C = materialC[materialType] ?? 300;
    const cf = coolantFactor[coolant] ?? 0.65;
    const interfaceTemp = C * Math.pow(Vc, 0.4) * Math.pow(Math.max(fz, 0.01), 0.2) * cf;
    const chipTemp = interfaceTemp * 0.85;
    const toolTemp = interfaceTemp * 0.55;
    // Risk score: 0-100 based on proximity to typical coating limit (800°C)
    const thermalDamageRisk = Math.min(100, Math.max(0, ((toolTemp - 400) / 400) * 100));
    return { interfaceTemp, chipTemp, toolTemp, thermalDamageRisk };
  }
}

export const cuttingTemperaturePlugin = new CuttingTemperaturePluginImpl();
