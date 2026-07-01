---
name: reference_stopgate_vitest_scope_fix_2026_06_24
description: "stop_on_failing_tests freshness gate now ignores non-vitest (node:test) files — fixes a false-positive class in the concurrent-fleet thrash (papa, Stop-hook gate integrity)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.211Z
aliases: reference_stopgate_vitest_scope_fix_2026_06_24
---


**U-STOPGATE-VITEST-SCOPE (slot:papa, 2026-06-24, commit `3c2472a397` on slot/papa).** Partial fix to the KNOWN-OPEN concurrent-fleet thrash in `[[reference_test_freshness_gate_thrash_concurrent_fleet_2026_06_24]]` (alpha's `U-STOPGATE-R9` left "whole-tree git-status scan thrashes under concurrent fleet" open).

**Bug:** `stop_on_failing_tests.mjs` stale-GREEN freshness scan (`pickStaleTestFromStatus`) flagged ANY repo-wide `*.test.*` file whose mtime > `mcp-server/data/state/VITEST_REPORT.json`. But that report only covers the **mcp-server/ vitest suite** (config root `mcp-server/vitest.config.ts`). Repo-root `scripts/*.test.mjs` and `.claude/**/__tests__/*.test.mjs` are **node:test** files vitest NEVER runs (verified by `node <file>` separately). So a slot editing such a file was wrongly blocked on the *vitest* gate. Hit live: papa's `scripts/embed-pdf-tribal-tips-into-index.test.mjs` + `extract-catalog-cutting-params.test.mjs` + the gate's own `.claude/.../stop_on_failing_tests.test.mjs` all false-staled the gate.

**Fix:** new `isInVitestScope(rel)` (exported) requires the path to start with `mcp-server/` (env `PRISM_TEST_GATE_VITEST_PREFIX`); applied in `pickStaleTestFromStatus`. **NOT a softening** — real `mcp-server/` vitest tests still block (pinned by a test). 20/20 gate tests (3 new scope tests + 6 existing re-pathed to real `mcp-server/` git-status form). Live-verified: papa's 3 node:test edits now ignored; the gate correctly STILL flags a peer's stale `mcp-server/src/__tests__/PostValidationSuiteEngine.test.ts`.

**REMAINING (the bigger half, NOT done):** peer `mcp-server/` TS test edits still thrash a single slot's Stop (un-winnable: the global report re-stales on any peer's in-scope test edit). The fix is **per-slot attribution** — a slot's Stop should only block on a test IT edited this session (memory's fix #2: per-slot report shard / session-edited-file set / scope git-status to the slot worktree `H:/prism-slot-<name>` whose working tree excludes peer shared-tree churn). Needs a reliable "this session's edited mcp-server test files" source; deserves a focused unit + 3-of-3 scrutiny (safety gate). Until then, a slot whose own mcp-server tests are individually green has no real stale-green risk — the residual block is documented infra, not a failure. Do NOT set `STOP_ON_FAILING_TESTS_SKIP_FRESHNESS=1` (fleet-wide softening) or overwrite the shared report.
