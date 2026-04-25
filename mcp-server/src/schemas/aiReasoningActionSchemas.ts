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
  // WIRE-MS0/U-WIRE08: PAC/VC/Rademacher/PAC-Bayes bounds + Bayesian belief
  "ai_pac_sample_complexity",
  "ai_vc_bound",
  "ai_rademacher_bound",
  "ai_pac_bayes_bound",
  "ai_belief_set",
  "ai_belief_update",
  "ai_belief_topk",
  "ai_belief_entropy",
  // WIRE-MS0/U-WIRE09: temporal projection + cognitive budget allocation
  "ai_temporal_record",
  "ai_temporal_project",
  "ai_temporal_forecast",
  "ai_cognitive_allocate",
  "ai_cognitive_classify",
  // WIRE-MS0/U-WIRE10: XAI — ReasoningExplainerEngine
  "ai_explain",
  "ai_explain_formula",
  "ai_reading_level_label",
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

// ─────────────────────────────────────────────────────────────────────────
// WIRE-MS0/U-WIRE08 — PAC/VC/Rademacher/PAC-Bayes bounds + belief tracking
// StatisticalLearningBoundsEngine + BeliefStateReasoningEngine
// ─────────────────────────────────────────────────────────────────────────

/** PAC sample complexity m ≥ (1/ε)·(ln|H| + ln(1/δ)) — Valiant 1984 */
const ai_pac_sample_complexity = z.object({
  hypothesisClassSize: z.number().min(1).describe("Hypothesis class size |H| (≥1)"),
  epsilon: z.number().gt(0).lt(1).describe("Desired accuracy ε ∈ (0,1)"),
  delta: z.number().gt(0).lt(1).describe("Confidence δ ∈ (0,1)"),
}).passthrough();

/** VC generalization bound √((d·ln(n/d) + ln(1/δ))/n) — Vapnik-Chervonenkis 1971 */
const ai_vc_bound = z.object({
  vcDim: z.number().nonnegative().describe("VC dimension d (≥0)"),
  n: z.number().int().positive().describe("Sample size n (positive integer)"),
  delta: z.number().gt(0).lt(1).describe("Confidence δ ∈ (0,1)"),
}).passthrough();

/** Rademacher bound 2·R̂_n + 3·√(ln(2/δ)/(2n)) — Bartlett & Mendelson 2002 */
const ai_rademacher_bound = z.object({
  empiricalRademacher: z.number().nonnegative().describe("Empirical Rademacher complexity R̂_n (≥0)"),
  n: z.number().int().positive().describe("Sample size n (positive integer)"),
  delta: z.number().gt(0).lt(1).describe("Confidence δ ∈ (0,1)"),
}).passthrough();

/** PAC-Bayes McAllester √((KL(Q‖P) + ln(n/δ)) / (2(n-1))) */
const ai_pac_bayes_bound = z.object({
  kl: z.number().nonnegative().describe("KL divergence KL(Q‖P) ≥ 0"),
  n: z.number().int().min(2).describe("Sample size n (integer >1)"),
  delta: z.number().gt(0).lt(1).describe("Confidence δ ∈ (0,1)"),
}).passthrough();

/** Distribution: state-name → non-negative weight (will be renormalised) */
const distributionRecord = z.record(z.string(), z.number().nonnegative().finite())
  .refine((d) => Object.keys(d).length >= 1, "distribution must contain at least one state");

/** Set/replace a named belief distribution; engine renormalises to a probability simplex */
const ai_belief_set = z.object({
  id: z.string().min(1).describe("Belief identifier — non-empty"),
  distribution: distributionRecord.describe("Distribution {state: weight}; renormalised to sum=1"),
  description: z.string().optional().describe("Optional human-readable description"),
}).passthrough();

/** Bayesian update: posterior ∝ prior × likelihood, then renormalise */
const ai_belief_update = z.object({
  id: z.string().min(1).describe("Existing belief id (must exist)"),
  likelihood: distributionRecord.describe("Likelihood vector {state: P(evidence|state)}"),
}).passthrough();

/** Top-K most probable states for a belief */
const ai_belief_topk = z.object({
  id: z.string().min(1).describe("Belief identifier"),
  k: z.number().int().min(1).default(3).describe("Number of states to return (default 3)"),
}).passthrough();

/** Shannon entropy (bits) of a belief distribution */
const ai_belief_entropy = z.object({
  id: z.string().min(1).describe("Belief identifier"),
}).passthrough();

// ─────────────────────────────────────────────────────────────────────────
// WIRE-MS0/U-WIRE09 — temporal projection + cognitive budget allocation
// TemporalReasoningEngine + CognitiveBudgetAllocatorEngine
// ─────────────────────────────────────────────────────────────────────────

/** Record a snapshot in a named time series */
const ai_temporal_record = z.object({
  series: z.string().min(1).describe("Series name — non-empty (e.g. \"psi_percent\", \"tool_wear_VB_mm\")"),
  value: z.number().finite().describe("Numeric snapshot value (must be finite)"),
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T/).optional()
    .describe("ISO-8601 timestamp; defaults to now if omitted"),
  note: z.string().optional().describe("Optional human-readable note attached to the snapshot"),
}).passthrough();

/** Linear-regression projection over the last `windowSize` snapshots (slope/day, R²) */
const ai_temporal_project = z.object({
  series: z.string().min(1).describe("Series name to project"),
  windowSize: z.number().int().min(2).max(1000).default(10)
    .describe("Number of recent snapshots to fit (default 10, min 2, capped 1000)"),
}).passthrough();

/** ETA forecast: when will the series reach `target` at the current slope? */
const ai_temporal_forecast = z.object({
  series: z.string().min(1).describe("Series name to forecast"),
  target: z.number().finite().describe("Target value to reach"),
  windowSize: z.number().int().min(2).max(1000).default(10)
    .describe("Regression window size (default 10)"),
  nowIso: z.string().regex(/^\d{4}-\d{2}-\d{2}T/).optional()
    .describe("Override `now` for deterministic forecasts (ISO-8601)"),
}).passthrough();

/** WorkDescriptor.kind enum — what kind of work the request represents */
const workKindEnum = z.enum([
  "read", "edit", "create", "refactor", "review", "analysis", "chat",
]);

/** Allocate cognitive budget (depth + maxTokens + simulation/multi-agent gates) */
const ai_cognitive_allocate = z.object({
  kind: workKindEnum.describe("Work kind — drives base cost"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional()
    .describe("Optional risk level (default low → no boost)"),
  touchesCriticalFile: z.boolean().optional()
    .describe("True if the work touches a critical-classification file (+3 boost)"),
  expectedDependents: z.number().int().nonnegative().optional()
    .describe("Number of files/symbols expected to depend on this change"),
  userUrgent: z.boolean().optional()
    .describe("True if the user explicitly flagged this as urgent (-1 penalty)"),
  hasPreviousFailure: z.boolean().optional()
    .describe("True if prior attempts on this work failed (+1 boost)"),
  tokenEstimate: z.number().nonnegative().finite().optional()
    .describe("Caller estimate of needed tokens — floor only, depth tier sets the minimum"),
}).passthrough();

/** Classify a precomputed score into a depth tier */
const ai_cognitive_classify = z.object({
  score: z.number().finite().describe("Raw budget score (typically 0-12)"),
}).passthrough();

// ─────────────────────────────────────────────────────────────────────────
// WIRE-MS0/U-WIRE10 — XAI explanations (ReasoningExplainerEngine)
// ─────────────────────────────────────────────────────────────────────────

/** Audience tier — drives word limit + vocabulary level */
const audienceEnum = z.enum(["machinist", "engineer", "manager", "auditor"]);

/** Calculation context (formula + inputs + result + unit + source) */
const calculationContextSchema = z.object({
  formula: z.string().min(1).describe("Formula string (e.g. \"Fc = kc1.1 × ap × fz^(1-mc)\")"),
  inputs: z.record(z.string(), z.union([z.number(), z.string()])).describe("Input values keyed by variable name"),
  result: z.number().finite().describe("Computed result value"),
  unit: z.string().describe("Unit of result (e.g. \"N\", \"m/min\")"),
  source: z.string().describe("Source identifier — engine/handbook/tribal entry"),
}).passthrough();

/** Selection context (selected vs alternatives + scoring criteria) */
const selectionContextSchema = z.object({
  selected: z.string().min(1).describe("Selected option id/name"),
  alternatives: z.array(z.string()).describe("Alternatives considered"),
  criteria: z.record(z.string(), z.number()).describe("Per-alternative score map"),
}).passthrough();

/** Generate XAI explanation for a recommendation/calculation/selection/warning */
const ai_explain = z.object({
  question: z.string().min(1).describe("The question being answered (drives summary)"),
  audience: audienceEnum.optional().describe("Audience tier (default machinist)"),
  maxWords: z.number().int().positive().max(2000).optional()
    .describe("Override default per-audience word limit"),
  context: z.object({
    recommendation: z.string().optional().describe("Recommendation string being explained"),
    calculation: calculationContextSchema.optional(),
    selection: selectionContextSchema.optional(),
  }).passthrough().describe("Context bundle — at least one of recommendation/calculation/selection"),
}).passthrough();

/** Plain-language explanation of a known formula */
const ai_explain_formula = z.object({
  formula: z.string().min(1).describe("Formula string to look up + simplify"),
  audience: audienceEnum.optional().describe("Audience tier (default machinist)"),
}).passthrough();

/** Map a Flesch-Kincaid grade level to a reading-difficulty label */
const ai_reading_level_label = z.object({
  grade: z.number().finite().describe("Reading grade level (≥0; typical 5-18)"),
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
  ai_pac_sample_complexity,
  ai_vc_bound,
  ai_rademacher_bound,
  ai_pac_bayes_bound,
  ai_belief_set,
  ai_belief_update,
  ai_belief_topk,
  ai_belief_entropy,
  ai_temporal_record,
  ai_temporal_project,
  ai_temporal_forecast,
  ai_cognitive_allocate,
  ai_cognitive_classify,
  ai_explain,
  ai_explain_formula,
  ai_reading_level_label,
};
