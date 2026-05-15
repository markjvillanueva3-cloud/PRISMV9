# PRISM Agent Job Descriptions

> **OBSIDIAN-INTELLIGENCE-MS3 / G1** — codified narrow job descriptions per subagent
> type. Adopted from darkzodchi's 3-rule playbook ("AI team that doesn't quit"): an
> agent with a narrow, written job description outperforms a vibe agent on the same
> task because the spec itself constrains the search space.
>
> Validated by `scripts/validate-agent-job-descriptions.mjs` — every entry must carry
> the 5 required fields (`role`, `scope`, `inputs`, `outputs`, `refusal_cases`); a
> missing field fails CI. Read this file BEFORE invoking `Agent(...)` in the harness;
> if the task is outside the named scope, pick a different agent (or accept that the
> default `general-purpose` agent is the right call).

---

## How to use this file

When you're about to call the `Agent` tool:

1. Look up your intended `subagent_type` below.
2. If your task fits the `scope`, pass concrete `inputs` per the contract. Expect the named `outputs`.
3. If your task hits any of the `refusal_cases`, the agent will refuse — pick a different agent.
4. If your `subagent_type` is not listed here, the agent runs with no formal spec; behavior is heuristic. Document its job description here in a follow-up if it becomes a load-bearing call.

---

## Schema (required fields per agent)

| Field | Type | Description |
|---|---|---|
| `role` | string | One-sentence role description in active voice ("X reviews Y for Z"). |
| `scope` | string list | Concrete tasks this agent is the right pick for. |
| `inputs` | string list | What the caller MUST provide (file paths, line refs, spec docs). |
| `outputs` | string list | What the agent returns (PASS/FAIL verdict, file diffs, severity-graded findings, etc.). |
| `refusal_cases` | string list | When the agent will (or should) decline the task. |

---

## Agents

### `reviewer`
- **role**: reviews a single artifact (file, diff, or design doc) for correctness, completeness, and adherence to project conventions, returning a graded PASS/FAIL verdict.
- **scope**:
  - End-of-task 3-of-3 scrutiny review (arms A or B per §SCRUTINY GATE in CLAUDE.md).
  - Per-file scrutiny gate independent second-pass review (B agent in the 2-parallel pattern).
  - Independent second opinion on a migration / refactor / API change.
- **inputs**:
  - Absolute file path or commit SHA being reviewed.
  - The unit spec / contract / design doc the artifact is supposed to satisfy.
  - Explicit instruction to grade PASS/FAIL with P0/P1/P2/P3 severity.
- **outputs**:
  - PASS/FAIL verdict.
  - Severity-graded findings (P0=blocks ship, P1=ship-blocker after fix, P2=code smell, P3=nit).
  - Specific file:line references for every finding.
- **refusal_cases**:
  - No artifact provided.
  - "Review my work" with no defined success criteria.

### `code-analyzer`
- **role**: performs comprehensive code quality analysis (correctness, security, performance, complexity) across one or more files, returning a structured report.
- **scope**:
  - End-of-task 3-of-3 scrutiny arm C (analyst pass).
  - PR-scale review with cross-file dependency analysis.
  - Quality scoring + technical debt estimation.
- **inputs**:
  - File paths or commit ranges.
  - The change context (what was the goal of this change).
- **outputs**:
  - Overall quality score (0–10).
  - Per-file findings with severity.
  - Refactoring opportunities + estimated time-to-fix.
  - Positive findings (what was done well).
- **refusal_cases**:
  - Files outside the project root.
  - Generated code (post / dist / build artifacts).

### `wiring-review-agent`
- **role**: verifies dispatcher wiring completeness for new PRISM engines and dispatcher actions.
- **scope**:
  - New engine → dispatcher action wiring (action enum, schema, case branch).
  - Schema-merge audits (spread-array action enums, e.g. `z.enum([...A, ...B])`).
  - "Wire to all sources" audit (a memory engine should land in `prism_memory` AND its specialized consumer).
- **inputs**:
  - Engine file path + dispatcher file path(s).
  - Expected action name(s).
- **outputs**:
  - PASS if action enum + schema + case branch + import are all present.
  - FAIL listing the missing piece(s).
- **refusal_cases**:
  - Engine genuinely wrapped by a singleton with `// WIRE-EXEMPT:` tag.
  - File outside `mcp-server/src/`.

### `test-review-agent`
- **role**: verifies test coverage for new PRISM engines and code changes — rejects placeholder asserts, mocked-SUT shortcuts, and weak presence-only assertions.
- **scope**:
  - Verifying the per-engine 10-minimum case count.
  - Detecting `.toBeDefined()` / `.toBeTruthy()` placeholder asserts.
  - Real-value assertion check for physics / math engines.
  - Edge-case coverage audit (zero, negative, NaN, unicode, concurrent).
- **inputs**:
  - Test file path.
  - Engine under test path.
  - Spec / formula reference for real-value assertions.
- **outputs**:
  - PASS if assertions are real-value and edge cases are covered.
  - FAIL listing the weak assertions and missing edge cases.
- **refusal_cases**:
  - Test file is an integration test (not unit) and was deliberately mock-driven.
  - SUT is genuinely external (network, vendor SaaS) where mocks ARE the right call.

### `physics-review-agent`
- **role**: reviews physics formula correctness in PRISM engines — dimensional consistency, canonical-form adherence, constant references.
- **scope**:
  - Kienzle (Fc = kc1.1 · ap · fz^(1-mc)) implementations.
  - Taylor tool-life (T = (C/Vc)^(1/n)) implementations.
  - Deflection (δ = FL³/3EI) calculations.
  - Boothroyd Ra (Ra = f²/(32r)) and machining surface finish.
  - Material constant references (must come from `src/physics/constants.ts`).
- **inputs**:
  - Engine file path with physics calculations.
  - Reference formula (literature citation if available).
- **outputs**:
  - PASS if formula matches canonical form, dimensional analysis is consistent, and constants are imported.
  - FAIL listing inlined constants, sign errors, missing factors, etc. with severity.
- **refusal_cases**:
  - No physics in the file (route to `code-analyzer` instead).
  - Pure CAM/G-code generation with no force/stress math.

### `forge-team`
- **role**: 3-agent team (architect plans → implementer codes → reviewer validates) for non-trivial feature development or engine creation.
- **scope**:
  - New engine + dispatcher action + skill triple.
  - Multi-file refactor where independent modules need parallel implementation.
  - Greenfield feature with no existing pattern to mirror.
- **inputs**:
  - High-level goal + acceptance criteria.
  - Pointers to existing similar engines / patterns in the codebase.
- **outputs**:
  - 3-stage handoff: architectural plan → implementation diff → review verdict.
- **refusal_cases**:
  - Single-file edit (use `implementer` solo).
  - "Refactor the world" without a defined scope.

### `pipeline-team`
- **role**: 3-agent team (planner designs → executor runs in isolation → verifier confirms) for complex multi-engine pipeline executions.
- **scope**:
  - Multi-stage data ingestion runs (e.g. blueprint OCR → classification → tribal extraction).
  - Batch operations across 1000+ resource files.
  - Cross-dispatcher orchestration tests.
- **inputs**:
  - Pipeline definition (stages + engines per stage).
  - Input corpus.
  - Verification criteria.
- **outputs**:
  - Plan document → execution log → verification report.
- **refusal_cases**:
  - Single-engine call (route directly to that engine's dispatcher action).

### `test-runner`
- **role**: runs targeted test suites after code changes and reports pass/fail summary.
- **scope**:
  - Vitest run on files affected by a recent edit.
  - Regression sweep on a focused module.
  - Test-only run before commit.
- **inputs**:
  - Changed source files (so the agent can pick the right tests).
  - Optional: explicit test file list.
- **outputs**:
  - Pass/fail count.
  - Failure details with file:line.
- **refusal_cases**:
  - Tests not yet written (route to `forge-team` to write them first).

### `regression-hunter`
- **role**: investigates unexpected test failures with full context analysis — traces failures to source changes, identifies whether the issue is test or logic.
- **scope**:
  - Test failed unexpectedly after a green main.
  - Bisecting which commit broke a test.
  - Distinguishing test bit-rot from genuine regressions.
- **inputs**:
  - Failing test file path.
  - Test failure output (stack trace, assertion message).
  - Recent commit range (defaults to last 10).
- **outputs**:
  - Root cause with confidence level.
  - Bisect target commit + line.
  - Recommendation (fix test OR fix source).
- **refusal_cases**:
  - Test never passed (route to `forge-team` — needs a real implementation).

### `build-doctor`
- **role**: diagnoses and fixes TypeScript build errors after a build fails.
- **scope**:
  - `tsc --noEmit` failures.
  - Type-narrowing errors in dispatcher case branches.
  - Schema-vs-engine type drift after a refactor.
- **inputs**:
  - Build error output.
  - Optional: which files were recently edited.
- **outputs**:
  - Categorized errors (type / import / config).
  - Patches for the root-cause errors.
  - Verification that `tsc --noEmit` passes after fixes.
- **refusal_cases**:
  - Runtime errors (not build errors — route to `regression-hunter`).

### `catalog-enricher`
- **role**: enriches tool / material / machine catalogs with missing data — searches manufacturer specs online, validates against existing TypeScript interfaces.
- **scope**:
  - Cutting-tool catalog gap-fill (Sandvik, Iscar, OSG, Kennametal).
  - Material spec extension (Inconel, Ti6Al4V, 304 SS variants).
  - Machine spec enrichment (spindle envelope, rapid rate, ATC capacity).
- **inputs**:
  - Catalog file path + interface name.
  - Specific gap (e.g. "missing kc1.1 for ISO N-group").
- **outputs**:
  - Patched catalog entries with manufacturer citations.
  - Confidence per entry.
- **refusal_cases**:
  - No online source available (catalog is shop-floor tribal — route to `shop-knowledge`).
  - Data is behind a paywall the operator hasn't authorized.

### `dispatcher-wirer`
- **role**: wires new engines to dispatchers with proper z.enum, schemas, and action cases — follows existing dispatcher patterns for lazy imports + schema validation.
- **scope**:
  - New engine → existing dispatcher action addition.
  - Schema spread-array merge.
  - Lazy-import pattern preservation.
- **inputs**:
  - Engine file path.
  - Target dispatcher file path.
  - Action name(s) to add.
- **outputs**:
  - Patched dispatcher.ts + schema.ts.
  - Wire test created in `__tests__/`.
- **refusal_cases**:
  - Engine name overlaps an existing dispatcher action (route to `code-analyzer` for dedup check first).

### `Explore`
- **role**: fast read-only search agent for locating code (find files by pattern, grep for symbols, answer "where is X defined").
- **scope**:
  - Single targeted lookup ("where is the Kienzle constant defined?").
  - Moderate exploration ("which files reference WikiRecallCounterEngine?").
  - Very thorough cross-naming-convention search.
- **inputs**:
  - Search target (symbol, pattern, or keyword).
  - Breadth hint: "quick" | "medium" | "very thorough".
- **outputs**:
  - File paths + line references where the target appears.
- **refusal_cases**:
  - Code review or design audit (use `reviewer` / `code-analyzer`).
  - Cross-file consistency check (use `code-analyzer`).

### `general-purpose`
- **role**: catch-all for complex multi-step research questions and open-ended exploration.
- **scope**:
  - "What should I do about X?" before there's a clear plan.
  - Searching for a keyword across the codebase when confidence is low.
  - Multi-step tasks that span tooling layers.
- **inputs**:
  - The question or task in plain language.
- **outputs**:
  - Free-form analysis or directive list.
- **refusal_cases**:
  - Task fits a specialized agent in this list — route there instead.

### `planner`
- **role**: strategic planning and task orchestration for software work.
- **scope**:
  - Multi-phase refactor planning.
  - Roadmap unit decomposition.
  - Sprint-scale work breakdown.
- **inputs**:
  - High-level goal.
  - Constraints (time, conflict-fork rules, peer claims).
- **outputs**:
  - Ordered work list with dependencies.
- **refusal_cases**:
  - Single-file task (just do it).

### `researcher`
- **role**: deep research and information gathering — synthesizes information from multiple sources.
- **scope**:
  - Domain background (e.g. "what does Boothroyd say about Ra at low feeds?").
  - Cross-vendor comparison (e.g. Mastercam vs hyperMILL post-processor conventions).
  - External technique survey.
- **inputs**:
  - Research question.
  - Pointers to known sources (URLs, papers).
- **outputs**:
  - Synthesized findings with citations.
- **refusal_cases**:
  - Pure code lookup (use `Explore`).

### `tester`
- **role**: comprehensive testing and quality assurance specialist — writes new tests with real-value assertions and adequate edge coverage.
- **scope**:
  - New engine that needs ≥10 test cases.
  - Coverage gap fill on existing engine.
  - Refactoring legacy tests away from `.toBeTruthy()` shortcuts.
- **inputs**:
  - Engine path.
  - Existing test file (if any) for style match.
  - Reference values (formula evaluations, table lookups).
- **outputs**:
  - Test file with grouped describe blocks, real assertions, edge coverage.
- **refusal_cases**:
  - Engine has no observable interface (refactor it first).

### `coder`
- **role**: implementation specialist for writing clean, efficient code.
- **scope**:
  - New engine implementation against a written spec.
  - Bug fix with a clear root cause.
  - Pattern-driven refactor.
- **inputs**:
  - Spec / acceptance criteria.
  - Surrounding-code pointers for convention match.
- **outputs**:
  - Implementation diff.
- **refusal_cases**:
  - No spec (route to `planner` first).

### `implementer`
- **role**: PRISM implementation specialist — code changes, wiring, refactoring, engine modifications, dispatcher updates, file creation/editing.
- **scope**:
  - Same as `coder` but with PRISM-specific awareness (dispatchers, registries, hooks, CLAUDE.md laws).
  - Default for routine PRISM dev work.
- **inputs**:
  - Task description.
  - File paths in scope.
- **outputs**:
  - Edits + verification that affected tests pass.
- **refusal_cases**:
  - Task crosses safety-physics boundary (route to `safety-physics`).
  - Stub/placeholder/facade pattern requested (hook blocks anyway).

### `verifier`
- **role**: PRISM verification & regression testing specialist — test suites, anti-regression validation, wiring verification, orphan detection, coverage analysis.
- **scope**:
  - Pre-Stop regression sweep.
  - Anti-regression check before replacing a file.
  - Wiring + orphan detection.
- **inputs**:
  - Recently changed files.
  - Optional: explicit test scope.
- **outputs**:
  - PASS/FAIL with regression details.
- **refusal_cases**:
  - Investigating WHY a test fails (route to `regression-hunter`).

### `safety-physics`
- **role**: PRISM safety-physics oracle — cutting force, spindle/tool stress, collision detection, workholding adequacy, thermal analysis, S(x) safety scoring.
- **scope**:
  - Force calc validation (Kienzle).
  - Tool stress + deflection.
  - Workholding torque adequacy.
  - Pre-edit safety-tier file gates (Kienzle constants, Taylor coefficients).
- **inputs**:
  - Calculation inputs (ap, fz, kc1.1, etc.) OR file path to physics edit.
- **outputs**:
  - PASS/FAIL + S(x) score.
  - HARD BLOCK if S(x) < 0.70.
- **refusal_cases**:
  - Task is pure CAM/G-code (no physics; route to `code-analyzer`).
  - Test code only (no production safety impact).

### `physics-reviewer`
- **role**: reviews physics-touching engine changes against canonical constants; cross-references published material science data.
- **scope**:
  - Same scope as `physics-review-agent` but for full PRs (not single files).
  - Cross-engine constant drift detection.
- **inputs**:
  - Commit range or file list.
- **outputs**:
  - Discrepancy report with severity.
- **refusal_cases**:
  - Files don't touch physics (route to `code-analyzer`).

---

## Conventions

- An entry is REQUIRED here if the agent type appears in `Agent(...)` calls in `.claude/hooks/`, skill bodies, or `state/shared/handoffs/*.md` more than once.
- Schema validation: every entry must have ALL 5 fields. Missing field → CI fail (per the milestone exit condition).
- Update protocol: when a new subagent_type is invoked twice, add an entry here in the next session.

## Source

Adopted from darkzodchi 3-rule playbook (2026, X thread on AI agent teams). Milestone: OBSIDIAN-INTELLIGENCE-MS3 / G1 — see `mcp-server/data/milestones/OBSIDIAN-INTELLIGENCE-MS3.json`.
