/**
 * Context Action Schemas — Zod validation for contextDispatcher actions
 */

import { z } from "zod";

// ── WIRE-UNWIRED-MS0/U-WIRE-COMPACT-PLANNER — CompactPlannerEngine schemas ──
// Mirrors ContentCategory / ContentItem / CompactPlan from CompactPlannerEngine.ts.
// Categories must stay in sync with the engine's `ContentCategory` union.

const compactContentCategorySchema = z
  .enum([
    "active-task",
    "file-state",
    "decision",
    "error-context",
    "user-preference",
    "tool-result",
    "exploration",
    "completed",
    "stale",
  ])
  .describe("Content category — drives default priority in the compaction plan");

const compactContentItemSchema = z
  .object({
    category: compactContentCategorySchema,
    summary: z.string().describe("Short human-readable summary of the content item"),
    tokens: z.number().int().nonnegative().describe("Token count for this item"),
    priority: z
      .number()
      .int()
      .min(0)
      .max(5)
      .describe("Priority 1 (must keep) to 5 (safe to drop); 0 means use category default"),
    age: z.number().nonnegative().describe("Minutes since the item was created"),
  })
  .strict()
  .describe("Single content item being considered for keep/drop");

const compactPlanResultSchema = z
  .object({
    keep: z.array(compactContentItemSchema).describe("Items the plan retains"),
    drop: z.array(compactContentItemSchema).describe("Items the plan discards"),
    tokensBefore: z.number().nonnegative().describe("Total token count before compaction"),
    tokensAfter: z.number().nonnegative().describe("Token count of retained items"),
    savings: z.number().describe("tokensBefore - tokensAfter"),
    savingsPercent: z.number().describe("Integer percentage of savings"),
    preservationNotes: z.array(z.string()).describe("Human-readable warnings/notes about the plan"),
  })
  .strict()
  .describe("Output of compact_plan — also accepted as input for compact_summary");

export const ACTION_CONTEXT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // WIRE-UNWIRED-MS0/U-WIRE-COMPACT-PLANNER — pure-compute compaction planning
  compact_plan: z
    .object({
      items: z.array(compactContentItemSchema).describe("Content items being considered"),
      targetTokens: z
        .number()
        .int()
        .nonnegative()
        .describe("Token ceiling for retained items (priority=1 items kept regardless)"),
    })
    .strict()
    .describe("Plan optimal content preservation given a token budget"),
  compact_categorize: z
    .object({
      content: z.string().describe("Raw content string to categorize via keyword heuristics"),
    })
    .strict()
    .describe("Auto-classify a content string into one of the ContentCategory enum values"),
  compact_estimate_capacity: z
    .object({
      targetTokens: z.number().int().nonnegative().describe("Token budget for retained items"),
      avgItemTokens: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Average tokens per item (defaults to 150)"),
    })
    .strict()
    .describe("Estimate item count that fits in the token budget"),
  compact_summary: z
    .object({
      plan: compactPlanResultSchema,
    })
    .strict()
    .describe("Render a multi-line preservation summary from a compact_plan result"),

  // WIRE-UNWIRED-MS0/U-WIRE-PARALLEL-PLANNER — ParallelCallPlannerEngine.
  // Two call shapes:
  //   PlannedCall  — has id + optional dependsOn (used by parallel_plan)
  //   Tool-only    — just { tool, params } (used by parallel_infer_dependencies
  //                  and parallel_can_parallel; the engine generates ids itself)
  parallel_plan: z
    .object({
      calls: z
        .array(
          z
            .object({
              id: z.string().min(1).describe("Stable identifier — referenced by dependsOn"),
              tool: z.string().min(1).describe("Tool name (Read, Edit, Write, Bash, ...)"),
              params: z
                .record(z.string(), z.unknown())
                .describe("Tool params (passed through verbatim)"),
              dependsOn: z
                .array(z.string())
                .optional()
                .describe("Call ids this depends on; resolved before this call enters a batch"),
            })
            .strict(),
        )
        .describe("Calls to schedule"),
    })
    .strict()
    .describe(
      "Plan parallel-vs-sequential batches from a list of PlannedCall (with explicit dependencies)",
    ),
  parallel_infer_dependencies: z
    .object({
      calls: z
        .array(
          z
            .object({
              tool: z.string().min(1).describe("Tool name"),
              params: z
                .record(z.string(), z.unknown())
                .describe("Tool params — file_path/path/command used for dep inference"),
            })
            .strict(),
        )
        .describe("Raw call list (no ids); engine assigns call-0..N and infers dependencies"),
    })
    .strict()
    .describe(
      "Auto-infer dependencies between tool calls (Edit/Write depend on Read of same file; sequential Bash, etc.)",
    ),
  parallel_can_parallel: z
    .object({
      calls: z
        .array(
          z
            .object({
              tool: z.string().min(1).describe("Tool name"),
              params: z
                .record(z.string(), z.unknown())
                .describe("Tool params — file_path/path/pattern checked for uniqueness"),
            })
            .strict(),
        )
        .describe("Calls to quick-check for parallelizability"),
    })
    .strict()
    .describe(
      "True iff all calls are read-only tools (Read/Grep/Glob/WebSearch/WebFetch) hitting distinct targets",
    ),

  // WIRE-UNWIRED-MS0/U-WIRE-CTX-PRESSURE — ContextWindowPressureEngine.
  // Stateful: singleton accumulates samples for rate calculation.
  context_pressure_record: z
    .object({
      tokens: z
        .number()
        .int()
        .nonnegative()
        .describe("Token count at this sample point"),
      timestamp: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe("Epoch ms; defaults to Date.now()"),
    })
    .strict()
    .describe("Record a token-count sample for rate calculation"),
  context_pressure_read: z
    .object({
      currentTokens: z
        .number()
        .int()
        .nonnegative()
        .describe("Current token count (also recorded as a sample side-effect)"),
    })
    .strict()
    .describe(
      "Read pressure: utilization/rate/minutes-until-full/compaction + status (green|yellow|orange|red) + recommendation",
    ),
  context_pressure_optimal_compaction: z
    .object({})
    .strict()
    .describe(
      "Predict whether to compact now (rate-aware) — returns { shouldCompactNow, idealUtilization, reason }",
    ),
  context_pressure_reset: z
    .object({})
    .strict()
    .describe("Clear all accumulated samples (scenario boundary or test reset)"),

  // WIRE-UNWIRED-MS0/U-WIRE-PROMPT-COMPRESS — PromptCompressionEngine.
  prompt_compress: z
    .object({
      prompt: z
        .string()
        .min(1)
        .describe(
          "Prompt text to compress via filler-removal, whitespace-collapse, "
          + "markdown-strip, abbreviation, and dedup-sentences",
        ),
    })
    .strict()
    .describe(
      "Compress a prompt for sub-agent token reduction; returns original + compressed + savings + techniques",
    ),
  prompt_is_worth_compressing: z
    .object({
      prompt: z.string().describe("Prompt to check; threshold is length > 200 chars"),
    })
    .strict()
    .describe("Quick check — true iff prompt is long enough that compression saves more than it costs"),
  // Identity Model — U-SAV2-01
  identity_register: z.object({
    sessionId: z.string().min(1),
    role: z.enum(["builder", "reviewer", "planner", "researcher", "operator", "orchestrator", "specialist", "general"]).optional(),
    family: z.enum(["claude-code", "mcp-client", "hook-agent", "scheduled", "external"]).optional(),
    currentMilestone: z.string().optional(),
    currentUnit: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    customBoundaries: z.array(z.object({
      name: z.string(),
      type: z.enum(["must_not", "must", "prefer", "avoid"]),
      description: z.string(),
      enforcedBy: z.string().optional(),
    })).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  identity_get: z.object({
    sessionId: z.string().min(1),
  }),

  identity_heartbeat: z.object({
    sessionId: z.string().min(1),
  }),

  identity_check_boundary: z.object({
    sessionId: z.string().min(1),
    boundaryName: z.string().min(1),
  }),

  identity_capabilities: z.object({
    sessionId: z.string().min(1),
  }),

  identity_list: z.object({}).optional(),

  identity_siblings: z.object({
    sessionId: z.string().min(1),
  }),

  identity_deregister: z.object({
    sessionId: z.string().min(1),
  }),

  identity_stats: z.object({}).optional(),

  // KV operations
  kv_sort_json: z.object({
    content: z.string(),
  }).optional(),

  kv_check_stability: z.object({
    content: z.string(),
  }).optional(),

  // Tool masking
  tool_mask_state: z.object({}).optional(),

  // Memory operations
  memory_externalize: z.object({
    key: z.string().optional(),
  }).optional(),

  memory_restore: z.object({
    key: z.string().optional(),
  }).optional(),

  // TODO management
  todo_update: z.object({
    content: z.string().optional(),
    action: z.enum(["add", "complete", "clear"]).optional(),
    item: z.string().optional(),
  }).optional(),

  todo_read: z.object({}).optional(),

  // Error handling
  error_preserve: z.object({
    error: z.string(),
    context: z.string().optional(),
  }).optional(),

  error_patterns: z.object({}).optional(),

  // Response variation
  vary_response: z.object({
    base: z.string(),
    style: z.string().optional(),
  }).optional(),

  // Team coordination
  team_spawn: z.object({
    teamId: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  }).optional(),

  team_broadcast: z.object({
    message: z.string(),
    teamId: z.string().optional(),
  }).optional(),

  team_create_task: z.object({
    taskId: z.string(),
    description: z.string(),
    assignee: z.string().optional(),
  }).optional(),

  team_heartbeat: z.object({
    agentId: z.string(),
  }).optional(),

  // Budget management
  budget_get: z.object({}).optional(),
  budget_track: z.object({
    tokens: z.number(),
    category: z.string().optional(),
  }).optional(),
  budget_report: z.object({}).optional(),
  budget_reset: z.object({}).optional(),

  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-BUDGET-ADVISOR: 4 actions for
  // SessionBudgetAdvisorEngine — unified meta-advisor that fuses budget +
  // efficiency + hook + anti-pattern signals. Was orphan (no dispatcher ref).
  session_budget_advise: z.object({
    budgetMax: z.number().positive(),
    tokensUsed: z.number().min(0),
    hookSaves: z.number().min(0).optional(),
    hookBlocks: z.number().min(0).optional(),
    antiPatterns: z.array(z.string()).optional(),
    topExpensiveTool: z.string().optional(),
    topExpensiveTokens: z.number().min(0).optional(),
    toolCallCount: z.number().min(0).optional(),
    efficiencyScore: z.number().min(0).max(100).optional(),
  }).passthrough(),
  session_budget_one_liner: z.object({
    budgetMax: z.number().positive(),
    tokensUsed: z.number().min(0),
    toolCallCount: z.number().min(0).optional(),
    efficiencyScore: z.number().min(0).max(100).optional(),
  }).passthrough(),
  session_budget_should_compact: z.object({
    budgetMax: z.number().positive(),
    tokensUsed: z.number().min(0),
  }).passthrough(),
  session_budget_estimate_capacity: z.object({
    remaining: z.number().min(0),
  }).passthrough(),

  // Context intelligence
  attention_score: z.object({
    content: z.string(),
  }).optional(),

  focus_optimize: z.object({
    targets: z.array(z.string()).optional(),
  }).optional(),

  relevance_filter: z.object({
    items: z.array(z.string()),
    query: z.string(),
  }).optional(),

  context_monitor_check: z.object({}).optional(),

  // Catalog operations
  catalog_overview: z.object({}).optional(),
  catalog_search: z.object({
    query: z.string(),
    limit: z.number().optional(),
  }).optional(),
  catalog_engine: z.object({
    name: z.string(),
  }).optional(),
  catalog_stats: z.object({}).optional(),

  // ChatBus — live inter-chat messaging + file-claim registry (U-CHATBUS01)
  chat_post: z.object({
    sessionId: z.string().min(1).describe("stable session id of the posting chat"),
    pcName: z.string().min(1).describe("hostname of the posting chat"),
    kind: z.enum(["message", "claim", "release", "heartbeat"]).describe("message kind"),
    body: z.string().optional().describe("required when kind=message"),
    path: z.string().optional().describe("required when kind=claim|release"),
    intent: z.string().optional().describe("free-form intent tag for kind=claim"),
  }),

  chat_read: z.object({
    sessionId: z.string().min(1).describe("stable session id of the reading chat"),
  }),

  claim_file: z.object({
    sessionId: z.string().min(1).describe("stable session id claiming the file"),
    pcName: z.string().min(1).describe("hostname of the claiming chat"),
    path: z.string().min(1).describe("absolute file path to claim"),
    intent: z.enum(["edit", "write", "multi-edit", "read", "commit"]).optional().describe("claim intent; defaults to edit"),
  }),

  release_file: z.object({
    sessionId: z.string().min(1),
    pcName: z.string().min(1),
    path: z.string().min(1),
  }),

  presence: z.object({
    sessionId: z.string().min(1),
    pcName: z.string().min(1),
    meta: z.record(z.string(), z.unknown()).optional(),
  }),

  prune: z.object({
    messageRetentionMs: z.number().optional(),
    claimTtlMs: z.number().optional(),
    presenceTtlMs: z.number().optional(),
  }).optional(),

  // HOOK-SYNERGY-MS0/U-HOOK-COORD-SQLITE (H8): SQLite WAL backend for work claims.
  // Parallel surface to the ChatBus claim_file action — same semantics, faster
  // contention behavior under multi-chat load. Mode-switched so a single Zod
  // schema covers the full {claim,release,find,live,all,heartbeat,active_sessions,
  // prune,counts,health,migrate_from_json} action family.
  coord_sqlite: z.object({
    mode: z.enum([
      "claim", "release", "find", "live", "all",
      "heartbeat", "active_sessions",
      "prune", "counts", "health",
      "migrate_from_json",
    ]).describe(
      "Which coordination action to invoke: claim/release are write paths; " +
        "find/live/all/find_presence/active_sessions/counts/health are read paths; " +
        "prune is the janitor; migrate_from_json one-shot-seeds from " +
        "state/shared/WORK_CLAIMS.json.",
    ),
    resource_path: z.string().optional().describe("Target resource for claim/release/find."),
    session_id: z.string().optional().describe("Stable session id of the caller."),
    pc_name: z.string().optional(),
    hostname: z.string().optional(),
    pid: z.union([z.number(), z.string()]).optional(),
    intent: z.string().optional(),
    ttl_ms: z.union([z.number(), z.string()]).optional(),
    window_ms: z.union([z.number(), z.string()]).optional().describe("Active-sessions window (default presenceTtlMs)."),
    meta: z.record(z.string(), z.unknown()).optional().describe("Heartbeat metadata; size-guarded server-side."),
    source_path: z.string().optional().describe("Override for mode=migrate_from_json (defaults to state/shared/WORK_CLAIMS.json)."),
  }).passthrough(),

  // Context Priority — intelligent injection prioritization (U-CTXPRI01)
  priority_classify_task: z.object({
    prompt: z.string().describe("User prompt to classify"),
  }),

  priority_plan_injections: z.object({
    prompt: z.string().describe("User prompt to plan injections for"),
    items: z.array(z.object({
      id: z.string(),
      category: z.enum(["core", "domain", "reference", "procedural"]),
      tokens: z.number(),
      relevanceScore: z.number(),
      content: z.string(),
      lastInjectedTurn: z.number().optional(),
      decayFactor: z.number(),
    })).describe("Available context items"),
    tokenBudget: z.number().optional().describe("Token budget (default 10000)"),
  }),

  priority_compute_relevance: z.object({
    item: z.object({
      id: z.string(),
      category: z.enum(["core", "domain", "reference", "procedural"]),
      tokens: z.number(),
      relevanceScore: z.number(),
      content: z.string(),
      lastInjectedTurn: z.number().optional(),
      decayFactor: z.number(),
    }).describe("Context item to score"),
    classification: z.object({
      primaryDomain: z.string(),
      secondaryDomains: z.array(z.string()),
      taskType: z.enum(["build", "debug", "analyze", "explore", "optimize", "wire", "test", "other"]),
      urgency: z.enum(["immediate", "standard", "background"]),
      complexity: z.enum(["simple", "moderate", "complex"]),
    }).describe("Task classification"),
  }),

  priority_stats: z.object({}).optional(),

  priority_reset: z.object({}).optional(),

  // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH1: Token Economy ──
  token_economy_get_budget: z.object({
    task_class: z.enum(["backend", "web", "cad_python", "roadmap", "audit", "speed_feed", "post_process", "erp", "general"]).describe("Task class for budget profile"),
    multiplier: z.number().positive().max(10).optional().describe("Optional scaling factor"),
  }),
  token_economy_record_spending: z.object({
    session_id: z.string().min(1).describe("Session id"),
    task_class: z.enum(["backend", "web", "cad_python", "roadmap", "audit", "speed_feed", "post_process", "erp", "general"]).describe("Task class"),
    actual: z.object({
      context_loading: z.number().min(0).describe("Context-loading tokens"),
      tool_calls: z.number().min(0).describe("Tool-call tokens"),
      reasoning: z.number().min(0).describe("Reasoning tokens"),
      output: z.number().min(0).describe("Output tokens"),
    }).describe("Actual token use breakdown"),
  }),
  token_economy_detect_waste: z.object({
    tool_call_count: z.number().int().min(0).describe("Total tool calls"),
    file_reads_count: z.number().int().min(0).describe("Total file reads"),
    unique_files_read: z.number().int().min(0).describe("Distinct files read"),
    search_count: z.number().int().min(0).describe("Search-tool calls"),
    agent_spawn_count: z.number().int().min(0).describe("Sub-agents spawned"),
  }),
  token_economy_report: z.object({}).optional(),

  token_accounting_record: z.object({
    tool: z.string().min(1).describe("Tool name (e.g. Bash, Read)"),
    tokens_in: z.number().int().min(0).describe("Input tokens"),
    tokens_out: z.number().int().min(0).describe("Output tokens"),
  }),
  token_accounting_report: z.object({}).optional(),

  token_budget_allocate: z.object({
    total_budget: z.number().int().positive().describe("Total tokens to allocate (system reserve 5000 deducted)"),
    phases: z.array(z.object({
      name: z.string().describe("Phase name"),
      priority: z.number().int().min(1).max(5).describe("Priority — 1 critical, 5 optional (lower = higher precedence)"),
      estimatedTokens: z.number().int().min(0).describe("Estimated token cost"),
      minTokens: z.number().int().min(0).describe("Minimum required tokens (phase dropped if not met)"),
      flexible: z.boolean().describe("Whether phase tolerates surplus/cut"),
    })).min(1).describe("Phases competing for budget"),
  }),
  token_budget_can_afford: z.object({
    remaining_budget: z.number().int().min(0).describe("Tokens remaining"),
    estimated_cost: z.number().int().min(0).describe("Estimated cost of next op"),
    must_reserve: z.number().int().min(0).optional().describe("Floor reservation (default 10000)"),
  }),

  diff_token_uncommitted: z.object({}).optional(),
  diff_token_staged: z.object({}).optional(),
  diff_token_between: z.object({
    from: z.string().min(1).describe("From ref (sha or branch)"),
    to: z.string().optional().describe("To ref (default HEAD)"),
  }),
  diff_token_last_commits: z.object({
    n: z.number().int().min(1).max(50).optional().describe("Commit count (default 1)"),
  }),

  // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH2: Context Advanced ──
  context_digest_file: z.object({
    path: z.string().min(1).describe("File path (used for type classification)"),
    content: z.string().describe("File contents to digest"),
  }),
  context_window_add: z.object({
    type: z.enum(["system", "file", "tool-output", "conversation", "memory", "error", "other"]).describe("Segment type"),
    label: z.string().min(1).describe("Human-readable label"),
    tokens: z.number().int().min(0).describe("Token estimate"),
  }),
  context_integrity_check_edit: z.object({
    path: z.string().min(1).describe("Absolute or repo-relative path being edited"),
  }),
  context_snapshot_create: z.object({
    workingFiles: z.array(z.string()).optional().describe("Currently-open files"),
    recentCommits: z.array(z.string()).optional().describe("Recent commit subjects"),
    activeTask: z.string().optional().describe("Current task description"),
    keyDecisions: z.array(z.string()).optional().describe("Decisions made this session"),
    nextSteps: z.array(z.string()).optional().describe("Next-action queue"),
    engineCount: z.number().int().min(0).optional().describe("Engine count snapshot"),
    testCount: z.number().int().min(0).optional().describe("Test count snapshot"),
  }),
  context_compaction_create_context: z.object({
    maxTokens: z.number().int().positive().optional().describe("Optional max-tokens limit"),
  }),
  context_retention_extract_facts: z.object({
    text: z.string().min(1).describe("Text to scan for critical facts"),
  }),
  context_error_from_build: z.object({
    error_text: z.string().min(1).describe("Build error output"),
  }),

  // ── AI-MAX-MS0/U-AIMAX07: ContextCompression ──
  compression_compress: z.object({
    id: z.string().min(1).describe("Stable identifier for the compressed item"),
    content: z.string().describe("Raw content to compress"),
    priority: z.enum(["critical", "high", "medium", "low", "ephemeral"]).describe("Priority tier — controls compression policy"),
    kind: z.string().optional().describe("Optional content kind (tool_result|file|assistant|user|other)"),
  }),
  compression_batch: z.object({
    items: z.array(z.object({
      id: z.string().min(1),
      content: z.string(),
      priority: z.enum(["critical", "high", "medium", "low", "ephemeral"]),
      kind: z.string().optional(),
    })).min(1).describe("Batch of items to compress in one pass"),
  }),
  compression_expand: z.object({
    handle: z.string().min(1).describe("Opaque handle returned by a prior compress() call"),
  }),
  compression_has: z.object({
    handle: z.string().min(1).describe("Handle to check for expandability"),
  }),
  compression_policy: z.object({
    set: z.object({
      headChars: z.number().finite().int().optional(),
      tailChars: z.number().finite().int().optional(),
      maxEntities: z.number().finite().optional(),
      minEntityLen: z.number().finite().int().optional(),
      maxEntityLen: z.number().finite().int().optional(),
      minRatio: z.number().finite().optional(),
    }).optional().describe("Optional policy patch — omit to fetch current policy. Engine enforces non-negative + min-ratio invariants."),
  }).optional(),
  compression_stats: z.object({}).optional(),

  // ── AI-MAX-MS0/U-AIMAX08: ContextCheckpoint ──
  checkpoint_record_edit: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
  }),
  checkpoint_should: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
  }),
  checkpoint_create: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
    summary: z.string().describe("Short text summary of session state"),
    pendingTasks: z.array(z.string()).optional(),
    filesInFlight: z.array(z.object({
      path: z.string(),
      role: z.enum(["reading", "editing", "created", "deleted"]),
      status: z.enum(["in_progress", "saved", "abandoned"]),
    })).optional(),
    recentDecisions: z.array(z.string()).optional(),
    memoryAnchors: z.array(z.string()).optional(),
    handoffDirective: z.string().describe("Next-action one-liner for the resuming chat"),
  }),
  checkpoint_latest: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
  }),
  checkpoint_list: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
  }),
  checkpoint_recover: z.object({
    sessionId: z.string().min(1).describe("Session identifier"),
  }),
  checkpoint_ingest: z.object({
    snapshot: z.record(z.string(), z.unknown()).describe("Full CheckpointSnapshot payload (schema-versioned)"),
  }),
  checkpoint_config: z.object({
    set: z.object({
      thresholds: z.array(z.number().finite().int().positive()).min(1).optional(),
      maxBytes: z.number().finite().int().min(1024).optional(),
      maxCheckpointsPerSession: z.number().finite().int().positive().optional(),
    }).optional().describe("Optional config patch — omit to fetch current config. Engine additionally enforces strict-ascending thresholds."),
  }).optional(),
};

// Context Priority — intelligent injection prioritization (U-CTXPRI01)
// Added to ACTION_CONTEXT_SCHEMAS above via sed insertion
