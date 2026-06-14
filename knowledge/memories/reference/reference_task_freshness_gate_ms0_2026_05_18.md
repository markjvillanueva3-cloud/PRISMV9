---
name: reference-task-freshness-gate-ms0-2026-05-18
description: TASK-FRESHNESS-GATE-MS0/U-TFG01 build record — R13 hard PreToolUse gate; bundled-sub-hook-must-exit-0 lesson; quote-evasion close; live-wire-tests-via-fixtures lesson
aliases: reference_task_freshness_gate_ms0_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.970Z
---


**TASK-FRESHNESS-GATE-MS0 / U-TFG01** — 2026-05-18, slot foxtrot
(claude-93351de7), branch cad-fusion-live-ms0. Doctrine R13 + hard PreToolUse
gate over 4 task surfaces.

**Files:** `.claude/helpers/task-freshness.mjs` (pure core, 8 exports,
injectable readers) · `.claude/hooks/task-freshness-gate.mjs` (PreToolUse,
fail-open) · `.claude/hooks/bundles/bash-bundle.mjs` (+1 BASH_HOOKS entry,
between commit-ownership-guard and worktree-commit-route, timeout 5000) ·
`scripts/__tests__/task-freshness.test.mjs` (36 node:test, 2 real-data E2E) ·
CLAUDE.md patch-sibling `state/shared/dashboards/patches/CLAUDE-MD-PATCH-r13-task-freshness.md`
(bravo held the CLAUDE.md lock) · wiki `knowledge/wiki/architecture/task-freshness-gate.md`.

**Reusable lessons (bug-class):**
1. **A bundled PreToolUse sub-hook MUST signal block via stdout JSON and exit
   0 — NEVER `process.exit(2)`.** `hook-runner.mjs` detects blocks from
   `parsed.decision==="block"` in the child's stdout ONLY; the bundle
   re-derives the outward exit-2 itself. A sub-hook that exits 2 in the stdout
   write-callback risks the documented Windows pipe-truncation race → empty
   stdout → bundle sees no block → the gated action is SILENTLY ALLOWED
   (gate-bypass). Siblings (commit-ownership-guard.mjs, git-add-lane-guard.mjs)
   emit block JSON + exit 0. Reviewer A graded PASS without cross-checking the
   aggregator; reviewer B caught it — the per-file 2-reviewer gate earned its
   keep on the highest-risk integration point.
2. **Command-string pattern gates: strip quoted regions before matching.** A
   command that merely MENTIONS the invocation in a quoted string (echo / grep
   / JSON payload / a test harness) is not the invocation. `stripQuoted` +
   value-`unquote()` + a fail-CLOSED canonical-id check make a hard gate
   genuinely un-quote-evadable. Residual escaped/nested-quote case fails SAFE
   (toward block), P3-deferred.
3. **Live-wiring a claim-gate makes it gate your own verification shell.**
   Verify via stdin **file fixtures**, the actual contract — not inline
   command strings that contain the gated text (which the now-live gate
   blocks). Cf. [[feedback_verify_actual_contract_not_proxy]].

**Verify:** `node --test H:/prism/scripts/__tests__/task-freshness.test.mjs`
→ 36/36; `grep -c "process.exit(2)" H:/prism/.claude/hooks/task-freshness-gate.mjs`
→ 0. Doctrine: [[feedback_task_freshness_pre_build]].
