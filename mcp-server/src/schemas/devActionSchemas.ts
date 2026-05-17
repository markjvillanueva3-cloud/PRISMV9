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

  // ── WIRE-UNWIRED-MS0/U-WIRE-BLOOM: AssetBloomFilters + BloomDedupEngine ────
  dedup_might_contain: z.object({
    asset_type: z.string().min(1).optional().describe("Asset type filter (engine, action, skill, hook, formula, algorithm, tribal_tip, playbook_rule, schema, dispatcher, route, test)."),
    assetType: z.string().min(1).optional().describe("camelCase alias for asset_type."),
    name: z.string().min(1).describe("Asset name to check."),
  }).passthrough().refine(
    (d) => (typeof d.asset_type === "string" && d.asset_type.length > 0) || (typeof d.assetType === "string" && d.assetType.length > 0),
    { message: "dedup_might_contain requires non-empty 'asset_type' (or 'assetType')" },
  ).describe("Bloom filter membership check — returns {might_contain: boolean}. Read-only."),

  dedup_is_definitely_new: z.object({
    asset_type: z.string().min(1).optional().describe("Asset type filter."),
    assetType: z.string().min(1).optional().describe("camelCase alias for asset_type."),
    name: z.string().min(1).describe("Asset name to check."),
  }).passthrough().refine(
    (d) => (typeof d.asset_type === "string" && d.asset_type.length > 0) || (typeof d.assetType === "string" && d.assetType.length > 0),
    { message: "dedup_is_definitely_new requires non-empty 'asset_type' (or 'assetType')" },
  ).describe("Returns {is_definitely_new: boolean} — true iff bloom filter has never seen the name. Read-only."),

  dedup_asset_stats: z.object({}).passthrough()
    .describe("Stats per asset-type filter (engine, action, skill, ...). Read-only."),

  dedup_bloom_check: z.object({
    name: z.string().min(1).describe("Name to check for duplication."),
  }).passthrough()
    .describe("Generic BloomDedupEngine.checkDedup — returns {check: DedupCheckResult}. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-ASSETDEP: AssetDependencyGraphEngine ───────────
  asset_dep_node: z.object({
    id: z.string().min(1).describe("Asset id (e.g., 'CuttingForceEngine', 'kienzle_formula')"),
  }).passthrough().describe("Single dependency node by id. Returns null if unknown. Read-only."),

  asset_dep_dependencies: z.object({
    id: z.string().min(1).describe("Asset id whose dependencies to fetch"),
    depth: z.number().int().positive().max(20).optional().describe("Traversal depth (default 1)"),
  }).passthrough().describe("Transitive dependency list (downstream). Read-only."),

  asset_dep_dependents: z.object({
    id: z.string().min(1).describe("Asset id whose dependents to fetch"),
    depth: z.number().int().positive().max(20).optional().describe("Traversal depth (default 1)"),
  }).passthrough().describe("Transitive dependent list (upstream — what would break). Read-only."),

  asset_dep_impact: z.object({
    asset_id: z.string().min(1).optional().describe("Asset id to analyze impact for"),
    assetId: z.string().min(1).optional().describe("camelCase alias for asset_id"),
  }).passthrough().refine(
    (d) => (typeof d.asset_id === "string" && d.asset_id.length > 0) || (typeof d.assetId === "string" && d.assetId.length > 0),
    { message: "asset_dep_impact requires non-empty 'asset_id' (or 'assetId')" },
  ).describe("Impact analysis — affected assets, depth, critical path. Read-only."),

  asset_dep_stats: z.object({}).passthrough()
    .describe("Graph-wide stats (nodes, edges, avg deps, max depth, orphans). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-ENGACC: EngineAccuracyTrackerEngine ────────────
  engine_acc_report: z.object({}).passthrough()
    .describe("Full system-wide accuracy report (all engines + top performers + degrading)."),

  engine_acc_engine: z.object({
    engine_id: z.string().min(1).optional().describe("Engine id to summarize."),
    engineId: z.string().min(1).optional().describe("camelCase alias for engine_id."),
  }).passthrough().refine(
    (d) => (typeof d.engine_id === "string" && d.engine_id.length > 0) || (typeof d.engineId === "string" && d.engineId.length > 0),
    { message: "engine_acc_engine requires non-empty 'engine_id' (or 'engineId')" },
  ).describe("Accuracy summary for a single engine (null if no outcomes recorded)."),

  engine_acc_metric: z.object({
    engine_id: z.string().min(1).optional().describe("Engine id."),
    engineId: z.string().min(1).optional().describe("camelCase alias."),
    metric_name: z.string().min(1).optional().describe("Metric name (e.g., 'cutting_force')."),
    metricName: z.string().min(1).optional().describe("camelCase alias for metric_name."),
  }).passthrough().refine(
    (d) =>
      ((typeof d.engine_id === "string" && d.engine_id.length > 0) || (typeof d.engineId === "string" && d.engineId.length > 0))
      && ((typeof d.metric_name === "string" && d.metric_name.length > 0) || (typeof d.metricName === "string" && d.metricName.length > 0)),
    { message: "engine_acc_metric requires both engine_id (or engineId) AND metric_name (or metricName)" },
  ).describe("Accuracy stats for a single (engine, metric) pair. Returns null if no data."),

  engine_acc_degrading: z.object({
    threshold: z.number().min(0).max(1).optional().describe("Accuracy floor (0-1, default 0.8). Engines below this are flagged."),
  }).passthrough()
    .describe("List engines/metrics whose recent accuracy fell below threshold."),

  engine_acc_list: z.object({
    engine_id: z.string().min(1).optional().describe("If set, list metrics for this engine; if absent, list engines."),
    engineId: z.string().min(1).optional().describe("camelCase alias for engine_id."),
  }).passthrough()
    .describe("Without engine_id: list all engine IDs. With engine_id: list metric names for that engine."),

  engine_acc_stats: z.object({}).passthrough()
    .describe("Top-level engine accuracy ledger stats (outcomes count, engine count, etc.)."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-WIKI-MAINT: WikiIndexMaintainerEngine ──────────
  wiki_idx_read: z.object({}).passthrough()
    .describe("Read all wiki index entries (parsed from index.md). Read-only."),

  wiki_idx_get: z.object({
    slug: z.string().min(1).describe("Wiki entry slug (e.g., 'master-index-surface')."),
  }).passthrough()
    .describe("Lookup a single wiki entry by slug. Returns null if missing. Read-only."),

  wiki_idx_by_category: z.object({
    category: z.string().min(1).describe("Wiki category (concepts, entities, decisions, patterns, etc.)."),
  }).passthrough()
    .describe("List wiki entries in a category. Read-only."),

  wiki_idx_paths: z.object({}).passthrough()
    .describe("Returns {indexPath, jsonlPath} — the on-disk wiki index file paths. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP: MachineCapabilityIndexEngine ─────────
  // (read-only — reset() DEFERRED; wipes in-memory index which could disrupt
  //  concurrent capability queries from other callers)
  machine_cap_query: z.object({
    type: z.string().min(1).optional().describe("Machine type filter (mill|lathe|wedm|grinder|sinker-edm)."),
    minAxes: z.number().int().nonnegative().optional().describe("Minimum axis count."),
    capability: z.string().min(1).optional().describe("Required single capability (e.g. 'probing', 'live-tooling')."),
    limit: z.number().int().positive().max(1000).optional().describe("Max results (default 50, cap 1000)."),
  }).passthrough()
    .describe("Query machines by type/minAxes/capability. All filters optional. Read-only."),

  machine_cap_get: z.object({
    id: z.string().min(1).describe("Machine id (e.g. 'mach_1')."),
  }).passthrough()
    .describe("Lookup a single machine by id. Returns null if missing. Read-only."),

  machine_cap_find: z.object({
    capabilities: z.array(z.string().min(1)).min(1).describe("List of required capabilities (AND-match — every cap must be present)."),
  }).passthrough()
    .describe("Find machines matching ALL listed capabilities. Read-only."),

  machine_cap_stats: z.object({}).passthrough()
    .describe("Aggregate stats: totalMachines + byType/byController/byAxes + averageCapabilities. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MIT-COURSES: MitCourseIndexEngine ──────────────
  // (all methods are pure filesystem reads — no mutating writes exist on this engine)
  mit_courses_sources: z.object({}).passthrough()
    .describe("List the 6 MIT OCW source zone configs (root + uploaded + mc2..mc5). Read-only."),

  mit_courses_audit: z.object({}).passthrough()
    .describe("Summary audit — totals, top departments, top relevance, year range, semester breakdown. Read-only."),

  mit_courses_harvest: z.object({}).passthrough()
    .describe("Full scan of all 6 zones — returns every course with metadata + aggregation maps. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-ISA: InverseStackupAllocatorEngine ────────────
  // (both methods pure functions — no state mutation, no defer needed)
  isa_allocate: z.object({
    assembly_tolerance_mm: z.number().positive().describe("Functional/assembly tolerance budget (mm)."),
    method: z.enum(["equal", "cost_weighted", "capability_weighted", "worst_case", "rss"])
      .describe("Allocation method."),
    components: z.array(z.object({
      id: z.string().min(1),
      nominal_mm: z.number().optional(),
      min_tolerance_mm: z.number().nonnegative().optional(),
      cost_exponent: z.number().positive().optional(),
      cpk: z.number().positive().optional(),
      fixed_tolerance_mm: z.number().nonnegative().optional(),
      sign: z.union([z.literal(1), z.literal(-1)]).optional(),
    })).min(1).max(100).describe("Component specs (1..100; DoS guard)."),
  }).passthrough()
    .describe("Allocate assembly tolerance across components by one of 5 methods. Pure function."),

  isa_stats: z.object({}).passthrough()
    .describe("Available allocation methods + cost models. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-CEX: CatalogExtractionEngine ──────────────────
  // (read-only query surface; extractFromPDF/mergeWithExisting/init DEFERRED
  //  — extractFromPDF reads PDFs from arbitrary user-supplied paths AND
  //  mutates the engine's extractedTools store, mergeWithExisting takes a
  //  full schema input + writes engine state)
  cex_stats: z.object({}).passthrough()
    .describe("Catalog extraction stats (totals by manufacturer/type, coverage). Read-only."),

  cex_export_typescript: z.object({
    manufacturer: z.string().min(1).describe("Manufacturer name (case-insensitive filter)."),
  }).passthrough()
    .describe("Generate TypeScript source code for extracted tools by manufacturer. Returns '' when no tools match. Pure transform of engine state."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MCFI: MITCourseFullIntegrationEngine ──────────
  // (read-only; reset() DEFERRED — wipes in-memory course catalog)
  mcfi_query: z.object({
    department: z.string().min(1).optional(),
    topic: z.string().min(1).optional(),
    integrated: z.boolean().optional(),
    limit: z.number().int().positive().max(1000).optional(),
  }).passthrough()
    .describe("Query courses by department/topic/integrated. All filters optional. Read-only."),

  mcfi_get_course: z.object({
    id: z.string().min(1).describe("Course id."),
  }).passthrough()
    .describe("Get a single course by id. Returns null on miss. Read-only."),

  mcfi_algorithms: z.object({}).passthrough()
    .describe("List all algorithms across integrated courses. Read-only."),

  mcfi_formulas: z.object({}).passthrough()
    .describe("List all formulas across integrated courses. Read-only."),

  mcfi_stats: z.object({}).passthrough()
    .describe("Integration stats (totals, by-department/integrated breakdowns). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-WRTL: WEDMReasoningTraceLedgerEngine ──────────
  // (read-only query surface; recordTraceSync/setLedgerPath/setDiskWrites/
  //  resetForTests DEFERRED — they append to / mutate the on-disk reasoning
  //  audit ledger)
  wrtl_recent: z.object({
    limit: z.number().int().positive().max(1000).optional()
      .describe("Max entries (default 100, cap 1000)."),
  }).passthrough()
    .describe("Get the most recent reasoning trace entries. Read-only."),

  wrtl_by_dispatcher: z.object({
    dispatcher: z.string().min(1).describe("Dispatcher name to filter by."),
    limit: z.number().int().positive().max(1000).optional(),
  }).passthrough()
    .describe("Filter trace entries by dispatcher. Read-only."),

  wrtl_by_action: z.object({
    action: z.string().min(1).describe("Action name to filter by."),
    limit: z.number().int().positive().max(1000).optional(),
  }).passthrough()
    .describe("Filter trace entries by action. Read-only."),

  wrtl_by_keyword: z.object({
    keyword: z.string().min(1).describe("Substring keyword to search."),
    limit: z.number().int().positive().max(1000).optional(),
  }).passthrough()
    .describe("Search trace entries by keyword. Read-only."),

  wrtl_stats: z.object({}).passthrough()
    .describe("Get ledger stats (totals, by-dispatcher/by-action breakdowns). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-WPT: WEDMProgressTrackerEngine ────────────────
  // (read-only query surface; startJob/beginStage/completeStage/failStage/
  //  completeJob/subscribe/subscribeAll/configure DEFERRED — they mutate
  //  in-flight job state. calculateETA(JobProgress) also DEFERRED — takes
  //  a full nested JobProgress object.)
  wpt_generate_job_id: z.object({}).passthrough()
    .describe("Generate a fresh job_id string (pure crypto-random). Read-only."),

  wpt_historical_average: z.object({}).passthrough()
    .describe("Get historical average job duration (ms) across completed jobs. Read-only."),

  wpt_estimate_total_duration: z.object({
    stages: z.number().int().positive().max(10000)
      .describe("Total number of stages (1..10000)."),
  }).passthrough()
    .describe("Estimate total job duration for the given stage count. Read-only."),

  wpt_get_progress: z.object({
    job_id: z.string().min(1).describe("Job id."),
  }).passthrough()
    .describe("Get current progress for a specific job. Returns null on miss. Read-only."),

  wpt_active_jobs: z.object({}).passthrough()
    .describe("List all currently-active (non-terminal) jobs. Read-only."),

  wpt_get_config: z.object({}).passthrough()
    .describe("Get current tracker config (ETA window, smoothing factor, etc). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-WPI: WedmProgramIndexEngine ───────────────────
  // (all methods pure filesystem reads — no write methods exist)
  wedm_programs_sources: z.object({}).passthrough()
    .describe("WEDM program source directory config. Read-only."),

  wedm_programs_audit: z.object({}).passthrough()
    .describe("WEDM program index audit (totals + top customers + breakdowns). Read-only."),

  wedm_programs_harvest: z.object({}).passthrough()
    .describe("Full filesystem scan of WEDM + electrode milling programs. Read-only."),

  wedm_programs_by_customer: z.object({
    customer: z.string().min(1).describe("Customer name (case-insensitive)."),
  }).passthrough()
    .describe("Programs filtered to a single customer (composes harvest + getCustomerPrograms). Read-only."),

  wedm_programs_top_customers: z.object({
    limit: z.number().int().positive().max(100).optional()
      .describe("Top-N customers by program count (default 10, cap 100)."),
  }).passthrough()
    .describe("Top customers sorted descending by program count. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-VCM: VendorCatalogManifestEngine ──────────────
  // (read-only filesystem scans; saveManifest DEFERRED — writes a JSON
  //  manifest to disk that downstream extractors consume)
  vcm_build: z.object({}).passthrough()
    .describe("Build full extraction manifest — every visible PDF classified + matched against current index. Read-only."),

  vcm_queue: z.object({}).passthrough()
    .describe("Get the extraction queue — catalogs that need extraction. Read-only."),

  vcm_summary: z.object({}).passthrough()
    .describe("Catalog manifest summary (totals, byManufacturer breakdown, gap). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MCA: ManufacturerCatalogAIEngine ──────────────
  // (read-only catalog queries; complex-input methods selectToolHolder /
  //  matchWorkholding / findCuttingTool / compareManufacturers /
  //  getJMDieRecommendations DEFERRED — deeply nested input specs)
  mca_all_holders: z.object({}).passthrough()
    .describe("All ToolHolderSpec entries across all catalogs. Read-only."),

  mca_all_workholding: z.object({}).passthrough()
    .describe("All WorkholdingSpec entries (chucks, vises, fixtures). Read-only."),

  mca_all_cutting_tools: z.object({}).passthrough()
    .describe("All CuttingToolSpec entries. Read-only."),

  mca_bigdaishowa_families: z.object({}).passthrough()
    .describe("Big Daishowa toolholder family catalog. Read-only."),

  mca_vendor_trust: z.object({}).passthrough()
    .describe("Vendor trust scores per CatalogManufacturer. Read-only."),

  mca_catalog_paths: z.object({}).passthrough()
    .describe("Filesystem paths per CatalogManufacturer. Read-only."),

  mca_feature_vector: z.object({
    item_id: z.string().min(1).describe("Catalog item id."),
  }).passthrough()
    .describe("Get the CatalogFeatureVector for an item. Returns null on miss. Read-only."),

  mca_search: z.object({
    keyword: z.string().min(1).describe("Search keyword (case-insensitive substring)."),
  }).passthrough()
    .describe("Search catalog across holders/workholding/cutting tools. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MDA: MachineDataAuditEngine ───────────────────
  // (read-only query surface; complex-input methods auditMachineFields /
  //  calculateCompleteness / validatePackage / generateCanonicalPackage
  //  DEFERRED — they take a full CanonicalMachinePackage which is a deeply
  //  nested type that needs a follow-up wire to surface safely)
  mda_report: z.object({}).passthrough()
    .describe("Full machine-data audit report (824+ machines × 4 layers). Read-only."),

  mda_summary: z.object({}).passthrough()
    .describe("Human-readable audit summary (text). Read-only."),

  mda_critical_gaps: z.object({}).passthrough()
    .describe("Field-completeness gaps below the critical threshold. Read-only."),

  mda_by_layer: z.object({
    layer: z.enum(["BASIC", "CORE", "ENHANCED", "LEVEL5"]).describe("Machine data layer to filter by."),
  }).passthrough()
    .describe("Machines in a specific layer. Read-only."),

  mda_by_manufacturer: z.object({
    manufacturer: z.string().min(1).describe("Manufacturer name (e.g. 'HAAS', 'OKUMA')."),
  }).passthrough()
    .describe("Machines by manufacturer (exact match). Read-only."),

  mda_by_type: z.object({
    type: z.string().min(1).describe("Machine type (e.g. 'mill', 'lathe', 'wedm')."),
  }).passthrough()
    .describe("Machines by type (exact match). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-TRAINING: TrainingContentIndexEngine ──────────
  // (all methods pure filesystem reads — no write methods exist)
  training_sources: z.object({}).passthrough()
    .describe("Returns the 6 training/resource source directory configs. Read-only."),

  training_audit: z.object({}).passthrough()
    .describe("Summary audit (topTopics, trainingDayBreakdown, topExtensions, source/cam/difficulty breakdowns). Read-only."),

  training_harvest: z.object({}).passthrough()
    .describe("Full scan — 3000+ training files with classification (contentType, topic, difficulty, CAM, controller). Read-only."),

  training_filter: z.object({
    topic: z.enum([
      "cnc_basics", "g_code", "cam_software", "tooling", "materials",
      "gdt", "5axis", "turning", "threading", "milling", "drilling",
      "edm", "grinding", "quality", "setup", "safety", "general",
    ]).optional().describe("Filter by TopicDomain (17 values)."),
    camSystem: z.string().min(1).optional()
      .describe("Filter by CAM system name (exact match — e.g. 'hypermill', 'mastercam')."),
  }).passthrough().refine(
    (d) => typeof d.topic === "string" || typeof d.camSystem === "string",
    { message: "training_filter requires at least one filter field (topic, camSystem)" },
  ).describe("Composes harvest + filterByTopic + filterByCam server-side. At least one filter required. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS: MachineModelIndexEngine ──────────
  // (all methods are pure filesystem reads — no write methods exist)
  machine_models_sources: z.object({}).passthrough()
    .describe("Returns {oemRoot, genericRoot, expectedOemSubdirs, expectedGenericModels}. Read-only."),

  machine_models_audit: z.object({}).passthrough()
    .describe("Summary audit (totalModels + oemCount + breakdowns + generic vs OEM split). Read-only."),

  machine_models_harvest: z.object({}).passthrough()
    .describe("Full scan — 306 OEM .step + 34 generic models with classification (machine type, axis config). Read-only."),

  machine_models_filter: z.object({
    oem: z.string().min(1).optional()
      .describe("Filter by OEM (case-insensitive, e.g. 'HAAS', 'Hurco', 'MAZAK')."),
    machineType: z.enum([
      "vmc", "hmc", "lathe", "mill_turn", "drill_mill", "router",
      "wire_edm", "sinker_edm", "grinder", "5axis", "high_speed", "unknown",
    ]).optional().describe("Filter by classified machine type."),
  }).passthrough().refine(
    (d) => typeof d.oem === "string" || typeof d.machineType === "string",
    { message: "machine_models_filter requires at least one filter field (oem, machineType)" },
  ).describe("Composes harvest + findByOem + findByType server-side. At least one filter required. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-DLT: DeepLogicTraceEngine ─────────────────────
  // (read-only; beginProof/finalizeProof/clear DEFERRED — they mutate the
  //  in-memory proof-tree store which is the load-bearing audit log for
  //  every automated decision. getTrace(id) also DEFERRED — ProofTree.nodes
  //  is a Map<string,ProofNode> that requires Object.fromEntries before JSON.)
  dlt_get_summary: z.object({
    id: z.string().min(1).describe("Proof tree id."),
  }).passthrough()
    .describe("Get high-level summary (id, conclusion, stepCount, depth, sources, isValid). Returns null on miss. Read-only."),

  dlt_explain: z.object({
    id: z.string().min(1).describe("Proof tree id."),
  }).passthrough()
    .describe("Render human-readable explanation (summary, steps[], premises[], conclusion, citations[], confidence). Read-only."),

  dlt_validate: z.object({
    id: z.string().min(1).describe("Proof tree id."),
  }).passthrough()
    .describe("Logical-consistency check (reachability, cycles, unresolved hypotheses). Read-only."),

  dlt_query: z.object({
    engineId: z.string().min(1).optional().describe("Filter by engine id."),
    since: z.number().nonnegative().optional().describe("Filter to trees created at/after this epoch-ms."),
    minDepth: z.number().int().nonnegative().optional().describe("Filter to trees with depth >= this."),
    limit: z.number().int().positive().max(1000).optional().describe("Max summaries (default 100, cap 1000)."),
  }).passthrough()
    .describe("Query proof summaries by engine/time/depth. Read-only."),

  dlt_stats: z.object({}).passthrough()
    .describe("Aggregate proof stats (totalProofs, avgDepth, avgSteps, formulaCitations, validProofs). Read-only."),

  dlt_predicates: z.object({}).passthrough()
    .describe("Built-in predicate catalog (12 predicates: cutting_force_valid, tool_life_sufficient, etc.). Read-only."),

  dlt_formulas: z.object({}).passthrough()
    .describe("Built-in formula registry (8 canonical: Kienzle, Taylor, cantilever, stability lobe, etc.). Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-XREG: CrossRegistryJoinEngine ─────────────────
  // (read-only — reset() DEFERRED; wipes the in-memory schema map which
  //  other concurrent dev queries depend on)
  cross_reg_list: z.object({}).passthrough()
    .describe("List all registry names known to the join engine. Read-only."),

  cross_reg_schema: z.object({
    registry: z.string().min(1).describe("Registry name (e.g. 'materials', 'tools', 'machines', 'strategies')."),
  }).passthrough()
    .describe("Get the schema for a registry — fields, primary key, foreign keys. Returns null if missing. Read-only."),

  cross_reg_joinable: z.object({
    registry: z.string().min(1).describe("Registry name to find joinable peers for."),
  }).passthrough()
    .describe("List registries that can be joined to the given registry (both inbound + outbound FK relations). Read-only."),

  cross_reg_paths: z.object({
    from: z.string().min(1).describe("Source registry name."),
    to: z.string().min(1).describe("Target registry name."),
  }).passthrough()
    .describe("Find join paths between two registries. Returns array of path arrays. Read-only."),

  cross_reg_join: z.object({
    primaryRegistry: z.string().min(1).describe("Driving registry for the join."),
    joinRegistries: z.array(z.string().min(1)).min(1).describe("List of registries to join to the primary."),
    joinKeys: z.array(z.object({
      primary: z.string().min(1),
      foreign: z.string().min(1),
    })).optional().describe("Optional explicit join-key pairs. Defaults to inferred FK relations."),
    filters: z.record(z.string(), z.unknown()).optional()
      .describe("Optional flat filter map (registry-prefixed keys → match values)."),
    select: z.array(z.string().min(1)).optional()
      .describe("Optional projection — list of qualified field names to include."),
    limit: z.number().int().positive().max(1000).optional()
      .describe("Max records returned (default 100, cap 1000)."),
  }).passthrough()
    .describe("Execute a cross-registry join. Returns records + registriesJoined + recordCount + queryTime. Read-only."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-OTEL: OpenTelemetryTracingEngine ──────────────
  // (read-only + pure-function methods only; configure/startSpan/addEvent/
  //  setAttributes/setStatus/endSpan/recordException/addManufacturingAttributes/
  //  flush/clear/trace are DEFERRED — they mutate active span state which is
  //  the load-bearing distributed-tracing graph; an LLM-driven write could
  //  desynchronise an in-flight trace)
  otel_get_config: z.object({}).passthrough()
    .describe("Returns the tracer config (serviceName, sampling rate, max queue, etc.). Read-only."),

  otel_get_stats: z.object({}).passthrough()
    .describe("Returns aggregate TracerStats (totalSpans, activeSpans, completedSpans, droppedSpans, etc.). Read-only."),

  otel_active_span_count: z.object({}).passthrough()
    .describe("Returns count of currently-active (non-ended) spans. Read-only."),

  otel_completed_spans: z.object({
    limit: z.number().int().positive().max(10000).optional()
      .describe("Cap on returned spans (default 100, max 10000)."),
  }).passthrough()
    .describe("Returns completed spans (capped). Read-only."),

  otel_extract_traceparent: z.object({
    traceparent: z.string().min(1).describe("W3C traceparent header value."),
    tracestate: z.string().optional().describe("Optional W3C tracestate header value."),
  }).passthrough()
    .describe("Parse a W3C traceparent (+ optional tracestate) into a SpanContext. Returns null on malformed. Pure function."),

  otel_inject_traceparent: z.object({
    traceId: z.string().min(1).describe("32-hex-char trace id."),
    spanId: z.string().min(1).describe("16-hex-char span id."),
    traceFlags: z.number().int().min(0).max(255).optional().describe("Trace flags byte (default 0x01 = sampled)."),
    traceState: z.string().optional().describe("Optional W3C tracestate to propagate."),
  }).passthrough()
    .describe("Encode a SpanContext into W3C traceparent (+ optional tracestate) headers. Pure function."),

  otel_should_sample: z.object({
    parentContext: z.object({
      traceId: z.string().min(1),
      spanId: z.string().min(1),
      traceFlags: z.number().int().min(0).max(255).optional(),
      traceState: z.string().optional(),
    }).passthrough().optional().describe("Optional parent SpanContext (if continuing an upstream trace)."),
    forceSample: z.boolean().optional().describe("Override sampling decision (true → always sample, false → respect rate)."),
  }).passthrough()
    .describe("Get sampling decision for a new span (rate-based or forced). Pure function."),

  // ── WIRE-UNWIRED-MS0/U-WIRE-CONSENSUS-CACHE: ConsensusRecallCacheEngine ────
  // (read-only — no write methods on this engine; recall() is pure I/O over
  //  the wiki second-brain consensus/<sha8>.md artifacts written by the
  //  ConsensusObsidianPersistenceEngine which already owns the write path)
  consensus_cache_recall: z.object({
    prompt: z.string().min(1).describe("Prompt to look up in the consensus cache."),
    ttlMs: z.number().int().positive().max(90 * 24 * 60 * 60 * 1000).optional()
      .describe("Max cache age (ms). Default 7 days. Hard cap 90 days."),
    enforceTtl: z.boolean().optional()
      .describe("Whether to enforce ttlMs (default true)."),
    wikiRoot: z.string().min(1).optional()
      .describe("Override wiki root path (testing). Default env PRISM_WIKI_ROOT or H:/prism/knowledge/wiki."),
  }).passthrough()
    .describe("Look up a cached consensus result by prompt. Returns null on miss. Read-only."),

  consensus_cache_score: z.object({
    prompt: z.string().min(1).describe("Prompt to score the cached entry for."),
    ttlMs: z.number().int().positive().max(90 * 24 * 60 * 60 * 1000).optional(),
    enforceTtl: z.boolean().optional(),
    wikiRoot: z.string().min(1).optional(),
  }).passthrough()
    .describe("Composes recall + scoreCached server-side. Returns {hit, score, cached?} — null hit yields score=0. Read-only."),

  mit_courses_filter: z.object({
    department: z.string().min(1).optional().describe("Filter by department prefix (e.g. '2', '18', 'esd')."),
    relevance: z.enum([
      "manufacturing", "materials", "algorithms", "controls",
      "design", "fluid_thermal", "general_engineering", "other",
    ]).optional().describe("Filter by relevance classification."),
    semester: z.string().min(1).optional().describe("Filter by semester (spring|fall|summer|january-iap|iap)."),
    minYear: z.number().int().min(1900).max(2100).optional().describe("Minimum year (inclusive)."),
    maxYear: z.number().int().min(1900).max(2100).optional().describe("Maximum year (inclusive)."),
  }).passthrough().refine(
    (d) =>
      typeof d.department === "string" ||
      typeof d.relevance === "string" ||
      typeof d.semester === "string" ||
      typeof d.minYear === "number" ||
      typeof d.maxYear === "number",
    { message: "mit_courses_filter requires at least one filter field (department, relevance, semester, minYear, maxYear)" },
  ).describe("Composes harvest + filter helpers. At least one filter field required. Read-only."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-RSG: RoutingSheetGeneratorEngine wiring ──
  // 4 actions: rsg_generate (build + store), rsg_get (lookup),
  // rsg_render_markdown / rsg_render_csv (pure render from stored sheet).
  // The store is in-memory non-persistent — wiring `generate` is safe (not load-bearing
  // state like RL training data). Cycle math: run = cycle×pieces; op_total = setup+run;
  // total = Σsetup + Σrun + queue×(opCount−1); lead_days = ceil(total_hr / 8).
  // DoS guards: ≤200 operations per sheet, op_num ≤ 1e9, monotonicity validated by engine.
  rsg_generate: z.object({
    job_id: z.string().min(1).describe("Job identifier (ERP work-order id)"),
    part_number: z.string().min(1).describe("Part number"),
    revision: z.string().min(1).describe("Part revision"),
    customer: z.string().optional().describe("Customer name for ERP linkage"),
    due_date: z.string().optional().describe("ISO date for due-date"),
    quantity: z.number().int().positive().max(1_000_000).optional().describe("Job piece count (default 1)"),
    queue_min_between_ops: z.number().nonnegative().max(10_000).optional().describe("Per-op queue buffer in min (default 15)"),
    operations: z.array(z.object({
      op_num: z.number().int().nonnegative().max(1_000_000_000).describe("Sequential op number (10/20/30…)"),
      op_name: z.string().min(1).describe("Human-readable op name"),
      machine_id: z.string().min(1).describe("Machine identifier"),
      machine_type: z.enum(["mill","lathe","wedm","sinker","grinder","saw","inspection","deburr","other"]).optional(),
      setup_min: z.number().describe("Estimated setup time in minutes (engine flags negatives/NaN in warnings)"),
      cycle_min: z.number().describe("Estimated cycle time per piece in minutes"),
      pieces: z.number().int().nonnegative().max(1_000_000).optional().describe("Pieces for this op (defaults to job quantity)"),
      notes: z.string().optional(),
      tools: z.array(z.string()).max(200).optional(),
      fixture_id: z.string().optional(),
      wcs: z.string().optional(),
      skill_level: z.enum(["apprentice","journeyman","master"]).optional(),
    }).passthrough()).min(1).max(200).describe("Operations in sequence (≤200 for DoS bound)"),
  }).passthrough().describe("Generate + store a routing sheet from a job + operation plan. Returns RoutingSheet."),

  rsg_get: z.object({
    routing_id: z.string().min(1).regex(/^RT-\d+$/, "routing_id must match the engine format RT-NNNNN")
      .describe("Routing id returned by a prior rsg_generate call"),
  }).describe("Look up a previously generated routing sheet by id. Read-only."),

  rsg_render_markdown: z.object({
    routing_id: z.string().min(1).regex(/^RT-\d+$/, "routing_id must match the engine format RT-NNNNN")
      .describe("Routing id previously generated by rsg_generate"),
  }).describe("Render a stored routing sheet as a Markdown shop-floor report. Pure (no state mutation)."),

  rsg_render_csv: z.object({
    routing_id: z.string().min(1).regex(/^RT-\d+$/, "routing_id must match the engine format RT-NNNNN")
      .describe("Routing id previously generated by rsg_generate"),
  }).describe("Render a stored routing sheet as CSV for ERP/MES import. Pure (no state mutation)."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-MCDL: MITCourseDeepLearningEngine wiring ──
  // 8 read-only actions across the 227-course MIT OCW knowledge surface.
  // All methods are pure static-data queries — no I/O, no mutation, safe
  // to wire fully. DoS guards: all free-text inputs are length-bounded to
  // 4 KB to prevent regex-pathology + memory exhaustion through extractAlgorithm
  // word-splitting loops.
  mcdl_find_relevant_courses: z.object({
    manufacturing_problem: z.string().min(1).max(4096)
      .describe("Natural-language manufacturing problem (e.g. 'chatter prediction in deep pocket milling')"),
  }).describe("Map a manufacturing problem to top-scoring MIT courses. Pure."),

  mcdl_extract_algorithm: z.object({
    course_id: z.string().min(1).max(64)
      .describe("MIT course id (e.g. '2.008', '6.S191', '18.06')"),
    problem_type: z.string().min(1).max(4096)
      .describe("Keyword-ish problem descriptor for relevance filter, or 'all' to dump every algorithm in the course"),
  }).describe("Pull algorithms tagged to a single course, optionally filtered by problem keywords. Pure."),

  mcdl_recommend_learning_path: z.object({
    skill_gaps: z.array(z.string().min(1).max(256)).min(1).max(50)
      .describe("List of skill-gap phrases — engine maps each to top-3 courses, dedupes, then prioritizes by category"),
  }).describe("Generate a personalized learning path across courses to close named skill gaps. Pure."),

  mcdl_apply_academic_knowledge: z.object({
    problem: z.string().min(1).max(4096)
      .describe("Manufacturing problem to apply MIT knowledge to"),
    constraints: z.array(z.string().max(256)).max(50).optional().default([])
      .describe("Optional constraints list (process/material/time limits) — empty array allowed"),
  }).describe("Apply academic knowledge: matches courses + algorithms + theory→practice + citations + confidence. Pure."),

  mcdl_cite_sources: z.object({
    solution: z.string().min(1).max(4096)
      .describe("Solution text — engine scans course topics/titles for matches and emits MIT OCW citations"),
  }).describe("Generate MIT OCW citations for a written solution. Pure."),

  mcdl_get_complexity_analysis: z.object({
    algorithm_name: z.string().min(1).max(256)
      .describe("Algorithm name (e.g. 'kalman filter', 'k-means'); exact match preferred, prefix-fallback supported"),
  }).describe("Look up Big-O time/space + notes for an algorithm. Pure. Returns null when not in catalog."),

  mcdl_link_to_physics_constants: z.object({
    course_id: z.string().min(1).max(64)
      .describe("MIT course id whose covered algorithms get cross-referenced to src/physics/constants.ts symbols"),
  }).describe("Return PRISM physics constants linked to a course's algorithms. Pure."),

  mcdl_generate_theory_to_practice: z.object({
    course_id: z.string().min(1).max(64)
      .describe("MIT course id whose theory will be mapped to a shop-floor scenario"),
    shop_problem: z.string().min(1).max(4096)
      .describe("Shop-floor problem statement"),
  }).describe("Generate a theory→practice bridge from a course to a shop problem. Pure."),

  mcdl_get_category_stats: z.object({}).describe("Return per-category course counts + topic-coverage stats. Pure."),

  mcdl_get_all_course_ids: z.object({}).describe("Return every indexed MIT course id (227 entries). Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-DPE: DocPropagationEngine wiring ──
  // Pure deterministic classifier — file path → doc surfaces that need regen.
  // 3 actions wired: classify (single), classify_batch (≤500 paths for DoS),
  // get_rules (rule-metadata only, omits `match` function literal which is
  // non-serializable over the wire). mergeTargets() DEFERRED — composition
  // helper whose input shape (ClassificationResult[]) is too complex to
  // safely round-trip without bespoke schema mirroring; callers can request
  // classify_batch and dedupe client-side.
  doc_propagation_classify: z.object({
    file_path: z.string().min(1).max(4096)
      .describe("Path of the file that was just written/edited (relative or absolute)"),
  }).describe("Classify a single file path into doc-surface regen targets. Pure."),

  doc_propagation_classify_batch: z.object({
    file_paths: z.array(z.string().min(1).max(4096)).min(1).max(500)
      .describe("File paths to classify in one shot (≤500 for DoS bound)"),
  }).describe("Classify many file paths in one call. Pure."),

  doc_propagation_get_rules: z.object({}).describe(
    "Return the serializable metadata of all classification rules (id, targets, reason). " +
    "The `match` predicate is omitted because function literals do not survive JSON. Pure."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-ASC: ActionSchemaCacheEngine wiring ──
  // Engine scans dispatcher source files to extract action → param-name
  // patterns (param.X / params["X"]). Read-only over a 2-minute TTL'd
  // in-memory cache that auto-refreshes on read. 5 read actions wired.
  // invalidate() DEFERRED — only meaningful right after a dispatcher
  // source-file change, which is a build-time concern, not an LLM call;
  // wiring it would let stale-cache races be triggered remotely.
  asc_get_schema: z.object({
    action_name: z.string().min(1).max(256)
      .describe("Action name as it appears in a dispatcher z.enum (e.g. 'rsg_generate')"),
  }).describe("Get the cached parameter schema for a single action. Returns null when unknown."),

  asc_search_schemas: z.object({
    query: z.string().min(1).max(256)
      .describe("Substring match against action name OR dispatcher name (case-insensitive)"),
    max: z.number().int().positive().max(500).optional()
      .describe("Result cap (default 10, max 500 for DoS bound)"),
  }).describe("Find action schemas matching a substring query. Pure."),

  asc_get_param_hint: z.object({
    action_name: z.string().min(1).max(256)
      .describe("Action name to format as a compact signature"),
  }).describe("Get a compact `action(params)` signature for inline help. Pure."),

  asc_get_dispatcher_actions: z.object({
    dispatcher_name: z.string().min(1).max(256)
      .describe("Dispatcher name with or without 'Dispatcher.ts' suffix (e.g. 'dev' or 'devDispatcher')"),
  }).describe("List every cached action for a single dispatcher. Pure."),

  asc_get_stats: z.object({}).describe(
    "Cache stats: {actions, dispatchers, withParams}. Pure."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-APC: AutomaticPipelineComposerEngine wiring ──
  // 3 actions wired: compose (template lookup + adapt + validate),
  // list_templates (id dump), get_template (id → stages | null).
  // initialize() DEFERRED — pure side-effect setter that compose() calls
  // implicitly; exposing it has no value over the wire.
  // reset() DEFERRED — mutates the shared in-memory templates map;
  // letting an LLM call wipe the template store would break every
  // subsequent compose() call across all sessions.
  apc_compose: z.object({
    objective: z.string().min(1).max(4096)
      .describe("Natural-language objective (e.g. 'optimize speed/feed for titanium roughing')"),
    inputs: z.array(z.string().min(1).max(256)).max(50).optional().default([])
      .describe("Available input asset ids/names — may be empty"),
    required_outputs: z.array(z.string().min(1).max(256)).max(50).optional().default([])
      .describe("Required output asset ids/names — engine emits warnings for missing"),
    constraints: z.object({
      max_stages: z.number().int().positive().max(100).optional()
        .describe("Cap pipeline length (DoS bound at 100 stages)"),
      max_duration: z.number().nonnegative().max(1_000_000).optional()
        .describe("Max total estimated_ms across all stages"),
      preferred_assets: z.array(z.string().min(1).max(256)).max(50).optional()
        .describe("Asset ids to prefer when multiple candidates fit"),
    }).passthrough().optional()
      .describe("Optional constraints {maxStages,maxDuration,preferredAssets}"),
  }).passthrough().describe("Compose a pipeline from templates matching the objective. Pure (template lookup + adapt + validate)."),

  apc_list_templates: z.object({}).describe("List every loaded template id. Pure."),

  apc_get_template: z.object({
    name: z.string().min(1).max(256)
      .describe("Template id (e.g. 'speed_feed', 'tool_selection', 'quality_prediction')"),
  }).describe("Get all PipelineStage entries for a single template. Returns null when unknown. Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-SCH: SchemaCompactEngine wiring ──
  // 30-70% token-saving JSON-schema compactor + TS-like type-signature
  // generator. All 5 methods pure (no I/O, no mutation). No defers.
  // DoS guards: schema bodies capped at 128 KB (JSON-stringified) — large
  // schemas can quadruple in recursion depth, so we cap at the boundary.
  sch_compact: z.object({
    schema: z.record(z.string(), z.unknown())
      .describe("JSON-schema-like object to compact (drops description/title/examples/etc.)"),
  }).describe("Compact a schema object — returns the compacted object. Pure."),

  sch_compact_with_stats: z.object({
    schema: z.record(z.string(), z.unknown())
      .describe("JSON-schema-like object to compact + measure"),
  }).describe("Compact a schema + emit token-saving stats (original/compact + saved + savingsPercent). Pure."),

  sch_to_type_signature: z.object({
    schema: z.record(z.string(), z.unknown())
      .describe("JSON-schema-like object to convert to a TypeScript-style type signature"),
  }).describe("Render a compact TS-like type signature from a schema. Pure."),

  sch_compact_all: z.object({
    schemas: z.array(z.object({
      name: z.string().min(1).max(256).describe("Identifier label for this schema"),
      schema: z.record(z.string(), z.unknown()).describe("The schema body itself"),
    }).passthrough()).min(1).max(500)
      .describe("Array of {name, schema} pairs (≤500 for DoS bound)"),
  }).describe("Compact many schemas in one call — returns [{name, compact: stringified}]. Pure."),

  sch_one_liner: z.object({
    schema: z.record(z.string(), z.unknown())
      .describe("JSON-schema-like object to summarize"),
  }).describe("One-line token-savings summary (e.g. '350→180 tokens (49% saved)'). Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-CSE: CompactionStrategyEngine wiring ──
  // Context-window compaction planner — decides keep/compress/drop per block.
  // All 4 methods pure (no I/O). No defers.
  cse_plan: z.object({
    blocks: z.array(z.object({
      id: z.string().min(1).max(256).describe("Block identifier"),
      category: z.enum(["active-edit","recent-read","stale-read","tool-output","error-context","conversation","system-prompt","unknown"])
        .describe("Content category drives the priority + compression ratio"),
      tokens: z.number().int().nonnegative().max(10_000_000).describe("Token count of this block"),
      age: z.number().nonnegative().max(86_400_000).describe("Age (engine-defined unit; typically seconds)"),
      importance: z.number().min(0).max(1).describe("Caller-supplied importance boost [0,1]"),
      content: z.string().max(1_000_000).optional().describe("Optional block content (engine does not inspect for plan)"),
    }).passthrough()).min(1).max(10_000)
      .describe("Content blocks competing for budget (≤10k for DoS bound)"),
    budget_tokens: z.number().int().positive().max(10_000_000)
      .describe("Token budget the plan must fit"),
  }).describe("Decide keep/compress/drop per block to fit a token budget. Pure."),

  cse_categorize: z.object({
    content: z.string().max(1_000_000)
      .describe("Block content to classify"),
    tool: z.string().min(1).max(64).optional()
      .describe("Tool that produced the content (Edit/Write/Read/Bash/Grep/Glob)"),
    age_seconds: z.number().nonnegative().max(86_400_000).optional()
      .describe("Age of the content in seconds (>300 demotes Read to stale-read)"),
  }).describe("Classify content into one of 8 ContentCategory bins. Pure."),

  cse_estimate_savings: z.object({
    blocks: z.array(z.object({
      id: z.string().min(1).max(256),
      category: z.enum(["active-edit","recent-read","stale-read","tool-output","error-context","conversation","system-prompt","unknown"]),
      tokens: z.number().int().nonnegative().max(10_000_000),
      age: z.number().nonnegative().max(86_400_000),
      importance: z.number().min(0).max(1),
      content: z.string().max(1_000_000).optional(),
    }).passthrough()).min(1).max(10_000),
    budget_tokens: z.number().int().positive().max(10_000_000),
  }).describe("Estimate {canSave, percent} for a set of blocks at a budget. Pure."),

  cse_recommend: z.object({
    blocks: z.array(z.object({
      id: z.string().min(1).max(256),
      category: z.enum(["active-edit","recent-read","stale-read","tool-output","error-context","conversation","system-prompt","unknown"]),
      tokens: z.number().int().nonnegative().max(10_000_000),
      age: z.number().nonnegative().max(86_400_000),
      importance: z.number().min(0).max(1),
      content: z.string().max(1_000_000).optional(),
    }).passthrough()).min(1).max(10_000),
    budget_tokens: z.number().int().positive().max(10_000_000),
  }).describe("One-line 'Compaction: keep N, compress M, ...' recommendation. Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-DME: DiffMinimizerEngine wiring ──
  // Token-saving edit-diff minimizer. All 3 methods pure (no I/O).
  // DoS guards: 1 MB content cap, 1000 edits per analysis batch.
  dme_minimize: z.object({
    file_content: z.string().max(1_048_576)
      .describe("Source file content to search (≤1 MB)"),
    target_line: z.string().min(1).max(4096)
      .describe("Existing line to replace (trim-matched against file)"),
    new_line: z.string().max(4096)
      .describe("Replacement line — may be empty to delete"),
    context_window: z.number().int().nonnegative().max(50).optional()
      .describe("Context-line window when target_line is ambiguous (≤50)"),
  }).describe("Find the smallest unique context that pins an edit. Pure."),

  dme_analyze_edits: z.object({
    edits: z.array(z.object({
      oldString: z.string().max(4096).describe("The diff's old_string"),
      newString: z.string().max(4096).describe("The diff's new_string"),
    }).passthrough()).min(1).max(1000)
      .describe("Batch of {oldString, newString} edits (≤1000 for DoS bound)"),
  }).describe("Summarize a batch of edits: totalEdits + avgs + estimatedTokens + canOptimize count. Pure."),

  dme_can_combine: z.object({
    edits: z.array(z.object({
      file: z.string().min(1).max(4096).describe("Path of the file being edited"),
      lineNumber: z.number().int().nonnegative().max(10_000_000).describe("1-based line number of the edit"),
    }).passthrough()).min(1).max(1000)
      .describe("Edit locations to consider for clustering (≤1000)"),
  }).describe("Find clusters of adjacent edits that could be combined. Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-PME: PipelineMetricsEngine wiring ──
  // CPP-MS5-U-CPP37 observability metrics over context-pipeline artifacts.
  // 3 explicitly-pure methods (engine docstring guarantees no I/O — caller
  // collects filesystem state and passes it in). No defers. DoS guards:
  // ≤10k per array; bytes/mtimes capped at sane upper bounds.
  pme_collect: z.object({
    survivalFiles: z.array(z.object({
      path: z.string().min(1).max(4096).describe("Survival file path"),
      bytes: z.number().int().nonnegative().max(1_000_000_000).describe("File size in bytes (cap 1 GB)"),
      mtimeMs: z.number().nonnegative().max(8.64e15).describe("Last-modified epoch ms"),
    }).passthrough()).max(10_000).default([])
      .describe("All .compaction-survival-*.md SurvivalFileStat entries"),
    handoffFiles: z.array(z.object({
      path: z.string().min(1).max(4096),
      mtimeMs: z.number().nonnegative().max(8.64e15),
    }).passthrough()).max(10_000).default([])
      .describe("All HANDOFF-*.md HandoffFileStat entries"),
    integrityLinks: z.array(z.object({
      stage: z.string().min(1).max(256).describe("Pipeline stage id"),
      empty: z.boolean().describe("Whether this link's artifact is empty"),
    }).passthrough()).max(10_000).default([])
      .describe("Parsed PIPELINE_INTEGRITY.json links[] entries"),
    capturedAt: z.string().min(1).max(64).optional()
      .describe("ISO timestamp for the output snapshot (defaults to now)"),
  }).describe("Compute the full pipeline-metrics snapshot from raw inputs. Pure."),

  pme_compute_survival_bytes: z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(4096),
      bytes: z.number().int().nonnegative().max(1_000_000_000),
      mtimeMs: z.number().nonnegative().max(8.64e15),
    }).passthrough()).max(10_000).default([])
      .describe("Survival files to aggregate (empty input → all-zero stats)"),
  }).describe("Aggregate {count,total,max,min,avg} byte stats. Pure."),

  pme_compute_handoff_roundtrip: z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(4096),
      mtimeMs: z.number().nonnegative().max(8.64e15),
    }).passthrough()).max(10_000).default([])
      .describe("Handoff files — roundtrip is freshest − oldest mtime in ms"),
  }).describe("Compute freshest−oldest handoff mtime in ms (0 when ≤1 file). Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-LRE: LedgerRetentionEngine wiring ──
  // PP-0.16-U-OP6 retention-tiering for the 5 append-only ledgers.
  // All methods pure (no I/O — caller passes entries, engine classifies).
  // 6 actions wired. getTier(Date) NOT wired — Date isn't JSON-serializable
  // over MCP; same semantics available via lre_classify(ageDays) +
  // lre_tier_of({at}). DoS guards: ≤50k entries per plan call.
  lre_get_config: z.object({}).describe("Return active {hotAgeDays, warmAgeDays} config. Pure."),

  lre_get_retention_policy: z.object({}).describe(
    "Return policy {hot:{maxDays}, warm:{maxDays}, cold:{archivePath}}. Pure."
  ),

  lre_classify: z.object({
    age_days: z.number().nonnegative().max(36500)
      .describe("Age in days — capped at ~100 years"),
  }).describe("Classify an age in days into hot/warm/cold tier. Pure."),

  lre_tier_of: z.object({
    entry: z.object({
      at: z.string().min(1).max(64).optional().describe("Primary ISO timestamp field"),
      timestamp: z.string().min(1).max(64).optional().describe("Secondary timestamp field some ledgers use"),
    }).refine(e => typeof e.at === "string" || typeof e.timestamp === "string", {
      message: "entry must have either 'at' or 'timestamp' ISO string",
    }).describe("Ledger entry — must carry at or timestamp"),
    now_ms: z.number().nonnegative().max(8.64e15).optional()
      .describe("Override 'now' for deterministic tests (epoch ms)"),
  }).describe("Tier a single ledger entry — returns {tier, ageDays, entry}. Pure."),

  lre_plan: z.object({
    entries: z.array(z.object({
      at: z.string().min(1).max(64).optional(),
      timestamp: z.string().min(1).max(64).optional(),
    }).refine(e => typeof e.at === "string" || typeof e.timestamp === "string", {
      message: "entry must have either 'at' or 'timestamp' ISO string",
    })).max(50_000).default([])
      .describe("Ledger entries (≤50k for DoS bound; empty OK)"),
    now_ms: z.number().nonnegative().max(8.64e15).optional()
      .describe("Override 'now' for deterministic tests (epoch ms)"),
  }).describe("Build a RotationPlan {now, hot, warm, cold, actions[]}. Pure."),

  lre_archive_dir_for: z.object({
    iso: z.string().min(1).max(64)
      .describe("ISO timestamp — engine yields the bare 'YYYY-MM' subdir name"),
  }).describe("Compute the archive subdir name (bare 'YYYY-MM'; caller prefixes 'archive/' as needed). Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-PR: PageRankEngine wiring ──
  // USSH Phase 0.25 graph-importance scoring. Engine is stateful (loadGraph
  // mutates internal adjacency + scores) — each wire action bundles
  // `loadGraph + op` atomically so peer calls don't race on shared state.
  // setConfig() + reset() NOT WIRED (cross-call config drift is hostile to
  // a shared singleton); config is per-call via optional `config` param.
  // DoS guards: ≤10k nodes, ≤100k edges, ≤1000 max_iterations.
  pr_compute_scores: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }).describe("DependencyGraph {nodes[], edges[]} — node id charset bounded by Map key sanity"),
    personalization: z.array(z.object({
      nodeId: z.string().min(1).max(256),
      weight: z.number().nonnegative().max(1).describe("[0,1] weight for personalized PageRank"),
    }).passthrough()).max(10_000).optional()
      .describe("Optional personalization vector for biased PageRank"),
    config: z.object({
      damping_factor: z.number().min(0).max(1).optional().describe("Typically 0.85"),
      max_iterations: z.number().int().positive().max(1000).optional(),
      convergence_threshold: z.number().positive().max(1).optional(),
      top_k: z.number().int().positive().max(1000).optional(),
      normalize_weights: z.boolean().optional(),
    }).passthrough().optional()
      .describe("Per-call config overrides (engine never persists)"),
  }).describe("Load + compute PageRank scores in one atomic call. Returns {scores, iterations, converged, residual, topNodes}."),

  pr_analyze_graph: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }),
  }).describe("Load + analyze graph: {node_count, edge_count, density, avg_degree, strongly_connected, orphan/sink/source_nodes}. Pure."),

  pr_find_critical_nodes: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }),
    threshold: z.number().min(0).max(1).optional()
      .describe("PageRank score percentile threshold (default 0.8)"),
  }).describe("Load + identify high-PR critical-path nodes. Pure."),

  pr_compute_hits: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }),
    max_iterations: z.number().int().positive().max(1000).optional()
      .describe("HITS iteration cap (default 50)"),
  }).describe("Load + compute HITS hubs/authorities. Pure."),

  pr_topological_sort: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }),
  }).describe("Load + topological sort. Returns null when graph contains cycles. Pure."),

  pr_detect_cycles: z.object({
    graph: z.object({
      nodes: z.array(z.object({
        id: z.string().min(1).max(256),
        label: z.string().max(256).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }).passthrough()).min(1).max(10_000),
      edges: z.array(z.object({
        source: z.string().min(1).max(256),
        target: z.string().min(1).max(256),
        weight: z.number().nonnegative().max(1e9).optional(),
      }).passthrough()).max(100_000),
    }),
  }).describe("Load + DFS cycle detection. Returns [] when acyclic. Pure."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-PGH: ParserGoldenHarnessEngine wiring ──
  // U-LPR-PARSER-TESTS golden-file regression harness. Read methods only —
  // freeze/quarantineCase/liftQuarantine/clearAll DEFERRED (cross-call
  // state mutation; LLM-callable freeze() would let a fictional golden
  // set silence real regressions).
  pgh_list_golden: z.object({
    dialect: z.string().min(1).max(64).optional()
      .describe("Optional dialect filter (fanuc/okuma/haas/mitsubishi/hurco)"),
  }).describe("List frozen golden cases, optionally filtered by dialect. Pure read."),

  pgh_get_case: z.object({
    case_id: z.string().min(1).max(256)
      .describe("Canonical golden case id"),
  }).describe("Look up one golden case by id. Returns null when unknown. Pure read."),

  pgh_is_quarantined: z.object({
    case_id: z.string().min(1).max(256),
    now: z.number().nonnegative().max(8.64e15).optional()
      .describe("Override 'now' for deterministic tests (epoch ms)"),
  }).describe("Check whether a case is currently quarantined. Pure read."),

  pgh_list_quarantine: z.object({
    now: z.number().nonnegative().max(8.64e15).optional(),
  }).describe("List currently-quarantined cases. Pure read."),

  pgh_evaluate: z.object({
    runs: z.array(z.object({
      case_id: z.string().min(1).max(256),
      input_sha256: z.string().min(1).max(128).describe("SHA-256 of the input bytes (must match the golden case)"),
      parse_ok: z.boolean().describe("Whether parse succeeded"),
      ast_sha256: z.string().min(1).max(128).optional().describe("Populated when parse_ok"),
      error_code: z.string().max(256).optional().describe("Populated when !parse_ok"),
      error: z.string().max(4096).optional().describe("Legacy alias for error_code"),
      run_at: z.number().nonnegative().max(8.64e15).optional().describe("Run epoch ms (used for quarantine TTL)"),
      parser_version: z.string().max(64).optional(),
    }).passthrough()).min(1).max(10_000)
      .describe("Parser runs to evaluate against golden (≤10k for DoS)"),
  }).describe("Evaluate parser runs against the frozen golden set. Pure read against current golden state."),

  pgh_to_snapshot: z.object({}).describe("Full snapshot of golden + quarantine state. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-PFH: ParserFuzzHarnessEngine wiring ──
  // U-LPR-PARSER-FUZZ property-based + differential fuzz harness. Read
  // methods only — addCorpusEntry/markCrash/clearAll DEFERRED (cross-call
  // state mutation; LLM-callable markCrash() would inject fake crashes).
  pfh_list_corpus: z.object({
    dialect: z.string().min(1).max(64).optional(),
    category: z.string().min(1).max(64).optional()
      .describe("CorpusCategory filter"),
  }).describe("List fuzz corpus entries with optional dialect/category filter. Pure read."),

  pfh_get_corpus_entry: z.object({
    input_sha256: z.string().min(1).max(128)
      .describe("Canonical SHA-256 of the input"),
  }).describe("Look up one corpus entry by SHA-256. Returns null when unknown. Pure read."),

  pfh_list_crashes: z.object({}).describe("List every recorded crash repro. Pure read."),

  pfh_evaluate_batch: z.object({
    observations: z.array(z.object({
      parser_id: z.string().min(1).max(256).describe("Parser identifier (e.g. 'cps-v2', 'legacy-lex')"),
      input_sha256: z.string().min(1).max(128),
      dialect: z.string().min(1).max(64).describe("Dialect tag (fanuc/okuma/haas/...)"),
      parse_ok: z.boolean().describe("Whether parse succeeded"),
      ast_sha256: z.string().min(1).max(128).optional().describe("Populated when parse_ok"),
      error_code: z.string().max(256).optional().describe("Populated when !parse_ok"),
      panicked: z.boolean().optional().describe("True ⇒ P1 (no-panic) breach"),
      panic_signature: z.string().max(4096).optional(),
      duration_ms: z.number().nonnegative().max(3_600_000).optional(),
      observed_at: z.number().nonnegative().max(8.64e15).describe("Observation epoch ms"),
    }).passthrough()).min(1).max(10_000)
      .describe("Parser observations to score against the 3-property contract (≤10k for DoS)"),
  }).describe("Evaluate parser observations against P1 (no-panic) etc. Pure read against current corpus state."),

  pfh_to_snapshot: z.object({}).describe("Full snapshot of corpus + crashes state. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-WIH: WorkflowIntegrationHelper wiring ──
  // Pure utility functions over WorkflowTemplateEngine. logWorkflowValidation
  // NOT WIRED — fire-and-forget side-effect with no return value.
  // Underlying engine gracefully degrades to null/[] when WTE unavailable.
  wih_suggest_workflow: z.object({
    process_type: z.enum(["2d_milling","3d_milling","5axis_milling","turning","mill_turn","wire_edm","sinker_edm","grinding","die_design","mold_design","fixture_design"])
      .describe("Manufacturing process type"),
    include_optional: z.boolean().optional()
      .describe("Include optional steps in suggested sequence (default false)"),
  }).describe("Suggest a workflow sequence for a process type. Returns null when WTE not loaded."),

  wih_validate_sequence: z.object({
    process_type: z.enum(["2d_milling","3d_milling","5axis_milling","turning","mill_turn","wire_edm","sinker_edm","grinding","die_design","mold_design","fixture_design"]),
    operations: z.array(z.string().min(1).max(256)).min(1).max(1000)
      .describe("Operation names to validate against canonical template (≤1000)"),
  }).describe("Gap-analyze operations against the canonical workflow template. Returns null when WTE not loaded."),

  wih_get_quick_reference: z.object({
    process_type: z.enum(["2d_milling","3d_milling","5axis_milling","turning","mill_turn","wire_edm","sinker_edm","grinding","die_design","mold_design","fixture_design"]),
  }).describe("Get quick-reference operation sequence for a process type. Returns [] when WTE not loaded."),

  wih_get_order_of_operations: z.object({}).describe(
    "List order-of-operations guides for all processes. Returns [] when WTE not loaded."
  ),

  wih_infer_process_type: z.object({
    machine_type: z.string().max(256).optional()
      .describe("Machine type hint (e.g. 'OKUMA-LB3000', 'haas-vf4')"),
    operations: z.array(z.string().min(1).max(256)).max(200).optional()
      .describe("Operation names — engine substring-matches against keywords"),
    features: z.array(z.string().min(1).max(256)).max(200).optional()
      .describe("Feature names — engine substring-matches against keywords"),
  }).describe("Infer process type from {machine, operations, features} context. Pure (synchronous, no WTE dep)."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-AET: ActionableErrorTemplateEngine wiring ──
  // PP-0.25.6-U-UX2 turns blocking errors into actionable "Try instead:"
  // hints. Read methods only — register/registerAll/clear DEFERRED
  // (LLM-callable registers would let fictional templates mask real errors).
  // 5 actions wired.
  aet_has: z.object({
    code: z.string().min(1).max(256)
      .describe("Error code to check for template existence"),
  }).describe("Boolean check whether a template exists. Pure read."),

  aet_get: z.object({
    code: z.string().min(1).max(256)
      .describe("Error code whose template to fetch"),
  }).describe("Get a registered template — returns null when unknown. Pure read."),

  aet_render: z.object({
    code: z.string().min(1).max(256)
      .describe("Error code to render; unknown codes get a generic 'no template' result"),
    variables: z.record(z.string(), z.union([z.string(), z.number()])).optional()
      .describe("Optional {var} placeholder substitutions"),
  }).describe("Render an actionable error (headline + tryInstead + suggestedCommand + docsUrl + assembled message). Pure."),

  aet_list_codes: z.object({}).describe("Return every registered template code, sorted. Pure read."),

  aet_size: z.object({}).describe("Return the registered template count. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-GSE: GoalStackEngine wiring ──
  // PP-0.13-U-SAW3 hierarchical goal stack for session awareness.
  // Hooks call topN()/current()/all() on UserPromptSubmit to inject goals
  // into the next prompt. Read methods only — push/complete/abandon/
  // completeCascade/clear DEFERRED (write methods mutate the shared
  // singleton that hooks read; LLM-callable mutators would let one chat
  // silently rewrite another chat's goal stack).
  gse_current: z.object({}).describe("Return the most-recent active goal (or null). Pure read."),

  gse_top_n: z.object({
    n: z.number().int().positive().max(100).optional()
      .describe("Number of top entries to return (default 5, max 100)"),
  }).describe("Return the top-N active goals (priority + insertion order). Pure read."),

  gse_tree: z.object({}).describe("Return goal tree (every root with attached children). Pure read."),

  gse_get: z.object({
    id: z.string().min(1).max(64).regex(/^g\d+$/, "id must match engine format gN (e.g. g1, g42)")
      .describe("Goal id (engine emits monotonic 'g1', 'g2', ...)"),
  }).describe("Look up one goal by id (returns null when unknown). Pure read."),

  gse_all: z.object({}).describe("Return every goal (active + completed + abandoned). Pure read."),

  gse_active_count: z.object({}).describe("Count of goals currently in 'active' status. Pure read."),

  gse_to_json: z.object({}).describe("Full serialized state {schemaVersion, goals, nextId}. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-RBE: RunbookEngine wiring ──
  // U-LPR-OBS6 operational runbook management with RACI coverage. Read
  // methods only — createRunbook/updateRunbook/deleteRunbook/abortExecution/
  // markReviewed/createStandardRunbooks/clear DEFERRED (writes mutate the
  // shared incident-playbook registry; LLM mutators would let one chat
  // alter another chat's runbook execution state).
  rbe_get_runbook: z.object({
    id: z.string().min(1).max(256)
      .describe("Runbook id"),
  }).describe("Look up one runbook by id (returns null when unknown). Pure read."),

  rbe_get_execution: z.object({
    id: z.string().min(1).max(256)
      .describe("Runbook execution id"),
  }).describe("Look up one execution by id (returns null when unknown). Pure read."),

  rbe_get_executions_for_runbook: z.object({
    runbook_id: z.string().min(1).max(256),
    limit: z.number().int().positive().max(1000).optional()
      .describe("Result cap (default 10, max 1000)"),
  }).describe("List recent executions for a runbook. Pure read."),

  rbe_get_active_executions: z.object({}).describe(
    "List every execution currently in 'running'/'in_progress' state. Pure read."
  ),

  rbe_get_raci_matrix: z.object({
    runbook_id: z.string().min(1).max(256),
  }).describe("Get the RACI matrix (Responsible/Accountable/Consulted/Informed) for one runbook. Pure read."),

  rbe_get_runbooks_needing_review: z.object({}).describe(
    "List runbooks past their review-due date. Pure read."
  ),

  rbe_get_stats: z.object({}).describe("Runbook engine stats {total, byCategory, byStatus, ...}. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-FCC: ConsensusFactCheckerEngine wiring ──
  // INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-FACT-CHECK validates external-model
  // answers (Codex/Grok/Ollama) against PRISM source-of-truth artifacts
  // before a roadmap proposal builds on a fictional engine/action.
  // 3 actions wired; reset() DEFERRED (wipes shared kb cache).
  fcc_check: z.object({
    text: z.string().min(1).max(65_536)
      .describe("Model-answer text to fact-check (≤64 KB for DoS bound)"),
    model_name: z.string().min(1).max(256).optional()
      .describe("Model identifier for audit trail (default 'unknown')"),
  }).describe("Fact-check text against PRISM kb. Auto-loads kb if not yet cached. Pure (read-only against cached kb)."),

  fcc_get_knowledge_base: z.object({}).describe(
    "Return the currently-cached KnowledgeBase or null when not yet loaded. Pure read."
  ),

  fcc_load_knowledge_base: z.object({
    dispatcher_actions: z.array(z.string().min(1).max(256)).max(10_000).optional()
      .describe("Optional dispatcher-action allowlist to seed the kb (default scans every dispatcher)"),
  }).describe("Explicitly load the PRISM kb into the cache (idempotent — cached after first call)."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-PCR: PostCompactRestorationEngine wiring ──
  // U-CTX04 PostCompact Restoration Cascade — restores mental model / bandit
  // posteriors / SVI trajectory / live claims from the precompact dossier.
  // 6 read actions wired; clearDossier() DEFERRED (deletes the dossier file
  // from disk; LLM-callable would let one chat wipe another chat's
  // restoration data).
  pcr_has_dossier: z.object({}).describe("Boolean check whether PRECOMPACT_DOSSIER.json exists. Pure read."),

  pcr_get_dossier_age: z.object({}).describe(
    "Age of the dossier file in ms (Infinity when missing). Pure read."
  ),

  pcr_load_dossier: z.object({}).describe(
    "Parse + return the validated PrecompactDossier (or null on miss/parse-fail). Pure read."
  ),

  pcr_restore: z.object({}).describe(
    "Full restoration: {success, sessionId, mentalModel, banditState, sviTrajectory, activeClaims, recoveryHints, tokenEstimate, errors}. Pure read."
  ),

  pcr_get_summary: z.object({}).describe(
    "Compact summary {objective, approach, nextSteps, blockers, sviPsi, banditTopArm, claims, hints}. Pure read."
  ),

  pcr_format_for_injection: z.object({}).describe(
    "Pre-formatted restoration block suitable for context injection. Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-RI: ResourceIndexEngine wiring ──
  // H: drive resource mapping + discovery (PDFs, MIT courses, catalogs,
  // machine models, post processors, JM DIE programs). Read methods only;
  // markExtracted() DEFERRED (mutates shared extraction status which other
  // resource-extraction pipelines consume).
  ri_get_index: z.object({
    force_refresh: z.boolean().optional()
      .describe("Bypass cache + re-scan filesystem (default false; cache TTL 5min)"),
  }).describe("Full ResourceIndex {schemaVersion, basePaths, totalFiles, folders[], extractionProgress}. Pure read."),

  ri_get_unextracted_folders: z.object({
    priority_filter: z.enum(["high", "medium", "low"]).optional()
      .describe("Optional priority band filter"),
  }).describe("List folders whose extraction status is not 'completed'. Pure read."),

  ri_search: z.object({
    query: z.string().min(1).max(256)
      .describe("Substring match against folder name/path (case-insensitive)"),
    type_filter: z.enum(["pdf","video","course","catalog","program","cad","post","model","spreadsheet","archive","other"]).optional()
      .describe("Optional resource-type filter"),
  }).describe("Search resource entries by name/path with optional type filter. Pure read."),

  ri_get_extraction_summary: z.object({}).describe(
    "Human-readable summary of extraction progress across all known folders. Pure read."
  ),

  ri_get_jm_die_folders: z.object({}).describe(
    "List JM Die customer folders with program counts. Pure read."
  ),

  ri_get_jm_die_program_sample: z.object({
    machine_type: z.string().min(1).max(64)
      .describe("Machine type folder name (e.g. 'CNC LATHE', 'CNC MILL')"),
    count: z.number().int().positive().max(500).optional()
      .describe("Number of program samples to return (default 10, max 500)"),
  }).describe("Sample programs from one JM Die machine-type folder. Pure read (filesystem)."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-NE: NotificationEngine wiring ──
  // L2-P3-MS1 notification management. Read methods only;
  // send/markRead/markDelivered/registerTemplate/setPreferences/clear
  // DEFERRED (write methods mutate the shared notification + template store;
  // LLM-callable send() would let one chat fake notifications to others).
  ne_list: z.object({
    recipient: z.string().min(1).max(256)
      .describe("Recipient identifier (employee id or user handle)"),
    unread_only: z.boolean().optional()
      .describe("Filter to unread only (default false)"),
  }).describe("List notifications for one recipient. Pure read."),

  ne_list_templates: z.object({}).describe(
    "List every registered notification template. Pure read."
  ),

  ne_stats: z.object({}).describe(
    "Engine stats {total_sent, total_delivered, total_failed, total_read, by_channel, by_priority, delivery_rate_pct, read_rate_pct}. Pure read."
  ),

  ne_get_preferences: z.object({
    employee_id: z.string().min(1).max(256)
      .describe("Employee id whose preferences to read"),
  }).describe("Get NotificationPreferences (returns defaults when unset). Pure read."),

  ne_get_in_app_notifications: z.object({
    employee_id: z.string().min(1).max(256),
  }).describe("List in-app notifications for one employee. Pure read."),

  ne_get_unread_count: z.object({
    employee_id: z.string().min(1).max(256),
  }).describe("Count unread notifications for one employee. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-SCR: SlashCommandRecommenderEngine wiring ──
  // PP-0.17-U-PLG2 slash-command recommendation. Read methods only;
  // register/registerAll/clear/loadFromRegistryFile DEFERRED (writes mutate
  // the shared command registry; LLM-callable register() would let one
  // chat inject phantom commands the next prompt would suggest).
  scr_get: z.object({
    command: z.string().min(1).max(256)
      .describe("Slash command (e.g. '/dedup', '/forge-triple')"),
  }).describe("Look up one registered CommandEntry by command string. Returns null when unknown. Pure read."),

  scr_list: z.object({}).describe("List every registered CommandEntry. Pure read."),

  scr_size: z.object({}).describe("Count of registered commands. Pure read."),

  scr_recommend: z.object({
    prompt: z.string().min(1).max(8192)
      .describe("User prompt to match against command triggers"),
    top_n: z.number().int().positive().max(50).optional()
      .describe("Number of recommendations to return (default 3, max 50)"),
    min_confidence: z.number().min(0).max(1).optional()
      .describe("Minimum confidence threshold (default 0.0)"),
  }).describe("Recommend top-N slash commands for a user prompt. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-LBD: LatencyBudgetDecompositionEngine wiring ──
  // U-LPR-PERF-SLO end-to-end latency SLO decomposition (R-7 quantile,
  // fast/slow burn). Read methods only; setBudget/clearAll DEFERRED.
  lbd_get_budget: z.object({
    profile: z.string().min(1).max(64)
      .describe("DeploymentProfile (e.g. 'standard', 'realtime', 'batch')"),
    stage: z.string().min(1).max(64)
      .describe("StageId (e.g. 'ocr', 'cad_feature_extract', 'speedfeed')"),
  }).describe("Look up the latency budget for one profile+stage. Pure read."),

  lbd_list_budgets: z.object({
    profile: z.string().min(1).max(64).optional()
      .describe("Optional profile filter"),
  }).describe("List budgets, optionally filtered by profile. Pure read."),

  lbd_aggregate_budget: z.object({
    profile: z.string().min(1).max(64),
  }).describe("Sum of all stage budgets for one profile (ms). Pure read."),

  lbd_validate_profile_budget: z.object({
    profile: z.string().min(1).max(64),
  }).describe("Check {valid, total_ms, slack_ms, reason} for a profile. Pure read."),

  lbd_list_observations: z.object({
    stage: z.string().min(1).max(64).optional(),
    profile: z.string().min(1).max(64).optional(),
    since: z.number().nonnegative().max(8.64e15).optional()
      .describe("Observations after this epoch-ms timestamp"),
    limit: z.number().int().positive().max(10_000).optional()
      .describe("Cap (default unbounded, max 10k for DoS)"),
  }).describe("List per-stage observations matching the filter. Pure read."),

  lbd_stage_stats: z.object({
    profile: z.string().min(1).max(64),
    stage: z.string().min(1).max(64),
    since: z.number().nonnegative().max(8.64e15).optional(),
  }).describe("p50/p95/p99 stats for one profile+stage since timestamp. Pure read."),

  lbd_get_stats: z.object({}).describe("Engine-wide stats. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-SLO: SLOEngine wiring ──
  // U-LPR-OBS5 SLO/SLI formalization. Read methods only; registerSLO/
  // recordEvent/recordLatency/registerStandardSLOs/clear DEFERRED.
  slo_get_slo: z.object({
    id: z.string().min(1).max(256),
  }).describe("Look up one SLO by id. Pure read."),

  slo_list_slos: z.object({}).describe("List every registered SLO. Pure read."),

  slo_get_status: z.object({
    slo_id: z.string().min(1).max(256),
  }).describe("Get the live SLOStatus for one SLO. Pure read."),

  slo_get_error_budget: z.object({
    slo_id: z.string().min(1).max(256),
  }).describe("Get the ErrorBudget snapshot for one SLO. Pure read."),

  slo_generate_report: z.object({
    slo_id: z.string().min(1).max(256),
    start_time: z.number().nonnegative().max(8.64e15).optional(),
    end_time: z.number().nonnegative().max(8.64e15).optional(),
  }).describe("Generate the SLOReport for a time window. Pure read."),

  slo_is_alerting: z.object({
    slo_id: z.string().min(1).max(256),
  }).describe("Boolean — is this SLO currently in alerting state? Pure read."),

  slo_get_alerting_slos: z.object({}).describe("List every SLO currently alerting. Pure read."),

  slo_get_stats: z.object({}).describe("Engine-wide SLO stats. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-ME: MigrationEngine wiring ──
  // L2-P3-MS1 schema versioning + data migration. Read methods only;
  // register/apply/rollback/clear DEFERRED — register takes function
  // literals (non-serializable over MCP) + apply/rollback mutate
  // persistent schema state.
  me_status: z.object({}).describe(
    "MigrationPlan {pending, applied, current_version, target_version, steps}. Pure read."
  ),

  me_get_records: z.object({}).describe(
    "All MigrationRecord entries (history of applied/rolled-back/failed). Pure read."
  ),

  me_validate: z.object({}).describe(
    "{valid:bool, issues:string[]} — checks ordering + duplicates. Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-CC: ConsensusCoordinatorEngine wiring ──
  // INTEL-OLLAMA-OBSIDIAN-MS0/AUTO-CONSENSUS concurrency-aware wrapper.
  // 2 read actions wired; run() DEFERRED (fans out expensive consensus
  // calls to shared external resources — LLM-callable would saturate the
  // shared Codex API + Ollama daemon + Claude subprocess across 6 chats).
  // resetForTesting() DEFERRED (mutates inflight + budget state).
  cc_peek_cache: z.object({
    prompt: z.string().min(1).max(65_536)
      .describe("Original prompt (≤64 KB for DoS bound)"),
    task_type: z.string().min(1).max(256)
      .describe("Task-type tag (consensus uses {prompt, task_type, context} as cache key)"),
    context: z.string().max(65_536).optional()
      .describe("Optional context string (default empty)"),
    ttl_ms: z.number().int().positive().max(86_400_000).optional()
      .describe("Cache TTL window in ms (default engine default)"),
  }).describe("Read cached consensus result for a prompt+task_type+context (or null when miss). Pure read."),

  cc_get_stats: z.object({}).describe(
    "Engine stats {inflight, budget, cacheBytes}. Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-SCA: SourceCatalogAggregator wiring ──
  // Unified query interface over 28 engine SOURCE_FILE_CATALOG exports.
  // All 4 module-level functions are pure (lazy-load + filter/group).
  // No defers — every export is read-only.
  sca_get_all_catalogs: z.object({}).describe(
    "Aggregate every engine's SOURCE_FILE_CATALOG. Pure read."
  ),

  sca_search_catalog: z.object({
    query: z.string().min(1).max(256)
      .describe("Substring match against id+filename+description+category (case-insensitive)"),
    engine: z.string().min(1).max(256).optional()
      .describe("Restrict to one engine's catalog"),
    category: z.string().min(1).max(64).optional()
      .describe("Filter by entry.category"),
    safety_class: z.string().min(1).max(64).optional()
      .describe("Filter by entry.safety_class"),
    limit: z.number().int().positive().max(1000).optional()
      .describe("Result cap (default 50, max 1000 for DoS bound)"),
  }).describe("Search across all catalogs. Pure read."),

  sca_get_engine_catalog: z.object({
    engine_name: z.string().min(1).max(256)
      .describe("Engine name whose catalog to fetch"),
  }).describe("Get one engine's full catalog (or null when unknown). Pure read."),

  sca_get_catalog_stats: z.object({}).describe(
    "Stats grouped by category + safety_class + total entries. Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-MTI: MillTribalIntegrationEngine wiring ──
  // Three pure-read actions. integrateWithTraining() DEFERRED (mutates
  // millNeuralNetworkEngine training data; ML-training-data-corruption class).
  mti_get_adjustment: z.object({
    material_iso: z.string().min(1).max(8)
      .describe("ISO material group (P/M/K/N/S/H or specific code like P30)"),
    operation_type: z.string().min(1).max(64)
      .describe("Operation type (rough_profile, finish_pocket, drill, etc.)"),
    tool_type: z.string().min(1).max(64)
      .describe("Tool type (flat_endmill, twist_drill, face_mill, etc.)"),
    tool_diameter_mm: z.number().positive().max(500)
      .describe("Tool diameter in mm (DoS bound 500mm)"),
  }).describe("Get tribal-knowledge rpm/feed/doc factor adjustments + warnings. Pure read."),

  mti_check_failure_modes: z.object({
    material_iso: z.string().min(1).max(8)
      .describe("ISO material group"),
    operation_type: z.string().min(1).max(64)
      .describe("Operation type"),
    rpm: z.number().positive().max(200_000)
      .describe("RPM (DoS bound 200k)"),
    feed: z.number().positive().max(50_000)
      .describe("Feed mm/min (DoS bound 50k)"),
    doc: z.number().positive().max(1000)
      .describe("Depth of cut mm (DoS bound 1000)"),
  }).describe("Match operation against registered failure modes. Pure read."),

  mti_get_statistics: z.object({}).describe(
    "Aggregate counts (tips/heuristics/failure-modes + per-material + per-operation). Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-LDL: LatheDeepLogicEngine wiring ──
  // Four pure-read symbolic-logic surfaces. analyzeOperation DEFERRED
  // (calls folLogic.registerEntity → mutates shared FOL entity registry;
  // would let any chat overwrite/poison FOL state for all other consumers).
  // checkProcessAlternatives DEFERRED (mutates modalLogic.worlds map).
  ldl_optimize_parameters: z.object({
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"])
      .describe("ISO material group"),
    max_power_kw: z.number().positive().max(500)
      .describe("Machine max spindle power kW (DoS bound 500)"),
    max_rpm: z.number().positive().max(200_000)
      .describe("Machine max rpm (DoS bound 200k)"),
    tool_nose_radius_mm: z.number().positive().max(20)
      .describe("Tool nose radius mm"),
    diameter_mm: z.number().positive().max(2000)
      .describe("Workpiece diameter mm"),
    target_ra_um: z.number().positive().max(50)
      .describe("Target surface roughness Ra µm"),
  }).describe("CSP-solve for optimal Vc/fn/ap + Kienzle/Taylor predictions. Pure read."),

  ldl_validate_sequence: z.object({
    operations: z.array(z.string().min(1).max(64)).min(1).max(50)
      .describe("Operation sequence (1-50 ops, each 1-64 chars)"),
  }).describe("Validate temporal sequence against registered rules. Pure read."),

  ldl_get_fuzzy_speed_recommendation: z.object({
    hardness_hrc: z.number().min(0).max(80)
      .describe("Material hardness HRC (0-80)"),
    depth_mm: z.number().positive().max(100)
      .describe("Depth of cut mm"),
    feed_mm_rev: z.number().positive().max(10)
      .describe("Feed mm/rev"),
  }).describe("Fuzzy inference for speed adjustment recommendation. Pure read."),

  ldl_reason_tool_selection: z.object({
    is_steel: z.boolean(),
    is_hardened: z.boolean(),
    is_interrupted: z.boolean(),
    is_high_temp_alloy: z.boolean(),
    needs_fine_finish: z.boolean(),
  }).describe("Defeasible reasoning for tool selection. Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-DR: DailyFlashReportEngine wiring ──
  // emailFlashReport DEFERRED — currently a console.log stub AND a
  // send-impersonation class (LLM-callable email-send would be a
  // spoofing/spam surface even when the impl is filled in).
  dr_generate_flash_report: z.object({
    date: z.string().min(1).max(32)
      .describe("Report date (e.g. ISO YYYY-MM-DD; 32-char DoS bound)"),
    requested_by: z.string().min(1).max(256)
      .describe("Requester identifier (employee id, system name, etc.)"),
  }).describe("Aggregate end-of-day flash report (jobs/scrap/OEE/downtime). Pure read."),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-FQ: ForgeQuintEngine wiring ──
  // Three pure-read surfaces. forge() + rollback() DEFERRED — forge()
  // is a fictional-template-injection class (LLM-callable would let any
  // chat inject arbitrary engine code into the repo via
  // engineCode/testCode/hookContent params); rollback() mutates the
  // filesystem.
  fq_validate: z.object({
    engineName: z.string().min(1).max(128)
      .describe("Engine name (PascalCase ending in 'Engine')"),
    description: z.string().min(1).max(2048)
      .describe("Engine description (engine enforces >=10 chars)"),
    keywords: z.array(z.string().min(1).max(64)).max(64)
      .describe("Domain keywords for similarity check (max 64 items)"),
    engineCode: z.string().min(1).max(1_000_000)
      .describe("Engine code (1MB DoS bound)"),
    testCode: z.string().min(1).max(1_000_000)
      .describe("Test code (1MB DoS bound)"),
    dispatcherName: z.string().min(1).max(128)
      .describe("Target dispatcher name"),
    actionName: z.string().min(1).max(128)
      .describe("Action name for dispatcher wiring"),
    skillContent: z.string().min(0).max(1_000_000).optional()
      .describe("Skill markdown content (1MB DoS bound) — unused by validate but kept for forge-symmetry"),
    hookContent: z.string().min(0).max(1_000_000).optional()
      .describe("Hook script content (1MB DoS bound) — unused by validate but kept for forge-symmetry"),
    hookFilename: z.string().min(0).max(256).optional()
      .describe("Hook filename — unused by validate but kept for forge-symmetry"),
    correlationId: z.string().min(0).max(128).optional()
      .describe("Optional correlation id"),
  }).describe("Validate proposed-asset input WITHOUT writing files. Pure read."),

  fq_is_forge_in_progress: z.object({}).describe(
    "Check whether a forge transaction currently holds the global forge lock. Pure read."
  ),

  fq_get_forge_lock_info: z.object({}).describe(
    "Get current forge-lock holder/session/acquiredAt (or null when free). Pure read."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-CMC: CapacityMonteCarloEngine wiring ──
  // Pure compute (no I/O, no state mutation). Single action wraps
  // CapacityMonteCarloEngine.simulate(). Stochastic — uses Math.random()
  // internally so back-to-back calls differ within statistical bounds.
  // DoS bounds chosen to cap wall-time worst case at ~few seconds:
  //   N(machines) * N(simulations) * horizon weeks loop body is O(M*N*W)
  //   100 machines * 50k sims * 104 weeks ~= 520M loop bodies — cap holds.
  // ── WIRE-UNWIRED-MS0 / U-WIRE-ICC: InfiniteConditionCombinatorEngine ──
  // Five pure-read surfaces. recordKnowledge() + import() DEFERRED —
  // both mutate the singleton's shared knowledge Map (ML-training-data-
  // corruption class: LLM-callable would let any chat poison the
  // condition→parameter knowledge base with crafted vectors + bogus
  // outcomes; import() goes further and replaces the whole base).
  icc_calculate_similarity: z.object({
    v1: z.object({
      material: z.string().min(1).max(128),
      geometry: z.string().min(1).max(128),
      machine: z.string().min(1).max(128),
      tool: z.string().min(1).max(128),
      operation: z.string().min(1).max(128),
      environment: z.record(z.string().min(1).max(64), z.number()).optional(),
    }).describe("First condition vector"),
    v2: z.object({
      material: z.string().min(1).max(128),
      geometry: z.string().min(1).max(128),
      machine: z.string().min(1).max(128),
      tool: z.string().min(1).max(128),
      operation: z.string().min(1).max(128),
      environment: z.record(z.string().min(1).max(64), z.number()).optional(),
    }).describe("Second condition vector"),
  }).describe("Compute similarity score in [0,1] between two condition vectors. Pure compute."),

  icc_find_similar: z.object({
    vector: z.object({
      material: z.string().min(1).max(128),
      geometry: z.string().min(1).max(128),
      machine: z.string().min(1).max(128),
      tool: z.string().min(1).max(128),
      operation: z.string().min(1).max(128),
      environment: z.record(z.string().min(1).max(64), z.number()).optional(),
    }),
    limit: z.number().int().positive().max(100).optional()
      .describe("Result cap (default 5, max 100)"),
  }).describe("Find similar conditions in knowledge base (similarity >= 0.6 threshold). Pure read."),

  icc_interpolate: z.object({
    targetVector: z.object({
      material: z.string().min(1).max(128),
      geometry: z.string().min(1).max(128),
      machine: z.string().min(1).max(128),
      tool: z.string().min(1).max(128),
      operation: z.string().min(1).max(128),
      environment: z.record(z.string().min(1).max(64), z.number()).optional(),
    }),
  }).describe("Interpolate parameters for unknown condition combination (weighted_average or hierarchical_bayes). Pure read."),

  icc_get_coverage_statistics: z.object({}).describe(
    "Aggregate coverage: totalCombinations + uniqueMaterials + uniqueMachines + uniqueOperations + per-level hierarchy. Pure read."
  ),

  icc_export: z.object({}).describe(
    "Export all condition knowledge entries as array. Pure read (no I/O)."
  ),

  // ── WIRE-UNWIRED-MS0 / U-WIRE-OSC: OperatingSystemCoordinationEngine ──
  // Two pure-read static methods. setHotJob + clearHotJob DEFERRED
  // (mutate module-scope `hotJobs` array; LLM-callable would let any
  // chat thrash other chats' hot-job priority queue).
  osc_list_hot_jobs: z.object({}).describe(
    "List active hot jobs, sorted. Pure read."
  ),

  osc_build_messages_workspace: z.object({
    profileId: z.string().min(1).max(128).optional()
      .describe("Operator profile id (admin/machinist/inspector/planner)"),
    email: z.string().min(0).max(256).nullable().optional()
      .describe("Operator email (or null to omit)"),
    threadId: z.string().min(0).max(256).nullable().optional()
      .describe("Selected thread id (or null/missing for first thread)"),
  }).describe("Build a per-scope messages workspace snapshot. Pure read."),

  cmc_simulate: z.object({
    machines: z.array(z.object({
      id: z.string().min(1).max(128),
      name: z.string().min(1).max(256),
      hours_per_shift: z.number().positive().max(24),
      shifts_per_day: z.number().positive().max(4),
      days_per_week: z.number().positive().max(7),
      mtbf_hours: z.number().positive().max(100_000),
      mttr_hours: z.number().positive().max(10_000),
      setup_time_min_mean: z.number().nonnegative().max(10_000),
      setup_time_min_stddev: z.number().nonnegative().max(10_000),
      cycle_time_min_mean: z.number().positive().max(10_000),
      cycle_time_min_stddev: z.number().nonnegative().max(10_000),
    })).min(1).max(100)
      .describe("1-100 machines with availability/setup/cycle params"),
    demand: z.object({
      parts_per_week_mean: z.number().nonnegative().max(1_000_000),
      parts_per_week_stddev: z.number().nonnegative().max(1_000_000),
      seasonal_factor: z.number().positive().max(10).optional(),
    }).describe("Weekly demand forecast"),
    scrap_rate_mean: z.number().min(0).max(1)
      .describe("Mean scrap rate in [0,1]"),
    scrap_rate_max: z.number().min(0).max(1)
      .describe("Max scrap rate (beta upper bound) in [0,1]"),
    num_simulations: z.number().int().positive().max(50_000).optional()
      .describe("Monte Carlo iterations (default 5000, max 50k)"),
    horizon_weeks: z.number().int().positive().max(104).optional()
      .describe("Planning horizon weeks (default 12, max 104=2yr)"),
    target_service_level: z.number().min(0).max(1).optional()
      .describe("Target service level in [0,1] (default 0.95)"),
  }).describe("Monte Carlo capacity simulation (stochastic; pure compute, no I/O)."),
};
