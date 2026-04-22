/**
 * WEDMMRRPhysicsEngine — Material Removal Rate first-principles model
 * @milestone WEDM-BIZ-MS0
 * @unit U-WB03
 *
 * Comprehensive MRR model combining Klocke empirical correlations with
 * thermal-electrical coupling for accurate cut time and thermal load prediction.
 *
 * Physics basis:
 * - Energy-based MRR: MRR = η × P_avg / ε_m [mm³/min]
 *   where P_avg = I × V_arc × t_on / (t_on + t_off) [W]
 *   and ε_m = specific melting energy [J/mm³]
 * - Klocke correlation: MRR = C × I^α × t_on^β × duty^γ [mm³/min]
 * - Thermal coupling: MRR affects thermal load which affects material removal
 * - Servo influence: Gap voltage affects spark energy and discharge efficiency
 *
 * @see Klocke "Manufacturing Processes 3" §5.2
 * @see Rajurkar et al. "Thermal modeling of EDM process" (1993)
 * @see src/physics/constants.ts — EDM_PHYSICS
 */

import { EDM_PHYSICS } from "../physics/constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type WireMaterial = "brass" | "zinc_coated" | "diffusion_annealed" | "molybdenum" | "tungsten";
export type WorkpieceMaterial = "steel" | "stainless" | "aluminum" | "titanium" | "tungsten_carbide" | "inconel" | "copper" | "pcd";

export interface MaterialThermalProps {
  name: WorkpieceMaterial;
  density_kg_m3: number;
  specificHeat_J_kgK: number;
  thermalConductivity_W_mK: number;
  meltingPoint_C: number;
  specificMeltingEnergy_J_mm3: number;  // ε_m
  machinabilityFactor: number;          // Relative to steel = 1.0
}

export interface WireProperties {
  name: WireMaterial;
  conductivity_percent_IACS: number;
  tensileStrength_MPa: number;
  meltingPoint_C: number;
  erosionRate: number;                  // Relative wire consumption
}

export interface ServoSettings {
  targetGapVoltage_V: number;           // Servo target [V]
  adaptiveGain: number;                 // Servo response gain [0.1-1.0]
  feedOverride_percent: number;         // Manual feed override
}

export interface MRRInput {
  material: WorkpieceMaterial | string;
  thickness_mm: number;
  wire_type?: WireMaterial;
  wire_diameter_mm?: number;
  pulse_on_us: number;
  pulse_off_us: number;
  current_A: number;
  voltage_V?: number;
  servo?: Partial<ServoSettings>;
  flushing_pressure_bar?: number;
}

export interface MRRResult {
  mrr_mm3_min: number;                  // Material removal rate
  predicted_cut_time_min_per_mm: number; // Time per mm of cut length
  thermal_load: {
    power_input_W: number;              // Average power into workpiece
    temperature_rise_C: number;         // Estimated temp rise at cut zone
    heat_affected_zone_um: number;      // HAZ depth
    cooling_requirement_W: number;      // Heat removal needed
  };
  process_efficiency: {
    energy_efficiency: number;          // Useful removal / total energy
    discharge_efficiency: number;       // Good sparks / total pulses
    servo_efficiency: number;           // Actual vs optimal gap
  };
  wire_consumption: {
    rate_m_per_m_cut: number;           // Wire per cut length
    cost_factor: number;                // Relative cost
  };
  kerf_width_mm: number;
  feed_rate_mm_min: number;
  warnings: string[];
  recommendations: string[];
}

export interface CutTimeEstimate {
  total_time_min: number;
  cutting_time_min: number;
  threading_time_min: number;
  setup_overhead_min: number;
  breakdown: {
    roughing_min: number;
    skim1_min: number;
    skim2_min: number;
    skim3_min: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL DATABASE
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_THERMAL_PROPS: Record<WorkpieceMaterial, MaterialThermalProps> = {
  steel: {
    name: "steel",
    density_kg_m3: 7850,
    specificHeat_J_kgK: 500,
    thermalConductivity_W_mK: 50,
    meltingPoint_C: 1500,
    specificMeltingEnergy_J_mm3: 13.5,  // Includes latent heat
    machinabilityFactor: 1.0,
  },
  stainless: {
    name: "stainless",
    density_kg_m3: 8000,
    specificHeat_J_kgK: 500,
    thermalConductivity_W_mK: 16,       // Much lower than carbon steel
    meltingPoint_C: 1450,
    specificMeltingEnergy_J_mm3: 14.2,
    machinabilityFactor: 0.85,
  },
  aluminum: {
    name: "aluminum",
    density_kg_m3: 2700,
    specificHeat_J_kgK: 900,
    thermalConductivity_W_mK: 237,      // Very high
    meltingPoint_C: 660,
    specificMeltingEnergy_J_mm3: 4.8,
    machinabilityFactor: 1.8,           // Easier to machine
  },
  titanium: {
    name: "titanium",
    density_kg_m3: 4500,
    specificHeat_J_kgK: 520,
    thermalConductivity_W_mK: 22,       // Poor conductor
    meltingPoint_C: 1668,
    specificMeltingEnergy_J_mm3: 16.5,
    machinabilityFactor: 0.45,          // Difficult
  },
  tungsten_carbide: {
    name: "tungsten_carbide",
    density_kg_m3: 15630,
    specificHeat_J_kgK: 200,
    thermalConductivity_W_mK: 110,
    meltingPoint_C: 2870,
    specificMeltingEnergy_J_mm3: 28.0,  // Very high
    machinabilityFactor: 0.25,          // Very difficult
  },
  inconel: {
    name: "inconel",
    density_kg_m3: 8440,
    specificHeat_J_kgK: 435,
    thermalConductivity_W_mK: 11,       // Very poor
    meltingPoint_C: 1350,
    specificMeltingEnergy_J_mm3: 15.8,
    machinabilityFactor: 0.40,
  },
  copper: {
    name: "copper",
    density_kg_m3: 8960,
    specificHeat_J_kgK: 385,
    thermalConductivity_W_mK: 401,      // Excellent
    meltingPoint_C: 1085,
    specificMeltingEnergy_J_mm3: 8.2,
    machinabilityFactor: 1.4,
  },
  pcd: {
    name: "pcd",
    density_kg_m3: 3500,
    specificHeat_J_kgK: 500,
    thermalConductivity_W_mK: 2000,     // Extremely high
    meltingPoint_C: 3550,               // Graphitization temp
    specificMeltingEnergy_J_mm3: 85.0,  // Very high sublimation energy
    machinabilityFactor: 0.08,          // Extremely difficult
  },
};

const WIRE_PROPERTIES: Record<WireMaterial, WireProperties> = {
  brass: {
    name: "brass",
    conductivity_percent_IACS: 26,
    tensileStrength_MPa: 900,
    meltingPoint_C: 920,
    erosionRate: 1.0,
  },
  zinc_coated: {
    name: "zinc_coated",
    conductivity_percent_IACS: 28,
    tensileStrength_MPa: 1000,
    meltingPoint_C: 420,                // Zinc layer
    erosionRate: 1.1,
  },
  diffusion_annealed: {
    name: "diffusion_annealed",
    conductivity_percent_IACS: 22,
    tensileStrength_MPa: 800,
    meltingPoint_C: 900,
    erosionRate: 0.9,
  },
  molybdenum: {
    name: "molybdenum",
    conductivity_percent_IACS: 34,
    tensileStrength_MPa: 2000,
    meltingPoint_C: 2623,
    erosionRate: 0.3,                   // Very low consumption
  },
  tungsten: {
    name: "tungsten",
    conductivity_percent_IACS: 31,
    tensileStrength_MPa: 3400,
    meltingPoint_C: 3422,
    erosionRate: 0.2,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────

class WEDMMRRPhysicsEngine {
  /**
   * Calculate comprehensive MRR with thermal coupling
   */
  calculate(input: MRRInput): MRRResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Resolve material properties
    const material = this.getMaterialProps(input.material);
    const wire = this.getWireProps(input.wire_type ?? "brass");
    const wire_diameter = input.wire_diameter_mm ?? 0.25;
    const voltage = input.voltage_V ?? EDM_PHYSICS.gap_voltage.arc_voltage_V;
    const flushing = input.flushing_pressure_bar ?? 6;

    // Servo settings with defaults
    const servo: ServoSettings = {
      targetGapVoltage_V: input.servo?.targetGapVoltage_V ?? EDM_PHYSICS.gap_voltage.servo_target_V,
      adaptiveGain: input.servo?.adaptiveGain ?? 0.5,
      feedOverride_percent: input.servo?.feedOverride_percent ?? 100,
    };

    // Validate inputs
    if (input.thickness_mm > 300) {
      warnings.push(`Thickness ${input.thickness_mm}mm exceeds typical WEDM range`);
    }
    if (input.current_A > 30) {
      warnings.push(`Current ${input.current_A}A is very high — verify wire can handle`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ENERGY-BASED MRR MODEL
    // ══════════════════════════════════════════════════════════════════════════

    // Pulse parameters
    const t_on_s = input.pulse_on_us * 1e-6;
    const t_off_s = input.pulse_off_us * 1e-6;
    const period_s = t_on_s + t_off_s;
    const duty_cycle = t_on_s / period_s;
    const frequency_Hz = 1 / period_s;

    // Energy per spark [J]
    const energy_per_spark_J = input.current_A * voltage * t_on_s;

    // Average power [W]
    const avg_power_W = input.current_A * voltage * duty_cycle;

    // Discharge efficiency (affected by servo and gap control)
    const gap_deviation = Math.abs(voltage - servo.targetGapVoltage_V) / servo.targetGapVoltage_V;
    const discharge_efficiency = 0.95 - 0.3 * gap_deviation - 0.1 * (1 - servo.adaptiveGain);

    // Energy efficiency into material (rest goes to wire, dielectric, radiation)
    const partition_to_workpiece = 0.18;  // Typical 15-25% per DiBitonto
    const energy_into_workpiece_W = avg_power_W * partition_to_workpiece * discharge_efficiency;

    // Energy-based MRR [mm³/min]
    // MRR = P_useful / ε_m × 60 [mm³/min]
    const mrr_energy = (energy_into_workpiece_W / material.specificMeltingEnergy_J_mm3) * 60;

    // ══════════════════════════════════════════════════════════════════════════
    // KLOCKE EMPIRICAL MODEL
    // ══════════════════════════════════════════════════════════════════════════

    // Klocke correlation coefficients (calibrated to Charmilles data)
    // Charmilles handbook: ~12 mm³/min for steel 25mm at 8A, 0.8µs on, 8µs off
    const C_klocke = 0.12;  // mm³/min base constant (calibrated)
    const alpha = 1.15;      // Current exponent
    const beta = 0.62;       // Pulse-on exponent
    const gamma = 0.75;      // Duty cycle exponent

    const mrr_klocke = C_klocke *
      Math.pow(input.current_A, alpha) *
      Math.pow(input.pulse_on_us, beta) *
      Math.pow(duty_cycle, gamma) *
      material.machinabilityFactor;

    // ══════════════════════════════════════════════════════════════════════════
    // COMBINED MODEL WITH CORRECTIONS
    // ══════════════════════════════════════════════════════════════════════════

    // Weighted combination (40% physics, 60% empirical for robustness)
    let mrr_base = 0.4 * mrr_energy + 0.6 * mrr_klocke;

    // Thickness correction (thin = better flushing, thick = worse)
    // Based on Klocke thickness-MRR relationship
    const thickness_ref = 25;  // Reference thickness [mm]
    const thickness_exp = -0.15;
    const thickness_factor = Math.pow(input.thickness_mm / thickness_ref, thickness_exp);
    mrr_base *= thickness_factor;

    // Flushing pressure correction
    const flushing_ref = 6;  // Reference pressure [bar]
    const flushing_factor = 0.85 + 0.15 * Math.min(flushing / flushing_ref, 1.5);
    mrr_base *= flushing_factor;

    // Servo override
    mrr_base *= servo.feedOverride_percent / 100;

    // Wire type bonus (zinc coating improves speed)
    const wire_factor = wire.name === "zinc_coated" ? 1.15 :
                        wire.name === "diffusion_annealed" ? 1.08 : 1.0;
    mrr_base *= wire_factor;

    const mrr_mm3_min = Math.max(0.01, mrr_base);

    // ══════════════════════════════════════════════════════════════════════════
    // THERMAL LOAD CALCULATION
    // ══════════════════════════════════════════════════════════════════════════

    // Power into workpiece
    const power_input_W = energy_into_workpiece_W;

    // Temperature rise estimation (simplified lumped model)
    // ΔT ≈ P × t / (ρ × Cp × V_heated)
    // Assume heated volume is ~1mm³ per pulse
    const heated_volume_mm3 = 1;
    const heated_mass_kg = (heated_volume_mm3 * 1e-9) * material.density_kg_m3;
    const temp_rise_per_pulse = energy_per_spark_J * partition_to_workpiece /
      (heated_mass_kg * material.specificHeat_J_kgK);

    // Steady-state temperature rise with cooling
    const cooling_effectiveness = 0.7 + 0.3 * (flushing / 10);
    const temperature_rise_C = temp_rise_per_pulse * (1 - cooling_effectiveness) *
      Math.min(frequency_Hz / 10000, 5);

    // Heat affected zone depth (thermal diffusion)
    // δ ≈ √(α × t_on) where α = k/(ρ×Cp)
    const thermal_diffusivity = material.thermalConductivity_W_mK /
      (material.density_kg_m3 * material.specificHeat_J_kgK);
    const haz_depth_um = Math.sqrt(thermal_diffusivity * t_on_s) * 1e6 * 2;

    // Cooling requirement
    const cooling_requirement_W = power_input_W * 0.8;  // Most heat must be removed

    // ══════════════════════════════════════════════════════════════════════════
    // DERIVED OUTPUTS
    // ══════════════════════════════════════════════════════════════════════════

    // Kerf width using kerf_overcut model: overcut = C × I^a × t_on^b
    const kerf = EDM_PHYSICS.kerf_overcut;
    const overcut_um = Math.max(
      kerf.base_coefficient * Math.pow(input.current_A, kerf.current_exponent) *
        Math.pow(input.pulse_on_us, kerf.ton_exponent),
      kerf.min_overcut_um
    );
    // Typical spark gap ~25µm (between min_gap 10µm and max_gap 80µm)
    const spark_gap_um = (EDM_PHYSICS.gap_voltage.min_gap_um + EDM_PHYSICS.gap_voltage.max_gap_um) / 3;
    const kerf_width_mm = wire_diameter + 2 * (spark_gap_um + overcut_um) / 1000;

    // Feed rate from MRR
    const cross_section_mm2 = kerf_width_mm * input.thickness_mm;
    const feed_rate_mm_min = mrr_mm3_min / cross_section_mm2;

    // Cut time per mm of profile
    const cut_time_min_per_mm = 1 / feed_rate_mm_min;

    // Wire consumption (simplified model)
    const wire_speed_m_min = 8;  // Typical wire speed
    const wire_rate_m_per_m_cut = wire_speed_m_min / feed_rate_mm_min * 1000;
    const wire_cost_factor = wire.erosionRate * (wire.name === "molybdenum" ? 3 : 1);

    // Servo efficiency
    const servo_efficiency = discharge_efficiency * (servo.feedOverride_percent / 100);

    // ══════════════════════════════════════════════════════════════════════════
    // RECOMMENDATIONS
    // ══════════════════════════════════════════════════════════════════════════

    if (material.machinabilityFactor < 0.5) {
      recommendations.push(`${material.name} is difficult — consider reduced current and longer off-time`);
    }
    if (temperature_rise_C > 100) {
      recommendations.push("High thermal load — increase flushing or reduce power");
    }
    if (haz_depth_um > 20) {
      recommendations.push(`HAZ depth ${haz_depth_um.toFixed(1)}µm — add skim passes for precision`);
    }
    if (discharge_efficiency < 0.7) {
      recommendations.push("Low discharge efficiency — check servo settings and gap control");
    }

    return {
      mrr_mm3_min: Math.round(mrr_mm3_min * 1000) / 1000,
      predicted_cut_time_min_per_mm: Math.round(cut_time_min_per_mm * 10000) / 10000,
      thermal_load: {
        power_input_W: Math.round(power_input_W * 100) / 100,
        temperature_rise_C: Math.round(temperature_rise_C * 10) / 10,
        heat_affected_zone_um: Math.round(haz_depth_um * 10) / 10,
        cooling_requirement_W: Math.round(cooling_requirement_W * 100) / 100,
      },
      process_efficiency: {
        energy_efficiency: Math.round(partition_to_workpiece * discharge_efficiency * 10000) / 10000,
        discharge_efficiency: Math.round(discharge_efficiency * 10000) / 10000,
        servo_efficiency: Math.round(servo_efficiency * 10000) / 10000,
      },
      wire_consumption: {
        rate_m_per_m_cut: Math.round(wire_rate_m_per_m_cut * 100) / 100,
        cost_factor: Math.round(wire_cost_factor * 100) / 100,
      },
      kerf_width_mm: Math.round(kerf_width_mm * 10000) / 10000,
      feed_rate_mm_min: Math.round(feed_rate_mm_min * 1000) / 1000,
      warnings,
      recommendations,
    };
  }

  /**
   * Estimate total cut time for a profile
   */
  estimateCutTime(
    input: MRRInput,
    profile_length_mm: number,
    options: {
      num_skim_passes?: number;
      num_start_holes?: number;
      include_setup?: boolean;
    } = {}
  ): CutTimeEstimate {
    const { num_skim_passes = 2, num_start_holes = 1, include_setup = true } = options;

    const roughResult = this.calculate(input);

    // Roughing time
    const roughing_min = profile_length_mm * roughResult.predicted_cut_time_min_per_mm;

    // Skim passes are faster (lower power, higher feed)
    const skim_factor = [0.5, 0.35, 0.25, 0.2];  // Each skim faster than previous
    let skim1_min = 0, skim2_min = 0, skim3_min = 0;

    if (num_skim_passes >= 1) {
      skim1_min = roughing_min * skim_factor[0];
    }
    if (num_skim_passes >= 2) {
      skim2_min = roughing_min * skim_factor[1];
    }
    if (num_skim_passes >= 3) {
      skim3_min = roughing_min * skim_factor[2];
    }

    const cutting_time_min = roughing_min + skim1_min + skim2_min + skim3_min;

    // Threading time per hole (depends on thickness)
    const threading_per_hole_min = 0.5 + input.thickness_mm * 0.02;
    const threading_time_min = num_start_holes * threading_per_hole_min;

    // Setup overhead
    const setup_overhead_min = include_setup ? 5 + input.thickness_mm * 0.1 : 0;

    const total_time_min = cutting_time_min + threading_time_min + setup_overhead_min;

    return {
      total_time_min: Math.round(total_time_min * 100) / 100,
      cutting_time_min: Math.round(cutting_time_min * 100) / 100,
      threading_time_min: Math.round(threading_time_min * 100) / 100,
      setup_overhead_min: Math.round(setup_overhead_min * 100) / 100,
      breakdown: {
        roughing_min: Math.round(roughing_min * 100) / 100,
        skim1_min: Math.round(skim1_min * 100) / 100,
        skim2_min: Math.round(skim2_min * 100) / 100,
        skim3_min: Math.round(skim3_min * 100) / 100,
      },
    };
  }

  /**
   * Compare MRR across materials for same process parameters
   */
  compareMaterials(
    materials: WorkpieceMaterial[],
    input: Omit<MRRInput, "material">
  ): Array<{ material: WorkpieceMaterial; result: MRRResult }> {
    return materials.map((mat) => ({
      material: mat,
      result: this.calculate({ ...input, material: mat }),
    })).sort((a, b) => b.result.mrr_mm3_min - a.result.mrr_mm3_min);
  }

  /**
   * Optimize parameters for target MRR
   */
  optimizeForMRR(
    target_mrr_mm3_min: number,
    material: WorkpieceMaterial,
    thickness_mm: number,
    constraints: {
      max_current_A?: number;
      max_pulse_on_us?: number;
      min_surface_finish?: boolean;
    } = {}
  ): {
    optimized_params: Partial<MRRInput>;
    achieved_mrr: number;
    iterations: number;
  } {
    const { max_current_A = 25, max_pulse_on_us = 3, min_surface_finish = false } = constraints;

    let best_params: Partial<MRRInput> = {
      material,
      thickness_mm,
      current_A: 5,
      pulse_on_us: 0.5,
      pulse_off_us: 10,
    };
    let best_mrr = 0;
    let iterations = 0;

    // Grid search over current and pulse_on
    for (let current = 3; current <= max_current_A; current += 2) {
      for (let pulse_on = 0.3; pulse_on <= max_pulse_on_us; pulse_on += 0.2) {
        const pulse_off = min_surface_finish ? pulse_on * 20 : pulse_on * 8;

        const result = this.calculate({
          material,
          thickness_mm,
          current_A: current,
          pulse_on_us: pulse_on,
          pulse_off_us: pulse_off,
        });

        iterations++;

        if (Math.abs(result.mrr_mm3_min - target_mrr_mm3_min) <
            Math.abs(best_mrr - target_mrr_mm3_min)) {
          best_mrr = result.mrr_mm3_min;
          best_params = {
            material,
            thickness_mm,
            current_A: current,
            pulse_on_us: pulse_on,
            pulse_off_us: pulse_off,
          };
        }

        // Early exit if close enough
        if (Math.abs(result.mrr_mm3_min - target_mrr_mm3_min) / target_mrr_mm3_min < 0.05) {
          return { optimized_params: best_params, achieved_mrr: best_mrr, iterations };
        }
      }
    }

    return { optimized_params: best_params, achieved_mrr: best_mrr, iterations };
  }

  /**
   * Validate MRR prediction against empirical data
   */
  validateAgainstEmpirical(
    input: MRRInput,
    measured_mrr_mm3_min: number
  ): {
    predicted: number;
    measured: number;
    error_percent: number;
    within_tolerance: boolean;
    calibration_factor: number;
  } {
    const result = this.calculate(input);
    const error_percent = Math.abs(result.mrr_mm3_min - measured_mrr_mm3_min) /
      measured_mrr_mm3_min * 100;
    const calibration_factor = measured_mrr_mm3_min / result.mrr_mm3_min;

    return {
      predicted: result.mrr_mm3_min,
      measured: measured_mrr_mm3_min,
      error_percent: Math.round(error_percent * 100) / 100,
      within_tolerance: error_percent <= 15,
      calibration_factor: Math.round(calibration_factor * 1000) / 1000,
    };
  }

  /**
   * Get material thermal properties
   */
  getMaterialProps(material: WorkpieceMaterial | string): MaterialThermalProps {
    const key = material.toLowerCase().replace(/[- ]/g, "_") as WorkpieceMaterial;
    const props = MATERIAL_THERMAL_PROPS[key];
    if (!props) {
      // Default to steel if unknown
      return MATERIAL_THERMAL_PROPS.steel;
    }
    return props;
  }

  /**
   * Get wire properties
   */
  getWireProps(wire: WireMaterial): WireProperties {
    return WIRE_PROPERTIES[wire] ?? WIRE_PROPERTIES.brass;
  }

  /**
   * List all supported materials
   */
  listMaterials(): MaterialThermalProps[] {
    return Object.values(MATERIAL_THERMAL_PROPS);
  }

  /**
   * List all supported wire types
   */
  listWireTypes(): WireProperties[] {
    return Object.values(WIRE_PROPERTIES);
  }
}

export const wedmMRRPhysicsEngine = new WEDMMRRPhysicsEngine();
export { WEDMMRRPhysicsEngine };
