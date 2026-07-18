---
name: bug-hunting-engines
description: Strategic engine digest for the bug-hunting galaxy (slot uniform) -- silent-no-op detection, route-verify, error-pattern to unified ledger to memory auto-feed. Honest: this galaxy owns almost NO dedicated engines; it is a cross-galaxy CONSUMER of regression engines plus a large process/hook/script substrate.
type: reference
galaxy: bug-hunting
node_type: memory
---

# bug-hunting galaxy -- engine digest

## Overview

Bug-hunting (slot **uniform**) is the silent-bug surfacing infrastructure -- the domain
dedicated to finding bugs that do NOT throw, do NOT fail tests, and do NOT show up in the
next CI run, but quietly corrupt state or rot capabilities over time. R12 (fail-loud)
violations are its primary prey. Verified doctrine: `mcp-server/src/engines/bug-hunting/CLAUDE.md`
section 1.

STRUCTURAL FACT (verified, R12): the `bug-hunting/` directory contains ZERO local `.ts`
engines -- only doctrine `.md` files (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md, SOUL.md).
This is confirmed both by doctrine (CLAUDE.md section 2: "zero local `.ts` engines") and by
the flat-engine enumeration below. Uniform is a cross-galaxy CONSUMER of regression engines
that live FLAT in `mcp-server/src/engines/*.ts` (owned by other galaxies) plus a large
process substrate of Stop-hooks + audit scripts. Its OWN AI-engine count is 0
(CLAUDE.md section 13: "no dedicated AI engines of its own").

The domain's core loop (verified in three hook headers below):

  silent-no-op / R12-violation detection -> route-verify (assert real return shape, not
  a green test) -> error-pattern capture -> UnifiedErrorLedgerEngine -> error-pattern-promote
  Stop hook (fingerprint recurs -> wiki lesson stub) -> memory auto-feed to Obsidian.

The full bug lifecycle uniform enforces (CLAUDE.md section 7):
CLASSIFY -> REPRODUCE (actual contract, not proxy) -> RED TEST in
`mcp-server/src/__tests__/regression/` -> FIX -> GREEN TEST -> MUTATE-FIX (verify the test
goes red) -> COMMIT -> `CLAUDE.md ## Recent regressions` append -> wiki lesson. The
`stop-bug-finding-wiki-gate.mjs` Stop hook enforces the last two stages.

Honest scope: the leverage here is 90% process/hook/script, ~10% engines. This digest covers
the consumed engines honestly AND the substrate (scripts + hooks) that carries the domain.

## Strategic categories

1. **Error ledger + capture** -- centralized write+embed of failures; error fingerprints;
   recurrence-promotion to wiki lessons. Engines: `UnifiedErrorLedgerEngine`. Hooks:
   `error-pattern-capture`, `error-pattern-learner`, `error-pattern-memory`,
   `error-pattern-promote`.
2. **Regression harnesses (cross-galaxy consumed)** -- golden-baseline diffing and replay
   for CAD, CAM, lathe-post, print-to-program, and per-part-variability. Engines:
   `PrintToProgramRegressionHarnessEngine`, `PartVariabilityRegressionHarnessEngine`,
   `CAMInHostRegressionDetectorEngine`, `RegressionBaselineEngine`, the 5 `CADRegression*`
   engines, the 2 `LathePostRegression*` engines.
3. **Statistical regression (math, name-collision -- NOT bug-hunting)** -- `LinearRegressionEngine`,
   `MultipleRegressionEngine`, `RobustRegressionEngine`, `AdvancedRegressionEngine` are
   numeric curve-fitting engines that only NAME-MATCH "Regression". They belong to the
   physics/stats layer, not this galaxy. Called out here so the digest does not overclaim.
4. **Silent-failure + route-verify audits** -- offline scripts that surface dormancy,
   orphans, and declared-vs-configured drift. Scripts: `audit-unwired-engines.mjs`,
   `declared-vs-actual.mjs`, `hook-fire-rank.mjs`, `audit-roadmap-drift.mjs`,
   `audit-close-out-candidates.mjs`.
5. **Regression back-flow + wiki gate (Stop hooks)** -- auto-append fixes to
   `## Recent regressions`, enforce a wiki lesson per bug finding, block on failing tests /
   SVI regression / S(x) fail / TSC-baseline regression. Hooks: `regression-auto-write`,
   `stop-regression-backflow`, `stop-bug-finding-wiki-gate`, `stop_on_failing_tests`,
   `stop_on_svi_regression`, `svi-regression-guard`, `stop_on_sx_fail`,
   `tsc-baseline-regression-gate`, `anti-regression-auto-sweep`.
6. **Auto-fix + auto-hunt pipeline** -- turns detected patterns into concrete fix candidates
   and runs a bug-hunt sweep after each build. Engines: `AutoFixPipelineEngine`. Hooks:
   `auto-bug-hunt-after-build`, `auto-postmortem-on-failure-restart`.
7. **Scrutiny gate (3-of-3 consensus)** -- the domain's tool of choice for catching hostile
   payloads + weak assertions before Stop. Script: `scrutiny-3way.mjs`. Hooks:
   `scrutinize-before-stop`, `scrutiny-verdict-persist`, `reviewer-fail-latch`.
8. **Silent-catch + suggestion surfacing** -- block empty catch blocks in engines; surface
   suggestions that would otherwise be silently dropped. Hooks: `no-silent-catch`,
   `silent-suggestion-surfacer-stop`.

## Key engines + scripts (detailed)

### UnifiedErrorLedgerEngine
The one dedicated data engine at the heart of the galaxy: centralized write+embed for the
error ledger (INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03). Every confirmed failure lands here and is
embedded for semantic recall; `error-pattern-promote` reads the derived ledger to catch
recurring fingerprints. File: `mcp-server/src/engines/UnifiedErrorLedgerEngine.ts` (impl
class `UnifiedErrorLedgerEngineImpl` at line 71). Exposed via `prism_guard:error_ledger_*`.

### AutoFixPipelineEngine
Takes detected improvement patterns from SelfImprovementPatternEngine and generates concrete
fix candidates -- hooks, scripts, skills, or tests -- so a found bug class becomes a
prevention asset rather than an anecdote (AUTO-6 U-SI2). This is the "class elimination, not
instance patching" mandate made executable. File:
`mcp-server/src/engines/AutoFixPipelineEngine.ts` (export class at line 102).

### PrintToProgramRegressionHarnessEngine
Replays TestResource fixtures through their matching Print-to-Program pipeline and produces
a structured pass/fail verdict per fixture (P2P-FULLSTACK-MS0/U-P2PFS59). This is the
route-verify pattern at pipeline scope -- it asserts the whole print-to-G-code path still
produces the expected artifact, not just that a unit test is green. File:
`mcp-server/src/engines/PrintToProgramRegressionHarnessEngine.ts` (export class at line 79).

### CAMInHostRegressionDetectorEngine
Diffs a current NightlyRunReport against a stored golden baseline to surface CAM regressions
in-host (PHASE-8, U-CAMTEST17). The canonical golden-diff pattern uniform relies on for CAM;
a change to output that was not intended shows up as a diff against the frozen golden. File:
`mcp-server/src/engines/CAMInHostRegressionDetectorEngine.ts` (export class at line 129).

### CADRegressionTestOrchestratorEngine
Orchestrates the 20,006-file CAD regression test through a parallel worker pool with per-file
timeout, atomic state persistence, and checkpoint-based resume (U-CINF04, CAD-INFRA-MS0). The
heaviest regression harness in the fleet; anchors the `CADRegression*` family (dashboard,
report-generator, results-analyzer, worker-thread-runner). File:
`mcp-server/src/engines/CADRegressionTestOrchestratorEngine.ts`.

### RegressionBaselineEngine
Freezes a test contract at plan kickoff -- stores `test_id -> expected result sha256`
(deterministic output hash) so drift is caught by hash mismatch (U-LPR-REGRESSION-BASELINE).
The baseline-and-diff primitive that route-verify audits compare against. File:
`mcp-server/src/engines/RegressionBaselineEngine.ts` (export class at line 88).

### scripts/audit-unwired-engines.mjs
Deep offline scan of the canonical engines folder that classifies each engine WIRED-DIRECT /
VIA-ROUTE / VIA-REGISTRY / VIA-ORCH / VIA-SINGLETON / VIA-HOOK / VIA-ENGINE or ORPHAN. The
primary silent-no-op surfacer: an engine on disk that no dispatcher imports is a dormant
capability (a bug class). Works when port 3100 is down. File:
`scripts/audit-unwired-engines.mjs`.

### scripts/declared-vs-actual.mjs
Substrate-health tool that surfaces drift between what PRISM settings DECLARE (enabled MCP
servers, env vars, hook wiring) and what is ACTUALLY configured on disk. Built against the
2026-05-19 bug class where a typo'd MCP server name + empty env scaffolding loaded silently
via the trust-dialog implicit-allow, masking drift for weeks. Pure core over injected
readers. File: `scripts/declared-vs-actual.mjs`.

### .claude/hooks/error-pattern-promote.mjs
Stop hook that watches `ERROR_LEARN_LEDGER.jsonl`; when the same error fingerprint appears
>= THRESHOLD times within ROLLING_DAYS, drafts a lesson stub at
`knowledge/wiki/lessons/auto-{fingerprint}.md` so the failure mode gets captured and a
hook/skill can be designed to prevent recurrence. Idempotent (skips existing stubs),
fail-safe (continueOnError, never blocks Stop). File: `.claude/hooks/error-pattern-promote.mjs`.

### .claude/hooks/no-silent-catch.mjs
PreToolUse hook that BLOCKS empty catch blocks in engine `.ts` files (regex
`catch(...){}` on files under `/engines/`). Directly enforces R12 fail-loud at the source:
an empty catch is the canonical silent-swallow bug. File: `.claude/hooks/no-silent-catch.mjs`.

### .claude/hooks/stop-bug-finding-wiki-gate.mjs
T3 Stop advisory that enforces `[[feedback_always_update_wiki_on_bug_finding]]`. Detects a
bug finding shipped this session via three signals (a new `## Recent regressions` line, a new
`feedback_*`/`reference_*_(bug|regression|fix)_*.md` memory, or fix-class commit keywords),
then verifies a companion wiki entry exists. Missing -> advisory reminder. Closes the loop
"single instance is anecdote; class is doctrine". File: `.claude/hooks/stop-bug-finding-wiki-gate.mjs`.

### .claude/hooks/regression-auto-write.mjs
T3 Stop observer that closes the "regression auto-write pending" gap: when a chat commits a
fix at session end (subject matches fix|restore|repair|regression|patch|revert), it appends
a canonical entry to `CLAUDE.md ## Recent regressions` automatically. Opt-out per-commit with
`[no-regression-record]`. File: `.claude/hooks/regression-auto-write.mjs`.

## Full index

Honest counts: dedicated bug-hunting engines = 0 in the galaxy dir. Cross-galaxy regression
engines consumed by uniform: ~13 (harness/baseline/CAD/lathe-post/CAM + the error ledger +
auto-fix); the 4 statistical-regression engines are name-collisions, marked as such.
Substrate: ~23 regression/audit scripts, ~20 bug-hunt hooks (non-test).

| Asset | Kind | Category | One-line |
|-------|------|----------|----------|
| UnifiedErrorLedgerEngine | engine | Error ledger | Centralized write+embed for the error ledger (`prism_guard:error_ledger_*`). |
| AutoFixPipelineEngine | engine | Auto-fix | Detected patterns -> concrete fix candidates (hook/script/skill/test). |
| PrintToProgramRegressionHarnessEngine | engine | Regression harness | Replays fixtures through print-to-program, per-fixture pass/fail verdict. |
| PartVariabilityRegressionHarnessEngine | engine | Regression harness | Asserts a generated program is cost/accurate/safe/optimized per part tuple. |
| CAMInHostRegressionDetectorEngine | engine | Regression harness | Diffs NightlyRunReport vs stored golden to surface CAM regressions. |
| RegressionBaselineEngine | engine | Regression harness | Freezes test contract at kickoff (test_id -> sha256 golden hash). |
| CADRegressionTestOrchestratorEngine | engine | Regression harness | Orchestrates 20,006-file CAD regression via parallel worker pool. |
| CADRegressionDashboardEngine | engine | Regression harness | Dashboard snapshot over CAD regression runs (name-derived). |
| CADRegressionReportGeneratorEngine | engine | Regression harness | Report summary generation for CAD regression (name-derived). |
| CADRegressionResultsAnalyzerEngine | engine | Regression harness | Analyzer/diff over CAD regression results (name-derived). |
| CADRegressionWorkerThreadRunnerEngine | engine | Regression harness | Worker-thread runner for the CAD regression pool (name-derived). |
| LatheMasterPostRegressionMatrixEngine | engine | Regression harness | Lathe MasterPost regression matrix (name-derived). |
| LathePostRegressionTestGeneratorEngine | engine | Regression harness | Generates lathe-post regression tests (name-derived). |
| AdvancedRegressionEngine | engine | Stats (name-collision) | Kernel ridge / GMM-EM / quantile / Huber -- NOT bug-hunting. |
| LinearRegressionEngine | engine | Stats (name-collision) | Numeric linear regression -- NOT bug-hunting. |
| MultipleRegressionEngine | engine | Stats (name-collision) | Numeric multiple regression -- NOT bug-hunting. |
| RobustRegressionEngine | engine | Stats (name-collision) | Robust numeric regression -- NOT bug-hunting. |
| scripts/audit-unwired-engines.mjs | script | Silent-failure audit | Classifies each engine WIRED-*/ORPHAN; surfaces dormant capabilities. |
| scripts/declared-vs-actual.mjs | script | Silent-failure audit | Drift between declared settings and on-disk configuration. |
| scripts/hook-fire-rank.mjs | script | Silent-failure audit | Ranks wired-but-silent hooks (0 fires) -- the wired-silent bug class. |
| scripts/audit-roadmap-drift.mjs | script | Silent-failure audit | Envelope status vs git-log reality drift. |
| scripts/audit-close-out-candidates.mjs | script | Silent-failure audit | Shipped-but-pending silent close-out debt. |
| scripts/synergy-regression-watch.mjs | script | Regression back-flow | Alerts when synergy ratio regresses week-over-week (chat-bus). |
| scripts/regression-lock-audit.mjs | script | Regression back-flow | Audits regression lock/baseline integrity (name-derived). |
| scripts/regression-staleness-auditor.mjs | script | Regression back-flow | Flags stale regression baselines (name-derived). |
| scripts/reconcile-roadmap-drift.mjs | script | Silent-failure audit | Reconciles roadmap drift signals (name-derived). |
| scripts/validate-unwired-signal.mjs | script | Silent-failure audit | Validates the unwired-engine signal quality (name-derived). |
| scripts/scrutiny-3way.mjs | script | Scrutiny gate | Emits 3-arm reviewer prompts + marks the 3-of-3 ledger. |
| .claude/scripts/scrutiny-3way.mjs | script | Scrutiny gate | The wired scrutiny-3way runner (MCP-down fallback). |
| error-pattern-capture.mjs | hook | Error ledger | Captures error patterns into the learn ledger (name-derived). |
| error-pattern-learner.mjs | hook | Error ledger | Learns from captured error patterns (name-derived). |
| error-pattern-memory.mjs | hook | Error ledger | Persists error patterns to memory (name-derived). |
| error-pattern-promote.mjs | hook | Error ledger | Recurring fingerprint -> drafts wiki lesson stub (Stop, T4). |
| no-silent-catch.mjs | hook | Silent-catch | BLOCKS empty catch blocks in engine .ts files (PreToolUse). |
| silent-suggestion-surfacer-stop.mjs | hook | Silent-catch | Surfaces suggestions that would be silently dropped (Stop). |
| stop-bug-finding-wiki-gate.mjs | hook | Wiki gate | Enforces a wiki lesson per bug finding (Stop, T3 advisory). |
| regression-auto-write.mjs | hook | Regression back-flow | Auto-appends fixes to `## Recent regressions` (Stop, T3). |
| stop-regression-backflow.mjs | hook | Regression back-flow | Regression back-flow to CLAUDE.md (name-derived). |
| anti-regression-auto-sweep.mjs | hook | Regression back-flow | Auto-sweeps for regressions (name-derived). |
| stop_on_svi_regression.mjs | hook | Regression back-flow | Blocks Stop on SVI (viability index) regression (name-derived). |
| svi-regression-guard.mjs | hook | Regression back-flow | Guards against SVI regression (name-derived). |
| tsc-baseline-regression-gate.mjs | hook | Regression back-flow | Gates on TSC-baseline error-count regression (name-derived). |
| stop_on_failing_tests.mjs | hook | Regression back-flow | Blocks Stop on failing tests (name-derived). |
| stop_on_sx_fail.mjs | hook | Regression back-flow | Blocks Stop on S(x) safety-score fail (name-derived). |
| stop_on_unwired_assets.mjs | hook | Silent-failure audit | Transcript-scoped orphan-block for new engines (name-derived). |
| stop_on_skill_unwired.mjs | hook | Silent-failure audit | Blocks on unwired new skills (name-derived). |
| auto-bug-hunt-after-build.mjs | hook | Auto-fix | Runs a bug-hunt sweep after each build (name-derived). |
| auto-postmortem-on-failure-restart.mjs | hook | Auto-fix | Auto post-mortem on failure/restart (name-derived). |
| scrutinize-before-stop.mjs | hook | Scrutiny gate | Blocks Stop until 3-of-3 scrutiny ledger clears. |
| scrutiny-verdict-persist.mjs | hook | Scrutiny gate | Persists scrutiny verdicts to the ledger (name-derived). |
| reviewer-fail-latch.mjs | hook | Scrutiny gate | Latches a reviewer FAIL so it cannot be silently cleared (name-derived). |

_All engine class-existence claims verified by `grep -m1 export class` (UnifiedErrorLedgerEngine,
AutoFixPipelineEngine, AdvancedRegressionEngine, RegressionBaselineEngine,
PrintToProgramRegressionHarnessEngine, CAMInHostRegressionDetectorEngine confirmed at cited
lines). Entries marked "(name-derived)" have their file path enumerated but their body not
read this pass -- treat the one-line as name-inferred, not header-verified. Doctrine ground
truth: `mcp-server/src/engines/bug-hunting/{CLAUDE,MEMORY,PATHS}.md`._
