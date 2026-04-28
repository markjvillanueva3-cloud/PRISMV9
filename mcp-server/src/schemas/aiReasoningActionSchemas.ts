/**
 * AI Reasoning Action Schemas — prism_ai dispatcher
 * ==================================================
 * Zod schemas for 6 mill-targeted AI reasoning actions.
 *
 * @module schemas/aiReasoningActionSchemas
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";
import {
  TaskCategory,
  ConfidenceLevel,
} from "./successPatternSchema.js";

/** Supported actions for prism_ai dispatcher */
export const AI_REASONING_ACTIONS = [
  "ai_route_mill_pipeline",
  "ai_mill_agi_reason",
  "ai_mill_awareness_query",
  "ai_mill_scientific_analyze",
  "ai_mill_wisdom_query",
  "ai_mill_adaptive_strategy",
  "pattern_record",
  "pattern_query",
  "pattern_reinforce",
  "pattern_stats",
  "sfc_drift_canary_check",
  "ppg_drift_canary_check",
  "sfc_fewshot_predict",
  "ppg_sfc_closed_loop",
  "iterate_retrieve",
  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
  "ai_explain_decision",
  "ai_extract_classify",
  "ai_physics_optimize",
  "ai_knowledge_query",
  "ai_material_lookup",
] as const;

export type AIReasoningAction = (typeof AI_REASONING_ACTIONS)[number];

/** ISO material group enum */
const ISOGroupEnum = z.enum(["P", "M", "K", "N", "S", "H"]);

/** Tool geometry schema */
const ToolGeometrySchema = z.object({
  diameter_mm: z.number().positive().describe("Tool diameter in mm"),
  flutes: z.number().int().positive().describe("Number of flutes"),
  flute_length_mm: z.number().positive().optional().describe("Flute length"),
  overall_length_mm: z.number().positive().optional().describe("Overall length"),
  corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius"),
  helix_angle_deg: z.number().optional().describe("Helix angle in degrees"),
  coating: z.string().optional().describe("Tool coating"),
});

/** Cutting parameters schema */
const CuttingParamsSchema = z.object({
  rpm: z.number().positive().optional().describe("Spindle speed"),
  feed_mmpm: z.number().positive().optional().describe("Feed rate mm/min"),
  feed_per_tooth: z.number().positive().optional().describe("Feed per tooth mm"),
  doc_mm: z.number().positive().optional().describe("Depth of cut mm"),
  woc_mm: z.number().positive().optional().describe("Width of cut mm"),
  radial_engagement: z.number().min(0).max(1).optional().describe("Radial engagement ratio"),
  axial_engagement: z.number().min(0).max(1).optional().describe("Axial engagement ratio"),
  coolant: z.enum(["flood", "mist", "through_spindle", "air", "none"]).optional(),
});

/** Machine configuration schema */
const MachineConfigSchema = z.object({
  machine_id: z.string().optional().describe("Machine identifier"),
  max_rpm: z.number().positive().optional().describe("Max spindle RPM"),
  max_power_kw: z.number().positive().optional().describe("Max spindle power kW"),
  max_torque_nm: z.number().positive().optional().describe("Max torque Nm"),
  has_4th_axis: z.boolean().optional(),
  has_5th_axis: z.boolean().optional(),
});

/** AGI reasoning modes */
const ReasoningModeEnum = z.enum([
  "chain_of_thought",
  "tree_of_thought",
  "counterfactual",
  "hypothesis_ranking",
  "analogical",
  "temporal",
  "causal",
  "abductive",
  "deductive",
  "inductive",
  "creative",
  "cross_domain",
]);

// ============================================================================
// ACTION SCHEMAS
// ============================================================================

/** Route mill pipeline — Full P2P pipeline orchestration */
const ai_route_mill_pipeline = z.object({
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  params: CuttingParamsSchema.optional().describe("Cutting parameters"),
  machine: MachineConfigSchema.optional().describe("Machine configuration"),
  features: z.array(z.record(z.string(), z.unknown())).optional().describe("CAD features to process"),
  geometry: z.unknown().optional().describe("Part geometry data"),
  include_provenance: z.boolean().optional().describe("Include provenance tracking"),
}).passthrough();

/** AGI reasoning — Multi-mode reasoning for mill optimization */
const ai_mill_agi_reason = z.object({
  intent: z.string().min(1).describe("Reasoning intent or problem statement"),
  reasoning_mode: ReasoningModeEnum.optional().describe("Reasoning mode to use"),
  material: z.string().optional().describe("Material context"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry context"),
  params: CuttingParamsSchema.optional().describe("Current cutting parameters"),
  constraints: z.record(z.string(), z.unknown()).optional().describe("Optimization constraints"),
  include_provenance: z.boolean().optional().describe("Include provenance tracking"),
}).passthrough();

/** Awareness query — Query mill engine capabilities and registry */
const ai_mill_awareness_query = z.object({
  query: z.string().min(1).describe("Capability query string"),
  category: z.enum([
    "orchestrator", "agi", "physics", "kinematics", "lora",
    "neural", "strategy", "validation", "tribal", "all"
  ]).optional().describe("Filter by engine category"),
  include_methods: z.boolean().optional().describe("Include method signatures"),
  top_k: z.number().int().positive().max(50).optional().describe("Max results to return"),
}).passthrough();

/** Scientific analysis — Physics-backed calculations */
const ai_mill_scientific_analyze = z.object({
  analysis_type: z.enum([
    "force", "deflection", "chatter", "thermal", "power", "tool_life", "all"
  ]).optional().describe("Type of scientific analysis"),
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  params: CuttingParamsSchema.optional().describe("Cutting parameters"),
  machine: MachineConfigSchema.optional().describe("Machine limits"),
  include_provenance: z.boolean().optional().describe("Include formula provenance"),
}).passthrough();

/** Wisdom query — Tribal knowledge and machinist experience */
const ai_mill_wisdom_query = z.object({
  query: z.string().min(1).describe("Knowledge query"),
  domain: z.enum([
    "tool_selection", "speed_feed", "workholding", "surface_finish",
    "chatter_mitigation", "chip_control", "coolant", "programming",
    "setup", "inspection", "general"
  ]).optional().describe("Knowledge domain"),
  material: z.string().optional().describe("Material context"),
  operation: z.string().optional().describe("Operation type (roughing, finishing, etc.)"),
  top_k: z.number().int().positive().max(20).optional().describe("Max tips to return"),
}).passthrough();

/** Adaptive strategy — Generate adaptive toolpath strategies */
const ai_mill_adaptive_strategy = z.object({
  operation: z.enum([
    "adaptive_clearing", "trochoidal", "hsm", "prism_forces",
    "plunge_roughing", "rest_machining", "pencil", "flowline"
  ]).describe("Adaptive operation type"),
  material: z.string().optional().describe("Workpiece material"),
  iso_group: ISOGroupEnum.optional().describe("ISO material group"),
  tool: ToolGeometrySchema.optional().describe("Tool geometry"),
  machine: MachineConfigSchema.optional().describe("Machine configuration"),
  feature_type: z.string().optional().describe("Target feature type (pocket, slot, etc.)"),
  stock_to_leave: z.number().nonnegative().optional().describe("Finishing stock mm"),
  include_provenance: z.boolean().optional().describe("Include strategy provenance"),
}).passthrough();

// ============================================================================
// SUCCESS PATTERN BANK SCHEMAS (AI Augmentation Learning Loop)
// ============================================================================

/** Record a success pattern */
const pattern_record = z.object({
  task_category: TaskCategory.describe("Category of task"),
  task_description: z.string().max(500).describe("Brief task description"),
  task_keywords: z.array(z.string()).min(1).max(10).describe("Keywords for similarity search"),
  approach_summary: z.string().max(1000).describe("Summary of successful approach"),
  mcp_actions_used: z.array(z.string()).max(20).optional().describe("MCP actions that contributed"),
  tools_used: z.array(z.string()).max(20).optional().describe("Tools that contributed"),
  engines_invoked: z.array(z.string()).max(20).optional().describe("Engines that were called"),
  confidence: ConfidenceLevel.optional().describe("Confidence level"),
  domain: z.string().max(50).optional().describe("Domain context (mill, lathe, wedm)"),
  constraints: z.array(z.string()).max(10).optional().describe("Constraints that applied"),
  lineage_id: z.string().optional().describe("Links to original session/task"),
  pattern_id: z.string().uuid().optional().describe("Custom pattern ID"),
}).passthrough();

/** Query patterns */
const pattern_query = z.object({
  task_category: TaskCategory.optional().describe("Filter by task category"),
  keywords: z.array(z.string()).max(10).optional().describe("Keywords to match"),
  domain: z.string().max(50).optional().describe("Filter by domain"),
  min_confidence: ConfidenceLevel.optional().describe("Minimum confidence level"),
  min_success_count: z.number().int().min(1).optional().describe("Minimum success count"),
  limit: z.number().int().min(1).max(100).optional().describe("Max results (default 10)"),
}).passthrough();

/** Reinforce a pattern (record success/failure) */
const pattern_reinforce = z.object({
  pattern_id: z.string().uuid().describe("Pattern ID to reinforce"),
  success: z.boolean().describe("Whether pattern succeeded this time"),
  note: z.string().max(200).optional().describe("Optional note"),
}).passthrough();

/** Get pattern bank statistics */
const pattern_stats = z.object({}).passthrough();

/** Iterative retrieval — progressive context refinement (DISPATCH→EVALUATE→REFINE→LOOP, max 3 cycles) */
const iterate_retrieve = z.object({
  query: z.string().min(1).describe("Natural-language task or search intent"),
  dispatch_target: z.enum([
    "codebase",
    "engines_only",
    "skills_only",
    "knowledge_wiki",
    "dispatchers_only",
  ]).optional().describe("Search scope (default: codebase)"),
  max_cycles: z.number().int().min(1).max(5).optional().describe("Max refinement cycles (default 3)"),
  target_count: z.number().int().min(1).max(50).optional().describe("High-relevance hits needed for early termination (default 3)"),
  min_relevance: z.number().min(0).max(1).optional().describe("Threshold for high_relevance bucket (default 0.7)"),
  initial_keywords: z.array(z.string()).max(20).optional().describe("Seed keywords (in addition to query tokens)"),
  exclude_patterns: z.array(z.string()).max(20).optional().describe("Path substrings to exclude"),
  max_files_per_cycle: z.number().int().min(10).max(500).optional().describe("Cap per cycle (default 100)"),
}).passthrough();

// ─── ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines ──────

/** AI Decision Explanation — narrate why parameters were chosen. */
const ai_explain_decision = z.object({
  operationId: z.string().min(1).describe("Operation ID for traceability"),
  operationType: z.enum([
    "roughing","finishing","drilling","threading","tapping","boring","reaming",
    "facing","turning","grooving","parting","profiling","pocketing","contouring",
    "chamfering","wire_edm","sinker_edm","grinding","general",
  ]).describe("High-level operation classification"),
  operationName: z.string().optional().describe("Human-readable operation name"),
  parameters: z.array(z.object({
    parameter: z.string().min(1),
    chosenValue: z.union([z.number(), z.string()]),
    unit: z.string(),
    context: z.record(z.string(), z.unknown()).optional(),
    sources: z.array(z.unknown()).optional(),
    alternatives: z.array(z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    displayName: z.string().optional(),
  }).passthrough()).min(1).describe("Parameter decisions to explain"),
  verbosity: z.enum(["brief", "normal", "detailed"]).optional().describe("Explanation depth"),
  includeTribalKnowledge: z.boolean().optional().describe("Include tribal-tip references"),
  targetAudience: z.enum(["operator", "engineer", "manager"]).optional().describe("Tailor wording"),
}).passthrough();

/** AI Extraction Classifier — categorize raw extracted content. */
const ai_extract_classify = z.object({
  content: z.unknown().describe("Raw extracted content (object, string, or array)"),
}).passthrough();

/** AI Physics Optimization — multi-objective parameter search with physics + AI agents. */
const ai_physics_optimize = z.object({
  material: z.object({
    name: z.string().min(1),
    iso_group: z.enum(["P","M","K","N","S","H"]).optional(),
    hardness_hrc: z.number().optional(),
    hardness_hb: z.number().optional(),
    kc1_1: z.number().positive().optional(),
    mc: z.number().optional(),
    thermal_conductivity: z.number().positive().optional(),
    machinability_factor: z.number().positive().optional(),
  }).passthrough().describe("Workpiece material spec"),
  tool: z.object({
    type: z.enum(["endmill","insert","drill","tap","boring_bar","turning_insert"]),
    material: z.enum(["hss","carbide","ceramic","cbn","pcd"]),
    diameter_mm: z.number().positive(),
    flutes: z.number().int().positive().optional(),
    coating: z.string().optional(),
    helix_angle_deg: z.number().optional(),
    corner_radius_mm: z.number().nonnegative().optional(),
    stickout_mm: z.number().positive().optional(),
    edge_radius_mm: z.number().nonnegative().optional(),
  }).passthrough().describe("Tool spec"),
  machine: z.object({
    type: z.enum(["vertical_mill","horizontal_mill","lathe","turn_mill","5axis"]),
    power_kw: z.number().positive(),
    max_rpm: z.number().positive(),
    max_torque_nm: z.number().positive().optional(),
    taper: z.string().optional(),
    rigidity: z.enum(["low","medium","high"]).optional(),
    natural_freq_hz: z.number().positive().optional(),
  }).passthrough().describe("Machine spec"),
  operation: z.object({
    operation: z.enum(["roughing","finishing","semi_finishing","drilling","threading","grooving"]),
    feature: z.string().optional(),
    strategy: z.string().optional(),
    coolant: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
  }).passthrough().describe("Operation context"),
  objectives: z.object({
    maximize_mrr: z.boolean().optional(),
    maximize_tool_life: z.boolean().optional(),
    minimize_cost: z.boolean().optional(),
    minimize_cycle_time: z.boolean().optional(),
    maximize_surface_quality: z.boolean().optional(),
    minimize_deflection: z.boolean().optional(),
    weights: z.object({
      productivity: z.number().min(0),
      tool_cost: z.number().min(0),
      quality: z.number().min(0),
      safety: z.number().min(0),
    }).passthrough().optional(),
  }).passthrough().optional().describe("Optimization weights"),
  constraints: z.object({
    max_force_N: z.number().positive().optional(),
    max_power_kw: z.number().positive().optional(),
    max_deflection_um: z.number().positive().optional(),
    min_tool_life_min: z.number().positive().optional(),
    max_temperature_C: z.number().optional(),
  }).passthrough().optional().describe("Hard constraints"),
  use_swarm: z.boolean().optional().describe("Enable swarm-of-agents reasoning"),
  use_creative_reasoning: z.boolean().optional().describe("Enable cross-disciplinary creative mode"),
  use_uncertainty_quantification: z.boolean().optional().describe("Run Monte Carlo UQ"),
  monte_carlo_samples: z.number().int().positive().optional().describe("MC sample count"),
}).passthrough();

/** AI Deep Knowledge Query — multi-source knowledge fusion. */
const ai_knowledge_query = z.object({
  intent: z.enum([
    "recommend_parameters","validate_physics","find_similar_programs","get_tribal_wisdom",
    "suggest_toolpath","analyze_material","optimize_process","generate_code",
    "debug_issue","learn_from_resource",
  ]).describe("What kind of answer the caller wants"),
  domain: z.string().min(1).describe("Domain hint (e.g. 'milling', 'turning', material name)"),
  context: z.record(z.string(), z.unknown()).describe("Free-form context object"),
  constraints: z.array(z.string()).optional().describe("Optional constraint strings"),
  depth: z.enum(["surface","moderate","deep","exhaustive"]).optional().describe("Reasoning depth"),
}).passthrough();

/** AI Resource Material Lookup — surface learned material parameters from program corpus. */
const ai_material_lookup = z.object({
  material: z.string().min(1).describe("Material designation (e.g. AISI 4140, 6061-T6)"),
}).passthrough();

/** Map action to schema */
export const ACTION_AI_REASONING_SCHEMAS: Record<AIReasoningAction, z.ZodTypeAny> = {
  ai_route_mill_pipeline,
  ai_mill_agi_reason,
  ai_mill_awareness_query,
  ai_mill_scientific_analyze,
  ai_mill_wisdom_query,
  ai_mill_adaptive_strategy,
  pattern_record,
  pattern_query,
  pattern_reinforce,
  pattern_stats,
  iterate_retrieve,
  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
  ai_explain_decision,
  ai_extract_classify,
  ai_physics_optimize,
  ai_knowledge_query,
  ai_material_lookup,
};
