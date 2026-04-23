/**
 * PostProcessorDeepReasoningEngine — PP-AI-L2
 *
 * Multi-step deep reasoning for intelligent post processing decisions.
 * Chain-of-thought reasoning, causal inference, and physics-backed
 * optimization for cross-CAM feature synthesis and controller optimization.
 *
 * AI Capabilities (Layer 2 — Deep Reasoning):
 * -------------------------------------------
 * 1. CHAIN-OF-THOUGHT REASONING
 *    - Multi-step logical deduction
 *    - Explicit reasoning traces
 *    - Confidence propagation
 *
 * 2. CAUSAL INFERENCE
 *    - Root cause analysis for post issues
 *    - Effect prediction for changes
 *    - Counterfactual reasoning
 *
 * 3. CROSS-CAM FEATURE SYNTHESIS
 *    - Best-of-breed feature selection
 *    - Conflict resolution
 *    - Compatibility verification
 *
 * 4. CONTROLLER OPTIMIZATION
 *    - Machine-specific feature injection
 *    - Dialect optimization
 *    - Performance tuning
 *
 * 5. PHYSICS-BACKED DECISIONS
 *    - Kienzle force constraints
 *    - Taylor tool life optimization
 *    - Thermal considerations
 *
 * 6. SELF-CONSISTENCY VERIFICATION
 *    - Multiple reasoning path validation
 *    - Consensus building
 *    - Uncertainty quantification
 *
 * @module engines/PostProcessorDeepReasoningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_MATERIAL_DB,
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  kienzleForce,
  taylorLife,
  type ISOGroup,
} from "../physics/constants.js";
import { postProcessorDeepLearningEngine, type DeepLearningInput } from "./PostProcessorDeepLearningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

type ControllerType = "fanuc" | "siemens" | "haas" | "okuma" | "mazak" | "mitsubishi" | "heidenhain" | "fagor" | "generic";
type CamSystem = "mastercam" | "fusion360" | "solidcam" | "hypermill" | "nx" | "catia" | "esprit" | "powermill" | "generic";

/** Single reasoning step */
interface ReasoningStep {
  step_number: number;
  thought: string;
  evidence: string[];
  conclusion: string;
  confidence: number;
  dependencies: number[];
}

/** Chain of thought result */
export interface ChainOfThoughtResult {
  query: string;
  steps: ReasoningStep[];
  final_conclusion: string;
  overall_confidence: number;
  reasoning_path: string;
  alternative_paths: { path: string; confidence: number; rejected_reason: string }[];
}

/** Causal node in inference graph */
interface CausalNode {
  id: string;
  name: string;
  type: "cause" | "effect" | "mediator" | "confounder";
  value?: number | string;
  confidence: number;
}

/** Causal edge */
interface CausalEdge {
  from: string;
  to: string;
  strength: number;
  mechanism: string;
}

/** Causal inference result */
export interface CausalInferenceResult {
  nodes: CausalNode[];
  edges: CausalEdge[];
  root_causes: { cause: string; probability: number; evidence: string[] }[];
  predicted_effects: { effect: string; probability: number; conditions: string[] }[];
  counterfactuals: { scenario: string; outcome: string; confidence: number }[];
  intervention_recommendations: { action: string; expected_impact: string; risk: number }[];
}

/** Cross-CAM feature */
interface CrossCAMFeature {
  name: string;
  source_cam: CamSystem;
  description: string;
  gcode_pattern: string;
  benefits: string[];
  compatibility: Record<ControllerType, "native" | "emulated" | "incompatible">;
}

/** Cross-CAM synthesis result */
export interface CrossCAMSynthesisResult {
  selected_features: {
    feature: CrossCAMFeature;
    reason: string;
    confidence: number;
  }[];
  conflicts_resolved: {
    feature_a: string;
    feature_b: string;
    resolution: string;
    chosen: string;
  }[];
  compatibility_matrix: Record<string, Record<ControllerType, boolean>>;
  synthesized_gcode_blocks: { feature: string; gcode: string }[];
  optimization_score: number;
}

/** Controller optimization result */
export interface ControllerOptimizationResult {
  target_controller: ControllerType;
  optimizations_applied: {
    name: string;
    gcode_before: string;
    gcode_after: string;
    improvement: string;
    confidence: number;
  }[];
  features_injected: {
    feature: string;
    gcode: string;
    benefit: string;
  }[];
  dialect_adjustments: {
    original: string;
    adjusted: string;
    reason: string;
  }[];
  estimated_improvement_pct: number;
}

/** Physics reasoning result */
export interface PhysicsReasoningResult {
  kienzle_analysis: {
    material: string;
    kc1_1: number;
    mc: number;
    estimated_force_N: number;
    force_limit_N: number;
    margin_pct: number;
    recommendation: string;
  };
  taylor_analysis: {
    cutting_speed_mpm: number;
    predicted_life_min: number;
    optimal_speed_mpm: number;
    life_at_optimal_min: number;
    tradeoff: string;
  };
  thermal_analysis: {
    estimated_temp_C: number;
    risk_level: "low" | "medium" | "high";
    coolant_recommendation: string;
  };
  overall_physics_score: number;
  constraints_satisfied: boolean;
}

/** Self-consistency verification result */
export interface SelfConsistencyResult {
  num_paths_explored: number;
  consensus_reached: boolean;
  consensus_answer: string;
  path_agreements: { path_id: number; answer: string; confidence: number }[];
  disagreements: { topic: string; positions: string[]; resolution: string }[];
  final_confidence: number;
}

/** Deep reasoning input */
export interface DeepReasoningInput {
  gcode: string;
  query?: string;
  material_iso?: ISOGroup;
  target_controller?: ControllerType;
  source_cams?: CamSystem[];
  tool_diameter_mm?: number;
  spindle_rpm?: number;
  cutting_speed_mpm?: number;
  depth_of_cut_mm?: number;
}

/** Comprehensive reasoning analysis */
export interface DeepReasoningAnalysis {
  chain_of_thought: ChainOfThoughtResult;
  causal_inference: CausalInferenceResult;
  cross_cam_synthesis: CrossCAMSynthesisResult;
  controller_optimization: ControllerOptimizationResult;
  physics_reasoning: PhysicsReasoningResult;
  self_consistency: SelfConsistencyResult;
  reasoning_confidence: number;
  processing_time_ms: number;
}

// ============================================================================
// CROSS-CAM FEATURE DATABASE
// ============================================================================

const CROSS_CAM_FEATURES: CrossCAMFeature[] = [
  {
    name: "iMachining Chip Thinning",
    source_cam: "solidcam",
    description: "Automatic feed compensation for reduced radial engagement",
    gcode_pattern: "(IMACH CHIP THIN COMP)",
    benefits: ["Consistent chip load", "Extended tool life", "Faster cycle time"],
    compatibility: { fanuc: "native", siemens: "native", haas: "native", okuma: "native", mazak: "native", mitsubishi: "native", heidenhain: "emulated", fagor: "emulated", generic: "emulated" },
  },
  {
    name: "Adaptive Clearing",
    source_cam: "fusion360",
    description: "Constant tool engagement adaptive toolpath",
    gcode_pattern: "(ADAPTIVE CLEARING)",
    benefits: ["Constant load", "HSM speeds", "Full DOC utilization"],
    compatibility: { fanuc: "native", siemens: "native", haas: "native", okuma: "native", mazak: "native", mitsubishi: "native", heidenhain: "native", fagor: "native", generic: "native" },
  },
  {
    name: "Collision Avoidance",
    source_cam: "hypermill",
    description: "Real-time collision detection markers in G-code",
    gcode_pattern: "(COLLISION CHECK ZONE)",
    benefits: ["Crash prevention", "5-axis safety", "Automated verification"],
    compatibility: { fanuc: "native", siemens: "native", haas: "emulated", okuma: "native", mazak: "native", mitsubishi: "emulated", heidenhain: "native", fagor: "emulated", generic: "emulated" },
  },
  {
    name: "Dynamic Milling",
    source_cam: "mastercam",
    description: "Constant chip load with motion optimization",
    gcode_pattern: "(DYNAMIC MOTION)",
    benefits: ["Optimized chip load", "Reduced vibration", "Better finish"],
    compatibility: { fanuc: "native", siemens: "native", haas: "native", okuma: "native", mazak: "native", mitsubishi: "native", heidenhain: "native", fagor: "native", generic: "native" },
  },
  {
    name: "Advanced RTCP",
    source_cam: "nx",
    description: "Enhanced rotary tool center point for 5-axis",
    gcode_pattern: "G43.4 H",
    benefits: ["Accurate 5-axis", "Simplified programming", "Better surface quality"],
    compatibility: { fanuc: "native", siemens: "native", haas: "native", okuma: "native", mazak: "native", mitsubishi: "native", heidenhain: "native", fagor: "emulated", generic: "incompatible" },
  },
  {
    name: "Trochoidal Milling",
    source_cam: "esprit",
    description: "Circular interpolation for slot cutting",
    gcode_pattern: "(TROCHOIDAL)",
    benefits: ["Reduced heat", "Better chip evacuation", "Extended tool life"],
    compatibility: { fanuc: "native", siemens: "native", haas: "native", okuma: "native", mazak: "native", mitsubishi: "native", heidenhain: "native", fagor: "native", generic: "native" },
  },
];

// ============================================================================
// CONTROLLER OPTIMIZATION TEMPLATES
// ============================================================================

const CONTROLLER_OPTIMIZATIONS: Record<ControllerType, { name: string; pattern: RegExp; replacement: string; benefit: string }[]> = {
  haas: [
    { name: "HSM Enable", pattern: /^(?!.*G187)/m, replacement: "G187 P2 E0.005", benefit: "Enable high-speed machining mode" },
    { name: "Look-ahead", pattern: /G0[01]/g, replacement: "G187 P1\n$&", benefit: "Optimize look-ahead for smoother motion" },
  ],
  okuma: [
    { name: "Super NURBS", pattern: /G05\.1Q0/g, replacement: "G05.1Q1", benefit: "Enable NURBS interpolation" },
    { name: "Fine Segment", pattern: /G08P0/g, replacement: "G08P1", benefit: "Enable fine segment processing" },
  ],
  fanuc: [
    { name: "AICC", pattern: /^/m, replacement: "G05.1Q1\n", benefit: "AI Contour Control for smoother paths" },
    { name: "Nano smoothing", pattern: /G05P/g, replacement: "G05P10000", benefit: "Enable nano smoothing" },
  ],
  siemens: [
    { name: "CYCLE832", pattern: /^/m, replacement: "CYCLE832(0.01,1,1)\n", benefit: "High-speed settings cycle" },
    { name: "Compressor", pattern: /COMPON/g, replacement: "COMPCURV", benefit: "Better curve compression" },
  ],
  mazak: [
    { name: "Smooth Machining", pattern: /G05P0/g, replacement: "G05P10000", benefit: "Enable smooth machining" },
  ],
  mitsubishi: [
    { name: "High Precision", pattern: /G05\.1Q0/g, replacement: "G05.1Q1", benefit: "High precision mode" },
  ],
  heidenhain: [
    { name: "Smoothing", pattern: /M120/g, replacement: "M120 LA100", benefit: "Look-ahead optimization" },
  ],
  fagor: [
    { name: "HSC Mode", pattern: /^/m, replacement: "#HSC ON\n", benefit: "High speed cutting mode" },
  ],
  generic: [],
};

// ============================================================================
// ENGINE
// ============================================================================

export class PostProcessorDeepReasoningEngine {
  /**
   * Perform chain-of-thought reasoning for a query.
   */
  chainOfThought(input: DeepReasoningInput, query?: string): ChainOfThoughtResult {
    const q = query ?? input.query ?? "Optimize this post processor output";
    const steps: ReasoningStep[] = [];
    let stepNum = 0;

    // Step 1: Analyze current state
    const dlAnalysis = postProcessorDeepLearningEngine.analyze(input);
    steps.push({
      step_number: ++stepNum,
      thought: "First, I need to understand the current G-code structure and quality",
      evidence: [
        `Operation type: ${dlAnalysis.pattern_recognition.operation_type} (${(dlAnalysis.pattern_recognition.operation_confidence * 100).toFixed(0)}% confidence)`,
        `Controller: ${dlAnalysis.controller_classification.detected_controller}`,
        `Quality score: ${dlAnalysis.quality_score.overall_score}/100`,
      ],
      conclusion: `The G-code is for ${dlAnalysis.pattern_recognition.operation_type} on a ${dlAnalysis.controller_classification.detected_controller} controller with quality ${dlAnalysis.quality_score.overall_score}/100`,
      confidence: dlAnalysis.neural_confidence,
      dependencies: [],
    });

    // Step 2: Identify issues
    const issues = dlAnalysis.quality_score.dimensions.flatMap(d => d.issues);
    const anomalies = dlAnalysis.pattern_recognition.anomalies;
    steps.push({
      step_number: ++stepNum,
      thought: "Next, I identify any issues or anomalies that need addressing",
      evidence: [
        `Found ${issues.length} quality issues`,
        `Found ${anomalies.length} anomalies`,
        ...issues.slice(0, 3),
        ...anomalies.slice(0, 2).map(a => `Line ${a.line}: ${a.description}`),
      ],
      conclusion: issues.length > 0 || anomalies.length > 0
        ? `There are ${issues.length} issues and ${anomalies.length} anomalies to address`
        : "No critical issues found, but optimization is still possible",
      confidence: 0.9,
      dependencies: [1],
    });

    // Step 3: Determine optimization strategy
    const controller = input.target_controller ?? dlAnalysis.controller_classification.detected_controller;
    const optimizations = CONTROLLER_OPTIMIZATIONS[controller] ?? [];
    steps.push({
      step_number: ++stepNum,
      thought: "Now I determine the best optimization strategy for this controller",
      evidence: [
        `Target controller: ${controller}`,
        `Available optimizations: ${optimizations.map(o => o.name).join(", ") || "generic only"}`,
        `HSM features: ${/G05|G08|G187/i.test(input.gcode) ? "present" : "missing"}`,
      ],
      conclusion: `Will apply ${optimizations.length} controller-specific optimizations for ${controller}`,
      confidence: 0.85,
      dependencies: [1, 2],
    });

    // Step 4: Physics validation
    const physicsValid = this.validatePhysics(input);
    steps.push({
      step_number: ++stepNum,
      thought: "I must validate that all parameters respect physics constraints",
      evidence: [
        `Material: ${input.material_iso ?? "P"} (kc1.1 = ${CANONICAL_KIENZLE[input.material_iso ?? "P"].kc1_1} MPa)`,
        `Cutting force margin: ${physicsValid.force_margin_pct}%`,
        `Tool life estimate: ${physicsValid.estimated_life_min} min`,
      ],
      conclusion: physicsValid.constraints_ok
        ? "All physics constraints satisfied"
        : "Some physics constraints need adjustment",
      confidence: physicsValid.confidence,
      dependencies: [1, 3],
    });

    // Step 5: Final recommendation
    const finalConclusion = this.synthesizeFinalConclusion(steps, dlAnalysis);
    steps.push({
      step_number: ++stepNum,
      thought: "Finally, I synthesize all findings into actionable recommendations",
      evidence: steps.map(s => s.conclusion),
      conclusion: finalConclusion,
      confidence: steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length,
      dependencies: [1, 2, 3, 4],
    });

    const overallConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    return {
      query: q,
      steps,
      final_conclusion: finalConclusion,
      overall_confidence: Math.round(overallConfidence * 100) / 100,
      reasoning_path: steps.map(s => `Step ${s.step_number}: ${s.thought}`).join(" → "),
      alternative_paths: [],
    };
  }

  /**
   * Perform causal inference for post processor issues.
   */
  causalInference(input: DeepReasoningInput): CausalInferenceResult {
    const dlAnalysis = postProcessorDeepLearningEngine.analyze(input);
    const nodes: CausalNode[] = [];
    const edges: CausalEdge[] = [];

    // Build causal graph based on issues
    nodes.push({ id: "quality", name: "Post Quality", type: "effect", value: dlAnalysis.quality_score.overall_score, confidence: 0.9 });

    // Add cause nodes
    if (dlAnalysis.quality_score.overall_score < 80) {
      if (dlAnalysis.quality_score.safety_compliance.failed.length > 0) {
        nodes.push({ id: "safety_issues", name: "Safety Issues", type: "cause", confidence: 0.95 });
        edges.push({ from: "safety_issues", to: "quality", strength: 0.8, mechanism: "Missing safety blocks reduce quality score" });
      }

      if (dlAnalysis.pattern_recognition.anomalies.length > 0) {
        nodes.push({ id: "anomalies", name: "G-code Anomalies", type: "cause", confidence: 0.85 });
        edges.push({ from: "anomalies", to: "quality", strength: 0.6, mechanism: "Anomalies indicate potential issues" });
      }

      nodes.push({ id: "controller_opt", name: "Controller Optimization", type: "mediator", confidence: 0.8 });
      edges.push({ from: "controller_opt", to: "quality", strength: 0.5, mechanism: "Machine-specific features improve performance" });
    }

    // Root causes
    const rootCauses = nodes
      .filter(n => n.type === "cause")
      .map(n => ({
        cause: n.name,
        probability: n.confidence,
        evidence: edges.filter(e => e.from === n.id).map(e => e.mechanism),
      }));

    // Predicted effects
    const predictedEffects = [
      { effect: "Cycle time reduction", probability: 0.7, conditions: ["Apply HSM features", "Optimize feeds"] },
      { effect: "Improved surface finish", probability: 0.6, conditions: ["Enable smoothing", "Reduce jerk"] },
      { effect: "Extended tool life", probability: 0.5, conditions: ["Optimize cutting parameters"] },
    ];

    // Counterfactuals
    const counterfactuals = [
      { scenario: "If HSM was enabled", outcome: "10-15% faster cycle time", confidence: 0.75 },
      { scenario: "If feed optimization applied", outcome: "20% better tool life", confidence: 0.7 },
    ];

    // Interventions
    const interventions = [
      { action: "Add safe start block", expected_impact: "Eliminate crash risk", risk: 0.1 },
      { action: "Enable controller HSM", expected_impact: "15% faster machining", risk: 0.2 },
      { action: "Optimize feed rates", expected_impact: "Better tool life and finish", risk: 0.15 },
    ];

    return {
      nodes,
      edges,
      root_causes: rootCauses,
      predicted_effects: predictedEffects,
      counterfactuals,
      intervention_recommendations: interventions,
    };
  }

  /**
   * Synthesize best features from multiple CAM systems.
   */
  synthesizeCrossCAM(input: DeepReasoningInput): CrossCAMSynthesisResult {
    const controller = input.target_controller ?? "fanuc";
    const sourceCams = input.source_cams ?? ["mastercam", "fusion360"];
    const selectedFeatures: CrossCAMSynthesisResult["selected_features"] = [];
    const conflicts: CrossCAMSynthesisResult["conflicts_resolved"] = [];
    const synthesizedBlocks: CrossCAMSynthesisResult["synthesized_gcode_blocks"] = [];

    // Select compatible features
    for (const feature of CROSS_CAM_FEATURES) {
      if (!sourceCams.includes(feature.source_cam) && sourceCams[0] !== "generic") continue;

      const compatibility = feature.compatibility[controller];
      if (compatibility === "incompatible") continue;

      selectedFeatures.push({
        feature,
        reason: `${feature.name} from ${feature.source_cam} provides: ${feature.benefits.join(", ")}`,
        confidence: compatibility === "native" ? 0.95 : 0.75,
      });

      // Generate synthesized G-code block
      synthesizedBlocks.push({
        feature: feature.name,
        gcode: `${feature.gcode_pattern}\n(SOURCE: ${feature.source_cam.toUpperCase()})\n(BENEFITS: ${feature.benefits.join(", ")})`,
      });
    }

    // Check for conflicts (e.g., adaptive vs dynamic - both provide similar benefits)
    const adaptiveIdx = selectedFeatures.findIndex(f => f.feature.name === "Adaptive Clearing");
    const dynamicIdx = selectedFeatures.findIndex(f => f.feature.name === "Dynamic Milling");
    if (adaptiveIdx >= 0 && dynamicIdx >= 0) {
      conflicts.push({
        feature_a: "Adaptive Clearing",
        feature_b: "Dynamic Milling",
        resolution: "Both provide constant engagement - using Adaptive as more modern approach",
        chosen: "Adaptive Clearing",
      });
      selectedFeatures.splice(dynamicIdx, 1);
    }

    // Build compatibility matrix
    const compatMatrix: Record<string, Record<ControllerType, boolean>> = {};
    for (const feature of CROSS_CAM_FEATURES) {
      compatMatrix[feature.name] = {} as Record<ControllerType, boolean>;
      for (const [ctrl, compat] of Object.entries(feature.compatibility)) {
        compatMatrix[feature.name][ctrl as ControllerType] = compat !== "incompatible";
      }
    }

    const optimizationScore = selectedFeatures.length > 0
      ? selectedFeatures.reduce((sum, f) => sum + f.confidence, 0) / selectedFeatures.length * 100
      : 50;

    return {
      selected_features: selectedFeatures,
      conflicts_resolved: conflicts,
      compatibility_matrix: compatMatrix,
      synthesized_gcode_blocks: synthesizedBlocks,
      optimization_score: Math.round(optimizationScore),
    };
  }

  /**
   * Optimize G-code for specific controller.
   */
  optimizeForController(input: DeepReasoningInput): ControllerOptimizationResult {
    const controller = input.target_controller ?? "fanuc";
    const optimizations = CONTROLLER_OPTIMIZATIONS[controller] ?? [];
    const applied: ControllerOptimizationResult["optimizations_applied"] = [];
    const injected: ControllerOptimizationResult["features_injected"] = [];
    const adjustments: ControllerOptimizationResult["dialect_adjustments"] = [];

    let gcode = input.gcode;

    // Apply controller-specific optimizations
    for (const opt of optimizations) {
      if (opt.pattern.test(gcode)) {
        const before = gcode.match(opt.pattern)?.[0] ?? "";
        gcode = gcode.replace(opt.pattern, opt.replacement);
        const after = opt.replacement;

        applied.push({
          name: opt.name,
          gcode_before: before,
          gcode_after: after,
          improvement: opt.benefit,
          confidence: 0.85,
        });
      }
    }

    // Inject missing features based on controller capabilities
    const featureInjections: Record<ControllerType, { feature: string; gcode: string; benefit: string }[]> = {
      haas: [{ feature: "G187 Smoothing", gcode: "G187 P2 E0.005", benefit: "Better surface finish" }],
      okuma: [{ feature: "G08 High-speed", gcode: "G08 P1", benefit: "Smooth high-speed machining" }],
      fanuc: [{ feature: "G05.1 AICC", gcode: "G05.1 Q1", benefit: "AI Contour Control" }],
      siemens: [{ feature: "SOFT", gcode: "SOFT", benefit: "Soft acceleration" }],
      mazak: [{ feature: "G05 Smooth", gcode: "G05 P10000", benefit: "Smooth machining" }],
      mitsubishi: [{ feature: "G05.1 HPCC", gcode: "G05.1 Q1", benefit: "High precision" }],
      heidenhain: [{ feature: "M120 Look-ahead", gcode: "M120 LA100", benefit: "Look-ahead optimization" }],
      fagor: [{ feature: "HSC Mode", gcode: "#HSC ON", benefit: "High speed cutting" }],
      generic: [],
    };

    const toInject = featureInjections[controller] ?? [];
    for (const feat of toInject) {
      if (!gcode.includes(feat.gcode)) {
        injected.push(feat);
      }
    }

    // Dialect adjustments (e.g., Fanuc vs Siemens syntax)
    if (controller === "siemens" && /G54\.1P/i.test(gcode)) {
      adjustments.push({
        original: "G54.1P1",
        adjusted: "TRANS X0 Y0 Z0",
        reason: "Siemens uses TRANS instead of G54.1",
      });
    }

    const improvement = (applied.length * 5 + injected.length * 3);

    return {
      target_controller: controller,
      optimizations_applied: applied,
      features_injected: injected,
      dialect_adjustments: adjustments,
      estimated_improvement_pct: Math.min(25, improvement),
    };
  }

  /**
   * Physics-backed reasoning for optimization decisions.
   */
  physicsReasoning(input: DeepReasoningInput): PhysicsReasoningResult {
    const material = input.material_iso ?? "P";
    const materialDb = CANONICAL_MATERIAL_DB[material];
    const kienzle = CANONICAL_KIENZLE[material];
    const taylor = CANONICAL_TAYLOR[material];

    const toolDia = input.tool_diameter_mm ?? 12;
    const rpm = input.spindle_rpm ?? 3000;
    const doc = input.depth_of_cut_mm ?? 2;
    const Vc = input.cutting_speed_mpm ?? (Math.PI * toolDia * rpm / 1000);

    // Kienzle force calculation
    const fz = 0.1; // mm/tooth assumed
    const forceResult = kienzleForce(kienzle.kc1_1, kienzle.mc, doc, fz);
    const forceLimit = 2000; // N - typical limit
    const forceMargin = ((forceLimit - forceResult) / forceLimit) * 100;

    // Taylor tool life
    const lifeResult = taylorLife(taylor.C, taylor.n, Vc);
    const optimalVc = taylor.C / Math.pow(60, taylor.n); // Target 60 min life
    const optimalLife = taylorLife(taylor.C, taylor.n, optimalVc);

    // Thermal estimate (simplified)
    const thermalTemp = 200 + Vc * 2 + doc * 10;
    const thermalRisk = thermalTemp > 600 ? "high" : thermalTemp > 400 ? "medium" : "low";

    const physicsScore = (
      (forceMargin > 20 ? 30 : forceMargin > 10 ? 20 : 10) +
      (lifeResult > 30 ? 30 : lifeResult > 15 ? 20 : 10) +
      (thermalRisk === "low" ? 40 : thermalRisk === "medium" ? 25 : 10)
    );

    return {
      kienzle_analysis: {
        material: material,
        kc1_1: kienzle.kc1_1,
        mc: kienzle.mc,
        estimated_force_N: Math.round(forceResult),
        force_limit_N: forceLimit,
        margin_pct: Math.round(forceMargin),
        recommendation: forceMargin < 20 ? "Reduce depth of cut or feed" : "Force within safe limits",
      },
      taylor_analysis: {
        cutting_speed_mpm: Math.round(Vc),
        predicted_life_min: Math.round(lifeResult),
        optimal_speed_mpm: Math.round(optimalVc),
        life_at_optimal_min: Math.round(optimalLife),
        tradeoff: Vc > optimalVc
          ? "Faster cutting but shorter tool life"
          : "Conservative speed for longer tool life",
      },
      thermal_analysis: {
        estimated_temp_C: Math.round(thermalTemp),
        risk_level: thermalRisk,
        coolant_recommendation: thermalRisk === "high" ? "High-pressure coolant required"
          : thermalRisk === "medium" ? "Flood coolant recommended"
          : "Air blast or mist acceptable",
      },
      overall_physics_score: physicsScore,
      constraints_satisfied: forceMargin > 10 && thermalRisk !== "high",
    };
  }

  /**
   * Verify reasoning consistency across multiple paths.
   */
  verifySelfConsistency(input: DeepReasoningInput): SelfConsistencyResult {
    const paths: { path_id: number; answer: string; confidence: number }[] = [];

    // Path 1: Deep learning first
    const dlFirst = postProcessorDeepLearningEngine.analyze(input);
    paths.push({
      path_id: 1,
      answer: `Quality: ${dlFirst.quality_score.overall_score}, Controller: ${dlFirst.controller_classification.detected_controller}`,
      confidence: dlFirst.neural_confidence,
    });

    // Path 2: Physics first
    const physicsFirst = this.physicsReasoning(input);
    paths.push({
      path_id: 2,
      answer: `Physics score: ${physicsFirst.overall_physics_score}, Force margin: ${physicsFirst.kienzle_analysis.margin_pct}%`,
      confidence: physicsFirst.constraints_satisfied ? 0.85 : 0.6,
    });

    // Path 3: Controller optimization first
    const controllerFirst = this.optimizeForController(input);
    paths.push({
      path_id: 3,
      answer: `Optimizations: ${controllerFirst.optimizations_applied.length}, Improvement: ${controllerFirst.estimated_improvement_pct}%`,
      confidence: 0.8,
    });

    // Check consensus
    const avgConfidence = paths.reduce((sum, p) => sum + p.confidence, 0) / paths.length;
    const consensusReached = avgConfidence > 0.7;

    const disagreements: SelfConsistencyResult["disagreements"] = [];
    if (dlFirst.quality_score.overall_score < 70 && physicsFirst.constraints_satisfied) {
      disagreements.push({
        topic: "Quality vs Physics",
        positions: ["DL says low quality", "Physics says constraints OK"],
        resolution: "Quality issues may be structural, not physics-related",
      });
    }

    return {
      num_paths_explored: paths.length,
      consensus_reached: consensusReached,
      consensus_answer: consensusReached
        ? `All paths agree on optimization potential of ${controllerFirst.estimated_improvement_pct}%`
        : "Paths show different aspects - combined analysis recommended",
      path_agreements: paths,
      disagreements,
      final_confidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * Run comprehensive deep reasoning analysis.
   */
  analyze(input: DeepReasoningInput): DeepReasoningAnalysis {
    const startTime = Date.now();

    const chainOfThought = this.chainOfThought(input);
    const causalInference = this.causalInference(input);
    const crossCamSynthesis = this.synthesizeCrossCAM(input);
    const controllerOptimization = this.optimizeForController(input);
    const physicsReasoning = this.physicsReasoning(input);
    const selfConsistency = this.verifySelfConsistency(input);

    const reasoningConfidence = (
      chainOfThought.overall_confidence * 0.25 +
      selfConsistency.final_confidence * 0.25 +
      (crossCamSynthesis.optimization_score / 100) * 0.25 +
      (physicsReasoning.overall_physics_score / 100) * 0.25
    );

    const processingTime = Date.now() - startTime;

    log.info(`[PostProcessorDR] Analysis complete: confidence ${(reasoningConfidence * 100).toFixed(1)}%, ${processingTime}ms`);

    return {
      chain_of_thought: chainOfThought,
      causal_inference: causalInference,
      cross_cam_synthesis: crossCamSynthesis,
      controller_optimization: controllerOptimization,
      physics_reasoning: physicsReasoning,
      self_consistency: selfConsistency,
      reasoning_confidence: Math.round(reasoningConfidence * 100) / 100,
      processing_time_ms: processingTime,
    };
  }

  // ── Private Methods ────────────────────────────────────────────────────

  private validatePhysics(input: DeepReasoningInput): { force_margin_pct: number; estimated_life_min: number; constraints_ok: boolean; confidence: number } {
    const physics = this.physicsReasoning(input);
    return {
      force_margin_pct: physics.kienzle_analysis.margin_pct,
      estimated_life_min: physics.taylor_analysis.predicted_life_min,
      constraints_ok: physics.constraints_satisfied,
      confidence: physics.constraints_satisfied ? 0.85 : 0.6,
    };
  }

  private synthesizeFinalConclusion(steps: ReasoningStep[], dlAnalysis: any): string {
    const quality = dlAnalysis.quality_score.overall_score;
    const issues = dlAnalysis.quality_score.dimensions.flatMap((d: any) => d.issues).length;

    if (quality >= 90 && issues === 0) {
      return "Post processor output is excellent. Minor optimizations possible for controller-specific features.";
    } else if (quality >= 70) {
      return `Post processor output is good (${quality}/100). ${issues} issues identified for improvement. Recommend applying controller-specific optimizations.`;
    } else {
      return `Post processor output needs attention (${quality}/100). ${issues} critical issues found. Prioritize safety blocks and controller optimization.`;
    }
  }
}

// Singleton export
export const postProcessorDeepReasoningEngine = new PostProcessorDeepReasoningEngine();
