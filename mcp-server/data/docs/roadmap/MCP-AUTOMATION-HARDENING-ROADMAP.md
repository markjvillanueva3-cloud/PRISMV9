# MCP-Server Development Automation Hardening Roadmap

Generated: 2026-03-29 | Subordinate to: ULTIMATE-PRISM-ROADMAP-v25.md
Purpose: Make the MCP-server development system self-improving — every new piece of code
triggers automatic quality improvement, wiring verification, and capability expansion.

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## Mathematical Foundation

Every automated decision resolves to:

```
Decision = f(INPUT_CONSTANTS, FORMULA, CONSTRAINTS) → OUTPUT + CONFIDENCE + UNCERTAINTY
```

**Finite Maximum Resolution Principle:**
Every subsystem has a theoretical maximum quality score Q_max = 1.0.
Current quality Q is measurable. The automation gap is:

  Gap = Q_max - Q_current

Automation hooks should close this gap monotonically:

  Q(t+1) ≥ Q(t) for all t (no regressions allowed)

Quality dimensions (each scored 0-1):
- **W** = Wiring completeness (engine → dispatcher → schema → route → API → page)
- **T** = Test coverage (lines, branches, edge cases)
- **P** = Physics accuracy (formula correctness vs published data)
- **S** = Security posture (auth, validation, injection prevention)
- **D** = Documentation (JSDoc, README, examples)
- **A** = Automation level (manual steps remaining)

**Composite Quality Score:**
  Q = (W × 0.25) + (T × 0.20) + (P × 0.20) + (S × 0.15) + (D × 0.10) + (A × 0.10)

Target: Q ≥ 0.90 for every engine, dispatcher, route, and page.

---

## What Already Exists

### Hooks (32 helpers + 156 hook definitions)
- PreToolUse: file-protect, review-gate, TS quality reminder
- PostToolUse: compressor, read-tracker, search-optimizer
- PreCompact: 8 enforcement gates (memory, review, wiring, forge-triple, index-sync, etc.)
- PostCompact: state recovery, handoff

### Scripts
- task-queue.mjs: claim/start/heartbeat/complete + RPS challenge + file-lock
- agent-coordination.mjs: chat + workboard + status
- roadmap-sync.mjs: rgs-sync protocol
- gap detection: partially built in SQ1-0-GAP task

### MCP Hooks (in-engine)
- SafetyQualityHooks.ts: 63 hook calls (safety, quality, business, system)
- ManufacturingHooks.ts: 38 hook calls (physics, tooling, process)
- EnforcementHooks.ts: 55 hook calls (wiring, compliance, validation)

### What's Missing
- No auto-wiring on new engine creation
- No auto-schema generation
- No auto-test generation
- No auto-route creation
- No auto-API-client-function generation
- No auto-index-update on new engine
- No continuous quality scoring
- No formula accuracy auto-validation

---

## Roadmap: 8 Phases

### AUTO-0: Quality Scoring Engine

```
SMART CONFIG: Role=metrics architect | OPUS | MAX
UNITS: U-QS1, U-QS2
ESTIMATED CONTEXT: 30%

KNOWLEDGE SOURCES:
  - src/engines/SystemVariabilityIndexEngine.ts — existing quality metrics
  - src/hooks/SafetyQualityHooks.ts — existing hook patterns
  - state/shared/SVI.json — current SVI/Psi values

INTENT:
  Build a QualityScoreEngine that computes Q for every engine, dispatcher,
  route, and page. This is the foundation — you can't improve what you can't measure.

WORK:
  U-QS1: Build QualityScoreEngine
    - Scan every engine: has export? has dispatcher case? has schema? has test? has route? has API function?
    - Compute W (wiring), T (test coverage), P (physics accuracy), S (security), D (docs), A (automation)
    - Composite Q = weighted sum
    - Store in state/shared/QUALITY_SCORES.json
    - MCP action: prism_dev:quality_score (single engine or full scan)

  U-QS2: Build /quality-score skill + quality-score hook
    - Skill: /quality-score [engine_name] → shows Q breakdown
    - Skill: /quality-score scan → full system scan
    - PostToolUse hook: on engine file write, auto-compute Q for that engine
    - Alert if Q < 0.70 for any engine

EXIT GATE: ✓ Q computed for all 1,302 engines + hook fires on every engine write
COMPACT: after U-QS2
```

### AUTO-1: Auto-Wiring Pipeline

```
SMART CONFIG: Role=build automation | OPUS | MAX
UNITS: U-AW1, U-AW2, U-AW3

KNOWLEDGE SOURCES:
  - src/engines/index.ts — export patterns
  - src/tools/dispatchers/ — dispatcher patterns (lazy import, z.enum, switch case)
  - src/schemas/ — Zod schema patterns
  - src/routes/ — Express route patterns

INTENT:
  When a new engine file is created, automatically generate and wire all missing
  infrastructure. Zero manual wiring steps.

WORK:
  U-AW1: Build AutoWiringEngine
    - Input: engine file path
    - Detect: class name, export name, public methods, input/output types
    - Generate: index.ts export line
    - Generate: dispatcher case (lazy import + method call)
    - Generate: Zod schema from method signatures
    - Generate: route handler (POST endpoint)
    - Generate: API client function (for frontend)
    - Generate: test file stub with describe/it blocks
    - DRY RUN by default — show diff before applying

  U-AW2: PostToolUse hook for auto-wiring
    - Trigger: Write/Edit to src/engines/*.ts (not test files)
    - If new engine file: run AutoWiringEngine in dry-run mode
    - Show suggested wiring as additionalContext
    - If user approves (or auto mode): apply wiring

  U-AW3: /forge-auto skill
    - /forge-auto MyNewEngine "description of what it does"
    - Generates engine from description + auto-wires everything
    - Runs tsc --noEmit to verify
    - Runs generated tests
    - Computes Q score

EXIT GATE: ✓ New engine creation auto-generates full wiring + tests + Q ≥ 0.80
COMPACT: after U-AW3
SCRUTINY: 3 loops (wiring correctness, type safety, test coverage)
```

### AUTO-2: Auto-Schema Hardening

```
SMART CONFIG: Role=type system architect | OPUS | HIGH
UNITS: U-AS1, U-AS2

INTENT:
  Every dispatcher action must have a Zod schema. Auto-detect missing schemas
  and generate them from engine method signatures.

WORK:
  U-AS1: Schema gap scanner
    - For each dispatcher: read z.enum ACTIONS array
    - For each action: check if Zod schema exists in corresponding schemas file
    - Report: [action] → SCHEMA_PRESENT | SCHEMA_MISSING | SCHEMA_WEAK (no validation)
    - Formula: Schema_Coverage = actions_with_schema / total_actions

  U-AS2: Auto-schema generator
    - For missing schemas: infer from engine method signature
    - For weak schemas (z.object({}).passthrough()): strengthen from actual params
    - PostToolUse hook: on dispatcher write, verify all actions have schemas
    - Block if Schema_Coverage < 0.95

EXIT GATE: ✓ Schema_Coverage ≥ 0.95 across all 79 dispatchers
```

### AUTO-3: Auto-Test Generation

```
SMART CONFIG: Role=test automation | OPUS | HIGH
UNITS: U-AT1, U-AT2

INTENT:
  Every engine should have tests. Auto-generate test stubs when engines are
  created. Auto-suggest test cases from method signatures and physics formulas.

WORK:
  U-AT1: Test gap scanner
    - For each engine file: check if __tests__/EngineFile.test.ts exists
    - If exists: count describe/it blocks, check for edge cases (zero, negative, NaN)
    - Formula: Test_Coverage = engines_with_tests / total_engines
    - Target: Test_Coverage ≥ 0.80

  U-AT2: Auto-test generator
    - For untested engines: generate vitest test file
    - Include: basic invocation test, edge case tests, type validation tests
    - For physics engines: add manufacturer data comparison tests
    - PostToolUse hook: on engine write without corresponding test, warn

EXIT GATE: ✓ Test_Coverage ≥ 0.80 + auto-test generation working
```

### AUTO-4: Auto-Route + API Client Sync

```
SMART CONFIG: Role=API architect | OPUS | HIGH
UNITS: U-AR1, U-AR2

INTENT:
  Backend routes and frontend API client functions must stay in sync.
  Auto-detect orphaned routes and missing client functions.

WORK:
  U-AR1: Route-to-client sync scanner
    - Parse all route files: extract endpoint paths
    - Parse web/src/api/client.ts: extract all request() calls
    - Match: every route should have a client function, every client function should have a route
    - Formula: Sync_Score = matched_pairs / (total_routes + total_client_fns - matched_pairs)

  U-AR2: Auto-sync generator
    - For orphaned routes: generate client.ts function
    - For orphaned client functions: flag missing route
    - PostToolUse hook: on route file write, check sync and suggest additions
    - /api-sync skill for manual sync check

EXIT GATE: ✓ Sync_Score ≥ 0.90 + auto-sync suggestions working
```

### AUTO-5: Formula Accuracy Auto-Validation

```
SMART CONFIG: Role=physics validator | OPUS | MAX
UNITS: U-FA1, U-FA2

INTENT:
  Every physics formula should be validated against published data.
  Auto-detect when a formula's output drifts from expected values.

WORK:
  U-FA1: Formula validation suite
    - For each formula in FormulaRegistry: define expected input/output pairs from literature
    - Validation dataset: Sandvik cutting data, ISO 3685 tool life, Kennametal grades
    - Formula: Accuracy = 1 - mean(|actual - expected| / expected) across all test points
    - Target: Accuracy ≥ 0.95 for cutting force, tool life, surface finish

  U-FA2: Continuous validation hook
    - PostToolUse hook: on physics engine write, re-run validation suite
    - If Accuracy drops below 0.90: BLOCK the edit
    - If Accuracy drops below 0.95: WARN
    - Store results in state/shared/FORMULA_ACCURACY.json

EXIT GATE: ✓ All 499 formulas validated + continuous monitoring active
SCRUTINY: 3 loops (dimensional analysis, boundary conditions, manufacturer comparison)
VALIDATION: Compare against HSMAdvisor, GWizard, hyperMILL reference data
```

### AUTO-6: Self-Improvement Pipeline

```
SMART CONFIG: Role=meta-engineering | OPUS | MAX
UNITS: U-SI1, U-SI2

INTENT:
  The system should improve itself. When a pattern is detected (repeated failure,
  common gap, recurring fix), auto-generate a hook/script/skill to prevent it.

WORK:
  U-SI1: Pattern detection engine
    - Monitor: test failures, hook blocks, quality score drops, user corrections
    - Detect: repeated patterns (same file failing 3+ times, same gap across engines)
    - Formula: Improvement_Priority = frequency × severity × (1 - automation_level)
    - Top-priority patterns → auto-generate fix candidates

  U-SI2: Auto-fix pipeline
    - For each detected pattern: generate hook/script/skill candidate
    - Dry-run validation: does the fix actually prevent the pattern?
    - Human approval gate: no auto-fix enters production without review
    - Promotion: approved fixes become permanent hooks/scripts
    - Formula: System_Improvement_Rate = fixes_promoted / patterns_detected

EXIT GATE: ✓ Pattern detection running + 10 auto-fixes promoted + rate ≥ 0.50
```

### AUTO-7: Continuous Quality Dashboard

```
SMART CONFIG: Role=observability | OPUS | HIGH
UNITS: U-CD1, U-CD2

INTENT:
  Real-time visibility into system quality. Every metric on one dashboard.

WORK:
  U-CD1: Quality metrics aggregator
    - Collect: Q scores, SVI/Psi, test pass rate, schema coverage, route sync, formula accuracy
    - Aggregate: per-domain (physics, business, CAM, quality) and system-wide
    - Store: state/shared/QUALITY_DASHBOARD.json

  U-CD2: Frontend dashboard page
    - SystemHealthPage or DashboardPage integration
    - Charts: Q score trend, coverage radar, test pass rate, formula accuracy
    - Alerts: Q < 0.70, test failure, formula drift, wiring gap
    - MCP action: prism_dev:quality_dashboard

EXIT GATE: ✓ Dashboard shows all metrics + alerts fire on regressions
```

---

## Dependency Graph

```
AUTO-0 (Quality Score) ──→ AUTO-1 (Auto-Wire) ──→ AUTO-3 (Auto-Test)
       │                          │
       │                          └──→ AUTO-2 (Auto-Schema)
       │
       └──→ AUTO-4 (Route Sync) ──→ AUTO-7 (Dashboard)
       │
       └──→ AUTO-5 (Formula Validation) ──→ AUTO-6 (Self-Improve)
```

AUTO-0 is the foundation. AUTO-1 through AUTO-5 can run in parallel after AUTO-0.
AUTO-6 and AUTO-7 need data from all previous phases.

## Ownership

- Claude: AUTO-0, AUTO-1, AUTO-2, AUTO-5, AUTO-6 (backend engines, hooks, scripts)
- Codex: AUTO-4 (route sync — needs frontend knowledge), AUTO-7 (dashboard page)
- Both: AUTO-3 (test generation spans backend and frontend)

## Success Formula

System is flawless when:

```
Q_system = min(Q_i for all engines i) ≥ 0.90
Schema_Coverage ≥ 0.95
Test_Coverage ≥ 0.80
Sync_Score ≥ 0.90
Formula_Accuracy ≥ 0.95
System_Improvement_Rate ≥ 0.50
```

At that point, every new piece of code entering the system is:
1. Auto-wired (export + dispatcher + schema + route + API client)
2. Auto-tested (stub tests + edge cases + physics validation)
3. Auto-scored (Q computed + alerts if below threshold)
4. Auto-improved (pattern detection + fix generation)
5. Auto-synced (frontend and backend always in lock-step)
