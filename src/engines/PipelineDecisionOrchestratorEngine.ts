/**
 * PipelineDecisionOrchestratorEngine — CAMX-MS0.3/U01 (E1080)
 *
 * Universal decision wrapper called at EVERY decision point in all 7 production
 * pipelines. Scores candidates across 5 axes (performance, consistency, safety,
 * cost, robustness), selects the best option, generates human-readable
 * justification, and logs the decision with all alternatives considered.
 *
 * Decision categories (12 types):
 *   tool_select, strategy_select, parameter_optimize, coolant_select,
 *   entry_exit_select, sequence_optimize, workholding_validate,
 *   controller_select, holder_select, coating_select, work_offset_select,
 *   safety_check
 *
 * Integration:
 *   - Lazy-loads DecisionTreeEngine for structured decision trees
 *   - Lazy-loads XAIEngine for feature importance (LIME/SHAP on key decisions)
 *   - Lazy-loads BayesianInferenceEngine for multi-step reasoning
 *   - Uses existing Logger
 *
 * @version 1.0.0
 * @module PipelineDecisionOrchestratorEngine
 */

import { log } from "../utils/Logger.js";
import * as decisionTreeEngine from "./DecisionTreeEngine.js";
import { xaiEngine } from "./XAIEngine.js";
import { bayesianInferenceEngine } from "./BayesianInferenceEngine.js";

// ============================================================================
// DIRECT ENGINE REFERENCES
// ============================================================================

function getDecisionTree(): any {
  return decisionTreeEngine as any;
}

function getXAI(): any {
  return xaiEngine as any;
}

function getBayesianInference(): any {
  return bayesianInferenceEngine as any;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** The 12 decision categories supported by the orchestrator. */
export type DecisionCategory =
  | "tool_select"
  | "strategy_select"
  | "parameter_optimize"
  | "coolant_select"
  | "entry_exit_select"
  | "sequence_optimize"
  | "workholding_validate"
  | "controller_select"
  | "holder_select"
  | "coating_select"
  | "work_offset_select"
  | "safety_check";

/** Optimization objective for scoring weight selection. */
export type DecisionObjective =
  | "speed"
  | "quality"
  | "cost"
  | "balanced"
  | "tool_life";

/** The 5 scoring axes used for all decision evaluations. */
export interface ScoringAxes {
  /** How close to optimal physics/performance (0-1). */
  optimal_performance: number;
  /** Internal logical consistency of the candidate (0-1). */
  logical_consistency: number;
  /** Safety margin against limits (0-1). Veto threshold: 0.3. */
  safety: number;
  /** Cost efficiency relative to alternatives (0-1). */
  cost_efficiency: number;
  /** Robustness to variation and edge cases (0-1). */
  robustness: number;
}

/** Manufacturing context for the decision point. */
export interface DecisionContext {
  /** Feature being machined — pocket, hole, surface, etc. */
  feature?: {
    type?: string;
    diameter_mm?: number;
    depth_mm?: number;
    width_mm?: number;
    length_mm?: number;
    wall_thickness_mm?: number;
    tolerance_mm?: number;
    surface_finish_Ra?: number;
    corner_radius_mm?: number;
  };
  /** Workpiece material. */
  material?: {
    name?: string;
    iso_group?: string;
    hardness_hrc?: number;
    thermal_conductivity_wm_k?: number;
    tensile_strength_mpa?: number;
  };
  /** Machine being used. */
  machine?: {
    id?: string;
    name?: string;
    max_rpm?: number;
    max_power_kw?: number;
    max_torque_nm?: number;
    axis_count?: number;
    taper?: string;
    controller?: string;
    rapid_traverse_m_min?: number;
  };
  /** Current tool (if already selected). */
  tool?: {
    id?: string;
    type?: string;
    diameter_mm?: number;
    flute_count?: number;
    coating?: string;
    material?: string;
    overhang_mm?: number;
    flute_length_mm?: number;
    max_depth_mm?: number;
  };
  /** Operation type (roughing, finishing, drilling, etc.). */
  operation?: string;
  /** CAM system in use. */
  cam_system?: string;
  /** Extra key-value context. */
  metadata?: Record<string, unknown>;
}

/** A single candidate option to evaluate. */
export interface DecisionCandidate {
  /** Unique identifier for this candidate. */
  id: string;
  /** Human-readable label. */
  label: string;
  /** Category-specific data (tool record, strategy params, etc.). */
  data: Record<string, unknown>;
  /** Pre-computed sub-scores if available from upstream engines. */
  pre_scores?: Partial<ScoringAxes>;
}

/** Safety and physics constraints. */
export interface DecisionConstraints {
  /** Maximum cutting force allowed (N). */
  max_force_n?: number;
  /** Maximum deflection allowed (mm). */
  max_deflection_mm?: number;
  /** Maximum spindle power allowed (kW). */
  max_power_kw?: number;
  /** Maximum temperature at cut zone (C). */
  max_temperature_c?: number;
  /** Minimum tool life required (min). */
  min_tool_life_min?: number;
  /** Maximum cost per part (USD). */
  max_cost_per_part_usd?: number;
  /** Maximum vibration amplitude (mm). */
  max_vibration_mm?: number;
  /** Material-specific limits. */
  material_limits?: Record<string, number>;
  /** Machine-specific limits. */
  machine_limits?: Record<string, number>;
  /** Custom constraint functions — key is name, value is threshold. */
  custom?: Record<string, number>;
}

/** Full input to the decide() method. */
export interface DecisionInput {
  /** Which of the 12 decision categories this is. */
  category: DecisionCategory;
  /** Manufacturing context. */
  context: DecisionContext;
  /** List of candidate options to evaluate. */
  candidates: DecisionCandidate[];
  /** Safety and physics constraints. */
  constraints?: DecisionConstraints;
  /** Optimization objective. */
  objective?: DecisionObjective;
  /** Request XAI feature importance analysis (slower). */
  explain?: boolean;
  /** Pipeline stage identifier for tracing. */
  pipeline_stage?: string;
  /** Caller engine name for audit trail. */
  caller?: string;
}

/** Why a candidate was rejected. */
export interface AlternativeRecord {
  option: string;
  score: number;
  why_not: string;
}

/** Output from the decide() method. */
export interface DecisionOutput {
  /** The selected candidate. */
  choice: DecisionCandidate;
  /** Composite score (0-100). */
  score: number;
  /** Per-axis score breakdown. */
  score_breakdown: ScoringAxes;
  /** Human-readable justification lines. */
  justification: string[];
  /** All rejected alternatives with reasons. */
  alternatives: AlternativeRecord[];
  /** Unique decision ID for audit/tracing. */
  decision_id: string;
  /** Decision category. */
  category: DecisionCategory;
  /** Objective used for weighting. */
  objective: DecisionObjective;
  /** Time taken in ms. */
  elapsed_ms: number;
  /** XAI feature importance (if explain=true). */
  feature_importance?: Record<string, number>;
  /** Decision tree path taken (if applicable). */
  decision_tree_path?: string[];
  /** Warnings generated during evaluation. */
  warnings: string[];
}

// ============================================================================
// SCORING WEIGHT PROFILES PER CATEGORY
// ============================================================================

/**
 * Weight arrays map to ScoringAxes in order:
 * [optimal_performance, logical_consistency, safety, cost_efficiency, robustness]
 */
type WeightTuple = [number, number, number, number, number];

/** Category-specific base weights. */
const CATEGORY_WEIGHTS: Record<DecisionCategory, WeightTuple> = {
  tool_select:           [0.30, 0.15, 0.20, 0.15, 0.20],
  strategy_select:       [0.30, 0.15, 0.20, 0.10, 0.25],
  parameter_optimize:    [0.30, 0.15, 0.25, 0.15, 0.15],
  coolant_select:        [0.20, 0.15, 0.30, 0.20, 0.15],
  entry_exit_select:     [0.20, 0.20, 0.30, 0.10, 0.20],
  sequence_optimize:     [0.25, 0.25, 0.15, 0.20, 0.15],
  workholding_validate:  [0.15, 0.15, 0.35, 0.15, 0.20],
  controller_select:     [0.20, 0.25, 0.15, 0.20, 0.20],
  holder_select:         [0.25, 0.15, 0.25, 0.15, 0.20],
  coating_select:        [0.30, 0.10, 0.15, 0.25, 0.20],
  work_offset_select:    [0.15, 0.30, 0.25, 0.10, 0.20],
  safety_check:          [0.10, 0.10, 0.50, 0.10, 0.20],
};

/** Objective modifier — shifts weights toward the chosen objective. */
const OBJECTIVE_MODIFIERS: Record<DecisionObjective, WeightTuple> = {
  speed:     [+0.10, 0.00, -0.05, -0.05,  0.00],
  quality:   [+0.05, +0.05, 0.00, -0.05, -0.05],
  cost:      [-0.05, 0.00, -0.05, +0.15, -0.05],
  balanced:  [ 0.00, 0.00,  0.00,  0.00,  0.00],
  tool_life: [+0.05, 0.00, +0.05, -0.05, -0.05],
};

// ============================================================================
// DETAILED SCORING RUBRICS PER CATEGORY
// ============================================================================

/**
 * Sub-weight rubrics for computing the optimal_performance axis.
 * These break down what "performance" means for each category.
 */
interface SubWeightRubric {
  [criterion: string]: number;
}

const TOOL_SELECT_RUBRIC: SubWeightRubric = {
  geometric_fit: 0.20,
  material_match: 0.15,
  physics: 0.20,
  machine_fit: 0.15,
  playbook: 0.10,
  holder: 0.10,
  cost: 0.10,
};

const STRATEGY_SELECT_RUBRIC: SubWeightRubric = {
  physics_score: 0.30,
  cycle_time: 0.20,
  tool_life: 0.20,
  surface_quality: 0.15,
  robustness: 0.15,
};

const PARAMETER_OPTIMIZE_RUBRIC: SubWeightRubric = {
  mrr: 0.25,
  force_margin: 0.25,
  deflection_margin: 0.20,
  thermal_margin: 0.15,
  cost: 0.15,
};

const COOLANT_SELECT_RUBRIC: SubWeightRubric = {
  thermal_control: 0.30,
  chip_evacuation: 0.20,
  tool_life_benefit: 0.20,
  environmental: 0.15,
  cost: 0.15,
};

const ENTRY_EXIT_RUBRIC: SubWeightRubric = {
  tool_stress: 0.30,
  surface_quality: 0.25,
  cycle_time: 0.20,
  collision_safety: 0.25,
};

const SEQUENCE_RUBRIC: SubWeightRubric = {
  total_cycle_time: 0.25,
  tool_changes: 0.20,
  fixture_stability: 0.20,
  feature_access: 0.15,
  thermal_stability: 0.20,
};

const WORKHOLDING_RUBRIC: SubWeightRubric = {
  clamping_force: 0.25,
  accessibility: 0.20,
  rigidity: 0.25,
  repeatability: 0.15,
  cost: 0.15,
};

const CONTROLLER_RUBRIC: SubWeightRubric = {
  feature_support: 0.30,
  interpolation: 0.25,
  speed: 0.20,
  compatibility: 0.25,
};

const HOLDER_RUBRIC: SubWeightRubric = {
  rigidity: 0.25,
  runout: 0.25,
  reach: 0.20,
  balance: 0.15,
  cost: 0.15,
};

const COATING_RUBRIC: SubWeightRubric = {
  wear_resistance: 0.25,
  heat_resistance: 0.25,
  material_affinity: 0.25,
  friction: 0.10,
  cost: 0.15,
};

const WORK_OFFSET_RUBRIC: SubWeightRubric = {
  accuracy: 0.30,
  repeatability: 0.25,
  ease_of_setup: 0.20,
  collision_clearance: 0.25,
};

const SAFETY_CHECK_RUBRIC: SubWeightRubric = {
  force_margin: 0.25,
  deflection_margin: 0.25,
  thermal_margin: 0.20,
  vibration_margin: 0.15,
  collision_clearance: 0.15,
};

const CATEGORY_RUBRICS: Record<DecisionCategory, SubWeightRubric> = {
  tool_select: TOOL_SELECT_RUBRIC,
  strategy_select: STRATEGY_SELECT_RUBRIC,
  parameter_optimize: PARAMETER_OPTIMIZE_RUBRIC,
  coolant_select: COOLANT_SELECT_RUBRIC,
  entry_exit_select: ENTRY_EXIT_RUBRIC,
  sequence_optimize: SEQUENCE_RUBRIC,
  workholding_validate: WORKHOLDING_RUBRIC,
  controller_select: CONTROLLER_RUBRIC,
  holder_select: HOLDER_RUBRIC,
  coating_select: COATING_RUBRIC,
  work_offset_select: WORK_OFFSET_RUBRIC,
  safety_check: SAFETY_CHECK_RUBRIC,
};

// ============================================================================
// SAFETY THRESHOLDS
// ============================================================================

/** Safety score below this threshold causes automatic veto. */
const SAFETY_VETO_THRESHOLD = 0.3;

/** Maximum candidates to evaluate before warning. */
const MAX_CANDIDATES_WARN = 100;

/** Counter for generating unique decision IDs. */
let _decisionCounter = 0;

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/** Clamp a numeric value to [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Generate a unique decision ID. */
function generateDecisionId(category: DecisionCategory): string {
  _decisionCounter++;
  const ts = Date.now().toString(36);
  const seq = _decisionCounter.toString(36).padStart(4, "0");
  return `PDO-${category.toUpperCase().replace(/_/g, "")}-${ts}-${seq}`;
}

/** Compute effective weights by combining category base + objective modifier. */
function computeEffectiveWeights(
  category: DecisionCategory,
  objective: DecisionObjective,
): WeightTuple {
  const base = CATEGORY_WEIGHTS[category];
  const mod = OBJECTIVE_MODIFIERS[objective];
  const raw: WeightTuple = [
    base[0] + mod[0],
    base[1] + mod[1],
    base[2] + mod[2],
    base[3] + mod[3],
    base[4] + mod[4],
  ];
  // Normalize to sum to 1.0
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => Math.max(0, w / sum)) as WeightTuple;
}

/** Weighted composite from ScoringAxes. */
function compositeScore(axes: ScoringAxes, weights: WeightTuple): number {
  return (
    axes.optimal_performance * weights[0] +
    axes.logical_consistency * weights[1] +
    axes.safety * weights[2] +
    axes.cost_efficiency * weights[3] +
    axes.robustness * weights[4]
  ) * 100;
}

/** Normalize a 0-100 value into 0-1. */
function norm100(v: number | undefined): number {
  if (v === undefined || v === null) return 0.5;
  return clamp(v / 100, 0, 1);
}

/** Normalize a 0-10 value into 0-1. */
function norm10(v: number | undefined): number {
  if (v === undefined || v === null) return 0.5;
  return clamp(v / 10, 0, 1);
}

/** Safe numeric extraction from arbitrary data. */
function numVal(data: Record<string, unknown>, key: string, fallback: number = 0.5): number {
  const v = data[key];
  if (typeof v === "number" && isFinite(v)) return v;
  return fallback;
}

/** Compute safety score from constraints and candidate data. */
function computeSafetyScore(
  data: Record<string, unknown>,
  constraints: DecisionConstraints | undefined,
  context: DecisionContext,
): number {
  if (!constraints) return 0.7; // no constraints = assume moderately safe

  let safetySum = 0;
  let safetyCount = 0;

  // Force margin
  if (constraints.max_force_n !== undefined) {
    const force = numVal(data, "cutting_force_n", 0) || numVal(data, "force_n", 0);
    if (force > 0) {
      const margin = 1 - (force / constraints.max_force_n);
      safetySum += clamp(margin + 0.5, 0, 1); // 0 margin = 0.5 score
      safetyCount++;
    }
  }

  // Deflection margin
  if (constraints.max_deflection_mm !== undefined) {
    const defl = numVal(data, "deflection_mm", 0);
    if (defl > 0) {
      const margin = 1 - (defl / constraints.max_deflection_mm);
      safetySum += clamp(margin + 0.5, 0, 1);
      safetyCount++;
    }
  }

  // Power margin
  if (constraints.max_power_kw !== undefined) {
    const power = numVal(data, "power_kw", 0) || numVal(data, "spindle_power_kw", 0);
    if (power > 0) {
      const margin = 1 - (power / constraints.max_power_kw);
      safetySum += clamp(margin + 0.5, 0, 1);
      safetyCount++;
    }
  }

  // Temperature margin
  if (constraints.max_temperature_c !== undefined) {
    const temp = numVal(data, "temperature_c", 0) || numVal(data, "cut_temp_c", 0);
    if (temp > 0) {
      const margin = 1 - (temp / constraints.max_temperature_c);
      safetySum += clamp(margin + 0.5, 0, 1);
      safetyCount++;
    }
  }

  // Vibration margin
  if (constraints.max_vibration_mm !== undefined) {
    const vib = numVal(data, "vibration_mm", 0);
    if (vib > 0) {
      const margin = 1 - (vib / constraints.max_vibration_mm);
      safetySum += clamp(margin + 0.5, 0, 1);
      safetyCount++;
    }
  }

  // Machine RPM check
  if (context.machine?.max_rpm) {
    const rpm = numVal(data, "rpm", 0) || numVal(data, "spindle_rpm", 0);
    if (rpm > 0) {
      const margin = 1 - (rpm / context.machine.max_rpm);
      safetySum += clamp(margin + 0.5, 0, 1);
      safetyCount++;
    }
  }

  if (safetyCount === 0) return 0.7;
  return clamp(safetySum / safetyCount, 0, 1);
}

/** Compute cost efficiency from candidate data. */
function computeCostEfficiency(
  data: Record<string, unknown>,
  constraints: DecisionConstraints | undefined,
): number {
  // Look for cost-related fields
  const costPerPart = numVal(data, "cost_per_part_usd", -1);
  const toolCost = numVal(data, "tool_cost_usd", -1);
  const cycleTime = numVal(data, "cycle_time_min", -1);
  const toolLife = numVal(data, "tool_life_min", -1);

  let costScore = 0.5; // neutral default
  let factors = 0;

  if (costPerPart >= 0 && constraints?.max_cost_per_part_usd) {
    const ratio = 1 - (costPerPart / constraints.max_cost_per_part_usd);
    costScore += clamp(ratio, -0.3, 0.5);
    factors++;
  }

  if (toolCost >= 0) {
    // Normalize: assume $500 is expensive
    costScore += clamp(1 - (toolCost / 500), 0, 0.5);
    factors++;
  }

  if (toolLife > 0) {
    // Longer tool life = better cost efficiency
    costScore += clamp(toolLife / 120, 0, 0.5); // 120 min = very good
    factors++;
  }

  if (cycleTime > 0) {
    // Shorter cycle = better cost efficiency
    costScore += clamp(1 - (cycleTime / 60), 0, 0.3); // 60 min = very long
    factors++;
  }

  if (factors === 0) return 0.5;
  return clamp(costScore / factors, 0, 1);
}

/** Compute robustness from candidate data and context. */
function computeRobustness(
  data: Record<string, unknown>,
  context: DecisionContext,
): number {
  let robustScore = 0.5;
  let factors = 0;

  // Confidence from upstream
  const conf = numVal(data, "confidence", -1);
  if (conf >= 0) {
    robustScore += (conf - 0.5) * 0.5;
    factors++;
  }

  // Physics validated flag
  if (data.physics_validated === true) {
    robustScore += 0.15;
    factors++;
  } else if (data.physics_validated === false) {
    robustScore -= 0.15;
    factors++;
  }

  // Engagement control (strategy robustness)
  if (data.engagement_control === true) {
    robustScore += 0.1;
    factors++;
  }

  // Number of warnings (more = less robust)
  const warnings = data.warnings;
  if (Array.isArray(warnings)) {
    robustScore -= warnings.length * 0.05;
    factors++;
  }

  // Rigidity factor
  const rigidity = numVal(data, "rigidity", -1);
  if (rigidity >= 0) {
    robustScore += (rigidity - 0.5) * 0.3;
    factors++;
  }

  return clamp(factors > 0 ? robustScore : 0.5, 0, 1);
}

/** Compute logical consistency for a candidate. */
function computeLogicalConsistency(
  data: Record<string, unknown>,
  context: DecisionContext,
  category: DecisionCategory,
): number {
  let score = 0.7; // assume decent consistency by default

  // Check material compatibility
  if (context.material?.iso_group && data.iso_groups) {
    const groups = data.iso_groups as string[];
    if (Array.isArray(groups)) {
      score += groups.includes(context.material.iso_group) ? 0.15 : -0.2;
    }
  }

  // Check tool-feature dimensional compatibility
  if (category === "tool_select" && context.feature) {
    const toolDia = numVal(data, "diameter_mm", 0);
    const featDia = context.feature.diameter_mm;
    if (toolDia > 0 && featDia && featDia > 0) {
      const ratio = toolDia / featDia;
      if (ratio > 0.5 && ratio < 1.0) score += 0.1;
      else if (ratio >= 1.0) score -= 0.25; // tool larger than feature
    }
  }

  // Check machine axis compatibility for strategy
  if (category === "strategy_select" && context.machine?.axis_count) {
    const requires5 = data.five_axis_required === true;
    if (requires5 && (context.machine.axis_count || 3) < 5) {
      score -= 0.3;
    }
  }

  // Check operation type coherence
  if (context.operation && data.operation_types) {
    const ops = data.operation_types as string[];
    if (Array.isArray(ops)) {
      const match = ops.some(o => context.operation!.toLowerCase().includes(o.toLowerCase()));
      score += match ? 0.1 : -0.1;
    }
  }

  return clamp(score, 0, 1);
}

/** Compute optimal performance score using the category-specific rubric. */
function computePerformance(
  data: Record<string, unknown>,
  context: DecisionContext,
  category: DecisionCategory,
  preScores: Partial<ScoringAxes> | undefined,
): number {
  // If upstream provided a performance score, weight it heavily
  if (preScores?.optimal_performance !== undefined) {
    return clamp(preScores.optimal_performance, 0, 1);
  }

  const rubric = CATEGORY_RUBRICS[category];
  const criteria = Object.keys(rubric);
  let totalWeight = 0;
  let weightedSum = 0;

  for (const criterion of criteria) {
    const w = rubric[criterion];
    // Try to find a matching value in candidate data
    let value = numVal(data, criterion, -1);
    if (value < 0) {
      // Try normalized variants
      value = numVal(data, `${criterion}_score`, -1);
    }
    if (value < 0) {
      // Try score_ prefix
      value = numVal(data, `score_${criterion}`, -1);
    }
    if (value >= 0) {
      // Auto-detect scale: if > 1, assume 0-100 or 0-10
      if (value > 10) value = norm100(value);
      else if (value > 1) value = norm10(value);
      weightedSum += value * w;
      totalWeight += w;
    }
  }

  if (totalWeight === 0) {
    // Fallback: look for a generic "score" field
    const genericScore = numVal(data, "score", -1);
    if (genericScore >= 0) {
      return genericScore > 1 ? norm100(genericScore) : genericScore;
    }
    return 0.5;
  }

  return clamp(weightedSum / totalWeight, 0, 1);
}

// ============================================================================
// JUSTIFICATION GENERATOR
// ============================================================================

/** Generate human-readable justification lines for a decision. */
function generateJustification(
  choice: DecisionCandidate,
  axes: ScoringAxes,
  weights: WeightTuple,
  category: DecisionCategory,
  objective: DecisionObjective,
  context: DecisionContext,
  alternativeCount: number,
): string[] {
  const lines: string[] = [];
  const composite = compositeScore(axes, weights);

  lines.push(
    `Selected "${choice.label}" (score: ${composite.toFixed(1)}/100) for ${category.replace(/_/g, " ")}.`,
  );

  // Top scoring axis
  const axisNames: (keyof ScoringAxes)[] = [
    "optimal_performance", "logical_consistency", "safety", "cost_efficiency", "robustness",
  ];
  const axisLabels: Record<string, string> = {
    optimal_performance: "performance",
    logical_consistency: "consistency",
    safety: "safety margin",
    cost_efficiency: "cost efficiency",
    robustness: "robustness",
  };
  const sorted = axisNames
    .map(k => ({ key: k, val: axes[k], weight: weights[axisNames.indexOf(k)] }))
    .sort((a, b) => (b.val * b.weight) - (a.val * a.weight));

  const topAxis = sorted[0];
  lines.push(
    `Primary strength: ${axisLabels[topAxis.key]} at ${(topAxis.val * 100).toFixed(0)}% (weight: ${(topAxis.weight * 100).toFixed(0)}%).`,
  );

  // Weakest axis (if notably low)
  const weakest = sorted[sorted.length - 1];
  if (weakest.val < 0.5) {
    lines.push(
      `Note: ${axisLabels[weakest.key]} is below average at ${(weakest.val * 100).toFixed(0)}% — monitor this aspect.`,
    );
  }

  // Objective alignment
  if (objective !== "balanced") {
    lines.push(`Scoring optimized for: ${objective}.`);
  }

  // Context details
  if (context.material?.iso_group) {
    lines.push(`Material group: ISO ${context.material.iso_group}${context.material.name ? ` (${context.material.name})` : ""}.`);
  }
  if (context.machine?.name) {
    lines.push(`Machine: ${context.machine.name}.`);
  }
  if (context.operation) {
    lines.push(`Operation: ${context.operation}.`);
  }

  // Alternatives
  if (alternativeCount > 0) {
    lines.push(`Evaluated ${alternativeCount + 1} candidates; ${alternativeCount} alternatives rejected.`);
  }

  return lines;
}

/** Generate a "why not" explanation for a rejected candidate. */
function generateWhyNot(
  candidate: DecisionCandidate,
  axes: ScoringAxes,
  choiceScore: number,
  candidateScore: number,
  vetoed: boolean,
): string {
  if (vetoed) {
    return `Safety veto: safety score ${(axes.safety * 100).toFixed(0)}% below ${SAFETY_VETO_THRESHOLD * 100}% threshold.`;
  }

  const delta = choiceScore - candidateScore;
  const parts: string[] = [];

  if (axes.optimal_performance < 0.4) {
    parts.push(`low performance (${(axes.optimal_performance * 100).toFixed(0)}%)`);
  }
  if (axes.safety < 0.5) {
    parts.push(`marginal safety (${(axes.safety * 100).toFixed(0)}%)`);
  }
  if (axes.cost_efficiency < 0.4) {
    parts.push(`poor cost efficiency (${(axes.cost_efficiency * 100).toFixed(0)}%)`);
  }
  if (axes.robustness < 0.4) {
    parts.push(`low robustness (${(axes.robustness * 100).toFixed(0)}%)`);
  }
  if (axes.logical_consistency < 0.4) {
    parts.push(`consistency concerns (${(axes.logical_consistency * 100).toFixed(0)}%)`);
  }

  if (parts.length === 0) {
    return `Outscored by ${delta.toFixed(1)} points overall.`;
  }
  return `Rejected due to: ${parts.join(", ")}. Score gap: ${delta.toFixed(1)}.`;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PipelineDecisionOrchestratorEngine {
  /** Decision audit log — last N decisions retained in memory. */
  private _auditLog: Array<{
    decision_id: string;
    timestamp: number;
    category: DecisionCategory;
    choice_id: string;
    score: number;
    candidate_count: number;
    caller?: string;
    pipeline_stage?: string;
  }> = [];

  private readonly _maxAuditEntries = 500;

  // ────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ────────────────────────────────────────────────────────────────

  /**
   * Universal decision method. Evaluates all candidates across 5 scoring
   * axes, applies safety veto, selects the best option, and returns a
   * fully justified decision record.
   */
  decide(input: DecisionInput): DecisionOutput {
    const t0 = Date.now();
    const warnings: string[] = [];
    const {
      category,
      context,
      candidates,
      constraints,
      objective = "balanced",
      explain = false,
      pipeline_stage,
      caller,
    } = input;

    // ── Validation ──────────────────────────────────────────────
    if (!candidates || candidates.length === 0) {
      throw new Error("[PipelineDecisionOrchestrator] No candidates provided.");
    }
    if (candidates.length > MAX_CANDIDATES_WARN) {
      warnings.push(
        `Large candidate set (${candidates.length}). Consider pre-filtering for performance.`,
      );
    }

    // ── Compute effective weights ───────────────────────────────
    const weights = computeEffectiveWeights(category, objective);

    // ── Score each candidate ────────────────────────────────────
    const scored: Array<{
      candidate: DecisionCandidate;
      axes: ScoringAxes;
      composite: number;
      vetoed: boolean;
    }> = [];

    for (const cand of candidates) {
      const axes = this._scoreCandidate(cand, context, category, constraints);
      const composite = compositeScore(axes, weights);
      const vetoed = axes.safety < SAFETY_VETO_THRESHOLD;

      if (vetoed) {
        warnings.push(
          `Candidate "${cand.label}" vetoed: safety ${(axes.safety * 100).toFixed(0)}% < ${SAFETY_VETO_THRESHOLD * 100}%.`,
        );
      }

      scored.push({ candidate: cand, axes, composite, vetoed });
    }

    // ── Sort: non-vetoed first, then by composite descending ────
    scored.sort((a, b) => {
      if (a.vetoed !== b.vetoed) return a.vetoed ? 1 : -1;
      return b.composite - a.composite;
    });

    // ── Select best ─────────────────────────────────────────────
    const viable = scored.filter(s => !s.vetoed);
    if (viable.length === 0) {
      // All vetoed — select least-bad with warning
      warnings.push(
        "ALL candidates failed safety veto. Returning least-unsafe option. MANUAL REVIEW REQUIRED.",
      );
    }

    const best = viable.length > 0 ? viable[0] : scored[0];
    const decisionId = generateDecisionId(category);

    // ── Build alternatives ──────────────────────────────────────
    const alternatives: AlternativeRecord[] = scored
      .filter(s => s.candidate.id !== best.candidate.id)
      .map(s => ({
        option: s.candidate.label,
        score: Math.round(s.composite * 10) / 10,
        why_not: generateWhyNot(s.candidate, s.axes, best.composite, s.composite, s.vetoed),
      }));

    // ── Justification ───────────────────────────────────────────
    const justification = generateJustification(
      best.candidate, best.axes, weights, category, objective, context, alternatives.length,
    );

    // ── XAI feature importance (optional) ───────────────────────
    let featureImportance: Record<string, number> | undefined;
    if (explain) {
      featureImportance = this._computeFeatureImportance(
        best.candidate, scored, category, context,
      );
    }

    // ── Decision tree path (optional) ───────────────────────────
    let decisionTreePath: string[] | undefined;
    if (category === "tool_select" || category === "strategy_select" || category === "coolant_select") {
      decisionTreePath = this._traceDecisionTreePath(category, context);
    }

    // ── Audit log ───────────────────────────────────────────────
    this._logDecision({
      decision_id: decisionId,
      timestamp: Date.now(),
      category,
      choice_id: best.candidate.id,
      score: best.composite,
      candidate_count: candidates.length,
      caller,
      pipeline_stage,
    });

    try {
      log.info(`[PDO] ${category}: selected "${best.candidate.label}" (${best.composite.toFixed(1)}/100) from ${candidates.length} candidates`);
    } catch { /* logger optional */ }

    return {
      choice: best.candidate,
      score: Math.round(best.composite * 10) / 10,
      score_breakdown: best.axes,
      justification,
      alternatives,
      decision_id: decisionId,
      category,
      objective,
      elapsed_ms: Date.now() - t0,
      feature_importance: featureImportance,
      decision_tree_path: decisionTreePath,
      warnings,
    };
  }

  /**
   * Batch-decide: run multiple independent decisions in sequence.
   * Returns array of DecisionOutput in same order as inputs.
   */
  decideBatch(inputs: DecisionInput[]): DecisionOutput[] {
    return inputs.map(input => this.decide(input));
  }

  /**
   * Compare two candidates head-to-head with detailed axis breakdown.
   * Useful for A/B analysis in pipeline debugging.
   */
  compare(
    a: DecisionCandidate,
    b: DecisionCandidate,
    category: DecisionCategory,
    context: DecisionContext,
    constraints?: DecisionConstraints,
    objective: DecisionObjective = "balanced",
  ): {
    winner: "a" | "b" | "tie";
    a_score: number;
    b_score: number;
    a_axes: ScoringAxes;
    b_axes: ScoringAxes;
    axis_comparison: Record<string, { a: number; b: number; delta: number }>;
  } {
    const weights = computeEffectiveWeights(category, objective);
    const aAxes = this._scoreCandidate(a, context, category, constraints);
    const bAxes = this._scoreCandidate(b, context, category, constraints);
    const aScore = compositeScore(aAxes, weights);
    const bScore = compositeScore(bAxes, weights);

    const axisNames: (keyof ScoringAxes)[] = [
      "optimal_performance", "logical_consistency", "safety", "cost_efficiency", "robustness",
    ];
    const axisCmp: Record<string, { a: number; b: number; delta: number }> = {};
    for (const axis of axisNames) {
      axisCmp[axis] = {
        a: Math.round(aAxes[axis] * 1000) / 1000,
        b: Math.round(bAxes[axis] * 1000) / 1000,
        delta: Math.round((aAxes[axis] - bAxes[axis]) * 1000) / 1000,
      };
    }

    const delta = Math.abs(aScore - bScore);
    const winner = delta < 0.5 ? "tie" : aScore > bScore ? "a" : "b";

    return { winner, a_score: aScore, b_score: bScore, a_axes: aAxes, b_axes: bAxes, axis_comparison: axisCmp };
  }

  /**
   * Get the audit log of recent decisions.
   */
  getAuditLog(limit = 50): typeof this._auditLog {
    return this._auditLog.slice(-limit);
  }

  /**
   * Get decision statistics by category.
   */
  getStats(): Record<DecisionCategory, { count: number; avg_score: number }> {
    const stats: Record<string, { count: number; total_score: number }> = {};
    for (const entry of this._auditLog) {
      if (!stats[entry.category]) stats[entry.category] = { count: 0, total_score: 0 };
      stats[entry.category].count++;
      stats[entry.category].total_score += entry.score;
    }
    const result: Record<string, { count: number; avg_score: number }> = {};
    for (const [cat, s] of Object.entries(stats)) {
      result[cat] = { count: s.count, avg_score: s.count > 0 ? s.total_score / s.count : 0 };
    }
    return result as Record<DecisionCategory, { count: number; avg_score: number }>;
  }

  /**
   * Clear the audit log.
   */
  clearAuditLog(): void {
    this._auditLog = [];
  }

  /**
   * Validate that a candidate meets minimum constraints without full scoring.
   * Returns pass/fail with reasons.
   */
  prescreen(
    candidate: DecisionCandidate,
    constraints: DecisionConstraints,
    context: DecisionContext,
  ): { pass: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const data = candidate.data;

    if (constraints.max_force_n !== undefined) {
      const force = numVal(data, "cutting_force_n", 0) || numVal(data, "force_n", 0);
      if (force > constraints.max_force_n) {
        reasons.push(`Force ${force.toFixed(0)}N exceeds limit ${constraints.max_force_n}N.`);
      }
    }
    if (constraints.max_deflection_mm !== undefined) {
      const defl = numVal(data, "deflection_mm", 0);
      if (defl > constraints.max_deflection_mm) {
        reasons.push(`Deflection ${defl.toFixed(3)}mm exceeds limit ${constraints.max_deflection_mm}mm.`);
      }
    }
    if (constraints.max_power_kw !== undefined) {
      const power = numVal(data, "power_kw", 0) || numVal(data, "spindle_power_kw", 0);
      if (power > constraints.max_power_kw) {
        reasons.push(`Power ${power.toFixed(1)}kW exceeds limit ${constraints.max_power_kw}kW.`);
      }
    }
    if (constraints.max_temperature_c !== undefined) {
      const temp = numVal(data, "temperature_c", 0) || numVal(data, "cut_temp_c", 0);
      if (temp > constraints.max_temperature_c) {
        reasons.push(`Temperature ${temp.toFixed(0)}C exceeds limit ${constraints.max_temperature_c}C.`);
      }
    }
    if (constraints.min_tool_life_min !== undefined) {
      const life = numVal(data, "tool_life_min", Infinity);
      if (life < constraints.min_tool_life_min) {
        reasons.push(`Tool life ${life.toFixed(0)}min below minimum ${constraints.min_tool_life_min}min.`);
      }
    }

    return { pass: reasons.length === 0, reasons };
  }

  // ────────────────────────────────────────────────────────────────
  // PRIVATE SCORING
  // ────────────────────────────────────────────────────────────────

  /**
   * Score a single candidate across all 5 axes.
   */
  private _scoreCandidate(
    candidate: DecisionCandidate,
    context: DecisionContext,
    category: DecisionCategory,
    constraints: DecisionConstraints | undefined,
  ): ScoringAxes {
    const data = candidate.data;
    const pre = candidate.pre_scores;

    return {
      optimal_performance: computePerformance(data, context, category, pre),
      logical_consistency: pre?.logical_consistency ?? computeLogicalConsistency(data, context, category),
      safety: pre?.safety ?? computeSafetyScore(data, constraints, context),
      cost_efficiency: pre?.cost_efficiency ?? computeCostEfficiency(data, constraints),
      robustness: pre?.robustness ?? computeRobustness(data, context),
    };
  }

  /**
   * Compute XAI-style feature importance by perturbation.
   * Measures how much each context element affects the top choice.
   */
  private _computeFeatureImportance(
    choice: DecisionCandidate,
    allScored: Array<{ candidate: DecisionCandidate; axes: ScoringAxes; composite: number; vetoed: boolean }>,
    category: DecisionCategory,
    context: DecisionContext,
  ): Record<string, number> {
    const importance: Record<string, number> = {};

    // Try XAI engine for SHAP-like analysis
    try {
      const xai = getXAI();
      if (xai?.computeShap) {
        const features: Record<string, number> = {};
        if (context.material?.hardness_hrc) features.hardness = context.material.hardness_hrc;
        if (context.feature?.depth_mm) features.depth = context.feature.depth_mm;
        if (context.feature?.diameter_mm) features.diameter = context.feature.diameter_mm;
        if (context.machine?.max_rpm) features.max_rpm = context.machine.max_rpm;
        if (context.machine?.max_power_kw) features.max_power = context.machine.max_power_kw;

        const shapResult = xai.computeShap(features);
        if (shapResult?.importances) {
          return shapResult.importances;
        }
      }
    } catch { /* XAI engine optional */ }

    // Fallback: simple perturbation-based importance
    const baseScore = allScored.find(s => s.candidate.id === choice.id)?.composite ?? 0;

    // Measure sensitivity to key data fields
    const keys = Object.keys(choice.data).slice(0, 10); // top 10 fields
    for (const key of keys) {
      const val = choice.data[key];
      if (typeof val === "number") {
        // Perturb +10% and re-score
        const perturbedData = { ...choice.data, [key]: val * 1.1 };
        const perturbedCand: DecisionCandidate = { ...choice, data: perturbedData };
        const perturbedAxes = this._scoreCandidate(perturbedCand, context, category, undefined);
        const weights = computeEffectiveWeights(category, "balanced");
        const perturbedScore = compositeScore(perturbedAxes, weights);
        importance[key] = Math.abs(perturbedScore - baseScore);
      }
    }

    // Normalize
    const maxImp = Math.max(...Object.values(importance), 0.001);
    for (const k of Object.keys(importance)) {
      importance[k] = Math.round((importance[k] / maxImp) * 1000) / 1000;
    }

    return importance;
  }

  /**
   * Trace the decision tree path for categories that have structured trees.
   */
  private _traceDecisionTreePath(
    category: DecisionCategory,
    context: DecisionContext,
  ): string[] | undefined {
    try {
      const dt = getDecisionTree();

      if (category === "tool_select" && dt.selectToolType) {
        const result = dt.selectToolType({
          material: context.material?.name || context.material?.iso_group || "P",
          operation: context.operation || "milling",
        });
        return result?.reasoning || undefined;
      }

      if (category === "coolant_select" && dt.selectCoolantStrategy) {
        const result = dt.selectCoolantStrategy({
          material: context.material?.name || context.material?.iso_group || "P",
          operation: context.operation || "milling",
          speed_m_min: 100,
        });
        return result?.reasoning || undefined;
      }

      if (category === "strategy_select" && dt.selectStrategy) {
        const result = dt.selectStrategy({
          feature: context.feature?.type || "pocket",
          material: context.material?.name || context.material?.iso_group || "P",
          roughing_finishing: "both",
        });
        return result?.reasoning || undefined;
      }
    } catch { /* decision tree optional */ }

    return undefined;
  }

  /**
   * Try Bayesian inference for multi-step reasoning chains on complex decisions.
   */
  bayesianAssess(
    category: DecisionCategory,
    context: DecisionContext,
    priorProbabilities?: Record<string, number>,
  ): { posterior: Record<string, number>; chain: string[] } | null {
    try {
      const bi = getBayesianInference();
      if (!bi?.infer) return null;

      const evidence: Record<string, unknown> = {};
      if (context.material?.iso_group) evidence.iso_group = context.material.iso_group;
      if (context.material?.hardness_hrc) evidence.hardness = context.material.hardness_hrc;
      if (context.operation) evidence.operation = context.operation;

      const result = bi.infer({
        hypothesis_space: Object.keys(priorProbabilities || {}),
        evidence,
        priors: priorProbabilities,
      });

      return {
        posterior: result?.posteriors || {},
        chain: result?.reasoning || [],
      };
    } catch { /* Bayesian inference optional */ }
    return null;
  }

  // ────────────────────────────────────────────────────────────────
  // AUDIT LOG
  // ────────────────────────────────────────────────────────────────

  private _logDecision(entry: typeof this._auditLog[0]): void {
    this._auditLog.push(entry);
    if (this._auditLog.length > this._maxAuditEntries) {
      this._auditLog = this._auditLog.slice(-this._maxAuditEntries);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const pipelineDecisionOrchestratorEngine = new PipelineDecisionOrchestratorEngine();
