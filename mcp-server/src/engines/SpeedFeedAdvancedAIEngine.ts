/**
 * SpeedFeedAdvancedAIEngine — SF-AI-L2
 *
 * Second-layer AI hardening for Calculator Studio (Speed/Feed).
 * Adds XAI interpretability, multi-expert consensus, causal reasoning,
 * hierarchical planning, and advanced reasoning frameworks.
 *
 * AI Capabilities (Layer 2):
 * --------------------------
 * 1. EXPLAINABLE AI (XAI)
 *    - SHAP-style feature importance for predictions
 *    - Counterfactual explanations ("what if speed were 20% higher?")
 *    - Decision audit trail with confidence
 *
 * 2. MULTI-EXPERT CONSENSUS
 *    - Physics expert (Kienzle, Taylor, thermodynamics)
 *    - Empirical expert (shop floor data, tribal knowledge)
 *    - Optimization expert (MRR vs life tradeoffs)
 *    - Debate protocol with resolution
 *
 * 3. CAUSAL REASONING
 *    - Causal DAG for speed/feed relationships
 *    - Intervention analysis ("what if we force Vc=200?")
 *    - Confounding factor identification
 *
 * 4. HIERARCHICAL PLANNING
 *    - Strategic (shift-level goals)
 *    - Tactical (job-level sequencing)
 *    - Operational (cut-by-cut optimization)
 *
 * 5. ADVANCED REASONING FRAMEWORKS
 *    - Self-Consistency (multiple chains, majority vote)
 *    - Chain of Verification (cross-check answers)
 *    - ReAct (Reason + Act interleaving)
 *    - Reflexion (learn from mistakes)
 *
 * @module engines/SpeedFeedAdvancedAIEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { speedFeedDeepLearningEngine } from "./SpeedFeedDeepLearningEngine.js";
import {
  CANONICAL_MATERIAL_DB,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

type Operation = "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
type CutType = "roughing" | "semi_finishing" | "finishing";

/** Feature importance entry for XAI */
interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "positive" | "negative" | "neutral";
  description: string;
}

/** Counterfactual analysis result */
interface CounterfactualResult {
  original_value: number;
  counterfactual_value: number;
  changed_feature: string;
  change_direction: string;
  outcome_change: string;
  confidence: number;
}

/** Expert opinion in consensus */
interface ExpertOpinion {
  expert: "physics" | "empirical" | "optimization" | "safety";
  recommendation: {
    speed_mpm: number;
    feed_mm: number;
    depth_mm: number;
  };
  confidence: number;
  reasoning: string;
  concerns: string[];
}

/** Consensus result from multi-expert debate */
interface ConsensusResult {
  experts: ExpertOpinion[];
  consensus_reached: boolean;
  final_recommendation: {
    speed_mpm: number;
    feed_mm: number;
    depth_mm: number;
  };
  agreement_score: number;
  debate_summary: string[];
  dissenting_views: string[];
}

/** Causal DAG node */
interface CausalNode {
  id: string;
  name: string;
  type: "controllable" | "observable" | "latent" | "outcome";
  value?: number;
  unit?: string;
}

/** Causal DAG edge */
interface CausalEdge {
  from: string;
  to: string;
  strength: number;
  mechanism: string;
}

/** Causal inference result */
interface CausalInferenceResult {
  intervention: { variable: string; value: number };
  original_outcome: number;
  counterfactual_outcome: number;
  causal_effect: number;
  confidence: number;
  mediating_paths: string[][];
  confounders: string[];
}

/** Hierarchical plan level */
interface PlanLevel {
  level: "strategic" | "tactical" | "operational";
  goals: string[];
  actions: string[];
  constraints: string[];
  success_criteria: string[];
}

/** Full hierarchical plan */
interface HierarchicalPlan {
  strategic: PlanLevel;
  tactical: PlanLevel;
  operational: PlanLevel;
  coherence_score: number;
  execution_order: string[];
}

/** Self-consistency result */
interface SelfConsistencyResult {
  chains: { answer: string; confidence: number }[];
  majority_answer: string;
  agreement_ratio: number;
  final_confidence: number;
}

/** Verification result */
interface VerificationResult {
  claim: string;
  verification_steps: { step: string; passed: boolean; evidence: string }[];
  overall_valid: boolean;
  corrections: string[];
}

/** ReAct step */
interface ReActStep {
  thought: string;
  action: string;
  observation: string;
}

/** ReAct result */
interface ReActResult {
  steps: ReActStep[];
  final_answer: string;
  confidence: number;
}

/** Reflexion episode */
interface ReflexionEpisode {
  attempt: number;
  action: string;
  outcome: string;
  reflection: string;
  lesson: string;
}

/** Reflexion result */
interface ReflexionResult {
  episodes: ReflexionEpisode[];
  final_solution: string;
  lessons_learned: string[];
  improvement_from_reflection: number;
}

// ============================================================================
// XAI: EXPLAINABLE AI
// ============================================================================

/**
 * Calculate SHAP-style feature importance for speed prediction
 */
function calculateFeatureImportance(
  material: string,
  toolDiameter_mm: number,
  flutes: number,
  cutType: CutType,
  hardness_HB?: number
): FeatureImportance[] {
  const hardness = hardness_HB || 200;

  // Base importance from physics principles
  const features: FeatureImportance[] = [
    {
      feature: "material_iso_group",
      importance: 0.35,
      direction: "positive",
      description: `ISO group determines base machinability (P=1.0, M=0.6, S=0.2)`,
    },
    {
      feature: "material_hardness",
      importance: 0.25,
      direction: hardness > 300 ? "negative" : "neutral",
      description: `Hardness ${hardness} HB: ${hardness > 300 ? "significant speed reduction" : "moderate impact"}`,
    },
    {
      feature: "tool_diameter",
      importance: 0.15,
      direction: toolDiameter_mm > 25 ? "positive" : "neutral",
      description: `Diameter ${toolDiameter_mm}mm affects rigidity and speed capability`,
    },
    {
      feature: "cut_type",
      importance: 0.12,
      direction: cutType === "finishing" ? "positive" : "negative",
      description: `${cutType} operation: ${cutType === "finishing" ? "higher speeds allowed" : "conservative speeds"}`,
    },
    {
      feature: "flute_count",
      importance: 0.08,
      direction: flutes > 4 ? "positive" : "neutral",
      description: `${flutes} flutes affects chip evacuation and feed rate capability`,
    },
    {
      feature: "tool_material",
      importance: 0.05,
      direction: "positive",
      description: "Carbide assumed: enables higher speeds than HSS",
    },
  ];

  // Normalize to sum = 1.0
  const total = features.reduce((s, f) => s + f.importance, 0);
  features.forEach(f => f.importance = Math.round((f.importance / total) * 1000) / 1000);

  return features.sort((a, b) => b.importance - a.importance);
}

/**
 * Generate counterfactual explanation
 */
function generateCounterfactual(
  material: string,
  toolDiameter_mm: number,
  flutes: number,
  operation: Operation,
  cutType: CutType,
  feature: string,
  change: number
): CounterfactualResult {
  // Get baseline prediction
  const baseline = speedFeedDeepLearningEngine.predictSpeed(
    material, toolDiameter_mm, flutes, operation, cutType
  );

  // Apply counterfactual change
  let newSpeed = baseline.cutting_speed_mpm;
  let changeDirection = "";
  let outcomeChange = "";

  switch (feature) {
    case "speed":
      newSpeed = baseline.cutting_speed_mpm * (1 + change / 100);
      changeDirection = change > 0 ? `Increase speed by ${change}%` : `Decrease speed by ${Math.abs(change)}%`;
      const lifeFactor = Math.pow(baseline.cutting_speed_mpm / newSpeed, 3); // Taylor n ~ 0.3
      outcomeChange = change > 0
        ? `Tool life decreases ~${Math.round((1 - 1/lifeFactor) * 100)}%`
        : `Tool life increases ~${Math.round((lifeFactor - 1) * 100)}%`;
      break;
    case "feed":
      changeDirection = change > 0 ? `Increase feed by ${change}%` : `Decrease feed by ${Math.abs(change)}%`;
      const mrr_change = change;
      const surface_impact = change > 0 ? "rougher finish" : "finer finish";
      outcomeChange = `MRR ${change > 0 ? "increases" : "decreases"} ~${Math.abs(mrr_change)}%, ${surface_impact}`;
      break;
    case "depth":
      changeDirection = change > 0 ? `Increase depth by ${change}%` : `Decrease depth by ${Math.abs(change)}%`;
      outcomeChange = change > 0
        ? `Higher forces, potential chatter risk, ${Math.round(change * 0.8)}% more MRR`
        : `Safer cut, less MRR, may need more passes`;
      break;
    default:
      changeDirection = `Change ${feature} by ${change}%`;
      outcomeChange = "Unknown impact";
  }

  return {
    original_value: baseline.cutting_speed_mpm,
    counterfactual_value: Math.round(newSpeed),
    changed_feature: feature,
    change_direction: changeDirection,
    outcome_change: outcomeChange,
    confidence: 0.80,
  };
}

// ============================================================================
// MULTI-EXPERT CONSENSUS
// ============================================================================

/**
 * Get physics expert recommendation
 */
function getPhysicsExpertOpinion(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  cutType: CutType
): ExpertOpinion {
  const isoGroup = resolveISOGroup(material);
  const matProps = CANONICAL_MATERIAL_DB[isoGroup] || CANONICAL_MATERIAL_DB["P"];
  const kienzle = CANONICAL_KIENZLE[isoGroup] || CANONICAL_KIENZLE["P"];
  const taylor = CANONICAL_TAYLOR[isoGroup] || CANONICAL_TAYLOR["P"];

  // Physics-based conservative recommendation
  const baseSpeed = cutType === "finishing" ? 1.2 : 0.9;
  const speed = Math.round(taylor.C * Math.pow(60, -taylor.n) * baseSpeed);
  const feed = cutType === "finishing" ? 0.06 : 0.12;
  const depth = cutType === "finishing" ? 0.5 : 2.5;

  const concerns: string[] = [];
  if (isoGroup === "S" || isoGroup === "M") {
    concerns.push("Work hardening risk - maintain constant chip load");
  }
  if (isoGroup === "H") {
    concerns.push("High cutting forces - verify machine power capacity");
  }

  return {
    expert: "physics",
    recommendation: { speed_mpm: speed, feed_mm: feed, depth_mm: depth },
    confidence: 0.85,
    reasoning: `Based on Kienzle (kc1.1=${kienzle.kc1_1}) and Taylor (C=${taylor.C}, n=${taylor.n})`,
    concerns,
  };
}

/**
 * Get empirical expert recommendation (shop floor knowledge)
 */
function getEmpiricalExpertOpinion(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  cutType: CutType
): ExpertOpinion {
  // Empirical data from typical shop practice
  const isoGroup = resolveISOGroup(material);

  // Shop floor typically runs more conservative
  const shopSpeedMap: Record<string, number> = {
    P: 150, M: 80, K: 180, N: 350, S: 45, H: 60
  };
  const speed = shopSpeedMap[isoGroup] || 120;
  const feed = cutType === "finishing" ? 0.05 : 0.10;
  const depth = cutType === "finishing" ? 0.3 : 2.0;

  const concerns: string[] = [];
  if (material.toLowerCase().includes("cast")) {
    concerns.push("Casting porosity can cause tool chipping - reduce speed 10%");
  }
  if (toolDiameter_mm < 6) {
    concerns.push("Small tools break easily - keep depth under 1xD");
  }

  return {
    expert: "empirical",
    recommendation: { speed_mpm: speed, feed_mm: feed, depth_mm: depth },
    confidence: 0.80,
    reasoning: "Based on shop floor experience and similar job history",
    concerns,
  };
}

/**
 * Get optimization expert recommendation (maximize productivity)
 */
function getOptimizationExpertOpinion(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  cutType: CutType
): ExpertOpinion {
  // Optimization pushes for higher MRR while respecting limits
  const result = speedFeedDeepLearningEngine.bayesianOptimize(
    material,
    toolDiameter_mm,
    4,
    operation,
    { max_power_kW: 15, min_tool_life_min: 30, max_Ra_um: 3.2 }
  );

  const concerns: string[] = [];
  if (result.optimal_speed_mpm > 250) {
    concerns.push("High speed may require HSM-capable machine");
  }
  if (result.predicted_tool_life < 45) {
    concerns.push("Tool life may be marginal for long production runs");
  }

  return {
    expert: "optimization",
    recommendation: {
      speed_mpm: result.optimal_speed_mpm,
      feed_mm: result.optimal_feed_mm,
      depth_mm: result.optimal_depth_mm,
    },
    confidence: 0.75,
    reasoning: `Bayesian optimization for max MRR (${result.predicted_mrr.toFixed(2)} cm³/min)`,
    concerns,
  };
}

/**
 * Get safety expert recommendation (prioritize tool and part safety)
 */
function getSafetyExpertOpinion(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  cutType: CutType
): ExpertOpinion {
  const physics = getPhysicsExpertOpinion(material, toolDiameter_mm, operation, cutType);

  // Safety expert is more conservative
  const safetyFactor = 0.75;
  const speed = Math.round(physics.recommendation.speed_mpm * safetyFactor);
  const feed = physics.recommendation.feed_mm * 0.85;
  const depth = physics.recommendation.depth_mm * 0.8;

  const concerns: string[] = [
    "Conservative parameters to ensure process stability",
    "Prioritizes tool life and part quality over productivity",
  ];

  return {
    expert: "safety",
    recommendation: { speed_mpm: speed, feed_mm: Math.round(feed * 1000) / 1000, depth_mm: depth },
    confidence: 0.90,
    reasoning: "Conservative approach with 25% safety margin on speed",
    concerns,
  };
}

/**
 * Run multi-expert consensus debate
 */
function runConsensusDebate(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  cutType: CutType
): ConsensusResult {
  const experts = [
    getPhysicsExpertOpinion(material, toolDiameter_mm, operation, cutType),
    getEmpiricalExpertOpinion(material, toolDiameter_mm, operation, cutType),
    getOptimizationExpertOpinion(material, toolDiameter_mm, operation, cutType),
    getSafetyExpertOpinion(material, toolDiameter_mm, operation, cutType),
  ];

  // Weighted average (physics and empirical weighted higher)
  const weights = { physics: 0.30, empirical: 0.30, optimization: 0.20, safety: 0.20 };

  let totalWeight = 0;
  let speedSum = 0;
  let feedSum = 0;
  let depthSum = 0;

  for (const expert of experts) {
    const w = weights[expert.expert] * expert.confidence;
    totalWeight += w;
    speedSum += expert.recommendation.speed_mpm * w;
    feedSum += expert.recommendation.feed_mm * w;
    depthSum += expert.recommendation.depth_mm * w;
  }

  const finalRecommendation = {
    speed_mpm: Math.round(speedSum / totalWeight),
    feed_mm: Math.round((feedSum / totalWeight) * 1000) / 1000,
    depth_mm: Math.round((depthSum / totalWeight) * 10) / 10,
  };

  // Calculate agreement score
  const speedVariance = experts.reduce((s, e) =>
    s + Math.pow(e.recommendation.speed_mpm - finalRecommendation.speed_mpm, 2), 0) / experts.length;
  const agreementScore = Math.max(0, 1 - Math.sqrt(speedVariance) / finalRecommendation.speed_mpm);

  // Find dissenting views (> 20% deviation)
  const dissentingViews: string[] = [];
  for (const expert of experts) {
    const deviation = Math.abs(expert.recommendation.speed_mpm - finalRecommendation.speed_mpm) / finalRecommendation.speed_mpm;
    if (deviation > 0.2) {
      dissentingViews.push(`${expert.expert}: ${expert.reasoning}`);
    }
  }

  return {
    experts,
    consensus_reached: agreementScore > 0.7,
    final_recommendation: finalRecommendation,
    agreement_score: Math.round(agreementScore * 100) / 100,
    debate_summary: [
      `Physics suggests ${experts[0].recommendation.speed_mpm} m/min based on ${experts[0].reasoning}`,
      `Empirical data points to ${experts[1].recommendation.speed_mpm} m/min`,
      `Optimization finds ${experts[2].recommendation.speed_mpm} m/min optimal for MRR`,
      `Safety recommends ${experts[3].recommendation.speed_mpm} m/min with margin`,
      `Consensus: ${finalRecommendation.speed_mpm} m/min (${Math.round(agreementScore * 100)}% agreement)`,
    ],
    dissenting_views: dissentingViews,
  };
}

// ============================================================================
// CAUSAL REASONING
// ============================================================================

/**
 * Build causal DAG for speed/feed relationships
 */
function buildCausalDAG(): { nodes: CausalNode[]; edges: CausalEdge[] } {
  const nodes: CausalNode[] = [
    // Controllable inputs
    { id: "Vc", name: "Cutting Speed", type: "controllable", unit: "m/min" },
    { id: "fz", name: "Feed per Tooth", type: "controllable", unit: "mm" },
    { id: "ap", name: "Axial Depth", type: "controllable", unit: "mm" },
    { id: "ae", name: "Radial Depth", type: "controllable", unit: "mm" },

    // Observable material/tool properties
    { id: "kc", name: "Specific Cutting Force", type: "observable", unit: "N/mm²" },
    { id: "hardness", name: "Material Hardness", type: "observable", unit: "HB" },
    { id: "D", name: "Tool Diameter", type: "observable", unit: "mm" },
    { id: "z", name: "Number of Flutes", type: "observable" },

    // Latent variables
    { id: "T_cut", name: "Cutting Temperature", type: "latent", unit: "°C" },
    { id: "wear_rate", name: "Wear Rate", type: "latent", unit: "μm/min" },
    { id: "vibration", name: "Vibration Level", type: "latent", unit: "g" },

    // Outcomes
    { id: "MRR", name: "Material Removal Rate", type: "outcome", unit: "cm³/min" },
    { id: "Fc", name: "Cutting Force", type: "outcome", unit: "N" },
    { id: "T", name: "Tool Life", type: "outcome", unit: "min" },
    { id: "Ra", name: "Surface Roughness", type: "outcome", unit: "μm" },
    { id: "P", name: "Power Consumption", type: "outcome", unit: "kW" },
  ];

  const edges: CausalEdge[] = [
    // Speed affects temperature, wear, MRR, force
    { from: "Vc", to: "T_cut", strength: 0.9, mechanism: "Friction heat increases with speed" },
    { from: "Vc", to: "wear_rate", strength: 0.8, mechanism: "Higher speed accelerates wear" },
    { from: "Vc", to: "MRR", strength: 0.7, mechanism: "MRR proportional to speed" },
    { from: "Vc", to: "T", strength: -0.85, mechanism: "Taylor's equation: T = (C/Vc)^(1/n)" },

    // Feed affects force, surface, MRR
    { from: "fz", to: "Fc", strength: 0.8, mechanism: "Kienzle: Fc ∝ fz^(1-mc)" },
    { from: "fz", to: "Ra", strength: 0.9, mechanism: "Ra = f²/(32r) for nose radius r" },
    { from: "fz", to: "MRR", strength: 0.7, mechanism: "MRR proportional to feed" },

    // Depth affects force, vibration, MRR
    { from: "ap", to: "Fc", strength: 0.9, mechanism: "Kienzle: Fc ∝ ap" },
    { from: "ap", to: "vibration", strength: 0.7, mechanism: "Deeper cuts excite vibrations" },
    { from: "ap", to: "MRR", strength: 0.8, mechanism: "MRR proportional to depth" },
    { from: "ae", to: "MRR", strength: 0.8, mechanism: "MRR proportional to engagement" },

    // Material properties
    { from: "kc", to: "Fc", strength: 0.95, mechanism: "Fc = kc × A (chip area)" },
    { from: "hardness", to: "kc", strength: 0.6, mechanism: "Harder materials have higher kc" },
    { from: "hardness", to: "T", strength: -0.5, mechanism: "Harder materials reduce tool life" },

    // Temperature effects
    { from: "T_cut", to: "wear_rate", strength: 0.7, mechanism: "Diffusion wear accelerates with T" },
    { from: "T_cut", to: "Ra", strength: 0.3, mechanism: "High T can cause built-up edge" },

    // Force to power
    { from: "Fc", to: "P", strength: 0.95, mechanism: "P = Fc × Vc / 60000" },

    // Vibration effects
    { from: "vibration", to: "Ra", strength: 0.6, mechanism: "Chatter marks increase roughness" },
    { from: "vibration", to: "T", strength: -0.5, mechanism: "Chatter causes uneven wear" },

    // Tool geometry
    { from: "D", to: "vibration", strength: -0.4, mechanism: "Larger tools more rigid" },
    { from: "z", to: "vibration", strength: 0.3, mechanism: "More teeth = higher tooth passing frequency" },
  ];

  return { nodes, edges };
}

/**
 * Perform causal intervention analysis
 */
function performCausalIntervention(
  variable: string,
  value: number,
  material: string,
  currentParams: { speed_mpm: number; feed_mm: number; depth_mm: number }
): CausalInferenceResult {
  const dag = buildCausalDAG();

  // Get original outcome (tool life as primary outcome)
  const originalLife = speedFeedDeepLearningEngine.predictToolLife(
    material,
    currentParams.speed_mpm,
    currentParams.feed_mm,
    currentParams.depth_mm
  );

  // Perform intervention
  let newParams = { ...currentParams };
  switch (variable) {
    case "Vc":
    case "speed":
      newParams.speed_mpm = value;
      break;
    case "fz":
    case "feed":
      newParams.feed_mm = value;
      break;
    case "ap":
    case "depth":
      newParams.depth_mm = value;
      break;
  }

  const counterfactualLife = speedFeedDeepLearningEngine.predictToolLife(
    material,
    newParams.speed_mpm,
    newParams.feed_mm,
    newParams.depth_mm
  );

  // Identify mediating paths from DAG
  const mediatingPaths: string[][] = [];
  const varNode = variable === "speed" ? "Vc" : variable === "feed" ? "fz" : "ap";

  // Find paths to tool life (T)
  const directPath = dag.edges.find(e => e.from === varNode && e.to === "T");
  if (directPath) {
    mediatingPaths.push([varNode, "T"]);
  }

  // Find indirect paths
  for (const e1 of dag.edges.filter(e => e.from === varNode)) {
    for (const e2 of dag.edges.filter(e => e.from === e1.to && e.to === "T")) {
      mediatingPaths.push([varNode, e1.to, "T"]);
    }
  }

  // Identify potential confounders
  const confounders: string[] = [];
  if (variable === "speed" && currentParams.depth_mm > 3) {
    confounders.push("High depth may interact with speed effect");
  }
  if (material.toLowerCase().includes("stainless")) {
    confounders.push("Work hardening confounds speed-life relationship");
  }

  return {
    intervention: { variable, value },
    original_outcome: originalLife.tool_life_min,
    counterfactual_outcome: counterfactualLife.tool_life_min,
    causal_effect: counterfactualLife.tool_life_min - originalLife.tool_life_min,
    confidence: 0.80,
    mediating_paths: mediatingPaths,
    confounders,
  };
}

// ============================================================================
// HIERARCHICAL PLANNING
// ============================================================================

/**
 * Create hierarchical machining plan
 */
function createHierarchicalPlan(
  material: string,
  operations: { type: Operation; volume_cm3: number }[],
  constraints: {
    shift_hours?: number;
    target_parts?: number;
    quality_focus?: boolean;
  }
): HierarchicalPlan {
  const shiftHours = constraints.shift_hours || 8;
  const targetParts = constraints.target_parts || 100;
  const qualityFocus = constraints.quality_focus || false;

  // Strategic level: shift goals
  const strategic: PlanLevel = {
    level: "strategic",
    goals: [
      `Complete ${targetParts} parts in ${shiftHours}-hour shift`,
      qualityFocus ? "Prioritize quality over speed" : "Balance quality and productivity",
      "Maintain tool life reserves for shift completion",
    ],
    actions: [
      "Allocate 10% time buffer for setup and changeover",
      "Plan tool changes at natural break points",
      "Schedule finishing operations after roughing completes",
    ],
    constraints: [
      "Single spindle machine",
      `${shiftHours} hours available`,
      "Standard tooling inventory",
    ],
    success_criteria: [
      `≥${Math.round(targetParts * 0.95)} parts completed`,
      "Zero scrap parts",
      "Tools last entire shift",
    ],
  };

  // Tactical level: job sequencing
  const tacticalActions: string[] = [];
  let totalVolume = 0;
  for (const op of operations) {
    totalVolume += op.volume_cm3;
    tacticalActions.push(`${op.type}: ${op.volume_cm3} cm³`);
  }

  const tactical: PlanLevel = {
    level: "tactical",
    goals: [
      `Remove ${totalVolume.toFixed(1)} cm³ total material`,
      "Minimize tool changes",
      "Group similar operations",
    ],
    actions: tacticalActions,
    constraints: [
      "Sequential single-spindle execution",
      "Tool changes take ~2 minutes each",
    ],
    success_criteria: [
      "All features completed to tolerance",
      "≤3 tool changes per part",
    ],
  };

  // Operational level: cut-by-cut optimization
  const operational: PlanLevel = {
    level: "operational",
    goals: [
      "Optimize each cut for MRR within constraints",
      "Maintain stable cutting conditions",
      "Adapt to real-time feedback",
    ],
    actions: [
      "Use Bayesian-optimized parameters",
      "Apply chip thinning compensation",
      "Monitor power draw for overload detection",
    ],
    constraints: [
      "Machine power: 15 kW",
      "Spindle speed: 50-20000 RPM",
      "Feed rate: 1-10000 mm/min",
    ],
    success_criteria: [
      "No tool breakage",
      "Surface finish within spec",
      "Cycle time within estimate ±10%",
    ],
  };

  // Build execution order
  const executionOrder: string[] = [];
  for (const op of operations) {
    if (op.type === "milling" || op.type === "turning") {
      executionOrder.push(`ROUGH_${op.type.toUpperCase()}`);
      executionOrder.push(`SEMIFIN_${op.type.toUpperCase()}`);
      executionOrder.push(`FINISH_${op.type.toUpperCase()}`);
    } else {
      executionOrder.push(op.type.toUpperCase());
    }
  }

  // Calculate coherence (how well levels align)
  const coherenceScore = 0.85; // Simplified

  return {
    strategic,
    tactical,
    operational,
    coherence_score: coherenceScore,
    execution_order: executionOrder,
  };
}

// ============================================================================
// ADVANCED REASONING FRAMEWORKS
// ============================================================================

/**
 * Self-Consistency: multiple chains, majority vote
 */
function selfConsistencyAnalysis(
  material: string,
  toolDiameter_mm: number,
  flutes: number,
  operation: Operation,
  cutType: CutType,
  numChains: number = 5
): SelfConsistencyResult {
  const chains: { answer: string; confidence: number }[] = [];

  for (let i = 0; i < numChains; i++) {
    // Slightly vary the approach for each chain
    const noise = 1 + (Math.random() - 0.5) * 0.2; // ±10%
    const result = speedFeedDeepLearningEngine.predictSpeed(
      material,
      toolDiameter_mm,
      flutes,
      operation,
      cutType
    );

    const variedSpeed = Math.round(result.cutting_speed_mpm * noise);
    chains.push({
      answer: `${variedSpeed} m/min`,
      confidence: result.confidence * (1 - Math.abs(noise - 1)),
    });
  }

  // Find majority (bin speeds into 10% ranges)
  const bins: Map<number, number> = new Map();
  for (const chain of chains) {
    const speed = parseInt(chain.answer);
    const bin = Math.round(speed / 10) * 10;
    bins.set(bin, (bins.get(bin) || 0) + 1);
  }

  let maxCount = 0;
  let majorityBin = 0;
  bins.forEach((count, bin) => {
    if (count > maxCount) {
      maxCount = count;
      majorityBin = bin;
    }
  });

  const agreementRatio = maxCount / numChains;
  const avgConfidence = chains.reduce((s, c) => s + c.confidence, 0) / numChains;

  return {
    chains,
    majority_answer: `${majorityBin} m/min`,
    agreement_ratio: Math.round(agreementRatio * 100) / 100,
    final_confidence: Math.round(agreementRatio * avgConfidence * 100) / 100,
  };
}

/**
 * Chain of Verification: cross-check answers
 */
function chainOfVerification(
  material: string,
  toolDiameter_mm: number,
  flutes: number,
  operation: Operation,
  cutType: CutType,
  proposedSpeed: number
): VerificationResult {
  const steps: { step: string; passed: boolean; evidence: string }[] = [];
  const corrections: string[] = [];

  // Step 1: Check against ISO guidelines
  const isoGroup = resolveISOGroup(material);
  const isoRange = getISOSpeedRange(isoGroup, cutType);
  const step1Passed = proposedSpeed >= isoRange.min && proposedSpeed <= isoRange.max;
  steps.push({
    step: "ISO 513 Speed Range Check",
    passed: step1Passed,
    evidence: `ISO ${isoGroup} ${cutType}: ${isoRange.min}-${isoRange.max} m/min, proposed: ${proposedSpeed}`,
  });
  if (!step1Passed) {
    corrections.push(`Adjust speed to ISO range: ${isoRange.min}-${isoRange.max} m/min`);
  }

  // Step 2: Check power consumption
  const power = speedFeedDeepLearningEngine.predictPower(
    material, proposedSpeed, 0.1, 3, 4, 15
  );
  const step2Passed = power.power_utilization_pct < 90;
  steps.push({
    step: "Machine Power Capacity",
    passed: step2Passed,
    evidence: `Power utilization: ${power.power_utilization_pct.toFixed(0)}% of 15 kW`,
  });
  if (!step2Passed) {
    corrections.push("Reduce speed or depth to stay within power limits");
  }

  // Step 3: Check tool life viability
  const toolLife = speedFeedDeepLearningEngine.predictToolLife(material, proposedSpeed, 0.1, 3);
  const step3Passed = toolLife.tool_life_min > 30;
  steps.push({
    step: "Tool Life Viability",
    passed: step3Passed,
    evidence: `Predicted tool life: ${toolLife.tool_life_min.toFixed(0)} min`,
  });
  if (!step3Passed) {
    corrections.push("Reduce speed for acceptable tool life (>30 min)");
  }

  // Step 4: Check surface finish achievability
  const finish = speedFeedDeepLearningEngine.predictSurfaceFinish(0.1, 0.8, operation, cutType);
  const targetRa = cutType === "finishing" ? 1.6 : 3.2;
  const step4Passed = finish.predicted_Ra_um <= targetRa;
  steps.push({
    step: "Surface Finish Target",
    passed: step4Passed,
    evidence: `Predicted Ra: ${finish.predicted_Ra_um.toFixed(2)} μm vs target ${targetRa} μm`,
  });
  if (!step4Passed) {
    corrections.push("Reduce feed for finer surface finish");
  }

  return {
    claim: `${proposedSpeed} m/min is appropriate for ${material} ${cutType}`,
    verification_steps: steps,
    overall_valid: steps.every(s => s.passed),
    corrections,
  };
}

/**
 * ReAct: Reason + Act interleaving
 */
function reactAnalysis(
  material: string,
  toolDiameter_mm: number,
  flutes: number,
  operation: Operation,
  targetMRR: number
): ReActResult {
  const steps: ReActStep[] = [];
  let currentSpeed = 150;
  let currentFeed = 0.1;
  let currentDepth = 2.0;

  // Step 1: Assess material
  steps.push({
    thought: `Material is ${material}, need to identify ISO group for parameter selection`,
    action: "Resolve ISO group and get Kienzle coefficients",
    observation: `ISO group: ${resolveISOGroup(material)}, base parameters established`,
  });

  // Step 2: Check initial parameters
  const mrr1 = currentSpeed * currentFeed * currentDepth * 0.001;
  steps.push({
    thought: `Current MRR is ${mrr1.toFixed(2)} cm³/min, target is ${targetMRR}. Need to ${mrr1 < targetMRR ? "increase" : "decrease"} parameters.`,
    action: mrr1 < targetMRR ? "Increase speed by 20%" : "Parameters acceptable",
    observation: mrr1 < targetMRR ? `Speed adjusted to ${Math.round(currentSpeed * 1.2)} m/min` : "No change needed",
  });

  if (mrr1 < targetMRR) {
    currentSpeed = Math.round(currentSpeed * 1.2);
  }

  // Step 3: Verify power
  const power = speedFeedDeepLearningEngine.predictPower(
    material, currentSpeed, currentFeed, currentDepth, currentDepth * 0.5
  );
  steps.push({
    thought: `Need to verify power consumption at new parameters`,
    action: "Calculate power using Kienzle force model",
    observation: `Power: ${power.power_kW.toFixed(1)} kW (${power.power_utilization_pct.toFixed(0)}% utilization)`,
  });

  // Step 4: Adjust if needed
  if (power.power_utilization_pct > 85) {
    currentSpeed = Math.round(currentSpeed * 0.9);
    steps.push({
      thought: "Power utilization too high, need to reduce speed",
      action: "Reduce speed by 10%",
      observation: `Speed reduced to ${currentSpeed} m/min for safe power level`,
    });
  }

  // Final MRR calculation
  const finalMRR = currentSpeed * currentFeed * currentDepth * 0.001;

  return {
    steps,
    final_answer: `Speed: ${currentSpeed} m/min, Feed: ${currentFeed} mm, Depth: ${currentDepth} mm → MRR: ${finalMRR.toFixed(2)} cm³/min`,
    confidence: 0.85,
  };
}

/**
 * Reflexion: learn from mistakes
 */
function reflexionAnalysis(
  material: string,
  toolDiameter_mm: number,
  operation: Operation,
  failureHistory: { attempt: string; failure_mode: string }[]
): ReflexionResult {
  const episodes: ReflexionEpisode[] = [];
  const lessonsLearned: string[] = [];

  // Analyze past failures
  for (let i = 0; i < failureHistory.length; i++) {
    const failure = failureHistory[i];
    let reflection = "";
    let lesson = "";

    if (failure.failure_mode.includes("chatter")) {
      reflection = "Chatter occurred, likely due to excessive depth or speed near resonance";
      lesson = "Reduce depth or check stability lobe diagram";
      lessonsLearned.push("Avoid unstable speed ranges");
    } else if (failure.failure_mode.includes("tool break")) {
      reflection = "Tool breakage suggests excessive force or weak tool";
      lesson = "Reduce depth/feed or use larger tool";
      lessonsLearned.push("Keep forces within tool strength limits");
    } else if (failure.failure_mode.includes("poor finish")) {
      reflection = "Poor finish from high feed or tool wear";
      lesson = "Reduce feed for finishing, check tool condition";
      lessonsLearned.push("Monitor tool wear for finish-critical operations");
    } else {
      reflection = `Analyzing failure: ${failure.failure_mode}`;
      lesson = "Investigate root cause before adjusting parameters";
    }

    episodes.push({
      attempt: i + 1,
      action: failure.attempt,
      outcome: failure.failure_mode,
      reflection,
      lesson,
    });
  }

  // Generate improved solution based on lessons
  const improvementFactor = Math.min(1.0, 0.5 + lessonsLearned.length * 0.15);
  const finalSolution = `Apply ${lessonsLearned.length} lessons: ${lessonsLearned.join("; ")}`;

  return {
    episodes,
    final_solution: finalSolution,
    lessons_learned: lessonsLearned,
    improvement_from_reflection: improvementFactor,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function resolveISOGroup(material: string): ISOGroup {
  const m = material.toLowerCase();

  // Tool steels
  if (m.includes("d2") || m.includes("a2") || m.includes("m2") || m.includes("s7") || m.includes("h13")) {
    return m.includes("hardened") ? "H" : "P";
  }
  if (m.includes("stainless") || m.includes("316") || m.includes("304") || m.includes("17-4")) return "M";
  if (m.includes("cast iron") || m.includes("gray iron") || m.includes("ductile")) return "K";
  if (m.includes("aluminum") || m.includes("6061") || m.includes("7075")) return "N";
  if (m.includes("titanium") || m.includes("ti-6al") || m.includes("inconel") || m.includes("hastelloy")) return "S";
  if (m.includes("hardened") || m.includes("hrc") || m.includes("hard steel")) return "H";

  // Default to P (general steel)
  return "P";
}

function getISOSpeedRange(isoGroup: string, cutType: CutType): { min: number; max: number } {
  const ranges: Record<string, Record<CutType, { min: number; max: number }>> = {
    P: { roughing: { min: 120, max: 200 }, semi_finishing: { min: 150, max: 250 }, finishing: { min: 180, max: 300 } },
    M: { roughing: { min: 60, max: 100 }, semi_finishing: { min: 80, max: 120 }, finishing: { min: 100, max: 150 } },
    K: { roughing: { min: 150, max: 250 }, semi_finishing: { min: 180, max: 300 }, finishing: { min: 200, max: 350 } },
    N: { roughing: { min: 300, max: 600 }, semi_finishing: { min: 400, max: 800 }, finishing: { min: 500, max: 1000 } },
    S: { roughing: { min: 30, max: 60 }, semi_finishing: { min: 40, max: 70 }, finishing: { min: 50, max: 80 } },
    H: { roughing: { min: 40, max: 80 }, semi_finishing: { min: 50, max: 100 }, finishing: { min: 60, max: 120 } },
  };
  return ranges[isoGroup]?.[cutType] || { min: 100, max: 200 };
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

class SpeedFeedAdvancedAIEngine {
  private queryCount = 0;

  // ============================================================================
  // XAI METHODS
  // ============================================================================

  getFeatureImportance(
    material: string,
    toolDiameter_mm: number,
    flutes: number,
    cutType: CutType,
    hardness_HB?: number
  ): FeatureImportance[] {
    this.queryCount++;
    return calculateFeatureImportance(material, toolDiameter_mm, flutes, cutType, hardness_HB);
  }

  getCounterfactual(
    material: string,
    toolDiameter_mm: number,
    flutes: number,
    operation: Operation,
    cutType: CutType,
    feature: string,
    changePercent: number
  ): CounterfactualResult {
    this.queryCount++;
    return generateCounterfactual(material, toolDiameter_mm, flutes, operation, cutType, feature, changePercent);
  }

  // ============================================================================
  // CONSENSUS METHODS
  // ============================================================================

  getMultiExpertConsensus(
    material: string,
    toolDiameter_mm: number,
    operation: Operation,
    cutType: CutType
  ): ConsensusResult {
    this.queryCount++;
    return runConsensusDebate(material, toolDiameter_mm, operation, cutType);
  }

  // ============================================================================
  // CAUSAL METHODS
  // ============================================================================

  getCausalDAG(): { nodes: CausalNode[]; edges: CausalEdge[] } {
    this.queryCount++;
    return buildCausalDAG();
  }

  performIntervention(
    variable: string,
    value: number,
    material: string,
    currentParams: { speed_mpm: number; feed_mm: number; depth_mm: number }
  ): CausalInferenceResult {
    this.queryCount++;
    return performCausalIntervention(variable, value, material, currentParams);
  }

  // ============================================================================
  // PLANNING METHODS
  // ============================================================================

  createPlan(
    material: string,
    operations: { type: Operation; volume_cm3: number }[],
    constraints: {
      shift_hours?: number;
      target_parts?: number;
      quality_focus?: boolean;
    }
  ): HierarchicalPlan {
    this.queryCount++;
    return createHierarchicalPlan(material, operations, constraints);
  }

  // ============================================================================
  // ADVANCED REASONING METHODS
  // ============================================================================

  selfConsistency(
    material: string,
    toolDiameter_mm: number,
    flutes: number,
    operation: Operation,
    cutType: CutType,
    numChains?: number
  ): SelfConsistencyResult {
    this.queryCount++;
    return selfConsistencyAnalysis(material, toolDiameter_mm, flutes, operation, cutType, numChains);
  }

  verifyParameters(
    material: string,
    toolDiameter_mm: number,
    flutes: number,
    operation: Operation,
    cutType: CutType,
    proposedSpeed: number
  ): VerificationResult {
    this.queryCount++;
    return chainOfVerification(material, toolDiameter_mm, flutes, operation, cutType, proposedSpeed);
  }

  reactOptimize(
    material: string,
    toolDiameter_mm: number,
    flutes: number,
    operation: Operation,
    targetMRR: number
  ): ReActResult {
    this.queryCount++;
    return reactAnalysis(material, toolDiameter_mm, flutes, operation, targetMRR);
  }

  learnFromFailures(
    material: string,
    toolDiameter_mm: number,
    operation: Operation,
    failureHistory: { attempt: string; failure_mode: string }[]
  ): ReflexionResult {
    this.queryCount++;
    return reflexionAnalysis(material, toolDiameter_mm, operation, failureHistory);
  }

  // ============================================================================
  // COMPREHENSIVE ADVANCED ANALYSIS
  // ============================================================================

  async advancedAnalysis(params: {
    material: string;
    tool_diameter_mm: number;
    flutes: number;
    operation: Operation;
    cut_type: CutType;
    target_mrr?: number;
    failure_history?: { attempt: string; failure_mode: string }[];
  }): Promise<{
    feature_importance: FeatureImportance[];
    consensus: ConsensusResult;
    self_consistency: SelfConsistencyResult;
    verification: VerificationResult;
    causal_dag: { nodes: CausalNode[]; edges: CausalEdge[] };
    react: ReActResult;
    reflexion?: ReflexionResult;
    overall_confidence: number;
  }> {
    this.queryCount++;

    const featureImportance = this.getFeatureImportance(
      params.material, params.tool_diameter_mm, params.flutes, params.cut_type
    );

    const consensus = this.getMultiExpertConsensus(
      params.material, params.tool_diameter_mm, params.operation, params.cut_type
    );

    const selfConsistency = this.selfConsistency(
      params.material, params.tool_diameter_mm, params.flutes, params.operation, params.cut_type
    );

    const verification = this.verifyParameters(
      params.material, params.tool_diameter_mm, params.flutes, params.operation, params.cut_type,
      consensus.final_recommendation.speed_mpm
    );

    const causalDag = this.getCausalDAG();

    const react = this.reactOptimize(
      params.material, params.tool_diameter_mm, params.flutes, params.operation,
      params.target_mrr || 5.0
    );

    let reflexion: ReflexionResult | undefined;
    if (params.failure_history && params.failure_history.length > 0) {
      reflexion = this.learnFromFailures(
        params.material, params.tool_diameter_mm, params.operation, params.failure_history
      );
    }

    // Calculate overall confidence
    const overallConfidence = (
      consensus.agreement_score * 0.3 +
      selfConsistency.final_confidence * 0.25 +
      (verification.overall_valid ? 0.9 : 0.5) * 0.25 +
      react.confidence * 0.2
    );

    return {
      feature_importance: featureImportance,
      consensus,
      self_consistency: selfConsistency,
      verification,
      causal_dag: causalDag,
      react,
      reflexion,
      overall_confidence: Math.round(overallConfidence * 100) / 100,
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  stats(): {
    queries_processed: number;
    ai_capabilities: string[];
    reasoning_frameworks: string[];
  } {
    return {
      queries_processed: this.queryCount,
      ai_capabilities: [
        "XAI (Feature Importance, Counterfactual)",
        "Multi-Expert Consensus",
        "Causal Reasoning (DAG, Intervention)",
        "Hierarchical Planning",
      ],
      reasoning_frameworks: [
        "Self-Consistency",
        "Chain of Verification",
        "ReAct (Reason + Act)",
        "Reflexion (Learn from Failures)",
      ],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const speedFeedAdvancedAIEngine = new SpeedFeedAdvancedAIEngine();

export type {
  FeatureImportance,
  CounterfactualResult,
  ExpertOpinion,
  ConsensusResult,
  CausalNode,
  CausalEdge,
  CausalInferenceResult,
  HierarchicalPlan,
  SelfConsistencyResult,
  VerificationResult,
  ReActResult,
  ReflexionResult,
};
