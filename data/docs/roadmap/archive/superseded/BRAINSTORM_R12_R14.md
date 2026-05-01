# COMPREHENSIVE BRAINSTORM: UNREALIZED FEATURES + IMPROVEMENT AUDIT
# Date: 2026-02-23 | Auditor: Opus 4.6 (Systems Architect + Intelligence Architect)
# Scope: (A) Integrate unrealized features into modular roadmap, (B) Improvement opportunities P0→R11
# Format: Matches PHASE_TEMPLATE.md v15.0 exactly — roles, models, effort, DAGs, gates

---

# ═══════════════════════════════════════════════════════════════
# PART 1: IMPROVEMENT AUDIT — P0 THROUGH R11
# ═══════════════════════════════════════════════════════════════

## 1.1 P0 ACTIVATION — Improvements Identified

### IMP-P0-1: Phantom Registry Entries (SEVERITY: MEDIUM)
**Finding:** DA-MS2 found 27 phantom skill registry entries. R1-AUDIT-T3 found 68 phantom scripts.
**Current State:** Phantom scripts cleaned (disk-scan only), but SKILL_INDEX.json still has entries
  pointing to skills with empty SKILL.md files (proposals/, scripts/ dirs).
**Improvement:** Add a boot-time phantom detector to session_enhanced_startup.py that warns
  when indexed skills have no SKILL.md content. Prevents misleading "230/232 skills" counts.
**Effort:** XS (2-3 calls) | Model: Haiku | Role: Verifier
**Where to slot:** R6 companion task (production hardening quality pass)

### IMP-P0-2: Hook Fire Rate Monitoring (SEVERITY: LOW)
**Finding:** UTILIZATION_AUDIT_v15 showed NL hooks have 0 runtime executions.
  DA-MS11 added nl_hook_evaluator cadence function but NL hooks remain advisory-only.
**Current State:** 9 NL hooks deployed, 27 built-in hooks, but no telemetry on which fire.
**Improvement:** Add a lightweight counter to autoHookWrapper.ts that increments per-hook
  fire counts in a Map<string,number>. Expose via prism_dev→hook_stats action.
**Effort:** S (4-6 calls) | Model: Sonnet | Role: Platform Engineer
**Where to slot:** DA-MS11 companion (already flagged as T3-1)

### IMP-P0-3: AutoPilot Decision Logging (SEVERITY: MEDIUM)
**Finding:** AutoPilot.ts routes all 31 dispatchers but decisions are opaque. When routing
  fails or picks the wrong dispatcher, there's no trace of why.
**Improvement:** Add a decision trace mode: when enabled, AutoPilot logs its keyword matches,
  confidence scores, and final routing to a lightweight circular buffer (last 50 decisions).
  Expose via prism_dev→routing_trace.
**Effort:** S (4-6 calls) | Model: Sonnet | Role: Platform Engineer
**Where to slot:** R5 or R8 (UX debugging)

---

## 1.2 DA DEVELOPMENT ACCELERATION — Improvements Identified

### IMP-DA-1: CC_DEFERRED Backlog (SEVERITY: HIGH)
**Finding:** DA-MS4 (Deterministic Hook Configuration) was CC_DEFERRED.
  DA-MS2 Steps 2-7 were CC_DEFERRED. DA-MS8 had 4/9 CC_DEFERRED.
**Current State:** Claude Code is now available but these items were never revisited.
**Improvement:** Create a CC_CATCHUP milestone that executes all deferred Claude Code tasks:
  - DA-MS4: Hook .claude/settings.json configuration
  - DA-MS2: Skill conversion + slash commands
  - DA-MS8: Gate criteria requiring CC
**Effort:** L (15-20 calls) | Model: Sonnet (CC implementer) | Role: Platform Engineer
**Where to slot:** NEW PHASE R12 (see Part 2)

### IMP-DA-2: Script Orphan Audit Never Completed (SEVERITY: MEDIUM)
**Finding:** DA_WIRING_AUDIT.md identified 28 orphan scripts (42% of total). Never resolved.
**Improvement:** Batch audit all 28 scripts: classify as ACTIVE/ARCHIVE/DELETE.
  Move archived scripts to scripts/_archived/. Update SCRIPT_INDEX.json.
**Effort:** M (8-12 calls) | Model: Haiku (scanning) → Sonnet (disposition) | Role: Verifier
**Where to slot:** R12-MS0 (housekeeping)

### IMP-DA-3: SKILL_INDEX Trigger Quality (SEVERITY: MEDIUM)
**Finding:** DA_WIRING_AUDIT.md noted "SKILL_INDEX triggers mostly empty — blocks skill_context_matcher."
  164 indexed skills, but trigger arrays are sparse. skill_context_matcher fires but can't match.
**Improvement:** Batch-populate trigger arrays for all 164+ skills using keyword extraction
  from each SKILL.md content. This unblocks the entire skill auto-loading pipeline.
**Effort:** M (10-15 calls) | Model: Haiku (extraction) → Sonnet (validation) | Role: Context Engineer
**Where to slot:** R12-MS1 (dev tooling activation)

---

## 1.3 R1 REGISTRY — Improvements Identified

### IMP-R1-1: Material Coverage Gap (SEVERITY: HIGH)
**Finding:** ROADMAP_TRACKER shows "Materials: 521/3518 (14.8%) — NEEDS LOADING"
**Current State:** 6,338 materials now in registry (per CURRENT_POSITION), but original
  target was 3,518 with 127 parameters each. Many loaded materials have sparse parameters.
**Improvement:** Run a data completeness audit: for each loaded material, count non-null
  parameters out of 127. Flag materials below 50% completeness for enrichment campaigns.
**Effort:** S (4-6 calls) | Model: Sonnet | Role: Data Architect
**Where to slot:** R7-MS enrichment or R12 data quality pass

### IMP-R1-2: Tool Registry Population (SEVERITY: HIGH)
**Finding:** Tools went from 0% → 15,912 loaded, but ToolRegistry indexes were broken
  (manufacturer index EMPTY). Fixed in R1-MS5 with vendor fallback.
**Current State:** Multi-term search works, getFacets() exists, but no validation that
  tool data is complete or physically plausible (diameter, flute count, etc.).
**Improvement:** Add a tool_validate action to dataDispatcher that runs plausibility
  checks on tool entries: diameter > 0, flute_count > 0, materials_compatible not empty.
**Effort:** S (4-6 calls) | Model: Sonnet | Role: Data Architect
**Where to slot:** R7 or R12 data quality pass

### IMP-R1-3: Alarm Dual-Path Issue (SEVERITY: MEDIUM)
**Finding:** "Knowledge engine has alarm data inline. AlarmRegistry loads from
  state/alarm-registry.json which is separate."
**Current State:** Both paths work independently. No single source of truth.
**Improvement:** Consolidate alarm data to AlarmRegistry as SSoT. Knowledge engine references
  AlarmRegistry for lookups. Eliminates drift between two alarm stores.
**Effort:** M (8-12 calls) | Model: Sonnet | Role: Data Architect
**Where to slot:** R7 or R12

---

## 1.4 R2 SAFETY — Improvements Identified

### IMP-R2-1: Rz Ratio Still Benchmark-Tuned (SEVERITY: MEDIUM)
**Finding:** Ralph audit scored Rz ratio at 0.45 initially. MS1.5 remediated but
  the fix used process-dependent lookup tables, not first-principles physics.
**Current State:** 150/150 benchmarks pass, Rz predictions are reasonable.
**Improvement:** In R7 (Physics Evolution), replace lookup tables with
  process-specific Rz models: turning (Rz = f²/8r), milling (Rz = f²/4D·ae),
  grinding (Rz = f(wheel_speed, infeed)). These have closed-form solutions.
**Effort:** M (10-12 calls) | Model: Opus (physics) | Role: Safety Engineer
**Where to slot:** R7-MS (physics calibration round 2)

### IMP-R2-2: Missing Stability Lobe Diagram Generation (SEVERITY: LOW)
**Finding:** Edge case fix (R2-MS3) corrected Re[G] formula per Altintas.
  StabilityEngine exists. But no action generates a full SLD (array of (N, ap_lim) pairs).
**Improvement:** Add stability_lobe_diagram action to calcDispatcher that returns
  the full SLD curve for a given material+tool+machine combo.
**Effort:** S (5-8 calls) | Model: Opus (physics) | Role: Safety Engineer
**Where to slot:** R7 (advanced physics)

---

## 1.5 R3 CAMPAIGNS — Improvements Identified

### IMP-R3-1: IntelligenceEngine Monolith Risk (SEVERITY: HIGH)
**Finding:** IntelligenceEngine.ts is 85.4KB (~2,100 lines) — single largest engine file.
  Contains ALL 11 intelligence actions in one file.
**Improvement:** Split into focused engines: JobPlanEngine, RecommendationEngine,
  WhatIfEngine, DiagnosticEngine, OptimizationEngine. Each handles 2-3 actions.
  IntelligenceEngine becomes a thin orchestrator.
**Effort:** L (15-20 calls) | Model: Sonnet (CC implementer) | Role: Systems Architect
**Where to slot:** R12 (refactoring pass) or R6 (production hardening)

### IMP-R3-2: process_cost_calc Limited (SEVERITY: MEDIUM)
**Finding:** R3-MS1 implemented process_cost_calc but it's a single-operation model.
  No multi-operation job costing, no setup time modeling, no batch economics beyond basic.
**Current State:** Returns $/part for a single cut. No overhead, no shop rate, no quoting.
**Improvement:** This is where the unrealized Cost Estimation system (B3) plugs in.
  See Phase R13 below.
**Effort:** XL (30+ calls) | Model: Opus (architecture) → Sonnet (implementation)
**Where to slot:** NEW PHASE R13

### IMP-R3-3: quality_predict Limited (SEVERITY: MEDIUM)
**Finding:** quality_predict returns achievable tolerance grade but no GD&T stack-up.
**Improvement:** Extend with GD&T chain analysis (unrealized feature B4).
  See R7 enhancement below.
**Effort:** L (15-20 calls) | Model: Opus (physics) | Role: Safety Engineer
**Where to slot:** R7 enhancement

---

## 1.6 R4 ENTERPRISE — Improvements Identified

### IMP-R4-1: REST API Only 5 Endpoints (SEVERITY: MEDIUM)
**Finding:** R4-MS3 delivered 5 REST endpoints. But PRISM has 382+ actions.
  Key missing endpoints: toolpath strategy, process_cost, what_if, wear_prediction.
**Improvement:** Add 4 more high-value endpoints in a follow-up MS:
  - POST /api/v1/toolpath-strategy → prism_toolpath:strategy_select
  - POST /api/v1/process-cost → prism_calc:process_cost_calc
  - POST /api/v1/what-if → prism_intelligence:what_if
  - POST /api/v1/wear-predict → prism_calc:wear_prediction
**Effort:** S (5-8 calls) | Model: Sonnet | Role: Platform Engineer
**Where to slot:** R5 (visual layer needs these) or R12

### IMP-R4-2: Audit Log Rotation Missing (SEVERITY: LOW)
**Finding:** Winston audit logging writes to audit.jsonl with no rotation/archival.
  In production, this file will grow unbounded.
**Improvement:** Add daily rotation with 30-day retention to winston config.
**Effort:** XS (2-3 calls) | Model: Sonnet | Role: Production Engineer
**Where to slot:** R6 (production hardening)

---

## 1.7 R5-R11 — Improvements to Existing Phase Designs

### IMP-R5-1: R5 Phase Doc Still a Stub (SEVERITY: HIGH)
**Finding:** PHASE_R5_VISUAL.md header says "STUB — expand via Brainstorm-to-Ship."
  But CURRENT_POSITION says "ALL PHASES P0→R11 COMPLETE."
**Root Cause:** R5-R11 were executed via v17.0/v19.1 task-based roadmap which expanded
  them inline. The original phase files were never updated to reflect what was actually done.
**Improvement:** Backfill PHASE_R5 through R11 with actual deliverables per ROADMAP_TRACKER.
  This creates historical completeness for future reference.
**Effort:** M (10-12 calls) | Model: Haiku (extraction) → Sonnet (formatting) | Role: Verifier
**Where to slot:** R12-MS0 (housekeeping)

### IMP-R7-1: 257 Extracted Engines — Only 73 Wired (SEVERITY: HIGH)
**Finding:** C:\PRISM\extracted\engines\ has 257 files. MCP server has 73 engines wired.
  184 extracted engines are sitting unused. Some may be duplicates, but many contain
  unique physics or manufacturing algorithms.
**Improvement:** Audit 257 extracted engines → classify as WIRED/DUPLICATE/CANDIDATE/ARCHIVE.
  Candidates get wired in R7 physics evolution. Duplicates archived.
**Effort:** L (15-20 calls) | Model: Haiku (scanning) → Opus (classification) | Role: Intelligence Architect
**Where to slot:** R7 or R12 data quality pass

### IMP-R10-1: ProductEngine.ts is 90.3KB (SEVERITY: HIGH)
**Finding:** ProductEngine.ts (90.3KB) is the largest engine by far.
  Second is IntelligenceEngine.ts (85.4KB). Third is CollisionEngine.ts (51.8KB).
**Improvement:** These need decomposition. Any engine >40KB is a maintenance risk.
  ProductEngine → split by product type. CollisionEngine → split by geometry type.
**Effort:** L per engine (15-20 calls each) | Model: Sonnet (CC) | Role: Systems Architect
**Where to slot:** R12 (refactoring)

---

## 1.8 CROSS-CUTTING IMPROVEMENTS

### IMP-XC-1: Test Coverage Gap (SEVERITY: HIGH)
**Finding:** 74 vitest tests pass. But test files are fragmented:
  - src/__tests__/ has 5 files (health, memory, safety, security, stress)
  - R4 tests in separate file (116 tests)
  - R2 benchmarks (150 tests) in run-benchmarks.ts
  - R3 tests in various files
  Total: ~400+ test cases but NO unified coverage report. No test:all script.
**Improvement:** Create test:all that runs every test suite and reports unified coverage.
  Add coverage thresholds to CI pipeline.
**Effort:** M (8-10 calls) | Model: Sonnet | Role: Production Engineer
**Where to slot:** R6 or R12

### IMP-XC-2: Build Size Growing Unchecked (SEVERITY: MEDIUM)
**Finding:** Build went from 3.85MB → 3.9MB → 4.0MB → 4.2MB → 4.9MB → 5.6MB over R1→R11.
  No budget or tracking. At this rate, R12-R13 could push it to 8-10MB.
**Improvement:** Add build size tracking to CI. Alert if >6MB. Add tree-shaking analysis
  to identify dead code in bundle.
**Effort:** S (4-6 calls) | Model: Sonnet | Role: Production Engineer
**Where to slot:** R12-MS0

### IMP-XC-3: No Code-Level Documentation (SEVERITY: MEDIUM)
**Finding:** 73 engines, 32 dispatchers, 382 actions. ZERO JSDoc comments.
  New developers (or Claude sessions after compaction) have no inline guidance.
**Improvement:** Add JSDoc to all public engine methods and dispatcher action handlers.
  Can be done in parallel with Haiku teammates.
**Effort:** XL (25-40 calls) | Model: Haiku (bulk) → Sonnet (review) | Role: Verifier
**Where to slot:** R12 or R6

# ═══════════════════════════════════════════════════════════════
# PART 2: NEW PHASES — UNREALIZED FEATURES INTEGRATED
# ═══════════════════════════════════════════════════════════════
#
# PHASE ORDERING RATIONALE:
#   R12 = Dev Infrastructure (dev tools first — accelerates everything after)
#   R13 = Manufacturing Intelligence Extraction (monolith gold)
#   R14 = Product Features (post processor, quoting, process planning)
#
# Each phase follows PHASE_TEMPLATE.md v15.0 exactly.

---

# ╔═══════════════════════════════════════════════════════════════╗
# ║  PHASE R12: DEVELOPMENT INFRASTRUCTURE + QUALITY HARDENING   ║
# ╚═══════════════════════════════════════════════════════════════╝

# Status: not-started | Sessions: 6-8 | MS: 8 (MS0-MS7) | Role: Platform Engineer → Verifier
# ENV: CC 70% + MCP 30% | Model: Haiku→Sonnet→Opus | CC Subagents: implementer, verifier
# Pattern: AUDIT → FIX → VERIFY → HARDEN → DOCUMENT
# DEPENDS ON: R11 complete (all systems live)
# PRODUCES: Clean codebase, full test coverage, activated dev tooling, historical completeness

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: P0→R11 built the complete PRISM system (32 dispatchers, 382 actions,
  73 engines, 9 registries). But 13 CC_DEFERRED items remain, 28 orphan scripts exist,
  SKILL_INDEX triggers are empty, 3 engines exceed 40KB, build size is unchecked, and
  test coverage has no unified report.

WHAT THIS PHASE DOES: Clean house. Activate every built-but-unwired tool. Fix every
  known quality gap. Create the test infrastructure that a safety-critical system demands.
  Make the codebase ready for external contributors or sustained solo development.

WHAT COMES AFTER: R13 (Monolith Intelligence Extraction) builds on a clean, well-tested
  foundation. R14 (Product Features) builds on extracted intelligence.

ARTIFACT MANIFEST:
  REQUIRES: CURRENT_POSITION.md, ROADMAP_TRACKER.md, DA_WIRING_AUDIT.md,
    UTILIZATION_AUDIT_v15.md, UNREALIZED_FEATURES_AUDIT.md
  PRODUCES: PHASE_FINDINGS.md (R12 section), unified test report,
    updated SCRIPT_INDEX.json, backfilled R5-R11 phase docs,
    decomposed engines, activated SKILL_INDEX triggers

---

## FAULT INJECTION TEST (XA-13)

R12 FAULT TEST: Delete 3 random skill SKILL.md files → verify skill_context_matcher degrades gracefully.
  WHEN: After MS1 (skill trigger activation) is complete.
  HOW: Rename 3 Tier-A skill SKILL.md files to .bak. Run session_enhanced_startup.py.
  EXPECTED: Startup reports "3 skills unloadable" as WARNING, not crash. System continues.
  PASS: Graceful degradation + accurate warning count.
  FAIL: Crash, silent failure, or wrong count.
  EFFORT: ~4 calls.

---

## R12-MS0: Housekeeping + Historical Backfill
**Effort:** ~15 calls | **Tier:** STANDARD | **Context:** ~20KB
**Response Budget:** ~15KB throughput, ~8KB peak
**Execution:** CC 80% | MCP 20%
  CC steps: Steps 1-5 (file operations, bulk processing)
  MCP steps: Step 6 (validation via prism_dev actions)
  Subagents: verifier (script audit), implementer (backfill)
  WHY: Bulk file ops = CC, validation = MCP
**Role:** Verifier → Platform Engineer
**Model:** Haiku (scanning) → Sonnet (writing)
**Entry:** R11 COMPLETE.

```
Step 1: Orphan script audit (IMP-DA-2)
  - Read SCRIPT_INDEX.json (13 entries) + scan scripts/ dirs for all .ps1/.py/.js
  - Classify each: ACTIVE (referenced in cadence/hooks/startup) / ARCHIVE / DELETE
  - Move ARCHIVE to scripts/_archived/. Remove DELETE. Update SCRIPT_INDEX.json.
  - GATE: <10% orphaned without disposition

Step 2: Backfill R5-R11 phase docs (IMP-R5-1)
  - For each PHASE_R{5-11}_*.md that's still a stub:
    Extract actual deliverables from ROADMAP_TRACKER.md
    Write "COMPLETED" section with MS list, dates, key commits
  - Purpose: Historical completeness. Future sessions can read what was done.

Step 3: Build size baseline (IMP-XC-2)
  - Record current build size (5.6MB) in PHASE_FINDINGS.md
  - Run esbuild --analyze to get per-module sizes
  - Identify top 10 largest modules in bundle
  - Set budget: WARN at 6MB, BLOCK at 8MB
  - Add size check to npm run build:fast post-step

Step 4: Phantom skill detector (IMP-P0-1)
  - Add to session_enhanced_startup.py: scan SKILL_INDEX.json entries
  - For each entry, verify SKILL.md exists and has >10 lines of content
  - Report phantoms as WARNING in startup readiness score
  - Count real vs phantom in session report

Step 5: Audit log rotation (IMP-R4-2)
  - Add daily rotation config to winston logger (30-day retention)
  - Move old audit.jsonl to state/logs/archive/ on rotation

Step 6: Verify all fixes
  - Run session_enhanced_startup.py — confirm readiness score
  - Run npm run build:fast — confirm size check
  - Verify SCRIPT_INDEX.json is accurate
```

**Rollback:** git revert per-step commits
**Exit:** 0 orphan scripts without disposition, R5-R11 docs backfilled, build budget active

---

## R12-MS1: Skill Trigger Activation + Context Matcher Unblock
**Effort:** ~20 calls | **Tier:** DEEP | **Context:** ~25KB
**Response Budget:** ~20KB throughput, ~10KB peak
**Execution:** CC 90% | MCP 10%
  CC steps: Steps 1-4 (bulk file processing with agent team)
  MCP steps: Step 5 (validation via skill_context_matcher test)
  Subagents: implementer×3 (agent team, parallel by skill domain)
  WHY: Bulk keyword extraction from 164+ files = CC agent team territory
**Role:** Context Engineer
**Model:** Haiku (extraction) → Sonnet (validation)
**Entry:** R12-MS0 COMPLETE.

```
Step 1: Extract keywords from all 164+ SKILL.md files
  - For each skill: read SKILL.md → extract top 5-10 trigger keywords
  - Keywords = nouns, verbs, tool names that would appear in user queries
  - Example: prism-kienzle-model → ["kienzle", "cutting force", "kc1.1", "specific cutting force"]
  - Output: trigger_proposals.json

Step 2: Agent Team — parallel population (3 teammates)
  - Teammate A: Manufacturing skills (prism-material-*, prism-cutting-*, prism-tool-*)
  - Teammate B: Development skills (prism-anti-regression-*, prism-session-*, prism-hook-*)
  - Teammate C: Reference skills (prism-gcode-*, prism-controller-*, prism-post-*)
  - Each: Read trigger_proposals.json for their domain → update SKILL_INDEX.json triggers
  - Scope boundaries: Each teammate ONLY edits entries in their domain

Step 3: Validate trigger quality
  - Run skill_context_matcher against 20 test queries
  - Verify: "kienzle force calculation" → matches prism-kienzle-model
  - Verify: "hook not firing" → matches prism-hook-enforcement
  - Verify: "fanuc alarm 401" → matches prism-fanuc-programming + alarm skill
  - Target: 80%+ match rate on test queries

Step 4: Rebuild indexes
  - Run update-skill-index.ps1 to refresh counts
  - Verify no duplicate triggers across skills (overlap warnings OK, duplicates NOT OK)

Step 5: End-to-end test
  - Start fresh MCP session → verify skill auto-loading fires with correct skills
  - Query "calculate cutting force for 4140 steel" → verify Kienzle skill loaded
```

**Rollback:** Restore SKILL_INDEX.json from git
**Exit:** 164+ skills with populated triggers, 80%+ context match rate, skill_context_matcher functional

---

## R12-MS2: CC_DEFERRED Backlog Execution
**Effort:** ~25 calls | **Tier:** DEEP | **Context:** ~30KB
**Response Budget:** ~25KB throughput, ~12KB peak
**Execution:** CC 100%
  CC steps: All (Claude Code exclusive — these are CC-native tasks)
  MCP steps: None
  Subagents: implementer (DA-MS4 hooks), verifier (gate)
  WHY: These tasks were specifically deferred because they require CC
**Role:** Platform Engineer
**Model:** Sonnet (CC implementer)
**Entry:** R12-MS1 COMPLETE.

```
Step 1: DA-MS4 — Deterministic Hook Configuration
  - Create .claude/settings.json with hook definitions from PRISM_ROADMAP_v17.0.md §3
  - Implement pre-edit-safety-gate.ps1 (blocks CRITICAL file edits without safety review)
  - Implement post-build-verify.ps1 hook (auto-verify after builds)
  - Implement anti-regression-gate.ps1 (blocks >30% line reduction)
  - Test: Edit a CRITICAL file → verify hook blocks

Step 2: DA-MS2 Steps 2-3 — Skill Conversion + Slash Commands
  - Convert top 5 Tier-A skills to Claude Code slash commands:
    /prism-safety-check → invokes safety-physics subagent
    /prism-build → runs build + verify pipeline
    /prism-test → runs full test suite
    /prism-audit → runs anti-regression + wiring audit
    /prism-status → reads CURRENT_POSITION + health_check
  - Register in .claude/commands/ directory

Step 3: Agent definition files
  - Create .claude/agents/safety-physics.md (from v17.0 §2.3.1)
  - Create .claude/agents/implementer.md (from v17.0 §2.3.2)
  - Create .claude/agents/verifier.md (from v17.0 §2.3.3)
  - Verify: /safety-physics invocation works

Step 4: DA-MS8 gate criteria re-evaluation
  - Re-run 4 CC_DEFERRED gate criteria with CC now available
  - Log results in DA_MS8_GATE_RESULTS.md (updated)
```

**Rollback:** Remove .claude/settings.json hooks, .claude/commands/, .claude/agents/
**Exit:** 5 hooks active, 5 slash commands, 3 agent definitions, DA-MS8 gate re-assessed

---

## R12-MS3: Engine Decomposition (Large File Split)
**Effort:** ~30 calls | **Tier:** DEEP | **Context:** ~35KB
**Response Budget:** ~25KB throughput, ~15KB peak
**Execution:** CC 80% | MCP 20%
  CC steps: Steps 1-3 (refactoring with agent team)
  MCP steps: Step 4 (regression verification)
  Subagents: implementer×2 (parallel split), safety-physics (if calc engines touched), verifier
  WHY: Multi-file refactoring = CC. Regression checks = MCP test suite.
**Role:** Systems Architect
**Model:** Sonnet (CC) → Opus (safety review if needed)
**Entry:** R12-MS2 COMPLETE.

```
Step 1: Split ProductEngine.ts (90.3KB)
  - Identify logical sub-engines by product domain
  - Split into: PostProcessorProduct.ts, QuotingProduct.ts, SetupSheetProduct.ts,
    ToolCatalogProduct.ts, ProductOrchestrator.ts (thin router)
  - ProductEngine.ts → re-export from sub-engines for backward compat
  - Anti-regression: all existing actions still route correctly

Step 2: Split IntelligenceEngine.ts (85.4KB) (IMP-R3-1)
  - Split into: JobPlanEngine.ts, RecommendationEngine.ts, WhatIfEngine.ts,
    DiagnosticEngine.ts, OptimizationEngine.ts
  - IntelligenceEngine.ts → thin orchestrator importing sub-engines
  - Anti-regression: 15/15 intelligence tests still pass

Step 3: Assess CollisionEngine.ts (51.8KB), CampaignEngine.ts (50.8KB),
  GCodeTemplateEngine.ts (49.6KB), DecisionTreeEngine.ts (58.6KB)
  - If >40KB after logical split analysis: split
  - If tightly coupled: document as ACCEPTED_LARGE with reason

Step 4: Full regression
  - npm run test — all suites pass
  - run-benchmarks.ts — 150/150
  - Build size comparison: should be neutral or smaller (tree-shaking gains)
```

**Rollback:** git revert to pre-split commit
**Exit:** No engine >50KB (ideally <40KB), all tests pass, backward compat maintained

---

## R12-MS4: Unified Test Infrastructure (IMP-XC-1)
**Effort:** ~15 calls | **Tier:** STANDARD | **Context:** ~15KB
**Response Budget:** ~12KB throughput, ~8KB peak
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-3 (test script creation)
  MCP steps: Step 4 (run tests via prism_dev)
  Subagents: implementer (test infra), verifier (coverage)
  WHY: Script creation = CC. Test execution = MCP.
**Role:** Production Engineer
**Model:** Sonnet
**Entry:** R12-MS3 COMPLETE.

```
Step 1: Create test:all script
  - package.json script that runs ALL test suites in sequence:
    vitest → run-benchmarks → spot-check → R4 enterprise tests
  - Unified exit code: 0 = all pass, 1 = any fail
  - Unified output: JSON summary with suite name, pass/fail count, duration

Step 2: Coverage tracking
  - Add vitest coverage (istanbul provider) to vitest.config.ts
  - Baseline current coverage % (lines, branches, functions)
  - Set thresholds: WARN at <60%, BLOCK at <40%
  - Output: coverage/coverage-summary.json

Step 3: CI pipeline update
  - Add test:all to CI (GitHub Actions or local script)
  - Add build size check to CI
  - Add coverage threshold check to CI
  - Output: CI_REPORT.json with test results + build size + coverage

Step 4: Verify
  - Run test:all — confirm unified output
  - Check coverage report exists and thresholds work
  - Commit CI config
```

**Rollback:** Remove test:all script, coverage config
**Exit:** test:all runs all suites, coverage tracked, CI pipeline operational

---

## R12-MS5: Hook Fire Rate Telemetry + AutoPilot Tracing
**Effort:** ~10 calls | **Tier:** STANDARD | **Context:** ~12KB
**Response Budget:** ~10KB throughput, ~6KB peak
**Execution:** CC 60% | MCP 40%
  CC steps: Steps 1-2 (implementation)
  MCP steps: Steps 3-4 (validation via MCP actions)
  Subagents: implementer
  WHY: Code changes = CC. Functional testing = MCP.
**Role:** Platform Engineer
**Model:** Sonnet
**Entry:** R12-MS4 COMPLETE.

```
Step 1: Hook telemetry (IMP-P0-2)
  - Add Map<string, { fires: number, lastFired: Date }> to autoHookWrapper.ts
  - Increment on every hook fire
  - Add hook_stats action to devDispatcher → returns fire counts sorted by frequency
  - Purpose: Know which hooks are actually useful

Step 2: AutoPilot decision trace (IMP-P0-3)
  - Add circular buffer (last 100 decisions) to AutoPilot.ts
  - Each decision records: input keywords, matched dispatcher, confidence, timestamp
  - Add routing_trace action to devDispatcher → returns last N decisions
  - Purpose: Debug routing failures, understand AutoPilot behavior

Step 3: Test hook telemetry
  - Fire prism_calc:speed_feed → check hook_stats shows DISPATCH hook fired
  - Verify counter increments on repeated calls

Step 4: Test routing trace
  - Send 5 different queries → check routing_trace returns all 5 with correct dispatchers
  - Verify confidence scores are populated
```

**Rollback:** Revert autoHookWrapper.ts and AutoPilot.ts changes
**Exit:** hook_stats action returns real fire counts, routing_trace shows decision history

---

## R12-MS6: Integration Pipeline Activation (Excel/DuckDB)
**Effort:** ~12 calls | **Tier:** STANDARD | **Context:** ~15KB
**Response Budget:** ~12KB throughput, ~8KB peak
**Execution:** CC 80% | MCP 20%
  CC steps: Steps 1-4 (Python scripts, testing)
  MCP steps: Step 5 (MCP action wiring)
  Subagents: implementer
  WHY: Python scripts = CC. MCP registration = MCP.
**Role:** Integration Engineer
**Model:** Sonnet
**Entry:** R12-MS4 COMPLETE (can run parallel with MS5).

```
Step 1: Validate existing integration scripts
  - Run each of the 5 scripts in C:\PRISM\scripts\integration\:
    excel_to_json.py, json_to_duckdb.py, obsidian_generator.py, sync_to_drive.py, master_sync.py
  - Fix any import errors, path issues, missing dependencies
  - Install requirements: pip install pandas openpyxl duckdb

Step 2: Create sample Excel template
  - C:\PRISM\data\databases\PRISM_MATERIALS_TEMPLATE.xlsx
  - Headers matching 127-parameter material schema
  - 5 sample rows with real data (4140, Ti-6Al-4V, 7075-T6, Inconel 718, 316L)
  - Data validation dropdowns for ISO groups

Step 3: End-to-end pipeline test
  - excel_to_json.py → verify JSON output
  - json_to_duckdb.py → verify DuckDB tables created
  - obsidian_generator.py → verify .md notes created in knowledge/
  - master_sync.py --skip-drive → full pipeline minus cloud

Step 4: Add MCP actions for pipeline
  - prism_dev→run_sync (invokes master_sync.py)
  - prism_dev→query_db (SQL query against prism.duckdb)
  - prism_dev→pipeline_status (last run time, record counts)

Step 5: Verify MCP integration
  - Call prism_dev:run_sync → confirm pipeline executes
  - Call prism_dev:query_db with "SELECT COUNT(*) FROM materials" → confirm result
```

**Rollback:** No destructive changes — scripts already exist
**Exit:** Pipeline runs end-to-end, MCP actions wired, sample data flowing

---

## R12-MS7: Phase Gate
**Effort:** ~8 calls | **Tier:** RELEASE | **Context:** ~10KB
**Response Budget:** ~8KB throughput, ~5KB peak
**Execution:** MCP 100%
  Subagents: safety-physics (physics regression), verifier (full suite)
**Role:** Systems Architect
**Model:** Opus (gate assessment)
**Entry:** R12-MS0 through MS6 COMPLETE.

```
GATE CRITERIA:
  1. ORPHAN SCRIPTS: 0 without disposition
  2. R5-R11 DOCS: All backfilled with actual deliverables
  3. BUILD SIZE: Under 6MB budget, tracking active
  4. SKILL TRIGGERS: 164+ populated, 80%+ context match rate
  5. CC HOOKS: 5 active in .claude/settings.json
  6. SLASH COMMANDS: 5 registered in .claude/commands/
  7. ENGINE SIZES: No engine >50KB (stretch: <40KB)
  8. TEST INFRA: test:all runs, coverage tracked, CI operational
  9. HOOK TELEMETRY: hook_stats and routing_trace functional
  10. INTEGRATION PIPELINE: master_sync.py runs end-to-end
  11. REGRESSION: 150/150 benchmarks, all existing tests pass
  12. BUILD: Clean, under budget

  PASS: 10/12 criteria met (2 WARN allowed)
  FAIL: Any CRITICAL (regression, build, safety) fails
```

**Rollback:** N/A (gate only)
**Exit:** R12 COMPLETE tag, CURRENT_POSITION updated, ROADMAP_TRACKER updated


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PHASE R13: MONOLITH INTELLIGENCE EXTRACTION                 ║
# ╚═══════════════════════════════════════════════════════════════╝

# Status: not-started | Sessions: 8-12 | MS: 7 (MS0-MS6) | Role: Intelligence Architect → Data Architect
# ENV: CC 80% + MCP 20% | Model: Haiku→Sonnet→Opus | CC Subagents: implementer×3, verifier, safety-physics
# Pattern: SCAN → CLASSIFY → EXTRACT → TRANSFORM → WIRE → VALIDATE → DOCUMENT
# DEPENDS ON: R12 complete (clean codebase, test infra, decomposed engines)
# PRODUCES: 7 extracted intelligence modules as TypeScript engines, wired to dispatchers,
#   with test suites, validated against monolith behavior

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R12 hardened the codebase, split oversized engines, activated dev tooling.
  The monolith at C:\PRISM\extracted\ contains 257 engine files, 52 algorithm files,
  12 knowledge base files. Of these, 73 engines are wired. The remaining contain
  unique manufacturing intelligence — especially 7 high-value modules totaling ~27,000
  lines of executable machining knowledge that have never been extracted or wired.

WHAT THIS PHASE DOES: Extract, transform, and wire the 7 highest-value monolith modules
  into production TypeScript engines within the MCP server. This recovers decades of
  machining expertise (rules, best practices, troubleshooting, tool selection, operation
  sequencing, constraint solving, G-code generation) as live, queryable intelligence.

WHAT COMES AFTER: R14 (Product Features) uses this intelligence for the Post Processor
  Framework, Process Planning Engine, Cost Estimation System, and Intelligent Troubleshooter.

ARTIFACT MANIFEST:
  REQUIRES: C:\PRISM\extracted\engines\*, C:\PRISM\extracted\knowledge_bases\*,
    EXTRACTION_PRIORITY_INTELLIGENCE.md, UNREALIZED_FEATURES_AUDIT.md
  PRODUCES: 7+ new TypeScript engines, dispatcher actions, test suites,
    EXTRACTION_MANIFEST.md (what was extracted, where, validation status)

---

## FAULT INJECTION TEST (XA-13)

R13 FAULT TEST: Feed the RulesEngine a material NOT in the database → verify graceful fallback.
  WHEN: After MS2 (RulesEngine wired).
  HOW: Call prism_intelligence:evaluate_rules with material_id="FICTIONAL_UNOBTANIUM"
  EXPECTED: Returns default conservative rules with WARNING "unknown material — using safe defaults."
  PASS: No crash, conservative defaults applied, safety score ≥ 0.70 on defaults.
  FAIL: Crash, null reference, or unsafe defaults.
  EFFORT: ~3 calls.

---

## MONOLITH SOURCE ASSESSMENT

Before extraction, each module needs classification. Not all 27,000 lines are useful.
The monolith was written in ES5-era JavaScript with no types. Extraction means:
  1. READ the .js source from C:\PRISM\extracted\ or the monolith HTML
  2. IDENTIFY the useful logic (rules, formulas, decision trees, lookup tables)
  3. DISCARD UI code, jQuery, DOM manipulation, logging boilerplate
  4. TRANSFORM to TypeScript with proper types, validation, error handling
  5. WIRE to appropriate dispatcher with MCP action
  6. VALIDATE behavior matches original intent (not necessarily exact output)

EXTRACTION PRIORITY (by downstream dependency):
```
[rules_engine.js] ──→ [best_practices.js] ──→ [troubleshooting.js]
        │                                              │
        ▼                                              ▼
[machining_rules.js] ──→ [operation_sequencer.js] ──→ [tool_selector.js]
                                    │
                                    ▼
                          [constraint_engine.js]
                                    │
                                    ▼
                          [gcode_generator.js] (feeds R14 Post Processor)
```

---

## R13-MS0: Monolith Intelligence Scan + Classification
**Effort:** ~20 calls | **Tier:** DEEP | **Context:** ~25KB
**Response Budget:** ~20KB throughput, ~10KB peak
**Execution:** CC 90% | MCP 10%
  CC steps: Steps 1-5 (file scanning, classification)
  MCP steps: Step 6 (registry check)
  Subagents: verifier (scanning), implementer (classification)
  WHY: Bulk file reading and pattern matching = CC territory
**Role:** Intelligence Architect
**Model:** Haiku (scanning) → Opus (classification)
**Entry:** R12 COMPLETE.

```
Step 1: Locate all 7 target modules in monolith
  - Search C:\PRISM\extracted\ for rules_engine, machining_rules, best_practices,
    troubleshooting, operation_sequencer, tool_selector, constraint_engine, gcode_generator
  - If not in extracted/: search monolith HTML file by function name patterns
  - Record: file path, line count, key function names

Step 2: For each module, classify content type:
  - RULES: if/then/else chains, lookup tables, threshold checks
  - FORMULAS: mathematical expressions, physics equations
  - DECISION_TREES: nested conditionals, scoring matrices
  - LOOKUP_TABLES: static data arrays, material-operation mappings
  - UI_BOILERPLATE: DOM manipulation, jQuery, event handlers → DISCARD

Step 3: Estimate extraction complexity per module
  - Count useful lines vs boilerplate
  - Identify cross-dependencies between modules
  - Flag modules that need other modules extracted first
  - Output: EXTRACTION_PLAN.json with module graph + estimates

Step 4: Check for overlap with existing engines
  - Compare monolith module functions against 73 wired engines
  - Flag any duplicates (e.g., if ManufacturingCalculations.ts already does some of this)
  - Purpose: Don't re-extract what's already live

Step 5: Verify monolith is readable
  - Confirm file encoding (UTF-8, ASCII, or mixed)
  - Confirm JavaScript is parseable (run through acorn or esprima)
  - Flag any obfuscated or minified sections

Step 6: Update EXTRACTION_MANIFEST.md
  - Document: module, source path, useful_lines, discard_lines, dependencies, overlap, status
```

**Rollback:** N/A (read-only audit)
**Exit:** EXTRACTION_PLAN.json + EXTRACTION_MANIFEST.md with all 7+ modules classified

---

## R13-MS1: Rules Engine + Machining Rules Extraction
**Effort:** ~25 calls | **Tier:** DEEP | **Context:** ~30KB
**Response Budget:** ~25KB throughput, ~12KB peak
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-3 (extraction, transformation)
  MCP steps: Steps 4-5 (wiring, testing via MCP)
  Subagents: implementer (extraction), safety-physics (rule validation)
  WHY: Code transformation = CC. Physics validation = safety-physics.
**Role:** Intelligence Architect → Safety Engineer
**Model:** Sonnet (extraction) → Opus (validation)
**Entry:** R13-MS0 COMPLETE.

```
Step 1: Extract rules_engine.js (~5,500 lines)
  - Read source, identify rule categories (material rules, tool rules, machine rules,
    safety rules, process rules)
  - Transform each rule to TypeScript interface:
    interface MachiningRule {
      id: string; category: string; condition: (ctx: CuttingContext) => boolean;
      action: (ctx: CuttingContext) => RuleResult; severity: 'info'|'warning'|'critical';
      source: string; // "monolith" | "empirical" | "handbook"
    }
  - Discard: UI rendering, DOM event handlers, jQuery

Step 2: Extract machining_rules.js (~4,200 lines)
  - These are the specific rules (rules_engine is the framework)
  - Transform to rule definitions: material-specific limits, operation-specific constraints,
    tool-machine compatibility matrices
  - Key data structures to preserve:
    - Material→operation compatibility matrix
    - Tool type→material grade recommendations
    - Speed/feed limit overrides by condition (interrupted cut, thin wall, deep hole)

Step 3: Create RulesEngine.ts
  - TypeScript engine with: loadRules(), evaluateRules(context), getRulesByCategory()
  - Rule storage: JSON-serializable for registry integration
  - Evaluation: given material+tool+machine+operation → returns all applicable rules
  - Each rule has confidence score (1.0 for handbook, 0.8 for empirical, 0.6 for heuristic)

Step 4: Wire to MCP
  - Add evaluate_rules action to intelligenceDispatcher
  - Add rule_search action to dataDispatcher (search rules by keyword)
  - Register in all 7 indexing systems

Step 5: Validate
  - Test 10 material/operation combos against known machining handbooks
  - Safety-physics subagent reviews rule outputs for physical plausibility
  - GATE: No rule produces physically impossible recommendations
```

**Rollback:** Remove RulesEngine.ts, revert dispatcher changes
**Exit:** RulesEngine.ts wired, evaluate_rules + rule_search actions live, 10 validation cases pass

---

## R13-MS2: Best Practices + Troubleshooting Extraction
**Effort:** ~20 calls | **Tier:** DEEP | **Context:** ~25KB
**Response Budget:** ~20KB throughput, ~10KB peak
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-3 (extraction, transformation)
  MCP steps: Steps 4-5 (wiring, testing)
  Subagents: implementer, safety-physics
**Role:** Intelligence Architect
**Model:** Sonnet (extraction) → Opus (validation)
**Entry:** R13-MS1 COMPLETE.

```
Step 1: Extract best_practices.js (~3,000 lines)
  - Identify practice categories: setup practices, cutting practices, tool care,
    machine maintenance, quality control, safety protocols
  - Transform to: interface BestPractice { id, category, applicability: ConditionSet,
    recommendation: string, rationale: string, source: string, evidence_level: 1-5 }

Step 2: Extract troubleshooting.js (~2,800 lines)
  - Identify: symptom→cause→fix decision trees
  - Transform to: interface TroubleshootingTree { symptom: string,
    possibleCauses: Array<{ cause: string, probability: number, diagnosticSteps: string[],
    fix: string, prevention: string }> }
  - This directly feeds the Intelligent Troubleshooter (unrealized B8)

Step 3: Create BestPracticesEngine.ts + TroubleshootingEngine.ts
  - BestPracticesEngine: getRecommendations(context) → ranked practices
  - TroubleshootingEngine: diagnose(symptoms) → ranked causes with fixes
  - Both integrate with existing FailureForensicsEngine.ts (31.9KB) and
    DecisionTreeEngine.ts (58.6KB)

Step 4: Wire to MCP
  - Add best_practice_lookup to intelligenceDispatcher
  - Add troubleshoot action to intelligenceDispatcher
  - These enhance existing failure_diagnose (R3) with structured decision trees

Step 5: Validate
  - Test troubleshooter with 5 common CNC problems:
    chatter, tool breakage, poor surface finish, dimensional inaccuracy, chip evacuation
  - Each should return plausible causes ranked by probability
```

**Rollback:** Remove engines, revert dispatchers
**Exit:** BestPracticesEngine + TroubleshootingEngine wired, 5 diagnostic scenarios pass

---

## R13-MS3: Optimization Suite Extraction
**Effort:** ~30 calls | **Tier:** DEEP | **Context:** ~35KB
**Response Budget:** ~25KB throughput, ~15KB peak
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-4 (extraction)
  MCP steps: Steps 5-6 (wiring, testing)
  Subagents: implementer×2 (parallel extraction), safety-physics
**Role:** Intelligence Architect → Systems Architect
**Model:** Sonnet (extraction) → Opus (architecture + safety)
**Entry:** R13-MS2 COMPLETE.

```
Step 1: Extract operation_sequencer.js (~3,200 lines)
  - Key logic: given a set of operations, determine optimal order
  - Factors: setup minimization, tool change minimization, rigidity sequence (heavy→light)
  - Transform to: OperationSequencer class with optimize(operations: Operation[]) method
  - Integrate with existing IntelligenceEngine job_plan action

Step 2: Extract tool_selector.js (~3,500 lines)
  - Key logic: given material + operation + machine → recommend optimal tool
  - Multi-objective: minimize cost, maximize tool life, maximize MRR, maintain quality
  - Transform to: ToolSelectorEngine with selectTool(context) → ranked recommendations
  - Enhance existing tool_recommend action (R3) with this deeper logic

Step 3: Extract constraint_engine.js (~2,400 lines)
  - Key logic: validate that a machining plan satisfies all constraints
  - Constraints: machine envelope, spindle power, tool reach, fixture clearance
  - Transform to: ConstraintEngine with validate(plan) → { valid, violations[] }
  - Integrate with safety validation chain

Step 4: Extract cost_optimizer.js (~3,200 lines)
  - Key logic: find minimum-cost cutting parameters that satisfy quality constraints
  - Uses Taylor tool life + machine rate + operator rate
  - Transform to: CostOptimizerEngine with optimize(context) → optimal params + cost
  - Enhance existing process_cost_calc action (R3)

Step 5: Wire all 4 to MCP
  - operation_sequence action → intelligenceDispatcher
  - tool_select_advanced action → intelligenceDispatcher  
  - constraint_validate action → safetyDispatcher
  - cost_optimize action → calcDispatcher

Step 6: Integration test
  - Full pipeline: material + part features → operation_sequence → tool_select_advanced
    → constraint_validate → cost_optimize → job_plan enhanced
  - Test with 3 part scenarios: simple (1 op), medium (3 ops), complex (6+ ops)
```

**Rollback:** Remove 4 engines, revert dispatchers
**Exit:** 4 engines wired, 3 integration scenarios pass, job_plan enhanced

---

## R13-MS4: G-Code Generator Extraction (feeds R14)
**Effort:** ~20 calls | **Tier:** DEEP | **Context:** ~25KB
**Response Budget:** ~20KB throughput, ~10KB peak
**Execution:** CC 60% | MCP 40%
  CC steps: Steps 1-2 (extraction)
  MCP steps: Steps 3-5 (wiring, validation, safety)
  Subagents: implementer, safety-physics
  WHY: G-code generation is SAFETY-CRITICAL — physics review mandatory
**Role:** Safety Engineer → Intelligence Architect
**Model:** Sonnet (extraction) → Opus (safety validation)
**Entry:** R13-MS3 COMPLETE.

```
Step 1: Extract gcode_generator.js (~5,500 lines)
  - Key components: block formatting, modal group tracking, coordinate output,
    canned cycle generation, tool change sequences, safe start blocks
  - Existing: GCodeTemplateEngine.ts (49.6KB) already has template-based generation
  - Goal: Extract the LOGIC, not the templates — how to sequence blocks, track modals,
    handle coordinate systems

Step 2: Create GCodeLogicEngine.ts
  - ModalGroupTracker: tracks active G-codes per modal group, prevents conflicts
  - BlockFormatter: N-numbering, coordinate format, feed format per controller dialect
  - CycleGenerator: canned cycle output (G81-G89) with proper retract/clear plane
  - SafeStartGenerator: per-controller safe start block (G90 G94 G17 G40 G49 G80)
  - Interface with GCodeTemplateEngine for template-based generation

Step 3: Wire to MCP
  - Add gcode_generate action to calcDispatcher (takes UIR → outputs G-code string)
  - Add modal_check action to safetyDispatcher (validates modal group consistency)
  - SAFETY: modal_check must verify no conflicting modals in generated code

Step 4: Validate with known good programs
  - Generate G-code for 3 simple operations (face, pocket, drill pattern)
  - Compare against known good Hurco programs
  - Verify: safe start block present, no conflicting modals, proper retract

Step 5: Safety-physics review
  - Review all generated G-code for safety violations
  - Verify: no rapid moves into material, proper Z-clear heights, coolant on before cut
  - GATE: S(x) ≥ 0.70 on all 3 test programs
```

**Rollback:** Remove GCodeLogicEngine.ts, revert dispatchers
**Exit:** GCodeLogicEngine wired, 3 test programs generated, safety-physics PASS

---

## R13-MS5: Extracted Engine Audit (257 → classified)
**Effort:** ~15 calls | **Tier:** STANDARD | **Context:** ~15KB
**Response Budget:** ~12KB throughput, ~8KB peak
**Execution:** CC 90% | MCP 10%
  CC steps: Steps 1-3 (scanning)
  MCP steps: Step 4 (registry update)
  Subagents: verifier (scanning)
**Role:** Intelligence Architect
**Model:** Haiku (scanning) → Sonnet (classification)
**Entry:** R13-MS4 COMPLETE (can run parallel with MS4).

```
Step 1: Scan all 257 files in C:\PRISM\extracted\engines\
  - For each: file name, size, top-level exports/functions
  - Quick-classify: WIRED (matches existing engine), CANDIDATE (unique logic),
    DUPLICATE (overlaps existing), ARCHIVE (UI/boilerplate only)

Step 2: Cross-reference with 73 wired engines
  - Match by function name, class name, or domain
  - Flag candidates for R7 (Physics Evolution) or R14 (Products)

Step 3: Write EXTRACTED_ENGINE_CLASSIFICATION.md
  - Full inventory with disposition per file
  - Highlight top 20 unwired candidates by size and uniqueness

Step 4: Update MASTER_INDEX and knowledge indexes
  - Add candidate engines to DATA_TAXONOMY.json
  - Update EXECUTION_CHAIN.json with new wired engines from MS1-MS4
```

**Rollback:** N/A (read-only audit + docs)
**Exit:** 257 engines classified, top 20 candidates identified for future phases

---

## R13-MS6: Phase Gate
**Effort:** ~8 calls | **Tier:** RELEASE | **Context:** ~10KB
**Execution:** MCP 100%
  Subagents: safety-physics, verifier
**Role:** Systems Architect
**Model:** Opus
**Entry:** R13-MS0 through MS5 COMPLETE.

```
GATE CRITERIA:
  1. RULES ENGINE: evaluate_rules action returns valid rules for 10 test cases
  2. TROUBLESHOOTER: diagnose returns ranked causes for 5 common problems
  3. OPERATION SEQUENCER: optimize returns valid sequence for 3 scenarios
  4. TOOL SELECTOR: selectTool returns physically valid recommendations
  5. CONSTRAINT ENGINE: validate catches known violations (over-power, over-reach)
  6. COST OPTIMIZER: optimize returns cost < 10x naive calculation
  7. G-CODE GENERATOR: 3 test programs pass safety-physics review (S(x) ≥ 0.70)
  8. EXTRACTED ENGINE AUDIT: 257 engines classified with dispositions
  9. REGRESSION: All existing tests pass (benchmarks, enterprise, intelligence)
  10. BUILD: Clean, under budget

  PASS: 8/10 met (2 WARN allowed, but #7 safety is HARD BLOCK)
  FAIL: Any safety failure or regression
```

**Exit:** R13 COMPLETE tag, 7 new engines wired, EXTRACTION_MANIFEST.md finalized


# ╔═══════════════════════════════════════════════════════════════╗
# ║  PHASE R14: PRODUCT FEATURES (Post Processor, Quoting,       ║
# ║             Process Planning, Intelligent Troubleshooting)   ║
# ╚═══════════════════════════════════════════════════════════════╝

# Status: not-started | Sessions: 12-16 | MS: 9 (MS0-MS8) | Role: Product Manager → Intelligence Architect
# ENV: CC 60% + MCP 40% | Model: Sonnet→Opus | CC Subagents: implementer×3, safety-physics, verifier
# Pattern: DESIGN → IMPLEMENT → INTEGRATE → VALIDATE → SHIP
# DEPENDS ON: R13 complete (monolith intelligence wired — rules, sequencer, G-code, cost optimizer)
# PRODUCES: 4 flagship product features, REST API endpoints for each, test suites,
#   product documentation

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R13 extracted and wired 7 monolith intelligence modules. R12 hardened the
  codebase and activated dev tooling. The system now has: rules engine, troubleshooting trees,
  operation sequencing, tool selection, constraint validation, cost optimization, and G-code
  generation logic — all as live MCP actions.

WHAT THIS PHASE DOES: Build the 4 highest-impact product features that make PRISM commercially
  viable. Each feature composes existing engines + R13 intelligence into end-user products:
  1. POST PROCESSOR FRAMEWORK — Universal G-code generation for 12+ controllers
  2. COST ESTIMATION / QUOTING — Full job costing → competitive quote
  3. PROCESS PLANNING ENGINE — Part features → optimized operation sequence
  4. INTELLIGENT TROUBLESHOOTER — Probabilistic alarm diagnosis with fix recommendations

WHAT COMES AFTER: These are the products that justify PRISM's existence. After R14:
  - User testing and iteration (feedback loops)
  - Manufacturer catalog parsing (expand tool database with R14 framework)
  - Additional controller support (build on post processor framework)
  - Market deployment

ARTIFACT MANIFEST:
  REQUIRES: R13 engines (RulesEngine, TroubleshootingEngine, OperationSequencer,
    ToolSelectorEngine, ConstraintEngine, CostOptimizerEngine, GCodeLogicEngine),
    extracted/controllers/*.json (alarm data), skills (prism-post-processor-reference,
    prism-fanuc-programming, prism-siemens-programming, etc.)
  PRODUCES: PostProcessorFramework.ts, QuotingEngine.ts, ProcessPlanningEngine.ts,
    IntelligentTroubleshooterEngine.ts, REST endpoints, test suites, user documentation

---

## FAULT INJECTION TEST (XA-13)

R14 FAULT TEST: Feed the Post Processor an operation with spindle speed EXCEEDING machine max RPM.
  WHEN: After MS1 (Post Processor Framework) is complete.
  HOW: Call gcode_post with { controller: "fanuc", spindle_speed: 999999, ... }
  EXPECTED: Returns BLOCKED with "Spindle speed 999999 RPM exceeds machine max of 12000 RPM"
  PASS: Hard block, no G-code generated, safety score < 0.70 triggers refusal.
  FAIL: G-code generated with unsafe spindle speed.
  EFFORT: ~3 calls.

---

## R14-MS0: Product Architecture + API Design
**Effort:** ~15 calls | **Tier:** DEEP | **Context:** ~20KB
**Response Budget:** ~15KB throughput, ~10KB peak
**Execution:** MCP 80% | CC 20%
  MCP steps: Steps 1-4 (architecture design, API spec)
  CC steps: Step 5 (file scaffolding)
  Subagents: none (architect-level work, human-in-loop recommended)
  WHY: Architecture decisions require Opus + human judgment
**Role:** Product Manager → Systems Architect
**Model:** Opus
**Entry:** R13 COMPLETE.

```
Step 1: Define product API contracts
  For each of the 4 products, define:
  - Input schema (what the user provides)
  - Output schema (what they get back)
  - Error schema (what can go wrong)
  - Dependency graph (which engines compose)

  POST PROCESSOR:
    Input: { controller: string, operations: Operation[], machine?: string, options?: PostOptions }
    Output: { gcode: string, summary: ProgramSummary, warnings: Warning[], safety: SafetyReport }
    Engines: GCodeLogicEngine → GCodeTemplateEngine → ConstraintEngine → SafetyValidator

  QUOTING:
    Input: { material: string, operations: Operation[], batch_size: number, shop_rate?: number }
    Output: { quote: Quote, breakdown: CostBreakdown, alternatives: Alternative[] }
    Engines: CostOptimizerEngine → ToolSelectorEngine → OperationSequencer → process_cost_calc

  PROCESS PLANNING:
    Input: { features: Feature[], material: string, machine?: string, constraints?: Constraint[] }
    Output: { plan: ProcessPlan, operations: Operation[], tooling: ToolList, estimated_time: Duration }
    Engines: OperationSequencer → ToolSelectorEngine → ConstraintEngine → RulesEngine

  INTELLIGENT TROUBLESHOOTER:
    Input: { symptoms: string[], alarm_code?: string, controller?: string, context?: MachineContext }
    Output: { diagnosis: Diagnosis[], confidence: number, recommended_actions: Action[] }
    Engines: TroubleshootingEngine → AlarmRegistry → KnowledgeGraphEngine → BestPracticesEngine

Step 2: REST endpoint design
  - POST /api/v1/post-process → PostProcessorFramework
  - POST /api/v1/quote → QuotingEngine
  - POST /api/v1/process-plan → ProcessPlanningEngine
  - POST /api/v1/troubleshoot → IntelligentTroubleshooterEngine
  All with auth (F7 Bridge), audit logging, correlation IDs

Step 3: Composition DAG per product
  - Draw the engine composition for each product
  - Identify shared engines (ConstraintEngine used by 3 products)
  - Identify parallel vs sequential steps

Step 4: Safety classification per product
  - POST PROCESSOR: CRITICAL (generates machine instructions)
  - QUOTING: STANDARD (financial, not physical safety)
  - PROCESS PLANNING: HIGH (recommends operations + tooling)
  - TROUBLESHOOTER: STANDARD (advisory, human makes final call)

Step 5: Scaffold files
  - Create empty typed shells for all 4 engines
  - Create test file scaffolds
  - Create REST endpoint scaffolds
```

**Rollback:** Remove scaffolds
**Exit:** API contracts documented, composition DAGs drawn, scaffolds created

---

## R14-MS1: Post Processor Framework
**Effort:** ~35 calls | **Tier:** DEEP | **Context:** ~40KB
**Response Budget:** ~30KB throughput, ~15KB peak
**Execution:** CC 60% | MCP 40%
  CC steps: Steps 1-3 (implementation)
  MCP steps: Steps 4-6 (safety validation, testing)
  Subagents: implementer (code), safety-physics (mandatory review)
  WHY: G-code generation is SAFETY-CRITICAL. Every line of output must be reviewed.
**Role:** Safety Engineer → Intelligence Architect
**Model:** Sonnet (implementation) → Opus (safety review)
**Entry:** R14-MS0 COMPLETE.

```
Step 1: Universal Intermediate Representation (UIR)
  - Define UIR schema: tool calls, moves (rapid/linear/arc), cycles, coolant, spindle
  - UIR is controller-agnostic — represents INTENT not G-code
  - TypeScript interfaces for all UIR node types
  - UIR validates: no move without tool, no cut without spindle, proper retract sequence

Step 2: Controller Dialect Translators
  - Create dialect modules for top 6 controllers:
    FANUC (most common), HAAS (uses Fanuc dialect + extensions),
    SIEMENS (Sinumerik 840D — fundamentally different syntax),
    MAZAK (Mazatrol + EIA), OKUMA (OSP), HURCO (WinMax + EIA)
  - Each dialect: safe start block, tool change sequence, modal groups,
    coordinate format, canned cycles, program end
  - Use existing skills as reference (prism-fanuc-programming, prism-siemens-programming)
  - Use R13 GCodeLogicEngine for modal tracking and block formatting

Step 3: PostProcessorFramework.ts
  - Orchestrator: UIR → dialect selection → generation → safety check → output
  - Configuration: machine-specific overrides (max RPM, axis limits, custom M-codes)
  - Output: G-code string + program summary (tool list, estimated time, axis ranges)
  - WARNING system: flag any parameter near machine limits

Step 4: Safety validation (MANDATORY)
  - Safety-physics subagent reviews PostProcessorFramework design
  - Verify: no rapid into material possible, retract heights always safe,
    spindle/feed never exceed machine limits, coolant on before cutting
  - Add safety_check() call BEFORE returning any G-code
  - HARD BLOCK: if safety_check() fails, return error, NOT G-code

Step 5: Test with known programs
  - Generate G-code for 5 standard operations across 3 controllers (FANUC, HAAS, HURCO):
    face mill, pocket, drill pattern, contour, thread mill = 15 test programs
  - Compare output structure against known good programs
  - Verify: each program is syntactically valid for its controller

Step 6: Wire to MCP + REST
  - prism_product:post_process action in productDispatcher
  - POST /api/v1/post-process endpoint in bridge
  - Full audit logging for every G-code generation (compliance requirement)
```

**Rollback:** Remove PostProcessorFramework.ts, revert dispatchers
**Exit:** 6 controller dialects, 15 test programs pass, safety-physics PASS, REST endpoint live

---

## R14-MS2: Cost Estimation / Quoting Engine
**Effort:** ~25 calls | **Tier:** DEEP | **Context:** ~30KB
**Response Budget:** ~25KB throughput, ~12KB peak
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-3 (implementation)
  MCP steps: Steps 4-5 (validation, wiring)
  Subagents: implementer, verifier
  WHY: Financial calculations = implementation. Plausibility = verification.
**Role:** Intelligence Architect → Product Manager
**Model:** Sonnet (implementation) → Opus (architecture review)
**Entry:** R14-MS0 COMPLETE (can run parallel with MS1).

```
Step 1: Cost model architecture
  - Build on R3 process_cost_calc + R13 CostOptimizerEngine
  - Full cost breakdown:
    MATERIAL: weight × material_cost_per_kg + waste_factor
    MACHINING: Σ(operation_time × machine_rate) for each operation
    TOOLING: Σ(tool_cost / parts_per_edge) for each tool used
    SETUP: setup_time × operator_rate × number_of_setups
    OVERHEAD: (material + machining + tooling + setup) × overhead_factor
    PROFIT: subtotal × margin_percentage

Step 2: QuotingEngine.ts
  - Input: material, operations[], batch_size, shop_config
  - shop_config: machine_rate ($/hr), operator_rate ($/hr), overhead_factor, margin_%
  - Uses: R13 OperationSequencer (optimal order), R13 ToolSelector (optimal tools),
    R13 CostOptimizer (optimal parameters), R3 wear_prediction (tool life)
  - Output: detailed quote with line-item breakdown

Step 3: Batch economics
  - Calculate setup cost amortization across batch
  - Break-even analysis: at what batch size is this job profitable?
  - Alternative scenarios: different machines, different tooling
  - Competitive pricing: compare against historical quotes (if data exists)

Step 4: Validate with real-world examples
  - Quote 3 realistic jobs:
    Simple: aluminum bracket (1 setup, 3 ops, 100pc batch)
    Medium: steel gear blank (2 setups, 6 ops, 25pc batch)
    Complex: titanium aerospace part (4 setups, 12 ops, 5pc batch)
  - Verify quotes are within reasonable range for each industry

Step 5: Wire to MCP + REST
  - prism_product:generate_quote action
  - POST /api/v1/quote endpoint
  - prism_product:quote_compare (compare 2 approaches side-by-side)
```

**Rollback:** Remove QuotingEngine.ts
**Exit:** 3 realistic quotes generated, breakdown plausible, REST endpoint live

---

## R14-MS3: Process Planning Engine
**Effort:** ~30 calls | **Tier:** DEEP | **Context:** ~35KB
**Response Budget:** ~25KB throughput, ~15KB peak
**Execution:** CC 60% | MCP 40%
  CC steps: Steps 1-3 (implementation)
  MCP steps: Steps 4-6 (validation, safety, wiring)
  Subagents: implementer, safety-physics
  WHY: Process plans affect physical machining — safety review mandatory
**Role:** Intelligence Architect → Safety Engineer
**Model:** Sonnet (implementation) → Opus (safety + architecture)
**Entry:** R14-MS1 COMPLETE (needs Post Processor for G-code output).

```
Step 1: Feature-to-operation mapping
  - Define feature library: holes, pockets, slots, faces, contours, threads, chamfers
  - Each feature maps to 1+ operations: drill→ream, rough→finish, etc.
  - Rules from R13 RulesEngine determine: operation type, sequence constraints,
    tool requirements, surface finish requirements

Step 2: ProcessPlanningEngine.ts
  - Input: feature list + material + available machines
  - Pipeline:
    features → operation_mapping (Step 1)
    operations → sequence_optimization (R13 OperationSequencer)
    sequenced_ops → tool_selection (R13 ToolSelector)
    tooled_ops → constraint_validation (R13 ConstraintEngine)
    valid_plan → cost_estimation (R14-MS2 QuotingEngine)
    costed_plan → output with G-code option (R14-MS1 PostProcessor)

Step 3: Machine selection intelligence
  - Given multiple available machines: score each by:
    capability (can it do the operations?), utilization (is it available?),
    cost (hourly rate), quality (achievable tolerances)
  - Recommend best machine or ranked alternatives

Step 4: Validate with real parts
  - Plan 3 parts:
    Prismatic: rectangular bracket with holes and pockets
    Rotational: shaft with threads and keyway
    Complex: aerospace fitting with compound angles
  - Verify: operation sequence is logical, tools are appropriate,
    constraints are met, cost estimate is reasonable

Step 5: Safety review
  - Safety-physics reviews process plans for:
    operation order safety (roughing before finishing)
    fixturing adequacy (enough clamping for cutting forces)
    tool reach (no collisions with fixtures)
  - GATE: All 3 test plans pass safety review

Step 6: Wire to MCP + REST
  - prism_product:process_plan action
  - POST /api/v1/process-plan endpoint
  - prism_product:plan_compare (compare plans for different machines)
```

**Rollback:** Remove ProcessPlanningEngine.ts
**Exit:** 3 test parts planned, safety-physics PASS, REST endpoint live

---

## R14-MS4: Intelligent Troubleshooter
**Effort:** ~20 calls | **Tier:** DEEP | **Context:** ~25KB
**Response Budget:** ~20KB throughput, ~10KB peak
**Execution:** CC 60% | MCP 40%
  CC steps: Steps 1-2 (implementation)
  MCP steps: Steps 3-5 (wiring, testing, knowledge integration)
  Subagents: implementer, verifier
**Role:** Intelligence Architect
**Model:** Sonnet (implementation) → Opus (knowledge validation)
**Entry:** R14-MS0 COMPLETE (can run parallel with MS2/MS3).

```
Step 1: Bayesian diagnosis engine
  - Prior probabilities: from troubleshooting.js decision trees (R13-MS2)
  - Evidence: alarm codes, symptoms, machine context
  - Update: P(cause|evidence) using Bayes' rule
  - Output: ranked causes with posterior probabilities + confidence intervals
  - Uses 10,033 alarm codes across 12 controller families as evidence base

Step 2: IntelligentTroubleshooterEngine.ts
  - Input: { symptoms[], alarm_code?, controller?, recent_operations? }
  - Pipeline:
    symptoms → keyword extraction → TroubleshootingEngine.diagnose()
    alarm_code → AlarmRegistry.decode() → related failures
    Combine: Bayesian update with all evidence
    Output: ranked diagnoses with:
      - Probability (e.g., "87% likely: worn tool")
      - Diagnostic steps ("Check tool flank wear with magnifier")
      - Fix ("Replace insert, verify offset")
      - Prevention ("Enable PFP monitoring for this operation")
      - Related alarms ("Also check: alarm 205, 301")

Step 3: Knowledge graph integration
  - Link to BestPracticesEngine: after diagnosis, recommend prevention practices
  - Link to RulesEngine: check if violated rules caused the issue
  - Link to FailureForensicsEngine: cross-reference with historical failures

Step 4: Test with 10 scenarios
  - 5 alarm-based: FANUC alarm 401 (servo overload), HAAS alarm 108 (axis overtravel),
    HURCO 2006 (spindle fault), OKUMA 1015 (turret), generic E-stop
  - 5 symptom-based: chatter, tool breakage, dimensional error, poor finish, chip problem
  - Each should return top 3 causes with probabilities summing to ~1.0

Step 5: Wire to MCP + REST
  - prism_product:troubleshoot action
  - POST /api/v1/troubleshoot endpoint
  - Enhance existing alarm_decode action with troubleshooter link
```

**Rollback:** Remove IntelligentTroubleshooterEngine.ts
**Exit:** 10 scenarios pass, probabilities plausible, REST endpoint live

---

## R14-MS5: Manufacturer Catalog Parsing Pipeline
**Effort:** ~20 calls | **Tier:** STANDARD | **Context:** ~20KB
**Response Budget:** ~15KB throughput, ~10KB peak
**Execution:** CC 90% | MCP 10%
  CC steps: Steps 1-4 (Python scripts, PDF processing)
  MCP steps: Step 5 (registry loading)
  Subagents: implementer (scripts), verifier (data validation)
**Role:** Data Architect → Integration Engineer
**Model:** Sonnet (scripts) → Haiku (validation)
**Entry:** R14-MS1 COMPLETE (tool data needed for post processor).

```
Step 1: Catalog inventory
  - Scan C:\PRISM\MANUFACTURER_CATALOGS\ (116 PDFs)
  - Classify by manufacturer: Sandvik, Kennametal, Iscar, Seco, Walter, etc.
  - Classify by tool type: inserts, endmills, drills, taps, holders

Step 2: PDF parsing pipeline
  - Python script using pdfplumber or camelot for table extraction
  - Target data: tool ID, diameter, flute count, coating, material compatibility,
    recommended speed/feed ranges, tool life estimates
  - Output: JSON per manufacturer in standardized schema

Step 3: Schema normalization
  - Map manufacturer-specific fields to PRISM ToolRegistry schema
  - Handle unit conversions (imperial↔metric)
  - Handle naming variations (TiAlN vs PVD-TiAlN)

Step 4: Validate extracted data
  - Spot-check 10 tools per major manufacturer against paper catalog
  - Flag any physically implausible values (diameter=0, flutes=99)
  - Quality score: % of records with complete key fields

Step 5: Load into ToolRegistry
  - Run integration pipeline to load new tools
  - Verify: tool_facets shows new manufacturers
  - Verify: tool search finds newly loaded tools
```

**Rollback:** Don't modify existing tool data — new data loads separately
**Exit:** 116 catalogs scanned, top 3 manufacturers parsed, data loaded and searchable

---

## R14-MS6: Tool Holder Schema v2 Upgrade
**Effort:** ~15 calls | **Tier:** STANDARD | **Context:** ~15KB
**Execution:** CC 70% | MCP 30%
  CC steps: Steps 1-3 (data work)
  MCP steps: Steps 4-5 (wiring, testing)
  Subagents: implementer
**Role:** Data Architect
**Model:** Sonnet
**Entry:** R14-MS1 COMPLETE (parallel with MS5).

```
Step 1: Audit current holder data (10 files in data/tool_holders/)
  - Count holders, current parameter count, missing parameters
  - Reference: TOOL_HOLDER_DATABASE_ROADMAP_v4.md (85-param target)

Step 2: Add 20 missing parameters to schema
  - Collision envelope (OD, total length, clearance profile)
  - Chatter characteristics (overhang ratio, damping coefficient)
  - Speed/feed derating factors (by overhang, by holder type)
  - Simulation geometry (3D bounding box, interference zones)

Step 3: Populate missing params for existing holders
  - Use manufacturer data where available
  - Use engineering estimates where not (with confidence flag)
  - Run physics plausibility checks on all values

Step 4: Wire derating into speed/feed calculator
  - When tool holder is specified: apply derating to recommended parameters
  - Overhang > 4:1 → reduce depth of cut, reduce speed
  - ER collet holding → reduce aggressive cuts (less rigidity)

Step 5: Test derating
  - Same tool, same material, 3 different holders (shrink fit, ER, Weldon)
  - Verify: shrink fit gets most aggressive params, ER gets most conservative
```

**Rollback:** Revert schema changes
**Exit:** 85-param schema active, derating wired, 3 holder comparison passes

---

## R14-MS7: REST API Expansion + Documentation
**Effort:** ~12 calls | **Tier:** STANDARD | **Context:** ~12KB
**Execution:** CC 80% | MCP 20%
  CC steps: Steps 1-3 (endpoints + docs)
  MCP steps: Step 4 (testing)
  Subagents: implementer, verifier
**Role:** Platform Engineer
**Model:** Sonnet
**Entry:** R14-MS4 COMPLETE.

```
Step 1: Add remaining high-value REST endpoints (IMP-R4-1)
  - POST /api/v1/toolpath-strategy
  - POST /api/v1/wear-predict
  - POST /api/v1/what-if
  - POST /api/v1/material-substitute
  Total API: 13 endpoints (5 from R4 + 4 from R14 products + 4 new)

Step 2: OpenAPI/Swagger spec
  - Generate OpenAPI 3.0 spec for all 13 endpoints
  - Include request/response schemas, error codes, auth requirements
  - Output: openapi.yaml or openapi.json

Step 3: API documentation
  - README-style docs with: endpoint list, auth guide, example requests/responses
  - Quick-start guide for external integrators
  - Rate limits, error handling, versioning policy

Step 4: Integration test
  - Hit every endpoint with valid + invalid requests
  - Verify: auth required, rate limiting works, errors structured correctly
  - Load test: 100 requests in 10 seconds to top 3 endpoints
```

**Rollback:** Remove new endpoints
**Exit:** 13 REST endpoints live, OpenAPI spec generated, docs written

---

## R14-MS8: Phase Gate
**Effort:** ~10 calls | **Tier:** RELEASE | **Context:** ~12KB
**Execution:** MCP 100%
  Subagents: safety-physics, verifier
**Role:** Product Manager → Systems Architect
**Model:** Opus
**Entry:** R14-MS0 through MS7 COMPLETE.

```
GATE CRITERIA:
  1. POST PROCESSOR: 6 controller dialects, 15 test programs, safety PASS
  2. QUOTING: 3 realistic jobs quoted with plausible breakdowns
  3. PROCESS PLANNING: 3 test parts planned, safety PASS
  4. TROUBLESHOOTER: 10 scenarios diagnosed with probabilities
  5. CATALOG PARSING: Top 3 manufacturers parsed, data loaded
  6. TOOL HOLDERS: 85-param schema, derating active
  7. REST API: 13 endpoints, OpenAPI spec, auth enforced
  8. REGRESSION: All existing tests pass (benchmarks, enterprise, intelligence, R12, R13)
  9. BUILD: Clean, under budget
  10. DOCUMENTATION: API docs + quick-start guide exist

  PASS: 8/10 met (2 WARN allowed, but #1 safety is HARD BLOCK)
  FAIL: Any safety failure, regression, or build failure

  Ω CALCULATION:
    Feature completeness: 4/4 products = 1.0
    Test coverage: target 80%+ = 0.8-1.0
    Safety: must be ≥ 0.70
    Data quality: catalog parsing + holder schema = bonus
    Target Ω: ≥ 0.75
```

**Exit:** R14 COMPLETE tag, PRISM is a commercially viable product


# ═══════════════════════════════════════════════════════════════
# PART 3: SUMMARY, DAGS, AND ROLE/MODEL/EFFORT ASSIGNMENTS
# ═══════════════════════════════════════════════════════════════

---

## 3.1 PHASE DEPENDENCY CHAIN

```
[P0 DA R1 R2 R3 R4 R5-R11] ──(COMPLETE)──→ [R12] ──→ [R13] ──→ [R14]
                                               │                    │
                                               │   (parallel OK)    │
                                               └────────────────────┘
                                               R12 is prerequisite for both
                                               R13 and R14 can overlap after R13-MS4
```

## 3.2 TOTAL ESTIMATES

| Phase | Sessions | Milestones | Est. Tool Calls | New Engines | New Actions | New Tests |
|-------|----------|------------|-----------------|-------------|-------------|-----------|
| R12   | 6-8      | 8 (MS0-MS7)| 115-135         | 0 (refactor)| 4-6 dev     | 50+ (coverage) |
| R13   | 8-12     | 7 (MS0-MS6)| 140-170         | 7-9 new     | 10-15 intel | 30-40 |
| R14   | 12-16    | 9 (MS0-MS8)| 180-220         | 4-6 new     | 15-20 product| 50-60 |
| **TOTAL** | **26-36** | **24** | **435-525** | **11-15** | **29-41** | **130-150** |

## 3.3 ROLE / MODEL / EFFORT MATRIX — R12, R13, R14

### R12: DEVELOPMENT INFRASTRUCTURE + QUALITY HARDENING

| MS | Title | Role | Model | Effort | Sessions |
|----|-------|------|-------|--------|----------|
| MS0 | Housekeeping + Historical Backfill | Verifier → Platform Engineer | Haiku→Sonnet | M (15) | 1 |
| MS1 | Skill Trigger Activation | Context Engineer | Haiku→Sonnet | L (20) | 1-2 |
| MS2 | CC_DEFERRED Backlog | Platform Engineer | Sonnet (CC) | L (25) | 2 |
| MS3 | Engine Decomposition | Systems Architect | Sonnet (CC)→Opus | L (30) | 2 |
| MS4 | Unified Test Infrastructure | Production Engineer | Sonnet | M (15) | 1 |
| MS5 | Hook Telemetry + AutoPilot Tracing | Platform Engineer | Sonnet | S (10) | 0.5 |
| MS6 | Integration Pipeline Activation | Integration Engineer | Sonnet | M (12) | 1 |
| MS7 | Phase Gate | Systems Architect | Opus | S (8) | 0.5 |

### R13: MONOLITH INTELLIGENCE EXTRACTION

| MS | Title | Role | Model | Effort | Sessions |
|----|-------|------|-------|--------|----------|
| MS0 | Intelligence Scan + Classification | Intelligence Architect | Haiku→Opus | L (20) | 1-2 |
| MS1 | Rules Engine + Machining Rules | Intel Arch → Safety Eng | Sonnet→Opus | L (25) | 2 |
| MS2 | Best Practices + Troubleshooting | Intelligence Architect | Sonnet→Opus | L (20) | 1-2 |
| MS3 | Optimization Suite (4 engines) | Intel Arch → Sys Arch | Sonnet→Opus | XL (30) | 2-3 |
| MS4 | G-Code Generator | Safety Eng → Intel Arch | Sonnet→Opus | L (20) | 1-2 |
| MS5 | Extracted Engine Audit (257 files) | Intelligence Architect | Haiku→Sonnet | M (15) | 1 |
| MS6 | Phase Gate | Systems Architect | Opus | S (8) | 0.5 |

### R14: PRODUCT FEATURES

| MS | Title | Role | Model | Effort | Sessions |
|----|-------|------|-------|--------|----------|
| MS0 | Product Architecture + API Design | Product Mgr → Sys Arch | Opus | M (15) | 1 |
| MS1 | Post Processor Framework | Safety Eng → Intel Arch | Sonnet→Opus | XL (35) | 3-4 |
| MS2 | Cost Estimation / Quoting | Intel Arch → Product Mgr | Sonnet→Opus | L (25) | 2 |
| MS3 | Process Planning Engine | Intel Arch → Safety Eng | Sonnet→Opus | XL (30) | 2-3 |
| MS4 | Intelligent Troubleshooter | Intelligence Architect | Sonnet→Opus | L (20) | 1-2 |
| MS5 | Manufacturer Catalog Parsing | Data Arch → Integ Eng | Sonnet→Haiku | L (20) | 1-2 |
| MS6 | Tool Holder Schema v2 | Data Architect | Sonnet | M (15) | 1 |
| MS7 | REST API Expansion + Docs | Platform Engineer | Sonnet | M (12) | 1 |
| MS8 | Phase Gate | Product Mgr → Sys Arch | Opus | S (10) | 0.5 |

## 3.4 TASK DAG — R14 (most complex)

```
                    [MS0: Architecture]
                    /    |     |     \
                   /     |     |      \
                  v      v     v       v
            [MS1:Post] [MS2:Quote] [MS3:Plan] [MS4:Troubleshoot]
                |         |         |              |
                |    [MS5:Catalogs] |              |
                |         |    [MS6:Holders]       |
                |         |         |              |
                v         v         v              v
            ──────────────────────────────────────────
                          |
                    [MS7: REST + Docs]
                          |
                    [MS8: PHASE GATE]

PARALLEL OPPORTUNITIES:
  MS1 + MS4 can run in parallel (no dependencies on each other)
  MS2 can start after MS0 (independent of MS1)
  MS5 + MS6 can start after MS1 (need post processor framework for validation)
  MS3 needs MS1 (post processor) + MS2 (quoting) for full pipeline
```

## 3.5 ITEMS DEFERRED (not in R12-R14)

These items from the unrealized features audit are intentionally NOT included because
they are either already partially addressed, low priority, or require external dependencies:

| Item | Reason for Deferral |
|------|-------------------|
| Python core modules (75 files) | Superseded by TypeScript MCP server. Archive, don't wire. |
| Obsidian knowledge vault | 58 files exist but skills system serves this purpose better. |
| Append-Only State Protocol | Token Opt v2 + HOT_RESUME partially solves. Over-engineered. |
| Token Budget System | responseSlimmer + pressure cadence partially solves. |
| CCE (Cognitive Composition Engine) | AutoPilot + IntelligenceEngine partially covers. Revisit post-R14. |
| Wire EDM Post Processor | Niche — add as controller dialect in R14-MS1 if needed. |
| GD&T Stack-Up Analysis | ToleranceEngine exists. Extend in future R7 enhancement. |
| Parametric Recipe Generator | Becomes trivial once R14-MS3 (Process Planning) exists. |
| Tribal Knowledge Capture | Partially addressed by R13 extraction. Ongoing refinement. |
| Diagrams directory | Nice-to-have. Not blocking anything. |

## 3.6 IMPROVEMENT ITEMS — WHERE THEY SLOT

| Improvement ID | Description | Slotted Into |
|---------------|-------------|-------------|
| IMP-P0-1 | Phantom skill detector | R12-MS0 Step 4 |
| IMP-P0-2 | Hook fire rate telemetry | R12-MS5 Step 1 |
| IMP-P0-3 | AutoPilot decision tracing | R12-MS5 Step 2 |
| IMP-DA-1 | CC_DEFERRED backlog | R12-MS2 (entire MS) |
| IMP-DA-2 | Script orphan audit | R12-MS0 Step 1 |
| IMP-DA-3 | SKILL_INDEX trigger quality | R12-MS1 (entire MS) |
| IMP-R1-1 | Material coverage audit | R13 companion task or R7 |
| IMP-R1-2 | Tool data validation | R14-MS5 companion |
| IMP-R1-3 | Alarm dual-path consolidation | R13 companion or R12 |
| IMP-R2-1 | Rz first-principles physics | R7 enhancement (future) |
| IMP-R2-2 | Stability lobe diagram action | R7 enhancement (future) |
| IMP-R3-1 | IntelligenceEngine decomposition | R12-MS3 Step 2 |
| IMP-R3-2 | Cost estimation expansion | R14-MS2 (entire MS) |
| IMP-R3-3 | GD&T stack-up | Deferred (ToleranceEngine foundation exists) |
| IMP-R4-1 | REST API expansion | R14-MS7 Step 1 |
| IMP-R4-2 | Audit log rotation | R12-MS0 Step 5 |
| IMP-R5-1 | Phase doc backfill | R12-MS0 Step 2 |
| IMP-R7-1 | 257 extracted engine audit | R13-MS5 (entire MS) |
| IMP-R10-1 | Large engine decomposition | R12-MS3 (entire MS) |
| IMP-XC-1 | Unified test infrastructure | R12-MS4 (entire MS) |
| IMP-XC-2 | Build size tracking | R12-MS0 Step 3 |
| IMP-XC-3 | JSDoc comments | R12 stretch goal or post-R14 |

---

## 3.7 RECOMMENDED EXECUTION ORDER

```
MONTH 1-2: R12 (Dev Infrastructure)
  → Clean codebase, test infra, CC hooks, skill triggers, integration pipeline
  → PAYOFF: Every subsequent session is faster, safer, better-tested

MONTH 2-4: R13 (Monolith Intelligence)
  → Extract 7 engines from monolith, classify 257 extracted files
  → PAYOFF: Manufacturing intelligence becomes queryable via MCP

MONTH 4-7: R14 (Product Features)
  → Post Processor, Quoting, Process Planning, Troubleshooter
  → PAYOFF: PRISM becomes a commercially viable product

POST-R14 CANDIDATES (future brainstorm):
  - R7 physics enhancement (Rz models, SLD generation)
  - CCE lite (smart action composition)
  - Additional controller dialects
  - Feedback loops from production usage
  - API marketplace / plugin system
```

---

# END OF BRAINSTORM DOCUMENT
# Total: ~1500 lines across 3 parts
# 22 improvement items identified from P0→R11 audit
# 3 new phases (R12, R13, R14) with 24 milestones
# All follow PHASE_TEMPLATE.md v15.0 exactly
# Ready for APPROVED status and CURRENT_POSITION update
