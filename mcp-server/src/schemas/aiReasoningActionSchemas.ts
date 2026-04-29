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
  // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
  "ai_milling_deep_reason",
  "ai_wedm_deep_logic",
  "ai_wedm_deep_neural",
  "ai_milling_synthesize",
  "ai_lathe_reason",
  // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
  "ai_milling_agi",
  "ai_milling_twin_simulate",
  "ai_wedm_master",
  "ai_wedm_neural_orchestrate",
  "ai_lathe_train",
  // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
  "ai_wedm_advanced_neural",
  "ai_wedm_agi_orchestrate",
  "ai_wedm_print_to_program",
  "ai_wedm_cam_knowledge",
  "ai_wedm_synthesize_knowledge",
  // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
  "ai_lathe_orchestrate",
  "ai_lathe_active_learn_select",
  "ai_lathe_bayesian_fit_gp",
  "ai_lathe_attention_compute",
  "ai_lathe_adaptive_engagement",
  // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
  "ai_code_gate_pending",
  "ai_self_mod_propose_batch",
  "ai_self_mod_is_approved",
  "ai_intelligence_maximize",
  "ai_hook_rule_match",
  // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines wired
  "creative_solve",       // P5-U01 → PRISMCreativeReasoningEngine.explore
  "causal_analyze",       // P5-U02 → CausalReasoningEngine.{addEdges,traceImpact,rootCauses}
  "counterfactual_predict", // P5-U03 → CounterfactualReasoningEngine.{createCausalGraph,generateCounterfactual}
  "scientific_reason",    // P5-U04 → ScientificReasoningEngine.reason (independent of mill alias)
  // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian belief tracking
  "belief_set",           // U-WIRE20 → set named distribution
  "belief_update",        // U-WIRE20 → Bayesian update via likelihood
  "belief_query",         // U-WIRE20 → get + topK + entropy + probabilityOf
  "belief_list",          // U-WIRE20 → list all beliefs + size
  "belief_delete",        // U-WIRE20 → delete by id
  // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — explicit step-by-step reasoning
  "cot_reason",           // U-WIRE21 → linear/adversarial/iterative reasoning chain
  "cot_reason_tree",      // U-WIRE21 → tree-of-thought beam search
  "cot_explain",          // U-WIRE21 → format a chain into human-readable trace
  "cot_apply_heuristics", // U-WIRE21 → manufacturing-domain heuristics for a context
  // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
  "learning_rank",        // U-WIRE24 → rank LearningCandidate[] by infoGain/cost (Ψ-weighted)
  "learning_summary",     // U-WIRE24 → summarize a ranked list (totals + topTopic)
  // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
  "meta_learning_record",     // U-WIRE25 → record (scenario, strategy, success) outcome
  "meta_learning_recommend",  // U-WIRE25 → best strategy for a scenario (Wilson lower-bound)
  "meta_learning_stats",      // U-WIRE25 → stats for (scenario, strategy) pair
  "meta_learning_list",       // U-WIRE25 → list scenarios or full stats matrix
  // ENGINE-WIRE-MS0/U-WIRE26: PeerLearningCoordinatorEngine — cross-session insight broker
  "peer_broadcast",   // U-WIRE26 → broadcast PeerInsight (deduped by content hash)
  "peer_query",       // U-WIRE26 → fetch insights with tag/confidence/exclude filters
  "peer_get",         // U-WIRE26 → get one insight by id
  "peer_size",        // U-WIRE26 → current number of accepted insights
  // ENGINE-WIRE-MS0/U-WIRE27: NeuralIntegrationEngine — neural cortex routing
  "neural_route",       // U-WIRE27 → route NeuralQuery to top engine+action+confidence
  "neural_recommend",   // U-WIRE27 → recommend slash commands for a query string
  "neural_synthesize",  // U-WIRE27 → multi-source synthesis (engines+wisdom+commands)
  "neural_stats",       // U-WIRE27 → learning stats (totalQueries, successRate, topRoutes)
  // ENGINE-WIRE-MS0/U-WIRE28: CNCControllerDeepLearningEngine — controller knowledge
  "controller_select",      // U-WIRE28 → pick best controller family for job requirements
  "controller_translate",   // U-WIRE28 → translate G-code from source dialect to target
  "controller_compare",     // U-WIRE28 → compare two controllers head-to-head
  "controller_macro",       // U-WIRE28 → generate macro skeleton for task + controller
  "controller_debug",       // U-WIRE28 → debug post-processor / G-code error message
  // ENGINE-WIRE-MS0/U-WIRE29: StatisticalLearningBoundsEngine — PAC/VC/Rademacher
  "bounds_pac_complexity",  // U-WIRE29 → PAC sample complexity m ≥ (1/ε)·(ln|H| + ln(1/δ))
  "bounds_vc",              // U-WIRE29 → VC bound √((d·ln(n/d) + ln(1/δ))/n)
  "bounds_rademacher",      // U-WIRE29 → Rademacher 2·R̂_n + 3·√(ln(2/δ)/(2n))
  "bounds_pac_bayes",       // U-WIRE29 → PAC-Bayes McAllester √((KL+ln(n/δ))/(2(n-1)))
  // ENGINE-WIRE-MS0/U-WIRE30: ProactiveLearningEngine — auto-trigger learning
  "proactive_detect",          // U-WIRE30 → detect learning triggers in a context
  "proactive_classify",        // U-WIRE30 → classify a trigger (priority + reason)
  "proactive_quality_report",  // U-WIRE30 → knowledge-quality monitor report
  "proactive_stats",           // U-WIRE30 → categorization stats
  // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — turn exceptions into knowledge
  "exception_handle",          // U-WIRE31 → capture an unexpected event, return analysis + suggestedActions
  "exception_record_outcome",  // U-WIRE31 → finalize event outcome; success generates tribal tip + envelope proposal
  "exception_pending",         // U-WIRE31 → list captured events not yet recorded
  "exception_stats",           // U-WIRE31 → totalEvents, learnedCount, successRate, tipsGenerated, proposalsGenerated
  // ENGINE-WIRE-MS0/U-WIRE32: TransferLearningBridgeEngine — cross-domain analogy finder
  "analogy_register",          // U-WIRE32 → register a single SolvedProblem (validates id/domain/title/description/solution)
  "analogy_register_many",     // U-WIRE32 → bulk register; throws on first invalid, prior inserts kept
  "analogy_find",              // U-WIRE32 → find analogous solved problems by free-text or structured query
  "analogy_inventory",         // U-WIRE32 → list registered problems (sorted by id) + size
  // ENGINE-WIRE-MS0/U-WIRE33: MultiAssetReasoningEngine — cross-asset reasoning (engines+formulas+materials)
  "multi_asset_reason",        // U-WIRE33 → reason(context) returns recommendation + assetsUsed + confidence + alternatives
  "multi_asset_types",         // U-WIRE33 → getAssetTypes() — canonical asset categories (engine/formula/algorithm/...)
  "multi_asset_reset",         // U-WIRE33 → reset() — clears initialization, forces re-init on next reason()
  // ENGINE-WIRE-MS0/U-WIRE34: JMDieProgramLearningEngine — patterns from 36,929 JM Die programs
  "jmdie_query",               // U-WIRE34 → query patterns by machineType / category / minFrequency / limit
  "jmdie_get_pattern",         // U-WIRE34 → fetch a single pattern by id (null if missing)
  "jmdie_get_tips",            // U-WIRE34 → flat list of tribal tips, optionally filtered by machineType
  "jmdie_stats",               // U-WIRE34 → totalPrograms, extractedPatterns, byMachineType, byCategory aggregations
  // ENGINE-WIRE-MS0/U-WIRE35: AlgorithmOrchestratorEngine — routes 8 seeded algorithms (kienzle, taylor, sld, johnson_cook, monte_carlo, bayesian_opt, kalman, lqr)
  "algo_orch_query",           // U-WIRE35 → filter algorithms by category/domain/inputType, sliced to limit
  "algo_orch_recommend",       // U-WIRE35 → recommend best algorithm by problemType+domain with alternatives
  "algo_orch_get",             // U-WIRE35 → fetch a single algorithm spec by id (null if missing)
  "algo_orch_count",           // U-WIRE35 → count of currently-loaded algorithms (sync, no await)
  // ENGINE-WIRE-MS0/U-WIRE36: FusionDeepLearningEngine — Fusion 360 CAM strategy knowledge base (23 strategies × 21 features × 6 ISO materials)
  "fusion_dl_select_strategy", // U-WIRE36 → chain-of-thought strategy selection with reasoning_chain + cutting_parameters + tribal_tips + warnings
  "fusion_dl_explain",         // U-WIRE36 → markdown explanation of a strategy by id (null if missing)
  "fusion_dl_list",            // U-WIRE36 → list strategies, optionally filtered by category enum
  "fusion_dl_stats",           // U-WIRE36 → engine stats (strategy count, knowledge entries, supported features/materials, categories)
  // ENGINE-WIRE-MS0/U-WIRE37: InventorCAMStrategyEngine — Inventor HSM/HSMWorks strategy DB (8 categories × 18 features)
  "inventorcam_recommend",     // U-WIRE37 → recommend top-5 strategies given feature/material/machine/tool/priority with reasoning
  "inventorcam_get_strategy",  // U-WIRE37 → fetch HSMStrategy by internal name (null if missing)
  "inventorcam_list",          // U-WIRE37 → list strategies, optional category filter (8-element enum)
  "inventorcam_categories",    // U-WIRE37 → categories with counts and descriptions (only non-empty)
  // ENGINE-WIRE-MS0/U-WIRE39: ActualVsPredictedCollectorEngine — neural training feedback (residuals + JM-DIE 2× weight)
  "avp_record",                // U-WIRE39 → record(observation) returns TrainingExample with computed residuals
  "avp_stats",                 // U-WIRE39 → getAllResidualStats() — per-target MAE/bias/RMSE/min/max
  "avp_emit_batch",            // U-WIRE39 → emitTrainingBatch() — null when buffer < min_batch_size
  "avp_trend",                 // U-WIRE39 → accuracyTrend(target) — first-half vs second-half RMSE
  // ENGINE-WIRE-MS0/U-WIRE40: FusionStrategyKnowledgeEngine - Fusion 360 strategy KB with chain-of-thought reasoning
  "fusion_kb_select_strategy",   // U-WIRE40: selectStrategy returns top-1 ranked recommendation with reasoning chain
  "fusion_kb_compare_strategies",// U-WIRE40: compareStrategies returns top-N with trade-off analysis (default N=3)
  "fusion_kb_list_strategies",   // U-WIRE40: list all OR filter by feature (does NOT bump engine query counter)
  "fusion_kb_get_strategy",      // U-WIRE40: fetch StrategyKnowledge by id (null if missing)
  "fusion_kb_stats",             // U-WIRE40: query counter; pass {reset:true} to clear after read
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

// ─── ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines ───

/** Milling Deep Reasoning — chain-of-thought reasoning over milling context. */
const ai_milling_deep_reason = z.object({
  query: z.string().min(1).describe("Natural-language reasoning question"),
  context: z.object({
    material: z.string().optional(),
    material_iso: z.enum(["P","M","K","N","S","H"]).optional(),
    hardness_hrc: z.number().optional(),
    operation: z.string().optional(),
    tool_type: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    machine: z.string().optional(),
    controller: z.string().optional(),
    customer: z.string().optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
    depth_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    is_thin_wall: z.boolean().optional(),
    is_5_axis: z.boolean().optional(),
  }).passthrough().describe("Milling operation context"),
  mode: z.enum(["analytical","comparative","diagnostic","predictive","creative"]).optional().describe("Reasoning mode (default analytical)"),
}).passthrough();

/** Wire EDM Deep Logic — symbolic + rule-based reasoning over WEDM problems. */
const ai_wedm_deep_logic = z.object({
  query: z.string().min(1).describe("Natural-language reasoning question"),
  context: z.record(z.string(), z.unknown()).optional().describe("Free-form context object"),
}).passthrough();

/** Wire EDM Deep Neural Reasoning — neural-net-style multi-hop inference. */
const ai_wedm_deep_neural = z.object({
  question: z.string().min(1).describe("Natural-language WEDM question"),
  context: z.object({
    material: z.string().optional(),
    thickness_mm: z.number().positive().optional(),
    target_ra_um: z.number().positive().optional(),
    machine: z.string().optional(),
    wire_diameter_mm: z.number().positive().optional(),
    constraints: z.array(z.string()).optional(),
    preferences: z.array(z.string()).optional(),
  }).passthrough().describe("WEDM context"),
  reasoning_depth: z.enum(["quick","standard","deep","exhaustive"]).optional().describe("Reasoning depth"),
}).passthrough();

/** Milling Deep Knowledge Synthesis — fuse tribal/physics/program sources. */
const ai_milling_synthesize = z.object({
  material: z.string().min(1).describe("Material designation"),
  material_iso: z.string().min(1).describe("ISO material group code (e.g. P, M, K)"),
  hardness_hrc: z.number().optional().describe("Workpiece hardness HRC"),
  operation: z.string().min(1).describe("Operation type"),
  feature_type: z.string().optional().describe("Feature type (pocket, profile, hole, etc.)"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter mm"),
  tool_type: z.string().optional().describe("Tool type"),
  tool_length_mm: z.number().positive().optional().describe("Tool length mm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  surface_finish_ra: z.number().positive().optional().describe("Target Ra"),
  machine: z.string().optional().describe("Machine name"),
  controller: z.string().optional().describe("Controller name"),
  customer: z.string().optional().describe("Customer name"),
  min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold"),
  prefer_conservative: z.boolean().optional().describe("Bias toward safer parameters"),
  require_physics_validation: z.boolean().optional().describe("Require physics validation"),
}).passthrough();

/** Lathe AI Reasoning — diagnostic/predictive reasoning over lathe operations. */
const ai_lathe_reason = z.object({
  operation_type: z.string().min(1).describe("Lathe operation type (turning, threading, grooving, parting, boring, etc.)"),
  material_iso: z.enum(["P","M","K","N","S","H"]).describe("ISO material group"),
  material_name: z.string().optional().describe("Material designation"),
  hardness_hrc: z.number().optional().describe("Workpiece hardness HRC"),
  diameter_mm: z.number().positive().optional().describe("Workpiece diameter mm"),
  length_mm: z.number().positive().optional().describe("Cut length mm"),
  depth_mm: z.number().positive().optional().describe("Depth of cut mm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  surface_finish_Ra_um: z.number().positive().optional().describe("Target Ra µm"),
  thread_pitch_mm: z.number().positive().optional().describe("Thread pitch mm"),
  controller: z.string().optional().describe("Controller name"),
  machine_brand: z.string().optional().describe("Machine brand"),
  optimization_target: z.enum(["balanced","max_speed","max_tool_life","min_cost","surface_quality"]).optional().describe("Optimization objective"),
}).passthrough();

// ─── ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines ─────

/** Milling AGI analysis — multi-objective, scientifically-justified parameter optimization. */
const ai_milling_agi = z.object({
  material: z.string().min(1).describe("Material designation"),
  tool_diameter_mm: z.number().positive().describe("Tool diameter mm"),
  tool_flutes: z.number().int().positive().describe("Tool flute count"),
  cutting_speed_m_min: z.number().positive().describe("Cutting speed Vc m/min"),
  feed_per_tooth_mm: z.number().positive().describe("Feed per tooth fz mm"),
  axial_depth_mm: z.number().positive().describe("Axial DOC ap mm"),
  radial_depth_mm: z.number().positive().describe("Radial DOC ae mm"),
  operation: z.string().min(1).describe("Operation type (roughing/finishing/etc.)"),
  coolant_type: z.string().optional().describe("Coolant type"),
  tool_coating: z.string().optional().describe("Tool coating"),
  helix_angle_deg: z.number().optional().describe("Helix angle deg"),
  rake_angle_deg: z.number().optional().describe("Rake angle deg"),
  corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius mm"),
}).passthrough();

/** Milling Digital Twin simulate — forward-simulate process state for N seconds. */
const ai_milling_twin_simulate = z.object({
  duration_s: z.number().positive().describe("Simulation duration in seconds"),
  parameter_changes: z.record(z.string(), z.unknown()).optional().describe("Optional process parameter overrides for this run"),
}).passthrough();

/** WEDM Master AI analyze — top-level Wire EDM AI orchestrator with depth control. */
const ai_wedm_master = z.object({
  domain: z.enum([
    "parameter_selection","pass_strategy","wire_selection","machine_selection",
    "troubleshooting","optimization","quality_prediction","cost_estimation","program_generation",
  ]).describe("Decision domain"),
  depth: z.enum(["quick","standard","deep","exhaustive"]).describe("Reasoning depth"),
  material: z.string().optional().describe("Material designation"),
  thickness_mm: z.number().positive().optional().describe("Material thickness mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra µm"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance mm"),
  wire_type: z.string().optional().describe("Wire type"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter mm"),
  customer: z.string().optional().describe("Customer name"),
  part_category: z.string().optional().describe("Part category"),
  question: z.string().optional().describe("Free-form question"),
  program_content: z.string().optional().describe("Program content for analysis"),
  current_params: z.record(z.string(), z.number()).optional().describe("Current parameter values"),
  constraints: z.record(z.string(), z.unknown()).optional().describe("Free-form constraints"),
  include_counterfactuals: z.boolean().optional().describe("Generate counterfactual scenarios"),
}).passthrough();

/** WEDM Neural Orchestrate — multi-strategy WEDM evaluation. */
const ai_wedm_neural_orchestrate = z.object({
  material: z.string().min(1).describe("Material designation"),
  thickness_mm: z.number().positive().describe("Material thickness mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra µm"),
  geometry: z.enum(["straight","complex","taper","corner_heavy"]).optional().describe("Geometry class"),
  priority: z.enum(["speed","quality","cost","balanced"]).optional().describe("Optimization priority"),
  constraints: z.object({
    max_cycle_time_min: z.number().positive().optional(),
    max_wire_consumption_m: z.number().positive().optional(),
    max_passes: z.number().int().positive().optional(),
    min_accuracy_mm: z.number().positive().optional(),
  }).passthrough().optional().describe("Hard constraints"),
  context: z.record(z.string(), z.unknown()).optional().describe("Decision context"),
  observations: z.array(z.string()).optional().describe("Observed signals"),
  symptoms: z.array(z.string()).optional().describe("Reported symptoms"),
}).passthrough();

/** Lathe AI Train — train from a batch of CNC lathe programs. */
const ai_lathe_train = z.object({
  programs: z.array(z.object({
    content: z.string().min(1).describe("Raw program text"),
    filepath: z.string().min(1).describe("Source filepath for traceability"),
  }).passthrough()).min(1).describe("Programs to train from"),
}).passthrough();

/** ENGINE-WIRE-MS0/U-WIRE08: Wire EDM AI Specialist Engines */

/** Advanced Neural — predict optimal WEDM parameters via deep ensemble. */
const ai_wedm_advanced_neural = z.object({
  material: z.string().min(1).describe("Workpiece material (e.g. D2, M2, carbide)"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  target_ra_um: z.number().positive().describe("Target surface roughness Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target dimensional accuracy in mm"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter in mm (default 0.25)"),
  taper_angle_deg: z.number().min(0).optional().describe("Taper angle in degrees"),
  machine: z.string().optional().describe("Machine model (e.g. Mitsubishi FA-S, Makino SP43)"),
}).passthrough();

/** AGI Orchestrate — full AGI reasoning chain for Wire EDM decision. */
const ai_wedm_agi_orchestrate = z.object({
  query: z.string().min(1).describe("Natural-language question or decision to reason about"),
  material: z.string().min(1).describe("Workpiece material"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  wire_diameter_mm: z.number().positive().describe("Wire diameter in mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target accuracy in mm"),
  machine: z.string().optional().describe("Machine model"),
  mode: z.enum(["analytical","creative","adaptive","predictive","counterfactual","causal","ensemble","physics","full_agi"]).optional().describe("AGI reasoning mode"),
  include_counterfactuals: z.boolean().optional().describe("Include counterfactual what-if analysis"),
  include_causal_analysis: z.boolean().optional().describe("Include causal inference step"),
}).passthrough();

/** Print to Program — AI-generate a Wire EDM NC program from part inputs. */
const ai_wedm_print_to_program = z.object({
  material: z.string().min(1).describe("Workpiece material"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  target_ra_um: z.number().positive().optional().describe("Target Ra in µm"),
  target_accuracy_mm: z.number().positive().optional().describe("Target accuracy in mm"),
  wire_type: z.enum(["plain_brass","zinc_coated","gamma_coated","diffusion_annealed","molybdenum"]).optional().describe("Wire type"),
  wire_diameter_mm: z.number().positive().optional().describe("Wire diameter in mm"),
  taper_angle_deg: z.number().min(0).optional().describe("Taper angle in degrees"),
  controller: z.enum(["mitsubishi","makino","sodick","fanuc","agie","charmilles"]).optional().describe("Machine controller"),
  program_number: z.number().int().positive().optional().describe("Program number"),
  part_name: z.string().optional().describe("Part name"),
  customer: z.string().optional().describe("Customer name"),
  reasoning_mode: z.enum(["ensemble","physics","neural","empirical","hybrid"]).optional().describe("AI reasoning mode"),
  enable_counterfactuals: z.boolean().optional().describe("Enable counterfactual analysis"),
  enable_ensemble: z.boolean().optional().describe("Enable multi-model ensemble"),
}).passthrough();

/** CAM Knowledge — search Mastercam Wire EDM knowledge base. */
const ai_wedm_cam_knowledge = z.object({
  query: z.string().min(1).describe("Search query for Wire EDM CAM knowledge"),
  category: z.enum(["toolpath","parameter","workflow","optimization","safety"]).optional().describe("Knowledge category filter"),
}).passthrough();

/** Synthesize Knowledge — fuse all Wire EDM knowledge sources to answer a query. */
const ai_wedm_synthesize_knowledge = z.object({
  question: z.string().min(1).describe("Question to synthesize knowledge for"),
  material: z.string().optional().describe("Workpiece material context"),
  thickness_mm: z.number().positive().optional().describe("Workpiece thickness context in mm"),
  wire_diameter: z.string().optional().describe("Wire diameter context (e.g. '0.25mm')"),
  target_ra_um: z.number().positive().optional().describe("Target Ra context in µm"),
  machine: z.string().optional().describe("Machine context"),
  urgency: z.enum(["low","normal","high","critical"]).optional().describe("Response urgency"),
  confidence_threshold: z.number().min(0).max(1).optional().describe("Minimum confidence threshold (0–1)"),
  max_hypotheses: z.number().int().positive().optional().describe("Maximum hypotheses to evaluate"),
}).passthrough();

/** Map action to schema */

// ─── ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines ─────────────────────
const ai_lathe_orchestrate = z.object({
  program: z.union([
    z.string().min(1).describe("G-code program text"),
    z.object({}).passthrough().describe("Lathe part description object"),
  ]).describe("Program or part-description"),
  context: z.object({
    material: z.string().optional().describe("Workpiece material identifier"),
    machineId: z.string().optional().describe("Machine instance identifier"),
    controller: z.string().optional().describe("CNC controller name"),
    constraints: z.object({}).passthrough().optional().describe("Optimization constraints"),
  }).passthrough().optional().describe("Optional orchestration context"),
  strategy: z.enum([
    "full_coverage",
    "fast_path",
    "quality_optimized",
    "cost_optimized",
    "safety_first",
    "learning_focused",
    "adaptive",
  ]).optional().describe("Orchestration strategy"),
}).passthrough();

const ai_lathe_active_learn_select = z.object({
  labeled_data: z.array(z.object({}).passthrough()).min(1).describe("Labeled data points"),
  pool_data: z.array(z.object({}).passthrough()).optional().describe("Unlabeled candidate pool"),
  n_samples: z.number().int().positive().max(1000).optional().describe("Number of samples to select"),
  query_strategy: z.enum([
    "uncertainty_sampling",
    "margin_sampling",
    "entropy_sampling",
    "query_by_committee",
    "expected_model_change",
    "expected_error_reduction",
    "bald",
    "core_set",
    "batch_bald",
    "hybrid",
  ]).optional().describe("Active-learning query strategy"),
  budget: z.object({}).passthrough().optional().describe("Optional sample budget overrides"),
}).passthrough();

const ai_lathe_bayesian_fit_gp = z.object({
  observations: z.array(z.object({
    x: z.array(z.number()).min(1).describe("Input vector"),
    y: z.number().describe("Observed objective value"),
    timestamp: z.number().optional().describe("Observation timestamp"),
  })).min(2).describe("Bayesian observations (≥2 required for GP fit)"),
  kernel_config: z.object({
    type: z.enum(["RBF", "Matern32", "Matern52", "RationalQuadratic", "Linear", "Periodic"]).describe("Kernel family"),
    length_scales: z.array(z.number().positive()).min(1).optional().describe("Per-dimension ARD length scales (auto-broadcast if missing)"),
    signal_variance: z.number().positive().optional().describe("Kernel output (signal) variance"),
    noise_variance: z.number().nonnegative().optional().describe("Observation noise variance"),
    matern_nu: z.union([z.literal(1.5), z.literal(2.5)]).optional().describe("Matern smoothness ν (1.5 or 2.5)"),
    alpha: z.number().positive().optional().describe("RationalQuadratic α parameter"),
  }).passthrough().describe("GP kernel configuration"),
}).passthrough();

const ai_lathe_attention_compute = z.object({
  tokens: z.array(z.object({
    id: z.number().int().nonnegative().describe("Token id"),
    token: z.string().min(1).describe("Token text"),
    type: z.enum([
      "G_CODE", "M_CODE", "T_CODE", "S_CODE", "F_CODE",
      "X_COORD", "Z_COORD", "I_COORD", "K_COORD",
      "R_CODE", "P_CODE", "Q_CODE", "U_CODE", "W_CODE",
      "N_LINE", "NAT_BLOCK", "COMMENT", "SPECIAL",
      "NUMBER", "UNKNOWN",
    ]).describe("G-code token type (matches engine GCodeTokenType union)"),
    position: z.number().int().nonnegative().describe("Position in sequence"),
    embedding: z.array(z.number()).min(1).describe("Pre-computed embedding"),
    value: z.number().optional().describe("Numeric value if applicable"),
    line_number: z.number().int().nonnegative().optional().describe("Source line number"),
    semantic_role: z.enum([
      "motion_command", "cycle_command", "spindle_control", "feed_control",
      "tool_selection", "positioning", "arc_definition", "dwell",
      "safety_critical", "coolant_control", "program_control",
      "operation_boundary", "work_offset", "compensation", "unknown",
    ]).optional().describe("Manufacturing semantic role (matches engine SemanticRole union)"),
  })).min(2).max(2048).describe("Pre-tokenized G-code with embeddings"),
}).passthrough();

const ai_lathe_adaptive_engagement = z.object({
  operation_type: z.enum(["od_turning", "id_boring", "facing", "grooving", "threading", "parting"]).describe("Turning operation type (matches engine TurningEngagement.operationType)"),
  diameter: z.number().positive().describe("Workpiece diameter (mm)"),
  depth_of_cut: z.number().positive().describe("Depth of cut ap (mm)"),
  feed_per_rev: z.number().positive().describe("Feed per revolution fn (mm/rev)"),
  lead_angle: z.number().positive().max(180).describe("Tool lead angle (deg)"),
  nose_radius: z.number().positive().describe("Insert nose radius rε (mm)"),
  cutting_speed: z.number().positive().describe("Cutting speed Vc (m/min)"),
}).passthrough();


// ─── ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines ──────────
const ai_code_gate_pending = z.object({
  status: z.string().optional().describe("Filter by gate status (e.g. 'pending', 'escalated')"),
  approver: z.string().optional().describe("Filter by approver"),
  request_type: z.string().optional().describe("Filter by request type"),
}).passthrough();

const ai_self_mod_propose_batch = z.object({
  observations: z.array(z.object({
    kind: z.enum(["extract-abstraction","remove-orphan","split-high-fan-in","merge-duplicates","deprecate-low-usage"]).describe("Proposal kind"),
    targets: z.array(z.string().min(1)).min(1).describe("Files or symbols to modify"),
    evidence: z.string().min(1).describe("Why this proposal is justified"),
    confidence: z.number().min(0).max(1).describe("Confidence in [0,1]"),
    estimatedEffortHours: z.number().nonnegative().optional().describe("Estimated effort in hours"),
    psiImpactEstimate: z.number().optional().describe("Estimated impact on system Psi"),
  })).min(1).max(100).describe("Pattern observations to convert into proposals"),
  at: z.string().optional().describe("ISO timestamp override (test reproducibility)"),
}).passthrough();

const ai_self_mod_is_approved = z.object({
  proposal_id: z.string().min(1).describe("Proposal id"),
  proposal_hash: z.string().min(1).describe("Proposal content hash"),
  now_ms: z.number().int().positive().optional().describe("Override 'now' timestamp"),
}).passthrough();

const ai_intelligence_maximize = z.object({
  operation: z.enum(["roughing","finishing","semi_finishing","drilling","boring","reaming","tapping","turning_od","turning_id","facing","grooving","threading","milling_pocket","milling_contour","milling_slot","milling_face","5axis_swarf","5axis_multiaxis","5axis_positioning","grinding","edm_wire","edm_sinker","adaptive","trochoidal","hsm"]).describe("Operation type"),
  material: z.string().min(1).describe("Material identifier"),
  hardness_hrc: z.number().nonnegative().optional().describe("Hardness in HRC"),
  feature: z.string().optional().describe("Feature type"),
  tolerance_mm: z.number().positive().optional().describe("Tolerance (mm)"),
  surface_finish_ra: z.number().positive().optional().describe("Surface finish target Ra (µm)"),
  machine_type: z.string().optional().describe("Machine type"),
  controller: z.string().optional().describe("CNC controller"),
  spindle_max_rpm: z.number().positive().optional().describe("Max spindle RPM"),
  spindle_power_kw: z.number().positive().optional().describe("Spindle power (kW)"),
  tool_type: z.string().optional().describe("Tool type"),
  tool_diameter_mm: z.number().positive().optional().describe("Tool diameter (mm)"),
  tool_material: z.string().optional().describe("Tool material"),
  coating: z.string().optional().describe("Tool coating"),
  flutes: z.number().int().positive().optional().describe("Flute count"),
}).passthrough();

const ai_hook_rule_match = z.object({
  tool: z.string().min(1).describe("Tool name (e.g. 'Bash', 'Write', 'Edit')"),
  params: z.record(z.string(), z.unknown()).describe("Tool parameters object"),
}).passthrough();

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
  // U-WIRE04 fix: stub schemas for pre-existing orphan actions (no real schema, accept any params)
  sfc_drift_canary_check: z.object({}).passthrough(),
  ppg_drift_canary_check: z.object({}).passthrough(),
  sfc_fewshot_predict: z.object({}).passthrough(),
  ppg_sfc_closed_loop: z.object({}).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
  ai_explain_decision,
  ai_extract_classify,
  ai_physics_optimize,
  ai_knowledge_query,
  ai_material_lookup,
  // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
  ai_milling_deep_reason,
  ai_wedm_deep_logic,
  ai_wedm_deep_neural,
  ai_milling_synthesize,
  ai_lathe_reason,
  // ENGINE-WIRE-MS0/U-WIRE05: 5 heavy AI orchestrator engines
  ai_milling_agi,
  ai_milling_twin_simulate,
  ai_wedm_master,
  ai_wedm_neural_orchestrate,
  ai_lathe_train,
  // ENGINE-WIRE-MS0/U-WIRE08: 5 Wire EDM AI specialist engines
  ai_wedm_advanced_neural,
  ai_wedm_agi_orchestrate,
  ai_wedm_print_to_program,
  ai_wedm_cam_knowledge,
  ai_wedm_synthesize_knowledge,
  // ENGINE-WIRE-MS0/U-WIRE18: 5 code-gen + approval engines
  ai_code_gate_pending,
  ai_self_mod_propose_batch,
  ai_self_mod_is_approved,
  ai_intelligence_maximize,
  ai_hook_rule_match,
  // ENGINE-WIRE-MS0/U-WIRE13: 5 Lathe AI engines
  ai_lathe_orchestrate,
  ai_lathe_active_learn_select,
  ai_lathe_bayesian_fit_gp,
  ai_lathe_attention_compute,
  ai_lathe_adaptive_engagement,
  // INTEL-OLLAMA-OBSIDIAN-MS0/P5: lenient passthrough schemas — engines own
  // their own input typing; the dispatcher just forwards the params object.
  creative_solve: z.object({
    problem: z.unknown().describe("ProblemDefinition object — see PRISMCreativeReasoningEngine"),
    mode: z.enum(["conventional", "exploratory", "hybrid", "innovative", "optimal"]).optional()
      .describe("Creative reasoning mode (default: exploratory)"),
    constraints: z.unknown().optional().describe("Optional constraint set"),
  }).passthrough(),
  causal_analyze: z.object({
    edges: z.array(z.unknown()).describe("CausalEdge array to add to the graph before query"),
    target: z.string().optional().describe("Node id to find root causes of (calls rootCauses)"),
    source: z.string().optional().describe("Node id to trace impact from (calls traceImpact)"),
    maxHops: z.number().int().positive().optional().describe("Max BFS depth (default 3)"),
  }).passthrough(),
  counterfactual_predict: z.object({
    graphSpec: z.object({
      domain: z.string(),
      variables: z.array(z.unknown()),
      relations: z.array(z.unknown()),
    }).describe("CausalGraph specification consumed by createCausalGraph"),
    intervention: z.object({
      variable: z.string(),
      value: z.union([z.number(), z.string(), z.boolean()]),
    }).describe("Variable + counterfactual value for the 'what if' query"),
  }).passthrough(),
  scientific_reason: z.object({
    problem: z.string().describe("Problem statement"),
    inputs: z.record(z.string(), z.unknown()).describe("PhysicalQuantity inputs keyed by name"),
    calculationType: z.string().describe("Calculation/formula identifier"),
  }).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE20: BeliefStateReasoningEngine — Bayesian belief tracking
  belief_set: z.object({
    id: z.string().min(1).describe("Belief id (unique key)"),
    distribution: z.record(z.string(), z.number().nonnegative()).describe(
      "State→probability map. Auto-normalized; need not sum to 1.",
    ),
    description: z.string().optional().describe("Human-readable description of what this belief tracks"),
  }).passthrough(),
  belief_update: z.object({
    id: z.string().min(1).describe("Existing belief id to update"),
    likelihood: z.record(z.string(), z.number().nonnegative()).describe(
      "Likelihood vector P(observation|state). States omitted default to 1.",
    ),
  }).passthrough(),
  belief_query: z.object({
    id: z.string().min(1).describe("Belief id to query"),
    topK: z.number().int().positive().optional().describe("Top-K most likely states (default 3)"),
    state: z.string().optional().describe("Specific state to return probability for"),
    includeEntropy: z.boolean().optional().describe("Include Shannon entropy in bits (default true)"),
  }).passthrough(),
  belief_list: z.object({}).passthrough().describe("No params; lists all beliefs and total count"),
  belief_delete: z.object({
    id: z.string().min(1).describe("Belief id to delete"),
  }).passthrough(),
  // ENGINE-WIRE-MS0/U-WIRE21: ChainOfThoughtEngine — step-by-step reasoning
  cot_reason: z.object({
    problem: z.string().min(1).describe("Problem statement"),
    goal: z.string().min(1).describe("What success looks like"),
    context: z.record(z.string(), z.unknown()).optional().describe(
      "Free-form context (material, operation, etc.) — also feeds heuristics",
    ),
    constraints: z.array(z.string()).optional().describe("Hard constraints"),
    known_facts: z.array(z.string()).optional().describe("Known/given facts"),
    strategy: z.enum(["linear", "branching", "iterative", "adversarial", "analogical"])
      .optional().describe("Reasoning strategy (default: linear)"),
    max_steps: z.number().int().positive().optional().describe("Max reasoning steps (default 20)"),
    confidence_threshold: z.number().min(0).max(1).optional()
      .describe("Stop when confidence reaches this (default 0.7)"),
  }).passthrough(),
  cot_reason_tree: z.object({
    problem: z.string().min(1).describe("Problem statement"),
    goal: z.string().min(1).describe("What success looks like"),
    context: z.record(z.string(), z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    known_facts: z.array(z.string()).optional(),
    max_steps: z.number().int().positive().optional(),
    beam_width: z.number().int().positive().optional()
      .describe("Tree-of-thought beam width (default 3)"),
  }).passthrough(),
  cot_explain: z.object({
    chain: z.unknown().describe("ReasoningChain object returned by cot_reason"),
  }).passthrough(),
  cot_apply_heuristics: z.object({
    problem: z.string().optional()
      .describe("Free-form problem statement (used to keyword-match heuristics)"),
    context: z.record(z.string(), z.unknown()).optional()
      .describe("Manufacturing context (material, operation, etc.) for context-specific heuristics"),
  }).passthrough(),
  // U-WIRE24 — ActiveLearningStrategyEngine
  learning_rank: z.object({
    candidates: z.array(z.object({
      id: z.string().min(1).describe("Unique candidate id"),
      topic: z.string().min(1).describe("Human-readable topic label"),
      currentUncertainty: z.number().min(0).max(1).describe("Current uncertainty in [0,1]"),
      expectedReduction: z.number().min(0).max(1).describe("Fraction of uncertainty this target removes, in [0,1]"),
      psiImpact: z.number().finite().optional().describe("Projected Ψ delta in percentage points (optional)"),
      costMinutes: z.number().positive().describe("Estimated cost in minutes (must be > 0)"),
      tags: z.array(z.string()).optional().describe("Optional free-form tags"),
    })).min(1).describe("LearningCandidate[] to rank — must contain at least one entry"),
  }).passthrough(),
  learning_summary: z.object({
    ranked: z.array(z.object({
      id: z.string(),
      topic: z.string(),
      currentUncertainty: z.number(),
      expectedReduction: z.number(),
      costMinutes: z.number(),
      infoGain: z.number(),
      score: z.number(),
      rank: z.number(),
    }).passthrough()).min(0).describe("RankedCandidate[] from prior learning_rank call"),
  }).passthrough(),
  // U-WIRE25 — MetaLearningOptimizerEngine
  meta_learning_record: z.object({
    scenario: z.string().min(1).describe("Content type / problem class label (e.g. 'kienzle_calibration')"),
    strategy: z.string().min(1).describe("Strategy identifier (e.g. 'tribal_lookup', 'pdf_extract')"),
    success: z.boolean().describe("Did the strategy succeed?"),
    durationMs: z.number().nonnegative().finite().optional().describe("Wall-clock duration in ms (optional)"),
  }).passthrough(),
  meta_learning_recommend: z.object({
    scenario: z.string().min(1).describe("Scenario to recommend a strategy for"),
    minAttempts: z.number().int().nonnegative().optional().describe("Minimum attempts required to qualify (default 1)"),
  }).passthrough(),
  meta_learning_stats: z.object({
    scenario: z.string().min(1).describe("Scenario label"),
    strategy: z.string().min(1).describe("Strategy label"),
  }).passthrough(),
  meta_learning_list: z.object({
    mode: z.enum(["scenarios", "all"]).optional().describe("'scenarios' returns scenario names only; 'all' returns full stats matrix (default 'all')"),
  }).passthrough(),
  // U-WIRE26 — PeerLearningCoordinatorEngine
  peer_broadcast: z.object({
    fromSession: z.string().min(1).describe("Originating session id"),
    summary: z.string().min(1).describe("One-line insight summary (used for content-hash dedup)"),
    detail: z.string().optional().describe("Optional longer-form detail"),
    tags: z.array(z.string()).describe("Tags for scoped retrieval (lowercased + deduped on store)"),
    confidence: z.number().min(0).max(1).describe("Confidence in [0,1]"),
    sensitivity: z.enum(["public", "redacted", "private"]).optional()
      .describe("'private' insights are rejected; default 'public'"),
    id: z.string().optional().describe("Override insight id (default auto-generated)"),
    at: z.string().optional().describe("ISO timestamp override (default now)"),
  }).passthrough(),
  peer_query: z.object({
    excludeSessionIds: z.array(z.string()).optional().describe("Skip insights from these sessions"),
    includeAnyTag: z.array(z.string()).optional().describe("Match if insight has ANY of these tags"),
    minConfidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold"),
    limit: z.number().int().nonnegative().optional().describe("Max results (default unlimited)"),
  }).passthrough(),
  peer_get: z.object({
    id: z.string().min(1).describe("Insight id to fetch"),
  }).passthrough(),
  peer_size: z.object({}).passthrough(),
  // U-WIRE27 — NeuralIntegrationEngine
  neural_route: z.object({
    input: z.string().min(1).describe("User query / prompt string"),
    context: z.string().optional().describe("Optional surrounding context"),
    domain: z.string().optional().describe("Optional domain hint (machining, edm, lathe, ...)"),
    urgency: z.enum(["low", "medium", "high", "critical"]).optional().describe("Urgency level"),
  }).passthrough(),
  neural_recommend: z.object({
    query: z.string().min(1).describe("Query to recommend slash commands for"),
  }).passthrough(),
  neural_synthesize: z.object({
    query: z.string().min(1).describe("Query to synthesize across multiple sources"),
  }).passthrough(),
  neural_stats: z.object({}).passthrough(),
  // U-WIRE28 — CNCControllerDeepLearningEngine
  // ControllerFamily values are validated by the engine itself; the schema
  // accepts any string here so new families don't require schema updates.
  controller_select: z.object({
    operation_type: z.string().min(1).describe("Operation kind (e.g. 'roughing', 'finishing', 'thread', 'edm')"),
    axes_needed: z.number().int().positive().describe("Required number of CNC axes (3, 4, 5, ...)"),
    max_rpm_needed: z.number().int().positive().optional().describe("Required spindle RPM (optional)"),
    macro_required: z.boolean().optional().describe("Job needs macro programming (default false)"),
    conversational_preferred: z.boolean().optional().describe("Operator prefers conversational programming"),
    jm_die_only: z.boolean().optional().describe("Restrict to JM Die shop floor machines"),
  }).passthrough(),
  controller_translate: z.object({
    sourceController: z.string().min(1).describe("Source controller family (e.g. 'fanuc_31i', 'okuma_osp')"),
    targetController: z.string().min(1).describe("Target controller family"),
    code: z.string().min(1).describe("G-code body to translate"),
  }).passthrough(),
  controller_compare: z.object({
    a: z.string().min(1).describe("First controller family"),
    b: z.string().min(1).describe("Second controller family"),
  }).passthrough(),
  controller_macro: z.object({
    taskDescription: z.string().min(1).describe("Task to generate macro for (e.g. 'probe corner and set WCS')"),
    controller: z.string().min(1).describe("Controller family"),
  }).passthrough(),
  controller_debug: z.object({
    errorMessage: z.string().min(1).describe("Error / alarm message text"),
    controller: z.string().min(1).describe("Controller family that produced the error"),
  }).passthrough(),
  // U-WIRE29 — StatisticalLearningBoundsEngine
  // All bounds enforce ε,δ ∈ (0,1) STRICTLY (open interval — engine throws
  // at exactly 0 or 1, so the schema mirrors that).
  bounds_pac_complexity: z.object({
    hypothesisClassSize: z.number().min(1).describe("Size of hypothesis class |H| (≥1)"),
    epsilon: z.number().gt(0).lt(1).describe("Desired accuracy ε in (0,1) — open interval"),
    delta: z.number().gt(0).lt(1).describe("Desired confidence δ in (0,1) — open interval"),
  }).passthrough(),
  bounds_vc: z.object({
    vcDim: z.number().nonnegative().describe("VC dimension d (≥0)"),
    n: z.number().int().positive().describe("Sample size n (positive integer)"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  bounds_rademacher: z.object({
    empiricalRademacher: z.number().nonnegative().describe("Empirical Rademacher complexity R̂_n (≥0)"),
    n: z.number().int().positive().describe("Sample size n (positive integer)"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  bounds_pac_bayes: z.object({
    kl: z.number().nonnegative().describe("KL divergence KL(Q||P) (≥0)"),
    n: z.number().int().gt(1).describe("Sample size n (integer > 1; bound divides by 2(n-1))"),
    delta: z.number().gt(0).lt(1).describe("Confidence δ in (0,1)"),
  }).passthrough(),
  // U-WIRE30 — ProactiveLearningEngine
  // The 'context' object has many optional fields; the engine validates
  // semantically. Schema accepts the documented LearningContext shape but
  // is permissive about extra fields (passthrough).
  proactive_detect: z.object({
    context: z.object({
      material: z.string().optional(),
      operation: z.string().optional(),
      machine: z.string().optional(),
      outcome: z.enum(["success", "failure", "partial"]).optional(),
      parameters: z.record(z.string(), z.unknown()).optional(),
      knowledge_sources: z.array(z.object({
        source: z.string(),
        recommendation: z.string(),
        confidence: z.number(),
      })).optional(),
      prior_confidence: z.number().optional(),
      outcome_confidence: z.number().optional(),
      is_routine: z.boolean().optional(),
    }).passthrough().describe("LearningContext to scan for trigger conditions"),
  }).passthrough(),
  proactive_classify: z.object({
    trigger: z.object({
      type: z.string().describe("LearningTriggerType label"),
    }).passthrough().describe("LearningTrigger object to classify"),
  }).passthrough(),
  proactive_quality_report: z.object({}).passthrough(),
  proactive_stats: z.object({}).passthrough(),
  // U-WIRE31 — ExceptionLearningEngine
  // handleUnexpected accepts an event sans id/timestamp (engine assigns both).
  // The four `type` values map to engine analysis branches; severity gates the
  // shouldFail return (critical without prior similar success → shouldFail).
  exception_handle: z.object({
    type: z.enum(["parameter_outlier", "outcome_anomaly", "process_deviation", "measurement_spike"])
      .describe("Exception category that selects the analysis template"),
    description: z.string().min(1).describe("Human-readable description of what happened"),
    context: z.record(z.string(), z.unknown())
      .describe("Free-form contextual metadata (machine, op, material, operator, …)"),
    data: z.record(z.string(), z.union([z.number(), z.string()]))
      .describe("Numeric/string measurements; for parameter_outlier include {parameter, value} to enable envelope proposals"),
    severity: z.enum(["info", "warning", "critical"])
      .describe("'critical' triggers shouldFail unless a similar exception has previously succeeded"),
  }).passthrough(),
  exception_record_outcome: z.object({
    eventId: z.string().min(1).describe("Event id returned by exception_handle (e.g. 'EX-7'); unknown id returns null"),
    outcome: z.enum(["success", "failure", "neutral"])
      .describe("'success' generates a tribal tip and (for parameter_outlier with data.value) an envelope proposal"),
  }).passthrough(),
  exception_pending: z.object({}).passthrough(),
  exception_stats: z.object({}).passthrough(),
  // U-WIRE32 — TransferLearningBridgeEngine
  // SolvedProblem shape inlined twice (register + register_many) rather than
  // hoisting a shared const, to match the existing inline-schema pattern in
  // this file. The engine's assertValid() additionally trims-and-checks each
  // string field; the Zod min(1) here matches that contract.
  analogy_register: z.object({
    problem: z.object({
      id: z.string().min(1).describe("Unique id across all registered problems"),
      domain: z.string().min(1).describe("Canonical PRISM domain (milling/turning/grinding/wire-edm/...)"),
      title: z.string().min(1).describe("One-line problem statement"),
      description: z.string().min(1).describe("Full description — substrate for lexical matching"),
      tags: z.array(z.string()).optional().describe("Optional structural tags participating in Jaccard overlap"),
      solution: z.string().min(1).describe("What was actually done — reported back verbatim with the match"),
    }).passthrough().describe("SolvedProblem to index"),
  }).passthrough(),
  analogy_register_many: z.object({
    problems: z.array(z.object({
      id: z.string().min(1),
      domain: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      tags: z.array(z.string()).optional(),
      solution: z.string().min(1),
    }).passthrough()).min(1).describe("Non-empty array of SolvedProblems; first invalid entry throws"),
  }).passthrough(),
  analogy_find: z.object({
    // Query is either a free-text string or a structured AnalogyQuery.
    query: z.union([
      z.string().min(1),
      z.object({
        description: z.string().min(1),
        domain: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }).passthrough(),
    ]).describe("Free-text problem statement OR {description,domain?,tags?}"),
    options: z.object({
      limit: z.number().int().min(0).optional().describe("Cap on returned matches; default 5; 0 = unlimited"),
      minScore: z.number().min(0).max(1).optional().describe("Minimum combined score; default 0.05"),
      crossDomainOnly: z.boolean().optional().describe("Drop same-domain problems entirely"),
    }).passthrough().optional(),
  }).passthrough(),
  analogy_inventory: z.object({}).passthrough(),
  // U-WIRE33 — MultiAssetReasoningEngine
  // reason() needs an objective string; constraints/availableAssetTypes/material/
  // machineType are optional. Engine returns ReasoningResult with confidence
  // bounded to [0.1, 1.0] internally.
  multi_asset_reason: z.object({
    context: z.object({
      objective: z.string().min(1).describe("What we're trying to accomplish"),
      constraints: z.array(z.string()).optional().describe("Constraint strings; each adds 0.05 confidence penalty"),
      availableAssetTypes: z.array(z.string()).optional().describe("Restrict reasoning to a subset of canonical asset types"),
      material: z.string().optional(),
      machineType: z.string().optional(),
    }).passthrough().describe("ReasoningContext to drive asset selection + recommendation"),
  }).passthrough(),
  multi_asset_types: z.object({}).passthrough(),
  multi_asset_reset: z.object({}).passthrough(),
  // U-WIRE34 — JMDieProgramLearningEngine
  // Engine seeds 15 patterns lazily on first call (3 machineTypes × 5 categories).
  // All read methods are async because they await initialize() internally.
  jmdie_query: z.object({
    machineType: z.enum(["lathe", "mill", "wedm"]).optional()
      .describe("Filter by machine type; engine seeds these three categories"),
    category: z.enum(["roughing", "finishing", "threading", "drilling", "profiling"]).optional()
      .describe("Filter by operation category"),
    minFrequency: z.number().int().min(0).optional()
      .describe("Drop patterns below this seen-count threshold"),
    limit: z.number().int().min(1).max(1000).optional()
      .describe("Cap returned results; default 50 inside engine"),
  }).passthrough(),
  jmdie_get_pattern: z.object({
    id: z.string().min(1).describe("Pattern id (e.g. 'pattern_7'); returns null when missing"),
  }).passthrough(),
  jmdie_get_tips: z.object({
    machineType: z.enum(["lathe", "mill", "wedm"]).optional()
      .describe("Optional machine-type filter for the flattened tip list"),
  }).passthrough(),
  jmdie_stats: z.object({}).passthrough(),
  // U-WIRE35 — AlgorithmOrchestratorEngine
  // Engine seeds 8 algorithms lazily; categories drawn from seeded specs:
  //   force | life | stability | material | stochastic | optimization | estimation | control
  // domain accepts any string so callers can pass machine domains the engine
  // doesn't know about (filter then returns empty rather than throwing).
  algo_orch_query: z.object({
    category: z.enum(["force", "life", "stability", "material", "stochastic", "optimization", "estimation", "control"]).optional()
      .describe("Filter by algorithm category; matches seeded specs"),
    domain: z.string().min(1).optional()
      .describe("Filter by domain (e.g. 'lathe', 'mill', 'wedm'); 'all' is matched as a wildcard"),
    inputType: z.string().min(1).optional()
      .describe("Filter by required input type (e.g. 'cutting_params', 'modal_params')"),
    limit: z.number().int().min(1).max(1000).optional()
      .describe("Cap returned results; default 50 inside engine"),
  }).passthrough(),
  algo_orch_recommend: z.object({
    problemType: z.string().min(1).describe("Problem category to match against algorithm.category"),
    domain: z.string().min(1).describe("Domain to filter applicable algorithms (e.g. 'mill', 'lathe')"),
  }).passthrough(),
  algo_orch_get: z.object({
    id: z.string().min(1).describe("Algorithm id (e.g. 'kienzle', 'taylor', 'kalman'); returns null when missing"),
  }).passthrough(),
  algo_orch_count: z.object({}).passthrough(),
  // U-WIRE36 — FusionDeepLearningEngine
  // selectOptimalStrategy() expects strict enums (feature_type, material_group, machine_type)
  // matching the engine's internal type unions. Tool/depth/width/tolerance are positive
  // physical dimensions in mm. surface_finish_Ra_um (optional) tunes the scoring boost
  // for finishing strategies (<1.6 µm triggers +0.15). prefer_adaptive forces Adaptive
  // Clearing when present (also auto-triggered when depth > 2× tool diameter).
  fusion_dl_select_strategy: z.object({
    feature_type: z.enum([
      "closed_pocket", "open_pocket", "slot_through", "slot_blind", "hole_through",
      "hole_blind", "threaded_hole", "counterbore", "countersink", "boss",
      "fillet", "chamfer", "freeform_surface", "flat_face", "thin_wall",
      "deep_cavity", "bore", "thread_mill", "undercut", "ruled_surface", "text_engrave",
    ]).describe("21 Fusion 360 feature types"),
    material_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group (P=steel, M=stainless, K=cast iron, N=Al/NF, S=titanium/superalloy, H=hardened)"),
    machine_type: z.enum([
      "3axis_mill", "4axis_rotary", "5axis_table_table", "5axis_head_head",
      "5axis_table_head", "lathe_2axis", "lathe_live_tooling", "mill_turn", "router",
    ]).describe("Machine configuration"),
    tool_diameter_mm: z.number().positive().describe("Tool diameter in mm; filters strategies by min/max range"),
    depth_mm: z.number().positive().describe("Feature depth in mm; depth > 2×tool_diameter triggers Adaptive preference"),
    width_mm: z.number().positive().describe("Feature width in mm"),
    tolerance_mm: z.number().positive().describe("Required tolerance in mm"),
    surface_finish_Ra_um: z.number().positive().optional().describe("Target Ra in µm; <1.6 boosts finishing strategies"),
    prefer_adaptive: z.boolean().optional().describe("Force Adaptive Clearing when available"),
    previous_operation: z.string().optional().describe("Identifier of preceding operation (informational)"),
  }).passthrough(),
  fusion_dl_explain: z.object({
    strategy_id: z.string().min(1).describe("Strategy id (e.g. 'fusion-2d-adaptive', 'fusion-multiaxis-swarf'); returns null when missing"),
  }).passthrough(),
  fusion_dl_list: z.object({
    category: z.enum([
      "2d_adaptive", "2d_pocket", "2d_contour", "2d_face", "2d_slot", "2d_trace",
      "2d_engrave", "2d_bore", "2d_circular", "drill", "thread", "3d_adaptive",
      "3d_pocket", "3d_parallel", "3d_contour", "3d_steep_shallow", "3d_pencil",
      "3d_scallop", "3d_radial", "3d_spiral", "3d_morphed_spiral", "3d_flow",
      "3d_ramp", "3d_project", "3d_horizontal", "multiaxis_contour", "multiaxis_swarf",
      "multiaxis_flow", "multiaxis_3plus2",
    ]).optional().describe("Optional category filter; omit to list all 23 seeded strategies"),
  }).passthrough(),
  fusion_dl_stats: z.object({}).passthrough(),
  // U-WIRE37 — InventorCAMStrategyEngine
  // recommend() takes 4 nested objects (feature/material/machine/tool) + an
  // optional priority enum. Each nested object validates strict enums for
  // its discriminator field (type / iso_group) but accepts loose optional
  // numeric fields. All sub-schemas are .passthrough() so engine-internal
  // fields not echoed in this map still flow through.
  inventorcam_recommend: z.object({
    feature: z.object({
      type: z.enum([
        "pocket_2d", "contour_2d", "slot", "face", "hole", "boss",
        "freeform_3d", "steep_wall", "flat_area", "blended_surface", "ruled_surface",
        "impeller", "turbine_blade", "port",
        "turning_external", "turning_internal", "groove", "thread",
      ]),
      depth_mm: z.number().nonnegative().optional(),
      wall_angle_deg: z.number().min(0).max(90).optional(),
      has_previous_roughing: z.boolean().optional(),
      axis_count: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional(),
      is_open: z.boolean().optional(),
    }).passthrough(),
    material: z.object({
      iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
      hardness_hrc: z.number().optional(),
      name: z.string().optional(),
    }).passthrough(),
    machine: z.object({
      type: z.enum(["3axis_vertical", "3axis_horizontal", "4axis", "5axis", "lathe", "mill_turn"]),
      max_rpm: z.number().positive().optional(),
      spindle_kw: z.number().positive().optional(),
      hpc: z.boolean().optional(),
      tsc: z.boolean().optional(),
    }).passthrough(),
    tool: z.object({
      diameter_mm: z.number().positive(),
      flute_count: z.number().int().positive(),
      type: z.enum([
        "flat_end", "ball_end", "bull_nose", "face_mill", "drill",
        "tap", "spot_drill", "chamfer", "lollipop", "barrel", "turning_insert",
      ]),
      corner_radius_mm: z.number().nonnegative().optional(),
      flute_length_mm: z.number().positive().optional(),
    }).passthrough(),
    priority: z.enum(["cycle_time", "tool_life", "surface_finish", "balanced"]).optional()
      .describe("Optimization priority; defaults to 'balanced' inside engine"),
  }).passthrough(),
  inventorcam_get_strategy: z.object({
    name: z.string().min(1).describe("Strategy internal name (HSMStrategy.name); engine returns undefined when missing"),
  }).passthrough(),
  inventorcam_list: z.object({
    category: z.enum([
      "roughing_2d", "roughing_3d", "finishing_2d", "finishing_3d",
      "drilling", "turning", "multi_axis", "probing",
    ]).optional().describe("Optional category filter; omit to list all strategies"),
  }).passthrough(),
  inventorcam_categories: z.object({}).passthrough(),
  // U-WIRE39 — ActualVsPredictedCollectorEngine
  // record(observation) requires {job_id, context{material, ...}, targets{<NeuralTarget>: {predicted, actual}}}.
  // Engine throws on missing context/targets or no valid target pairs (NaN/Infinity dropped).
  // The 6 NeuralTarget values are the canonical cutting-physics labels.
  avp_record: z.object({
    observation_id: z.string().optional().describe("Auto-generated if omitted"),
    job_id: z.string().min(1).describe("Job/part identifier"),
    program_id: z.string().optional(),
    jm_die_proven: z.boolean().optional().describe("True triggers 2× training weight"),
    context: z.object({
      material: z.string().min(1),
      iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
      tool_type: z.string().optional(),
      tool_diameter_mm: z.number().positive().optional(),
      operation_type: z.string().optional(),
      cutting_speed_m_min: z.number().positive().optional(),
      feed_per_tooth_mm: z.number().positive().optional(),
      axial_depth_mm: z.number().positive().optional(),
    }).passthrough().describe("Predictor input features (pass-through to trainer)"),
    // z.record(z.enum, ...) in this Zod version REQUIRES all enum keys present;
    // use explicit optional fields to allow ANY subset of the 6 NeuralTargets.
    // Engine drops NaN/Infinity values and throws if zero valid pairs remain.
    targets: z.object({
      cutting_force_n: z.object({ predicted: z.number(), actual: z.number() }).optional(),
      power_kw: z.object({ predicted: z.number(), actual: z.number() }).optional(),
      tool_life_min: z.object({ predicted: z.number(), actual: z.number() }).optional(),
      surface_finish_um: z.object({ predicted: z.number(), actual: z.number() }).optional(),
      temperature_c: z.object({ predicted: z.number(), actual: z.number() }).optional(),
      chatter_probability: z.object({ predicted: z.number(), actual: z.number() }).optional(),
    }).strict().describe("At least one target pair; unknown keys rejected; NaN/Infinity dropped by engine"),
    timestamp: z.string().optional().describe("ISO timestamp; defaults to now"),
  }).passthrough(),
  avp_stats: z.object({}).passthrough(),
  avp_emit_batch: z.object({}).passthrough(),
  avp_trend: z.object({
    target: z.enum(["cutting_force_n", "power_kw", "tool_life_min", "surface_finish_um", "temperature_c", "chatter_probability"])
      .describe("Single NeuralTarget — accuracyTrend is per-target"),
  }).passthrough(),
  // U-WIRE40 - FusionStrategyKnowledgeEngine
  // selectStrategy and compareStrategies bump the engine query counter;
  // list_strategies / get_strategy / stats do not. operation enum is the
  // engine's internal "roughing|semi_finishing|finishing" union; tool_type
  // and material enums match the StrategyQuery interface verbatim.
  fusion_kb_select_strategy: z.object({
    feature: z.enum([
      "pocket", "slot", "contour", "face", "chamfer", "fillet", "boss", "rib",
      "freeform", "ruled_surface", "blended_surface", "hole", "thread",
      "steep_wall", "shallow_floor", "corner",
    ]).describe("FeatureType — 16 Fusion 360 features"),
    operation: z.enum(["roughing", "semi_finishing", "finishing"]),
    material: z.enum([
      "aluminum", "steel_low_carbon", "steel_alloy", "stainless", "cast_iron",
      "titanium", "superalloy", "hardened_steel", "plastic", "composite",
    ]).describe("MaterialClass — 10 material families"),
    tool_diameter_mm: z.number().positive(),
    tool_type: z.enum(["flat_end", "ball_nose", "bull_nose", "drill", "tap", "form"]),
    target_ra_um: z.number().positive().optional(),
    has_5axis: z.boolean().optional(),
    prefer_hsm: z.boolean().optional(),
    max_cycle_time_min: z.number().positive().optional(),
    stock_to_leave_mm: z.number().nonnegative().optional(),
  }).passthrough(),
  fusion_kb_compare_strategies: z.object({
    feature: z.enum([
      "pocket", "slot", "contour", "face", "chamfer", "fillet", "boss", "rib",
      "freeform", "ruled_surface", "blended_surface", "hole", "thread",
      "steep_wall", "shallow_floor", "corner",
    ]),
    operation: z.enum(["roughing", "semi_finishing", "finishing"]),
    material: z.enum([
      "aluminum", "steel_low_carbon", "steel_alloy", "stainless", "cast_iron",
      "titanium", "superalloy", "hardened_steel", "plastic", "composite",
    ]),
    tool_diameter_mm: z.number().positive(),
    tool_type: z.enum(["flat_end", "ball_nose", "bull_nose", "drill", "tap", "form"]),
    target_ra_um: z.number().positive().optional(),
    has_5axis: z.boolean().optional(),
    prefer_hsm: z.boolean().optional(),
    max_cycle_time_min: z.number().positive().optional(),
    stock_to_leave_mm: z.number().nonnegative().optional(),
    max_strategies: z.number().int().min(1).max(20).optional()
      .describe("Cap on returned strategies; defaults to 3 inside engine"),
  }).passthrough(),
  fusion_kb_list_strategies: z.object({
    feature: z.enum([
      "pocket", "slot", "contour", "face", "chamfer", "fillet", "boss", "rib",
      "freeform", "ruled_surface", "blended_surface", "hole", "thread",
      "steep_wall", "shallow_floor", "corner",
    ]).optional().describe("Optional feature filter; omit to list every strategy in the KB"),
  }).passthrough(),
  fusion_kb_get_strategy: z.object({
    id: z.string().min(1).describe("StrategyKnowledge.id (e.g. 'f360_2d_adaptive')"),
  }).passthrough(),
  fusion_kb_stats: z.object({
    reset: z.boolean().optional()
      .describe("When true, clears the engine query counter AFTER reading current values"),
  }).passthrough(),
};
