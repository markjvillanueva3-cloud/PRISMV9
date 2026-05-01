# PRISM PROTOCOLS — CORE v13.9
# ALWAYS loaded every session alongside PRISM_MASTER_INDEX.md
# Contains ONLY what every session needs. For Quality Tiers, Roles, Rollback, see PRISM_PROTOCOLS_REFERENCE.md
#
# v13.9 CHANGES (from v13.8 — Cross-Audit Governance Hardening, 13 improvements):
#   - LOG SCHEMA: All structured logs must include timestamp, level, dispatcher, action,
#     correlationId, durationMs. Safety blocks get dedicated record format. (XA-8)
#   - TRACE PROPAGATION: Every API call chain gets UUID correlationId at entry. (XA-8)
#   - ARTIFACT VALIDATION: Boot Step 2.5 checks REQUIRES artifacts from SYSTEM_CONTRACT.md. (XA-1)
#   - SYSTEM_CONTRACT.md: Referenced at phase gates for invariant verification. (XA-5)
#   All v13.8 third infrastructure audit hardening retained unchanged.
#
# v13.8 CHANGES (from v13.7 — Third Infrastructure Audit, 11 findings):
#   - STUCK PROTOCOL: 3-attempt ceiling + state preserve + human escalation (IA3-9.1)
#   - SUSPECT DATA QUARANTINE: Tier 2.1 degradation for corrupt-but-plausible data (IA3-7.1)
#   - DISPATCHER PROBE: Tier 2.5 probe-action fallback for non-health dispatchers (IA3-1.1)
#   - RESPONSE BUDGET VALIDATION: Estimated vs actual throughput tracking per MS (IA3-2.1)
#   - HOOK OUTPUT STABILITY: Additive-only versioning for hook output schemas (IA3-5.1)
#   - BOUNDED RECOVERY LOAD: Phase doc bounded read during compaction recovery (IA3-3.1)
#   - PARALLEL PROGRESS: swarm_status polling during long R3+ batches (IA3-6.1)
#   - DEPRECATION LIFECYCLE: 3-phase removal protocol for dispatchers/actions (IA3-12.1)
#   All v13.7 second infrastructure audit hardening retained unchanged.
#
# v13.7 CHANGES (from v13.6 — Second Infrastructure Audit, 14 findings):
#   - ACTION ENUM HARDENING: Dispatcher schemas use JSON Schema enum for 'action' param (IA2-1.2)
#   - OVERHEAD VALIDATION: Boot Step 3.1 runs every P0 session, not once (IA2-2.1)
#   - BOOTSTRAP RESPONSE SAFETY: Manual limits during MS0b before responseGuard wired (IA2-2.2)
#   - COMPACTION TELEMETRY: COMPACTION-RECOVERY entries in ROADMAP_TRACKER (IA2-3.1)
#   - BLOCKED PRIORITY: Autonomous continue resolves blocks first (IA2-4.1)
#   - SKILL SIZE AUDIT: Measure actual token cost during P0-MS1 (IA2-5.1)
#   - PARALLEL TASK LIMIT: Max 10 concurrent per parallel_batch (IA2-6.1)
#   - RESULT ACCESS TEST: MS8 Chain 5 verifies getResult() contract (IA2-6.2)
#   - NAMESPACE AUDIT: No tool name collisions across MCP servers (IA2-11.1)
#   - SESSION PLANNING: Boot Step 3.5 — plan before executing (IA2-8.1)
#   - TIER 2.5: Partial dispatcher failure degradation (IA2-7.1)
#   - PHASE GATE AUTOMATION: Automated vs human-review distinction (IA2-9.2)
#   - STATE FILE STABILITY: Backward-compatible format additions (IA2-12.1)
#   All v13.6 infrastructure audit hardening retained unchanged.
#
# v13.6 CHANGES (from v13.5 — Infrastructure Audit Hardening, 23 findings):
#   - SCHEMA TOKEN AUDIT: New Boot Step 3.1 — measure actual system overhead, budget rule (IA-2.1)
#   - GRACEFUL DEGRADATION: 5-tier hierarchy when subsystems are down (IA-7.1)
#   - POSITION VALIDATION: New Boot Step 2.1 — cross-reference position files (IA-9.1)
#   - CASCADING FAILURE: Chain failure propagation protocol (IA-7.3)
#   - ERROR CONTEXT: Block errors preserved in position files (IA-7.2)
#   - PARALLEL RESULT CONTRACT: JSON schema for agent results (IA-6.1)
#   - CLAUDE.AI RECOVERY: Full 3-layer cascade with Layer 2 specifics (IA-3.1)
#   - HOOK RESPONSE PROTOCOL: Per-hook output response actions (IA-5.1)
#   - ORCHESTRATOR FAILURE: Fallback to sequential execution (IA-6.2)
#   - RESPONSE CAPPING: Dispatcher-level size limits + responseGuard (IA-2.2)
#   - SUBAGENT BUDGET: 500B summary cap per parallel agent (IA-6.3)
#   - FILE DECONFLICTION: PRISM files via prism_ only, not Desktop Commander (IA-11.1)
#   - API VERSIONING: Additive-only dispatcher changes within P0→R6 (IA-11.2)
#   - NEW ACTION DOCS: Expected build break on EFFORT_MAP exhaustiveness (IA-11.3)
#   - COMPACTION PARALLEL: Re-run protocol for compaction during parallel execution (IA-3.2)
#   - SONNET DELEGATION: Design for model routing by effort tier, R4+ implementation (IA-8.1)
#   - AUTONOMOUS GOAL: Claude selects next goal when human says "continue" (IA-9.2)
#   All v13.5 gap analysis hardening retained unchanged.
#
# v13.5 CHANGES (from v13.4 — Gap Analysis & Pitfall Hardening, 42 findings):
#   - CROSS-FIELD PHYSICS VALIDATION: New post-schema validation for physically impossible calc results (SK-1)
#   - getEffort() FALLBACK: Changed from 'high' to 'max' + boot-time action audit (SK-2)
#   - REFERENCE VALUES: New referenceValues.ts for R2 tolerance validation with sourced data (SK-3)
#   - ALARM TOLERANCE: Exact match → structured-field match with description similarity (SK-4)
#   - MATERIAL SANITY CHECKS: Cross-parameter validation per material class (SK-5)
#   - S(x) DERIVATION: Documented safety score formula origin and physical meaning (SK-6)
#   - ADAPTIVE RATE LIMITING: p-queue responds to 429s with backoff (CB-4)
#   - PARALLEL TIMEOUT: Per-task timeout in swarm_execute batches (CB-1)
#   - CONTEXT EDITING SAFETY: No clearing during active parallel tasks (CB-2)
#   - HEALTH SCHEMA EXPANSION: Added registry_status for partial startup detection (AG-3)
#   - UNIT TEST MANDATE: Unit tests alongside integration tests from P0 (AG-4)
#   - CALC RESULT VERSIONING: meta block in structured output schema (AG-2)
#   - ORPHANED TMP CLEANUP: Added to boot protocol (DC-1)
#   - TRACKER ATOMIC WRITES: ROADMAP_TRACKER uses atomicWrite (DC-2)
#   - FORMULA LIMITATION CATEGORY: Fifth classification for R2 fix cycle (OB-1)
#   - CLAUDE DESKTOP RESTART: Process verification after restart (OB-3)
#   - FINDINGS SIZE CAP: Max 10 CRITICAL findings per phase in tiered loading (OB-4)
#   - WALL-CLOCK ESTIMATES: Split into compute time + human time, latency-aware (OB-6)
#   - PARALLEL EQUIVALENCE TOLERANCE: Tolerance-based comparison for R6 diff (CB-5)
#   - RALPH/OMEGA SANITY CHECK: Validate-the-validator step before phase gates (SD-5)
#   All v13.4 instruction completeness hardening retained unchanged.
#
# v13.4 CHANGES (from v13.3 — Instruction Completeness Hardening):
#   - BUILD FAILURE TRIAGE: New section in §Code Standards — classify, fix one, rebuild loop
#   - MCP SERVER RESTART: Added to Boot Protocol after every code-modifying build
#   - STRUCTURED OUTPUT INVOCATION: HOW-TO added to §Structured Outputs (server-level, not per-call)
#   - SUB-MS POSITION TRACKING: ACTION_TRACKER threshold lowered >12 → >8 calls + lightweight updates
#   - INTERMEDIATE VARIABLE PERSISTENCE: New pattern for task_ids, file paths, counts
#   - COMPACTION INSTRUCTIONS: Enhanced to preserve current step number within MS
#   - CRASH RECOVERY: New section for MCP server crash handling
#   - RALPH/OMEGA: What they evaluate, how to improve failing scores
#   - WALL-CLOCK TIMES: Approximate durations per MS tier
#   - SHARED STATE QUICK CHECK: Practical guide for parallel vs sequential decision
#   All v13.3 tool utilization hardening retained unchanged.
#
# v13.2 CHANGES (from v13.1 — Coding Best Practices Hardening):
#   - EFFORT_MAP: Record<string,string> → exhaustive typed Record<ActionName,EffortLevel> + getEffort() fallback
#   - STRUCTURED OUTPUTS: All cutting params required, exclusiveMinimum:0, physical upper bounds, additionalProperties:false
#   - HEALTH_SCHEMA: Added to structured outputs (prevents silent regression pass on undefined fields)
#   - COMPACTION INSTRUCTIONS: Hardcoded as const, NOT env-configurable (safety invariant)
#   - CODE STANDARDS: Major expansion with 5 required utilities (atomicWrite, env, apiTimeout, PrismError, tolerances.ts)
#   - CODE STANDARDS: Added error taxonomy (SafetyBlockError/DataError/NetworkError), schema migration path,
#     API rate limiting for batches, structured JSON logging from P0 onward, Vitest test framework convention
#   - BOOT PROTOCOL: .gitignore expanded (exclude transient state files, keep audit trail)
#   - BOOT PROTOCOL: Health check validates against HEALTH_SCHEMA (prevents undefined < 31 silent pass)
#   - PARALLEL EXECUTION: Added ordering rule (sort by stable key before flush for deterministic diffs)
#   - VERIFIED FLUSH: Added content verification step for MANDATORY flushes (read-back last 100 chars)
#   - TOLERANCE TABLE: Added note requiring src/schemas/tolerances.ts code file alongside protocol doc
#
# v13.1 CHANGES (from v13.0):
#   - RESTORED: Canonical Tolerance Table (R2_TOLERANCES) — math accuracy gate separate from S(x) safety gate
#   - RESTORED: Lightweight compaction detection + 3-layer recovery cascade for claude.ai fallback
#     (~60 lines vs 468 in v12.2 CMS — retains all recovery capability without avoidance/telemetry overhead)
#   - RESTORED: Verified Flush protocol detail (mandatory/optional classification)
#   - RESTORED: Session management guidance in PHASE_TEMPLATE.md
#   - All Opus 4.6 additions from v13.0 retained unchanged
#
# v13.0 CHANGES (from v12.2):
#   - Compaction Management System v2.0 (636 lines) → REMOVED. Replaced by Compaction API (~50 lines)
#   - Added: Opus 4.6 Configuration section (Adaptive Thinking, Structured Outputs, Agent Teams,
#            Fast Mode, Context Editing, Fine-grained Streaming, Data Residency, Prefilling removal)
#   - Added: Effort Tier Classification (per-action mapping to low/medium/high/max)
#   - Added: Structured Output Schemas for safety-critical calculations
#   - Added: Parallel Execution Patterns for Agent Teams
#   - Boot Protocol: Updated for Opus 4.6 config verification at Step 1.1
#   - Code Standards: Updated with Opus 4.6 API patterns (output_config, adaptive thinking)
#   - Flush-to-file patterns RETAINED for cross-session persistence (not for compaction management)
#   - Idempotency Classification RETAINED (needed regardless of compaction method)
#   - Micro-checkpoints RETAINED as disk-level state persistence (backup role)

---

## BOOT PROTOCOL (every session, no exceptions)

```
STEP -1: FIRST SESSION ONLY — Git Init
  cd C:\PRISM\mcp-server && git status
  If not a repo: create .gitignore → git init → git add -A → git commit -m "baseline"

  .gitignore creation:
    prism_dev action=file_write path=".gitignore" content="[entries below]"
    IF .gitignore already exists: READ it first. APPEND new entries. Do NOT overwrite existing.

  .gitignore MUST contain:
    node_modules/
    dist/
    *.js.map
    .env
    *.tmp
    CURRENT_POSITION.md
    CURRENT_STATE.json
    COMPACTION_SURVIVAL.json
    RECENT_ACTIONS.json

  KEEP TRACKED (audit trail): ROADMAP_TRACKER.md, ACTION_TRACKER.md, PHASE_FINDINGS.md
  WHY: Transient state files (position, runtime JSON) pollute git history with noise.
  Audit trail files (tracker, findings) are intentional records of project progress.

STEP -0.5: EVERY SESSION — Orphaned Temp File Cleanup
  Check for orphaned .tmp files in state and data directories.
  These are incomplete writes from prior crashes (atomicWrite creates .tmp → rename).
  If any found → delete them. They are BY DEFINITION incomplete writes.
  WHY: Accumulation wastes disk and backup scripts may restore partial data.

STEP 0: STATE SNAPSHOT (before any MS that modifies code)
  git add -A && git commit -m "pre-[MS-ID] snapshot"
  SKIP if MS is read-only/diagnostic.

STEP 1: BOOT + CONTEXT
  prism_dev action=session_boot
  prism_context action=todo_update

STEP 1.1: HEALTH + OPUS 4.6 GATE
  prism_dev action=health
  VALIDATE response against HEALTH_SCHEMA (see §Structured Output Schemas):
    status: must be "ok" | "degraded" | "error" (not undefined/null)
    dispatchers: must be integer >= 0 (not undefined — undefined < 31 is false, silent pass)
    heap_used_mb: must be number >= 0
    uptime_s: must be number >= 0
  IF any field missing or wrong type → health endpoint is BROKEN. Fix before proceeding.
  IF status != 'ok' → STOP. Fix health first. Restart from Step 1.
  IF heap_used_mb > 3000 → WARN (note for R6 memory profiling).
  IF dispatchers < 31 (after P0) → REGRESSION. Debug before proceeding.

  OPUS 4.6 VERIFY (after P0-MS0 completes):
    Confirm .env has: OPUS_MODEL=claude-opus-4-6
    Confirm adaptive thinking is wired (not legacy budget_tokens)
    Confirm Compaction API configuration is active
    Confirm no assistant message prefilling in any API call path

STEP 1.5: ADOPT PHASE ROLE + LOAD SKILLS + ENABLE HOOKS
  Read current phase from CURRENT_POSITION.md (fallback: ROADMAP_TRACKER.md).
  Load active role ONLY from PRISM_PROTOCOLS_REFERENCE.md §Role Protocol.
  State the role in first response.

  LOAD PHASE SKILLS (Law 6: 100% UTILIZATION — if it exists, USE it):
    Look up current phase in §Role Protocol → find SKILLS list for that phase.
    For EACH listed skill:
      prism_skill_script action=skill_load skill="[skill-name]"  [effort=low]
    This primes the skill context for the entire session. Cost: ~1-2 calls, ~0.5KB each.
    Example for R2: skill_load "prism-speed-feed-calc", skill_load "prism-kienzle-force",
                    skill_load "prism-taylor-tool-life", skill_load "prism-thread-calcs"

    SKILL→PHASE QUICK REFERENCE (canonical list in §Role Protocol):
      P0: prism-system-architecture, prism-hook-system, prism-dev-utilities
      R1: prism-material-science, prism-formula-registry, prism-data-loading
      R2: prism-speed-feed-calc, prism-kienzle-force, prism-taylor-tool-life, prism-thread-calcs
      R3: prism-data-campaigns, prism-quality-validation, prism-pfp-engine
      R4: prism-api-contracts, prism-dev-utilities, prism-system-architecture
      R5: prism-system-architecture
      R6: prism-system-architecture, prism-dev-utilities

  ENABLE PHASE HOOKS (zero-token-cost enforcement — activate the safety net):
    Look up current phase in §Role Protocol → find HOOKS list for that phase.
    For EACH listed hook:
      prism_hook action=enable hook="[hook-name]"  [effort=low]
    Verify activation: prism_hook action=coverage → phase hooks show ACTIVE.
    IF hook not found → it was not registered in P0-MS2. Note in ACTION_TRACKER.

    HOOK→PHASE QUICK REFERENCE (canonical list in §Role Protocol):
      P0: on_failure (structured diagnosis on dispatcher errors)
      R1: on_failure (loading errors are common during data work)
      R2: smart_reflection (auto-compare actual vs expected metallurgical range)
      R3: batch_quality (cumulative error rate tracking + budget alerts)
      R4: on_failure + smart_reflection (API reliability needs both)
      R5: none (frontend work doesn't benefit from auto-diagnosis hooks)
      R6: on_failure (SRE needs immediate structured diagnosis during load testing)

  WHY THIS MATTERS: P0-MS1 verifies 119 skills exist. P0-MS2 verifies 62+ hooks exist.
  Without these two sub-steps, they EXIST but are never USED — violating Law 6.
  Skills inform response quality. Hooks catch errors automatically. Both are free after loading.

STEP 2: POSITION RECOVERY
  prism_doc action=read name=CURRENT_POSITION.md
  Format: "CURRENT: [MS-ID] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID] [status]"
  If missing → prism_doc action=read name=ROADMAP_TRACKER.md (read last 5 entries only)
  If both missing → P0-MS0.

STEP 2.1: POSITION VALIDATION (verify position is correct, not just readable — IA-9.1)
  Read CURRENT_POSITION.md → extract current MS and LAST_COMPLETE.
  Read ROADMAP_TRACKER.md → extract last 3 entries.
  VERIFY CONSISTENCY:
    Last ROADMAP_TRACKER entry must match CURRENT_POSITION's LAST_COMPLETE field.
    If mismatch → CURRENT_POSITION is stale. Update from ROADMAP_TRACKER.
  VERIFY PREREQUISITES:
    If current MS is R1-anything → P0 must be marked complete in MASTER_INDEX §Phase Registry.
    If current MS is R2-anything → R1 must be marked complete.
    If prerequisites NOT met → STOP. Do not execute. Diagnose the gap.
  VERIFY PRIOR OUTPUTS:
    P0 complete → PHASE_FINDINGS.md must have P0 section. P0_DISPATCHER_BASELINE.md must exist.
    R1 complete → REGISTRY_AUDIT.md must exist.
    R2 complete → R2_CALC_RESULTS.md must exist.
    If expected output missing → prior phase was marked complete but didn't finish outputs.
    Flag in ACTION_TRACKER: "[PHASE] OUTPUT MISSING: [file]. Re-evaluate prior completion."
  Cost: 2-3 extra reads. Prevents entire sessions wasted on wrong-position execution.

IF CURRENT_POSITION.md is missing BUT ROADMAP_TRACKER.md exists (IA-9.2):
  → Read ROADMAP_TRACKER.md. Find last "COMPLETE" entry.
  → Determine next MS from phase doc dependency graph.
  → Create CURRENT_POSITION.md with determined position.
  → This is AUTONOMOUS POSITION RECOVERY — Claude determined its own next goal.

IF the human provides no specific instruction (just "continue" or "pick up where we left off"):
  → Follow boot protocol. Load position. Execute next MS step.
  → PRIORITY ON AUTONOMOUS CONTINUE (IA2-4.1):
      1. If CURRENT_POSITION shows BLOCKED → read ACTION_TRACKER error context → attempt fix FIRST.
      2. If prior phase gate failed → re-run gate assessment, not next MS.
      3. If all clear → execute next MS step.
      4. If phase complete → move to next phase per §Dependency Resolution.
      RULE: Blocked work takes priority over new work. A block unfixed is a block compounding.
  → If all phases complete: report ROADMAP COMPLETE. Ask human for new goals.

STUCK PROTOCOL (when Claude cannot determine the right action):
  IF you've attempted >=3 different fix approaches for the same error AND none resolved it:
    1. Write to ACTION_TRACKER: "[MS-ID] STUCK: [error] [3 approaches tried] [results]"
    2. Update CURRENT_POSITION.md: status=BLOCKED, reason="Unresolved after 3 attempts"
    3. prism_session action=state_save
    4. Report to human: "I'm blocked on [error] after trying [approaches]. I need guidance
       on [specific question]. The system is in a safe state — no partial writes pending."
    5. DO NOT continue executing. DO NOT attempt a 4th fix without human input.
  WHY: 3 failed attempts consume ~15-30 calls of context. A 4th attempt is unlikely to
  succeed and will waste more context. Human input at this point is cheaper than autonomy.
  CRITICAL: This does NOT apply to safety calc failures (S(x)<0.70). Those are WORKING AS
  INTENDED — the system correctly blocked an unsafe operation. Only invoke this protocol
  for infrastructure/wiring failures that prevent execution.

STEP 2.5: PHASE BOUNDARY SMOKE TEST (only at actual phase transitions)
  prism_data action=material_get material="4140"
  prism_validate action=safety
  prism_dev action=build target=mcp-server
  prism_doc action=read name=MASTER_INDEX.md → verify S1 counts match live (Law 8)
  prism_doc action=read name=CURRENT_POSITION.md → verify PHASE matches the phase you're entering
  prism_doc action=read name=ROADMAP_TRACKER.md → verify last entry is prior phase's final MS
  prism_doc action=read name=PHASE_FINDINGS.md → verify prior phase section exists
  If ANY dispatcher fail → STOP. Debug before entering next phase.
  If ANY state file missing/stale → prior session's save was incomplete. Reconstruct from available data.

  ARTIFACT VALIDATION (XA-1 — verify REQUIRES from SYSTEM_CONTRACT.md):
    Check ALL REQUIRES artifacts for the target phase exist + are non-empty.
    See SYSTEM_CONTRACT.md §Artifact Dependency Table for the full mapping per phase.
    Quick reference:
      Entering R1 → verify: PHASE_FINDINGS.md (P0 section), P0_DISPATCHER_BASELINE.md, OPUS_CONFIG_BASELINE.md
      Entering R2 → verify: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)
      Entering R3 → verify: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section)
      Entering R6 → verify: PHASE_FINDINGS.md (R3+R4+R5 sections), R2_CALC_RESULTS.md, SYSTEM_CONTRACT.md
    If ANY REQUIRES artifact missing → STOP. Prior phase did not complete correctly.
    Log: "[PHASE] ARTIFACT MISSING: [file]. Prior phase completion is suspect."

STEP 3: TOKEN BUDGET
  prism_context action=context_monitor_check
  If pressure >60%: prism_context action=context_compress
  Boot overhead ≈ 2KB. Subtract from MS budget.
  NOTE: Compaction API handles overflow automatically. Manual compress is for hygiene, not survival.
  Target: 3-5 MS/session (light), 2-3 (heavy). Up from v12.2 due to Compaction API safety net.

STEP 3.1: SCHEMA TOKEN AUDIT (run EVERY session during P0 + after dispatcher changes — IA2-2.1)
  prism_context action=context_monitor_check → record total overhead BEFORE any work.
  This is the ACTUAL system overhead. Compare against the ~37K estimate in MASTER_INDEX.
  If actual > 42K → investigate which dispatcher schemas are bloated:
    prism_dev action=code_search pattern="description.*:" path="src/dispatchers/" → find verbose descriptions
    Trim descriptions to 1-2 sentences max. Parameter descriptions to 1 line max.
  If actual < 32K → the estimate is conservative. Update MASTER_INDEX.
  Record measured overhead in OPUS_CONFIG_BASELINE.md for future reference.
  
  SCHEMA TOKEN BUDGET RULE:
    Each dispatcher schema SHOULD cost < 1000 tokens.
    Total schema surface SHOULD be < 25K tokens.
    If total > 30K → consolidate underused dispatchers or move to catalog-based discovery.
    CATALOG DISCOVERY (implement if schema total exceeds 30K):
      Option A — prism_dev action=list_dispatchers → returns [{name, description, action_count}]
      Option B — Lazy loading: boot 10 core dispatchers, load others on first reference.
      Option C — Hybrid: core always loaded, others discoverable.
      DECISION GATE: Measure at P0-MS0b. If <25K, defer. If >30K, implement in P0.
  
  DURING P0: Run EVERY session (validates the estimate iteratively as dispatchers are modified).
  AFTER P0 gate passes: SKIP on subsequent sessions unless: (a) new dispatchers added,
  (b) schema descriptions changed, (c) more than 3 phases since last measurement,
  (d) MCP server configuration changed (new servers added/removed).
  Cost: 1 extra call per P0 session. Value: validated budget by P0 exit.

  RESPONSE BUDGET VALIDATION (add during P0, measure during R1+ — IA3-2.1):
    After each MS completion, record actual throughput in ACTION_TRACKER:
      "[MS-ID] BUDGET: estimated=[N]KB actual=[N]KB delta=[±N]KB"
    If actual > 1.5× estimated for ANY MS → update that MS's budget in the phase doc.
    If actual > 2× estimated → investigate which dispatcher responses grew.
    Cost: 0 extra calls (data available from context_monitor_check already running).

STEP 3.5: SESSION PLAN (Opus-optimized — 0 extra calls, reasoning only — IA2-8.1)
  After loading position, phase doc, and checking context budget:
  PLAN the session before executing:
    - How many MS can fit in remaining context budget?
    - If multiple MS are available (e.g., MS4+MS5+MS6+MS7 any order), which ordering
      minimizes context waste? (smallest MS first frees context for larger ones)
    - Are there any pending blocks or known-will-fix items to address first?
    - Is 1M context warranted for this session's expected workload?
  This planning happens in Claude's reasoning (adaptive thinking), costs 0 tool calls,
  and produces a session execution plan stated in the first response.
  WHY: Opus 4.6's strength is long-range planning. Using it reactively wastes the capability.

STEP 4: EXECUTE CURRENT MS
  Follow MS steps from loaded phase doc. Apply Code Standards + Effort Tiers to every change.

  STEP-LEVEL TRACKING (for any MS with Effort >8 calls):
    After each step-group:
      prism_doc action=append name=ACTION_TRACKER.md
        content="[MS-ID] step-group [NAME] complete [date]"
    Cost: ~1 call/group. Provides disk-level state persistence for cross-session continuity.

  LIGHTWEIGHT POSITION UPDATE (for ALL MS, every 5 calls):
    prism_doc action=write name=CURRENT_POSITION.md
      content="CURRENT: [MS-ID] step [N]/[total] | LAST_COMPLETE: [prior-MS] [date] | PHASE: [ID] in-progress"
    Cost: 1 call per 5 calls. Prevents worst-case full-MS restart on session death.
    WHY: Without this, a session death during a 10-call MS with no ACTION_TRACKER means
    restarting the entire MS. With this, recovery knows your step-level position.

  INTERMEDIATE VARIABLE PERSISTENCE (for values needed by later steps):
    When a step produces a value consumed by a later step (task_id, file path, line number, count):
      Include it in the next ACTION_TRACKER append or CURRENT_POSITION.md update.
      Format: "CURRENT: P0-MS6 step 8/10 | vars: task_id=abc123, hook_count=62 | ..."
    CRITICAL VARIABLES that must survive compaction:
      - task_id from prism_atcs (needed for update/complete in later steps)
      - File paths from code_search (needed for file_read targets)
      - Registry counts from audit steps (needed for NEW >= OLD verification)
      - Hook/skill counts from coverage checks (needed for integration gate baselines)

  ERROR CONTEXT PRESERVATION (for 'block' severity errors — IA-7.2):
    When a PrismError with severity='block' occurs:
      1. Write to ACTION_TRACKER: "[MS-ID] ERROR: [category] [message] at step [N] with input [summary]"
      2. Write to CURRENT_POSITION.md:
         "CURRENT: [MS-ID] step [N] BLOCKED | ERROR: [category] [1-line summary] | LAST_COMPLETE: ..."
      3. Include in state_save: error context (category + step + input summary, not full stack trace)
    Session N+1 reads CURRENT_POSITION.md → sees BLOCKED → reads ACTION_TRACKER for error detail.
    This costs 0 extra calls (writes happen at existing checkpoint points).
    The next session can diagnose and fix without replaying the entire failed conversation.

  MCP SERVER RESTART (after every build that modifies runtime behavior):
    After prism_dev action=build → the server must be restarted for changes to take effect.
    Build compiles to dist/ but the RUNNING server still serves OLD code until restarted.
    RESTART METHODS (in preference order):
      1. Claude Desktop: close and reopen the Claude app (triggers gsd_sync on restart).
         BEFORE closing: verify no batch operations are running (check swarm_status).
         AFTER reopening: verify only ONE server process is running.
           Windows: tasklist | findstr node → should show exactly 1 node.exe for PRISM.
           If multiple: taskkill /F /PID [old_pid] → keep only the newest.
         WHY: Claude Desktop disconnects the MCP socket but may not kill the server process.
         A new instance spins up on reconnect → two processes write to the same state files.
      2. Standalone: kill the Node.js process, npm start.
      3. MCP Inspector: disconnect and reconnect.
    VERIFY restart: prism_dev action=health → uptime_s should be < 60 (fresh start).
    SKIP restart if build is diagnostic-only (e.g., checking for type errors without deploying).

  FLUSH-TO-FILE (for non-regenerable results — RETAINED from v12.2):
    WHY: Flushing is about CROSS-SESSION PERSISTENCE, not compaction management.
    The Compaction API handles context overflow. Flushing ensures results survive session boundaries.
    WHEN: After completing a group of non-regenerable results (multi-step calcs, chain outputs).
    HOW: prism_doc action=append name=[FILE] content="[results]" → verify return value.

    VERIFIED FLUSH PROTOCOL:
      Step 1: FLUSH → prism_doc action=append name=[FILE] content="[results]"
      Step 2: Check return value. SUCCESS → data on disk, safe to shed from context.
      Step 3: If ERROR → retry once. SUCCESS → safe. FAIL AGAIN → DO NOT shed from context.
              Keep results in context until next flush opportunity.
      Step 4: Only after verified success may results be considered "persisted."
      Step 5: MANDATORY FLUSHES ONLY — content verification (read-back last 100 chars):
              prism_doc action=read name=[FILE] → verify tail matches flushed content.
              WHY: Catches partial writes, encoding corruption, disk-full truncation.
              If mismatch → retry full flush. If retry mismatches → STOP, do not shed.
              OPTIONAL flushes (diagnostics, health): skip Step 5.

    WHEN VERIFICATION IS MANDATORY vs OPTIONAL:
      MANDATORY: Multi-step calc results (R2), chain outputs (P0-MS8), results from >3 calls,
                 registry audit data, formula fixes, dedup decisions. Loss = re-execute 3-17 calls.
      OPTIONAL:  Health checks (1 call), single dispatcher tests (1 call), diagnostic reads.

STEP 5: MS COMPLETION
  prism_session action=state_save
  prism_doc action=append name=ROADMAP_TRACKER.md content="[MS-ID] COMPLETE [date]"
    NOTE: ROADMAP_TRACKER is recovery ground truth. If append is interrupted (crash/disk full),
    the last line may be truncated. VERIFY: read last line after append → must match content.
    If truncated → re-read full file, re-write atomically with the new line appended.
  prism_doc action=write name=CURRENT_POSITION.md content="CURRENT: [next-MS] | LAST_COMPLETE: [MS-ID] [date] | PHASE: [ID] [status]"
  prism_context action=todo_update
  IF counts changed → update MASTER_INDEX.md S1
  IF phase gate → load PRISM_PROTOCOLS_REFERENCE.md §Quality Tiers → run RELEASE validation

  PHASE GATE — RALPH/OMEGA SANITY CHECK (before running real assessment):
    prism_ralph action=assess target="health endpoint" → expect A or A+ (known-good baseline).
    prism_omega action=compute target="health endpoint" → expect >= 0.95.
    If sanity check fails → the assessment TOOL is broken, not the phase. Debug ralph/omega first.
    If sanity check passes → proceed with real phase assessment.
    WHY: Without this, a broken ralph/omega produces low scores that look like phase failures.
    The executor spends hours debugging the phase when the problem is the validator itself.

STEP 5.5: CONTEXT SHED (between MS transitions within a session)
  prism_context action=context_compress  ← ALWAYS between MS, not just at high pressure
  Rationale: completed MS results are persisted to files. Shed them for clean context.
```

---

## OPUS 4.6 CONFIGURATION

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
```

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

## CADENCE FUNCTION AWARENESS (30+ auto-firing functions)

```
Cadence functions fire automatically at call-count thresholds during any session.
They are TRANSPARENT — their output does NOT require executor action unless stated below.

CALL-COUNT TRIGGERS (approximate — varies by implementation):
  @5 calls:   todo_update (refreshes todo list)
  @8 calls:   pressure_check + attention_check (monitors context health)
  @10 calls:  checkpoint (writes CURRENT_STATE.json snapshot)
  @12 calls:  compaction check (evaluates context pressure for shed)
  @15 calls:  survival snapshot (writes COMPACTION_SURVIVAL.json)
  @20 calls:  variation check (verifies response patterns haven't degraded)
  @25 calls:  compliance check (runs cross-cutting compliance)
  @build:     gsd_sync (syncs GSD file — SEE EXCEPTION BELOW)
  @file-write: docAntiRegression (validates file write didn't lose data)

EXECUTOR RULES:
  1. If a cadence function output appears mid-step → READ it, but do NOT change your current step.
  2. If a cadence function triggers context_compress → it sheds completed work, not current step.
     Your current step's data remains in context. Continue normally.
  3. If pressure_check fires and reports >60% → finish current step, then manually run
     prism_context action=context_compress before starting next step.
  4. If docAntiRegression fires and reports FAIL → STOP. Investigate data loss before proceeding.

EXCEPTION — gsd_sync AFTER BUILD:
  gsd_sync fires automatically after every npm run build / prism_dev action=build.
  If your NEXT step depends on GSD data (e.g., prism_gsd action=quick):
    Wait for gsd_sync to complete (visible in tool output).
    Then verify: prism_gsd action=quick → check version timestamp is recent.
  If your next step does NOT depend on GSD data: continue normally, ignore gsd_sync output.

WHY THIS SECTION EXISTS: Cadence functions are invisible infrastructure. Without this guide,
an executor seeing unexpected tool output mid-step would be confused about whether to handle it,
wait for it, or panic. The answer is: read it, continue, except for the 2 exceptions above.
```

---

## 8 LAWS (never violate)

```
1. S(x) >= 0.70 = HARD BLOCK. Never skip.
2. NO PLACEHOLDERS. Every value real, complete, verified.
3. NEW >= OLD. Never lose data. BACKUP before destructive ops.
4. MCP FIRST. Use prism_ dispatchers before bash.
5. NO DUPLICATES. Check before creating. One source of truth.
6. 100% UTILIZATION. If it exists, it must work and be used.
7. PIN VERSIONS. No ^ or ~ in package.json (from R4 forward).
8. MASTER_INDEX COHERENCE. Live counts must match MASTER_INDEX.md S1.
   Between gates: MASTER_INDEX is truth. Exception: documented MS changes await next gate.
   At gates: update MASTER_INDEX with evidence.
```

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

## MCP SERVER CRASH RECOVERY

```
SYMPTOMS: Every prism_ call returns "connection refused", "tool not found", or times out.
  This is NOT a compaction event. This is the MCP server process itself being down.

RECOVERY:
  1. Restart the MCP server (see Boot Protocol Step 4 restart methods).
  2. prism_dev action=health → verify it's back. uptime_s should be small.
  3. prism_session action=state_load → does it have your session state?
     If YES → continue from your CURRENT_POSITION.md / ACTION_TRACKER position.
     If NO → the crash may have corrupted state files.
       → Read CURRENT_POSITION.md and ROADMAP_TRACKER.md for ground truth.
       → If both readable → resume from recorded position.
       → If corrupted → use Recovery Cascade Layer 3 (restart from last COMPLETE MS).
  4. Resume execution. Check Idempotency Classification before re-running any step.
     
WHY THIS SECTION EXISTS: The roadmap covers compaction (context) and session death (network).
  Server crashes are a third failure mode with different symptoms and recovery path.
  An executor seeing "tool not found" should restart the server, not debug context.
```

---

## GRACEFUL DEGRADATION HIERARCHY (IA-7.1)

```
When a subsystem is unavailable, PRISM degrades to the highest functional tier:

TIER 1 — FULL CAPABILITY (all subsystems operational):
  All 31 dispatchers, all registries, all calcs, all safety gates. Normal operation.

TIER 2 — REDUCED DATA (1-3 registries partially loaded):
  Safety calcs work for loaded materials. material_get for unloaded materials returns DATA-MISSING.
  S(x) gate still enforced — a calc with missing data returns S(x)=0.0 (BLOCK), not an error.
  Alarm decode works for loaded controllers only. Others return CONTROLLER-NOT-LOADED.
  BLOCKED: R3 batch campaigns (need >95% registry), R6 production gate (needs full coverage).
  AVAILABLE: P0 wiring, R1 loading (this IS the fix), R2 partial testing.

TIER 2.5 — PARTIAL DISPATCHER FAILURE (some dispatchers error, others work — IA2-7.1):

TIER 2.1 — SUSPECT DATA (data loaded but internally inconsistent — IA3-7.1):
  Detected by: Cross-field physics validation (SK-1) returns SafetyBlockError during calcs.
  Or: smart_reflection hook reports OUT_OF_RANGE with delta > 2× tolerance consistently
  for the same material across multiple operations.
  RESPONSE: Quarantine the material. Do NOT return calc results for quarantined materials.
    prism_doc action=append name=QUARANTINE_LOG.md content="[material] [date] [reason]"
    Return to caller: { status: "QUARANTINED", material: "[name]", reason: "[diagnosis]" }
  AVAILABLE: All calcs for non-quarantined materials.
  RESOLUTION: Manual data review in R1 fix cycle or R3 batch validation.
  WHY: A wrong-but-plausible result is more dangerous than an explicit failure.
  An error message stops the operator. A wrong recommendation injures the operator.

TIER 2.5 — PARTIAL DISPATCHER FAILURE (some dispatchers error, others work — IA2-7.1):
  Detected by: health reports status:"degraded" or Boot Step 1.1 shows dispatchers < 31.
  DIAGNOSIS: prism_dev action=health → check which dispatchers are missing.
    For each missing dispatcher: prism_[name] action=health or any simple call.
    For dispatchers WITHOUT a health action: call any LOW-effort action as a probe.
      prism_calc → action=speed_feed material="4140" operation="turning" (known-good input)
      prism_thread → action=thread_specs thread="M10x1.5"
      prism_data → action=material_get material="4140"
      The goal is any response that proves the dispatcher is loaded and responding.
      If probe returns data → dispatcher is healthy. If error/timeout → dispatcher is broken.
    If timeout → dispatcher crashed at init. Check server logs.
    If error → dispatcher loaded but handler broken. Read error message.
  AVAILABLE: All dispatchers that respond without error.
  BLOCKED: Workflows that depend on broken dispatchers.
  RECOVERY: Fix broken dispatcher → rebuild → restart → verify.
  RULE: Do not attempt chains that include a broken dispatcher. Fix it first.
  COMMON DURING P0: Expected when dispatchers are being actively modified.

TIER 3 — NO API (Anthropic API unreachable or rate-limited):
  All local operations work: file_read, file_write, code_search, build, health.
  All API-dependent operations blocked: safety calcs, ralph, omega, agent_execute, PFP.
  MITIGATION: Wait for rate limit reset (adaptive backoff). If persistent → end session cleanly.
  AVAILABLE: Code refactoring, registry deduplication, test writing, documentation.

TIER 4 — MCP SERVER DOWN:
  All prism_ calls fail. Desktop Commander may still work.
  RECOVERY: Restart MCP server → health → resume. See §MCP Server Crash Recovery.
  If restart fails → no PRISM operations possible. End session. Fix server manually.

TIER 5 — DESKTOP COMMANDER DOWN:
  prism_ calls work. File system operations via bash unavailable.
  AVAILABLE: All prism_ dispatchers, API calls, state management.
  BLOCKED: Direct file editing via Desktop Commander. Use prism_dev action=file_write instead.

DEGRADATION DETECTION:
  Boot health check reports registry_status per registry. If ANY shows "error" or "empty":
    You are in TIER 2. Log which registries are degraded in ACTION_TRACKER.
  If prism_ calls return "connection refused" → TIER 4. Restart server.
  If API calls return 429 repeatedly after adaptive backoff exhaustion → TIER 3. Wait.
  If Desktop Commander calls fail → TIER 5. Use prism_dev file operations instead.

RULE: Always operate at the highest available tier. Never attempt operations that require
a higher tier than currently available — they will fail and waste context.
```

---

## CLAUDE.AI COMPACTION RECOVERY (when Compaction API is not available — IA-3.1)

```
USE WHEN: Running in claude.ai where you cannot control API configuration.
The Compaction API handles overflow in MCP server API calls. In claude.ai, you have the
3-layer recovery cascade below.

DETECTION: Session context appears truncated. Prior tool results are missing from memory.
  Test: Can you recall the last 3 tool responses? If not → compaction occurred.
  NOTE: Do not confuse with MCP server crash (all prism_ calls fail) — see §Crash Recovery.

LAYER 1 — STANDARD RECOVERY (~6 calls, covers 85% of cases):
  1. prism_session action=state_load → session state                         [effort=low]
  2. prism_doc action=read name=CURRENT_POSITION.md → position               [effort=low]
  3. prism_doc action=read name=ACTION_TRACKER.md → last step-group (tail 10 lines)  [effort=low]
  4. prism_dev action=health → system alive                                  [effort=low]
  5. Load active phase doc (MANDATORY — contains MS instructions).
     BOUNDED LOAD: Load ONLY the active MS section, not the full phase doc.
     Use prism_doc action=read with start_line/end_line targeting the current MS header.
     If MS boundaries are unknown → load the phase doc's first 20 lines (§Context Bridge +
     §Objectives + MS headers) to find the right section, THEN load that section only.
     TOTAL: ~1-3K tokens (vs ~4-8K for full phase doc).
     WHY: Loading the full phase doc during recovery risks triggering re-compaction
     in claude.ai sessions that are already at high context pressure.
  6. Resume at next step per ACTION_TRACKER position.
  TOTAL CONTEXT COST: ~7-10KB (position + phase doc). Working budget remains ~150K+.

LAYER 2 — DEEP RECOVERY (~10 calls, covers 10% — when Layer 1 position is stale):
  1-4. Same as Layer 1.
  5. prism_doc action=read name=ROADMAP_TRACKER.md → last 10 entries          [effort=low]
  6. Cross-reference ROADMAP_TRACKER vs CURRENT_POSITION vs ACTION_TRACKER.
  7. If CURRENT_POSITION is stale (older than ROADMAP_TRACKER's last entry):
     Update CURRENT_POSITION from ROADMAP_TRACKER.
  8. prism_doc action=read name=PHASE_FINDINGS.md → current phase section only [effort=low]
  9. Load active phase doc.
  10. Resume from reconciled position.
  WHEN TO USE LAYER 2: Layer 1 position seems wrong (references a step you don't recognize)
  or CURRENT_POSITION.md was not updated before compaction (no lightweight position update).
  PREREQUISITE: Requires at least 15+ calls in the session before compaction (enough for
  ROADMAP_TRACKER to have useful entries).

LAYER 3 — EMERGENCY (~3 calls, covers 5% — when state files are corrupted):
  1. prism_dev action=health → verify system alive                           [effort=low]
  2. prism_doc action=read name=ROADMAP_TRACKER.md → find last "COMPLETE" entry [effort=low]
  3. Load phase doc for that MS's phase.
  4. Resume from the MS AFTER the last completed one.
  5. Accept: all in-progress work since that checkpoint is LOST. Re-execute.
  WHEN TO USE LAYER 3: CURRENT_POSITION.md is corrupted/unreadable AND ACTION_TRACKER
  is corrupted/unreadable. ROADMAP_TRACKER is the last line of defense (append-only file).

AVOIDANCE (reduces compaction frequency in claude.ai):
  Flush at >60% context pressure. End session cleanly at >75%.
  Between MS transitions: prism_context action=context_compress.
  These don't prevent compaction but reduce its frequency significantly.
```

---

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
