/**
 * Dev Action Schemas - Zod schemas for prism_dev dispatcher actions
 */
import { z } from "zod";

// ── RoadmapIntelligenceEngine shared sub-schemas (ENGINE-WIRE: prism_dev roadmap_intel_* actions) ──
const _riMilestoneUnit = z.object({
  id: z.string(), name: z.string(), description: z.string(),
  estimated_hours: z.number().nonnegative().optional(),
  actual_hours: z.number().nonnegative().optional(),
  complexity: z.enum(["trivial", "simple", "moderate", "complex", "very_complex"]).optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
}).passthrough();
const _riMilestone = z.object({
  id: z.string(), name: z.string(), description: z.string(), phase: z.string(),
  units: z.array(_riMilestoneUnit),
  dependencies: z.array(z.string()),
  estimated_effort_hours: z.number().nonnegative().optional(),
  actual_effort_hours: z.number().nonnegative().optional(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]),
  priority: z.number().optional(),
  tags: z.array(z.string()).optional(),
}).passthrough();
const _riLearningRecord = z.object({
  milestone_id: z.string(),
  predicted_hours: z.number().nonnegative(),
  actual_hours: z.number().nonnegative(),
  predicted_complexity: z.string(),
  actual_complexity: z.string(),
  prediction_date: z.string(),
  completion_date: z.string(),
  factors_that_affected_estimate: z.array(z.string()),
  lessons_learned: z.array(z.string()),
}).passthrough();
const _riLibraryOption = z.object({
  name: z.string().min(1),
  integration_hours: z.number().nonnegative(),
  annual_cost: z.number().nonnegative().default(0),
  reliability: z.number().min(0).max(1),
  features: z.array(z.string()).default([]),
}).passthrough();

// ── StopConditionEngine shared ctx sub-schema (ENGINE-WIRE: prism_dev stop_condition_* actions) ──
// All fields optional so validation never blocks on a missing/partial context —
// the dispatcher coerces sensible defaults (maxBudget→200000, counts→0, arrays→[]).
const _scContextState = z.object({
  totalTokensUsed: z.number().nonnegative().optional().describe("Tokens consumed so far this session"),
  maxBudget: z.number().positive().optional().describe("Session token budget ceiling (dispatcher defaults to 200000)"),
  recentFiles: z.array(z.string()).optional().describe("Files read/edited in the last N minutes"),
  recentGreps: z.array(z.string()).optional().describe("Recent grep keys, format 'pattern|path'"),
  toolCallCount: z.number().nonnegative().optional().describe("Total tool calls so far this session"),
  sessionAgeMinutes: z.number().nonnegative().optional().describe("Session age in minutes"),
}).passthrough();

export const ACTION_DEV_SCHEMAS: Record<string, z.ZodType<any>> = {
  session_boot: z.object({}).optional(),
  build: z.object({ fast: z.boolean().optional() }).optional(),
  code_template: z.object({ template: z.string() }).optional(),
  code_search: z.object({ pattern: z.string(), maxResults: z.number().optional() }).optional(),
  file_read: z.object({ path: z.string() }).optional(),
  file_write: z.object({ path: z.string(), content: z.string() }).optional(),
  server_info: z.object({}).optional(),
  test_smoke: z.object({}).optional(),
  test_results: z.object({}).optional(),

  // AUTO-LEARNING-LOOP-MS0/U-ALL01 step-5 — ReputableSourceMonitorEngine surface.
  source_sweep: z.object({
    mode: z.enum(["poll_all", "poll_one", "get_sources", "get_state", "reset_all"])
      .optional()
      .describe("Operation mode (defaults to poll_all). poll_all = full sweep; poll_one = one slug; get_sources = list config; get_state = per-source state; reset_all = clear all state."),
    slug: z.string()
      .optional()
      .describe("Source slug — required for poll_one + get_state (e.g. 'arxiv-cs-ai')."),
  }).optional(),

  edit_impact_build_graph: z.object({
    srcRoot: z.string().optional().describe("Source root directory to scan"),
  }).optional(),

  edit_impact_predict: z.object({
    filePath: z.string().describe("File path to analyze impact for"),
  }),

  edit_impact_stats: z.object({}).optional(),

  // Tool call parallelization
  tool_call_record: z.object({
    tool: z.string().describe("Tool name (Read|Write|Edit|Glob|Grep|Bash|Agent|Other)"),
    inputs: z.record(z.string(), z.any()).optional().describe("Tool input parameters"),
    in_parallel_batch: z.boolean().optional().describe("Was this part of a parallel batch?"),
    token_cost: z.number().optional().describe("Token cost estimate for this call"),
  }),
  tool_call_analyze: z.object({}).optional(),
  tool_call_reset: z.object({}).optional(),

  // ── StopConditionEngine — pre-flight tool-call stop/warn/allow decisions ──
  // (sibling of tool_call_* / token_* token-economy surfaces; ENGINE-WIRE)
  stop_condition_evaluate: z.object({
    tool: z.string().describe("Pending tool name (Read|Grep|Agent|WebFetch|...)"),
    params: z.record(z.string(), z.any()).optional().describe("Pending tool's input params (file_path, pattern, prompt, url, ...)"),
    ctx: _scContextState.optional().describe("Context state used by the stop rules"),
  }),
  stop_condition_should_block: z.object({
    tool: z.string().describe("Pending tool name"),
    params: z.record(z.string(), z.any()).optional().describe("Pending tool's input params"),
    ctx: _scContextState.optional().describe("Context state used by the stop rules"),
  }),
  stop_condition_evaluate_all: z.object({
    tool: z.string().describe("Pending tool name"),
    params: z.record(z.string(), z.any()).optional().describe("Pending tool's input params"),
    ctx: _scContextState.optional().describe("Context state used by the stop rules"),
  }),
  stop_condition_rules: z.object({}).optional(),

  // File read deduplication
  file_read_record: z.object({
    path: z.string().describe("Absolute file path"),
    content: z.string().describe("Content that was read"),
    offset: z.number().optional().describe("Byte/line offset of partial read"),
    limit: z.number().optional().describe("Length of partial read (0=full)"),
    mtime_ms: z.number().optional().describe("File mtime at read time"),
  }),
  file_read_should_skip: z.object({
    path: z.string().describe("Absolute file path"),
    offset: z.number().optional(),
    limit: z.number().optional(),
    current_mtime_ms: z.number().optional(),
  }),
  file_read_report: z.object({}).optional(),

  // Conversation stale detector
  stale_segment_record: z.object({
    type: z.enum(["user_message", "assistant_response", "tool_call", "tool_result", "system_reminder"])
      .describe("Segment type"),
    text: z.string().describe("Segment text content"),
    status: z.enum(["open", "resolved", "abandoned", "completed"]).optional()
      .describe("Status of the work the segment represents"),
    resolves: z.string().optional().describe("ID of segment this resolves/supersedes"),
  }),
  stale_segment_prune: z.object({}).optional(),
  stale_segment_mark: z.object({
    segment_id: z.string().describe("Segment ID to update"),
    status: z.enum(["open", "resolved", "abandoned", "completed"]).describe("New status"),
  }),

  // Session reorientation
  reorient_record_anchor: z.object({
    type: z.enum(["task_anchor", "decision", "file_modified", "error_resolved", "milestone", "user_directive"])
      .describe("Anchor type"),
    summary: z.string().describe("Compact summary of what happened (<= 200 chars)"),
    rationale: z.string().optional().describe("Why (for decisions)"),
    files: z.array(z.string()).optional().describe("Files referenced"),
    importance: z.number().min(1).max(10).optional().describe("1-10, default by type"),
    tags: z.array(z.string()).optional().describe("Custom tags (overrides auto-extracted)"),
  }),
  reorient_deactivate_anchor: z.object({
    anchor_id: z.string().describe("Anchor ID to deactivate"),
  }),
  reorient_record_prompt: z.object({}).optional(),
  reorient_record_tool_call: z.object({}).optional(),
  reorient_generate_brief: z.object({
    trigger: z.string().optional().describe("Trigger label (manual|auto|drift)"),
  }),
  reorient_should_generate: z.object({}).optional(),
  reorient_stats: z.object({}).optional(),
  reorient_update_config: z.object({
    config: z.object({
      promptInterval: z.number().optional(),
      toolCallInterval: z.number().optional(),
      maxAnchors: z.number().optional(),
      driftWindowSize: z.number().optional(),
      driftThreshold: z.number().optional(),
    }).describe("Partial config to merge"),
  }),
  reorient_reset: z.object({}).optional(),

  // Model-aware self-awareness (Opus 4.7 1M only)
  model_aware_detect: z.object({
    model: z.string().optional().describe("Override model identifier (else env/settings)"),
  }).optional(),
  model_aware_zone: z.object({
    consumed_tokens: z.number().describe("Cumulative tokens consumed in session"),
    context_window: z.number().optional().describe("Context window size (default 1_000_000)"),
  }),
  model_aware_cadence: z.object({
    zone: z.enum(["fresh", "warm", "degrading", "critical"]).describe("Context zone"),
  }),
  model_aware_current_cadence: z.object({
    consumed_tokens: z.number().optional().describe("Override consumed tokens (else read from context_pressure.json)"),
    model: z.string().optional().describe("Override model identifier"),
  }).optional(),

  // PSAU-FORESIGHT orchestrator
  foresight_report: z.object({
    description: z.string().describe("What is being proposed or changed"),
    unitClass: z.string().optional().describe("Unit class for risk forecast (generic|physics|wiring|...) — default: generic"),
    proposedFiles: z.array(z.string()).optional().describe("Files the change will touch"),
    contextTokensUsed: z.number().optional().describe("Current context tokens consumed"),
    contextTokensLimit: z.number().optional().describe("Context window size"),
    modelName: z.string().optional().describe("Active model id (e.g. opus_4_7_1m)"),
  }),

  // PSAU-FORESIGHT SLO reliability tracker (ErrorBudgetEngine)
  error_budget_set_target: z.object({
    service: z.string().min(1).describe("Service identifier (e.g. prism_session, mill_studio)"),
    availabilityTarget: z.number().gt(0).lt(1).describe("SLO availability target in (0,1); e.g. 0.999 = 99.9%"),
    windowHours: z.number().positive().describe("Rolling window for budget calculation (hours)"),
  }),

  error_budget_record: z.object({
    service: z.string().min(1).describe("Service identifier"),
    success: z.boolean().describe("Did the request/operation succeed?"),
    weight: z.number().positive().optional().describe("Optional event weight (default 1)"),
    at: z.number().optional().describe("Epoch ms; defaults to now"),
  }),

  error_budget_status: z.object({
    service: z.string().min(1).describe("Service identifier"),
  }),

  error_budget_list: z.object({}).optional(),

  // PSAU-FORESIGHT multi-agent scheduling (DistributedCriticalPathEngine)
  distributed_critical_path: z.object({
    tasks: z.array(z.object({
      id: z.string().min(1).describe("Task identifier"),
      duration: z.number().nonnegative().describe("Task duration (hours or unitless)"),
      owner: z.string().min(1).describe("Agent/owner who executes the task serially"),
      predecessors: z.array(z.string()).optional().describe("IDs of tasks that must finish first"),
    })).min(1).describe("Tasks to schedule across agents"),
  }),

  // PSAU-FORESIGHT plan invalidation (ReplanTriggerEngine)
  replan_evaluate: z.object({
    plan: z.object({
      planId: z.string().min(1).describe("Identifier of the plan being checked"),
      createdAt: z.number().describe("Epoch ms when the plan was created"),
      preconditions: z.record(z.string(), z.any()).describe("Facts that must hold for the plan to be valid"),
      deadlines: z.record(z.string(), z.number()).optional().describe("Per-task deadline epoch ms"),
      resources: z.array(z.string()).optional().describe("Named resources the plan depends on"),
      assumptions: z.record(z.string(), z.any()).optional().describe("Soft assumptions that trigger patch-replan if violated"),
    }),
    currentState: z.record(z.string(), z.any()).describe("Observed facts for precondition + assumption comparison"),
    currentTime: z.number().optional(),
    lostResources: z.array(z.string()).optional(),
    externalEvents: z.array(z.string()).optional(),
    timeBudgetRemainingMs: z.number().optional(),
    minTimeBudgetMs: z.number().optional(),
  }),

  // PSAU-FORESIGHT reliability — SchemaMigrationRollbackEngine read/snapshot surface
  // (registerMigration/migrate/rollback NOT dispatched — they require runtime-registered callables)
  schema_snapshot: z.object({
    target: z.string().min(1).describe("State file or component identifier"),
    data: z.any().describe("State payload to snapshot (JSON-serializable)"),
    version: z.number().int().describe("Schema version the data conforms to"),
    label: z.string().optional().describe("Optional human-readable label"),
  }),

  schema_restore_snapshot: z.object({
    snapshotId: z.string().min(1).describe("Snapshot id returned by schema_snapshot"),
  }),

  schema_history: z.object({
    target: z.string().min(1).describe("State file or component identifier"),
  }),

  schema_migrations_list: z.object({}).optional(),

  // PSAU-FORESIGHT predictive failure analysis (FailureModeAnticipationEngine)
  failure_risk_analyze: z.object({
    conditions: z.object({
      toolWearPercent: z.number().min(0).max(100),
      toolOverhangRatio: z.number().nonnegative(),
      toolGradeMatch: z.number().min(0).max(1),
      cuttingForce: z.number().nonnegative(),
      spindleLoad: z.number().min(0).max(200),
      vibrationLevel: z.number().nonnegative(),
      temperature: z.number(),
      clampingForce: z.number().nonnegative(),
      cuttingForceRequired: z.number().nonnegative(),
      fixtureRigidity: z.number().min(0).max(1),
      machineHours: z.number().nonnegative(),
      spindleCondition: z.number().min(0).max(100),
      lastMaintenance: z.number().nonnegative(),
      materialHardness: z.number(),
      materialAbrasivity: z.number().min(0).max(1),
      engagementPercent: z.number().min(0).max(100),
      depthOfCut: z.number().nonnegative(),
      programVerified: z.boolean(),
    }).describe("Full 18-factor condition set driving failure prediction"),
  }),

  failure_modes_list: z.object({}).optional(),

  failure_mode_get: z.object({
    id: z.string().min(1).describe("Failure mode identifier"),
  }),

  failure_cascade_chain: z.object({
    failureId: z.string().min(1).describe("Root failure mode id to trace cascade from"),
  }),

  // OllamaHookBridgeEngine — local LLM for hooks (token-free suggestions)
  ollama_hook_query: z.object({
    prompt: z.string().min(1).max(10000).describe("Prompt to send to Ollama"),
    hookType: z.enum(["grep_index", "mcp_route", "ai_feature", "code_explain", "pattern_match", "validation", "general"])
      .optional().describe("Hook type for model selection (default: general)"),
    timeoutMs: z.number().min(50).max(30000).optional().describe("Query timeout in ms (default: 500)"),
    maxTokens: z.number().min(1).max(4096).optional().describe("Max tokens in response (default: 100)"),
    systemPrompt: z.string().optional().describe("Override system prompt"),
    temperature: z.number().min(0).max(1).optional().describe("Sampling temperature (default: 0.3)"),
  }),

  ollama_hook_status: z.object({}).optional().describe("Check Ollama availability and list installed models"),

  ollama_hook_config: z.object({
    baseUrl: z.string().url().optional().describe("Ollama API base URL (default: http://localhost:11434)"),
    defaultModel: z.string().optional().describe("Default model for queries"),
    timeoutMs: z.number().min(50).max(30000).optional().describe("Default timeout in ms"),
    maxTokens: z.number().min(1).max(4096).optional().describe("Default max tokens"),
    modelOverrides: z.record(
      z.enum(["grep_index", "mcp_route", "ai_feature", "code_explain", "pattern_match", "validation", "general"]),
      z.string()
    ).optional().describe("Per-hook-type model overrides"),
    verbose: z.boolean().optional().describe("Enable verbose logging"),
  }).optional(),
  // ── ENGINE-WIRE-MS0/U-WIRE15: 5 self-awareness/AI-meta engines ──
  dev_awareness_find_similar: z.object({
    keywords: z.array(z.string().min(1)).min(1).max(50).describe("Keywords to match against asset registry"),
    types: z.array(z.enum(["engine","formula","algorithm","action","dispatcher","skill","hook","tribal_tip","playbook_rule","extraction"])).optional().describe("Restrict to specific asset types"),
    limit: z.number().int().positive().max(100).optional().describe("Max results (default 10)"),
  }),

  dev_awareness_bootstrap_report: z.object({
    now_ms: z.number().int().positive().optional().describe("Override 'now' timestamp (test reproducibility)"),
  }).passthrough(),

  dev_capability_metrics: z.object({}).passthrough(),

  dev_system_recommend_engines: z.object({
    type: z.enum(["build","optimize","analyze","extract","reason"]).describe("Task category"),
    domain: z.string().min(1).describe("Domain or topic (e.g. 'cutting force', 'tool life')"),
    description: z.string().min(1).describe("Free-text description of the task"),
  }).passthrough(),

  dev_auto_utilize_analyze: z.object({
    input: z.string().min(1).describe("User input or task description to classify"),
    context: z.object({
      recent_files: z.array(z.string()).optional(),
      recent_engines: z.array(z.string()).optional(),
      domain_focus: z.string().optional(),
      session_goals: z.array(z.string()).optional(),
      error_history: z.array(z.string()).optional(),
    }).passthrough().optional().describe("Optional session context for ranking"),
  }).passthrough(),
  // ── ENGINE-WIRE-MS0/U-WIRE16: 5 test infra engines ─────────────────
  dev_test_ast_analyze: z.object({
    file_path: z.string().min(1).describe("Absolute or src-relative path to the engine TypeScript file"),
  }).passthrough(),

  dev_test_coverage_uncovered: z.object({}).passthrough(),

  dev_test_registry_get_material: z.object({
    iso_group: z.enum(["P","M","K","N","S","H"]).describe("ISO material group letter"),
  }).passthrough(),

  dev_test_resource_filter: z.object({
    process: z.enum(["wire_edm","sinker_edm","lathe","mill","grinder","welder","laser","waterjet"]).optional().describe("Process category"),
    coverage: z.enum(["tutorial","regression","adversarial","calibration"]).optional().describe("Coverage tier"),
    difficulty: z.enum(["beginner","intermediate","advanced","expert"]).optional().describe("Difficulty tier"),
    customer: z.string().optional().describe("Customer name filter"),
    material: z.string().optional().describe("Material filter"),
    controller: z.string().optional().describe("Controller filter"),
    operation: z.string().optional().describe("Operation filter"),
    tag: z.string().optional().describe("Single-tag filter"),
    search: z.string().optional().describe("Substring search across label+tags+customer"),
  }).passthrough(),

  dev_skill_gap_analyze: z.object({
    domain: z.string().optional().describe("Restrict analysis to a domain"),
    min_usage_threshold: z.number().int().nonnegative().optional().describe("Floor on usage count"),
    max_usage_threshold: z.number().int().positive().optional().describe("Ceiling on usage count"),
  }).passthrough(),

  // BACKEND-DEVTOOLS-RGS6 HTML-COMPANION-MS0 — render a PRISM Markdown spec to an HTML companion
  spec_html_render: z.object({
    md: z.string().optional().describe("Markdown content to render (provide this OR path)"),
    path: z.string().optional().describe("Path to a .md file under the PRISM root to read & render (provide this OR md)"),
    theme: z.enum(["dark", "light", "auto"]).optional().describe("Color theme; auto (default) follows prefers-color-scheme"),
    toc: z.boolean().optional().describe("Include the table-of-contents sidebar (default true)"),
    title: z.string().optional().describe("Override the document <title>"),
    write: z.boolean().optional().describe("If a path was given, also write <path>.html (and a .hash sidecar) alongside it"),
    include_html: z.boolean().optional().describe("Return the full rendered HTML inline in the response (default false — only metadata)"),
  }).passthrough(),

  // ── RoadmapIntelligenceEngine — AI-powered roadmap execution (ENGINE-WIRE: prism_dev) ──
  roadmap_intel_assess_complexity: z.object({
    milestone: _riMilestone.describe("The milestone to assess for implementation complexity"),
  }).passthrough(),
  roadmap_intel_optimize: z.object({
    milestones: z.array(_riMilestone).min(1).describe("Milestones to order/parallelize (>=1)"),
  }).passthrough(),
  roadmap_intel_predict_effort: z.object({
    milestone: _riMilestone.describe("The milestone to estimate effort for"),
    historical_data: z.array(_riLearningRecord).optional().describe("Past predicted-vs-actual records used to calibrate the estimate"),
  }).passthrough(),
  roadmap_intel_record_outcome: z.object({
    milestone_id: z.string().min(1).describe("Milestone whose actual outcome is being recorded"),
    predicted_hours: z.number().positive().describe("Hours that were predicted"),
    actual_hours: z.number().positive().describe("Hours actually taken"),
    predicted_complexity: z.string().min(1).describe("Complexity level that was predicted"),
    actual_complexity: z.string().min(1).describe("Complexity level observed"),
    lessons_learned: z.array(z.string()).default([]).describe("Free-text lessons fed to the learning engine"),
  }).passthrough(),
  roadmap_intel_build_vs_integrate: z.object({
    feature_name: z.string().min(1).describe("Name of the feature under build-vs-integrate decision"),
    feature_description: z.string().default("").describe("What the feature does"),
    build_estimate_hours: z.number().positive().describe("Estimated hours to build it in-house"),
    maintenance_hours_per_year: z.number().nonnegative().default(0).describe("Estimated annual maintenance hours if built in-house"),
    library_options: z.array(_riLibraryOption).default([]).describe("Candidate libraries/services to integrate instead"),
  }).passthrough(),
  roadmap_intel_health: z.object({
    milestones: z.array(_riMilestone).min(1).describe("All milestones in the roadmap"),
    historical_data: z.array(_riLearningRecord).optional().describe("Past records used to compute estimation accuracy + velocity trend"),
  }).passthrough(),

  // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): HOOK_REGISTRY.json reader actions.
  hook_registry: z.object({
    mode: z.enum([
      "counts", "meta", "compact", "find", "search",
      "by_event", "by_tier", "wired", "orphaned", "stale",
    ]).default("counts").describe("Which projection to return; defaults to counts (smallest)."),
    query: z.string().max(200).optional().describe("Used by find/search; capped at 200 chars."),
    event: z.string().optional().describe("Event name for mode=by_event (e.g. PreToolUse)."),
    tier: z.string().optional().describe("Tier label for mode=by_tier (e.g. T0)."),
    max: z.union([z.string(), z.number()]).optional().describe("Cap on results (search/compact). Default 25 search / 5 compact."),
  }).passthrough(),

  // ACP-MS0/P0-U02: hook lifecycle inventory + CCM-planned detection.
  hook_lifecycle_inventory: z.object({
    mode: z.enum([
      "build", "summary", "by_stage", "by_status", "markdown", "ccm_planned",
    ]).default("summary").describe(
      "build = full inventory (large); summary = counts only; by_stage = filter " +
        "to one of (authoring|pre_execution|post_execution|turn_end_gate|" +
        "context_boundary|async_background|unclassified); by_status = filter to " +
        "(wired|orphan|disabled|planned); markdown = rendered report; ccm_planned = " +
        "hooks declared by milestone forge_triple but not yet on disk.",
    ),
    stage: z.string().optional().describe("Stage filter for mode=by_stage."),
    status: z.string().optional().describe("Status filter for mode=by_status."),
    registry_path: z.string().optional().describe("Override HOOK_REGISTRY.json path (tests use a fixture)."),
    hooks_dir: z.string().optional().describe("Override .claude/hooks dir (used for ccm-planned existence check)."),
    milestones_dir: z.string().optional().describe("Override mcp-server/data/milestones dir."),
  }).passthrough(),

  // HOOK-SYNERGY-MS0/U-HOOK-ENVELOPE (H4): hook-latency.jsonl reader actions.
  hook_latency: z.object({
    mode: z.enum([
      "summary", "per_hook", "top_p95", "recent_slow", "recent_failures", "total_fires", "available",
    ]).default("summary").describe("Which projection: summary | per_hook | top_p95 | recent_slow | recent_failures | total_fires | available."),
    hook: z.string().optional().describe("Hook basename for mode=per_hook."),
    window_ms: z.union([z.string(), z.number()]).optional().describe("Window for stats (default 7 days, max 90 days)."),
    threshold_ms: z.union([z.string(), z.number()]).optional().describe("Latency floor for mode=recent_slow."),
    n: z.union([z.string(), z.number()]).optional().describe("Result cap; defaults vary by mode."),
  }).passthrough(),

  // HOOK-SYNERGY-MS0/U-HOOK-FAST-LANE (H6): settings.json matcher split engine.
  hook_fast_lane: z.object({
    mode: z.enum([
      "analyze", "propose", "apply_preview", "forecast", "classify_block",
    ]).default("analyze").describe(
      "analyze = full plan + forecast; propose = applied settings JSON for review; " +
        "apply_preview = same as propose plus a diff summary; forecast = per-tool " +
        "fire-count table only; classify_block = classify hooks in a single " +
        "user-supplied block (no settings file).",
    ),
    settings_path: z.string().optional().describe(
      "Absolute path to settings.json. Defaults to H:/prism/.claude/settings.json. " +
        "Used by analyze/propose/apply_preview/forecast.",
    ),
    block: z.object({
      matcher: z.string().optional(),
      hooks: z.array(z.object({ command: z.string() }).passthrough()).default([]),
    }).passthrough().optional().describe("Required for mode=classify_block."),
  }).passthrough(),

  // HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH (H7): AsyncHookDispatcherEngine surfaces.
  // The engine decouples Tier-4 hooks from the synchronous Stop critical path —
  // enqueue() returns immediately and spawns a detached runner that writes the
  // result row asynchronously. Read modes (pending/results/stats/available) are
  // pure projections over the two JSONLs; write modes (enqueue/purge) mutate.
  async_dispatch: z.object({
    mode: z.enum([
      "enqueue", "pending", "results", "stats", "available", "purge",
    ]).default("pending").describe(
      "enqueue = append a job + spawn the detached runner; pending = read the " +
        "queue; results = filtered past outcomes; stats = per-hook aggregates; " +
        "available = cheap existence check; purge = drop entries older than " +
        "older_than_ms (queue + results).",
    ),
    job: z.object({
      hook_path: z.string().describe("Absolute path to the .mjs hook to invoke."),
      tier: z.string().optional().describe("Hook tier (T0..T4 or untagged); passed through for telemetry."),
      event: z.string().optional().describe("Triggering Claude Code event (Stop, PostToolUse, …)."),
      matcher: z.string().optional().describe("Triggering matcher (empty for Stop)."),
      tool: z.string().optional().describe("Triggering tool name (empty for Stop)."),
      timeout_ms: z.union([z.string(), z.number()]).optional().describe("Per-job timeout in ms (capped at the engine's absolute ceiling)."),
      ctx: z.unknown().optional().describe("Arbitrary JSON-safe context forwarded to the wrapped hook as stdin."),
    }).passthrough().optional().describe("Required for mode=enqueue."),
    window_ms: z.union([z.string(), z.number()]).optional().describe("Stats/results window in ms; default 24h, max 30d."),
    status: z.enum(["any", "succeeded", "failed", "timeout", "skipped"]).optional().describe("Filter for mode=results."),
    hook: z.string().optional().describe("Hook basename filter for mode=results (without .mjs)."),
    n: z.union([z.string(), z.number()]).optional().describe("Result limit; default 50, max 1000."),
    older_than_ms: z.union([z.string(), z.number()]).optional().describe("Required for mode=purge."),
  }).passthrough(),

  // CLEANUP-MS0/U-CLEANUP-B2: PeerCommitAuditorEngine (B1) dispatcher surfaces.
  // Three actions wrap the engine for cron + skill + dashboard access without
  // letting callers reach the singleton directly. tick() is the workhorse;
  // attribution + dispatch_plan are read-side projections of the ledger that
  // B5 / B4 / F8 consume.
  peer_audit_tick: z.object({
    since_iso: z.string().optional().describe("ISO 8601 lower bound for git log. Defaults to cache.lastTickIso → state-file → now-1h fallback."),
    repo_root: z.string().optional().describe("Repo root to poll. Defaults to PEER_AUDIT_LIMITS.DEFAULT_REPO_ROOT (H:/prism)."),
    cache_path: z.string().optional().describe("Cache file path. Defaults to <repoRoot>/state/shared/.peer-audit-cache.json for worktree isolation."),
    exclude_authors: z.array(z.string()).optional().describe("Authors to skip in addition to the default golf-watchdog-bot / golf-watchdog."),
    dry_run: z.boolean().optional().describe("If true, count queue candidates but emit no chat_bus_signals and no cache mutation."),
    reap_stale: z.boolean().optional().describe("If true, also run reapStaleTicks() to mark 'running' rows older than reap_threshold_ms as 'aborted'."),
    reap_threshold_ms: z.union([z.string(), z.number()]).optional().describe("Reaper threshold; default 10 min. Only used when reap_stale=true."),
  }).passthrough(),

  peer_audit_attribution: z.object({
    mode: z.enum(["list_open", "list_recent_ticks", "list_pending_signals"]).default("list_open")
      .describe("Which projection to return: list_open = unresolved bug_attribution rows; list_recent_ticks = recent peer_audit_ticks rows (any status); list_pending_signals = chat_bus_signals not yet consumed."),
    limit: z.union([z.string(), z.number()]).optional().describe("Row cap; default 100, max 10000."),
    chat: z.string().optional().describe("Required for mode=list_pending_signals — filter to signals targeted at this chat OR broadcast."),
  }).passthrough(),

  peer_audit_dispatch_plan: z.object({
    mode: z.enum(["preview", "limits", "cursor_status"]).default("preview")
      .describe("preview = list pending signals + heuristic dispatch order (B4 consumes); limits = exported PEER_AUDIT_LIMITS constants; cursor_status = current cache.lastTickIso + projector cursors."),
    chat: z.string().optional().describe("Target chat for mode=preview; defaults to 'golf-watchdog' if omitted."),
    limit: z.union([z.string(), z.number()]).optional().describe("Preview row cap; default 50."),
  }).passthrough(),

  // ── CLEANUP-MS0/U-CLEANUP-C2 — wiring_potential ─────────────────────────────
  // WiringPotentialEngine (C1) dispatcher surface. Three modes:
  //   - analyze     : rank candidate dispatchers for ONE orphan engine name.
  //   - batch_unwired: pull BUILD_STATE.NEEDS_WIRING.sample_engines[] and rank
  //                    candidates per orphan; cap via topN (default 25, max 200).
  //   - dashboard   : aggregate top-candidate distribution (how many orphans
  //                    each dispatcher would absorb, grouped + ranked).
  wiring_potential: z.object({
    mode: z.enum(["analyze", "batch_unwired", "dashboard"]).default("analyze")
      .describe("analyze = single engine; batch_unwired = scan BUILD_STATE orphan engines; dashboard = aggregate top-candidate distribution."),
    engine_name: z.string().min(1).max(200).optional()
      .describe("Required for mode=analyze. Orphan engine name (e.g. 'GCodeTemplateEngine')."),
    engine_names: z.array(z.string().min(1).max(200)).optional()
      .describe("Override for mode=batch_unwired — explicit engine names to analyze instead of reading BUILD_STATE.NEEDS_WIRING."),
    top_n: z.union([z.string(), z.number()]).optional()
      .describe("Row cap for batch_unwired / dashboard; default 25, max 200."),
    top_k: z.union([z.string(), z.number()]).optional()
      .describe("Per-engine candidate cap (default 3, max 10) — passed through to WiringPotentialEngine.analyze()."),
    min_confidence: z.union([z.string(), z.number()]).optional()
      .describe("Drop candidates below this semantic confidence (default MIN_HEURISTIC_CONFIDENCE=0.30)."),
    capacity_file: z.string().optional()
      .describe("Override path to F7 DISPATCHER_CAPACITY.json (advanced; defaults to state/shared/DISPATCHER_CAPACITY.json relative to repo root)."),
  }).passthrough(),
};