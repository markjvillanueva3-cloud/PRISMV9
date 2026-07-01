/**
 * LatheCAMIntelligenceEngine — AI-Powered Lathe CAD/CAM Intelligence
 * ===================================================================
 * Provides intelligent decision-making for lathe CAD/CAM workflows:
 *   1. Parametric CAD Template Generation — Templates for part family variability
 *   2. Intelligent Toolpath Selection — Best practices, interrupted cut avoidance
 *   3. Operation Sequencing Optimization — AI-driven sequence planning
 *   4. Workholding Intelligence — Smart workholding selection and verification
 *   5. MRR/Cost Optimization — Balance productivity vs tool cost
 *   6. Feature-to-Operation Mapping — CAD features to optimal lathe operations
 *
 * Composes underlying engines with AI reasoning:
 *   - ChainOfThoughtEngine for step-by-step reasoning
 *   - DecisionReasoningEngine for multi-criteria selection
 *   - IntelligentSequencingEngine for operation ordering
 *   - WorkholdingVerificationEngine for workholding safety
 *   - LearningAdaptationEngine for shop-specific calibration
 *
 * @module engines/LatheCAMIntelligenceEngine
 * @version 1.0.0
 * @milestone LLM-INTEL-7
 */

import { log } from "../utils/Logger.js";

// Note: This engine implements direct decision logic rather than depending on
// external AI engines (ChainOfThoughtEngine, DecisionReasoningEngine) to ensure
// predictable, testable behavior. The logic follows the same principles but
// is implemented inline for reliability.

// ============================================================================
// TYPES
// ============================================================================

/** Lathe toolpath strategy types */
export type LatheToolpathType =
  | "g71_od_rough"         // G71 OD roughing cycle
  | "g70_od_finish"        // G70 OD finish cycle
  | "g72_face_rough"       // G72 facing roughing cycle
  | "g73_pattern_repeat"   // G73 pattern repeating cycle
  | "g74_peck_drill"       // G74 face peck drilling
  | "g75_grooving"         // G75 grooving cycle
  | "g76_threading"        // G76 threading cycle
  | "g71_id_rough"         // G71 ID roughing (boring)
  | "g70_id_finish"        // G70 ID finish
  | "profile_turn"         // Profile turning (non-canned)
  | "plunge_groove"        // Plunge grooving
  | "turn_groove"          // Turn-groove combination
  | "thread_single"        // Single-point threading
  | "thread_multi"         // Multi-start threading
  | "taper_turn"           // Taper turning
  | "contour_turn"         // Complex contour turning
  | "face_turn"            // Simple facing
  | "part_off"             // Parting/cutoff
  | "center_drill"         // Center drilling
  | "drill"                // Drilling
  | "bore"                 // Boring
  | "ream"                 // Reaming
  | "tap"                  // Tapping
  | "live_mill"            // Live tooling milling
  | "live_drill"           // Live tooling drilling
  | "c_axis_contour";      // C-axis contouring

/** CAD feature types recognized for lathe parts */
export type LatheCADFeature =
  | "cylinder_od"          // Outside diameter cylinder
  | "cylinder_id"          // Inside diameter (bore)
  | "face"                 // Flat face
  | "shoulder"             // Step/shoulder
  | "taper_od"             // Tapered OD
  | "taper_id"             // Tapered ID
  | "radius_fillet"        // Fillet radius
  | "radius_blend"         // Blend radius
  | "chamfer"              // Chamfer
  | "groove_od"            // OD groove
  | "groove_id"            // ID groove
  | "groove_face"          // Face groove
  | "thread_od"            // External thread
  | "thread_id"            // Internal thread
  | "knurl"                // Knurl pattern
  | "cross_hole"           // Cross-drilled hole
  | "flat"                 // Milled flat
  | "keyway"               // Keyway/keyseat
  | "polygon"              // Polygon (hex, square)
  | "undercut"             // Undercut/relief
  | "thread_relief"        // Thread relief groove
  | "center_hole";         // Center drill hole

/** Part geometry input for CAD/CAM analysis */
export interface LathePartGeometry {
  /** Part identifier */
  part_id: string;
  /** Material ISO group */
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  /** Material name */
  material_name: string;
  /** Maximum OD (mm) */
  max_od_mm: number;
  /** Minimum ID (mm) - 0 if solid */
  min_id_mm: number;
  /** Overall length (mm) */
  length_mm: number;
  /** Stock diameter (mm) */
  stock_od_mm: number;
  /** Stock length (mm) */
  stock_length_mm: number;
  /** Features detected from CAD */
  features: LatheCADFeatureInstance[];
  /** Tolerances */
  tolerances?: {
    diameter_mm?: number;
    length_mm?: number;
    concentricity_mm?: number;
    surface_finish_ra?: number;
  };
  /** Part family info for templating */
  family?: {
    family_id: string;
    variant_count: number;
    variable_dimensions: string[];
  };
}

/** Instance of a CAD feature with parameters */
export interface LatheCADFeatureInstance {
  /** Feature ID */
  id: string;
  /** Feature type */
  type: LatheCADFeature;
  /** Location on part (Z from face) */
  z_start_mm: number;
  z_end_mm: number;
  /** Diameters */
  diameter_mm?: number;
  diameter_start_mm?: number;
  diameter_end_mm?: number;
  /** Depth (for grooves, holes) */
  depth_mm?: number;
  /** Width (for grooves) */
  width_mm?: number;
  /** Angle (for tapers, chamfers) */
  angle_deg?: number;
  /** Radius (for fillets, blends) */
  radius_mm?: number;
  /** Thread spec (for threads) */
  thread_spec?: string;
  /** Tolerance class */
  tolerance_class?: "standard" | "precision" | "ultra_precision";
  /** Surface finish requirement (Ra) */
  surface_finish_ra?: number;
  /** Is this a datum feature? */
  is_datum?: boolean;
  /** GD&T callouts */
  gdt_callouts?: string[];
}

/** Machine configuration */
export interface LatheMachineConfig {
  machine_id: string;
  machine_type: "2_axis" | "y_axis" | "mill_turn" | "swiss" | "multi_turret";
  controller: "fanuc" | "okuma" | "mazak" | "haas" | "siemens" | "mitsubishi";
  max_spindle_rpm: number;
  max_spindle_hp: number;
  max_bar_capacity_mm?: number;
  max_chuck_od_mm: number;
  has_live_tooling: boolean;
  has_c_axis: boolean;
  has_y_axis: boolean;
  has_sub_spindle: boolean;
  turret_stations: number;
  tools_available?: AvailableTool[];
}

/** Available tool in magazine */
export interface AvailableTool {
  tool_id: string;
  station: number;
  type: "turning_insert" | "boring_bar" | "grooving" | "threading" | "drill" | "tap" | "reamer" | "live_mill" | "live_drill";
  nose_radius_mm?: number;
  insert_grade?: string;
  approach_angle_deg?: number;
  max_doc_mm?: number;
  min_bore_mm?: number;
  cost_per_edge?: number;
  edges_per_insert?: number;
  recommended_sfm_range?: [number, number];
}

/** Toolpath recommendation */
export interface ToolpathRecommendation {
  /** Recommended toolpath strategy */
  strategy: LatheToolpathType;
  /** AI reasoning for this choice */
  reasoning: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Alternative strategies considered */
  alternatives: Array<{
    strategy: LatheToolpathType;
    score: number;
    why_not: string;
  }>;
  /** Specific parameters */
  parameters: {
    depth_of_cut_mm: number;
    feed_mm_rev: number;
    cutting_speed_m_min: number;
    tool_recommendation?: string;
    approach_strategy?: string;
    retract_strategy?: string;
  };
  /** Warnings/cautions */
  warnings: string[];
  /** Interrupted cut assessment */
  interrupted_cut?: {
    has_interruption: boolean;
    severity: "none" | "minor" | "moderate" | "severe";
    mitigation: string[];
  };
}

/** Parametric template recommendation */
export interface ParametricTemplateRecommendation {
  /** Should use parametric template */
  use_template: boolean;
  /** Template type */
  template_type: "single_part" | "family_parametric" | "feature_library" | "macro_driven";
  /** Recommended variable parameters */
  variable_parameters: Array<{
    name: string;
    description: string;
    type: "dimension" | "feature_count" | "material" | "tolerance";
    default_value: number | string;
    range?: [number, number] | string[];
  }>;
  /** Template structure */
  template_structure: {
    base_features: string[];
    optional_features: string[];
    driven_dimensions: string[];
    constraint_equations: string[];
  };
  /** AI reasoning */
  reasoning: string[];
  /** Time savings estimate */
  time_savings?: {
    cad_time_reduction_pct: number;
    cam_time_reduction_pct: number;
    total_variants_addressable: number;
  };
}

/** Operation sequence recommendation */
export interface OperationSequenceRecommendation {
  /** Ordered operations */
  operations: Array<{
    sequence: number;
    feature_id: string;
    toolpath: LatheToolpathType;
    tool_id: string;
    reasoning: string;
    phase: "roughing" | "semi_finish" | "finishing" | "secondary";
    estimated_cycle_time_sec: number;
  }>;
  /** Tool change count */
  tool_changes: number;
  /** Total cycle time */
  total_cycle_time_sec: number;
  /** Sequencing reasoning */
  reasoning: string[];
  /** Optimizations applied */
  optimizations: string[];
  /** Proactive suggestions */
  suggestions: string[];
}

/** Workholding recommendation */
export interface WorkholdingRecommendation {
  /** Primary workholding */
  primary: {
    type: "3_jaw_chuck" | "6_jaw_chuck" | "collet" | "face_driver" | "mandrel" | "soft_jaws" | "fixture";
    jaw_type?: "hard" | "soft" | "serrated";
    grip_diameter_mm: number;
    grip_length_mm: number;
    clamping_force_kn: number;
  };
  /** Secondary support */
  secondary?: {
    type: "tailstock" | "steady_rest" | "follow_rest";
    position_mm?: number;
    force_n?: number;
  };
  /** Safety analysis */
  safety: {
    adequate: boolean;
    safety_factor: number;
    ejection_risk: "none" | "low" | "medium" | "high";
    deflection_risk: "none" | "low" | "medium" | "high";
    recommendations: string[];
  };
  /** AI reasoning */
  reasoning: string[];
}

/** MRR/Cost optimization result */
export interface MRRCostOptimization {
  /** Optimized parameters */
  optimized: {
    mrr_mm3_min: number;
    tool_cost_per_part: number;
    cycle_time_sec: number;
    productivity_index: number;  // MRR / cost
  };
  /** Conservative parameters (longer tool life) */
  conservative: {
    mrr_mm3_min: number;
    tool_cost_per_part: number;
    cycle_time_sec: number;
    productivity_index: number;
  };
  /** Aggressive parameters (max MRR) */
  aggressive: {
    mrr_mm3_min: number;
    tool_cost_per_part: number;
    cycle_time_sec: number;
    productivity_index: number;
  };
  /** Recommendation */
  recommendation: "optimized" | "conservative" | "aggressive";
  /** Reasoning */
  reasoning: string[];
  /** Batch size breakpoints */
  batch_breakpoints?: Array<{
    min_quantity: number;
    recommended_strategy: string;
    reason: string;
  }>;
}

/** Complete CAM analysis result */
export interface LatheCAMAnalysis {
  /** Part ID */
  part_id: string;
  /** Template recommendation */
  template: ParametricTemplateRecommendation;
  /** Workholding recommendation */
  workholding: WorkholdingRecommendation;
  /** Operation sequence */
  sequence: OperationSequenceRecommendation;
  /** Feature-to-toolpath mapping */
  feature_toolpaths: Map<string, ToolpathRecommendation>;
  /** MRR/Cost optimization */
  mrr_cost: MRRCostOptimization;
  /** Overall summary */
  summary: string[];
  /** Prediction ID for learning */
  prediction_id: string;
}

/** Decision criterion for multi-criteria selection (workholding, strategy, etc.) */
interface DecisionCriterion {
  name: string;
  weight: number;
  goal: "maximize" | "minimize";
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Feature to toolpath mapping rules */
const FEATURE_TOOLPATH_MAP: Record<LatheCADFeature, LatheToolpathType[]> = {
  cylinder_od: ["g71_od_rough", "g70_od_finish", "profile_turn"],
  cylinder_id: ["g71_id_rough", "g70_id_finish", "bore"],
  face: ["g72_face_rough", "face_turn"],
  shoulder: ["g71_od_rough", "g70_od_finish", "profile_turn"],
  taper_od: ["g71_od_rough", "g70_od_finish", "taper_turn", "contour_turn"],
  taper_id: ["g71_id_rough", "g70_id_finish", "bore"],
  radius_fillet: ["g71_od_rough", "g70_od_finish", "contour_turn"],
  radius_blend: ["g71_od_rough", "g70_od_finish", "contour_turn"],
  chamfer: ["g70_od_finish", "profile_turn"],
  groove_od: ["g75_grooving", "plunge_groove", "turn_groove"],
  groove_id: ["g75_grooving", "bore"],
  groove_face: ["g75_grooving", "plunge_groove"],
  thread_od: ["g76_threading", "thread_single", "thread_multi"],
  thread_id: ["g76_threading", "thread_single", "tap"],
  knurl: ["live_mill"],  // Usually done with live tooling or special knurl tool
  cross_hole: ["live_drill", "live_mill"],
  flat: ["live_mill", "c_axis_contour"],
  keyway: ["live_mill", "c_axis_contour"],
  polygon: ["live_mill", "c_axis_contour"],
  undercut: ["g75_grooving", "plunge_groove"],
  thread_relief: ["g75_grooving", "plunge_groove"],
  center_hole: ["center_drill"],
};

/** Material-specific cutting parameters */
const MATERIAL_PARAMS: Record<string, { vc_range: [number, number]; feed_factor: number; doc_factor: number }> = {
  P: { vc_range: [150, 350], feed_factor: 1.0, doc_factor: 1.0 },   // Carbon steel
  M: { vc_range: [80, 200], feed_factor: 0.8, doc_factor: 0.8 },    // Stainless
  K: { vc_range: [100, 300], feed_factor: 1.1, doc_factor: 1.2 },   // Cast iron
  N: { vc_range: [300, 800], feed_factor: 1.2, doc_factor: 1.5 },   // Aluminum
  S: { vc_range: [30, 80], feed_factor: 0.6, doc_factor: 0.5 },     // Superalloys
  H: { vc_range: [60, 150], feed_factor: 0.5, doc_factor: 0.3 },    // Hardened steel
};

/** Interrupted cut severity thresholds */
const INTERRUPTED_CUT_THRESHOLDS = {
  none: 0,       // no interruption
  minor: 0.2,    // <20% of cut is interrupted
  moderate: 0.4, // 20-40% interrupted
  severe: 0.6,   // >40% interrupted
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LatheCAMIntelligenceEngine {
  // All engines use static methods - no instance needed

  constructor() {
    // No initialization needed - using static methods
  }

  // ==========================================================================
  // PARAMETRIC TEMPLATE RECOMMENDATION
  // ==========================================================================

  /**
   * Recommend parametric CAD template strategy for a part or part family.
   * Analyzes features to determine variable parameters and template structure.
   */
  recommendParametricTemplate(
    part: LathePartGeometry,
    similarParts?: LathePartGeometry[]
  ): ParametricTemplateRecommendation {
    log.info("[LatheCAMIntelligence] Analyzing parametric template strategy");

    const reasoning: string[] = [];
    const variableParams: ParametricTemplateRecommendation["variable_parameters"] = [];

    // Direct reasoning for template decision (simplified from ChainOfThought)
    const complexity = this.assessPartComplexity(part);
    const hasFamily = !!part.family;
    const similarCount = similarParts?.length || 0;

    reasoning.push(`Part complexity: ${complexity}`);
    if (hasFamily) {
      reasoning.push(`Part belongs to family with ${part.family!.variant_count} variants`);
    }
    if (similarCount > 0) {
      reasoning.push(`Found ${similarCount} similar parts for potential reuse`);
    }

    // Determine template type
    let templateType: ParametricTemplateRecommendation["template_type"] = "single_part";
    if (part.family && part.family.variant_count > 3) {
      templateType = "family_parametric";
      reasoning.push(`Part family with ${part.family.variant_count} variants warrants parametric template`);
    } else if (similarParts && similarParts.length > 2) {
      templateType = "feature_library";
      reasoning.push(`${similarParts.length} similar parts suggest feature library approach`);
    } else if (this.hasMacroPatterns(part)) {
      templateType = "macro_driven";
      reasoning.push("Repetitive features detected — macro-driven template recommended");
    }

    // Identify variable parameters
    if (part.family?.variable_dimensions) {
      for (const dim of part.family.variable_dimensions) {
        variableParams.push({
          name: dim,
          description: `Variable dimension: ${dim}`,
          type: "dimension",
          default_value: this.extractDimensionValue(part, dim),
          range: this.inferDimensionRange(part, similarParts, dim),
        });
      }
    }

    // Always include key dimensions as variables
    variableParams.push(
      { name: "MAX_OD", description: "Maximum outside diameter", type: "dimension", default_value: part.max_od_mm, range: [part.max_od_mm * 0.5, part.max_od_mm * 2] },
      { name: "LENGTH", description: "Overall length", type: "dimension", default_value: part.length_mm, range: [part.length_mm * 0.5, part.length_mm * 2] },
    );

    if (part.min_id_mm > 0) {
      variableParams.push({ name: "MIN_ID", description: "Minimum bore diameter", type: "dimension", default_value: part.min_id_mm, range: [part.min_id_mm * 0.5, part.min_id_mm * 1.5] });
    }

    // Build template structure
    const baseFeatures = part.features.filter(f => f.is_datum || ["face", "cylinder_od"].includes(f.type)).map(f => f.id);
    const optionalFeatures = part.features.filter(f => ["groove_od", "thread_od", "chamfer", "cross_hole"].includes(f.type)).map(f => f.id);
    const drivenDimensions = variableParams.filter(p => p.type === "dimension").map(p => p.name);

    // Constraint equations for parametric relationships
    const constraintEquations: string[] = [];
    if (part.stock_od_mm > part.max_od_mm) {
      constraintEquations.push(`STOCK_OD = MAX_OD + ${(part.stock_od_mm - part.max_od_mm).toFixed(1)}`);
    }
    if (part.stock_length_mm > part.length_mm) {
      constraintEquations.push(`STOCK_LENGTH = LENGTH + ${(part.stock_length_mm - part.length_mm).toFixed(1)}`);
    }

    // Time savings estimate
    const timeSavings = {
      cad_time_reduction_pct: templateType === "family_parametric" ? 70 : templateType === "feature_library" ? 50 : 30,
      cam_time_reduction_pct: templateType === "family_parametric" ? 60 : templateType === "feature_library" ? 40 : 20,
      total_variants_addressable: part.family?.variant_count || (similarParts?.length || 0) + 1,
    };

    return {
      use_template: templateType !== "single_part" || part.features.length > 5,
      template_type: templateType,
      variable_parameters: variableParams,
      template_structure: {
        base_features: baseFeatures,
        optional_features: optionalFeatures,
        driven_dimensions: drivenDimensions,
        constraint_equations: constraintEquations,
      },
      reasoning,
      time_savings: timeSavings,
    };
  }

  // ==========================================================================
  // TOOLPATH SELECTION
  // ==========================================================================

  /**
   * Select optimal toolpath strategy for a feature with AI reasoning.
   * Considers best practices like avoiding interrupted cuts, MRR optimization.
   */
  selectToolpath(
    feature: LatheCADFeatureInstance,
    part: LathePartGeometry,
    machine: LatheMachineConfig,
    context?: { batch_size?: number; priority?: "speed" | "cost" | "quality" }
  ): ToolpathRecommendation {
    log.info(`[LatheCAMIntelligence] Selecting toolpath for feature ${feature.id} (${feature.type})`);

    const candidates = FEATURE_TOOLPATH_MAP[feature.type] || ["profile_turn"];
    const priority = context?.priority || "quality";

    // Define criteria weights based on priority
    const weights = {
      cycle_time: priority === "speed" ? 0.4 : 0.2,
      tool_cost: priority === "cost" ? 0.4 : 0.15,
      surface_quality: priority === "quality" ? 0.4 : 0.25,
      interrupted_cut_risk: 0.2,
      machine_compatibility: 0.1,
    };

    // Evaluate each candidate with direct scoring
    const evaluatedCandidates = candidates.map(strategy => {
      const interruptedCut = this.assessInterruptedCut(feature, part, strategy);
      const machineCompat = this.checkMachineCompatibility(strategy, machine);

      const scores = {
        cycle_time: this.estimateCycleTimeScore(strategy, feature, part),
        tool_cost: this.estimateToolCostScore(strategy, feature, part),
        surface_quality: this.estimateSurfaceQualityScore(strategy, feature),
        interrupted_cut_risk: interruptedCut.has_interruption
          ? (1 - (INTERRUPTED_CUT_THRESHOLDS[interruptedCut.severity] || 0))
          : 1,
        machine_compatibility: machineCompat ? 1 : 0,
      };

      // Calculate weighted score (higher is better)
      const weightedScore =
        scores.cycle_time * weights.cycle_time +
        scores.tool_cost * weights.tool_cost +
        scores.surface_quality * weights.surface_quality +
        scores.interrupted_cut_risk * weights.interrupted_cut_risk +
        scores.machine_compatibility * weights.machine_compatibility;

      return {
        strategy,
        scores,
        weightedScore,
        interruptedCut,
        machineCompat,
      };
    });

    // Sort by weighted score (descending) and filter out incompatible
    const sortedCandidates = evaluatedCandidates
      .filter(c => c.machineCompat)
      .sort((a, b) => b.weightedScore - a.weightedScore);

    // Fallback to first candidate if all incompatible
    const selected = sortedCandidates[0] || evaluatedCandidates[0];
    const selectedStrategy = selected.strategy as LatheToolpathType;

    // Generate parameters based on material
    const matParams = MATERIAL_PARAMS[part.iso_group] || MATERIAL_PARAMS.P;
    const baseVc = (matParams.vc_range[0] + matParams.vc_range[1]) / 2;
    const baseFeed = 0.25 * matParams.feed_factor;
    const baseDoc = 2.0 * matParams.doc_factor;

    // Adjust for tolerance
    const tolFactor = feature.tolerance_class === "ultra_precision" ? 0.5
      : feature.tolerance_class === "precision" ? 0.7 : 1.0;

    // Build warnings
    const warnings: string[] = [];
    const interruptedCut = selected.interruptedCut;

    if (interruptedCut?.has_interruption && interruptedCut.severity !== "none") {
      warnings.push(`Interrupted cut detected (${interruptedCut.severity})`);
      warnings.push(...(interruptedCut.mitigation || []));
    }

    if (feature.surface_finish_ra && feature.surface_finish_ra < 1.6) {
      warnings.push("Fine surface finish required — consider additional finishing pass");
    }

    // Build alternatives list
    const alternatives = sortedCandidates.slice(1, 4).map(alt => ({
      strategy: alt.strategy as LatheToolpathType,
      score: Math.round(alt.weightedScore * 100) / 100,
      why_not: alt.weightedScore < selected.weightedScore * 0.9
        ? `Lower overall score (${Math.round(alt.weightedScore * 100)}% vs ${Math.round(selected.weightedScore * 100)}%)`
        : "Close alternative, slightly lower score",
    }));

    // Build reasoning
    const reasoning: string[] = [
      `Selected ${selectedStrategy} for ${feature.type}`,
      `Priority: ${priority} (weights adjusted accordingly)`,
      `Confidence based on ${evaluatedCandidates.length} candidates evaluated`,
    ];

    return {
      strategy: selectedStrategy,
      reasoning,
      confidence: Math.min(0.95, 0.5 + selected.weightedScore * 0.5),
      alternatives,
      parameters: {
        depth_of_cut_mm: Math.round(baseDoc * tolFactor * 10) / 10,
        feed_mm_rev: Math.round(baseFeed * tolFactor * 100) / 100,
        cutting_speed_m_min: Math.round(baseVc * tolFactor),
        approach_strategy: this.getApproachStrategy(selectedStrategy, feature),
        retract_strategy: this.getRetractStrategy(selectedStrategy, feature),
      },
      warnings,
      interrupted_cut: interruptedCut,
    };
  }

  // ==========================================================================
  // OPERATION SEQUENCING
  // ==========================================================================

  /**
   * Generate intelligent operation sequence for all features.
   * Applies best practices: datum first, roughing before finishing, minimize tool changes.
   */
  sequenceOperations(
    part: LathePartGeometry,
    machine: LatheMachineConfig,
    toolpathSelections: Map<string, ToolpathRecommendation>
  ): OperationSequenceRecommendation {
    log.info("[LatheCAMIntelligence] Generating operation sequence");

    const operations: OperationSequenceRecommendation["operations"] = [];
    const reasoning: string[] = [];
    const optimizations: string[] = [];

    // Direct sequencing logic (replaces ChainOfThought)
    const hasThreads = part.features.some(f => f.type.includes("thread"));
    const hasGrooves = part.features.some(f => f.type.includes("groove"));
    const hasCrossFeatures = part.features.some(f => ["cross_hole", "flat", "keyway"].includes(f.type));
    const slendernessRatio = part.length_mm / part.max_od_mm;

    reasoning.push(`Sequencing ${part.features.length} features with intelligent ordering`);
    reasoning.push("Applying best practices: datum first, roughing before finishing");
    if (hasThreads) reasoning.push("Threading operations will be sequenced late to protect threads");
    if (hasCrossFeatures && machine.has_live_tooling) reasoning.push("Live tooling operations will be grouped");
    if (slendernessRatio > 3) reasoning.push(`Slender part (L/D=${slendernessRatio.toFixed(1)}) — sequencing considers deflection`);

    // Phase 1: Datums and facing
    const datumFeatures = part.features.filter(f => f.is_datum || f.type === "face");
    for (const feature of datumFeatures) {
      const toolpath = toolpathSelections.get(feature.id);
      if (toolpath) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: feature.id,
          toolpath: toolpath.strategy,
          tool_id: this.selectToolForOperation(toolpath.strategy, machine),
          reasoning: "Datum/face operations first for reference",
          phase: "roughing",
          estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
        });
      }
    }
    if (datumFeatures.length > 0) {
      optimizations.push("Datum features sequenced first for reference");
    }

    // Phase 2: OD roughing (group by tool to minimize changes)
    const odRoughFeatures = part.features.filter(f =>
      ["cylinder_od", "shoulder", "taper_od"].includes(f.type) && !f.is_datum
    );
    const roughingGroups = this.groupByTool(odRoughFeatures, toolpathSelections);

    for (const [toolId, features] of roughingGroups) {
      // Sort by Z position for efficient cutting
      const sorted = features.sort((a, b) => a.z_start_mm - b.z_start_mm);
      for (const feature of sorted) {
        const toolpath = toolpathSelections.get(feature.id);
        if (toolpath) {
          operations.push({
            sequence: operations.length + 1,
            feature_id: feature.id,
            toolpath: toolpath.strategy,
            tool_id: toolId,
            reasoning: "OD roughing grouped by tool, sorted by Z",
            phase: "roughing",
            estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
          });
        }
      }
    }
    if (odRoughFeatures.length > 0) {
      optimizations.push("OD roughing grouped by tool to minimize tool changes");
    }

    // Phase 3: ID roughing (if any)
    const idFeatures = part.features.filter(f => ["cylinder_id", "taper_id"].includes(f.type));
    for (const feature of idFeatures.sort((a, b) => a.z_start_mm - b.z_start_mm)) {
      const toolpath = toolpathSelections.get(feature.id);
      if (toolpath) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: feature.id,
          toolpath: toolpath.strategy,
          tool_id: this.selectToolForOperation(toolpath.strategy, machine),
          reasoning: "ID roughing after OD to maintain rigidity",
          phase: "roughing",
          estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
        });
      }
    }

    // Phase 4: Drilling/center drill
    const drillFeatures = part.features.filter(f => ["center_hole", "cross_hole"].includes(f.type));
    for (const feature of drillFeatures) {
      const toolpath = toolpathSelections.get(feature.id);
      if (toolpath) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: feature.id,
          toolpath: toolpath.strategy,
          tool_id: this.selectToolForOperation(toolpath.strategy, machine),
          reasoning: "Drilling before finishing to avoid surface damage",
          phase: "secondary",
          estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
        });
      }
    }

    // Phase 5: Semi-finishing
    const semiFinishFeatures = part.features.filter(f =>
      f.tolerance_class === "precision" || f.tolerance_class === "ultra_precision"
    );
    // Add semi-finish passes for precision features
    for (const feature of semiFinishFeatures) {
      if (["cylinder_od", "cylinder_id", "taper_od", "taper_id"].includes(feature.type)) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: `${feature.id}_semi`,
          toolpath: feature.type.includes("id") ? "g70_id_finish" : "g70_od_finish",
          tool_id: this.selectToolForOperation("g70_od_finish", machine),
          reasoning: "Semi-finish pass for precision tolerance",
          phase: "semi_finish",
          estimated_cycle_time_sec: 30, // Estimate
        });
      }
    }

    // Phase 6: Finishing (all features needing finish pass)
    const finishFeatures = part.features.filter(f =>
      (f.surface_finish_ra && f.surface_finish_ra < 3.2) ||
      f.tolerance_class === "precision" ||
      f.tolerance_class === "ultra_precision"
    );
    for (const feature of finishFeatures) {
      operations.push({
        sequence: operations.length + 1,
        feature_id: `${feature.id}_finish`,
        toolpath: this.getFinishToolpath(feature.type),
        tool_id: this.selectToolForOperation("g70_od_finish", machine),
        reasoning: "Final finish pass for surface/tolerance requirements",
        phase: "finishing",
        estimated_cycle_time_sec: 20,
      });
    }

    // Phase 7: Grooving (before threading)
    const grooveFeatures = part.features.filter(f => f.type.includes("groove") || f.type === "undercut");
    for (const feature of grooveFeatures) {
      const toolpath = toolpathSelections.get(feature.id);
      if (toolpath) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: feature.id,
          toolpath: toolpath.strategy,
          tool_id: this.selectToolForOperation(toolpath.strategy, machine),
          reasoning: "Grooving/undercut before threading",
          phase: "secondary",
          estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
        });
      }
    }

    // Phase 8: Threading (late in sequence)
    const threadFeatures = part.features.filter(f => f.type.includes("thread"));
    for (const feature of threadFeatures) {
      const toolpath = toolpathSelections.get(feature.id);
      if (toolpath) {
        operations.push({
          sequence: operations.length + 1,
          feature_id: feature.id,
          toolpath: toolpath.strategy,
          tool_id: this.selectToolForOperation(toolpath.strategy, machine),
          reasoning: "Threading after most other operations to protect threads",
          phase: "secondary",
          estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
        });
      }
    }
    if (threadFeatures.length > 0) {
      optimizations.push("Threading sequenced late to protect thread quality");
    }

    // Phase 9: Live tooling (if any)
    const liveFeatures = part.features.filter(f => ["flat", "keyway", "polygon"].includes(f.type));
    if (liveFeatures.length > 0 && machine.has_live_tooling) {
      for (const feature of liveFeatures) {
        const toolpath = toolpathSelections.get(feature.id);
        if (toolpath) {
          operations.push({
            sequence: operations.length + 1,
            feature_id: feature.id,
            toolpath: toolpath.strategy,
            tool_id: this.selectToolForOperation(toolpath.strategy, machine),
            reasoning: "Live tooling operations grouped together",
            phase: "secondary",
            estimated_cycle_time_sec: this.estimateCycleTime(feature, toolpath),
          });
        }
      }
      optimizations.push("Live tooling operations grouped to minimize C-axis engagement cycles");
    }

    // Phase 10: Part-off (always last)
    const partoffFeature = part.features.find(f => f.type === "undercut" && f.z_end_mm <= 1);
    // Add implicit part-off if needed
    operations.push({
      sequence: operations.length + 1,
      feature_id: "partoff",
      toolpath: "part_off",
      tool_id: this.selectToolForOperation("part_off", machine),
      reasoning: "Part-off always last operation",
      phase: "secondary",
      estimated_cycle_time_sec: 15,
    });
    optimizations.push("Part-off sequenced last");

    // Calculate totals
    const toolChanges = this.countToolChanges(operations);
    const totalCycleTime = operations.reduce((sum, op) => sum + op.estimated_cycle_time_sec, 0);

    // Proactive suggestions
    const suggestions: string[] = [];
    if (toolChanges > 8) {
      suggestions.push(`Consider consolidating tools — ${toolChanges} tool changes is high`);
    }
    if (part.length_mm / part.max_od_mm > 4) {
      suggestions.push("Slender part (L/D > 4) — consider steady rest or reduced feeds");
    }
    if (part.features.filter(f => f.tolerance_class === "ultra_precision").length > 3) {
      suggestions.push("Multiple ultra-precision features — consider temperature stabilization");
    }

    return {
      operations,
      tool_changes: toolChanges,
      total_cycle_time_sec: totalCycleTime,
      reasoning,
      optimizations,
      suggestions,
    };
  }

  // ==========================================================================
  // WORKHOLDING INTELLIGENCE
  // ==========================================================================

  /**
   * Recommend workholding strategy with safety analysis.
   */
  recommendWorkholding(
    part: LathePartGeometry,
    machine: LatheMachineConfig,
    maxCuttingForce_N?: number
  ): WorkholdingRecommendation {
    log.info("[LatheCAMIntelligence] Analyzing workholding requirements");

    const reasoning: string[] = [];
    const slendernessRatio = part.length_mm / part.max_od_mm;
    const cuttingForce = maxCuttingForce_N || this.estimateMaxCuttingForce(part);

    // Decision criteria for workholding
    const criteria: DecisionCriterion[] = [
      { name: "grip_adequacy", weight: 0.35, goal: "maximize" },
      { name: "accessibility", weight: 0.25, goal: "maximize" },
      { name: "setup_time", weight: 0.15, goal: "minimize" },
      { name: "part_deformation_risk", weight: 0.25, goal: "minimize" },
    ];

    // Candidates
    type WorkholdingType = WorkholdingRecommendation["primary"]["type"];
    const candidates: Array<{ type: WorkholdingType; scores: Record<string, number> }> = [
      { type: "3_jaw_chuck", scores: { grip_adequacy: 0.7, accessibility: 0.8, setup_time: 0.9, part_deformation_risk: 0.3 } },
      { type: "6_jaw_chuck", scores: { grip_adequacy: 0.9, accessibility: 0.7, setup_time: 0.7, part_deformation_risk: 0.6 } },
      { type: "collet", scores: { grip_adequacy: 0.6, accessibility: 0.9, setup_time: 0.95, part_deformation_risk: 0.8 } },
      { type: "soft_jaws", scores: { grip_adequacy: 0.95, accessibility: 0.6, setup_time: 0.5, part_deformation_risk: 0.9 } },
    ];

    // Adjust scores based on part characteristics
    for (const cand of candidates) {
      // Thin wall parts need gentler grip
      if (part.min_id_mm > 0 && (part.max_od_mm - part.min_id_mm) < 3) {
        if (cand.type === "soft_jaws") cand.scores.grip_adequacy = 1.0;
        if (cand.type === "3_jaw_chuck") cand.scores.part_deformation_risk = 0.1;
      }
      // Large parts need more grip
      if (part.max_od_mm > machine.max_chuck_od_mm * 0.8) {
        if (cand.type === "collet") cand.scores.grip_adequacy = 0.3;
      }
      // Small parts favor collet
      if (part.max_od_mm < 30) {
        if (cand.type === "collet") cand.scores.grip_adequacy = 0.9;
      }
    }

    // Select best
    let bestType: WorkholdingType = "3_jaw_chuck";
    let bestScore = 0;
    for (const cand of candidates) {
      const score = criteria.reduce((sum, c) => sum + c.weight * cand.scores[c.name], 0);
      if (score > bestScore) {
        bestScore = score;
        bestType = cand.type;
      }
    }

    reasoning.push(`Selected ${bestType} based on part geometry (OD=${part.max_od_mm}mm, L/D=${slendernessRatio.toFixed(1)})`);

    // Grip parameters
    const gripDiameter = part.stock_od_mm;
    const gripLength = Math.min(part.length_mm * 0.3, 30); // 30% or 30mm max
    const requiredClampingForce = cuttingForce * 2.5 / 0.15; // SF=2.5, mu=0.15

    // Secondary support decision
    let secondary: WorkholdingRecommendation["secondary"];
    if (slendernessRatio > 3) {
      secondary = {
        type: "tailstock",
        position_mm: part.length_mm,
        force_n: 500,
      };
      reasoning.push(`Tailstock support required — L/D ratio ${slendernessRatio.toFixed(1)} > 3`);
    } else if (slendernessRatio > 5) {
      secondary = {
        type: "steady_rest",
        position_mm: part.length_mm / 2,
        force_n: 300,
      };
      reasoning.push(`Steady rest recommended — L/D ratio ${slendernessRatio.toFixed(1)} > 5`);
    }

    // Safety analysis
    const clampingForce_kN = requiredClampingForce / 1000;
    const safetyFactor = (clampingForce_kN * 1000 * 0.15) / cuttingForce;
    const ejectionRisk = safetyFactor < 2 ? "high" : safetyFactor < 2.5 ? "medium" : safetyFactor < 3 ? "low" : "none";
    const deflectionRisk = slendernessRatio > 5 ? "high" : slendernessRatio > 3 ? "medium" : slendernessRatio > 2 ? "low" : "none";

    const safetyRecommendations: string[] = [];
    if (ejectionRisk !== "none") {
      safetyRecommendations.push(`Increase clamping force or reduce cutting parameters`);
    }
    if (deflectionRisk !== "none") {
      safetyRecommendations.push(`Use tailstock/steady rest support`);
    }
    if (part.min_id_mm > 0 && (part.max_od_mm - part.min_id_mm) < 2) {
      safetyRecommendations.push("Thin-wall part — use soft jaws or mandrel to prevent deformation");
    }

    return {
      primary: {
        type: bestType,
        jaw_type: bestType === "soft_jaws" ? "soft" : "hard",
        grip_diameter_mm: gripDiameter,
        grip_length_mm: gripLength,
        clamping_force_kn: Math.ceil(clampingForce_kN),
      },
      secondary,
      safety: {
        adequate: safetyFactor >= 2.5,
        safety_factor: Math.round(safetyFactor * 10) / 10,
        ejection_risk: ejectionRisk as any,
        deflection_risk: deflectionRisk as any,
        recommendations: safetyRecommendations,
      },
      reasoning,
    };
  }

  // ==========================================================================
  // MRR/COST OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize cutting parameters for MRR vs cost tradeoff.
   */
  optimizeMRRCost(
    part: LathePartGeometry,
    machine: LatheMachineConfig,
    batchSize: number,
    availableTools?: AvailableTool[]
  ): MRRCostOptimization {
    log.info("[LatheCAMIntelligence] Optimizing MRR vs cost");

    const matParams = MATERIAL_PARAMS[part.iso_group] || MATERIAL_PARAMS.P;
    const stockVolume = Math.PI * Math.pow(part.stock_od_mm / 2, 2) * part.stock_length_mm;
    const partVolume = Math.PI * (Math.pow(part.max_od_mm / 2, 2) - Math.pow(part.min_id_mm / 2, 2)) * part.length_mm;
    const removalVolume = stockVolume - partVolume;

    // Base cutting parameters
    const baseVc = (matParams.vc_range[0] + matParams.vc_range[1]) / 2;
    const baseFeed = 0.25 * matParams.feed_factor;
    const baseDoc = 2.0 * matParams.doc_factor;

    // Tool cost estimate (per edge)
    const toolCostPerEdge = availableTools?.[0]?.cost_per_edge || 8; // $8 default
    const edgesPerInsert = availableTools?.[0]?.edges_per_insert || 4;

    // Calculate three scenarios
    const scenarios = {
      conservative: { vc_factor: 0.7, feed_factor: 0.7, doc_factor: 0.8, tool_life_factor: 2.0 },
      optimized: { vc_factor: 1.0, feed_factor: 1.0, doc_factor: 1.0, tool_life_factor: 1.0 },
      aggressive: { vc_factor: 1.3, feed_factor: 1.2, doc_factor: 1.2, tool_life_factor: 0.4 },
    };

    const results: Record<string, { mrr_mm3_min: number; tool_cost_per_part: number; cycle_time_sec: number; productivity_index: number }> = {};

    for (const [name, factors] of Object.entries(scenarios)) {
      const vc = baseVc * factors.vc_factor;
      const feed = baseFeed * factors.feed_factor;
      const doc = baseDoc * factors.doc_factor;

      // MRR = ap × f × Vc × 1000 (mm³/min for turning)
      const mrr = doc * feed * vc * 1000;

      // Cycle time (rough estimate)
      const cycleTime = (removalVolume / mrr) * 60; // seconds

      // Tool life (Taylor equation simplified)
      const baseToolLife = 20; // minutes at base conditions
      const toolLife = baseToolLife * factors.tool_life_factor;

      // Tool cost per part
      const partsPerEdge = toolLife / (cycleTime / 60);
      const toolCostPerPart = toolCostPerEdge / partsPerEdge;

      // Productivity index = MRR / cost
      const productivityIndex = mrr / (toolCostPerPart + 0.01);

      results[name] = {
        mrr_mm3_min: Math.round(mrr),
        tool_cost_per_part: Math.round(toolCostPerPart * 100) / 100,
        cycle_time_sec: Math.round(cycleTime),
        productivity_index: Math.round(productivityIndex),
      };
    }

    // Determine recommendation based on batch size
    let recommendation: "optimized" | "conservative" | "aggressive";
    const reasoning: string[] = [];

    if (batchSize < 10) {
      recommendation = "conservative";
      reasoning.push("Small batch — conservative parameters to minimize tool change risk");
    } else if (batchSize > 100) {
      recommendation = "aggressive";
      reasoning.push("Large batch — aggressive parameters justified by volume amortization");
    } else {
      recommendation = "optimized";
      reasoning.push("Medium batch — balanced parameters for cost/productivity");
    }

    // Batch breakpoints
    const batchBreakpoints = [
      { min_quantity: 1, recommended_strategy: "conservative", reason: "Setup time dominates — tool life priority" },
      { min_quantity: 20, recommended_strategy: "optimized", reason: "Balanced productivity/cost" },
      { min_quantity: 100, recommended_strategy: "aggressive", reason: "Volume justifies tool wear" },
      { min_quantity: 500, recommended_strategy: "aggressive", reason: "Maximum throughput — tools are consumable" },
    ];

    return {
      optimized: results.optimized,
      conservative: results.conservative,
      aggressive: results.aggressive,
      recommendation,
      reasoning,
      batch_breakpoints: batchBreakpoints,
    };
  }

  // ==========================================================================
  // COMPLETE ANALYSIS
  // ==========================================================================

  /**
   * Run complete CAM analysis for a lathe part.
   */
  analyzeComplete(
    part: LathePartGeometry,
    machine: LatheMachineConfig,
    options?: {
      batch_size?: number;
      priority?: "speed" | "cost" | "quality";
      similar_parts?: LathePartGeometry[];
    }
  ): LatheCAMAnalysis {
    log.info(`[LatheCAMIntelligence] Running complete analysis for part ${part.part_id}`);

    const batchSize = options?.batch_size || 1;
    const priority = options?.priority || "quality";

    // 1. Template recommendation
    const template = this.recommendParametricTemplate(part, options?.similar_parts);

    // 2. Toolpath selection for each feature
    const featureToolpaths = new Map<string, ToolpathRecommendation>();
    for (const feature of part.features) {
      const toolpath = this.selectToolpath(feature, part, machine, { batch_size: batchSize, priority });
      featureToolpaths.set(feature.id, toolpath);
    }

    // 3. Operation sequencing
    const sequence = this.sequenceOperations(part, machine, featureToolpaths);

    // 4. Workholding
    const workholding = this.recommendWorkholding(part, machine);

    // 5. MRR/Cost optimization
    const mrrCost = this.optimizeMRRCost(part, machine, batchSize);

    // 6. Generate prediction ID for learning
    const predictionId = `lathe_cam_${part.part_id}_${Date.now()}`;

    // 7. Summary
    const summary: string[] = [
      `Template: ${template.use_template ? template.template_type : "single_part"}`,
      `Operations: ${sequence.operations.length} (${sequence.tool_changes} tool changes)`,
      `Cycle time: ${Math.round(sequence.total_cycle_time_sec / 60)} min`,
      `Workholding: ${workholding.primary.type}${workholding.secondary ? ` + ${workholding.secondary.type}` : ""}`,
      `MRR strategy: ${mrrCost.recommendation} (${mrrCost[mrrCost.recommendation].mrr_mm3_min} mm³/min)`,
    ];

    if (sequence.suggestions.length > 0) {
      summary.push(`Suggestions: ${sequence.suggestions.length} proactive recommendations`);
    }

    // Log prediction for future learning integration
    log.info("[LatheCAMIntelligence] Analysis prediction recorded", {
      prediction_id: predictionId,
      domain: "lathe_cam",
      part_id: part.part_id,
      cycle_time_sec: sequence.total_cycle_time_sec,
      tool_changes: sequence.tool_changes,
      recommended_mrr: mrrCost[mrrCost.recommendation].mrr_mm3_min,
    });

    return {
      part_id: part.part_id,
      template,
      workholding,
      sequence,
      feature_toolpaths: featureToolpaths,
      mrr_cost: mrrCost,
      summary,
      prediction_id: predictionId,
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private assessPartComplexity(part: LathePartGeometry): "simple" | "moderate" | "complex" {
    const featureCount = part.features.length;
    const hasThreads = part.features.some(f => f.type.includes("thread"));
    const hasLiveTooling = part.features.some(f => ["cross_hole", "flat", "keyway", "polygon"].includes(f.type));
    const hasPrecision = part.features.some(f => f.tolerance_class === "ultra_precision");

    if (featureCount > 15 || (hasThreads && hasLiveTooling) || hasPrecision) return "complex";
    if (featureCount > 6 || hasThreads || hasLiveTooling) return "moderate";
    return "simple";
  }

  private hasMacroPatterns(part: LathePartGeometry): boolean {
    // Check for repetitive features
    const featureTypes = part.features.map(f => f.type);
    const typeCounts = new Map<string, number>();
    for (const type of featureTypes) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    return Array.from(typeCounts.values()).some(count => count >= 3);
  }

  private extractDimensionValue(part: LathePartGeometry, dim: string): number {
    if (dim.toLowerCase().includes("od")) return part.max_od_mm;
    if (dim.toLowerCase().includes("id")) return part.min_id_mm;
    if (dim.toLowerCase().includes("length")) return part.length_mm;
    return 0;
  }

  private inferDimensionRange(part: LathePartGeometry, similarParts: LathePartGeometry[] | undefined, dim: string): [number, number] {
    const values = [this.extractDimensionValue(part, dim)];
    if (similarParts) {
      for (const p of similarParts) {
        values.push(this.extractDimensionValue(p, dim));
      }
    }
    const min = Math.min(...values) * 0.8;
    const max = Math.max(...values) * 1.2;
    return [min, max];
  }

  private assessInterruptedCut(
    feature: LatheCADFeatureInstance,
    part: LathePartGeometry,
    strategy: LatheToolpathType
  ): { has_interruption: boolean; severity: "none" | "minor" | "moderate" | "severe"; mitigation: string[] } {
    const mitigation: string[] = [];

    // Check for cross-holes or flats that would interrupt the cut
    const crossFeatures = part.features.filter(f =>
      ["cross_hole", "flat", "keyway"].includes(f.type) &&
      f.z_start_mm >= feature.z_start_mm && f.z_end_mm <= feature.z_end_mm
    );

    if (crossFeatures.length === 0) {
      return { has_interruption: false, severity: "none", mitigation: [] };
    }

    // Calculate interruption percentage
    const featureLength = feature.z_end_mm - feature.z_start_mm;
    const interruptedLength = crossFeatures.reduce((sum, f) => sum + (f.width_mm || 10), 0);
    const interruptionRatio = interruptedLength / featureLength;

    let severity: "none" | "minor" | "moderate" | "severe" = "none";
    if (interruptionRatio > INTERRUPTED_CUT_THRESHOLDS.severe) {
      severity = "severe";
      mitigation.push("Consider carbide grade with high toughness (e.g., P20-P30)");
      mitigation.push("Reduce feed rate by 30-40% through interrupted section");
      mitigation.push("Increase cutting speed by 10-15% to reduce time in cut");
    } else if (interruptionRatio > INTERRUPTED_CUT_THRESHOLDS.moderate) {
      severity = "moderate";
      mitigation.push("Use tougher carbide grade");
      mitigation.push("Reduce feed rate by 20% through interrupted section");
    } else if (interruptionRatio > INTERRUPTED_CUT_THRESHOLDS.minor) {
      severity = "minor";
      mitigation.push("Monitor insert wear — expect slightly reduced tool life");
    }

    return { has_interruption: true, severity, mitigation };
  }

  private checkMachineCompatibility(strategy: LatheToolpathType, machine: LatheMachineConfig): boolean {
    if (strategy.startsWith("live_") || strategy === "c_axis_contour") {
      return machine.has_live_tooling && machine.has_c_axis;
    }
    return true;
  }

  private estimateCycleTimeScore(strategy: LatheToolpathType, feature: LatheCADFeatureInstance, part: LathePartGeometry): number {
    // Canned cycles are faster
    if (strategy.startsWith("g7")) return 0.8;
    if (strategy.includes("live")) return 0.5; // Live tooling is slower
    return 0.6;
  }

  private estimateToolCostScore(strategy: LatheToolpathType, feature: LatheCADFeatureInstance, part: LathePartGeometry): number {
    // Standard inserts are cheaper
    if (["g71_od_rough", "g70_od_finish", "face_turn"].includes(strategy)) return 0.8;
    if (strategy.includes("thread")) return 0.5; // Threading inserts more expensive
    if (strategy.includes("groove")) return 0.6;
    return 0.7;
  }

  private estimateSurfaceQualityScore(strategy: LatheToolpathType, feature: LatheCADFeatureInstance): number {
    if (strategy.includes("finish") || strategy === "g70_od_finish" || strategy === "g70_id_finish") return 0.9;
    if (strategy.includes("rough")) return 0.3;
    return 0.6;
  }

  private getApproachStrategy(strategy: LatheToolpathType, feature: LatheCADFeatureInstance): string {
    if (strategy.includes("rough")) return "plunge_at_angle";
    if (strategy.includes("groove")) return "radial_plunge";
    if (strategy.includes("thread")) return "flank_infeed";
    return "tangent_approach";
  }

  private getRetractStrategy(strategy: LatheToolpathType, feature: LatheCADFeatureInstance): string {
    if (strategy.includes("rough")) return "rapid_retract";
    if (strategy.includes("finish")) return "tangent_exit";
    return "rapid_retract";
  }

  private selectToolForOperation(strategy: LatheToolpathType, machine: LatheMachineConfig): string {
    // Simple tool selection based on operation type
    if (strategy.includes("rough") || strategy.includes("profile") || strategy === "face_turn") return "T01";
    if (strategy.includes("finish")) return "T02";
    if (strategy.includes("groove") || strategy === "part_off") return "T03";
    if (strategy.includes("thread")) return "T04";
    if (strategy.includes("drill") || strategy === "center_drill") return "T05";
    if (strategy.includes("bore")) return "T06";
    if (strategy.includes("live")) return "T10";
    return "T01";
  }

  private estimateCycleTime(feature: LatheCADFeatureInstance, toolpath: ToolpathRecommendation): number {
    const length = Math.abs(feature.z_end_mm - feature.z_start_mm) || 10;
    const diameter = feature.diameter_mm || feature.diameter_start_mm || 50;
    const circumference = Math.PI * diameter;

    // Rough estimate: (length * circumference) / (feed * cutting_speed * 1000)
    const feedRate = toolpath.parameters.feed_mm_rev * toolpath.parameters.cutting_speed_m_min * 1000 / circumference;
    return Math.max(10, Math.round(length / feedRate * 60));
  }

  private getFinishToolpath(featureType: LatheCADFeature): LatheToolpathType {
    if (featureType.includes("id") || featureType === "cylinder_id") return "g70_id_finish";
    return "g70_od_finish";
  }

  private groupByTool(
    features: LatheCADFeatureInstance[],
    toolpaths: Map<string, ToolpathRecommendation>
  ): Map<string, LatheCADFeatureInstance[]> {
    const groups = new Map<string, LatheCADFeatureInstance[]>();
    for (const feature of features) {
      const toolpath = toolpaths.get(feature.id);
      const toolId = toolpath?.parameters.tool_recommendation || "T01";
      if (!groups.has(toolId)) groups.set(toolId, []);
      groups.get(toolId)!.push(feature);
    }
    return groups;
  }

  private countToolChanges(operations: OperationSequenceRecommendation["operations"]): number {
    let changes = 0;
    let lastTool = "";
    for (const op of operations) {
      if (op.tool_id !== lastTool) {
        changes++;
        lastTool = op.tool_id;
      }
    }
    return Math.max(0, changes - 1); // First tool doesn't count as a change
  }

  private estimateMaxCuttingForce(part: LathePartGeometry): number {
    // Kienzle estimate: Fc = kc1.1 * ap * f^(1-mc)
    const kc11 = part.iso_group === "P" ? 1800 : part.iso_group === "M" ? 2100 : part.iso_group === "H" ? 3200 : 1500;
    const mc = 0.25;
    const ap = 2.0; // 2mm DOC
    const f = 0.25; // 0.25mm/rev feed

    return kc11 * ap * Math.pow(f, 1 - mc);
  }
}

// Export singleton
export const latheCAMIntelligenceEngine = new LatheCAMIntelligenceEngine();
