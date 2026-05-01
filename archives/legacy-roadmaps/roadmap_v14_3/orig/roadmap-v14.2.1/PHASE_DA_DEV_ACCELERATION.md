# PHASE DA: DEVELOPMENT ACCELERATION — v14.2
# Status: not-started | Sessions: 2-3 | MS: 5 (MS0-MS4) | Role: Context Engineer
# Pattern: Every MS follows AUDIT → OPTIMIZE → TEST → DOCUMENT
#
# WHY THIS PHASE EXISTS AND WHY IT GOES FIRST:
#   Every session we lose context to compaction. Every session we under-utilize
#   skills, scripts, hooks, and agents. Every session we re-discover what was
#   already known. Every session we could be 2-3x faster if the development
#   infrastructure was optimized. This phase fixes that BEFORE R1 continues,
#   because the ROI compounds across every subsequent session.
#
#   Estimated time saved: 15-30 minutes per session × 50+ remaining sessions
#   = 12-25 hours of recovered development time.
#
# DEPENDS ON: P0 complete (dispatchers wired, Opus 4.6 configured)
# LEVERAGES: F2 (Memory Graph), F3 (Telemetry), F6 (NL Hooks), W2.5 (HSS)

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 wired 31 dispatchers. F1-F8 features all complete. W2.5 HSS
optimization delivered 53 hooks, 6 skill chains, 6 response templates, pressure-adaptive
auto-injection. R1-MS0 through MS4 loaded registries to >95%.

WHAT THIS PHASE DOES: Optimizes the DEVELOPMENT PROCESS itself — context management,
session continuity, compaction recovery, and tool utilization — so every subsequent
phase executes faster and loses less work.

WHAT COMES AFTER: R1-MS4.5 through MS9 (data foundation completion), then R2 safety.

---

## DA-MS0: CONTEXT ENGINEERING AUDIT + OPTIMIZATION
### Goal: Minimize context loss, maximize useful context per token
### Source: Manus AI 6 Laws, HSS W2.5, Compaction API behavior

```
0. SPLIT PROTOCOLS_CORE IMMEDIATELY (do this before anything else):
   Current: ~111KB (huge). Most sessions use <30% of content.
   Action: Split into tiered loading:
     PRISM_PROTOCOLS_BOOT.md      — Boot sequence + laws + effort config (~2K tokens)
     PRISM_PROTOCOLS_SAFETY.md    — Structured outputs + physics validation (~2K tokens)
     PRISM_PROTOCOLS_CODING.md    — Code standards + build process (~1.5K tokens)
   Load BOOT every session. Load SAFETY only during R2+ calc phases.
   Load CODING only during implementation sessions.
   Verify: load BOOT only → run health check → confirm system operational.
   SAVINGS: Immediate ~3-5K tokens per session from this point forward.
   This is a prerequisite, not a milestone — do it in the first 10 minutes of DA.
   ⚡ CLAUDE CODE: Can execute the split + verification in terminal while Desktop plans.

1. AUDIT CURRENT CONTEXT COSTS:
   Measure actual token cost of every framework file:
     - This master index: ___K tokens
     - PRISM_PROTOCOLS_BOOT.md (after split): ___K tokens
     - Each phase doc: ___K tokens
     - Boot overhead: ___K tokens
     - Skill auto-injection: ___K tokens (pressure-adaptive from W2.5)
   Record in CONTEXT_AUDIT.md

2. OPTIMIZE PHASE DOC LOADING:
   Large phase docs (R1=62K, R3=36K, R7=37K) contain completed MS content.
   Action: Add "SKIP TO CURRENT" markers in each phase doc.
   Format: <!-- CURRENT_MS: R1-MS5 --> at the active milestone.
   Loader reads from marker forward, skipping completed MS detail.
   SAVINGS: ~30-50% of phase doc tokens for phases with many completed MS.

3. IMPLEMENT CONTEXT BUDGET TRACKING:
   Add to boot protocol: measure framework load + log to CONTEXT_BUDGET_LOG.md
   Track: session_date, framework_tokens, work_tokens, compaction_count, ms_completed
   Enables: trend analysis showing if framework is growing unsustainably.

4. OPTIMIZE SKILL AUTO-INJECTION:
   W2.5 built pressure-adaptive sizing for 117 enriched skill descriptions.
   Audit: Which skills actually get injected? Which are useful vs noise?
   Action: Create SKILL_RELEVANCE_MAP.json mapping phase→relevant_skills.
   During R1: inject only data/registry skills. During R2: only calc/safety skills.
   SAVINGS: Inject 5-8 relevant skills instead of broad auto-injection.

5. CLAUDE CODE READINESS:
   a. Verify Claude Code runs simultaneously with Desktop (already confirmed v2.1.42)
   b. Verify CLAUDE.md at project root is read correctly (already confirmed)
   c. Create .claude/skills/ directory with 4 PRISM skills:
      prism-safety.md    — Safety invariants, S(x) rules, structured output requirements
      prism-build.md     — Build process, anti-regression, version pinning
      prism-registries.md — Registry structure, data validation, ToolIndex
      prism-wiring.md    — D2F/F2E/E2S wiring protocol
   d. Run parallel session test (Desktop + CLI simultaneously)
   e. Test agent teams if experimental flag available
   f. Document results in CLAUDE_CODE_READINESS.md
   g. Update PARALLEL_TASK_MAP.md with Claude Code capabilities
   h. Identify first 3 tasks to delegate to Claude Code in R1
```

## DA-MS1: SESSION-TO-SESSION CONTINUITY HARDENING
### Goal: Zero re-discovery between sessions. Resume in <60 seconds.
### Source: W2.5 checkpoint system, F2 Memory Graph, compaction behavior

```
1. HARDEN CURRENT_POSITION.md:
   Current format: single line "CURRENT: R1-MS5 | LAST_COMPLETE: R1-MS4 2026-02-15"
   Expand to structured state:
     CURRENT_MS: DA-MS1
     LAST_COMPLETE: DA-MS0 2026-02-XX
     ACTIVE_SUBTASK: "Implementing session state persistence"
     BLOCKED_BY: (none)
     NEXT_3_STEPS: ["Finish subtask X", "Test Y", "Gate check Z"]
     CONTEXT_NOTES: "Key decision: split PROTOCOLS_CORE into 3 files. File X was modified."
     FILES_MODIFIED_THIS_SESSION: ["file1.ts", "file2.md"]
     UNCOMMITTED_WORK: "ToolIndex.ts has 200 lines written, needs testing"
   This survives compaction because it's on disk, not in context.

2. IMPLEMENT SESSION HANDOFF PROTOCOL:
   At session end (STEP 9 in workflow), write HANDOFF.md:
     - What was accomplished (bullet list)
     - What's in progress (with file locations)
     - What's next (ordered)
     - Key decisions made (with rationale)
     - Any gotchas or blockers discovered
   At session start, read HANDOFF.md FIRST — before loading phase doc.
   Delete after reading (single-use, prevents stale handoffs).

3. FLUSH-TO-DISK PROTOCOL OPTIMIZATION:
   Current: "Flush non-regenerable results every 5 tool calls"
   Problem: 5 calls is too infrequent. Compaction at call 4 loses work.
   New rule: Flush after EVERY significant result:
     - Calc result → write to CALC_RESULTS_STAGING.json
     - Code written → save file immediately (already done)
     - Decision made → append to DECISIONS_LOG.md
     - Error found → append to TODO via prism_context→todo_update
   Cost: ~2 extra seconds per flush. Benefit: zero work lost to compaction.

4. MEMORY GRAPH INTEGRATION (F2):
   F2 Memory Graph stores cross-session knowledge.
   Audit: What's in the graph? Is it being read at boot?
   Action: Ensure boot protocol reads key_memories from Memory Graph.
   Key memories to persist: active phase, recent decisions, known blockers,
   registry counts, last build status, current role.
   This provides continuity even if HANDOFF.md is missing.

5. COMPACTION RECOVERY ENHANCEMENT:
   Current: API handles compaction automatically. Recovery reads position files.
   Problem: After compaction, Claude loses in-progress reasoning and partial results.
   New protocol:
     a. Pre-compaction: Write COMPACTION_SNAPSHOT.md with current reasoning state
     b. Post-compaction: Boot reads COMPACTION_SNAPSHOT.md + HANDOFF.md + CURRENT_POSITION.md
     c. Three-source recovery: position (where), handoff (what), snapshot (why)
   COMPACTION_SNAPSHOT.md format:
     REASONING_STATE: "Evaluating whether to use TypeScript enum or const for tool categories"
     PARTIAL_RESULTS: "Tested 3 of 5 approaches, results in STAGING.json"
     DECISION_PENDING: "Need to decide enum vs const before proceeding"
```

## DA-MS2: SKILL / SCRIPT / HOOK UTILIZATION OPTIMIZATION
### Goal: Use existing 126 skills, 161 scripts, 75 agents, 53 hooks at >50% utilization
### Source: W2.5 HSS, ASSET_INVENTORY.md, TOOL_UTILIZATION_AUDIT

```
1. SKILL UTILIZATION AUDIT:
   126 skills exist. How many are actively used per session? Estimate: <10%.
   Action: Classify all 126 skills into tiers:
     TIER A (always relevant): core manufacturing, safety, data, session mgmt
     TIER B (phase-relevant): inject only during matching phase
     TIER C (rarely needed): specialized, load on demand only
     TIER D (dead/redundant): archive or merge
   Create SKILL_TIER_MAP.json. Wire into auto-injection so Tier A always loads,
   Tier B loads per-phase, Tier C/D never auto-inject.

2. SCRIPT UTILIZATION AUDIT:
   161 scripts registered. How many have implementations vs just registry entries?
   Action: Run script audit — count implemented vs stub vs broken.
   For the top 20 most useful scripts, verify they work end-to-end.
   Create SCRIPT_HEALTH_REPORT.md with: working, stub, broken counts.
   Fix or remove broken scripts. Implement top 5 stubs.

3. HOOK EFFECTIVENESS AUDIT:
   53 hooks active (62 registered). Which actually fire? Which catch real issues?
   Action: Add telemetry counters to hook system (F3 Telemetry integration).
   After 1 build cycle, report: hook_name, fire_count, block_count, false_positive_count.
   Tune thresholds for hooks with high false positive rates.
   Disable hooks that never fire (dead hooks waste registration overhead).

4. AGENT/SWARM OPTIMIZATION:
   75 agents registered. prism_orchestrate supports parallel execution.
   Current usage: minimal — most work is sequential single-agent.
   Action: Identify 5 tasks in upcoming R1-R3 work suitable for parallel agents:
     - R1-MS5/6/7 can run parallel (tool/material/machine are independent)
     - R2-MS0 50-calc matrix can batch across 10 materials in parallel
     - R3-MS4 data campaigns are inherently parallelizable
   Create PARALLEL_TASK_MAP.md mapping phase+MS to parallelizable sub-tasks.
   Test with prism_orchestrate→agent_parallel on a small batch.

5. SKILL CHAIN OPTIMIZATION:
   6 predefined skill chains exist from W2.5.
   Action: Audit which chains are used. Create 4 more chains for common workflows:
     - boot_and_resume: memory_recall → load_position → load_phase → plan
     - calc_and_validate: speed_feed → safety_check → uncertainty → report
     - registry_query: unified_search → cross_reference → format_result
     - debug_and_fix: error_diagnose → root_cause → fix → test → document
   Register new chains in SKILL_CHAIN_REGISTRY.json.
```

## DA-MS3: MANUS / RALPH / SUPERPOWERS / AUTOMATION OPTIMIZATION
### Goal: Use advanced tools at full capability, not just basic invocations
### Source: Manus 6 Laws, Ralph validation, Superpowers methodology

```
1. MANUS 6 LAWS IMPLEMENTATION AUDIT:
   Law 1: KV-cache stability — Are we keeping system prompt stable? Audit.
   Law 2: Mask-don't-remove — Are we masking completed work or deleting? Audit.
   Law 3: Filesystem-as-context — Are we using disk as extended memory? Audit.
   Law 4: Attention via recitation — Are we reciting key state for attention? Audit.
   Law 5: Keep wrong stuff — Are we preserving errors for learning? Audit.
   Law 6: Avoid few-shot contamination — Are we avoiding bad patterns? Audit.
   For each law: score 1-5 compliance, identify specific violations, create fix.
   Write MANUS_COMPLIANCE.md with scores and action items.

2. RALPH LOOP OPTIMIZATION:
   Ralph requires API key for live validation.
   Current: ralph_loop used at phase gates only.
   Optimization: Use ralph_loop MORE FREQUENTLY:
     - After every MS completion (not just phase gate)
     - On any safety-critical code change
     - Before merging expanded phase stubs
   Create RALPH_SCHEDULE.md mapping when to run ralph at what depth:
     - Quick (1 iteration): after MS completion
     - Standard (3 iterations): before phase gate
     - Deep (5 iterations): before R6 production gate

3. SUPERPOWERS METHODOLOGY ENFORCEMENT:
   Brainstorm → Plan → Execute → Review(spec) → Review(quality) → Verify
   Current: Often skip Plan and Review steps under time pressure.
   Action: Add SUPERPOWERS_CHECKLIST.md as mandatory gate:
     Before each MS: ☐ Plan documented ☐ Approach reviewed
     After each MS: ☐ Spec review done ☐ Quality review done ☐ Evidence collected
   Wire as pre-MS and post-MS hook (NL Hook via F6).

4. AUTOPILOT OPTIMIZATION:
   AutoPilot.ts provides dynamic parsing and orchestrator-first routing.
   GSD v22.0 at data/docs/gsd/GSD_QUICK.md.
   Audit: Is AutoPilot routing optimally? Are GSD commands being used?
   Action: Test 10 common development commands through AutoPilot:
     "work on R1-MS5", "run safety check", "build and test", "check registry health",
     "plan next session", "show progress", "run ralph", "parallel batch X",
     "save and checkpoint", "resume from compaction"
   Fix any routing failures. Document working commands in GSD_COMMANDS.md.

5. NL HOOK AUTHORING (F6):
   F6 NL Hooks allow natural language hook creation.
   Action: Create 5 development-acceleration hooks via NL:
     "Before any file write, check if the file already exists and warn me"
     "After every build, report the build size and any new warnings"
     "When context pressure exceeds 70%, auto-flush staging files to disk"
     "Before phase gate, verify all companion assets are listed"
     "After compaction, read HANDOFF.md and CURRENT_POSITION.md automatically"
   These hooks protect development workflow, not just manufacturing calcs.
```

## DA-MS4: PHASE GATE + COMPANION ASSETS
### Gate: Development infrastructure is measurably faster

```
GATE CRITERIA:
  1. PROTOCOLS_CORE split into 3 files, measured token savings documented
  2. CURRENT_POSITION.md expanded to structured format, tested across session restart
  3. HANDOFF.md protocol tested — write at end, read at start, verified continuity
  4. SKILL_TIER_MAP.json created with all 126 skills classified
  5. SCRIPT_HEALTH_REPORT.md shows >80% of top 20 scripts working
  6. At least 1 parallel agent batch tested successfully
  7. MANUS_COMPLIANCE.md shows ≥3/5 on all 6 laws
  8. Claude Code operational: CLAUDE.md + .claude/skills/ created, parallel test passed
  8. Ralph schedule documented and tested at MS-level
  9. 5 NL development hooks created and firing
  10. Context budget tracking active and logging
  Ω ≥ 0.75

MEASURABLE OUTCOME:
  Session startup time: <60 seconds from boot to productive work
  Context waste: <10% of framework tokens are unused per session
  Continuity: Zero re-discovery of previous session's work
  Compaction recovery: Resume within 30 seconds after compaction

COMPANION ASSETS (built after DA features):

  HOOKS:
    context_pressure_flush    — auto-flush staging files at >70% pressure
    pre_phase_gate_check      — verify companion assets listed before gate
    post_compaction_recovery   — auto-read HANDOFF + POSITION after compaction
    session_handoff_reminder   — warn if session ending without HANDOFF.md written
    build_size_monitor         — report build size and new warnings after every build

  SCRIPTS:
    session_startup           — boot + position + handoff + phase load in one command
    session_shutdown          — save + handoff + checkpoint + todo in one command
    context_audit             — measure current framework token costs
    skill_utilization_report  — show which skills fired this session
    parallel_readiness_check  — verify if current task is parallelizable

  SKILLS:
    prism-session-management  — teaches Claude optimal session start/end protocols
    prism-context-engineering — teaches Claude Manus 6 Laws + context optimization
    prism-parallel-execution  — teaches Claude when/how to use agent_parallel
    prism-ralph-validation    — teaches Claude when/how to run ralph at what depth
```

---

## DA PRODUCES (artifacts for downstream phases):

```
CONTEXT_AUDIT.md              — Token costs for all framework files
SKILL_TIER_MAP.json           — 126 skills classified into tiers A/B/C/D
SKILL_RELEVANCE_MAP.json      — Phase → relevant skills mapping
SCRIPT_HEALTH_REPORT.md       — Script implementation status
PARALLEL_TASK_MAP.md          — Parallelizable tasks in R1-R3 (updated with CC capabilities)
MANUS_COMPLIANCE.md           — 6 Laws audit with scores and fixes
RALPH_SCHEDULE.md             — When to run ralph and at what depth
GSD_COMMANDS.md               — Working AutoPilot commands reference
SUPERPOWERS_CHECKLIST.md      — Per-MS quality gate checklist
PRISM_PROTOCOLS_BOOT.md       — Split from CORE: boot + laws
PRISM_PROTOCOLS_SAFETY.md     — Split from CORE: structured outputs + validation
PRISM_PROTOCOLS_CODING.md     — Split from CORE: code standards + build
Expanded CURRENT_POSITION.md  — Structured multi-field position format
HANDOFF.md template           — Session handoff template
5 NL development hooks        — Context/compaction/build/gate/session hooks
4 new skill chains            — boot_resume, calc_validate, registry_query, debug_fix
4 new skills                  — session-mgmt, context-eng, parallel-exec, ralph-validation
5 new scripts                 — startup, shutdown, audit, utilization, readiness
CLAUDE_CODE_READINESS.md      — Test results + capability matrix
CLAUDE.md (project root)      — Project context for Claude Code (already created)
.claude/skills/ (4 files)     — PRISM-specific skills for Claude Code sessions
```
