/**
 * AI Capability / Resource / Training Action Schemas — prism_ai dispatcher
 * =========================================================================
 * Zod schemas for U-AIMAX10 (AI-MAX-MS0). Wires 5 AI engines that previously
 * had only partial dispatcher coverage:
 *
 *   - AICapabilityMaximizerEngine   → 9 actions (ai_capability_*)
 *   - AIResourceLearningEngine      → 14 actions (ai_resource_*)
 *   - MasterAITrainingLedgerEngine  → 8 actions (ai_training_master_*)
 *   - LatheAITrainingEngine         → 7 actions (ai_training_lathe_*)
 *   - TrainingLedgerEngine          → 8 actions (ai_training_ledger_*)
 *
 * 46 total. The two pre-existing actions (ai_material_lookup, ai_lathe_train)
 * remain in aiReasoningActionSchemas.ts as legacy aliases — this file does
 * NOT redefine them.
 *
 * @module schemas/aiCapabilityActionSchemas
 * @milestone AI-MAX-MS0/U-AIMAX10
 */

import { z } from "zod";

// ───────────────────────────────────────────────────────────────────────────
// Type unions mirrored from the engine source — keep in sync if engines change.
// ───────────────────────────────────────────────────────────────────────────

/** Pipeline types accepted by MasterAITrainingLedgerEngine — must match PipelineType. */
export const PIPELINE_TYPES = [
  "milling",
  "5axis",
  "millturn",
  "wedm",
  "sinker-edm",
  "laser",
  "waterjet",
  "grinding",
] as const;

/** Resource pattern types from AIResourceLearningEngine. */
export const RESOURCE_PATTERN_TYPES = [
  "gcode_pattern",
  "python_api",
  "cam_automation",
  "material_param",
  "code_quality",
] as const;

/** Capability enhancement strategy areas from AICapabilityMaximizerEngine. */
export const CAPABILITY_STRATEGY_AREAS = [
  "code_generation",
  "knowledge_synthesis",
  "reasoning_depth",
  "context_retention",
] as const;

/** hyperMILL template tasks from AIResourceLearningEngine.generateHyperMillTemplate. */
export const HYPERMILL_TEMPLATE_TASKS = [
  "electrode_create",
  "joblist_iterate",
  "feature_edit",
  "workplane_transform",
] as const;

/** Code-quality recommendation language scope. */
export const CODE_QUALITY_LANGUAGES = ["typescript", "python"] as const;

/** Code-quality recommendation context. */
export const CODE_QUALITY_CONTEXTS = ["engine", "dispatcher", "cam_script", "test"] as const;

/** Operation phases accepted by AIResourceLearningEngine.getRecommendedSpeedFeed. */
export const RESOURCE_SPEED_FEED_OPERATIONS = ["roughing", "finishing"] as const;

/** Terminal + open RunStatus literals from TrainingLedgerEngine. */
export const RUN_STATUSES = ["open", "completed", "aborted", "failed_validation"] as const;

/** Deployment status literals from MasterAITrainingLedgerEngine. */
export const DEPLOYMENT_STATUSES = ["pending", "deployed", "rolled-back"] as const;

/** Lathe training program record passed to trainFromPrograms. */
const lathe_program_record = z
  .object({
    content: z.string().min(1).describe("Raw program text"),
    filepath: z.string().min(1).describe("Source filepath for traceability"),
  })
  .passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Capability — AICapabilityMaximizerEngine
// ───────────────────────────────────────────────────────────────────────────

/** Force a recompute of capability metrics (does not return cached state). */
const ai_capability_compute_metrics = z.object({}).passthrough();

/** Return last-computed capability metrics (computes lazily on first call). */
const ai_capability_get_metrics = z.object({}).passthrough();

/** Surface the prioritized list of capability-enhancement recommendations. */
const ai_capability_enhancement_recommendations = z.object({}).passthrough();

/** Enumerate all reasoning patterns registered with the maximizer. */
const ai_capability_reasoning_patterns = z.object({}).passthrough();

/** Fetch a single reasoning pattern by its registered id. */
const ai_capability_reasoning_pattern_get = z
  .object({
    id: z.string().min(1).describe("Reasoning-pattern id (e.g. 'first-principles')"),
  })
  .passthrough();

/** Snapshot every registered knowledge source and its coverage. */
const ai_capability_knowledge_sources = z.object({}).passthrough();

/** Return the enhancement-strategy payload for one capability area. */
const ai_capability_enhancement_strategy = z
  .object({
    area: z
      .enum(CAPABILITY_STRATEGY_AREAS)
      .describe("Capability area whose strategy to surface"),
  })
  .passthrough();

/** Apply a named reasoning pattern to a user-supplied problem statement.
 * The engine signature requires `input.problem` (problem statement) and
 * `input.context` (free-form context bag) — both mandatory. */
const ai_capability_apply_reasoning_pattern = z
  .object({
    pattern_id: z.string().min(1).describe("Reasoning-pattern id to apply"),
    input: z
      .object({
        problem: z.string().min(1).describe("Problem statement the pattern enhances"),
        context: z
          .record(z.string(), z.unknown())
          .describe("Free-form context object — engine reads keys it understands"),
      })
      .passthrough()
      .describe("Pattern input payload"),
  })
  .passthrough();

/** Render a human-readable capability report (markdown). */
const ai_capability_report = z.object({}).passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Resource — AIResourceLearningEngine
// ───────────────────────────────────────────────────────────────────────────

/** Code-quality recommendations for a given language + write-context. */
const ai_resource_code_quality = z
  .object({
    language: z
      .enum(CODE_QUALITY_LANGUAGES)
      .describe("Target language for the recommendations"),
    context: z
      .enum(CODE_QUALITY_CONTEXTS)
      .describe("Surrounding context (engine, dispatcher, cam_script, test)"),
  })
  .passthrough();

/** Material cutting parameters (Kc, fz, vc) looked up from the learned corpus. */
const ai_resource_material_parameters = z
  .object({
    material: z.string().min(1).describe("Material designation (e.g. AISI 4140, 6061-T6)"),
  })
  .passthrough();

/** hyperMILL Python-API patterns; optional module filter. */
const ai_resource_hypermill_patterns = z
  .object({
    module: z.string().min(1).optional().describe("Optional module filter (e.g. 'cam.cutter')"),
  })
  .passthrough();

/** Okuma G-code pattern for a single canned-cycle keyword. */
const ai_resource_okuma_pattern = z
  .object({
    cycle: z.string().min(1).describe("Cycle keyword (e.g. 'CALL OO74', 'G132')"),
  })
  .passthrough();

/** Dump every Okuma G-code pattern indexed by the engine. */
const ai_resource_okuma_all = z.object({}).passthrough();

/** EDM electrode defaults (gap, overcut, current schedules). */
const ai_resource_edm_defaults = z.object({}).passthrough();

/** All learned ResourcePattern records filtered by pattern type. */
const ai_resource_patterns_by_type = z
  .object({
    type: z.enum(RESOURCE_PATTERN_TYPES).describe("Resource pattern type"),
  })
  .passthrough();

/** Aggregate learning statistics (pattern counts, file coverage). */
const ai_resource_stats = z.object({}).passthrough();

/** Compiled training-context bundle for downstream prompt-build steps. */
const ai_resource_training_context = z.object({}).passthrough();

/** Extract G-code patterns from a raw program string (does not persist). */
const ai_resource_extract_gcode = z
  .object({
    program_content: z.string().min(1).describe("Raw G-code text to scan"),
  })
  .passthrough();

/** Recommended speed/feed for a material + operation pair (roughing|finishing). */
const ai_resource_speed_feed = z
  .object({
    material: z.string().min(1).describe("Workpiece material"),
    operation: z
      .enum(RESOURCE_SPEED_FEED_OPERATIONS)
      .describe("Operation phase the recommendation is for"),
  })
  .passthrough();

/** Generate a hyperMILL macro template for one of the supported task types. */
const ai_resource_generate_hypermill_template = z
  .object({
    task: z
      .enum(HYPERMILL_TEMPLATE_TASKS)
      .describe("Template kind (electrode_create | joblist_iterate | feature_edit | workplane_transform)"),
  })
  .passthrough();

/** Bundled AI training data — patterns + materials + APIs for prompt context. */
const ai_resource_training_data = z.object({}).passthrough();

/** Knowledge-coverage summary across pattern types + sources. */
const ai_resource_knowledge_coverage = z.object({}).passthrough();

/** College-course + resource-PDF AUTOGEN-SPEC corpus pointers (iter15..iter20). */
const ai_college_corpus_pointers = z.object({}).passthrough();

/** CAD+CAM consolidated training-corpus pointers (india iter23..iter26). */
const ai_cadcam_corpus_pointers = z.object({}).passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Training (Master Ledger) — MasterAITrainingLedgerEngine
// ───────────────────────────────────────────────────────────────────────────

/** Training-run SLO targets — passed inside ingest entries. */
const slo_targets_schema = z
  .object({
    minEvalScore: z.number().finite().describe("Minimum acceptable eval score"),
    maxLoss: z.number().finite().describe("Maximum acceptable training loss"),
  })
  .passthrough();

/** Training metrics block stored on each ledger entry. */
const training_metrics_schema = z
  .object({
    loss: z.number().finite().describe("Training loss"),
    accuracy: z.number().finite().describe("Validation accuracy"),
    mae: z.number().finite().describe("Mean absolute error"),
    evalScore: z.number().finite().describe("Composite eval score"),
  })
  .passthrough();

/** Optional actual-vs-predicted drift telemetry. */
const actual_vs_predicted_schema = z
  .object({
    predictedDrift: z.number().finite().describe("Predicted drift score"),
    observedDrift: z.number().finite().describe("Observed drift score"),
    absoluteDelta: z.number().finite().describe("|observed - predicted|"),
  })
  .passthrough();

/** Ingest a new training-run entry (schemaVersion auto-assigned by engine).
 * Wire-level fields are snake_case; dispatcher remaps them onto the LedgerEntry
 * camelCase contract before calling the engine. */
const ai_training_master_ingest = z
  .object({
    run_id: z.string().min(1).describe("Unique run id"),
    pipeline_type: z.enum(PIPELINE_TYPES).describe("Pipeline type the run targets"),
    dataset_fingerprint: z.string().min(1).describe("Stable dataset hash"),
    version: z.string().min(1).describe("Pipeline version label"),
    training_metrics: training_metrics_schema.describe("Final training metrics (camelCase keys)"),
    deployment_status: z
      .enum(DEPLOYMENT_STATUSES)
      .describe("Deployment state at ingest"),
    slo_targets: slo_targets_schema.describe("SLO thresholds (camelCase keys)"),
    actual_vs_predicted: actual_vs_predicted_schema
      .optional()
      .describe("Optional drift telemetry (camelCase keys)"),
    created_at: z.string().min(1).describe("ISO timestamp"),
    promoted_at: z.string().min(1).optional().describe("ISO timestamp when promoted"),
    notes: z.string().optional().describe("Free-form notes"),
  })
  .passthrough();

/** Replay one ledger entry by its run id (null when missing). */
const ai_training_master_replay = z
  .object({
    run_id: z.string().min(1).describe("Run id to replay"),
  })
  .passthrough();

/** Filtered ledger query — all filters optional, ANDed together.
 * snake_case at the wire; dispatcher remaps to the LedgerQuery contract. */
const ai_training_master_query = z
  .object({
    pipeline_type: z.enum(PIPELINE_TYPES).optional().describe("Filter: pipeline type"),
    deployment_status: z
      .enum(DEPLOYMENT_STATUSES)
      .optional()
      .describe("Filter: deployment status"),
    created_after: z.string().min(1).optional().describe("ISO timestamp lower bound"),
    created_before: z.string().min(1).optional().describe("ISO timestamp upper bound"),
    min_eval_score: z.number().optional().describe("Inclusive minimum eval score"),
  })
  .passthrough();

/** List the pipeline types the ledger natively supports. */
const ai_training_master_supported_pipelines = z.object({}).passthrough();

/** Stability statistics (mean / std / CoV) for one pipeline type. */
const ai_training_master_pipeline_stability = z
  .object({
    pipeline_type: z.enum(PIPELINE_TYPES).describe("Pipeline type to summarize"),
  })
  .passthrough();

/** Head-to-head stability comparison between two pipeline types. */
const ai_training_master_compare = z
  .object({
    pipeline_a: z.enum(PIPELINE_TYPES).describe("First pipeline type"),
    pipeline_b: z.enum(PIPELINE_TYPES).describe("Second pipeline type"),
  })
  .passthrough();

/** SLO pass/fail breakdown across every ledger entry. */
const ai_training_master_slo_status = z.object({}).passthrough();

/** Total run count tracked by the ledger. */
const ai_training_master_total_runs = z.object({}).passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Training (Lathe) — LatheAITrainingEngine
// ───────────────────────────────────────────────────────────────────────────

/** Parse a single lathe program into ParsedProgram (does not mutate state). */
const ai_training_lathe_parse = z
  .object({
    content: z.string().min(1).describe("Raw program text"),
    filepath: z.string().min(1).describe("Source filepath for traceability"),
  })
  .passthrough();

/** Extract parameter block from a ParsedToolBlock object (passthrough). */
const ai_training_lathe_extract_params = z
  .object({
    block: z.record(z.string(), z.unknown()).describe("ParsedToolBlock object"),
  })
  .passthrough();

/** Run end-to-end ProgramAnalysis over a ParsedProgram object. */
const ai_training_lathe_analyze = z
  .object({
    program: z.record(z.string(), z.unknown()).describe("ParsedProgram object"),
  })
  .passthrough();

/** Rewrite a program from an analysis result (returns improved program text). */
const ai_training_lathe_rewrite = z
  .object({
    analysis: z.record(z.string(), z.unknown()).describe("ProgramAnalysis object"),
  })
  .passthrough();

/** Train from a batch of programs (mutates engine learned-pattern store). */
const ai_training_lathe_train = z
  .object({
    programs: z
      .array(lathe_program_record)
      .min(1)
      .describe("Programs to train from"),
  })
  .passthrough();

/** Current training statistics (programs seen, patterns learned). */
const ai_training_lathe_stats = z.object({}).passthrough();

/** Snapshot of every learned pattern stored on the engine. */
const ai_training_lathe_patterns = z.object({}).passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Training (Generic Ledger) — TrainingLedgerEngine
// ───────────────────────────────────────────────────────────────────────────

/** Open a training run — stores fingerprint, returns the new TrainingRunRecord. */
const ai_training_ledger_open_run = z
  .object({
    experiment_id: z.string().min(1).describe("Human experiment label"),
    attempt: z.number().int().min(1).describe("1-based retry counter"),
    start_ts: z.number().describe("Epoch ms when training began"),
    base_weight_sha256: z.string().min(1).describe("Pre-training checkpoint hash"),
    manifest_sha256: z.string().min(1).describe("Dataset manifest hash"),
    aug_seed: z.number().int().describe("Augmentation PRNG seed"),
    hyperparams_sha256: z.string().min(1).describe("Hyperparameter config hash"),
    tokenizer_version: z.string().min(1).describe("Tokenizer identifier"),
    trainer_commit_sha: z.string().min(1).describe("Trainer code git SHA"),
    author: z.string().min(1).describe("Author identifier"),
    notes: z.string().optional().describe("Free-form notes"),
  })
  .passthrough();

/** Close an open training run — terminal states only. */
const ai_training_ledger_close_run = z
  .object({
    run_id: z.string().min(1).describe("Run id returned by open_run"),
    end_ts: z.number().describe("Epoch ms when training ended"),
    status: z
      .enum(["completed", "aborted", "failed_validation"])
      .describe("Terminal status"),
    final_weight_sha256: z.string().min(1).optional().describe("Post-training checkpoint hash"),
    eval_metrics_sha256: z.string().min(1).optional().describe("Eval-result hash"),
    elapsed_ms: z.number().min(0).describe("Active training duration in ms"),
    wall_clock_ms: z.number().min(0).describe("Wall-clock duration in ms"),
    reason: z.string().optional().describe("Required for aborted / failed_validation"),
  })
  .passthrough();

/** Lookup a TrainingRunRecord by id (returns null when missing). */
const ai_training_ledger_get_run = z
  .object({
    run_id: z.string().min(1).describe("Run id"),
  })
  .passthrough();

/** List training runs with optional experiment / status filtering. */
const ai_training_ledger_list_runs = z
  .object({
    experiment_id: z.string().min(1).optional().describe("Optional experiment filter"),
    status: z.enum(RUN_STATUSES).optional().describe("Optional status filter (RunStatus literal)"),
    limit: z.number().int().positive().optional().describe("Limit results"),
  })
  .passthrough();

/** Drift report comparing fingerprint stability across runs of one experiment. */
const ai_training_ledger_drift_report = z
  .object({
    experiment_id: z.string().min(1).describe("Experiment id to analyze"),
  })
  .passthrough();

/** Serialize the entire ledger to a JSON-safe snapshot. */
const ai_training_ledger_snapshot = z.object({}).passthrough();

/** Replace the ledger from a previously-emitted snapshot (mutating). */
const ai_training_ledger_load_snapshot = z
  .object({
    snapshot: z.record(z.string(), z.unknown()).describe("Snapshot object from a prior toSnapshot()"),
  })
  .passthrough();

/** Lightweight summary stats — total runs, by-status counts. */
const ai_training_ledger_stats = z.object({}).passthrough();

// ───────────────────────────────────────────────────────────────────────────
// Public exports
// ───────────────────────────────────────────────────────────────────────────

/**
 * Action-name tuple for AI capability/resource/training engines.
 * Mirrors the keys of `ACTION_AI_CAPABILITY_SCHEMAS` — both must stay in sync.
 */
export const AI_CAPABILITY_ACTIONS = [
  // Capability (9)
  "ai_capability_compute_metrics",
  "ai_capability_get_metrics",
  "ai_capability_enhancement_recommendations",
  "ai_capability_reasoning_patterns",
  "ai_capability_reasoning_pattern_get",
  "ai_capability_knowledge_sources",
  "ai_capability_enhancement_strategy",
  "ai_capability_apply_reasoning_pattern",
  "ai_capability_report",

  // Resource (14)
  "ai_resource_code_quality",
  "ai_resource_material_parameters",
  "ai_resource_hypermill_patterns",
  "ai_resource_okuma_pattern",
  "ai_resource_okuma_all",
  "ai_resource_edm_defaults",
  "ai_resource_patterns_by_type",
  "ai_resource_stats",
  "ai_resource_training_context",
  "ai_resource_extract_gcode",
  "ai_resource_speed_feed",
  "ai_resource_generate_hypermill_template",
  "ai_resource_training_data",
  "ai_resource_knowledge_coverage",
  "ai_college_corpus_pointers",
  "ai_cadcam_corpus_pointers",

  // Training — Master ledger (8)
  "ai_training_master_ingest",
  "ai_training_master_replay",
  "ai_training_master_query",
  "ai_training_master_supported_pipelines",
  "ai_training_master_pipeline_stability",
  "ai_training_master_compare",
  "ai_training_master_slo_status",
  "ai_training_master_total_runs",

  // Training — Lathe (7)
  "ai_training_lathe_parse",
  "ai_training_lathe_extract_params",
  "ai_training_lathe_analyze",
  "ai_training_lathe_rewrite",
  "ai_training_lathe_train",
  "ai_training_lathe_stats",
  "ai_training_lathe_patterns",

  // Training — Generic ledger (8)
  "ai_training_ledger_open_run",
  "ai_training_ledger_close_run",
  "ai_training_ledger_get_run",
  "ai_training_ledger_list_runs",
  "ai_training_ledger_drift_report",
  "ai_training_ledger_snapshot",
  "ai_training_ledger_load_snapshot",
  "ai_training_ledger_stats",
] as const;

/** Discriminated-union type for all U-AIMAX10 dispatcher actions. */
export type AICapabilityAction = (typeof AI_CAPABILITY_ACTIONS)[number];

/** Lookup table from action name → Zod schema. Order must match `AI_CAPABILITY_ACTIONS`. */
export const ACTION_AI_CAPABILITY_SCHEMAS: Record<AICapabilityAction, z.ZodTypeAny> = {
  ai_capability_compute_metrics,
  ai_capability_get_metrics,
  ai_capability_enhancement_recommendations,
  ai_capability_reasoning_patterns,
  ai_capability_reasoning_pattern_get,
  ai_capability_knowledge_sources,
  ai_capability_enhancement_strategy,
  ai_capability_apply_reasoning_pattern,
  ai_capability_report,

  ai_resource_code_quality,
  ai_resource_material_parameters,
  ai_resource_hypermill_patterns,
  ai_resource_okuma_pattern,
  ai_resource_okuma_all,
  ai_resource_edm_defaults,
  ai_resource_patterns_by_type,
  ai_resource_stats,
  ai_resource_training_context,
  ai_resource_extract_gcode,
  ai_resource_speed_feed,
  ai_resource_generate_hypermill_template,
  ai_resource_training_data,
  ai_resource_knowledge_coverage,
  ai_college_corpus_pointers,
  ai_cadcam_corpus_pointers,

  ai_training_master_ingest,
  ai_training_master_replay,
  ai_training_master_query,
  ai_training_master_supported_pipelines,
  ai_training_master_pipeline_stability,
  ai_training_master_compare,
  ai_training_master_slo_status,
  ai_training_master_total_runs,

  ai_training_lathe_parse,
  ai_training_lathe_extract_params,
  ai_training_lathe_analyze,
  ai_training_lathe_rewrite,
  ai_training_lathe_train,
  ai_training_lathe_stats,
  ai_training_lathe_patterns,

  ai_training_ledger_open_run,
  ai_training_ledger_close_run,
  ai_training_ledger_get_run,
  ai_training_ledger_list_runs,
  ai_training_ledger_drift_report,
  ai_training_ledger_snapshot,
  ai_training_ledger_load_snapshot,
  ai_training_ledger_stats,
};
