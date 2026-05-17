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

  // ── RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER: roadmap tool-plan sidecar surface ──
  // The 948-plan sidecar (state/shared/roadmap-tool-plans.json) had no dispatcher
  // read/write surface (engine-wiring-doctrine violation). `unit_key` is charset-
  // guarded to the roadmap-id alphabet [A-Za-z0-9_:.-] as defense-in-depth: it
  // flows into a subprocess argv, and although the dispatcher uses execFileSync
  // (no shell) the regex re-checks the contract at the validation boundary too.
  roadmap_tool_plan_query: z.object({
    unit_key: z.string().min(1).regex(/^[A-Za-z0-9_:.\-]+$/, "unit_key must be roadmap-id charset only ([A-Za-z0-9_:.-])")
      .describe("Roadmap unit key — composite 'MILESTONE::U-ID' or a bare unit id — to fetch the cached ToolPlan for"),
  }),
  roadmap_tool_plan_build: z.object({
    unit_key: z.string().min(1).regex(/^[A-Za-z0-9_:.\-]+$/, "unit_key must be roadmap-id charset only ([A-Za-z0-9_:.-])")
      .describe("Roadmap unit key to (re)generate a ToolPlan for — invokes the planner for this single unit"),
    force: z.boolean().optional().describe("Re-plan even if the sidecar source-hash is current (default false)"),
    ollama_off: z.boolean().optional().describe("Deterministic mode — skip the Ollama synthesis reader (default false)"),
  }),
  roadmap_tool_plan_coverage: z.object({}).optional()
    .describe("No params — returns the anti-rot coverage dashboard for the whole tool-plan sidecar"),

  // ── U-DOCU-04 / MS-DOCU-INGEST: BlueprintProgramJoinEngine query-layer lookups ──
  // Point lookups against the pre-built v6 blueprint↔program join + the
  // title-block-verified training triples. Path options are intentionally NOT
  // in the schema — the actions always query the default Docustrata/.index join
  // (no arbitrary-file-read surface, no cross-action singleton-cache poisoning).
  program_for_print: z.object({
    part_number: z.string().min(1).describe("Part number from a print / title block — loose-normalized before lookup (op-prefix / material-code / rev-letter stripped)"),
  }),
  print_for_program: z.object({
    program_path: z.string().min(1).describe("Program/CAD file path (any slash style, any case) — returns the print(s) joined to it"),
  }),

  // ── U-DOCU-05 / MS-DOCU-INGEST: JMDieArchiveBackAnnotationEngine surfaces ──
  // Back-annotate the JM-Die archive with print-pointer sidecars + a prism_parts
  // index, derived from the v6 blueprint↔program join + training triples. The
  // gap report scans both the join AND the JM-Die disk index (jm-die-index-v2.json)
  // and FAIL-LOUDs on programs on disk with NO join row (~16K g-code + ~15K
  // cam_project unreachable from Docustrata alone — per envelope brief).
  back_annotate_archive: z.object({
    dry_run: z.boolean().optional().describe("Plan-only; no files written. Defaults TRUE — first call previews blast radius before mutation."),
    confidence_filter: z.array(z.enum(["exact", "loose", "ambiguous", "garbage", "miss"]))
      .optional()
      .describe("Which v6 match_confidence values to annotate. Default ['exact','loose']."),
    archive_root: z.string().optional().describe("Override the archive root (the dir containing Docustrata/.index AND JM DIE/). Default auto-resolved."),
    write_parts_index: z.boolean().optional().describe("Write per-PN entries under Docustrata/.index/prism_parts/. Default TRUE."),
    limit: z.number().int().nonnegative().optional().describe("Cap on programs processed per call. 0 = no cap. Useful for operator-incremental runs."),
    allow_roots: z.array(z.string()).optional().describe("Allow-list of root prefixes for the program-path trust-boundary check. Default [archive_root]."),
  }).optional(),
  back_annotate_gap_report: z.object({
    archive_root: z.string().optional().describe("Override the archive root used to locate jm-die-index-v2.json."),
    dry_run: z.boolean().optional().describe("If true (default false), don't persist; just return the report."),
    disk_index_path: z.string().optional().describe("Override the path to jm-die-index-v2.json. Default <archive_root>/Docustrata/.index/jm-die-index-v2.json."),
  }).optional(),
  read_print_pointer: z.object({
    program_path: z.string().min(1).describe("Program/CAD file path — returns the print-pointer sidecar if present and provenance == self."),
  }),

  // ── U-PPL-D1 / MS-PRINT-PROGRAM-LOOP Track D: ProgramPrintLinkIndexEngine ──
  // Composite link-index surfaces built on top of BlueprintProgramJoinEngine (U-DOCU-04)
  // + the enhanced JM-Die PN normalizer (T8047D3 ITW / C2500-2497 SCREWS / 9082526 AGRATI
  // / BU-1365-0000-002 TFI) + program-side seed augmentation. Two surfaces:
  //   - program_print_link_lookup: composite resolver for either direction
  //   - program_print_link_coverage: confidence breakdown + disk-side gap report
  program_print_link_lookup: z.object({
    direction: z.enum(["print_for_program", "program_for_print"]).describe(
      "Lookup direction. print_for_program = given a program path, return its print(s). program_for_print = given a part number, return its programs.",
    ),
    query: z.string().min(1).describe(
      "Query value — a program file path when direction=print_for_program, or a part number when direction=program_for_print.",
    ),
    input_program_paths: z.array(z.string()).optional().describe(
      "Optional list of program file paths to feed the program-side seed augmentation BEFORE the lookup. When omitted, only the v6 join + training triples are consulted (no enhanced-normalizer rescue).",
    ),
    join_jsonl_path: z.string().optional().describe(
      "Override the v6 join JSONL path. Default: <repo>/Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
    ),
  }),
  program_print_link_coverage: z.object({
    archive_program_paths: z.array(z.string()).optional().describe(
      "Optional list of archive program paths to compute the disk-side gap against. When supplied, the report includes in_v6_join / rescued_by_seed / still_orphan counts + orphan_rate_pct.",
    ),
    input_program_paths: z.array(z.string()).optional().describe(
      "Optional list of program paths to feed the seed augmentation before computing coverage. When omitted, the seed augmentation is skipped + rescued_by_seed = 0.",
    ),
    join_jsonl_path: z.string().optional().describe(
      "Override the v6 join JSONL path. Default: <repo>/Docustrata/.index/blueprint-program-join-full-v6.jsonl.",
    ),
  }).optional(),

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

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CALL-CHAIN ────────────────────────
  // CallChainEngine — tool-call anti-pattern detector (glob->read->grep,
  // read->edit->read, grep->read->edit, etc) with 60s time-window matching.
  // Complements tool_call_* (ToolCallParallelizationEngine, parallel-batch
  // tracker) — different engine, different surface.
  tool_chain_record: z.object({
    tool: z.string().min(1).max(64).describe("Tool name as recorded (Read, Grep, Edit, Bash, etc)"),
    target: z.string().max(2048).optional().describe("File path / pattern / URL the tool acted on (used to match read->edit->read same-target patterns)"),
  }).passthrough().describe("Record one tool call. Returns the anti-pattern if the latest segment triggers one (else null)."),

  tool_chain_detected: z.object({}).passthrough().describe("Return all anti-patterns detected so far on this chain"),

  tool_chain_string: z.object({
    last: z.number().int().positive().max(100).optional().describe("How many recent links to include (default 10)"),
  }).passthrough().describe("Get the chain as a compact 'Tool -> Tool -> Tool' arrow string"),

  tool_chain_summary: z.object({}).passthrough().describe("Human-readable summary of detected anti-patterns + total token waste"),

  tool_chain_suggest: z.object({}).passthrough().describe("Optimization suggestions based on tool-count clustering in the last 10 calls"),

  tool_chain_reset: z.object({}).passthrough().describe("Clear the chain and detected patterns"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-READ-OPT ──────────────────────────
  // ReadOptimizerEngine — file-read strategy advisor. Returns one of 5 strategies
  // (skip|full|offset|grep|digest) with estimated token cost. Reads real
  // filesystem (fs.statSync); non-existent path returns strategy="full".
  read_optimize_recommend: z.object({
    file_path: z.string().min(1).max(2048).describe("Absolute or relative path to the file to read"),
    intent: z.string().max(1024).optional().describe("Optional grep-like search intent — when present, large files are routed to grep instead of digest"),
  }).passthrough().describe("Recommend optimal read strategy for a single file"),

  read_optimize_oneliner: z.object({
    file_path: z.string().min(1).max(2048).describe("Absolute or relative path"),
    intent: z.string().max(1024).optional().describe("Optional grep intent — see read_optimize_recommend"),
  }).passthrough().describe("Compact one-line recommendation string (STRATEGY: reason (~N tokens))"),

  read_optimize_batch: z.object({
    files: z.array(z.string().min(1).max(2048)).min(1).max(500).describe("File paths to recommend strategies for"),
    intent: z.string().max(1024).optional().describe("Shared grep intent applied to each file"),
  }).passthrough().describe("Recommend strategies for a batch of files"),

  read_optimize_batch_cost: z.object({
    files: z.array(z.string().min(1).max(2048)).min(1).max(500).describe("File paths to estimate cost for"),
  }).passthrough().describe("Estimate total + optimized token cost across a batch; returns {total, optimized, savings}"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-COMPACT-FMT ───────────────────────
  // CompactFormatterEngine — pure formatting utilities (table, kv, summarize,
  // compact, system-line, diff-stat, test-result, truncate). All methods are
  // stateless; engine is a singleton only for parity with the rest of the file.
  compact_table: z.object({
    data: z.array(z.record(z.string(), z.unknown())).describe("Array of objects to render as 'key:value | key:value'"),
    key_field: z.string().min(1).describe("Property to use as the left-side label"),
    value_field: z.string().min(1).describe("Property to use as the right-side value"),
    sep: z.string().max(8).optional().describe("Separator between entries (default ' | ')"),
  }).passthrough().describe("Render data as a compact 'k:v | k:v' line"),

  compact_kv_pairs: z.object({
    data: z.record(z.string(), z.unknown()).describe("Object to render as key=value pairs"),
    inline: z.boolean().optional().describe("true (default) joins with spaces; false joins with newlines"),
  }).passthrough().describe("Render an object as compact key=value pairs"),

  compact_summarize_array: z.object({
    arr: z.array(z.unknown()).describe("Items to summarize"),
    max_items: z.number().int().positive().max(100).optional().describe("Maximum items to show before '+N more' (default 5)"),
  }).passthrough().describe("Show first N items + '+X more' suffix when exceeded"),

  compact_compact: z.object({
    data: z.unknown().describe("Any value — object/array/primitive — to compact"),
    max_chars: z.number().int().positive().max(64000).optional().describe("Hard cap on output length (default 2000)"),
    level: z.enum(["minimal", "standard", "verbose"]).optional().describe("Depth/string-length preset (default 'standard')"),
  }).passthrough().describe("Compact a nested value into a single-line summary string"),

  compact_system_line: z.object({
    counts: z.record(z.string(), z.number()).describe("Counts to render with single-letter prefixes (engines→E, dispatchers→D, etc)"),
  }).passthrough().describe("Compact PRISM count summary like '3236E/97D/7244A'"),

  compact_diff_stat: z.object({
    diff_stat: z.string().describe("Raw output from 'git diff --stat'"),
  }).passthrough().describe("Compress a git diff --stat into a one-line summary"),

  compact_test_result: z.object({
    passed: z.number().int().nonnegative().describe("Pass count"),
    failed: z.number().int().nonnegative().describe("Fail count"),
    skipped: z.number().int().nonnegative().optional().describe("Skip count (default 0)"),
  }).passthrough().describe("Render test counts as 'N✓ M✗ K⊘'"),

  compact_truncate: z.object({
    text: z.string().describe("Text to truncate at a word boundary"),
    max_len: z.number().int().positive().max(10000).optional().describe("Max length (default 100)"),
  }).passthrough().describe("Truncate text at the nearest word boundary"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PROMPT-TPL ────────────────────────
  // PromptTemplateEngine — 7 builtin parameterized templates (engine_create,
  // dispatcher_action, test_suite, hookify_rule, slash_command, commit_message,
  // speed_feed) across 7 categories (forge, wiring, testing, hooks, skills, git,
  // manufacturing). Pure functions; no I/O.
  prompt_template_get: z.object({
    id: z.string().min(1).max(64).describe("Template id (engine_create, dispatcher_action, test_suite, hookify_rule, slash_command, commit_message, speed_feed)"),
  }).passthrough().describe("Get a template by id; returns null if not found"),

  prompt_template_fill: z.object({
    id: z.string().min(1).max(64).describe("Template id"),
    params: z.record(z.string(), z.string()).describe("Map of {param} placeholders to their replacement values"),
  }).passthrough().describe("Substitute {params} placeholders in the template body; returns null if id not found"),

  prompt_template_list: z.object({}).passthrough().describe("List all templates as {id, name, category, params}"),

  prompt_template_by_category: z.object({
    category: z.string().min(1).max(64).describe("Category name (forge, wiring, testing, hooks, skills, git, manufacturing)"),
  }).passthrough().describe("Filter templates by category"),

  prompt_template_categories: z.object({}).passthrough().describe("List all distinct categories"),

  prompt_template_search: z.object({
    query: z.string().min(1).max(256).describe("Case-insensitive substring search across name + description + id"),
  }).passthrough().describe("Keyword search across templates"),

  prompt_template_stats: z.object({}).passthrough().describe("{total, categories, avgTokens}"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-BUDGET-TRIM ───────────────────────
  // OutputBudgetEngine — stateless output trim/filter/budget-estimator. NOT the
  // OutputBudgetEnforcerEngine (output_budget_* actions); that's a different
  // engine with persistent rules. This one is pure-functional utilities.
  budget_trim_enforce: z.object({
    data: z.unknown().describe("Any value to trim against the budget"),
    options: z.object({
      maxChars: z.number().int().positive().max(1000000).optional(),
      keepFields: z.array(z.string()).optional(),
      dropFields: z.array(z.string()).optional(),
      maxArrayItems: z.number().int().positive().max(10000).optional(),
      maxDepth: z.number().int().positive().max(20).optional(),
      truncationMarker: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough().describe("Trim data to fit a budget; default 5000 chars / 10 array items / 4 depth"),

  budget_trim_estimate_tokens: z.object({
    data: z.unknown().describe("Any value to estimate token count for"),
  }).passthrough().describe("Estimate token count (~4 chars/token)"),

  budget_trim_exceeds_budget: z.object({
    data: z.unknown().describe("Any value to check"),
    max_tokens: z.number().int().positive().describe("Token budget"),
  }).passthrough().describe("Return true if data exceeds the budget"),

  budget_trim_filter_fields: z.object({
    obj: z.record(z.string(), z.unknown()).describe("Object to filter"),
    keep: z.array(z.string()).describe("Field allowlist — only these are kept"),
  }).passthrough().describe("Keep only the named fields"),

  budget_trim_drop_fields: z.object({
    obj: z.record(z.string(), z.unknown()).describe("Object to filter"),
    drop: z.array(z.string()).describe("Field denylist — these are dropped"),
  }).passthrough().describe("Drop the named fields"),

  budget_trim_summarize_array: z.object({
    arr: z.array(z.unknown()).describe("Array to summarize"),
    keep: z.number().int().positive().max(1000).optional().describe("Items to keep at each end (default 3)"),
  }).passthrough().describe("Keep first N + last N items, return {items, total, showing}"),

  budget_trim_preset: z.object({
    name: z.enum(["compact", "normal", "verbose"]).describe("Preset bundle (compact=1500ch/3items/depth2; normal=5000ch/10items/depth4; verbose=20000ch/50items/depth8)"),
  }).passthrough().describe("Get a preset BudgetOptions configuration"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CONV-BUDGET ──────────────────────
  // ConversationBudgetEngine — singleton tracker for conversation-level token
  // usage with 50/70/90% threshold alerts and top-N consumer breakdown.
  conv_budget_record: z.object({
    tool: z.string().min(1).max(64).describe("Tool name (Read|Write|Edit|Glob|Grep|Bash|Agent|Other)"),
    input_tokens: z.number().int().nonnegative().describe("Input tokens consumed"),
    output_tokens: z.number().int().nonnegative().describe("Output tokens consumed"),
  }).passthrough().describe("Record one tool call's token usage"),

  conv_budget_status: z.object({}).passthrough().describe("Full usage status: toolCalls, inputTokens, outputTokens, largestCall, byTool, totalTokens, budgetPercent, remaining"),

  conv_budget_check: z.object({}).passthrough().describe("Budget alert if budgetPercent crosses 50/70/90 thresholds; null otherwise"),

  conv_budget_top_consumers: z.object({
    n: z.number().int().positive().max(50).optional().describe("Number of top consumers to return (default 5)"),
  }).passthrough().describe("Top-N tools by total tokens consumed"),

  conv_budget_status_line: z.object({}).passthrough().describe("Compact one-line status (Tokens/Budget | Calls | Largest)"),

  conv_budget_estimate_remaining: z.object({}).passthrough().describe("Estimate remaining operations: {reads, greps, edits, dispatchers}"),

  conv_budget_reset: z.object({}).passthrough().describe("Clear all usage tracking"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-TCB ──────────────────────────────
  // ToolCallBatchEngine — singleton history-based batching advisor with 5
  // pattern detectors (multiple-reads, grep-then-read, multiple-globs,
  // read-then-grep-same, sequential-independent-reads).
  tcb_record: z.object({
    tool: z.string().min(1).max(64).describe("Tool name (Read|Grep|Glob|Bash|Edit|Write|...)"),
    tool_params: z.record(z.string(), z.unknown()).optional().describe("Params dict (used for path/file_path matching in grep-then-read pattern)"),
  }).passthrough().describe("Record one tool call into the batch history"),

  tcb_analyze: z.object({
    window_size: z.number().int().positive().max(50).optional().describe("Recent window to analyze (default 10)"),
  }).passthrough().describe("Detect batching opportunities in the last window_size calls"),

  tcb_can_batch: z.object({
    tool: z.string().min(1).max(64).describe("Tool name to check"),
  }).passthrough().describe("Return {batchable, with[]} — whether pending tool can join the active parallel batch"),

  tcb_stats: z.object({}).passthrough().describe("History stats: {total, byTool, parallelRatio}"),

  tcb_summary: z.object({}).passthrough().describe("Human-readable summary of batching opportunities + total tokens saveable"),

  tcb_reset: z.object({}).passthrough().describe("Clear all history"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-DATA-VALIDATION ──────────────────
  // DataValidationEngine — DQ-MS1 data quality pipeline (material/cutting/job
  // validation with severity-tagged issues and 0-100 score).
  dv_validate_material: z.object({
    name: z.string().optional(),
    hardness_hrc: z.number().optional(),
    tensile_strength_mpa: z.number().optional(),
    density_kg_m3: z.number().optional(),
    thermal_conductivity: z.number().optional(),
    iso_group: z.string().optional(),
  }).passthrough().describe("Validate material properties — ranges + ISO group + required fields"),

  dv_validate_cutting_params: z.object({
    rpm: z.number().optional(),
    feed_rate: z.number().optional(),
    feed_per_tooth: z.number().optional(),
    axial_depth: z.number().optional(),
    radial_depth: z.number().optional(),
    tool_diameter: z.number().optional(),
    number_of_teeth: z.number().int().optional(),
  }).passthrough().describe("Validate cutting parameters — physics ranges + cross-field consistency"),

  dv_validate_job: z.object({
    job_id: z.string().optional(),
    material: z.unknown().optional(),
    operation: z.string().optional(),
  }).passthrough().describe("Validate a job payload — nested material + operation + completeness"),

  dv_stats: z.object({}).passthrough().describe("Validation count + engine internal stats"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-EDGE-CASE ────────────────────────
  // EdgeCaseCaptureEngine — Phase 0.25 Adaptive Variability Framework. Records
  // boundary operations + drives envelope expansion via VariabilityEnvelopeEngine.
  edge_case_capture: z.object({
    operation: z.string().min(1).describe("Operation name (e.g. 'pocket', 'thread_mill', 'finishing')"),
    parameter: z.string().min(1).describe("Parameter being captured (e.g. 'rpm', 'feed_per_tooth')"),
    value: z.number().describe("The captured value at boundary"),
    outcome: z.enum(["success", "marginal", "failure"]).describe("How the operation ended"),
    context: z.object({
      material: z.string().optional(),
      machine: z.string().optional(),
      tool: z.string().optional(),
      operation_type: z.string().optional(),
    }).passthrough().describe("Context dict — material/machine/tool/operation_type"),
    measurements: z.object({
      vibration: z.number().optional(),
      temperature: z.number().optional(),
      power: z.number().optional(),
      surface_roughness: z.number().optional(),
    }).passthrough().optional().describe("Sensor measurements at capture"),
    operator_notes: z.string().optional().describe("Free-text operator notes"),
  }).passthrough().describe("Capture an edge-case operation — auto-computes percentile via VariabilityEnvelopeEngine, generates learnings when percentile > 0.99 + success"),

  edge_case_auto_capture: z.object({
    parameter: z.string().min(1).describe("Parameter to evaluate against envelope"),
    value: z.number().describe("Current value"),
    outcome: z.enum(["success", "marginal", "failure"]).describe("Operation outcome"),
    context: z.object({}).passthrough().describe("Context dict"),
    operation: z.string().optional().describe("Operation name (default 'unknown')"),
  }).passthrough().describe("Auto-capture ONLY if percentile >= 0.95 — returns null if not at edge"),

  edge_case_summary: z.object({
    parameter: z.string().min(1).describe("Parameter to summarize"),
  }).passthrough().describe("Per-parameter summary: count, success rate, avg percentile, expansion potential"),

  edge_case_all_summaries: z.object({}).passthrough().describe("Summaries for every parameter tracked"),

  edge_case_expansion_candidates: z.object({}).passthrough().describe("Parameters with >=3 successful >0.99-percentile captures — envelope-expansion candidates"),

  edge_case_search: z.object({
    parameter: z.string().optional(),
    outcome: z.enum(["success", "marginal", "failure"]).optional(),
    min_percentile: z.number().min(0).max(1).optional(),
    max_percentile: z.number().min(0).max(1).optional(),
    material: z.string().optional(),
    machine: z.string().optional(),
    since: z.string().optional().describe("ISO timestamp lower bound"),
  }).passthrough().describe("Filter captures by criteria — used by post-mortem reviews"),

  edge_case_learnings: z.object({}).passthrough().describe("All extracted learnings (from successful >0.99-percentile captures)"),

  edge_case_stats: z.object({}).passthrough().describe("Total captures, success rate, parameters tracked, expansion candidates, learnings generated"),

  // ── ResponseTemplateEngine (5 actions) — OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-RESPONSE-TEMPLATE
  //    Post-dispatch response-formatting hooks. Templates select sections per
  //    pressure level (full/compact/minimal/skip). Engine is a process singleton.
  response_template_match: z.object({
    dispatcher: z.string().min(1).describe("Dispatcher name, e.g. 'prism_data'"),
    action: z.string().min(1).describe("Action within the dispatcher, e.g. 'material_get'"),
    result_data: z.any().describe("Raw dispatcher result to project against the template (string is parsed as JSON)"),
    pressure_pct: z.number().min(0).max(100).default(0).describe("Context-pressure %. >85 skips, 60-85 minimal, 40-60 compact, <40 full"),
  }).passthrough(),
  response_template_list: z.object({}).passthrough().describe("List every registered template (id, dispatcher, actions, format, section count)"),
  response_template_get: z.object({
    template_id: z.string().min(1).describe("Template id, e.g. 'TPL-MATERIAL'"),
  }).passthrough(),
  response_template_stats: z.object({}).passthrough().describe("Template engine telemetry (executions, matches, hit rate, last match, coverage)"),
  response_template_reset_stats: z.object({}).passthrough().describe("Reset internal counters (testing/dev hook)"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-REVERSE-INDEX ────────────────────
  // ReverseIndexEngine — Phase 0.7 bidirectional asset lookup with WAL-style
  // crash recovery. 5 named indexes:
  //   ACTION_TO_ENGINE | SKILL_TO_ACTION | ENGINE_TO_DEPENDENTS |
  //   KEYWORD_TO_ASSETS | TYPE_TO_ASSETS
  rev_idx_action_to_engine: z.object({
    action: z.string().min(1).describe("Dispatcher action name (case-insensitive)"),
  }).passthrough().describe("Which engine(s) handle this action — returns string[]"),

  rev_idx_skill_to_action: z.object({
    skill: z.string().min(1).describe("Slash-command/skill name (case-insensitive)"),
  }).passthrough().describe("Which dispatcher action(s) does this skill invoke — returns string[]"),

  rev_idx_engine_to_dependents: z.object({
    engine: z.string().min(1).describe("Engine name (case-insensitive)"),
  }).passthrough().describe("Which engines import/depend on this engine — returns string[]"),

  rev_idx_keyword_search: z.object({
    keyword: z.string().min(1).describe("Keyword from JSDoc/description (case-insensitive)"),
  }).passthrough().describe("Fuzzy keyword → asset names — returns string[]"),

  rev_idx_assets_by_type: z.object({
    asset_type: z.string().min(1).describe("Asset type (engine|action|skill|hook|...)"),
  }).passthrough().describe("All assets of a given type — returns string[]"),

  rev_idx_add_mapping: z.object({
    index_name: z.enum(["ACTION_TO_ENGINE", "SKILL_TO_ACTION", "ENGINE_TO_DEPENDENTS", "KEYWORD_TO_ASSETS", "TYPE_TO_ASSETS"]).describe("Target index"),
    key: z.string().min(1).describe("Lookup key (normalized to lowercase)"),
    value: z.string().min(1).describe("Value to append (deduped, no double-add)"),
  }).passthrough().describe("Add a mapping with WAL logging — returns IndexUpdateResult"),

  rev_idx_remove_mapping: z.object({
    index_name: z.enum(["ACTION_TO_ENGINE", "SKILL_TO_ACTION", "ENGINE_TO_DEPENDENTS", "KEYWORD_TO_ASSETS", "TYPE_TO_ASSETS"]).describe("Target index"),
    key: z.string().min(1).describe("Lookup key (normalized to lowercase)"),
    value: z.string().min(1).describe("Value to remove (entry deleted if no values left)"),
  }).passthrough().describe("Remove a mapping with WAL logging — returns IndexUpdateResult"),

  rev_idx_rebuild: z.object({
    index_name: z.enum(["ACTION_TO_ENGINE", "SKILL_TO_ACTION", "ENGINE_TO_DEPENDENTS", "KEYWORD_TO_ASSETS", "TYPE_TO_ASSETS"]).describe("Index to rebuild from source files"),
  }).passthrough().describe("Rebuild a single index by re-scanning source files — destructive, persists"),

  rev_idx_rebuild_all: z.object({}).passthrough().describe("Rebuild all 5 indexes — heavyweight, scans dispatchers + engines dirs"),

  rev_idx_stats: z.object({}).passthrough().describe("Per-index stats: {totalKeys, totalValues, avgValuesPerKey} for all 5 indexes"),

  rev_idx_recover_wal: z.object({}).passthrough().describe("Replay uncommitted WAL entries after crash — returns count recovered"),

  // ── OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-IMPACT-ANALYSIS ──────────────────
  // ImpactAnalysisEngine — Phase 0.8 rename/delete impact protocol. Read-only
  // surfaces ONLY (executeRename is destructive + NOT MCP-exposed).
  impact_analyze_rename: z.object({
    from_name: z.string().min(1).describe("Current asset name"),
    to_name: z.string().min(1).describe("Target new asset name"),
    asset_type: z.enum(["engine", "dispatcher", "action", "skill", "hook", "test", "schema"])
      .describe("Asset category"),
  }).passthrough().describe("Analyze rename impact — returns ImpactReport with direct/transitive dependents + breaking changes (always dry-run via MCP)"),

  impact_analyze_delete: z.object({
    name: z.string().min(1).describe("Asset name to analyze"),
    asset_type: z.enum(["engine", "dispatcher", "action", "skill", "hook", "test", "schema"])
      .describe("Asset category"),
    force: z.boolean().optional().describe("If true, treat dependent-blocking as warning instead of error"),
  }).passthrough().describe("Analyze delete impact — returns ImpactReport. Always dry-run via MCP."),

  impact_can_delete: z.object({
    name: z.string().min(1).describe("Asset name"),
    asset_type: z.enum(["engine", "dispatcher", "action", "skill", "hook", "test", "schema"])
      .describe("Asset category"),
  }).passthrough().describe("Boolean: is this asset safe to delete (no dependents AND not CRITICAL_ASSETS)"),

  impact_find_orphans: z.object({
    asset_type: z.enum(["engine", "dispatcher", "action", "skill", "hook", "test", "schema"])
      .describe("Asset category to scan"),
  }).passthrough().describe("Find all assets of the given type with zero direct dependents"),

  // ── WIRE-UNWIRED-MS0: BashCommandClassifierEngine (2026-05-16) ────────────
  // Was a truly-unwired backend dev-tool engine (no dispatcher, no test, no
  // consumer). classify() is pure: bash command → category + est. output
  // tokens + token-efficient alternative. Provide a single `command` OR a
  // `commands` batch; the dispatcher case rejects the empty-input case.
  bash_classify: z.object({
    command: z.string().min(1).optional().describe("A single bash command to classify"),
    commands: z.array(z.string().min(1)).optional().describe("A batch of bash commands to classify"),
  }).passthrough().describe("Classify bash command(s) → category, est. output tokens, token-efficient alternative"),

  // ── WIRE-UNWIRED-MS0/U-WIRE03: SVIRankedBacklogEngine ────────────────────
  // Rank backlog units by Ψ-delta / estimated hour. Pure engine — the caller
  // supplies each unit's projection (a SVIImpactProjectorEngine ProjectionResult;
  // only `psiDelta` is consumed here, so the rest is passthrough).
  svi_ranked_backlog: z.object({
    units: z.array(z.object({
      id: z.string().min(1),
      title: z.string(),
      estimatedHours: z.number().positive(),
      projection: z.object({ psiDelta: z.number() }).passthrough(),
      status: z.enum(["pending", "in_progress", "blocked", "completed"]).optional(),
      dependencies: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
    })).min(1).describe("Backlog units to rank (each needs estimatedHours > 0 and projection.psiDelta)"),
    options: z.object({
      respectDependencies: z.boolean().optional(),
      excludeCompleted: z.boolean().optional(),
      includeTags: z.array(z.string()).optional(),
      limit: z.number().int().positive().optional(),
    }).passthrough().optional().describe("Ranking options"),
  }).passthrough().describe("Rank backlog units by Ψ-delta per estimated hour"),

  // ── OBSIDIAN-INTELLIGENCE-MS3/F2: PDFHighlightExtractorEngine wiring ──────
  // /pdf-learn --highlights-only mode — extract ONLY user-authored /Highlight
  // annotations from a PDF (90%+ ingest-noise reduction vs full-body extract).
  pdf_highlights_extract: z.object({
    pdf_path: z.string().min(1).describe("Absolute or relative path to the .pdf file to extract /Highlight annotations from"),
  }).passthrough().describe("Extract only /Highlight subtype annotations from a PDF (F2 --highlights-only mode)"),

  // ── COST-CASCADE-MS0/U-MULTI-AGENT-COST-TELEMETRY ────────────────────────
  // Per-tentacle, per-task-class multi-LLM cost ledger. record() appends one
  // JSONL line; aggregate() streams active+rotated segments over a window.
  // inputTokens/outputTokens may be null (degraded — tentacle gave no usage);
  // costUSD MUST be 0 (not omitted) for local/free tentacles.
  cost_telemetry_record: z.object({
    tentacle: z.string().min(1).describe("LLM tentacle id (claude/ollama/codex/octopus/k2/...)"),
    taskClass: z.string().min(1).describe("Task class (deep_reasoning/summarize/classify/...)"),
    inputTokens: z.number().int().nonnegative().nullable().describe("Prompt tokens, or null when the tentacle reported no usage"),
    outputTokens: z.number().int().nonnegative().nullable().describe("Completion tokens, or null when unknown"),
    latencyMs: z.number().nonnegative().describe("Call latency in ms"),
    costUSD: z.number().nonnegative().describe("USD cost — 0 (explicit, not omitted) for local/free tentacles"),
    meta: z.record(z.string(), z.unknown()).optional().describe("Optional free-form context (model id, session, etc.)"),
  }).passthrough().describe("Append one per-call cost record to the multi-LLM cost ledger"),

  cost_telemetry_aggregate: z.object({
    windowHours: z.number().positive().describe("Trailing window in hours (must be > 0)"),
  }).passthrough().describe("Aggregate the cost ledger over the trailing window — per-tentacle + per-task-class sums (streams active+rotated segments)"),

  // WIRE-UNWIRED-MS0/U-WIRE-TXNLOG: TransactionLogEngine read-only state inspection
  transaction_active: z.object({}).passthrough()
    .describe("Return the currently-active Transaction (or null if none active). Read-only."),
  transaction_is_in_tx: z.object({}).passthrough()
    .describe("Return {in_transaction: boolean} — whether the engine is mid-transaction. Read-only."),
  transaction_get_mutations: z.object({
    tx_id: z.string().min(1).optional().describe("Transaction id to query (returned by beginTransaction)."),
    txId: z.string().min(1).optional().describe("camelCase alias for tx_id."),
  }).passthrough().refine(
    (d) => (typeof d.tx_id === "string" && d.tx_id.length > 0) || (typeof d.txId === "string" && d.txId.length > 0),
    { message: "transaction_get_mutations requires non-empty 'tx_id' (or 'txId')" },
  ).describe("List all mutation operations for the given transaction. Read-only."),
};
