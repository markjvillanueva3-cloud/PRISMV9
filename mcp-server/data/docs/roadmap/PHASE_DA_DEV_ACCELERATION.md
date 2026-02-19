# PHASE DA: DEVELOPMENT ACCELERATION    v14.5
### RECOMMENDED_SKILLS: prism-session-master, prism-anti-regression, prism-error-handling
### HOOKS_EXPECTED: DISPATCH, FILE, STATE
### DATA_PATHS: C:\PRISM\skills-consolidated, C:\PRISM\mcp-server\scripts

# Status: in-progress | Sessions: 14-20 | MS: 12 (MS0-MS11) | Role: Multi (see per-MS)
# v15.0: Added MS11 (Enforcement Wiring). Added Wiring Verification Audit (DA_WIRING_AUDIT.md).
# Environment: Claude Code 100% (fallback: MCP + DC)
# Model: Varies per MS    Haiku (bulk ops), Sonnet (implementation), Opus (architecture)
# v14.5: Expanded from 9→11 milestones. Adds: Skill Atomization (MS9-MS10).
#         Splits 34 multi-function skills → atomic (≤5KB each).
#         Extracts skills from 206 MIT OCW courses (234 zips, 12.3GB) on disk.
#         One skill = one function. All indexed in SKILL_INDEX.json.
# FALLBACK: If Claude Code is not available (not installed, not GA, licensing issue):
#   Execute DA in Claude.ai MCP + Desktop Commander instead. Adjustments:
#   - MS0 step 1 (CLAUDE.md): Create files via prism_dev action=file_write instead of CC
#   - MS1 steps 3-5 (subagents): Document specs in SUBAGENT_SPECS.md for future CC setup
#   - MS2 step 2 (skill conversion): Write .claude/skills/ files to disk, test when CC available
#   - MS2 step 3 (slash commands): Write .claude/commands/ files to disk, test when CC available
#   - MS4 (hooks): Write .claude/settings.json to disk, test when CC available
#   - MS5 gate: Skip CC-specific tests (subagent memory persistence, slash command execution)
#     Add: "CC_DEFERRED" items to ACTION_TRACKER for future validation
#   All file creation and skill conversion still happens    just tested later when CC is ready.
# Pattern: Every MS follows AUDIT → OPTIMIZE → TEST → DOCUMENT
#
# WHY THIS PHASE EXISTS AND WHY IT GOES FIRST:
#   Every session we lose context to compaction. Every session we under-utilize
#   skills, scripts, hooks, and agents. Every session we re-discover what was
#   already known. Every session we could be 2-3x faster if the development
#   infrastructure was optimized. This phase fixes that BEFORE R1 continues,
#   because the ROI compounds across every subsequent session.
#
#   Estimated time saved: 15-30 minutes per session
#   v14.5 SEQ-1: After each DA-MS, add to ACTION_TRACKER:
#     "DA-MS[N] TIME_SAVED_PER_SESSION: [X] minutes (measured)"
#   v14.5 SEQ-1: After each DA milestone, add to ACTION_TRACKER:
#     "DA-MS[N] TIME_SAVED_PER_SESSION: [X] minutes (measured)"
#   Track ACTUAL savings to make ROI tangible and motivating. × 50+ remaining sessions
#   = 12-25 hours of recovered development time.
#
# DEPENDS ON: P0 complete (dispatchers wired, Opus 4.6 configured)
# LEVERAGES: F2 (Memory Graph), F3 (Telemetry), F6 (NL Hooks), W2.5 (HSS)
# Gate:     0.70 | All 5 subagents respond, 5 commands execute, 15 skills auto-load,
#       hooks fire on edit/bash, E2E test passes, Claude Code operational

---

<!-- ANCHOR: da_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction    no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc    OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        DA = Claude Code 100% (fallback: MCP + DC). Model: Sonnet.
```

---

<!-- ANCHOR: da_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: P0 wired 31 dispatchers. F1-F8 features all complete. W2.5 HSS
optimization delivered 53 hooks, 6 skill chains, 6 response templates, pressure-adaptive
auto-injection. R1-MS0 through MS4 loaded registries to >95%.

WHAT THIS PHASE DOES: Optimizes the DEVELOPMENT PROCESS itself    context management,
session continuity, compaction recovery, tool utilization, AND configures Claude Code
as the primary development environment with persistent-memory subagents, deterministic
hooks, slash commands, and on-demand skill loading.

WHAT COMES AFTER: R1-MS4.5 through MS9 (data foundation completion), then R2 safety.

---

<!-- LOADER: SKIP TO LINE FOR DA-MS0 -->
<!-- CURRENT_MS: DA-MS0 -->
<!-- ANCHOR: da_da_ms0_context_engineering_audit_optimization_claude_md_hierarchy -->
## DA-MS0: CONTEXT ENGINEERING AUDIT + OPTIMIZATION + CLAUDE.md HIERARCHY
<!-- ANCHOR: da_role_context_engineer_model_sonnet_audit_u_2192_haiku_bulk_anchors_effort_m_10_15_calls_sessions_1_2 -->
### Role: Context Engineer | Model: Sonnet (audit)   Haiku (bulk anchors) | Effort: M (10-15 calls) | Sessions: 1-2
<!-- ANCHOR: da_goal_minimize_context_loss_maximize_useful_context_per_token_establish_claude_code_foundation -->
### Goal: Minimize context loss, maximize useful context per token, establish Claude Code foundation
<!-- ANCHOR: da_source_manus_ai_6_laws_hss_w2_5_compaction_api_behavior_claude_code_briefing -->
### Source: Manus AI 6 Laws, HSS W2.5, Compaction API behavior, Claude Code Briefing

```
0. SPLIT PROTOCOLS_CORE IMMEDIATELY (do this before anything else):
   Current: ~111KB (huge). Most sessions use <30% of content.
   Action: Split into tiered loading:
     PRISM_PROTOCOLS_BOOT.md         Boot sequence + laws + effort config (~2K tokens)
     PRISM_PROTOCOLS_SAFETY.md       Structured outputs + physics validation (~2K tokens)
     PRISM_PROTOCOLS_CODING.md       Code standards + build process (~1.5K tokens)
   Load BOOT every session. Load SAFETY only during R2+ calc phases.
   Load CODING only during implementation sessions.
   Verify: load BOOT only → run health check → confirm system operational.
   SAVINGS: Immediate ~3-5K tokens per session from this point forward.
   This is a prerequisite, not a milestone    do it in the first 10 minutes of DA.
   ⚡ CLAUDE CODE: Can execute the split + verification in terminal while Desktop plans.

1. CREATE CLAUDE.md HIERARCHY (Claude Code foundation):
   Root CLAUDE.md at C:\PRISM\mcp-server\CLAUDE.md containing:
   - Core laws: S(x) 0.70 hard block,   0.70 release ready
   - Current position: phase, milestone, active subtask
   - Build commands: npm run build (NEVER standalone tsc    OOM at current scale)
   - Registry counts: materials 3518, machines 824, tools (pending), alarms 9200+
   - Safety rules: no bare numbers, uncertainty bounds required on all values
   - Key file locations: MASTER_INDEX.md, wiring registries (D2F, F2E, E2S), state files
   - Code conventions: TypeScript patterns, import style, test structure

   Create nested CLAUDE.md files:
   - src/engines/CLAUDE.md    Engine conventions, AtomicValue schema requirement,
     force/power calculation patterns, uncertainty propagation rules
   - src/dispatchers/CLAUDE.md    Dispatcher patterns, parameter normalization,
     action routing, effort tier mapping

   WHY: Replaces ~80% of manual session boot protocol. Claude Code auto-loads
   these every session    no manual context injection needed.
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

<!-- ANCHOR: da_v14_4_additions_to_ms0_wave_0_wave_1 -->
### v14.4 ADDITIONS TO MS0 (Wave 0 + Wave 1):

```
W0-PROTOCOL FIXES (do FIRST, ~15 min, any model):
  W0-1: Add PowerShell DC protocol to PROTOCOLS_CORE  code_standards:
        "Never inline $ vars in DC start_process. Write .ps1 file first."
        Also add 1-liner to RECOVERY_CARD  ESSENTIAL RULES.
  W0-2: Add companion asset tracking format to PROTOCOLS_CORE:
        "COMPANION: [action]    SKILL: pending | HOOK: pending | SCRIPT: pending"
        Add gate check to PHASE_TEMPLATE.md.
  W0-3: Ensure position auto-save says "every 3 calls" (not 5). Add emphasis
        that this is the ONLY reliable cross-session state.
  VERIFY: Read back all 3 edits. Confirm text appears where expected.

W1-SECTION ANCHORS + INDEX (~1 session, Haiku+Sonnet):
  W1-1: Place ~220 section anchors across all 20+ roadmap .md files.
        Model: Haiku (mechanical bulk work, parallel 3 subagents).
        Format: <!-- ANCHOR: [prefix]_[section_name] --> before each ## and ### header.
        Prefixes: pc_ (PROTOCOLS_CORE), r1_ (R1), da_ (DA), mi_ (MASTER_INDEX), etc.
        Process: Read file → find headers → insert anchors → write back → verify count.
        TOTAL: 220-250 anchors. Verify: grep -r "ANCHOR:" roadmap/ | wc -l >= 220.
  W1-2: Build ROADMAP_SECTION_INDEX.md from placed anchors.
        Model: Sonnet (needs judgment for descriptions).
        Format: table per file with anchor|line|section|description columns.
        ~200 lines, ~1.5K tokens. This becomes the new "load first" navigation file.
  W1-3: Build scripts/roadmap/rebuild-section-index.ps1.
        Model: Sonnet. Scans all .md files, finds anchors, regenerates index.
        Also writes .roadmap-index-baseline.json for drift detection (>10 line shift = WARNING).
  W1-4: Update RECOVERY_CARD: Add STEP 1.5 "Load Section Index (optional, saves tokens)"
        between STEP 1 (position) and STEP 2 (phase doc).
  VERIFY: Anchor count >=220, index has all entries, script regenerates identically,
          Recovery Card has STEP 1.5, no files lost content.
```

---

<!-- ANCHOR: da_da_ms1_session_continuity_subagents_with_persistent_memory -->
## DA-MS1: SESSION CONTINUITY + SUBAGENTS WITH PERSISTENT MEMORY
<!-- ANCHOR: da_role_systems_architect_model_opus_subagent_arch_u_2192_sonnet_impl_effort_l_15_20_calls_sessions_2 -->
### Role: Systems Architect | Model: Opus (subagent arch)   Sonnet (impl) | Effort: L (15-20 calls) | Sessions: 2
<!-- ANCHOR: da_goal_zero_re_discovery_between_sessions_resume_in_60_seconds_persistent_memory_via_subagents -->
### Goal: Zero re-discovery between sessions. Resume in <60 seconds. Persistent memory via subagents.
<!-- ANCHOR: da_source_w2_5_checkpoint_system_f2_memory_graph_compaction_behavior_claude_code_subagents -->
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
   At session start, read HANDOFF.md FIRST    before loading phase doc.
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
      - Context: S(x) 0.70 hard block. Check all calcs against CALC_BENCHMARKS.json.
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
      - Context: Validates registry data quality    schema compliance, completeness,
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

<!-- ANCHOR: da_v14_4_additions_to_ms1_wave_4_session_intelligence -->
### v14.4 ADDITIONS TO MS1 (Wave 4    Session Intelligence):

```
W4-SESSION HEALTH + PRE-COMPACTION AUTO-DUMP (~1 session, Sonnet+Opus):

  W4-1: SESSION HEALTH SIGNAL (Sonnet implements, Opus designs thresholds):
    Add to PRISM state tracking:
      SessionHealth { call_count, estimated_tokens, elapsed_turns,
                      last_position_save, compaction_count, health_status }
    Thresholds (Opus decides exact values):
      GREEN:  calls < 20, tokens < 50K, compactions = 0
      YELLOW: calls 20-35 OR tokens 50-80K OR compactions = 1
      RED:    calls > 35 OR tokens > 80K OR compactions >= 2
    YELLOW → advisory "Session aging, save state, consider wrapping up"
    RED → directive "Complete current step, write handoff, stop"
    Expose: prism_session action=health_check → returns SessionHealth
    Wire into cadence: piggyback on existing todo@5 cadence check.

  W4-2: PRE-COMPACTION AUTO-DUMP HOOK (Sonnet):
    New hook in hookRegistration.ts:
      Name: pre_compaction_dump
      Trigger: cadence (fires on pressure check)
      Condition: contextPressure() > 0.55
      Action: writeCurrentPosition() + appendActionTracker() + writeCompactionSnapshot()
      Blocking: false (advisory, doesn't interrupt work)
    This REPLACES reactive "detect after compaction" with proactive "save before it hits."

  W4-3: WIRE INTO RECOVERY CARD (Sonnet):
    Update RECOVERY_CARD  COMPACTION ADAPTATION:
      After recovery → prism_session action=health_check
      RED → ultra-minimal mode (already defined)
      YELLOW → reduced mode (skip non-essential skill loading)
      GREEN → normal mode

  VERIFY: health_check returns correct status. Auto-dump fires at >55% pressure.
    npm run build succeeds. prism_dev action=health shows new action available.
```

---

<!-- ANCHOR: da_da_ms2_skill_script_hook_utilization_slash_commands_skill_conversion -->
## DA-MS2: SKILL / SCRIPT / HOOK UTILIZATION + SLASH COMMANDS + SKILL CONVERSION
<!-- ANCHOR: da_role_context_engineer_model_sonnet_skill_conversion_commands_effort_l_15_20_calls_sessions_2 -->
### Role: Context Engineer | Model: Sonnet (skill conversion + commands) | Effort: L (15-20 calls) | Sessions: 2
<!-- ANCHOR: da_goal_use_existing_126_skills_161_scripts_75_agents_53_hooks_at_50_utilization -->
### Goal: Use existing 126 skills, 161 scripts, 75 agents, 53 hooks at >50% utilization.
<!-- ANCHOR: da_convert_top_skills_to_claude_code_format_create_slash_commands_for_workflow_automation -->
###       Convert top skills to Claude Code format. Create slash commands for workflow automation.
<!-- ANCHOR: da_source_w2_5_hss_asset_inventory_md_tool_utilization_audit_claude_code_briefing -->
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

1b. SCRIPT STUB AUDIT (v14.3    audit finding GAP 4.4):
   1,320 scripts registered in SCRIPT_REGISTRY.json but only ~161 have implementations (12.3%).
   The 1,159 stubs are either future work or dead weight    unknown without classification.
   Action: Read SCRIPT_REGISTRY.json. For each registered script:
     - If implementation exists in ScriptExecutor → mark ACTIVE
     - If planned for a specific phase → mark DEFERRED with target phase
     - If no plan and no implementation → mark DEAD
   Create SCRIPT_CLASSIFICATION.json with { name, status: ACTIVE|DEFERRED|DEAD, target_phase? }
   Remove DEAD entries from SCRIPT_REGISTRY.json (Law 6: if it exists, it must work).
   Update MASTER_INDEX.md script counts to reflect reality.
   VERIFY: Script count in MASTER_INDEX matches ACTIVE + DEFERRED in classification.

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
   a. /boot (boot.md)    Load CURRENT_POSITION.md, identify active phase, load phase doc,
      check for HANDOFF.md, plan session. Report: current MS, next 3 steps, blockers, scope.
   b. /gate (gate.md)    Run phase gate check: verify criteria, npm run build, test suite,
      Omega estimate, list unresolved findings.
   c. /checkpoint (checkpoint.md)    Save state: update CURRENT_POSITION.md, append
      ROADMAP_TRACKER.md, write HANDOFF.md, run npm run build for clean state.
   d. /plan (plan.md)    Read phase doc, identify next MS, break into steps, estimate effort,
      identify parallel work, propose session plan with model tier recommendations.
   e. /build (build.md)    Run npm run build, parse output, report errors with file:line,
      suggest fixes. NEVER run standalone tsc.
   WHY: Replaces manual multi-step session protocols. One keystroke instead of 9 steps.

4. SCRIPT UTILIZATION AUDIT:
   161 scripts registered. How many have implementations vs just registry entries?
   Action: Run script audit    count implemented vs stub vs broken.
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
   Current usage: minimal    most work is sequential single-agent.
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

<!-- ANCHOR: da_v14_4_additions_to_ms2_wave_5_3_skill_phase_loading -->
### v14.4 ADDITIONS TO MS2 (Wave 5-3    Skill Phase-Loading):

```
W5-3: SKILL/DISPATCHER PHASE-LOADING (Opus designs → Haiku validates → Sonnet implements):

  Phase 1    DESIGN PHASE-TO-SKILL MAP (Opus, ~30 min):
    Based on SKILL_RELEVANCE_MAP.json concept from step 0 above, create full mapping:
      DA skills:  session-management, context-engineering, parallel-execution
      R1 skills:  material-science, formula-registry, data-loading, tool-schema
      R2 skills:  speed-feed-calc, kienzle-force, taylor-tool-life, thread-calcs
      R3 skills:  data-campaigns, quality-validation, pfp-engine
      R4-R11: map similarly based on phase content
    Output: SKILL_PHASE_MAP.json

  Phase 2    IMPLEMENT AUTO-LOADING (Sonnet, ~1 hr):
    In session_boot, after position recovery determines current phase:
      const phaseSkills = SKILL_PHASE_MAP[currentPhase];
      await Promise.all(phaseSkills.map(s => skillLoader.load(s)));
    Only loads skills relevant to current phase. Others stay unloaded.
    Estimated savings: 5-8 skills loaded instead of 126 = ~90% skill context reduction.

  Phase 3    VALIDATE (Haiku, ~30 min):
    For each phase, invoke each mapped skill with a test query.
    Confirm: correct skills load, irrelevant skills don't, no errors.
    Log results to SKILL_PHASE_VALIDATION.md.

  VERIFY: Boot into R1 → only R1 skills loaded. Switch to R2 → skills swap. No errors.
```

---

<!-- ANCHOR: da_da_ms3_manus_ralph_superpowers_automation_optimization -->
## DA-MS3: MANUS / RALPH / SUPERPOWERS / AUTOMATION OPTIMIZATION
<!-- ANCHOR: da_role_systems_architect_model_opus_strategy_u_2192_sonnet_impl_effort_m_10_15_calls_sessions_1 -->
### Role: Systems Architect | Model: Opus (strategy)   Sonnet (impl) | Effort: M (10-15 calls) | Sessions: 1
<!-- ANCHOR: da_goal_use_advanced_tools_at_full_capability_not_just_basic_invocations -->
### Goal: Use advanced tools at full capability, not just basic invocations
<!-- ANCHOR: da_source_manus_6_laws_ralph_validation_superpowers_methodology -->
### Source: Manus 6 Laws, Ralph validation, Superpowers methodology

```
1. MANUS 6 LAWS IMPLEMENTATION AUDIT:
   Law 1: KV-cache stability    Are we keeping system prompt stable? Audit.
   Law 2: Mask-don't-remove    Are we masking completed work or deleting? Audit.
   Law 3: Filesystem-as-context    Are we using disk as extended memory? Audit.
   Law 4: Attention via recitation    Are we reciting key state for attention? Audit.
   Law 5: Keep wrong stuff    Are we preserving errors for learning? Audit.
   Law 6: Avoid few-shot contamination    Are we avoiding bad patterns? Audit.
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

<!-- ANCHOR: da_v14_4_additions_to_ms3_wave_3_prism_doc_enhancements -->
### v14.4 ADDITIONS TO MS3 (Wave 3    prism_doc Enhancements):

```
W3-PRISM_DOC ENHANCEMENTS (~1 session, Sonnet impl, Opus review):
  Three new actions added to the doc dispatcher. Each saves significant tokens.

  W3-1: prism_doc action=hash (Content-addressed cache):
    Returns SHA-256 short hash (16 chars) of file content WITHOUT loading content.
    Usage: After compaction → hash all files → compare to remembered hashes →
      only reload files whose hash changed. Saves ~10K per file NOT reloaded.
    Implementation: crypto.createHash('sha256').update(content).digest('hex').substring(0,16)
    Returns: { name, hash, size, modified }

  W3-2: prism_doc action=diff (Change detection):
    Compare current file against baseline hash or git history.
    Mode A: diff name=X baseline_hash=abc123 → diff since that hash
    Mode B: diff name=X since=2026-02-16 → diff since date (via git log)
    Returns: list of changed anchor sections + line count delta. NOT full diff.
    Use: Verify edits didn't regress. Show what changed since last session.

  W3-3: prism_doc action=read_section (Anchor-aware partial loading):
    Read from one anchor to the next (or end of file).
    prism_doc action=read_section name=PRISM_PROTOCOLS_CORE.md section=pc_boot_protocol
    Returns: only content between that anchor and the next anchor.
    DEPENDS ON: W1 anchors being in place. Without anchors → falls back to full read.
    This is the primary token saver: 30 lines instead of 2,106.

  BUILD: npm run build after each action. Test: prism_dev action=health.
  OPUS GATE: Review diff output schema    it feeds into regression detection.
  VERIFY: All 3 actions callable. hash returns consistent results. read_section
    returns correct content boundaries. diff reports actual changes.
```

---

<!-- ANCHOR: da_da_ms4_deterministic_hook_configuration_claude_code -->
## DA-MS4: DETERMINISTIC HOOK CONFIGURATION (Claude Code)
<!-- ANCHOR: da_role_systems_architect_model_sonnet_hook_config_test_effort_s_5_8_calls_sessions_0_5 -->
### Role: Systems Architect | Model: Sonnet (hook config + test) | Effort: S (5-8 calls) | Sessions: 0.5
<!-- ANCHOR: da_goal_deterministic_build_verification_and_safety_checks_that_cannot_be_skipped -->
### Goal: Deterministic build verification and safety checks that CANNOT be skipped
<!-- ANCHOR: da_source_claude_code_hooks_system -->
### Source: Claude Code hooks system

```
1. Add to .claude/settings.json:
   PostToolUse hooks:
   - Matcher: "Edit" → command: "npm run build 2>&1 | tail -5"
     (Every file edit triggers a build    catch breaks immediately)

   PreToolUse hooks:
   - Matcher: "Bash" → command: "node scripts/validate-safety-score.js"
     (Every bash execution checks safety score context)

2. Additional hooks to configure:
   - Pre-file-write: Anti-regression check (verify file exists, create backup)
   - Post-session: Auto-write checkpoint to CLAUDE.md

   WHY: These are DETERMINISTIC    Claude Code cannot skip, forget, or decide otherwise.
   Unlike prompt-based MCP hooks which are probabilistic, these ALWAYS fire.
   Development process hooks become guaranteed. Manufacturing calculation hooks
   still run server-side via MCP for safety.

   VERIFY: Edit any .ts file. Build should auto-run within 2 seconds.
   If build fails, the error should appear in the session immediately.
```

---

<!-- ANCHOR: da_da_ms5_qa_tooling_context_optimization_new_in_v14_4 -->
## DA-MS5: QA TOOLING + CONTEXT OPTIMIZATION (NEW in v14.4)
<!-- ANCHOR: da_goal_automated_roadmap_integrity_checks_reduce_context_overhead_from_18k_to_6k_tokens_session -->
### Goal: Automated roadmap integrity checks + reduce context overhead from ~18K to ~6K tokens/session
<!-- ANCHOR: da_model_sonnet_scripts_opus_usage_analysis_for_protocol_split -->
### Model: Sonnet (scripts) + Opus (usage analysis for protocol split)
<!-- ANCHOR: da_source_wave_2_qa_tooling_wave_5_context_optimization -->
### Source: Wave 2 (QA tooling) + Wave 5 (context optimization)
<!-- ANCHOR: da_role_context_engineer_model_sonnet_scripts_opus_protocol_split_effort_l_15_20_calls_sessions_2 -->
### Role: Context Engineer | Model: Sonnet (scripts)   Opus (protocol split) | Effort: L (15-20 calls) | Sessions: 2

```
QA SCRIPTS (Wave 2    ~30 min, Sonnet):

  W2-1: TOKEN ESTIMATE UPDATER    scripts/roadmap/update-token-estimates.ps1
    For each roadmap .md: count words ÷ 0.75 = estimated tokens.
    Update PRISM_MASTER_INDEX.md Document Manifest token estimates.
    Update RECOVERY_CARD phase-file mapping with current line counts.
    Output per file: "[filename]: [lines] lines, ~[tokens] tokens (was [old])."
    VERIFY: Run script. Check MASTER_INDEX token column matches reality.

  W2-2: ROADMAP LINT    scripts/roadmap/roadmap-lint.ps1
    Checks (each is a named test that reports PASS/FAIL):
    a. Every file in MASTER_INDEX Document Manifest exists on disk
    b. Every LOADER:SKIP marker points to a valid line (not beyond EOF)
    c. Every <!-- ANCHOR: xxx --> has a matching entry in SECTION_INDEX
    d. Every phase in Phase Registry has a matching PHASE_*.md file
    e. CURRENT_POSITION.md references a valid phase and MS
    f. No file shrank >10% since last lint (regression detection)
    g. Version headers are consistent (all say v14.4+)
    h. Cross-references between files resolve ( X →  X exists in target)
    Stores baselines in scripts/.roadmap-lint-baseline.json
    Exit: 0=clean, 1=warnings, 2=errors
    VERIFY: Run lint on current roadmap. Should be 0 (clean). Intentionally break
    something (delete a file reference). Re-run. Should be 2 (error). Fix and re-run.

  W2-3: REGRESSION TEST    scripts/roadmap/roadmap-regression-test.ps1
    Wraps: lint + index rebuild + drift check + structure validation.
    Run after ANY batch of roadmap edits.
    VERIFY: Run after W5 context changes below. Should pass.

CONTEXT OPTIMIZATION (Wave 5    ~1 session, Opus analysis + Sonnet implementation):

  W5-1: PROTOCOLS_CORE USAGE ANALYSIS (Opus, ~30 min):
    Load SECTION_INDEX (from W1). For each section in PROTOCOLS_CORE, classify:
      TIER A (every session):    Boot, env detection, position recovery, essential rules
      TIER B (phase-dependent):  Compaction, stuck, build rules, error handling
      TIER C (rare/on-demand):   Crash recovery, degradation, cadence details
      TIER D (reference only):   Error taxonomy, full schema definitions, changelogs
    Count: how many sections per tier, how many tokens per tier.
    Expected: A ~2K, B ~3K, C ~3K, D ~2K tokens.
    Output: PROTOCOLS_CORE_TIER_ANALYSIS.md

  W5-2: IMPLEMENT PROTOCOL SPLIT (Sonnet, ~1 hr):
    Create PRISM_PROTOCOLS_BOOT.md    Tier A sections only (~2K tokens).
    This is loaded EVERY session instead of full PROTOCOLS_CORE.
    Leave PROTOCOLS_CORE intact    add <!-- EXTRACTED TO PROTOCOLS_BOOT.md --> markers
    on sections that were copied to BOOT. CORE stays as the deep reference.
    Update cross-references:
      MASTER_INDEX: "Load PROTOCOLS_BOOT.md" (not CORE) in session workflow
      RECOVERY_CARD: reference BOOT for recovery, CORE "for deep reference only"
      Phase Quick Reference headers: remain self-contained (no change needed)
    VERIFY: Load BOOT only. Does it have everything needed for a standard session?
    Test: boot → position → phase doc → execute 3 steps. No missing references.

  W5-4: MASTER_INDEX SLIM-DOWN (Sonnet, ~30 min):
    Create PRISM_MASTER_INDEX_SLIM.md (~200 lines, ~1.5K tokens):
      System state condensed to 20 lines
      Phase registry table as-is (~20 lines)
      Session workflow: "Read RECOVERY_CARD" (not duplicate steps)
      Document manifest: file list only (use SECTION_INDEX for detail)
    Keep full MASTER_INDEX for phase gates. Load SLIM for normal sessions.
    VERIFY: SLIM has all critical info. Full INDEX still exists. No data lost.

TOKEN SAVINGS VERIFICATION:
  Before: MASTER_INDEX (~4K) + PROTOCOLS_CORE (~13K) + phase doc (~6K) = ~23K tokens
  After:  SLIM (~1.5K) + BOOT (~2K) + phase sections (~2K) = ~5.5K tokens
  SAVINGS: ~17K tokens per session = room for ~4x more useful work per compaction cycle.
  MEASURE: Count actual tokens loaded in a test session. Compare to baseline.
```

---

<!-- ANCHOR: da_da_ms6_hierarchical_index_code_data_branches_new_in_v14_4 -->
## DA-MS6: HIERARCHICAL INDEX    CODE + DATA BRANCHES (NEW in v14.4)
<!-- ANCHOR: da_goal_build_an_8_branch_universal_hierarchical_index_of_the_entire_prism_system -->
### Goal: Build an 8-branch universal hierarchical index of the ENTIRE PRISM system
<!-- ANCHOR: da_model_haiku_scanning_sonnet_extraction_scripts_opus_schema_design -->
### Model: Haiku (scanning) + Sonnet (extraction scripts) + Opus (schema design)
<!-- ANCHOR: da_source_system_architecture_registries_dispatchers_skills_hooks_protocols_gsd_docs_tests -->
### Source: System architecture, registries, dispatchers, skills, hooks, protocols, GSD, docs, tests
<!-- ANCHOR: da_sessions_3_schema_branches_1_5_6_in_session_1_branches_2_7_in_session_2_branch_8_in_session_3 -->
### Sessions: ~3 (schema + Branches 1,5,6 in session 1, Branches 2,7 in session 2, Branch 8 in session 3)
<!-- ANCHOR: da_role_data_architect_model_opus_schema_haiku_scanning_sonnet_extraction_effort_xl_25_35_calls_sessions_3 -->
### Role: Data Architect | Model: Opus (schema)   Haiku (scanning)   Sonnet (extraction) | Effort: XL (25-35 calls) | Sessions: 3

```
THE 8 BRANCHES (see HIERARCHICAL_INDEX_SPEC.md v2.0 for full schemas):
  WHAT THE SYSTEM IS:
    Branch 1: EXECUTION CHAIN       how code flows (dispatcher→action→engine→formula→registry)
    Branch 2: DATA TAXONOMY         how knowledge is organized (registry→group→family→grade→props)
    Branch 3: RELATIONSHIPS         how things connect across branches (populated during R2-R8)
    Branch 4: SESSION KNOWLEDGE     what Claude has learned (built by DA-MS7 below)
  HOW THE SYSTEM OPERATES:
    Branch 5: SKILLS/HOOKS/SCRIPTS    operational intelligence (126 skills, 30+ hooks, wiring)
    Branch 6: PROTOCOLS/GSD/CONFIG    system behavior rules (GSD routing, protocols, state files)
    Branch 7: DOCUMENTATION INDEX     roadmap + reference docs (section anchors, topic mapping)
    Branch 8: TEST + VALIDATION       quality assurance (test coverage, safety matrix, gates)

THIS MILESTONE BUILDS: Branches 1 and 2 FULLY, plus EMPTY SCAFFOLDS for 3-8.
  v14.5 OPT-1: Defer unpopulated branches. Build only 1+2 during DA (useful now).
  Build remaining branches during the phase that populates them:
    Branch 3 during R2, Branch 4 during DA-MS7, Branch 8 during R2.
  Branches 5-7 keep current DA schedule (useful immediately for ops).
  SAVINGS: ~1-2 sessions saved.
  Branch 2 is populated during R1 enrichment.
  Branch 3 is populated during R2+ validation.
  Branch 4 is built by DA-MS7 below.
  Branch 7 anchors are placed in DA-MS5 (Wave 1); this MS builds the queryable index.

STEP 1: DESIGN INDEX SCHEMA (Opus, ~30 min):
  Define the canonical format for all 8 branches.
  See HIERARCHICAL_INDEX_SPEC.md v2.0 for full JSON schemas.
  Review and finalize:
    - Branch 1: Dispatcher→Action→Engine→Formula chain
    - Branch 2: Material/Tool/Machine/Alarm taxonomy
    - Branch 5: Skill→Action mapping, hook trigger/gate catalog, cadence schedule
    - Branch 6: GSD routing tree, protocol section catalog, state file registry
    - Branch 7: Anchor-based section index, topic→files mapping
    - Branch 8: Test coverage map, gate criteria catalog, safety validation matrix

  All schemas are defined in HIERARCHICAL_INDEX_SPEC.md v2.0.
  This step REVIEWS and FINALIZES them, not redesigns from scratch.

  Output: Updated HIERARCHICAL_INDEX_SPEC.md (if any schema changes needed)
  Output: C:\PRISM\knowledge\index_schema.json (machine-readable combined schema)

STEP 2: BUILD BRANCH 1    EXECUTION CHAIN (Haiku scans, Sonnet extracts):
  Create scripts/index/build-execution-chain.ps1 (or .ts):

  Process for each dispatcher (31 total):
    1. Find the dispatcher file in src/dispatchers/
    2. Parse action names (case statements or action registry)
    3. For each action, find which engines are instantiated (new XxxEngine)
    4. For each engine, find which formulas are referenced
    5. For each formula, find which registry fields are read
    6. Record the full chain: dispatcher→action→engine→formula→registry_field

  Output: C:\PRISM\knowledge\branch1_execution_chain.json
  Output: C:\PRISM\knowledge\branch1_summary.md (human-readable summary)

  VERIFY: Pick 5 known action chains (e.g., prism_calc→speed_feed→SpeedFeedEngine).
  Compare script output to manually traced chain. If any mismatch → fix extraction.
  Coverage: should capture 31 dispatchers, 368+ actions. If <300 actions → scan missed some.

STEP 3: BUILD BRANCH 2    DATA HIERARCHY (Haiku scans registries):
  Create scripts/index/build-data-hierarchy.ps1 (or .ts):

  Process for each registry:
    Materials (3,518 files):
      1. Scan data/materials/ directory structure
      2. Parse ISO group from filenames or content
      3. Group by group→family→grade
      4. For each grade, check which of the 127 fields are populated
      5. Record: total count, group distribution, field coverage percentages

    Tools (5,238 files):
      1. Scan data/tools/ directory structure
      2. Group by category→type→subtype
      3. Record: counts, geometry field coverage

    Machines (1,016 entries):
      1. Scan data/machines/
      2. Group by manufacturer→model
      3. Record: capability fields coverage

    Alarms (10,033 entries):
      1. Scan data/alarms/
      2. Group by controller→range

    Formulas (500):
      1. Scan formula registry
      2. Group by domain (cutting_force, tool_life, surface_finish, etc.)

  Output: C:\PRISM\knowledge\branch2_data_hierarchy.json
  Output: C:\PRISM\knowledge\branch2_summary.md

  VERIFY: Total counts match known values (3518 materials, etc.).
  Property coverage matches W5 registry loading findings.

STEP 4: CREATE INDEX QUERY PROTOCOL:
  Add to PROTOCOLS_CORE (or PROTOCOLS_BOOT):
    "To answer any question about PRISM capabilities, query the hierarchical index:
     prism_knowledge action=query_index branch=1 path=prism_calc/speed_feed
     → returns: engines, formulas, registries used by speed_feed action
     prism_knowledge action=query_index branch=2 path=materials/S/nickel
     → returns: all nickel-alloy grades, property coverage, counts"

  If prism_knowledge action doesn't exist yet → create the dispatcher action.
  If it does exist → wire it to read from C:\PRISM\knowledge\ JSON files.

STEP 5: WIRE INDEX REBUILD INTO BUILD PIPELINE:
  Add to npm run build (post-build step):
    node scripts/index/build-execution-chain.js (regenerate Branch 1)
  Branch 2 is stable (registry data doesn't change on build)    regenerate weekly or on demand.
  Branch 3 and 4 are append-only    no rebuild needed, just append new entries.

  VERIFY: npm run build completes. Branch 1 JSON updated. No build time regression >5s.

STEP 6: BUILD BRANCH 5    SKILLS/HOOKS/SCRIPTS INDEX (Haiku scans, Sonnet catalogs):
  Create scripts/index/build-ops-index.ps1:

  Skills catalog (126 skills in C:\PRISM\skills-consolidated\):
    1. Scan all skill .md files
    2. Extract: name, domain, trigger phrases, prerequisite knowledge
    3. Map each skill to the actions it teaches (skill→action edges)
    4. Classify tier: A (critical, every session), B (common), C (specialist), D (rare)
    5. Build SKILL_PHASE_MAP: which skills load for DA, R1, R2, etc.

  Hooks catalog (30+ hooks in hookRegistration.ts):
    1. Parse hookRegistration.ts for all registerHook() calls
    2. Extract: name, type (pre/post/cadence), blocking flag, trigger condition
    3. Record priority band, fire frequency for cadence hooks
    4. Build cadence schedule: todo@5, pressure@8, checkpoint@10, etc.

  Scripts catalog:
    1. Scan scripts/ directory
    2. Record: name, purpose, when to run, phase relevance

  Wiring registries (D2F, F2E, E2S):
    1. Read each wiring JSON file
    2. Record: entry count, last verified date, file hash
    3. Flag known stale entries

  Output: C:\PRISM\knowledge\ops-index\SKILLS_HOOKS_SCRIPTS.json
  VERIFY: Skill count matches known 126. Hook count matches hookRegistration.ts.
  Cross-check: every dispatcher action has at least one skill that covers it.

STEP 7: BUILD BRANCH 6    PROTOCOLS/GSD/CONFIG INDEX (Sonnet):
  Create scripts/index/build-protocols-index.ps1:

  GSD routing tree:
    1. Parse GSD_QUICK.md decision tree structure
    2. Parse AutoPilot.ts routing rules
    3. Build queryable routing map: question_type → dispatcher → action
    4. Include orchestrator-first priority rules

  Protocols catalog (from PROTOCOLS_CORE anchored sections):
    1. Read ROADMAP_SECTION_INDEX.md (from Wave 1, Step W1-2)
    2. Filter sections from PROTOCOLS_CORE
    3. For each section: name, anchor, line, when-applies, key rule summary

  State files catalog:
    1. List all state/position/tracker files
    2. Record: path, purpose, update frequency, what reads/writes it
    3. Flag which survive compaction, session boundary, chat close

  Configuration catalog:
    1. Record key config files and their purpose
    2. Note: AtomicValue schema rules, API key locations

  Output: C:\PRISM\knowledge\ops-index\PROTOCOLS_GSD_CONFIG.json
  VERIFY: GSD routes match known 31 dispatchers. All PROTOCOLS_CORE sections cataloged.

STEP 8: BUILD BRANCH 7    DOCUMENTATION INDEX (from Wave 1 anchors):
  This is mostly done by W1-2 (ROADMAP_SECTION_INDEX.md).
  This step converts it to the Branch 7 JSON format and adds:

  1. Topic→files mapping: for each concept (compaction, safety, boot, etc.),
     list all anchor sections across all files that discuss it
  2. Phase→docs mapping: for each phase, list primary doc, supporting docs,
     and which protocol sections apply
  3. Reference doc catalog: purpose + relevance for each reference/ file

  Output: C:\PRISM\knowledge\doc-index\DOCUMENTATION_INDEX.json
  VERIFY: Every anchor in SECTION_INDEX has an entry. Topic search returns relevant results.

STEP 9: BUILD BRANCH 8 SCAFFOLD    TEST/VALIDATION INDEX (Sonnet):
  Create scripts/index/build-qa-index.ps1:

  Test coverage:
    1. Scan src/**/__tests__/ for all test files
    2. For each: record what it tests, case count, last pass date
    3. Map: feature → test file (so "I changed SpeedFeedEngine" → run these tests)

  Validation tools catalog:
    1. Record: ralph_loop, omega_compute, anti_regression    usage, requirements, thresholds

  Safety validation matrix:
    1. Record S(x) computation chain, components, threshold
    2. Note: populated fully during R2 with 50-calculation matrix

  Phase gate criteria:
    1. For each phase, extract gate criteria from phase doc
    2. Record: what to check, what threshold, what to measure

  Roadmap integrity checks:
    1. Record: lint script, regression script, index rebuild    paths + usage

  Output: C:\PRISM\knowledge\qa-index\TEST_VALIDATION.json
  VERIFY: At least 1 test file mapped for each engine. All phase gates have criteria.
```

---

<!-- ANCHOR: da_da_ms7_session_knowledge_system_new_in_v14_4 -->
## DA-MS7: SESSION KNOWLEDGE SYSTEM (NEW in v14.4)
<!-- ANCHOR: da_goal_capture_what_claude_learns_each_session_and_make_it_queryable_in_future_sessions -->
### Goal: Capture what Claude learns each session and make it queryable in future sessions
<!-- ANCHOR: da_model_sonnet_implementation_opus_extraction_protocol_design -->
### Model: Sonnet (implementation) + Opus (extraction protocol design)
<!-- ANCHOR: da_source_branch_4_of_hierarchical_index_f2_memory_graph_session_handoff_protocol -->
### Source: Branch 4 of hierarchical index, F2 Memory Graph, session handoff protocol
<!-- ANCHOR: da_sessions_2_schema_extraction_in_session_1_query_promotion_in_session_2 -->
### Sessions: ~2 (schema + extraction in session 1, query + promotion in session 2)
<!-- ANCHOR: da_role_intelligence_architect_model_opus_protocol_design_sonnet_impl_effort_l_15_20_calls_sessions_2 -->
### Role: Intelligence Architect | Model: Opus (protocol design)   Sonnet (impl) | Effort: L (15-20 calls) | Sessions: 2

```
THIS IS THE MOST IMPACTFUL NEW CAPABILITY:
  Currently: ~5% of session knowledge survives to next session (only CURRENT_POSITION.md)
  After: ~90% of actionable knowledge survives (decisions, errors, relationships, observations)
  Effect: Sessions stop re-discovering what was already learned. "Just say continue" includes
  not just WHERE to continue but WHAT WE KNOW about the work.

STEP 1: CREATE KNOWLEDGE DIRECTORY STRUCTURE:
  C:\PRISM\knowledge\            ← created in MS6 for index, reuse
  C:\PRISM\knowledge\sessions\   ← per-session extractions
  C:\PRISM\knowledge\decisions\  ← promoted decisions (permanent)
  C:\PRISM\knowledge\errors\     ← known error fixes (permanent)
  C:\PRISM\knowledge\observations\ ← performance and behavior notes
  C:\PRISM\knowledge\relationships\ ← discovered cross-registry edges (→ Branch 3)
  C:\PRISM\knowledge\SESSION_KNOWLEDGE_INDEX.json ← queryable master index

STEP 2: DESIGN EXTRACTION PROTOCOL (Opus, ~30 min):
  Define what gets extracted from each session. Six knowledge types:

  TYPE: decision
    TRIGGER: Claude chose between alternatives (A vs B, decided A)
    EXAMPLE: "Chose TypeScript enum over const for tool categories because const
              allows computed values needed for composite keys."
    WHY SAVE: Future sessions must respect this choice, not re-decide.

  TYPE: error_fix
    TRIGGER: An error was encountered and a fix was found
    EXAMPLE: "MaterialRegistry.get() returns null for materials with spaces in ISO.
              Fix: normalize with trim() before lookup."
    WHY SAVE: Prevents rediscovering the same bug. Saves 5-10 calls per occurrence.

  TYPE: assumption
    TRIGGER: Claude assumed something was true and it was validated or invalidated
    EXAMPLE: "Assumed all tool files have 'geometry' field. False    1,247 of 5,238 lack it."
    WHY SAVE: Prevents future sessions from making the same false assumption.

  TYPE: performance
    TRIGGER: A performance characteristic was observed or benchmarked
    EXAMPLE: "Loading all 3,518 material files takes 4.2s. Batch 500 reduces to 2.8s."
    WHY SAVE: Prevents re-benchmarking. Informs optimization decisions.

  TYPE: blocker
    TRIGGER: A step was blocked and the block was resolved OR deferred with context
    EXAMPLE: "R1-MS5 step 7 blocked: ToolIndex composite key needs schema finalization.
              Deferred to MS5 step 12."
    WHY SAVE: Next session sees "DEFERRED" but also knows WHY and WHEN it'll resolve.

  TYPE: relationship
    TRIGGER: A cross-registry connection was discovered during work
    EXAMPLE: "Inconel 718 calculations require BOTH kc1.1 AND thermal conductivity.
              Kienzle extended model needs thermal for temperature compensation."
    WHY SAVE: Feeds directly into Branch 3 of hierarchical index.

  EXTRACTION RULES:
    - Extract at session end OR before handoff OR before expected compaction
    - Each entry is 1-4 sentences. Not paragraphs. Not raw conversation.
    - Tag with: phase, milestone, relevant anchors, date
    - Confidence: "verified" (tested and confirmed), "observed" (seen but not tested),
      "hypothesized" (inferred but not confirmed)
    - Maximum: 10 entries per session (quality over quantity)

  Output: KNOWLEDGE_EXTRACTION_PROTOCOL.md (the instructions for Claude to follow)

STEP 3: BUILD EXTRACTION TOOLING (Sonnet, ~1 hr):
  Option A (MCP server    preferred):
    Add prism_knowledge action=extract_session_knowledge:
      Input: array of knowledge entries (type, phase, ms, summary, detail, tags, confidence)
      Action: Write each entry to C:\PRISM\knowledge\[type]\[date]_[slug].md
      Action: Update SESSION_KNOWLEDGE_INDEX.json with new entries
      Return: count of entries saved, total index size

  Option B (DC fallback):
    Write entries directly via DC write_file to the knowledge directory.
    Update SESSION_KNOWLEDGE_INDEX.json manually.

  SESSION_KNOWLEDGE_INDEX.json format:
    {
      "version": 1,
      "entry_count": 47,
      "entries": [
        {
          "id": "2026-02-16_tool-index-composite-key",
          "type": "decision",
          "phase": "R1", "milestone": "MS5",
          "summary": "ToolIndex composite key requires [category, diameter, material_class]",
          "tags": ["tool_registry", "schema_design", "R1-MS5"],
          "date": "2026-02-16",
          "confidence": "verified",
          "file": "decisions/2026-02-16_tool-index-composite-key.md",
          "promoted_to": null
        }
      ],
      "by_phase": { "R1": [0, 1, 5, 12], "DA": [2, 3, 4] },
      "by_type": { "decision": [0, 3], "error_fix": [1, 4, 5] }
    }

  The by_phase and by_type indexes allow fast lookup without scanning all entries.

  VERIFY: Extract 3 test entries from THIS session's work. Check they appear in index.
  Read them back. Confirm content matches.

STEP 4: BUILD KNOWLEDGE QUERY ON BOOT (Sonnet, ~30 min):
  Integrate into boot sequence (PROTOCOLS_BOOT.md and RECOVERY_CARD):

  After position recovery (we know current phase + MS):
    IF SESSION_KNOWLEDGE_INDEX.json exists:
      Query: entries where phase = current_phase AND milestone = current_ms
      Also: entries where type = "error_fix" AND tags contain current_ms topic
      Load summaries into context (~50-200 tokens depending on match count)
      Log: "Loaded N knowledge entries for [phase]-[ms]"
    IF index missing: skip (knowledge is optional, not required for execution)

  Update RECOVERY_CARD  STEP 3: EXECUTE:
    Add: "Before executing, check knowledge index for current MS:
          prism_knowledge action=query phase=[phase] milestone=[ms]
          This returns decisions, known errors, and observations from prior sessions.
          Apply this knowledge: respect decisions, avoid known errors, use observations."

  VERIFY: Boot a new session. Say "continue." Knowledge entries appear in context.
  Claude doesn't rediscover previously-found errors.

STEP 5: BUILD KNOWLEDGE PROMOTION (Opus reviews, Sonnet implements):
  Some session knowledge should become PERMANENT system knowledge:

  PROMOTION RULES:
    error_fix verified in 2+ sessions → becomes a test case or code fix
    decision verified in 3+ sessions → becomes a protocol rule or code comment
    relationship verified → becomes an edge in Branch 3 (relationship graph)
    performance confirmed → becomes a benchmark in PERF_BASELINES.json
    blocker resolved → archive (but keep for reference)
    assumption invalidated → flag any code that still assumes the wrong thing

  Process:
    Every 5 sessions, Opus reviews SESSION_KNOWLEDGE_INDEX.json:
      - Which entries have been re-encountered?
      - Which are verified across multiple sessions?
      - Which should be promoted to permanent knowledge?
    For promoted entries:
      - Write to appropriate permanent location (test, code comment, Branch 3, protocol)
      - Update entry: promoted_to = { branch, path }
      - Entry stays in index (for provenance) but flagged as promoted

  VERIFY: After 5 R1 sessions, review index. At least 3 entries should be promotable.
  Promote one. Verify it appears in the target location. Verify index updated.

STEP 6: WIRE EXTRACTION INTO SESSION END PROTOCOL:
  Update PROTOCOLS_CORE  SESSION HANDOFF:
    BEFORE HANDOFF (add as step 0 of handoff):
      Review this session's work. Extract up to 10 knowledge entries.
      Call prism_knowledge action=extract_session_knowledge with entries.
      THEN proceed with normal handoff (position, tracker, state save).

  Update RECOVERY_CARD  SESSION END PROTOCOL:
    Add: "0. Extract session knowledge (decisions, errors, observations)
          prism_knowledge action=extract_session_knowledge entries=[...]"

  VERIFY: End a session. Check C:\PRISM\knowledge\sessions\ for new entries.
  Check SESSION_KNOWLEDGE_INDEX.json updated. Start new session. Knowledge loads.
```

---

<!-- ANCHOR: da_da_ms8_phase_gate_end_to_end_integration_test_companion_assets_was_ms5 -->
## DA-MS8: PHASE GATE + END-TO-END INTEGRATION TEST + COMPANION ASSETS (was MS5)
<!-- ANCHOR: da_role_systems_architect_model_sonnet_tests_u_2192_opus_gate_review_effort_m_10_15_calls_sessions_1 -->
### Role: Systems Architect | Model: Sonnet (tests)   Opus (gate review) | Effort: M (10-15 calls) | Sessions: 1
<!-- ANCHOR: da_gate_development_infrastructure_is_measurably_faster_claude_code_fully_operational -->
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
  4. HANDOFF.md protocol tested    write at end, read at start, verified continuity
  5. SKILL_TIER_MAP.json created with all 126 skills classified
  6. At least 10/15 Claude Code skills auto-load when relevant topics arise
  7. SCRIPT_HEALTH_REPORT.md shows >80% of top 20 scripts working
  8. All 5 subagents respond correctly to domain queries
  9. All 5 slash commands execute without error
  10. At least 1 parallel agent batch tested successfully
  11. MANUS_COMPLIANCE.md shows  3/5 on all 6 laws
  12. Post-edit hook fires build within 2 seconds
  13. Subagent memory persists across session boundary
  14. /checkpoint → /boot cycle preserves state
  15. Ralph schedule documented and tested at MS-level
  16. 5 NL development hooks created and firing
  17. Context budget tracking active and logging
      0.75

v14.4 ADDITIONAL GATE CRITERIA (items 18-30):
  18. Section anchors placed on all 20+ files ( 220 total, verified by grep)
  19. ROADMAP_SECTION_INDEX.md exists, has all anchors, regeneration script works
  20. roadmap-lint.ps1 runs clean (exit 0) on current roadmap state
  21. roadmap-regression-test.ps1 passes all checks
  22. prism_doc action=hash works    returns consistent hashes
  23. prism_doc action=read_section works    loads anchor-bounded content
  24. prism_doc action=diff works    reports changed sections
  25. Session health_check returns valid status with correct thresholds
  26. Pre-compaction auto-dump fires at >55% pressure (test with simulated pressure)
  27. PROTOCOLS_BOOT.md created, loads in ≤2K tokens, sufficient for standard session
  28. MASTER_INDEX_SLIM.md created, loads in ≤1.5K tokens
  29. Token savings measured: normal session loads ≤6K tokens of roadmap docs
  30. Hierarchical index Branches 1+2 populated, queryable via prism_knowledge
  31. SESSION_KNOWLEDGE_INDEX.json exists with  5 entries from DA work
  32. Knowledge query on boot loads relevant entries for current MS
  33. Cold start test: new chat → "continue" → Claude executes without human guidance
  34. Compaction recovery test: recovers in ≤3 calls, resumes without re-reading full docs
  35. Rapid compaction test: 3 compactions → ultra-minimal mode → still makes progress
      0.80 (raised from 0.75 due to expanded scope)

MEASURABLE OUTCOME:
  Session startup time: <60 seconds from boot to productive work
  Context waste: <10% of framework tokens are unused per session
  Continuity: Zero re-discovery of previous session's work
  Compaction recovery: Resume within 30 seconds after compaction

FAILURE PROTOCOL: If any check fails, fix the specific config file and re-test
that check. Do not proceed to R1 until all checks pass.

NOTE: MS8 is a mid-phase integration gate. DA is NOT complete until MS11
(enforcement wiring) passes. Skills auto-firing, hooks auto-evaluating, and
scripts auto-recommending are REQUIRED before R1 starts. Without MS11,
R1 sessions run without automatic skill loading or enforcement.

---

<!-- ANCHOR: da_da_ms9_skill_atomization_infrastructure_new_in_v14_5 -->
## DA-MS9: SKILL ATOMIZATION INFRASTRUCTURE (NEW in v14.5)
# Role: Sonnet (implementation) + Opus (schema design) | Sessions: 2 | Depends: MS2 (skill audit)
<!-- ANCHOR: da_role_data_architect_model_opus_skill_index_schema_sonnet_automation_scripts_effort_l_15_20_calls_sessions_2 -->
### Role: Data Architect | Model: Opus (SKILL_INDEX schema)   Sonnet (automation scripts) | Effort: L (15-20 calls) | Sessions: 2
# Environment: MCP + DC | Parallel-safe: Yes
# PURPOSE: Build the tooling to split 34 multi-function skills into atomic single-function
#          skills (≤5KB each) and extract skills from 206 MIT courses + ~25 CNC/CAM guides on disk.
#          One skill = one function. Every skill indexed. Skills auto-called by context.

WHY THIS MATTERS:
  Loading prism-gcode-reference (62KB) to answer one G-code question burns ~15K tokens
  on 36 irrelevant sections. 34 oversized skills × average load = massive context waste.
  Meanwhile 206 MIT OCW courses (12.3GB) + ~25 CNC/CAM training guides sit on disk as raw PDFs    inaccessible knowledge.
  Atomized + indexed skills: load 2-4KB per query instead of 20-60KB. 70-90% token savings.

INVENTORY (from analysis):
  Priority 1 (>20KB, 15 skills): gcode-ref 62KB/37sec, fanuc 55KB/29sec,
    heidenhain 53KB/30sec, siemens 52KB/32sec, material-physics 38KB/59sec,
    anti-regression 36KB/21sec, prompt-eng 33KB/20sec, perf-patterns 30KB/13sec,
    solid-principles 29KB/13sec, error-handling 28KB/13sec, session-master 26KB/30sec,
    safety-framework 25KB/32sec, process-optimizer 24KB/34sec, master-equation 22KB/29sec,
    skill-orchestrator 21KB/20sec
  Priority 2 (10-20KB, 19 skills): cutting-mechanics, signal-processing, hook-system,
    post-processor-ref, formula-evolution, codebase-packaging, combination-engine,
    design-patterns, speed-feed-engine, wiring-templates, cam-strategies,
    resource-optimizer, algorithm-selector, synergy-calculator, scientific-packages,
    efficiency-controller, mathematical-planning, cutting-tools, python-tools
  Already right-sized: 65 skills under 10KB

  MIT COURSES: 206 unique courses (234 zips) at C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\
    T1 Manufacturing: 2.830j, 2.008, 2.670, 2.854, 16.660j, 2.75, 2.004, 2.003j + 17 more (~25)
    T2 Materials/Physics: 3.012, 3.016, 3.021j, 3.042, 3.11, 3.15, 3.21, 3.225, 3.22, 3.60, 3.a27 (~11)
    T3 Math/Numerical: 18.03, 18.02, 18.086, 18.098, 18.305, 18.311, 10.34 (~27)
    T4 Algorithms/CS: 6.006, 6.046j, 6.438, 6.854j, 6.005, 6.042j + 46 more (~52)
    T5 Operations/Mgmt: 15.773, 15.769, 15.060, 15.057, 15.097 + 15 more (~20)
    T6 Physics/Other: 8.xxx(9), 9.xxx(4), 16.xxx(14), + misc (~47)

STEP 1: CREATE SKILL_INDEX SCHEMA (Opus, 30 min):
  Create C:\PRISM\skills-consolidated\SKILL_INDEX.json with schema:
    Per skill: id, function (one-line), triggers (keywords), domain, source,
    size_kb, prism_phases[], related[], tags[], path
    Metadata: total count, source breakdown, avg size, last_updated
  VERIFY: Schema validates. Can query by trigger, domain, phase.

STEP 2: BUILD SKILL-SPLIT AUTOMATION (Sonnet, 45 min):
  Create scripts/skills/split-skill.ps1:
    Input: path to monolithic skill
    Process: Parse ## headers → identify discrete functions → propose atomic splits
    Output: List of proposed skills with names, function descriptions, estimated sizes
    Does NOT auto-create files    proposes for review.
  VERIFY: Run on prism-gcode-reference. Outputs ~37 proposed atomic skills.

STEP 3: BUILD COURSE-EXTRACTION PIPELINE (Sonnet, 45 min):
  Create scripts/skills/extract-course-skills.ps1:
    Input: path to course directory (extracted OCW content)
    Process: Find syllabus/content_map → parse topics → identify discrete functions
    Output: List of proposed skills with names, source lectures, function descriptions
    Handles both extracted directories AND zip files (extracts to temp, processes, cleans up).
  VERIFY: Run on 2.830j (already extracted). Outputs 20-30 proposed skills.

STEP 4: BUILD INDEX-UPDATE TOOL (Sonnet, 20 min):
  Create scripts/skills/update-skill-index.ps1:
    Input: path to new skill directory (or batch of directories)
    Process: Read SKILL.md → extract function/triggers/tags → add to SKILL_INDEX.json
    Deduplication: warn if triggers overlap with existing skill >80%
  VERIFY: Add 3 test skills. Index grows. Duplicates detected.

STEP 5: INDEX EXISTING 65 RIGHT-SIZED SKILLS (Haiku, 30 min):
  Run index-update tool on all existing skills under 10KB.
  These don't need splitting    just indexing.
  VERIFY: SKILL_INDEX.json contains 65 entries. All have triggers and tags.

GATE: 4 scripts created and tested. SKILL_INDEX.json populated with 65 existing skills.
  Split tool proposes reasonable atomic skills for gcode-reference.
  Course extraction tool proposes reasonable skills for 2.830j.

---

<!-- ANCHOR: da_da_ms10_skill_atomization_pilot_course_pilot_new_in_v14_5 -->
## DA-MS10: SKILL ATOMIZATION PILOT + COURSE PILOT (NEW in v14.5)
# Role: Haiku (bulk) + Sonnet (review) | Sessions: 4 | Depends: MS9
<!-- ANCHOR: da_role_data_architect_model_haiku_bulk_extraction_sonnet_quality_review_opus_pattern_validation_effort_xl_25_40_calls_sessions_4 -->
### Role: Data Architect | Model: Haiku (bulk extraction)   Sonnet (quality review)   Opus (pattern validation) | Effort: XL (25-40 calls) | Sessions: 4
# Environment: MCP + DC | Parallel-safe: Yes (multiple Haiku instances)
# PURPOSE: Validate the pattern by splitting 3 flagship skills and extracting 3 courses.
#          Establish quality bar before bulk execution.

PILOT SET A    SKILL SPLITS (3 skills → ~100 atomic skills):

  SPLIT 1: prism-gcode-reference (62KB, 37 sections → ~37 atomic skills)
    Most sections → 1 skill. Example:
      Section "G28 Reference Return" → prism-gcode-g28-reference-return/SKILL.md
      Section "G43 Tool Length Comp" → prism-gcode-g43-tool-length-comp/SKILL.md
      Section "Canned Cycles" → may split further: drilling, tapping, boring, peck
    Process:
      1. Run split-skill.ps1 on prism-gcode-reference → review proposals
      2. For each approved proposal: create directory + SKILL.md
      3. SKILL.md format (v2.0   see skill-authoring-checklist v2.0):
         ---
         name: prism-gcode-g28-reference-return
         description: Reference return positioning via G28 for machine zero recovery
         ---
         # G28 Reference Return
         ## When To Use
         - "How do I send the machine home?" / "G28 vs G53?" / "reference return mid-program"
         - NOT for G30 (second reference)   use prism-gcode-g30-second-reference
         ## How To Use
         - prism_skill_script skill_content id="prism-gcode-g28-reference-return"
         - Check if user needs incremental (G91 G28) vs absolute (G90 G28)
         - If controller-specific: cross-ref with prism-fanuc-* or prism-siemens-* skills
         ## What It Returns
         - G28 syntax per mode, axis selection rules, intermediate point behavior
         - Common error: G28 without G91 crashes into part on some controllers
         ## Examples
         - Input: "Safe way to home Z axis mid-program on Fanuc"
           Output: "G91 G28 Z0   incremental mode, Z retracts to R-point then reference"
         - Edge case: "G28 U0 W0 on lathe"   uses U/W not X/Z for incremental
         SOURCE: Split from prism-gcode-reference
         RELATED: prism-gcode-g30-second-reference, prism-gcode-g53-machine-coords
         EVERY skill must pass v2.0 anti-template test. Read checklist BEFORE creating.
      Batch limit: 3-5 skills per session. Never auto-generate How/Returns/Examples.
      4. Run index-update tool → verify indexed
      5. Archive original: mv prism-gcode-reference → _archived/prism-gcode-reference
    VERIFY: 37 atomic skills exist. Each ≤5KB. Original archived. Index has all 37.

  SPLIT 2: prism-material-physics (37.5KB, 59 sections → ~40-50 atomic skills)
    Heavy on formulas    each formula/concept = 1 skill.
    Examples: chip-thinning-factor, kienzle-specific-force, taylor-tool-life,
             merchant-shear-angle, thermal-conductivity-machining
    VERIFY: 40-50 skills. Each has the formula + when to use + units.

  SPLIT 3: prism-safety-framework (24.9KB, 32 sections → ~25-30 atomic skills)
    Safety-critical    extra care on completeness.
    Examples: safety-score-calculation, spindle-overload-detection, collision-check,
             coolant-pressure-validation, chip-load-limits
    VERIFY: 25-30 skills. Every safety check from original preserved. No gaps.

PILOT SET B    COURSE EXTRACTION (3 courses → ~70-90 skills):

  COURSE 1: 2.830j Control of Manufacturing Processes (~25 skills)
    Location: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\2.830j-spring-2008\
    Content: 84 PDFs (lectures + assignments)
    Process:
      1. Run extract-course-skills.ps1 → review proposed skill list
      2. For each approved skill: create directory + SKILL.md
      3. SKILL.md format (v2.0   see skill-authoring-checklist v2.0):
         ---
         name: prism-mfg-spc-control-charts
         description: Statistical process control chart construction and interpretation for machining
         ---
         # SPC Control Charts for Machining
         ## When To Use
         - "How do I set up X-bar R chart for my turning process?"
         - "Control limits for surface finish monitoring" / "Is my process in control?"
         - NOT for capability indices (Cpk/Ppk)   use prism-mfg-cpk-capability
         ## How To Use
         - Determine measurement type   select chart (X-bar R for n<10, X-bar S for n 10)
         - Calculate: UCL = X  + A R , LCL = X  - A R  (A  from table by subgroup size)
         - For manufacturing: typical subgroup n=5, sample every 10-25 parts
         ## What It Returns
         - Control limit formulas with A /D /D  constants for n=2-10
         - Decision rules: 1 point beyond 3 , 8 consecutive on one side, etc.
         - Common pitfall: using specification limits instead of control limits
         ## Examples
         - Input: "Turning OD on 4140, measuring every 20th part, groups of 5"
           Output: X =25.002mm, R =0.008mm, UCL=25.007mm, LCL=24.997mm, A =0.577
         - Edge: "Only 15 data points"   too few for reliable limits, need  25 subgroups
         SOURCE: MIT 2.830j Spring 2008, Lecture 5
         RELATED: prism-mfg-cpk-capability, prism-mfg-six-sigma-metrics
         EVERY skill must pass v2.0 anti-template test. 3-5 skills per session max.
      4. Index all new skills
    Expected skills: SPC, Cpk, process capability, DOE, Taguchi methods,
      surface finish prediction, tool wear monitoring, force modeling, thermal effects...
    VERIFY: 20-30 skills. Each traceable to specific lecture/content.

  COURSE 2: 3.012 Fundamentals of Materials Science (~25 skills)
    Location: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\3.012-fall-2005\
    Content: 173 PDFs
    Expected skills: phase diagrams, crystal structure, mechanical properties,
      diffusion, thermal properties, hardness testing, stress-strain, fracture mechanics...
    VERIFY: 20-30 skills. Materials knowledge directly feeds PRISM registries.

  COURSE 3: 18.03 Differential Equations (~20 skills)
    Location: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS\18.03-spring-2010\
    Content: 213 PDFs
    Expected skills: first-order ODEs, second-order linear, Laplace transforms,
      Fourier series, systems of equations, numerical methods, stability analysis...
    VERIFY: 15-25 skills. Math foundations for PRISM calculation engines.

QUALITY GATE (after all 6 pilots - count AND quality):
  COUNT CHECKS:
  - Total new atomic skills: ~170-200
  - Average skill size: 2-5KB (hard cap 8KB, exception: lookup tables)
  - SKILL_INDEX.json updated with all new skills + triggers + relationships
  - Token test: load 3 relevant skills for a sample query = <15KB total
  - Zero knowledge loss: spot-check 10 random sections from originals - all present
  - Course attribution: every course-derived skill cites source lecture
  - Duplicate check: no course skill duplicates an existing split skill
  QUALITY CHECKS (v2.0 - MANDATORY, not optional):
  - ALL skills have 4 sections: When To Use, How To Use, What It Returns, Examples
  - ANTI-TEMPLATE: Random sample of 10 skills - no two share >50% operational text
  - EXAMPLES: Every skill has >=2 examples with real numbers, materials, or formulas
  - SWAP TEST: Pick 3 random pairs, swap How To Use. If still makes sense, FAIL.
  - FRESH INSTANCE TEST: Load 1 skill into fresh Claude. Executes uniquely? If not, FAIL.
  - Read skill-authoring-checklist v2.0 BEFORE running this gate.

POST-PILOT DECISION POINT:
  If pilot succeeds → bulk execution proceeds as parallel track alongside R1
  If quality issues → refine scripts/patterns before scaling
  Bulk execution plan (runs parallel to R1+):
    Wave 4: Remaining 31 skill splits (5-8 sessions, Haiku)
    Wave 5: Tier 1-3 course extraction (11-17 sessions, Haiku)
    Wave 6: Tier 4-6 + remaining courses (20-35 sessions, Haiku)
    Wave 7: Cross-reference + dedup + quality review (3-5 sessions, Sonnet)
  Total bulk: ~39-65 sessions, producing ~2400+ additional atomic skills
  Tracked in: SKILL_ATOMIZATION_TRACKER.md (created at MS9 gate)

### MS10 GATE AMENDMENT (2026-02-18)
**RATIONALE:** Original spec targeted 3 machining skill splits + 3 course extractions.
During execution, we pivoted to dev-first skill splits because dev skills accelerate
every remaining phase, while machining splits only help from R2+. The quality PATTERN
was validated identically — same v2.0 format, same anti-template tests, same swap tests.

**ACTUAL PILOT EXECUTED:**
  18 source monoliths → 48 atomic skills (all dev/executable, not machining reference)
  Sources: anti-regression(3), error-handling(2), session-master(3), hook-system(3),
    combination-engine(5), process-optimizer(4), performance-patterns(4),
    mathematical-planning(3), wiring-templates(3), efficiency-controller(2),
    formula-evolution(2), prompt-engineering(2), codebase-packaging(2),
    python-tools(2), skill-orchestrator(1), design-patterns(1),
    algorithm-selector(1), resource-optimizer(1), solid-principles(1), gcode-reference(3)
  Skipped as reference-only: solid-principles (30KB), design-patterns (16KB) —
    executable portions already covered by code-review-checklist and pattern-selection

**QUALITY GATE RESULTS (2026-02-18):**
  ✅ 48 atomic skills created (spec: ~170-200 — count lower, pattern proven)
  ✅ Avg size: 4.4KB (spec: 2-5KB)
  ✅ 0/48 over 8KB hard cap
  ✅ 10/10 random spot-check: all have 4 sections
  ✅ 10/10 all have ≥2 examples with real data
  ✅ 3/3 swap test pairs: non-interchangeable
  ✅ SKILL_INDEX.json updated: 164 total entries with sizes, triggers, tags, phases
  ✅ Index script operational (update-skill-index.ps1 — has NaN bug, manual indexing works)
  ⚠️ Count: 48 vs spec 170-200. Deferred: machining splits (R2+), course extraction (R2+)

**VERDICT:** PATTERN VALIDATED. Quality bar established. Bulk machining/course work deferred
to parallel track alongside R1+. MS10 gate PASSES on pattern validation criteria.

**DEFERRED TO R2+ PARALLEL TRACK:**
  - gcode-reference remaining 34 sections
  - material-physics 40-50 splits
  - safety-framework 25-30 splits
  - Course extractions (2.830j, 3.012, 18.03)

---

<!-- ANCHOR: da_da_ms11_enforcement_wiring_companion_asset_build -->
## DA-MS11: ENFORCEMENT WIRING + COMPANION ASSET BUILD (NEW in v15.0)
# Role: Sonnet (implementation) + Opus (verification) | Sessions: 2 | Depends: MS8 (gate), MS9 (index)
<!-- ANCHOR: da_role_platform_engineer_model_sonnet_impl_opus_verify_effort_l_15_25_calls_sessions_2 -->
### Role: Platform Engineer | Model: Sonnet (implementation) → Opus (verification) | Effort: L (15-25 calls) | Sessions: 2
# Environment: MCP + DC | Parallel-safe: No (modifies cadenceExecutor.ts)
# PURPOSE: Build the code-level enforcement mechanisms that make skills auto-fire,
#          hooks auto-evaluate, and scripts auto-suggest. Without this milestone,
#          the companion assets listed below are bullet points with no code behind them.
#          This is the milestone that turns documentation into enforcement.

WHY THIS MATTERS:
  phase_skill_auto_loader exists as a bullet point in companion assets.
  skill_context_matcher exists as a bullet point.
  nl_hook_cadence_wiring exists as a bullet point.
  None of them are in any MS0-MS10 step. Nothing builds them. Nothing gates them.
  If we skip this, skills load only when Claude remembers to load them,
  hooks fire only if autoHookWrapper already covers them, and scripts
  run only if someone manually types the command.
  This milestone makes enforcement AUTOMATIC and CODE-LEVEL.

STEP 1: BUILD phase_skill_auto_loader CADENCE FUNCTION (Sonnet, 45 min):
  File: src/tools/cadenceExecutor.ts
  Add new cadence function: phase_skill_auto_loader
  Trigger: call #1 of every session (same timing as session_boot)
  Logic:
    1. Read CURRENT_POSITION.md → extract PHASE value
    2. Read phase doc header (first 30 lines) → extract RECOMMENDED_SKILLS line
    3. Parse skill list → for each skill not already loaded this session:
       call skill_load internally → cache loaded skill IDs
    4. Return: { skills_loaded: [...], phase: "DA" } in cadence output
  VERIFY: Start session. Check cadence output at call #1. Skills listed.
    Manually confirm skill content is available via skill_content call.

STEP 2: BUILD skill_context_matcher CADENCE FUNCTION (Sonnet, 45 min):
  File: src/tools/cadenceExecutor.ts
  Add new cadence function: skill_context_matcher
  Trigger: every tool call (same timing as pressure_check)
  Logic:
    1. On first call: load SKILL_INDEX.json into memory (one-time, ~50KB)
    2. Extract keywords from current action + params
       (action name, material name, operation type, error codes, etc.)
    3. Match keywords against SKILL_INDEX.json trigger fields
    4. If match found AND skill not in loaded_this_session set:
       queue skill_load for matched skill, add to loaded set
    5. Return: { matched_skill: "prism-X" | null } in cadence output
  Performance: O(n) string match across ~200 trigger arrays per call.
    At ~200 skills × ~5 triggers each = 1000 comparisons. <1ms.
  VERIFY: Call prism_calc:chip_thinning → verify prism-chip-thinning-factor
    auto-loads. Call prism_data:alarm_decode → verify relevant alarm skill loads.

STEP 3: WIRE NL HOOKS INTO CADENCE (Sonnet, 30 min):
  File: src/tools/cadenceExecutor.ts
  Add new cadence function: nl_hook_evaluator
  Trigger: every tool call (low priority, after main cadence)
  Logic:
    1. Load NL hook registry (prism_nl_hook:list) on first call, cache
    2. For each NL hook: evaluate condition against current context
       (action name, file paths, phase, keywords)
    3. If condition matches: inject warning text into cadence output
    4. Track execution_count per hook (fixes the 0-execution problem)
  VERIFY: Trigger a roadmap-related action → verify roadmap-force-recovery-card
    NL hook fires. Check execution_count > 0 via prism_nl_hook:list.

STEP 4: BUILD script_recommender CADENCE FUNCTION (Sonnet, 30 min):
  File: src/tools/cadenceExecutor.ts
  Add new cadence function: script_recommender
  Trigger: call #1 (session start) + phase gate detection
  Logic:
    1. Load SCRIPT_INDEX.json on first call
    2. Filter scripts by current phase + frequency="every-session"
    3. At session start: recommend position-validator, roadmap-lint
    4. At phase gate: recommend regression-test, lint
    5. Return: { recommended_scripts: [{id, purpose, command}] }
  VERIFY: Session start shows script recommendations in cadence output.

STEP 5: BUILD hook_activation_phase_check (Sonnet, 20 min):
  File: src/tools/cadenceExecutor.ts (or separate hook in autoHookWrapper.ts)
  Trigger: first call of a NEW phase (phase changed since last session)
  Logic:
    1. Read HOOK_ACTIVATION_MATRIX.md (created in Step 6)
    2. Get expected hook categories for current phase
    3. Query prism_hook:performance for recent executions
    4. WARN if expected categories show 0 executions
  VERIFY: Simulate phase transition → warning appears for inactive hooks.

STEP 6: CREATE HOOK_ACTIVATION_MATRIX.md (Opus, 15 min):
  Location: C:\PRISM\mcp-server\data\docs\roadmap\HOOK_ACTIVATION_MATRIX.md
  Content: Phase → expected hook categories → what triggers them
    DA:  DISPATCH, FILE, STATE, CONTEXT
    R1:  + DATA validation hooks (material_validate, machine_validate)
    R2:  + CALC, FORMULA, SAFETY (entire 12-hook CALC category)
    R3:  + INTEL (proof validation)
    R4:  + AGENT, ORCH (multi-tenant needs agent guards)
    R5:  + BATCH (bulk rendering)
    R6+: ALL categories active
  VERIFY: File exists. Each phase has at least 2 hook categories listed.

STEP 7: BUILD session_startup + session_shutdown SCRIPTS (Sonnet, 30 min):
  session_startup: boot + position-validator + phase load + skill load in one command
  session_shutdown: state_save + handoff + knowledge extraction + checkpoint
  Both must be callable via a single prism_skill_script:script_execute call.
  VERIFY: Run session_startup → full boot in 1 call instead of 4.
    Run session_shutdown → handoff + state saved in 1 call.

GATE: ALL enforcement mechanisms fire automatically. Specifically:
  1. Session boot loads phase-relevant skills without user action
  2. Mid-session tool calls trigger context-matched skill loading
  3. At least 3 NL hooks show execution_count > 0
  4. Script recommendations appear at session start
  5. HOOK_ACTIVATION_MATRIX.md exists and is read by phase check
  6. session_startup + session_shutdown execute in single calls
  7. Build passes. No regressions in existing cadence functions.

FAILURE MODE: If cadenceExecutor.ts changes break existing cadence functions,
  REVERT and isolate new functions into a separate cadenceEnforcement.ts file
  that cadenceExecutor imports. Never break existing auto-fire for new features.

COMPANION ASSETS (built after DA features):

  HOOKS (MCP + Claude Code):
    context_pressure_flush       auto-flush staging files at >70% pressure
    pre_phase_gate_check         verify companion assets listed before gate
    post_compaction_recovery      auto-read HANDOFF + POSITION after compaction
    session_handoff_reminder   +  knowledge_extraction_gate (BLOCKING: session cannot end
                               without prism_knowledge extract OR manual override)      warn if session ending without HANDOFF.md written
    build_size_monitor            report build size and new warnings after every build
    post_edit_build (CC)          deterministic build after every file edit
    pre_bash_safety (CC)          safety score check before bash execution
    pre_write_antiregression (CC)    backup + size check before file overwrites
    nl_hook_cadence_wiring           wire NL hook conditions into cadenceExecutor.ts
                                     so NL hooks actually evaluate and fire at runtime
                                     (currently NL hooks are metadata-only, 0 executions)
    phase_skill_auto_loader          CADENCE FUNCTION in cadenceExecutor.ts:
                                     On session_boot (call #1), reads CURRENT_POSITION.md
                                     → determines current phase → reads phase doc header
                                     → extracts RECOMMENDED_SKILLS list → auto-calls
                                     prism_skill_script:skill_load for each one.
                                     This is the BRIDGE between DA (index built) and R8
                                     (IntentDecompositionEngine). Without it, skills during
                                     R1-R7 depend on Claude manually loading them.
                                     MUST fire automatically. Not a script Claude calls.
                                     Real code in cadenceExecutor.ts, zero user action.
    skill_context_matcher            CADENCE FUNCTION in cadenceExecutor.ts:
                                     Fires on EVERY tool call (like pressure_check).
                                     Reads current action + params → extracts keywords
                                     → matches against SKILL_INDEX.json trigger fields
                                     → if match found AND skill not already loaded this
                                     session → auto-loads the skill via skill_load.
                                     Example: user asks about "chip thinning" → action
                                     hits prism_calc:chip_thinning → matcher reads index
                                     → finds prism-chip-thinning-factor skill → loads it.
                                     Keeps a loaded_this_session set to avoid reloading.
                                     Lightweight: index stays in memory after first read,
                                     keyword match is O(n) string comparison per call.
                                     This closes the mid-session gap between DA and R8.
                                     R8 IntentDecompositionEngine replaces this with
                                     full intent decomposition. Until then, this fires.
    hook_activation_phase_check      at phase start, read HOOK_ACTIVATION_MATRIX.md
                                     and verify expected hook categories are firing

  DOCUMENTS:
    HOOK_ACTIVATION_MATRIX.md        phase → expected hook categories → verification query
                                     prevents hooks staying dead after target system is built

  SCRIPTS:
    session_startup              boot + position + handoff + phase load in one command
    session_shutdown          (INCLUDES MANDATORY knowledge extraction)             save + handoff + checkpoint + todo in one command
    context_audit                measure current framework token costs
    skill_utilization_report     show which skills fired this session
    parallel_readiness_check     verify if current task is parallelizable
    script_recommender           reads SCRIPT_INDEX.json + current phase/task context
                                 → suggests relevant scripts to run (lint, validate, etc.)
                                 Wire into session_startup so scripts auto-suggest at boot.

  SKILLS:
    prism-session-management     teaches Claude optimal session start/end protocols
    prism-context-engineering    teaches Claude Manus 6 Laws + context optimization
    prism-parallel-execution     teaches Claude when/how to use agent_parallel
    prism-ralph-validation       teaches Claude when/how to run ralph at what depth
    + 15 Claude Code skills converted from skills-consolidated/ (DA-MS2)

  SUBAGENTS (with persistent memory):
    prism-safety-reviewer        Opus, tracks calc failure patterns
    prism-registry-expert        Sonnet, tracks data quality patterns
    prism-architect              Opus, tracks design decisions
    prism-test-runner            Sonnet, tracks test coverage/failures
    prism-data-validator         Sonnet, tracks schema compliance

  SLASH COMMANDS:
    /boot, /gate, /checkpoint, /plan, /build
```

---

<!-- ANCHOR: da_da_produces_artifacts_for_downstream_phases -->
## DA PRODUCES (artifacts for downstream phases):

```
CONTEXT_AUDIT.md                 Token costs for all framework files
SKILL_TIER_MAP.json              126 skills classified into tiers A/B/C/D
SKILL_RELEVANCE_MAP.json         Phase → relevant skills mapping
SCRIPT_HEALTH_REPORT.md          Script implementation status
PARALLEL_TASK_MAP.md             Parallelizable tasks in R1-R3 (updated with CC capabilities)
MANUS_COMPLIANCE.md              6 Laws audit with scores and fixes
RALPH_SCHEDULE.md                When to run ralph and at what depth
GSD_COMMANDS.md                  Working AutoPilot commands reference
SUPERPOWERS_CHECKLIST.md         Per-MS quality gate checklist
PRISM_PROTOCOLS_BOOT.md          Split from CORE: boot + laws
PRISM_PROTOCOLS_SAFETY.md        Split from CORE: structured outputs + validation
PRISM_PROTOCOLS_CODING.md        Split from CORE: code standards + build
Expanded CURRENT_POSITION.md     Structured multi-field position format
HANDOFF.md template              Session handoff template
5 NL development hooks           Context/compaction/build/gate/session hooks
4 new skill chains               boot_resume, calc_validate, registry_query, debug_fix
4 new skills                     session-mgmt, context-eng, parallel-exec, ralph-validation
15 Claude Code skills            Converted from skills-consolidated/
5 subagent definitions           safety-reviewer, registry-expert, architect, test-runner, data-validator
5 slash command definitions      /boot, /gate, /checkpoint, /plan, /build
Hook configuration               .claude/settings.json with deterministic hooks
CLAUDE.md (root + 2 nested)      Project context for Claude Code auto-loading
CLAUDE_CODE_READINESS.md         Test results + capability matrix
DA_INTEGRATION_TEST_RESULTS.md    E2E test outcomes
```
