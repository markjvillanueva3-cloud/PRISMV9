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
interface DrillSpec {
    process: DrillProcess;
    diameter_range_mm: [number, number];
    max_LD: number;
    guide_pads: number;
    tube_wall_ratio: number;
    typical_nose_radius_mm: number;
    burnishing_factor: number;
    lateral_force_fraction: number;
    balance_quality: 'high' | 'medium' | 'low';
}
/**
 * DeepHoleDrillingPhysicsEngine provides first-principles physics models
 * for deep hole drilling operations (L/D > 5).
 *
 * Covers BTA, gun drill, ejector, and twist drill pecking processes with
 * Kienzle-based force models, chip evacuation hydraulics, whirl vibration
 * analysis, hole deviation prediction, surface finish, tool life, pecking
 * optimization, and power/energy calculations.
 */
export declare class DeepHoleDrillingPhysicsEngine {
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
    thrustForceAndTorque(input: ThrustForceInput): ThrustForceOutput;
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
    chipEvacuation(input: ChipEvacuationInput): ChipEvacuationOutput;
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
    whirlVibration(input: WhirlVibrationInput): WhirlVibrationOutput;
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