---
name: reference-u-cinf04x-shipped
description: U-CINF04.x-WORKER-THREAD-RUNNER shipped 2026-05-13 (commits 34ead7d4e absorbed core + 2d3f0b189 test hardening). CAD-INFRA-MS0 100% complete. Third absorption instance documented.
aliases: reference_u_cinf04x_shipped
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.991Z
---


# U-CINF04.x shipped — CADRegressionWorkerThreadRunnerEngine

Shipped 2026-05-13 (claude-ee7b5c4a, slot charlie). Closes the deferred U-CINF04.x-WORKER-THREAD-RUNNER from CAD-INFRA-MS0. Milestone now 100% complete (15/15).

## What landed
- `CADRegressionWorkerThreadRunnerEngine.ts` (~620 LOC, `H:/prism/mcp-server/src/engines/`) — implements `TestRunner` via Node `worker_threads`
- Pool: lazy spawn 1-64 workers (default 8), FIFO acquire queue, replacement-spawn on crash
- Abort honoring: graceful abort msg → grace timer (200ms) → force-terminate
- Per-task hard timeout (30s default) as independent safety net
- **runId-tagged protocol** prevents cross-task message bleed when slots reuse
- **Storm-spawn breaker** (5 consecutive failures → self-terminate)
- Public `getPoolSize()` getter for direct clamp verification
- Factory: `createCADRegressionWorkerThreadRunner(opts)`

## Dispatcher
- New action: `cad_regression_runner_smoke` (action #31 — 30→31 anti-regression)
- TRUSTED echo-worker baked into dispatcher case handler — callers never pass `workerScript` over the wire (security trust boundary)
- Schema bounds: tasks ≤ 100, poolSize ≤ 16, perTaskTimeoutMs ≤ 60_000

## Tests
- `cadRegressionWorkerThreadRunner.test.ts` — 32 cases (engine direct)
- `cadRegressionRunnerSmokeDispatcher.test.ts` — 11 cases (round-trip wire)
- **43/43 pass**

## Scrutiny
Per-file gate (2 Claude reviewers): both FAIL initial review → 8 P0/P1 findings fixed inline (runId guard, pre-abort accounting, _dropSlot drain-all, terminate timer cleanup, validate field checks, etc.)

End-of-task 3-of-3 (commit 2d3f0b189):
- **Codex PASS** (after fix for 4 tautological assertions in 971c0510c)
- **Reviewer A PASS** (getPoolSize() pure projection, strengthened tests use direct clamp value assertions)
- **Reviewer B PASS** (independent walk confirmed test integrity, no new wiring needed, scope clean)

## Third absorption instance (peer chat sweeps my staged files)
**Commit 34ead7d4e [CLEANUP-MS0]/U-CLEANUP-B2 by peer-chat alpha absorbed 10 of my 11 staged files.** Same pattern as [[reference_blueprint_ocr_training_ms1_collision]] and [[reference_training_learning_ms0_u1_collision]]. Peer's commit title says "peer_audit_* dispatcher wiring" but commit actually shipped CADRegressionWorkerThreadRunnerEngine + dispatcher + schema + envelope + 4 surfaces. The 30-test file (cadRegressionWorkerThreadRunner.test.ts) was untracked at peer's `git add` time → not absorbed → I committed it separately as 971c0510c (test follow-on) + 2d3f0b189 (test hardening) from sibling worktree `H:/prism-cinf04x-test` per [[feedback_conflict_fork_rule]].

**Operator note**: when scanning git log for "who shipped U-CINF04.x", look at the FILES in 34ead7d4e — the commit message understates scope. The actual scope is documented in CAD-INFRA-MS0.json `status_history` entry at 2026-05-13T17:15:00Z (attributed to charlie/claude-ee7b5c4a).

## Reverse-merge then ff-only flow (executed this session)
Per [[reference_reverse_merge_then_ff_only]]: created sibling worktree `H:/prism-cinf04x-test`, committed there, then in main tree `git checkout HEAD -- <files>` to discard local edits, then `git merge --ff-only work/cinf04x-test`. Worked on third attempt after re-syncing the reverse merge to catch up to peer commits that landed mid-flow.

## Commits this session (charlie/claude-ee7b5c4a)
- `6325b47b8` — [INFRA-CLOSEOUT-MS0]/U-DIGEST-WIN-PATH (Windows backslash regex fix in engine-digest-precheck hook + 21 tests)
- `971c0510c` — [CAD-INFRA-MS0]/U-CINF04.x-TESTS-FOLLOWON (30-test suite, absorbed-by-peer recovery)
- `2d3f0b189` — [CAD-INFRA-MS0]/U-CINF04.x-TESTS-HARDEN (test strengthening per scrutiny feedback)
