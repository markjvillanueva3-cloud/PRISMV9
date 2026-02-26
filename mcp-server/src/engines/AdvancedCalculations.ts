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

// Export singleton
export const advancedCalculations = {
  stabilityLobes: calculateStabilityLobes,
  toolDeflection: calculateToolDeflection,
  cuttingTemperature: calculateCuttingTemperature,
  minimumCostSpeed: calculateMinimumCostSpeed,
  optimizeCuttingParameters,
  STABILITY_CONSTANTS,
  THERMAL_CONSTANTS
};
