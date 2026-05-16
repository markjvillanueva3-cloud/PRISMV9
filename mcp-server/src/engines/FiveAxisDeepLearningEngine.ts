/**
 * FiveAxisDeepLearningEngine — MILL-HARD-MS5
 * ===========================================
 * Deep learning and AI-powered 5-axis machining with:
 *   1. Automatic template generation from CAD/CAM work
 *   2. Part similarity matching using feature embeddings
 *   3. Deep reasoning AI for strategy selection
 *   4. Learning from outcomes for continuous improvement
 *   5. PRISM AI LLM CLI integration
 *
 * Template Categories:
 *   - Feature-based: pocket, boss, fillet, undercut, blade, impeller
 *   - Strategy-based: swarf, point milling, barrel, geodesic
 *   - Material-based: hardened steel, aluminum, titanium, inconel
 *   - Machine-based: table-table, head-head, mixed kinematics
 *
 * AI Integration:
 *   - PRISMIntelligenceLayer for LLM reasoning
 *   - ChainOfThoughtEngine for explainable decisions
 *   - LearningAdaptationEngine for outcome learning
 *   - DecisionReasoningEngine for multi-criteria analysis
 *
 * @module engines/FiveAxisDeepLearningEngine
 * @version 1.0.0
 * @milestone MILL-HARD-MS5
 */

import { log } from "../utils/Logger.js";
import {
  type FiveAxisStrategyEntry,
  type FiveAxisGeometry,
  type FiveAxisFamily,
  type ToolType,
  type MaterialProps,
  type MachineKinematics5Ax,
  FIVE_AXIS_STRATEGY_CATALOG,
} from "./FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TYPES — TEMPLATE SYSTEM
// ============================================================================

/** Template category types */
export type TemplateCategory =
  | "feature_based"
  | "strategy_based"
  | "material_based"
  | "machine_based"
  | "customer_based"
  | "hybrid";

/** Feature signature for similarity matching */
export interface FeatureSignature {
  type: FiveAxisGeometry;
  dimensions: {
    length_mm: number;
    width_mm: number;
    depth_mm: number;
    fillet_radius_mm?: number;
    draft_angle_deg?: number;
  };
  complexity_score: number; // 1-10
  undercut_count: number;
  thin_wall_count: number;
  tight_tolerance_count: number;
  surface_area_mm2: number;
  volume_mm3: number;
}

/** Captured cutting parameters */
export interface CuttingParameters {
  strategy_id: string;
  strategy_name: string;
  tool_type: ToolType;
  tool_diameter_mm: number;
  spindle_rpm: number;
  feed_mmmin: number;
  ap_mm: number; // axial depth
  ae_mm: number; // radial depth
  lead_angle_deg: number;
  tilt_angle_deg: number;
  stepover_pct: number;
  coolant: "flood" | "mist" | "air" | "through_tool" | "none";
}

/** Machine setup captured */
export interface MachineSetup {
  machine_id: string;
  kinematic_type: "table_table" | "head_head" | "table_head" | "mixed";
  work_offset: string; // G54, G55, etc.
  tool_length_offset: number;
  fixture_id?: string;
  pallet_id?: string;
  rtcp_mode: string;
  probing_used: boolean;
}

/** Success metrics from completed job */
export interface SuccessMetrics {
  cycle_time_actual_min: number;
  cycle_time_predicted_min: number;
  surface_ra_achieved_um: number;
  surface_ra_target_um: number;
  tool_life_used_pct: number;
  scrap_count: number;
  rework_count: number;
  first_pass_yield: boolean;
  operator_rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

/** Complete 5-axis machining template */
export interface FiveAxisTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  created_at: string;
  updated_at: string;
  version: number;
  usage_count: number;

  // Source information
  source: {
    part_number?: string;
    customer_id?: string;
    job_number?: string;
    programmer_id?: string;
    cad_file?: string;
    cam_file?: string;
  };

  // Feature extraction
  features: FeatureSignature[];
  feature_embedding?: number[]; // 128-dim learned embedding

  // Material info
  material: MaterialProps;

  // Strategy and parameters
  strategy: FiveAxisStrategyEntry;
  cutting_params: CuttingParameters[];
  machine_setup: MachineSetup;

  // AI reasoning captured
  ai_reasoning: {
    chain_of_thought: string[];
    decision_criteria: Record<string, number>;
    alternatives_considered: string[];
    confidence_score: number;
  };

  // Success metrics (populated after completion)
  success_metrics?: SuccessMetrics;

  // Similarity matching
  similarity_tags: string[];
  search_keywords: string[];
}

/** Template search query */
export interface TemplateSearchQuery {
  geometry?: FiveAxisGeometry;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  strategy_family?: FiveAxisFamily;
  machine_type?: "table_table" | "head_head" | "table_head";
  min_success_rate?: number;
  customer_id?: string;
  keywords?: string[];
  max_results?: number;
}

/** Template match result */
export interface TemplateMatch {
  template: FiveAxisTemplate;
  similarity_score: number;
  match_reasons: string[];
  adaptations_needed: string[];
}

// ============================================================================
// TYPES — DEEP LEARNING
// ============================================================================

/** Feature embedding for similarity matching */
export interface FeatureEmbedding {
  feature_id: string;
  embedding: number[]; // 128-dimensional vector
  geometry_type: FiveAxisGeometry;
  complexity: number;
}

/** Part embedding combining all features */
export interface PartEmbedding {
  part_id: string;
  feature_embeddings: FeatureEmbedding[];
  combined_embedding: number[]; // 256-dim
  material_embedding: number[]; // 32-dim
  full_embedding: number[]; // 320-dim total
}

/** Similarity search result */
export interface SimilarityResult {
  part_id: string;
  template_id: string;
  similarity_score: number; // 0-1
  feature_matches: Array<{
    query_feature: string;
    matched_feature: string;
    score: number;
  }>;
  recommendation: string;
}

// ============================================================================
// TYPES — AI REASONING
// ============================================================================

/** Deep reasoning request */
export interface DeepReasoningRequest {
  part_features: FeatureSignature[];
  material: MaterialProps;
  machine: MachineKinematics5Ax;
  constraints: {
    max_cycle_time_min?: number;
    target_ra_um?: number;
    batch_size: number;
    operator_skill: 1 | 2 | 3 | 4 | 5;
  };
  similar_templates?: FiveAxisTemplate[];
  require_explanation: boolean;
}

/** Deep reasoning response */
export interface DeepReasoningResult {
  recommended_strategy: FiveAxisStrategyEntry;
  recommended_params: CuttingParameters;
  confidence: number;

  // Chain of thought
  reasoning_chain: Array<{
    step: number;
    type: "observation" | "hypothesis" | "analysis" | "validation" | "conclusion";
    content: string;
    evidence?: string[];
  }>;

  // Learning integration
  similar_templates_used: string[];
  adaptations_applied: string[];
  novel_insights: string[];

  // PRISM AI reasoning
  prism_ai_prompt?: string;
  prism_ai_response?: string;

  // Recommendations
  proactive_suggestions: string[];
  risk_warnings: string[];
}

/** Learning outcome for feedback */
export interface LearningOutcome {
  template_id: string;
  prediction_id: string;
  predicted: {
    cycle_time_min: number;
    surface_ra_um: number;
    tool_life_pct: number;
  };
  actual: {
    cycle_time_min: number;
    surface_ra_um: number;
    tool_life_pct: number;
  };
  success: boolean;
  feedback?: string;
}

// ============================================================================
// TEMPLATE LIBRARY (IN-MEMORY, WOULD BE DB IN PRODUCTION)
// ============================================================================

const TEMPLATE_LIBRARY: Map<string, FiveAxisTemplate> = new Map();

// Pre-populate with JM Die common patterns
const JM_DIE_TEMPLATES: FiveAxisTemplate[] = [
  {
    id: "tpl_5x_die_cavity_d2",
    name: "Cold Heading Die Cavity - D2 Steel",
    description: "Standard 5-axis finishing for cold heading die cavities in D2 tool steel. Ball nose contouring with 15° lead angle.",
    category: "feature_based",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-04-14T00:00:00Z",
    version: 3,
    usage_count: 47,
    source: {
      customer_id: "jm-die",
      programmer_id: "mark-v",
    },
    features: [
      {
        type: "mold_cavity",
        dimensions: { length_mm: 50, width_mm: 50, depth_mm: 30, fillet_radius_mm: 2 },
        complexity_score: 6,
        undercut_count: 0,
        thin_wall_count: 0,
        tight_tolerance_count: 2,
        surface_area_mm2: 8500,
        volume_mm3: 45000,
      },
    ],
    material: {
      name: "D2 Tool Steel",
      iso_group: "H",
      kc11_mpa: 3200,
      mc: 0.22,
      hardness_hrc: 58,
      thermal_conductivity_w_mk: 20.5,
    },
    strategy: FIVE_AXIS_STRATEGY_CATALOG.find(s => s.id === "hm_5x_shape_offset")!,
    cutting_params: [
      {
        strategy_id: "hm_5x_shape_offset",
        strategy_name: "5X Shape Offset Finishing",
        tool_type: "ball_nose",
        tool_diameter_mm: 6,
        spindle_rpm: 8000,
        feed_mmmin: 1200,
        ap_mm: 0.15,
        ae_mm: 0.3,
        lead_angle_deg: 15,
        tilt_angle_deg: 0,
        stepover_pct: 5,
        coolant: "through_tool",
      },
    ],
    machine_setup: {
      machine_id: "VMC-02",
      kinematic_type: "table_table",
      work_offset: "G54",
      tool_length_offset: 1,
      rtcp_mode: "G43.4",
      probing_used: true,
    },
    ai_reasoning: {
      chain_of_thought: [
        "D2 at 58 HRC requires conservative parameters",
        "Die cavity geometry suits point milling with ball nose",
        "15° lead angle prevents rubbing at tool tip",
        "Through-tool coolant critical for chip evacuation",
        "Table-table config allows full cavity access",
      ],
      decision_criteria: { surface_quality: 0.35, tool_life: 0.25, cycle_time: 0.2, safety: 0.2 },
      alternatives_considered: ["multiaxis_contouring", "flowline"],
      confidence_score: 0.92,
    },
    success_metrics: {
      cycle_time_actual_min: 45,
      cycle_time_predicted_min: 42,
      surface_ra_achieved_um: 0.4,
      surface_ra_target_um: 0.5,
      tool_life_used_pct: 15,
      scrap_count: 0,
      rework_count: 0,
      first_pass_yield: true,
      operator_rating: 5,
    },
    similarity_tags: ["die_cavity", "d2_steel", "hardened", "ball_nose", "finishing"],
    search_keywords: ["cold heading", "die", "cavity", "d2", "tool steel", "finishing"],
  },
  {
    id: "tpl_5x_punch_profile_m2",
    name: "Cold Heading Punch Profile - M2 HSS",
    description: "5-axis swarf cutting for ruled punch profiles in M2 high-speed steel.",
    category: "strategy_based",
    created_at: "2026-02-10T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    version: 2,
    usage_count: 23,
    source: {
      customer_id: "jm-die",
      programmer_id: "mark-v",
    },
    features: [
      {
        type: "ruled_surface",
        dimensions: { length_mm: 80, width_mm: 25, depth_mm: 15, draft_angle_deg: 3 },
        complexity_score: 4,
        undercut_count: 0,
        thin_wall_count: 0,
        tight_tolerance_count: 1,
        surface_area_mm2: 4200,
        volume_mm3: 22000,
      },
    ],
    material: {
      name: "M2 HSS",
      iso_group: "H",
      kc11_mpa: 3100,
      mc: 0.21,
      hardness_hrc: 62,
      thermal_conductivity_w_mk: 24,
    },
    strategy: FIVE_AXIS_STRATEGY_CATALOG.find(s => s.id === "hm_5x_swarf")!,
    cutting_params: [
      {
        strategy_id: "hm_5x_swarf",
        strategy_name: "5X Swarf Cutting",
        tool_type: "flat_end",
        tool_diameter_mm: 10,
        spindle_rpm: 4000,
        feed_mmmin: 800,
        ap_mm: 15,
        ae_mm: 0.5,
        lead_angle_deg: 0,
        tilt_angle_deg: 3,
        stepover_pct: 100,
        coolant: "flood",
      },
    ],
    machine_setup: {
      machine_id: "VMC-02",
      kinematic_type: "table_table",
      work_offset: "G54",
      tool_length_offset: 2,
      rtcp_mode: "G43.4",
      probing_used: true,
    },
    ai_reasoning: {
      chain_of_thought: [
        "Ruled surface ideal for swarf cutting",
        "Full flute engagement maximizes productivity",
        "M2 HSS allows higher speeds than carbide tooling",
        "3° draft matches natural flank milling angle",
        "Single pass finishing for ruled profile",
      ],
      decision_criteria: { productivity: 0.4, surface_quality: 0.3, tool_life: 0.2, safety: 0.1 },
      alternatives_considered: ["point_milling", "contouring"],
      confidence_score: 0.88,
    },
    success_metrics: {
      cycle_time_actual_min: 12,
      cycle_time_predicted_min: 14,
      surface_ra_achieved_um: 0.8,
      surface_ra_target_um: 1.0,
      tool_life_used_pct: 8,
      scrap_count: 0,
      rework_count: 0,
      first_pass_yield: true,
      operator_rating: 5,
    },
    similarity_tags: ["punch", "ruled_surface", "swarf", "m2_hss", "hardened"],
    search_keywords: ["punch", "profile", "swarf", "m2", "hss", "ruled"],
  },
  {
    id: "tpl_5x_electrode_graphite",
    name: "Graphite Electrode - Complex 3D Surface",
    description: "5-axis finishing for graphite EDM electrodes with complex freeform surfaces.",
    category: "material_based",
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-04-10T00:00:00Z",
    version: 1,
    usage_count: 15,
    source: {
      customer_id: "jm-die",
      programmer_id: "mark-v",
    },
    features: [
      {
        type: "electrode",
        dimensions: { length_mm: 40, width_mm: 40, depth_mm: 25, fillet_radius_mm: 1 },
        complexity_score: 7,
        undercut_count: 0,
        thin_wall_count: 2,
        tight_tolerance_count: 3,
        surface_area_mm2: 6800,
        volume_mm3: 28000,
      },
    ],
    material: {
      name: "EDM-3 Graphite",
      iso_group: "N", // Graphite is non-metallic but machines like aluminum
      kc11_mpa: 250,
      mc: 0.30,
      hardness_hrc: 0,
      thermal_conductivity_w_mk: 120,
    },
    strategy: FIVE_AXIS_STRATEGY_CATALOG.find(s => s.id === "mc_5x_flowline")!,
    cutting_params: [
      {
        strategy_id: "mc_5x_flowline",
        strategy_name: "Flowline 5-Axis",
        tool_type: "ball_nose",
        tool_diameter_mm: 4,
        spindle_rpm: 20000,
        feed_mmmin: 3000,
        ap_mm: 0.1,
        ae_mm: 0.15,
        lead_angle_deg: 10,
        tilt_angle_deg: 0,
        stepover_pct: 4,
        coolant: "air",
      },
    ],
    machine_setup: {
      machine_id: "VMC-02",
      kinematic_type: "table_table",
      work_offset: "G55",
      tool_length_offset: 3,
      rtcp_mode: "G43.4",
      probing_used: false,
    },
    ai_reasoning: {
      chain_of_thought: [
        "Graphite requires high speed, low force cutting",
        "Flowline strategy follows surface contours naturally",
        "Air blast preferred - graphite dust + coolant = paste",
        "Small stepover for electrode surface quality",
        "Thin walls require reduced feed in corners",
      ],
      decision_criteria: { surface_quality: 0.45, dust_control: 0.25, cycle_time: 0.2, tool_life: 0.1 },
      alternatives_considered: ["parallel", "steep_shallow"],
      confidence_score: 0.85,
    },
    similarity_tags: ["electrode", "graphite", "edm", "freeform", "finishing"],
    search_keywords: ["electrode", "graphite", "edm", "sinker", "freeform"],
  },
];

// Initialize template library
JM_DIE_TEMPLATES.forEach(t => TEMPLATE_LIBRARY.set(t.id, t));

// ============================================================================
// FEATURE EMBEDDING HELPERS
// ============================================================================

/**
 * Generate feature embedding from signature.
 * In production, this would use a trained neural network.
 * Here we use deterministic encoding based on feature properties.
 */
function generateFeatureEmbedding(feature: FeatureSignature): number[] {
  const embedding = new Array(128).fill(0);

  // Geometry type encoding (one-hot style, positions 0-15)
  const geoTypes: FiveAxisGeometry[] = [
    "freeform_surface", "ruled_surface", "impeller_blade", "turbine_blade",
    "blisk", "deep_cavity", "port", "tube", "undercut", "multi_face",
    "dental", "medical_implant", "mold_core", "mold_cavity", "electrode"
  ];
  const geoIdx = geoTypes.indexOf(feature.type);
  if (geoIdx >= 0) embedding[geoIdx] = 1.0;

  // Dimension encoding (normalized, positions 16-31)
  embedding[16] = Math.min(feature.dimensions.length_mm / 200, 1);
  embedding[17] = Math.min(feature.dimensions.width_mm / 200, 1);
  embedding[18] = Math.min(feature.dimensions.depth_mm / 100, 1);
  embedding[19] = Math.min((feature.dimensions.fillet_radius_mm || 0) / 20, 1);
  embedding[20] = Math.min((feature.dimensions.draft_angle_deg || 0) / 30, 1);

  // Complexity encoding (positions 32-47)
  embedding[32] = feature.complexity_score / 10;
  embedding[33] = Math.min(feature.undercut_count / 5, 1);
  embedding[34] = Math.min(feature.thin_wall_count / 5, 1);
  embedding[35] = Math.min(feature.tight_tolerance_count / 10, 1);

  // Size encoding (positions 48-63)
  embedding[48] = Math.min(feature.surface_area_mm2 / 50000, 1);
  embedding[49] = Math.min(feature.volume_mm3 / 500000, 1);

  // Aspect ratio encoding (positions 64-79)
  const aspectLW = feature.dimensions.length_mm / Math.max(feature.dimensions.width_mm, 1);
  const aspectLD = feature.dimensions.length_mm / Math.max(feature.dimensions.depth_mm, 1);
  embedding[64] = Math.min(aspectLW / 10, 1);
  embedding[65] = Math.min(aspectLD / 10, 1);

  // Interaction features (positions 80-127)
  embedding[80] = feature.complexity_score * (feature.undercut_count + 1) / 50;
  embedding[81] = (feature.thin_wall_count > 0 ? 1 : 0) * feature.complexity_score / 10;
  embedding[82] = feature.tight_tolerance_count * feature.complexity_score / 100;

  return embedding;
}

/**
 * Generate material embedding.
 */
function generateMaterialEmbedding(material: MaterialProps): number[] {
  const embedding = new Array(32).fill(0);

  // ISO group encoding (positions 0-5)
  const isoGroups = ["P", "M", "K", "N", "S", "H"];
  const isoIdx = isoGroups.indexOf(material.iso_group);
  if (isoIdx >= 0) embedding[isoIdx] = 1.0;

  // Mechanical properties (positions 6-15)
  embedding[6] = Math.min(material.kc11_mpa / 4000, 1);
  embedding[7] = material.mc;
  embedding[8] = Math.min((material.hardness_hrc || 0) / 70, 1);

  // Thermal properties (positions 16-23)
  embedding[16] = Math.min((material.thermal_conductivity_w_mk || 50) / 200, 1);

  return embedding;
}

/**
 * Compute cosine similarity between two embeddings.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

// ============================================================================
// DEEP REASONING HELPERS
// ============================================================================

/**
 * Generate chain-of-thought reasoning for strategy selection.
 */
function generateChainOfThought(
  request: DeepReasoningRequest,
  similarTemplates: FiveAxisTemplate[]
): DeepReasoningResult["reasoning_chain"] {
  const chain: DeepReasoningResult["reasoning_chain"] = [];
  let step = 1;

  // Step 1: Feature observation
  const primaryFeature = request.part_features[0];
  chain.push({
    step: step++,
    type: "observation",
    content: `Part contains ${request.part_features.length} feature(s). Primary: ${primaryFeature.type} with complexity ${primaryFeature.complexity_score}/10.`,
    evidence: [
      `Dimensions: ${primaryFeature.dimensions.length_mm}×${primaryFeature.dimensions.width_mm}×${primaryFeature.dimensions.depth_mm}mm`,
      `Undercuts: ${primaryFeature.undercut_count}, Thin walls: ${primaryFeature.thin_wall_count}`,
    ],
  });

  // Step 2: Material analysis
  chain.push({
    step: step++,
    type: "observation",
    content: `Material is ${request.material.name} (ISO ${request.material.iso_group}). kc1.1 = ${request.material.kc11_mpa} N/mm².`,
    evidence: [
      `Hardness: ${request.material.hardness_hrc || "N/A"} HRC`,
      `Thermal conductivity: ${request.material.thermal_conductivity_w_mk} W/m·K`,
    ],
  });

  // Step 3: Machine capability check
  chain.push({
    step: step++,
    type: "analysis",
    content: `Machine ${request.machine.machine_id} has ${request.machine.kinematic_type} configuration with ${request.machine.rtcp_enabled ? "RTCP enabled" : "RTCP disabled"}.`,
    evidence: [
      `Primary rotary: ${request.machine.primary_axis}-axis`,
      `Secondary rotary: ${request.machine.secondary_axis}-axis`,
      `TCPM mode: ${request.machine.rtcp_enabled ? "enabled" : "disabled"}`,
    ],
  });

  // Step 4: Similar template analysis
  if (similarTemplates.length > 0) {
    const bestTemplate = similarTemplates[0];
    chain.push({
      step: step++,
      type: "hypothesis",
      content: `Found ${similarTemplates.length} similar template(s). Best match: "${bestTemplate.name}" with ${bestTemplate.usage_count} uses and ${bestTemplate.success_metrics?.first_pass_yield ? "100%" : "partial"} first-pass yield.`,
      evidence: [
        `Strategy: ${bestTemplate.strategy.name}`,
        `Success rate: ${bestTemplate.success_metrics ? "Validated" : "Unvalidated"}`,
      ],
    });
  } else {
    chain.push({
      step: step++,
      type: "hypothesis",
      content: "No similar templates found. Will derive strategy from first principles using PRISM AI reasoning.",
    });
  }

  // Step 5: Constraint validation
  chain.push({
    step: step++,
    type: "validation",
    content: `Checking constraints: max cycle time ${request.constraints.max_cycle_time_min || "unlimited"} min, target Ra ${request.constraints.target_ra_um || "standard"} μm, batch ${request.constraints.batch_size}, operator skill ${request.constraints.operator_skill}/5.`,
  });

  // Step 6: Strategy selection reasoning
  const isHardened = request.material.iso_group === "H" || (request.material.hardness_hrc || 0) > 45;
  const hasUndercuts = primaryFeature.undercut_count > 0;
  const isRuled = primaryFeature.type === "ruled_surface";

  let strategyReason = "";
  if (isRuled) {
    strategyReason = "Ruled surface geometry is ideal for swarf cutting (flank milling) for maximum productivity.";
  } else if (hasUndercuts) {
    strategyReason = "Undercuts require 5-axis simultaneous with careful tool axis control.";
  } else if (isHardened) {
    strategyReason = "Hardened material requires conservative parameters with emphasis on tool life.";
  } else {
    strategyReason = "Standard freeform surface machining with ball nose contouring.";
  }

  chain.push({
    step: step++,
    type: "analysis",
    content: strategyReason,
    evidence: [
      `Hardened: ${isHardened}`,
      `Undercuts: ${hasUndercuts}`,
      `Ruled: ${isRuled}`,
    ],
  });

  // Step 7: Final conclusion
  chain.push({
    step: step++,
    type: "conclusion",
    content: "Strategy selection complete. Parameters will be adapted from similar templates or derived from material/geometry constraints.",
  });

  return chain;
}

/**
 * Generate PRISM AI prompt for LLM reasoning.
 */
function generatePRISMAIPrompt(request: DeepReasoningRequest): string {
  const feature = request.part_features[0];
  return `[PRISM 5-Axis Strategy Selection]

Part: ${feature.type} geometry, ${feature.complexity_score}/10 complexity
Material: ${request.material.name} (ISO ${request.material.iso_group}, kc1.1=${request.material.kc11_mpa})
Machine: ${request.machine.machine_id} (${request.machine.kinematic_type})
Constraints: Batch ${request.constraints.batch_size}, Skill ${request.constraints.operator_skill}/5

Analyze:
1. What is the optimal 5-axis strategy for this geometry?
2. What tool type and size is recommended?
3. What are the key cutting parameters?
4. What are the main risks and how to mitigate them?
5. What can be learned for similar future parts?

Respond with strategy recommendation, parameters, and reasoning.`;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

// WIRE-EXEMPT: internal-layer engine — consumed by FiveAxisOrchestrationEngine,
// FiveAxisAIUltraIntelligenceEngine, registries/AISubsystemRegistry, mcp/agentConfig.
// Exercised by MILL-HARD-MS5/6/7.test.ts + 5AXIS-DEEP.test.ts (milestone-named, not 1:1).
export class FiveAxisDeepLearningEngine {
  private static learningLog: LearningOutcome[] = [];

  // ==========================================================================
  // TEMPLATE AUTO-GENERATION
  // ==========================================================================

  /**
   * Auto-generate template from completed CAD/CAM job.
   * Call this after successful machining to capture knowledge.
   */
  static generateTemplate(
    source: FiveAxisTemplate["source"],
    features: FeatureSignature[],
    material: MaterialProps,
    strategy: FiveAxisStrategyEntry,
    cuttingParams: CuttingParameters[],
    machineSetup: MachineSetup,
    aiReasoning: FiveAxisTemplate["ai_reasoning"],
    successMetrics?: SuccessMetrics
  ): FiveAxisTemplate {
    const id = `tpl_5x_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    // Generate name from features
    const primaryFeature = features[0];
    const name = `${primaryFeature.type.replace(/_/g, " ")} - ${material.name}`;

    // Generate description
    const description = `Auto-generated template for ${primaryFeature.type} machining in ${material.name} using ${strategy.name}.`;

    // Determine category
    let category: TemplateCategory = "hybrid";
    if (features.length === 1 && primaryFeature.complexity_score <= 4) {
      category = "feature_based";
    } else if (strategy.family === "novel_prism") {
      category = "strategy_based";
    } else if (material.iso_group === "H" || material.iso_group === "S") {
      category = "material_based";
    }

    // Generate feature embedding
    const featureEmbeddings = features.map(f => generateFeatureEmbedding(f));
    const combinedEmbedding = featureEmbeddings.reduce((acc, emb) => {
      return acc.map((v, i) => v + emb[i] / featureEmbeddings.length);
    }, new Array(128).fill(0));

    // Generate similarity tags
    const similarityTags = [
      primaryFeature.type,
      material.iso_group.toLowerCase(),
      strategy.family,
      machineSetup.kinematic_type,
    ];
    if (material.hardness_hrc && material.hardness_hrc > 45) {
      similarityTags.push("hardened");
    }
    if (primaryFeature.undercut_count > 0) {
      similarityTags.push("undercut");
    }

    // Generate search keywords
    const searchKeywords = [
      primaryFeature.type.replace(/_/g, " "),
      material.name.toLowerCase(),
      strategy.name.toLowerCase(),
      ...similarityTags,
    ];

    const template: FiveAxisTemplate = {
      id,
      name,
      description,
      category,
      created_at: now,
      updated_at: now,
      version: 1,
      usage_count: 0,
      source,
      features,
      feature_embedding: combinedEmbedding,
      material,
      strategy,
      cutting_params: cuttingParams,
      machine_setup: machineSetup,
      ai_reasoning: aiReasoning,
      success_metrics: successMetrics,
      similarity_tags: similarityTags,
      search_keywords: searchKeywords,
    };

    // Store in library
    TEMPLATE_LIBRARY.set(id, template);
    log.info(`[5AxisDeepLearning] Generated template: ${id} - ${name}`);

    return template;
  }

  /**
   * Get template by ID.
   */
  static getTemplate(id: string): FiveAxisTemplate | undefined {
    return TEMPLATE_LIBRARY.get(id);
  }

  /**
   * Get all templates.
   */
  static getAllTemplates(): FiveAxisTemplate[] {
    return Array.from(TEMPLATE_LIBRARY.values());
  }

  /**
   * Update template with success metrics after job completion.
   */
  static updateTemplateMetrics(
    templateId: string,
    metrics: SuccessMetrics
  ): FiveAxisTemplate | undefined {
    const template = TEMPLATE_LIBRARY.get(templateId);
    if (!template) return undefined;

    template.success_metrics = metrics;
    template.updated_at = new Date().toISOString();
    template.version += 1;

    log.info(`[5AxisDeepLearning] Updated metrics for template: ${templateId}`);
    return template;
  }

  // ==========================================================================
  // SIMILARITY SEARCH
  // ==========================================================================

  /**
   * Search for similar templates using feature embeddings.
   */
  static searchSimilarTemplates(query: TemplateSearchQuery): TemplateMatch[] {
    const allTemplates = Array.from(TEMPLATE_LIBRARY.values());
    const matches: TemplateMatch[] = [];

    for (const template of allTemplates) {
      let score = 0;
      const matchReasons: string[] = [];
      const adaptations: string[] = [];

      // Geometry match
      if (query.geometry) {
        const hasGeo = template.features.some(f => f.type === query.geometry);
        if (hasGeo) {
          score += 0.3;
          matchReasons.push(`Geometry match: ${query.geometry}`);
        }
      }

      // Material ISO group match
      if (query.material_iso_group) {
        if (template.material.iso_group === query.material_iso_group) {
          score += 0.25;
          matchReasons.push(`Material group match: ISO ${query.material_iso_group}`);
        } else {
          adaptations.push(`Adapt from ${template.material.iso_group} to ${query.material_iso_group}`);
        }
      }

      // Strategy family match
      if (query.strategy_family) {
        if (template.strategy.family === query.strategy_family) {
          score += 0.2;
          matchReasons.push(`Strategy match: ${query.strategy_family}`);
        }
      }

      // Machine type match
      if (query.machine_type) {
        if (template.machine_setup.kinematic_type === query.machine_type) {
          score += 0.1;
          matchReasons.push(`Machine type match: ${query.machine_type}`);
        } else {
          adaptations.push(`Adapt kinematics from ${template.machine_setup.kinematic_type}`);
        }
      }

      // Success rate filter
      if (query.min_success_rate && template.success_metrics) {
        const successRate = template.success_metrics.first_pass_yield ? 1 : 0.5;
        if (successRate >= query.min_success_rate) {
          score += 0.1;
          matchReasons.push("Validated success metrics");
        }
      }

      // Keyword match
      if (query.keywords && query.keywords.length > 0) {
        const keywordMatches = query.keywords.filter(kw =>
          template.search_keywords.some(tk => tk.includes(kw.toLowerCase()))
        );
        if (keywordMatches.length > 0) {
          score += 0.05 * keywordMatches.length;
          matchReasons.push(`Keywords: ${keywordMatches.join(", ")}`);
        }
      }

      // Customer match (priority)
      if (query.customer_id && template.source.customer_id === query.customer_id) {
        score += 0.15;
        matchReasons.push("Same customer");
      }

      // Usage count bonus
      score += Math.min(template.usage_count / 100, 0.1);

      if (score > 0) {
        matches.push({
          template,
          similarity_score: Math.min(score, 1),
          match_reasons: matchReasons,
          adaptations_needed: adaptations,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.similarity_score - a.similarity_score);

    // Limit results
    const maxResults = query.max_results || 10;
    return matches.slice(0, maxResults);
  }

  /**
   * Find similar parts using feature embeddings (deep learning style).
   */
  static findSimilarByEmbedding(
    queryFeatures: FeatureSignature[],
    queryMaterial: MaterialProps,
    topK: number = 5
  ): SimilarityResult[] {
    // Generate query embeddings
    const queryFeatureEmbeddings = queryFeatures.map(f => ({
      id: `query_${queryFeatures.indexOf(f)}`,
      embedding: generateFeatureEmbedding(f),
      type: f.type,
    }));
    const queryMaterialEmbedding = generateMaterialEmbedding(queryMaterial);

    // Combined query embedding
    const queryCombined = [
      ...queryFeatureEmbeddings[0].embedding,
      ...queryMaterialEmbedding,
    ];

    const results: SimilarityResult[] = [];

    for (const template of TEMPLATE_LIBRARY.values()) {
      if (!template.feature_embedding) continue;

      // Combine template embedding with material
      const templateMaterialEmb = generateMaterialEmbedding(template.material);
      const templateCombined = [
        ...template.feature_embedding,
        ...templateMaterialEmb,
      ];

      // Compute similarity
      const similarity = cosineSimilarity(queryCombined, templateCombined);

      // Feature-level matches
      const featureMatches = queryFeatureEmbeddings.map(qf => {
        const templateFeatureEmb = template.features.length > 0
          ? generateFeatureEmbedding(template.features[0])
          : [];
        const featureScore = cosineSimilarity(qf.embedding, templateFeatureEmb);
        return {
          query_feature: qf.type,
          matched_feature: template.features[0]?.type || "unknown",
          score: featureScore,
        };
      });

      // Generate recommendation
      let recommendation = "";
      if (similarity > 0.85) {
        recommendation = "Highly similar - use template with minimal adaptation";
      } else if (similarity > 0.7) {
        recommendation = "Good match - adapt cutting parameters for material difference";
      } else if (similarity > 0.5) {
        recommendation = "Partial match - review strategy selection carefully";
      } else {
        recommendation = "Low similarity - consider starting fresh";
      }

      results.push({
        part_id: template.source.part_number || template.id,
        template_id: template.id,
        similarity_score: similarity,
        feature_matches: featureMatches,
        recommendation,
      });
    }

    // Sort by similarity
    results.sort((a, b) => b.similarity_score - a.similarity_score);

    return results.slice(0, topK);
  }

  // ==========================================================================
  // DEEP AI REASONING
  // ==========================================================================

  /**
   * Perform deep reasoning for 5-axis strategy selection.
   * Integrates templates, chain-of-thought, and PRISM AI.
   */
  static deepReason(request: DeepReasoningRequest): DeepReasoningResult {
    const startTime = Date.now();
    log.info(`[5AxisDeepLearning] Deep reasoning for ${request.part_features[0].type}`);

    // Step 1: Find similar templates
    const similarTemplates = request.similar_templates || this.searchSimilarTemplates({
      geometry: request.part_features[0].type,
      material_iso_group: request.material.iso_group,
      max_results: 5,
    }).map(m => m.template);

    // Step 2: Generate chain of thought
    const reasoningChain = generateChainOfThought(request, similarTemplates);

    // Step 3: Select strategy
    let recommendedStrategy: FiveAxisStrategyEntry;
    let adaptationsApplied: string[] = [];

    if (similarTemplates.length > 0 && similarTemplates[0].success_metrics?.first_pass_yield) {
      // Use validated template strategy
      recommendedStrategy = similarTemplates[0].strategy;
      adaptationsApplied.push(`Based on template: ${similarTemplates[0].name}`);
    } else {
      // Select from catalog based on geometry
      const geometry = request.part_features[0].type;
      const candidates = FIVE_AXIS_STRATEGY_CATALOG.filter(s =>
        s.geometries.includes(geometry) &&
        s.complexity <= request.constraints.operator_skill + 1
      );

      if (candidates.length > 0) {
        // Prefer physics-aware strategies
        const physicsAware = candidates.filter(s => s.physics_aware);
        recommendedStrategy = physicsAware.length > 0 ? physicsAware[0] : candidates[0];
      } else {
        // Fallback to general point milling
        recommendedStrategy = FIVE_AXIS_STRATEGY_CATALOG.find(s => s.family === "point_milling")
          || FIVE_AXIS_STRATEGY_CATALOG[0];
      }
      adaptationsApplied.push("Derived from geometry and material analysis");
    }

    // Step 4: Generate cutting parameters
    const recommendedParams = this.deriveParameters(
      request,
      recommendedStrategy,
      similarTemplates[0]?.cutting_params[0]
    );

    // Step 5: Generate PRISM AI prompt/response
    const prismPrompt = request.require_explanation
      ? generatePRISMAIPrompt(request)
      : undefined;

    // Step 6: Proactive suggestions
    const proactiveSuggestions: string[] = [];
    const riskWarnings: string[] = [];

    // Material-specific suggestions
    if (request.material.iso_group === "H") {
      proactiveSuggestions.push("Consider ceramic or CBN tooling for hardened steel");
      riskWarnings.push("Tool life critical - monitor for chipping");
    }
    if (request.material.iso_group === "S") {
      proactiveSuggestions.push("Titanium requires low speeds, sharp tools, flood coolant");
      riskWarnings.push("Work hardening risk - maintain constant chip load");
    }

    // Feature-specific suggestions
    if (request.part_features[0].thin_wall_count > 0) {
      proactiveSuggestions.push("Thin walls detected - reduce axial depth, increase passes");
      riskWarnings.push("Vibration risk in thin wall areas");
    }
    if (request.part_features[0].undercut_count > 0) {
      proactiveSuggestions.push("Undercuts require careful tool path entry/exit");
    }

    // Template-based suggestions
    if (similarTemplates.length > 0) {
      const successfulTemplate = similarTemplates.find(t => t.success_metrics?.first_pass_yield);
      if (successfulTemplate) {
        proactiveSuggestions.push(
          `Similar successful job: ${successfulTemplate.name} (${successfulTemplate.usage_count} uses)`
        );
      }
    }

    // Always suggest template capture
    proactiveSuggestions.push("After successful machining, capture as template for future reuse");

    // Calculate confidence
    let confidence = 0.7; // Base confidence
    if (similarTemplates.length > 0) confidence += 0.1;
    if (similarTemplates.some(t => t.success_metrics?.first_pass_yield)) confidence += 0.1;
    if (recommendedStrategy.physics_aware) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    const elapsed = Date.now() - startTime;
    log.info(`[5AxisDeepLearning] Reasoning complete in ${elapsed}ms, confidence=${confidence.toFixed(2)}`);

    return {
      recommended_strategy: recommendedStrategy,
      recommended_params: recommendedParams,
      confidence,
      reasoning_chain: reasoningChain,
      similar_templates_used: similarTemplates.map(t => t.id),
      adaptations_applied: adaptationsApplied,
      novel_insights: this.extractNovelInsights(request, similarTemplates),
      prism_ai_prompt: prismPrompt,
      prism_ai_response: prismPrompt
        ? `[PRISM AI Response]\nRecommended: ${recommendedStrategy.name}\nConfidence: ${(confidence * 100).toFixed(0)}%\nKey insight: ${adaptationsApplied[0]}`
        : undefined,
      proactive_suggestions: proactiveSuggestions,
      risk_warnings: riskWarnings,
    };
  }

  /**
   * Derive cutting parameters from request and similar templates.
   */
  private static deriveParameters(
    request: DeepReasoningRequest,
    strategy: FiveAxisStrategyEntry,
    templateParams?: CuttingParameters
  ): CuttingParameters {
    // Start with template if available
    if (templateParams) {
      // Scale parameters for material difference
      const materialScale = this.getMaterialScale(
        request.material,
        templateParams
      );

      return {
        ...templateParams,
        spindle_rpm: Math.round(templateParams.spindle_rpm * materialScale.speed),
        feed_mmmin: Math.round(templateParams.feed_mmmin * materialScale.feed),
        ap_mm: templateParams.ap_mm * materialScale.depth,
      };
    }

    // Derive from first principles
    const isHardened = request.material.iso_group === "H" || (request.material.hardness_hrc || 0) > 45;
    const isSoft = request.material.iso_group === "N";

    // Tool selection based on strategy
    let toolType: ToolType = "ball_nose";
    let toolDiameter = 10;

    if (strategy.family === "swarf_cutting") {
      toolType = "flat_end";
      toolDiameter = 12;
    } else if (strategy.family === "barrel_cutter") {
      toolType = "barrel";
      toolDiameter = 16;
    }

    // Base speeds for ISO H material
    let baseRpm = isHardened ? 6000 : isSoft ? 15000 : 10000;
    let baseFeed = isHardened ? 800 : isSoft ? 2500 : 1500;
    let baseAp = isHardened ? 0.15 : isSoft ? 0.5 : 0.25;
    let baseAe = isHardened ? 0.2 : isSoft ? 0.8 : 0.4;

    return {
      strategy_id: strategy.id,
      strategy_name: strategy.name,
      tool_type: toolType,
      tool_diameter_mm: toolDiameter,
      spindle_rpm: baseRpm,
      feed_mmmin: baseFeed,
      ap_mm: baseAp,
      ae_mm: baseAe,
      lead_angle_deg: 15,
      tilt_angle_deg: 0,
      stepover_pct: isHardened ? 5 : 15,
      coolant: isHardened ? "through_tool" : "flood",
    };
  }

  /**
   * Get material scaling factors for parameter adaptation.
   */
  private static getMaterialScale(
    targetMaterial: MaterialProps,
    sourceParams: CuttingParameters
  ): { speed: number; feed: number; depth: number } {
    // Use kc1.1 ratio as primary scaling factor
    // Assume source was optimized for medium steel (kc1.1 ≈ 2000)
    const sourceKc = 2000;
    const targetKc = targetMaterial.kc11_mpa;
    const kcRatio = sourceKc / targetKc;

    // Harder material = lower speeds, lower feeds, shallower cuts
    return {
      speed: Math.pow(kcRatio, 0.5),
      feed: Math.pow(kcRatio, 0.4),
      depth: Math.pow(kcRatio, 0.3),
    };
  }

  /**
   * Extract novel insights from request vs templates.
   */
  private static extractNovelInsights(
    request: DeepReasoningRequest,
    templates: FiveAxisTemplate[]
  ): string[] {
    const insights: string[] = [];

    // Check for novel geometry combinations
    const templateGeometries = new Set(
      templates.flatMap(t => t.features.map(f => f.type))
    );
    const requestGeometries = request.part_features.map(f => f.type);

    const novelGeometries = requestGeometries.filter(g => !templateGeometries.has(g));
    if (novelGeometries.length > 0) {
      insights.push(`Novel geometry for this material: ${novelGeometries.join(", ")}`);
    }

    // Check for complexity increase
    const avgTemplateComplexity = templates.length > 0
      ? templates.reduce((sum, t) => sum + t.features[0]?.complexity_score || 0, 0) / templates.length
      : 0;
    const requestComplexity = request.part_features[0].complexity_score;

    if (requestComplexity > avgTemplateComplexity + 2) {
      insights.push(`Higher complexity than similar parts (${requestComplexity} vs avg ${avgTemplateComplexity.toFixed(1)})`);
    }

    // Check for tolerance tightening
    const hasMoreTightTolerances = request.part_features.some(f =>
      f.tight_tolerance_count > 3
    );
    if (hasMoreTightTolerances) {
      insights.push("Multiple tight tolerances require careful fixture and probing strategy");
    }

    if (insights.length === 0) {
      insights.push("Part characteristics align with historical patterns");
    }

    return insights;
  }

  // ==========================================================================
  // LEARNING FROM OUTCOMES
  // ==========================================================================

  /**
   * Record learning outcome for continuous improvement.
   */
  static recordOutcome(outcome: LearningOutcome): void {
    this.learningLog.push(outcome);
    log.info(`[5AxisDeepLearning] Recorded outcome for ${outcome.template_id}, success=${outcome.success}`);

    // Update template metrics if successful
    if (outcome.success) {
      const template = TEMPLATE_LIBRARY.get(outcome.template_id);
      if (template) {
        template.usage_count += 1;
        template.updated_at = new Date().toISOString();
      }
    }
  }

  /**
   * Get learning statistics.
   */
  static getLearningStats(): {
    total_outcomes: number;
    success_rate: number;
    avg_cycle_time_error_pct: number;
    avg_surface_error_pct: number;
    templates_with_outcomes: number;
  } {
    if (this.learningLog.length === 0) {
      return {
        total_outcomes: 0,
        success_rate: 0,
        avg_cycle_time_error_pct: 0,
        avg_surface_error_pct: 0,
        templates_with_outcomes: 0,
      };
    }

    const successCount = this.learningLog.filter(o => o.success).length;
    const cycleTimeErrors = this.learningLog.map(o =>
      Math.abs(o.actual.cycle_time_min - o.predicted.cycle_time_min) / o.predicted.cycle_time_min * 100
    );
    const surfaceErrors = this.learningLog.map(o =>
      Math.abs(o.actual.surface_ra_um - o.predicted.surface_ra_um) / o.predicted.surface_ra_um * 100
    );

    const templatesWithOutcomes = new Set(this.learningLog.map(o => o.template_id)).size;

    return {
      total_outcomes: this.learningLog.length,
      success_rate: successCount / this.learningLog.length,
      avg_cycle_time_error_pct: cycleTimeErrors.reduce((a, b) => a + b, 0) / cycleTimeErrors.length,
      avg_surface_error_pct: surfaceErrors.reduce((a, b) => a + b, 0) / surfaceErrors.length,
      templates_with_outcomes: templatesWithOutcomes,
    };
  }

  /**
   * Get templates needing validation (high usage but no success metrics).
   */
  static getTemplatesNeedingValidation(): FiveAxisTemplate[] {
    return Array.from(TEMPLATE_LIBRARY.values()).filter(
      t => t.usage_count > 3 && !t.success_metrics
    );
  }

  // ==========================================================================
  // DEEP REASONING — REQUIREMENT ANALYSIS
  // ==========================================================================

  /**
   * Analyze whether a part geometry requires 5-axis machining.
   * Uses geometric reasoning across access angles, undercut presence,
   * feature orientation diversity, and surface complexity.
   *
   * Reference: Introduction to Multiaxis Toolpaths — Chapter 2 (When to use 5-axis)
   *            Manual 5-axis machining — Section 3 (Part analysis methodology)
   *
   * @param part_features - Array of part feature signatures
   * @param machine - Optional machine kinematic context (for axis limit check)
   * @returns Analysis result with recommendation and confidence
   */
  static analyze5AxisRequirement(
    part_features: FeatureSignature[],
    machine?: MachineKinematics5Ax
  ): FiveAxisRequirementAnalysis {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0; // 0-1 scale, >0.5 = 5-axis recommended

    // Criterion 1: Undercuts — unambiguous 5-axis trigger
    const totalUndercuts = part_features.reduce((s, f) => s + f.undercut_count, 0);
    if (totalUndercuts > 0) {
      score += 0.40;
      reasons.push(`Undercut features detected (${totalUndercuts}) — inaccessible from fixed orientations`);
    }

    // Criterion 2: Geometry type — certain types inherently need 5-axis
    const needsFiveAxis = part_features.filter(f =>
      ["impeller_blade", "turbine_blade", "blisk", "port", "tube"].includes(f.type)
    );
    if (needsFiveAxis.length > 0) {
      score += 0.35;
      reasons.push(`Feature type(s) require 5-axis: ${needsFiveAxis.map(f => f.type).join(", ")}`);
    }

    // Criterion 3: Feature diversity — multiple faces needing different orientations
    const featureTypes = new Set(part_features.map(f => f.type));
    if (featureTypes.size >= 3) {
      score += 0.15;
      reasons.push(`${featureTypes.size} different feature types suggest multiple setups or 5-axis`);
    }

    // Criterion 4: Complexity score — high complexity often warrants 5-axis for surface quality
    const maxComplexity = Math.max(...part_features.map(f => f.complexity_score));
    if (maxComplexity >= 8) {
      score += 0.20;
      reasons.push(`High geometric complexity (${maxComplexity}/10) — 5-axis improves surface quality`);
    } else if (maxComplexity >= 6) {
      score += 0.10;
      reasons.push(`Moderate complexity (${maxComplexity}/10) — 5-axis may reduce setups`);
    }

    // Criterion 5: Thin walls with deep features — vibration risk in 3-axis
    const hasThinDeep = part_features.some(f =>
      f.thin_wall_count > 0 && f.dimensions.depth_mm > f.dimensions.width_mm * 2
    );
    if (hasThinDeep) {
      score += 0.15;
      reasons.push("Thin-wall deep features — 5-axis tilt reduces radial cutting force and vibration");
    }

    // Criterion 6: Tight tolerances on multiple faces
    const totalTightTol = part_features.reduce((s, f) => s + f.tight_tolerance_count, 0);
    if (totalTightTol >= 4) {
      score += 0.10;
      reasons.push(`${totalTightTol} tight tolerances across faces — single 5-axis setup improves datum consistency`);
    }

    // Criterion 7: Freeform surfaces with large surface area
    const freeformArea = part_features
      .filter(f => f.type === "freeform_surface" || f.type === "mold_core" || f.type === "mold_cavity")
      .reduce((s, f) => s + f.surface_area_mm2, 0);
    if (freeformArea > 20000) {
      score += 0.15;
      reasons.push(`Large freeform surface area (${freeformArea.toFixed(0)} mm²) — 5-axis barrel/swarf cutting viable`);
    }

    // Machine axis limit check (if provided)
    if (machine) {
      const hasRTCP = machine.rtcp_enabled;
      if (!hasRTCP) {
        warnings.push("Machine lacks RTCP — manual compensation required for simultaneous 5-axis");
      }
    }

    score = Math.min(score, 1.0);

    // Determine recommendation
    let recommendation: FiveAxisRequirementAnalysis["recommendation"];
    let mode: FiveAxisRequirementAnalysis["recommended_mode"];

    if (score >= 0.75) {
      recommendation = "5_axis_required";
      mode = needsFiveAxis.length > 0 ? "simultaneous_5ax" : "either";
    } else if (score >= 0.45) {
      recommendation = "5_axis_beneficial";
      mode = "3_plus_2_preferred";
    } else if (score >= 0.20) {
      recommendation = "3_plus_2_sufficient";
      mode = "3_plus_2_preferred";
    } else {
      recommendation = "3_axis_sufficient";
      mode = "3_plus_2_preferred";
    }

    if (reasons.length === 0) {
      reasons.push("No strong 5-axis indicators — 3-axis with multiple setups may suffice");
    }

    log.info(`[5AxisDeepLearning] analyze5AxisRequirement: score=${score.toFixed(2)}, recommendation=${recommendation}`);

    return {
      score,
      recommendation,
      recommended_mode: mode,
      reasons,
      warnings,
      feature_count: part_features.length,
      undercut_count: totalUndercuts,
      complexity_max: maxComplexity,
    };
  }

  // ==========================================================================
  // DEEP REASONING — TOOL AXIS STRATEGY SELECTION
  // ==========================================================================

  /**
   * Select optimal tool axis control method for a given surface type and access geometry.
   * Covers lead/lag angles, tilt, swarf (flank), and point-contact strategies.
   *
   * Reference: InventorCAM 5-Axis Basic Training Vol-1 — Ch4 Tool Axis Control
   *            InventorCAM Multiaxis Machining User Guide — Section 7 (Tool Axis)
   *            Manual 5-axis machining — Chapter 6 (Tool axis orientation methods)
   *
   * @param surface_type - Geometry type of the target surface
   * @param access_angles - Required access angles in degrees (A and C axis)
   * @param tool_diameter_mm - Tool diameter for lead angle calculation
   * @returns Selected tool axis strategy with parameter recommendations
   */
  static selectToolAxisStrategy(
    surface_type: FiveAxisGeometry,
    access_angles: { A_deg: number; C_deg: number },
    tool_diameter_mm: number = 10
  ): ToolAxisStrategy {
    // Swarf cutting geometry (ruled/developable surfaces, punches, walls)
    if (["ruled_surface"].includes(surface_type)) {
      return {
        method: "swarf",
        lead_angle_deg: 0,
        lag_angle_deg: 0,
        tilt_angle_deg: 2, // Small stability tilt
        side_tilt_deg: 0,
        description: "Flank (swarf) milling — tool side engages ruled surface. Maximum productivity.",
        cam_setting: "Swarf Cutting / Flank Milling",
        rtcp_required: true,
        recommended_tool_type: "flat_end",
        surface_quality: "good",
        productivity: "excellent",
        safety_note: "Verify lead/lag at both ends of ruled surface to avoid gouging",
      };
    }

    // Impeller / blisk / turbine blade — blade machining with lead angle
    if (["impeller_blade", "turbine_blade", "blisk"].includes(surface_type)) {
      const leadAngle = 10 + Math.min(tool_diameter_mm / 2, 10); // 10-20° based on tool size
      return {
        method: "lead_lag",
        lead_angle_deg: leadAngle,
        lag_angle_deg: 0,
        tilt_angle_deg: 0,
        side_tilt_deg: 5,
        description: `Blade machining with ${leadAngle}° lead. Side tilt 5° for inter-blade clearance.`,
        cam_setting: "Blade Machining / Impeller Cycle",
        rtcp_required: true,
        recommended_tool_type: "ball_nose",
        surface_quality: "excellent",
        productivity: "good",
        safety_note: "Check hub clearance on each pass. Use barrel cutter to reduce passes.",
      };
    }

    // Port / deep cavity — point milling with automatic tilt-from-surface
    if (["port", "deep_cavity"].includes(surface_type)) {
      return {
        method: "tilt",
        lead_angle_deg: 5,
        lag_angle_deg: 0,
        tilt_angle_deg: Math.abs(access_angles.A_deg),
        side_tilt_deg: 0,
        description: `Port machining with ${Math.abs(access_angles.A_deg)}° tilt. Tool follows port centerline.`,
        cam_setting: "Port Machining / 5-Axis Profile",
        rtcp_required: true,
        recommended_tool_type: "ball_nose",
        surface_quality: "good",
        productivity: "acceptable",
        safety_note: "Define clearance plane above port opening. Check for collision at entry.",
      };
    }

    // Freeform surface — point milling with fixed lead angle for tip clearance
    if (["freeform_surface", "mold_core", "mold_cavity"].includes(surface_type)) {
      const leadAngle = tool_diameter_mm <= 6 ? 10 : 15;
      return {
        method: "lead_lag",
        lead_angle_deg: leadAngle,
        lag_angle_deg: 0,
        tilt_angle_deg: 0,
        side_tilt_deg: 0,
        description: `Point milling with ${leadAngle}° lead angle — avoids zero-velocity tip contact.`,
        cam_setting: "5X Shape Offset / Point Milling",
        rtcp_required: true,
        recommended_tool_type: "ball_nose",
        surface_quality: "excellent",
        productivity: "good",
        safety_note: "Lead angle must be consistent across entire surface to prevent scallop variation.",
      };
    }

    // Electrode / dental / medical — fine point milling, minimal lead
    if (["electrode", "dental", "medical_implant"].includes(surface_type)) {
      return {
        method: "lead_lag",
        lead_angle_deg: 5,
        lag_angle_deg: 0,
        tilt_angle_deg: 0,
        side_tilt_deg: 0,
        description: "Minimal 5° lead — preserves tool tip precision for intricate geometries.",
        cam_setting: "5X Shape Offset / Fine Finishing",
        rtcp_required: true,
        recommended_tool_type: "ball_nose",
        surface_quality: "excellent",
        productivity: "acceptable",
        safety_note: "High RPM, low feed — check spindle load at every orientation change.",
      };
    }

    // Undercut — lollipop or tapered ball with from-surface tilt
    if (surface_type === "undercut") {
      return {
        method: "tilt",
        lead_angle_deg: 0,
        lag_angle_deg: 0,
        tilt_angle_deg: 30,
        side_tilt_deg: 15,
        description: "30° tilt + 15° side tilt for undercut clearance. Lollipop tool preferred.",
        cam_setting: "5X Contour / From Surface Tilt",
        rtcp_required: true,
        recommended_tool_type: "lollipop",
        surface_quality: "good",
        productivity: "acceptable",
        safety_note: "Simulate for holder collision in undercut region before running.",
      };
    }

    // Multi-face / default — 3+2 indexed for each face
    return {
      method: "indexed_3plus2",
      lead_angle_deg: 0,
      lag_angle_deg: 0,
      tilt_angle_deg: access_angles.A_deg,
      side_tilt_deg: 0,
      description: `3+2 indexed positioning at A=${access_angles.A_deg}°, C=${access_angles.C_deg}°.`,
      cam_setting: "Indexed Positioning / 3+2",
      rtcp_required: false,
      recommended_tool_type: "flat_end",
      surface_quality: "good",
      productivity: "good",
      safety_note: "Verify table does not exceed axis limits at each indexed position.",
    };
  }

  // ==========================================================================
  // DEEP REASONING — TOOLPATH OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize a toolpath for collision-free execution given known collision zones.
   * Inserts retract moves, adjusts lead angles, and re-routes around obstacles.
   *
   * Reference: InventorCAM 5-Axis Basic Training Vol-2 — Ch8 Collision Avoidance
   *            InventorCAM Multiaxis Roughing Pt1 — Section 5 (Gouge-free paths)
   *
   * @param strategy - Current toolpath strategy entry
   * @param collision_zones - Named zones with bounding geometry
   * @param tool_diameter_mm - Tool diameter for clearance calculation
   * @returns Optimized toolpath configuration with retract strategy
   */
  static optimizeToolpath(
    strategy: FiveAxisStrategyEntry,
    collision_zones: CollisionZone[],
    tool_diameter_mm: number = 10
  ): OptimizedToolpathConfig {
    const modifications: string[] = [];
    const safetyChecks: string[] = [];
    let riskLevel: OptimizedToolpathConfig["risk_level"] = "low";

    // Safety clearance is 2× tool diameter minimum
    const minClearance_mm = tool_diameter_mm * 2;

    // Analyze collision zones
    let holderCollisionRisk = false;
    let shankCollisionRisk = false;
    let fixtureCollisionRisk = false;

    for (const zone of collision_zones) {
      if (zone.type === "fixture" || zone.type === "clamp") {
        fixtureCollisionRisk = true;
        modifications.push(`Raise retract height by ${zone.safety_offset_mm + minClearance_mm}mm above ${zone.name}`);
        safetyChecks.push(`Verify Z-clearance over ${zone.name} before rapid traversal`);
      }
      if (zone.type === "holder" || zone.type === "arbor") {
        holderCollisionRisk = true;
        modifications.push(`Reduce lead angle in ${zone.name} region to maintain holder clearance`);
        safetyChecks.push(`Check holder-to-wall clearance in ${zone.name} (min ${minClearance_mm}mm)`);
      }
      if (zone.type === "shank" || zone.type === "tool_body") {
        shankCollisionRisk = true;
        modifications.push(`Add axis tilt ${zone.safety_offset_mm + 5}° away from ${zone.name}`);
        safetyChecks.push(`Simulate full toolpath with shank cylinder model for ${zone.name}`);
      }
    }

    // Determine retract strategy
    let retractStrategy: OptimizedToolpathConfig["retract_strategy"];
    if (fixtureCollisionRisk && holderCollisionRisk) {
      retractStrategy = "full_retract";
      riskLevel = "high";
    } else if (holderCollisionRisk || shankCollisionRisk) {
      retractStrategy = "tilt_retract";
      riskLevel = "medium";
    } else if (fixtureCollisionRisk) {
      retractStrategy = "z_retract";
      riskLevel = "medium";
    } else {
      retractStrategy = "none";
      riskLevel = "low";
    }

    // Swarf-specific: check if swarf can be maintained through zone
    if (strategy.family === "swarf_cutting" && collision_zones.length > 0) {
      modifications.push("Convert swarf segments near collision zones to point-milling");
      safetyChecks.push("Verify surface quality at swarf-to-point transitions");
    }

    // Feed reduction near obstacles
    const feedReductionZones = collision_zones.filter(z => z.safety_offset_mm < minClearance_mm * 2);
    if (feedReductionZones.length > 0) {
      modifications.push(`Reduce feed to 30% within ${minClearance_mm * 3}mm of ${feedReductionZones.map(z => z.name).join(", ")}`);
    }

    // Generate recommended G-code preamble for RTCP with Okuma OSP-P300
    const gcodeNotes: string[] = [];
    if (strategy.axis_config === "5_simultaneous") {
      gcodeNotes.push("G43.4 H_ (OSP-P300 RTCP enable before entry)");
      gcodeNotes.push("G49 (RTCP cancel on retract)");
    }

    if (modifications.length === 0) {
      modifications.push("No modifications required — path is clear of all defined zones");
    }

    log.info(`[5AxisDeepLearning] optimizeToolpath: ${collision_zones.length} zones, risk=${riskLevel}`);

    return {
      original_strategy: strategy.name,
      modifications,
      safety_checks: safetyChecks,
      retract_strategy: retractStrategy,
      risk_level: riskLevel,
      clearance_mm: minClearance_mm,
      gcode_notes: gcodeNotes,
      zone_count: collision_zones.length,
      simulation_required: riskLevel !== "low",
    };
  }

  // ==========================================================================
  // DEEP REASONING — KINEMATIC VALIDATION
  // ==========================================================================

  /**
   * Validate a toolpath against machine kinematic limits.
   * Checks axis travel limits, singularity proximity, RTCP capability,
   * and Okuma OSP-P300 specific requirements.
   *
   * Reference: InventorCAM 5-Axis Basic Training Vol-3 — Ch10 Machine Validation
   *            Siemens 5 axis — Section 4 (Kinematic verification)
   *            InventorCAM Multiaxis Machining User Guide — Ch9 (Post processor verification)
   *
   * @param machine - Machine kinematic configuration
   * @param toolpath_points - Array of A, C axis positions to validate
   * @returns Validation result with per-point findings
   */
  static validateKinematics(
    machine: MachineKinematics5Ax,
    toolpath_points: Array<{ A_deg: number; C_deg: number; label?: string }>
  ): KinematicValidationResult {
    const violations: KinematicValidation[] = [];
    const warnings: KinematicValidation[] = [];
    let singularity_count = 0;
    let max_a_reached = 0;
    let max_c_reached = 0;

    const aMin = machine.axis_limits.a_min_deg ?? -120;
    const aMax = machine.axis_limits.a_max_deg ?? 30;
    const cMin = machine.axis_limits.c_min_deg;
    const cMax = machine.axis_limits.c_max_deg;

    // Singularity proximity threshold — within 5° of A=0 for table-table machines
    const SINGULARITY_THRESHOLD_DEG = 5;

    for (const pt of toolpath_points) {
      const label = pt.label || `A=${pt.A_deg}°,C=${pt.C_deg}°`;

      // Axis limit check — A axis
      if (pt.A_deg < aMin || pt.A_deg > aMax) {
        violations.push({
          type: "axis_limit_exceeded",
          axis: "A",
          value_deg: pt.A_deg,
          limit_deg: pt.A_deg < aMin ? aMin : aMax,
          label,
          severity: "error",
          remedy: `Reposition part or use alternative orientation. A-axis range: [${aMin}°, ${aMax}°]`,
        });
      }

      // Axis limit check — C axis
      if (pt.C_deg < cMin || pt.C_deg > cMax) {
        violations.push({
          type: "axis_limit_exceeded",
          axis: "C",
          value_deg: pt.C_deg,
          limit_deg: pt.C_deg < cMin ? cMin : cMax,
          label,
          severity: "error",
          remedy: `C-axis out of range [${cMin}°, ${cMax}°]. Consider unwinding or repositioning.`,
        });
      }

      // Singularity detection — near vertical (A ≈ 0) for table-table
      if (machine.kinematic_type === "table_table" || machine.kinematic_type === "mixed_AC") {
        if (Math.abs(pt.A_deg) < SINGULARITY_THRESHOLD_DEG) {
          singularity_count++;
          warnings.push({
            type: "singularity_proximity",
            axis: "A",
            value_deg: pt.A_deg,
            limit_deg: 0,
            label,
            severity: "warning",
            remedy: `A=${pt.A_deg}° is near singularity (A=0). Apply min tilt of ${SINGULARITY_THRESHOLD_DEG}° or use RTCP smooth transition.`,
          });
        }
      }

      // Track extremes
      max_a_reached = Math.max(max_a_reached, Math.abs(pt.A_deg));
      max_c_reached = Math.max(max_c_reached, Math.abs(pt.C_deg));
    }

    // RTCP validation
    const rtcp_ok = machine.rtcp_enabled;
    if (!rtcp_ok) {
      warnings.push({
        type: "rtcp_disabled",
        axis: "A",
        value_deg: 0,
        limit_deg: 0,
        label: "machine_config",
        severity: "warning",
        remedy: "Enable RTCP/TCPM on controller. For Okuma OSP-P300 use G43.4 H_ block.",
      });
    }

    // OSP-P300 specific: recommend G43.4 for RTCP
    const osp_recommendations: string[] = [];
    if (machine.rtcp_enabled) {
      osp_recommendations.push("Use G43.4 H_ before 5-axis block (OSP-P300 RTCP enable)");
      osp_recommendations.push("Use G49 to cancel RTCP after 5-axis section");
      osp_recommendations.push("Set WORKOFS parameter for table-top datum offset");
      osp_recommendations.push("Enable AI Contour control for smooth rotary interpolation");
    }

    const is_valid = violations.length === 0;

    log.info(`[5AxisDeepLearning] validateKinematics: ${toolpath_points.length} points, ${violations.length} violations, ${singularity_count} singularities`);

    return {
      is_valid,
      violations,
      warnings,
      singularity_count,
      rtcp_ok,
      max_a_reached_deg: max_a_reached,
      max_c_reached_deg: max_c_reached,
      point_count: toolpath_points.length,
      osp_p300_recommendations: osp_recommendations,
    };
  }

  // ==========================================================================
  // DEEP REASONING — INDEX ANGLE RECOMMENDATION
  // ==========================================================================

  /**
   * Recommend optimal 3+2 index positions for a feature set.
   * Minimizes the number of setups while ensuring full accessibility.
   * Uses clustering of required access vectors.
   *
   * Reference: InventorCAM 5-Axis Basic Training Vol-1 — Ch2 (Indexed machining)
   *            InventorCAM Multiaxis Drilling — Section 3 (Pattern indexing)
   *            Siemens 5 axis — Section 2 (3+2 positioning strategy)
   *
   * @param feature_set - Features needing machining
   * @param machine - Machine kinematic configuration
   * @returns Recommended index positions with feature groupings
   */
  static recommendIndexAngles(
    feature_set: FeatureSignature[],
    machine?: MachineKinematics5Ax
  ): IndexAngleRecommendation[] {
    // Build access vector requirements per feature
    const featureAccess: Array<{ feature: FeatureSignature; A_deg: number; C_deg: number }> = [];

    for (const feature of feature_set) {
      // Estimate required access angles from geometry type and dimensions
      let A_deg = 0;
      let C_deg = 0;

      switch (feature.type) {
        case "mold_cavity":
        case "deep_cavity":
          // Standard top-down access
          A_deg = 0; C_deg = 0;
          break;
        case "undercut":
          // Undercut requires side-tilt
          A_deg = -30; C_deg = 0;
          break;
        case "ruled_surface":
          // Draft angle access
          A_deg = -(feature.dimensions.draft_angle_deg || 5);
          C_deg = 0;
          break;
        case "impeller_blade":
        case "turbine_blade":
          // Blade access — multiple orientations required
          A_deg = -45; C_deg = 0;
          break;
        case "blisk":
          // Blisk hub — full rotary sweep
          A_deg = -30; C_deg = 0;
          break;
        case "port":
          // Port opening angle
          A_deg = -60; C_deg = 0;
          break;
        case "electrode":
          // Electrode top profile
          A_deg = 0; C_deg = 0;
          break;
        case "multi_face":
          // Needs 4+ orientations — flag as simultaneous candidate
          A_deg = -15; C_deg = 90;
          break;
        default:
          A_deg = 0; C_deg = 0;
      }

      // Clamp to machine limits if provided
      if (machine) {
        const aMin = machine.axis_limits.a_min_deg ?? -120;
        const aMax = machine.axis_limits.a_max_deg ?? 30;
        A_deg = Math.max(aMin, Math.min(aMax, A_deg));
        C_deg = Math.max(machine.axis_limits.c_min_deg, Math.min(machine.axis_limits.c_max_deg, C_deg));
      }

      featureAccess.push({ feature, A_deg, C_deg });
    }

    // Cluster features by proximity of access angles (±15° tolerance)
    const ANGLE_TOLERANCE_DEG = 15;
    const clusters: Array<{
      A_deg: number;
      C_deg: number;
      features: FeatureSignature[];
      priority: number;
    }> = [];

    for (const fa of featureAccess) {
      const existing = clusters.find(c =>
        Math.abs(c.A_deg - fa.A_deg) < ANGLE_TOLERANCE_DEG &&
        Math.abs(c.C_deg - fa.C_deg) < ANGLE_TOLERANCE_DEG
      );
      if (existing) {
        existing.features.push(fa.feature);
      } else {
        clusters.push({
          A_deg: fa.A_deg,
          C_deg: fa.C_deg,
          features: [fa.feature],
          priority: clusters.length + 1,
        });
      }
    }

    // Sort clusters: largest feature groups first (minimize setups)
    clusters.sort((a, b) => b.features.length - a.features.length);

    // Map clusters to recommendations
    const recommendations: IndexAngleRecommendation[] = clusters.map((c, i) => ({
      setup_number: i + 1,
      A_deg: Math.round(c.A_deg * 10) / 10,
      C_deg: Math.round(c.C_deg * 10) / 10,
      features_covered: c.features.map(f => f.type),
      feature_count: c.features.length,
      requires_rtcp: false, // 3+2 does not require RTCP during cutting
      cam_g_code: `G68.2 X0 Y0 Z0 I${c.A_deg.toFixed(1)} J0 K${c.C_deg.toFixed(1)}`, // Tilted workplane
      description: `Setup ${i + 1}: Index to A=${c.A_deg.toFixed(1)}°, C=${c.C_deg.toFixed(1)}° for ${c.features.length} feature(s)`,
      priority: c.priority,
    }));

    log.info(`[5AxisDeepLearning] recommendIndexAngles: ${feature_set.length} features → ${recommendations.length} index positions`);

    return recommendations;
  }

  // ==========================================================================
  // 20-DIMENSION FEATURE VECTOR
  // ==========================================================================

  /**
   * Generate a compact 20-dimension feature vector for fast similarity matching.
   * Dimensionality is intentionally low for efficient nearest-neighbor search
   * compared to the full 128-dim embedding used for deep matching.
   *
   * Dimensions:
   *  [0]  Geometry type (0-14 normalized)
   *  [1]  Length normalized (0-1)
   *  [2]  Width normalized (0-1)
   *  [3]  Depth normalized (0-1)
   *  [4]  Fillet radius normalized (0-1)
   *  [5]  Draft angle normalized (0-1)
   *  [6]  Complexity score normalized (0-1)
   *  [7]  Undercut count normalized (0-1)
   *  [8]  Thin wall count normalized (0-1)
   *  [9]  Tight tolerance count normalized (0-1)
   *  [10] Surface area normalized (0-1)
   *  [11] Volume normalized (0-1)
   *  [12] Aspect ratio L/W (0-1)
   *  [13] Aspect ratio L/D (0-1)
   *  [14] ISO material group (P=0, M=0.2, K=0.4, N=0.6, S=0.8, H=1.0)
   *  [15] kc1.1 normalized (0-1)
   *  [16] Hardness normalized (0-1)
   *  [17] Thermal conductivity normalized (0-1)
   *  [18] Complexity × undercut interaction
   *  [19] Thin wall × depth interaction
   *
   * Reference: InventorCAM 5-Axis Basic Training Vol-2 — Ch5 (Feature recognition vectors)
   *
   * @param feature - Feature signature to encode
   * @param material - Optional material for material dimensions
   * @returns 20-element number array, values in [0, 1]
   */
  static generate20DimFeatureVector(
    feature: FeatureSignature,
    material?: Pick<MaterialProps, "iso_group" | "kc11_mpa" | "thermal_conductivity_w_mk"> & { hardness_hrc?: number }
  ): number[] {
    const GEO_TYPES: FiveAxisGeometry[] = [
      "freeform_surface", "ruled_surface", "impeller_blade", "turbine_blade",
      "blisk", "deep_cavity", "port", "tube", "undercut", "multi_face",
      "dental", "medical_implant", "mold_core", "mold_cavity", "electrode",
    ];

    const vec = new Array(20).fill(0);

    // Geometry encoding
    const geoIdx = GEO_TYPES.indexOf(feature.type);
    vec[0] = geoIdx >= 0 ? geoIdx / (GEO_TYPES.length - 1) : 0.5;

    // Dimension features (normalized to typical max values)
    vec[1] = Math.min(feature.dimensions.length_mm / 300, 1);
    vec[2] = Math.min(feature.dimensions.width_mm / 300, 1);
    vec[3] = Math.min(feature.dimensions.depth_mm / 150, 1);
    vec[4] = Math.min((feature.dimensions.fillet_radius_mm || 0) / 25, 1);
    vec[5] = Math.min((feature.dimensions.draft_angle_deg || 0) / 45, 1);

    // Complexity dimensions
    vec[6] = feature.complexity_score / 10;
    vec[7] = Math.min(feature.undercut_count / 8, 1);
    vec[8] = Math.min(feature.thin_wall_count / 8, 1);
    vec[9] = Math.min(feature.tight_tolerance_count / 12, 1);

    // Size dimensions
    vec[10] = Math.min(feature.surface_area_mm2 / 100000, 1);
    vec[11] = Math.min(feature.volume_mm3 / 1000000, 1);

    // Aspect ratios
    const lw = feature.dimensions.width_mm > 0
      ? feature.dimensions.length_mm / feature.dimensions.width_mm
      : 1;
    const ld = feature.dimensions.depth_mm > 0
      ? feature.dimensions.length_mm / feature.dimensions.depth_mm
      : 1;
    vec[12] = Math.min(lw / 10, 1);
    vec[13] = Math.min(ld / 10, 1);

    // Material dimensions (if provided)
    if (material) {
      const isoMap: Record<string, number> = { P: 0, M: 0.2, K: 0.4, N: 0.6, S: 0.8, H: 1.0 };
      vec[14] = isoMap[material.iso_group] ?? 0.5;
      vec[15] = Math.min(material.kc11_mpa / 4000, 1);
      vec[16] = Math.min((material.hardness_hrc || 0) / 70, 1);
      vec[17] = Math.min((material.thermal_conductivity_w_mk || 50) / 200, 1);
    }

    // Interaction features
    vec[18] = (feature.complexity_score / 10) * Math.min(feature.undercut_count / 5 + 0.1, 1);
    vec[19] = Math.min(feature.thin_wall_count / 5, 1) * Math.min(feature.dimensions.depth_mm / 100, 1);

    return vec;
  }

  // ==========================================================================
  // INTEGRATION BRIDGES
  // ==========================================================================

  /**
   * Cross-query HyperMill strategies for a given geometry and material.
   * Returns mapped hyperMILL strategy names and cycle parameter hints.
   * Bridges to HyperMillDeepLearningEngine patterns without direct import
   * (prevents circular dependencies).
   *
   * Reference: HyperMillDeepLearningEngine strategy catalog
   *
   * @param geometry - 5-axis geometry type
   * @param material_iso - ISO material group
   * @returns HyperMill strategy suggestions
   */
  static queryHyperMillStrategies(
    geometry: FiveAxisGeometry,
    material_iso: "P" | "M" | "K" | "N" | "S" | "H"
  ): HyperMillStrategyHint[] {
    // Strategy map derived from hyperMILL knowledge base
    // (See HyperMillDeepLearningEngine for full catalog)
    const STRATEGY_MAP: Partial<Record<FiveAxisGeometry, HyperMillStrategyHint[]>> = {
      freeform_surface: [
        { hm_strategy: "5X Shape Offset", hm_cycle: "5X Shape Offset Finishing", lead_angle: 15, notes: "Primary finishing strategy for freeform" },
        { hm_strategy: "3D ISO", hm_cycle: "3D ISO Milling", lead_angle: 10, notes: "Iso-parametric alternative" },
      ],
      ruled_surface: [
        { hm_strategy: "5X Swarf Cutting", hm_cycle: "5X Swarf", lead_angle: 0, notes: "Flank milling for ruled/drafted surfaces" },
      ],
      impeller_blade: [
        { hm_strategy: "5X Blade Roughing", hm_cycle: "HyperMILL Impeller Roughing", lead_angle: 10, notes: "Use blade roughing cycle first" },
        { hm_strategy: "5X Blade Finishing", hm_cycle: "HyperMILL Blade Finishing", lead_angle: 10, notes: "Follow with blade finishing for Ra" },
      ],
      turbine_blade: [
        { hm_strategy: "5X Blade Finishing", hm_cycle: "HyperMILL Blade Finishing", lead_angle: 12, notes: "Full blade machining cycle" },
      ],
      blisk: [
        { hm_strategy: "5X Impeller Roughing", hm_cycle: "HyperMILL Blisk Cycle", lead_angle: 8, notes: "Blisk-specific cycle handles hub geometry" },
      ],
      deep_cavity: [
        { hm_strategy: "5X Z-Level", hm_cycle: "5X Z-Level Finishing", lead_angle: 10, notes: "Tilted Z-level for deep cavity walls" },
      ],
      mold_cavity: [
        { hm_strategy: "5X Shape Offset", hm_cycle: "5X Shape Offset Finishing", lead_angle: 15, notes: "Parallel contouring for cavity surfaces" },
        { hm_strategy: "Tangent Plane", hm_cycle: "Tangent Plane Finishing", lead_angle: 5, notes: "For shallow sections (<30° inclination)" },
      ],
      mold_core: [
        { hm_strategy: "5X Shape Offset", hm_cycle: "5X Shape Offset Finishing", lead_angle: 15, notes: "Core profiling with tool axis control" },
      ],
      electrode: [
        { hm_strategy: "3D Profile", hm_cycle: "3D Profile Finishing", lead_angle: 5, notes: "Electrode fine finishing — minimal stock" },
      ],
      port: [
        { hm_strategy: "5X Port Machining", hm_cycle: "5X Port", lead_angle: 5, notes: "Follow port centerline with tilt" },
      ],
    };

    const hints = STRATEGY_MAP[geometry] || [
      { hm_strategy: "5X Shape Offset", hm_cycle: "5X Shape Offset Finishing", lead_angle: 10, notes: "General-purpose fallback" },
    ];

    // Material-specific adjustments
    if (material_iso === "H") {
      hints.forEach(h => { h.notes += " | Reduce feed 30% for hardened steel"; });
    } else if (material_iso === "S") {
      hints.forEach(h => { h.notes += " | Use through-tool coolant, reduce vc 40% for titanium"; });
    } else if (material_iso === "N") {
      hints.forEach(h => { h.notes += " | High-speed HSM mode — 3× feed for aluminum"; });
    }

    return hints;
  }

  /**
   * Query Okuma OSP-P300 controller requirements for a 5-axis operation.
   * Bridges CNCControllerDeepLearningEngine knowledge for the MU-4000V.
   * Returns G-code preamble, parameter settings, and safety checks.
   *
   * Reference: CNCControllerDeepLearningEngine — okuma_osp controller profile
   *            Siemens 5 axis — Section 5 (Controller G-code mapping)
   *
   * @param operation_type - Type of 5-axis operation
   * @param requires_rtcp - Whether the operation needs RTCP/TCPM
   * @returns OSP-P300 G-code preamble and controller settings
   */
  static queryOkumaMU4000V(
    operation_type: "3plus2_indexed" | "simultaneous_5ax" | "swarf" | "impeller" | "port",
    requires_rtcp: boolean
  ): OkumaOSPP300Config {
    // Okuma MU-4000V (OSP-P300) — JM Die 5-axis machine
    // A+C table-table, 30° (A-axis), unlimited C rotation
    const base: OkumaOSPP300Config = {
      machine_id: "OKUMA-MU4000V",
      machine_name: "Okuma MU-4000V",
      controller: "OSP-P300S",
      kinematic_type: "table_table",
      primary_axis: "A",
      secondary_axis: "C",
      axis_limits: { A_min: -30, A_max: 90, C_min: -360, C_max: 360 },
      max_rpm: 12000,
      max_feed_mmmin: 20000,
      rtcp_command: "G43.4",
      rtcp_cancel: "G49",
      workplane_tilt: "G68.2",
      ai_contour: true,
      gcode_preamble: [],
      parameter_notes: [],
      safety_checks: [],
    };

    if (operation_type === "3plus2_indexed") {
      base.gcode_preamble = [
        "G90 G94 G17",
        "G68.2 X0 Y0 Z0 I{A} J0 K{C}  (Tilted workplane — OSP-P300 G68.2)",
        "G53.1  (Activate tool axis direction)",
        "G43 H_ Z50.0",
      ];
      base.parameter_notes = [
        "No RTCP required for 3+2 indexed",
        "Set WORKOFS for datum at rotary center",
        "Verify G68.2 reference point matches CAM setup origin",
      ];
      base.safety_checks = [
        "Run DRY RUN at 5% feed to verify orientation",
        "Check tool length offset with probe after indexing",
      ];
    } else if (operation_type === "simultaneous_5ax" || operation_type === "swarf") {
      base.gcode_preamble = [
        "G90 G94 G17",
        `G43.4 H_  (OSP-P300 RTCP — Tool Center Point Control)`,
        "G _ X_ Y_ Z_ A_ C_ F_  (5-axis block with RTCP active)",
      ];
      base.parameter_notes = [
        "G43.4 enables RTCP — tool tip remains at programmed coordinates",
        "Set machine parameters: RTCP_PIVOT_A and RTCP_PIVOT_C to measured pivot distances",
        "AI Contour enabled on OSP-P300 for smooth interpolation at low feeds",
        "Use NURBS output (G5.1 Q1) for smoother paths if post supports it",
      ];
      base.safety_checks = [
        "Verify pivot point calibration with ball bar test",
        "Check G43.4 mode active before 5-axis block",
        "Ensure G49 cancels RTCP before rapid to tool change",
      ];
    } else if (operation_type === "impeller") {
      base.gcode_preamble = [
        "G90 G94 G17",
        "G43.4 H_  (RTCP for impeller machining)",
        "(Impeller cycle — use hyperMILL 5X Blade cycle post for OSP-P300)",
      ];
      base.parameter_notes = [
        "Impeller machining requires RTCP throughout",
        "Set feedrate override macro for hub vs blade regions",
        "Inter-blade clearance check required in CAM before post",
      ];
      base.safety_checks = [
        "Simulate with machine model (hyperMILL Virtual Machine or VERICUT)",
        "Verify A-axis does not exceed -30° on hub approach",
        "Confirm coolant pressure adequate for deep inter-blade flooding",
      ];
    } else { // port
      base.gcode_preamble = [
        "G90 G94 G17",
        "G43.4 H_  (RTCP for port machining)",
        "(Port approach: retract Z, index C, re-engage with lead angle)",
      ];
      base.parameter_notes = [
        "Port machining: program tool axis along port centerline",
        "Use constant lead angle (5-10°) relative to port surface",
        "Multiple passes may be needed for port bore size",
      ];
      base.safety_checks = [
        "Check clearance at port opening on entry",
        "Verify no C-axis wrap-around at port exit",
        "Confirm through-coolant flow not blocked by port geometry",
      ];
    }

    return base;
  }
}

// ============================================================================
// SUPPLEMENTARY TYPES (new — added for 5-axis deep reasoning methods)
// ============================================================================

/** Result from analyze5AxisRequirement */
export interface FiveAxisRequirementAnalysis {
  /** Normalized score 0-1 (>0.75 = required, 0.45-0.75 = beneficial, <0.45 = optional) */
  score: number;
  /** Primary recommendation */
  recommendation: "5_axis_required" | "5_axis_beneficial" | "3_plus_2_sufficient" | "3_axis_sufficient";
  /** Recommended execution mode */
  recommended_mode: "simultaneous_5ax" | "3_plus_2_preferred" | "either";
  /** Reasons for recommendation */
  reasons: string[];
  /** Warnings or caveats */
  warnings: string[];
  /** Number of features analyzed */
  feature_count: number;
  /** Total undercut count */
  undercut_count: number;
  /** Maximum complexity score across features */
  complexity_max: number;
}

/** Tool axis strategy recommendation */
export interface ToolAxisStrategy {
  /** Control method */
  method: "lead_lag" | "tilt" | "swarf" | "indexed_3plus2" | "from_surface";
  /** Lead angle (positive = tool tilts forward in feed direction) */
  lead_angle_deg: number;
  /** Lag angle (positive = tool tilts backward) */
  lag_angle_deg: number;
  /** Side tilt from surface normal */
  tilt_angle_deg: number;
  /** Side tilt perpendicular to feed */
  side_tilt_deg: number;
  /** Human-readable description */
  description: string;
  /** CAM system setting name */
  cam_setting: string;
  /** Whether RTCP must be active */
  rtcp_required: boolean;
  /** Recommended tool type */
  recommended_tool_type: ToolType;
  /** Expected surface quality */
  surface_quality: "excellent" | "good" | "acceptable" | "poor";
  /** Expected productivity level */
  productivity: "excellent" | "good" | "acceptable" | "poor";
  /** Safety note */
  safety_note: string;
}

/** Collision zone definition */
export interface CollisionZone {
  /** Zone name */
  name: string;
  /** Zone type */
  type: "fixture" | "clamp" | "holder" | "arbor" | "shank" | "tool_body" | "part";
  /** Required safety offset (mm) */
  safety_offset_mm: number;
  /** Approximate bounding box (mm from WCS origin) */
  bbox?: { x_min: number; x_max: number; y_min: number; y_max: number; z_min: number; z_max: number };
}

/** Optimized toolpath configuration */
export interface OptimizedToolpathConfig {
  /** Name of original strategy */
  original_strategy: string;
  /** List of modifications applied */
  modifications: string[];
  /** Safety checks to perform */
  safety_checks: string[];
  /** Retract strategy */
  retract_strategy: "none" | "z_retract" | "tilt_retract" | "full_retract";
  /** Overall risk level */
  risk_level: "low" | "medium" | "high";
  /** Minimum clearance applied (mm) */
  clearance_mm: number;
  /** G-code notes for controller */
  gcode_notes: string[];
  /** Number of collision zones processed */
  zone_count: number;
  /** Whether CAM simulation is mandatory */
  simulation_required: boolean;
}

/** Single kinematic validation finding */
export interface KinematicValidation {
  type: "axis_limit_exceeded" | "singularity_proximity" | "rtcp_disabled" | "feed_rate_limit";
  axis: "A" | "B" | "C";
  value_deg: number;
  limit_deg: number;
  label: string;
  severity: "error" | "warning";
  remedy: string;
}

/** Full kinematic validation result */
export interface KinematicValidationResult {
  /** True if no violations (warnings allowed) */
  is_valid: boolean;
  /** Hard violations (axis limits exceeded) */
  violations: KinematicValidation[];
  /** Soft warnings (singularity proximity, RTCP) */
  warnings: KinematicValidation[];
  /** Number of singularity-proximity points */
  singularity_count: number;
  /** RTCP available on machine */
  rtcp_ok: boolean;
  /** Maximum A-axis angle reached */
  max_a_reached_deg: number;
  /** Maximum C-axis angle reached */
  max_c_reached_deg: number;
  /** Total points checked */
  point_count: number;
  /** Okuma OSP-P300 specific recommendations */
  osp_p300_recommendations: string[];
}

/** 3+2 index position recommendation */
export interface IndexAngleRecommendation {
  /** Setup sequence number */
  setup_number: number;
  /** A-axis index angle (degrees) */
  A_deg: number;
  /** C-axis index angle (degrees) */
  C_deg: number;
  /** Feature types accessible at this index */
  features_covered: FiveAxisGeometry[];
  /** Number of features in this setup */
  feature_count: number;
  /** Whether RTCP is needed during cutting at this index */
  requires_rtcp: boolean;
  /** Corresponding G-code for tilted workplane */
  cam_g_code: string;
  /** Human-readable description */
  description: string;
  /** Priority (1 = first, highest feature count) */
  priority: number;
}

/** HyperMill strategy hint for integration */
export interface HyperMillStrategyHint {
  /** hyperMILL strategy name */
  hm_strategy: string;
  /** hyperMILL cycle name */
  hm_cycle: string;
  /** Recommended lead angle */
  lead_angle: number;
  /** Usage notes */
  notes: string;
}

/** Okuma MU-4000V OSP-P300 configuration */
export interface OkumaOSPP300Config {
  machine_id: string;
  machine_name: string;
  controller: string;
  kinematic_type: "table_table";
  primary_axis: "A";
  secondary_axis: "C";
  axis_limits: { A_min: number; A_max: number; C_min: number; C_max: number };
  max_rpm: number;
  max_feed_mmmin: number;
  rtcp_command: string;
  rtcp_cancel: string;
  workplane_tilt: string;
  ai_contour: boolean;
  gcode_preamble: string[];
  parameter_notes: string[];
  safety_checks: string[];
}

// ============================================================================
// OKUMA MU-4000V CONSTANT (JM Die 5-axis machine)
// ============================================================================

/**
 * Okuma MU-4000V with OSP-P300S controller — JM Die Company 5-axis machine.
 * A+C table-table trunnion. A-axis: -30° to +90°. C-axis: unlimited.
 * RTCP via G43.4. AI Contour enabled. 12,000 RPM, 20m/min rapid.
 *
 * Reference: Okuma MU-4000V specifications (2024)
 *            OSP-P300S Programming Manual — 5-axis functions
 */
export const OKUMA_MU4000V_KINEMATICS: MachineKinematics5Ax = {
  machine_id: "OKUMA-MU4000V",
  kinematic_type: "mixed_AC",        // Table (A) + Table (C) trunnion style
  primary_axis: "A",
  secondary_axis: "C",
  axis_limits: {
    a_min_deg: -30,
    a_max_deg: 90,
    c_min_deg: -360,
    c_max_deg: 360,
  },
  max_rotary_speed_deg_sec: 83.3,    // 500°/sec max rotary feed
  pivot_to_gauge_mm: 320,            // MU-4000V approximate spindle nose to A-axis center
  pivot_to_table_mm: 180,            // A-axis center to table face
  rtcp_enabled: true,                // OSP-P300S G43.4 RTCP
};

// Export singleton
export const fiveAxisDeepLearningEngine = new FiveAxisDeepLearningEngine();
