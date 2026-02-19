# PRISM PROTOCOLS - CODING (loaded during implementation sessions)
# Split from PRISM_PROTOCOLS_CORE.md on 2026-02-17 (Roadmap Audit Finding 1+14)
# Contains: Code Standards, Build Triage, Idempotency, Hooks, Cascading Failure
# Boot protocols: PROTOCOLS_BOOT.md | Safety schemas: PROTOCOLS_SAFETY.md

---

## CODE STANDARDS (apply to ALL code changes, ALL phases)

```
=== CORE PATTERNS ===
ASYNC I/O:     NEVER readFileSync/writeFileSync in server code. ALWAYS fs.promises.*.
PATH:          NEVER relative paths. ALWAYS path.resolve(__dirname, '../../...')
ERROR TYPING:  NEVER catch(e). ALWAYS catch(err:unknown) { log + handle }.
IDEMPOTENCY:   Every state-modifying step must be safe to re-run (check-before-create).
IMPORTS:       After rename/move: search ALL of src/ + src/types/ for stale references.
RESPONSE SLIM: prism_data responses with >50 fields → responseSlimmer → extract only needed.

=== REQUIRED UTILITIES (create in P0-MS0 at src/utils/) ===

ATOMIC WRITE (src/utils/atomicWrite.ts):
  import { writeFile, rename, unlink } from 'fs/promises';
  import path from 'path';
  import PQueue from 'p-queue';

  const writeQueue = new PQueue({ concurrency: 1 });

  export async function atomicWrite(filePath: string, data: string): Promise<void> {
    const resolved = path.resolve(filePath);               // Law 4: never relative
    const tmpPath = `${resolved}.${Date.now()}.tmp`;        // timestamp prevents collisions

    return writeQueue.add(async () => {
      try {
        await writeFile(tmpPath, data, 'utf-8');
        await rename(tmpPath, resolved);
      } catch (err: unknown) {
        try { await unlink(tmpPath); } catch { /* best-effort cleanup */ }
        throw err;                                           // caller must handle
      }
    });
  }
  WHY: "write .tmp → rename" specified in old standards but never templated.
  Every developer writes their own version; at least one forgets cleanup-on-failure.
  Timestamp in tmp name prevents parallel collisions. Queue serializes writes.

ENV PARSING (src/utils/env.ts):
  export function envBool(key: string, fallback: boolean = false): boolean {
    const val = process.env[key]?.toLowerCase().trim();
    if (val === undefined) return fallback;
    return ['true', '1', 'yes'].includes(val);
  }
  export function envString(key: string, fallback: string): string {
    return process.env[key]?.trim() || fallback;
  }
  export function envInt(key: string, fallback: number): number {
    const val = parseInt(process.env[key] ?? '', 10);
    return Number.isNaN(val) ? fallback : val;
  }
  WHY: Inline ['true','1','yes'].includes() is error-prone (forgotten .toLowerCase(),
  inconsistent 'on'/'TRUE' handling). Centralized utility = one correct implementation.

API TIMEOUT (src/utils/apiTimeout.ts):
  export async function apiCallWithTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number = 30_000,
    context: string = 'unknown'
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.error(`[PRISM] API timeout after ${timeoutMs}ms: ${context}`);
        throw new PrismError(`API call timed out: ${context}`, 'network', 'retry');
      }
      throw err;
    } finally {
      clearTimeout(timeout);                                 // always clean up
    }
  }
  ALL external API calls MUST use this wrapper. >60s timeout = BLOCKED.
  WHY: Raw AbortController doesn't log timeouts, doesn't distinguish AbortError
  from other errors, and doesn't clean up the timer in finally.

=== ERROR TAXONOMY (src/errors/PrismError.ts — create in P0-MS0) ===

  type ErrorCategory = 'safety' | 'data' | 'network' | 'schema' | 'state' | 'validation';
  type ErrorSeverity = 'block' | 'retry' | 'log';

  export class PrismError extends Error {
    constructor(
      message: string,
      public readonly category: ErrorCategory,
      public readonly severity: ErrorSeverity,
    ) { super(message); this.name = 'PrismError'; }
  }

  export class SafetyBlockError extends PrismError {
    constructor(message: string, public readonly safetyScore: number) {
      super(message, 'safety', 'block');
    }
  }

  HANDLING RULES BY SEVERITY:
    'block':  STOP execution. Log. Do not continue chain. (SafetyBlockError, S(x) < 0.70)
    'retry':  Retry once with backoff. If retry fails → escalate to 'block' or 'log'.
    'log':    Log structured error. Continue execution. (Non-critical data gaps)

  WHY: Without taxonomy, every catch block does the same thing (log + handle).
  A network timeout and a safety violation need fundamentally different responses.
  PrismError makes error handling intentional — the catch block reads the category.

=== SCHEMA + MIGRATION ===
SCHEMA:        All registry JSON includes SCHEMA_VERSION. Loaders validate before parse.
MIGRATION:     Schema version mismatches trigger migration chain, not rejection.
  Maintain MIGRATIONS registry per data type (material, machine, tool, alarm):
    const MATERIAL_MIGRATIONS: Record<string, (data: unknown) => unknown> = {
      '1.0→1.1': (d) => ({ ...d, coolant_required: d.coolant_required ?? false }),
    };
  Walk the chain: 1.0 → 1.1 → 1.2 until current version reached.
  If no path exists → throw SchemaError (PrismError category='schema', severity='block').
  WHY: Without migrations, schema validation becomes a binary accept/reject gate.
  R3 batch campaigns will bump schema. R4 multi-tenant may have mixed versions.
  A migration path makes schema evolution additive rather than breaking.

=== COMPACTION INSTRUCTIONS — SAFETY INVARIANT ===
COMPACTION:    Compaction preservation instructions are HARDCODED, not env-configurable.
  // WRONG — allows misconfiguration via .env:
  // instructions: process.env.COMPACTION_INSTRUCTIONS || "Preserve: ..."
  // RIGHT — safety invariant, not configurable:
  const COMPACTION_INSTRUCTIONS = `Preserve: current MS position, CURRENT STEP NUMBER WITHIN MS, \
last completed step-group, active phase, all file paths written to, \
all calc results not yet flushed to disk, all FAIL/BLOCKED statuses, registry counts, \
Omega baseline, material names and their safety scores, \
intermediate variables (task_ids, file paths from code_search, count baselines). \
Discard: tool response details already flushed to files, completed MS definitions, \
diagnostic output from PASS results, health check details, list outputs.` as const;
  WHY: COMPACTION_INSTRUCTIONS="Discard everything" in a misconfigured .env = total data loss.
  Compaction preservation is a safety invariant — hardcode it like you'd hardcode S(x)>=0.70.

=== API RATE LIMITING (for batch operations) ===
RATE LIMIT:    Batch API calls (R2 50-calc, R3 250-calc) MUST use p-queue with rate control:
  const apiQueue = new PQueue({
    concurrency: 5,          // max parallel API calls
    interval: 60_000,        // per minute
    intervalCap: 50,         // max 50 calls per minute (adjust to API tier)
  });

  ADAPTIVE RATE LIMITING (CB-4 — respond to 429 responses):
    Static intervalCap doesn't account for shared account quota or dynamic rate limits.
    When a 429 (rate limited) response is received:
      1. Halve intervalCap (50 → 25 → 12 → min 5).
      2. Apply exponential backoff: wait 2^attempt seconds (max 60s) before retrying.
      3. After 5 consecutive successful responses at reduced cap, increase by 50% (not back to full).
      4. If 3 consecutive 429s at minimum cap → STOP batch. Log RATE-LIMIT-EXHAUSTED. End session.
    WHY: R3 fires 250+ calcs at effort=max. Without adaptive limiting, the first 429 triggers
    a thundering herd of retries that makes the rate limit worse, not better.

  WHY: R2-MS0 fires 50 safety calcs at effort=max. R3 fires 250+. Without rate limiting,
  these will hit Anthropic API rate limits (especially Opus on Tier 4). Agent Teams may
  handle internal rate limiting, but the caller must enforce external API rate limits.
  Adjust intervalCap based on actual Usage Tier limits after P0.

=== LOGGING & OBSERVABILITY (XA-8) ===
LOGGING:       ALL PHASES use structured JSON logger, not just post-R4.
  Pre-R4: lightweight — output to stdout as JSON (see LOG SCHEMA below).
  Post-R4: full pino with correlationId, rotation, and structured fields.
  WHY: Starting structured logs in P0 means R4 migration is additive (add fields),
  not replacement (rewrite all logging). Also provides historical baseline for R6 profiling.

LOG SCHEMA (all structured logs MUST include these fields from P0 onward):
  {
    "timestamp": "ISO-8601",
    "level": "debug|info|warn|error|fatal",
    "dispatcher": "prism_calc",
    "action": "speed_feed",
    "correlationId": "uuid-v4",
    "durationMs": 1234,
    "effort": "max",
    ...payload
  }
  RULE: Every log entry must have at minimum: timestamp, level, correlationId.
  dispatcher + action are required for dispatcher calls. Optional for internal operations.

TRACE PROPAGATION:
  Every API call chain gets a correlationId (UUID v4) at entry point.
  All downstream calls (including swarm sub-tasks) include this correlationId.
  Recovery: Any result can be traced back to its root request via correlationId.
  Implementation: Generate in API client wrapper (P0-MS0a creates this utility).
  Swarm tasks: Parent correlationId passed as metadata. Sub-tasks append ":N" suffix.
    Example: parent="abc-123", child1="abc-123:1", child2="abc-123:2"

SAFETY DECISION RECORD (logged when S(x) blocks an operation):
  {
    "type": "safety_block",
    "material": "Ti-6Al-4V",
    "operation": "turning",
    "safety_score": 0.62,
    "threshold": 0.70,
    "failing_parameters": ["Vc exceeds safe limit", "ap too aggressive"],
    "correlationId": "uuid",
    "timestamp": "ISO-8601"
  }
  WHY: When an operator reports "the system rejected my cut," this record provides
  immediate diagnosis without log-trawling. R6 monitoring can alert on safety_block rate.

=== TEST FRAMEWORK (establish convention in P0, build harness in R2) ===
TESTS:         Vitest as test runner. Test files at src/__tests__/[name].test.ts.
  P0: Create vitest.config.ts + one smoke test (health endpoint).
      UNIT TESTS (AG-4): Also create unit tests for each utility function:
        src/__tests__/unit/atomicWrite.test.ts — concurrent writes, crash cleanup
        src/__tests__/unit/envParsing.test.ts — envBool, envString, envInt edge cases
        src/__tests__/unit/apiTimeout.test.ts — timeout fires, AbortError classified correctly
        src/__tests__/unit/getEffort.test.ts — mapped actions return correct tier, unknown→max
      WHY: Integration tests (R2 matrix) validate the system. Unit tests DIAGNOSE failures.
      When a 50-calc matrix test fails, is it the formula? the data? the schema? the normalizer?
      Unit tests isolate the failure to one function. Without them, debugging is stack-tracing.
  R1: Add unit tests per normalizer (materialNormalizer handles null, type coercion, encoding).
  R2: Test matrix becomes automated: npm test runs all 50 calcs + edge cases.
      Add unit tests per formula (Taylor, Kienzle with hardcoded inputs → expected outputs).
  R6: npm test is the regression gate — build fails if any calc regresses.
  WHY: R2 creates a "test matrix" executed manually via prism_ calls. By R6, that matrix
  must run automatically in the build pipeline. Establishing the framework in P0 (10 min)
  prevents a migration cliff in R2 (where "add test framework" competes with "test safety calcs").

=== OPUS 4.6 API PATTERNS ===
  THINKING:    thinking: { type: "adaptive" }  ← NEVER use { type: "enabled", budget_tokens: N }
  EFFORT:      getEffort(action)               ← see §Effort Tier, NEVER raw EFFORT_MAP[action]
  OUTPUT:      output_config: { format: ... }  ← NEVER use output_format (deprecated)
  STREAMING:   Use .stream() with .get_final_message() for max_tokens > 16K
  PREFILLING:  NEVER prefill assistant messages. Use structured outputs or system prompts.
  JSON PARSE:  ALWAYS use JSON.parse(), NEVER parse tool call input as raw string.

=== FILE ACCESS DECONFLICTION (IA-11.1) ===
  PRISM files (state, trackers, findings, registry data): Access ONLY via prism_doc or prism_dev.
    NEVER use Desktop Commander to read/write PRISM state files.
    atomicWrite uses a write queue that serializes access — this protection is bypassed by DC.
  
  Non-PRISM files (user uploads, external data, system configs): Desktop Commander is fine.
  
  RULE: If a file is written by atomicWrite, it MUST be read by prism_doc — not DC read_file.
  WHY: atomicWrite creates .tmp → rename. A DC read during the .tmp phase gets nothing.
  A DC read during rename may get truncated data (OS-dependent). This is a race condition
  that manifests as intermittent "file not found" or "empty file" errors.

=== DISPATCHER API VERSIONING (IA-11.2) ===
  Dispatcher actions use ADDITIVE-ONLY changes within a roadmap cycle (P0→R6).
  New REQUIRED parameters are NEVER added to existing actions.
  Instead: new optional parameter with default value, OR new action name.
  
  Example — speed_feed adds optional machine parameter:
    action=speed_feed material=4140 operation=turning → works (machine defaults to "generic")
    action=speed_feed material=4140 operation=turning machine="HAAS VF-2" → works (enhanced)
  
  NEVER: action=speed_feed now REQUIRES machine → breaks all R2 callers.
  
  Cross-phase compatibility: R2 callers MUST work without modification through R6.
  If a breaking change is truly necessary: create new action (speed_feed_v2) and deprecate old.

  DEPRECATION LIFECYCLE (for removing dispatchers or actions — IA3-12.1):
    Phase 1 — DEPRECATE: Add @deprecated tag to action. Log warning on invocation.
      Existing callers still work. No breakage.
    Phase 2 — WARN (next phase): Change log level to WARN. Add to PHASE_FINDINGS.md:
      "DEPRECATED: [dispatcher.action] — replace with [alternative] by [phase]."
    Phase 3 — REMOVE (phase after warning): Remove the action. Build break expected.
      All phase doc references must be updated before removal.
      Run: code_search for the deprecated action name → update all references.
    MINIMUM LIFECYCLE: 2 phases between deprecation and removal.
    WHY: One phase gap is too short — a stub expansion during phase N might reference a
    dispatcher deprecated in phase N-1 before the expansion author sees the deprecation.

=== ACTION ENUM HARDENING (IA2-1.2) ===
  For each dispatcher, the 'action' parameter SHOULD use a JSON Schema enum listing all valid
  actions. This prevents Claude from hallucinating action names (e.g., "feed_rate" vs "speed_feed").
  
  Implementation in P0-MS0b — for each dispatcher schema definition:
    action: { type: "string", enum: ["speed_feed", "cutting_force", "tool_life", "spindle_speed"] }
  Not: action: { type: "string" }  ← allows any string, including hallucinated names.
  
  Cost: ~5 tokens per dispatcher for the enum values. Total: ~155 tokens across 31 dispatchers.
  Savings: Prevents one round-trip on a hallucinated action = ~500-1000 tokens saved per incident.
  
  NOTE: The enum must be updated whenever a new action is added to a dispatcher.
  This is enforced by the same build break that EFFORT_MAP exhaustiveness provides (IA-11.3):
  adding an action to ActionName but not to the schema enum → the enum is stale → executor
  gets a 400 error on the new action → visible, not silent.

=== STATE FILE FORMAT STABILITY (IA2-12.1) ===
  CURRENT_POSITION.md, ROADMAP_TRACKER.md, and ACTION_TRACKER.md use plain-text formats.
  Format changes MUST be backward-compatible:
    - New fields are APPENDED after existing fields (pipe-separated).
    - Parsers must tolerate missing trailing fields (treat as absent, not error).
    - Version header is NOT needed for plain-text state files (overhead > value).
  Example evolution:
    v13.6: "CURRENT: P0-MS3 | LAST_COMPLETE: P0-MS2 2026-02-14 | PHASE: P0 in-progress"
    Future: "CURRENT: P0-MS3 | LAST_COMPLETE: P0-MS2 2026-02-14 | PHASE: P0 in-progress | TIER: 1"
    Parser handles both by splitting on " | " and reading positionally.
  WHY: A format-change-induced parse failure during recovery cascades to Layer 3 (full MS restart).
  Backward-compatible additions prevent this.

=== ADDING NEW ACTIONS TO EFFORT_MAP (IA-11.3) ===
  When adding a new dispatcher action:
    1. Add to ActionName union type in src/config/effortTiers.ts.
    2. Add to EFFORT_MAP with appropriate tier.
    3. Build will FAIL if step 2 is skipped — this is INTENTIONAL (exhaustiveness check).
       The 'satisfies Record<ActionName, EffortLevel>' forces every action to have a tier.
    4. getEffort() fallback to 'max' catches runtime-only actions (plugins, dynamic).
  WHY: The build break is a FEATURE. It forces the developer to make a conscious decision
  about reasoning depth for the new action. In safety-critical, no action should get an
  unintentional default.

=== MODEL ROUTING BY EFFORT (design for R4+ — IA-8.1) ===
  Cost optimization — route low-effort operations to cheaper models:
    effort=max  → OPUS (safety-critical: calcs, ralph, omega, PFP)
    effort=high → OPUS (data retrieval, reasoning: material_get, code_search)
    effort=medium → SONNET (operational: build, hook_coverage, agent_execute)
    effort=low  → SONNET or HAIKU (administrative: health, list, state_save)
  
  SAFETY RULE: ANY operation that produces a safety_score MUST use OPUS regardless of effort.
  IMPLEMENTATION: getModel(action) parallel to getEffort(action). Same EFFORT_MAP drives both.
  
  COST IMPACT: R3 fires 250+ calcs. At 50% medium/low operations routed to Sonnet:
    ~125 calls × (Opus cost - Sonnet cost) = significant savings.
  RISK: Zero for low/medium operations. These are reads, writes, and builds — no reasoning needed.
  DEFER: This optimization is not needed for P0-R2. Implement during R4 API gateway work.
```

---

<!-- ANCHOR: pc_build_failure_triage_apply_when_prism_dev_action_build_fails -->
## BUILD FAILURE TRIAGE (apply when prism_dev action=build fails)

```
WHEN build fails, read the FIRST error only (subsequent errors are often cascading).
Classify into exactly one category and apply the fix:

TYPE ERROR: "Type 'X' is not assignable to type 'Y'"
  → The source file has a type mismatch. Open the file at the error line. Fix the type.
  → Common after refactoring: an import changed shape but consumers weren't updated.
  → Fix ONE type error. Rebuild. Subsequent cascading errors often resolve.

IMPORT ERROR: "Cannot find module 'X'" or "Module not found"
  → Is the file path correct? (check for typos, case sensitivity, missing extension)
  → Is the package installed? (npm install [package] --save)
  → Was a file renamed/moved without updating importers? code_search for old name.

OOM ERROR: "JavaScript heap out of memory" or "FATAL ERROR: CALL_AND_RETRY_LAST"
  → Use npm run build (tsc --noEmit + esbuild), NOT raw tsc. Raw tsc OOMs at PRISM's scale.
  → If npm run build also OOMs: increase memory → NODE_OPTIONS=--max-old-space-size=4096 npm run build

SYNTAX ERROR: "Unexpected token" or "Expression expected"
  → You have a typo from a recent str_replace. Check the last edit you made.
  → If unclear: git diff → find the exact change → fix the syntax.

GENERAL RULE: Fix ONE error. Rebuild. Repeat until clean.
  If >5 errors appear after a single str_replace → your edit was wrong.
  REVERT: git checkout HEAD -- [file]. Try a different approach.
  
NEVER proceed to the next step with a failing build. A green build is a prerequisite for every step.
```

---

<!-- ANCHOR: pc_stuck_protocol_autonomous_recovery_v14_3 -->
## IDEMPOTENCY CLASSIFICATION (retained from v12.2 — needed regardless of compaction method)

```
SAFE TO RE-RUN (naturally idempotent):
  All read-only actions: health, build, material_get, safety, list, coverage,
  context_monitor_check, skill_stats, knowledge_search

CHECK FIRST (conditionally idempotent):
  hook register → check list for name. write → safe (overwrite).
  str_replace → search for old_str. state_save → safe (overwrite).

GUARD REQUIRED (NOT idempotent):
  doc append → read last 3 lines, skip if match. memory store → recall first.
  task_init → task_list first. Use timestamps in all appends.
```

---

<!-- ANCHOR: pc_cadence_function_awareness_30_auto_firing_functions -->
## HOOK OUTPUT RESPONSE PROTOCOL (IA-5.1)

```
Hooks fire automatically at registered triggers. Their output REQUIRES an executor response
based on hook type. Without this protocol, hooks fire into a void — the executor sees output
but doesn't know whether to stop, continue, or investigate.

on_failure (fires on dispatcher errors — enabled in P0, R1, R4, R6):
  OUTPUT: { error_type, dispatcher, action, suggested_fix, severity }
  IF severity='block' → STOP current step. Apply suggested_fix. Rebuild. Retry.
  IF severity='retry' → Retry the call once. If retry fails → escalate to block.
  IF severity='log'  → Note in ACTION_TRACKER. Continue execution.

smart_reflection (fires after safety calcs — enabled in R2, R4):
  OUTPUT: { material, parameter, actual, expected_range, delta_percent, verdict }
  IF verdict='OUT_OF_RANGE':
    This is a FINDING. Append to PHASE_FINDINGS.md with priority tag.
    IF delta > 2× tolerance (from R2_TOLERANCES) → STOP. FORMULA or DATA bug. Investigate before continuing.
    IF delta within 1-2× tolerance → WARN. Continue but flag for R2 fix cycle (MS2).
  IF verdict='IN_RANGE' → no action needed. Continue normally.

batch_quality (fires during R3 batch campaigns — enabled in R3):
  OUTPUT: { batch_id, error_count, error_rate, budget_remaining, recommendation }
  IF recommendation='STOP'  → Halt batch. Quarantine failing materials. Write PHASE_FINDINGS.md.
  IF recommendation='WARN'  → Continue but increase monitoring. Log warning in ACTION_TRACKER.
  IF recommendation='OK'    → Continue normally.

docAntiRegression (fires on file writes — enabled globally via cadence):
  OUTPUT: { file, before_lines, after_lines, verdict }
  IF verdict='REGRESSION' → STOP IMMEDIATELY. Data loss detected.
    Read the file. Compare before/after. Identify what was lost.
    If data loss confirmed → revert the write (git checkout HEAD -- [file]).
    Investigate the write operation that caused the regression.
    Do NOT proceed until data integrity is restored.
  IF verdict='OK' → continue normally.

GENERAL RULE: Hook output appears in the tool response stream. Read it. Apply the protocol.
If a hook type you don't recognize fires → read the output. If it contains a severity or
verdict field, follow the pattern above. If unclear → note in ACTION_TRACKER and continue.

HOOK OUTPUT STABILITY (IA3-5.1):
  Hook output schemas defined above are STABLE for the P0→R6 lifecycle.
  New fields may be ADDED (additive-only, matching §Dispatcher API Versioning).
  Existing fields may NOT be renamed or removed.
  Executors must tolerate missing optional fields in hook output (future-proof).
  IF a hook output schema must change incompatibly → register a new hook name
  (e.g., smart_reflection_v2) and deprecate the old one.
```

---

<!-- ANCHOR: pc_cascading_failure_detection_ia_7_3 -->
## CASCADING FAILURE DETECTION (IA-7.3)

```
Every chain in §Sequencing Guides (PROTOCOLS_REFERENCE) is sequential-dependent.
IF step N in a chain fails → ALL subsequent steps are SKIPPED (not attempted).

CHAIN FAILURE PROPAGATION:
  The chain returns: { status: "CHAIN-FAIL", failed_at: N, reason: "[error]", skipped: [N+1...] }
  
  DO NOT attempt downstream steps after a chain failure:
    material_get fails   → DO NOT run speed_feed (it will fail with missing input)
    speed_feed fails     → DO NOT run safety (it will fail with no Vc/fz data)
    thread_specs fails   → DO NOT run tap_drill (depends on thread dimensions)
    alarm_decode fails   → DO NOT run knowledge_search (depends on alarm context)
  
  DIAGNOSIS: Always fix the FIRST failure in the chain. Downstream failures are symptoms.
  A speed_feed failure when material_get also failed is NOT a speed_feed bug — it's
  a data availability issue. Fix material_get first. speed_feed will likely pass once
  it receives valid material data.

  IN PARALLEL EXECUTION: Chain failure within one parallel task does NOT stop other tasks.
  Each parallel task is independent. If Chain 1 fails, Chains 2-10 continue normally.
  The orchestrator collects all results and reports failures after all tasks complete.
```

---

<!-- ANCHOR: pc_ralph_omega_assessment_guide -->
## SESSION KNOWLEDGE EXTRACTION PROTOCOL (v14.4)

```
PURPOSE: Capture what Claude learned this session so future sessions don't re-discover it.
WHEN: At session end (mandatory), before compaction if auto-dump fires (opportunistic).
WHERE: C:\PRISM\knowledge\sessions\
SPEC: See HIERARCHICAL_INDEX_SPEC.md §Branch 4 for full schema.

EXTRACTION STEPS:
  1. REVIEW: What decisions were made? What errors encountered and fixed?
     What assumptions validated/invalidated? What patterns observed?
  2. CLASSIFY each piece of knowledge:
     - decision:     Architectural or design choice (prevents re-deciding)
     - error_fix:    Bug found and resolved (prevents re-debugging)
     - assumption:   Belief validated or invalidated (prevents wrong assumptions)
     - observation:  Performance, timing, pattern (informs optimization)
     - relationship: Cross-registry connection (feeds Branch 3 graph)
     - blocker:      Unresolved issue with context (gives future sessions head start)
  3. FORMAT each as a knowledge node:
     {
       id: "sk_[date]_[seq]",
       type: "[classification]",
       phase: "[current phase]",
       milestone: "[current MS]",
       summary: "1-line description useful WITHOUT reading detail",
       detail: "2-5 sentences: what, why, how, impact",
       tags: ["topic1", "topic2", "phase-MS"],
       session_date: "[ISO date]",
       confidence: "verified|observed|hypothesized"
     }
  4. WRITE to C:\PRISM\knowledge\sessions\[date]_session_knowledge.json
     MCP: prism_doc action=write name=knowledge/sessions/[date]_session_knowledge.json
     DC:  Desktop Commander write_file C:\PRISM\knowledge\sessions\[date]_session_knowledge.json
  5. UPDATE SESSION_KNOWLEDGE_INDEX.json with new entries
     (add to by_phase, by_milestone, by_type, by_tag indices)
  6. CHECK PROMOTION: Any verified nodes that should become permanent?
     error_fix → error taxonomy or test case
     decision → SYSTEM_CONTRACT or phase doc
     relationship → RELATIONSHIP_GRAPH.json
     Set promoted_to = "[destination]" on promoted nodes.

MINIMUM: 1 knowledge node per session. Most sessions produce 3-8.
If 0 nodes: session knowledge was lost — review what happened before closing.

KNOWLEDGE QUERY ON BOOT:
  After position recovery (Recovery Card STEP 2.5):
  Load SESSION_KNOWLEDGE_INDEX.json
  Filter: phase = current, milestone = current, promoted_to = null
  Load matching nodes (~500-1000 tokens). Apply accumulated intelligence.
```

---

<!-- ANCHOR: pc_hook_output_response_protocol_ia_5_1 -->
## WALL-CLOCK TIME ESTIMATES

```
APPROXIMATE DURATIONS (for session planning — actual varies by complexity and API latency):
  STANDARD tier MS (~10 calls):     20-40 minutes (compute: 5-15min, human: 15-25min)
  DEEP tier MS (~15-18 calls):      40-75 minutes (compute: 10-25min, human: 30-50min)
  RELEASE tier MS (~20-25 calls):   60-120 minutes (compute: 15-40min, human: 45-80min)
  P0-MS0a (~30 calls, CREATE):      90-120 minutes
  P0-MS0b (~25 calls, WIRE+VERIFY): 60-90 minutes
  Phase gate (RELEASE validation):  30-60 minutes
  Stub brainstorm session:          1-2 hours

COMPUTE TIME accounts for API round-trips:
  effort=low:    ~3-5 seconds per call
  effort=medium: ~5-10 seconds per call
  effort=high:   ~10-20 seconds per call
  effort=max:    ~30-90 seconds per call (adaptive thinking uses significant compute)

IF API LATENCY IS HIGH (>30s average per call):
  Reduce target MS count for this session. Better to complete 1 MS cleanly than
  rush 2 MS with fatigue-induced errors. Safety-critical systems reward patience.

IF running out of time mid-MS:
  1. Complete the current step-group (don't stop mid-group).
  2. Flush any unflushed results to disk (verified flush for non-regenerable data).
  3. Write ACTION_TRACKER with your exact position.
  4. Update CURRENT_POSITION.md with sub-MS position.
  5. prism_session action=state_save.
  6. End session cleanly. Resume from ACTION_TRACKER position next session.
  NEVER squeeze in "one more step" at high context pressure. Clean exit > partial work.
```

---

<!-- ANCHOR: pc_1m_context_decision_rule -->
