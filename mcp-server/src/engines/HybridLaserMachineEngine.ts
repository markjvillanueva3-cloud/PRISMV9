/**
 * HybridLaserMachineEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Models hybrid manufacturing processes that combine laser with
 * conventional machining: laser-assisted machining (LAM), laser
 * cladding + milling, and additive-subtractive hybrid.
 *
 * Calculates: preheating temperature, material removal benefit,
 * cladding parameters, and process sequencing.
 *
 * Actions: hybrid_lam_calc, hybrid_clad_calc, hybrid_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type HybridProcess = "laser_assisted_turning" | "laser_assisted_milling" | "laser_clad_mill" | "additive_subtractive";

export interface HybridLaserInput {
  process: HybridProcess;
  laser_power_W: number;
  spot_diameter_mm: number;
  workpiece_material: string;
  // For LAM (laser-assisted machining)
  preheat_target_C?: number;
  cutting_speed_m_per_min?: number;
  feed_mm_per_rev?: number;
  depth_of_cut_mm?: number;
  // For cladding
  clad_material?: string;
  powder_feed_g_per_min?: number;
  layer_height_mm?: number;
  track_width_mm?: number;
}

export interface HybridLaserResult {
  preheat_temperature_C: number;
  force_reduction_pct: number;
  tool_life_improvement_pct: number;
  surface_finish_improvement_pct: number;
  material_removal_rate_improvement_pct: number;
  energy_input_J_per_mm: number;
  process_sequence: string[];
  thermal_risk: "none" | "low" | "moderate" | "high";
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HybridLaserMachineEngine {
  calculate(input: HybridLaserInput): HybridLaserResult {
    // Energy density
    const spotArea = Math.PI * (input.spot_diameter_mm / 2) ** 2;
    const powerDensity = spotArea > 0 ? input.laser_power_W / spotArea : 0; // W/mm²

    // Preheat temperature estimate
    const targetTemp = input.preheat_target_C || 600;
    const achievedTemp = Math.min(targetTemp, powerDensity * 0.5 + 200);

    // Force reduction from preheating (material softens)
    const tempRatio = achievedTemp / 1000; // fraction of ~1000°C
    const forceReduction = Math.min(60, tempRatio * 80);

    // Tool life improvement (lower forces = less wear)
    const toolLifeImprovement = Math.min(300, forceReduction * 3);

    // Surface finish improvement
    const finishImprovement = Math.min(40, forceReduction * 0.5);

    // MRR improvement
    const mrrImprovement = Math.min(200, forceReduction * 2);

    // Energy input per mm
    const cuttingSpeed = input.cutting_speed_m_per_min || 50;
    const energyPerMm = input.laser_power_W / (cuttingSpeed * 1000 / 60);

    // Thermal risk
    const thermalRisk: HybridLaserResult["thermal_risk"] =
      achievedTemp > 800 ? "high"
      : achievedTemp > 600 ? "moderate"
      : achievedTemp > 400 ? "low"
      : "none";

    // Process sequence
    const sequence: string[] = [];
    if (input.process === "laser_assisted_turning" || input.process === "laser_assisted_milling") {
      sequence.push("1. Position laser spot ahead of cutting tool (2-5mm lead)");
      sequence.push(`2. Activate laser at ${input.laser_power_W}W, spot ${input.spot_diameter_mm}mm`);
      sequence.push(`3. Begin cutting at ${cuttingSpeed} m/min`);
      sequence.push("4. Maintain laser-tool gap during machining");
      sequence.push("5. Deactivate laser at end of pass");
    } else if (input.process === "laser_clad_mill") {
      sequence.push("1. Deposit cladding layer via laser powder deposition");
      sequence.push(`2. Layer height: ${input.layer_height_mm || 0.3}mm, width: ${input.track_width_mm || 1.5}mm`);
      sequence.push("3. Cool to ambient (or controlled cool)");
      sequence.push("4. Mill deposited surface to final dimension");
      sequence.push("5. Repeat for next layer if needed");
    } else {
      sequence.push("1. Build near-net shape via laser additive");
      sequence.push("2. Machine critical surfaces to final tolerance");
      sequence.push("3. Inspect and repeat as needed");
    }

    // Recommendations
    const recs: string[] = [];
    if (thermalRisk === "high") {
      recs.push("High thermal input — risk of phase transformation or surface damage; reduce laser power");
    }
    if (input.process.includes("assist") && input.spot_diameter_mm > 5) {
      recs.push("Large spot diameter — concentrate laser energy with smaller spot for effective preheating");
    }
    if (input.workpiece_material?.toLowerCase().includes("titanium") && achievedTemp > 500) {
      recs.push("Titanium above 500°C reacts with oxygen — use argon shielding gas");
    }
    if (input.process === "laser_clad_mill" && !input.powder_feed_g_per_min) {
      recs.push("Specify powder feed rate for cladding parameter optimization");
    }
    if (recs.length === 0) {
      recs.push("Hybrid process parameters acceptable — proceed with trial cuts");
    }

    return {
      preheat_temperature_C: Math.round(achievedTemp),
      force_reduction_pct: Math.round(forceReduction * 10) / 10,
      tool_life_improvement_pct: Math.round(toolLifeImprovement),
      surface_finish_improvement_pct: Math.round(finishImprovement * 10) / 10,
      material_removal_rate_improvement_pct: Math.round(mrrImprovement),
      energy_input_J_per_mm: Math.round(energyPerMm * 100) / 100,
      process_sequence: sequence,
      thermal_risk: thermalRisk,
      recommendations: recs,
    };
  }
}

export const hybridLaserMachineEngine = new HybridLaserMachineEngine();
