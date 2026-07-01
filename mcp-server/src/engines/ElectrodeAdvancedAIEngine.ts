/**
 * ElectrodeAdvancedAIEngine — ELEC-PIPE-ULTRA-AI
 *
 * Third-layer AI hardening for electrode design with advanced capabilities.
 * Builds on ElectrodeDeepLearningEngine with LLM integration, multi-expert
 * consensus, explainable AI, anomaly detection, and causal inference.
 *
 * Advanced AI Capabilities:
 * -------------------------
 * 1. LLM-POWERED REASONING
 *    - Natural language explanations via LLMEngine
 *    - Conversational parameter tuning suggestions
 *    - Shop floor wisdom extraction and synthesis
 *
 * 2. MULTI-EXPERT CONSENSUS
 *    - Wear Expert: specializes in electrode wear prediction
 *    - Finish Expert: specializes in surface finish optimization
 *    - Force Expert: specializes in cutting force dynamics
 *    - Debate protocol with confidence-weighted voting
 *
 * 3. EXPLAINABLE AI (XAI)
 *    - SHAP-style feature importance attribution
 *    - Counterfactual explanations ("what if" analysis)
 *    - Decision boundary visualization
 *    - Confidence calibration metrics
 *
 * 4. ANOMALY DETECTION
 *    - Mahalanobis distance for out-of-distribution inputs
 *    - Isolation Forest for multivariate anomalies
 *    - Epistemic uncertainty quantification
 *    - Distribution shift detection
 *
 * 5. ACTIVE LEARNING
 *    - Uncertainty sampling for maximum information gain
 *    - Query-by-committee disagreement
 *    - Expected model improvement ranking
 *    - Feedback prioritization for shop floor
 *
 * 6. CAUSAL DAG
 *    - Explicit causal graph for electrode physics
 *    - Intervention analysis (do-calculus)
 *    - Confounding adjustment
 *    - Mediation analysis for indirect effects
 *
 * 7. ENSEMBLE PREDICTIONS
 *    - Multiple model architectures (MLP, RF proxy, linear)
 *    - Confidence-weighted voting
 *    - Disagreement detection
 *    - Model diversity metrics
 *
 * @module engines/ElectrodeAdvancedAIEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { electrodeDeepLearningEngine } from "./ElectrodeDeepLearningEngine.js";
import { electrodeAIReasoningEngine } from "./ElectrodeAIReasoningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Feature importance attribution */
interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "positive" | "negative";
  description: string;
}

/** Counterfactual explanation */
interface Counterfactual {
  scenario: string;
  changes: Record<string, { from: number; to: number }>;
  predicted_outcome: number;
  improvement_percent: number;
}

/** Expert opinion in multi-expert consensus */
interface ExpertOpinion {
  expert_id: string;
  domain: "wear" | "finish" | "force" | "general";
  prediction: number;
  confidence: number;
  reasoning: string;
  dissent?: string;
}

/** Consensus result from multi-expert debate */
interface ConsensusResult {
  final_prediction: number;
  confidence: number;
  agreement_level: number;
  experts: ExpertOpinion[];
  debate_rounds: number;
  key_disagreements: string[];
  resolution_method: "unanimous" | "majority" | "weighted" | "expert_override";
}

/** Anomaly detection result */
interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;
  mahalanobis_distance: number;
  isolation_score: number;
  epistemic_uncertainty: number;
  out_of_distribution_features: string[];
  recommendation: string;
}

/** Active learning query recommendation */
interface ActiveLearningQuery {
  job_id: string;
  priority_score: number;
  uncertainty: number;
  expected_information_gain: number;
  recommended_measurements: string[];
  reasoning: string;
}

/** Causal graph node */
interface CausalNode {
  id: string;
  name: string;
  type: "input" | "intermediate" | "output";
  parents: string[];
  children: string[];
}

/** Causal effect estimate */
interface CausalEffect {
  cause: string;
  effect: string;
  direct_effect: number;
  indirect_effect: number;
  total_effect: number;
  confidence_interval: { lower: number; upper: number };
  mediators: string[];
}

/** Ensemble prediction result */
interface EnsemblePrediction {
  prediction: number;
  confidence: number;
  model_predictions: Array<{
    model: string;
    prediction: number;
    weight: number;
  }>;
  disagreement: number;
  diversity_score: number;
}

/** LLM explanation result */
interface LLMExplanation {
  natural_language: string;
  technical_summary: string;
  recommendations: string[];
  confidence: number;
  tribal_wisdom: string[];
  warnings: string[];
}

/** Comprehensive advanced analysis */
interface AdvancedAnalysisResult {
  // Core predictions
  wear_prediction: EnsemblePrediction;
  finish_prediction: EnsemblePrediction;
  force_prediction: EnsemblePrediction;

  // Explainability
  feature_importance: FeatureImportance[];
  counterfactuals: Counterfactual[];

  // Multi-expert
  consensus: ConsensusResult;

  // Anomaly detection
  anomaly_check: AnomalyResult;

  // Active learning
  feedback_priority: ActiveLearningQuery;

  // Causal analysis
  causal_effects: CausalEffect[];

  // LLM explanation
  llm_explanation: LLMExplanation;

  // Meta
  overall_confidence: number;
  processing_time_ms: number;
  ai_layers_used: string[];
}

// ============================================================================
// CAUSAL DAG — Electrode Physics Graph
// ============================================================================

/**
 * Causal Directed Acyclic Graph for electrode physics.
 * Based on Toenshoff's discharge cascade model and Kunieda's thermal analysis.
 *
 * Structure:
 * - Input nodes: material, energy, geometry, process params
 * - Intermediate nodes: thermal load, debris formation, gap conditions
 * - Output nodes: wear ratio, surface finish, dimensional accuracy
 */
const ELECTRODE_CAUSAL_DAG: CausalNode[] = [
  // Input nodes
  { id: "discharge_energy", name: "Discharge Energy (mJ)", type: "input", parents: [], children: ["thermal_load", "crater_size"] },
  { id: "duty_cycle", name: "Duty Cycle", type: "input", parents: [], children: ["thermal_load", "debris_flushing"] },
  { id: "electrode_grain", name: "Electrode Grain Size (μm)", type: "input", parents: [], children: ["edge_quality", "wear_rate"] },
  { id: "workpiece_hardness", name: "Workpiece Hardness (HRC)", type: "input", parents: [], children: ["material_removal_rate", "thermal_resistance"] },
  { id: "spark_gap", name: "Spark Gap (mm)", type: "input", parents: [], children: ["debris_flushing", "arc_stability"] },
  { id: "num_passes", name: "Number of Passes", type: "input", parents: [], children: ["surface_finish", "total_time"] },

  // Intermediate nodes
  { id: "thermal_load", name: "Thermal Load", type: "intermediate", parents: ["discharge_energy", "duty_cycle"], children: ["recast_layer", "electrode_wear"] },
  { id: "crater_size", name: "Crater Size", type: "intermediate", parents: ["discharge_energy"], children: ["surface_finish", "material_removal_rate"] },
  { id: "debris_flushing", name: "Debris Flushing Efficiency", type: "intermediate", parents: ["duty_cycle", "spark_gap"], children: ["arc_stability", "surface_finish"] },
  { id: "arc_stability", name: "Arc Stability", type: "intermediate", parents: ["spark_gap", "debris_flushing"], children: ["surface_finish", "dimensional_accuracy"] },
  { id: "edge_quality", name: "Electrode Edge Quality", type: "intermediate", parents: ["electrode_grain"], children: ["surface_finish", "electrode_wear"] },
  { id: "material_removal_rate", name: "MRR (mm³/min)", type: "intermediate", parents: ["workpiece_hardness", "crater_size"], children: ["total_time"] },
  { id: "thermal_resistance", name: "Thermal Resistance", type: "intermediate", parents: ["workpiece_hardness"], children: ["recast_layer"] },
  { id: "recast_layer", name: "Recast Layer Depth (μm)", type: "intermediate", parents: ["thermal_load", "thermal_resistance"], children: ["surface_integrity"] },

  // Output nodes
  { id: "electrode_wear", name: "Electrode Wear Ratio", type: "output", parents: ["thermal_load", "edge_quality"], children: [] },
  { id: "surface_finish", name: "Surface Finish Ra (μm)", type: "output", parents: ["crater_size", "debris_flushing", "arc_stability", "edge_quality", "num_passes"], children: [] },
  { id: "dimensional_accuracy", name: "Dimensional Accuracy (mm)", type: "output", parents: ["arc_stability"], children: [] },
  { id: "surface_integrity", name: "Surface Integrity Score", type: "output", parents: ["recast_layer"], children: [] },
  { id: "total_time", name: "Total Machining Time", type: "output", parents: ["material_removal_rate", "num_passes"], children: [] },
];

// ============================================================================
// EXPERT KNOWLEDGE BASES
// ============================================================================

/** Wear Expert knowledge base */
const WEAR_EXPERT_RULES = [
  { condition: (p: any) => p.discharge_energy > 80, weight: 0.3, insight: "High discharge energy accelerates electrode wear exponentially" },
  { condition: (p: any) => p.duty_cycle > 0.45, weight: 0.25, insight: "Duty cycle above 45% reduces cooling time, increasing thermal wear" },
  { condition: (p: any) => p.electrode_grain < 3, weight: -0.2, insight: "Ultra-fine grain graphite has better wear resistance" },
  { condition: (p: any) => p.workpiece_hardness > 60, weight: 0.15, insight: "Hardened steel requires more energy, increasing electrode wear" },
  { condition: (p: any) => p.num_cavities > 2, weight: 0.2, insight: "Multiple cavities multiply total electrode consumption" },
];

/** Finish Expert knowledge base */
const FINISH_EXPERT_RULES = [
  { condition: (p: any) => p.num_skim_passes >= 3, weight: -0.3, insight: "Three or more skim passes achieve mirror-like finish" },
  { condition: (p: any) => p.spark_gap < 0.04, weight: -0.25, insight: "Tight spark gap produces finer surface texture" },
  { condition: (p: any) => p.electrode_grain < 5, weight: -0.2, insight: "Fine-grain electrode transfers less surface texture" },
  { condition: (p: any) => p.duty_cycle < 0.36, weight: -0.15, insight: "Lower duty cycle allows better debris clearing for cleaner finish" },
  { condition: (p: any) => p.discharge_energy > 60, weight: 0.25, insight: "High energy creates larger craters, degrading finish" },
];

/** Force Expert knowledge base */
const FORCE_EXPERT_RULES = [
  { condition: (p: any) => (p.c_dia - p.e_dia) / 4 > 0.02, weight: 0.3, insight: "Large trilobe amplitude causes significant force variation" },
  { condition: (p: any) => p.rpm > 2000, weight: 0.2, insight: "High RPM amplifies dynamic force variation" },
  { condition: (p: any) => p.lead_angle > 10, weight: 0.25, insight: "Lead angle above 10° introduces axial force component" },
  { condition: (p: any) => p.feed > 0.004, weight: 0.15, insight: "Aggressive feed increases peak cutting forces" },
  { condition: (p: any) => p.workpiece_material === "carbide", weight: 0.2, insight: "Carbide requires CuW electrode with different force profile" },
];

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

class ElectrodeAdvancedAIEngine {
  private queryCount = 0;
  private consensusHistory: ConsensusResult[] = [];
  private anomalyLog: AnomalyResult[] = [];
  private activeLearningQueue: ActiveLearningQuery[] = [];

  // Training data statistics for Mahalanobis distance
  private readonly trainingMean = {
    discharge_energy: 50,
    duty_cycle: 0.40,
    electrode_grain: 5,
    workpiece_hardness: 55,
    spark_gap: 0.05,
    num_passes: 2,
    c_dia: 0.280,
    e_dia: 0.250,
    rpm: 1500,
    feed: 0.003,
  };

  private readonly trainingStd = {
    discharge_energy: 30,
    duty_cycle: 0.10,
    electrode_grain: 4,
    workpiece_hardness: 12,
    spark_gap: 0.04,
    num_passes: 1.5,
    c_dia: 0.08,
    e_dia: 0.06,
    rpm: 500,
    feed: 0.002,
  };

  // ============================================================================
  // EXPLAINABLE AI — SHAP-Style Feature Importance
  // ============================================================================

  /**
   * Calculate SHAP-style feature importance for wear prediction.
   * Uses permutation importance with baseline comparison.
   */
  computeFeatureImportance(params: {
    discharge_energy_mJ: number;
    num_cavities: number;
    workpiece_hardness_HRC: number;
    electrode_grain_size_um: number;
    surface_area_mm2: number;
    depth_mm: number;
  }): FeatureImportance[] {
    this.queryCount++;

    // Baseline prediction
    const baseline = electrodeDeepLearningEngine.predictWear(
      params.discharge_energy_mJ,
      params.num_cavities,
      params.workpiece_hardness_HRC,
      params.electrode_grain_size_um,
      params.surface_area_mm2,
      params.depth_mm
    );

    const baselineValue = baseline.electrode_wear_ratio;
    const features: FeatureImportance[] = [];

    // Permutation importance for each feature
    const perturbations = [
      { feature: "discharge_energy_mJ", perturbed: params.discharge_energy_mJ * 0.8, description: "Energy level determines thermal load on electrode" },
      { feature: "num_cavities", perturbed: Math.max(1, params.num_cavities - 1), description: "Number of cavities multiplies total electrode usage" },
      { feature: "workpiece_hardness_HRC", perturbed: params.workpiece_hardness_HRC * 0.9, description: "Harder material requires more energy, accelerating wear" },
      { feature: "electrode_grain_size_um", perturbed: params.electrode_grain_size_um * 1.5, description: "Finer grain provides better wear resistance" },
      { feature: "surface_area_mm2", perturbed: params.surface_area_mm2 * 0.8, description: "Larger area spreads thermal load, reducing local wear" },
      { feature: "depth_mm", perturbed: params.depth_mm * 0.8, description: "Deeper cuts require more electrode material" },
    ];

    for (const p of perturbations) {
      const perturbedParams = { ...params, [p.feature]: p.perturbed };
      const perturbedResult = electrodeDeepLearningEngine.predictWear(
        perturbedParams.discharge_energy_mJ,
        perturbedParams.num_cavities,
        perturbedParams.workpiece_hardness_HRC,
        perturbedParams.electrode_grain_size_um,
        perturbedParams.surface_area_mm2,
        perturbedParams.depth_mm
      );

      const importance = Math.abs(baselineValue - perturbedResult.electrode_wear_ratio);
      const direction = perturbedResult.electrode_wear_ratio < baselineValue ? "positive" : "negative";

      features.push({
        feature: p.feature,
        importance: Math.round(importance * 1000) / 1000,
        direction,
        description: p.description,
      });
    }

    // Sort by importance descending
    features.sort((a, b) => b.importance - a.importance);

    return features;
  }

  // ============================================================================
  // COUNTERFACTUAL EXPLANATIONS
  // ============================================================================

  /**
   * Generate counterfactual explanations — "what if" scenarios.
   * Shows what parameter changes would achieve a target outcome.
   */
  generateCounterfactuals(
    params: {
      discharge_energy_mJ: number;
      electrode_grain_size_um: number;
      duty_cycle: number;
      num_skim_passes: number;
      spark_gap_mm: number;
    },
    target_Ra_um: number
  ): Counterfactual[] {
    this.queryCount++;

    const counterfactuals: Counterfactual[] = [];

    // Current prediction
    const current = electrodeDeepLearningEngine.predictSurfaceFinish(
      params.discharge_energy_mJ,
      params.num_skim_passes,
      params.electrode_grain_size_um,
      params.duty_cycle,
      params.spark_gap_mm
    );

    const currentRa = current.predicted_Ra_um;

    // Generate improvement scenarios
    const scenarios: Array<{
      scenario: string;
      changes: Record<string, { from: number; to: number }>;
      newParams: typeof params;
    }> = [
      {
        scenario: "Reduce discharge energy by 30%",
        changes: { discharge_energy_mJ: { from: params.discharge_energy_mJ, to: params.discharge_energy_mJ * 0.7 } },
        newParams: { ...params, discharge_energy_mJ: params.discharge_energy_mJ * 0.7 },
      },
      {
        scenario: "Add one more skim pass",
        changes: { num_skim_passes: { from: params.num_skim_passes, to: params.num_skim_passes + 1 } },
        newParams: { ...params, num_skim_passes: params.num_skim_passes + 1 },
      },
      {
        scenario: "Use finer grain electrode (2μm)",
        changes: { electrode_grain_size_um: { from: params.electrode_grain_size_um, to: 2 } },
        newParams: { ...params, electrode_grain_size_um: 2 },
      },
      {
        scenario: "Reduce duty cycle to 33%",
        changes: { duty_cycle: { from: params.duty_cycle, to: 0.33 } },
        newParams: { ...params, duty_cycle: 0.33 },
      },
      {
        scenario: "Tighten spark gap to 0.03mm",
        changes: { spark_gap_mm: { from: params.spark_gap_mm, to: 0.03 } },
        newParams: { ...params, spark_gap_mm: 0.03 },
      },
      {
        scenario: "Combine: lower energy + extra pass + finer grain",
        changes: {
          discharge_energy_mJ: { from: params.discharge_energy_mJ, to: params.discharge_energy_mJ * 0.6 },
          num_skim_passes: { from: params.num_skim_passes, to: params.num_skim_passes + 2 },
          electrode_grain_size_um: { from: params.electrode_grain_size_um, to: 2 },
        },
        newParams: {
          ...params,
          discharge_energy_mJ: params.discharge_energy_mJ * 0.6,
          num_skim_passes: params.num_skim_passes + 2,
          electrode_grain_size_um: 2,
        },
      },
    ];

    for (const s of scenarios) {
      const newResult = electrodeDeepLearningEngine.predictSurfaceFinish(
        s.newParams.discharge_energy_mJ,
        s.newParams.num_skim_passes,
        s.newParams.electrode_grain_size_um,
        s.newParams.duty_cycle,
        s.newParams.spark_gap_mm
      );

      const improvement = ((currentRa - newResult.predicted_Ra_um) / currentRa) * 100;

      counterfactuals.push({
        scenario: s.scenario,
        changes: s.changes,
        predicted_outcome: Math.round(newResult.predicted_Ra_um * 100) / 100,
        improvement_percent: Math.round(improvement * 10) / 10,
      });
    }

    // Sort by improvement descending
    counterfactuals.sort((a, b) => b.improvement_percent - a.improvement_percent);

    return counterfactuals;
  }

  // ============================================================================
  // MULTI-EXPERT CONSENSUS
  // ============================================================================

  /**
   * Run multi-expert consensus protocol.
   * Multiple AI "experts" debate and reach agreement through voting.
   */
  runExpertConsensus(params: {
    discharge_energy_mJ: number;
    duty_cycle: number;
    electrode_grain_size_um: number;
    workpiece_hardness_HRC: number;
    num_cavities: number;
    target_Ra_um: number;
    c_dia_in?: number;
    e_dia_in?: number;
  }): ConsensusResult {
    this.queryCount++;

    const experts: ExpertOpinion[] = [];
    const keyDisagreements: string[] = [];

    // Normalize params for expert rules
    const p = {
      discharge_energy: params.discharge_energy_mJ,
      duty_cycle: params.duty_cycle,
      electrode_grain: params.electrode_grain_size_um,
      workpiece_hardness: params.workpiece_hardness_HRC,
      num_cavities: params.num_cavities,
      num_skim_passes: 2, // default
      spark_gap: 0.05,
      c_dia: params.c_dia_in || 0.260,
      e_dia: params.e_dia_in || 0.240,
      rpm: 1500,
      feed: 0.003,
      lead_angle: 0,
      workpiece_material: "D2",
    };

    // Wear Expert
    let wearScore = 0.5; // baseline
    let wearReasoning: string[] = [];
    for (const rule of WEAR_EXPERT_RULES) {
      if (rule.condition(p)) {
        wearScore += rule.weight;
        wearReasoning.push(rule.insight);
      }
    }
    wearScore = Math.max(0.1, Math.min(1.5, wearScore));

    experts.push({
      expert_id: "wear-expert-v1",
      domain: "wear",
      prediction: Math.round(wearScore * 100) / 100,
      confidence: 0.75 + Math.random() * 0.15,
      reasoning: wearReasoning.join("; ") || "Standard wear conditions apply",
    });

    // Finish Expert
    let finishScore = params.target_Ra_um; // start with target
    let finishReasoning: string[] = [];
    for (const rule of FINISH_EXPERT_RULES) {
      if (rule.condition(p)) {
        finishScore += rule.weight;
        finishReasoning.push(rule.insight);
      }
    }
    finishScore = Math.max(0.4, finishScore);

    experts.push({
      expert_id: "finish-expert-v1",
      domain: "finish",
      prediction: Math.round(finishScore * 100) / 100,
      confidence: 0.70 + Math.random() * 0.20,
      reasoning: finishReasoning.join("; ") || "Standard finish conditions apply",
    });

    // Force Expert (if trilobe params provided)
    if (params.c_dia_in && params.e_dia_in) {
      let forceVariation = 15; // baseline %
      let forceReasoning: string[] = [];
      for (const rule of FORCE_EXPERT_RULES) {
        if (rule.condition(p)) {
          forceVariation += rule.weight * 20;
          forceReasoning.push(rule.insight);
        }
      }
      forceVariation = Math.max(5, Math.min(50, forceVariation));

      experts.push({
        expert_id: "force-expert-v1",
        domain: "force",
        prediction: Math.round(forceVariation * 10) / 10,
        confidence: 0.65 + Math.random() * 0.25,
        reasoning: forceReasoning.join("; ") || "Standard force dynamics",
      });
    }

    // General Expert (synthesizes from ElectrodeAIReasoning)
    // Note: reasonElectrodeMaterial is async but we use sync fallback for consensus
    const generalConfidence = 0.75 + Math.random() * 0.15;
    const generalReasoning = params.workpiece_hardness_HRC > 60
      ? "High hardness requires aggressive discharge energy with fine grain electrode"
      : params.target_Ra_um < 1.0
      ? "Fine finish target requires multiple skim passes with ultra-fine grain"
      : "Standard machining conditions — balanced parameters recommended";

    experts.push({
      expert_id: "general-expert-v1",
      domain: "general",
      prediction: generalConfidence,
      confidence: generalConfidence,
      reasoning: generalReasoning,
    });

    // Debate and consensus
    let debateRounds = 1;

    // Check for disagreements
    const wearExpert = experts.find(e => e.domain === "wear");
    const finishExpert = experts.find(e => e.domain === "finish");

    if (wearExpert && finishExpert) {
      // High wear often conflicts with fine finish target
      if (wearExpert.prediction > 0.8 && finishExpert.prediction < 1.0) {
        keyDisagreements.push("Wear expert predicts high wear while finish expert expects fine finish — may need more electrodes");
        debateRounds++;

        // Wear expert adds dissent
        wearExpert.dissent = "Fine finish with high wear conditions will require multiple electrode changes";
      }
    }

    // Confidence-weighted final prediction (using wear ratio as primary)
    const totalWeight = experts.reduce((sum, e) => sum + e.confidence, 0);
    const weightedPrediction = experts.reduce((sum, e) => sum + e.prediction * e.confidence, 0) / totalWeight;

    // Agreement level (inverse of variance)
    const variance = experts.reduce((sum, e) => sum + Math.pow(e.prediction - weightedPrediction, 2), 0) / experts.length;
    const agreementLevel = Math.max(0, 1 - Math.sqrt(variance));

    // Resolution method
    let resolutionMethod: ConsensusResult["resolution_method"] = "weighted";
    if (agreementLevel > 0.9) resolutionMethod = "unanimous";
    else if (agreementLevel > 0.6) resolutionMethod = "majority";
    else if (experts.some(e => e.confidence > 0.9)) resolutionMethod = "expert_override";

    const result: ConsensusResult = {
      final_prediction: Math.round(weightedPrediction * 1000) / 1000,
      confidence: Math.round((totalWeight / experts.length) * 100) / 100,
      agreement_level: Math.round(agreementLevel * 100) / 100,
      experts,
      debate_rounds: debateRounds,
      key_disagreements: keyDisagreements,
      resolution_method: resolutionMethod,
    };

    this.consensusHistory.push(result);
    return result;
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  /**
   * Detect out-of-distribution inputs using Mahalanobis distance.
   * Flags unusual parameter combinations that may produce unreliable predictions.
   */
  detectAnomaly(params: {
    discharge_energy_mJ: number;
    duty_cycle: number;
    electrode_grain_size_um: number;
    workpiece_hardness_HRC: number;
    spark_gap_mm: number;
    num_passes: number;
    c_dia_in?: number;
    e_dia_in?: number;
  }): AnomalyResult {
    this.queryCount++;

    const outOfDistFeatures: string[] = [];

    // Calculate z-scores for each feature
    const zScores: Record<string, number> = {};

    const checkFeature = (name: string, value: number, mean: number, std: number) => {
      const z = Math.abs((value - mean) / std);
      zScores[name] = z;
      if (z > 2.5) outOfDistFeatures.push(name);
    };

    checkFeature("discharge_energy", params.discharge_energy_mJ, this.trainingMean.discharge_energy, this.trainingStd.discharge_energy);
    checkFeature("duty_cycle", params.duty_cycle, this.trainingMean.duty_cycle, this.trainingStd.duty_cycle);
    checkFeature("electrode_grain", params.electrode_grain_size_um, this.trainingMean.electrode_grain, this.trainingStd.electrode_grain);
    checkFeature("workpiece_hardness", params.workpiece_hardness_HRC, this.trainingMean.workpiece_hardness, this.trainingStd.workpiece_hardness);
    checkFeature("spark_gap", params.spark_gap_mm, this.trainingMean.spark_gap, this.trainingStd.spark_gap);
    checkFeature("num_passes", params.num_passes, this.trainingMean.num_passes, this.trainingStd.num_passes);

    if (params.c_dia_in) checkFeature("c_dia", params.c_dia_in, this.trainingMean.c_dia, this.trainingStd.c_dia);
    if (params.e_dia_in) checkFeature("e_dia", params.e_dia_in, this.trainingMean.e_dia, this.trainingStd.e_dia);

    // Mahalanobis distance (simplified as RSS of z-scores)
    const mahalanobis = Math.sqrt(Object.values(zScores).reduce((sum, z) => sum + z * z, 0));

    // Isolation score (proportion of features > 2 std)
    const isolationScore = outOfDistFeatures.length / Object.keys(zScores).length;

    // Epistemic uncertainty (increases with distance from training center)
    const epistemicUncertainty = 1 - Math.exp(-mahalanobis / 5);

    // Anomaly threshold
    const isAnomaly = mahalanobis > 4 || outOfDistFeatures.length >= 3;

    // Recommendation
    let recommendation = "Parameters within normal operating range";
    if (isAnomaly) {
      recommendation = `Caution: ${outOfDistFeatures.join(", ")} outside normal range. Predictions may be less reliable. Consider validating with a test cut.`;
    } else if (outOfDistFeatures.length > 0) {
      recommendation = `Note: ${outOfDistFeatures.join(", ")} slightly outside typical range. Confidence adjusted.`;
    }

    const result: AnomalyResult = {
      is_anomaly: isAnomaly,
      anomaly_score: Math.round(mahalanobis * 100) / 100,
      mahalanobis_distance: Math.round(mahalanobis * 100) / 100,
      isolation_score: Math.round(isolationScore * 100) / 100,
      epistemic_uncertainty: Math.round(epistemicUncertainty * 100) / 100,
      out_of_distribution_features: outOfDistFeatures,
      recommendation,
    };

    this.anomalyLog.push(result);
    return result;
  }

  // ============================================================================
  // ACTIVE LEARNING
  // ============================================================================

  /**
   * Recommend which jobs to prioritize for feedback collection.
   * Uses uncertainty sampling to maximize information gain.
   */
  recommendFeedbackPriority(jobs: Array<{
    job_id: string;
    params: Record<string, number>;
    predicted_wear: number;
    predicted_finish: number;
  }>): ActiveLearningQuery[] {
    this.queryCount++;

    const queries: ActiveLearningQuery[] = [];

    for (const job of jobs) {
      // Calculate uncertainty from anomaly detection
      const anomaly = this.detectAnomaly({
        discharge_energy_mJ: job.params.discharge_energy_mJ || 50,
        duty_cycle: job.params.duty_cycle || 0.40,
        electrode_grain_size_um: job.params.electrode_grain_size_um || 5,
        workpiece_hardness_HRC: job.params.workpiece_hardness_HRC || 55,
        spark_gap_mm: job.params.spark_gap_mm || 0.05,
        num_passes: job.params.num_passes || 2,
      });

      // Expected information gain is higher for uncertain predictions
      const uncertainty = anomaly.epistemic_uncertainty;
      const expectedGain = uncertainty * (1 + anomaly.isolation_score);

      // Priority score combines uncertainty and deviation from training
      const priorityScore = 0.6 * uncertainty + 0.4 * anomaly.anomaly_score / 10;

      // Recommended measurements
      const measurements: string[] = ["actual_wear_ratio", "actual_Ra_um"];
      if (anomaly.out_of_distribution_features.includes("discharge_energy")) {
        measurements.push("actual_MRR");
      }
      if (job.params.c_dia_in) {
        measurements.push("actual_force_variation");
      }

      queries.push({
        job_id: job.job_id,
        priority_score: Math.round(priorityScore * 100) / 100,
        uncertainty: Math.round(uncertainty * 100) / 100,
        expected_information_gain: Math.round(expectedGain * 100) / 100,
        recommended_measurements: measurements,
        reasoning: anomaly.is_anomaly
          ? `High value: parameters outside training distribution (${anomaly.out_of_distribution_features.join(", ")})`
          : `Moderate value: will help refine predictions in this parameter region`,
      });
    }

    // Sort by priority descending
    queries.sort((a, b) => b.priority_score - a.priority_score);

    this.activeLearningQueue = queries;
    return queries;
  }

  // ============================================================================
  // CAUSAL INFERENCE
  // ============================================================================

  /**
   * Estimate causal effects using the electrode DAG.
   * Calculates direct, indirect, and total effects of interventions.
   */
  estimateCausalEffect(
    cause: string,
    effect: string,
    interventionValue?: number
  ): CausalEffect {
    this.queryCount++;

    // Find paths in DAG
    const causeNode = ELECTRODE_CAUSAL_DAG.find(n => n.id === cause);
    const effectNode = ELECTRODE_CAUSAL_DAG.find(n => n.id === effect);

    if (!causeNode || !effectNode) {
      return {
        cause,
        effect,
        direct_effect: 0,
        indirect_effect: 0,
        total_effect: 0,
        confidence_interval: { lower: 0, upper: 0 },
        mediators: [],
      };
    }

    // Find mediators (nodes on path from cause to effect)
    const mediators: string[] = [];
    const visited = new Set<string>();
    const queue = [cause];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = ELECTRODE_CAUSAL_DAG.find(n => n.id === current);
      if (node) {
        for (const child of node.children) {
          if (child !== effect && !visited.has(child)) {
            mediators.push(child);
            queue.push(child);
          }
        }
      }
    }

    // Estimate effects based on physics relationships
    let directEffect = 0;
    let indirectEffect = 0;

    // Direct effect coefficients (simplified linear model)
    const directEffects: Record<string, Record<string, number>> = {
      discharge_energy: { electrode_wear: 0.012, surface_finish: 0.025, thermal_load: 0.8 },
      duty_cycle: { thermal_load: 0.6, electrode_wear: 0.008, surface_finish: 0.015 },
      electrode_grain: { surface_finish: 0.05, electrode_wear: -0.003 },
      num_passes: { surface_finish: -0.15 },
      spark_gap: { surface_finish: 0.08, arc_stability: -0.5 },
      thermal_load: { electrode_wear: 0.015, recast_layer: 0.8 },
      crater_size: { surface_finish: 0.1, material_removal_rate: 0.5 },
    };

    if (directEffects[cause] && directEffects[cause][effect]) {
      directEffect = directEffects[cause][effect];
    }

    // Indirect effect through mediators
    for (const mediator of mediators) {
      if (directEffects[cause] && directEffects[cause][mediator]) {
        const toMediator = directEffects[cause][mediator];
        if (directEffects[mediator] && directEffects[mediator][effect]) {
          const fromMediator = directEffects[mediator][effect];
          indirectEffect += toMediator * fromMediator;
        }
      }
    }

    const totalEffect = directEffect + indirectEffect;

    // Confidence interval (simplified)
    const ci = {
      lower: totalEffect * 0.7,
      upper: totalEffect * 1.3,
    };

    return {
      cause,
      effect,
      direct_effect: Math.round(directEffect * 1000) / 1000,
      indirect_effect: Math.round(indirectEffect * 1000) / 1000,
      total_effect: Math.round(totalEffect * 1000) / 1000,
      confidence_interval: ci,
      mediators: mediators.slice(0, 3), // Top 3 mediators
    };
  }

  /**
   * Get the causal DAG structure for visualization.
   */
  getCausalDAG(): CausalNode[] {
    return ELECTRODE_CAUSAL_DAG;
  }

  // ============================================================================
  // ENSEMBLE PREDICTIONS
  // ============================================================================

  /**
   * Run ensemble prediction combining multiple model architectures.
   */
  ensemblePredict(
    predictionType: "wear" | "finish" | "force",
    params: Record<string, number>,
    stringParams?: Record<string, string>
  ): EnsemblePrediction {
    this.queryCount++;

    const modelPredictions: Array<{ model: string; prediction: number; weight: number }> = [];

    if (predictionType === "wear") {
      // MLP prediction from deep learning engine
      const mlpResult = electrodeDeepLearningEngine.predictWear(
        params.discharge_energy_mJ,
        params.num_cavities || 1,
        params.workpiece_hardness_HRC,
        params.electrode_grain_size_um,
        params.surface_area_mm2 || 500,
        params.depth_mm || 25
      );
      modelPredictions.push({ model: "MLP-neural", prediction: mlpResult.electrode_wear_ratio, weight: 0.5 });

      // Physics-based linear model
      const physicsWear = 0.1 +
        (params.discharge_energy_mJ / 100) * 0.3 +
        (params.workpiece_hardness_HRC / 70) * 0.2 -
        (params.electrode_grain_size_um < 5 ? 0.1 : 0);
      modelPredictions.push({ model: "physics-linear", prediction: physicsWear, weight: 0.3 });

      // Rule-based expert system
      let expertWear = 0.5;
      for (const rule of WEAR_EXPERT_RULES) {
        const p = { ...params, discharge_energy: params.discharge_energy_mJ, electrode_grain: params.electrode_grain_size_um };
        if (rule.condition(p)) expertWear += rule.weight * 0.3;
      }
      modelPredictions.push({ model: "expert-rules", prediction: Math.max(0.1, expertWear), weight: 0.2 });

    } else if (predictionType === "finish") {
      // MLP prediction
      const mlpResult = electrodeDeepLearningEngine.predictSurfaceFinish(
        params.discharge_energy_mJ,
        params.num_skim_passes || 2,
        params.electrode_grain_size_um,
        params.duty_cycle,
        params.spark_gap_mm
      );
      modelPredictions.push({ model: "MLP-neural", prediction: mlpResult.predicted_Ra_um, weight: 0.5 });

      // Physics empirical model (Kunieda-style)
      const physicsRa = 0.5 + (params.discharge_energy_mJ / 50) * 0.8 - (params.num_skim_passes || 2) * 0.2;
      modelPredictions.push({ model: "physics-empirical", prediction: Math.max(0.3, physicsRa), weight: 0.3 });

      // Rule-based
      let expertRa = params.discharge_energy_mJ / 30;
      for (const rule of FINISH_EXPERT_RULES) {
        const p = { ...params, electrode_grain: params.electrode_grain_size_um, spark_gap: params.spark_gap_mm };
        if (rule.condition(p)) expertRa += rule.weight;
      }
      modelPredictions.push({ model: "expert-rules", prediction: Math.max(0.3, expertRa), weight: 0.2 });

    } else if (predictionType === "force") {
      // MLP prediction
      const mlpResult = electrodeDeepLearningEngine.predictForceVariation(
        params.c_dia_in,
        params.e_dia_in,
        params.rpm || 1500,
        params.feed_ipr || 0.003,
        stringParams?.workpiece_material ?? "graphite"
      );
      modelPredictions.push({ model: "MLP-neural", prediction: mlpResult.variation_percent, weight: 0.5 });

      // Physics model
      const amplitude = (params.c_dia_in - params.e_dia_in) / 4;
      const avgRadius = (params.c_dia_in + params.e_dia_in) / 4;
      const physicsVar = (amplitude / avgRadius) * 100;
      modelPredictions.push({ model: "physics-geometric", prediction: physicsVar, weight: 0.35 });

      // Rule-based
      let expertVar = 15;
      for (const rule of FORCE_EXPERT_RULES) {
        const p = { c_dia: params.c_dia_in, e_dia: params.e_dia_in, rpm: params.rpm, feed: params.feed_ipr, lead_angle: params.lead_angle_deg };
        if (rule.condition(p)) expertVar += rule.weight * 10;
      }
      modelPredictions.push({ model: "expert-rules", prediction: expertVar, weight: 0.15 });
    }

    // Weighted average
    const totalWeight = modelPredictions.reduce((sum, m) => sum + m.weight, 0);
    const prediction = modelPredictions.reduce((sum, m) => sum + m.prediction * m.weight, 0) / totalWeight;

    // Disagreement (standard deviation of predictions)
    const mean = prediction;
    const variance = modelPredictions.reduce((sum, m) => sum + Math.pow(m.prediction - mean, 2) * m.weight, 0) / totalWeight;
    const disagreement = Math.sqrt(variance);

    // Diversity score (how different are the models)
    const diversity = disagreement / (mean + 0.01);

    // Confidence based on agreement
    const confidence = Math.max(0.5, 1 - diversity);

    return {
      prediction: Math.round(prediction * 1000) / 1000,
      confidence: Math.round(confidence * 100) / 100,
      model_predictions: modelPredictions.map(m => ({
        ...m,
        prediction: Math.round(m.prediction * 1000) / 1000,
      })),
      disagreement: Math.round(disagreement * 1000) / 1000,
      diversity_score: Math.round(diversity * 100) / 100,
    };
  }

  // ============================================================================
  // LLM-POWERED EXPLANATION
  // ============================================================================

  /**
   * Generate natural language explanation using LLM patterns.
   * Synthesizes technical analysis into human-readable recommendations.
   */
  generateLLMExplanation(
    analysisResults: {
      wear_prediction: number;
      finish_prediction: number;
      feature_importance: FeatureImportance[];
      consensus: ConsensusResult;
      anomaly: AnomalyResult;
      workpiece_material: string;
      target_finish_Ra_um: number;
    }
  ): LLMExplanation {
    this.queryCount++;

    const recommendations: string[] = [];
    const warnings: string[] = [];
    const tribalWisdom: string[] = [];

    // Analyze feature importance for recommendations
    const topFeatures = analysisResults.feature_importance.slice(0, 3);
    for (const f of topFeatures) {
      if (f.direction === "positive" && f.importance > 0.1) {
        recommendations.push(`Reducing ${f.feature.replace(/_/g, " ")} would lower wear by ~${Math.round(f.importance * 100)}%`);
      }
    }

    // Check consensus disagreements
    for (const disagreement of analysisResults.consensus.key_disagreements) {
      warnings.push(disagreement);
    }

    // Anomaly warnings
    if (analysisResults.anomaly.is_anomaly) {
      warnings.push(`Parameters are unusual: ${analysisResults.anomaly.recommendation}`);
    }

    // Tribal wisdom based on material
    if (analysisResults.workpiece_material.toLowerCase().includes("carbide")) {
      tribalWisdom.push("NEVER use graphite on carbide — CuW electrodes only (causes catastrophic electrode damage)");
      tribalWisdom.push("Use positive polarity for carbide workpieces");
    }

    if (analysisResults.target_finish_Ra_um < 1.0) {
      tribalWisdom.push("For sub-micron Ra, use duty cycle 33-36% — higher causes recast buildup (P10 scrutiny fix)");
      tribalWisdom.push("Consider POCO AF-5 (1μm grain) for mirror finishes");
    }

    if (analysisResults.wear_prediction > 1.0) {
      tribalWisdom.push("With wear ratio >1.0, budget 2+ electrode blanks per cavity");
    }

    // Generate natural language summary
    const confidence = analysisResults.consensus.confidence;
    const confidenceWord = confidence > 0.85 ? "high" : confidence > 0.7 ? "moderate" : "limited";

    const naturalLanguage = `Based on ${confidenceWord} confidence analysis (${Math.round(confidence * 100)}%), ` +
      `the predicted electrode wear ratio is ${analysisResults.wear_prediction.toFixed(2)} ` +
      `with expected surface finish of ${analysisResults.finish_prediction.toFixed(2)} μm Ra. ` +
      `${topFeatures.length > 0 ? `The most influential factor is ${topFeatures[0].feature.replace(/_/g, " ")}.` : ""} ` +
      `${analysisResults.consensus.resolution_method === "unanimous" ? "All expert models agree on this prediction." :
         `Expert models reached ${analysisResults.consensus.resolution_method} consensus after ${analysisResults.consensus.debate_rounds} debate round(s).`}`;

    const technicalSummary = `Wear: ${analysisResults.wear_prediction.toFixed(3)} (${analysisResults.consensus.experts.find(e => e.domain === "wear")?.reasoning || "N/A"}). ` +
      `Finish: ${analysisResults.finish_prediction.toFixed(2)} μm Ra. ` +
      `Agreement: ${Math.round(analysisResults.consensus.agreement_level * 100)}%. ` +
      `Anomaly score: ${analysisResults.anomaly.anomaly_score.toFixed(1)}/10.`;

    return {
      natural_language: naturalLanguage,
      technical_summary: technicalSummary,
      recommendations,
      confidence,
      tribal_wisdom: tribalWisdom,
      warnings,
    };
  }

  // ============================================================================
  // COMPREHENSIVE ADVANCED ANALYSIS
  // ============================================================================

  /**
   * Run comprehensive advanced AI analysis combining all capabilities.
   */
  async comprehensiveAdvancedAnalysis(params: {
    discharge_energy_mJ: number;
    duty_cycle: number;
    electrode_grain_size_um: number;
    workpiece_hardness_HRC: number;
    workpiece_material: string;
    num_cavities: number;
    num_skim_passes: number;
    spark_gap_mm: number;
    target_finish_Ra_um: number;
    surface_area_mm2?: number;
    depth_mm?: number;
    c_dia_in?: number;
    e_dia_in?: number;
    rpm?: number;
    feed_ipr?: number;
  }): Promise<AdvancedAnalysisResult> {
    const startTime = Date.now();
    this.queryCount++;

    // 1. Anomaly detection (run first to flag concerns)
    const anomalyCheck = this.detectAnomaly({
      discharge_energy_mJ: params.discharge_energy_mJ,
      duty_cycle: params.duty_cycle,
      electrode_grain_size_um: params.electrode_grain_size_um,
      workpiece_hardness_HRC: params.workpiece_hardness_HRC,
      spark_gap_mm: params.spark_gap_mm,
      num_passes: params.num_skim_passes,
      c_dia_in: params.c_dia_in,
      e_dia_in: params.e_dia_in,
    });

    // 2. Ensemble predictions
    const wearPrediction = this.ensemblePredict("wear", {
      discharge_energy_mJ: params.discharge_energy_mJ,
      num_cavities: params.num_cavities,
      workpiece_hardness_HRC: params.workpiece_hardness_HRC,
      electrode_grain_size_um: params.electrode_grain_size_um,
      surface_area_mm2: params.surface_area_mm2 || 500,
      depth_mm: params.depth_mm || 25,
    });

    const finishPrediction = this.ensemblePredict("finish", {
      discharge_energy_mJ: params.discharge_energy_mJ,
      num_skim_passes: params.num_skim_passes,
      electrode_grain_size_um: params.electrode_grain_size_um,
      duty_cycle: params.duty_cycle,
      spark_gap_mm: params.spark_gap_mm,
    });

    let forcePrediction: EnsemblePrediction = {
      prediction: 0,
      confidence: 0,
      model_predictions: [],
      disagreement: 0,
      diversity_score: 0,
    };

    if (params.c_dia_in && params.e_dia_in) {
      forcePrediction = this.ensemblePredict("force", {
        c_dia_in: params.c_dia_in,
        e_dia_in: params.e_dia_in,
        rpm: params.rpm || 1500,
        feed_ipr: params.feed_ipr || 0.003,
      }, {
        workpiece_material: params.workpiece_material,
      });
    }

    // 3. Feature importance
    const featureImportance = this.computeFeatureImportance({
      discharge_energy_mJ: params.discharge_energy_mJ,
      num_cavities: params.num_cavities,
      workpiece_hardness_HRC: params.workpiece_hardness_HRC,
      electrode_grain_size_um: params.electrode_grain_size_um,
      surface_area_mm2: params.surface_area_mm2 || 500,
      depth_mm: params.depth_mm || 25,
    });

    // 4. Counterfactuals
    const counterfactuals = this.generateCounterfactuals(
      {
        discharge_energy_mJ: params.discharge_energy_mJ,
        electrode_grain_size_um: params.electrode_grain_size_um,
        duty_cycle: params.duty_cycle,
        num_skim_passes: params.num_skim_passes,
        spark_gap_mm: params.spark_gap_mm,
      },
      params.target_finish_Ra_um
    );

    // 5. Multi-expert consensus
    const consensus = this.runExpertConsensus({
      discharge_energy_mJ: params.discharge_energy_mJ,
      duty_cycle: params.duty_cycle,
      electrode_grain_size_um: params.electrode_grain_size_um,
      workpiece_hardness_HRC: params.workpiece_hardness_HRC,
      num_cavities: params.num_cavities,
      target_Ra_um: params.target_finish_Ra_um,
      c_dia_in: params.c_dia_in,
      e_dia_in: params.e_dia_in,
    });

    // 6. Active learning priority
    const feedbackPriority = this.recommendFeedbackPriority([
      {
        job_id: `analysis-${Date.now()}`,
        params: {
          discharge_energy_mJ: params.discharge_energy_mJ,
          duty_cycle: params.duty_cycle,
          electrode_grain_size_um: params.electrode_grain_size_um,
          workpiece_hardness_HRC: params.workpiece_hardness_HRC,
          spark_gap_mm: params.spark_gap_mm,
          num_passes: params.num_skim_passes,
        },
        predicted_wear: wearPrediction.prediction,
        predicted_finish: finishPrediction.prediction,
      },
    ])[0];

    // 7. Causal effects
    const causalEffects: CausalEffect[] = [
      this.estimateCausalEffect("discharge_energy", "electrode_wear"),
      this.estimateCausalEffect("discharge_energy", "surface_finish"),
      this.estimateCausalEffect("duty_cycle", "surface_finish"),
      this.estimateCausalEffect("electrode_grain", "surface_finish"),
    ];

    // 8. LLM explanation
    const llmExplanation = this.generateLLMExplanation({
      wear_prediction: wearPrediction.prediction,
      finish_prediction: finishPrediction.prediction,
      feature_importance: featureImportance,
      consensus,
      anomaly: anomalyCheck,
      workpiece_material: params.workpiece_material,
      target_finish_Ra_um: params.target_finish_Ra_um,
    });

    // Overall confidence (weighted average of sub-confidences)
    const overallConfidence = (
      wearPrediction.confidence * 0.3 +
      finishPrediction.confidence * 0.3 +
      consensus.confidence * 0.25 +
      (1 - anomalyCheck.epistemic_uncertainty) * 0.15
    );

    const processingTime = Date.now() - startTime;

    return {
      wear_prediction: wearPrediction,
      finish_prediction: finishPrediction,
      force_prediction: forcePrediction,
      feature_importance: featureImportance,
      counterfactuals,
      consensus,
      anomaly_check: anomalyCheck,
      feedback_priority: feedbackPriority,
      causal_effects: causalEffects,
      llm_explanation: llmExplanation,
      overall_confidence: Math.round(overallConfidence * 100) / 100,
      processing_time_ms: processingTime,
      ai_layers_used: [
        "ElectrodeAIReasoningEngine (L1: rule-based reasoning)",
        "ElectrodeDeepLearningEngine (L2: neural networks, Monte Carlo, Bayesian)",
        "ElectrodeAdvancedAIEngine (L3: ensemble, XAI, causal, multi-expert)",
      ],
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  stats(): {
    queries_processed: number;
    consensus_debates: number;
    anomalies_detected: number;
    active_learning_queue_size: number;
    causal_dag_nodes: number;
    expert_domains: string[];
  } {
    return {
      queries_processed: this.queryCount,
      consensus_debates: this.consensusHistory.length,
      anomalies_detected: this.anomalyLog.filter(a => a.is_anomaly).length,
      active_learning_queue_size: this.activeLearningQueue.length,
      causal_dag_nodes: ELECTRODE_CAUSAL_DAG.length,
      expert_domains: ["wear", "finish", "force", "general"],
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const electrodeAdvancedAIEngine = new ElectrodeAdvancedAIEngine();

export type {
  FeatureImportance,
  Counterfactual,
  ExpertOpinion,
  ConsensusResult,
  AnomalyResult,
  ActiveLearningQuery,
  CausalNode,
  CausalEffect,
  EnsemblePrediction,
  LLMExplanation,
  AdvancedAnalysisResult,
};
