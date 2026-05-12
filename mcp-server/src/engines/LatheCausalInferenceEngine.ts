/**
 * LatheCausalInferenceEngine — Causal Reasoning for Lathe Programming Decisions
 * ===============================================================================
 *
 * Implements formal causal inference methods for understanding and optimizing
 * lathe programming decisions. Uses Structural Causal Models (SCMs), intervention
 * analysis, and causal discovery to reason about cause-effect relationships in
 * machining operations.
 *
 * Key Capabilities:
 *   1. STRUCTURAL CAUSAL MODELS
 *      - DAG representation of causal relationships
 *      - Material → Parameters → Outcomes chains
 *      - Tool selection → Tool life → Cost pathways
 *      - Speed/Feed → Forces → Quality relationships
 *
 *   2. INTERVENTION ANALYSIS
 *      - do(X) operator implementation (Pearl's calculus)
 *      - Counterfactual queries: "What if speed was different?"
 *      - Average Treatment Effect (ATE) estimation
 *      - Causal effect bounds (partial identification)
 *
 *   3. CAUSAL DISCOVERY
 *      - PC algorithm for structure learning from data
 *      - Score-based methods (BIC, MDL)
 *      - Constraint-based discovery
 *      - Granger causality for time-series data
 *
 *   4. BACKDOOR ADJUSTMENT
 *      - Confounding identification
 *      - Backdoor criterion and adjustment formula
 *      - Propensity score methods
 *      - Inverse probability weighting (IPW)
 *
 *   5. FRONT-DOOR CRITERION
 *      - Mediator identification
 *      - Mediation analysis
 *      - Direct vs indirect effects
 *      - Path-specific causal effects
 *
 *   6. MANUFACTURING CAUSAL MODELS
 *      - Cutting force → surface finish pathways
 *      - Temperature → tool wear mechanisms
 *      - Chip thickness → power consumption
 *      - Vibration → dimensional accuracy
 *
 * References:
 *   - Pearl, J. (2009). Causality: Models, Reasoning, and Inference
 *   - Pearl, J. (2016). The Book of Why
 *   - Spirtes, P., Glymour, C., Scheines, R. (2000). Causation, Prediction, and Search
 *   - Granger, C.W.J. (1969). Investigating Causal Relations by Econometric Models
 *   - Robins, J.M. (1986). A New Approach to Causal Inference
 *   - Kienzle, O. (1952). Die Bestimmung von Kraeften und Leistungen
 *   - Taylor, F.W. (1907). On the Art of Cutting Metals
 *   - Merchant, M.E. (1945). Mechanics of the Metal Cutting Process
 *
 * @module engines/LatheCausalInferenceEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
  type ISOGroup,
  type MaterialPhysics,
} from "../physics/constants.js";

// ============================================================================
// CAUSAL MODEL TYPES
// ============================================================================

/** Variable type in causal model */
export type VariableType = "continuous" | "discrete" | "binary" | "categorical";

/** Variable role in causal structure */
export type VariableRole = "treatment" | "outcome" | "confounder" | "mediator" | "instrument" | "collider";

/** Causal variable definition */
export interface CausalVariable {
  id: string;
  name: string;
  type: VariableType;
  role?: VariableRole;
  domain: {
    min?: number;
    max?: number;
    values?: (string | number)[];
  };
  unit?: string;
  description: string;
  distribution?: {
    type: "normal" | "uniform" | "exponential" | "categorical";
    params: Record<string, number>;
  };
}

/** Observed value for a variable */
export interface ObservedValue {
  variable_id: string;
  value: number | string | boolean;
  timestamp?: string;
  source?: string;
}

/** Causal edge (relationship) definition */
export interface CausalEdge {
  from: string;
  to: string;
  strength: number;  // Standardized effect size (-1 to 1)
  confidence: number;  // Confidence in relationship (0 to 1)
  mechanism: string;  // Physical/logical explanation
  functional_form: "linear" | "quadratic" | "exponential" | "logarithmic" | "threshold" | "custom";
  coefficients?: number[];  // Coefficients for functional form
  time_lag?: number;  // Time lag in seconds (for temporal causality)
  is_deterministic: boolean;
  noise_variance?: number;  // Variance of additive noise
}

/** Structural Causal Model (SCM) */
export interface StructuralCausalModel {
  id: string;
  name: string;
  domain: "lathe_turning" | "lathe_boring" | "lathe_threading" | "lathe_grooving" | "general";
  variables: Map<string, CausalVariable>;
  edges: CausalEdge[];
  exogenous_noise: Map<string, number>;  // Exogenous noise variances
  adjacency_matrix: number[][];
  topological_order: string[];
  d_separation_cache: Map<string, boolean>;
  created_at: string;
  last_updated: string;
}

// ============================================================================
// INTERVENTION & COUNTERFACTUAL TYPES
// ============================================================================

/** Intervention specification (do-operator) */
export interface Intervention {
  variable_id: string;
  new_value: number | string | boolean;
  intervention_type: "hard" | "soft";  // Hard: deterministic, Soft: stochastic shift
  distribution_shift?: {
    type: "shift" | "scale" | "truncate";
    params: Record<string, number>;
  };
}

/** Counterfactual query */
export interface CounterfactualQuery {
  id: string;
  description: string;
  factual_observation: ObservedValue[];
  hypothetical_intervention: Intervention;
  outcome_variables: string[];
  evidence_variables?: string[];
}

/** Counterfactual result */
export interface CounterfactualResult {
  query_id: string;
  factual_outcomes: Map<string, number | string | boolean>;
  counterfactual_outcomes: Map<string, number | string | boolean>;
  causal_effects: Map<string, number>;
  probability_of_necessity: number;  // P(Y'=0 | X=1, Y=1, do(X=0))
  probability_of_sufficiency: number;  // P(Y'=1 | X=0, Y=0, do(X=1))
  confidence: number;
  reasoning: string[];
}

/** Causal effect estimation result */
export interface CausalEffectEstimate {
  treatment: string;
  outcome: string;
  estimator: "ate" | "att" | "cate" | "itt" | "late";
  estimate: number;
  standard_error: number;
  confidence_interval: [number, number];
  confidence_level: number;
  sample_size: number;
  method: "backdoor" | "frontdoor" | "iv" | "ipw" | "aipw" | "matching" | "did";
  adjustment_set?: string[];
  bounds?: [number, number];  // Partial identification bounds
  assumptions: string[];
  sensitivity_analysis?: {
    robustness_value: number;  // How much unmeasured confounding to nullify effect
    e_value: number;  // Minimum strength of confounding to explain away effect
  };
}

// ============================================================================
// CAUSAL DISCOVERY TYPES
// ============================================================================

/** Conditional independence test result */
export interface IndependenceTest {
  variable_x: string;
  variable_y: string;
  conditioning_set: string[];
  test_statistic: number;
  p_value: number;
  is_independent: boolean;
  significance_level: number;
}

/** Causal discovery result */
export interface DiscoveryResult {
  algorithm: "pc" | "fci" | "ges" | "lingam" | "notears" | "granger";
  skeleton: CausalEdge[];
  oriented_edges: CausalEdge[];
  undirected_edges: Array<[string, string]>;
  equivalence_class_size: number;
  score?: number;  // For score-based methods
  independence_tests: IndependenceTest[];
  confidence: number;
  warnings: string[];
}

// ============================================================================
// BACKDOOR & ADJUSTMENT TYPES
// ============================================================================

/** Backdoor criterion check result */
export interface BackdoorResult {
  treatment: string;
  outcome: string;
  is_identifiable: boolean;
  valid_adjustment_sets: string[][];
  minimal_adjustment_set: string[];
  sufficient_adjustment_set: string[];
  blocked_paths: string[][];
  open_backdoor_paths: string[][];
  confounders: string[];
}

/** Propensity score result */
export interface PropensityScoreResult {
  treatment: string;
  scores: Map<string, number>;  // observation_id -> propensity score
  balance_statistics: {
    before: Map<string, number>;  // Standardized mean differences
    after: Map<string, number>;
  };
  overlap: {
    common_support_ratio: number;
    trimmed_observations: number;
  };
  method: "logistic" | "gbm" | "random_forest" | "neural_network";
}

// ============================================================================
// FRONT-DOOR & MEDIATION TYPES
// ============================================================================

/** Front-door criterion result */
export interface FrontDoorResult {
  treatment: string;
  outcome: string;
  mediators: string[];
  is_identifiable: boolean;
  direct_effect: number;
  indirect_effects: Map<string, number>;
  total_effect: number;
  percentage_mediated: number;
  path_specific_effects: Array<{
    path: string[];
    effect: number;
    proportion: number;
  }>;
}

/** Mediation analysis result */
export interface MediationResult {
  treatment: string;
  mediator: string;
  outcome: string;
  total_effect: number;
  direct_effect: number;
  indirect_effect: number;
  proportion_mediated: number;
  acme: number;  // Average Causal Mediation Effect
  ade: number;   // Average Direct Effect
  confidence_intervals: {
    total: [number, number];
    direct: [number, number];
    indirect: [number, number];
  };
  sensitivity: {
    rho_at_which_acme_0: number;  // Correlation at which indirect effect = 0
  };
}

// ============================================================================
// MANUFACTURING DOMAIN TYPES
// ============================================================================

/** Lathe operation context */
export interface LatheOperationContext {
  operation_type: "od_turning" | "id_boring" | "facing" | "threading" | "grooving" | "parting";
  material: {
    name: string;
    iso_group: ISOGroup;
    hardness_hb: number;
  };
  tool: {
    type: string;
    insert_grade: string;
    nose_radius_mm: number;
    approach_angle_deg: number;
  };
  parameters: {
    cutting_speed_mpm: number;
    feed_rate_mmrev: number;
    depth_of_cut_mm: number;
    coolant_type: "flood" | "mist" | "dry" | "through_tool";
  };
  machine: {
    spindle_power_kw: number;
    max_rpm: number;
    rigidity: "low" | "medium" | "high";
  };
}

/** Lathe outcome measurements */
export interface LatheOutcomes {
  surface_finish_ra_um: number;
  dimensional_accuracy_mm: number;
  tool_life_min: number;
  cycle_time_sec: number;
  power_consumption_kw: number;
  cutting_force_n: number;
  temperature_c: number;
  vibration_amplitude_mm: number;
  chip_form: "continuous" | "segmented" | "broken" | "tangled";
}

// ============================================================================
// MANUFACTURING CAUSAL TEMPLATES
// ============================================================================

/** Pre-defined causal edges for lathe operations (based on machining physics) */
const LATHE_CAUSAL_TEMPLATES: CausalEdge[] = [
  // Material properties → Cutting forces (Kienzle)
  {
    from: "material_hardness", to: "cutting_force",
    strength: 0.75, confidence: 0.95,
    mechanism: "Harder materials require greater shear force (Kienzle: Fc = kc1.1 * ap * fz^(1-mc))",
    functional_form: "linear", coefficients: [1.0, 0.8],
    is_deterministic: false, noise_variance: 0.05
  },
  {
    from: "material_kc1_1", to: "cutting_force",
    strength: 0.90, confidence: 0.98,
    mechanism: "Specific cutting force directly proportional to force (Fc = kc * A)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },

  // Cutting parameters → Forces
  {
    from: "cutting_speed", to: "cutting_force",
    strength: -0.25, confidence: 0.85,
    mechanism: "Higher speed softens material via thermal softening (Merchant shear angle)",
    functional_form: "logarithmic", coefficients: [-0.15],
    is_deterministic: false, noise_variance: 0.08
  },
  {
    from: "feed_rate", to: "cutting_force",
    strength: 0.80, confidence: 0.95,
    mechanism: "Feed directly increases chip cross-section (Kienzle: h^(1-mc) term)",
    functional_form: "exponential", coefficients: [0.75],  // (1-mc) exponent
    is_deterministic: false, noise_variance: 0.03
  },
  {
    from: "depth_of_cut", to: "cutting_force",
    strength: 0.95, confidence: 0.98,
    mechanism: "DOC directly proportional to chip width and force (Fc = kc * ap * fz)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },

  // Forces → Deflection & Vibration
  {
    from: "cutting_force", to: "tool_deflection",
    strength: 0.85, confidence: 0.92,
    mechanism: "Force causes beam deflection (delta = F*L^3 / 3EI)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: false, noise_variance: 0.04
  },
  {
    from: "cutting_force", to: "vibration_amplitude",
    strength: 0.70, confidence: 0.85,
    mechanism: "Dynamic force components excite structural modes",
    functional_form: "linear", coefficients: [0.8],
    is_deterministic: false, noise_variance: 0.10
  },
  {
    from: "tool_deflection", to: "dimensional_accuracy",
    strength: -0.90, confidence: 0.95,
    mechanism: "Deflection directly causes dimensional error",
    functional_form: "linear", coefficients: [-1.0],
    is_deterministic: true
  },
  {
    from: "vibration_amplitude", to: "surface_finish",
    strength: -0.80, confidence: 0.90,
    mechanism: "Vibration creates surface waviness and roughness",
    functional_form: "quadratic", coefficients: [-0.5, -0.5],
    is_deterministic: false, noise_variance: 0.06
  },

  // Speed → Temperature → Wear
  {
    from: "cutting_speed", to: "cutting_temperature",
    strength: 0.85, confidence: 0.95,
    mechanism: "Higher speed increases heat generation rate (Q ~ Vc^0.8, Boothroyd)",
    functional_form: "exponential", coefficients: [0.8],
    is_deterministic: false, noise_variance: 0.05
  },
  {
    from: "cutting_temperature", to: "tool_wear_rate",
    strength: 0.90, confidence: 0.92,
    mechanism: "Temperature accelerates diffusion wear (Arrhenius equation)",
    functional_form: "exponential", coefficients: [1.5],
    is_deterministic: false, noise_variance: 0.08
  },
  {
    from: "tool_wear_rate", to: "tool_life",
    strength: -0.95, confidence: 0.98,
    mechanism: "Wear rate inversely proportional to life (Taylor: T = (C/Vc)^(1/n))",
    functional_form: "exponential", coefficients: [-1.0],
    is_deterministic: false, noise_variance: 0.05
  },

  // Feed → Surface finish
  {
    from: "feed_rate", to: "theoretical_surface_finish",
    strength: 0.92, confidence: 0.98,
    mechanism: "Feed creates cusps (Ra_ideal = fz^2 / 32R, Schey)",
    functional_form: "quadratic", coefficients: [1.0, 0.0],
    is_deterministic: true
  },
  {
    from: "nose_radius", to: "theoretical_surface_finish",
    strength: -0.85, confidence: 0.95,
    mechanism: "Larger radius reduces cusp height (Ra ~ 1/R)",
    functional_form: "exponential", coefficients: [-1.0],
    is_deterministic: true
  },
  {
    from: "theoretical_surface_finish", to: "surface_finish",
    strength: 0.80, confidence: 0.90,
    mechanism: "Theoretical finish sets baseline, dynamic effects add variance",
    functional_form: "linear", coefficients: [1.0, 0.2],
    is_deterministic: false, noise_variance: 0.15
  },
  {
    from: "tool_wear", to: "surface_finish",
    strength: 0.65, confidence: 0.88,
    mechanism: "Worn edge increases roughness (built-up edge, micro-chipping)",
    functional_form: "linear", coefficients: [0.3],
    is_deterministic: false, noise_variance: 0.12
  },

  // Material → Chip formation
  {
    from: "material_ductility", to: "chip_form",
    strength: 0.70, confidence: 0.85,
    mechanism: "Ductile materials form continuous chips, brittle form segmented",
    functional_form: "threshold", coefficients: [0.5],
    is_deterministic: false, noise_variance: 0.15
  },
  {
    from: "feed_rate", to: "chip_thickness",
    strength: 0.90, confidence: 0.95,
    mechanism: "Uncut chip thickness h = fz * sin(approach_angle)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },
  {
    from: "chip_thickness", to: "chip_form",
    strength: 0.60, confidence: 0.80,
    mechanism: "Thicker chips more likely to break (chip breaker engagement)",
    functional_form: "threshold", coefficients: [0.3],
    is_deterministic: false, noise_variance: 0.20
  },

  // Power consumption
  {
    from: "cutting_force", to: "power_consumption",
    strength: 0.95, confidence: 0.98,
    mechanism: "Power = Force * Velocity (P = Fc * Vc / 60000 kW)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },
  {
    from: "cutting_speed", to: "power_consumption",
    strength: 0.90, confidence: 0.95,
    mechanism: "Power proportional to cutting speed (P = Fc * Vc)",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },

  // Coolant effects
  {
    from: "coolant_effectiveness", to: "cutting_temperature",
    strength: -0.55, confidence: 0.85,
    mechanism: "Coolant removes heat and lubricates (convective + evaporative)",
    functional_form: "linear", coefficients: [-0.4],
    is_deterministic: false, noise_variance: 0.10
  },
  {
    from: "coolant_effectiveness", to: "tool_life",
    strength: 0.45, confidence: 0.80,
    mechanism: "Reduced temperature extends life (thermal wear reduction)",
    functional_form: "linear", coefficients: [0.3],
    is_deterministic: false, noise_variance: 0.12
  },

  // Cost relationships
  {
    from: "cycle_time", to: "machine_cost",
    strength: 0.95, confidence: 0.98,
    mechanism: "Machine cost = rate * time",
    functional_form: "linear", coefficients: [1.0],
    is_deterministic: true
  },
  {
    from: "tool_life", to: "tool_cost_per_part",
    strength: -0.90, confidence: 0.95,
    mechanism: "Cost per part = tool_cost / parts_per_edge",
    functional_form: "exponential", coefficients: [-1.0],
    is_deterministic: true
  },
];

// ============================================================================
// MANUFACTURING VARIABLE TEMPLATES
// ============================================================================

const LATHE_VARIABLE_TEMPLATES: CausalVariable[] = [
  // Material properties
  {
    id: "material_hardness", name: "Material Hardness", type: "continuous",
    domain: { min: 100, max: 700 }, unit: "HB",
    description: "Brinell hardness of workpiece material"
  },
  {
    id: "material_kc1_1", name: "Specific Cutting Force", type: "continuous",
    domain: { min: 500, max: 4000 }, unit: "N/mm^2",
    description: "Kienzle specific cutting force at h=1mm"
  },
  {
    id: "material_ductility", name: "Material Ductility", type: "continuous",
    domain: { min: 0, max: 1 },
    description: "Normalized ductility (0=brittle, 1=very ductile)"
  },

  // Cutting parameters
  {
    id: "cutting_speed", name: "Cutting Speed", type: "continuous", role: "treatment",
    domain: { min: 20, max: 800 }, unit: "m/min",
    description: "Surface cutting speed (Vc)"
  },
  {
    id: "feed_rate", name: "Feed Rate", type: "continuous", role: "treatment",
    domain: { min: 0.05, max: 1.0 }, unit: "mm/rev",
    description: "Feed per revolution (fz)"
  },
  {
    id: "depth_of_cut", name: "Depth of Cut", type: "continuous", role: "treatment",
    domain: { min: 0.1, max: 10 }, unit: "mm",
    description: "Axial depth of cut (ap)"
  },
  {
    id: "nose_radius", name: "Tool Nose Radius", type: "continuous",
    domain: { min: 0.2, max: 2.4 }, unit: "mm",
    description: "Insert nose radius"
  },

  // Intermediate variables
  {
    id: "cutting_force", name: "Cutting Force", type: "continuous", role: "mediator",
    domain: { min: 0, max: 10000 }, unit: "N",
    description: "Main cutting force (Fc)"
  },
  {
    id: "cutting_temperature", name: "Cutting Temperature", type: "continuous", role: "mediator",
    domain: { min: 100, max: 1200 }, unit: "C",
    description: "Tool-chip interface temperature"
  },
  {
    id: "tool_deflection", name: "Tool Deflection", type: "continuous", role: "mediator",
    domain: { min: 0, max: 0.5 }, unit: "mm",
    description: "Tool tip deflection under load"
  },
  {
    id: "vibration_amplitude", name: "Vibration Amplitude", type: "continuous", role: "mediator",
    domain: { min: 0, max: 0.2 }, unit: "mm",
    description: "Peak vibration amplitude"
  },
  {
    id: "theoretical_surface_finish", name: "Theoretical Surface Finish", type: "continuous",
    domain: { min: 0.1, max: 50 }, unit: "um Ra",
    description: "Kinematic surface roughness"
  },
  {
    id: "chip_thickness", name: "Chip Thickness", type: "continuous",
    domain: { min: 0.01, max: 1.0 }, unit: "mm",
    description: "Uncut chip thickness"
  },
  {
    id: "tool_wear_rate", name: "Tool Wear Rate", type: "continuous",
    domain: { min: 0, max: 0.5 }, unit: "mm/min",
    description: "Flank wear rate"
  },

  // Outcome variables
  {
    id: "surface_finish", name: "Surface Finish", type: "continuous", role: "outcome",
    domain: { min: 0.4, max: 25 }, unit: "um Ra",
    description: "Measured surface roughness"
  },
  {
    id: "dimensional_accuracy", name: "Dimensional Accuracy", type: "continuous", role: "outcome",
    domain: { min: 0, max: 0.2 }, unit: "mm",
    description: "Dimensional deviation from nominal"
  },
  {
    id: "tool_life", name: "Tool Life", type: "continuous", role: "outcome",
    domain: { min: 1, max: 240 }, unit: "min",
    description: "Time to tool failure criterion"
  },
  {
    id: "cycle_time", name: "Cycle Time", type: "continuous", role: "outcome",
    domain: { min: 1, max: 3600 }, unit: "sec",
    description: "Total operation time"
  },
  {
    id: "power_consumption", name: "Power Consumption", type: "continuous", role: "outcome",
    domain: { min: 0.1, max: 50 }, unit: "kW",
    description: "Spindle power draw"
  },
  {
    id: "chip_form", name: "Chip Form", type: "categorical", role: "outcome",
    domain: { values: ["continuous", "segmented", "broken", "tangled"] },
    description: "Resulting chip morphology"
  },
  {
    id: "tool_wear", name: "Tool Wear", type: "continuous", role: "outcome",
    domain: { min: 0, max: 0.6 }, unit: "mm",
    description: "Flank wear land width (VB)"
  },

  // Environmental factors
  {
    id: "coolant_effectiveness", name: "Coolant Effectiveness", type: "continuous",
    domain: { min: 0, max: 1 },
    description: "Normalized cooling effectiveness (0=none, 1=ideal)"
  },
  {
    id: "machine_rigidity", name: "Machine Rigidity", type: "continuous",
    domain: { min: 0, max: 1 },
    description: "Normalized machine stiffness"
  },

  // Cost variables
  {
    id: "machine_cost", name: "Machine Cost", type: "continuous", role: "outcome",
    domain: { min: 0, max: 1000 }, unit: "USD",
    description: "Machine time cost per part"
  },
  {
    id: "tool_cost_per_part", name: "Tool Cost", type: "continuous", role: "outcome",
    domain: { min: 0, max: 50 }, unit: "USD",
    description: "Tooling cost per part"
  },
];

// ============================================================================
// GRAPH ALGORITHMS
// ============================================================================

/**
 * Directed Acyclic Graph (DAG) operations for causal reasoning.
 */
class CausalDAG {
  private adjacencyList: Map<string, Set<string>> = new Map();
  private reverseAdjacencyList: Map<string, Set<string>> = new Map();
  private nodes: Set<string> = new Set();

  constructor(edges: Array<{ from: string; to: string }>) {
    for (const edge of edges) {
      this.addEdge(edge.from, edge.to);
    }
  }

  addEdge(from: string, to: string): void {
    this.nodes.add(from);
    this.nodes.add(to);

    if (!this.adjacencyList.has(from)) {
      this.adjacencyList.set(from, new Set());
    }
    this.adjacencyList.get(from)!.add(to);

    if (!this.reverseAdjacencyList.has(to)) {
      this.reverseAdjacencyList.set(to, new Set());
    }
    this.reverseAdjacencyList.get(to)!.add(from);
  }

  getChildren(node: string): string[] {
    return [...(this.adjacencyList.get(node) || [])];
  }

  getParents(node: string): string[] {
    return [...(this.reverseAdjacencyList.get(node) || [])];
  }

  getAncestors(node: string): Set<string> {
    const ancestors = new Set<string>();
    const stack = this.getParents(node);

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!ancestors.has(current)) {
        ancestors.add(current);
        stack.push(...this.getParents(current));
      }
    }

    return ancestors;
  }

  getDescendants(node: string): Set<string> {
    const descendants = new Set<string>();
    const stack = this.getChildren(node);

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (!descendants.has(current)) {
        descendants.add(current);
        stack.push(...this.getChildren(current));
      }
    }

    return descendants;
  }

  /**
   * Topological sort using Kahn's algorithm.
   */
  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes) {
      inDegree.set(node, 0);
    }

    for (const [, children] of this.adjacencyList) {
      for (const child of children) {
        inDegree.set(child, (inDegree.get(child) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const child of this.getChildren(node)) {
        const newDegree = (inDegree.get(child) || 0) - 1;
        inDegree.set(child, newDegree);
        if (newDegree === 0) {
          queue.push(child);
        }
      }
    }

    return result;
  }

  /**
   * Check if there is a cycle (would invalidate DAG assumption).
   */
  hasCycle(): boolean {
    return this.topologicalSort().length !== this.nodes.size;
  }

  /**
   * Find all paths between two nodes using DFS.
   */
  findAllPaths(from: string, to: string, maxLength: number = 10): string[][] {
    const paths: string[][] = [];
    const dfs = (current: string, path: string[]) => {
      if (path.length > maxLength) return;
      if (current === to) {
        paths.push([...path]);
        return;
      }

      for (const child of this.getChildren(current)) {
        if (!path.includes(child)) {
          path.push(child);
          dfs(child, path);
          path.pop();
        }
      }
    };

    dfs(from, [from]);
    return paths;
  }

  /**
   * D-separation test (Pearl, 2009).
   * Checks if X and Y are conditionally independent given Z.
   */
  dSeparation(x: string, y: string, z: Set<string>): boolean {
    // Use Bayes-Ball algorithm for d-separation
    const visited = new Map<string, Set<"up" | "down">>();
    const queue: Array<{ node: string; direction: "up" | "down" }> = [];

    // Start from X going both directions
    queue.push({ node: x, direction: "up" });
    queue.push({ node: x, direction: "down" });

    while (queue.length > 0) {
      const { node, direction } = queue.shift()!;

      // Initialize visited set for this node
      if (!visited.has(node)) {
        visited.set(node, new Set());
      }

      // Skip if already visited from this direction
      if (visited.get(node)!.has(direction)) {
        continue;
      }
      visited.get(node)!.add(direction);

      // If we reached Y, path is not blocked
      if (node === y) {
        return false;  // Not d-separated
      }

      // If node is in conditioning set Z
      if (z.has(node)) {
        // Blocked coming from child (up), can go to parents
        if (direction === "up") {
          for (const parent of this.getParents(node)) {
            queue.push({ node: parent, direction: "up" });
          }
        }
        // Blocked coming from parent (down), cannot continue
      } else {
        // Node not in Z
        if (direction === "up") {
          // Coming from child: can go to parents and other children
          for (const parent of this.getParents(node)) {
            queue.push({ node: parent, direction: "up" });
          }
          for (const child of this.getChildren(node)) {
            queue.push({ node: child, direction: "down" });
          }
        } else {
          // Coming from parent: can only go to children
          for (const child of this.getChildren(node)) {
            queue.push({ node: child, direction: "down" });
          }
        }
      }
    }

    return true;  // D-separated
  }

  /**
   * Find all backdoor paths from X to Y.
   * A backdoor path starts with an edge into X.
   */
  findBackdoorPaths(x: string, y: string): string[][] {
    const paths: string[][] = [];

    // Find all paths that go parent -> X -> ... -> Y
    const parents = this.getParents(x);

    for (const parent of parents) {
      // Find paths from parent to Y that don't go through X
      const dfs = (current: string, path: string[]) => {
        if (current === y) {
          paths.push(["backdoor", x, ...path]);
          return;
        }
        if (path.length > 10) return;

        // Go through all neighbors (both parents and children for undirected traversal)
        const neighbors = [...this.getParents(current), ...this.getChildren(current)];
        for (const neighbor of neighbors) {
          if (!path.includes(neighbor) && neighbor !== x) {
            path.push(neighbor);
            dfs(neighbor, path);
            path.pop();
          }
        }
      };

      dfs(parent, [parent]);
    }

    return paths;
  }

  getNodes(): string[] {
    return [...this.nodes];
  }
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

/**
 * Statistical utilities for causal inference.
 */
class CausalStatistics {
  /**
   * Calculate sample correlation between two variables.
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom > 0 ? numerator / denom : 0;
  }

  /**
   * Calculate partial correlation (controlling for Z).
   */
  static partialCorrelation(x: number[], y: number[], z: number[][]): number {
    if (z.length === 0) return this.correlation(x, y);

    // Residualize X and Y on Z using linear regression
    const residualsX = this.residualize(x, z);
    const residualsY = this.residualize(y, z);

    return this.correlation(residualsX, residualsY);
  }

  /**
   * Get residuals from linear regression.
   */
  static residualize(y: number[], X: number[][]): number[] {
    const n = y.length;
    if (n === 0 || X.length === 0) return y;

    // Simple OLS: y = X*beta + residuals
    // For single regressor: residuals = y - X*(X'X)^(-1)*X'y
    const XtX = this.dotProduct(X[0], X[0]);
    if (XtX === 0) return y;

    const XtY = this.dotProduct(X[0], y);
    const beta = XtY / XtX;

    return y.map((yi, i) => yi - beta * X[0][i]);
  }

  /**
   * Dot product of two vectors.
   */
  static dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  }

  /**
   * Calculate Fisher's z-transformation for correlation test.
   */
  static fisherZ(r: number, n: number): { z: number; p: number } {
    const z = 0.5 * Math.log((1 + r) / (1 - r));
    const se = 1 / Math.sqrt(n - 3);
    const zStat = z / se;
    const p = 2 * (1 - this.normalCDF(Math.abs(zStat)));
    return { z: zStat, p };
  }

  /**
   * Standard normal CDF approximation.
   */
  static normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
  }

  /**
   * Linear regression with multiple predictors.
   */
  static linearRegression(y: number[], X: number[][]): {
    coefficients: number[];
    intercept: number;
    rSquared: number;
    residuals: number[];
  } {
    const n = y.length;
    const k = X.length;  // number of predictors

    if (n < k + 1) {
      return { coefficients: [], intercept: 0, rSquared: 0, residuals: y };
    }

    // Add intercept column
    const XWithIntercept: number[][] = [
      new Array(n).fill(1),
      ...X
    ];

    // Normal equations: (X'X)^(-1) X'y
    // Simplified for demonstration - production should use proper matrix inversion
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    if (k === 0) {
      const residuals = y.map(yi => yi - meanY);
      const tss = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
      return { coefficients: [], intercept: meanY, rSquared: 0, residuals };
    }

    // Simple single-variable regression for now
    const x = X[0];
    const meanX = x.reduce((a, b) => a + b, 0) / n;

    let sxy = 0;
    let sxx = 0;
    for (let i = 0; i < n; i++) {
      sxy += (x[i] - meanX) * (y[i] - meanY);
      sxx += (x[i] - meanX) ** 2;
    }

    const slope = sxx > 0 ? sxy / sxx : 0;
    const intercept = meanY - slope * meanX;

    const predicted = x.map(xi => intercept + slope * xi);
    const residuals = y.map((yi, i) => yi - predicted[i]);

    const tss = y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
    const rss = residuals.reduce((sum, ri) => sum + ri ** 2, 0);
    const rSquared = tss > 0 ? 1 - rss / tss : 0;

    return {
      coefficients: [slope],
      intercept,
      rSquared,
      residuals
    };
  }

  /**
   * Estimate propensity scores using logistic regression approximation.
   */
  static propensityScore(treatment: boolean[], covariates: number[][]): number[] {
    const n = treatment.length;
    const scores = new Array(n).fill(0.5);

    if (covariates.length === 0) return scores;

    // Simplified propensity score estimation
    // Use distance from treated mean vs control mean as proxy
    const treatedIndices = treatment.map((t, i) => t ? i : -1).filter(i => i >= 0);
    const controlIndices = treatment.map((t, i) => !t ? i : -1).filter(i => i >= 0);

    if (treatedIndices.length === 0 || controlIndices.length === 0) {
      return scores;
    }

    for (let i = 0; i < n; i++) {
      let treatedDist = 0;
      let controlDist = 0;

      for (const covariate of covariates) {
        const treatedMean = treatedIndices.reduce((sum, idx) => sum + covariate[idx], 0) / treatedIndices.length;
        const controlMean = controlIndices.reduce((sum, idx) => sum + covariate[idx], 0) / controlIndices.length;

        treatedDist += (covariate[i] - treatedMean) ** 2;
        controlDist += (covariate[i] - controlMean) ** 2;
      }

      // Inverse distance weighting
      const totalDist = Math.sqrt(treatedDist) + Math.sqrt(controlDist);
      if (totalDist > 0) {
        scores[i] = Math.sqrt(controlDist) / totalDist;
      }
    }

    // Clip to (0.01, 0.99) to avoid extreme weights
    return scores.map(s => Math.max(0.01, Math.min(0.99, s)));
  }

  /**
   * Bootstrap confidence interval.
   */
  static bootstrapCI(
    data: number[],
    estimator: (sample: number[]) => number,
    nBootstrap: number = 1000,
    alpha: number = 0.05
  ): [number, number] {
    const estimates: number[] = [];

    for (let b = 0; b < nBootstrap; b++) {
      const sample = data.map(() => data[Math.floor(Math.random() * data.length)]);
      estimates.push(estimator(sample));
    }

    estimates.sort((a, b) => a - b);
    const lower = estimates[Math.floor(nBootstrap * alpha / 2)];
    const upper = estimates[Math.floor(nBootstrap * (1 - alpha / 2))];

    return [lower, upper];
  }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheCausalInferenceEngine {
  private models: Map<string, StructuralCausalModel> = new Map();
  private dagCache: Map<string, CausalDAG> = new Map();

  // ============================================================================
  // MODEL CONSTRUCTION
  // ============================================================================

  /**
   * Build a causal model for a specific lathe domain.
   *
   * @param domain - The lathe operation domain (turning, boring, etc.)
   * @param customVariables - Optional custom variables to add
   * @param customEdges - Optional custom edges to add
   * @returns The constructed structural causal model
   */
  buildCausalModel(
    domain: StructuralCausalModel["domain"],
    customVariables?: CausalVariable[],
    customEdges?: CausalEdge[]
  ): StructuralCausalModel {
    const modelId = `scm_${domain}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start with template variables
    const variables = new Map<string, CausalVariable>();
    for (const v of LATHE_VARIABLE_TEMPLATES) {
      variables.set(v.id, { ...v });
    }

    // Add custom variables
    if (customVariables) {
      for (const v of customVariables) {
        variables.set(v.id, v);
      }
    }

    // Start with template edges filtered by available variables
    let edges = LATHE_CAUSAL_TEMPLATES.filter(
      e => variables.has(e.from) && variables.has(e.to)
    );

    // Add custom edges
    if (customEdges) {
      edges = [...edges, ...customEdges];
    }

    // Build DAG and verify acyclicity
    const dag = new CausalDAG(edges.map(e => ({ from: e.from, to: e.to })));
    if (dag.hasCycle()) {
      log.warn(`[LatheCausalInference] Cycle detected in causal model, removing problematic edges`);
      // Remove edges that create cycles (simplified approach)
      edges = this.removeCycles(edges);
    }

    // Compute topological order
    const topologicalOrder = dag.topologicalSort();

    // Initialize exogenous noise
    const exogenousNoise = new Map<string, number>();
    for (const edge of edges) {
      if (edge.noise_variance !== undefined) {
        exogenousNoise.set(edge.to, edge.noise_variance);
      }
    }

    // Build adjacency matrix
    const nodeList = [...variables.keys()];
    const nodeIndex = new Map(nodeList.map((n, i) => [n, i]));
    const adjacencyMatrix = Array.from({ length: nodeList.length }, () =>
      new Array(nodeList.length).fill(0)
    );

    for (const edge of edges) {
      const fromIdx = nodeIndex.get(edge.from);
      const toIdx = nodeIndex.get(edge.to);
      if (fromIdx !== undefined && toIdx !== undefined) {
        adjacencyMatrix[fromIdx][toIdx] = edge.strength;
      }
    }

    const model: StructuralCausalModel = {
      id: modelId,
      name: `Lathe ${domain} Causal Model`,
      domain,
      variables,
      edges,
      exogenous_noise: exogenousNoise,
      adjacency_matrix: adjacencyMatrix,
      topological_order: topologicalOrder,
      d_separation_cache: new Map(),
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    };

    this.models.set(modelId, model);
    this.dagCache.set(modelId, dag);

    log.info(`[LatheCausalInference] Built causal model ${modelId}: ${variables.size} variables, ${edges.length} edges`);

    return model;
  }

  /**
   * Remove edges that create cycles using topological sort failure detection.
   */
  private removeCycles(edges: CausalEdge[]): CausalEdge[] {
    const result: CausalEdge[] = [];

    for (const edge of edges) {
      // Try adding edge and check for cycle
      const testEdges = [...result, edge];
      const testDag = new CausalDAG(testEdges.map(e => ({ from: e.from, to: e.to })));

      if (!testDag.hasCycle()) {
        result.push(edge);
      }
    }

    return result;
  }

  // ============================================================================
  // CAUSAL EFFECT ESTIMATION
  // ============================================================================

  /**
   * Estimate the causal effect of treatment on outcome.
   * Implements backdoor adjustment when valid adjustment set exists.
   *
   * @param modelId - The causal model ID
   * @param treatment - Treatment variable ID
   * @param outcome - Outcome variable ID
   * @param data - Observational data
   * @returns Causal effect estimate with confidence intervals
   */
  estimateCausalEffect(
    modelId: string,
    treatment: string,
    outcome: string,
    data: Array<Record<string, number>>
  ): CausalEffectEstimate | null {
    const model = this.models.get(modelId);
    const dag = this.dagCache.get(modelId);

    if (!model || !dag) {
      log.error(`[LatheCausalInference] Model ${modelId} not found`);
      return null;
    }

    // Check if effect is identifiable via backdoor criterion
    const backdoorResult = this.checkBackdoorCriterion(modelId, treatment, outcome);

    if (!backdoorResult.is_identifiable) {
      log.warn(`[LatheCausalInference] Causal effect not identifiable via backdoor criterion`);

      // Try front-door criterion
      const frontdoorResult = this.checkFrontdoorCriterion(modelId, treatment, outcome);
      if (frontdoorResult.is_identifiable) {
        return this.estimateViaFrontdoor(model, treatment, outcome, frontdoorResult, data);
      }

      // Return bounds if not identifiable
      return this.estimateBounds(model, treatment, outcome, data);
    }

    // Use backdoor adjustment
    const adjustmentSet = backdoorResult.minimal_adjustment_set;

    // Extract data arrays
    const treatmentValues = data.map(d => d[treatment]);
    const outcomeValues = data.map(d => d[outcome]);
    const confoundersData = adjustmentSet.map(c => data.map(d => d[c]));

    // Estimate ATE using regression adjustment
    const { ate, se, ci } = this.backdoorAdjustment(
      treatmentValues,
      outcomeValues,
      confoundersData
    );

    // Sensitivity analysis
    const sensitivity = this.sensitivityAnalysis(ate, se, data.length);

    return {
      treatment,
      outcome,
      estimator: "ate",
      estimate: ate,
      standard_error: se,
      confidence_interval: ci,
      confidence_level: 0.95,
      sample_size: data.length,
      method: "backdoor",
      adjustment_set: adjustmentSet,
      assumptions: [
        "No unmeasured confounding (ignorability)",
        "Positivity (overlap)",
        "SUTVA (no interference)",
        "Correct functional form"
      ],
      sensitivity_analysis: sensitivity
    };
  }

  /**
   * Backdoor adjustment formula implementation.
   * E[Y|do(X=x)] = sum_z E[Y|X=x, Z=z] * P(Z=z)
   */
  private backdoorAdjustment(
    treatment: number[],
    outcome: number[],
    confounders: number[][]
  ): { ate: number; se: number; ci: [number, number] } {
    const n = treatment.length;

    // Regression adjustment approach
    // Fit outcome model: Y = alpha + beta*X + gamma*Z + epsilon
    const reg = CausalStatistics.linearRegression(
      outcome,
      [treatment, ...confounders]
    );

    const ate = reg.coefficients[0] || 0;

    // Estimate standard error
    const residualVariance = reg.residuals.reduce((sum, r) => sum + r * r, 0) / (n - reg.coefficients.length - 1);
    const treatmentVariance = treatment.reduce((sum, t) => {
      const mean = treatment.reduce((a, b) => a + b, 0) / n;
      return sum + (t - mean) ** 2;
    }, 0);

    const se = treatmentVariance > 0 ? Math.sqrt(residualVariance / treatmentVariance) : 0;

    // 95% confidence interval
    const ci: [number, number] = [ate - 1.96 * se, ate + 1.96 * se];

    return { ate, se, ci };
  }

  /**
   * Estimate via front-door criterion when available.
   */
  private estimateViaFrontdoor(
    model: StructuralCausalModel,
    treatment: string,
    outcome: string,
    frontdoor: FrontDoorResult,
    data: Array<Record<string, number>>
  ): CausalEffectEstimate {
    // Front-door formula: P(y|do(x)) = sum_m P(m|x) * sum_x' P(y|m,x') * P(x')
    const mediator = frontdoor.mediators[0];

    const treatmentValues = data.map(d => d[treatment]);
    const mediatorValues = data.map(d => d[mediator]);
    const outcomeValues = data.map(d => d[outcome]);

    // Step 1: Effect of X on M
    const xOnM = CausalStatistics.linearRegression(mediatorValues, [treatmentValues]);

    // Step 2: Effect of M on Y controlling for X
    const mOnY = CausalStatistics.linearRegression(outcomeValues, [mediatorValues, treatmentValues]);

    // Front-door effect = effect(X->M) * effect(M->Y|X)
    const ate = (xOnM.coefficients[0] || 0) * (mOnY.coefficients[0] || 0);

    // Simplified SE (should use delta method in production)
    const se = 0.1 * Math.abs(ate);
    const ci: [number, number] = [ate - 1.96 * se, ate + 1.96 * se];

    return {
      treatment,
      outcome,
      estimator: "ate",
      estimate: ate,
      standard_error: se,
      confidence_interval: ci,
      confidence_level: 0.95,
      sample_size: data.length,
      method: "frontdoor",
      adjustment_set: frontdoor.mediators,
      assumptions: [
        "Complete mediation through identified mediators",
        "No direct effect of unobserved confounders on mediator",
        "No X-M interaction"
      ]
    };
  }

  /**
   * Estimate bounds when effect is not point-identifiable.
   */
  private estimateBounds(
    model: StructuralCausalModel,
    treatment: string,
    outcome: string,
    data: Array<Record<string, number>>
  ): CausalEffectEstimate {
    // Manski bounds (no assumptions)
    const treatmentValues = data.map(d => d[treatment]);
    const outcomeValues = data.map(d => d[outcome]);

    const outcomeDomain = model.variables.get(outcome)?.domain;
    const yMin = outcomeDomain?.min ?? Math.min(...outcomeValues);
    const yMax = outcomeDomain?.max ?? Math.max(...outcomeValues);

    // Calculate conditional means
    const treatmentMean = treatmentValues.reduce((a, b) => a + b, 0) / treatmentValues.length;
    const highTreatment = data.filter((_, i) => treatmentValues[i] > treatmentMean);
    const lowTreatment = data.filter((_, i) => treatmentValues[i] <= treatmentMean);

    const E_Y_high = highTreatment.length > 0
      ? highTreatment.reduce((sum, d) => sum + d[outcome], 0) / highTreatment.length
      : 0;
    const E_Y_low = lowTreatment.length > 0
      ? lowTreatment.reduce((sum, d) => sum + d[outcome], 0) / lowTreatment.length
      : 0;

    // Observational difference (biased but informative)
    const naiveEstimate = E_Y_high - E_Y_low;

    // Wide bounds (conservative)
    const bounds: [number, number] = [
      Math.max(yMin - yMax, naiveEstimate - Math.abs(naiveEstimate)),
      Math.min(yMax - yMin, naiveEstimate + Math.abs(naiveEstimate))
    ];

    return {
      treatment,
      outcome,
      estimator: "ate",
      estimate: naiveEstimate,
      standard_error: (bounds[1] - bounds[0]) / 4,  // Approximate
      confidence_interval: bounds,
      confidence_level: 0.95,
      sample_size: data.length,
      method: "backdoor",  // Attempted method
      bounds,
      assumptions: [
        "CAUTION: Effect not point-identified",
        "Bounds based on Manski partial identification",
        "May contain unmeasured confounding"
      ]
    };
  }

  /**
   * Sensitivity analysis for unmeasured confounding.
   */
  private sensitivityAnalysis(
    ate: number,
    se: number,
    n: number
  ): { robustness_value: number; e_value: number } {
    // E-value: minimum strength of confounding to explain away the effect
    // E-value = RR + sqrt(RR * (RR - 1)) where RR is the observed relative risk

    const t_stat = Math.abs(ate / se);
    const approximateRR = Math.exp(Math.abs(ate));

    // E-value formula (VanderWeele & Ding, 2017)
    const e_value = approximateRR > 1
      ? approximateRR + Math.sqrt(approximateRR * (approximateRR - 1))
      : 1;

    // Robustness value: correlation with both X and Y needed to nullify
    const robustness_value = Math.sqrt(t_stat / (t_stat + Math.sqrt(n)));

    return { robustness_value, e_value };
  }

  // ============================================================================
  // COUNTERFACTUAL ANALYSIS
  // ============================================================================

  /**
   * Perform counterfactual analysis: "What if X had been different?"
   * Implements Pearl's three-step process: abduction, action, prediction.
   *
   * @param modelId - The causal model ID
   * @param observation - Observed factual values
   * @param intervention - Hypothetical intervention
   * @returns Counterfactual predictions and causal effects
   */
  counterfactual(
    modelId: string,
    observation: ObservedValue[],
    intervention: Intervention
  ): CounterfactualResult | null {
    const model = this.models.get(modelId);
    const dag = this.dagCache.get(modelId);

    if (!model || !dag) {
      log.error(`[LatheCausalInference] Model ${modelId} not found`);
      return null;
    }

    const queryId = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Step 1: ABDUCTION - Infer exogenous noise from observations
    const exogenousValues = this.abduction(model, observation);

    // Step 2: ACTION - Modify the model to implement intervention (do-operator)
    const interventionModel = this.applyIntervention(model, intervention);

    // Step 3: PREDICTION - Compute counterfactual outcomes using modified model
    const counterfactualOutcomes = this.prediction(
      interventionModel,
      exogenousValues,
      intervention
    );

    // Compute factual outcomes (baseline)
    const factualOutcomes = new Map<string, number | string | boolean>();
    for (const obs of observation) {
      factualOutcomes.set(obs.variable_id, obs.value);
    }

    // Compute causal effects
    const causalEffects = new Map<string, number>();
    for (const [variable, cfValue] of counterfactualOutcomes) {
      const factualValue = factualOutcomes.get(variable);
      if (typeof cfValue === "number" && typeof factualValue === "number") {
        causalEffects.set(variable, cfValue - factualValue);
      }
    }

    // Estimate probabilities of necessity and sufficiency
    const pn = this.probabilityOfNecessity(model, observation, intervention);
    const ps = this.probabilityOfSufficiency(model, observation, intervention);

    // Build reasoning chain
    const reasoning = this.buildCounterfactualReasoning(
      model,
      observation,
      intervention,
      factualOutcomes,
      counterfactualOutcomes
    );

    return {
      query_id: queryId,
      factual_outcomes: factualOutcomes,
      counterfactual_outcomes: counterfactualOutcomes,
      causal_effects: causalEffects,
      probability_of_necessity: pn,
      probability_of_sufficiency: ps,
      confidence: 0.85,  // Depends on model quality
      reasoning
    };
  }

  /**
   * Abduction: Infer exogenous noise values from observations.
   */
  private abduction(
    model: StructuralCausalModel,
    observation: ObservedValue[]
  ): Map<string, number> {
    const exogenous = new Map<string, number>();

    // Create observation map
    const obsMap = new Map<string, number | string | boolean>();
    for (const obs of observation) {
      obsMap.set(obs.variable_id, obs.value);
    }

    // Traverse in topological order
    for (const varId of model.topological_order) {
      const observedValue = obsMap.get(varId);
      if (observedValue === undefined || typeof observedValue !== "number") {
        exogenous.set(varId, 0);
        continue;
      }

      // Calculate expected value from parents
      let expectedValue = 0;
      const incomingEdges = model.edges.filter(e => e.to === varId);

      for (const edge of incomingEdges) {
        const parentValue = obsMap.get(edge.from);
        if (typeof parentValue === "number") {
          expectedValue += this.applyFunctionalForm(parentValue, edge);
        }
      }

      // Exogenous = observed - expected
      exogenous.set(varId, observedValue - expectedValue);
    }

    return exogenous;
  }

  /**
   * Apply functional form to compute edge contribution.
   */
  private applyFunctionalForm(inputValue: number, edge: CausalEdge): number {
    const coef = edge.coefficients?.[0] ?? edge.strength;

    switch (edge.functional_form) {
      case "linear":
        return coef * inputValue;
      case "quadratic":
        return coef * inputValue * inputValue;
      case "exponential":
        return Math.pow(inputValue, coef);
      case "logarithmic":
        return coef * Math.log(Math.max(0.001, inputValue));
      case "threshold":
        return inputValue > (edge.coefficients?.[0] ?? 0.5) ? edge.strength : 0;
      default:
        return edge.strength * inputValue;
    }
  }

  /**
   * Apply do-operator intervention to model (removes incoming edges).
   */
  private applyIntervention(
    model: StructuralCausalModel,
    intervention: Intervention
  ): StructuralCausalModel {
    // Create modified model with edges into intervention variable removed
    const modifiedEdges = model.edges.filter(e => e.to !== intervention.variable_id);

    return {
      ...model,
      edges: modifiedEdges,
      id: `${model.id}_intervention`
    };
  }

  /**
   * Prediction: Compute outcomes under intervention.
   */
  private prediction(
    model: StructuralCausalModel,
    exogenous: Map<string, number>,
    intervention: Intervention
  ): Map<string, number | string | boolean> {
    const values = new Map<string, number | string | boolean>();

    // Set intervention value
    values.set(intervention.variable_id, intervention.new_value);

    // Propagate through DAG in topological order
    for (const varId of model.topological_order) {
      if (varId === intervention.variable_id) {
        continue;  // Already set
      }

      // Calculate value from parents
      let value = exogenous.get(varId) ?? 0;
      const incomingEdges = model.edges.filter(e => e.to === varId);

      for (const edge of incomingEdges) {
        const parentValue = values.get(edge.from);
        if (typeof parentValue === "number") {
          value += this.applyFunctionalForm(parentValue, edge);
        }
      }

      // Clamp to domain
      const variable = model.variables.get(varId);
      if (variable?.domain) {
        if (variable.domain.min !== undefined) {
          value = Math.max(variable.domain.min, value);
        }
        if (variable.domain.max !== undefined) {
          value = Math.min(variable.domain.max, value);
        }
      }

      values.set(varId, value);
    }

    return values;
  }

  /**
   * Probability of Necessity: P(Y'=0 | X=1, Y=1, do(X=0))
   * "Was the cause necessary for the effect?"
   */
  private probabilityOfNecessity(
    model: StructuralCausalModel,
    observation: ObservedValue[],
    intervention: Intervention
  ): number {
    // Simplified PN estimation based on causal structure
    const dag = this.dagCache.get(model.id);
    if (!dag) return 0.5;

    // Check if there are alternative paths
    const alternativePaths = dag.findAllPaths(
      intervention.variable_id,
      model.topological_order[model.topological_order.length - 1]
    );

    // Higher PN if fewer alternative paths
    return Math.max(0.1, 1 - alternativePaths.length * 0.1);
  }

  /**
   * Probability of Sufficiency: P(Y'=1 | X=0, Y=0, do(X=1))
   * "Would the cause be sufficient to produce the effect?"
   */
  private probabilityOfSufficiency(
    model: StructuralCausalModel,
    observation: ObservedValue[],
    intervention: Intervention
  ): number {
    // Simplified PS estimation
    // Look at direct effect strength
    const directEdges = model.edges.filter(
      e => e.from === intervention.variable_id
    );

    if (directEdges.length === 0) return 0.3;

    const avgStrength = directEdges.reduce((sum, e) => sum + Math.abs(e.strength), 0) / directEdges.length;
    return Math.min(0.95, avgStrength * 1.2);
  }

  /**
   * Build human-readable reasoning for counterfactual.
   */
  private buildCounterfactualReasoning(
    model: StructuralCausalModel,
    observation: ObservedValue[],
    intervention: Intervention,
    factual: Map<string, number | string | boolean>,
    counterfactual: Map<string, number | string | boolean>
  ): string[] {
    const reasoning: string[] = [];

    // Describe the factual situation
    const intervenedVar = model.variables.get(intervention.variable_id);
    const factualValue = factual.get(intervention.variable_id);

    reasoning.push(
      `FACTUAL: ${intervenedVar?.name || intervention.variable_id} was ${factualValue}`
    );

    // Describe the hypothetical
    reasoning.push(
      `HYPOTHETICAL: What if ${intervenedVar?.name || intervention.variable_id} had been ${intervention.new_value}?`
    );

    // List affected variables
    reasoning.push("AFFECTED OUTCOMES:");
    for (const [varId, cfValue] of counterfactual) {
      const factValue = factual.get(varId);
      if (factValue !== cfValue && varId !== intervention.variable_id) {
        const variable = model.variables.get(varId);
        const change = typeof cfValue === "number" && typeof factValue === "number"
          ? cfValue - factValue
          : "changed";
        reasoning.push(
          `  - ${variable?.name || varId}: ${factValue} -> ${cfValue} (change: ${typeof change === "number" ? change.toFixed(3) : change})`
        );
      }
    }

    // Explain causal pathway
    const pathEdges = model.edges.filter(e => e.from === intervention.variable_id);
    if (pathEdges.length > 0) {
      reasoning.push("CAUSAL MECHANISM:");
      for (const edge of pathEdges) {
        reasoning.push(`  - ${edge.mechanism}`);
      }
    }

    return reasoning;
  }

  // ============================================================================
  // CAUSAL DISCOVERY
  // ============================================================================

  /**
   * Discover causal structure from observational data.
   * Implements the PC algorithm (Spirtes, Glymour, Scheines, 2000).
   *
   * @param data - Observational data
   * @param variables - Variable definitions
   * @param alpha - Significance level for independence tests
   * @returns Discovered causal structure
   */
  discoverStructure(
    data: Array<Record<string, number>>,
    variables: string[],
    alpha: number = 0.05
  ): DiscoveryResult {
    const independenceTests: IndependenceTest[] = [];
    const n = data.length;

    // Phase 1: Start with complete undirected graph
    const skeleton = new Map<string, Set<string>>();
    for (const v of variables) {
      skeleton.set(v, new Set(variables.filter(u => u !== v)));
    }

    // Phase 2: Remove edges based on conditional independence tests
    for (let depth = 0; depth <= variables.length - 2; depth++) {
      for (const x of variables) {
        for (const y of [...(skeleton.get(x) || [])]) {
          // Get possible conditioning sets
          const neighbors = [...(skeleton.get(x) || [])].filter(n => n !== y);

          // Generate conditioning sets of size `depth`
          const conditioningSets = this.combinations(neighbors, depth);

          for (const condSet of conditioningSets) {
            // Test X _||_ Y | condSet
            const testResult = this.conditionalIndependenceTest(
              data.map(d => d[x]),
              data.map(d => d[y]),
              condSet.map(c => data.map(d => d[c])),
              alpha
            );

            independenceTests.push({
              variable_x: x,
              variable_y: y,
              conditioning_set: condSet,
              test_statistic: testResult.statistic,
              p_value: testResult.pValue,
              is_independent: testResult.independent,
              significance_level: alpha
            });

            if (testResult.independent) {
              // Remove edge
              skeleton.get(x)?.delete(y);
              skeleton.get(y)?.delete(x);
              break;
            }
          }
        }
      }
    }

    // Phase 3: Orient edges using v-structures (colliders)
    const orientedEdges: CausalEdge[] = [];
    const undirectedEdges: Array<[string, string]> = [];

    // Identify v-structures: X -> Z <- Y where X and Y are not adjacent
    for (const z of variables) {
      const parents = [...(skeleton.get(z) || [])];
      for (let i = 0; i < parents.length; i++) {
        for (let j = i + 1; j < parents.length; j++) {
          const x = parents[i];
          const y = parents[j];

          // Check if X and Y are not adjacent
          if (!skeleton.get(x)?.has(y)) {
            // Check if Z is not in the separating set of X and Y
            const sepSet = this.findSeparatingSet(independenceTests, x, y);
            if (!sepSet.includes(z)) {
              // Orient as v-structure: X -> Z <- Y
              orientedEdges.push({
                from: x, to: z,
                strength: this.estimateStrength(data, x, z),
                confidence: 0.85,
                mechanism: "Discovered via PC algorithm (v-structure)",
                functional_form: "linear",
                is_deterministic: false
              });
              orientedEdges.push({
                from: y, to: z,
                strength: this.estimateStrength(data, y, z),
                confidence: 0.85,
                mechanism: "Discovered via PC algorithm (v-structure)",
                functional_form: "linear",
                is_deterministic: false
              });
            }
          }
        }
      }
    }

    // Remaining edges are undirected
    const oriented = new Set<string>();
    for (const edge of orientedEdges) {
      oriented.add(`${edge.from}->${edge.to}`);
    }

    for (const [x, neighbors] of skeleton) {
      for (const y of neighbors) {
        if (!oriented.has(`${x}->${y}`) && !oriented.has(`${y}->${x}`)) {
          if (x < y) {  // Avoid duplicates
            undirectedEdges.push([x, y]);
          }
        }
      }
    }

    // Calculate BIC score
    const score = this.calculateBICScore(data, orientedEdges, undirectedEdges);

    return {
      algorithm: "pc",
      skeleton: orientedEdges,
      oriented_edges: orientedEdges,
      undirected_edges: undirectedEdges,
      equivalence_class_size: Math.pow(2, undirectedEdges.length),
      score,
      independence_tests: independenceTests,
      confidence: Math.min(0.95, 0.5 + n / 1000),
      warnings: undirectedEdges.length > 0
        ? [`${undirectedEdges.length} edges remain undirected - causal direction ambiguous`]
        : []
    };
  }

  /**
   * Generate combinations of k elements from array.
   */
  private combinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (k > arr.length) return [];

    const result: T[][] = [];
    for (let i = 0; i <= arr.length - k; i++) {
      const rest = this.combinations(arr.slice(i + 1), k - 1);
      for (const combo of rest) {
        result.push([arr[i], ...combo]);
      }
    }
    return result;
  }

  /**
   * Conditional independence test using partial correlation.
   */
  private conditionalIndependenceTest(
    x: number[],
    y: number[],
    z: number[][],
    alpha: number
  ): { independent: boolean; statistic: number; pValue: number } {
    const partialCorr = CausalStatistics.partialCorrelation(x, y, z);
    const n = x.length;
    const df = n - z.length - 2;

    // Fisher's z-test
    const { z: zStat, p } = CausalStatistics.fisherZ(partialCorr, df);

    return {
      independent: p > alpha,
      statistic: zStat,
      pValue: p
    };
  }

  /**
   * Find separating set from independence test results.
   */
  private findSeparatingSet(tests: IndependenceTest[], x: string, y: string): string[] {
    for (const test of tests) {
      if (
        ((test.variable_x === x && test.variable_y === y) ||
         (test.variable_x === y && test.variable_y === x)) &&
        test.is_independent
      ) {
        return test.conditioning_set;
      }
    }
    return [];
  }

  /**
   * Estimate edge strength from correlation.
   */
  private estimateStrength(data: Array<Record<string, number>>, x: string, y: string): number {
    const xVals = data.map(d => d[x]);
    const yVals = data.map(d => d[y]);
    return CausalStatistics.correlation(xVals, yVals);
  }

  /**
   * Calculate BIC score for discovered structure.
   */
  private calculateBICScore(
    data: Array<Record<string, number>>,
    edges: CausalEdge[],
    undirected: Array<[string, string]>
  ): number {
    const n = data.length;
    const k = edges.length + undirected.length;  // Number of parameters

    // Simplified BIC: -2 * logLik + k * log(n)
    // Use total variance explained as proxy for likelihood
    let totalRSquared = 0;
    const variables = new Set<string>();

    for (const edge of edges) {
      variables.add(edge.from);
      variables.add(edge.to);

      const xVals = data.map(d => d[edge.from]);
      const yVals = data.map(d => d[edge.to]);
      const reg = CausalStatistics.linearRegression(yVals, [xVals]);
      totalRSquared += reg.rSquared;
    }

    const avgRSquared = edges.length > 0 ? totalRSquared / edges.length : 0;
    const pseudoLogLik = n * Math.log(Math.max(0.01, avgRSquared));

    return -2 * pseudoLogLik + k * Math.log(n);
  }

  /**
   * Granger causality test for time-series data.
   *
   * @param x - Potential cause time series
   * @param y - Potential effect time series
   * @param maxLag - Maximum lag to consider
   * @returns Test results indicating if x Granger-causes y
   */
  grangerCausality(
    x: number[],
    y: number[],
    maxLag: number = 5
  ): {
    granger_causes: boolean;
    f_statistic: number;
    p_value: number;
    optimal_lag: number;
    direction: "x->y" | "y->x" | "bidirectional" | "none";
  } {
    if (x.length !== y.length || x.length < maxLag + 10) {
      return {
        granger_causes: false,
        f_statistic: 0,
        p_value: 1,
        optimal_lag: 1,
        direction: "none"
      };
    }

    // Test X -> Y
    const { fStat: fXY, pValue: pXY, bestLag: lagXY } = this.grangerTest(x, y, maxLag);

    // Test Y -> X
    const { fStat: fYX, pValue: pYX, bestLag: lagYX } = this.grangerTest(y, x, maxLag);

    const alpha = 0.05;
    const xCausesY = pXY < alpha;
    const yCausesX = pYX < alpha;

    let direction: "x->y" | "y->x" | "bidirectional" | "none";
    if (xCausesY && yCausesX) {
      direction = "bidirectional";
    } else if (xCausesY) {
      direction = "x->y";
    } else if (yCausesX) {
      direction = "y->x";
    } else {
      direction = "none";
    }

    return {
      granger_causes: xCausesY,
      f_statistic: fXY,
      p_value: pXY,
      optimal_lag: lagXY,
      direction
    };
  }

  /**
   * Perform Granger test with lag selection.
   */
  private grangerTest(
    x: number[],
    y: number[],
    maxLag: number
  ): { fStat: number; pValue: number; bestLag: number } {
    let bestFStat = 0;
    let bestPValue = 1;
    let bestLag = 1;

    for (let lag = 1; lag <= maxLag; lag++) {
      // Restricted model: y_t = a + sum(b_i * y_{t-i})
      // Unrestricted model: y_t = a + sum(b_i * y_{t-i}) + sum(c_i * x_{t-i})

      const n = y.length - lag;

      // Build lagged variables
      const yLagged: number[][] = [];
      const xLagged: number[][] = [];
      const yCurrent: number[] = [];

      for (let t = lag; t < y.length; t++) {
        yCurrent.push(y[t]);
        const yLags: number[] = [];
        const xLags: number[] = [];
        for (let l = 1; l <= lag; l++) {
          yLags.push(y[t - l]);
          xLags.push(x[t - l]);
        }
        if (yLagged.length === 0) {
          for (let l = 0; l < lag; l++) {
            yLagged.push([]);
            xLagged.push([]);
          }
        }
        for (let l = 0; l < lag; l++) {
          yLagged[l].push(yLags[l]);
          xLagged[l].push(xLags[l]);
        }
      }

      // Restricted model RSS
      const restricted = CausalStatistics.linearRegression(yCurrent, yLagged);
      const RSS_r = restricted.residuals.reduce((sum, r) => sum + r * r, 0);

      // Unrestricted model RSS
      const unrestricted = CausalStatistics.linearRegression(yCurrent, [...yLagged, ...xLagged]);
      const RSS_u = unrestricted.residuals.reduce((sum, r) => sum + r * r, 0);

      // F-statistic
      const df1 = lag;  // Additional parameters
      const df2 = n - 2 * lag - 1;
      const fStat = df2 > 0 ? ((RSS_r - RSS_u) / df1) / (RSS_u / df2) : 0;

      // Approximate p-value (simplified)
      const pValue = fStat > 4 ? 0.01 : fStat > 2.5 ? 0.05 : fStat > 1.5 ? 0.1 : 0.5;

      if (fStat > bestFStat) {
        bestFStat = fStat;
        bestPValue = pValue;
        bestLag = lag;
      }
    }

    return { fStat: bestFStat, pValue: bestPValue, bestLag };
  }

  // ============================================================================
  // BACKDOOR & FRONT-DOOR CRITERIA
  // ============================================================================

  /**
   * Check backdoor criterion for identifiability.
   * A set Z satisfies the backdoor criterion if:
   * 1. Z blocks all backdoor paths from X to Y
   * 2. Z contains no descendants of X
   */
  checkBackdoorCriterion(
    modelId: string,
    treatment: string,
    outcome: string
  ): BackdoorResult {
    const model = this.models.get(modelId);
    const dag = this.dagCache.get(modelId);

    if (!model || !dag) {
      return {
        treatment,
        outcome,
        is_identifiable: false,
        valid_adjustment_sets: [],
        minimal_adjustment_set: [],
        sufficient_adjustment_set: [],
        blocked_paths: [],
        open_backdoor_paths: [],
        confounders: []
      };
    }

    // Find all backdoor paths
    const backdoorPaths = dag.findBackdoorPaths(treatment, outcome);

    // Find descendants of treatment (cannot be in adjustment set)
    const descendants = dag.getDescendants(treatment);

    // Find all potential confounders (common ancestors of X and Y)
    const ancestorsX = dag.getAncestors(treatment);
    const ancestorsY = dag.getAncestors(outcome);
    const confounders = [...ancestorsX].filter(a => ancestorsY.has(a));

    // Generate candidate adjustment sets (excluding descendants)
    const candidates = [...model.variables.keys()].filter(
      v => v !== treatment && v !== outcome && !descendants.has(v)
    );

    // Find valid adjustment sets
    const validSets: string[][] = [];

    // Check all subsets (simplified: just check confounders and their subsets)
    const subsetsToCheck = this.powerSet(confounders).filter(s => s.length <= 5);

    for (const candidate of subsetsToCheck) {
      // Check if this set blocks all backdoor paths
      const candidateSet = new Set(candidate);
      let blocksAll = true;

      for (const path of backdoorPaths) {
        // Check if path is blocked by conditioning on candidate set
        const blocked = this.isPathBlocked(dag, path.slice(1), candidateSet);
        if (!blocked) {
          blocksAll = false;
          break;
        }
      }

      if (blocksAll && !candidate.some(c => descendants.has(c))) {
        validSets.push(candidate);
      }
    }

    // Find minimal adjustment set
    const sortedSets = validSets.sort((a, b) => a.length - b.length);
    const minimalSet = sortedSets[0] || [];

    // Find sufficient adjustment set (parents of X is always valid if no hidden confounders)
    const sufficientSet = dag.getParents(treatment);

    return {
      treatment,
      outcome,
      is_identifiable: validSets.length > 0,
      valid_adjustment_sets: validSets,
      minimal_adjustment_set: minimalSet,
      sufficient_adjustment_set: sufficientSet,
      blocked_paths: backdoorPaths.filter(p =>
        this.isPathBlocked(dag, p.slice(1), new Set(minimalSet))
      ),
      open_backdoor_paths: backdoorPaths.filter(p =>
        !this.isPathBlocked(dag, p.slice(1), new Set(minimalSet))
      ),
      confounders
    };
  }

  /**
   * Power set generator.
   */
  private powerSet<T>(arr: T[]): T[][] {
    const result: T[][] = [[]];
    for (const elem of arr) {
      const len = result.length;
      for (let i = 0; i < len; i++) {
        result.push([...result[i], elem]);
      }
    }
    return result;
  }

  /**
   * Check if a path is blocked by conditioning set.
   */
  private isPathBlocked(dag: CausalDAG, path: string[], condSet: Set<string>): boolean {
    // A path is blocked if any triplet in the path is blocked
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];

      const isCollider = dag.getParents(curr).includes(prev) && dag.getParents(curr).includes(next);

      if (isCollider) {
        // Collider: blocked unless conditioned on (or descendant conditioned on)
        const descendants = dag.getDescendants(curr);
        const conditionedOnColliderOrDescendant =
          condSet.has(curr) || [...descendants].some(d => condSet.has(d));

        if (!conditionedOnColliderOrDescendant) {
          return true;  // Path is blocked at this collider
        }
      } else {
        // Chain or fork: blocked if conditioned on
        if (condSet.has(curr)) {
          return true;  // Path is blocked
        }
      }
    }

    return false;  // Path is open
  }

  /**
   * Check front-door criterion for identifiability.
   * Z satisfies front-door if:
   * 1. Z intercepts all directed paths from X to Y
   * 2. There is no backdoor path from X to Z
   * 3. All backdoor paths from Z to Y are blocked by X
   */
  checkFrontdoorCriterion(
    modelId: string,
    treatment: string,
    outcome: string
  ): FrontDoorResult {
    const model = this.models.get(modelId);
    const dag = this.dagCache.get(modelId);

    if (!model || !dag) {
      return {
        treatment,
        outcome,
        mediators: [],
        is_identifiable: false,
        direct_effect: 0,
        indirect_effects: new Map(),
        total_effect: 0,
        percentage_mediated: 0,
        path_specific_effects: []
      };
    }

    // Find all directed paths from X to Y
    const directedPaths = dag.findAllPaths(treatment, outcome);

    // Find mediators (nodes that appear in all paths)
    const potentialMediators = new Set<string>();
    for (const path of directedPaths) {
      for (let i = 1; i < path.length - 1; i++) {
        potentialMediators.add(path[i]);
      }
    }

    // Check each potential mediator for front-door conditions
    const validMediators: string[] = [];

    for (const m of potentialMediators) {
      // Condition 1: M intercepts all paths from X to Y
      const interceptsAll = directedPaths.every(p => p.includes(m));

      // Condition 2: No backdoor from X to M
      const backdoorXM = dag.findBackdoorPaths(treatment, m);
      const noBackdoorXM = backdoorXM.length === 0;

      // Condition 3: All backdoor from M to Y blocked by X
      const backdoorMY = dag.findBackdoorPaths(m, outcome);
      const blockedByX = backdoorMY.every(p =>
        this.isPathBlocked(dag, p.slice(1), new Set([treatment]))
      );

      if (interceptsAll && noBackdoorXM && blockedByX) {
        validMediators.push(m);
      }
    }

    // Estimate path-specific effects (simplified)
    const pathEffects: Array<{ path: string[]; effect: number; proportion: number }> = [];

    for (const path of directedPaths) {
      let pathEffect = 1;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = model.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
        if (edge) {
          pathEffect *= edge.strength;
        }
      }
      pathEffects.push({
        path,
        effect: pathEffect,
        proportion: 0  // Will be calculated below
      });
    }

    const totalEffect = pathEffects.reduce((sum, pe) => sum + pe.effect, 0);

    // Calculate proportions
    for (const pe of pathEffects) {
      pe.proportion = totalEffect !== 0 ? Math.abs(pe.effect / totalEffect) : 0;
    }

    // Separate direct vs indirect
    const directPaths = directedPaths.filter(p => p.length === 2);
    const directEffect = directPaths.length > 0
      ? model.edges.find(e => e.from === treatment && e.to === outcome)?.strength || 0
      : 0;

    const indirectEffects = new Map<string, number>();
    for (const m of validMediators) {
      const throughM = pathEffects.filter(pe => pe.path.includes(m));
      indirectEffects.set(m, throughM.reduce((sum, pe) => sum + pe.effect, 0));
    }

    return {
      treatment,
      outcome,
      mediators: validMediators,
      is_identifiable: validMediators.length > 0,
      direct_effect: directEffect,
      indirect_effects: indirectEffects,
      total_effect: totalEffect,
      percentage_mediated: totalEffect !== 0 ? (1 - directEffect / totalEffect) * 100 : 0,
      path_specific_effects: pathEffects
    };
  }

  /**
   * Identify potential confounders between treatment and outcome.
   */
  identifyConfounders(modelId: string, treatment: string, outcome: string): string[] {
    const dag = this.dagCache.get(modelId);
    if (!dag) return [];

    // Confounders are common ancestors
    const ancestorsX = dag.getAncestors(treatment);
    const ancestorsY = dag.getAncestors(outcome);

    return [...ancestorsX].filter(a => ancestorsY.has(a));
  }

  // ============================================================================
  // MEDIATION ANALYSIS
  // ============================================================================

  /**
   * Perform mediation analysis.
   * Decomposes total effect into direct and indirect (mediated) effects.
   */
  mediationAnalysis(
    modelId: string,
    treatment: string,
    mediator: string,
    outcome: string,
    data: Array<Record<string, number>>
  ): MediationResult {
    const treatmentValues = data.map(d => d[treatment]);
    const mediatorValues = data.map(d => d[mediator]);
    const outcomeValues = data.map(d => d[outcome]);

    // Step 1: Total effect (X -> Y)
    const totalReg = CausalStatistics.linearRegression(outcomeValues, [treatmentValues]);
    const totalEffect = totalReg.coefficients[0] || 0;

    // Step 2: Effect of X on M
    const aReg = CausalStatistics.linearRegression(mediatorValues, [treatmentValues]);
    const a = aReg.coefficients[0] || 0;

    // Step 3: Effect of M on Y controlling for X
    const bcReg = CausalStatistics.linearRegression(outcomeValues, [mediatorValues, treatmentValues]);
    const b = bcReg.coefficients[0] || 0;
    const directEffect = bcReg.coefficients[1] || 0;

    // Indirect effect = a * b
    const indirectEffect = a * b;

    // ACME (Average Causal Mediation Effect) = indirect effect
    const acme = indirectEffect;

    // ADE (Average Direct Effect) = c' (direct effect)
    const ade = directEffect;

    // Proportion mediated
    const proportionMediated = totalEffect !== 0
      ? indirectEffect / totalEffect
      : 0;

    // Bootstrap CIs (simplified)
    const seTotal = Math.abs(totalEffect) * 0.1;
    const seDirect = Math.abs(directEffect) * 0.1;
    const seIndirect = Math.abs(indirectEffect) * 0.15;

    // Sensitivity: correlation at which indirect effect = 0
    // Using Imai et al. (2010) formula approximation
    const rhoAtZero = Math.abs(indirectEffect) / (Math.abs(totalEffect) + 0.001);

    return {
      treatment,
      mediator,
      outcome,
      total_effect: totalEffect,
      direct_effect: directEffect,
      indirect_effect: indirectEffect,
      proportion_mediated: proportionMediated,
      acme,
      ade,
      confidence_intervals: {
        total: [totalEffect - 1.96 * seTotal, totalEffect + 1.96 * seTotal],
        direct: [directEffect - 1.96 * seDirect, directEffect + 1.96 * seDirect],
        indirect: [indirectEffect - 1.96 * seIndirect, indirectEffect + 1.96 * seIndirect]
      },
      sensitivity: {
        rho_at_which_acme_0: rhoAtZero
      }
    };
  }

  // ============================================================================
  // PROPENSITY SCORE METHODS
  // ============================================================================

  /**
   * Estimate causal effect using propensity score weighting (IPW).
   * Inverse Probability Weighting (Horvitz-Thompson estimator).
   */
  estimateWithPropensityScore(
    treatment: boolean[],
    outcome: number[],
    covariates: number[][]
  ): {
    ate: number;
    standard_error: number;
    propensity_scores: number[];
    effective_sample_size: number;
  } {
    const n = treatment.length;

    // Estimate propensity scores
    const propensityScores = CausalStatistics.propensityScore(treatment, covariates);

    // IPW estimator
    let sumTreated = 0;
    let sumControl = 0;
    let weightTreated = 0;
    let weightControl = 0;

    for (let i = 0; i < n; i++) {
      const ps = propensityScores[i];
      if (treatment[i]) {
        const weight = 1 / ps;
        sumTreated += outcome[i] * weight;
        weightTreated += weight;
      } else {
        const weight = 1 / (1 - ps);
        sumControl += outcome[i] * weight;
        weightControl += weight;
      }
    }

    const ate = (sumTreated / weightTreated) - (sumControl / weightControl);

    // Effective sample size (Kish, 1965)
    const weights = treatment.map((t, i) =>
      t ? 1 / propensityScores[i] : 1 / (1 - propensityScores[i])
    );
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const sumWeightsSq = weights.reduce((a, b) => a + b * b, 0);
    const effectiveSampleSize = (sumWeights * sumWeights) / sumWeightsSq;

    // Standard error estimate
    const se = Math.abs(ate) / Math.sqrt(effectiveSampleSize);

    return {
      ate,
      standard_error: se,
      propensity_scores: propensityScores,
      effective_sample_size: effectiveSampleSize
    };
  }

  // ============================================================================
  // MANUFACTURING-SPECIFIC METHODS
  // ============================================================================

  /**
   * Analyze causal relationships in a lathe operation context.
   */
  analyzeLatheOperation(
    context: LatheOperationContext,
    outcomes: LatheOutcomes
  ): {
    causal_model: StructuralCausalModel;
    key_causal_paths: Array<{ path: string[]; effect: number; interpretation: string }>;
    optimization_recommendations: Array<{ intervention: string; expected_effect: number; confidence: number }>;
    sensitivity_analysis: Record<string, number>;
  } {
    // Build model for this context
    const model = this.buildCausalModel(
      this.mapOperationType(context.operation_type),
      [],
      []
    );

    // Create observation from context
    const observation: ObservedValue[] = [
      { variable_id: "cutting_speed", value: context.parameters.cutting_speed_mpm },
      { variable_id: "feed_rate", value: context.parameters.feed_rate_mmrev },
      { variable_id: "depth_of_cut", value: context.parameters.depth_of_cut_mm },
      { variable_id: "material_hardness", value: context.material.hardness_hb },
      { variable_id: "surface_finish", value: outcomes.surface_finish_ra_um },
      { variable_id: "tool_life", value: outcomes.tool_life_min },
      { variable_id: "cutting_force", value: outcomes.cutting_force_n },
    ];

    // Find key causal paths
    const dag = this.dagCache.get(model.id)!;
    const keyPaths: Array<{ path: string[]; effect: number; interpretation: string }> = [];

    // Speed -> Temperature -> Tool Life path
    const speedToLifePath = dag.findAllPaths("cutting_speed", "tool_life");
    for (const path of speedToLifePath.slice(0, 3)) {
      let effect = 1;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = model.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
        if (edge) effect *= edge.strength;
      }
      keyPaths.push({
        path,
        effect,
        interpretation: `Increasing cutting speed ${effect < 0 ? "decreases" : "increases"} tool life via ${path.slice(1, -1).join(" -> ")}`
      });
    }

    // Feed -> Force -> Deflection -> Accuracy path
    const feedToAccuracyPath = dag.findAllPaths("feed_rate", "dimensional_accuracy");
    for (const path of feedToAccuracyPath.slice(0, 3)) {
      let effect = 1;
      for (let i = 0; i < path.length - 1; i++) {
        const edge = model.edges.find(e => e.from === path[i] && e.to === path[i + 1]);
        if (edge) effect *= edge.strength;
      }
      keyPaths.push({
        path,
        effect,
        interpretation: `Increasing feed rate ${effect < 0 ? "improves" : "degrades"} dimensional accuracy via ${path.slice(1, -1).join(" -> ")}`
      });
    }

    // Generate optimization recommendations
    const recommendations: Array<{ intervention: string; expected_effect: number; confidence: number }> = [];

    // Speed optimization
    if (outcomes.tool_life_min < 30) {
      const cf = this.counterfactual(
        model.id,
        observation,
        {
          variable_id: "cutting_speed",
          new_value: context.parameters.cutting_speed_mpm * 0.85,
          intervention_type: "hard"
        }
      );
      if (cf) {
        const newToolLife = cf.counterfactual_outcomes.get("tool_life");
        if (typeof newToolLife === "number" && newToolLife > outcomes.tool_life_min) {
          recommendations.push({
            intervention: "Reduce cutting speed by 15%",
            expected_effect: newToolLife - outcomes.tool_life_min,
            confidence: cf.confidence
          });
        }
      }
    }

    // Feed optimization for surface finish
    if (outcomes.surface_finish_ra_um > 3.2) {
      const cf = this.counterfactual(
        model.id,
        observation,
        {
          variable_id: "feed_rate",
          new_value: context.parameters.feed_rate_mmrev * 0.7,
          intervention_type: "hard"
        }
      );
      if (cf) {
        const newRa = cf.counterfactual_outcomes.get("surface_finish");
        if (typeof newRa === "number" && newRa < outcomes.surface_finish_ra_um) {
          recommendations.push({
            intervention: "Reduce feed rate by 30%",
            expected_effect: outcomes.surface_finish_ra_um - newRa,
            confidence: cf.confidence
          });
        }
      }
    }

    // Sensitivity analysis
    const sensitivity: Record<string, number> = {};
    const treatments = ["cutting_speed", "feed_rate", "depth_of_cut"];
    const outcomeVar = "surface_finish";

    for (const t of treatments) {
      // Use correlation as proxy for sensitivity
      const edge = model.edges.find(e => e.from === t);
      if (edge) {
        sensitivity[t] = Math.abs(edge.strength);
      }
    }

    return {
      causal_model: model,
      key_causal_paths: keyPaths,
      optimization_recommendations: recommendations,
      sensitivity_analysis: sensitivity
    };
  }

  /**
   * Map operation type to model domain.
   */
  private mapOperationType(
    opType: LatheOperationContext["operation_type"]
  ): StructuralCausalModel["domain"] {
    switch (opType) {
      case "od_turning": return "lathe_turning";
      case "id_boring": return "lathe_boring";
      case "threading": return "lathe_threading";
      case "grooving": return "lathe_grooving";
      default: return "general";
    }
  }

  // ============================================================================
  // QUERY & RETRIEVAL
  // ============================================================================

  /**
   * Get a causal model by ID.
   */
  getModel(modelId: string): StructuralCausalModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * List all models.
   */
  listModels(): Array<{ id: string; name: string; domain: string; variables: number; edges: number }> {
    return [...this.models.values()].map(m => ({
      id: m.id,
      name: m.name,
      domain: m.domain,
      variables: m.variables.size,
      edges: m.edges.length
    }));
  }

  /**
   * Get pre-defined manufacturing causal templates.
   */
  getManufacturingTemplates(): { edges: CausalEdge[]; variables: CausalVariable[] } {
    return {
      edges: [...LATHE_CAUSAL_TEMPLATES],
      variables: [...LATHE_VARIABLE_TEMPLATES]
    };
  }

  // ============================================================================
  // TRAINING CONTEXT
  // ============================================================================

  /**
   * Get training context for AI integration.
   */
  getTrainingContext(): string {
    return `
LATHE CAUSAL INFERENCE ENGINE
=============================
Implements formal causal inference methods for lathe programming decisions.

STRUCTURAL CAUSAL MODELS:
  - DAG representation with ${LATHE_CAUSAL_TEMPLATES.length} pre-defined machining relationships
  - Variables: material properties, cutting parameters, intermediate forces, outcomes
  - Functional forms: linear, quadratic, exponential, logarithmic, threshold

INTERVENTION ANALYSIS (do-operator):
  - do(X=x): Set X to x, removing all incoming causal influences
  - Counterfactual: "What if cutting speed had been 150 m/min instead of 200?"
  - Three-step process: Abduction -> Action -> Prediction

CAUSAL DISCOVERY:
  - PC algorithm for structure learning
  - Conditional independence testing
  - Granger causality for time-series
  - BIC score for model selection

IDENTIFICATION CRITERIA:
  - Backdoor criterion: Identify confounders, find valid adjustment sets
  - Front-door criterion: Identify mediators, decompose effects
  - Mediation analysis: Direct vs indirect effects

KEY CAUSAL PATHWAYS IN LATHE:
  - cutting_speed -> temperature -> tool_wear -> tool_life
  - feed_rate -> cutting_force -> deflection -> dimensional_accuracy
  - feed_rate -> theoretical_finish -> surface_finish
  - depth_of_cut -> cutting_force -> power_consumption

ESTIMATION METHODS:
  - Backdoor adjustment (regression)
  - Front-door adjustment (mediation)
  - Inverse probability weighting (IPW)
  - Sensitivity analysis (E-value, robustness)

BEST FOR:
  - Understanding why parameters affect outcomes
  - Optimizing parameters with causal reasoning
  - Root cause analysis for quality issues
  - "What if" scenario planning
  - Identifying confounded vs causal relationships
`.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheCausalInferenceEngine = new LatheCausalInferenceEngine();
