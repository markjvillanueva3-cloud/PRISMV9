/**
 * Intelligence Dispatcher Action Schemas
 * =======================================
 * Per-action Zod schemas for all 49 core prism_intelligence actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/intelligenceActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();
const optStrArr = z.array(z.string()).optional();
const responseLevel = z.enum(["minimal", "summary", "full"]).optional();

// ============================================================================
// IntelligenceEngine core actions (11)
// ============================================================================

const job_plan = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  dimensions: z.object({
    depth: z.number().positive(),
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
  }),
  tolerance: optPosNum,
  surface_finish: optPosNum,
  machine_id: optStr,
  tool_id: optStr,
  response_level: responseLevel,
  modal: z.object({
    natural_frequency: optPosNum,
    damping_ratio: optPosNum,
    stiffness: optPosNum,
  }).optional(),
  machine_power_kw: optPosNum,
}).passthrough();

const setup_sheet = z.object({
  material: z.string().min(1),
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
    tolerance: optPosNum,
    surface_finish: optPosNum,
  }).passthrough()),
  format: z.enum(["json", "markdown", "text"]).optional(),
  tolerance: optPosNum,
  surface_finish: optPosNum,
  machine_id: optStr,
  response_level: responseLevel,
}).passthrough();

const process_cost = z.object({
  material: z.string().min(1),
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
  }).passthrough()),
  machine_rate_per_hour: optPosNum,
  tool_cost: optPosNum,
  batch_size: z.number().int().positive().optional(),
  setup_time_min: optPosNum,
  response_level: responseLevel,
}).passthrough();

const material_recommend = z.object({
  application: z.string().min(1),
  iso_group: optStr,
  hardness_range: z.object({
    min: optNum,
    max: optNum,
  }).optional(),
  limit: z.number().int().positive().optional(),
  priorities: optStrArr,
  response_level: responseLevel,
}).passthrough();

const tool_recommend = z.object({
  material: z.string().min(1),
  feature: z.string().min(1),
  iso_group: optStr,
  limit: z.number().int().positive().optional(),
  diameter: optPosNum,
  tool_type: optStr,
  coating: optStr,
  response_level: responseLevel,
}).passthrough();

const machine_recommend = z.object({
  part_envelope: z.object({
    x: z.number().positive(),
    y: z.number().positive(),
    z: z.number().positive(),
  }),
  type: optStr,
  manufacturer: optStr,
  min_spindle_rpm: optPosNum,
  min_spindle_power: optPosNum,
  simultaneous_axes: z.number().int().min(3).max(5).optional(),
  limit: z.number().int().positive().optional(),
  response_level: responseLevel,
}).passthrough();

const what_if = z.object({
  baseline: z.record(z.string(), z.unknown()),
  changes: z.record(z.string(), z.unknown()),
  material: optStr,
  response_level: responseLevel,
}).passthrough();

const failure_diagnose = z.object({
  symptoms: z.union([z.array(z.string()), z.string()]).optional(),
  alarm_code: z.union([z.string(), z.number()]).optional(),
  controller: optStr,
  material: optStr,
  operation: optStr,
  machine: optStr,
  response_level: responseLevel,
}).passthrough();

// INTEL-OLLAMA-OBSIDIAN-MS0/P5-U05 — DiagnosticReasoningEngine surface.
// Rich alarm-knowledge-base / fault-tree diagnosis. `symptoms` accepts plain
// strings (operator observations) or full Symptom objects; `context.alarm`
// switches to alarm-driven Bayesian diagnosis.
const diagnose_failure = z.object({
  symptoms: z.union([
    z.string(),
    z.array(z.union([
      z.string(),
      z.object({
        id: optStr,
        description: z.string().min(1),
        observed: optBool,
        confidence: z.number().min(0).max(1).optional(),
        source: z.enum(["alarm", "operator", "sensor", "visual", "audio"]).optional(),
      }).passthrough(),
    ])),
  ]).optional().describe("Observed symptoms — string(s) or Symptom object(s)."),
  context: z.object({
    machine_type: optStr.describe("Machine type for symptom-only diagnosis."),
    alarm: z.object({
      alarm_code: z.string().min(1),
      message: z.string().min(1),
      severity: z.enum(["info", "warning", "fault", "critical", "emergency"]),
      timestamp: optStr,
      machine_id: optStr,
      machine_type: optStr,
      controller: optStr,
      axis: optStr,
      spindle: optStr,
    }).passthrough().optional().describe("Machine alarm — switches to alarm-driven diagnosis."),
  }).passthrough().optional().describe("Diagnosis context — machine_type and/or alarm."),
  response_level: responseLevel,
}).passthrough().describe("Diagnose a machine failure from symptoms and/or an alarm via DiagnosticReasoningEngine.");

const parameter_optimize = z.object({
  material: z.string().min(1),
  objectives: z.object({
    productivity: optNum,
    cost: optNum,
    quality: optNum,
    tool_life: optNum,
  }).passthrough(),
  constraints: z.record(z.string(), z.unknown()).optional(),
  tool_diameter: optPosNum,
  response_level: responseLevel,
}).passthrough();

const cycle_time_estimate = z.object({
  operations: z.array(z.object({
    feature: optStr,
    depth: optPosNum,
    width: optPosNum,
    length: optPosNum,
    diameter: optPosNum,
    material: optStr,
  }).passthrough()),
  material: optStr,
  tool_change_time: optPosNum,
  rapid_rate: optPosNum,
  response_level: responseLevel,
}).passthrough();

const quality_predict = z.object({
  material: z.string().min(1),
  parameters: z.object({
    cutting_speed: optPosNum,
    feed_per_tooth: optPosNum,
    axial_depth: optPosNum,
    radial_depth: optPosNum,
    tool_diameter: optPosNum,
    number_of_teeth: z.number().int().positive().optional(),
  }).passthrough(),
  nose_radius: optPosNum,
  overhang_length: optPosNum,
  operation: optStr,
  response_level: responseLevel,
}).passthrough();

// ============================================================================
// JobLearningEngine actions (2)
// ============================================================================

const job_record = z.object({
  material: z.string().min(1),
  operation: z.string().min(1),
  parameters_used: z.object({
    vc_mpm: z.number().positive(),
    fz_mm: z.number().positive(),
    ap_mm: z.number().positive(),
    ae_mm: optPosNum,
    strategy: optStr,
    tool: optStr,
  }).passthrough(),
  outcome: z.object({
    actual_tool_life_min: optPosNum,
    actual_surface_finish_ra: optPosNum,
    actual_cycle_time_min: optPosNum,
    chatter_occurred: optBool,
    tool_failure_mode: z.enum(["none", "flank_wear", "crater_wear", "chipping", "breakage"]).optional(),
    operator_notes: optStr,
  }).passthrough(),
  job_plan_id: optStr,
  machine: optStr,
  timestamp: optStr,
}).passthrough();

const job_insights = z.object({
  material: optStr,
  operation: optStr,
  machine: optStr,
  min_jobs: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// AlgorithmGatewayEngine (1)
// ============================================================================

const algorithm_select = z.object({
  problem_type: z.enum(["optimize", "predict", "classify", "interpolate", "sequence", "filter"]),
  domain: z.enum(["cutting_params", "toolpath", "scheduling", "quality", "maintenance"]),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// ShopSchedulerEngine (1)
// ============================================================================

const machine_utilization = z.object({
  machine_ids: z.array(z.string()).optional(),
  time_range: optStr,
  response_level: responseLevel,
}).passthrough();

// ============================================================================
// IntentDecompositionEngine (1)
// ============================================================================

const decompose_intent = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
  persona: optStr,
}).passthrough();

// ============================================================================
// ResponseFormatterEngine (1)
// ============================================================================

const format_response = z.object({
  data: z.record(z.string(), z.unknown()),
  persona: optStr,
  units: z.enum(["metric", "imperial"]).optional(),
  format: optStr,
}).passthrough();

// ============================================================================
// WorkflowChainsEngine (3)
// ============================================================================

const workflow_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const workflow_get = z.object({
  workflow_id: z.string().min(1),
  persona: optStr,
}).passthrough();

const workflow_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// OnboardingEngine (5)
// ============================================================================

const onboarding_welcome = z.object({
  user_id: optStr,
}).passthrough();

const onboarding_state = z.object({
  user_id: optStr,
}).passthrough();

const onboarding_record = z.object({
  user_id: optStr,
  interaction_type: optStr,
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const onboarding_suggestion = z.object({
  user_id: optStr,
  level: optStr,
}).passthrough();

const onboarding_reset = z.object({
  user_id: optStr,
}).passthrough();

// ============================================================================
// SetupSheetEngine (2)
// ============================================================================

const setup_sheet_format = z.object({
  job_id: optStr,
  material: optStr,
  operations: z.array(z.record(z.string(), z.unknown())).optional(),
  format: z.enum(["json", "markdown", "text", "html"]).optional(),
}).passthrough();

const setup_sheet_template = z.object({
  format: z.enum(["json", "markdown", "text", "html"]).optional(),
}).passthrough();

// ============================================================================
// ConversationalMemoryEngine (8)
// ============================================================================

const conversation_context = z.object({
  user_id: optStr,
}).passthrough();

const conversation_transition = z.object({
  user_id: optStr,
  new_topic: optStr,
}).passthrough();

const job_start = z.object({
  material: optStr,
  machine: optStr,
  operation: optStr,
  tools: optStrArr,
}).passthrough();

const job_update = z.object({
  id: optStr,
  material: optStr,
  machine: optStr,
  operation: optStr,
  tools: optStrArr,
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const job_find = z.object({
  material: optStr,
  machine: optStr,
  operation: optStr,
  id: optStr,
}).passthrough();

const job_resume = z.object({
  id: z.string().min(1),
}).passthrough();

const job_complete = z.object({
  id: optStr,
  outcome: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const job_list_recent = z.object({
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// UserWorkflowSkillsEngine (6)
// ============================================================================

const skill_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const skill_get = z.object({
  skill_id: z.string().min(1),
}).passthrough();

const skill_search = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const skill_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const skill_steps = z.object({
  skill_id: z.string().min(1),
  persona: optStr,
}).passthrough();

const skill_for_persona = z.object({
  skill_id: z.string().min(1),
  persona: z.string().min(1),
}).passthrough();

// ============================================================================
// UserAssistanceSkillsEngine (8)
// ============================================================================

const assist_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_get = z.object({
  id: z.string().min(1),
}).passthrough();

const assist_search = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_match = z.object({
  query: z.string().min(1),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const assist_explain = z.object({
  parameter: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const assist_confidence = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  action: optStr,
}).passthrough();

const assist_mistakes = z.object({
  operation: optStr,
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const assist_safety = z.object({
  parameters: z.record(z.string(), z.unknown()).optional(),
  material: optStr,
  operation: optStr,
}).passthrough();

// ============================================================================
// AIFeatureAutoRegistryEngine (7) — U-AI-WIRE
const ai_feature_discover = z.object({}).passthrough().describe("Discover AI features");
const ai_feature_find = z.object({ query: z.string(), domain: optStr }).passthrough();
const ai_feature_route = z.object({ query: z.string() }).passthrough();
const ai_feature_list = z.object({}).passthrough();
const ai_domain_list = z.object({}).passthrough();
const ai_feature_stats = z.object({}).passthrough();
const ai_feature_by_category = z.object({ category: z.enum(["reasoning","learning","intelligence","orchestration","agent","advisor","prediction","optimization","knowledge","nlp","vision","physics","deep_ai"]) }).passthrough();

// AISystemRouterEngine (5)
const ai_route_task = z.object({ task: z.string().describe("Task description to route") }).passthrough().describe("Route task to optimal AI backend");
const ai_classify_task = z.object({ task: z.string().describe("Task description to classify") }).passthrough().describe("Classify task type");
const ai_backend_health = z.object({}).passthrough().describe("Get all AI backend health status");
const ai_backend_probe = z.object({ backend: z.string().describe("Backend to probe") }).passthrough().describe("Probe specific AI backend");
const ai_router_stats = z.object({}).passthrough().describe("Get AI router statistics");

// AutonomousAIOrchestrationEngine (11)
const ai_orchestrate_autonomous = z.object({ intent: z.string().describe("Intent to execute"), mode: z.enum(["full_auto","supervised","advisory","learning"]).optional() }).passthrough().describe("Execute autonomous AI orchestration");
const ai_select_skills = z.object({ intent: z.string().describe("Intent for skill selection"), reasoning: z.any().optional() }).passthrough().describe("Select skill chain for intent");
const ai_select_algorithms = z.object({ intent: z.string().describe("Intent for algorithm selection") }).passthrough().describe("Select algorithms for intent");
const ai_select_formulas = z.object({ intent: z.string().describe("Intent for formula selection") }).passthrough().describe("Select formulas for intent");
const ai_knowledge_plan = z.object({ intent: z.string().describe("Intent for knowledge planning") }).passthrough().describe("Plan knowledge utilization");
const ai_query_mit = z.object({ topic: z.string().describe("Topic to query MIT courses") }).passthrough().describe("Query MIT courses");
const ai_query_catalogs = z.object({ query: z.string().describe("Query for vendor catalogs") }).passthrough().describe("Query vendor catalogs");
const ai_generate_gsd = z.object({ name: z.string().describe("Name for GSD generation"), description: z.string().optional() }).passthrough().describe("Generate GSD (engine/schema/dispatcher)");
const ai_orchestration_history = z.object({}).passthrough().describe("Get orchestration execution history");
const ai_orchestration_stats = z.object({}).passthrough().describe("Get orchestration learning statistics");
const ai_orchestration_summary = z.object({}).passthrough().describe("Get orchestration engine summary");

// XPROC-NEURAL Tier 8 (T8-01) — Symbolic Constraint Enforcer
// Engine has its own deep Zod validation (ProjectionInputSchema in
// CrossProcessSymbolicConstraintEnforcerEngine.ts), so this dispatcher-level
// schema is a passthrough gate.
const xproc_symbolic_project = z.object({
  prediction: z.object({}).passthrough().describe("Cutting-condition prediction (vc_m_min, fz_mm_tooth, ap_mm, rpm — all optional)"),
  state: z.object({}).passthrough().describe("Material/tool/machine/operation state for envelope checks"),
}).passthrough().describe("Project a cutting-condition prediction onto the physics-feasible region (Kienzle/Taylor/spindle/rapid envelopes). Returns nearest-feasible point + violations.");
const xproc_symbolic_violations = z.object({
  prediction: z.object({}).passthrough().describe("Cutting-condition prediction"),
  state: z.object({}).passthrough().describe("Material/tool/machine/operation state"),
}).passthrough().describe("Return only the constraint violations for a prediction without projecting (audit-only).");

// XPROC-NEURAL Tier 8 (T8-03) — Neuro-Symbolic Safety Verifier
const xproc_safety_verify = z.object({
  prediction: z.object({}).passthrough().describe("Cutting-condition prediction"),
  state: z.object({}).passthrough().describe("Material/tool/machine/operation state"),
  omega_score: z.number().finite().min(0).max(1).optional().describe("Ω(x) safety score for tier-threshold check"),
  safety_score: z.number().finite().min(0).max(1).optional().describe("S(x) safety score for tier-threshold check + global floor"),
  tier: z.enum(["shop_floor", "production", "proven_out", "sim"]).optional().describe("Safety tier — defaults to shop_floor when omitted"),
  caller: z.string().optional().describe("Caller identity for audit trail"),
}).passthrough().describe("Hard-gate verification of a neural recommendation. Composes T8-01 projection + tiered Ω/S thresholds. Returns pass/review/fail with full provenance.");
const xproc_safety_escalate = z.object({
  prediction: z.object({}).passthrough(),
  state: z.object({}).passthrough(),
  omega_score: z.number().finite().min(0).max(1).optional(),
  safety_score: z.number().finite().min(0).max(1).optional(),
  tier: z.enum(["shop_floor", "production", "proven_out", "sim"]).optional(),
  reason: z.string().describe("Caller-provided escalation rationale"),
}).passthrough().describe("Force a verify() result to 'review' verdict with caller-provided escalation reason. Useful for upfront ambiguity.");

// XPROC-NEURAL Tier 9 (T9-01..T9-04) — Causal Inference Suite
// Each engine has deep Zod validation internally; dispatcher schemas are passthrough gates.
const xproc_causal_learn_dag = z.object({
  events: z.array(z.object({}).passthrough()).min(1).describe("CrossProcessOutcomeEvent ledger rows"),
  alpha: z.number().finite().min(0).max(1).optional().describe("CI test significance level (default 0.05)"),
  max_cond_size: z.number().int().min(0).max(2).optional(),
}).passthrough().describe("Run PC-stable algorithm over outcome ledger to learn causal DAG over 6 PRISM-XPROC variables.");
const xproc_causal_test_independence = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  x: z.string(),
  y: z.string(),
  cond: z.array(z.string()).optional(),
  alpha: z.number().finite().min(0).max(1).optional(),
}).passthrough().describe("Test conditional independence X ⊥ Y | S directly via Fisher Z-transform on partial correlation.");
const xproc_causal_export_graph = z.object({}).passthrough().describe("Compact JSON export shape (nodes + directed/undirected edges).");
const xproc_do_identify = z.object({
  dag: z.object({}).passthrough(),
  treatment: z.string(),
  target: z.string(),
}).passthrough().describe("Identify back-door admissible set Z (Pearl's back-door criterion).");
const xproc_do_intervene = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.string(),
  x_value: z.number().finite(),
  target: z.string(),
}).passthrough().describe("Estimate E[Y | do(X = x_value)] via back-door adjustment formula.");
const xproc_counterfactual_query = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.string(),
  target: z.string(),
  factual: z.object({ x: z.number().finite(), y: z.number().finite() }),
  counterfactual_x: z.number().finite(),
}).passthrough().describe("Pearl's twin-network counterfactual via 3-step abduction-action-prediction.");
const xproc_mediation_decompose = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.string(),
  mediator: z.string(),
  outcome: z.string(),
  x_treat: z.number().finite(),
  x_ref: z.number().finite(),
}).passthrough().describe("Decompose total effect into NDE + NIE via mediator (Baron-Kenny).");
const xproc_mediation_path_strength = z.object({
  events: z.array(z.object({}).passthrough()).min(1),
  dag: z.object({}).passthrough(),
  treatment: z.string(),
  outcome: z.string(),
}).passthrough().describe("Rank all candidate mediators by |α_X · β_M| path strength.");

// XPROC-NEURAL Tier 11 (T11-01..T11-04) — Active Learning & Curiosity
const xproc_active_select = z.object({
  pending: z.array(z.object({
    job_id: z.string().min(1),
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1).describe("Pending jobs to rank by predictive uncertainty."),
  history: z.array(z.object({
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    outcome: z.number().finite(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1).describe("Historical outcomes for k-NN variance estimate."),
  k: z.number().int().min(1).max(50).default(5).describe("k for k-nearest neighbors."),
  top_n: z.number().int().min(1).max(20).default(5).describe("Top-N picks to surface."),
}).passthrough().describe("k-NN variance ranking for active-learning candidate selection.");
const xproc_active_rationale = z.object({
  job_id: z.string().min(1),
  result: z.object({}).passthrough(),
}).passthrough().describe("Look up rationale string for a previously ranked job_id.");
const xproc_novelty_score = z.object({
  candidates: z.array(z.object({
    job_id: z.string().min(1),
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1),
  history: z.array(z.object({
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1),
  novelty_threshold: z.number().finite().min(0).max(10).default(2).describe("Median-normalized distance threshold."),
  k: z.number().int().min(1).max(20).default(3),
}).passthrough().describe("Score candidates for novelty via median-normalized k-NN distance.");
const xproc_novelty_alert = xproc_novelty_score.describe("Filter candidates to novel-only entries crossing threshold.");
const xproc_curiosity_propose = z.object({
  candidates: z.array(z.object({
    candidate_id: z.string().min(1),
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    ap: z.number().finite().positive().default(1),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1),
  history: z.array(z.object({}).passthrough()).min(3),
  state_for_safety: z.object({}).passthrough(),
  k: z.number().int().min(1).max(50).default(5),
  tier: z.enum(["shop_floor", "production", "proven_out", "sim"]).default("production"),
}).passthrough().describe("Schmidhuber curiosity proposal gated by T8-03 safety verifier.");
const xproc_curiosity_score = xproc_curiosity_propose.describe("Return curiosity scores only (no admit/block decisions).");
const xproc_doe_plan = z.object({
  candidates: z.array(z.object({
    candidate_id: z.string().min(1),
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1),
  history: z.array(z.object({
    material_iso: z.string().min(1),
    sf: z.number().finite().positive(),
    fz: z.number().finite().positive(),
    outcome: z.number().finite(),
    process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  })).min(1),
  budget_k: z.number().int().min(1).max(100),
  noise_variance: z.number().finite().min(0).max(1).default(0.0025),
  rbf_length_scale: z.number().finite().positive().default(1),
}).passthrough().describe("Greedy MI-max Bayesian DOE plan with GP surrogate.");
const xproc_doe_evaluate_completion = z.object({
  plan: z.array(z.object({}).passthrough()),
  realized: z.array(z.object({
    candidate_id: z.string().min(1),
    outcome: z.number().finite(),
  })),
}).passthrough().describe("Coverage check: how many planned runs were realized.");

// XPROC-NEURAL Tier 12 (T12-01..T12-02) — Master Orchestration
const xproc_route_query = z.object({
  query: z.string().min(1).max(2000).describe("Natural-language operator question"),
  context_hint: z.enum([
    "prediction", "safety", "explanation", "exploration",
    "calibration", "fleet", "novel_material", "auto",
  ]).default("auto").describe("Disambiguator when keyword matchers do not fire"),
  max_tiers: z.number().int().min(1).max(11).default(4).describe("Cap on returned tier count"),
}).passthrough().describe("Classify operator query → ordered tier list with availability flags.");
const xproc_route_explain = xproc_route_query.describe("Return per-tier reason + availability for audit trail.");
const xproc_orchestrate_full = z.object({
  query: z.string().min(1).max(2000),
  context_hint: z.enum([
    "prediction", "safety", "explanation", "exploration",
    "calibration", "fleet", "novel_material", "auto",
  ]).default("auto"),
  max_tiers: z.number().int().min(1).max(11).default(4),
  payload: z.record(z.string(), z.unknown()).default({}).describe("Tier-specific inputs (events, candidates, history, etc.)"),
}).passthrough().describe("Route query, fan out to available tiers, return unified answer + provenance.");
const xproc_orchestrate_brief = xproc_orchestrate_full.describe("Brief mode: headline + top-3 provenance, drops low-confidence tiers.");

// XPROC-NEURAL Tier 8 (T8-02) — Rule-Extracted Neural Inference (TREPAN)
const xproc_extract_rules = z.object({
  samples: z.array(z.object({
    features: z.record(z.string(), z.number().finite()),
    prediction: z.string().min(1),
  })).min(20).describe("Network output samples — ≥20 needed for reliable extraction"),
  feature_names: z.array(z.string().min(1)).min(1),
  max_depth: z.number().int().min(1).max(10).default(4),
  min_leaf_size: z.number().int().min(1).max(100).default(5),
  purity_threshold: z.number().min(0.5).max(1).default(0.9),
}).passthrough().describe("Extract IF-THEN rules approximating network behavior.");
const xproc_rule_explain_prediction = z.object({
  rules: z.array(z.object({}).passthrough()).min(1),
  query_features: z.record(z.string(), z.number().finite()),
}).passthrough().describe("Apply extracted rules to a query; return matching rule + class.");

// XPROC-NEURAL Tier 8 (T8-04) — Formula-Neural Ensemble
const xproc_blend_predict = z.object({
  formula_prediction: z.number().finite(),
  neural_prediction: z.number().finite(),
  calibration_score: z.number().min(0).max(1).default(0.5),
  drift_score: z.number().min(0).max(1).default(0),
  alpha_base: z.number().min(0).max(1).default(0.5),
  kappa_calib: z.number().min(0).max(1).default(0.4),
  kappa_drift: z.number().min(0).max(1).default(0.3),
  alpha_min: z.number().min(0).max(0.5).default(0.05),
  alpha_max: z.number().min(0.5).max(1).default(0.95),
  disagreement_threshold: z.number().min(0).max(1).default(0.3),
  formula_label: z.string().min(1).default("kienzle"),
  neural_label: z.string().min(1).default("T1-02"),
}).passthrough().describe("Adaptive α-weighted blend of formula and neural predictions; escalates on high disagreement.");
const xproc_blend_weight_report = z.object({
  calibration_score: z.number().min(0).max(1),
  drift_score: z.number().min(0).max(1),
  alpha_base: z.number().min(0).max(1).default(0.5),
  kappa_calib: z.number().min(0).max(1).default(0.4),
  kappa_drift: z.number().min(0).max(1).default(0.3),
  alpha_min: z.number().min(0).max(0.5).default(0.05),
  alpha_max: z.number().min(0.5).max(1).default(0.95),
}).passthrough().describe("Decompose α into base/calib/drift contributions for audit.");

// EXPORT MAP — 49 core actions
// ============================================================================

export const ACTION_INTELLIGENCE_SCHEMAS: ActionSchemaMap = {
  // IntelligenceEngine (11)
  job_plan,
  setup_sheet,
  process_cost,
  material_recommend,
  tool_recommend,
  machine_recommend,
  what_if,
  failure_diagnose,
  diagnose_failure,
  parameter_optimize,
  cycle_time_estimate,
  quality_predict,
  // JobLearningEngine (2)
  job_record,
  job_insights,
  // AlgorithmGatewayEngine (1)
  algorithm_select,
  // ShopSchedulerEngine (1)
  machine_utilization,
  // IntentDecompositionEngine (1)
  decompose_intent,
  // ResponseFormatterEngine (1)
  format_response,
  // WorkflowChainsEngine (3)
  workflow_match,
  workflow_get,
  workflow_list,
  // OnboardingEngine (5)
  onboarding_welcome,
  onboarding_state,
  onboarding_record,
  onboarding_suggestion,
  onboarding_reset,
  // SetupSheetEngine (2)
  setup_sheet_format,
  setup_sheet_template,
  // ConversationalMemoryEngine (8)
  conversation_context,
  conversation_transition,
  job_start,
  job_update,
  job_find,
  job_resume,
  job_complete,
  job_list_recent,
  // UserWorkflowSkillsEngine (6)
  skill_list,
  skill_get,
  skill_search,
  skill_match,
  skill_steps,
  skill_for_persona,
  // UserAssistanceSkillsEngine (8)
  assist_list,
  assist_get,
  assist_search,
  assist_match,
  assist_explain,
  assist_confidence,
  assist_mistakes,
  assist_safety,
  // AIFeatureAutoRegistryEngine (7)
  ai_feature_discover,
  ai_feature_find,
  ai_feature_route,
  ai_feature_list,
  ai_domain_list,
  ai_feature_stats,
  ai_feature_by_category,
  // AISystemRouterEngine (5)
  ai_route_task,
  ai_classify_task,
  ai_backend_health,
  ai_backend_probe,
  ai_router_stats,
  // AutonomousAIOrchestrationEngine (11)
  ai_orchestrate_autonomous,
  ai_select_skills,
  ai_select_algorithms,
  ai_select_formulas,
  ai_knowledge_plan,
  ai_query_mit,
  ai_query_catalogs,
  ai_generate_gsd,
  ai_orchestration_history,
  ai_orchestration_stats,
  ai_orchestration_summary,
  // XPROC-NEURAL Tier 8 (4)
  xproc_symbolic_project,
  xproc_symbolic_violations,
  xproc_safety_verify,
  xproc_safety_escalate,
  // XPROC-NEURAL Tier 9 (8)
  xproc_causal_learn_dag,
  xproc_causal_test_independence,
  xproc_causal_export_graph,
  xproc_do_identify,
  xproc_do_intervene,
  xproc_counterfactual_query,
  xproc_mediation_decompose,
  xproc_mediation_path_strength,
  // XPROC-NEURAL Tier 11 (8) — Active Learning & Curiosity
  xproc_active_select,
  xproc_active_rationale,
  xproc_novelty_score,
  xproc_novelty_alert,
  xproc_curiosity_propose,
  xproc_curiosity_score,
  xproc_doe_plan,
  xproc_doe_evaluate_completion,
  // XPROC-NEURAL Tier 12 (4) — Master Orchestration
  xproc_route_query,
  xproc_route_explain,
  xproc_orchestrate_full,
  xproc_orchestrate_brief,
  // XPROC-NEURAL Tier 8 (4 more — T8-02, T8-04) — Rule-Extracted + Formula-Neural Ensemble
  xproc_extract_rules,
  xproc_rule_explain_prediction,
  xproc_blend_predict,
  xproc_blend_weight_report,
};
