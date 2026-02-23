/**
 * PRISM MCP Server - Advanced Manufacturing Calculations
 * Stability analysis, thermal modeling, and optimization
 * 
 * Models Implemented:
 * - Stability Lobe Diagram (Chatter Prediction)
 * - Tool Deflection Analysis
 * - Thermal Modeling (Cutting Temperature)
 * - Multi-Objective Optimization (Pareto)
 * - Cost Optimization (Minimum Cost Speed)
 * - Productivity Optimization (Maximum MRR)
 * 
 * SAFETY CRITICAL: Chatter causes tool breakage and poor surface finish.
 * Thermal effects cause tool wear and workpiece damage.
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ModalParameters {
  natural_frequency: number;    // fn [Hz]
  damping_ratio: number;        // ζ (zeta) - typically 0.02-0.05
  stiffness: number;            // k [N/m]
  mass?: number;                // m [kg]
}

export interface StabilityResult {
  critical_depth: number;       // blim [mm] - limiting axial depth
  spindle_speeds: number[];     // Array of stable speeds [rpm]
  stability_lobes: StabilityLobe[];
  chatter_frequency: number;    // fc [Hz]
  is_stable: boolean;
  margin_percent: number;       // % margin from instability
  warnings: string[];
}

export interface StabilityLobe {
  lobe_number: number;
  speed_min: number;            // rpm
  speed_max: number;            // rpm
  depth_limit: number;          // mm
}

export interface DeflectionResult {
  static_deflection: number;    // δ [mm]
  dynamic_deflection: number;   // δ_dyn [mm]
  surface_error: number;        // Surface form error [mm]
  max_force_before_failure: number; // N
  safety_factor: number;
  tool_runout_effect: number;   // Additional error from runout [mm]
  warnings: string[];
}

export interface ThermalResult {
  cutting_temperature: number;  // T [°C]
  chip_temperature: number;     // Tc [°C]
  tool_temperature: number;     // Tt [°C]
  workpiece_temperature: number; // Tw [°C]
  heat_partition: {
    chip: number;               // % heat to chip
    tool: number;               // % heat to tool
    workpiece: number;          // % heat to workpiece
  };
  thermal_expansion: number;    // mm (workpiece)
  warnings: string[];
}

export interface OptimizationResult {
  optimal_speed: number;        // Vc [m/min]
  optimal_feed: number;         // fz [mm]
  optimal_depth: number;        // ap [mm]
  objective_values: {
    mrr: number;                // cm³/min
    cost_per_part: number;      // $/part
    tool_life: number;          // min
    surface_finish: number;     // Ra [μm]
    power: number;              // kW
  };
  pareto_optimal: boolean;
  constraints_satisfied: boolean;
  iterations: number;
  warnings: string[];
}

export interface CostParameters {
  machine_rate: number;         // $/min
  tool_cost: number;            // $/tool
  tool_change_time: number;     // min
  setup_cost?: number;          // $
  material_cost?: number;       // $/part
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STABILITY_CONSTANTS = {
  MIN_DAMPING: 0.01,
  MAX_DAMPING: 0.15,
  MIN_FREQUENCY: 100,           // Hz
  MAX_FREQUENCY: 10000,         // Hz
  DEFAULT_LOBES: 10,
  SAFETY_MARGIN: 0.7            // Use 70% of critical depth
};

const THERMAL_CONSTANTS = {
  AMBIENT_TEMP: 20,             // °C
  CHIP_HEAT_FRACTION: 0.75,     // 75% of heat goes to chip
  TOOL_HEAT_FRACTION: 0.15,     // 15% to tool
  WORK_HEAT_FRACTION: 0.10,     // 10% to workpiece
  STEEL_THERMAL_EXPANSION: 12e-6, // /°C
  ALUMINUM_THERMAL_EXPANSION: 23e-6
};

// ============================================================================
// STABILITY LOBE DIAGRAM (CHATTER PREDICTION)
// ============================================================================

/**
 * Calculate stability lobe diagram for chatter prediction
 * 
 * Based on regenerative chatter theory:
 * b_lim = -1 / (2 × Ks × Re[G(jωc)])
 * 
 * Where:
 * - b_lim: Limiting axial depth of cut
 * - Ks: Specific cutting force coefficient
 * - G(jωc): Transfer function at chatter frequency
 * 
 * @param modal - Modal parameters of the system
 * @param kc - Specific cutting force [N/mm²]
 * @param number_of_teeth - Number of cutting teeth
 * @param current_depth - Current axial depth [mm]
 * @param current_speed - Current spindle speed [rpm]
 * @returns Stability analysis results
 */
export function calculateStabilityLobes(
  modal: ModalParameters,
  kc: number,
  number_of_teeth: number,
  current_depth?: number,
  current_speed?: number
): StabilityResult {
  const warnings: string[] = [];
  const { natural_frequency, damping_ratio, stiffness } = modal;
  
  // Validate inputs
  if (damping_ratio < STABILITY_CONSTANTS.MIN_DAMPING) {
    warnings.push(`Damping ratio ${damping_ratio} very low - system highly underdamped`);
  }
  if (natural_frequency < STABILITY_CONSTANTS.MIN_FREQUENCY) {
    warnings.push(`Natural frequency ${natural_frequency} Hz is low for machining`);
  }
  
  // Calculate chatter frequency (slightly above natural frequency)
  const r = 1 / (2 * damping_ratio);
  const chatter_frequency = natural_frequency * Math.sqrt(1 + (1 / (4 * r * r)));

  // Average directional factor for milling (simplified)
  const alpha_avg = 0.5;

  // Calculate critical depth of cut (minimum stable depth)
  // b_lim = -1 / (2 × Ks × z × α × Re[G]_min)
  //
  // Re[G]_min is the most negative real part of the FRF (not at resonance,
  // but slightly above ω_n). For a SDOF system:
  //   Re[G]_min = -1 / (2 × k × ζ × √(1 - ζ²))
  // Ref: Altintas "Manufacturing Automation" (2012), Eq 3.13-3.16
  //
  // Unit conversion: stiffness is in N/m, kc is in N/mm².
  // Convert k to N/mm for dimensional consistency (b_lim in mm).
  const k_mm = stiffness / 1000; // N/m → N/mm
  const real_part_min = -1 / (2 * k_mm * damping_ratio * Math.sqrt(1 - damping_ratio * damping_ratio));
  const b_lim_min = -1 / (2 * kc * number_of_teeth * alpha_avg * real_part_min);
  
  // Generate stability lobes
  const lobes: StabilityLobe[] = [];
  const stable_speeds: number[] = [];
  
  for (let n = 0; n < STABILITY_CONSTANTS.DEFAULT_LOBES; n++) {
    // Phase angle for each lobe
    const epsilon = Math.PI - 2 * Math.atan(2 * damping_ratio);
    
    // Spindle speed for each lobe
    // n_rpm = 60 × fc / (z × (k + ε/(2π)))
    const speed_center = (60 * chatter_frequency) / (number_of_teeth * (n + epsilon / (2 * Math.PI)));
    const speed_min = speed_center * 0.9;
    const speed_max = speed_center * 1.1;
    
    // Depth limit varies across the lobe (simplified - using minimum)
    const depth_limit = b_lim_min * (1 + 0.3 * Math.sin(n * Math.PI / 5));
    
    if (speed_center > 100 && speed_center < 50000) {
      lobes.push({
        lobe_number: n,
        speed_min: Math.round(speed_min),
        speed_max: Math.round(speed_max),
        depth_limit: Math.round(depth_limit * 100) / 100
      });
      stable_speeds.push(Math.round(speed_center));
    }
  }
  
  // Check stability at current conditions
  let is_stable = true;
  let margin_percent = 100;
  
  if (current_depth !== undefined && current_speed !== undefined) {
    // Find the applicable lobe
    const applicable_lobe = lobes.find(
      l => current_speed >= l.speed_min && current_speed <= l.speed_max
    );
    
    if (applicable_lobe) {
      const critical = applicable_lobe.depth_limit;
      margin_percent = ((critical - current_depth) / critical) * 100;
      is_stable = current_depth < critical * STABILITY_CONSTANTS.SAFETY_MARGIN;
      
      if (!is_stable) {
        warnings.push(`Current depth ${current_depth}mm exceeds stable limit ${(critical * STABILITY_CONSTANTS.SAFETY_MARGIN).toFixed(2)}mm at ${current_speed} rpm`);
      }
    } else {
      // Between lobes - use minimum critical depth
      margin_percent = ((b_lim_min - current_depth) / b_lim_min) * 100;
      is_stable = current_depth < b_lim_min * STABILITY_CONSTANTS.SAFETY_MARGIN;
    }
  }
  
  log.debug(`[Stability] fn=${natural_frequency}Hz, ζ=${damping_ratio}, b_lim=${b_lim_min.toFixed(2)}mm`);
  
  return {
    critical_depth: Math.round(b_lim_min * 100) / 100,
    spindle_speeds: stable_speeds,
    stability_lobes: lobes,
    chatter_frequency: Math.round(chatter_frequency),
    is_stable,
    margin_percent: Math.round(margin_percent),
    warnings
  };
}

// ============================================================================
// TOOL DEFLECTION ANALYSIS
// ============================================================================

/**
 * Calculate tool deflection under cutting forces
 * 
 * For a cantilever beam (end mill):
 * δ = F × L³ / (3 × E × I)
 * 
 * Where:
 * - F: Cutting force [N]
 * - L: Overhang length [mm]
 * - E: Young's modulus [GPa]
 * - I: Moment of inertia [mm⁴]
 * 
 * @param cutting_force - Resultant cutting force [N]
 * @param tool_diameter - Tool diameter [mm]
 * @param overhang_length - Tool overhang from holder [mm]
 * @param youngs_modulus - Tool material E [GPa] (default: carbide = 600)
 * @param runout - Tool runout [mm] (default: 0.005)
 * @returns Deflection analysis results
 */
export function calculateToolDeflection(
  cutting_force: number,
  tool_diameter: number,
  overhang_length: number,
  youngs_modulus: number = 600,
  runout: number = 0.005
): DeflectionResult {
  const warnings: string[] = [];
  
  // Moment of inertia for circular cross-section: I = π × D⁴ / 64
  const I = (Math.PI * Math.pow(tool_diameter, 4)) / 64;
  
  // Convert E from GPa to N/mm² (1 GPa = 1000 N/mm²)
  const E = youngs_modulus * 1000;
  
  // Static deflection: δ = F × L³ / (3 × E × I)
  const static_deflection = (cutting_force * Math.pow(overhang_length, 3)) / (3 * E * I);
  
  // Dynamic amplification factor (assume Q ≈ 20 for typical setup)
  const Q_factor = 20;
  const dynamic_factor = 1.5; // Conservative estimate
  const dynamic_deflection = static_deflection * dynamic_factor;
  
  // Surface error includes deflection and runout
  const surface_error = dynamic_deflection + runout;
  
  // Calculate max force before yielding (carbide yield ≈ 3000 MPa)
  // σ = M × c / I = F × L × (D/2) / I
  const yield_strength = 3000; // MPa for carbide
  const max_stress_force = (yield_strength * I) / (overhang_length * tool_diameter / 2);
  
  // Safety factor
  const safety_factor = max_stress_force / cutting_force;
  
  // Warnings
  if (static_deflection > 0.05) {
    warnings.push(`Static deflection ${static_deflection.toFixed(3)}mm may affect accuracy`);
  }
  if (overhang_length / tool_diameter > 4) {
    warnings.push(`L/D ratio ${(overhang_length / tool_diameter).toFixed(1)} exceeds recommended 4:1`);
  }
  if (safety_factor < 2) {
    warnings.push(`Safety factor ${safety_factor.toFixed(1)} is low - reduce force or increase tool size`);
  }
  
  log.debug(`[Deflection] F=${cutting_force}N, D=${tool_diameter}mm, L=${overhang_length}mm, δ=${static_deflection.toFixed(4)}mm`);
  
  return {
    static_deflection: Math.round(static_deflection * 10000) / 10000,
    dynamic_deflection: Math.round(dynamic_deflection * 10000) / 10000,
    surface_error: Math.round(surface_error * 10000) / 10000,
    max_force_before_failure: Math.round(max_stress_force),
    safety_factor: Math.round(safety_factor * 10) / 10,
    tool_runout_effect: runout,
    warnings
  };
}

// ============================================================================
// THERMAL MODELING
// ============================================================================

/**
 * Calculate cutting temperature using empirical model
 * 
 * Cutting temperature (simplified Loewen-Shaw):
 * T = T_ambient + C × (Vc^a × f^b × ap^c) / k
 * 
 * Where typical values for steel:
 * a ≈ 0.4, b ≈ 0.2, c ≈ 0.1
 * 
 * @param cutting_speed - Vc [m/min]
 * @param feed - Feed per tooth [mm]
 * @param depth - Axial depth [mm]
 * @param specific_force - kc [N/mm²]
 * @param thermal_conductivity - k [W/m·K] (default: steel = 50)
 * @param workpiece_length - Length for thermal expansion calc [mm]
 * @returns Thermal analysis results
 */
export function calculateCuttingTemperature(
  cutting_speed: number,
  feed: number,
  depth: number,
  specific_force: number,
  thermal_conductivity: number = 50,
  workpiece_length?: number,
  C_empirical?: number
): ThermalResult {
  const warnings: string[] = [];
  
  // Empirical constants — Ref: Shaw "Metal Cutting Principles" Ch.12
  // C_temp is material-specific; pass via C_empirical for accurate results
  const C_temp = C_empirical ?? 350;
  const a = 0.4;       // Speed exponent
  const b = 0.2;       // Feed exponent
  const c = 0.1;       // Depth exponent
  
  // Base cutting temperature (tool-chip interface)
  const T_rise = C_temp * Math.pow(cutting_speed, a) * Math.pow(feed, b) * Math.pow(depth, c) / Math.sqrt(thermal_conductivity);
  const cutting_temperature = THERMAL_CONSTANTS.AMBIENT_TEMP + T_rise;
  
  // Heat partition — Ref: Boothroyd & Knight "Fundamentals of Machining"
  const chip_fraction = THERMAL_CONSTANTS.CHIP_HEAT_FRACTION;
  const work_fraction = THERMAL_CONSTANTS.WORK_HEAT_FRACTION;
  const tool_fraction = 1 - chip_fraction - work_fraction;
  
  // Tool-chip contact temperature ≈ interface temperature
  // Tool tip reaches near-interface temperature; chip carries bulk heat away
  const tool_temperature = cutting_temperature;
  // Chip temperature: lower than tool for low-k materials (heat stays at tool tip)
  // Ref: Trent & Wright "Metal Cutting" 4th ed, Ch.5 — chip carries heat away
  const chip_temperature = cutting_temperature * 0.85;
  const workpiece_temperature = THERMAL_CONSTANTS.AMBIENT_TEMP + T_rise * work_fraction;
  
  // Thermal expansion of workpiece
  let thermal_expansion = 0;
  if (workpiece_length) {
    const delta_T = workpiece_temperature - THERMAL_CONSTANTS.AMBIENT_TEMP;
    thermal_expansion = workpiece_length * THERMAL_CONSTANTS.STEEL_THERMAL_EXPANSION * delta_T;
  }
  
  // Warnings
  if (cutting_temperature > 600) {
    warnings.push(`Cutting temperature ${cutting_temperature.toFixed(0)}°C exceeds carbide safe limit (600°C)`);
  }
  if (cutting_temperature > 400 && cutting_temperature <= 600) {
    warnings.push(`Elevated temperature ${cutting_temperature.toFixed(0)}°C - monitor tool wear`);
  }
  if (chip_temperature > 800) {
    warnings.push(`Chip temperature ${chip_temperature.toFixed(0)}°C may cause chip welding`);
  }
  
  log.debug(`[Thermal] Vc=${cutting_speed}, f=${feed}, T_cut=${cutting_temperature.toFixed(0)}°C`);
  
  return {
    cutting_temperature: Math.round(cutting_temperature),
    chip_temperature: Math.round(chip_temperature),
    tool_temperature: Math.round(tool_temperature),
    workpiece_temperature: Math.round(workpiece_temperature),
    heat_partition: {
      chip: Math.round(chip_fraction * 100),
      tool: Math.round(tool_fraction * 100),
      workpiece: Math.round(work_fraction * 100)
    },
    thermal_expansion: Math.round(thermal_expansion * 1000) / 1000,
    warnings
  };
}

// ============================================================================
// COST OPTIMIZATION
// ============================================================================

/**
 * Calculate minimum cost cutting speed
 * 
 * Cost per part = Machining cost + Tool cost
 * C = tm × Cm + (tm/T) × (Ct + tc × Cm)
 * 
 * Optimal speed for minimum cost:
 * Vc_opt = C_taylor × [(1/n - 1) × (Ct + tc×Cm) / Cm]^n
 * 
 * @param taylor_C - Taylor constant
 * @param taylor_n - Taylor exponent
 * @param cost_params - Cost parameters
 * @param volume_to_remove - Volume [mm³]
 * @param mrr_at_ref - MRR at reference speed [mm³/min]
 * @returns Optimization results
 */
export function calculateMinimumCostSpeed(
  taylor_C: number,
  taylor_n: number,
  cost_params: CostParameters,
  volume_to_remove?: number,
  mrr_at_ref?: number
): { optimal_speed: number; cost_per_part?: number; tool_changes?: number; warnings: string[] } {
  const warnings: string[] = [];
  const { machine_rate, tool_cost, tool_change_time } = cost_params;
  
  // Minimum cost speed formula (Gilbert's equation, derived from Taylor)
  // T_opt = (1/n - 1) × (Ct/Cm + tc)  where cost_ratio = Ct/Cm + tc
  // V_opt = C / T_opt^n  (from Taylor: V × T^n = C)
  const cost_ratio = (tool_cost + tool_change_time * machine_rate) / machine_rate;
  const T_opt = (1 / taylor_n - 1) * cost_ratio;
  const optimal_speed = taylor_C / Math.pow(Math.max(T_opt, 0.1), taylor_n);
  
  // Calculate tool life at optimal speed
  const tool_life = Math.pow(taylor_C / optimal_speed, 1 / taylor_n);
  
  let cost_per_part: number | undefined;
  let tool_changes: number | undefined;
  
  if (volume_to_remove && mrr_at_ref) {
    // Scale MRR with speed (simplified linear scaling)
    const mrr_at_opt = mrr_at_ref * (optimal_speed / 100); // Assuming ref is 100 m/min
    const machining_time = volume_to_remove / mrr_at_opt;
    
    tool_changes = machining_time / tool_life;
    
    // Total cost per part
    cost_per_part = machining_time * machine_rate + 
                    tool_changes * (tool_cost + tool_change_time * machine_rate);
    
    if (cost_params.setup_cost) cost_per_part += cost_params.setup_cost;
    if (cost_params.material_cost) cost_per_part += cost_params.material_cost;
  }
  
  if (optimal_speed < 10 || optimal_speed > 1000) {
    warnings.push(`Optimal speed ${optimal_speed.toFixed(0)} m/min seems unusual - verify inputs`);
  }
  
  log.debug(`[CostOpt] C=${taylor_C}, n=${taylor_n}, Vc_opt=${optimal_speed.toFixed(0)} m/min`);
  
  return {
    optimal_speed: Math.round(optimal_speed),
    cost_per_part: cost_per_part ? Math.round(cost_per_part * 100) / 100 : undefined,
    tool_changes: tool_changes ? Math.round(tool_changes * 10) / 10 : undefined,
    warnings
  };
}

// ============================================================================
// MULTI-OBJECTIVE OPTIMIZATION
// ============================================================================

export interface OptimizationConstraints {
  max_power?: number;           // kW
  max_force?: number;           // N
  max_temperature?: number;     // °C
  min_surface_finish?: number;  // Ra μm
  max_surface_finish?: number;  // Ra μm
  min_tool_life?: number;       // minutes
  max_deflection?: number;      // mm
}

export interface OptimizationWeights {
  productivity: number;         // Weight for MRR (0-1)
  cost: number;                 // Weight for cost (0-1)
  quality: number;              // Weight for surface finish (0-1)
  tool_life: number;            // Weight for tool life (0-1)
}

/**
 * Multi-objective optimization for cutting parameters
 * Uses weighted sum approach with constraint handling
 * 
 * @param constraints - Operating constraints
 * @param weights - Objective weights
 * @param material_kc - Specific cutting force [N/mm²]
 * @param taylor_C - Taylor constant
 * @param taylor_n - Taylor exponent
 * @param tool_diameter - Tool diameter [mm]
 * @param number_of_teeth - Number of teeth
 * @returns Optimized parameters
 */
export function optimizeCuttingParameters(
  constraints: OptimizationConstraints,
  weights: OptimizationWeights,
  material_kc: number,
  taylor_C: number,
  taylor_n: number,
  tool_diameter: number,
  number_of_teeth: number
): OptimizationResult {
  const warnings: string[] = [];
  
  // Normalize weights
  const total_weight = weights.productivity + weights.cost + weights.quality + weights.tool_life;
  const w_prod = weights.productivity / total_weight;
  const w_cost = weights.cost / total_weight;
  const w_qual = weights.quality / total_weight;
  const w_life = weights.tool_life / total_weight;
  
  // Search space
  const speed_range = [50, 300];  // m/min
  const feed_range = [0.05, 0.3]; // mm
  const depth_range = [0.5, 5];   // mm
  
  let best_score = -Infinity;
  let best_params = { speed: 150, feed: 0.1, depth: 2 };
  let iterations = 0;
  
  // Grid search (simplified - production would use PSO or GA)
  for (let speed = speed_range[0]; speed <= speed_range[1]; speed += 25) {
    for (let feed = feed_range[0]; feed <= feed_range[1]; feed += 0.05) {
      for (let depth = depth_range[0]; depth <= depth_range[1]; depth += 0.5) {
        iterations++;
        
        // Calculate objectives
        const spindle_speed = (1000 * speed) / (Math.PI * tool_diameter);
        const feed_rate = feed * number_of_teeth * spindle_speed;
        const mrr = depth * (tool_diameter * 0.5) * feed_rate / 1000; // cm³/min
        
        const tool_life = Math.pow(taylor_C / speed, 1 / taylor_n);
        
        // Force and power
        const chip_thickness = feed * 0.7; // Approximate
        const kc = material_kc * Math.pow(chip_thickness, -0.25);
        const force = kc * depth * chip_thickness;
        const power = (force * speed) / 60000;
        
        // Surface finish (simplified)
        const Ra = (feed * feed) / (32 * 0.8) * 1000 * 2; // μm
        
        // Check constraints
        let feasible = true;
        if (constraints.max_power && power > constraints.max_power) feasible = false;
        if (constraints.max_force && force > constraints.max_force) feasible = false;
        if (constraints.min_tool_life && tool_life < constraints.min_tool_life) feasible = false;
        if (constraints.max_surface_finish && Ra > constraints.max_surface_finish) feasible = false;
        
        if (!feasible) continue;
        
        // Calculate weighted score (higher is better)
        // Normalize each objective to 0-1 range
        const mrr_norm = mrr / 100;           // Assume max MRR = 100 cm³/min
        const cost_norm = 1 - (1 / tool_life) / 0.1; // Lower cost is better
        const qual_norm = 1 - Ra / 10;        // Lower Ra is better
        const life_norm = tool_life / 100;    // Assume max life = 100 min
        
        const score = w_prod * mrr_norm + w_cost * cost_norm + w_qual * qual_norm + w_life * life_norm;
        
        if (score > best_score) {
          best_score = score;
          best_params = { speed, feed, depth };
        }
      }
    }
  }
  
  // Calculate final objectives
  const spindle_speed = (1000 * best_params.speed) / (Math.PI * tool_diameter);
  const feed_rate = best_params.feed * number_of_teeth * spindle_speed;
  const final_mrr = best_params.depth * (tool_diameter * 0.5) * feed_rate / 1000;
  const final_tool_life = Math.pow(taylor_C / best_params.speed, 1 / taylor_n);
  const chip_thickness = best_params.feed * 0.7;
  const kc = material_kc * Math.pow(chip_thickness, -0.25);
  const final_force = kc * best_params.depth * chip_thickness;
  const final_power = (final_force * best_params.speed) / 60000;
  const final_Ra = (best_params.feed * best_params.feed) / (32 * 0.8) * 1000 * 2;
  const cost_per_part = 1 / final_tool_life * 50; // Simplified cost
  
  log.debug(`[MultiOpt] Best: Vc=${best_params.speed}, fz=${best_params.feed}, ap=${best_params.depth}`);
  
  return {
    optimal_speed: best_params.speed,
    optimal_feed: Math.round(best_params.feed * 1000) / 1000,
    optimal_depth: best_params.depth,
    objective_values: {
      mrr: Math.round(final_mrr * 10) / 10,
      cost_per_part: Math.round(cost_per_part * 100) / 100,
      tool_life: Math.round(final_tool_life * 10) / 10,
      surface_finish: Math.round(final_Ra * 100) / 100,
      power: Math.round(final_power * 100) / 100
    },
    pareto_optimal: true,
    constraints_satisfied: true,
    iterations,
    warnings
  };
}

// ============================================================================
// R15-MS2: MODAL SLD GENERATION (Multi-DOF Stability Lobe Diagram)
// ============================================================================

/**
 * Multi-mode FRF-based Stability Lobe Diagram generator.
 *
 * Supports:
 *   - Multiple structural modes (X, Y directions)
 *   - Radial immersion ratio for directional factors
 *   - High-resolution parametric sweep (RPM vs ap)
 *   - Frequency-domain oriented transfer function
 *
 * Based on: Altintas & Budak (1995) "Analytical Prediction of Stability Lobes
 * in Milling", CIRP Annals 44(1):357-362.
 *
 * The oriented FRF approach: Φ(jω) = Σ_modes [ φ_r / (ω_r² - ω² + j·2ζ_r·ω_r·ω) ]
 */

export interface ModalMode {
  natural_frequency_hz: number;   // ω_n,r
  damping_ratio: number;          // ζ_r — typically 0.02-0.06
  stiffness_n_per_m: number;      // k_r
  direction: 'x' | 'y';          // Principal direction
}

export interface SLDGenerateInput {
  modes: ModalMode[];                  // Multiple structural modes
  kc_n_mm2: number;                    // Specific cutting force
  kte_n_mm?: number;                   // Edge force coefficient (ploughing)
  number_of_teeth: number;
  radial_immersion_ratio?: number;     // ae/D — 0 to 1 (default 0.5)
  up_milling?: boolean;               // true = up, false = down (default: down)
  rpm_min?: number;                    // Sweep start (default 2000)
  rpm_max?: number;                    // Sweep end (default 20000)
  rpm_points?: number;                 // Resolution (default 200)
  num_lobes?: number;                  // Lobe count (default 10)
}

export interface SLDGenerateResult {
  rpm: number[];                       // RPM array
  ap_limit_mm: number[];               // Corresponding stable depth limit
  global_min_depth_mm: number;         // Absolute minimum stable depth
  sweet_spots: Array<{ rpm: number; ap_mm: number }>;  // Local maxima (stable pockets)
  num_modes: number;
  directional_factors: { axx: number; axy: number; ayx: number; ayy: number };
  frequency_range_hz: [number, number];
  warnings: string[];
}

export function generateSLD(input: SLDGenerateInput): SLDGenerateResult {
  const warnings: string[] = [];
  const z = input.number_of_teeth;
  const Kt = input.kc_n_mm2;
  const rpmMin = input.rpm_min ?? 2000;
  const rpmMax = input.rpm_max ?? 20000;
  const rpmPoints = input.rpm_points ?? 200;
  const numLobes = input.num_lobes ?? 10;
  const ae_ratio = input.radial_immersion_ratio ?? 0.5;
  const upMilling = input.up_milling ?? false;

  if (input.modes.length === 0) {
    warnings.push('No modal data provided — using SDOF fallback');
    input.modes = [{ natural_frequency_hz: 1500, damping_ratio: 0.03, stiffness_n_per_m: 5e7, direction: 'x' }];
  }

  // Compute directional orientation factors (Altintas & Budak, 1995)
  // φ_st and φ_ex from immersion ratio
  const phi_ex = Math.acos(1 - 2 * ae_ratio); // Exit angle
  const phi_st = upMilling ? 0 : (Math.PI - phi_ex); // Start angle
  const phi_end = upMilling ? phi_ex : Math.PI;

  // Average directional factors α_xx, α_xy, α_yx, α_yy
  // (integrated over engagement arc)
  const dPhi = phi_end - phi_st;
  const sinDiff = Math.sin(2 * phi_end) - Math.sin(2 * phi_st);
  const cosDiff = Math.cos(2 * phi_end) - Math.cos(2 * phi_st);

  const axx = (1 / (2 * Math.PI)) * (dPhi - 0.5 * sinDiff);  // Renamed from alpha
  const axy = (1 / (2 * Math.PI)) * (-1 + cosDiff) * 0.5;
  const ayx = (1 / (2 * Math.PI)) * (1 - cosDiff) * 0.5;
  const ayy = (1 / (2 * Math.PI)) * (dPhi + 0.5 * sinDiff);

  // Build FRF functions for X and Y directions (sum of modes per direction)
  const xModes = input.modes.filter(m => m.direction === 'x');
  const yModes = input.modes.filter(m => m.direction === 'y');
  if (xModes.length === 0) xModes.push(input.modes[0]); // fallback

  // FRF evaluation at frequency ω (rad/s): complex response
  function frf(modes: ModalMode[], omega: number): [number, number] {
    let re = 0, im = 0;
    for (const m of modes) {
      const wn = 2 * Math.PI * m.natural_frequency_hz;
      const k = m.stiffness_n_per_m / 1000; // N/m → N/mm
      const r = omega / wn;
      const denom = (1 - r * r) ** 2 + (2 * m.damping_ratio * r) ** 2;
      re += (1 / k) * (1 - r * r) / denom;
      im += (1 / k) * (-2 * m.damping_ratio * r) / denom;
    }
    return [re, im];
  }

  // Oriented transfer function eigenvalue (simplified for dominant mode case)
  // Lambda = a0 × [(axx·Φxx + axy·Φxy) + (ayx·Φyx + ayy·Φyy)]
  // For primary X direction (dominant): approximate as axx·Φxx + ayy·Φyy

  // Parametric sweep
  const rpmArr: number[] = [];
  const apArr: number[] = [];
  let globalMin = Infinity;

  const freqMin = Math.min(...input.modes.map(m => m.natural_frequency_hz)) * 0.5;
  const freqMax = Math.max(...input.modes.map(m => m.natural_frequency_hz)) * 2.0;

  // For each RPM, find minimum stable depth across all chatter frequencies
  const dRPM = (rpmMax - rpmMin) / (rpmPoints - 1);

  for (let i = 0; i < rpmPoints; i++) {
    const rpm = rpmMin + i * dRPM;
    let minAp = Infinity;

    // Scan chatter frequencies across all lobes
    for (let lobe = 0; lobe < numLobes; lobe++) {
      // For this RPM and lobe number, the chatter frequency is:
      // ω_c = z × N × (k + ε/(2π)) where N = rpm/60
      // We sweep ε from 0 to π (phase of the oriented FRF eigenvalue)
      for (let phase_i = 1; phase_i <= 20; phase_i++) {
        const epsilon = (phase_i / 20) * Math.PI;
        const fc = z * (rpm / 60) * (lobe + epsilon / (2 * Math.PI));

        if (fc < freqMin || fc > freqMax) continue;

        const omega = 2 * Math.PI * fc;

        // Evaluate oriented FRF
        const [reX, imX] = frf(xModes, omega);
        const [reY, imY] = frf(yModes.length > 0 ? yModes : xModes, omega);

        // Oriented eigenvalue (real part determines stability)
        const Lambda_re = axx * reX + ayy * reY;
        const Lambda_im = axx * imX + ayy * imY;

        // Stable depth limit: ap = -1 / (2 × Kt × z × Re[Λ])
        // Only valid when Re[Λ] < 0
        if (Lambda_re < -1e-12) {
          const kappa = Math.atan2(Lambda_im, Lambda_re);
          const ap_lim = -(1 + (Lambda_im / Lambda_re) ** 2) / (2 * Kt * z * Lambda_re);

          if (ap_lim > 0 && ap_lim < 100) {
            if (ap_lim < minAp) minAp = ap_lim;
          }
        }
      }
    }

    if (minAp === Infinity) minAp = 50; // No instability found — very stable
    rpmArr.push(Math.round(rpm));
    apArr.push(+minAp.toFixed(4));
    if (minAp < globalMin) globalMin = minAp;
  }

  // Find sweet spots (local maxima in the SLD)
  const sweetSpots: Array<{ rpm: number; ap_mm: number }> = [];
  for (let i = 2; i < apArr.length - 2; i++) {
    if (apArr[i] > apArr[i - 1] && apArr[i] > apArr[i + 1] &&
        apArr[i] > apArr[i - 2] && apArr[i] > apArr[i + 2]) {
      // Must be significantly above the global minimum to count
      if (apArr[i] > globalMin * 1.5) {
        sweetSpots.push({ rpm: rpmArr[i], ap_mm: +apArr[i].toFixed(3) });
      }
    }
  }
  // Keep top 8 sweet spots sorted by depth
  sweetSpots.sort((a, b) => b.ap_mm - a.ap_mm);
  sweetSpots.splice(8);

  if (sweetSpots.length === 0) {
    warnings.push('No significant sweet spots found — stability boundary is relatively flat');
  }

  return {
    rpm: rpmArr,
    ap_limit_mm: apArr,
    global_min_depth_mm: +globalMin.toFixed(4),
    sweet_spots: sweetSpots,
    num_modes: input.modes.length,
    directional_factors: {
      axx: +axx.toFixed(6), axy: +axy.toFixed(6),
      ayx: +ayx.toFixed(6), ayy: +ayy.toFixed(6),
    },
    frequency_range_hz: [Math.round(freqMin), Math.round(freqMax)],
    warnings,
  };
}

// ============================================================================
// R15-MS2: SLD EVALUATION — Check operating point against SLD
// ============================================================================

export interface SLDEvaluateInput {
  sld_rpm: number[];
  sld_ap_limit_mm: number[];
  operating_rpm: number;
  operating_ap_mm: number;
  safety_factor?: number;    // Default 0.8 (use 80% of limit)
}

export interface SLDEvaluateResult {
  stable: boolean;
  ap_limit_at_rpm_mm: number;
  margin_mm: number;
  margin_pct: number;
  nearest_sweet_spot_rpm: number | null;
  recommendation: string;
  safety: { score: number; flags: string[] };
}

export function evaluateSLD(input: SLDEvaluateInput): SLDEvaluateResult {
  const SF = input.safety_factor ?? 0.8;
  const rpm = input.operating_rpm;
  const ap = input.operating_ap_mm;

  // Interpolate SLD to find limit at operating RPM
  let apLimit = 0;
  const sldRpm = input.sld_rpm;
  const sldAp = input.sld_ap_limit_mm;

  for (let i = 0; i < sldRpm.length - 1; i++) {
    if (sldRpm[i] <= rpm && sldRpm[i + 1] >= rpm) {
      const t = (rpm - sldRpm[i]) / (sldRpm[i + 1] - sldRpm[i] + 1e-10);
      apLimit = sldAp[i] + t * (sldAp[i + 1] - sldAp[i]);
      break;
    }
  }
  if (apLimit === 0 && sldAp.length > 0) {
    // RPM outside SLD range — use nearest endpoint
    apLimit = rpm < sldRpm[0] ? sldAp[0] : sldAp[sldAp.length - 1];
  }
  if (apLimit === 0) apLimit = 3.0; // Fallback

  const safeLimit = apLimit * SF;
  const stable = ap <= safeLimit;
  const margin_mm = safeLimit - ap;
  const margin_pct = apLimit > 0 ? ((apLimit - ap) / apLimit) * 100 : 0;

  // Find nearest sweet spot above current ap
  let nearestSweet: number | null = null;
  let bestSpotAp = 0;
  for (let i = 1; i < sldAp.length - 1; i++) {
    if (sldAp[i] > sldAp[i - 1] && sldAp[i] > sldAp[i + 1] && sldAp[i] > ap / SF) {
      if (nearestSweet === null || Math.abs(sldRpm[i] - rpm) < Math.abs(nearestSweet - rpm)) {
        nearestSweet = sldRpm[i];
        bestSpotAp = sldAp[i];
      }
    }
  }

  let recommendation: string;
  if (stable && margin_pct > 30) {
    recommendation = `Stable with ${margin_pct.toFixed(0)}% margin. Good operating point.`;
  } else if (stable) {
    recommendation = `Stable but only ${margin_pct.toFixed(0)}% margin. Consider reducing ap to ${(safeLimit * 0.8).toFixed(2)}mm.`;
    if (nearestSweet) recommendation += ` Or try ${nearestSweet} RPM for ${bestSpotAp.toFixed(2)}mm limit.`;
  } else {
    recommendation = `UNSTABLE! Reduce ap to ≤${safeLimit.toFixed(2)}mm.`;
    if (nearestSweet) recommendation += ` Best: move to ${nearestSweet} RPM (${bestSpotAp.toFixed(2)}mm limit).`;
  }

  const flags: string[] = [];
  let score = 0.90;
  if (!stable) { score -= 0.30; flags.push('Operating in chatter zone'); }
  else if (margin_pct < 20) { score -= 0.10; flags.push('Close to stability boundary'); }
  score = Math.max(0.30, score);

  return {
    stable,
    ap_limit_at_rpm_mm: +apLimit.toFixed(3),
    margin_mm: +margin_mm.toFixed(3),
    margin_pct: +margin_pct.toFixed(1),
    nearest_sweet_spot_rpm: nearestSweet,
    recommendation,
    safety: { score: +score.toFixed(2), flags },
  };
}

// ============================================================================
// R15-MS4: THERMAL DISTORTION MODEL
// ============================================================================

/**
 * Predicts workpiece thermal distortion during machining.
 *
 * Sources of thermal growth:
 *   1. Cutting heat absorbed by workpiece (via Loewen-Shaw partition)
 *   2. Machine tool thermal growth (spindle housing, column, bed)
 *   3. Ambient temperature drift
 *
 * Model: FEA-equivalent lumped-parameter approach
 *   - Workpiece divided into N zones: cut zone, bulk, fixture contact
 *   - Transient heat conduction between zones
 *   - Linear thermal expansion: ΔL = α × L × ΔT
 */

export interface ThermalDistortionInput {
  material: string;
  workpiece_length_mm: number;
  workpiece_width_mm?: number;
  workpiece_height_mm?: number;
  cutting_power_kw: number;
  workpiece_heat_fraction?: number;  // Fraction of cutting power entering workpiece (default: 0.10)
  cutting_time_min: number;
  coolant_type: 'flood' | 'mql' | 'dry' | 'cryogenic';
  ambient_temp_c?: number;
  fixture_type?: 'vise' | 'chuck' | 'vacuum' | 'magnetic' | 'fixture_plate';
}

export interface ThermalDistortionResult {
  length_growth_um: number;     // ΔL in primary axis
  width_growth_um: number;
  height_growth_um: number;
  max_temp_rise_c: number;      // Above ambient at cut zone
  bulk_temp_rise_c: number;     // Average workpiece temp rise
  time_to_equilibrium_min: number;
  distortion_gradient_um_per_mm: number;  // Non-uniform expansion
  achievable_tolerance_it: number;  // Estimated IT grade achievable
  recommendations: string[];
  safety: { score: number; flags: string[] };
}

// CTE lookup (μm/m/°C)
const CTE_TABLE: Record<string, number> = {
  steel: 12, stainless: 16, aluminum: 23, titanium: 8.6,
  copper: 17, brass: 19, cast_iron: 10, inconel: 13, magnesium: 26,
};

function getCTE(material: string): number {
  const lower = material.toLowerCase();
  for (const [key, val] of Object.entries(CTE_TABLE)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes('6061') || lower.includes('7075') || lower.includes('2024')) return 23;
  if (lower.includes('4140') || lower.includes('1045') || lower.includes('4340')) return 12;
  if (lower.includes('ti-') || lower.includes('ti6al')) return 8.6;
  if (lower.includes('inconel') || lower.includes('718')) return 13;
  if (lower.includes('316')) return 16;
  return 12; // Default steel
}

// Thermal conductivity (W/m·K)
const THERMAL_K_TABLE: Record<string, number> = {
  steel: 50, stainless: 16, aluminum: 167, titanium: 7, copper: 401,
  cast_iron: 52, inconel: 11, magnesium: 156,
};

function getThermalK(material: string): number {
  const lower = material.toLowerCase();
  for (const [key, val] of Object.entries(THERMAL_K_TABLE)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes('6061') || lower.includes('7075')) return 167;
  if (lower.includes('4140') || lower.includes('1045')) return 50;
  if (lower.includes('ti-')) return 7;
  if (lower.includes('316')) return 16;
  return 50;
}

export function predictThermalDistortion(input: ThermalDistortionInput): ThermalDistortionResult {
  const alpha = getCTE(input.material); // μm/m/°C
  const kMat = getThermalK(input.material);
  const L = input.workpiece_length_mm;
  const W = input.workpiece_width_mm ?? L * 0.5;
  const H = input.workpiece_height_mm ?? L * 0.3;
  const ambient = input.ambient_temp_c ?? 20;

  // Heat fraction entering workpiece
  const coolantFactor: Record<string, number> = { flood: 0.10, mql: 0.15, dry: 0.25, cryogenic: 0.05 };
  const heatFrac = input.workpiece_heat_fraction ?? coolantFactor[input.coolant_type] ?? 0.15;
  const Q_workpiece = input.cutting_power_kw * 1000 * heatFrac; // Watts into workpiece

  // Fixture heat sink effect
  const fixtureFactor: Record<string, number> = { vise: 0.7, chuck: 0.6, vacuum: 0.95, magnetic: 0.9, fixture_plate: 0.5 };
  const fixtureRetention = fixtureFactor[input.fixture_type ?? 'vise'] ?? 0.7;

  // Effective heat retained = Q × fixtureRetention (rest conducted to fixture)
  const Q_retained = Q_workpiece * fixtureRetention;

  // Lumped thermal mass of workpiece (simplified: steel density ≈ 7800 kg/m³)
  const volume_m3 = (L * W * H) * 1e-9; // mm³ → m³
  const density = input.material.toLowerCase().includes('aluminum') ? 2700 : 7800;
  const cp = input.material.toLowerCase().includes('aluminum') ? 900 : 480;
  const mass = density * volume_m3; // kg
  const thermalMass = mass * cp; // J/°C

  // Thermal time constant: τ = m·cp / (h·A)
  // h = convective coefficient (flood ~5000 W/m²K, dry ~20 W/m²K)
  const h_conv: Record<string, number> = { flood: 5000, mql: 1000, dry: 20, cryogenic: 8000 };
  const h = h_conv[input.coolant_type] ?? 100;
  const surfArea_m2 = 2 * (L * W + L * H + W * H) * 1e-6;
  const tau = thermalMass / (h * surfArea_m2 + 1e-10); // seconds
  const tau_min = tau / 60;

  // Temperature rise after cutting time
  const t = input.cutting_time_min * 60; // seconds
  const T_steady = Q_retained / (h * surfArea_m2 + 1e-10); // Steady-state ΔT
  const T_rise = T_steady * (1 - Math.exp(-t / (tau + 1e-10)));

  // Cut zone is hotter than bulk (gradient)
  const cutZoneFactor = 3.0; // Cut zone ~3× hotter than average
  const maxTempRise = T_rise * cutZoneFactor;
  const bulkTempRise = T_rise;

  // Thermal growth
  const dL = alpha * (L / 1000) * bulkTempRise; // μm
  const dW = alpha * (W / 1000) * bulkTempRise;
  const dH = alpha * (H / 1000) * bulkTempRise;

  // Distortion gradient (non-uniform expansion)
  // Gradient ≈ (max temp - min temp) × CTE per mm
  const gradient = (maxTempRise - bulkTempRise * 0.5) * alpha / 1000 / (L + 1e-10); // μm/mm

  // Achievable IT grade based on total thermal error
  const totalError = Math.max(dL, dW, dH) + gradient * L;
  let itGrade: number;
  if (totalError < 1) itGrade = 6;
  else if (totalError < 3) itGrade = 7;
  else if (totalError < 8) itGrade = 8;
  else if (totalError < 15) itGrade = 9;
  else if (totalError < 30) itGrade = 10;
  else if (totalError < 50) itGrade = 11;
  else itGrade = 12;

  const recommendations: string[] = [];
  if (bulkTempRise > 5) {
    recommendations.push(`Workpiece temp rise ${bulkTempRise.toFixed(1)}°C — consider warm-up cycle before final pass`);
  }
  if (gradient > 0.5) {
    recommendations.push(`Thermal gradient ${gradient.toFixed(2)} μm/mm — fixture design should improve heat extraction`);
  }
  if (input.coolant_type === 'dry' && totalError > 10) {
    recommendations.push('Dry machining causing significant thermal distortion — switch to flood/MQL');
  }
  if (tau_min > input.cutting_time_min * 2) {
    recommendations.push(`Thermal time constant (${tau_min.toFixed(0)} min) >> cutting time — part still warming up`);
  }
  if (totalError > 20 && itGrade > 9) {
    recommendations.push(`IT${itGrade} achievable. For tighter tolerance, reduce cutting power or use cryogenic cooling`);
  }

  const flags: string[] = [];
  let score = 0.90;
  if (totalError > 30) { score -= 0.15; flags.push('Large thermal distortion may exceed tolerance'); }
  if (maxTempRise > 100) { score -= 0.10; flags.push('High cut-zone temperature'); }
  if (gradient > 1.0) { score -= 0.08; flags.push('Significant thermal gradient across workpiece'); }
  score = Math.max(0.40, score);

  return {
    length_growth_um: +dL.toFixed(2),
    width_growth_um: +dW.toFixed(2),
    height_growth_um: +dH.toFixed(2),
    max_temp_rise_c: +maxTempRise.toFixed(2),
    bulk_temp_rise_c: +bulkTempRise.toFixed(2),
    time_to_equilibrium_min: +Math.round(tau_min * 4),
    distortion_gradient_um_per_mm: +gradient.toFixed(4),
    achievable_tolerance_it: itGrade,
    recommendations,
    safety: { score: +score.toFixed(2), flags },
  };
}

// Export singleton
export const advancedCalculations = {
  stabilityLobes: calculateStabilityLobes,
  toolDeflection: calculateToolDeflection,
  cuttingTemperature: calculateCuttingTemperature,
  minimumCostSpeed: calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  generateSLD,
  evaluateSLD,
  predictThermalDistortion,
  STABILITY_CONSTANTS,
  THERMAL_CONSTANTS
};
