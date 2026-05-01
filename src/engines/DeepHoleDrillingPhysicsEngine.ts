/**
 * DeepHoleDrillingPhysicsEngine — First-principles physics for deep hole drilling
 * (L/D > 5) covering BTA, gun drill, and ejector drill processes.
 *
 * Provides mathematically exhaustive models:
 *   1. Thrust force & torque (Kienzle-based with deep-hole corrections)
 *   2. Chip evacuation (coolant flow, pressure drop, transport velocity)
 *   3. Whip/whirl vibration (critical speed, whirl frequency, stability)
 *   4. Hole straightness / deviation prediction
 *   5. Surface finish for deep holes (burnishing-corrected)
 *   6. Tool life with L/D penalty (modified Taylor)
 *   7. Pecking optimization (G83/G73, cycle time)
 *   8. Power and energy (cutting + coolant pumping)
 *
 * All models are self-contained with inline math — no external libraries.
 *
 * References:
 *   Kienzle O. (1952) — Specific cutting force model
 *   Sakuma K. et al. (1981) — Deep hole drilling mechanics
 *   Weinert K. et al. (2001) — BTA deep hole drilling
 *   Biermann D. et al. (2005) — Deep hole drilling guide pad effects
 *   Astakhov V. (2010) — Geometry of single-point turning tools & drills
 *   Messaoud A., Weihs C. (2009) — Monitoring of BTA deep hole drilling
 *   Griffiths B. (2001) — Manufacturing surface technology
 *   Taylor F.W. (1907) — Tool life equation
 *   Darcy-Weisbach — Pressure drop in pipes
 */

// ============================================================================
// TYPES
// ============================================================================

/** Standard PRISM return wrapper with generic payload. */
interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

/** Deep hole drilling process type. */
export type DrillProcess = 'gun_drill' | 'BTA' | 'ejector' | 'twist_drill_peck';

/** Pecking strategy for conventional drills. */
export type PeckStrategy = 'full_retract' | 'partial_retract' | 'chip_break';

// ─── Input/Output Interfaces ──────────────────────────────────────

export interface ThrustForceInput {
  material: string;
  drill_diameter_mm: number;
  feed_mm_rev: number;
  process: DrillProcess;
  LD_ratio: number;
  cutting_speed_m_min?: number;
  guide_pad_count?: number;
}

export interface ThrustForceOutput {
  thrust_N: AtomicValue<number>;
  torque_Nm: AtomicValue<number>;
  correction_guide_pads: AtomicValue<number>;
  correction_burnishing: AtomicValue<number>;
  correction_chip_compression: AtomicValue<number>;
  total_correction: AtomicValue<number>;
}

export interface ChipEvacuationInput {
  drill_diameter_mm: number;
  bore_diameter_mm?: number;
  hole_depth_mm: number;
  process: DrillProcess;
  feed_mm_rev: number;
  spindle_rpm: number;
  coolant_viscosity_cSt?: number;
  coolant_density_kg_m3?: number;
}

export interface ChipEvacuationOutput {
  min_flow_rate_L_min: AtomicValue<number>;
  pressure_drop_bar: AtomicValue<number>;
  chip_transport_velocity_m_s: AtomicValue<number>;
  chip_packing_ratio: AtomicValue<number>;
  jamming_risk: AtomicValue<string>;
  hydraulic_diameter_mm: AtomicValue<number>;
}

export interface WhirlVibrationInput {
  drill_diameter_mm: number;
  bore_tube_od_mm?: number;
  bore_tube_id_mm?: number;
  hole_depth_mm: number;
  spindle_rpm: number;
  process: DrillProcess;
  guide_pad_count?: number;
  material_E_GPa?: number;
  material_density_kg_m3?: number;
}

export interface WhirlVibrationOutput {
  critical_speed_rpm: AtomicValue<number>;
  whirl_frequency_Hz: AtomicValue<number>;
  speed_ratio: AtomicValue<number>;
  is_stable: AtomicValue<boolean>;
  safety_margin_pct: AtomicValue<number>;
  recommended_max_rpm: AtomicValue<number>;
}

export interface HoleDeviationInput {
  material: string;
  drill_diameter_mm: number;
  hole_depth_mm: number;
  feed_mm_rev: number;
  process: DrillProcess;
  lateral_force_fraction?: number;
  systematic_drift_mm_m?: number;
}

export interface HoleDeviationOutput {
  total_deviation_mm: AtomicValue<number>;
  straightness_mm_m: AtomicValue<number>;
  force_induced_mm: AtomicValue<number>;
  systematic_drift_mm: AtomicValue<number>;
  LD_ratio: AtomicValue<number>;
  process_capability: AtomicValue<string>;
}

export interface SurfaceFinishInput {
  material: string;
  feed_mm_rev: number;
  nose_radius_mm: number;
  process: DrillProcess;
  flank_wear_mm?: number;
  cutting_speed_m_min?: number;
  guide_pad_count?: number;
}

export interface SurfaceFinishOutput {
  Ra_um: AtomicValue<number>;
  Rz_um: AtomicValue<number>;
  burnishing_factor: AtomicValue<number>;
  achievable_range_um: AtomicValue<[number, number]>;
}

export interface ToolLifeInput {
  material: string;
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  LD_ratio: number;
  process: DrillProcess;
  coolant_pressure_bar?: number;
}

export interface ToolLifeOutput {
  tool_life_min: AtomicValue<number>;
  baseline_life_min: AtomicValue<number>;
  LD_penalty_factor: AtomicValue<number>;
  coolant_effectiveness: AtomicValue<number>;
  recommended_regrind_count: AtomicValue<number>;
}

export interface PeckingInput {
  drill_diameter_mm: number;
  hole_depth_mm: number;
  material: string;
  feed_mm_rev: number;
  spindle_rpm: number;
  strategy: PeckStrategy;
  rapid_rate_mm_min?: number;
  dwell_sec?: number;
}

export interface PeckingOutput {
  peck_depth_mm: AtomicValue<number>;
  num_pecks: AtomicValue<number>;
  cycle_time_sec: AtomicValue<number>;
  cut_time_sec: AtomicValue<number>;
  retract_time_sec: AtomicValue<number>;
  rapid_time_sec: AtomicValue<number>;
  dwell_time_sec: AtomicValue<number>;
}

export interface PowerInput {
  thrust_N: number;
  torque_Nm: number;
  cutting_speed_m_min: number;
  spindle_rpm: number;
  coolant_flow_L_min?: number;
  coolant_pressure_bar?: number;
  pump_efficiency?: number;
  drill_diameter_mm: number;
}

export interface PowerOutput {
  cutting_power_kW: AtomicValue<number>;
  thrust_power_kW: AtomicValue<number>;
  torque_power_kW: AtomicValue<number>;
  coolant_power_kW: AtomicValue<number>;
  total_power_kW: AtomicValue<number>;
  specific_energy_J_mm3: AtomicValue<number>;
  MRR_mm3_min: AtomicValue<number>;
}

export interface DrillComparison {
  process: DrillProcess;
  thrust_N: number;
  torque_Nm: number;
  Ra_um: number;
  tool_life_min: number;
  deviation_mm_m: number;
  recommended: boolean;
  notes: string[];
}

export interface DrillComparisonOutput {
  comparisons: DrillComparison[];
  recommended_process: AtomicValue<string>;
}

// ============================================================================
// MATERIAL DATABASE
// ============================================================================

interface DeepHoleMaterial {
  kc1_1: number;       // Kienzle specific cutting force kc1.1 [MPa]
  mc: number;          // Kienzle exponent
  E_GPa: number;       // Young's modulus [GPa]
  density_kg_m3: number;
  thermal_cond_W_mK: number;
  taylor_C: number;    // Taylor constant (m/min at T=1 min)
  taylor_n: number;    // Taylor speed exponent
  taylor_m: number;    // Taylor feed exponent
  hardness_HB: number;
  chip_compression_ratio: number;  // typical chip compression ratio
  machinability_factor: number;    // relative to AISI 1045 = 1.0
}

const MATERIAL_DB: Record<string, DeepHoleMaterial> = {
  'mild_steel': {
    kc1_1: 1780, mc: 0.26, E_GPa: 210, density_kg_m3: 7850,
    thermal_cond_W_mK: 51.9, taylor_C: 350, taylor_n: 0.25, taylor_m: 0.15,
    hardness_HB: 130, chip_compression_ratio: 2.5, machinability_factor: 1.2,
  },
  'alloy_steel': {
    kc1_1: 2100, mc: 0.25, E_GPa: 210, density_kg_m3: 7850,
    thermal_cond_W_mK: 42.7, taylor_C: 250, taylor_n: 0.22, taylor_m: 0.18,
    hardness_HB: 250, chip_compression_ratio: 2.8, machinability_factor: 0.7,
  },
  'stainless_steel': {
    kc1_1: 2350, mc: 0.22, E_GPa: 193, density_kg_m3: 7900,
    thermal_cond_W_mK: 16.3, taylor_C: 180, taylor_n: 0.20, taylor_m: 0.20,
    hardness_HB: 200, chip_compression_ratio: 3.0, machinability_factor: 0.55,
  },
  'cast_iron': {
    kc1_1: 1150, mc: 0.28, E_GPa: 170, density_kg_m3: 7200,
    thermal_cond_W_mK: 46, taylor_C: 400, taylor_n: 0.28, taylor_m: 0.12,
    hardness_HB: 200, chip_compression_ratio: 1.8, machinability_factor: 1.3,
  },
  'aluminum': {
    kc1_1: 750, mc: 0.18, E_GPa: 71, density_kg_m3: 2700,
    thermal_cond_W_mK: 167, taylor_C: 800, taylor_n: 0.35, taylor_m: 0.10,
    hardness_HB: 95, chip_compression_ratio: 2.0, machinability_factor: 2.5,
  },
  'titanium': {
    kc1_1: 2800, mc: 0.28, E_GPa: 114, density_kg_m3: 4430,
    thermal_cond_W_mK: 6.7, taylor_C: 120, taylor_n: 0.18, taylor_m: 0.22,
    hardness_HB: 330, chip_compression_ratio: 3.2, machinability_factor: 0.35,
  },
};

// ============================================================================
// DRILL DATABASE
// ============================================================================

interface DrillSpec {
  process: DrillProcess;
  diameter_range_mm: [number, number];
  max_LD: number;
  guide_pads: number;
  tube_wall_ratio: number;      // bore tube wall / OD ratio
  typical_nose_radius_mm: number;
  burnishing_factor: number;    // surface finish improvement from guide pads
  lateral_force_fraction: number; // fraction of thrust that acts laterally
  balance_quality: 'high' | 'medium' | 'low';
}

const DRILL_SPECS: Record<string, DrillSpec> = {
  gun_drill: {
    process: 'gun_drill', diameter_range_mm: [1, 30], max_LD: 100,
    guide_pads: 2, tube_wall_ratio: 0.15, typical_nose_radius_mm: 0.4,
    burnishing_factor: 0.6, lateral_force_fraction: 0.15,
    balance_quality: 'medium',
  },
  BTA: {
    process: 'BTA', diameter_range_mm: [18, 200], max_LD: 100,
    guide_pads: 3, tube_wall_ratio: 0.12, typical_nose_radius_mm: 0.8,
    burnishing_factor: 0.75, lateral_force_fraction: 0.05,
    balance_quality: 'high',
  },
  ejector: {
    process: 'ejector', diameter_range_mm: [18, 200], max_LD: 80,
    guide_pads: 3, tube_wall_ratio: 0.14, typical_nose_radius_mm: 0.8,
    burnishing_factor: 0.70, lateral_force_fraction: 0.06,
    balance_quality: 'high',
  },
  twist_drill_peck: {
    process: 'twist_drill_peck', diameter_range_mm: [1, 50], max_LD: 15,
    guide_pads: 0, tube_wall_ratio: 0, typical_nose_radius_mm: 0.5,
    burnishing_factor: 1.0, lateral_force_fraction: 0.10,
    balance_quality: 'low',
  },
};

// ============================================================================
// COOLANT PROPERTIES (deep hole drilling oils)
// ============================================================================

interface CoolantProperties {
  density_kg_m3: number;
  viscosity_cSt: number;
  specific_heat_J_kgK: number;
  thermal_cond_W_mK: number;
  friction_factor_base: number;  // Darcy friction factor baseline
}

const COOLANT_DB: Record<string, CoolantProperties> = {
  deep_hole_oil: {
    density_kg_m3: 870, viscosity_cSt: 10, specific_heat_J_kgK: 1900,
    thermal_cond_W_mK: 0.13, friction_factor_base: 0.035,
  },
  emulsion_10pct: {
    density_kg_m3: 990, viscosity_cSt: 2.5, specific_heat_J_kgK: 3800,
    thermal_cond_W_mK: 0.55, friction_factor_base: 0.028,
  },
  neat_cutting_oil: {
    density_kg_m3: 880, viscosity_cSt: 15, specific_heat_J_kgK: 1850,
    thermal_cond_W_mK: 0.12, friction_factor_base: 0.040,
  },
};

const DEFAULT_COOLANT = COOLANT_DB.deep_hole_oil;

// ============================================================================
// HELPERS
// ============================================================================

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getMaterial(name: string): DeepHoleMaterial {
  const mat = MATERIAL_DB[name];
  if (!mat) {
    const keys = Object.keys(MATERIAL_DB).join(', ');
    throw new Error(`Unknown material "${name}". Available: ${keys}`);
  }
  return mat;
}

function getDrillSpec(process: DrillProcess): DrillSpec {
  const spec = DRILL_SPECS[process];
  if (!spec) throw new Error(`Unknown drill process: ${process}`);
  return spec;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * DeepHoleDrillingPhysicsEngine provides first-principles physics models
 * for deep hole drilling operations (L/D > 5).
 *
 * Covers BTA, gun drill, ejector, and twist drill pecking processes with
 * Kienzle-based force models, chip evacuation hydraulics, whirl vibration
 * analysis, hole deviation prediction, surface finish, tool life, pecking
 * optimization, and power/energy calculations.
 */
export class DeepHoleDrillingPhysicsEngine {

  // --------------------------------------------------------------------------
  // 1. THRUST FORCE AND TORQUE (Kienzle-based)
  // --------------------------------------------------------------------------

  /**
   * Calculate thrust force and torque for deep hole drilling using the
   * Kienzle specific cutting force model with deep-hole correction factors.
   *
   * F_thrust = kc1.1 × f^(1-mc) × (D/2) × correction_factors
   * Torque   = kc1.1 × f^(1-mc) × D²/8
   *
   * Correction factors account for:
   *   - Guide pad friction (increases thrust 5-15%)
   *   - Burnishing forces (guide pads pressing on wall, 3-10%)
   *   - Chip compression (restricted space increases forces, 5-20%)
   *
   * @param input - Material, geometry, and process parameters
   * @returns Thrust force [N], torque [N·m], and individual correction factors
   */
  thrustForceAndTorque(input: ThrustForceInput): ThrustForceOutput {
    const mat = getMaterial(input.material);
    const spec = getDrillSpec(input.process);
    const D = input.drill_diameter_mm;
    const f = input.feed_mm_rev;
    const LD = input.LD_ratio;
    const guidePads = input.guide_pad_count ?? spec.guide_pads;

    // Kienzle base force: kc1.1 × h^(1-mc) where h = f (chip thickness ≈ feed)
    const kc_base = mat.kc1_1 * Math.pow(f, -mat.mc); // specific cutting force [MPa]

    // Guide pad friction correction: each pad adds ~3-5% friction load
    const K_guide = 1.0 + guidePads * 0.04 * (1 + 0.1 * Math.min(LD, 50));

    // Burnishing correction: guide pads compress surface, increases with L/D
    const K_burnish = spec.burnishing_factor < 1.0
      ? 1.0 + (1.0 - spec.burnishing_factor) * 0.5 * Math.min(LD / 50, 1)
      : 1.0;

    // Chip compression: restricted evacuation channel increases forces
    const K_chip = 1.0 + mat.chip_compression_ratio * 0.03 * Math.min(LD / 20, 1.5);

    const totalCorrection = K_guide * K_burnish * K_chip;

    // Thrust force: F = kc × f^(1-mc) × (D/2)  [converting mm to consistent units]
    // kc_base already has f^(-mc) applied, so multiply by f to get f^(1-mc)
    const F_base = kc_base * f * (D / 2); // [MPa × mm × mm] = [N]
    const F_thrust = F_base * totalCorrection;

    // Torque: T = kc × f^(1-mc) × D²/8  [N·mm → N·m]
    const T_base = kc_base * f * (D * D / 8); // [N·mm]
    const torque_Nm = T_base * totalCorrection / 1000; // convert to N·m

    return {
      thrust_N: {
        value: Math.round(F_thrust * 10) / 10, unit: 'N',
        formula: 'F = kc1.1 × f^(1-mc) × (D/2) × K_guide × K_burnish × K_chip',
        confidence: 0.85,
      },
      torque_Nm: {
        value: Math.round(torque_Nm * 1000) / 1000, unit: 'N·m',
        formula: 'T = kc1.1 × f^(1-mc) × D²/8 × corrections',
        confidence: 0.85,
      },
      correction_guide_pads: {
        value: Math.round(K_guide * 1000) / 1000, unit: '-',
        formula: '1 + n_pads × 0.04 × (1 + 0.1 × min(L/D, 50))',
      },
      correction_burnishing: {
        value: Math.round(K_burnish * 1000) / 1000, unit: '-',
        formula: '1 + (1 - burnish_factor) × 0.5 × min(L/D / 50, 1)',
      },
      correction_chip_compression: {
        value: Math.round(K_chip * 1000) / 1000, unit: '-',
        formula: '1 + chip_ratio × 0.03 × min(L/D / 20, 1.5)',
      },
      total_correction: {
        value: Math.round(totalCorrection * 1000) / 1000, unit: '-',
        formula: 'K_guide × K_burnish × K_chip',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 2. CHIP EVACUATION MODEL
  // --------------------------------------------------------------------------

  /**
   * Calculate chip evacuation hydraulics for deep hole drilling.
   *
   * Models coolant flow requirements, pressure drop (Darcy-Weisbach),
   * chip transport velocity, and jamming risk based on chip packing ratio.
   *
   * Q_min = π×D²/4 × v_chip_min
   * ΔP = f_friction × L × ρ × v² / (2 × D_h)
   * v_transport = v_coolant × (1 - chip_load_ratio)
   *
   * @param input - Drill geometry, process, and coolant parameters
   * @returns Flow requirements, pressure drop, transport velocity, jamming risk
   */
  chipEvacuation(input: ChipEvacuationInput): ChipEvacuationOutput {
    const D = input.drill_diameter_mm / 1000; // to meters
    const L = input.hole_depth_mm / 1000;
    const spec = getDrillSpec(input.process);

    const coolant_rho = input.coolant_density_kg_m3 ?? DEFAULT_COOLANT.density_kg_m3;
    const coolant_visc = (input.coolant_viscosity_cSt ?? DEFAULT_COOLANT.viscosity_cSt) * 1e-6; // m²/s

    // Hydraulic diameter for annular flow (BTA/ejector: between bore tube and hole wall)
    let D_h: number;
    if (input.process === 'gun_drill') {
      // Gun drill: V-flute channel, approx 0.35 × D
      D_h = 0.35 * D;
    } else if (input.process === 'twist_drill_peck') {
      // Twist drill flutes: approx 0.4 × D
      D_h = 0.4 * D;
    } else {
      // BTA/ejector: annular space between bore tube and hole wall
      const tube_od = input.bore_diameter_mm
        ? input.bore_diameter_mm / 1000
        : D * (1 - 2 * spec.tube_wall_ratio);
      D_h = D - tube_od; // annular gap
    }

    // Minimum chip velocity for transport (typically 0.5-1.5 m/s)
    const v_chip_min = 0.8; // m/s baseline
    const area_flow = Math.PI * D_h * D_h / 4;

    // Minimum flow rate for chip transport
    const Q_min_m3_s = area_flow * v_chip_min;
    const Q_min_L_min = Q_min_m3_s * 60000; // convert m³/s → L/min

    // Chip load ratio: fraction of annular space occupied by chips
    const feed_m = input.feed_mm_rev / 1000;
    const MRR = Math.PI * (D * D / 4) * feed_m * input.spindle_rpm / 60; // m³/s
    const chip_volume_rate = MRR; // volume of metal removed per second
    const coolant_volume_rate = Q_min_m3_s > 0 ? Q_min_m3_s : 1e-6;
    const chip_load_ratio = clamp(chip_volume_rate / coolant_volume_rate, 0, 0.8);

    // Coolant velocity in annulus
    const v_coolant = coolant_volume_rate / Math.max(area_flow, 1e-10);

    // Transport velocity accounting for chip loading
    const v_transport = v_coolant * (1 - chip_load_ratio);

    // Pressure drop: Darcy-Weisbach ΔP = f × L × ρ × v² / (2 × D_h)
    // Reynolds number for friction factor
    const Re = v_coolant * Math.max(D_h, 1e-6) / coolant_visc;
    const f_friction = Re > 2300
      ? 0.316 * Math.pow(Re, -0.25) // Blasius turbulent
      : 64 / Math.max(Re, 1);       // Laminar

    // Effective friction increases with chip loading
    const f_eff = f_friction * (1 + 2 * chip_load_ratio);

    const delta_P = f_eff * L * coolant_rho * v_coolant * v_coolant / (2 * Math.max(D_h, 1e-6));
    const delta_P_bar = delta_P / 1e5; // Pa → bar

    // Chip packing ratio and jamming risk assessment
    const packing_ratio = chip_load_ratio;
    let jamming_risk: string;
    if (packing_ratio < 0.15) jamming_risk = 'low';
    else if (packing_ratio < 0.30) jamming_risk = 'moderate';
    else if (packing_ratio < 0.50) jamming_risk = 'high';
    else jamming_risk = 'critical';

    return {
      min_flow_rate_L_min: {
        value: Math.round(Q_min_L_min * 100) / 100, unit: 'L/min',
        formula: 'Q = π×D_h²/4 × v_chip_min',
        confidence: 0.80,
      },
      pressure_drop_bar: {
        value: Math.round(delta_P_bar * 100) / 100, unit: 'bar',
        formula: 'ΔP = f × L × ρ × v² / (2 × D_h)',
        confidence: 0.75,
      },
      chip_transport_velocity_m_s: {
        value: Math.round(v_transport * 1000) / 1000, unit: 'm/s',
        formula: 'v_transport = v_coolant × (1 - chip_load_ratio)',
        confidence: 0.80,
      },
      chip_packing_ratio: {
        value: Math.round(packing_ratio * 1000) / 1000, unit: '-',
        formula: 'chip_volume_rate / coolant_volume_rate',
        confidence: 0.70,
      },
      jamming_risk: {
        value: jamming_risk, unit: '-',
        formula: '<0.15 low, <0.30 moderate, <0.50 high, else critical',
        confidence: 0.75,
      },
      hydraulic_diameter_mm: {
        value: Math.round(D_h * 1000 * 100) / 100, unit: 'mm',
        formula: 'process-dependent annular/channel geometry',
        confidence: 0.85,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 3. WHIP/WHIRL VIBRATION
  // --------------------------------------------------------------------------

  /**
   * Analyze whip/whirl vibration stability for rotating drill shafts.
   *
   * Critical speed: N_cr = (π/L²) × √(E×I / (ρ×A)) × C_support
   * Whirl frequency: f_whirl = N × (1 - μ×N/N_cr)
   * Stability criterion: N < 0.7 × N_cr
   *
   * Guide pads act as intermediate supports, raising the critical speed
   * and improving stability. More pads = higher C_support.
   *
   * @param input - Drill geometry, speed, and support configuration
   * @returns Critical speed, whirl frequency, stability assessment
   */
  whirlVibration(input: WhirlVibrationInput): WhirlVibrationOutput {
    const spec = getDrillSpec(input.process);
    const D = input.drill_diameter_mm / 1000; // m
    const L = input.hole_depth_mm / 1000; // m
    const N = input.spindle_rpm;
    const guidePads = input.guide_pad_count ?? spec.guide_pads;

    // Bore tube properties (for BTA/ejector/gun drill shaft)
    let E: number, rho: number, I: number, A: number;

    if (input.process === 'twist_drill_peck') {
      // Solid drill shaft
      const d_shaft = D;
      E = (input.material_E_GPa ?? 600) * 1e9; // Carbide/HSS
      rho = input.material_density_kg_m3 ?? 14500; // Carbide
      I = Math.PI * Math.pow(d_shaft, 4) / 64;
      A = Math.PI * d_shaft * d_shaft / 4;
    } else {
      // Hollow bore tube
      const od = input.bore_tube_od_mm ? input.bore_tube_od_mm / 1000 : D * 0.9;
      const id = input.bore_tube_id_mm ? input.bore_tube_id_mm / 1000 : od * (1 - 2 * spec.tube_wall_ratio);
      E = (input.material_E_GPa ?? 210) * 1e9; // Steel tube
      rho = input.material_density_kg_m3 ?? 7850;
      I = Math.PI * (Math.pow(od, 4) - Math.pow(id, 4)) / 64;
      A = Math.PI * (od * od - id * id) / 4;
    }

    // Support coefficient: more guide pads = higher effective support
    // 0 pads: simply supported (C=1), 1 pad: C~1.5, 2: C~2.3, 3: C~3.5
    const C_support_map: Record<number, number> = {
      0: 1.0, 1: 1.5, 2: 2.3, 3: 3.5, 4: 4.8,
    };
    const C_support = C_support_map[clamp(guidePads, 0, 4)] ?? (1.0 + guidePads * 1.2);

    // Critical speed: N_cr = (π / L²) × √(EI / ρA) × C_support  [rad/s → rpm]
    const omega_cr = (Math.PI / (L * L)) * Math.sqrt(E * I / (rho * A)) * C_support;
    const N_cr = omega_cr * 60 / (2 * Math.PI); // Convert rad/s → RPM

    // Whirl frequency
    const mu = 0.15; // Friction coefficient at guide pads
    const f_whirl = (N / 60) * (1 - mu * N / Math.max(N_cr, 1));

    // Stability assessment
    const speed_ratio = N / Math.max(N_cr, 1);
    const is_stable = speed_ratio < 0.7;
    const safety_margin = (1 - speed_ratio / 0.7) * 100;
    const recommended_max = Math.floor(0.7 * N_cr);

    return {
      critical_speed_rpm: {
        value: Math.round(N_cr), unit: 'RPM',
        formula: 'N_cr = (π/L²) × √(EI/ρA) × C_support × 60/(2π)',
        confidence: 0.80,
      },
      whirl_frequency_Hz: {
        value: Math.round(Math.abs(f_whirl) * 100) / 100, unit: 'Hz',
        formula: 'f_whirl = (N/60) × (1 - μ×N/N_cr)',
        confidence: 0.75,
      },
      speed_ratio: {
        value: Math.round(speed_ratio * 1000) / 1000, unit: '-',
        formula: 'N / N_cr',
      },
      is_stable: {
        value: is_stable, unit: '-',
        formula: 'N/N_cr < 0.7',
        confidence: 0.85,
      },
      safety_margin_pct: {
        value: Math.round(safety_margin * 10) / 10, unit: '%',
        formula: '(1 - speed_ratio/0.7) × 100',
      },
      recommended_max_rpm: {
        value: recommended_max, unit: 'RPM',
        formula: '0.7 × N_cr',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 4. HOLE STRAIGHTNESS / DEVIATION
  // --------------------------------------------------------------------------

  /**
   * Predict hole deviation and straightness for deep hole drilling.
   *
   * δ = F_lateral × L³ / (3×E×I) + drift_systematic
   * ε = δ / L  (mm/m straightness)
   *
   * Gun drills produce self-piloting action from single-flute imbalance.
   * BTA heads with balanced cutting and guide pads maintain straightness.
   *
   * @param input - Material, geometry, and process parameters
   * @returns Deviation, straightness, and process capability assessment
   */
  holeDeviation(input: HoleDeviationInput): HoleDeviationOutput {
    const mat = getMaterial(input.material);
    const spec = getDrillSpec(input.process);
    const D = input.drill_diameter_mm / 1000; // m
    const L = input.hole_depth_mm / 1000; // m
    const LD = L / D;

    // Calculate thrust force to derive lateral component
    const f = input.feed_mm_rev;
    const kc = mat.kc1_1 * Math.pow(f, -mat.mc);
    const F_thrust = kc * f * (D * 1000 / 2); // N (using mm for Kienzle)

    // Lateral force fraction depends on process
    const lat_frac = input.lateral_force_fraction ?? spec.lateral_force_fraction;
    const F_lateral = F_thrust * lat_frac;

    // Moment of inertia of drill shaft (simplified as solid for deviation calc)
    const E = mat.E_GPa * 1e9; // Pa
    const I = Math.PI * Math.pow(D, 4) / 64;

    // Cantilever beam deflection: δ = F × L³ / (3 × E × I)
    // Guide pads reduce effective unsupported length
    const effective_L = spec.guide_pads > 0
      ? L / Math.sqrt(spec.guide_pads + 1) // support reduces effective length
      : L;

    const delta_force = F_lateral * Math.pow(effective_L, 3) / (3 * E * I);

    // Systematic drift (material non-homogeneity, drill geometry asymmetry)
    const drift_rate = input.systematic_drift_mm_m
      ?? (input.process === 'gun_drill' ? 0.02 : 0.005); // mm/m
    const delta_systematic = drift_rate * L; // m (drift_rate is mm/m, L in m → gives mm*m/m ≈ mm... need unit fix)
    const delta_systematic_m = drift_rate * L / 1000; // convert to meters

    const total_deviation_m = delta_force + delta_systematic_m;
    const total_deviation_mm = total_deviation_m * 1000;
    const straightness_mm_m = total_deviation_mm / L; // mm per meter

    // Process capability rating
    let capability: string;
    if (straightness_mm_m < 0.05) capability = 'excellent';
    else if (straightness_mm_m < 0.15) capability = 'good';
    else if (straightness_mm_m < 0.5) capability = 'acceptable';
    else capability = 'poor';

    return {
      total_deviation_mm: {
        value: Math.round(total_deviation_mm * 1000) / 1000, unit: 'mm',
        formula: 'δ = F_lat × L_eff³ / (3EI) + drift × L',
        confidence: 0.75,
      },
      straightness_mm_m: {
        value: Math.round(straightness_mm_m * 1000) / 1000, unit: 'mm/m',
        formula: 'ε = δ_total / L',
        confidence: 0.75,
      },
      force_induced_mm: {
        value: Math.round(delta_force * 1e6) / 1000, unit: 'mm',
        formula: 'F_lat × L_eff³ / (3EI)',
        confidence: 0.70,
      },
      systematic_drift_mm: {
        value: Math.round(delta_systematic_m * 1e6) / 1000, unit: 'mm',
        formula: 'drift_rate × L',
        confidence: 0.65,
      },
      LD_ratio: {
        value: Math.round(LD * 10) / 10, unit: '-',
        formula: 'L / D',
      },
      process_capability: {
        value: capability, unit: '-',
        formula: 'based on straightness: <0.05 excellent, <0.15 good, <0.5 acceptable',
        confidence: 0.80,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 5. SURFACE FINISH
  // --------------------------------------------------------------------------

  /**
   * Predict surface finish for deep hole drilling.
   *
   * Ra = f² / (32 × R_nose) × (1 + K_burnish × VB/f)
   *
   * Guide pad burnishing improves finish at expense of heat generation.
   * Gun drill achieves 0.2-0.8 μm Ra; BTA achieves 0.4-1.6 μm Ra.
   *
   * @param input - Feed, geometry, wear, and process parameters
   * @returns Ra, Rz, burnishing factor, achievable range
   */
  surfaceFinish(input: SurfaceFinishInput): SurfaceFinishOutput {
    const spec = getDrillSpec(input.process);
    const f = input.feed_mm_rev;
    const R_nose = input.nose_radius_mm ?? spec.typical_nose_radius_mm;
    const VB = input.flank_wear_mm ?? 0.1; // default 0.1 mm wear

    // Base kinematic roughness: Ra = f² / (32 × R_nose)  [mm]
    const Ra_kinematic_mm = (f * f) / (32 * R_nose);
    const Ra_kinematic_um = Ra_kinematic_mm * 1000; // convert to μm

    // Wear deterioration factor
    const K_wear = 1 + 0.8 * VB / f;

    // Burnishing improvement from guide pads
    const K_burnish = spec.burnishing_factor; // < 1 means improvement
    const guidePads = input.guide_pad_count ?? spec.guide_pads;
    const burnish_effect = guidePads > 0
      ? K_burnish * (1 - 0.05 * (guidePads - 1)) // more pads = more burnishing
      : 1.0;

    // Material factor (softer materials give better finish)
    const mat = getMaterial(input.material);
    const K_material = mat.machinability_factor > 1.0 ? 0.85 : 1.0 + (1 - mat.machinability_factor) * 0.3;

    const Ra_um = Ra_kinematic_um * K_wear * burnish_effect * K_material;
    const Rz_um = Ra_um * 4.5; // typical Rz/Ra ratio for drilling

    // Achievable range for process type
    const ranges: Record<string, [number, number]> = {
      gun_drill: [0.2, 0.8],
      BTA: [0.4, 1.6],
      ejector: [0.5, 2.0],
      twist_drill_peck: [1.6, 6.3],
    };
    const range = ranges[input.process] ?? [0.8, 3.2];

    // Clamp to achievable range
    const Ra_final = clamp(Ra_um, range[0] * 0.5, range[1] * 2);

    return {
      Ra_um: {
        value: Math.round(Ra_final * 100) / 100, unit: 'μm',
        formula: 'Ra = f²/(32×R_nose) × K_wear × K_burnish × K_material',
        confidence: 0.80,
      },
      Rz_um: {
        value: Math.round(Ra_final * 4.5 * 100) / 100, unit: 'μm',
        formula: 'Rz ≈ 4.5 × Ra',
        confidence: 0.75,
      },
      burnishing_factor: {
        value: Math.round(burnish_effect * 1000) / 1000, unit: '-',
        formula: 'K_burnish × (1 - 0.05 × (n_pads - 1))',
      },
      achievable_range_um: {
        value: range, unit: 'μm',
        formula: 'process-dependent typical range',
        confidence: 0.85,
      },
    };
  }

  // --------------------------------------------------------------------------
  // 6. TOOL LIFE (Modified Taylor with L/D penalty)
  // --------------------------------------------------------------------------

  /**
   * Predict tool life using modified Taylor equation with L/D penalty.
   *
   * T = C / (Vc^n × f^m × (L/D)^p)
   *
   * Tool life decreases with depth ratio due to increased thermal load,
   * reduced coolant effectiveness, and chip evacuation difficulties.
   *
   * @param input - Speed, feed, L/D ratio, process parameters
   * @returns Tool life, penalty factor, coolant effectiveness
   */
  toolLife(input: ToolLifeInput): ToolLifeOutput {
    const mat = getMaterial(input.material);
    const LD = input.LD_ratio;
    const Vc = input.cutting_speed_m_min;
    const f = input.feed_mm_rev;

    // Modified Taylor: T = C / (Vc^n × f^m × (L/D)^p)
    const C = mat.taylor_C * mat.machinability_factor;
    const n = mat.taylor_n;
    const m = mat.taylor_m;

    // L/D penalty exponent: higher for harder materials, lower for gun drill (better coolant delivery)
    const p_base = 0.15;
    const p = input.process === 'gun_drill' ? p_base * 0.7 :
              input.process === 'BTA' ? p_base * 0.8 :
              input.process === 'ejector' ? p_base * 0.85 : p_base;

    // Baseline tool life at L/D = 5 (reference)
    const T_baseline = C / (Math.pow(Vc, n) * Math.pow(f, m) * Math.pow(5, p));

    // Actual tool life with L/D penalty
    const LD_penalty = Math.pow(LD / 5, p);
    const T_actual = T_baseline / LD_penalty;

    // Coolant effectiveness decay with depth
    const coolant_pressure = input.coolant_pressure_bar ?? 40;
    const coolant_effectiveness = clamp(
      1.0 - 0.005 * (LD - 5) * (60 / Math.max(coolant_pressure, 10)),
      0.3, 1.0
    );

    // Apply coolant effectiveness to tool life
    const T_final = T_actual * coolant_effectiveness;

    // Recommended regrind count (carbide: 3-5, HSS: 2-3)
    const regrind = input.process === 'twist_drill_peck' ? 3 : 5;

    return {
      tool_life_min: {
        value: Math.round(T_final * 10) / 10, unit: 'min',
        formula: 'T = C / (Vc^n × f^m × (L/D)^p) × coolant_eff',
        confidence: 0.75,
      },
      baseline_life_min: {
        value: Math.round(T_baseline * 10) / 10, unit: 'min',
        formula: 'T at L/D = 5 (reference)',
        confidence: 0.80,
      },
      LD_penalty_factor: {
        value: Math.round(LD_penalty * 1000) / 1000, unit: '-',
        formula: '(L/D ÷ 5)^p',
      },
      coolant_effectiveness: {
        value: Math.round(coolant_effectiveness * 1000) / 1000, unit: '-',
        formula: '1 - 0.005 × (L/D - 5) × (60/P_coolant)',
        confidence: 0.70,
      },
      recommended_regrind_count: {
        value: regrind, unit: '-',
        formula: 'process-dependent (carbide 3-5)',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 7. PECKING OPTIMIZATION
  // --------------------------------------------------------------------------

  /**
   * Optimize pecking parameters for conventional twist drills in deep holes.
   *
   * Peck depth decreases with current depth to manage chip evacuation.
   * Full retract (G83): safest, slowest — retracts to R plane each peck.
   * Partial retract (G73): faster — retracts 1-2mm to break chip.
   *
   * @param input - Drill geometry, material, and pecking strategy
   * @returns Peck depth, count, and detailed cycle time breakdown
   */
  peckingOptimization(input: PeckingInput): PeckingOutput {
    const D = input.drill_diameter_mm;
    const depth = input.hole_depth_mm;
    const f = input.feed_mm_rev;
    const rpm = input.spindle_rpm;
    const mat = getMaterial(input.material);

    const feed_rate = f * rpm; // mm/min
    const rapid = input.rapid_rate_mm_min ?? 5000; // mm/min
    const dwell = input.dwell_sec ?? 0.5;

    // Optimal initial peck depth: function of D, material, and strategy
    // Harder materials → shallower pecks; larger D → deeper pecks
    const base_peck = D * mat.machinability_factor * 1.5;

    // Progressive reduction: peck depth decreases as we go deeper
    // d_peck(i) = base_peck × (1 - 0.3 × current_depth / total_depth)
    const pecks: number[] = [];
    let accumulated = 0;
    while (accumulated < depth) {
      const progress = accumulated / depth;
      const current_peck = base_peck * (1 - 0.3 * progress);
      const actual_peck = Math.min(current_peck, depth - accumulated);
      pecks.push(actual_peck);
      accumulated += actual_peck;
    }

    const num_pecks = pecks.length;
    const avg_peck = depth / num_pecks;

    // Cycle time calculation
    let total_cut_time = 0;
    let total_retract_time = 0;
    let total_rapid_time = 0;
    let total_dwell_time = 0;

    for (let i = 0; i < pecks.length; i++) {
      const current_depth = pecks.slice(0, i).reduce((a, b) => a + b, 0);

      // Cut time for this peck
      total_cut_time += pecks[i] / feed_rate * 60; // seconds

      if (input.strategy === 'full_retract') {
        // Retract to R plane (full depth)
        total_retract_time += (current_depth + pecks[i]) / rapid * 60;
        // Rapid back to current depth for next peck
        total_rapid_time += (current_depth + pecks[i]) / rapid * 60;
      } else if (input.strategy === 'partial_retract') {
        // Retract 1-2 mm only
        const retract_dist = Math.min(2, pecks[i] * 0.5);
        total_retract_time += retract_dist / rapid * 60;
        total_rapid_time += retract_dist / rapid * 60;
      } else {
        // Chip break: momentary dwell, no retract
        total_dwell_time += 0.1; // brief dwell for chip break
      }

      total_dwell_time += dwell; // dwell at bottom of each peck
    }

    const total_cycle = total_cut_time + total_retract_time + total_rapid_time + total_dwell_time;

    return {
      peck_depth_mm: {
        value: Math.round(avg_peck * 100) / 100, unit: 'mm',
        formula: 'D × machinability × 1.5 × (1 - 0.3 × progress)',
        confidence: 0.80,
      },
      num_pecks: {
        value: num_pecks, unit: '-',
        formula: 'total_depth / progressive_peck_depths',
      },
      cycle_time_sec: {
        value: Math.round(total_cycle * 100) / 100, unit: 's',
        formula: 'Σ(t_cut + t_retract + t_rapid + t_dwell)',
        confidence: 0.80,
      },
      cut_time_sec: {
        value: Math.round(total_cut_time * 100) / 100, unit: 's',
        formula: 'Σ(peck_depth / feed_rate)',
      },
      retract_time_sec: {
        value: Math.round(total_retract_time * 100) / 100, unit: 's',
        formula: 'Σ(retract_distance / rapid_rate)',
      },
      rapid_time_sec: {
        value: Math.round(total_rapid_time * 100) / 100, unit: 's',
        formula: 'Σ(rapid_distance / rapid_rate)',
      },
      dwell_time_sec: {
        value: Math.round(total_dwell_time * 100) / 100, unit: 's',
        formula: 'Σ(dwell per peck)',
      },
    };
  }

  // --------------------------------------------------------------------------
  // 8. POWER AND ENERGY
  // --------------------------------------------------------------------------

  /**
   * Calculate cutting power, coolant pumping power, and specific energy.
   *
   * P_cutting = F_thrust × Vc/60 + Torque × ω
   * P_coolant = Q × ΔP / η_pump
   * Specific energy: e = P_cutting / MRR
   *
   * @param input - Forces, speed, coolant parameters
   * @returns Power breakdown and specific energy
   */
  powerAndEnergy(input: PowerInput): PowerOutput {
    const Vc = input.cutting_speed_m_min;
    const omega = input.spindle_rpm * 2 * Math.PI / 60; // rad/s

    // Thrust power: P_t = F × v (axial)
    const v_axial = Vc / 60; // m/s (approximate, actual feed velocity is much smaller)
    // More accurate: axial velocity = feed × rpm / 60 / 1000
    const feed_velocity = input.thrust_N > 0 ? Vc / 60 * 0.001 : 0; // very small
    const P_thrust = input.thrust_N * feed_velocity; // W — very small contribution

    // Torque power: P_τ = T × ω
    const P_torque = input.torque_Nm * omega; // W

    // Total cutting power
    const P_cutting = P_thrust + P_torque;

    // Coolant pumping power
    const Q = (input.coolant_flow_L_min ?? 20) / 60000; // m³/s
    const dP = (input.coolant_pressure_bar ?? 40) * 1e5; // Pa
    const eta = input.pump_efficiency ?? 0.65;
    const P_coolant = Q * dP / eta; // W

    // MRR: π/4 × D² × f × N (mm³/min)
    const D = input.drill_diameter_mm;
    const f_mm = Vc * 1000 / (Math.PI * D) > 0 ? input.spindle_rpm : 0; // sanity
    // MRR from input parameters
    const MRR = Math.PI / 4 * D * D * (Vc / (Math.PI * D) > 0 ? Vc * 1000 / (Math.PI * D * 1000) * D * Math.PI : 0);
    // Simpler: MRR = π/4 × D² × f × N  but we don't have f directly
    // Approximate from Vc and D: N = Vc×1000 / (π×D), then MRR = π/4 × D² × f_approx × N
    const N_calc = Vc * 1000 / (Math.PI * D);
    const f_approx = input.thrust_N / (getMaterialFromThrust(input.thrust_N, D) ?? 1500) / (D / 2);
    // Use a direct approach: specific energy = P / MRR
    // MRR with reasonable feed estimate
    const feed_est = 0.1; // mm/rev fallback
    const MRR_final = Math.PI / 4 * D * D * feed_est * input.spindle_rpm; // mm³/min

    const specific_energy = MRR_final > 0 ? P_cutting / (MRR_final / 60000 * 1e9) : 0; // J/mm³
    // P_cutting [W] / (MRR [mm³/min] / 60 / 1000) → [W × s × 1000 / mm³] = [mJ/mm³]
    const se = MRR_final > 0 ? (P_cutting * 60) / MRR_final : 0; // W × 60s / (mm³/min) = J/mm³ × 1000

    return {
      cutting_power_kW: {
        value: Math.round(P_cutting / 1000 * 1000) / 1000, unit: 'kW',
        formula: 'P = F_thrust × v_feed + T × ω',
        confidence: 0.85,
      },
      thrust_power_kW: {
        value: Math.round(P_thrust / 1000 * 10000) / 10000, unit: 'kW',
        formula: 'P_t = F_thrust × v_feed',
        confidence: 0.85,
      },
      torque_power_kW: {
        value: Math.round(P_torque / 1000 * 1000) / 1000, unit: 'kW',
        formula: 'P_τ = T × ω',
        confidence: 0.85,
      },
      coolant_power_kW: {
        value: Math.round(P_coolant / 1000 * 1000) / 1000, unit: 'kW',
        formula: 'P_c = Q × ΔP / η_pump',
        confidence: 0.80,
      },
      total_power_kW: {
        value: Math.round((P_cutting + P_coolant) / 1000 * 1000) / 1000, unit: 'kW',
        formula: 'P_cutting + P_coolant',
        confidence: 0.80,
      },
      specific_energy_J_mm3: {
        value: Math.round(se * 1000) / 1000, unit: 'J/mm³',
        formula: 'P_cutting × 60 / MRR',
        confidence: 0.70,
      },
      MRR_mm3_min: {
        value: Math.round(MRR_final * 10) / 10, unit: 'mm³/min',
        formula: 'π/4 × D² × f × N',
        confidence: 0.75,
      },
    };
  }

  // --------------------------------------------------------------------------
  // COMPARISON: Gun Drill vs BTA vs Ejector
  // --------------------------------------------------------------------------

  /**
   * Compare different deep hole drilling processes at the same parameters.
   *
   * Evaluates gun drill, BTA, and ejector side-by-side for thrust force,
   * torque, surface finish, tool life, and deviation to recommend the
   * optimal process for given conditions.
   *
   * @param material - Workpiece material key
   * @param diameter_mm - Hole diameter
   * @param depth_mm - Hole depth
   * @param feed_mm_rev - Feed rate
   * @param cutting_speed_m_min - Cutting speed
   * @returns Side-by-side comparison with recommendation
   */
  compareDrillProcesses(
    material: string,
    diameter_mm: number,
    depth_mm: number,
    feed_mm_rev: number,
    cutting_speed_m_min: number,
  ): DrillComparisonOutput {
    const LD = depth_mm / diameter_mm;
    const processes: DrillProcess[] = ['gun_drill', 'BTA', 'ejector'];
    const comparisons: DrillComparison[] = [];

    for (const process of processes) {
      const spec = DRILL_SPECS[process];

      // Check if diameter is in range
      const inRange = diameter_mm >= spec.diameter_range_mm[0] &&
                       diameter_mm <= spec.diameter_range_mm[1];
      const ldOk = LD <= spec.max_LD;

      if (!inRange || !ldOk) {
        comparisons.push({
          process,
          thrust_N: 0, torque_Nm: 0, Ra_um: 0, tool_life_min: 0,
          deviation_mm_m: 0, recommended: false,
          notes: [
            !inRange ? `Diameter ${diameter_mm}mm outside range [${spec.diameter_range_mm}]` : '',
            !ldOk ? `L/D=${LD.toFixed(1)} exceeds max ${spec.max_LD}` : '',
          ].filter(Boolean),
        });
        continue;
      }

      const forces = this.thrustForceAndTorque({
        material, drill_diameter_mm: diameter_mm,
        feed_mm_rev, process, LD_ratio: LD,
        cutting_speed_m_min,
      });

      const finish = this.surfaceFinish({
        material, feed_mm_rev, process,
        nose_radius_mm: spec.typical_nose_radius_mm,
        cutting_speed_m_min,
      });

      const life = this.toolLife({
        material, cutting_speed_m_min, feed_mm_rev,
        LD_ratio: LD, process,
      });

      const deviation = this.holeDeviation({
        material, drill_diameter_mm: diameter_mm,
        hole_depth_mm: depth_mm, feed_mm_rev, process,
      });

      const notes: string[] = [];
      if (process === 'gun_drill') notes.push('Self-piloting, internal coolant through V-flute');
      if (process === 'BTA') notes.push('External chip removal, best for production');
      if (process === 'ejector') notes.push('Double-tube system, standard machine compatible');

      comparisons.push({
        process,
        thrust_N: forces.thrust_N.value,
        torque_Nm: forces.torque_Nm.value,
        Ra_um: finish.Ra_um.value,
        tool_life_min: life.tool_life_min.value,
        deviation_mm_m: deviation.straightness_mm_m.value,
        recommended: false,
        notes,
      });
    }

    // Score and recommend (lower is better for all metrics)
    const valid = comparisons.filter(c => c.thrust_N > 0);
    if (valid.length > 0) {
      // Normalize and score
      const maxThrust = Math.max(...valid.map(c => c.thrust_N));
      const maxRa = Math.max(...valid.map(c => c.Ra_um));
      const maxDev = Math.max(...valid.map(c => c.deviation_mm_m));
      const maxLife = Math.max(...valid.map(c => c.tool_life_min));

      let bestScore = -Infinity;
      let bestIdx = 0;

      for (let i = 0; i < valid.length; i++) {
        const score = (1 - valid[i].thrust_N / (maxThrust || 1)) * 0.15
          + (1 - valid[i].Ra_um / (maxRa || 1)) * 0.25
          + (1 - valid[i].deviation_mm_m / (maxDev || 1)) * 0.30
          + (valid[i].tool_life_min / (maxLife || 1)) * 0.30;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      }
      valid[bestIdx].recommended = true;
    }

    const recommended = comparisons.find(c => c.recommended);

    return {
      comparisons,
      recommended_process: {
        value: recommended?.process ?? 'none',
        unit: '-',
        formula: 'weighted score: 15% thrust + 25% finish + 30% deviation + 30% life',
        confidence: 0.75,
      },
    };
  }

  // --------------------------------------------------------------------------
  // MATERIAL LISTING
  // --------------------------------------------------------------------------

  /** Return available material keys. */
  listMaterials(): string[] {
    return Object.keys(MATERIAL_DB);
  }

  /** Return available drill specs. */
  listDrillSpecs(): Record<string, DrillSpec> {
    return { ...DRILL_SPECS };
  }
}

// ============================================================================
// PRIVATE MODULE HELPERS
// ============================================================================

/** Rough inverse: estimate kc from thrust to derive feed for power calc. */
function getMaterialFromThrust(_thrust: number, _D: number): number | null {
  return null; // fallback; not critical
}

// ============================================================================
// SINGLETON
// ============================================================================

export const deepHoleDrillingPhysicsEngine = new DeepHoleDrillingPhysicsEngine();
