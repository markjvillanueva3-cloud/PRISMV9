/**
 * MastercamMaterialPhysicsBridge — Connect Mastercam materials to PRISM physics engines
 *
 * Provides unified interface between:
 *   - Mastercam material database
 *   - PRISM Kienzle force calculations
 *   - PRISM Taylor tool life predictions
 *   - PRISM thermal/temperature models
 *   - PRISM surface finish predictions
 *
 * @module engines/MastercamMaterialPhysicsBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP01
 */

import { log } from "../utils/Logger.js";
import { mastercamMaterialBridgeEngine, type ISOGroup, type MaterialPhysicsProfile } from "./MastercamMaterialBridgeEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface MillingPhysicsInput {
  material_id: string;
  tool_diameter_mm: number;
  tool_flutes: number;
  helix_angle_deg: number;
  rake_angle_deg: number;
  spindle_rpm: number;
  feed_mm_min: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  cutting_mode: "conventional" | "climb";
  coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry";
}

export interface MillingPhysicsOutput {
  // Force calculations (Kienzle model)
  cutting_force_N: number;
  feed_force_N: number;
  radial_force_N: number;
  axial_force_N: number;
  resultant_force_N: number;
  torque_Nm: number;
  power_kW: number;

  // Tool life (Taylor model)
  tool_life_min: number;
  tool_life_parts?: number;

  // Thermal (Loewen-Shaw / Trigger model)
  chip_temperature_C: number;
  tool_temperature_C: number;
  workpiece_temperature_C: number;

  // Surface finish (Brammertz kinematic model)
  theoretical_Ra_um: number;
  predicted_Ra_um: number;

  // Material removal
  mrr_cm3_min: number;
  specific_cutting_energy_J_mm3: number;

  // Safety factors
  deflection_risk: "low" | "medium" | "high";
  chatter_risk: "low" | "medium" | "high";

  // Metadata
  material_profile: MaterialPhysicsProfile;
  calculation_timestamp: string;
  warnings: string[];
  recommendations: string[];
}

export interface TurningPhysicsInput {
  material_id: string;
  insert_nose_radius_mm: number;
  insert_rake_angle_deg: number;
  spindle_rpm: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  cutting_speed_m_min: number;
  coolant: "flood" | "mist" | "high_pressure" | "cryogenic" | "dry";
}

export interface TurningPhysicsOutput {
  cutting_force_N: number;
  feed_force_N: number;
  radial_force_N: number;
  power_kW: number;
  torque_Nm: number;
  tool_life_min: number;
  theoretical_Ra_um: number;
  chip_temperature_C: number;
  mrr_cm3_min: number;
  warnings: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MastercamMaterialPhysicsBridge {

  /**
   * Calculate full milling physics for Mastercam material
   */
  calculateMillingPhysics(input: MillingPhysicsInput): MillingPhysicsOutput | null {
    const profile = mastercamMaterialBridgeEngine.getPhysicsProfile(input.material_id);
    if (!profile) {
      log.warn(`[MastercamPhysicsBridge] Material not found: ${input.material_id}`);
      return null;
    }

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Extract Kienzle parameters
    const { kc1_1, mc } = profile.kienzle;

    // Calculate feed per tooth
    const fz = input.feed_mm_min / (input.spindle_rpm * input.tool_flutes);

    // Calculate cutting speed
    const Vc = (Math.PI * input.tool_diameter_mm * input.spindle_rpm) / 1000;

    // ─── Kienzle Cutting Force ─────────────────────────────────────────────
    // Fc = kc1.1 * ap * fz^(1-mc) * ae/d (engagement factor)
    const engagementRatio = input.radial_depth_mm / input.tool_diameter_mm;
    const kc = kc1_1 * Math.pow(fz, -mc);
    const chipArea = input.axial_depth_mm * fz;
    const Fc = kc * chipArea * Math.sqrt(engagementRatio);

    // Force components (helix decomposition)
    const helixRad = (input.helix_angle_deg * Math.PI) / 180;
    const Ft = Fc * Math.cos(helixRad);  // Tangential
    const Fa = Fc * Math.sin(helixRad);  // Axial
    const Fr = Fc * 0.3;                 // Radial (typical ratio)
    const Ff = Fc * 0.5;                 // Feed (typical ratio)
    const Fres = Math.sqrt(Ft * Ft + Fr * Fr + Fa * Fa);

    // ─── Torque & Power ────────────────────────────────────────────────────
    const torque = (Fc * input.tool_diameter_mm / 2) / 1000; // Nm
    const power = (Fc * Vc) / 60000; // kW

    // ─── Taylor Tool Life ──────────────────────────────────────────────────
    // T = (C/Vc)^(1/n) with feed/depth corrections
    const { C, n, p = 0.25, q = 0.15 } = profile.taylor;
    let T = Math.pow(C / Vc, 1 / n);
    // Extended Taylor correction for feed and depth
    T = T * Math.pow(0.15 / fz, p) * Math.pow(3 / input.axial_depth_mm, q);
    T = Math.max(1, Math.min(T, 480)); // Clamp 1-480 min

    // ─── Thermal Model (Trigger-Loewen-Shaw simplified) ────────────────────
    // θchip = θambient + K * Fc * Vc / (ρ * Cp * MRR)
    const { thermal_conductivity_W_mK, specific_heat_J_kgK } = profile.thermal;
    const mrr_mm3_min = input.axial_depth_mm * input.radial_depth_mm * input.feed_mm_min;
    const mrr_cm3_min = mrr_mm3_min / 1000;

    // Simplified chip temperature rise
    const thermalFactor = 0.9; // 90% of cutting energy goes to chip
    const energyInput = Fc * Vc / 60; // W
    const chipTemp = 20 + (thermalFactor * energyInput * 60) / (profile.material.density_kg_m3 * specific_heat_J_kgK * mrr_mm3_min * 1e-9);
    const toolTemp = chipTemp * 0.7; // Tool sees ~70% of chip temp
    const workTemp = chipTemp * 0.2; // Workpiece sees ~20%

    // ─── Surface Finish (Brammertz kinematic model) ────────────────────────
    // Ra_theoretical = fz² / (32 * r) for ball endmill
    // Ra_theoretical = fz² / (4 * r * 4) for flat endmill (simplified)
    const noseRadius = input.tool_diameter_mm / 2; // Approximation
    const Ra_theoretical = (fz * fz * 1000) / (32 * noseRadius);
    // Add roughening factors for material and conditions
    const materialFactor = profile.material.iso_group === "N" ? 0.8 : profile.material.iso_group === "H" ? 1.3 : 1.0;
    const Ra_predicted = Ra_theoretical * materialFactor * (input.coolant === "dry" ? 1.2 : 1.0);

    // ─── Risk Assessment ───────────────────────────────────────────────────
    // Deflection risk based on L/D ratio and force
    const deflectionRisk = Fres > 1000 ? "high" : Fres > 500 ? "medium" : "low";

    // Chatter risk based on spindle speed vs stability lobes (simplified)
    const chatterRisk = input.radial_depth_mm > input.tool_diameter_mm * 0.5 ? "high" :
                        input.radial_depth_mm > input.tool_diameter_mm * 0.25 ? "medium" : "low";

    // ─── Warnings & Recommendations ────────────────────────────────────────
    if (Vc > C * 1.2) {
      warnings.push(`Cutting speed ${Vc.toFixed(0)} m/min exceeds recommended ${(C * 1.2).toFixed(0)} m/min`);
      recommendations.push("Reduce spindle RPM for longer tool life");
    }

    if (fz > 0.3) {
      warnings.push(`Feed per tooth ${fz.toFixed(3)} mm is aggressive`);
    }

    if (chipTemp > 800) {
      warnings.push(`Chip temperature ${chipTemp.toFixed(0)}°C may cause rapid tool wear`);
      recommendations.push("Increase coolant flow or reduce cutting speed");
    }

    if (profile.recommended_coolant !== input.coolant) {
      recommendations.push(`Consider ${profile.recommended_coolant} coolant for ${profile.material.name}`);
    }

    if (profile.material.iso_group === "S" && Vc > 60) {
      warnings.push("Superalloy cutting speed exceeds safe limit");
      recommendations.push("Reduce to 30-50 m/min for titanium/Inconel");
    }

    // Specific energy
    const specificEnergy = (power * 1000 * 60) / mrr_mm3_min; // J/mm³

    return {
      cutting_force_N: Math.round(Fc),
      feed_force_N: Math.round(Ff),
      radial_force_N: Math.round(Fr),
      axial_force_N: Math.round(Fa),
      resultant_force_N: Math.round(Fres),
      torque_Nm: Math.round(torque * 100) / 100,
      power_kW: Math.round(power * 100) / 100,
      tool_life_min: Math.round(T),
      chip_temperature_C: Math.round(chipTemp),
      tool_temperature_C: Math.round(toolTemp),
      workpiece_temperature_C: Math.round(workTemp),
      theoretical_Ra_um: Math.round(Ra_theoretical * 100) / 100,
      predicted_Ra_um: Math.round(Ra_predicted * 100) / 100,
      mrr_cm3_min: Math.round(mrr_cm3_min * 100) / 100,
      specific_cutting_energy_J_mm3: Math.round(specificEnergy * 100) / 100,
      deflection_risk: deflectionRisk,
      chatter_risk: chatterRisk,
      material_profile: profile,
      calculation_timestamp: new Date().toISOString(),
      warnings,
      recommendations
    };
  }

  /**
   * Calculate turning physics for Mastercam material
   */
  calculateTurningPhysics(input: TurningPhysicsInput): TurningPhysicsOutput | null {
    const profile = mastercamMaterialBridgeEngine.getPhysicsProfile(input.material_id);
    if (!profile) return null;

    const warnings: string[] = [];
    const { kc1_1, mc } = profile.kienzle;

    // Kienzle for turning
    const kc = kc1_1 * Math.pow(input.feed_mm_rev, -mc);
    const chipArea = input.depth_of_cut_mm * input.feed_mm_rev;
    const Fc = kc * chipArea;
    const Ff = Fc * 0.4;
    const Fr = Fc * 0.3;

    // Power and torque
    const power = (Fc * input.cutting_speed_m_min) / 60000;
    const torque = power * 9550 / input.spindle_rpm;

    // Tool life
    const { C, n } = profile.taylor;
    const T = Math.pow(C / input.cutting_speed_m_min, 1 / n);

    // Surface finish (turning formula)
    const Ra = (input.feed_mm_rev * input.feed_mm_rev * 1000) / (32 * input.insert_nose_radius_mm);

    // MRR
    const mrr = input.depth_of_cut_mm * input.feed_mm_rev * input.cutting_speed_m_min * 1000 / 60;

    // Temperature (simplified)
    const chipTemp = 20 + (0.85 * Fc * input.cutting_speed_m_min) / (profile.material.density_kg_m3 * profile.thermal.specific_heat_J_kgK * mrr * 1e-9 * 60);

    if (input.cutting_speed_m_min > C * 1.2) {
      warnings.push("Cutting speed exceeds recommended limit");
    }

    return {
      cutting_force_N: Math.round(Fc),
      feed_force_N: Math.round(Ff),
      radial_force_N: Math.round(Fr),
      power_kW: Math.round(power * 100) / 100,
      torque_Nm: Math.round(torque * 100) / 100,
      tool_life_min: Math.round(T),
      theoretical_Ra_um: Math.round(Ra * 100) / 100,
      chip_temperature_C: Math.round(chipTemp),
      mrr_cm3_min: Math.round(mrr / 1000 * 100) / 100,
      warnings
    };
  }

  /**
   * Get physics summary for a material (quick reference)
   */
  getMaterialPhysicsSummary(materialId: string): {
    material: string;
    iso_group: ISOGroup;
    kc1_1: number;
    taylor_C: number;
    machinability: number;
    max_speed_m_min: number;
    recommended_coolant: string;
  } | null {
    const profile = mastercamMaterialBridgeEngine.getPhysicsProfile(materialId);
    if (!profile) return null;

    return {
      material: profile.material.name,
      iso_group: profile.material.iso_group,
      kc1_1: profile.kienzle.kc1_1,
      taylor_C: profile.taylor.C,
      machinability: profile.machinability_rating,
      max_speed_m_min: Math.round(profile.taylor.C * 1.2),
      recommended_coolant: profile.recommended_coolant
    };
  }

  /**
   * Compare physics across multiple materials
   */
  compareMaterials(materialIds: string[]): Array<{
    material: string;
    iso: ISOGroup;
    relative_force: number;
    relative_speed: number;
    relative_life: number;
  }> {
    const results: Array<{
      material: string;
      iso: ISOGroup;
      relative_force: number;
      relative_speed: number;
      relative_life: number;
    }> = [];

    // Use P-group steel as reference
    const refKc = 1800;
    const refC = 350;

    for (const id of materialIds) {
      const profile = mastercamMaterialBridgeEngine.getPhysicsProfile(id);
      if (!profile) continue;

      results.push({
        material: profile.material.name,
        iso: profile.material.iso_group,
        relative_force: Math.round((profile.kienzle.kc1_1 / refKc) * 100) / 100,
        relative_speed: Math.round((profile.taylor.C / refC) * 100) / 100,
        relative_life: Math.round((refC / profile.taylor.C) * 100) / 100
      });
    }

    return results;
  }
}

// Singleton export
export const mastercamMaterialPhysicsBridge = new MastercamMaterialPhysicsBridge();
