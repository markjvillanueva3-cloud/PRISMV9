# PHASE R12: DEVELOPMENT INFRASTRUCTURE + QUALITY HARDENING
### RECOMMENDED_SKILLS: prism-anti-regression-process, prism-hook-enforcement, prism-session-lifecycle, prism-cadence-tuning
### HOOKS_EXPECTED: ALL
### DATA_PATHS: C:\PRISM\mcp-server\src, C:\PRISM\scripts, C:\PRISM\mcp-server\data\docs

<!-- ANCHOR: r12_clean_house_activate_dev_tooling_harden_test_infrastructure -->
## Clean House, Activate Dev Tooling, Harden Test Infrastructure
<!-- ANCHOR: r12_v20_0_prerequisites_r11_complete_all_systems_live -->
## v20.0 | Prerequisites: R11 complete (all systems live)
# DEPENDS ON: R11 complete (32 dispatchers, 382 actions, 73 engines, 9 registries)
# PRIORITY: DEV TOOLS FIRST — this phase accelerates everything after it

---

<!-- ANCHOR: r12_quick_reference_standalone_after_compaction_no_other_doc_needed -->
## QUICK REFERENCE (standalone after compaction — no other doc needed)
```
BUILD:      npm run build (NEVER standalone tsc — OOM at current scale)
SAFETY:     S(x) >= 0.70 is HARD BLOCK
POSITION:   Update CURRENT_POSITION.md every 3 calls
FLUSH:      Write results to disk after each logical unit of work
ERROR:      Fix ONE build error, rebuild, repeat. >5 from one edit → git revert
IDEMPOTENT: Read-only = safe to re-run. Write = check if already done first.
STUCK:      3 same-approach fails → try different approach. 6 total → skip if non-blocking.
TRANSITION: Update CURRENT_POSITION first, ROADMAP_TRACKER second.
RECOVERY:   Read PRISM_RECOVERY_CARD.md for full recovery steps.
ENV:        R12 = CC 70% + MCP 30%. Platform Engineer → Verifier → Integration Engineer.
```

---

<!-- ANCHOR: r12_knowledge_contributions -->
## KNOWLEDGE CONTRIBUTIONS (what this phase feeds into the hierarchical index)
```
BRANCH 1 (Execution Chain): Decomposed engine chains replace monolith chains.
  IntelligenceEngine splits → 5 sub-engine chains. ProductEngine splits → 5 sub-engine chains.
  Updated EXECUTION_CHAIN.json with new routing.
BRANCH 2 (Data Taxonomy): Integration pipeline adds DuckDB query path alongside JSON registries.
BRANCH 4 (Session Knowledge): CC hook configurations, slash command definitions,
  agent definition files, skill trigger mappings, build budget decisions.
AT PHASE GATE: EXECUTION_CHAIN.json updated. SKILL_INDEX.json fully populated.
  SCRIPT_INDEX.json accurate. Build budget tracking active.
```

---

<!-- ANCHOR: r12_execution_model -->
### EXECUTION MODEL
```
Environment: Claude Code 70% / Claude.ai MCP 30%
Model: Haiku (scanning, orphan audit) → Sonnet (implementation, CC tasks) → Opus (gate, safety)

CC TASKS: MS0 (file ops), MS1 (bulk skill processing), MS2 (CC-native hooks/commands),
  MS3 (multi-file refactoring), MS4 (test scripts), MS6 (Python pipeline)
MCP TASKS: MS5 (action wiring + validation), MS7 (gate assessment)

PARALLEL EXECUTION:
  MS5 and MS6 are independent — can run in parallel
  MS0 → MS1 → MS2 → MS3 → MS4 are sequential (each builds on prior)
```

---

<!-- ANCHOR: r12_phase_objective -->
## PHASE OBJECTIVE

P0→R11 built PRISM's complete 32-dispatcher, 382-action system. But 13 Claude Code tasks
were deferred (CC_DEFERRED), 28 scripts are orphaned, SKILL_INDEX triggers are empty (blocking
skill_context_matcher), 3 engines exceed 50KB (maintenance risk), build size is unchecked at
5.6MB with no budget, test coverage has no unified report, and the integration pipeline (5
Python scripts) has never been run.

R12 cleans house. Every built-but-unwired tool gets activated. Every quality gap gets fixed.
The codebase becomes ready for sustained development, external contributors, or production deployment.

**Dev Tools First Principle**: R12 is prioritized above R13/R14 because every improvement here
accelerates every session in every subsequent phase. A 10-minute/session savings across 30+
remaining sessions = 5+ hours recovered.

**Key Metrics:**
- Orphan scripts: 28 → 0 (audited + dispositioned)
- Skill triggers: ~10% populated → 100%
- CC hooks: 0 → 5 active
- Engines >50KB: 6 → 0 (stretch: all <40KB)
- Test infra: fragmented → unified test:all with coverage
- Build budget: none → tracked with WARN/BLOCK thresholds

---

<!-- ANCHOR: r12_dependency_map -->
## DEPENDENCY MAP
```
[P0 DA R1 R2 R3 R4 R5-R11] ——(ALL COMPLETE)——→ [R12]
                                                    │
                                                    ├──→ [R13] (needs clean codebase)
                                                    └──→ [R14] (needs R13 + clean codebase)
```

R12 is a prerequisite for R13 and R14. R13 and R14 can overlap after R13-MS4.

---

<!-- ANCHOR: r12_context_bridge -->
## CONTEXT BRIDGE

WHAT CAME BEFORE: P0→R11 built the complete PRISM system: 32 dispatchers, 382 actions,
73 engines, 9 registries, 150/150 benchmarks, 116/116 enterprise tests, REST API with 9
endpoints, intelligence actions, toolpath strategies, and production packaging. Build: 5.6MB.

WHAT THIS PHASE DOES: Clean house. Activate every built-but-unwired tool. Fix every known
quality gap. Decompose oversized engines. Create unified test infrastructure. Wire Claude Code
hooks, slash commands, and agent definitions. Activate the integration pipeline.

WHAT COMES AFTER: R13 (Monolith Intelligence Extraction) builds on a clean, well-tested
foundation. R14 (Product Features) builds on R13's extracted intelligence.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: CURRENT_POSITION.md, ROADMAP_TRACKER.md, DA_WIRING_AUDIT.md,
    UTILIZATION_AUDIT_v15.md, UNREALIZED_FEATURES_AUDIT.md, BRAINSTORM_R12_R14.md
  PRODUCES: PHASE_FINDINGS.md (R12 section), unified test report, coverage report,
    updated SCRIPT_INDEX.json, backfilled R5-R11 phase docs, decomposed engines,
    activated SKILL_INDEX triggers, .claude/ configuration directory, CI pipeline

TEST LEVELS: L1-L4 required (unit + contract + integration + orchestration)

---

<!-- ANCHOR: r12_fault_injection_test -->
## FAULT INJECTION TEST (XA-13)

R12 FAULT TEST: Delete 3 random Tier-A skill SKILL.md files → verify skill_context_matcher degrades gracefully.
  WHEN: After MS1 (skill trigger activation) is complete.
  HOW: Rename 3 Tier-A skill SKILL.md files to .bak. Run session_enhanced_startup.py.
  EXPECTED: Startup reports "3 skills unloadable" as WARNING, not crash. System continues operating.
  PASS: Graceful degradation + accurate warning count + readiness score reflects missing skills.
  FAIL: Crash, silent failure, or wrong count.
  EFFORT: ~4 calls.

---

<!-- ANCHOR: r12_ralph_validator_map -->
## R12 Ralph Validator Map
```
MS0-*     -> data_integrity    (script audit, doc backfill, build baseline)
MS1-*     -> data_integrity    (skill trigger population)
MS2-*     -> infrastructure    (CC hooks, commands, agents)
MS3-*     -> code_quality      (engine decomposition, anti-regression)
MS4-*     -> test_coverage     (unified test infra, coverage)
MS5-*     -> infrastructure    (hook telemetry, routing trace)
MS6-*     -> integration       (Excel/DuckDB pipeline)
MS7-*     -> [full panel]      (phase gate)
```

---

<!-- ANCHOR: r12_task_dag -->
## R12 Task DAG
```
[MS0] ──→ [MS1] ──→ [MS2] ──→ [MS3] ──→ [MS4] ──→ [MS7: GATE]
                                            │              ↑
                                            │         [MS5] (parallel)
                                            │              ↑
                                            └─────→ [MS6] (parallel with MS5)

MS0→MS1→MS2→MS3→MS4: Sequential (each builds on prior)
MS5 + MS6: Independent of each other, both need MS4 entry
MS7: Gate after all complete
```

---

<!-- ANCHOR: r12_ms0_housekeeping_historical_backfill -->
## MS0: HOUSEKEEPING + HISTORICAL BACKFILL
<!-- ANCHOR: r12_ms0_role_verifier_platform_engineer -->
### Role: Verifier → Platform Engineer | Model: Haiku (scanning) → Sonnet (writing) | Effort: M (~19 calls) | Sessions: 1

### Objective
Audit and disposition all orphan scripts. Backfill R5-R11 phase docs with actual deliverables.
Establish build size budget. Add phantom skill detector to startup. Configure audit log rotation.

### Source: IMP-DA-2, IMP-R5-1, IMP-XC-2, IMP-P0-1, IMP-R4-2

### MS0 Task DAG
```
[T1: Script Audit] ──→ [T2: Phase Backfill] ──→ [T5: Verify]
                            ↑                         ↑
[T3: Build Budget] ────────→─────────────────────────→
[T4: Phantom Detector] ──→───────────────────────────→
```

### Steps

#### MS0-T1: Orphan Script Audit + Disposition (~4 calls)
```
TASK: MS0-T1
  DEPENDS_ON: []
  ARCHETYPE: verifier
  MODEL: haiku (scanning) → sonnet (disposition)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: scripts/, SCRIPT_INDEX.json
  GATE: YOLO
  SUCCESS: Every script classified as ACTIVE/ARCHIVE/DELETE, 0 orphans without disposition
  ESCALATION: none
  ESTIMATED_CALLS: 4
```
1. Read SCRIPT_INDEX.json (13 entries). Scan all scripts/ directories for .ps1/.py/.js files.
2. Cross-reference: which scripts are called by cadence functions, hooks, startup/shutdown, package.json?
3. Classify each script:
   - **ACTIVE**: Referenced in code, tests, or CI → keep in place
   - **ARCHIVE**: Was useful, no longer referenced → move to scripts/_archived/
   - **DELETE**: Duplicate, broken, or superseded → remove entirely
4. Update SCRIPT_INDEX.json to reflect accurate inventory.
5. Record dispositions in PHASE_FINDINGS.md (R12 section).

**Exit:** 0 orphan scripts without documented disposition. SCRIPT_INDEX.json matches reality.

#### MS0-T2: R5-R11 Phase Doc Backfill (~4 calls)
```
TASK: MS0-T2
  DEPENDS_ON: [MS0-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: data/docs/roadmap/PHASE_R{5-11}_*.md
  GATE: YOLO
  SUCCESS: Each phase file has COMPLETED section with MS list, dates, key commits
  ESCALATION: none
  ESTIMATED_CALLS: 4
```
1. For each PHASE_R{5-11} file that's still a stub or lacks completion data:
   - Extract actual deliverables from ROADMAP_TRACKER.md entries
   - Extract engine names, action counts, test counts from git log and file inventory
2. Add "## COMPLETED" section at top of each file with:
   - Date range, session count
   - Milestone list with status (all ✅ COMPLETE)
   - Key deliverables (engines created, actions wired, tests written)
   - Key commits (SHA + description)
3. Purpose: Historical completeness. Future sessions can read what was actually done vs planned.

**Exit:** All 7 phase docs have accurate COMPLETED sections.

#### MS0-T3: Build Size Budget (~3 calls)
```
TASK: MS0-T3
  DEPENDS_ON: []
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (independent of T1/T2)
  SCOPE: package.json, scripts/
  GATE: YOLO
  SUCCESS: Build size tracked, budget enforced, top 10 modules identified
  ESCALATION: none
  ESTIMATED_CALLS: 3
```
1. Record current build size (5.6MB) in PHASE_FINDINGS.md.
2. Run `npx esbuild --bundle --analyze src/index.ts` to get per-module sizes.
3. Identify top 10 largest modules in bundle.
4. Set budget thresholds:
   - **WARN**: Build > 6MB → yellow in CI output
   - **BLOCK**: Build > 8MB → CI fails
5. Add post-build size check to `npm run build` or create `scripts/check-build-size.js`.
6. Record baseline in `data/docs/roadmap/BUILD_SIZE_BASELINE.json`:
   ```json
   { "date": "2026-02-23", "size_mb": 5.6, "warn_mb": 6, "block_mb": 8,
     "top_modules": [...], "engine_count": 73 }
   ```

**Exit:** Build size tracked, thresholds enforced, baseline documented.

#### MS0-T4: Phantom Skill Detector (~2 calls)
```
TASK: MS0-T4
  DEPENDS_ON: []
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true
  SCOPE: scripts/session_enhanced_startup.py
  GATE: YOLO
  SUCCESS: Startup detects and warns about phantom skills
  ESCALATION: none
  ESTIMATED_CALLS: 2
```
1. Add to session_enhanced_startup.py:
   - Read SKILL_INDEX.json entries
   - For each entry, verify SKILL.md exists at expected path AND has >10 lines of content
   - Count real vs phantom skills
   - Report phantoms as WARNING in readiness score
2. Example output: `⚠️ PHANTOM SKILLS: 4 indexed skills have empty/missing SKILL.md`

**Exit:** Phantom skills detected and reported at startup. Readiness score reflects reality.

#### MS0-T5: Audit Log Rotation + Verify (~2 calls)
```
TASK: MS0-T5
  DEPENDS_ON: [MS0-T1, MS0-T2, MS0-T3, MS0-T4]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: src/engines/*, state/logs/
  GATE: YOLO
  SUCCESS: All MS0 deliverables verified, log rotation configured
  ESCALATION: none
  ESTIMATED_CALLS: 2
```
1. Add daily rotation config to winston logger: 30-day retention, max 10MB per file.
   Move rotated logs to `state/logs/archive/`.
2. Run session_enhanced_startup.py → confirm phantom detector works.
3. Run `npm run build` → confirm size check runs.
4. Verify SCRIPT_INDEX.json accuracy, phase doc backfills present.
5. `git commit -m "R12-MS0: Housekeeping + historical backfill"`

**Rollback:** git revert per-step commits

#### MS0-T6: Doc Sync — Reconcile Tracking Files (~2 calls)
<!-- ANCHOR: r12_ms0_t6_doc_sync -->
**Source:** AUDIT_REPORT.md (2026-02-22) — Registry count discrepancy, CURRENT_POSITION.md inaccuracies
**Role:** Verifier | **Model:** Haiku
1. Reconcile CURRENT_POSITION.md with audit results:
   - Fix engines: 72/73 wired (SkillAutoLoader orphan), not "73/73 wired (100%)"
   - Fix registries: 10/10 loading (not 9/9)
   - Add R12/R13/R14 as PLANNED with call estimates
2. Cross-reference AUDIT_REPORT.md counts against ROADMAP_TRACKER.md entries.
   Resolve any discrepancies in dispatcher/engine/hook counts.

#### MS0-T7: State Cleanup Policy (~2 calls)
<!-- ANCHOR: r12_ms0_t7_state_cleanup_policy -->
**Source:** AUDIT_REPORT.md — 447+ unmanaged state files in C:\PRISM\state\
**Role:** Platform Engineer | **Model:** Sonnet
1. Define retention policy for state/ directory:
   - `state/logs/` — 30-day rotation (already configured in T5)
   - `state/metrics/` — keep latest 90 days, archive older
   - `state/checkpoints/` — keep latest 10 per phase, archive rest
   - `state/*.md` — permanent (audit reports, tracking docs)
2. Create `scripts/state-cleanup.sh` with policy enforcement.
   Run dry-run to verify safe before actual cleanup.

**Exit:** 0 orphan scripts, R5-R11 backfilled, build budget active, phantoms detected, logs rotated, docs synced, state policy defined.

---

<!-- ANCHOR: r12_ms1_skill_trigger_activation -->
## MS1: SKILL TRIGGER ACTIVATION + CONTEXT MATCHER UNBLOCK
<!-- ANCHOR: r12_ms1_role_context_engineer -->
### Role: Context Engineer | Model: Haiku (extraction) → Sonnet (validation) | Effort: L (~20 calls) | Sessions: 1-2

### Objective
Populate trigger arrays for all 164+ indexed skills. Unblock skill_context_matcher cadence
function that currently fires but can't match queries to skills due to empty triggers.

### Source: IMP-DA-3 (SKILL_INDEX triggers mostly empty)

### MS1 Task DAG
```
[T1: Extract keywords] ──→ [T2: Parallel population] ──→ [T3: Validate] ──→ [T4: Rebuild] ──→ [T5: E2E test]
                            (agent team: 3 teammates)
```

#### MS1-T1: Extract Keywords from All SKILL.md Files (~5 calls)
```
TASK: MS1-T1
  DEPENDS_ON: [MS0 COMPLETE]
  ARCHETYPE: implementer
  MODEL: haiku (bulk extraction)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: C:\PRISM\skills-consolidated\*/SKILL.md
  GATE: YOLO
  SUCCESS: trigger_proposals.json with 5-10 keywords per skill
  ESCALATION: none
  ESTIMATED_CALLS: 5
```
1. For each of 164+ skill directories with SKILL.md:
   - Read SKILL.md content (first 50 lines for efficiency)
   - Extract 5-10 trigger keywords: nouns, technical terms, tool names, operation types
   - Example: `prism-kienzle-model` → `["kienzle", "cutting force", "kc1.1", "specific cutting force", "force calculation"]`
   - Example: `prism-hook-enforcement` → `["hook", "enforcement", "blocking gate", "pre-edit", "safety gate"]`
   - Example: `prism-fanuc-programming` → `["fanuc", "g-code", "M-code", "CNC program", "macro"]`
2. Output: `data/docs/trigger_proposals.json` — { skill_name: [keywords] }
3. Ensure no skill has <3 keywords (minimum for matching).

#### MS1-T2: Agent Team — Parallel Skill Trigger Population (~9 calls)
```
TASK: MS1-T2
  DEPENDS_ON: [MS1-T1]
  ARCHETYPE: implementer (x3 agent teammates)
  MODEL: sonnet (each teammate)
  EFFORT: STANDARD
  PARALLEL: true (agent team)
  SCOPE: SKILL_INDEX.json (each teammate owns one domain slice)
  GATE: YOLO (plan approval by lead)
  SUCCESS: All 164+ skills have populated trigger arrays in SKILL_INDEX.json
  ESCALATION: none
  ESTIMATED_CALLS: 3 per teammate = 9
```
Agent Team Configuration:
```
TEAM: r12-skill-triggers
LEAD: sonnet (orchestrates)
TEAMMATES:
  - mfg-skills    | sonnet | scope: prism-material-*, prism-cutting-*, prism-tool-*, prism-machine-*
  - dev-skills    | sonnet | scope: prism-anti-regression-*, prism-session-*, prism-hook-*, prism-error-*, prism-code-*
  - ref-skills    | sonnet | scope: prism-gcode-*, prism-controller-*, prism-post-*, prism-*-programming, all others
REQUIRE_PLAN_APPROVAL: true
```
Each teammate:
1. Read trigger_proposals.json for their domain
2. For each skill in their domain: update SKILL_INDEX.json `triggers` array
3. Verify no duplicate triggers across skills within domain (overlap warnings OK, exact duplicates NOT OK)
4. Submit completed section to team lead

#### MS1-T3: Validate Trigger Quality (~3 calls)
```
TASK: MS1-T3
  DEPENDS_ON: [MS1-T2]
  ARCHETYPE: verifier
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: SKILL_INDEX.json
  GATE: GATED (must achieve 80%+ match rate)
  SUCCESS: 80%+ match rate on 20 test queries
  ESCALATION: If <60% → re-extract keywords with different strategy
  ESTIMATED_CALLS: 3
```
1. Run skill_context_matcher against 20 test queries covering all domains:
   - Manufacturing: "kienzle force calculation", "tool wear prediction", "surface finish estimation"
   - Safety: "spindle overload check", "collision detection", "thermal deformation"
   - Controller: "fanuc alarm 401", "haas parameter setting", "siemens cycle programming"
   - Development: "hook not firing", "session recovery", "anti-regression audit"
   - General: "calculate speed and feed", "recommend tooling", "create job plan"
2. Score: For each query, does skill_context_matcher return at least one correct skill?
3. Target: 80%+ (16/20 minimum) correct matches.
4. Log failures: which queries didn't match and why.

#### MS1-T4: Rebuild Indexes (~1 call)
```
TASK: MS1-T4
  DEPENDS_ON: [MS1-T3]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: SKILL_INDEX.json, EXECUTION_CHAIN.json
  GATE: YOLO
  SUCCESS: Indexes rebuilt with accurate counts
  ESTIMATED_CALLS: 1
```
1. Run update-skill-index.ps1 to refresh all counts and metadata.
2. Update EXECUTION_CHAIN.json with current action count (may have grown since last update).
3. Verify no duplicate skill IDs, no orphaned entries.

#### MS1-T5: End-to-End Skill Loading Test (~2 calls)
```
TASK: MS1-T5
  DEPENDS_ON: [MS1-T4]
  ARCHETYPE: verifier
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: MCP server
  GATE: GATED
  SUCCESS: Fresh MCP session loads correct skills for test queries
  ESTIMATED_CALLS: 2
```
1. Restart MCP server (Claude Desktop restart or fresh session).
2. Query "calculate cutting force for 4140 steel" → verify prism-kienzle-model loaded.
3. Query "fanuc alarm 401" → verify prism-fanuc-programming loaded.
4. Query "session crashed, how to recover" → verify prism-session-recovery loaded.
5. `git commit -m "R12-MS1: Skill trigger activation — 164+ skills populated"`

**Rollback:** Restore SKILL_INDEX.json from git
**Exit:** 164+ skills with populated triggers, 80%+ context match rate, skill_context_matcher functional.

---

<!-- ANCHOR: r12_ms2_cc_deferred_backlog -->
## MS2: CC_DEFERRED BACKLOG EXECUTION
<!-- ANCHOR: r12_ms2_role_platform_engineer -->
### Role: Platform Engineer | Model: Sonnet (CC implementer) | Effort: L (~25 calls) | Sessions: 2

### Objective
Execute all 13 Claude Code tasks deferred during DA phase. Wire .claude/ hooks, slash commands,
and agent definition files. Re-assess DA-MS8 gate criteria with CC now available.

### Source: IMP-DA-1 (CC_DEFERRED backlog — DA-MS4, DA-MS2 Steps 2-7, DA-MS8 criteria)

### MS2 Task DAG
```
[T1: Hook Config] ──→ [T2: Slash Commands] ──→ [T3: Agent Definitions] ──→ [T4: Gate Re-assess]
```

#### MS2-T1: Deterministic Hook Configuration (DA-MS4) (~8 calls)
```
TASK: MS2-T1
  DEPENDS_ON: [MS1 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet (CC exclusive)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: .claude/settings.json, scripts/hooks/
  GATE: GATED (hooks must fire correctly)
  SUCCESS: 5 hooks active, pre-edit safety gate blocks CRITICAL files
  ESCALATION: If hooks don't fire → check Claude Code version compatibility
  ESTIMATED_CALLS: 8
```
1. Create `.claude/` directory structure:
   ```
   .claude/
   ├── settings.json          (hook definitions)
   ├── commands/              (slash commands — T2)
   └── agents/                (agent definitions — T3)
   ```
2. Create `scripts/hooks/pre-edit-safety-gate.ps1`:
   - Input: $FILE_PATH from hook event
   - Check against CRITICAL file patterns: `src/engines/kienzle*`, `src/engines/taylor*`,
     `src/engines/safety*`, `src/engines/cutting*`, `src/engines/thermal*`,
     `src/tools/dispatchers/safetyDispatcher*`, `src/tools/dispatchers/calcDispatcher*`
   - If CRITICAL: exit 2 (BLOCK) with message "⚠️ CRITICAL FILE — safety review required"
   - If STANDARD/INFORMATIONAL: exit 0 (ALLOW)
3. Create `scripts/hooks/post-build-verify.ps1`:
   - After any npm run build: run scripts/verify-build.ps1 automatically
   - Report pass/fail to stdout
4. Create `scripts/hooks/anti-regression-gate.ps1`:
   - Before any file replacement: compare old vs new line count
   - Block if >30% reduction with message "⚠️ ANTI-REGRESSION: >30% line reduction detected"
5. Create `scripts/hooks/teammate-quality-gate.ps1`:
   - On agent team task completion: run quick vitest check
6. Write `.claude/settings.json` with all hook bindings:
   ```json
   {
     "PreToolUse": [
       { "matcher": "Write|Edit", "hooks": [
         { "type": "command", "command": "powershell -File scripts/hooks/pre-edit-safety-gate.ps1 \"$FILE_PATH\"" }
       ]},
       { "matcher": "Write", "hooks": [
         { "type": "command", "command": "powershell -File scripts/hooks/anti-regression-gate.ps1 \"$FILE_PATH\"" }
       ]}
     ],
     "PostToolUse": [
       { "matcher": "Bash", "hooks": [
         { "type": "command", "command": "powershell -File scripts/hooks/post-build-verify.ps1" }
       ]}
     ]
   }
   ```
7. Test: Edit a CRITICAL file (e.g., src/engines/ManufacturingCalculations.ts) → verify hook blocks.
8. Test: Run build → verify post-build verify fires.

#### MS2-T2: Slash Command Creation (DA-MS2 Steps 2-3) (~6 calls)
```
TASK: MS2-T2
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: implementer
  MODEL: sonnet (CC exclusive)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: .claude/commands/
  GATE: YOLO
  SUCCESS: 5 slash commands registered and functional
  ESTIMATED_CALLS: 6
```
1. Create `.claude/commands/prism-safety-check.md`:
   ```markdown
   Invoke the safety-physics subagent to review current changes.
   Run: git diff --name-only to identify modified files.
   Classify each as CRITICAL/STANDARD/INFORMATIONAL.
   For CRITICAL files: run full physics plausibility check.
   Report S(x) score and PASS/BLOCK verdict.
   ```
2. Create `.claude/commands/prism-build.md`:
   ```markdown
   Run the full PRISM build + verification pipeline:
   1. npm run build (esbuild)
   2. scripts/verify-build.ps1 (7 symbols)
   3. scripts/check-build-size.js (budget check)
   Report: build size, symbol check, budget status.
   ```
3. Create `.claude/commands/prism-test.md`:
   ```markdown
   Run the full PRISM test suite:
   1. npm run test (vitest)
   2. npm run test:benchmarks (150 physics benchmarks)
   3. npm run test:enterprise (R4 enterprise tests)
   Report: pass/fail per suite, total count, any failures.
   ```
4. Create `.claude/commands/prism-audit.md`:
   ```markdown
   Run anti-regression + wiring audit:
   1. Count functions/exports in modified files (NEW ≥ OLD)
   2. Run scripts/verify-build.ps1
   3. Check for orphaned dispatchers, dead code, unused imports
   4. Report: orphan count, regression risks, build status.
   ```
5. Create `.claude/commands/prism-status.md`:
   ```markdown
   Read PRISM system status:
   1. Read CURRENT_POSITION.md
   2. Run prism_dev:health_check via MCP
   3. Report: phase, build status, test status, next steps.
   ```
6. Test each command: `/prism-build`, `/prism-test`, `/prism-status` → verify execution.

#### MS2-T3: Agent Definition Files (~5 calls)
```
TASK: MS2-T3
  DEPENDS_ON: [MS2-T1]
  ARCHETYPE: implementer
  MODEL: sonnet (CC exclusive)
  EFFORT: STANDARD
  PARALLEL: true (can run parallel with T2)
  SCOPE: .claude/agents/
  GATE: YOLO
  SUCCESS: 3 agent definitions created and invocable
  ESTIMATED_CALLS: 5
```
1. Create `.claude/agents/safety-physics.md` — from PRISM_ROADMAP_v17.0.md §2.3.1:
   - Model: opus, Color: red, Tools: Read/Grep/Glob/Bash
   - Validates physics, Kienzle coefficients, Taylor constants, safety scores
   - Hard block: S(x) < 0.70
   - 5-step validation workflow: identify changes → physics check → safety calc → score → report
2. Create `.claude/agents/implementer.md` — from v17.0 §2.3.2:
   - Model: sonnet, Color: blue, Tools: Read/Write/Edit/Bash/Grep/Glob
   - All implementation: engines, dispatchers, wiring, data processing
   - Rules: READ→Edit→VERIFY, >50 lines → state plan first, CRITICAL files → safety review
3. Create `.claude/agents/verifier.md` — from v17.0 §2.3.3:
   - Model: haiku, Color: green, Tools: Read/Grep/Glob/Bash
   - Tests, audits, regression checks, documentation
   - Reports only — never fixes things directly
4. Verify: each agent can be invoked from Claude Code.
5. Test: Invoke safety-physics on a dummy change → verify it runs validation workflow.

#### MS2-T4: DA-MS8 Gate Re-Assessment (~6 calls)
```
TASK: MS2-T4
  DEPENDS_ON: [MS2-T1, MS2-T2, MS2-T3]
  ARCHETYPE: verifier
  MODEL: opus
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: DA_MS8_GATE_RESULTS.md
  GATE: GATED
  SUCCESS: All 4 previously CC_DEFERRED criteria re-evaluated
  ESTIMATED_CALLS: 6
```
1. Re-read DA_MS8_GATE_RESULTS.md — identify the 4 CC_DEFERRED criteria.
2. For each criterion, test with Claude Code now available:
   - Criterion X: [execute test] → PASS/FAIL
3. Update DA_MS8_GATE_RESULTS.md with new results.
4. If all pass: DA phase retroactively FULLY COMPLETE.
5. If any fail: document reason and defer to specific future milestone.
6. `git commit -m "R12-MS2: CC_DEFERRED backlog — hooks, commands, agents"`

**Rollback:** Remove .claude/ directory entirely
**Exit:** 5 hooks active, 5 slash commands, 3 agent definitions, DA-MS8 gate re-assessed.

---

<!-- ANCHOR: r12_ms3_engine_decomposition -->
## MS3: ENGINE DECOMPOSITION (Large File Split)
<!-- ANCHOR: r12_ms3_role_systems_architect -->
### Role: Systems Architect | Model: Sonnet (CC refactoring) → Opus (safety review) | Effort: L (~30 calls) | Sessions: 2

### Objective
Split all engines exceeding 50KB into focused sub-engines. Maintain backward compatibility
through barrel re-exports. Zero test regressions.

### Source: IMP-R3-1 (IntelligenceEngine 85.4KB), IMP-R10-1 (ProductEngine 90.3KB),
  plus CollisionEngine (51.8KB), DecisionTreeEngine (58.6KB), CampaignEngine (50.8KB),
  GCodeTemplateEngine (49.6KB)

### Target Engines (sorted by size, largest first)
| Engine | Current Size | Split Into | Target Size Each |
|--------|-------------|------------|-----------------|
| ProductEngine.ts | 90.3KB | PostProcessorProduct, QuotingProduct, SetupSheetProduct, ToolCatalogProduct, ProductOrchestrator | 15-20KB |
| IntelligenceEngine.ts | 85.4KB | JobPlanEngine, RecommendationEngine, WhatIfEngine, DiagnosticEngine, OptimizationEngine | 15-20KB |
| DecisionTreeEngine.ts | 58.6KB | Assess: if tightly coupled → ACCEPTED_LARGE, else split by tree domain | <40KB |
| CollisionEngine.ts | 51.8KB | Assess: if tightly coupled → ACCEPTED_LARGE, else split by geometry type | <40KB |
| CampaignEngine.ts | 50.8KB | Assess: if tightly coupled → ACCEPTED_LARGE, else split by campaign type | <40KB |
| GCodeTemplateEngine.ts | 49.6KB | Assess: if tightly coupled → ACCEPTED_LARGE, else split by controller dialect | <40KB |

### MS3 Task DAG
```
[T1: ProductEngine split] ──→ [T3: Assess remaining 4] ──→ [T4: Regression]
[T2: IntelligenceEngine split] ↗
```

#### MS3-T1: Split ProductEngine.ts (90.3KB) (~10 calls)
```
TASK: MS3-T1
  DEPENDS_ON: [MS2 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet (CC)
  EFFORT: STANDARD
  PARALLEL: true (independent of T2)
  SCOPE: src/engines/ProductEngine.ts, src/engines/product/
  GATE: GATED (anti-regression required)
  SUCCESS: ProductEngine split into 5 sub-engines, all original actions still route, tests pass
  ESCALATION: If tests fail after split → check barrel export completeness
  ESTIMATED_CALLS: 10
```
1. Create `src/engines/product/` directory.
2. Identify logical boundaries in ProductEngine.ts by action groupings.
3. Extract into focused sub-engines:
   - `product/PostProcessorProduct.ts` — G-code generation, controller dialects
   - `product/QuotingProduct.ts` — cost estimation, batch economics
   - `product/SetupSheetProduct.ts` — setup sheet formatting, print layouts
   - `product/ToolCatalogProduct.ts` — tool database queries, catalog search
   - `product/ProductOrchestrator.ts` — thin router that delegates to sub-engines
4. Update `ProductEngine.ts` → re-export from sub-engines for backward compatibility:
   ```typescript
   export { PostProcessorProduct } from './product/PostProcessorProduct';
   export { QuotingProduct } from './product/QuotingProduct';
   // ...
   ```
5. Update `src/engines/index.ts` barrel export if needed.
6. Run anti-regression: count exports before and after → NEW ≥ OLD.
7. Build + test: `npm run build && npm run test`

#### MS3-T2: Split IntelligenceEngine.ts (85.4KB) (~10 calls)
```
TASK: MS3-T2
  DEPENDS_ON: [MS2 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet (CC)
  EFFORT: STANDARD
  PARALLEL: true (independent of T1)
  SCOPE: src/engines/IntelligenceEngine.ts, src/engines/intelligence/
  GATE: GATED (anti-regression required)
  SUCCESS: IntelligenceEngine split into 5 sub-engines, 15/15 intelligence tests pass
  ESTIMATED_CALLS: 10
```
1. Create `src/engines/intelligence/` directory.
2. Split by action domain:
   - `intelligence/JobPlanEngine.ts` — job_plan, setup_sheet, cycle_time_estimate
   - `intelligence/RecommendationEngine.ts` — material_recommend, tool_recommend, machine_recommend
   - `intelligence/WhatIfEngine.ts` — what_if, parameter_optimize
   - `intelligence/DiagnosticEngine.ts` — failure_diagnose, quality_predict
   - `intelligence/IntelligenceOrchestrator.ts` — thin router
3. Update IntelligenceEngine.ts → re-export from sub-engines.
4. Anti-regression: 11 actions before → 11 actions after.
5. Run: `npm run test` → verify 15/15 intelligence tests pass.
6. Run: `npm run test:benchmarks` → verify 150/150 benchmarks pass.

#### MS3-T3: Assess Remaining 4 Engines (~5 calls)
```
TASK: MS3-T3
  DEPENDS_ON: [MS3-T1, MS3-T2]
  ARCHETYPE: implementer → verifier
  MODEL: sonnet (analysis) → haiku (verification)
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: DecisionTreeEngine, CollisionEngine, CampaignEngine, GCodeTemplateEngine
  GATE: YOLO
  SUCCESS: Each engine classified as SPLIT or ACCEPTED_LARGE with rationale
  ESTIMATED_CALLS: 5
```
For each of the 4 remaining >40KB engines:
1. Read the engine. Identify logical boundaries (method groupings, domain clusters).
2. Assess coupling: are there shared state variables or cross-method dependencies?
3. Decision:
   - **SPLIT**: Clear domain boundaries, independent method groups → extract sub-engines
   - **ACCEPTED_LARGE**: Tightly coupled, shared state, splitting would increase complexity
     → Document reason in PHASE_FINDINGS.md, set review trigger at 70KB
4. If SPLIT: execute the split following T1/T2 pattern.
5. If ACCEPTED_LARGE: document and move on.

#### MS3-T4: Full Regression (~5 calls)
```
TASK: MS3-T4
  DEPENDS_ON: [MS3-T3]
  ARCHETYPE: verifier
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: entire test suite
  GATE: GATED (zero regressions)
  SUCCESS: All tests pass, build size neutral or reduced
  ESTIMATED_CALLS: 5
```
1. `npm run build` → clean build, record size.
2. `npm run test` → all vitest tests pass.
3. `npm run test:benchmarks` → 150/150 benchmarks pass.
4. Compare build size: should be neutral (same code, different files) or slightly smaller (tree-shaking).
5. `git commit -m "R12-MS3: Engine decomposition — 6 engines assessed, 2+ split"`

**Rollback:** git revert to pre-split commit (all splits in one commit for easy revert)
**Exit:** No engine >50KB (stretch: all <40KB), all tests pass, backward compat maintained.

---

<!-- ANCHOR: r12_ms4_unified_test_infrastructure -->
## MS4: UNIFIED TEST INFRASTRUCTURE
<!-- ANCHOR: r12_ms4_role_production_engineer -->
### Role: Production Engineer | Model: Sonnet | Effort: M (~15 calls) | Sessions: 1

### Objective
Create test:all script, add coverage tracking, establish CI pipeline with build size + coverage thresholds.

### Source: IMP-XC-1 (test coverage gap), IMP-XC-2 (build size tracking, extends MS0-T3)

### MS4 Task DAG
```
[T1: test:all script] ──→ [T2: Coverage] ──→ [T3: CI pipeline] ──→ [T4: Verify]
```

#### MS4-T1: Create test:all Script (~4 calls)
```
TASK: MS4-T1
  DEPENDS_ON: [MS3 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: package.json, scripts/test-all.ts
  GATE: YOLO
  SUCCESS: `npm run test:all` runs every test suite and reports unified results
  ESTIMATED_CALLS: 4
```
1. Create `scripts/test-all.ts` that orchestrates all test suites:
   ```typescript
   // Suite registry — add new suites here
   const suites = [
     { name: 'vitest', command: 'npx vitest run', required: true },
     { name: 'benchmarks', command: 'npx tsx tests/r2/run-benchmarks.ts', required: true },
     { name: 'spot-check', command: 'npx tsx tests/r2/spot-check.ts', required: true },
     { name: 'enterprise', command: 'npx tsx tests/r4/enterprise-tests.ts', required: true },
     { name: 'intelligence', command: 'npx tsx tests/r3/intelligence-tests.ts', required: false },
   ];
   ```
2. Each suite: run, capture stdout, parse pass/fail count, record duration.
3. Unified output:
   ```json
   {
     "timestamp": "2026-02-23T...",
     "suites": [
       { "name": "vitest", "passed": 74, "failed": 0, "duration_ms": 3200 },
       { "name": "benchmarks", "passed": 150, "failed": 0, "duration_ms": 8500 },
       ...
     ],
     "total_passed": 400, "total_failed": 0, "total_duration_ms": 15000,
     "verdict": "PASS"
   }
   ```
4. Exit code: 0 if all required suites pass, 1 if any required suite fails.
5. Add to package.json: `"test:all": "npx tsx scripts/test-all.ts"`

#### MS4-T2: Coverage Tracking (~4 calls)
```
TASK: MS4-T2
  DEPENDS_ON: [MS4-T1]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: vitest.config.ts, package.json
  GATE: YOLO
  SUCCESS: Coverage report generated, baseline recorded
  ESTIMATED_CALLS: 4
```
1. Add istanbul coverage provider to vitest.config.ts:
   ```typescript
   export default defineConfig({
     test: {
       coverage: {
         provider: 'istanbul',
         reporter: ['text', 'json-summary'],
         reportsDirectory: './coverage',
       }
     }
   });
   ```
2. Run `npx vitest run --coverage` → generate baseline coverage report.
3. Record baseline in `coverage/coverage-baseline.json`:
   ```json
   { "date": "2026-02-23", "lines": 45.2, "branches": 32.1, "functions": 51.0,
     "thresholds": { "warn": 40, "block": 25 } }
   ```
4. Add coverage check to test:all script: compare current vs baseline.

#### MS4-T3: CI Pipeline (~4 calls)
```
TASK: MS4-T3
  DEPENDS_ON: [MS4-T2]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: false
  SCOPE: scripts/ci-check.ts, package.json
  GATE: YOLO
  SUCCESS: CI script runs test:all + build size check + coverage check
  ESTIMATED_CALLS: 4
```
1. Create `scripts/ci-check.ts`:
   - Run `npm run build` → check size against budget (MS0-T3)
   - Run `npm run test:all` → check all suites pass
   - Check coverage vs thresholds
   - Output: CI_REPORT.json with combined results
   - Exit: 0 if all green, 1 if any red
2. Add to package.json: `"ci": "npx tsx scripts/ci-check.ts"`
3. (Optional) Create `.github/workflows/prism-ci.yml` if GitHub Actions desired.

#### MS4-T4: Verify (~3 calls)
```
TASK: MS4-T4
  DEPENDS_ON: [MS4-T3]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  GATE: GATED
  SUCCESS: CI script passes, all reports generated
  ESTIMATED_CALLS: 3
```
1. Run `npm run ci` → confirm green output.
2. Verify CI_REPORT.json exists with test results + build size + coverage.
3. `git commit -m "R12-MS4: Unified test infrastructure — test:all, coverage, CI"`

**Rollback:** Remove scripts/test-all.ts, scripts/ci-check.ts, coverage config
**Exit:** test:all runs all suites, coverage tracked with thresholds, CI pipeline operational.

---

<!-- ANCHOR: r12_ms5_hook_telemetry_autopilot_tracing -->
## MS5: HOOK TELEMETRY + AUTOPILOT TRACING
<!-- ANCHOR: r12_ms5_role_platform_engineer -->
### Role: Platform Engineer | Model: Sonnet | Effort: S (~10 calls) | Sessions: 0.5

### Objective
Add observable telemetry to hooks (which fire, how often) and AutoPilot routing (why it picks
a dispatcher). Make debugging routing failures possible.

### Source: IMP-P0-2 (hook fire rate monitoring), IMP-P0-3 (AutoPilot decision logging)

### MS5 Task DAG
```
[T1: Hook telemetry] ──→ [T3: Test + verify]
[T2: Routing trace]  ──↗
```

#### MS5-T1: Hook Fire Rate Telemetry (~4 calls)
```
TASK: MS5-T1
  DEPENDS_ON: [MS4 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (independent of T2)
  SCOPE: src/engines/HookExecutor.ts, src/tools/dispatchers/devDispatcher.ts
  GATE: YOLO
  SUCCESS: hook_stats action returns real fire counts
  ESTIMATED_CALLS: 4
```
1. Add to HookExecutor.ts (or autoHookWrapper.ts):
   ```typescript
   private static hookFireCounts = new Map<string, { fires: number; lastFired: Date }>();
   // Increment on every hook fire
   static recordFire(hookName: string) { ... }
   static getStats(): HookFireStats { ... }
   ```
2. Wire recordFire() into every hook execution path.
3. Add `hook_stats` action to devDispatcher:
   - Returns: Map of hook name → { fires, lastFired, avg_duration_ms }
   - Sorted by fire count (most active first)
4. Register in all indexing systems (7 registrations).

#### MS5-T2: AutoPilot Decision Trace (~4 calls)
```
TASK: MS5-T2
  DEPENDS_ON: [MS4 COMPLETE]
  ARCHETYPE: implementer
  MODEL: sonnet
  EFFORT: STANDARD
  PARALLEL: true (independent of T1)
  SCOPE: src/tools/AutoPilot.ts, src/tools/dispatchers/devDispatcher.ts
  GATE: YOLO
  SUCCESS: routing_trace action returns last N decisions with keyword matches and confidence
  ESTIMATED_CALLS: 4
```
1. Add circular buffer to AutoPilot.ts:
   ```typescript
   private static decisionBuffer: Array<{
     timestamp: Date;
     input: string;          // first 100 chars of user input
     matchedKeywords: string[];
     candidateDispatchers: Array<{ name: string; confidence: number }>;
     selectedDispatcher: string;
     selectedAction: string;
     confidence: number;
   }> = [];  // max 100 entries
   ```
2. Populate on every routing decision.
3. Add `routing_trace` action to devDispatcher:
   - Returns: last N decisions (default 20)
   - Filterable by dispatcher name or confidence threshold

#### MS5-T3: Test + Verify (~2 calls)
```
TASK: MS5-T3
  DEPENDS_ON: [MS5-T1, MS5-T2]
  ARCHETYPE: verifier
  MODEL: haiku
  EFFORT: STANDARD
  PARALLEL: false
  GATE: GATED
  SUCCESS: Both actions return meaningful data after 5 test queries
  ESTIMATED_CALLS: 2
```
1. Fire 5 different MCP actions (speed_feed, alarm_decode, tool_search, job_plan, material_get).
2. Call hook_stats → verify at least DISPATCH hook shows fire count ≥ 5.
3. Call routing_trace → verify 5 entries with correct dispatcher assignments.
4. `git commit -m "R12-MS5: Hook telemetry + AutoPilot tracing"`

**Rollback:** Revert HookExecutor and AutoPilot changes
**Exit:** hook_stats returns real fire counts, routing_trace shows decision history.

---

<!-- ANCHOR: r12_ms6_integration_pipeline_activation -->
## MS6: INTEGRATION PIPELINE ACTIVATION (Excel/DuckDB)
<!-- ANCHOR: r12_ms6_role_integration_engineer -->
### Role: Integration Engineer | Model: Sonnet | Effort: M (~12 calls) | Sessions: 1

### Objective
Validate and activate the 5 existing Python integration scripts (excel_to_json, json_to_duckdb,
obsidian_generator, sync_to_drive, master_sync). Wire into MCP for invocation.

### Source: Unrealized Feature B9 (Excel Integration Suite — scripts written, never used),
  C:\PRISM\scripts\integration\, C:\PRISM\data\databases\prism.duckdb (2.5MB)

### MS6 Task DAG
```
[T1: Validate scripts] ──→ [T2: Sample template] ──→ [T3: E2E test] ──→ [T4: MCP wiring] ──→ [T5: Verify]
```

#### MS6-T1: Validate Existing Integration Scripts (~3 calls)
1. Check each of 5 scripts in C:\PRISM\scripts\integration\ for:
   - Syntax errors (python -c "import ast; ast.parse(open('file.py').read())")
   - Missing imports/dependencies (pip install pandas openpyxl duckdb if needed)
   - Hardcoded paths (update to use C:\PRISM\ base)
2. Fix any issues found. Record fixes in PHASE_FINDINGS.md.

#### MS6-T2: Create Sample Excel Template (~2 calls)
1. Create `C:\PRISM\data\databases\PRISM_MATERIALS_TEMPLATE.xlsx`:
   - Headers matching 127-parameter material schema
   - 5 sample rows: 4140, Ti-6Al-4V, 7075-T6, Inconel 718, 316L
   - Data validation dropdowns for ISO groups (P, M, K, N, S, H)
2. Purpose: Enables users to add materials via Excel rather than JSON editing.

#### MS6-T3: End-to-End Pipeline Test (~3 calls)
1. `python excel_to_json.py PRISM_MATERIALS_TEMPLATE.xlsx` → verify JSON output
2. `python json_to_duckdb.py` → verify DuckDB tables created
3. `python obsidian_generator.py` → verify .md notes in knowledge/
4. `python master_sync.py --skip-drive` → full pipeline minus cloud sync
5. Query DuckDB: `SELECT COUNT(*) FROM materials` → verify row count

#### MS6-T4: Add MCP Actions for Pipeline (~2 calls)
1. Add to devDispatcher:
   - `run_sync` — invokes master_sync.py via child process
   - `query_db` — SQL query against prism.duckdb (read-only)
   - `pipeline_status` — last run time, record counts per table
2. Register in indexing systems.

#### MS6-T5: Verify (~2 calls)
1. Call prism_dev:run_sync → confirm pipeline executes.
2. Call prism_dev:query_db with "SELECT COUNT(*) FROM materials" → confirm result.
3. `git commit -m "R12-MS6: Integration pipeline activated — Excel/DuckDB/Obsidian"`

**Rollback:** No destructive changes — scripts already exist, new actions are additive
**Exit:** Pipeline runs end-to-end, 3 MCP actions wired, sample data flowing.

---

<!-- ANCHOR: r12_ms7_phase_gate -->
## MS7: PHASE GATE
<!-- ANCHOR: r12_ms7_role_systems_architect -->
### Role: Systems Architect | Model: Opus (gate assessment) | Effort: S (~8 calls) | Sessions: 0.5

### Objective
Verify all R12 deliverables meet quality standards. Confirm no regressions.

### Gate Criteria (12 items, 10 required for PASS)

| # | Criterion | Source MS | Type | Required? |
|---|-----------|-----------|------|-----------|
| 1 | Orphan scripts: 0 without disposition | MS0 | data_integrity | ✅ |
| 2 | R5-R11 docs: all backfilled with actual deliverables | MS0 | documentation | ✅ |
| 3 | Build size: under 6MB budget, tracking active | MS0/MS4 | infrastructure | ✅ |
| 4 | Phantom skill detector: operational in startup | MS0 | data_integrity | ✅ |
| 5 | Skill triggers: 164+ populated, 80%+ context match | MS1 | data_integrity | ✅ |
| 6 | CC hooks: 5 active in .claude/settings.json | MS2 | infrastructure | ⚠️ WARN OK |
| 7 | Slash commands: 5 registered in .claude/commands/ | MS2 | infrastructure | ⚠️ WARN OK |
| 8 | Engine sizes: no engine >50KB (stretch: <40KB) | MS3 | code_quality | ✅ |
| 9 | Test infra: test:all runs, coverage tracked | MS4 | test_coverage | ✅ |
| 10 | Hook telemetry: hook_stats functional | MS5 | infrastructure | ✅ |
| 11 | Integration pipeline: master_sync.py runs E2E | MS6 | integration | ✅ |
| 12 | Regression: 150/150 benchmarks, all existing tests pass | ALL | safety | 🔴 HARD BLOCK |

**PASS:** 10/12 criteria met. Criteria 6 and 7 can WARN (CC-dependent, may need version compat).
**FAIL:** Any regression (#12) or >2 criteria failed.

### Gate Steps
1. Run `npm run ci` → unified test + build + coverage report.
2. Run `npm run test:benchmarks` → 150/150 confirmation.
3. Check each criterion against deliverables.
4. Write R12_QUALITY_REPORT.json with criterion-by-criterion results.
5. If PASS: `git tag r12-complete && git push --tags`
6. Update CURRENT_POSITION.md: Phase → R13.
7. Update ROADMAP_TRACKER.md: R12 completion log.

**Exit:** R12 COMPLETE. Codebase hardened. Dev tools activated. Ready for R13.

---

<!-- ANCHOR: r12_session_management -->
## SESSION MANAGEMENT

### Compaction Risk Assessment
| MS | Risk | Calls | Strategy |
|----|------|-------|----------|
| MS0 | LOW | ~15 | Single session, flush after each step |
| MS1 | MEDIUM | ~20 | Flush trigger_proposals.json after T1, SKILL_INDEX after T2 |
| MS2 | MEDIUM | ~25 | Flush after each sub-task (T1→T4), CC handles persistence |
| MS3 | HIGH | ~30 | Flush after each engine split, anti-regression before next |
| MS4 | LOW | ~15 | Single session, CI scripts are self-contained |
| MS5 | LOW | ~10 | Quick implementation, single session |
| MS6 | LOW | ~12 | Python scripts are self-contained |
| MS7 | LOW | ~8 | Gate only, no persistent writes except report |

### Flush Points
- After MS0-T1: SCRIPT_INDEX.json updated
- After MS1-T1: trigger_proposals.json written
- After MS1-T2: SKILL_INDEX.json populated
- After MS2-T1: .claude/settings.json created
- After MS3-T1: ProductEngine split committed
- After MS3-T2: IntelligenceEngine split committed
- After MS4-T3: CI pipeline committed
- After MS7: R12_QUALITY_REPORT.json + tags

---

<!-- ANCHOR: r12_effort_summary -->
## EFFORT SUMMARY

| MS | Title | Calls | Model Split | Sessions |
|----|-------|-------|-------------|----------|
| MS0 | Housekeeping + Backfill | ~19 | Haiku 30% / Sonnet 70% | 1 |
| MS1 | Skill Trigger Activation | ~20 | Haiku 25% / Sonnet 75% | 1-2 |
| MS2 | CC_DEFERRED Backlog | ~25 | Sonnet 100% (CC) | 2 |
| MS3 | Engine Decomposition | ~30 | Sonnet 80% / Opus 20% | 2 |
| MS4 | Unified Test Infra | ~15 | Sonnet 100% | 1 |
| MS5 | Hook Telemetry + Tracing | ~10 | Sonnet 100% | 0.5 |
| MS6 | Integration Pipeline | ~12 | Sonnet 100% | 1 |
| MS7 | Phase Gate | ~8 | Opus 100% | 0.5 |
| **TOTAL** | | **~139** | **Haiku 12% / Sonnet 73% / Opus 15%** | **6-8** |
