# PRISM PROTOCOLS - BOOT (loaded every session)
# Split from PRISM_PROTOCOLS_CORE.md on 2026-02-17 (Roadmap Audit Finding 1+14)
# Contains: Laws, Boot Protocol, Phase Context, Cadence, Session Mgmt, Recovery
# Other protocols: PROTOCOLS_SAFETY.md (calc phases), PROTOCOLS_CODING.md (impl phases)

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

<!-- ANCHOR: pc_code_standards_apply_to_all_code_changes_all_phases -->

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

STEP 0.5: ENVIRONMENT DETECTION (run FIRST — determines which tools to use)
  TRY: prism_dev action=health
    → SUCCESS (status ok, dispatchers ≥ 31): MCP MODE.
      Use prism_ tools for state, docs, calcs. Full capability.
    → FAIL (connection refused / tool not found / timeout): NO MCP.
      TRY: Desktop Commander (read_file / start_process)
        → SUCCESS: DC MODE. Read/write files via Desktop Commander.
          State files at C:\PRISM\mcp-server\data\docs\
          Roadmap files at C:\PRISM\mcp-server\data\docs\roadmap\
          Skip all prism_ calls. Use DC equivalents.
        → FAIL: MINIMAL MODE. Ask human to start MCP server or enable DC.
  LOG: State detected environment in first response.
  IF DC MODE: Skip Steps 1, 1.1, 1.5 (all use prism_ tools).
    Instead: Read CURRENT_POSITION.md and active phase doc via DC. Execute directly.

STEP 1: BOOT + CONTEXT (MCP MODE ONLY — skip in DC MODE)
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
  Load active role from §Phase Execution Context table above (replaces PRISM_PROTOCOLS_REFERENCE.md §Role Protocol).
  State the role AND execution environment in first response.

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
  See §STUCK PROTOCOL — AUTONOMOUS RECOVERY below for the full escalation ladder.
  SUMMARY: 3 same-approach attempts → try different approach. 6 total → skip if non-blocking.
  Only ask human if step is BLOCKING (prevents all subsequent steps) after 6+ attempts.
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
  COST: Check §Phase Execution Context Cost Model. R1 sessions (Haiku/Sonnet) fit ~3x more work than R7 (Opus).

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


---

<!-- ANCHOR: pc_phase_execution_context_role_environment_model -->
## PHASE EXECUTION CONTEXT — ROLE + ENVIRONMENT + MODEL

Each phase declares its execution context. This determines response depth,
technical vocabulary, quality gate emphasis, risk tolerance, AND tooling.

| Phase | Role | Environment | Model Strategy | Parallel Opportunities |
|-------|------|-------------|----------------|----------------------|
| DA | DevOps Engineer | Claude Code (100%) | Sonnet | None — sequential config |
| R1 | Data Architect | Claude Code (80%) + MCP (20%) | Haiku explore → Sonnet normalize → Opus schema design | MS5+MS6+MS7 concurrent (3 subagents). MS8 fans across 5 agents (32 formulas each) |
| R2 | Safety Systems Engineer | Hybrid: Code (benchmarks) + MCP (Ralph validation) | Sonnet harness → Opus safety review | 50-calc benchmark fans across 5 subagents. 29 safety tests as background batch |
| R3 | Principal Systems Architect | Hybrid: Code (batch campaigns) + MCP (action design) | Sonnet implement → Opus integration design | Data campaigns via background agents. Action design sequential in MCP |
| R4 | Platform Engineer | Claude Code (90%) | Sonnet throughout. Opus at gate only | Multi-file refactoring — standard Code workflow |
| R5a | Frontend Engineer | Claude Code (100%) | Sonnet | Parallel with R4 |
| R5b | Product Designer | Hybrid: MCP (UX design) + Code (implement) | Sonnet | After R4+R5a |
| R6 | Site Reliability Engineer | Claude Code (80%) + MCP (gates) | Sonnet implement → Opus fault analysis | After R8. 10 fault injection tests |
| R7 | Applied Research Engineer | Hybrid: Code (catalog extraction) + MCP (physics design) | Haiku parse → Sonnet wire → Opus physics modeling | R7-MS6 catalog extraction: background agents parallel across manufacturer catalogs. Main session does R7-MS0 coupled physics simultaneously |
| R8 | Product Architect | Claude.ai MCP (80%) + Code (20%) | Opus architecture → Sonnet skill creation | 22 app skills can batch-create in Code |
| R9 | Integration Architect | Claude Code (90%) | Sonnet | Protocol adapters are independent — parallelizable |
| R10 | CTO / Visionary | Claude.ai MCP (100%) | Opus | Pure strategic design — no implementation |
| R11 | Product Engineer | Claude Code (70%) + MCP (30%) | Sonnet packaging → Opus product architecture | SFC, PPG, Shop Manager, ACNC as independent streams |
| Cross-cutting | Principal Systems Architect | Claude.ai MCP | Opus | Roadmap maintenance, gap analysis, dependency management |

<!-- ANCHOR: pc_execution_environment_decision_tree -->
### Execution Environment Decision Tree
```
- Write/test/fix loops or batch processing → Claude Code
- Design/planning/validation/phase gates → Claude.ai MCP
- Both needed → Hybrid, with explicit handoff points documented in phase file
- Safety calculations → ALWAYS through MCP (server-side validation)
- Build verification → ALWAYS through Claude Code hooks (deterministic)
- Registry loading → Prefer Code for parallelism, MCP for validation
```

<!-- ANCHOR: pc_cost_model_inform_session_planning -->
### Cost Model (inform session planning)
```
- Haiku: 1x baseline (exploration, grep, file reading)
- Sonnet: 3x (implementation, normalization, testing)
- Opus: 15x (safety review, architecture, physics, phase gates)
- Impact: R1 is cheap (mostly Haiku/Sonnet). R7 coupled physics is expensive (Opus).
  You can fit ~3x more R1 work into a session budget than R7 work.
- Estimated savings vs all-Opus: 40-60% token cost reduction
```

<!-- ANCHOR: pc_opus_4_6_configuration -->
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

<!-- ANCHOR: pc_8_laws_never_violate -->

---

## SESSION HANDOFF PROTOCOL (v14.3)

```
WHEN: Before ending any session, when context pressure > 75%, or before expected compaction.
PURPOSE: Give the next session (or post-compaction recovery) a richer starting point than
just CURRENT_POSITION.md.

WRITE SESSION_HANDOFF.md:
  MCP: prism_doc action=write name=SESSION_HANDOFF.md content="[below]"
  DC:  Desktop Commander write_file C:\PRISM\mcp-server\data\docs\SESSION_HANDOFF.md

FORMAT:
  POSITION: [current phase]-[current MS], step [N]
  LAST_COMPLETED: [last finished step with description]
  NEXT_STEP: [what to do next — be specific enough that a fresh Claude can execute it]
  IN_PROGRESS: [any partial work, where it's saved on disk]
  BLOCKING: [any issues preventing progress, or "none"]
  ENVIRONMENT: [MCP / DC / Hybrid — what was working this session]
  SESSION_DATE: [date]

THEN:
  1. Update CURRENT_POSITION.md with latest position
  2. Append to ROADMAP_TRACKER.md if any MS completed this session
  3. prism_session action=state_save (MCP mode only)

ON RECOVERY: The next session reads SESSION_HANDOFF.md AFTER CURRENT_POSITION.md
for richer context about what was happening. SESSION_HANDOFF.md is optional — if
missing, CURRENT_POSITION.md alone is sufficient for position recovery.
```

---

<!-- ANCHOR: pc_session_knowledge_extraction_protocol_v14_4 -->
## STUCK PROTOCOL — AUTONOMOUS RECOVERY (v14.3)

```
When a step fails repeatedly, escalate through these levels before asking the human:

LEVEL 1 (attempts 1-3): Try to fix with SAME approach, different parameters.
  Change one thing per attempt. Read the exact error message. Fix the specific issue.

LEVEL 2 (attempts 4-5): Try DIFFERENT approach entirely.
  Attempt 4: Search codebase for similar patterns (code_search / grep for related implementations).
  Attempt 5: Read related test files for expected behavior.

LEVEL 3 (attempt 6): Can this step be SKIPPED?
  IF step is non-blocking (subsequent steps don't depend on it):
    → Mark DEFERRED in ACTION_TRACKER with diagnosis: "DEFERRED [step] — [error] after 6 attempts"
    → Continue with next step.
  IF step is data-loading (R1 registry work) and data is bad:
    → Quarantine the bad data in PHASE_FINDINGS.md
    → Continue with remaining good data
  IF step is BLOCKING (all subsequent steps depend on it):
    → Write detailed diagnosis to ACTION_TRACKER:
      "BLOCKED on [step]: [error]. Tried: [list of 6 approaches]. Need: [specific question]."
    → Ask human for guidance with the SPECIFIC question, not a vague "I'm stuck."

NEVER give up silently. NEVER skip blocking steps. NEVER ask human before attempt 4.
Log every attempt in ACTION_TRACKER for cross-session learning.
```

---

<!-- ANCHOR: pc_mcp_server_crash_recovery -->
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

<!-- ANCHOR: pc_graceful_degradation_hierarchy_ia_7_1 -->
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

<!-- ANCHOR: pc_claude_ai_compaction_recovery_when_compaction_api_is_not_available_ia_3_1 -->
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

CLAUDE.AI PURE RECOVERY (when MCP server tools are NOT available — e.g., roadmap editing,
  planning sessions, audits, or any claude.ai session without prism_ dispatchers):

  The 3-layer cascade above assumes prism_session, prism_doc, prism_dev exist.
  In Claude.ai sessions doing roadmap work, those tools don't exist. Use this instead:

  LAYER 0 — TRANSCRIPT RECOVERY (primary method, always works):
    1. Check /mnt/transcripts/ for session transcript files.
       Command: ls -la /mnt/transcripts/
    2. Read the journal: cat /mnt/transcripts/journal.txt
    3. Read the tail of the latest transcript to find last work done:
       tail -200 /mnt/transcripts/[latest-file].txt
    4. Check /home/claude/ for any files written to disk during the session.
    5. Resume from the last work product found on disk or in transcript.
    WHY: Transcripts capture the FULL conversation history including tool calls
    and responses. This is the most reliable recovery source in claude.ai.

  LAYER 0.5 — DISK STATE RECOVERY:
    1. Check /home/claude/ for any progress tracking files.
    2. Check /mnt/user-data/outputs/ for any completed deliverables.
    3. If a progress tracker exists (e.g., FIX_TRACKER.md, AUDIT_REPORT.md),
       read it to determine completed vs remaining work.
    4. Resume from first incomplete item.

  FLUSH-EARLY PRINCIPLE (prevents data loss during compaction — ALL environments):
    For ANY non-trivial work in Claude.ai (not just MCP calcs):
    - Writing an audit or report → flush each section to disk as completed
    - Editing multiple roadmap files → save progress tracker after each file
    - Building a zip package → save manifest to disk before packaging
    - Planning or brainstorming → write conclusions to disk incrementally
    Rule: If you've done >5 minutes of work without writing to disk, FLUSH NOW.
    Pattern: Write to /home/claude/[task]-progress.md after each logical unit of work.

  COMPACTION SUMMARY SURVIVAL (ensure recovery info fits in summary):
    When compaction summaries are generated, ensure they include:
    - The path to any progress tracker on disk
    - The list of completed vs remaining items
    - The command to read the transcript for full context
    This is ~200 bytes and should survive any summarization.
```

---

<!-- ANCHOR: pc_session_handoff_protocol_v14_3 -->
