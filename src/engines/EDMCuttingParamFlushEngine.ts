/**
 * PRISM Manufacturing Intelligence — EDM Cutting Parameter & Flushing Strategy Engine
 * Consolidates WEDM-P2P-MS9 (Cutting Parameter Optimization) + MS10 (Flushing Strategy)
 *
 * MS9 Units (7):
 *   U01 PulseParameterOptimizer   — t_on, t_off, I_p per pass type & material
 *   U02 ServoControlOptimizer     — gap voltage, servo speed, short-circuit retract
 *   U03 WireSpeedOptimizer        — feed rate by wire type & pass, consumption calc
 *   U04 DischargeEnergyCalculator — E = V×I×t_on, crater size, MRR, Ra from energy
 *   U05 TechnologyTableMapper     — map PRISM params → machine-native tables
 *   U06 WireBreakPredictor        — P(break) = 1-exp(-λ×H×DC/FF), risk mitigation
 *   U07 CapacitanceCircuitOptimizer — RC finishing circuits for Ra < 0.4 μm
 *
 * MS10 Units (5):
 *   U01 FlushingModeSelector      — submerged vs spray/jet vs combined
 *   U02 NozzlePositionOptimizer   — distance, angle, collision avoidance
 *   U03 FlushingPressureCalculator— pressure by pass type & part geometry
 *   U04 DielectricConditionMonitor— conductivity, temperature, filtration, resin
 *   U05 DebrisEvacuationModeler   — particle sizing, settling velocity, gap flush
 *
 * @version 1.0.0
 * @module EDMCuttingParamFlushEngine
 */

import { log } from "../utils/Logger.js";
import {
  resolvePublishedCondition,
  resolveMaterialGroup,
  type PublishedPulseCondition,
  type EDMMaterialGroup,
  type WireType as PublishedWireType,
  type PassType as PublishedPassType,
} from "../data/wedm-published-conditions.js";
import { EDM_PHYSICS } from "../physics/constants.js";
import { klockeRa, getRaModel, type KlockeRaModel } from "./utils/klockeRa.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type PassType = "rough" | "semi_finish" | "finish" | "super_finish";
export type FlushingMode = "submerged" | "spray_jet" | "combined";

export interface CuttingParamInput {
  material: string;
  thickness_mm: number;
  wire_diameter_mm: number;
  wire_type: string;
  pass_number: number;
  pass_type: PassType;
  target_ra_um?: number;
  target_mrr_mm2_min?: number;
  machine_controller?: string;
  max_wire_break_risk?: number; // 0-1, default 0.1
}

export interface CuttingParamResult {
  pulse: {
    on_us: number;
    off_us: number;
    peak_current_A: number;
    open_voltage_V: number;
    servo_voltage_V: number;
  };
  wire: {
    speed_m_min: number;
    tension_N: number;
    consumption_m_per_min: number;
  };
  energy: {
    per_discharge_mj: number;
    duty_cycle: number;
    frequency_khz: number;
  };
  predicted: {
    mrr_mm2_min: number;
    ra_um: number;
    recast_um: number;
    crater_diameter_um: number;
  };
  wire_break_risk: number;
  technology_table?: {
    machine: string;
    table_id: string;
    condition_code: string;
  };
  capacitance_pf?: number;
  warnings: string[];
}

export interface FlushingInput {
  material: string;
  thickness_mm: number;
  pass_type: PassType;
  profile_type?: "open" | "closed" | "mixed";
  wire_diameter_mm?: number;
  discharge_energy_mj?: number;
  machine_controller?: string;
}

export interface FlushingPlan {
  mode: FlushingMode;
  upper_nozzle: {
    pressure_bar: number;
    distance_mm: number;
    angle_deg: number;
  };
  lower_nozzle: {
    pressure_bar: number;
    distance_mm: number;
    angle_deg: number;
  };
  dielectric: {
    type: string;
    conductivity_target_uS_cm: number;
    temp_target_C: number;
    level_mm: number;
  };
  debris: {
    particle_size_um: number;
    settling_velocity_mm_s: number;
    flush_velocity_needed_mm_s: number;
  };
  maintenance: {
    filter_change_hours: number;
    resin_life_hours: number;
    fluid_change_liters: number;
  };
}

export interface WireBreakPrediction {
  probability: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  contributing_factors: { factor: string; weight: number }[];
  mitigation: string[];
  adjusted_params?: Partial<CuttingParamResult["pulse"]>;
}

export interface TechnologyTableMapping {
  machine: string;
  table_id: string;
  condition_code: string;
  parameter_set: Record<string, number | string>;
  notes: string[];
}

export interface EnergyCalculation {
  per_discharge_mj: number;
  duty_cycle: number;
  frequency_khz: number;
  avg_power_W: number;
  crater_diameter_um: number;
  crater_depth_um: number;
  mrr_mm2_min: number;
  ra_um: number;
  recast_layer_um: number;
  stochastic_energy_distribution: {
    mean_mj: number;
    std_dev_mj: number;
    cv_percent: number;
  };
}

export interface FullOptimizeResult {
  params: CuttingParamResult;
  flushing: FlushingPlan;
  wire_break: WireBreakPrediction;
  energy: EnergyCalculation;
  technology_table?: TechnologyTableMapping;
  optimization_score: number;
  notes: string[];
}

// ============================================================================
// MATERIAL PROPERTY DATABASE
// ============================================================================

interface MaterialEDMProps {
  melting_point_C: number;
  thermal_conductivity_W_mK: number;
  electrical_resistivity_uOhm_cm: number;
  density_g_cm3: number;
  specific_heat_J_gK: number;
  t_on_factor: number;    // multiplier vs baseline
  t_off_factor: number;   // multiplier vs baseline
  current_factor: number; // multiplier vs baseline
  machinability_index: number; // 1.0 = steel baseline
}

const MATERIAL_DB: Record<string, MaterialEDMProps> = {
  steel: {
    melting_point_C: 1510, thermal_conductivity_W_mK: 50,
    electrical_resistivity_uOhm_cm: 15, density_g_cm3: 7.85,
    specific_heat_J_gK: 0.49, t_on_factor: 1.0, t_off_factor: 1.0,
    current_factor: 1.0, machinability_index: 1.0,
  },
  stainless_steel: {
    melting_point_C: 1450, thermal_conductivity_W_mK: 16,
    electrical_resistivity_uOhm_cm: 72, density_g_cm3: 8.0,
    specific_heat_J_gK: 0.50, t_on_factor: 0.9, t_off_factor: 1.15,
    current_factor: 0.95, machinability_index: 0.85,
  },
  aluminum: {
    melting_point_C: 660, thermal_conductivity_W_mK: 237,
    electrical_resistivity_uOhm_cm: 2.7, density_g_cm3: 2.7,
    specific_heat_J_gK: 0.90, t_on_factor: 0.6, t_off_factor: 0.8,
    current_factor: 0.7, machinability_index: 1.3,
  },
  titanium: {
    melting_point_C: 1668, thermal_conductivity_W_mK: 22,
    electrical_resistivity_uOhm_cm: 42, density_g_cm3: 4.51,
    specific_heat_J_gK: 0.52, t_on_factor: 1.1, t_off_factor: 1.4,
    current_factor: 0.85, machinability_index: 0.55,
  },
  tungsten_carbide: {
    melting_point_C: 2870, thermal_conductivity_W_mK: 110,
    electrical_resistivity_uOhm_cm: 20, density_g_cm3: 15.6,
    specific_heat_J_gK: 0.20, t_on_factor: 1.3, t_off_factor: 1.5,
    current_factor: 1.2, machinability_index: 0.40,
  },
  copper: {
    melting_point_C: 1085, thermal_conductivity_W_mK: 401,
    electrical_resistivity_uOhm_cm: 1.7, density_g_cm3: 8.96,
    specific_heat_J_gK: 0.39, t_on_factor: 0.7, t_off_factor: 0.9,
    current_factor: 0.8, machinability_index: 1.1,
  },
  inconel: {
    melting_point_C: 1400, thermal_conductivity_W_mK: 11,
    electrical_resistivity_uOhm_cm: 103, density_g_cm3: 8.44,
    specific_heat_J_gK: 0.44, t_on_factor: 0.85, t_off_factor: 1.3,
    current_factor: 0.9, machinability_index: 0.50,
  },
  d2_tool_steel: {
    melting_point_C: 1421, thermal_conductivity_W_mK: 20,
    electrical_resistivity_uOhm_cm: 65, density_g_cm3: 7.7,
    specific_heat_J_gK: 0.46, t_on_factor: 1.0, t_off_factor: 1.1,
    current_factor: 1.0, machinability_index: 0.90,
  },
  // ── Shop Tool Steel Portfolio ────────────────────────────────────────
  h13_tool_steel: {
    melting_point_C: 1427, thermal_conductivity_W_mK: 24.3,
    electrical_resistivity_uOhm_cm: 52, density_g_cm3: 7.8,
    specific_heat_J_gK: 0.46, t_on_factor: 1.0, t_off_factor: 1.05,
    current_factor: 1.0, machinability_index: 0.95,
  },
  a2_tool_steel: {
    melting_point_C: 1420, thermal_conductivity_W_mK: 25,
    electrical_resistivity_uOhm_cm: 55, density_g_cm3: 7.86,
    specific_heat_J_gK: 0.46, t_on_factor: 1.0, t_off_factor: 1.05,
    current_factor: 1.0, machinability_index: 0.95,
  },
  s7_tool_steel: {
    melting_point_C: 1420, thermal_conductivity_W_mK: 33,
    electrical_resistivity_uOhm_cm: 50, density_g_cm3: 7.83,
    specific_heat_J_gK: 0.475, t_on_factor: 1.0, t_off_factor: 1.0,
    current_factor: 1.0, machinability_index: 1.0,
  },
  o2_tool_steel: {
    melting_point_C: 1420, thermal_conductivity_W_mK: 36,
    electrical_resistivity_uOhm_cm: 45, density_g_cm3: 7.86,
    specific_heat_J_gK: 0.46, t_on_factor: 1.0, t_off_factor: 1.0,
    current_factor: 1.0, machinability_index: 0.95,
  },
  "4140_steel": {
    melting_point_C: 1416, thermal_conductivity_W_mK: 42.6,
    electrical_resistivity_uOhm_cm: 22, density_g_cm3: 7.85,
    specific_heat_J_gK: 0.473, t_on_factor: 0.95, t_off_factor: 0.95,
    current_factor: 1.0, machinability_index: 1.05,
  },
  "52100_bearing": {
    melting_point_C: 1424, thermal_conductivity_W_mK: 46.6,
    electrical_resistivity_uOhm_cm: 19, density_g_cm3: 7.83,
    specific_heat_J_gK: 0.475, t_on_factor: 1.0, t_off_factor: 1.1,
    current_factor: 1.0, machinability_index: 0.85,
  },
  "1018_steel": {
    melting_point_C: 1510, thermal_conductivity_W_mK: 51.9,
    electrical_resistivity_uOhm_cm: 15.9, density_g_cm3: 7.87,
    specific_heat_J_gK: 0.486, t_on_factor: 0.9, t_off_factor: 0.9,
    current_factor: 0.95, machinability_index: 1.15,
  },
  m2_hss: {
    melting_point_C: 1430, thermal_conductivity_W_mK: 21,
    electrical_resistivity_uOhm_cm: 60, density_g_cm3: 8.16,
    specific_heat_J_gK: 0.46, t_on_factor: 1.05, t_off_factor: 1.15,
    current_factor: 1.0, machinability_index: 0.90,
  },
  m4_hss: {
    melting_point_C: 1430, thermal_conductivity_W_mK: 19,
    electrical_resistivity_uOhm_cm: 62, density_g_cm3: 8.02,
    specific_heat_J_gK: 0.46, t_on_factor: 1.1, t_off_factor: 1.2,
    current_factor: 1.05, machinability_index: 0.80,
  },
  m42_hss: {
    melting_point_C: 1430, thermal_conductivity_W_mK: 20,
    electrical_resistivity_uOhm_cm: 58, density_g_cm3: 8.15,
    specific_heat_J_gK: 0.452, t_on_factor: 1.1, t_off_factor: 1.2,
    current_factor: 1.05, machinability_index: 0.75,
  },
  silver_braze: {
    melting_point_C: 780, thermal_conductivity_W_mK: 250,
    electrical_resistivity_uOhm_cm: 3.8, density_g_cm3: 9.1,
    specific_heat_J_gK: 0.33, t_on_factor: 0.5, t_off_factor: 0.6,
    current_factor: 0.6, machinability_index: 2.5,
  },
  graphite: {
    melting_point_C: 3550, thermal_conductivity_W_mK: 130,
    electrical_resistivity_uOhm_cm: 1400, density_g_cm3: 1.8,
    specific_heat_J_gK: 0.71, t_on_factor: 0.8, t_off_factor: 0.7,
    current_factor: 0.6, machinability_index: 1.5,
  },
  pcd: {
    melting_point_C: 3550, thermal_conductivity_W_mK: 600,
    electrical_resistivity_uOhm_cm: 50, density_g_cm3: 3.5,
    specific_heat_J_gK: 0.51, t_on_factor: 1.5, t_off_factor: 1.6,
    current_factor: 1.3, machinability_index: 0.25,
  },
};

// ============================================================================
// WIRE PROPERTY DATABASE
// ============================================================================

interface WireProps {
  tensile_strength_N_mm2: number;
  conductivity_pct_IACS: number;
  max_speed_m_min: number;
  min_speed_m_min: number;
  density_g_cm3: number;
  cost_factor: number;
  break_threshold_factor: number; // relative to brass
}

const WIRE_DB: Record<string, WireProps> = {
  brass: {
    tensile_strength_N_mm2: 900, conductivity_pct_IACS: 26,
    max_speed_m_min: 15, min_speed_m_min: 3, density_g_cm3: 8.5,
    cost_factor: 1.0, break_threshold_factor: 1.0,
  },
  zinc_coated: {
    tensile_strength_N_mm2: 900, conductivity_pct_IACS: 26,
    max_speed_m_min: 18, min_speed_m_min: 3, density_g_cm3: 8.3,
    cost_factor: 1.3, break_threshold_factor: 1.15,
  },
  diffusion_annealed: {
    tensile_strength_N_mm2: 500, conductivity_pct_IACS: 22,
    max_speed_m_min: 14, min_speed_m_min: 2, density_g_cm3: 8.2,
    cost_factor: 1.5, break_threshold_factor: 0.85,
  },
  coated_brass: {
    tensile_strength_N_mm2: 1000, conductivity_pct_IACS: 28,
    max_speed_m_min: 20, min_speed_m_min: 3, density_g_cm3: 8.4,
    cost_factor: 1.8, break_threshold_factor: 1.25,
  },
  molybdenum: {
    tensile_strength_N_mm2: 1800, conductivity_pct_IACS: 34,
    max_speed_m_min: 4, min_speed_m_min: 0.5, density_g_cm3: 10.2,
    cost_factor: 5.0, break_threshold_factor: 2.5,
  },
  tungsten: {
    tensile_strength_N_mm2: 2000, conductivity_pct_IACS: 31,
    max_speed_m_min: 3, min_speed_m_min: 0.3, density_g_cm3: 19.3,
    cost_factor: 8.0, break_threshold_factor: 3.0,
  },
  steel_core: {
    tensile_strength_N_mm2: 1400, conductivity_pct_IACS: 20,
    max_speed_m_min: 12, min_speed_m_min: 2, density_g_cm3: 8.0,
    cost_factor: 2.0, break_threshold_factor: 1.6,
  },
};

// ============================================================================
// TECHNOLOGY TABLE DEFINITIONS
// ============================================================================

interface TechTableDef {
  controller: string;
  table_prefix: string;
  condition_format: (mat: string, wire_d: number, pass: PassType) => string;
  param_keys: string[];
}

const TECH_TABLES: Record<string, TechTableDef> = {
  makino: {
    controller: "Makino MGW/Hyper-i",
    table_prefix: "E-PACK",
    condition_format: (mat, wire_d, pass) => {
      const m = mat.substring(0, 3).toUpperCase();
      const w = Math.round(wire_d * 1000);
      const p = pass === "rough" ? "R" : pass === "semi_finish" ? "S" : "F";
      return `${m}-${w}-${p}`;
    },
    param_keys: ["ON", "OFF", "IP", "SV", "SF", "WS", "WT", "WF"],
  },
  sodick: {
    controller: "Sodick LN/ALC",
    table_prefix: "SF",
    condition_format: (mat, wire_d, pass) => {
      const m = mat === "steel" ? "STL" : mat.substring(0, 3).toUpperCase();
      const p = pass === "rough" ? "01" : pass === "semi_finish" ? "02" : pass === "finish" ? "03" : "04";
      return `SF-${m}-${Math.round(wire_d * 1000)}-${p}`;
    },
    param_keys: ["TON", "TOFF", "IAP", "VAP", "VSR", "WFD", "WTN", "IWP"],
  },
  mitsubishi: {
    controller: "Mitsubishi MV/FA",
    table_prefix: "STD",
    condition_format: (mat, wire_d, pass) => {
      const m = mat === "steel" ? "FE" : mat === "aluminum" ? "AL" : mat === "copper" ? "CU" : "XX";
      const passNum = pass === "rough" ? 1 : pass === "semi_finish" ? 2 : pass === "finish" ? 3 : 4;
      return `E${m}${Math.round(wire_d * 1000)}C${passNum}`;
    },
    param_keys: ["ON", "OFF", "IP", "SV", "V", "WF", "WT", "INJ"],
  },
  fanuc: {
    controller: "Fanuc Robocut",
    table_prefix: "COND",
    condition_format: (mat, wire_d, pass) => {
      const m = mat === "steel" ? "01" : mat === "aluminum" ? "05" : mat === "copper" ? "03" : "09";
      const p = pass === "rough" ? "A" : pass === "semi_finish" ? "B" : pass === "finish" ? "C" : "D";
      return `C${m}-${Math.round(wire_d * 100)}-${p}`;
    },
    param_keys: ["ON", "OFF", "IP", "SV", "FR", "WS", "WT", "FL"],
  },
  agie: {
    controller: "AgieCharmilles CUT",
    table_prefix: "TECH",
    condition_format: (mat, wire_d, pass) => {
      const passIdx = pass === "rough" ? 1 : pass === "semi_finish" ? 2 : pass === "finish" ? 3 : 4;
      return `TECH-${mat.toUpperCase().substring(0, 4)}-${Math.round(wire_d * 100)}-P${passIdx}`;
    },
    param_keys: ["Ton", "Toff", "I", "U", "S", "Vw", "Fw", "P"],
  },
};

// ============================================================================
// PUBLISHED CONDITION LOOKUP (replaces former synthetic PASS_BASELINES)
// Source: wedm-published-conditions.ts — 42 published data points with citations
// ============================================================================

/**
 * Resolve published pulse conditions for a given input.
 * Maps engine material names to published material groups and looks up
 * the published database. Returns exact or interpolated published data.
 *
 * NEVER returns synthetic baselines — throws if no published data exists.
 *
 * @throws Error if material cannot be mapped or no published data covers the input
 */
function resolvePublishedPulse(input: CuttingParamInput): PublishedPulseCondition {
  const materialGroup = resolveMaterialGroup(input.material);
  if (!materialGroup) {
    throw new Error(
      `Cannot map material "${input.material}" to a published EDM material group. ` +
      `Add mapping in wedm-published-conditions.ts MATERIAL_GROUP_MAP.`
    );
  }

  const wireType: PublishedWireType = input.wire_type === "molybdenum" ? "molybdenum"
    : input.wire_type === "tungsten" ? "tungsten"
    : input.wire_type?.includes("zinc") ? "zinc_coated"
    : "brass";

  return resolvePublishedCondition(
    materialGroup,
    input.thickness_mm,
    input.wire_diameter_mm,
    wireType,
    input.pass_type as PublishedPassType,
  );
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class EDMCuttingParamFlushEngine {
  private readonly VERSION = "1.0.0";

  // --------------------------------------------------------------------------
  // U01 — Pulse Parameter Optimizer
  // --------------------------------------------------------------------------

  /**
   * Optimize pulse parameters for a given pass, material, and wire.
   * Applies material correction factors, thickness compensation, and
   * optional target-Ra / target-MRR reverse-solving.
   */
  private optimizePulse(input: CuttingParamInput, mat: MaterialEDMProps): CuttingParamResult["pulse"] {
    // Look up published pulse conditions (material + thickness + wire + pass specific)
    const published = resolvePublishedPulse(input);

    // Start from published values — already material and thickness specific
    let t_on = published.t_on_us;
    let t_off = published.t_off_us;
    let I_p = published.peak_current_A;
    const open_V = published.open_voltage_V;
    let servo_V = published.servo_voltage_V;

    // --- Target Ra reverse-solve using Klocke canonical: Ra = k_ra × I_p^alpha × t_on^beta ---
    if (input.target_ra_um !== undefined && input.target_ra_um > 0) {
      const currentRa = this.estimateRa(t_on, I_p, mat);
      if (currentRa > input.target_ra_um) {
        const ratio = input.target_ra_um / currentRa;
        // Use Klocke exponents for reverse-solve
        const raModel = this.resolveRaModel(input.material);
        t_on *= Math.pow(ratio, 1 / raModel.beta);
        I_p *= Math.pow(ratio, 1 / raModel.alpha);
      }
    }

    // --- Target MRR forward-adjust (rough pass only) ---
    if (input.target_mrr_mm2_min !== undefined && input.target_mrr_mm2_min > 0) {
      const currentMRR = this.estimateMRR(t_on, t_off, I_p, open_V, input.thickness_mm, mat);
      if (currentMRR < input.target_mrr_mm2_min && input.pass_type === "rough") {
        const mrrRatio = input.target_mrr_mm2_min / currentMRR;
        I_p *= Math.min(1.5, Math.pow(mrrRatio, 0.5));
        t_off *= Math.max(0.6, Math.pow(1 / mrrRatio, 0.3));
      }
    }

    // --- Clamp to physical limits ---
    t_on = Math.max(0.05, Math.min(12, t_on));
    t_off = Math.max(1, Math.min(80, t_off));
    I_p = Math.max(0.5, Math.min(50, I_p));
    servo_V = Math.min(80, servo_V);

    return {
      on_us: parseFloat(t_on.toFixed(3)),
      off_us: parseFloat(t_off.toFixed(2)),
      peak_current_A: parseFloat(I_p.toFixed(2)),
      open_voltage_V: open_V,
      servo_voltage_V: parseFloat(servo_V.toFixed(1)),
    };
  }

  /** Resolve Klocke Ra model coefficients via shared klockeRa utility (U-W100-03b) */
  private resolveRaModel(material: string): KlockeRaModel {
    const group = resolveMaterialGroup(material);
    // Map resolveMaterialGroup() output to klockeRa utility keys
    const groupMap: Record<string, string> = {
      low_carbon_steel: "steel", hardened_steel: "steel",
      tool_steel: "tool_steel", stainless_steel: "stainless",
      aluminum: "aluminum", tungsten_carbide: "carbide",
      titanium: "titanium", inconel: "inconel", copper: "copper",
    };
    return getRaModel((group ? groupMap[group] : undefined) ?? material);
  }

  // --------------------------------------------------------------------------
  // U02 — Servo Control Optimizer
  // --------------------------------------------------------------------------

  /**
   * Adjusts servo voltage based on gap stability requirements.
   * Higher servo voltage = more stable gap but slower feed.
   * Lower servo voltage = faster but risk of short circuits.
   */
  private optimizeServo(
    pulse: CuttingParamResult["pulse"],
    input: CuttingParamInput,
    mat: MaterialEDMProps
  ): CuttingParamResult["pulse"] {
    const updated = { ...pulse };

    // Gap stability factor: high-resistivity materials need higher servo voltage
    const resistivityFactor = Math.min(1.3, Math.max(0.8, mat.electrical_resistivity_uOhm_cm / 20));
    updated.servo_voltage_V = parseFloat(
      Math.min(80, updated.servo_voltage_V * resistivityFactor).toFixed(1)
    );

    // Thick parts need higher open voltage to sustain ionization channel
    if (input.thickness_mm > 100) {
      updated.open_voltage_V = Math.min(150, updated.open_voltage_V + (input.thickness_mm - 100) * 0.15);
    }

    // Short-circuit recovery: for finishing passes use higher servo for stability
    if (input.pass_type === "finish" || input.pass_type === "super_finish") {
      updated.servo_voltage_V = parseFloat(
        Math.max(updated.servo_voltage_V, 42).toFixed(1)
      );
    }

    return updated;
  }

  // --------------------------------------------------------------------------
  // U03 — Wire Speed Optimizer
  // --------------------------------------------------------------------------

  /**
   * Optimize wire speed, tension, and compute consumption.
   * Speed affects heat distribution along wire; too slow → heat buildup → break.
   */
  private optimizeWireSpeed(
    input: CuttingParamInput,
    wire: WireProps,
    pulse: CuttingParamResult["pulse"]
  ): CuttingParamResult["wire"] {
    // Wire speed from published conditions (already pass-type specific)
    const published = resolvePublishedPulse(input);
    let speed = published.wire_speed_m_min > 0
      ? published.wire_speed_m_min
      : wire.max_speed_m_min * 0.5; // fallback if published wire speed is 0

    // Thickness compensation: thicker = more heat → faster wire
    if (input.thickness_mm > 50) {
      speed *= Math.min(1.3, 1 + (input.thickness_mm - 50) / 200);
    }

    // High current compensation
    if (pulse.peak_current_A > 15) {
      speed *= Math.min(1.2, 1 + (pulse.peak_current_A - 15) / 50);
    }

    speed = Math.max(wire.min_speed_m_min, Math.min(wire.max_speed_m_min, speed));

    // Wire tension: from published conditions or fraction of breaking load
    const wireArea_mm2 = Math.PI * Math.pow(input.wire_diameter_mm / 2, 2);
    const breakingForce_N = wire.tensile_strength_N_mm2 * wireArea_mm2;
    let tension_N = published.wire_tension_N > 0
      ? published.wire_tension_N
      : breakingForce_N * 0.5; // fallback: 50% of breaking load
    // Reduce tension for thin wire to prevent breaks
    if (input.wire_diameter_mm < 0.15) {
      tension_N *= 0.75;
    }
    tension_N = parseFloat(Math.min(25, Math.max(2, tension_N)).toFixed(1));

    // Wire consumption (m/min) — the wire is not reused on single-pass machines
    // Consumption equals speed for disposable wire; for moly (reusable), much lower
    let consumption = speed;
    if (input.wire_type === "molybdenum" || input.wire_type === "tungsten") {
      // Reusable wire: consumption = spool travel, but wire is rewound
      consumption = speed * 0.002; // negligible material loss
    }

    return {
      speed_m_min: parseFloat(speed.toFixed(2)),
      tension_N,
      consumption_m_per_min: parseFloat(consumption.toFixed(3)),
    };
  }

  // --------------------------------------------------------------------------
  // U04 — Discharge Energy Calculator
  // --------------------------------------------------------------------------

  /**
   * Calculate single-discharge energy and predict outcomes.
   *
   * Core physics:
   *   E = V × I_p × t_on   (single spark energy, simplified)
   *   Crater diameter d_c ∝ E^(1/3)
   *   Crater depth h_c ∝ E^(1/3) × (1/k)^0.5  (k = thermal conductivity)
   *   MRR ∝ f × V_crater × (1 − short_circuit_ratio)
   *   Ra = k_ra × I_p^alpha × t_on^beta [Klocke 2013 canonical]
   *   Recast ≈ 0.25 × h_c (heat-affected zone depth fraction)
   */
  calculateEnergy(
    pulse: CuttingParamResult["pulse"],
    input: CuttingParamInput,
    mat: MaterialEDMProps
  ): EnergyCalculation {
    // Use servo (gap) voltage for energy calculation, not open-circuit voltage.
    // Open voltage (80–120V) is the no-load voltage before gap ionization.
    // Servo voltage (40–50V) is the actual voltage across the gap during discharge.
    // E = V_gap × I × t_on  [Kunieda et al., CIRP Annals 2005]
    const V = pulse.servo_voltage_V;
    const I = pulse.peak_current_A;
    const t_on_s = pulse.on_us * 1e-6;
    const t_off_s = pulse.off_us * 1e-6;

    // Single discharge energy (millijoules)
    const E_mj = V * I * t_on_s * 1000;

    // Duty cycle
    const dutyCycle = t_on_s / (t_on_s + t_off_s);

    // Discharge frequency (kHz)
    const period_s = t_on_s + t_off_s;
    const freq_khz = 1 / (period_s * 1000);

    // Average power (W)
    const avgPower_W = V * I * dutyCycle;

    // Crater geometry (DiBitonto model, simplified)
    // d_c = K1 × E^(1/3), E in mJ → d_c in μm
    const K1 = 4.8; // empirical constant for metallic workpiece
    const craterDiam_um = K1 * Math.pow(E_mj, 1 / 3);

    // Crater depth: h_c = K2 × E^(1/3) / sqrt(k), k in W/mK
    const K2 = 1.8;
    const craterDepth_um = K2 * Math.pow(E_mj, 1 / 3) / Math.sqrt(mat.thermal_conductivity_W_mK / 50);

    // Volume per crater (μm³ → mm³)
    // Approximate crater as spherical cap: V ≈ π/6 × d² × h
    const craterVol_um3 = (Math.PI / 6) * Math.pow(craterDiam_um, 2) * craterDepth_um;
    const craterVol_mm3 = craterVol_um3 * 1e-9;

    // Material removal rate: MRR = f × V_crater × η_removal × η_flush
    const eta_removal = 0.45; // fraction of crater volume actually removed
    const freq_hz = freq_khz * 1000;
    // Flushing efficiency degrades with thickness: debris evacuation path length increases
    // At extreme thickness (>100mm), effective MRR drops due to contaminated dielectric
    // Source: Ho & Newman (2003) — "MRR drops 30-50% at heights >200mm vs 50mm baseline"
    const eta_flush = input.thickness_mm <= 50 ? 1.0
      : 1.0 / Math.sqrt(input.thickness_mm / 50); // sqrt degradation above 50mm
    const MRR_mm3_min = craterVol_mm3 * freq_hz * eta_removal * eta_flush * 60;
    // Convert to mm²/min by dividing by kerf width (wire_d + 2×gap)
    const gapWidth_mm = 0.015 + 0.005 * Math.sqrt(E_mj); // spark gap
    const kerfWidth_mm = input.wire_diameter_mm + 2 * gapWidth_mm;
    const MRR_mm2_min = MRR_mm3_min / kerfWidth_mm;

    // Surface roughness: Klocke canonical Ra = k_ra × I_p^alpha × t_on^beta [Klocke 2013]
    // I_p and t_on are available from pulse input
    const I_p_for_ra = pulse.peak_current_A;
    const t_on_for_ra = pulse.on_us;
    const Ra_um = this.estimateRa(t_on_for_ra, I_p_for_ra, mat);

    // Recast layer thickness: ~25% of crater depth
    const recast_um = craterDepth_um * 0.25;

    // Stochastic energy distribution (normal with ~15% CV)
    const cv = 0.15;
    const stdDev = E_mj * cv;

    return {
      per_discharge_mj: parseFloat(E_mj.toFixed(4)),
      duty_cycle: parseFloat(dutyCycle.toFixed(4)),
      frequency_khz: parseFloat(freq_khz.toFixed(2)),
      avg_power_W: parseFloat(avgPower_W.toFixed(2)),
      crater_diameter_um: parseFloat(craterDiam_um.toFixed(2)),
      crater_depth_um: parseFloat(craterDepth_um.toFixed(2)),
      mrr_mm2_min: parseFloat(MRR_mm2_min.toFixed(3)),
      ra_um: parseFloat(Ra_um.toFixed(3)),
      recast_layer_um: parseFloat(recast_um.toFixed(2)),
      stochastic_energy_distribution: {
        mean_mj: parseFloat(E_mj.toFixed(4)),
        std_dev_mj: parseFloat(stdDev.toFixed(4)),
        cv_percent: parseFloat((cv * 100).toFixed(1)),
      },
    };
  }

  // --------------------------------------------------------------------------
  // U05 — Technology Table Mapper
  // --------------------------------------------------------------------------

  /**
   * Map optimized PRISM parameters to machine-native technology tables.
   */
  mapTechnologyTable(
    pulse: CuttingParamResult["pulse"],
    wire: CuttingParamResult["wire"],
    input: CuttingParamInput
  ): TechnologyTableMapping | undefined {
    const ctrlKey = (input.machine_controller || "").toLowerCase().replace(/[\s-]/g, "");
    let tableDef: TechTableDef | undefined;
    let matchedKey = "";

    for (const [key, def] of Object.entries(TECH_TABLES)) {
      if (ctrlKey.includes(key)) {
        tableDef = def;
        matchedKey = key;
        break;
      }
    }

    if (!tableDef) return undefined;

    const conditionCode = tableDef.condition_format(input.material, input.wire_diameter_mm, input.pass_type);
    const tableId = `${tableDef.table_prefix}-${conditionCode}`;
    const flushInput: FlushingInput = {
      material: input.material,
      thickness_mm: input.thickness_mm,
      pass_type: input.pass_type,
      profile_type: "open",
      wire_diameter_mm: input.wire_diameter_mm,
      machine_controller: input.machine_controller,
    };
    const flushingMode = this.selectFlushingMode(flushInput);
    const flushingPressure = this.calculateFlushingPressure(flushInput, flushingMode);
    const flushSetting = this.deriveTechnologyFlushSetting(
      matchedKey,
      flushingMode,
      flushingPressure,
    );

    // Build parameter set mapped to controller's parameter naming convention
    const paramSet: Record<string, number | string> = {};
    const values = [
      pulse.on_us, pulse.off_us, pulse.peak_current_A, pulse.servo_voltage_V,
      pulse.open_voltage_V, wire.speed_m_min, wire.tension_N, flushSetting,
    ];
    tableDef.param_keys.forEach((key, i) => {
      paramSet[key] = i < values.length ? values[i] : 0;
    });

    const notes: string[] = [];
    notes.push(
      `Flush parameter derived from ${flushingMode} flushing plan at ${(
        (flushingPressure.upper_bar + flushingPressure.lower_bar) / 2
      ).toFixed(2)} bar average nozzle pressure`,
    );
    if (input.pass_type === "super_finish") {
      notes.push("Super-finish may require manual fine-tuning beyond standard table");
    }
    if (input.thickness_mm > 150) {
      notes.push("Thick workpiece: verify machine power supply capacity");
    }

    return {
      machine: tableDef.controller,
      table_id: tableId,
      condition_code: conditionCode,
      parameter_set: paramSet,
      notes,
    };
  }

  private deriveTechnologyFlushSetting(
    controllerKey: string,
    mode: FlushingMode,
    pressure: { upper_bar: number; lower_bar: number }
  ): number {
    const avgPressure = parseFloat(((pressure.upper_bar + pressure.lower_bar) / 2).toFixed(2));
    const modeCode: Record<FlushingMode, number> = {
      submerged: 1,
      spray_jet: 2,
      combined: 3,
    };

    switch (controllerKey) {
      case "sodick":
      case "mitsubishi":
        return modeCode[mode];
      default:
        return avgPressure;
    }
  }

  // --------------------------------------------------------------------------
  // U06 — Wire Break Predictor
  // --------------------------------------------------------------------------

  /**
   * Predict wire break probability using exponential risk model.
   *
   * P(break) = 1 - exp(-λ × H × DC / FF)
   *
   * Where:
   *   λ  = base break rate (material & wire dependent)
   *   H  = workpiece height (thickness) in mm
   *   DC = duty cycle
   *   FF = flushing factor (1.0 = ideal, <1 = poor flushing)
   */
  predictWireBreak(
    input: CuttingParamInput,
    pulse: CuttingParamResult["pulse"],
    wire: CuttingParamResult["wire"],
    mat: MaterialEDMProps,
    wireProps: WireProps,
    flushingFactor: number = 1.0
  ): WireBreakPrediction {
    const t_on_s = pulse.on_us * 1e-6;
    const t_off_s = pulse.off_us * 1e-6;
    const dutyCycle = t_on_s / (t_on_s + t_off_s);
    const H = input.thickness_mm;

    // Base failure rate λ₀ per mm of cut height per unit duty cycle
    // Inversely proportional to wire break threshold and wire diameter
    const lambda0 = 0.0003 / (wireProps.break_threshold_factor * (input.wire_diameter_mm / 0.25));

    // Current overload factor: risk increases above 70% of wire's thermal capacity
    const wireArea = Math.PI * Math.pow(input.wire_diameter_mm / 2, 2);
    const currentDensity = pulse.peak_current_A / wireArea; // A/mm²
    const currentFactor = currentDensity > 300 ? Math.pow(currentDensity / 300, 1.5) : 1.0;

    // Thermal conductivity of workpiece: lower k = more heat stays in gap
    const thermalFactor = Math.sqrt(50 / mat.thermal_conductivity_W_mK);

    // Wire speed compensation: faster wire = cooler wire
    const speedFactor = 1 / Math.max(0.5, wire.speed_m_min / (wireProps.max_speed_m_min * 0.7));

    // Effective λ
    const lambdaEff = lambda0 * currentFactor * thermalFactor * speedFactor;

    // Flushing factor: poor flushing traps debris → secondary discharges → breaks
    const FF = Math.max(0.3, Math.min(1.5, flushingFactor));

    // P(break) = 1 - exp(-λ_eff × H × DC / FF)
    const exponent = lambdaEff * H * dutyCycle / FF;
    const probability = 1 - Math.exp(-exponent);

    // Risk level classification
    let risk_level: WireBreakPrediction["risk_level"];
    if (probability < 0.05) risk_level = "low";
    else if (probability < 0.10) risk_level = "moderate";
    else if (probability < 0.25) risk_level = "high";
    else risk_level = "critical";

    // Contributing factors
    const factors: { factor: string; weight: number }[] = [
      { factor: "workpiece_thickness", weight: parseFloat((H / (H + 50)).toFixed(3)) },
      { factor: "duty_cycle", weight: parseFloat(dutyCycle.toFixed(3)) },
      { factor: "current_density", weight: parseFloat(Math.min(1, currentDensity / 500).toFixed(3)) },
      { factor: "thermal_difficulty", weight: parseFloat(Math.min(1, thermalFactor / 2).toFixed(3)) },
      { factor: "flushing_quality", weight: parseFloat((1 / FF).toFixed(3)) },
      { factor: "wire_speed_cooling", weight: parseFloat(Math.min(1, speedFactor).toFixed(3)) },
    ];
    factors.sort((a, b) => b.weight - a.weight);

    // Mitigation suggestions
    const mitigation: string[] = [];
    let adjustedPulse: Partial<CuttingParamResult["pulse"]> | undefined;

    const maxRisk = input.max_wire_break_risk ?? 0.1;
    if (probability > maxRisk) {
      mitigation.push("Reduce duty cycle by increasing t_off");
      mitigation.push("Increase wire speed for better cooling");
      if (currentDensity > 300) mitigation.push("Reduce peak current to lower current density");
      if (FF < 0.8) mitigation.push("Improve flushing: increase pressure or switch to submerged mode");
      if (H > 80) mitigation.push("Consider multi-pass roughing strategy for thick workpiece");

      // Auto-adjust parameters to bring risk below threshold
      // Solve: 1 - exp(-λ_eff × H × DC_new / FF) = maxRisk
      // DC_new = -ln(1 - maxRisk) × FF / (λ_eff × H)
      const targetDC = Math.min(dutyCycle, -Math.log(1 - maxRisk) * FF / (lambdaEff * H));
      if (targetDC < dutyCycle) {
        const newToff = t_on_s * (1 / targetDC - 1) / 1e-6;
        const newCurrent = pulse.peak_current_A * Math.min(1, Math.sqrt(targetDC / dutyCycle));
        adjustedPulse = {
          off_us: parseFloat(Math.min(80, newToff).toFixed(2)),
          peak_current_A: parseFloat(newCurrent.toFixed(2)),
        };
      }
    }

    return {
      probability: parseFloat(probability.toFixed(5)),
      risk_level,
      contributing_factors: factors,
      mitigation,
      adjusted_params: adjustedPulse,
    };
  }

  // --------------------------------------------------------------------------
  // U07 — Capacitance Circuit Optimizer (RC finishing)
  // --------------------------------------------------------------------------

  /**
   * Optimize RC circuit parameters for micro-finishing (Ra < 0.4 μm).
   *
   * E_cap = 0.5 × C × V²
   *
   * The capacitor stores energy and discharges rapidly, producing very short,
   * controlled pulses ideal for mirror finish.
   */
  private optimizeCapacitance(
    input: CuttingParamInput,
    mat: MaterialEDMProps
  ): { capacitance_pf: number; voltage_V: number; energy_mj: number } | undefined {
    // Only applicable for finish / super_finish aiming at very low Ra
    if (input.pass_type !== "finish" && input.pass_type !== "super_finish") return undefined;
    const targetRa = input.target_ra_um ?? (input.pass_type === "super_finish" ? 0.2 : 0.5);
    if (targetRa > 0.5) return undefined;

    // Klocke canonical: Ra = k_ra × I_p^alpha × t_on^beta
    // For RC circuits: E = 0.5 × C × V², and E ≈ V × I_eq × t_on
    // Estimate target energy from Ra using Klocke in reverse:
    // Assume typical finish I_p ≈ 2A, t_on ≈ 0.2µs, solve for required energy
    const raModel = this.resolveRaModel(input.material);
    // Reverse-solve: Ra = k_ra × I_p^alpha × t_on^beta
    // At very low Ra, use I_p=2A baseline, solve for t_on: t_on = (Ra/(k_ra × I_p^alpha))^(1/beta)
    const I_baseline = 2; // finish pass current [A]
    const t_on_target = Math.pow(targetRa / (raModel.k_ra * Math.pow(I_baseline, raModel.alpha)), 1 / raModel.beta);
    const V_gap = 45; // typical servo gap voltage [V]
    const E_target_mj = V_gap * I_baseline * Math.max(0.01e-6, t_on_target * 1e-6) * 1000;

    // Choose capacitance and voltage
    // E = 0.5 × C × V², solve for C given standard voltages
    const V_options = [60, 80, 100, 120, 150];
    let bestC_pf = 0;
    let bestV = 0;
    let bestE = 0;

    for (const V of V_options) {
      // C in farads = 2 × E / V², E_target in mJ = E × 1e-3 J
      const C_F = (2 * E_target_mj * 1e-3) / (V * V);
      const C_pf = C_F * 1e12;

      // Standard capacitors: pick nearest standard value (1, 2.2, 4.7, 10, 22, 47, 100, 220, 470, 1000 pF)
      const standards = [1, 2.2, 4.7, 10, 22, 47, 100, 220, 470, 1000, 2200, 4700, 10000];
      const nearest = standards.reduce((prev, curr) =>
        Math.abs(curr - C_pf) < Math.abs(prev - C_pf) ? curr : prev
      );

      const actualE = 0.5 * nearest * 1e-12 * V * V * 1000; // mJ
      if (bestC_pf === 0 || Math.abs(actualE - E_target_mj) < Math.abs(bestE - E_target_mj)) {
        bestC_pf = nearest;
        bestV = V;
        bestE = actualE;
      }
    }

    return {
      capacitance_pf: bestC_pf,
      voltage_V: bestV,
      energy_mj: parseFloat(bestE.toFixed(6)),
    };
  }

  // --------------------------------------------------------------------------
  // MS10 U01 — Flushing Mode Selector
  // --------------------------------------------------------------------------

  /**
   * Select optimal flushing mode based on workpiece geometry and pass type.
   *
   * Submerged: best surface finish, fewest wire breaks, required for finish passes.
   * Spray/Jet: better debris evacuation for tall/thick parts in roughing.
   * Combined: submerged + jet nozzles for difficult geometries.
   */
  private selectFlushingMode(input: FlushingInput): FlushingMode {
    const { thickness_mm, pass_type, profile_type } = input;

    // Finish/super-finish always submerged for stability
    if (pass_type === "finish" || pass_type === "super_finish") return "submerged";

    // Thick parts in roughing: spray jet for debris clearing
    if (pass_type === "rough" && thickness_mm > 80) {
      // Closed profiles trap debris: use combined
      if (profile_type === "closed") return "combined";
      return "spray_jet";
    }

    // Semi-finish with thick parts: combined
    if (pass_type === "semi_finish" && thickness_mm > 60) return "combined";

    // Closed profiles always benefit from submerged + jet assist
    if (profile_type === "closed" && thickness_mm > 30) return "combined";

    // Default: submerged
    return "submerged";
  }

  // --------------------------------------------------------------------------
  // MS10 U02 — Nozzle Position Optimizer
  // --------------------------------------------------------------------------

  /**
   * Optimize nozzle distance, angle, and check for collision risks.
   * Ideal distance: 0.5–2 mm from workpiece surface.
   */
  private optimizeNozzlePosition(
    input: FlushingInput,
    mode: FlushingMode
  ): { upper: FlushingPlan["upper_nozzle"]; lower: FlushingPlan["lower_nozzle"] } {
    // Base nozzle distance
    let upperDist = 1.0; // mm
    let lowerDist = 1.0;

    // Closed profiles need more clearance
    if (input.profile_type === "closed") {
      upperDist = 1.5;
      lowerDist = 1.5;
    }

    // Very thin parts: nozzles can be closer
    if (input.thickness_mm < 10) {
      upperDist = 0.5;
      lowerDist = 0.5;
    }

    // Thick parts: lower nozzle may need more distance for table clearance
    if (input.thickness_mm > 100) {
      lowerDist = Math.min(2.0, 1.0 + (input.thickness_mm - 100) / 200);
    }

    // Angles: 90° (perpendicular) is ideal for submerged, slight angle for jet
    let upperAngle = 90;
    let lowerAngle = 90;
    if (mode === "spray_jet") {
      upperAngle = 75; // slight downward angle
      lowerAngle = 75; // slight upward angle
    }

    // Pressure calculation delegated to U03
    return {
      upper: { pressure_bar: 0, distance_mm: upperDist, angle_deg: upperAngle },
      lower: { pressure_bar: 0, distance_mm: lowerDist, angle_deg: lowerAngle },
    };
  }

  // --------------------------------------------------------------------------
  // MS10 U03 — Flushing Pressure Calculator
  // --------------------------------------------------------------------------

  /**
   * Calculate optimal flushing pressure based on pass type, thickness, and mode.
   *
   * Rough jet: 8–15 bar, Rough submerged: 3–5 bar
   * Finish jet: 2–4 bar, Finish submerged: 1–2 bar
   * Taller parts need more pressure to evacuate debris through longer kerf.
   */
  private calculateFlushingPressure(
    input: FlushingInput,
    mode: FlushingMode
  ): { upper_bar: number; lower_bar: number } {
    // Base pressures by pass type
    const pressureMap: Record<PassType, { jet: number; submerged: number }> = {
      rough: { jet: 12, submerged: 4 },
      semi_finish: { jet: 8, submerged: 3 },
      finish: { jet: 3.5, submerged: 1.5 },
      super_finish: { jet: 2, submerged: 1 },
    };

    const base = pressureMap[input.pass_type];
    let pressure = mode === "submerged" ? base.submerged : base.jet;

    // Height compensation: taller parts need more pressure
    // Darcy-Weisbach: pressure drop ∝ length / hydraulic_diameter
    if (input.thickness_mm > 30) {
      pressure *= Math.min(1.8, 1 + (input.thickness_mm - 30) / 150);
    }

    // Closed profile: pressure must overcome stagnation zones
    if (input.profile_type === "closed") {
      pressure *= 1.15;
    }

    // Upper and lower nozzle pressure: lower slightly higher to lift debris
    const upperPressure = parseFloat(pressure.toFixed(2));
    const lowerPressure = parseFloat((pressure * 1.1).toFixed(2));

    return { upper_bar: upperPressure, lower_bar: lowerPressure };
  }

  // --------------------------------------------------------------------------
  // MS10 U04 — Dielectric Condition Monitor
  // --------------------------------------------------------------------------

  /**
   * Determine ideal dielectric parameters and maintenance schedule.
   *
   * Conductivity target: 2–10 μS/cm (pure deionized water for WEDM)
   * Temperature: 20 ± 2 °C (thermal stability critical for accuracy)
   */
  private monitorDielectric(
    input: FlushingInput,
    mat: MaterialEDMProps,
    mode: FlushingMode
  ): { dielectric: FlushingPlan["dielectric"]; maintenance: FlushingPlan["maintenance"] } {
    // Conductivity target depends on pass type
    const conductivityMap: Record<PassType, number> = {
      rough: 8,        // μS/cm — slightly higher OK
      semi_finish: 5,
      finish: 3,
      super_finish: 2, // very pure for mirror finish
    };
    const condTarget = conductivityMap[input.pass_type];

    // Temperature: tighter tolerance for finishing
    const tempTarget = 20; // °C
    // For finish: ±1°C; for rough: ±3°C acceptable

    // Fluid level for submerged mode: workpiece top + 30–50 mm
    let level_mm = input.thickness_mm + 40;
    if (mode !== "submerged") {
      level_mm = 0; // spray mode doesn't require submersion level
    }

    // Maintenance intervals based on material being cut
    // High-erosion materials contaminate fluid faster
    const contaminationRate = mat.density_g_cm3 / mat.machinability_index;

    // Filter change: base 200 hours, reduced by contamination
    const filterHours = parseFloat(Math.max(50, 200 / Math.sqrt(contaminationRate / 7)).toFixed(0));

    // DI resin life: depends on conductivity target (tighter = faster consumption)
    const resinHours = parseFloat(Math.max(100, 500 * (condTarget / 10)).toFixed(0));

    // Fluid change volume: tank size estimate based on machine class
    const fluidChangeLiters = 200; // typical WEDM tank

    return {
      dielectric: {
        type: "deionized_water",
        conductivity_target_uS_cm: condTarget,
        temp_target_C: tempTarget,
        level_mm: parseFloat(level_mm.toFixed(0)),
      },
      maintenance: {
        filter_change_hours: filterHours,
        resin_life_hours: resinHours,
        fluid_change_liters: fluidChangeLiters,
      },
    };
  }

  // --------------------------------------------------------------------------
  // MS10 U05 — Debris Evacuation Modeler
  // --------------------------------------------------------------------------

  /**
   * Model debris particle size and settling behavior.
   *
   * Particle size from discharge energy (crater fragments).
   * Settling velocity: Stokes' law for small particles in laminar flow:
   *   v_s = (ρ_p − ρ_f) × g × d² / (18 × μ)
   *
   * Required gap flushing velocity must exceed settling velocity to evacuate.
   */
  private modelDebrisEvacuation(
    energy: EnergyCalculation,
    mat: MaterialEDMProps
  ): FlushingPlan["debris"] {
    // Particle diameter: proportional to crater diameter, most debris ~30-70% of crater size
    const particleDiam_um = energy.crater_diameter_um * 0.5;

    // Stokes settling velocity
    // v_s = (ρ_p - ρ_f) × g × d² / (18 × μ)
    // ρ_f (water) ≈ 998 kg/m³, μ (water at 20°C) ≈ 1.002e-3 Pa·s, g = 9.81 m/s²
    const rho_p = mat.density_g_cm3 * 1000; // kg/m³
    const rho_f = 998; // kg/m³
    const g = 9.81; // m/s²
    const mu = 1.002e-3; // Pa·s (dynamic viscosity of water at 20°C)
    const d_m = particleDiam_um * 1e-6; // particle diameter in meters

    const v_s_m_s = ((rho_p - rho_f) * g * d_m * d_m) / (18 * mu);
    const v_s_mm_s = v_s_m_s * 1000; // convert to mm/s

    // Required flushing velocity: must exceed settling velocity by safety factor
    // Also must overcome gap friction and turbulence in narrow kerf
    const safetyFactor = 3.0; // need 3× settling velocity for reliable evacuation
    const gapFrictionFactor = 1.5; // additional for narrow kerf resistance
    const flushVelocity_mm_s = v_s_mm_s * safetyFactor * gapFrictionFactor;

    return {
      particle_size_um: parseFloat(particleDiam_um.toFixed(2)),
      settling_velocity_mm_s: parseFloat(v_s_mm_s.toFixed(4)),
      flush_velocity_needed_mm_s: parseFloat(flushVelocity_mm_s.toFixed(3)),
    };
  }

  // --------------------------------------------------------------------------
  // HELPER: Estimate Ra from pulse parameters
  // --------------------------------------------------------------------------

  private estimateRa(t_on_us: number, I_p_A: number, mat: MaterialEDMProps): number {
    // Resolve material to klockeRa key via thermal/electrical properties (U-W100-03b)
    // Property-based detection for when only MaterialEDMProps is available
    let matKey = "steel";
    if (mat.melting_point_C > 2500) matKey = "carbide";
    else if (mat.thermal_conductivity_W_mK > 300) matKey = "copper";
    else if (mat.thermal_conductivity_W_mK > 150) matKey = "aluminum";
    else if (mat.electrical_resistivity_uOhm_cm > 90) matKey = "inconel";
    else if (mat.electrical_resistivity_uOhm_cm > 60) matKey = "stainless";
    else if (mat.melting_point_C > 1600) matKey = "titanium";
    else if (mat.machinability_index < 0.95 && mat.melting_point_C > 1400) matKey = "tool_steel";

    return klockeRa(I_p_A, t_on_us, matKey);
  }

  // --------------------------------------------------------------------------
  // HELPER: Estimate MRR
  // --------------------------------------------------------------------------

  private estimateMRR(
    t_on_us: number, t_off_us: number, I_p_A: number, V: number,
    thickness_mm: number, mat: MaterialEDMProps
  ): number {
    const dutyCycle = t_on_us / (t_on_us + t_off_us);
    const avgPower = V * I_p_A * dutyCycle;
    // Simplified MRR model: MRR ∝ Power × machinability / thickness_factor
    const thickFactor = Math.sqrt(thickness_mm / 30);
    return (avgPower * mat.machinability_index * 0.015) / thickFactor;
  }

  // --------------------------------------------------------------------------
  // HELPER: Resolve material from string
  // --------------------------------------------------------------------------

  private resolveMaterial(name: string): MaterialEDMProps {
    const key = name.toLowerCase().replace(/[\s\-\/]/g, "_");
    // Direct match
    if (MATERIAL_DB[key]) return MATERIAL_DB[key];
    // Partial match
    for (const [k, v] of Object.entries(MATERIAL_DB)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    // Per-grade aliases
    const aliases: Record<string, string> = {
      h13: "h13_tool_steel", a2: "a2_tool_steel", d2: "d2_tool_steel",
      s7: "s7_tool_steel", o2: "o2_tool_steel",
      "4140": "4140_steel", "4140_ph": "4140_steel",
      "52100": "52100_bearing", "1018": "1018_steel", "1020": "1018_steel",
      m2: "m2_hss", m4: "m4_hss", m42: "m42_hss",
      braze: "silver_braze", silver_braze: "silver_braze", bag: "silver_braze",
    };
    for (const [alias, target] of Object.entries(aliases)) {
      if (key.includes(alias) && MATERIAL_DB[target]) return MATERIAL_DB[target];
    }
    // Common group aliases
    if (key.includes("tool") && key.includes("steel")) return MATERIAL_DB.d2_tool_steel;
    if (key.includes("invar") || key.includes("kovar")) return MATERIAL_DB.inconel;
    if (key.includes("carbide") || key.includes("wc")) return MATERIAL_DB.tungsten_carbide;
    if (key.includes("ss") || key.includes("304") || key.includes("316")) return MATERIAL_DB.stainless_steel;
    if (key.includes("ti") && (key.includes("6") || key.includes("64"))) return MATERIAL_DB.titanium;
    if (key.includes("diamond") || key.includes("cbn")) return MATERIAL_DB.pcd;

    log.warn(`EDMCuttingParamFlushEngine: Unknown material "${name}", defaulting to steel`);
    return MATERIAL_DB.steel;
  }

  // --------------------------------------------------------------------------
  // HELPER: Resolve wire type
  // --------------------------------------------------------------------------

  private resolveWire(name: string): WireProps {
    const key = name.toLowerCase().replace(/[\s\-\/]/g, "_");
    if (WIRE_DB[key]) return WIRE_DB[key];
    for (const [k, v] of Object.entries(WIRE_DB)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    if (key.includes("moly")) return WIRE_DB.molybdenum;
    if (key.includes("coated")) return WIRE_DB.zinc_coated;
    if (key.includes("diffusion")) return WIRE_DB.diffusion_annealed;

    log.warn(`EDMCuttingParamFlushEngine: Unknown wire type "${name}", defaulting to brass`);
    return WIRE_DB.brass;
  }

  // ==========================================================================
  // PUBLIC ACTION: optimize_params
  // ==========================================================================

  /**
   * Optimize all cutting parameters for a WEDM pass.
   * Combines pulse, servo, wire speed, energy, wire break prediction,
   * and optional capacitance circuit and technology table mapping.
   */
  optimizeParams(input: CuttingParamInput): CuttingParamResult {
    log.info(`EDMCuttingParamFlushEngine.optimizeParams: ${input.material} ${input.thickness_mm}mm ${input.pass_type} pass ${input.pass_number}`);

    const mat = this.resolveMaterial(input.material);
    const wireProps = this.resolveWire(input.wire_type);
    const warnings: string[] = [];

    // U01: Pulse parameters
    let pulse = this.optimizePulse(input, mat);

    // U02: Servo control
    pulse = this.optimizeServo(pulse, input, mat);

    // U03: Wire speed
    const wire = this.optimizeWireSpeed(input, wireProps, pulse);

    // U04: Energy calculation
    const energy = this.calculateEnergy(pulse, input, mat);

    // U06: Wire break prediction
    const breakPred = this.predictWireBreak(input, pulse, wire, mat, wireProps);

    // Auto-apply wire break mitigation if risk exceeds threshold
    const maxRisk = input.max_wire_break_risk ?? 0.1;
    if (breakPred.probability > maxRisk && breakPred.adjusted_params) {
      if (breakPred.adjusted_params.off_us !== undefined) {
        pulse.off_us = breakPred.adjusted_params.off_us;
      }
      if (breakPred.adjusted_params.peak_current_A !== undefined) {
        pulse.peak_current_A = breakPred.adjusted_params.peak_current_A;
      }
      warnings.push(`Wire break risk ${(breakPred.probability * 100).toFixed(1)}% exceeded threshold ${(maxRisk * 100).toFixed(0)}% — parameters auto-adjusted`);
    }

    // U07: Capacitance circuit (if applicable)
    const capResult = this.optimizeCapacitance(input, mat);

    // U05: Technology table
    let techTable: CuttingParamResult["technology_table"];
    if (input.machine_controller) {
      const mapping = this.mapTechnologyTable(pulse, wire, input);
      if (mapping) {
        techTable = {
          machine: mapping.machine,
          table_id: mapping.table_id,
          condition_code: mapping.condition_code,
        };
      }
    }

    // Validation warnings
    if (energy.ra_um > 3.0 && (input.pass_type === "finish" || input.pass_type === "super_finish")) {
      warnings.push(`Predicted Ra ${energy.ra_um.toFixed(2)} μm is high for ${input.pass_type} pass`);
    }
    if (input.wire_diameter_mm < 0.1 && pulse.peak_current_A > 8) {
      warnings.push("Thin wire with high current: consider reducing peak current");
    }
    if (input.thickness_mm > 200) {
      warnings.push("Very thick workpiece: verify machine travel and power capacity");
    }
    if (capResult && input.pass_type === "super_finish") {
      warnings.push(`RC finishing circuit recommended: C=${capResult.capacitance_pf}pF, V=${capResult.voltage_V}V`);
    }

    return {
      pulse,
      wire,
      energy: {
        per_discharge_mj: energy.per_discharge_mj,
        duty_cycle: energy.duty_cycle,
        frequency_khz: energy.frequency_khz,
      },
      predicted: {
        mrr_mm2_min: energy.mrr_mm2_min,
        ra_um: energy.ra_um,
        recast_um: energy.recast_layer_um,
        crater_diameter_um: energy.crater_diameter_um,
      },
      wire_break_risk: breakPred.probability,
      technology_table: techTable,
      capacitance_pf: capResult?.capacitance_pf,
      warnings,
    };
  }

  // ==========================================================================
  // PUBLIC ACTION: plan_flushing
  // ==========================================================================

  /**
   * Generate a complete flushing plan for a WEDM operation.
   */
  planFlushing(input: FlushingInput): FlushingPlan {
    log.info(`EDMCuttingParamFlushEngine.planFlushing: ${input.material} ${input.thickness_mm}mm ${input.pass_type}`);

    const mat = this.resolveMaterial(input.material);

    // U01: Select mode
    const mode = this.selectFlushingMode(input);

    // U02: Nozzle positions
    const nozzles = this.optimizeNozzlePosition(input, mode);

    // U03: Pressure
    const pressure = this.calculateFlushingPressure(input, mode);
    nozzles.upper.pressure_bar = pressure.upper_bar;
    nozzles.lower.pressure_bar = pressure.lower_bar;

    // U04: Dielectric condition
    const { dielectric, maintenance } = this.monitorDielectric(input, mat, mode);

    // U05: Debris evacuation — need energy estimate
    const dischargeE = input.discharge_energy_mj ?? 0.1;
    // Build a minimal energy calc for debris modeling
    const pseudoEnergy: EnergyCalculation = {
      per_discharge_mj: dischargeE,
      duty_cycle: 0.2,
      frequency_khz: 50,
      avg_power_W: 100,
      crater_diameter_um: 4.8 * Math.pow(dischargeE, 1 / 3),
      crater_depth_um: 1.8 * Math.pow(dischargeE, 1 / 3) / Math.sqrt(mat.thermal_conductivity_W_mK / 50),
      mrr_mm2_min: 0,
      ra_um: 0,
      recast_layer_um: 0,
      stochastic_energy_distribution: { mean_mj: dischargeE, std_dev_mj: dischargeE * 0.15, cv_percent: 15 },
    };

    const debris = this.modelDebrisEvacuation(pseudoEnergy, mat);

    return {
      mode,
      upper_nozzle: nozzles.upper,
      lower_nozzle: nozzles.lower,
      dielectric,
      debris,
      maintenance,
    };
  }

  // ==========================================================================
  // PUBLIC ACTION: predict_wire_break
  // ==========================================================================

  /**
   * Standalone wire break prediction from cutting parameters.
   */
  predictWireBreakRisk(input: CuttingParamInput): WireBreakPrediction {
    log.info(`EDMCuttingParamFlushEngine.predictWireBreakRisk: ${input.material} ${input.thickness_mm}mm`);

    const mat = this.resolveMaterial(input.material);
    const wireProps = this.resolveWire(input.wire_type);

    // Build pulse and wire from optimization
    let pulse = this.optimizePulse(input, mat);
    pulse = this.optimizeServo(pulse, input, mat);
    const wire = this.optimizeWireSpeed(input, wireProps, pulse);

    return this.predictWireBreak(input, pulse, wire, mat, wireProps);
  }

  // ==========================================================================
  // PUBLIC ACTION: map_technology_table
  // ==========================================================================

  /**
   * Map current parameters to a machine-specific technology table.
   */
  mapTechTable(input: CuttingParamInput): TechnologyTableMapping | null {
    log.info(`EDMCuttingParamFlushEngine.mapTechTable: ${input.machine_controller}`);

    if (!input.machine_controller) {
      log.warn("No machine controller specified for technology table mapping");
      return null;
    }

    const mat = this.resolveMaterial(input.material);
    let pulse = this.optimizePulse(input, mat);
    pulse = this.optimizeServo(pulse, input, mat);
    const wireProps = this.resolveWire(input.wire_type);
    const wire = this.optimizeWireSpeed(input, wireProps, pulse);

    return this.mapTechnologyTable(pulse, wire, input) ?? null;
  }

  // ==========================================================================
  // PUBLIC ACTION: calculate_energy
  // ==========================================================================

  /**
   * Detailed discharge energy analysis.
   */
  calculateEnergyDetailed(input: CuttingParamInput): EnergyCalculation {
    log.info(`EDMCuttingParamFlushEngine.calculateEnergyDetailed: ${input.material} ${input.pass_type}`);

    const mat = this.resolveMaterial(input.material);
    let pulse = this.optimizePulse(input, mat);
    pulse = this.optimizeServo(pulse, input, mat);

    return this.calculateEnergy(pulse, input, mat);
  }

  // ==========================================================================
  // PUBLIC ACTION: full_optimize
  // ==========================================================================

  /**
   * Complete optimization: cutting parameters + flushing strategy + predictions.
   * The top-level action that combines all 12 units.
   */
  fullOptimize(input: CuttingParamInput): FullOptimizeResult {
    log.info(`EDMCuttingParamFlushEngine.fullOptimize: ${input.material} ${input.thickness_mm}mm ${input.pass_type}`);

    const mat = this.resolveMaterial(input.material);
    const wireProps = this.resolveWire(input.wire_type);

    // Step 1: Cutting parameters
    const params = this.optimizeParams(input);

    // Step 2: Energy (detailed)
    const energyDetailed = this.calculateEnergy(params.pulse, input, mat);

    // Step 3: Wire break prediction
    const wire = params.wire;
    const wireBreak = this.predictWireBreak(input, params.pulse, wire, mat, wireProps);

    // Step 4: Flushing plan (using actual energy from optimization)
    const flushInput: FlushingInput = {
      material: input.material,
      thickness_mm: input.thickness_mm,
      pass_type: input.pass_type,
      profile_type: "open",
      wire_diameter_mm: input.wire_diameter_mm,
      discharge_energy_mj: energyDetailed.per_discharge_mj,
      machine_controller: input.machine_controller,
    };
    const flushing = this.planFlushing(flushInput);

    // Step 5: Technology table
    let techTable: TechnologyTableMapping | undefined;
    if (input.machine_controller) {
      techTable = this.mapTechnologyTable(params.pulse, wire, input) ?? undefined;
    }

    // Step 6: Optimization score (0-100)
    let score = 50; // baseline

    // MRR contribution (higher = better for rough, less important for finish)
    if (input.pass_type === "rough") {
      score += Math.min(20, energyDetailed.mrr_mm2_min * 2);
    }

    // Ra contribution (lower = better for finish)
    if (input.target_ra_um) {
      const raRatio = input.target_ra_um / Math.max(0.01, energyDetailed.ra_um);
      score += Math.min(15, raRatio * 10);
    } else {
      score += 10; // no target = assume OK
    }

    // Wire break risk penalty
    score -= wireBreak.probability * 30;

    // Flushing quality bonus (submerged or combined for finish = good)
    if ((input.pass_type === "finish" || input.pass_type === "super_finish") && flushing.mode === "submerged") {
      score += 5;
    }

    // Duty cycle efficiency
    score += energyDetailed.duty_cycle * 10;

    score = parseFloat(Math.max(0, Math.min(100, score)).toFixed(1));

    // Notes
    const notes: string[] = [...params.warnings];
    if (wireBreak.risk_level === "high" || wireBreak.risk_level === "critical") {
      notes.push(`Wire break risk is ${wireBreak.risk_level}: ${wireBreak.mitigation.join("; ")}`);
    }
    if (flushing.debris.flush_velocity_needed_mm_s > 10) {
      notes.push("High flush velocity required — ensure adequate pump capacity");
    }
    if (energyDetailed.recast_layer_um > 10) {
      notes.push(`Recast layer ${energyDetailed.recast_layer_um.toFixed(1)} μm — consider post-machining stress relief`);
    }

    return {
      params,
      flushing,
      wire_break: wireBreak,
      energy: energyDetailed,
      technology_table: techTable,
      optimization_score: score,
      notes,
    };
  }

  // ==========================================================================
  // METADATA
  // ==========================================================================

  getVersion(): string {
    return this.VERSION;
  }

  getSupportedMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }

  getSupportedWireTypes(): string[] {
    return Object.keys(WIRE_DB);
  }

  getSupportedControllers(): string[] {
    return Object.keys(TECH_TABLES);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** EDM Cutting Parameter & Flushing Strategy Engine — singleton instance. */
export const edmCuttingParamFlushEngine = new EDMCuttingParamFlushEngine();

export { EDMCuttingParamFlushEngine };
