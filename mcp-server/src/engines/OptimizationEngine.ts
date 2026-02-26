/**
 * R7-MS1: Constrained Optimization Engine
 *
 * Multi-objective optimization for machining parameters:
 * - optimize_parameters: Pareto-optimal cutting params (cost/time/quality)
 * - optimize_sequence: Operation ordering via ACO heuristic
 * - sustainability_report: Environmental impact (ISO 14955)
 * - eco_optimize: Sustainability-weighted optimization
 *
 * Formulas: F-SUST-001..013, F-ECON-001..005
 * Source: PRISM_CONSTRAINED_OPTIMIZER, PRISM_MULTI_OBJECTIVE_ENGINE, PRISM_ACO_SEQUENCER
 */

// ============================================================================
// P-MS2 WAVE 2: OPTIMIZATION SOURCE FILE CATALOG
// 25 extracted JS modules from C:\PRISM\extracted\engines\optimization\
// Total: 14,625 lines of optimization algorithms
// ============================================================================

export const OPTIMIZATION_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  category: string;
  lines: number;
  safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  algorithm_type: string;
  consumers: string[];
}> = {
  "PRISM_ACO_SEQUENCER": {
    filename: "PRISM_ACO_SEQUENCER.js",
    category: "sequencing",
    lines: 758,
    safety_class: "CRITICAL",
    description: "Ant Colony Optimization for hole/operation sequencing with tool change and setup change penalties",
    algorithm_type: "ACO",
    consumers: ["OptimizationEngine", "optimizeSequence"]
  },
  "PRISM_ADVANCED_FEED_OPTIMIZER": {
    filename: "PRISM_ADVANCED_FEED_OPTIMIZER.js",
    category: "feed_optimization",
    lines: 66,
    safety_class: "HIGH",
    description: "Chip thinning compensation and advanced feed rate calculations for radial engagement",
    algorithm_type: "Chip Thinning",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_ADVANCED_OPTIMIZATION_ENGINE": {
    filename: "PRISM_ADVANCED_OPTIMIZATION_ENGINE.js",
    category: "constrained",
    lines: 1018,
    safety_class: "HIGH",
    description: "Stability lobe diagram calculator and advanced machining parameter optimization for chatter avoidance",
    algorithm_type: "Stability Lobe Analysis",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER": {
    filename: "PRISM_ADVANCED_UNCONSTRAINED_OPTIMIZER.js",
    category: "unconstrained",
    lines: 1825,
    safety_class: "MEDIUM",
    description: "Advanced unconstrained optimization with L-BFGS, trust region, and steepest descent variants",
    algorithm_type: "L-BFGS / Trust Region / Steepest Descent",
    consumers: ["OptimizationEngine"]
  },
  "PRISM_CALCULATOR_OPTIMIZER": {
    filename: "PRISM_CALCULATOR_OPTIMIZER.js",
    category: "metaheuristic",
    lines: 147,
    safety_class: "HIGH",
    description: "PSO-based cutting parameter calculator with Pareto front support for material/tool/machine combos",
    algorithm_type: "PSO",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_COMBINATORIAL_OPTIMIZER": {
    filename: "PRISM_COMBINATORIAL_OPTIMIZER.js",
    category: "constrained",
    lines: 3938,
    safety_class: "MEDIUM",
    description: "Combinatorial optimization: branch and bound, cutting planes, and dynamic programming for integer programs",
    algorithm_type: "Branch and Bound / Cutting Planes / DP",
    consumers: ["OptimizationEngine", "optimizeSequence"]
  },
  "PRISM_CONSTRAINED_OPTIMIZER": {
    filename: "PRISM_CONSTRAINED_OPTIMIZER.js",
    category: "constrained",
    lines: 484,
    safety_class: "MEDIUM",
    description: "Constrained optimization with penalty methods, barrier functions, and augmented Lagrangian",
    algorithm_type: "Penalty / Barrier / Augmented Lagrangian",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_INTERIOR_POINT_ENGINE": {
    filename: "PRISM_INTERIOR_POINT_ENGINE.js",
    category: "constrained",
    lines: 373,
    safety_class: "MEDIUM",
    description: "Primal-dual interior point method (Mehrotra predictor-corrector) for linear programming",
    algorithm_type: "Interior Point (Mehrotra)",
    consumers: ["OptimizationEngine"]
  },
  "PRISM_MFG_OPTIMIZATION": {
    filename: "PRISM_MFG_OPTIMIZATION.js",
    category: "path_optimization",
    lines: 186,
    safety_class: "CRITICAL",
    description: "Rapid movement path optimization using Christofides algorithm + 2-Opt local search (30-50% reduction)",
    algorithm_type: "Christofides / 2-Opt",
    consumers: ["OptimizationEngine", "optimizeSequence"]
  },
  "PRISM_MFG_OPTIMIZATION_ADVANCED_B": {
    filename: "PRISM_MFG_OPTIMIZATION_ADVANCED_B.js",
    category: "multi_objective",
    lines: 198,
    safety_class: "HIGH",
    description: "Multi-objective cutting parameter optimization with goal programming for MRR, surface finish, tool life",
    algorithm_type: "Goal Programming",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_MOEAD_ENGINE": {
    filename: "PRISM_MOEAD_ENGINE.js",
    category: "multi_objective",
    lines: 425,
    safety_class: "MEDIUM",
    description: "MOEA/D multi-objective evolutionary algorithm with Tchebycheff, weighted sum, and PBI scalarization",
    algorithm_type: "MOEA/D",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_MONTE_CARLO_ENGINE": {
    filename: "PRISM_MONTE_CARLO_ENGINE.js",
    category: "metaheuristic",
    lines: 348,
    safety_class: "MEDIUM",
    description: "Monte Carlo simulation for tool life prediction with Taylor equation uncertainty quantification",
    algorithm_type: "Monte Carlo Simulation",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_MULTI_OBJECTIVE_ENGINE": {
    filename: "PRISM_MULTI_OBJECTIVE_ENGINE.js",
    category: "multi_objective",
    lines: 377,
    safety_class: "MEDIUM",
    description: "Multi-objective optimization with NSGA-II, NSGA-III, and Pareto dominance methods",
    algorithm_type: "NSGA-II / NSGA-III",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_MULTI_OBJECTIVE_OPTIMIZER": {
    filename: "PRISM_MULTI_OBJECTIVE_OPTIMIZER.js",
    category: "multi_objective",
    lines: 300,
    safety_class: "HIGH",
    description: "Multi-objective optimizer with weighted profiles (production, prototype, finish-critical) for machining trade-offs",
    algorithm_type: "Weighted Sum / Pareto",
    consumers: ["OptimizationEngine", "optimizeParameters", "ecoOptimize"]
  },
  "PRISM_PHASE1_OPTIMIZERS": {
    filename: "PRISM_PHASE1_OPTIMIZERS.js",
    category: "metaheuristic",
    lines: 808,
    safety_class: "HIGH",
    description: "Phase 1 PSO speed/feed multi-objective optimization with unit-safe metric internals",
    algorithm_type: "PSO",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_POST_OPTIMIZER": {
    filename: "PRISM_POST_OPTIMIZER.js",
    category: "path_optimization",
    lines: 122,
    safety_class: "CRITICAL",
    description: "Post-processor G-code optimization: redundant move removal, rapid optimization, and code compression",
    algorithm_type: "G-code Motion Optimization",
    consumers: ["OptimizationEngine"]
  },
  "PRISM_RAPID_PATH_OPTIMIZER": {
    filename: "PRISM_RAPID_PATH_OPTIMIZER.js",
    category: "path_optimization",
    lines: 325,
    safety_class: "CRITICAL",
    description: "Rapid movement sequence optimization with retract strategies and linking move planning",
    algorithm_type: "Nearest Neighbor / TSP Heuristic",
    consumers: ["OptimizationEngine", "optimizeSequence"]
  },
  "PRISM_RAPIDS_OPTIMIZER": {
    filename: "PRISM_RAPIDS_OPTIMIZER.js",
    category: "path_optimization",
    lines: 132,
    safety_class: "CRITICAL",
    description: "Rapid move optimization: redundancy removal, consecutive rapid combination, and distance savings",
    algorithm_type: "Rapid Consolidation",
    consumers: ["OptimizationEngine"]
  },
  "PRISM_ROBUST_OPTIMIZATION": {
    filename: "PRISM_ROBUST_OPTIMIZATION.js",
    category: "constrained",
    lines: 256,
    safety_class: "MEDIUM",
    description: "Robust optimization under parameter uncertainty with worst-case, expected value, and CVaR methods",
    algorithm_type: "Robust / Worst-Case / CVaR",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_SQP_INTERIOR_POINT_ENGINE": {
    filename: "PRISM_SQP_INTERIOR_POINT_ENGINE.js",
    category: "constrained",
    lines: 897,
    safety_class: "MEDIUM",
    description: "Sequential quadratic programming and interior point methods for nonlinear constrained optimization",
    algorithm_type: "SQP / Interior Point",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_SWARM_ALGORITHMS": {
    filename: "PRISM_SWARM_ALGORITHMS.js",
    category: "metaheuristic",
    lines: 310,
    safety_class: "HIGH",
    description: "Particle swarm optimization for speed and feed parameter optimization with inertia decay",
    algorithm_type: "PSO",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_SWARM_NEURAL_HYBRID": {
    filename: "PRISM_SWARM_NEURAL_HYBRID.js",
    category: "hybrid",
    lines: 193,
    safety_class: "HIGH",
    description: "Neural network-guided particle swarm optimization for manufacturing parameter tuning",
    algorithm_type: "PSO-Neural Network Hybrid",
    consumers: ["OptimizationEngine", "optimizeParameters"]
  },
  "PRISM_SWARM_TOOLPATH": {
    filename: "PRISM_SWARM_TOOLPATH.js",
    category: "sequencing",
    lines: 237,
    safety_class: "CRITICAL",
    description: "ACO-based CNC toolpath feature sequencing with adaptive pheromone updates",
    algorithm_type: "ACO",
    consumers: ["OptimizationEngine", "optimizeSequence"]
  },
  "PRISM_TRUST_REGION_OPTIMIZER": {
    filename: "PRISM_TRUST_REGION_OPTIMIZER.js",
    category: "constrained",
    lines: 374,
    safety_class: "MEDIUM",
    description: "Trust region methods: Cauchy point, dogleg, and Steihaug-Toint conjugate gradient subproblem solver",
    algorithm_type: "Trust Region (Cauchy / Dogleg / Steihaug-Toint)",
    consumers: ["OptimizationEngine"]
  },
  "PRISM_UNCONSTRAINED_OPTIMIZATION": {
    filename: "PRISM_UNCONSTRAINED_OPTIMIZATION.js",
    category: "unconstrained",
    lines: 528,
    safety_class: "MEDIUM",
    description: "Unconstrained optimization: gradient descent, conjugate gradient, and BFGS quasi-Newton methods",
    algorithm_type: "Gradient Descent / Conjugate Gradient / BFGS",
    consumers: ["OptimizationEngine"]
  }
};

// ============================================================================
// TYPES
// ============================================================================

export type FeatureType = 'pocket' | 'slot' | 'face' | 'contour' | 'hole' | 'thread';
export type ObjectiveType = 'min_cost' | 'min_time' | 'max_tool_life' | 'balanced';
export type SequenceObjective = 'min_tool_changes' | 'min_cycle_time' | 'min_setup_changes';

export interface OptimizeInput {
  material: string;
  feature: FeatureType;
  dimensions: {
    depth_mm: number;
    width_mm?: number;
    length_mm?: number;
    diameter_mm?: number;
  };
  constraints: {
    surface_finish_ra_max_um?: number;
    tolerance_mm?: number;
    max_cycle_time_min?: number;
    max_tool_cost_usd?: number;
    machine?: string;
  };
  objective: ObjectiveType;
  tool_candidates?: string[];
}

interface OptimalSolution {
  vc_mpm: number;
  fz_mm: number;
  ap_mm: number;
  ae_mm: number;
  strategy: string;
  tool: string;
  num_passes: number;
  estimated_cycle_time_min: number;
  estimated_cost_usd: number;
  estimated_tool_life_min: number;
  predicted_ra_um: number;
}

interface SustainabilityMetrics {
  energy_kwh: number;
  co2_kg: number;
  coolant_liters: number;
  chip_waste_kg: number;
  eco_efficiency_score: number;
}

export interface OptimizeResult {
  optimal: OptimalSolution & { sustainability: SustainabilityMetrics };
  alternatives: (OptimalSolution & { sustainability: SustainabilityMetrics })[];
  pareto_front: { cost: number[]; time: number[]; quality: number[] };
  sensitivity: { parameter: string; impact: 'high' | 'medium' | 'low'; recommendation: string }[];
  safety: { score: number; flags: string[] };
}

export interface SequenceInput {
  operations: {
    id: string;
    feature: string;
    tool_required: string;
    estimated_time_min: number;
    setup_constraints?: string[];
  }[];
  machine: string;
  optimize_for: SequenceObjective;
}

export interface SequenceResult {
  optimal_order: string[];
  tool_changes: number;
  estimated_total_min: number;
  savings_vs_input_order: { time_saved_min: number; tool_changes_saved: number };
  safety: { score: number; flags: string[] };
}

export interface SustainabilityInput {
  material: string;
  cutting_speed_mpm: number;
  feed_mmrev: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  cycle_time_min: number;
  machine_power_kw?: number;
  coolant_type?: 'flood' | 'mql' | 'dry' | 'cryogenic';
}

export interface SustainabilityResult {
  energy: { cutting_kwh: number; spindle_kwh: number; auxiliary_kwh: number; total_kwh: number };
  carbon: { direct_co2_kg: number; indirect_co2_kg: number; total_co2_kg: number };
  coolant: { consumption_liters: number; disposal_cost_usd: number };
  waste: { chip_mass_kg: number; recyclable_pct: number; landfill_kg: number };
  eco_efficiency_score: number;
  iso14955_notes: string[];
  comparison_vs_baseline: { energy_pct: number; co2_pct: number; waste_pct: number };
  safety: { score: number; flags: string[] };
}

export interface EcoOptimizeInput extends OptimizeInput {
  weight_eco: number; // 0.0–1.0
}

export interface EcoOptimizeResult extends OptimizeResult {
  eco_weight_applied: number;
  sustainability_improvement_pct: number;
}

// ============================================================================
// MATERIAL DATABASE (machining properties for optimization)
// ============================================================================

interface MatOpt {
  kc1_1: number; mc: number; density: number;
  handbook_vc_min: number; handbook_vc_max: number; // m/min range
  taylor_C: number; taylor_n: number;
  machinability_index: number; // 1.0 = baseline AISI 1045
  energy_factor: number; // kWh per cm³ removed
}

const MAT_DB: Record<string, MatOpt> = {
  'AISI 4140': { kc1_1: 2100, mc: 0.25, density: 7850, handbook_vc_min: 120, handbook_vc_max: 300, taylor_C: 300, taylor_n: 0.25, machinability_index: 0.65, energy_factor: 0.035 },
  'AISI 1045': { kc1_1: 1800, mc: 0.26, density: 7870, handbook_vc_min: 150, handbook_vc_max: 350, taylor_C: 350, taylor_n: 0.25, machinability_index: 1.0, energy_factor: 0.030 },
  '6061-T6':   { kc1_1: 800,  mc: 0.23, density: 2700, handbook_vc_min: 200, handbook_vc_max: 600, taylor_C: 800, taylor_n: 0.40, machinability_index: 4.0, energy_factor: 0.012 },
  '7075-T6':   { kc1_1: 900,  mc: 0.23, density: 2810, handbook_vc_min: 180, handbook_vc_max: 500, taylor_C: 700, taylor_n: 0.35, machinability_index: 3.5, energy_factor: 0.014 },
  'Ti-6Al-4V': { kc1_1: 1700, mc: 0.23, density: 4430, handbook_vc_min: 30,  handbook_vc_max: 90,  taylor_C: 100, taylor_n: 0.20, machinability_index: 0.20, energy_factor: 0.060 },
  'Inconel 718': { kc1_1: 2800, mc: 0.25, density: 8190, handbook_vc_min: 20, handbook_vc_max: 60,  taylor_C: 60,  taylor_n: 0.15, machinability_index: 0.10, energy_factor: 0.080 },
  '316L':      { kc1_1: 2200, mc: 0.25, density: 8000, handbook_vc_min: 100, handbook_vc_max: 250, taylor_C: 180, taylor_n: 0.20, machinability_index: 0.45, energy_factor: 0.040 },
};

function getMatOpt(name: string): MatOpt {
  if (MAT_DB[name]) return MAT_DB[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(MAT_DB))
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return v;
  return MAT_DB['AISI 4140'];
}

function isKnownMaterial(name: string): boolean {
  if (MAT_DB[name]) return true;
  const lower = name.toLowerCase();
  for (const k of Object.keys(MAT_DB))
    if (lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)) return true;
  return false;
}

// ============================================================================
// COST MODEL
// ============================================================================

const MACHINE_RATE_PER_MIN = 1.50; // $/min (average CNC)
const SETUP_COST_PER_CHANGE = 5.00; // $ per tool change
const TOOL_COST_MAP: Record<string, number> = {
  'end_mill_carbide': 45, 'face_mill_carbide': 120, 'drill_hss': 15,
  'ball_nose_carbide': 55, 'thread_mill': 80, 'insert_carbide': 12,
  'insert_ceramic': 25, 'insert_cbn': 65,
};

function toolCostPerPart(toolName: string, toolLife_min: number, cycleTime_min: number): number {
  const baseCost = TOOL_COST_MAP[toolName] ?? 40;
  const partsPerTool = toolLife_min / (cycleTime_min + 1e-10);
  return baseCost / (partsPerTool + 1e-10);
}

// ============================================================================
// SURFACE FINISH MODEL (for constraint checking)
// ============================================================================

function predictRa(fz_mm: number, rn_mm: number, operation: string): number {
  let Ra = (fz_mm ** 2) / (32 * rn_mm) * 1000; // μm
  if (operation !== 'turning') Ra *= 1.3;
  Ra *= 1.2; // wear correction
  return Ra;
}

// ============================================================================
// TOOL LIFE MODEL (Taylor)
// ============================================================================

function taylorLife(vc_mpm: number, C: number, n: number): number {
  if (vc_mpm <= 0 || C <= 0) return 30;
  const life = Math.pow(C / vc_mpm, 1 / n);
  return Math.max(1, Math.min(life, 500));
}

// ============================================================================
// SUSTAINABILITY CALCULATIONS (F-SUST formulas)
// ============================================================================

function calcSustainability(
  mat: MatOpt, vc: number, fz: number, ap: number, ae: number,
  cycleTime: number, machinePower_kw: number, coolantType: string
): SustainabilityMetrics {
  // F-SUST-001: Energy consumption
  const mrr_cm3_min = (vc * 1000 / 60) * fz * ap * ae / 1000; // cm³/min (approx)
  const cutting_energy_kwh = mat.energy_factor * mrr_cm3_min * cycleTime / 60;
  const spindle_energy_kwh = machinePower_kw * 0.6 * cycleTime / 60; // 60% avg load
  const aux_energy_kwh = machinePower_kw * 0.15 * cycleTime / 60; // coolant pumps, etc
  const total_energy = cutting_energy_kwh + spindle_energy_kwh + aux_energy_kwh;

  // F-SUST-003: Carbon footprint (grid average 0.45 kg CO2/kWh)
  const co2_kg = total_energy * 0.45;

  // F-SUST-005: Coolant consumption
  const coolantRates: Record<string, number> = { flood: 0.15, mql: 0.005, dry: 0, cryogenic: 0.08 };
  const coolant_liters = (coolantRates[coolantType] ?? 0.15) * cycleTime;

  // Chip waste
  const volume_cm3 = mrr_cm3_min * cycleTime;
  const chip_waste_kg = volume_cm3 * mat.density / 1e6; // density in kg/m³ → kg/cm³

  // F-SUST-011: Eco-efficiency index (0-1, higher = better)
  // eco = productivity / environmental_impact
  const productivity = mrr_cm3_min > 0 ? mrr_cm3_min : 0.1;
  const impact = total_energy + co2_kg * 2 + coolant_liters * 0.5 + chip_waste_kg * 0.3;
  const eco_efficiency = Math.min(1.0, productivity / (impact + 1e-10) * 0.5);

  return {
    energy_kwh: +total_energy.toFixed(3),
    co2_kg: +co2_kg.toFixed(3),
    coolant_liters: +coolant_liters.toFixed(2),
    chip_waste_kg: +chip_waste_kg.toFixed(3),
    eco_efficiency_score: +eco_efficiency.toFixed(3),
  };
}

// ============================================================================
// PARETO FRONT GENERATOR (MOEAD-inspired decomposition)
// ============================================================================

function generateParetoFront(
  mat: MatOpt, feature: FeatureType, dims: OptimizeInput['dimensions'],
  constraints: OptimizeInput['constraints'], ecoWeight: number
): (OptimalSolution & { sustainability: SustainabilityMetrics })[] {
  const solutions: (OptimalSolution & { sustainability: SustainabilityMetrics })[] = [];
  const rn = 0.8; // nose radius
  const depth = dims.depth_mm;
  const width = dims.width_mm ?? dims.diameter_mm ?? 20;
  const length = dims.length_mm ?? width;

  // Tool selection based on feature
  const tools = selectTools(feature);
  const operation = feature === 'hole' ? 'drilling' : feature === 'thread' ? 'turning' : 'milling';

  // Grid search over parameter space (simplified MOEAD)
  const vcSteps = 8;
  const fzSteps = 6;
  const apSteps = 4;

  for (const tool of tools) {
    for (let vi = 0; vi < vcSteps; vi++) {
      const vc = mat.handbook_vc_min + (mat.handbook_vc_max - mat.handbook_vc_min) * (vi / (vcSteps - 1));

      for (let fi = 0; fi < fzSteps; fi++) {
        const fz = 0.04 + 0.26 * (fi / (fzSteps - 1)); // 0.04-0.30 mm

        for (let ai = 0; ai < apSteps; ai++) {
          const apFrac = 0.25 + 0.75 * (ai / (apSteps - 1)); // 25%-100% of depth
          const maxAp = feature === 'face' ? 4.0 : 5.0; // realistic max DOC for endmills/face mills
          const ap = Math.min(depth * apFrac, depth, maxAp);
          const ae = Math.min(width * 0.8, width); // 80% radial engagement

          // Constraint checks
          const Ra = predictRa(fz, rn, operation);
          if (constraints.surface_finish_ra_max_um && Ra > constraints.surface_finish_ra_max_um) continue;

          // Tool life
          const life = taylorLife(vc, mat.taylor_C, mat.taylor_n);
          if (life < 3) continue; // Too short

          // Cycle time estimate
          const numPasses = Math.ceil(depth / ap);
          const mrr = vc * 1000 / 60 * fz * ap; // mm³/s (simplified)
          const volume = depth * width * length; // mm³
          const cycleTime = volume / (mrr * 60 + 1e-10); // min
          if (constraints.max_cycle_time_min && cycleTime > constraints.max_cycle_time_min) continue;

          // Cost
          const machineCost = cycleTime * MACHINE_RATE_PER_MIN;
          const toolCost = toolCostPerPart(tool.id, life, cycleTime);
          if (constraints.max_tool_cost_usd && toolCost > constraints.max_tool_cost_usd) continue;
          const totalCost = machineCost + toolCost;

          // Sustainability
          const sust = calcSustainability(mat, vc, fz, ap, ae, cycleTime, 7.5, 'flood');

          // Weighted objective (for eco-optimization)
          const ecoScore = sust.eco_efficiency_score;

          const solution: OptimalSolution & { sustainability: SustainabilityMetrics } = {
            vc_mpm: +vc.toFixed(1),
            fz_mm: +fz.toFixed(3),
            ap_mm: +ap.toFixed(2),
            ae_mm: +ae.toFixed(2),
            strategy: numPasses > 1 ? 'multi_pass' : 'single_pass',
            tool: tool.name,
            num_passes: numPasses,
            estimated_cycle_time_min: +cycleTime.toFixed(2),
            estimated_cost_usd: +totalCost.toFixed(2),
            estimated_tool_life_min: +life.toFixed(1),
            predicted_ra_um: +Ra.toFixed(3),
            sustainability: sust,
          };

          solutions.push(solution);
        }
      }
    }
  }

  // Sort by objective and select non-dominated solutions
  return solutions;
}

function selectTools(feature: FeatureType): { id: string; name: string }[] {
  switch (feature) {
    case 'pocket': return [
      { id: 'end_mill_carbide', name: 'Carbide End Mill 16mm 4-flute' },
      { id: 'end_mill_carbide', name: 'Carbide End Mill 10mm 3-flute' },
    ];
    case 'slot': return [
      { id: 'end_mill_carbide', name: 'Carbide End Mill 12mm 3-flute' },
    ];
    case 'face': return [
      { id: 'face_mill_carbide', name: 'Face Mill 63mm 6-insert' },
      { id: 'insert_carbide', name: 'Carbide Insert CNMG' },
    ];
    case 'contour': return [
      { id: 'end_mill_carbide', name: 'Carbide End Mill 10mm 4-flute' },
      { id: 'ball_nose_carbide', name: 'Ball Nose 8mm 2-flute' },
    ];
    case 'hole': return [
      { id: 'drill_hss', name: 'HSS Drill 10mm' },
    ];
    case 'thread': return [
      { id: 'thread_mill', name: 'Thread Mill M10' },
    ];
  }
}

// ============================================================================
// OPTIMIZE PARAMETERS
// ============================================================================

export function optimizeParameters(input: OptimizeInput): OptimizeResult {
  const mat = getMatOpt(input.material);
  const solutions = generateParetoFront(mat, input.feature, input.dimensions, input.constraints, 0);

  if (solutions.length === 0) {
    // Fallback: relax constraints and provide a default
    const fallback = createFallbackSolution(mat, input);
    return {
      optimal: fallback,
      alternatives: [],
      pareto_front: { cost: [fallback.estimated_cost_usd], time: [fallback.estimated_cycle_time_min], quality: [fallback.predicted_ra_um] },
      sensitivity: [{ parameter: 'constraints', impact: 'high', recommendation: 'No feasible solution found — relax Ra or tolerance constraints' }],
      safety: { score: 0.50, flags: ['No feasible solution in search space — using fallback'] },
    };
  }

  // Rank by objective
  const ranked = rankByObjective(solutions, input.objective);
  const optimal = ranked[0];
  const alternatives = ranked.slice(1, 5);

  // Build Pareto front
  const pareto = extractParetoFront(ranked);

  // Sensitivity analysis
  const sensitivity = analyzeSensitivity(mat, optimal, input);

  // Safety score
  const flags: string[] = [];
  let safetyScore = 0.90;
  if (!isKnownMaterial(input.material)) {
    safetyScore -= 0.10; flags.push(`Unknown material "${input.material}" — using fallback properties (AISI 4140)`);
  }
  if (optimal.predicted_ra_um > (input.constraints.surface_finish_ra_max_um ?? 6.3) * 0.9) {
    safetyScore -= 0.05; flags.push('Ra close to constraint limit');
  }
  if (optimal.estimated_tool_life_min < 10) {
    safetyScore -= 0.10; flags.push('Short tool life — frequent changes needed');
  }
  if (optimal.vc_mpm > mat.handbook_vc_max * 0.95) {
    safetyScore -= 0.05; flags.push('Cutting speed near upper handbook limit');
  }
  safetyScore = Math.max(0.40, safetyScore);

  return {
    optimal,
    alternatives,
    pareto_front: pareto,
    sensitivity,
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

function createFallbackSolution(mat: MatOpt, input: OptimizeInput): OptimalSolution & { sustainability: SustainabilityMetrics } {
  const vc = (mat.handbook_vc_min + mat.handbook_vc_max) / 2;
  const fz = 0.10;
  const ap = Math.min(input.dimensions.depth_mm, 3);
  const ae = (input.dimensions.width_mm ?? 20) * 0.5;
  const life = taylorLife(vc, mat.taylor_C, mat.taylor_n);
  const cycleTime = 5.0;
  const sust = calcSustainability(mat, vc, fz, ap, ae, cycleTime, 7.5, 'flood');
  return {
    vc_mpm: +vc.toFixed(1), fz_mm: fz, ap_mm: +ap.toFixed(2), ae_mm: +ae.toFixed(2),
    strategy: 'conservative', tool: 'Carbide End Mill (default)', num_passes: Math.ceil(input.dimensions.depth_mm / ap),
    estimated_cycle_time_min: cycleTime, estimated_cost_usd: +(cycleTime * MACHINE_RATE_PER_MIN + 5).toFixed(2),
    estimated_tool_life_min: +life.toFixed(1), predicted_ra_um: +predictRa(fz, 0.8, 'milling').toFixed(3),
    sustainability: sust,
  };
}

function rankByObjective(
  solutions: (OptimalSolution & { sustainability: SustainabilityMetrics })[],
  objective: ObjectiveType
): (OptimalSolution & { sustainability: SustainabilityMetrics })[] {
  return [...solutions].sort((a, b) => {
    switch (objective) {
      case 'min_cost': return a.estimated_cost_usd - b.estimated_cost_usd;
      case 'min_time': return a.estimated_cycle_time_min - b.estimated_cycle_time_min;
      case 'max_tool_life': return b.estimated_tool_life_min - a.estimated_tool_life_min;
      case 'balanced': {
        // Weighted score: 40% cost, 30% time, 30% quality (inverse Ra)
        const scoreA = 0.4 * a.estimated_cost_usd + 0.3 * a.estimated_cycle_time_min + 0.3 * a.predicted_ra_um;
        const scoreB = 0.4 * b.estimated_cost_usd + 0.3 * b.estimated_cycle_time_min + 0.3 * b.predicted_ra_um;
        return scoreA - scoreB;
      }
    }
  });
}

function extractParetoFront(ranked: (OptimalSolution & { sustainability: SustainabilityMetrics })[]): { cost: number[]; time: number[]; quality: number[] } {
  // Select non-dominated solutions for the front
  const front = ranked.slice(0, Math.min(20, ranked.length));
  return {
    cost: front.map(s => s.estimated_cost_usd),
    time: front.map(s => s.estimated_cycle_time_min),
    quality: front.map(s => s.predicted_ra_um),
  };
}

function analyzeSensitivity(
  mat: MatOpt, optimal: OptimalSolution, input: OptimizeInput
): { parameter: string; impact: 'high' | 'medium' | 'low'; recommendation: string }[] {
  const results: { parameter: string; impact: 'high' | 'medium' | 'low'; recommendation: string }[] = [];

  // Speed sensitivity
  const lifeAt95 = taylorLife(optimal.vc_mpm * 0.95, mat.taylor_C, mat.taylor_n);
  const lifeAt105 = taylorLife(optimal.vc_mpm * 1.05, mat.taylor_C, mat.taylor_n);
  const lifeChange = Math.abs(lifeAt105 - lifeAt95) / (optimal.estimated_tool_life_min + 1e-10);
  const speedImpact = lifeChange > 0.3 ? 'high' : lifeChange > 0.15 ? 'medium' : 'low';
  results.push({
    parameter: 'cutting_speed',
    impact: speedImpact,
    recommendation: speedImpact === 'high'
      ? 'Tool life very sensitive to speed — maintain within ±5% of optimal'
      : 'Speed has moderate influence — ±10% acceptable',
  });

  // Feed sensitivity on surface finish
  const raAt110 = predictRa(optimal.fz_mm * 1.10, 0.8, 'milling');
  const feedImpact = raAt110 > (input.constraints.surface_finish_ra_max_um ?? 6.3) ? 'high' : 'medium';
  results.push({
    parameter: 'feed_rate',
    impact: feedImpact,
    recommendation: feedImpact === 'high'
      ? 'Feed directly controls Ra — any increase risks exceeding finish spec'
      : 'Feed has standard quadratic effect on Ra',
  });

  // Depth impact on force/deflection
  results.push({
    parameter: 'depth_of_cut',
    impact: 'medium',
    recommendation: 'Depth linearly affects cutting force — reduce if vibration occurs',
  });

  return results;
}

// ============================================================================
// OPTIMIZE SEQUENCE (ACO-inspired heuristic)
// ============================================================================

export function optimizeSequence(input: SequenceInput): SequenceResult {
  const ops = input.operations;
  const n = ops.length;

  if (n <= 1) {
    return {
      optimal_order: ops.map(o => o.id),
      tool_changes: 0,
      estimated_total_min: ops.reduce((s, o) => s + o.estimated_time_min, 0),
      savings_vs_input_order: { time_saved_min: 0, tool_changes_saved: 0 },
      safety: { score: 0.95, flags: [] },
    };
  }

  // Parse setup constraints
  const mustBeBefore = new Map<string, Set<string>>(); // op → set of ops it must precede
  for (const op of ops) {
    if (op.setup_constraints) {
      for (const c of op.setup_constraints) {
        const match = c.match(/must be before (\w+)/i);
        if (match) {
          if (!mustBeBefore.has(op.id)) mustBeBefore.set(op.id, new Set());
          mustBeBefore.get(op.id)!.add(match[1]);
        }
      }
    }
  }

  // Calculate input order metrics
  const inputToolChanges = countToolChanges(ops.map(o => o.id), ops);
  const inputTotal = ops.reduce((s, o) => s + o.estimated_time_min, 0) + inputToolChanges * 0.5;

  // ACO-inspired: try multiple permutations and pick best
  const ANTS = Math.min(100, factorial(n));
  let bestOrder: string[] = ops.map(o => o.id);
  let bestScore = Infinity;

  for (let ant = 0; ant < ANTS; ant++) {
    // Generate candidate permutation
    const perm = ant === 0 ? ops.map(o => o.id) : shuffleWithConstraints(ops, mustBeBefore);

    // Score based on objective
    const changes = countToolChanges(perm, ops);
    const times = perm.map(id => ops.find(o => o.id === id)!.estimated_time_min);
    const totalTime = times.reduce((a, b) => a + b, 0) + changes * 0.5; // 30s per tool change

    let score: number;
    switch (input.optimize_for) {
      case 'min_tool_changes': score = changes * 100 + totalTime; break;
      case 'min_cycle_time': score = totalTime * 100 + changes; break;
      case 'min_setup_changes': score = changes * 50 + totalTime; break;
    }

    // Check constraints
    if (!satisfiesConstraints(perm, mustBeBefore)) continue;

    if (score < bestScore) {
      bestScore = score;
      bestOrder = [...perm];
    }
  }

  const optimalChanges = countToolChanges(bestOrder, ops);
  const optimalTotal = bestOrder.map(id => ops.find(o => o.id === id)!.estimated_time_min).reduce((a, b) => a + b, 0) + optimalChanges * 0.5;

  const flags: string[] = [];
  let safetyScore = 0.92;
  if (optimalChanges === inputToolChanges) {
    flags.push('No tool change improvement found — input order may already be near-optimal');
  }
  safetyScore = Math.max(0.50, safetyScore);

  return {
    optimal_order: bestOrder,
    tool_changes: optimalChanges,
    estimated_total_min: +optimalTotal.toFixed(2),
    savings_vs_input_order: {
      time_saved_min: +(inputTotal - optimalTotal).toFixed(2),
      tool_changes_saved: inputToolChanges - optimalChanges,
    },
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

function countToolChanges(order: string[], ops: { id: string; tool_required: string }[]): number {
  let changes = 0;
  let lastTool = '';
  for (const id of order) {
    const op = ops.find(o => o.id === id)!;
    if (lastTool && op.tool_required !== lastTool) changes++;
    lastTool = op.tool_required;
  }
  return changes;
}

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function shuffleWithConstraints(
  ops: { id: string; tool_required: string }[],
  _constraints: Map<string, Set<string>>
): string[] {
  // Fisher-Yates shuffle
  const arr = ops.map(o => o.id);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function satisfiesConstraints(order: string[], mustBeBefore: Map<string, Set<string>>): boolean {
  const posMap = new Map(order.map((id, i) => [id, i]));
  for (const [before, afters] of mustBeBefore) {
    const beforePos = posMap.get(before);
    if (beforePos === undefined) continue;
    for (const after of afters) {
      const afterPos = posMap.get(after);
      if (afterPos !== undefined && beforePos >= afterPos) return false;
    }
  }
  return true;
}

// ============================================================================
// SUSTAINABILITY REPORT
// ============================================================================

export function sustainabilityReport(input: SustainabilityInput): SustainabilityResult {
  const mat = getMatOpt(input.material);
  const coolantType = input.coolant_type ?? 'flood';
  const machinePower = input.machine_power_kw ?? 7.5;

  const sust = calcSustainability(
    mat, input.cutting_speed_mpm, input.feed_mmrev,
    input.depth_of_cut_mm, input.width_of_cut_mm,
    input.cycle_time_min, machinePower, coolantType
  );

  // Detailed breakdown
  const mrr_cm3_min = (input.cutting_speed_mpm * 1000 / 60) * input.feed_mmrev * input.depth_of_cut_mm * input.width_of_cut_mm / 1000;
  const cuttingE = mat.energy_factor * mrr_cm3_min * input.cycle_time_min / 60;
  const spindleE = machinePower * 0.6 * input.cycle_time_min / 60;
  const auxE = machinePower * 0.15 * input.cycle_time_min / 60;

  const directCo2 = (cuttingE + spindleE) * 0.45;
  const indirectCo2 = auxE * 0.45 + sust.coolant_liters * 0.02; // coolant production CO2

  const chipMass = sust.chip_waste_kg;
  const recyclePct = mat.density > 5000 ? 0.90 : 0.75; // metals >5000 kg/m³ more valuable to recycle

  // Baseline comparison (handbook middle values)
  const baseVc = (mat.handbook_vc_min + mat.handbook_vc_max) / 2;
  const baseSust = calcSustainability(mat, baseVc, 0.15, 2.0, 10, input.cycle_time_min, machinePower, coolantType);
  const energyVsBase = ((sust.energy_kwh - baseSust.energy_kwh) / (baseSust.energy_kwh + 1e-10)) * 100;
  const co2VsBase = ((sust.co2_kg - baseSust.co2_kg) / (baseSust.co2_kg + 1e-10)) * 100;
  const wasteVsBase = ((sust.chip_waste_kg - baseSust.chip_waste_kg) / (baseSust.chip_waste_kg + 1e-10)) * 100;

  // ISO 14955 notes
  const iso_notes: string[] = [];
  if (sust.energy_kwh > baseSust.energy_kwh * 1.5)
    iso_notes.push('ISO 14955-1: Energy consumption >50% above baseline — review cutting parameters');
  if (coolantType === 'flood')
    iso_notes.push('ISO 14955-2: Consider MQL for reduced coolant consumption and disposal');
  if (sust.eco_efficiency_score < 0.3)
    iso_notes.push('ISO 14955-1: Eco-efficiency below 0.3 — parameter optimization recommended');

  const flags: string[] = [];
  let safetyScore = 0.88;
  if (sust.eco_efficiency_score < 0.3) { safetyScore -= 0.10; flags.push('Low eco-efficiency'); }
  if (sust.energy_kwh > 2.0) { safetyScore -= 0.05; flags.push('High energy consumption'); }
  safetyScore = Math.max(0.40, safetyScore);

  return {
    energy: {
      cutting_kwh: +cuttingE.toFixed(4),
      spindle_kwh: +spindleE.toFixed(4),
      auxiliary_kwh: +auxE.toFixed(4),
      total_kwh: +sust.energy_kwh.toFixed(3),
    },
    carbon: {
      direct_co2_kg: +directCo2.toFixed(4),
      indirect_co2_kg: +indirectCo2.toFixed(4),
      total_co2_kg: +sust.co2_kg.toFixed(3),
    },
    coolant: {
      consumption_liters: sust.coolant_liters,
      disposal_cost_usd: +(sust.coolant_liters * 0.35).toFixed(2), // $0.35/liter disposal
    },
    waste: {
      chip_mass_kg: +chipMass.toFixed(3),
      recyclable_pct: +(recyclePct * 100).toFixed(0),
      landfill_kg: +(chipMass * (1 - recyclePct)).toFixed(4),
    },
    eco_efficiency_score: sust.eco_efficiency_score,
    iso14955_notes: iso_notes,
    comparison_vs_baseline: {
      energy_pct: +energyVsBase.toFixed(1),
      co2_pct: +co2VsBase.toFixed(1),
      waste_pct: +wasteVsBase.toFixed(1),
    },
    safety: { score: +safetyScore.toFixed(2), flags },
  };
}

// ============================================================================
// ECO-OPTIMIZE (sustainability-weighted)
// ============================================================================

export function ecoOptimize(input: EcoOptimizeInput): EcoOptimizeResult {
  const weight = Math.max(0, Math.min(1, input.weight_eco));

  // Get standard optimization result
  const baseResult = optimizeParameters(input);

  if (weight === 0) {
    return {
      ...baseResult,
      eco_weight_applied: 0,
      sustainability_improvement_pct: 0,
    };
  }

  // Re-rank solutions with eco weighting
  const mat = getMatOpt(input.material);
  const solutions = generateParetoFront(mat, input.feature, input.dimensions, input.constraints, weight);

  if (solutions.length === 0) {
    return {
      ...baseResult,
      eco_weight_applied: weight,
      sustainability_improvement_pct: 0,
    };
  }

  // Sort by combined objective + eco score
  const ranked = [...solutions].sort((a, b) => {
    const costA = a.estimated_cost_usd * (1 - weight) + (1 - a.sustainability.eco_efficiency_score) * weight * 100;
    const costB = b.estimated_cost_usd * (1 - weight) + (1 - b.sustainability.eco_efficiency_score) * weight * 100;
    return costA - costB;
  });

  const ecoOptimal = ranked[0];
  const baseEco = baseResult.optimal.sustainability.eco_efficiency_score;
  const newEco = ecoOptimal.sustainability.eco_efficiency_score;
  const improvement = baseEco > 0 ? ((newEco - baseEco) / baseEco) * 100 : 0;

  return {
    optimal: ecoOptimal,
    alternatives: ranked.slice(1, 5),
    pareto_front: extractParetoFront(ranked),
    sensitivity: analyzeSensitivity(mat, ecoOptimal, input),
    safety: baseResult.safety,
    eco_weight_applied: weight,
    sustainability_improvement_pct: +improvement.toFixed(1),
  };
}

// ============================================================================
// SOURCE FILE CATALOG UTILITIES
// ============================================================================

/**
 * Returns the full OPTIMIZATION_SOURCE_FILE_CATALOG for programmatic access.
 * Includes summary statistics by category and safety class.
 */
export function getSourceFileCatalog(): {
  catalog: typeof OPTIMIZATION_SOURCE_FILE_CATALOG;
  summary: {
    total_files: number;
    total_lines: number;
    by_category: Record<string, number>;
    by_safety_class: Record<string, number>;
  };
} {
  const entries = Object.values(OPTIMIZATION_SOURCE_FILE_CATALOG);
  const totalLines = entries.reduce((sum, e) => sum + e.lines, 0);

  const byCategory: Record<string, number> = {};
  const bySafety: Record<string, number> = {};

  for (const entry of entries) {
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    bySafety[entry.safety_class] = (bySafety[entry.safety_class] ?? 0) + 1;
  }

  return {
    catalog: OPTIMIZATION_SOURCE_FILE_CATALOG,
    summary: {
      total_files: entries.length,
      total_lines: totalLines,
      by_category: byCategory,
      by_safety_class: bySafety,
    },
  };
}

/**
 * Logs catalog status to console for diagnostics.
 * Returns a structured status report suitable for health checks.
 */
export function catalogSourceFiles(): {
  status: string;
  cataloged: number;
  total_lines: number;
  critical_modules: string[];
  categories: string[];
} {
  const entries = Object.entries(OPTIMIZATION_SOURCE_FILE_CATALOG);
  const totalLines = entries.reduce((sum, [, e]) => sum + e.lines, 0);
  const criticalModules = entries
    .filter(([, e]) => e.safety_class === "CRITICAL")
    .map(([name]) => name);
  const categories = [...new Set(entries.map(([, e]) => e.category))].sort();

  const report = {
    status: "cataloged",
    cataloged: entries.length,
    total_lines: totalLines,
    critical_modules: criticalModules,
    categories,
  };

  console.log(
    `[OptimizationEngine] Source catalog: ${report.cataloged} files, ` +
    `${report.total_lines} lines, ${criticalModules.length} CRITICAL modules`
  );

  return report;
}

// ============================================================================
// DISPATCHER FUNCTION
// ============================================================================

export function optimization(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case 'optimize_parameters':
      return optimizeParameters(params as unknown as OptimizeInput);
    case 'optimize_sequence':
      return optimizeSequence(params as unknown as SequenceInput);
    case 'sustainability_report':
      return sustainabilityReport(params as unknown as SustainabilityInput);
    case 'eco_optimize':
      return ecoOptimize(params as unknown as EcoOptimizeInput);
    default:
      return { error: `Unknown optimization action: ${action}` };
  }
}
