/**
 * AI Reasoning Action Schemas — prism_ai dispatcher
 * ==================================================
 * Zod schemas for 6 mill-targeted AI reasoning actions.
 *
 * @module schemas/aiReasoningActionSchemas
 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
 */

import { z } from "zod";

/** Supported actions for prism_ai dispatcher */
export const AI_REASONING_ACTIONS = [
  "ai_route_mill_pipeline",
  "ai_mill_agi_reason",
  "ai_mill_awareness_query",
  "ai_mill_scientific_analyze",
  "ai_mill_wisdom_query",
  "ai_mill_adaptive_strategy",
  // Dev-loop AI utilities (proven-useful per AI engine audit 2026-04-25)
  "ai_route_task",
  "ai_health_report",
  "ai_recommend_capability",
  "ai_classify_content",
  // WIRE-MS0/U-WIRE07: dev-process reasoning + learning orphans
  "ai_causal_add_edge",
  "ai_causal_trace_impact",
  "ai_causal_root_causes",
  "ai_exception_handle",
  "ai_exception_record_outcome",
  "ai_exception_stats",
  "ai_metalearn_record",
  "ai_metalearn_recommend",
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
  features: z.array(z.record(z.unknown())).optional().describe("CAD features to process"),
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
  constraints: z.record(z.unknown()).optional().describe("Optimization constraints"),
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

/** Route a dev task to optimal Claude/Ollama/Docker backend */
const ai_route_task = z.object({
  task: z.string().min(1).describe("Task description for backend routing"),
}).passthrough();

/** Probe reachability of all known AI backends */
const ai_health_report = z.object({
  backend: z.string().optional().describe("Specific backend to probe (omit for all)"),
}).passthrough();

/** Recommend PRISM capabilities matching a user prompt */
const ai_recommend_capability = z.object({
  input: z.string().min(1).describe("User prompt or task description"),
  experience: z.enum(["novice","intermediate","expert"]).optional().describe("User experience level"),
}).passthrough();


/** Classify content type for downstream processing (PDF, video, code, etc.) */
const ai_classify_content = z.object({
  content: z.unknown().describe("Content to classify (text, file metadata, etc.)"),
  hint: z.string().optional().describe("Optional content type hint"),
}).passthrough();

// ─────────────────────────────────────────────────────────────────────────
// WIRE-MS0/U-WIRE07 — dev-process reasoning + learning orphans
// CausalReasoningEngine + ExceptionLearningEngine + MetaLearningOptimizerEngine
// ─────────────────────────────────────────────────────────────────────────

/** Polarity tri-state used by causal-edge sign tracking */
const PolarityEnum = z.enum(["positive", "negative", "unknown"]);

/** Add a causal edge (A → B) with confidence and polarity */
const ai_causal_add_edge = z.object({
  from: z.string().min(1).describe("Source node — non-empty string"),
  to: z.string().min(1).describe("Target node — non-empty string (must differ from `from`)"),
  confidence: z.number().min(0).max(1).describe("Edge confidence in [0,1]"),
  polarity: PolarityEnum.describe("positive=same direction, negative=inverted, unknown=indeterminate"),
  reason: z.string().optional().describe("Optional human-readable rationale"),
}).passthrough();

/** Trace forward impact from a source node (BFS, bounded hops) */
const ai_causal_trace_impact = z.object({
  source: z.string().min(1).describe("Source node to trace impact from"),
  maxHops: z.number().int().positive().max(20).default(3).describe("Maximum hops to traverse (default 3, capped 20)"),
}).passthrough();

/** Find root-cause nodes (no incoming edges) reachable backward from a target */
const ai_causal_root_causes = z.object({
  target: z.string().min(1).describe("Target node whose root causes to find"),
  maxHops: z.number().int().positive().max(20).default(3).describe("Maximum hops to traverse (default 3, capped 20)"),
}).passthrough();

/** Capture an unexpected event for learning instead of failing */
const ai_exception_handle = z.object({
  type: z.enum([
    "parameter_outlier",
    "outcome_anomaly",
    "process_deviation",
    "measurement_spike",
  ]).describe("Exception category"),
  description: z.string().min(1).describe("Human-readable description"),
  context: z.record(z.string(), z.unknown()).describe("Free-form context key/value bag"),
  data: z.record(z.string(), z.union([z.number(), z.string()])).describe("Numeric/string data payload (e.g. parameter, value)"),
  severity: z.enum(["info", "warning", "critical"]).describe("Severity level — critical without prior similar success → shouldFail"),
}).passthrough();

/** Record outcome of a previously-handled exception, learning a tribal tip on success */
const ai_exception_record_outcome = z.object({
  eventId: z.string().min(1).describe("Event ID returned by ai_exception_handle (e.g. EX-7)"),
  outcome: z.enum(["success", "failure", "neutral"]).describe("How the operation actually resolved"),
}).passthrough();

/** Get statistics about captured/learned exceptions */
const ai_exception_stats = z.object({}).passthrough();

/** Record outcome of a learning strategy attempt (scenario × strategy) */
const ai_metalearn_record = z.object({
  scenario: z.string().min(1).describe("Scenario id (e.g. 'pdf-extraction', 'cam-strategy-pick')"),
  strategy: z.string().min(1).describe("Strategy id (e.g. 'transformer-extract', 'heuristic-rules')"),
  success: z.boolean().describe("Did the strategy succeed?"),
  durationMs: z.number().nonnegative().finite().optional().describe("Wall time in milliseconds"),
}).passthrough();

/** Recommend the best-performing strategy for a scenario (Wilson lower bound) */
const ai_metalearn_recommend = z.object({
  scenario: z.string().min(1).describe("Scenario id to recommend for"),
  minAttempts: z.number().int().positive().default(1).describe("Minimum attempts before a strategy is eligible (default 1)"),
}).passthrough();

/** Map action to schema */
export const ACTION_AI_REASONING_SCHEMAS: Record<AIReasoningAction, z.ZodTypeAny> = {
  ai_route_mill_pipeline,
  ai_mill_agi_reason,
  ai_mill_awareness_query,
  ai_mill_scientific_analyze,
  ai_mill_wisdom_query,
  ai_mill_adaptive_strategy,
  ai_route_task,
  ai_health_report,
  ai_recommend_capability,
  ai_classify_content,
  ai_causal_add_edge,
  ai_causal_trace_impact,
  ai_causal_root_causes,
  ai_exception_handle,
  ai_exception_record_outcome,
  ai_exception_stats,
  ai_metalearn_record,
  ai_metalearn_recommend,
};
