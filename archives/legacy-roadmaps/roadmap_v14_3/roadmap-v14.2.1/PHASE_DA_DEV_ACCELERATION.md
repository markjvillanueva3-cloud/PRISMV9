# PHASE DA: DEVELOPMENT ACCELERATION — v14.3
# Status: not-started | Sessions: 1-2 | MS: 6 (MS0-MS5) | Role: DevOps Engineer
# Environment: Claude Code 100% | Model: Sonnet
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
# Gate: Ω ≥ 0.70 | All 5 subagents respond, 5 commands execute, 15 skills auto-load,
#       hooks fire on edit/bash, E2E test passes, Claude Code operational

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 wired 31 dispatchers. F1-F8 features all complete. W2.5 HSS
optimization delivered 53 hooks, 6 skill chains, 6 response templates, pressure-adaptive
auto-injection. R1-MS0 through MS4 loaded registries to >95%.

WHAT THIS PHASE DOES: Optimizes the DEVELOPMENT PROCESS itself — context management,
session continuity, compaction recovery, tool utilization, AND configures Claude Code
as the primary development environment with persistent-memory subagents, deterministic
hooks, slash commands, and on-demand skill loading.

WHAT COMES AFTER: R1-MS4.5 through MS9 (data foundation completion), then R2 safety.

---

## DA-MS0: CONTEXT ENGINEERING AUDIT + OPTIMIZATION + CLAUDE.md HIERARCHY
### Goal: Minimize context loss, maximize useful context per token, establish Claude Code foundation
### Source: Manus AI 6 Laws, HSS W2.5, Compaction API behavior, Claude Code Briefing

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

1. CREATE CLAUDE.md HIERARCHY (Claude Code foundation):
   Root CLAUDE.md at C:\PRISM\mcp-server\CLAUDE.md containing:
   - Core laws: S(x)≥0.70 hard block, Ω≥0.70 release ready
   - Current position: phase, milestone, active subtask
   - Build commands: npm run build (NEVER standalone tsc — OOM at current scale)
   - Registry counts: materials 3518, machines 824, tools (pending), alarms 9200+
   - Safety rules: no bare numbers, uncertainty bounds required on all values
   - Key file locations: MASTER_INDEX.md, wiring registries (D2F, F2E, E2S), state files
   - Code conventions: TypeScript patterns, import style, test structure

   Create nested CLAUDE.md files:
   - src/engines/CLAUDE.md — Engine conventions, AtomicValue schema requirement,
     force/power calculation patterns, uncertainty propagation rules
   - src/dispatchers/CLAUDE.md — Dispatcher patterns, parameter normalization,
     action routing, effort tier mapping

   WHY: Replaces ~80% of manual session boot protocol. Claude Code auto-loads
   these every session — no manual context injection needed.
   VERIFY: Start new Claude Code session, confirm it knows S(x) threshold,
   build command, and current phase without being told.

2. AUDIT CURRENT CONTEXT COSTS:
   Measure actual token cost of every framework file:
     - This master index: ___K tokens
     - PRISM_PROTOCOLS_BOOT.md (after split): ___K tokens
     - Each phase doc: ___K tokens
     - Boot overhead: ___K tokens
     - Skill auto-injection: ___K tokens (pressure-adaptive from W2.5)
   Record in CONTEXT_AUDIT.md

3. OPTIMIZE PHASE DOC LOADING:
   Large phase docs (R1=62K, R3=36K, R7=37K) contain completed MS content.
   Action: Add "SKIP TO CURRENT" markers in each phase doc.
   Format: <!-- CURRENT_MS: R1-MS5 --> at the active milestone.
   Loader reads from marker forward, skipping completed MS detail.
   SAVINGS: ~30-50% of phase doc tokens for phases with many completed MS.

4. IMPLEMENT CONTEXT BUDGET TRACKING:
   Add to boot protocol: measure framework load + log to CONTEXT_BUDGET_LOG.md
   Track: session_date, framework_tokens, work_tokens, compaction_count, ms_completed
   Enables: trend analysis showing if framework is growing unsustainably.

5. OPTIMIZE SKILL AUTO-INJECTION:
   W2.5 built pressure-adaptive sizing for 117 enriched skill descriptions.
   Audit: Which skills actually get injected? Which are useful vs noise?
   Action: Create SKILL_RELEVANCE_MAP.json mapping phase→relevant_skills.
   During R1: inject only data/registry skills. During R2: only calc/safety skills.
   SAVINGS: Inject 5-8 relevant skills instead of broad auto-injection.

6. CLAUDE CODE READINESS:
   a. Verify Claude Code runs simultaneously with Desktop (already confirmed v2.1.42)
   b. Verify CLAUDE.md at project root is read correctly (already confirmed)
   c. Create initial .claude/skills/ directory (full conversion in DA-MS3)
   d. Run parallel session test (Desktop + CLI simultaneously)
   e. Test agent teams if experimental flag available
   f. Document results in CLAUDE_CODE_READINESS.md
   g. Update PARALLEL_TASK_MAP.md with Claude Code capabilities
   h. Identify first 3 tasks to delegate to Claude Code in R1
```

## DA-MS1: SESSION CONTINUITY + SUBAGENTS WITH PERSISTENT MEMORY
### Goal: Zero re-discovery between sessions. Resume in <60 seconds. Persistent memory via subagents.
### Source: W2.5 checkpoint system, F2 Memory Graph, compaction behavior, Claude Code subagents

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

5. CREATE 5 SUBAGENTS WITH PERSISTENT MEMORY:
   Create at ~/.claude/agents/:

   a. prism-safety-reviewer.md
      - Model: Opus | Memory: project | Tools: Read, Grep, Glob, Bash
      - Context: S(x)≥0.70 hard block. Check all calcs against CALC_BENCHMARKS.json.
        Update memory with calculation failure patterns across sessions.

   b. prism-registry-expert.md
      - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
      - Context: Manages 3518 materials, 824 machines, tools, 9200+ alarms,
        500 formulas, 697 strategies. Knows schemas. Updates memory with
        data quality patterns discovered during loading.

   c. prism-architect.md
      - Model: Opus | Memory: project | Tools: Read, Write, Grep, Glob, Bash
      - Context: Principal Systems Architect. Tracks design decisions with rationale.
        Consults wiring registries (D2F, F2E, E2S) before new implementations.
        Updates memory with architectural decisions across sessions.

   d. prism-test-runner.md
      - Model: Sonnet | Memory: project | Tools: Read, Bash, Glob
      - Context: Runs test suites, regression checks, benchmark validation.
        Tracks test coverage and failure history in memory.

   e. prism-data-validator.md
      - Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
      - Context: Validates registry data quality — schema compliance, completeness,
        cross-reference integrity. Quarantines bad records with reason codes.

   WHY: Persistent memory replaces HANDOFF.md for cross-session knowledge.
   The safety reviewer accumulates knowledge about which calculations fail
   and why. The architect remembers design decisions without handoff files.
   VERIFY: Invoke each subagent with a test query. End session. Start new session.
   Ask subagent to recall the test query result. If it remembers → PASS.

6. COMPACTION RECOVERY ENHANCEMENT:
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

## DA-MS2: SKILL / SCRIPT / HOOK UTILIZATION + SLASH COMMANDS + SKILL CONVERSION
### Goal: Use existing 126 skills, 161 scripts, 75 agents, 53 hooks at >50% utilization.
###       Convert top skills to Claude Code format. Create slash commands for workflow automation.
### Source: W2.5 HSS, ASSET_INVENTORY.md, TOOL_UTILIZATION_AUDIT, Claude Code Briefing

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

2. CONVERT TOP 15 SKILLS TO CLAUDE CODE FORMAT:
   Convert from skills-consolidated/ to .claude/skills/ SKILL.md format with
   YAML frontmatter (name, description fields). Priority order:
     1. cutting-parameters (Kienzle, chip thinning, speed/feed)
     2. material-selection (ISO groups, machinability, substitution)
     3. safety-validation (S(x) computation, force limits, breakage risk)
     4. toolpath-strategy (697 strategies, feature matching)
     5. threading (tap drill, thread milling, engagement calc)
     6. surface-finish (Ra/Rz prediction, parameter influence)
     7. chip-control (chip breaking, evacuation, morphology)
     8. workholding (clamping force, fixture validation)
     9. coolant (flood/MQL/high-pressure selection, concentration)
     10. tool-life (Taylor equation, wear prediction, cost optimization)
     11. wear-analysis (flank/crater/notch patterns, countermeasures)
     12. alarm-diagnosis (9200+ codes, root cause, resolution)
     13. machine-capability (envelope, spindle, axis limits)
     14. controller-programming (Fanuc/Haiku/Siemens/Okuma G-code patterns)
     15. tolerance-analysis (IT grades, process capability, stack-up)
   WHY: Claude Code auto-loads skills when it detects relevance. Replaces W2.5
   pressure-adaptive injection system. Hot-reloading: save skill → instant update.
   VERIFY: Start a conversation about cutting parameters without mentioning the skill.
   Claude Code should auto-load cutting-parameters.md. If not → improve description.

3. CREATE 5 SLASH COMMANDS:
   Create at ~/.claude/commands/:
   a. /boot (boot.md) — Load CURRENT_POSITION.md, identify active phase, load phase doc,
      check for HANDOFF.md, plan session. Report: current MS, next 3 steps, blockers, scope.
   b. /gate (gate.md) — Run phase gate check: verify criteria, npm run build, test suite,
      Omega estimate, list unresolved findings.
   c. /checkpoint (checkpoint.md) — Save state: update CURRENT_POSITION.md, append
      ROADMAP_TRACKER.md, write HANDOFF.md, run npm run build for clean state.
   d. /plan (plan.md) — Read phase doc, identify next MS, break into steps, estimate effort,
      identify parallel work, propose session plan with model tier recommendations.
   e. /build (build.md) — Run npm run build, parse output, report errors with file:line,
      suggest fixes. NEVER run standalone tsc.
   WHY: Replaces manual multi-step session protocols. One keystroke instead of 9 steps.

4. SCRIPT UTILIZATION AUDIT:
   161 scripts registered. How many have implementations vs just registry entries?
   Action: Run script audit — count implemented vs stub vs broken.
   For the top 20 most useful scripts, verify they work end-to-end.
   Create SCRIPT_HEALTH_REPORT.md with: working, stub, broken counts.
   Fix or remove broken scripts. Implement top 5 stubs.

5. HOOK EFFECTIVENESS AUDIT:
   53 hooks active (62 registered). Which actually fire? Which catch real issues?
   Action: Add telemetry counters to hook system (F3 Telemetry integration).
   After 1 build cycle, report: hook_name, fire_count, block_count, false_positive_count.
   Tune thresholds for hooks with high false positive rates.
   Disable hooks that never fire (dead hooks waste registration overhead).

6. AGENT/SWARM OPTIMIZATION:
   75 agents registered. prism_orchestrate supports parallel execution.
   Current usage: minimal — most work is sequential single-agent.
   Action: Identify 5 tasks in upcoming R1-R3 work suitable for parallel agents:
     - R1-MS5/6/7 can run parallel (tool/material/machine are independent)
     - R2-MS0 50-calc matrix can batch across 10 materials in parallel
     - R3-MS4 data campaigns are inherently parallelizable
   Create PARALLEL_TASK_MAP.md mapping phase+MS to parallelizable sub-tasks.
   Test with prism_orchestrate→agent_parallel on a small batch.

7. SKILL CHAIN OPTIMIZATION:
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

## DA-MS4: DETERMINISTIC HOOK CONFIGURATION (Claude Code)
### Goal: Deterministic build verification and safety checks that CANNOT be skipped
### Source: Claude Code hooks system

```
1. Add to .claude/settings.json:
   PostToolUse hooks:
   - Matcher: "Edit" → command: "npm run build 2>&1 | tail -5"
     (Every file edit triggers a build — catch breaks immediately)

   PreToolUse hooks:
   - Matcher: "Bash" → command: "node scripts/validate-safety-score.js"
     (Every bash execution checks safety score context)

2. Additional hooks to configure:
   - Pre-file-write: Anti-regression check (verify file exists, create backup)
   - Post-session: Auto-write checkpoint to CLAUDE.md

   WHY: These are DETERMINISTIC — Claude Code cannot skip, forget, or decide otherwise.
   Unlike prompt-based MCP hooks which are probabilistic, these ALWAYS fire.
   Development process hooks become guaranteed. Manufacturing calculation hooks
   still run server-side via MCP for safety.

   VERIFY: Edit any .ts file. Build should auto-run within 2 seconds.
   If build fails, the error should appear in the session immediately.
```

## DA-MS5: PHASE GATE + END-TO-END INTEGRATION TEST + COMPANION ASSETS
### Gate: Development infrastructure is measurably faster. Claude Code fully operational.

```
END-TO-END INTEGRATION TEST:
Execute this exact sequence:
1. /boot → should report current position, phase, next steps
2. Pick a small R1 task (e.g., validate one material file schema)
3. Invoke registry-expert subagent for schema guidance
4. Make an edit → verify post-edit build hook fires
5. /checkpoint → should save state to all 3 files
6. Resume → /boot again → should pick up exactly where checkpoint left off
7. Spawn 3 parallel subagents on 3 independent file validation tasks
8. Verify all 3 complete and results merge correctly
9. End session. Start new session. Verify subagent memory persists.

GATE CRITERIA:
  1. PROTOCOLS_CORE split into 3 files, measured token savings documented
  2. CLAUDE.md hierarchy created, auto-loads correctly in Claude Code
  3. CURRENT_POSITION.md expanded to structured format, tested across session restart
  4. HANDOFF.md protocol tested — write at end, read at start, verified continuity
  5. SKILL_TIER_MAP.json created with all 126 skills classified
  6. At least 10/15 Claude Code skills auto-load when relevant topics arise
  7. SCRIPT_HEALTH_REPORT.md shows >80% of top 20 scripts working
  8. All 5 subagents respond correctly to domain queries
  9. All 5 slash commands execute without error
  10. At least 1 parallel agent batch tested successfully
  11. MANUS_COMPLIANCE.md shows ≥3/5 on all 6 laws
  12. Post-edit hook fires build within 2 seconds
  13. Subagent memory persists across session boundary
  14. /checkpoint → /boot cycle preserves state
  15. Ralph schedule documented and tested at MS-level
  16. 5 NL development hooks created and firing
  17. Context budget tracking active and logging
  Ω ≥ 0.75

MEASURABLE OUTCOME:
  Session startup time: <60 seconds from boot to productive work
  Context waste: <10% of framework tokens are unused per session
  Continuity: Zero re-discovery of previous session's work
  Compaction recovery: Resume within 30 seconds after compaction

FAILURE PROTOCOL: If any check fails, fix the specific config file and re-test
that check. Do not proceed to R1 until all checks pass.

COMPANION ASSETS (built after DA features):

  HOOKS (MCP + Claude Code):
    context_pressure_flush    — auto-flush staging files at >70% pressure
    pre_phase_gate_check      — verify companion assets listed before gate
    post_compaction_recovery   — auto-read HANDOFF + POSITION after compaction
    session_handoff_reminder   — warn if session ending without HANDOFF.md written
    build_size_monitor         — report build size and new warnings after every build
    post_edit_build (CC)       — deterministic build after every file edit
    pre_bash_safety (CC)       — safety score check before bash execution
    pre_write_antiregression (CC) — backup + size check before file overwrites

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
    + 15 Claude Code skills converted from skills-consolidated/ (DA-MS2)

  SUBAGENTS (with persistent memory):
    prism-safety-reviewer     — Opus, tracks calc failure patterns
    prism-registry-expert     — Sonnet, tracks data quality patterns
    prism-architect           — Opus, tracks design decisions
    prism-test-runner         — Sonnet, tracks test coverage/failures
    prism-data-validator      — Sonnet, tracks schema compliance

  SLASH COMMANDS:
    /boot, /gate, /checkpoint, /plan, /build
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
15 Claude Code skills         — Converted from skills-consolidated/
5 subagent definitions        — safety-reviewer, registry-expert, architect, test-runner, data-validator
5 slash command definitions   — /boot, /gate, /checkpoint, /plan, /build
Hook configuration            — .claude/settings.json with deterministic hooks
CLAUDE.md (root + 2 nested)   — Project context for Claude Code auto-loading
CLAUDE_CODE_READINESS.md      — Test results + capability matrix
DA_INTEGRATION_TEST_RESULTS.md — E2E test outcomes
```
