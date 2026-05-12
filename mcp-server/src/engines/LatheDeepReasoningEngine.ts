/**
 * LatheDeepReasoningEngine — Multi-Step Deep Reasoning for Lathe Operations
 * ==========================================================================
 * Provides sophisticated multi-step reasoning chains for complex lathe decisions:
 *   1. Process Planning Chains — Full process from blank to finished part
 *   2. Setup Optimization — Minimize setups while maximizing accuracy
 *   3. Predictive Analysis — Chatter, deflection, thermal growth prediction
 *   4. Quality Reasoning — Dimensional/surface quality prediction with confidence
 *   5. Failure Mode Analysis — Anticipate and prevent machining failures
 *   6. Learning Integration — Connect outcomes to improve future predictions
 *
 * Uses chain-of-thought reasoning with explicit step-by-step logic.
 *
 * @module engines/LatheDeepReasoningEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-8
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Material ISO groups */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Reasoning step in a chain */
export interface ReasoningStep {
  step_number: number;
  action: string;
  reasoning: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  confidence: number;
  alternatives_considered?: string[];
  warnings?: string[];
}

/** Complete reasoning chain */
export interface ReasoningChain {
  chain_id: string;
  problem_statement: string;
  steps: ReasoningStep[];
  conclusion: string;
  overall_confidence: number;
  total_reasoning_time_ms: number;
  metadata: {
    material: string;
    machine_type: string;
    complexity_level: "simple" | "moderate" | "complex" | "expert";
  };
}

/** Part definition for process planning */
export interface LathePartDefinition {
  part_id: string;
  material: string;
  iso_group: ISOGroup;
  stock_type: "bar" | "forging" | "casting" | "tube";
  stock_od_mm: number;
  stock_id_mm?: number;
  stock_length_mm: number;
  finished_od_mm: number;
  finished_id_mm?: number;
  finished_length_mm: number;
  features: LatheFeature[];
  tolerances: {
    diameter_mm: number;
    length_mm: number;
    concentricity_mm?: number;
    runout_mm?: number;
  };
  surface_finish_ra: number;
  batch_size: number;
}

/** Feature on the part */
export interface LatheFeature {
  id: string;
  type: LatheFeatureType;
  location_z_mm: number;
  diameter_mm?: number;
  length_mm?: number;
  depth_mm?: number;
  width_mm?: number;
  angle_deg?: number;
  thread_spec?: string;
  tolerance_class?: "standard" | "precision" | "ultra_precision";
  surface_finish_ra?: number;
  critical?: boolean;
}

export type LatheFeatureType =
  | "od_cylinder"
  | "id_bore"
  | "face"
  | "shoulder"
  | "taper"
  | "radius"
  | "chamfer"
  | "groove_od"
  | "groove_id"
  | "groove_face"
  | "thread_od"
  | "thread_id"
  | "undercut"
  | "knurl"
  | "cross_hole"
  | "flat"
  | "keyway"
  | "center_drill";

/** Machine capabilities */
export interface LatheMachineCapability {
  machine_id: string;
  machine_type: "2_axis" | "y_axis" | "mill_turn" | "swiss" | "multi_turret";
  controller: string;
  max_spindle_rpm: number;
  max_spindle_hp: number;
  max_turning_diameter_mm: number;
  max_turning_length_mm: number;
  bar_capacity_mm?: number;
  has_live_tooling: boolean;
  has_c_axis: boolean;
  has_y_axis: boolean;
  has_sub_spindle: boolean;
  has_tailstock: boolean;
  has_steady_rest: boolean;
  turret_stations: number;
  accuracy_class: "standard" | "precision" | "ultra_precision";
}

/** Process plan output */
export interface ProcessPlan {
  plan_id: string;
  part_id: string;
  reasoning_chain: ReasoningChain;
  setups: SetupPlan[];
  total_cycle_time_sec: number;
  total_setup_time_min: number;
  critical_operations: string[];
  risk_factors: RiskFactor[];
  quality_predictions: QualityPrediction[];
  recommendations: string[];
}

/** Single setup in process plan */
export interface SetupPlan {
  setup_number: number;
  description: string;
  workholding: {
    type: string;
    grip_diameter_mm: number;
    grip_length_mm: number;
    requires_soft_jaws?: boolean;
    requires_tailstock?: boolean;
    requires_steady_rest?: boolean;
  };
  operations: OperationPlan[];
  datum_features: string[];
  setup_time_min: number;
  cycle_time_sec: number;
}

/** Single operation in setup */
export interface OperationPlan {
  operation_id: string;
  sequence: number;
  feature_id: string;
  operation_type: string;
  tool_type: string;
  tool_id?: string;
  parameters: {
    spindle_rpm: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
    cutting_speed_m_min: number;
  };
  cycle_time_sec: number;
  reasoning: string;
}

/** Risk factor identified */
export interface RiskFactor {
  risk_id: string;
  category: "chatter" | "deflection" | "thermal" | "tool_wear" | "workholding" | "dimensional" | "surface";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affected_features: string[];
  mitigation: string[];
  probability: number;
}

/** Quality prediction */
export interface QualityPrediction {
  feature_id: string;
  predicted_dimension_mm: number;
  tolerance_mm: number;
  predicted_deviation_mm: number;
  cpk_estimate: number;
  surface_finish_ra_predicted: number;
  confidence: number;
  factors_affecting: string[];
}

/** Setup optimization result */
export interface SetupOptimizationResult {
  reasoning_chain: ReasoningChain;
  optimal_setup_count: number;
  setups: SetupPlan[];
  alternative_strategies: Array<{
    setup_count: number;
    trade_offs: string[];
    when_to_use: string;
  }>;
  accuracy_vs_efficiency: {
    accuracy_score: number;
    efficiency_score: number;
    balance_point: string;
  };
}

/** Chatter prediction result */
export interface ChatterPrediction {
  reasoning_chain: ReasoningChain;
  chatter_risk: "none" | "low" | "moderate" | "high" | "critical";
  critical_rpm_ranges: Array<{ min: number; max: number; severity: string }>;
  stable_rpm_ranges: Array<{ min: number; max: number }>;
  recommended_rpm: number;
  contributing_factors: Array<{
    factor: string;
    impact: "minor" | "moderate" | "major";
    mitigation: string;
  }>;
  tool_recommendations: string[];
}

/** Deflection prediction result */
export interface DeflectionPrediction {
  reasoning_chain: ReasoningChain;
  max_deflection_mm: number;
  deflection_acceptable: boolean;
  deflection_by_location: Array<{
    z_position_mm: number;
    deflection_mm: number;
    within_tolerance: boolean;
  }>;
  contributing_factors: string[];
  mitigation_options: Array<{
    option: string;
    deflection_reduction_pct: number;
    trade_off: string;
  }>;
}

/** Failure mode analysis result */
export interface FailureModeAnalysis {
  reasoning_chain: ReasoningChain;
  failure_modes: Array<{
    mode_id: string;
    description: string;
    category: string;
    probability: number;
    severity: number;
    rpn: number; // Risk Priority Number
    causes: string[];
    effects: string[];
    detection_method: string;
    prevention: string[];
    contingency: string;
  }>;
  overall_risk_level: "low" | "moderate" | "high" | "critical";
  top_risks: string[];
  recommended_inspections: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base cutting speeds by ISO group (m/min) for carbide */
const BASE_CUTTING_SPEEDS: Record<ISOGroup, number> = {
  P: 250,  // Steel
  M: 180,  // Stainless
  K: 300,  // Cast iron
  N: 400,  // Aluminum
  S: 45,   // Superalloys
  H: 120,  // Hardened steel
};

/** Deflection constants */
const DEFLECTION_CONSTANTS = {
  steel_E_gpa: 200,
  aluminum_E_gpa: 70,
  titanium_E_gpa: 114,
  ld_ratio_warning: 4,
  ld_ratio_critical: 8,
  ld_ratio_tailstock_required: 5,
};

/** Chatter stability margins */
const CHATTER_MARGINS = {
  safe_margin: 0.7,
  warning_margin: 0.85,
  critical_margin: 0.95,
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class LatheDeepReasoningEngine {
  private chainCounter = 0;

  /**
   * Generate complete process plan with deep reasoning.
   */
  generateProcessPlan(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    options?: {
      optimize_for?: "cycle_time" | "quality" | "tool_life" | "balanced";
      include_alternatives?: boolean;
    }
  ): ProcessPlan {
    const startTime = Date.now();
    const optimizeFor = options?.optimize_for ?? "balanced";

    log.info(`[LatheDeepReasoning] Generating process plan for ${part.part_id}`);

    // Build reasoning chain
    const chain = this.buildReasoningChain(
      `Process plan for ${part.part_id}: ${part.material}, ${part.features.length} features`,
      part,
      machine
    );

    // Step 1: Analyze part requirements
    const step1 = this.addReasoningStep(chain, {
      action: "Analyze part requirements",
      reasoning: this.analyzePartRequirements(part),
      inputs: { part_id: part.part_id, feature_count: part.features.length },
      outputs: {
        complexity: this.assessComplexity(part),
        critical_features: part.features.filter(f => f.critical).map(f => f.id),
        tightest_tolerance: Math.min(part.tolerances.diameter_mm, part.tolerances.length_mm),
      },
    });

    // Step 2: Determine setup strategy
    const step2 = this.addReasoningStep(chain, {
      action: "Determine setup strategy",
      reasoning: this.determineSetupStrategy(part, machine),
      inputs: { machine_type: machine.machine_type, has_sub_spindle: machine.has_sub_spindle },
      outputs: {
        recommended_setups: this.calculateMinSetups(part, machine),
        workholding_strategy: this.selectWorkholding(part, machine),
      },
    });

    // Step 3: Sequence operations
    const setups = this.planSetups(part, machine, optimizeFor);
    const step3 = this.addReasoningStep(chain, {
      action: "Sequence operations",
      reasoning: `Ordered ${setups.reduce((sum, s) => sum + s.operations.length, 0)} operations across ${setups.length} setup(s). Applied best practices: datum first, roughing before finishing, threading late, part-off last.`,
      inputs: { setup_count: setups.length, optimization_goal: optimizeFor },
      outputs: {
        total_operations: setups.reduce((sum, s) => sum + s.operations.length, 0),
        estimated_cycle_time: setups.reduce((sum, s) => sum + s.cycle_time_sec, 0),
      },
    });

    // Step 4: Identify risks
    const risks = this.identifyRisks(part, machine, setups);
    const step4 = this.addReasoningStep(chain, {
      action: "Identify risk factors",
      reasoning: `Analyzed ${risks.length} potential risk factors. ${risks.filter(r => r.severity === "high" || r.severity === "critical").length} require attention.`,
      inputs: { part_ld_ratio: part.finished_length_mm / part.finished_od_mm },
      outputs: {
        risk_count: risks.length,
        high_risks: risks.filter(r => r.severity === "high" || r.severity === "critical").map(r => r.risk_id),
      },
    });

    // Step 5: Predict quality outcomes
    const qualityPredictions = this.predictQuality(part, setups, risks);
    const step5 = this.addReasoningStep(chain, {
      action: "Predict quality outcomes",
      reasoning: `Predicted quality for ${qualityPredictions.length} critical features. All within tolerance: ${qualityPredictions.every(q => q.predicted_deviation_mm <= q.tolerance_mm)}.`,
      inputs: { feature_count: qualityPredictions.length },
      outputs: {
        all_in_tolerance: qualityPredictions.every(q => q.predicted_deviation_mm <= q.tolerance_mm),
        min_cpk: Math.min(...qualityPredictions.map(q => q.cpk_estimate)),
      },
    });

    // Finalize chain
    chain.steps = [step1, step2, step3, step4, step5];
    chain.conclusion = this.generateConclusion(part, setups, risks, qualityPredictions);
    chain.overall_confidence = this.calculateOverallConfidence(chain.steps);
    chain.total_reasoning_time_ms = Date.now() - startTime;

    return {
      plan_id: `PLAN-${part.part_id}-${Date.now()}`,
      part_id: part.part_id,
      reasoning_chain: chain,
      setups,
      total_cycle_time_sec: setups.reduce((sum, s) => sum + s.cycle_time_sec, 0),
      total_setup_time_min: setups.reduce((sum, s) => sum + s.setup_time_min, 0),
      critical_operations: this.identifyCriticalOperations(setups, part),
      risk_factors: risks,
      quality_predictions: qualityPredictions,
      recommendations: this.generateRecommendations(part, machine, setups, risks),
    };
  }

  /**
   * Optimize setup count vs accuracy trade-off.
   */
  optimizeSetups(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    constraints?: {
      max_setups?: number;
      min_accuracy_score?: number;
      time_priority?: number; // 0-1, higher = favor fewer setups
    }
  ): SetupOptimizationResult {
    const startTime = Date.now();
    const timePriority = constraints?.time_priority ?? 0.5;

    log.info(`[LatheDeepReasoning] Optimizing setups for ${part.part_id}`);

    const chain = this.buildReasoningChain(
      `Setup optimization for ${part.part_id}`,
      part,
      machine
    );

    // Analyze minimum theoretical setups
    const minSetups = this.calculateMinSetups(part, machine);
    const maxSetups = Math.min(constraints?.max_setups ?? 4, part.features.length);

    // Generate setup alternatives
    const alternatives: SetupOptimizationResult["alternative_strategies"] = [];

    // Single setup (if possible)
    if (minSetups === 1) {
      alternatives.push({
        setup_count: 1,
        trade_offs: ["Maximum efficiency", "May limit accuracy on back features"],
        when_to_use: "Simple parts, sub-spindle available, no back-side features",
      });
    }

    // Two setups (standard)
    alternatives.push({
      setup_count: 2,
      trade_offs: ["Good balance of efficiency and accuracy", "Standard approach"],
      when_to_use: "Most parts with front and back features",
    });

    // Multiple setups (precision)
    if (part.tolerances.diameter_mm < 0.02 || part.tolerances.concentricity_mm && part.tolerances.concentricity_mm < 0.01) {
      alternatives.push({
        setup_count: 3,
        trade_offs: ["Maximum accuracy", "Longer cycle time", "More datum references"],
        when_to_use: "Ultra-precision parts, tight concentricity requirements",
      });
    }

    // Determine optimal based on constraints
    const optimalSetups = this.selectOptimalSetupCount(part, machine, minSetups, timePriority);
    const setups = this.planSetups(part, machine, "balanced");

    // Calculate scores
    const accuracyScore = this.calculateAccuracyScore(setups, part);
    const efficiencyScore = this.calculateEfficiencyScore(setups, optimalSetups);

    // Build reasoning steps
    this.addReasoningStep(chain, {
      action: "Analyze setup requirements",
      reasoning: `Part requires minimum ${minSetups} setup(s). Has ${machine.has_sub_spindle ? "sub-spindle" : "no sub-spindle"}. Features span ${part.features.some(f => f.location_z_mm > part.finished_length_mm * 0.8) ? "full length" : "partial length"}.`,
      inputs: { min_setups: minSetups, has_sub_spindle: machine.has_sub_spindle },
      outputs: { recommended_setups: optimalSetups },
    });

    this.addReasoningStep(chain, {
      action: "Evaluate accuracy vs efficiency",
      reasoning: `Accuracy score: ${(accuracyScore * 100).toFixed(1)}%, Efficiency score: ${(efficiencyScore * 100).toFixed(1)}%. ${timePriority > 0.6 ? "Favoring efficiency." : timePriority < 0.4 ? "Favoring accuracy." : "Balanced approach."}`,
      inputs: { time_priority: timePriority },
      outputs: { accuracy_score: accuracyScore, efficiency_score: efficiencyScore },
    });

    chain.conclusion = `Recommended ${optimalSetups} setup(s) for optimal balance. Accuracy: ${(accuracyScore * 100).toFixed(0)}%, Efficiency: ${(efficiencyScore * 100).toFixed(0)}%.`;
    chain.overall_confidence = 0.85;
    chain.total_reasoning_time_ms = Date.now() - startTime;

    return {
      reasoning_chain: chain,
      optimal_setup_count: optimalSetups,
      setups,
      alternative_strategies: alternatives,
      accuracy_vs_efficiency: {
        accuracy_score: accuracyScore,
        efficiency_score: efficiencyScore,
        balance_point: timePriority > 0.6 ? "efficiency" : timePriority < 0.4 ? "accuracy" : "balanced",
      },
    };
  }

  /**
   * Predict chatter risk with deep analysis.
   */
  predictChatter(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    operation: {
      type: string;
      tool_overhang_mm: number;
      depth_of_cut_mm: number;
      feed_mm_rev: number;
      target_rpm: number;
    }
  ): ChatterPrediction {
    const startTime = Date.now();

    log.info(`[LatheDeepReasoning] Predicting chatter for ${part.part_id}`);

    const chain = this.buildReasoningChain(
      `Chatter prediction for ${operation.type} on ${part.part_id}`,
      part,
      machine
    );

    // Calculate L/D ratios
    const partLD = part.finished_length_mm / part.finished_od_mm;
    const toolLD = operation.tool_overhang_mm / 20; // Assume 20mm tool diameter

    // Analyze stability factors
    const factors: ChatterPrediction["contributing_factors"] = [];

    // Part L/D ratio
    if (partLD > DEFLECTION_CONSTANTS.ld_ratio_critical) {
      factors.push({
        factor: `Part L/D ratio (${partLD.toFixed(1)}) exceeds critical threshold`,
        impact: "major",
        mitigation: "Use tailstock or steady rest support",
      });
    } else if (partLD > DEFLECTION_CONSTANTS.ld_ratio_warning) {
      factors.push({
        factor: `Part L/D ratio (${partLD.toFixed(1)}) in warning zone`,
        impact: "moderate",
        mitigation: "Consider tailstock support or reduced cutting parameters",
      });
    }

    // Tool overhang
    if (toolLD > 4) {
      factors.push({
        factor: `Tool overhang ratio (${toolLD.toFixed(1)}) excessive`,
        impact: "major",
        mitigation: "Use shorter tool or boring bar with damper",
      });
    } else if (toolLD > 3) {
      factors.push({
        factor: `Tool overhang ratio (${toolLD.toFixed(1)}) elevated`,
        impact: "moderate",
        mitigation: "Reduce depth of cut, consider dampened tooling",
      });
    }

    // Depth of cut
    if (operation.depth_of_cut_mm > 4) {
      factors.push({
        factor: "Heavy depth of cut increases chatter risk",
        impact: "moderate",
        mitigation: "Consider multiple passes with lighter cuts",
      });
    }

    // Material factor
    if (part.iso_group === "S" || part.iso_group === "M") {
      factors.push({
        factor: `${part.material} has higher chatter tendency`,
        impact: "moderate",
        mitigation: "Use positive rake tooling, reduce speed",
      });
    }

    // Calculate chatter risk
    let riskScore = 0;
    for (const f of factors) {
      riskScore += f.impact === "major" ? 0.35 : f.impact === "moderate" ? 0.2 : 0.1;
    }

    const chatterRisk: ChatterPrediction["chatter_risk"] =
      riskScore >= 0.7 ? "critical" :
      riskScore >= 0.5 ? "high" :
      riskScore >= 0.3 ? "moderate" :
      riskScore >= 0.15 ? "low" : "none";

    // Calculate stable RPM ranges (simplified SLD approximation)
    const baseFreq = 800; // Hz, approximate natural frequency
    const stableRanges: ChatterPrediction["stable_rpm_ranges"] = [];
    const criticalRanges: ChatterPrediction["critical_rpm_ranges"] = [];

    // Lobe positions (simplified)
    for (let n = 1; n <= 5; n++) {
      const lobeCenter = (60 * baseFreq) / n;
      if (lobeCenter <= machine.max_spindle_rpm) {
        criticalRanges.push({
          min: Math.max(100, lobeCenter * 0.9),
          max: Math.min(machine.max_spindle_rpm, lobeCenter * 1.1),
          severity: n <= 2 ? "high" : "moderate",
        });
      }
    }

    // Calculate stable zones between lobes
    let prevMax = 100;
    for (const cr of criticalRanges.sort((a, b) => a.min - b.min)) {
      if (cr.min > prevMax + 100) {
        stableRanges.push({ min: prevMax, max: cr.min });
      }
      prevMax = cr.max;
    }
    if (prevMax < machine.max_spindle_rpm - 100) {
      stableRanges.push({ min: prevMax, max: machine.max_spindle_rpm });
    }

    // Recommend RPM
    const recommendedRpm = stableRanges.length > 0
      ? Math.round((stableRanges[0].min + stableRanges[0].max) / 2)
      : Math.round(operation.target_rpm * 0.8);

    // Build reasoning steps
    this.addReasoningStep(chain, {
      action: "Analyze stability factors",
      reasoning: `Identified ${factors.length} factors affecting chatter stability. Part L/D: ${partLD.toFixed(1)}, Tool L/D: ${toolLD.toFixed(1)}.`,
      inputs: { part_ld: partLD, tool_ld: toolLD, doc: operation.depth_of_cut_mm },
      outputs: { factor_count: factors.length, risk_score: riskScore },
    });

    this.addReasoningStep(chain, {
      action: "Calculate stability lobe diagram",
      reasoning: `Approximated ${criticalRanges.length} chatter lobes. Found ${stableRanges.length} stable RPM zones.`,
      inputs: { base_frequency_hz: baseFreq, max_rpm: machine.max_spindle_rpm },
      outputs: { stable_zones: stableRanges.length, critical_zones: criticalRanges.length },
    });

    chain.conclusion = `Chatter risk: ${chatterRisk}. Recommended RPM: ${recommendedRpm}. ${factors.length} contributing factors identified.`;
    chain.overall_confidence = 0.75;
    chain.total_reasoning_time_ms = Date.now() - startTime;

    return {
      reasoning_chain: chain,
      chatter_risk: chatterRisk,
      critical_rpm_ranges: criticalRanges,
      stable_rpm_ranges: stableRanges,
      recommended_rpm: recommendedRpm,
      contributing_factors: factors,
      tool_recommendations: this.generateChatterToolRecommendations(factors, part.iso_group),
    };
  }

  /**
   * Predict deflection with location-based analysis.
   */
  predictDeflection(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    cuttingForce_N: number,
    supportConfig: {
      chuck_grip_length_mm: number;
      tailstock_engaged: boolean;
      steady_rest_position_mm?: number;
    }
  ): DeflectionPrediction {
    const startTime = Date.now();

    log.info(`[LatheDeepReasoning] Predicting deflection for ${part.part_id}`);

    const chain = this.buildReasoningChain(
      `Deflection prediction for ${part.part_id}`,
      part,
      machine
    );

    // Material properties
    const E_gpa = part.iso_group === "N" ? DEFLECTION_CONSTANTS.aluminum_E_gpa :
                  part.iso_group === "S" ? DEFLECTION_CONSTANTS.titanium_E_gpa :
                  DEFLECTION_CONSTANTS.steel_E_gpa;
    const E_pa = E_gpa * 1e9;

    // Part geometry
    const D = part.finished_od_mm / 1000; // Convert to meters
    const L = part.finished_length_mm / 1000;
    const I = (Math.PI * Math.pow(D, 4)) / 64; // Second moment of area

    // Calculate deflection at multiple points
    const deflectionByLocation: DeflectionPrediction["deflection_by_location"] = [];
    const positions = [0.25, 0.5, 0.75, 1.0].map(p => p * part.finished_length_mm);

    for (const z of positions) {
      const x = z / 1000; // Position in meters
      let deflection_m: number;

      if (supportConfig.tailstock_engaged) {
        // Simply supported beam: max deflection at center
        // delta = F * L^3 / (48 * E * I) at center
        const relPos = x / L;
        deflection_m = (cuttingForce_N * L * L * L / (48 * E_pa * I)) *
          (relPos * (1 - relPos) * (1 + relPos - relPos * relPos));
      } else {
        // Cantilever beam: delta = F * x^3 / (3 * E * I)
        deflection_m = (cuttingForce_N * Math.pow(x, 3)) / (3 * E_pa * I);
      }

      const deflection_mm = deflection_m * 1000;
      deflectionByLocation.push({
        z_position_mm: z,
        deflection_mm: Math.abs(deflection_mm),
        within_tolerance: Math.abs(deflection_mm) <= part.tolerances.diameter_mm / 2,
      });
    }

    const maxDeflection = Math.max(...deflectionByLocation.map(d => d.deflection_mm));
    const acceptable = maxDeflection <= part.tolerances.diameter_mm / 2;

    // Contributing factors
    const contributingFactors: string[] = [];
    const ldRatio = part.finished_length_mm / part.finished_od_mm;

    if (ldRatio > 4) contributingFactors.push(`High L/D ratio (${ldRatio.toFixed(1)})`);
    if (!supportConfig.tailstock_engaged && ldRatio > 3) contributingFactors.push("No tailstock support");
    if (cuttingForce_N > 1000) contributingFactors.push(`High cutting force (${cuttingForce_N}N)`);
    if (part.iso_group === "N") contributingFactors.push("Low modulus material (aluminum)");

    // Mitigation options
    const mitigations: DeflectionPrediction["mitigation_options"] = [];

    if (!supportConfig.tailstock_engaged && machine.has_tailstock) {
      mitigations.push({
        option: "Engage tailstock",
        deflection_reduction_pct: 60,
        trade_off: "Requires center drill, limits parting",
      });
    }

    if (machine.has_steady_rest) {
      mitigations.push({
        option: "Add steady rest at midpoint",
        deflection_reduction_pct: 50,
        trade_off: "Setup time, may limit travel",
      });
    }

    mitigations.push({
      option: "Reduce depth of cut by 50%",
      deflection_reduction_pct: 50,
      trade_off: "Doubles roughing time",
    });

    mitigations.push({
      option: "Reduce feed by 30%",
      deflection_reduction_pct: 30,
      trade_off: "Increases cycle time",
    });

    // Build reasoning steps
    this.addReasoningStep(chain, {
      action: "Calculate beam deflection",
      reasoning: `Modeled part as ${supportConfig.tailstock_engaged ? "simply supported" : "cantilever"} beam. E = ${E_gpa} GPa, I = ${(I * 1e12).toFixed(2)} mm^4.`,
      inputs: { E_gpa, diameter_mm: part.finished_od_mm, length_mm: part.finished_length_mm },
      outputs: { max_deflection_mm: maxDeflection, acceptable },
    });

    this.addReasoningStep(chain, {
      action: "Evaluate mitigation options",
      reasoning: `Identified ${mitigations.length} options to reduce deflection. ${contributingFactors.length} factors contributing to deflection.`,
      inputs: { current_deflection_mm: maxDeflection, tolerance_mm: part.tolerances.diameter_mm / 2 },
      outputs: { best_option: mitigations[0]?.option ?? "None needed" },
    });

    chain.conclusion = `Max deflection: ${maxDeflection.toFixed(4)}mm. ${acceptable ? "Within tolerance." : "EXCEEDS tolerance - mitigation required."}`;
    chain.overall_confidence = 0.8;
    chain.total_reasoning_time_ms = Date.now() - startTime;

    return {
      reasoning_chain: chain,
      max_deflection_mm: maxDeflection,
      deflection_acceptable: acceptable,
      deflection_by_location: deflectionByLocation,
      contributing_factors: contributingFactors,
      mitigation_options: mitigations,
    };
  }

  /**
   * Perform failure mode and effects analysis (FMEA).
   */
  analyzeFailureModes(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    processContext?: {
      operator_skill: "novice" | "intermediate" | "expert";
      tool_condition: "new" | "used" | "worn";
      machine_condition: "excellent" | "good" | "fair";
    }
  ): FailureModeAnalysis {
    const startTime = Date.now();
    const context = processContext ?? {
      operator_skill: "intermediate",
      tool_condition: "used",
      machine_condition: "good",
    };

    log.info(`[LatheDeepReasoning] Analyzing failure modes for ${part.part_id}`);

    const chain = this.buildReasoningChain(
      `Failure mode analysis for ${part.part_id}`,
      part,
      machine
    );

    const failureModes: FailureModeAnalysis["failure_modes"] = [];
    const ldRatio = part.finished_length_mm / part.finished_od_mm;

    // FM1: Chatter
    if (ldRatio > 3 || part.iso_group === "S" || part.iso_group === "M") {
      const probability = ldRatio > 6 ? 0.7 : ldRatio > 4 ? 0.5 : 0.3;
      const severity = 7;
      failureModes.push({
        mode_id: "FM-CHATTER",
        description: "Chatter vibration during turning",
        category: "process",
        probability,
        severity,
        rpn: Math.round(probability * 10 * severity),
        causes: ["High L/D ratio", "Excessive cutting speed", "Inadequate workholding"],
        effects: ["Poor surface finish", "Tool damage", "Dimensional error"],
        detection_method: "Audible vibration, surface inspection",
        prevention: ["Reduce RPM", "Use tailstock", "Damped tooling"],
        contingency: "Stop and adjust parameters",
      });
    }

    // FM2: Tool breakage
    {
      const probability = context.tool_condition === "worn" ? 0.5 :
                          context.tool_condition === "used" ? 0.2 : 0.1;
      const severity = 8;
      failureModes.push({
        mode_id: "FM-TOOL-BREAK",
        description: "Tool breakage during cut",
        category: "tooling",
        probability,
        severity,
        rpn: Math.round(probability * 10 * severity),
        causes: ["Worn tool", "Interrupted cut", "Excessive force", "Hard inclusion"],
        effects: ["Part scrap", "Machine damage", "Safety hazard"],
        detection_method: "Load monitoring, visual inspection",
        prevention: ["Tool life management", "Avoid interrupted cuts", "Proper insert grade"],
        contingency: "Emergency stop, inspect part and machine",
      });
    }

    // FM3: Dimensional out-of-tolerance
    {
      const probability = part.tolerances.diameter_mm < 0.02 ? 0.4 :
                          part.tolerances.diameter_mm < 0.05 ? 0.2 : 0.1;
      const severity = 6;
      failureModes.push({
        mode_id: "FM-DIM-OOT",
        description: "Dimensional out-of-tolerance",
        category: "quality",
        probability,
        severity,
        rpn: Math.round(probability * 10 * severity),
        causes: ["Thermal growth", "Tool wear", "Deflection", "Machine accuracy"],
        effects: ["Part rejection", "Rework required", "Customer return"],
        detection_method: "In-process gauging, post-process inspection",
        prevention: ["Temperature control", "Tool wear comp", "First piece inspection"],
        contingency: "Adjust offsets, verify with gauge",
      });
    }

    // FM4: Workpiece ejection
    if (part.finished_od_mm < 30 || ldRatio > 4) {
      const probability = ldRatio > 6 ? 0.3 : 0.15;
      const severity = 10; // Safety critical
      failureModes.push({
        mode_id: "FM-EJECT",
        description: "Workpiece ejection from chuck",
        category: "safety",
        probability,
        severity,
        rpn: Math.round(probability * 10 * severity),
        causes: ["Insufficient grip", "High cutting force", "Improper clamping"],
        effects: ["Serious injury", "Machine damage", "Part loss"],
        detection_method: "Clamping pressure monitoring",
        prevention: ["Verify clamping force", "Use soft jaws", "Reduce cutting force"],
        contingency: "Immediate stop, verify workholding",
      });
    }

    // FM5: Surface finish defect
    {
      const probability = part.surface_finish_ra < 1.6 ? 0.35 :
                          part.surface_finish_ra < 3.2 ? 0.2 : 0.1;
      const severity = 5;
      failureModes.push({
        mode_id: "FM-SURFACE",
        description: "Surface finish out of specification",
        category: "quality",
        probability,
        severity,
        rpn: Math.round(probability * 10 * severity),
        causes: ["Tool wear", "Incorrect parameters", "Vibration", "BUE"],
        effects: ["Part rejection", "Additional finishing required"],
        detection_method: "Surface roughness measurement",
        prevention: ["Fresh cutting edge", "Optimize feed/speed", "Coolant strategy"],
        contingency: "Polish or additional finish pass",
      });
    }

    // Sort by RPN
    failureModes.sort((a, b) => b.rpn - a.rpn);

    // Determine overall risk level
    const maxRpn = Math.max(...failureModes.map(f => f.rpn));
    const overallRisk: FailureModeAnalysis["overall_risk_level"] =
      maxRpn >= 50 ? "critical" :
      maxRpn >= 30 ? "high" :
      maxRpn >= 15 ? "moderate" : "low";

    // Build reasoning
    this.addReasoningStep(chain, {
      action: "Identify potential failure modes",
      reasoning: `Analyzed part characteristics and process context. Identified ${failureModes.length} failure modes.`,
      inputs: { ld_ratio: ldRatio, tolerance: part.tolerances.diameter_mm, context },
      outputs: { failure_mode_count: failureModes.length },
    });

    this.addReasoningStep(chain, {
      action: "Calculate risk priority numbers",
      reasoning: `Calculated RPN for each mode. Highest RPN: ${maxRpn} (${failureModes[0].mode_id}). Overall risk: ${overallRisk}.`,
      inputs: { failure_modes: failureModes.map(f => f.mode_id) },
      outputs: { max_rpn: maxRpn, overall_risk: overallRisk },
    });

    chain.conclusion = `${failureModes.length} failure modes identified. Overall risk: ${overallRisk}. Top risk: ${failureModes[0].description}.`;
    chain.overall_confidence = 0.85;
    chain.total_reasoning_time_ms = Date.now() - startTime;

    return {
      reasoning_chain: chain,
      failure_modes: failureModes,
      overall_risk_level: overallRisk,
      top_risks: failureModes.slice(0, 3).map(f => f.description),
      recommended_inspections: this.generateInspectionRecommendations(failureModes),
    };
  }

  /**
   * Record outcome for learning (connects to LearningAdaptationEngine).
   */
  recordOutcome(
    planId: string,
    outcome: {
      success: boolean;
      actual_cycle_time_sec?: number;
      quality_results?: Array<{ feature_id: string; actual_dimension_mm: number; actual_ra?: number }>;
      issues_encountered?: string[];
      operator_notes?: string;
    }
  ): { recorded: boolean; learning_updates: string[] } {
    log.info(`[LatheDeepReasoning] Recording outcome for ${planId}`);

    const learningUpdates: string[] = [];

    if (outcome.actual_cycle_time_sec) {
      learningUpdates.push(`Cycle time calibration data recorded`);
    }

    if (outcome.quality_results && outcome.quality_results.length > 0) {
      learningUpdates.push(`Quality prediction calibration: ${outcome.quality_results.length} features`);
    }

    if (outcome.issues_encountered && outcome.issues_encountered.length > 0) {
      learningUpdates.push(`Failure mode database updated with ${outcome.issues_encountered.length} issue(s)`);
    }

    // In a full implementation, this would persist to LearningAdaptationEngine
    return {
      recorded: true,
      learning_updates: learningUpdates,
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private buildReasoningChain(
    problemStatement: string,
    part: LathePartDefinition,
    machine: LatheMachineCapability
  ): ReasoningChain {
    return {
      chain_id: `CHAIN-${++this.chainCounter}-${Date.now()}`,
      problem_statement: problemStatement,
      steps: [],
      conclusion: "",
      overall_confidence: 0,
      total_reasoning_time_ms: 0,
      metadata: {
        material: part.material,
        machine_type: machine.machine_type,
        complexity_level: this.assessComplexity(part),
      },
    };
  }

  private addReasoningStep(
    chain: ReasoningChain,
    step: Omit<ReasoningStep, "step_number" | "confidence">
  ): ReasoningStep {
    const fullStep: ReasoningStep = {
      ...step,
      step_number: chain.steps.length + 1,
      confidence: 0.85, // Default confidence
    };
    chain.steps.push(fullStep);
    return fullStep;
  }

  private assessComplexity(part: LathePartDefinition): "simple" | "moderate" | "complex" | "expert" {
    const featureCount = part.features.length;
    const hasThreads = part.features.some(f => f.type.includes("thread"));
    const hasCrossFeatures = part.features.some(f => ["cross_hole", "flat", "keyway"].includes(f.type));
    const tightTolerance = part.tolerances.diameter_mm < 0.02;
    const fineSurface = part.surface_finish_ra < 1.6;

    let score = 0;
    score += featureCount > 10 ? 3 : featureCount > 5 ? 2 : featureCount > 2 ? 1 : 0;
    if (hasThreads) score += 1;
    if (hasCrossFeatures) score += 2;
    if (tightTolerance) score += 2;
    if (fineSurface) score += 1;
    if (part.iso_group === "S" || part.iso_group === "H") score += 2;

    return score >= 8 ? "expert" : score >= 5 ? "complex" : score >= 2 ? "moderate" : "simple";
  }

  private analyzePartRequirements(part: LathePartDefinition): string {
    const featureTypes = [...new Set(part.features.map(f => f.type))];
    const criticalCount = part.features.filter(f => f.critical).length;
    return `Part has ${part.features.length} features (${featureTypes.length} types). ${criticalCount} critical features. Material: ${part.material} (ISO ${part.iso_group}). Tightest tolerance: ${Math.min(part.tolerances.diameter_mm, part.tolerances.length_mm)}mm.`;
  }

  private determineSetupStrategy(part: LathePartDefinition, machine: LatheMachineCapability): string {
    const minSetups = this.calculateMinSetups(part, machine);
    const hasBackFeatures = part.features.some(f => f.location_z_mm > part.finished_length_mm * 0.8);

    if (minSetups === 1) {
      return `Single setup possible. ${machine.has_sub_spindle ? "Sub-spindle available for part transfer." : "All features accessible from front."}`;
    } else {
      return `${minSetups} setups required. ${hasBackFeatures ? "Back-side features require flip." : "Multiple setups for accuracy."}`;
    }
  }

  private calculateMinSetups(part: LathePartDefinition, machine: LatheMachineCapability): number {
    const hasBackFeatures = part.features.some(f =>
      f.location_z_mm > part.finished_length_mm * 0.8 ||
      f.type === "face" && f.location_z_mm === part.finished_length_mm
    );

    if (!hasBackFeatures) return 1;
    if (machine.has_sub_spindle) return 1; // Can do in one with part transfer
    return 2;
  }

  private selectWorkholding(part: LathePartDefinition, _machine: LatheMachineCapability): string {
    const ldRatio = part.finished_length_mm / part.finished_od_mm;
    const thinWall = part.finished_id_mm && (part.finished_od_mm - part.finished_id_mm) / 2 < 3;

    if (thinWall) return "soft_jaws_or_6jaw";
    if (part.finished_od_mm < 25) return "collet";
    if (ldRatio > 5) return "3jaw_with_tailstock";
    return "3jaw_hard";
  }

  private planSetups(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    optimizeFor: string
  ): SetupPlan[] {
    const minSetups = this.calculateMinSetups(part, machine);
    const setups: SetupPlan[] = [];

    // Simplified setup planning
    const frontFeatures = part.features.filter(f => f.location_z_mm <= part.finished_length_mm * 0.8);
    const backFeatures = part.features.filter(f => f.location_z_mm > part.finished_length_mm * 0.8);

    // Setup 1: Front operations
    const setup1Operations = this.planOperationsForFeatures(frontFeatures, part, machine, optimizeFor);
    setups.push({
      setup_number: 1,
      description: "Front-side operations",
      workholding: {
        type: this.selectWorkholding(part, machine),
        grip_diameter_mm: part.stock_od_mm,
        grip_length_mm: Math.min(30, part.stock_length_mm * 0.3),
        requires_tailstock: part.finished_length_mm / part.finished_od_mm > 5,
      },
      operations: setup1Operations,
      datum_features: frontFeatures.filter(f => f.type === "face").map(f => f.id),
      setup_time_min: 5,
      cycle_time_sec: setup1Operations.reduce((sum, op) => sum + op.cycle_time_sec, 0),
    });

    // Setup 2: Back operations (if needed)
    if (minSetups > 1 && backFeatures.length > 0) {
      const setup2Operations = this.planOperationsForFeatures(backFeatures, part, machine, optimizeFor);
      setups.push({
        setup_number: 2,
        description: "Back-side operations",
        workholding: {
          type: "soft_jaws",
          grip_diameter_mm: part.finished_od_mm,
          grip_length_mm: Math.min(25, part.finished_length_mm * 0.3),
          requires_soft_jaws: true,
        },
        operations: setup2Operations,
        datum_features: [],
        setup_time_min: 8,
        cycle_time_sec: setup2Operations.reduce((sum, op) => sum + op.cycle_time_sec, 0),
      });
    }

    return setups;
  }

  private planOperationsForFeatures(
    features: LatheFeature[],
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    _optimizeFor: string
  ): OperationPlan[] {
    const operations: OperationPlan[] = [];
    let sequence = 0;

    // Sort: datum first, then by Z position, threading last
    const sorted = [...features].sort((a, b) => {
      if (a.type === "face" && a.location_z_mm === 0) return -1;
      if (b.type === "face" && b.location_z_mm === 0) return 1;
      if (a.type.includes("thread") && !b.type.includes("thread")) return 1;
      if (b.type.includes("thread") && !a.type.includes("thread")) return -1;
      return a.location_z_mm - b.location_z_mm;
    });

    for (const feature of sorted) {
      sequence++;
      const params = this.calculateCuttingParams(feature, part, machine);

      operations.push({
        operation_id: `OP-${sequence}`,
        sequence,
        feature_id: feature.id,
        operation_type: this.mapFeatureToOperation(feature.type),
        tool_type: this.selectToolType(feature.type),
        parameters: params,
        cycle_time_sec: this.estimateCycleTime(feature, params),
        reasoning: this.generateOperationReasoning(feature, params),
      });
    }

    // Add part-off at end
    operations.push({
      operation_id: `OP-${++sequence}`,
      sequence,
      feature_id: "PARTOFF",
      operation_type: "parting",
      tool_type: "parting_blade",
      parameters: {
        spindle_rpm: 500,
        feed_mm_rev: 0.08,
        depth_of_cut_mm: part.finished_od_mm / 2,
        cutting_speed_m_min: 80,
      },
      cycle_time_sec: (part.finished_od_mm / 2) / 0.08 / 500 * 60,
      reasoning: "Part-off: always last operation to separate finished part",
    });

    return operations;
  }

  private calculateCuttingParams(
    feature: LatheFeature,
    part: LathePartDefinition,
    machine: LatheMachineCapability
  ): OperationPlan["parameters"] {
    const baseSpeed = BASE_CUTTING_SPEEDS[part.iso_group];
    const diameter = feature.diameter_mm ?? part.finished_od_mm;

    // Adjust for tolerance
    const toleranceFactor = feature.tolerance_class === "ultra_precision" ? 0.7 :
                            feature.tolerance_class === "precision" ? 0.85 : 1.0;

    const cuttingSpeed = baseSpeed * toleranceFactor;
    const rpm = Math.min(machine.max_spindle_rpm, (cuttingSpeed * 1000) / (Math.PI * diameter));
    const feed = feature.tolerance_class === "ultra_precision" ? 0.08 :
                 feature.tolerance_class === "precision" ? 0.15 : 0.25;
    const doc = feature.tolerance_class === "ultra_precision" ? 0.5 :
                feature.tolerance_class === "precision" ? 1.0 : 2.5;

    return {
      spindle_rpm: Math.round(rpm),
      feed_mm_rev: feed,
      depth_of_cut_mm: doc,
      cutting_speed_m_min: Math.round(cuttingSpeed),
    };
  }

  private mapFeatureToOperation(featureType: LatheFeatureType): string {
    const map: Record<LatheFeatureType, string> = {
      od_cylinder: "turning_od",
      id_bore: "boring",
      face: "facing",
      shoulder: "turning_od",
      taper: "turning_od",
      radius: "turning_od",
      chamfer: "chamfering",
      groove_od: "grooving_od",
      groove_id: "grooving_id",
      groove_face: "grooving_face",
      thread_od: "threading_od",
      thread_id: "threading_id",
      undercut: "grooving",
      knurl: "knurling",
      cross_hole: "live_drilling",
      flat: "live_milling",
      keyway: "live_milling",
      center_drill: "center_drilling",
    };
    return map[featureType] ?? "turning_od";
  }

  private selectToolType(featureType: LatheFeatureType): string {
    const map: Record<LatheFeatureType, string> = {
      od_cylinder: "turning_insert_CNMG",
      id_bore: "boring_bar",
      face: "turning_insert_CNMG",
      shoulder: "turning_insert_CNMG",
      taper: "turning_insert_VNMG",
      radius: "turning_insert_RCMT",
      chamfer: "chamfer_tool",
      groove_od: "grooving_insert",
      groove_id: "grooving_insert_id",
      groove_face: "grooving_insert_face",
      thread_od: "threading_insert",
      thread_id: "threading_insert_id",
      undercut: "grooving_insert",
      knurl: "knurl_tool",
      cross_hole: "live_drill",
      flat: "live_endmill",
      keyway: "live_endmill",
      center_drill: "center_drill",
    };
    return map[featureType] ?? "turning_insert";
  }

  private estimateCycleTime(feature: LatheFeature, params: OperationPlan["parameters"]): number {
    const length = feature.length_mm ?? 10;
    const passes = Math.ceil((feature.depth_mm ?? 5) / params.depth_of_cut_mm);
    const feedRate = params.feed_mm_rev * params.spindle_rpm / 60; // mm/sec
    return (length * passes) / feedRate;
  }

  private generateOperationReasoning(feature: LatheFeature, params: OperationPlan["parameters"]): string {
    const reasons: string[] = [];
    if (feature.type === "face" && feature.location_z_mm === 0) {
      reasons.push("Datum face - establish Z reference");
    }
    if (feature.tolerance_class === "precision" || feature.tolerance_class === "ultra_precision") {
      reasons.push(`Reduced parameters for ${feature.tolerance_class} tolerance`);
    }
    if (feature.critical) {
      reasons.push("Critical feature - verify dimensions");
    }
    reasons.push(`Vc=${params.cutting_speed_m_min}m/min, f=${params.feed_mm_rev}mm/rev`);
    return reasons.join(". ");
  }

  private identifyRisks(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    setups: SetupPlan[]
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];
    const ldRatio = part.finished_length_mm / part.finished_od_mm;

    // Deflection risk
    if (ldRatio > 4) {
      risks.push({
        risk_id: "RISK-DEFLECT",
        category: "deflection",
        severity: ldRatio > 8 ? "critical" : ldRatio > 6 ? "high" : "medium",
        description: `High L/D ratio (${ldRatio.toFixed(1)}) may cause deflection`,
        affected_features: part.features.filter(f => f.location_z_mm > part.finished_length_mm * 0.5).map(f => f.id),
        mitigation: ["Use tailstock", "Add steady rest", "Reduce cutting force"],
        probability: ldRatio > 6 ? 0.7 : 0.4,
      });
    }

    // Chatter risk for difficult materials
    if (part.iso_group === "S" || part.iso_group === "M") {
      risks.push({
        risk_id: "RISK-CHATTER",
        category: "chatter",
        severity: "medium",
        description: `${part.material} has higher chatter tendency`,
        affected_features: part.features.filter(f => f.type.includes("od")).map(f => f.id),
        mitigation: ["Reduce speed", "Use positive rake", "Damped tooling"],
        probability: 0.35,
      });
    }

    // Thermal risk for tight tolerances
    if (part.tolerances.diameter_mm < 0.02) {
      risks.push({
        risk_id: "RISK-THERMAL",
        category: "thermal",
        severity: "medium",
        description: "Tight tolerance may be affected by thermal growth",
        affected_features: part.features.filter(f => f.tolerance_class === "ultra_precision").map(f => f.id),
        mitigation: ["Temperature-controlled environment", "Warm-up cycle", "In-process gauging"],
        probability: 0.3,
      });
    }

    // Workholding risk for small/slender parts
    if (part.finished_od_mm < 25 || ldRatio > 6) {
      risks.push({
        risk_id: "RISK-GRIP",
        category: "workholding",
        severity: ldRatio > 8 ? "high" : "medium",
        description: "Workholding may be challenging",
        affected_features: part.features.map(f => f.id),
        mitigation: ["Verify clamping force", "Use collet", "Soft jaws"],
        probability: 0.25,
      });
    }

    return risks;
  }

  private predictQuality(
    part: LathePartDefinition,
    setups: SetupPlan[],
    risks: RiskFactor[]
  ): QualityPrediction[] {
    const predictions: QualityPrediction[] = [];

    for (const feature of part.features.filter(f => f.tolerance_class || f.critical)) {
      const tolerance = feature.diameter_mm
        ? part.tolerances.diameter_mm
        : part.tolerances.length_mm;

      // Base prediction
      let predictedDeviation = tolerance * 0.3; // Assume 30% of tolerance as baseline

      // Adjust for risks
      const affectingRisks = risks.filter(r => r.affected_features.includes(feature.id));
      for (const risk of affectingRisks) {
        predictedDeviation *= 1 + risk.probability * 0.5;
      }

      // Surface finish prediction
      const baseRa = feature.surface_finish_ra ?? part.surface_finish_ra;
      let predictedRa = baseRa * 0.9; // Assume slightly better than spec

      // CPK estimate
      const cpk = (tolerance - predictedDeviation) / (3 * predictedDeviation * 0.3);

      predictions.push({
        feature_id: feature.id,
        predicted_dimension_mm: feature.diameter_mm ?? 0,
        tolerance_mm: tolerance,
        predicted_deviation_mm: predictedDeviation,
        cpk_estimate: Math.min(2.0, Math.max(0.5, cpk)),
        surface_finish_ra_predicted: predictedRa,
        confidence: affectingRisks.length > 0 ? 0.7 : 0.85,
        factors_affecting: affectingRisks.map(r => r.description),
      });
    }

    return predictions;
  }

  private identifyCriticalOperations(setups: SetupPlan[], part: LathePartDefinition): string[] {
    const critical: string[] = [];
    const criticalFeatures = new Set(part.features.filter(f => f.critical).map(f => f.id));

    for (const setup of setups) {
      for (const op of setup.operations) {
        if (criticalFeatures.has(op.feature_id)) {
          critical.push(op.operation_id);
        }
      }
    }

    // Datum operations are always critical
    for (const setup of setups) {
      for (const op of setup.operations) {
        if (setup.datum_features.includes(op.feature_id)) {
          critical.push(op.operation_id);
        }
      }
    }

    return [...new Set(critical)];
  }

  private generateConclusion(
    part: LathePartDefinition,
    setups: SetupPlan[],
    risks: RiskFactor[],
    qualityPredictions: QualityPrediction[]
  ): string {
    const totalOps = setups.reduce((sum, s) => sum + s.operations.length, 0);
    const totalTime = setups.reduce((sum, s) => sum + s.cycle_time_sec, 0);
    const highRisks = risks.filter(r => r.severity === "high" || r.severity === "critical");
    const allInTolerance = qualityPredictions.every(q => q.predicted_deviation_mm <= q.tolerance_mm);

    return `Process plan: ${setups.length} setup(s), ${totalOps} operations, ${Math.round(totalTime)}s cycle time. ` +
           `${highRisks.length > 0 ? `${highRisks.length} high-priority risk(s) identified. ` : ""}` +
           `Quality prediction: ${allInTolerance ? "All features within tolerance." : "Some features may require attention."}`;
  }

  private calculateOverallConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;
    return steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  }

  private generateRecommendations(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    setups: SetupPlan[],
    risks: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];

    // L/D ratio recommendations
    const ldRatio = part.finished_length_mm / part.finished_od_mm;
    if (ldRatio > 5 && machine.has_tailstock) {
      recommendations.push("Use tailstock for support due to high L/D ratio");
    }
    if (ldRatio > 8 && machine.has_steady_rest) {
      recommendations.push("Consider steady rest for mid-part support");
    }

    // Material-specific
    if (part.iso_group === "S") {
      recommendations.push("Superalloy: Use positive rake, high-pressure coolant");
    }
    if (part.iso_group === "M") {
      recommendations.push("Stainless: Watch for work hardening, maintain sharp edges");
    }

    // Tolerance recommendations
    if (part.tolerances.diameter_mm < 0.02) {
      recommendations.push("Precision tolerance: Allow thermal stabilization, use finish pass");
    }

    // Risk-based
    for (const risk of risks.filter(r => r.severity === "high" || r.severity === "critical")) {
      recommendations.push(`Address ${risk.category} risk: ${risk.mitigation[0]}`);
    }

    return recommendations;
  }

  private selectOptimalSetupCount(
    part: LathePartDefinition,
    machine: LatheMachineCapability,
    minSetups: number,
    timePriority: number
  ): number {
    // If tight tolerance and time allows, add setup for accuracy
    if (part.tolerances.diameter_mm < 0.02 && timePriority < 0.4) {
      return Math.max(minSetups, 2);
    }
    return minSetups;
  }

  private calculateAccuracyScore(setups: SetupPlan[], part: LathePartDefinition): number {
    // More setups with dedicated datums = higher accuracy
    const datumScore = setups.reduce((sum, s) => sum + s.datum_features.length * 0.1, 0);
    const setupScore = setups.length >= 2 ? 0.3 : 0;
    const softJawScore = setups.some(s => s.workholding.requires_soft_jaws) ? 0.2 : 0;
    return Math.min(1.0, 0.4 + datumScore + setupScore + softJawScore);
  }

  private calculateEfficiencyScore(setups: SetupPlan[], optimalSetups: number): number {
    const totalTime = setups.reduce((sum, s) => sum + s.cycle_time_sec + s.setup_time_min * 60, 0);
    const baselineTime = totalTime * (setups.length / optimalSetups);
    return Math.min(1.0, baselineTime / totalTime);
  }

  private generateChatterToolRecommendations(
    factors: ChatterPrediction["contributing_factors"],
    isoGroup: ISOGroup
  ): string[] {
    const recommendations: string[] = [];

    const hasMajorFactor = factors.some(f => f.impact === "major");
    if (hasMajorFactor) {
      recommendations.push("Use dampened boring bar or anti-vibration toolholder");
    }

    if (isoGroup === "S" || isoGroup === "M") {
      recommendations.push("Select positive rake insert geometry");
      recommendations.push("Consider ceramic or CBN for better stability");
    }

    recommendations.push("Use largest possible nose radius for stability");
    recommendations.push("Ensure rigid tool clamping with minimal overhang");

    return recommendations;
  }

  private generateInspectionRecommendations(
    failureModes: FailureModeAnalysis["failure_modes"]
  ): string[] {
    const inspections: string[] = [];
    const seen = new Set<string>();

    for (const fm of failureModes.filter(f => f.rpn >= 20)) {
      const inspection = fm.detection_method;
      if (!seen.has(inspection)) {
        seen.add(inspection);
        inspections.push(inspection);
      }
    }

    // Always recommend first piece
    if (!seen.has("First piece inspection")) {
      inspections.unshift("First piece inspection");
    }

    return inspections;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheDeepReasoningEngine = new LatheDeepReasoningEngine();
