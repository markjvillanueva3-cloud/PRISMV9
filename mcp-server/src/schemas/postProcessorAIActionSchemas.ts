/**
 * Post Processor AI Action Schemas
 * =================================
 * Zod schemas for PostProcessorDeepLearningEngine (PP-AI-L1),
 * PostProcessorDeepReasoningEngine (PP-AI-L2), and
 * PostProcessorUltimateAIEngine (PP-AI-L3).
 *
 * Actions:
 *   pp_ai_recognize_patterns, pp_ai_optimize_feed, pp_ai_classify_controller,
 *   pp_ai_estimate_cycle_time, pp_ai_score_quality, pp_ai_deep_learning_analyze,
 *   pp_ai_chain_of_thought, pp_ai_causal_inference, pp_ai_cross_cam_synthesis,
 *   pp_ai_controller_optimize, pp_ai_physics_reasoning, pp_ai_self_consistency,
 *   pp_ai_deep_reasoning_analyze, pp_ai_deep_ensemble, pp_ai_episodic_memory,
 *   pp_ai_knowledge_graph, pp_ai_tree_of_thoughts, pp_ai_meta_learning,
 *   pp_ai_adversarial_validate, pp_ai_generate_post, pp_ai_llm_cli_query,
 *   pp_ai_ultimate_analyze, pp_ai_store_episode
 *
 * @module schemas/postProcessorAIActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

const controllerEnum = z
  .enum(["fanuc", "siemens", "haas", "okuma", "mazak", "mitsubishi", "heidenhain", "fagor", "generic"])
  .describe("CNC controller type");

const materialIsoEnum = z
  .enum(["P", "M", "K", "N", "S", "H"])
  .describe("ISO material group");

const camSystemEnum = z
  .enum(["mastercam", "fusion360", "solidcam", "hypermill", "nx", "catia", "esprit", "powermill", "generic"])
  .describe("CAM system");

const gcodeInput = z.string().describe("G-code program or snippet");

// ============================================================================
// LAYER 1: Deep Learning Engine (PP-AI-L1)
// ============================================================================

const pp_ai_recognize_patterns = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  machine_controller: controllerEnum.optional(),
}).passthrough().describe("Recognize G-code patterns with neural networks");

const pp_ai_optimize_feed = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  machine_controller: controllerEnum.optional(),
  tool_diameter_mm: z.number().positive().describe("Tool diameter in mm"),
  spindle_rpm: z.number().positive().describe("Spindle speed in RPM"),
}).passthrough().describe("Optimize feed rates with physics constraints (Kienzle)");

const pp_ai_classify_controller = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controllers: z.array(controllerEnum).optional().describe("Controllers to suggest migration to"),
}).passthrough().describe("Classify controller dialect and suggest migrations");

const pp_ai_estimate_cycle_time = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  machine_controller: controllerEnum.optional(),
}).passthrough().describe("Neural estimation of cycle time with breakdown");

const pp_ai_score_quality = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  machine_controller: controllerEnum.optional(),
}).passthrough().describe("Score post quality across 5 dimensions");

const pp_ai_deep_learning_analyze = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  machine_controller: controllerEnum.optional(),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
}).passthrough().describe("Full Layer 1 deep learning analysis");

// ============================================================================
// LAYER 2: Deep Reasoning Engine (PP-AI-L2)
// ============================================================================

const pp_ai_chain_of_thought = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  query: z.string().optional().describe("Reasoning query to answer"),
}).passthrough().describe("Multi-step chain-of-thought reasoning");

const pp_ai_causal_inference = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  issue: z.string().describe("Issue to analyze root cause for"),
}).passthrough().describe("Causal inference with counterfactual reasoning");

const pp_ai_cross_cam_synthesis = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  source_cams: z.array(camSystemEnum).describe("CAM systems to synthesize features from"),
}).passthrough().describe("Cross-CAM best-of-breed feature synthesis");

const pp_ai_controller_optimize = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum,
}).passthrough().describe("Controller-specific optimization recommendations");

const pp_ai_physics_reasoning = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  target_controller: controllerEnum.optional(),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
}).passthrough().describe("Physics-backed reasoning (Kienzle, Taylor)");

const pp_ai_self_consistency = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  target_controller: controllerEnum.optional(),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
}).passthrough().describe("Self-consistency verification across reasoning paths");

const pp_ai_deep_reasoning_analyze = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  target_controller: controllerEnum.optional(),
  source_cams: z.array(camSystemEnum).optional(),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
}).passthrough().describe("Full Layer 2 deep reasoning analysis");

// ============================================================================
// LAYER 3: Ultimate AI Engine (PP-AI-L3)
// ============================================================================

const pp_ai_deep_ensemble = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
}).passthrough().describe("Deep ensemble with 5 architectures");

const pp_ai_episodic_memory = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  machine: z.string().optional().describe("Machine to filter episodes by"),
}).passthrough().describe("Retrieve similar episodes from shop floor memory");

const pp_ai_store_episode = z.object({
  controller: controllerEnum,
  source_cam: camSystemEnum,
  machine: z.string().describe("Machine name"),
  post_config: z.record(z.unknown()).describe("Post configuration used"),
  outcome: z.enum(["success", "crash", "poor_finish", "slow_cycle", "tool_break"]).describe("Outcome of the job"),
  cycle_time_actual_sec: z.number().positive().optional().describe("Actual cycle time in seconds"),
  notes: z.string().optional().describe("Additional notes"),
}).passthrough().describe("Store new episode in episodic memory");

const pp_ai_knowledge_graph = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
}).passthrough().describe("Query knowledge graph for controller-feature relationships");

const pp_ai_tree_of_thoughts = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  max_depth: z.number().int().min(1).max(10).optional().describe("Max tree depth"),
}).passthrough().describe("Tree of Thoughts multi-branch optimization");

const pp_ai_meta_learning = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum,
}).passthrough().describe("Meta-learning for fast adaptation to new controllers");

const pp_ai_adversarial_validate = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
}).passthrough().describe("Adversarial validation for robustness");

const pp_ai_generate_post = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum,
  include_hsm: z.boolean().optional().describe("Include HSM features"),
  include_5axis: z.boolean().optional().describe("Include 5-axis features"),
}).passthrough().describe("Generate optimized post processor configuration");

const pp_ai_llm_cli_query = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  target_controller: controllerEnum.optional(),
  query: z.string().describe("Natural language query"),
  generate_post: z.boolean().optional().describe("Include post generation"),
}).passthrough().describe("LLM CLI natural language query interface");

const pp_ai_ultimate_analyze = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum,
  target_controller: controllerEnum.optional(),
  source_cams: z.array(camSystemEnum).optional(),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
  generate_post: z.boolean().optional(),
  llm_cli_mode: z.boolean().optional().describe("Enable LLM CLI output"),
  query: z.string().optional(),
}).passthrough().describe("Full Ultimate AI analysis (all 3 layers)");

// ============================================================================
// ORCHESTRATOR ENGINE (PP-AI-ORCH)
// ============================================================================

const userIntentEnum = z
  .enum([
    "optimize_gcode", "analyze_quality", "generate_post", "troubleshoot_issue",
    "compare_controllers", "explain_feature", "configure_settings", "validate_safety",
    "estimate_cycle_time", "recommend_strategy", "general_query"
  ])
  .describe("User intent classification");

const expertiseLevelEnum = z
  .enum(["beginner", "intermediate", "expert", "ai_agent"])
  .describe("User expertise level for response adaptation");

const outputModeEnum = z
  .enum(["full", "concise", "llm_cli", "structured"])
  .describe("Output format mode");

const pp_ai_classify_intent = z.object({
  query: z.string().describe("Natural language query to classify"),
  context: z.object({
    session_id: z.string().optional(),
    controller_context: controllerEnum.optional(),
    material_context: materialIsoEnum.optional(),
    user_expertise: expertiseLevelEnum.optional(),
  }).optional().describe("Conversation context"),
}).passthrough().describe("Classify user intent from natural language query");

const pp_ai_route_engines = z.object({
  primary_intent: userIntentEnum,
  complexity: z.enum(["simple", "moderate", "complex"]).describe("Query complexity"),
}).passthrough().describe("Determine which AI engines to invoke based on intent");

const pp_ai_expert_rules = z.object({
  gcode: gcodeInput,
  controller: controllerEnum.optional(),
  material_iso: materialIsoEnum.optional(),
  tool_diameter_mm: z.number().positive().optional(),
  output_mode: outputModeEnum.optional(),
}).passthrough().describe("Run manufacturing expert rules on G-code");

const pp_ai_neural_optimize = z.object({
  gcode: gcodeInput.optional(),
  material_iso: materialIsoEnum.optional(),
  controller: controllerEnum.optional(),
  objectives: z.array(z.enum(["cycle_time", "tool_life", "surface_quality", "safety_score"])).optional()
    .describe("Optimization objectives for Pareto front"),
}).passthrough().describe("Multi-objective neural optimization with Pareto front");

const pp_ai_aggregate_analysis = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  controller: controllerEnum.optional(),
  run_engines: z.array(z.enum(["deep_learning", "deep_reasoning", "ultimate_ai", "expert_system", "neural_optimizer"]))
    .optional().describe("Engines to run"),
}).passthrough().describe("Aggregate analysis from multiple AI engines");

const pp_ai_proactive_suggestions = z.object({
  gcode: gcodeInput,
  material_iso: materialIsoEnum.optional(),
  controller: controllerEnum.optional(),
}).passthrough().describe("Generate proactive suggestions based on analysis");

const pp_ai_orchestrate = z.object({
  query: z.string().describe("Natural language query or instruction"),
  gcode: gcodeInput.optional(),
  material_iso: materialIsoEnum.optional(),
  controller: controllerEnum.optional(),
  source_cam: camSystemEnum.optional(),
  machine_model: z.string().optional().describe("Machine model name"),
  tool_diameter_mm: z.number().positive().optional(),
  spindle_rpm: z.number().positive().optional(),
  context: z.object({
    session_id: z.string().optional(),
    user_expertise: expertiseLevelEnum.optional(),
  }).optional(),
  output_mode: outputModeEnum.optional(),
}).passthrough().describe("Full orchestrated AI analysis — routes to all PP-AI engines");

// ============================================================================
// KNOWLEDGE ENGINE (PP-KB)
// ============================================================================

const entryFunctionCategoryEnum = z
  .enum(["lifecycle", "motion", "cycle", "command", "manual", "utility"])
  .describe("Entry function category");

const upkSwitchCategoryEnum = z
  .enum(["rotary", "offset", "control", "home", "5axis", "millturn", "misc"])
  .describe("UPK switch category");

const machineTypeEnum = z
  .enum(["3axis", "4axis", "5axis", "mill", "millturn", "lathe"])
  .describe("Machine type for recommendations");

const pp_kb_get_entry_function = z.object({
  function_name: z.string().describe("Entry function name (e.g., 'onSection', 'onCircular')"),
}).passthrough().describe("Get detailed entry function documentation");

const pp_kb_get_entry_functions_by_category = z.object({
  category: entryFunctionCategoryEnum,
}).passthrough().describe("Get all entry functions in a category");

const pp_kb_get_drilling_cycle = z.object({
  cycle_type: z.string().describe("Drilling cycle type (e.g., 'deep-drilling', 'tapping')"),
}).passthrough().describe("Get detailed drilling cycle documentation");

const pp_kb_get_all_drilling_cycles = z.object({}).passthrough()
  .describe("Get all drilling cycle types");

const pp_kb_get_upk_switch = z.object({
  switch_name: z.string().describe("UPK switch name (e.g., 'tcp', 'maxincrot')"),
}).passthrough().describe("Get UPK switch documentation");

const pp_kb_get_upk_switches_by_category = z.object({
  category: upkSwitchCategoryEnum,
}).passthrough().describe("Get all UPK switches in a category");

const pp_kb_get_misc_value = z.object({
  misc_id: z.string().describe("Misc value ID (e.g., 'MiscInt4', 'MiscReal1')"),
}).passthrough().describe("Get miscellaneous integer/real documentation");

const pp_kb_get_circular_settings = z.object({}).passthrough()
  .describe("Get all circular interpolation settings");

const pp_kb_search = z.object({
  query: z.string().describe("Search query across all knowledge categories"),
}).passthrough().describe("Search knowledge base across all categories");

const pp_kb_get_recommended_settings = z.object({
  machine_type: machineTypeEnum,
}).passthrough().describe("Get recommended post settings for machine type");

const pp_kb_validate_configuration = z.object({
  config: z.record(z.string(), z.unknown()).describe("Post configuration to validate"),
}).passthrough().describe("Validate post processor configuration");

const pp_kb_generate_function_template = z.object({
  function_name: z.string().describe("Entry function name to generate template for"),
}).passthrough().describe("Generate documented function template");

const pp_kb_get_statistics = z.object({}).passthrough()
  .describe("Get knowledge base statistics");

// ============================================================================
// EXPORT
// ============================================================================

export const ACTION_POST_PROCESSOR_AI_SCHEMAS: ActionSchemaMap = {
  // Layer 1: Deep Learning
  pp_ai_recognize_patterns,
  pp_ai_optimize_feed,
  pp_ai_classify_controller,
  pp_ai_estimate_cycle_time,
  pp_ai_score_quality,
  pp_ai_deep_learning_analyze,

  // Layer 2: Deep Reasoning
  pp_ai_chain_of_thought,
  pp_ai_causal_inference,
  pp_ai_cross_cam_synthesis,
  pp_ai_controller_optimize,
  pp_ai_physics_reasoning,
  pp_ai_self_consistency,
  pp_ai_deep_reasoning_analyze,

  // Layer 3: Ultimate AI
  pp_ai_deep_ensemble,
  pp_ai_episodic_memory,
  pp_ai_store_episode,
  pp_ai_knowledge_graph,
  pp_ai_tree_of_thoughts,
  pp_ai_meta_learning,
  pp_ai_adversarial_validate,
  pp_ai_generate_post,
  pp_ai_llm_cli_query,
  pp_ai_ultimate_analyze,

  // Orchestrator (PP-AI-ORCH)
  pp_ai_classify_intent,
  pp_ai_route_engines,
  pp_ai_expert_rules,
  pp_ai_neural_optimize,
  pp_ai_aggregate_analysis,
  pp_ai_proactive_suggestions,
  pp_ai_orchestrate,

  // Knowledge Engine (PP-KB)
  pp_kb_get_entry_function,
  pp_kb_get_entry_functions_by_category,
  pp_kb_get_drilling_cycle,
  pp_kb_get_all_drilling_cycles,
  pp_kb_get_upk_switch,
  pp_kb_get_upk_switches_by_category,
  pp_kb_get_misc_value,
  pp_kb_get_circular_settings,
  pp_kb_search,
  pp_kb_get_recommended_settings,
  pp_kb_validate_configuration,
  pp_kb_generate_function_template,
  pp_kb_get_statistics,
};
