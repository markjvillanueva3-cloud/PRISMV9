/**
 * Orchestration Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 31 prism_orchestrate actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design decisions:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - agent_id/task are string unions where both are accepted
 *
 * v2.1.0: Added pipeline_health, dlq_list, dlq_retry for infrastructure observability
 *
 * @module schemas/orchestrationActionSchemas
 * @version 2.1.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optBool = z.boolean().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const milestoneId = z.string().min(1);
const optMilestoneId = z.string().min(1).optional();

// Common agent task entry: { agentId, input, ... }
const agentTask = z.object({
  agentId: optStr,
  agent_id: optStr,
  input: z.record(z.string(), z.unknown()).optional(),
  name: optStr,
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  dependencies: z.array(z.string()).optional(),
}).passthrough();

// Completed unit entry for roadmap_advance
const completedUnit = z.object({
  unitId: z.string().min(1),
  buildPassed: z.boolean(),
}).passthrough();

// ============================================================================
// AGENT ACTIONS (8 actions)
// ============================================================================

const agent_execute = z.object({
  agent_id: optStr,
  task: optStr,
  input: z.record(z.string(), z.unknown()).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  timeout_ms: z.number().int().positive().optional(),
  retries: z.number().int().min(0).optional(),
}).passthrough();

const agent_parallel = z.object({
  agents: z.array(agentTask).min(1),
}).passthrough();

const agent_pipeline = z.object({
  agents: z.array(agentTask).min(1),
}).passthrough();

const plan_create = z.object({
  name: optStr,
  mode: z.enum(["sequential", "parallel", "adaptive"]).optional(),
  tasks: z.array(z.object({
    agent_id: z.string().min(1),
    input: z.record(z.string(), z.unknown()).optional(),
    name: optStr,
    priority: z.enum(["low", "normal", "high", "critical"]).optional(),
    dependencies: z.array(z.string()).optional(),
  }).passthrough()).min(1),
}).passthrough();

const plan_execute = z.object({
  plan_id: z.string().min(1),
}).passthrough();

const plan_status = z.object({
  plan_id: z.string().min(1),
}).passthrough();

const queue_stats = z.object({}).passthrough();

const session_list = z.object({}).passthrough();

// ============================================================================
// SWARM ACTIONS (7 actions)
// ============================================================================

const swarmPatterns = z.enum([
  "parallel", "pipeline", "map_reduce", "consensus",
  "hierarchical", "ensemble", "competition", "collaboration",
]);

const swarm_execute = z.object({
  name: optStr,
  pattern: swarmPatterns,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const swarm_parallel = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
}).passthrough();

const swarm_consensus = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
  threshold: z.number().min(0).max(1).optional(),
  consensus_field: optStr,
}).passthrough();

const swarm_pipeline = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
}).passthrough();

const swarm_status = z.object({
  swarm_id: z.string().min(1),
}).passthrough();

const swarm_patterns = z.object({}).passthrough();

const swarm_quick = z.object({
  task: optStr,
  description: optStr,
  domain: optStr,
  max_agents: z.number().int().min(2).max(8).optional(),
  min_agents: z.number().int().min(2).optional(),
  timeout_ms: z.number().int().positive().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// ROADMAP EXECUTION ACTIONS (11 actions)
// ============================================================================

const roadmapSource = {
  milestone_id: optMilestoneId,
  roadmap: z.record(z.string(), z.unknown()).optional(),
};

const roadmap_plan = z.object({
  ...roadmapSource,
  completed_ids: z.array(z.string()).optional(),
}).passthrough();

const roadmap_next_batch = z.object({
  ...roadmapSource,
  position: z.record(z.string(), z.unknown()).optional(),
  auto_execute: optBool,
}).passthrough();

const roadmap_advance = z.object({
  ...roadmapSource,
  position: z.record(z.string(), z.unknown()).optional(),
  completed: z.array(completedUnit).min(1),
}).passthrough();

const roadmap_gate = z.object({
  ...roadmapSource,
  phase_id: z.string().min(1),
  completed_ids: z.array(z.string()).optional(),
  build_passed: optBool,
  tests_passed: optBool,
  test_count: z.number().int().nonnegative().optional(),
  baseline_test_count: z.number().int().nonnegative().optional(),
  omega_score: z.number().min(0).max(1).optional(),
}).passthrough();

const roadmap_list = z.object({}).passthrough();

const roadmap_load = z.object({
  milestone_id: milestoneId,
}).passthrough();

const roadmap_claim = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
  worktree: optStr,
}).passthrough();

const roadmap_release = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
}).passthrough();

const roadmap_heartbeat = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
}).passthrough();

const roadmap_discover = z.object({
  category: z.enum(["main", "secondary", "archived"]).optional(),
  reap_stale: optBool,
}).passthrough();

const roadmap_populate_context = z.object({
  milestone_id: milestoneId,
  save: optBool,
}).passthrough();

const roadmap_register = z.object({
  milestone_id: optMilestoneId,
  milestone_ids: z.array(z.string().min(1)).optional(),
  roadmap_title: optStr,
  category: z.enum(["main", "secondary", "archived"]).optional(),
  priority: optNum,
}).passthrough();

// ============================================================================
// PIPELINE & DLQ ACTIONS (3 actions)
// ============================================================================

const pipeline_health = z.object({
  include_metrics: optBool,
  include_claims: optBool,
}).passthrough();

const dlq_list = z.object({
  action_filter: optStr,
  limit: z.number().int().min(1).max(100).optional(),
}).passthrough();

const dlq_retry = z.object({
  dlq_id: z.string().min(1),
}).passthrough();

// ============================================================================
// PIPELINE-IR ACTION (PIPELINE-IR-MS0 / U-PIR03, slot:bravo)
// ============================================================================

// Validate + topo-order + DRY-RUN-preview a declarative PipelineIR. The `pipeline`
// object is validated again (strict graph integrity) by PipelineIRConverterEngine,
// so this schema only gates the OUTER shape. `mode` documents that live actuation
// exists but is REFUSED until a safety-tier allowlist gate ships (governance).
const execute_ir_pipeline = z.object({
  pipeline: z.record(z.string(), z.unknown())
    .describe("A declarative PipelineIR object (id + stages[]); deep-validated + topo-sorted by PipelineIRConverterEngine"),
  mode: z.enum(["dry_run", "live"]).optional()
    .describe("dry_run (default): validate + preview the resolved dispatcher:action call plan with ZERO actuation. live: refused until a safety-tier allowlist gate ships (unsafe-fleet-control governance)"),
}).passthrough().describe("Validate + topo-order + DRY-RUN-preview a declarative PipelineIR through PipelineIRExecutorEngine. No cross-dispatcher actuation.");

// ============================================================================
// EXPORT: ACTION_ORCHESTRATION_SCHEMAS
// ============================================================================

export const ACTION_ORCHESTRATION_SCHEMAS: ActionSchemaMap = {
  // Agent actions
  agent_execute,
  agent_parallel,
  agent_pipeline,
  plan_create,
  plan_execute,
  plan_status,
  queue_stats,
  session_list,

  // Swarm actions
  swarm_execute,
  swarm_parallel,
  swarm_consensus,
  swarm_pipeline,
  swarm_status,
  swarm_patterns,
  swarm_quick,

  // Roadmap execution actions
  roadmap_plan,
  roadmap_next_batch,
  roadmap_advance,
  roadmap_gate,
  roadmap_list,
  roadmap_load,
  roadmap_claim,
  roadmap_release,
  roadmap_heartbeat,
  roadmap_discover,
  roadmap_populate_context,
  roadmap_register,

  // Pipeline & DLQ actions
  pipeline_health,
  dlq_list,
  dlq_retry,

  // PIPELINE-IR-MS0 / U-PIR03 (slot:bravo)
  execute_ir_pipeline,

  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH5: Deep Reasoning
  cognitive_tot_create_tree: z.object({
    problem: z.string().min(1).describe("Problem statement to reason about"),
    goal: z.string().min(1).describe("Goal state to reach"),
    initial_state: z.record(z.string(), z.unknown()).describe("Starting state for the root node"),
  }).passthrough(),
  cognitive_mfg_reason: z.object({
    problem: z.string().min(1).describe("Manufacturing problem statement"),
    goal: z.string().min(1).describe("Goal description"),
    domain: z.enum(["milling", "turning", "drilling", "grinding", "edm", "additive", "casting", "forming", "general", "lathe"]).describe("Manufacturing domain"),
    material: z.object({
      name: z.string().optional().describe("Material name"),
      iso_group: z.string().optional().describe("ISO machinability group P/M/K/N/S/H"),
      hardness: z.number().optional().describe("Hardness HRC/HB"),
      machinability_index: z.number().optional().describe("Relative machinability index"),
    }).passthrough().optional().describe("Material context"),
    machine_id: z.string().optional().describe("Machine identifier"),
    operation: z.string().optional().describe("Operation type"),
    budget: z.number().nonnegative().optional().describe("Budget constraint USD"),
    deadline: z.string().optional().describe("Deadline ISO date"),
    quality_requirements: z.object({
      tolerance: z.number().nonnegative().optional(),
      surface_finish: z.number().nonnegative().optional(),
      critical_dimensions: z.array(z.string()).optional(),
    }).passthrough().optional().describe("Quality requirements"),
    constraints: z.array(z.string()).optional().describe("Constraint list"),
    known_facts: z.array(z.string()).optional().describe("Known facts"),
    max_steps: z.number().int().positive().optional().describe("Max reasoning steps"),
  }).passthrough(),
  cognitive_multi_asset_reason: z.object({
    objective: z.string().min(1).describe("Objective to reason about across multiple assets"),
    constraints: z.array(z.string()).optional().describe("Optional constraints"),
    available_asset_types: z.array(z.string()).optional().describe("Subset of ['engine','formula','algorithm','tool','material','machine','strategy']"),
    material: z.string().optional().describe("Material context"),
    machine_type: z.string().optional().describe("Machine type"),
  }).passthrough(),

  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH8: Neural / Meta-AI
  cognitive_neural_synthesize: z.object({
    domain: z.string().min(1).describe("Domain (mill / lathe / wedm / general)"),
    objective: z.string().min(1).describe("Objective to synthesize across knowledge sources"),
    constraints: z.array(z.string()).optional().describe("Optional constraints"),
    context: z.record(z.string(), z.unknown()).optional().describe("Optional context map"),
    depth: z.enum(["quick", "moderate", "deep", "exhaustive"]).optional().describe("Synthesis depth (default: moderate)"),
  }).passthrough(),
  cognitive_neural_list_weights: z.object({
    model_id: z.string().min(1).optional().describe("Optional model id filter"),
  }).passthrough(),
  cognitive_meta_orchestrate: z.object({
    problem: z.string().min(1).describe("Problem statement"),
    domain: z.string().min(1).describe("AI capability domain"),
    constraints: z.array(z.string()).describe("Constraints (may be empty array)"),
    context: z.record(z.string(), z.unknown()).describe("Context map (may be empty object)"),
    preferred_modes: z.array(z.string()).optional().describe("Preferred reasoning modes"),
    time_budget_ms: z.number().int().positive().optional().describe("Time budget in ms"),
    quality_threshold: z.number().min(0).max(1).optional().describe("Quality threshold 0-1"),
  }).passthrough(),
  cognitive_neural_comprehensive_predict: z.object({
    input: z.array(z.number()).min(1).describe("Feature vector (will be converted to Float64Array)"),
  }).passthrough(),

  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH7: Learning Loop
  cognitive_learning_get_track_record: z.object({
    category: z.enum(["cutting_force", "tool_life", "speed_feed", "surface_finish", "thermal", "deflection", "wear", "stability", "general"]).optional().describe("Optional prediction category filter"),
  }).passthrough(),
  cognitive_learning_loop_stats: z.object({}).passthrough(),
  cognitive_learning_incremental_list_jobs: z.object({}).passthrough(),

  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH6: Ollama / Local Model Orchestrator
  ollama_ensure_connected: z.object({}).passthrough(),
  ollama_ping: z.object({}).passthrough(),
  ollama_discover_models: z.object({
    force_refresh: z.boolean().optional().describe("Force fresh roster fetch (default false)"),
  }).passthrough(),
  local_model_route: z.object({
    task_kind: z.enum(["chat", "code", "embed", "reasoning", "safety_critical", "gcode_explain", "quote_summary"]).describe("Task classification for routing"),
    prompt: z.string().optional().describe("User prompt"),
    system: z.string().optional().describe("Optional system message"),
    embed_input: z.string().optional().describe("Embedding input text (for taskKind=embed)"),
    input_tokens: z.number().int().nonnegative().optional().describe("Rough input-token estimate"),
    output_tokens_max: z.number().int().positive().optional().describe("Max output tokens (default 512)"),
    latency_budget_ms: z.number().int().positive().optional().describe("Hard latency budget in ms"),
    cost_budget_usd: z.number().nonnegative().optional().describe("Hard cost budget in USD"),
    needs_tools: z.boolean().optional().describe("Tool-use required for this task"),
    require_safety: z.boolean().optional().describe("Safety-critical pathway required"),
    hardware: z.enum(["home_blackwell", "home_4080", "work_3080", "cloud_only"]).describe("Live hardware profile for routing"),
    backend_up: z.record(z.string(), z.boolean()).optional().describe("Backend availability snapshot keyed by backend name; missing keys treated as available"),
    force_backend: z.enum(["ollama", "anthropic", "openai"]).optional().describe("Override backend selection"),
    force_model: z.string().optional().describe("Override model id"),
  }).passthrough(),

  // ── WIRE-UNWIRED-MS0/U-WIRE02: AgentRegistryEngine — recommend Task-tool agents ──
  agent_recommend: z.object({
    prompt: z.string().min(1).describe("Task description to match Task-tool agents against"),
    agents: z.array(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      description: z.string().min(1),
      triggers: z.array(z.string().min(1)).min(1),
      costTier: z.enum(["low", "medium", "high"]),
      exampleInvocations: z.array(z.string()).optional(),
    })).optional().describe("Optional inline agent catalog; defaults to data/state/AGENT_REGISTRY.json"),
    registryFile: z.string().optional().describe("Optional absolute path to an agent registry JSON file"),
    limit: z.number().int().positive().max(50).optional().describe("Max matches to return (default 3)"),
  }).passthrough().describe("Recommend Task-tool agents for a prompt by keyword-trigger match"),

  // ── U-BRIDGE-WIRE-AGENT (slot:mike, 2026-05-23) ──────────────────────────────
  agent_hardened_validate: z.object({
    output: z.record(z.string(), z.unknown()).describe("Agent output object to verify"),
    groundings: z.array(z.object({
      formula_id: z.string().min(1),
      formula_name: z.string().min(1),
      formula_latex: z.string(),
      input_values: z.record(z.string(), z.number()),
      output_value: z.number(),
      output_unit: z.string(),
      uncertainty: z.number(),
      source: z.string().min(1),
    }).passthrough()).min(1).describe("PhysicsGrounding[] — formulas + values backing the output"),
  }).passthrough().describe("HardenedAgentCapabilities — verify an agent output is physics-grounded"),

  agent_auto_update_snapshot: z.object({}).passthrough()
    .describe("AgentAutoUpdate — snapshot engine/dispatcher/hook/skill counts (read-only)"),

  agent_workflow_list: z.object({
    workflow_id: z.string().optional().describe("Optional — return a specific workflow by id"),
  }).passthrough().describe("AgentWorkflow — list registered workflows or fetch one by id"),

  // ── U-BRIDGE-WIRE-EDIT-PLAN (slot:mike, 2026-05-23) ─────────────────────────
  edit_plan_suggest_tool: z.object({
    fileSize: z.number().nonnegative().optional().describe("Full file size in bytes (camelCase form)"),
    file_size: z.number().nonnegative().optional().describe("Full file size in bytes (snake_case form)"),
    changeSize: z.number().nonnegative().optional().describe("Change size in bytes (camelCase form)"),
    change_size: z.number().nonnegative().optional().describe("Change size in bytes (snake_case form)"),
  }).passthrough().describe("EditPlanner — recommend Edit vs Write for a change based on size ratio"),

  // ── U-BRIDGE-WIRE-REPETITION (slot:mike, 2026-05-23) ────────────────────────
  repetition_detect: z.object({
    text: z.string().min(1).describe("Input text to analyze for repetition patterns"),
    maxTopRepeats: z.number().int().positive().optional().describe("Max top-repeated tokens to return (default 5)"),
  }).passthrough().describe("RepetitionDetector — analyze repetition + compression opportunity in text"),

  // ── U-BRIDGE-WIRE-TOSUM (slot:mike, 2026-05-23) ─────────────────────────────
  tool_output_summarize: z.object({
    output: z.string().min(1).describe("Tool output to compress"),
    maxLines: z.number().int().positive().optional().describe("Max output lines (default 10)"),
  }).passthrough().describe("ToolOutputSummarizer — compress noisy tool output (tests/builds/git/etc) to N lines"),

  // ── U-BRIDGE-WIRE-INCREAD (slot:mike, 2026-05-23) ───────────────────────────
  incremental_read_state: z.object({
    file: z.string().min(1).describe("Absolute or relative file path whose read-history is queried"),
  }).passthrough().describe("IncrementalRead — return offset/limit + read-progress state for a file"),

  // ── U-BRIDGE-WIRE-CTX-UTIL (slot:mike, 2026-05-23) ──────────────────────────
  conversation_classify_segment: z.object({
    content: z.string().min(1).describe("Conversation content segment to classify"),
  }).passthrough().describe("ConversationTrimmer — classify a content segment by retention priority"),
  prefetch_extract_imports: z.object({
    content: z.string().min(1).describe("Source file content to scan for imports"),
  }).passthrough().describe("SmartPrefetch — extract import paths from a TS/JS source string"),
};
