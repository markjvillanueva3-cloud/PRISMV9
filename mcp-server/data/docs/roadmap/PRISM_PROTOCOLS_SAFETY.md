# PRISM PROTOCOLS - SAFETY (loaded during R2+ calculation and safety phases)
# Split from PRISM_PROTOCOLS_CORE.md on 2026-02-17 (Roadmap Audit Finding 1+14)
# Contains: Opus Config, Tolerance Table, Response Budget, Ralph/Omega, Context Rules
# Boot protocols: PROTOCOLS_BOOT.md | Code standards: PROTOCOLS_CODING.md

---

## OPUS 4.6 CONFIGURATION

<!-- ANCHOR: pc_compaction_api_replaces_cms_v2_0 -->
### COMPACTION API (replaces CMS v2.0)

```
PURPOSE: Server-side context summarization. Handles context overflow automatically.
         Eliminates manual pressure gating, 4-mode degradation, and 3-layer recovery cascade.
         Net savings: ~1.8K tokens/session in framework load + 0 dead sessions.

CONFIGURATION (wire into MCP server's Anthropic API client):
  context_management: {
    edits: [{
      type: "compact_20260112",
      trigger: { type: "input_tokens", value: 150000 },
      instructions: "Preserve: current MS position, current step number within MS,
        last completed step-group, active phase,
        all file paths written to, all calc results not yet flushed to disk, all FAIL/BLOCKED
        statuses, registry counts, Omega baseline, material names and their safety scores,
        intermediate variables (task_ids, file paths from code_search, count baselines).
        Discard: tool response details already flushed to files, completed MS definitions,
        diagnostic output from PASS results, health check details, list outputs.",
      pause_after_compaction: false
    }]
  }

BETA HEADER: anthropic-beta: compact-2026-01-12

WHAT STILL LIVES ON DISK (unchanged from v12.2):
  CURRENT_POSITION.md, ROADMAP_TRACKER.md, ACTION_TRACKER.md,
  CURRENT_STATE.json, COMPACTION_SURVIVAL.json, RECENT_ACTIONS.json
  These survive ANY compaction method. They are your cross-session ground truth.

FALLBACK (for claude.ai sessions where API config is not directly controllable):

  === AVOIDANCE ===
  Flush non-regenerable results to disk after each group.
  prism_context action=context_compress at >60% pressure.
  If >75%: save state + position, end session cleanly. DO NOT squeeze in more work.

  === DETECTION (run at start of any response where context looks empty) ===
  Ask yourself 3 questions:
    Q1: Can I recall the last 3 tool calls I made this session? → NO = probable compaction.
    Q2: Do I have prior turns visible but RECENT_ACTIONS.json has entries? → compaction confirmed.
    Q3: Does _COMPACTION_RECOVERY exist with timestamp < 5 min? → compaction confirmed.
  ANY = YES → go to Recovery below.
  FALSE POSITIVE CHECK: If state_load shows no active MS, no history → brand new session. Run Boot.

  === RECOVERY CASCADE (12-call ceiling across all layers) ===
  LAYER 1 — Standard (handles 85%): ~5 calls
    1. prism_session action=state_load → get session_id, call_count
    2. prism_doc action=read name=CURRENT_POSITION.md → current MS, phase
       (fallback: ROADMAP_TRACKER.md last 5 entries)
    3. RELOAD active phase doc → jump to active MS section only
    4. prism_doc action=read name=ACTION_TRACKER.md → find last step-group/sub-checkpoint
    5. Resume from NEXT step-group. DO NOT re-run completed work.
    If position clear → DONE. If unclear → Layer 2.

  LAYER 2 — Deep (handles 10%): ~4 more calls
    PREREQUISITE: COMPACTION_SURVIVAL.json requires 15+ calls in session.
    RECENT_ACTIONS.json requires 10+ calls. If session dies before these thresholds,
    Layer 2 falls through to Layer 3 (which always works). This is by design.

    EARLY SURVIVAL WRITE (SD-3): Write a minimal COMPACTION_SURVIVAL.json at call 10
    (not 15). Contents: { phase, ms, last_step_group, call_count: 10 }.
    WHY: Compaction can trigger at 25-30 calls. With a 15-call prerequisite, there's only
    a 10-15 call window for Layer 2 to work. At call 10, there's a 15-20 call window.
    The @15 cadence function UPDATES this file with richer data. The @10 write is a safety net.
    Also: update CURRENT_POSITION.md every 3 calls instead of every 5.

    1. Read COMPACTION_SURVIVAL.json + RECENT_ACTIONS.json (first 50 lines)
    2. Triangulate: ACTION_TRACKER + SURVIVAL + RECENT_ACTIONS → last agreed-complete step
    3. Use EARLIER (conservative) position if sources conflict
    4. Reload phase doc, resume. If still unclear → Layer 3.

  LAYER 3 — Emergency (handles 5%, always works): ~2 calls
    1. Read ROADMAP_TRACKER.md → find last MS marked COMPLETE
    2. Restart from BEGINNING of NEXT MS. May redo partial work. That's OK.
    Recovery complete. Always.

  RULES FOR ALL LAYERS:
    DO NOT ask user if compacted. DO NOT apologize. Just recover and continue.
    DO NOT re-read MASTER_INDEX.md or PRISM_PROTOCOLS_CORE.md during recovery.
    DO NOT re-run Phase Boundary Smoke Test during recovery.
    Check Idempotency Classification before re-running any state-modifying step.

  COMPACTION TELEMETRY (zero-cost measurement — IA2-3.1):
    When recovery cascade fires (any layer), append to ROADMAP_TRACKER:
      "[date] COMPACTION-RECOVERY: Layer [N] at [MS-ID] step [N], pressure [%] at trigger"
    This piggybacks on the existing ROADMAP_TRACKER append — no extra call needed.
    At each phase gate, count COMPACTION-RECOVERY entries for that phase:
      If count > 3 per phase → context budget is too aggressive. Increase flush frequency.
      If count = 0 across P0 → current budget is comfortable. Reduce flush frequency.
    Record count in PHASE_FINDINGS.md: "Phase [X]: [N] compaction recoveries."

  RAPID-COMPACTION DETECTION (v14.3):
    IF ROADMAP_TRACKER shows 2+ COMPACTION-RECOVERY entries in the current session:
      → Switch to ULTRA-MINIMAL MODE:
        - Load ONLY PRISM_RECOVERY_CARD.md (skip MASTER_INDEX and PROTOCOLS_CORE reload)
        - Skip skill loading and hook enabling (saves ~2K tokens)
        - Update CURRENT_POSITION.md every 2 calls instead of every 3
        - Flush to disk after EVERY step (not every step-group)
        - Skip context_compress (compaction is handling that involuntarily)
        - Focus on completing ONE step per recovery cycle
      → WHY: Repeated compactions leave ~10-15 calls of useful work per cycle.
        Full boot + doc loading burns ~8 of those calls. Ultra-minimal burns ~2.
        Net: 3x more productive work per compaction cycle.
```

<!-- ANCHOR: pc_adaptive_thinking_effort_tiers -->
### ADAPTIVE THINKING + EFFORT TIERS

```
PURPOSE: Allocate reasoning depth based on operation criticality.
         Safety calcs get MAX reasoning. Health checks get LOW.
         This DIRECTLY improves safety-critical calculation confidence.

CONFIGURATION:
  thinking: { type: "adaptive" }    ← replaces thinking: { type: "enabled", budget_tokens: N }
  effort: "[level]"                 ← per-action, see classification below

EFFORT TIER CLASSIFICATION (apply to every API call through PRISM):

  MAX — Lives depend on correctness. Deepest reasoning. Higher latency accepted.
    safety, cutting_force, speed_feed, tool_life, spindle_speed
    ralph_loop, ralph_assess, omega_compute
    toolpath (any calculation where S(x) is evaluated)
    pfp_analyze (predictive failure — R3+)

  HIGH — Data retrieval with reasoning. Default effort level.
    material_get, alarm_decode, thread_specs, tap_drill, gcode
    knowledge_search, code_search, brainstorm, plan
    swarm_execute (when coordinating safety-relevant work)

  MEDIUM — Operational tasks with moderate complexity.
    build, skill_find_for_task, hook_coverage, hook_register
    swarm_execute (non-safety), agent_execute (non-safety)
    nl_hook_create, compliance_check

  LOW — Pure reads/writes. No reasoning needed. Fastest response.
    health, list, stats, bridge_health, context_monitor_check
    state_save, state_load, todo_update, file_read, file_write
    task_list, memory_store, memory_recall, gsd_quick

IMPLEMENTATION: Map effort in the MCP server's API call wrapper:

  // src/config/effortTiers.ts — TYPE-SAFE, EXHAUSTIVE
  const EFFORT_LEVELS = ['max', 'high', 'medium', 'low'] as const;
  type EffortLevel = typeof EFFORT_LEVELS[number];

  // Derive ActionName from dispatcher registry — NOT manually maintained.
  // If a new action is added without an effort mapping, TypeScript errors at compile time.
  // type ActionName = keyof typeof ACTION_REGISTRY;
  // For bootstrapping before full registry type exists, use explicit union:
  type ActionName = 'safety' | 'cutting_force' | 'speed_feed' | 'tool_life' | 'spindle_speed'
    | 'ralph_loop' | 'ralph_assess' | 'omega_compute' | 'toolpath' | 'pfp_analyze'
    | 'material_get' | 'alarm_decode' | 'thread_specs' | 'tap_drill' | 'gcode'
    | 'knowledge_search' | 'code_search' | 'brainstorm' | 'plan' | 'swarm_execute'
    | 'build' | 'skill_find_for_task' | 'hook_coverage' | 'hook_register'
    | 'agent_execute' | 'nl_hook_create' | 'compliance_check'
    | 'health' | 'list' | 'stats' | 'bridge_health' | 'context_monitor_check'
    | 'state_save' | 'state_load' | 'todo_update' | 'file_read' | 'file_write'
    | 'task_list' | 'memory_store' | 'memory_recall' | 'gsd_quick';

  const EFFORT_MAP: Record<ActionName, EffortLevel> = {
    safety: 'max', cutting_force: 'max', speed_feed: 'max', tool_life: 'max',
    spindle_speed: 'max', ralph_loop: 'max', ralph_assess: 'max', omega_compute: 'max',
    toolpath: 'max', pfp_analyze: 'max',
    material_get: 'high', alarm_decode: 'high', thread_specs: 'high', tap_drill: 'high',
    gcode: 'high', knowledge_search: 'high', code_search: 'high', brainstorm: 'high',
    plan: 'high', swarm_execute: 'high',
    build: 'medium', skill_find_for_task: 'medium', hook_coverage: 'medium',
    hook_register: 'medium', agent_execute: 'medium', nl_hook_create: 'medium',
    compliance_check: 'medium',
    health: 'low', list: 'low', stats: 'low', bridge_health: 'low',
    context_monitor_check: 'low', state_save: 'low', state_load: 'low',
    todo_update: 'low', file_read: 'low', file_write: 'low',
    task_list: 'low', memory_store: 'low', memory_recall: 'low', gsd_quick: 'low',
  } satisfies Record<ActionName, EffortLevel>;

  // Runtime fallback for dynamic/plugin actions not in the compile-time type
  export function getEffort(action: string): EffortLevel {
    if (action in EFFORT_MAP) return EFFORT_MAP[action as ActionName];
    console.error(`[PRISM] Unknown action "${action}" — defaulting to MAX (safety-critical fallback)`);
    return 'max'; // NOT 'high' — unknown actions get DEEPEST reasoning. In safety-critical,
                   // over-reasoning is safe; under-reasoning is dangerous. A typo like
                   // 'speed_feeed' silently getting 'high' instead of 'max' = reduced safety.
  }

  // BOOT-TIME ACTION AUDIT (run once at server startup):
  // Log all actions discovered at runtime. Compare against EFFORT_MAP keys.
  // Any action NOT in EFFORT_MAP is logged as WARN at boot — visible, not buried in per-call noise.
  // export function auditEffortMap(registeredActions: string[]): void {
  //   const mapped = new Set(Object.keys(EFFORT_MAP));
  //   for (const action of registeredActions) {
  //     if (!mapped.has(action))
  //       console.warn(`[PRISM BOOT] Action "${action}" has no effort mapping — will default to MAX`);
  //   }
  // }

  WHY THIS MATTERS: A Record<string, string> silently returns undefined for unmapped actions.
  In safety-critical, undefined effort = uncontrolled reasoning depth on safety calcs.
  The 'satisfies' keyword + union type make missing actions a COMPILE ERROR, not a runtime silent pass.
  The runtime fallback defaults to 'max' (safest), never 'low' (permissive) or 'high' (insufficient for safety).
  The boot-time audit catches typos at startup, not buried in per-call logs during execution.
```

<!-- ANCHOR: pc_structured_output_schemas -->
### STRUCTURED OUTPUT SCHEMAS

```
PURPOSE: Guarantee response structure for safety-critical calculations.
         The model CANNOT return malformed data — no NaN, no missing fields, no type errors.
         In a system where wrong numbers cause tool explosions, this is an engineering obligation.

CONFIGURATION: output_config: { format: { type: "json_schema", schema: {...} } }
  NOTE: output_format is deprecated → use output_config.format

SAFETY CALC SCHEMA (apply to speed_feed, cutting_force, tool_life, spindle_speed):
  {
    type: "object",
    properties: {
      Vc:            { type: "number", exclusiveMinimum: 0, maximum: 2000 },
      fz:            { type: "number", exclusiveMinimum: 0, maximum: 10 },
      ap:            { type: "number", exclusiveMinimum: 0, maximum: 100 },
      Fc:            { type: "number", exclusiveMinimum: 0, maximum: 100000 },
      n_rpm:         { type: "number", exclusiveMinimum: 0, maximum: 100000 },
      tool_life_min: { type: "number", exclusiveMinimum: 0, maximum: 10000 },
      safety_score:  { type: "number", minimum: 0, maximum: 1.0 },
      warnings:      { type: "array", items: { type: "string" } },
      material:      { type: "string", minLength: 1 },
      operation:     { type: "string", minLength: 1 }
    },
    required: ["Vc", "fz", "ap", "safety_score", "material", "operation"],
    additionalProperties: false
  }

  PHYSICAL BOUNDS RATIONALE (upper limits based on manufacturing reality):
    Vc <= 2000 m/min:  Covers fastest aluminum HSM. Above = unit error or overflow.
    fz <= 10 mm/tooth: Covers roughing inserts. Above = physically impossible.
    ap <= 100 mm:      Covers deep slotting. Above = no standard tool exists.
    Fc <= 100000 N:    Covers heavy roughing. Above = machine structural limit exceeded.
    n_rpm <= 100000:   Covers micro-tools at high speed. Above = no spindle exists.
    tool_life <= 10000 min: ~167 hours. Above = unrealistic for any insert.

  WHY ALL CUTTING PARAMS ARE REQUIRED:
    Old schema required only safety_score. A response of { safety_score: 0.85 } with
    NO Vc, fz, or Fc would pass validation — an operator gets a safety-approved
    recommendation with zero actual cutting parameters. All physical outputs required.

  WHY exclusiveMinimum (not minimum):
    Vc=0 is a stopped spindle. fz=0 is a stalled tool. Fc=0 is impossible if cutting.
    These are physically meaningless but pass minimum:0. exclusiveMinimum rejects them.

  WHY additionalProperties: false:
    Prevents unexpected fields from leaking through. If a new field is needed,
    add it to the schema explicitly — don't silently accept undeclared data.

CROSS-FIELD PHYSICS VALIDATION (post-schema imperative checks — SK-1):
  JSON Schema validates fields independently. It CANNOT validate physical relationships.
  A result of { Vc: 300, fz: 0.8, Fc: 500, safety_score: 0.72 } for Inconel 718
  passes every field bound but Fc should be ~8000-12000N at those parameters.
  The schema creates a false sense of security without these additional checks.

  AFTER structured output schema validation passes, run imperative physics checks:
    // src/validation/crossFieldPhysics.ts — create in P0-MS0, validate in R2
    export function validateCrossFieldPhysics(result: SafetyCalcResult): void {
      // 1. RPM consistency: n_rpm ≈ (Vc × 1000) / (π × D) — if D is known
      //    If n_rpm and Vc are both present, verify consistency within 5%.

      // 2. Force plausibility: Fc must scale with material hardness
      //    Inconel/Ti: Fc > 2000N at Vc > 80 m/min (cannot have low force on hard materials)
      //    Aluminum: Fc < 3000N at Vc > 200 m/min (cannot have high force on soft materials)

      // 3. Tool life vs speed inverse: higher Vc → lower tool_life (Taylor's law)
      //    If Vc increased 20% from reference, tool_life must decrease (not increase or stay flat).

      // 4. Feed rate vs material class: fz limits vary by material hardness
      //    Superalloys (Inconel, Waspaloy): fz > 0.5 is physically dangerous at any speed.

      // Violations throw SafetyBlockError with S(x)=0.0 (physically impossible results are never safe).
    }
  THIS IS THE SINGLE MOST IMPORTANT SAFETY ADDITION IN v13.5.
  Schema validation guarantees structure. Cross-field validation guarantees physics.

CALC RESULT VERSIONING (traceability for audits — AG-2):
  Every safety calc response MUST include a meta block for reproducibility:
    meta: {
      model: string,          // e.g., "claude-opus-4-6"
      formula_version: string, // e.g., "kienzle-1.2"
      data_version: string,    // e.g., "material-registry-2026-02-14"
      timestamp: string        // ISO 8601
    }
  Add to SAFETY CALC SCHEMA: "meta" as required object with these 4 required string fields.
  WHY: ISO audit asks "show the calculation from January 15." Without versioning, the same
  inputs produce different outputs after model updates or formula changes. The meta block
  enables full reproducibility. Cost: ~50 bytes per result. Value: audit compliance.

ALARM DECODE SCHEMA (apply to alarm_decode):
  {
    type: "object",
    properties: {
      controller: { type: "string", minLength: 1 },
      alarm_code: { type: "string", minLength: 1 },
      description: { type: "string", minLength: 1 },
      severity: { type: "string", enum: ["info","warning","error","critical"] },
      resolution_steps: { type: "array", items: { type: "string" } }
    },
    required: ["controller", "alarm_code", "description", "severity"],
    additionalProperties: false
  }

ALARM DECODE TOLERANCE NOTE (SK-4):
  R2_TOLERANCES.alarm_decode = 0.00 means exact match on STRUCTURED FIELDS, not free text.
  Controller: exact. Alarm_code: exact. Severity: exact.
  Description: similarity >= 0.90 (normalized Levenshtein or token overlap).
  WHY: 12 controller families use different wording for the same alarm. FANUC says
  "SERVO ALARM: EXCESS ERROR" while the knowledge base says "excessive position error."
  Both are correct. Exact string match fails on every alarm. Structured-field match works.

HEALTH SCHEMA (validate at every boot — Step 1.1):
  {
    type: "object",
    properties: {
      status: { type: "string", enum: ["ok", "degraded", "error"] },
      dispatchers: { type: "integer", minimum: 0 },
      heap_used_mb: { type: "number", minimum: 0 },
      uptime_s: { type: "number", minimum: 0 },
      registry_status: {
        type: "object",
        properties: {
          materials: { type: "string", enum: ["ok", "degraded", "error", "empty"] },
          machines: { type: "string", enum: ["ok", "degraded", "error", "empty"] },
          tools: { type: "string", enum: ["ok", "degraded", "error", "empty"] },
          alarms: { type: "string", enum: ["ok", "degraded", "error", "empty"] }
        },
        required: ["materials", "machines", "tools", "alarms"]
      },
      opus_config: {
        type: "object",
        properties: {
          adaptive_thinking: { type: "boolean" },
          compaction_api: { type: "boolean" },
          effort_tiers: { type: "boolean" },
          structured_outputs: { type: "boolean" },
          prefilling_removed: { type: "boolean" }
        },
        required: ["adaptive_thinking","compaction_api","effort_tiers",
                   "structured_outputs","prefilling_removed"]
      }
    },
    required: ["status", "dispatchers", "heap_used_mb", "uptime_s"],
    additionalProperties: false
  }
  WHY registry_status: Health can report status:"ok" + dispatchers:31 when 4 registries
  failed to load. The dispatchers EXIST but return empty data. Without registry_status,
  the executor proceeds into calcs that fail with "material not found" — debugging points
  to the calc code when the real problem is a boot-time data load failure.
  WHY: Health is called every session. If it returns undefined dispatchers,
  'undefined < 31' is false — the regression check silently passes. Schema prevents this.

HOW STRUCTURED OUTPUTS WORK (executor guide):
  Structured outputs are enforced at the MCP SERVER level, not the caller level.
  After P0-MS0 wires the schemas into the dispatcher code, ALL calls to:
    prism_calc (speed_feed, cutting_force, tool_life, spindle_speed)
    prism_validate action=safety
    prism_data action=alarm_decode
    prism_dev action=health
  ...automatically enforce their schema. The executor does NOT pass a schema parameter.
  When the roadmap says "[effort=max, structured output]" it means:
    1. The call uses effort=max (deepest reasoning)
    2. The RESPONSE is guaranteed well-formed by the schema (no NaN, no missing fields)
  If you call prism_calc action=speed_feed and the response is missing 'Vc' or has Vc=0 →
  the structured output schema is NOT wired correctly. Return to P0-MS0 step 12 and fix.
```

<!-- ANCHOR: pc_parallel_execution_agent_teams -->
### PARALLEL EXECUTION (Agent Teams)

```
PURPOSE: Run independent operations concurrently via Agent Teams.
         Reduces P0-MS8 from ~45 sequential calls to ~20 effective calls.
         Reduces R2-MS0 material groups to parallel execution.

PATTERN (for independent chain/calc groups):
  prism_orchestrate action=swarm_execute
    pattern="parallel_batch"
    tasks=[independent_operations]
  → Wait for all → execute dependent operations sequentially

WHERE APPLIED:
  P0-MS8: Chains 1,2,3,4,6,7,8,9,10,12 run parallel. Chains 5,11,13,14 run after dependencies.
  R2-MS0: Material groups within each category run parallel (4140,1045,4340,D2,316SS concurrent).
  R3: Batch campaigns (50 materials/batch) run via parallel_batch swarm.

SAFETY RULE: Parallel execution NEVER changes individual chain/calc results.
  Each parallel agent operates on independent data. No shared mutable state.
  Dependent operations ALWAYS wait for their dependencies to complete.
  If ANY parallel operation fails, the entire group is treated as FAIL.

PER-TASK TIMEOUT (CB-1):
  Each task within a parallel_batch MUST have its own abort boundary.
  Default per-task timeout: 2 × median completion time of peers, minimum 60s, maximum 300s.
  If a task exceeds timeout → mark it TASK-TIMEOUT, do NOT hang the entire batch.
  WHY: A hung calc on one exotic material with bad kc1_1 data (infinite loop in force formula)
  blocks the entire batch forever. Per-task timeout isolates the failure.

ORDERING RULE: Parallel results arrive in non-deterministic order.
  BEFORE flushing to any results file, SORT by stable key:
    Calc results: sort by material.localeCompare() then operation.localeCompare()
    Chain results: sort by chain number (integer)
  WHY: Unsorted flushes make diff-based regression testing unreliable (same correct
  results in different order = false diff). Also prevents misattribution if downstream
  processes assume ordering (e.g., "first 25 results are Group A").
  FORMAT: Use keyed entries, not positional: [4140:turning] Vc=180, S(x)=0.82

SWARM PATTERN SELECTION (which pattern for which job):
  prism_orchestrate has 8 swarm patterns. Use the right one:

  parallel_batch:     Independent operations, identical structure, different inputs.
                      USE FOR: R2 calcs (50 materials), R3 batches, P0 integration chains.
                      RULE: Every task must be fully independent. No shared mutable state.
                      EXAMPLE: prism_orchestrate action=swarm_execute pattern="parallel_batch"
                        tasks=["speed_feed 4140 turning", "speed_feed 1045 turning", ...]

  sequential_chain:   Operations where output N feeds input N+1.
                      USE FOR: Manufacturing chain (S3.5), Thread chain (S3.6), Quality chain (S3.10).
                      RULE: If step N fails, the chain STOPS. No partial chain execution.
                      EXAMPLE: prism_orchestrate action=swarm_execute pattern="sequential_chain"
                        tasks=["material_get 4140", "speed_feed", "spindle_speed", "safety"]

  map_reduce:         Large dataset → parallel map → single reduce aggregation.
                      USE FOR: R3 full-library validation (map: calc each material, reduce: aggregate stats).

PARALLEL RESULT CONTRACT (JSON schema for agent results — IA-6.1):
  Every parallel task MUST return results as a JSON object (not free-text string parsing):
    {
      chain_id: number,
      status: "PASS" | "FAIL" | "TIMEOUT" | "ERROR",
      outputs: Record<string, unknown>,   // key-value pairs consumed by dependent chains
      errors?: string[],                   // error messages if status != PASS
      duration_ms: number
    }
  
  The orchestrator aggregates results into:
    { completed: ChainResult[], failed: ChainResult[], timed_out: ChainResult[] }
  
  Dependent chains access prior results via:
    orchestrator.getResult(chain_id) → ChainResult | null
  
  WHY: The v13.5 string format "[Chain N] status=PASS key=value" breaks on edge cases
  (keys with spaces, values with equals signs, multi-line outputs). JSON contract is
  unambiguous and the MCP server can validate it at schema level.

SUBAGENT RESULT BUDGET (context protection — IA-6.3):
  Each subagent MUST summarize its result to < 500 bytes before returning to parent.
  Summary format: { chain_id, status, key_outputs: { field: value }, error_summary? }
  Full results are flushed to disk by the subagent BEFORE returning.
  
  The parent receives summaries only (10 × 500B = 5KB, not 10 × 5KB = 50KB).
  If the parent needs full results → read from the flushed file.
  
  WHY: 10 parallel chains at full verbosity would consume 30-50KB of parent context.
  Summaries + disk flush keeps parent context under 10KB for any parallel phase.

SUBAGENT TOOL ACCESS (schema scoping — IA-1.1):
  Spawned agents via swarm_execute receive the SAME dispatcher surface as the parent.
  No schema duplication — the MCP server serves one tool schema to all agents.
  SCOPING RULE: If a swarm task only needs prism_calc + prism_data, the task definition
  should specify scope: ["prism_calc", "prism_data"]. The orchestrator passes only those
  schemas to the subagent, reducing per-agent overhead by ~80%.
  DEFAULT: If no scope specified, full dispatcher surface is passed (safe but token-heavy).
  IMPLEMENT: R4+ when agent invocation volume justifies the optimization.

ORCHESTRATOR FAILURE HANDLING (IA-6.2):
  IF swarm_execute itself times out (>300s with no partial results):
    1. Fall back to sequential execution of the same tasks.
    2. Log: "ORCHESTRATOR-TIMEOUT — falling back to sequential."
    3. Sequential execution uses the same effort tiers and schemas.
    4. Results are identical but slower. No architectural impact.
  
  IF swarm_execute returns an error (not timeout):
    1. Read the error message. Task-level error or orchestrator-level error?
    2. Task-level: re-run only the failed task(s) via single prism_calc calls.
    3. Orchestrator-level: fall back to sequential for the entire batch.
    4. Document the error in ACTION_TRACKER for future debugging.
  
  RULE: Parallel execution is an OPTIMIZATION, not a REQUIREMENT.
  Any parallel batch can always fall back to sequential with identical results.

COMPACTION DURING PARALLEL EXECUTION (IA-3.2):
  If compaction occurs while swarm_execute is active:
    1. Results already received are IN the compaction summary (preserved by COMPACTION_INSTRUCTIONS).
    2. Results not yet received are LOST (agents may still run but results can't return).
    3. RECOVERY: Re-run the entire parallel_batch. Idempotent — same inputs produce same outputs.
       Do NOT try to determine which tasks completed. Re-running all is cheaper than debugging.
    4. Before re-run: verify prior partial results were flushed. If flushed → skip those tasks.
       If NOT flushed → re-run all.
  This is the ONLY scenario where re-execution cost exceeds a few calls. Budget accordingly.
                      RULE: Map tasks are independent. Reduce waits for ALL maps.
                      EXAMPLE: prism_orchestrate action=swarm_execute pattern="map_reduce"
                        map_tasks=[...250 material calcs...] reduce_task="aggregate_stats"

  fan_out_fan_in:     One input → many parallel tasks → collect all results.
                      USE FOR: R6 stress testing (one request → many concurrent calc requests).

  pipeline:           Streaming data through stages (like Unix pipes).
                      USE FOR: R4 log processing pipeline.

  DEFAULT SELECTION RULE:
    If tasks share NO state → parallel_batch.
    If output feeds next input → sequential_chain.
    If many tasks reduce to one answer → map_reduce.
    When in doubt → parallel_batch (safest — treats each task independently).

  PARALLEL TASK LIMITS (IA2-6.1):
    parallel_batch: Maximum 10 concurrent tasks. If >10 tasks, chunk into batches of 10.
    map_reduce: Map phase limited to 10 concurrent mappers. Queue remainder.
    fan_out_fan_in: Maximum 10 concurrent fan-out tasks.
    WHY: Each parallel task consumes one Anthropic API slot. 10 concurrent at effort=max
    consumes significant quota. At 50 concurrent, rate limits are guaranteed.
    The R3 batch size of 10 materials is calibrated to this limit.
    OVERRIDE: If Usage Tier 5+ with higher rate limits, increase to 20. Document in .env.

  PROGRESS VISIBILITY (R3+ optimization — implement when batch duration exceeds 5 min — IA3-6.1):
    prism_orchestrate action=swarm_status → returns per-task progress:
      { tasks: [{ id: N, status: "running"|"complete"|"timeout"|"error", elapsed_ms: N }] }
    Call swarm_status every 120s during long-running parallel batches.
    If >50% of tasks are complete and 1-2 are still running → these are the slow tasks.
    If a task exceeds 2× median peer duration → it will likely timeout. Plan accordingly.
    Cost: 1 call per status check. Value: prevents 10-minute blind waits.
    P0-R2: Skip (batches are short). R3+: Implement if batch durations exceed expectations.

  SHARED STATE QUICK CHECK (practical guide for novice executors):
    If two tasks use different material names → independent (parallel OK).
    If two tasks call different dispatchers on different data → independent (parallel OK).
    If one task's OUTPUT is another task's INPUT → dependent (must be sequential).
    If both tasks WRITE to the same file → must be sequential (prevent write conflicts).
    WHEN IN DOUBT: run sequential. It's slower but always correct.
    Parallel is an OPTIMIZATION, not a requirement. Correct results > fast results.

CONTEXT EDITING PRESCRIPTION (when to clear tool results from context):
  After flushing Group A results in R2-MS0 → clear Group A tool results from context.
  After flushing each batch in R3 → clear completed batch tool results from context.
  After consuming diagnostic results (health, list, coverage) → clear them.
  HOW: context_edit → drop tool_result blocks that have been consumed and flushed.
  RULE: NEVER clear results that have NOT been flushed to disk. Clear ONLY after verified flush.
  PARALLEL SAFETY RULE (CB-2): NEVER clear context while parallel tasks are running.
    Context editing during active parallel execution can remove data that agents reference
    after a compaction event. Clear ONLY between batch rounds, never within a batch round.
    Sequence: all tasks complete → flush ALL → verify → THEN clear context.
```

<!-- ANCHOR: pc_additional_opus_4_6_features -->
### ADDITIONAL OPUS 4.6 FEATURES

```
FAST MODE (optional — wire after P0, use from R1 onward):
  speed: "fast" with beta header fast-mode-2026-02-01
  2.5x faster output. 6x cost ($30/$150 per MTok).
  USE FOR: LOW effort operations only (health, list, stats, state ops).
  DO NOT USE FOR: Safety calcs, data retrieval, or any MAX/HIGH effort operation.

FINE-GRAINED TOOL STREAMING (GA — no beta header):
  eager_input_streaming: true on tool definitions
  USE FOR: Large file writes, report generation, batch data output.
  BENEFIT: Reduces latency on large output operations.

CONTEXT EDITING (supplements flush-to-file):
  Tool result clearing: Drop old tool results from context after consumption.
  Thinking block clearing: clear_thinking_20251015 — manage thinking blocks.
  USE FOR: Diagnostic results consumed and no longer needed (health, list, coverage).
  NOTE: This supplements, does not replace, flush-to-file for non-regenerable data.

DATA RESIDENCY (R4+ enterprise compliance):
  inference_geo: "us" | "global"
  1.1x pricing for US-only inference on Opus 4.6+.
  Wire in R4 when enterprise compliance is implemented.

1M CONTEXT BETA (optional):
  Beta header: context-1m-2025-08-07
  Requires Usage Tier 4+. Premium pricing above 200K tokens.
  USE WHEN: Heavy sessions (P0-MS8, R2-MS0, R3 batches) to eliminate session splitting.

PREFILLING REMOVED (breaking change):
  Assistant message prefilling returns 400 error on Opus 4.6.
  P0-MS0 MUST audit all API call paths for prefilling and migrate to structured outputs.
```

---

<!-- ANCHOR: pc_canonical_tolerance_table_single_source_of_truth_all_phases_reference_this -->
## CANONICAL TOLERANCE TABLE (single source of truth — ALL phases reference this)

```typescript
// SOURCE OF TRUTH: This protocol doc defines the values.
// IMPLEMENTATION: P0-MS0 creates src/schemas/tolerances.ts with these exact values.
// The .ts file is the compile-time artifact importable by test matrix, validation engine,
// and R3 batch runner. This doc is the authoritative reference; the code file is the implementation.

// src/schemas/tolerances.ts
export const R2_TOLERANCES = {
  speed_feed_vc:    0.15,  // ±15% of published Vc
  speed_feed_fz:    0.15,  // ±15% of published fz
  cutting_force_fc: 0.20,  // ±20% of Kienzle prediction
  tool_life:        0.25,  // ±25% of Taylor prediction
  thread_calcs:     0.05,  // ±5% (geometric, not empirical)
  alarm_decode:     0.00,  // exact match (deterministic)
  edge_case:        0.30,  // ±30% (wider for boundary conditions)
  multi_op:         0.15,  // ±15% per operation
} as const satisfies Record<string, number>;

export type ToleranceCategory = keyof typeof R2_TOLERANCES;

// USAGE: S(x) >= 0.70 is the SAFETY gate (is this cut safe?).
//        Tolerances are the ACCURACY gate (is the math correct?).
//        Both must pass. A calc can be "safe" (S(x)=0.85) but "wrong" (delta=40%).
//        Tolerances validate against known-good reference values or published data.
//
// S(x) DERIVATION (SK-6):
//   S(x) is a composite safety score combining: cutting parameter conservatism,
//   force margin relative to machine/tool capacity, and thermal load assessment.
//   S(x) = 1.0 means parameters are maximally conservative (center of safe envelope).
//   S(x) = 0.0 means parameters are at or beyond the failure boundary.
//   The 0.70 threshold was set at 70% of the safe envelope — providing 30% margin for:
//     - Material property variation (±10% between heats/batches)
//     - Tool wear state (new vs partially worn)
//     - Machine condition (new vs 10-year-old spindle)
//   FORMULA: S(x) = w1×(Vc_safe - Vc_actual)/(Vc_safe - Vc_min)
//            + w2×(Fc_max - Fc_actual)/(Fc_max)
//            + w3×(T_actual/T_optimal)
//   Weights w1,w2,w3 are material-class dependent (steels vs titanium vs aluminum).
//   The exact implementation is in src/formulas/safetyScore.ts.
//   0.70 IS CONSERVATIVE. Some shops operate at S(x)=0.60 for productivity.
//   PRISM uses 0.70 as the automated hard block. Overrides require human sign-off.
//   FUTURE: R6 should validate S(x)=0.70 against incident data if available.
//
// REFERENCE VALUES FOR TOLERANCE VALIDATION (SK-3):
//   Tolerances measure: |actual - reference| / reference <= threshold.
//   The REFERENCE must come from a pinned, sourced data file — NOT from memory or handbook lookup.
//   P0-MS0 creates src/data/referenceValues.ts with published values for:
//     - 10 R2 test materials × 5 operations = 50 reference points (minimum).
//     - Sources: Sandvik Coromant Turning/Milling Guide, Machining Data Handbook (Metcut),
//       ASM Machining Reference. Each value includes source citation.
//   Format: { material: "4140", operation: "turning", ref_Vc: 180, ref_fz: 0.25,
//             ref_Fc: 3200, source: "Sandvik Turning Guide 2024 Table 3.2" }
//   R3 expands this file for each new material validated in batch campaigns.
//   WHY: Without pinned references, two executors using different handbooks get different
//   pass/fail on the same result. Tolerance testing becomes subjective.
//
// MATERIAL SANITY CHECKS (cross-parameter validation — SK-5):
//   After loading a material, validate that parameters are self-consistent:
//     Steels (alloy, carbon, tool, stainless): density 7.5-8.1 g/cm³, hardness > 120 HB
//     Aluminum alloys: density 2.5-2.9 g/cm³, hardness < 200 HB or < 95 HRB
//     Titanium alloys: density 4.3-4.8 g/cm³, hardness > 250 HB or > 30 HRC
//     Copper alloys: density 8.0-9.0 g/cm³, hardness < 300 HB
//     Nickel superalloys (Inconel, Waspaloy): density 7.8-8.5 g/cm³, hardness > 250 HB
//     Cast iron: density 6.8-7.4 g/cm³, hardness > 150 HB
//   If density or hardness is outside range for the declared material class →
//   this is a DATA SWAP (material name doesn't match parameters). CRITICAL finding.
//   Implement in src/validation/materialSanity.ts, run in R1-MS1 after each material_get.
//
// WHERE USED: R2-MS0 (50-calc matrix), R2-MS1 (edge cases), R2-MS1.5 (AI edge cases),
//             R3 (batch validation), R6 (production regression suite).
```

---

<!-- ANCHOR: pc_idempotency_classification_retained_from_v12_2_needed_regardless_of_compaction_method -->
## RALPH & OMEGA ASSESSMENT GUIDE

```
=== RALPH (prism_ralph action=assess) ===
Ralph produces a letter grade (A+ through F) based on:
  - Correctness: Do calculations produce verifiably correct results?
  - Completeness: Are all required deliverables present?
  - Safety: Are S(x) gates enforced? Are edge cases covered?
  - Evidence: Are results backed by verifiable data (not placeholders)?
  - Quality: Does code follow standards (PrismError, atomicWrite, getEffort, etc.)?

IF Ralph < required grade: READ the response body carefully. It lists SPECIFIC deficiencies
with severity. Fix the highest-severity deficiency first. Re-assess.
Common reasons for low grades:
  Missing tests → add vitest tests for the gap area.
  Incomplete documentation → append PHASE_FINDINGS.md or result files.
  Placeholder returns → fix the dispatcher to return real data.
  Formula limitations (OB-1) → document as MODEL-BOUNDARY findings, not bugs.
    A LIMITATION is when the formula is mathematically correct but physically inadequate
    for certain conditions (e.g., Taylor breaks down at very low speeds, Kienzle doesn't
    account for built-up edge). These are not fixable with code changes — they require
    formula improvements or additional models. Tag as CRITICAL in PHASE_FINDINGS.md with
    "MODEL-BOUNDARY: [formula] does not account for [phenomenon] at [conditions]."

=== OMEGA (prism_omega action=compute) ===
Omega (Ω) produces a 0.0-1.0 score representing overall system quality.
Components: data quality, safety coverage, integration health, documentation completeness.
Ω >= 0.70 is a HARD BLOCK for all phases. Ω >= 0.85 required for R6 production.

IF Omega < threshold: READ the response body. It lists DIMENSION SCORES.
  The lowest dimension score is your bottleneck. Focus on that dimension.
  Typical bottlenecks by phase:
    P0: integration health (expected — data not loaded yet, just wiring)
    R1: data quality (if registries <95%, this drags Omega down)
    R2: safety coverage (if edge cases fail, this is the weak dimension)
    R3+: documentation completeness (findings and audit trail matter more)

PHASE GATE AUTOMATION LEVEL (IA2-9.2):
  AUTOMATED (proceed without human confirmation if ALL criteria met):
    P0 gate: All 14 chains pass. Omega recorded (no minimum for P0).
    R1 gate: All registries >95%. Ralph >= B+.
  HUMAN REVIEW RECOMMENDED (even if criteria met — safety implications):
    R2 gate: Safety calcs. Human should review any LIMITATION findings before R3 scaling.
    R6 gate: Production certification. Human sign-off required regardless of automation.
  AUTOMATED-WITH-OVERRIDE (proceed if criteria met, notify human of WARNINGs):
    R3 gate: Automated. Human notified of any batch_quality WARNING findings.
    R4 gate: Automated. Human notified of any compliance findings.
    R5 gate: Automated. Human notified of any UI/accessibility findings.
```

---

<!-- ANCHOR: pc_wall_clock_time_estimates -->
## RESPONSE BUDGET ENFORCEMENT

```
EVERY MS header includes: Effort (calls) + Response Budget (KB) + Context Peak (KB after flushes)

FLUSH TRIGGERS (apply to ALL MS, ALL phases — for PERSISTENCE, not compaction):
  1. After EVERY group of non-regenerable results → flush to disk.
     Non-regenerable = multi-step computation results, chain outputs, audit data.
  2. After EVERY file_read >100 lines → extract needed section, shed full response.
  3. Between MS transitions → context_compress for clean working memory.

  FLUSH VERIFICATION: For non-regenerable data, verify flush succeeded before shedding.
  Regenerable data (diagnostics): verification optional.

RESPONSE SIZE GUIDE:
  SMALL  (<1KB):   health, build, safety, alarm_decode, task_list, bridge_health,
                   omega_compute, session operations, context operations
  MEDIUM (1-5KB):  material_get(slimmed), hook_coverage, skill_stats, gsd_quick,
                   knowledge_search, ralph_scrutinize, swarm_status
  LARGE  (5-20KB): hook_list(62+), material_get(full/127 params), ralph_loop,
                   ralph_assess, code_search(multiple matches), skill_find_for_task
  HUGE   (>20KB):  unbounded file_read, full registry dump, MASTER_INDEX.md read

RULES:
  1. ALWAYS use start_line/end_line on file_read for files >200 lines.
     (Relaxed from >100 lines in v12.2 — Opus 4.6 long-context reliability is 4x better.)
  2. For LARGE responses: extract needed fields, shed the rest.
  3. For HUGE responses: NEVER load without a specific line range.
  4. Prefer code_search over file_read when looking for specific patterns.

RESPONSE CAPPING (dispatcher-level enforcement — implement in P0-MS0b — IA-2.2):
  For LARGE responses (>5KB estimated):
    Dispatcher MUST accept limit= or max_results= parameter.
    If caller omits limit, dispatcher applies default:
      hook_list → 20 (not all 62+), code_search → 10 matches, material_search → 5 results.
  For HUGE responses (>20KB):
    Dispatcher MUST require start_line/end_line or paginate automatically.
    Unbounded responses are NEVER returned — dispatcher truncates at 20KB with a flag:
      { ..., _truncated: true, _total_size: N, _message: "Use limit= or line range for full data" }
  
  IMPLEMENTATION: Add responseGuard() wrapper to dispatcherBase.ts:
    export function responseGuard(response: unknown, maxBytes: number = 20480): unknown {
      const serialized = JSON.stringify(response);
      if (serialized.length > maxBytes) {
        return { ...truncateToSize(response, maxBytes), _truncated: true, _total_size: serialized.length };
      }
      return response;
    }
  WHY: The roadmap budgets for call COUNT but not response VOLUME. A single unbounded
  response can consume 10-20KB, invalidating the MS context budget entirely.
```
## 1M CONTEXT DECISION RULE

```
USE 1M WHEN: you're about to start a session with >50 expected calls AND heavy data output.
  Recommended for: P0-MS8 (integration gate), R2-MS0 (50-calc matrix), R3 batch sessions.
USE 200K (default) WHEN: everything else (most sessions fit comfortably in 200K).

HOW TO ENABLE: Add beta header context-1m-2025-08-07 to MCP server API client config.
HOW TO VERIFY: prism_context action=context_monitor_check → total window should show ~1M.
COST WARNING: Tokens above 200K are priced at 2x ($10/$37.50 vs $5/$25 per MTok).
  A heavy 1M session may cost $15-30 in API fees. Budget accordingly.

BOOT VERIFICATION (SD-4): At session boot, verify whether 1M header is active.
  If active AND current session does NOT meet the "USE 1M" criteria above → REMOVE the header.
  WHY: The header persists in the API client config across sessions. An executor enables it
  for P0-MS8 (justified: 80+ calls), forgets to disable, and the next 5 sessions all run
  in 1M mode at 2x pricing. Total waste: $50-100+ in unnecessary API fees.
  REMOVAL: Remove context-1m-2025-08-07 from the beta headers array in the API client config.
  RE-ENABLE: Only when starting a session that meets the criteria above.
```

---

<!-- ANCHOR: pc_response_budget_enforcement -->
