---
title: A regression guard must cover EVERY dir the bug class can occur in -- not just where the first instance was found (raw-graph-parse + dead-pixel-guard)
type: lesson
tags: [hardening, system-viz, regression-guard, hooks, v8-string-cap, scope, silent-degradation]
slot: sierra
date: 2026-06-24
severity: medium
status: active
---

# Lesson: a regression guard's SCOPE must match the bug class, not the first sighting

## Context
The raw-graph-parse guard (`scripts/lib/raw-graph-parse-guard.mjs`) regression-locks the worst recurring system-viz crash class: a raw `JSON.parse(readFileSync(<merged system-graph.json>,"utf8"))`. The ~875MB merged graph blows V8's 512MiB max-string-length the moment `readFileSync(..,"utf8")` materializes it as one JS string -- BEFORE JSON.parse runs. The fix is always `readGraphStreaming` (off-heap Buffer-incremental, `scripts/lib/graph-io.mjs`).

The guard + its FLEET-LOCK test were scoped to `scripts/` + `scripts/lib/` only.

## What broadening the scope surfaced
Probing `.claude/hooks/` + `.claude/helpers/` + `mcp-server/scripts/` (1116 .mjs files) found **1 live violation**: `.claude/hooks/dead-pixel-guard.mjs` raw-parsed the 875MB graph. It is an UNWIRED orphan with a try/catch, so it never hard-crashed -- it **silently soft-skipped on every run since the graph crossed 512MiB**, so its dead-pixel L1-page analysis has been non-functional for weeks (R12 silent degradation, hidden by a fail-soft catch).

The guard had been "green" the whole time -- because its scope literally did not look where the bug was.

**A 2nd live landmine of the same class** turned up the next pass, in a WIRED dispatcher: `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts` `obsidian_viz_status` raw-parsed the 875MB graph just to read nodes/edges/layers COUNTS -- same silent `exists:false` since 512MiB. Fixed (`46ad816923`) with cap-safe `countGraphArrayStreaming` (off-heap per-key element count, no object materialized; LIVE 355607/834883/11). The `.ts` engine layer was outside the guard's `.mjs` scan scope -- so the hunt (a broad repo-wide sweep across `.mjs/.cjs/.js/.ts`) is what found it, not the guard. Lesson reinforced: the bug CLASS spans file types too, not just dirs. A final repo-wide sweep confirmed the ACTIVE main tree is clean; the only remaining hits are in `mcp-server/dist.bak-vclever/` (dead compiled backup) and the LOCKED `prism-test-6d0595/` worktree (stale pre-cap-safe copies, hands-off) -- neither is active code.

## The two lessons
1. **Scope a regression guard to the BUG CLASS's blast radius, not the dir the first instance happened to live in.** A raw merged-graph parse can crash from any interactive-tooling dir (`scripts/`, `.claude/hooks/`, `.claude/helpers/`, `mcp-server/scripts/`). Cover all of them, recursively, single-sourced (`SCAN_ROOTS_REL`) so the CLI, the test, and the commit-gate hook can never drift apart.
2. **A fail-soft `try/catch` around a heavy read hides silent feature-death.** `dead-pixel-guard` "looked fine" (no errors, no crash) while doing nothing. When a catch swallows the only code path that does the work, the feature is dead but invisible. Pair fail-soft with a size-gate that emits a CLEAR reason ("graph NNN MB exceeds the ceiling -- soft-skip, run the sweep script") so a degraded run is legible, not silent.

## The fix shipped (2026-06-24, slot:sierra)
- `0c0f7f7bfc` -- wired the guard as a PreToolUse(Bash) commit gate (`raw-graph-parse-precommit-guard.mjs`) so it fires on EVERY commit regardless of changed files (closes the `stop_on_failing_tests` affected-files-only gap). Correctness gate: no `[MAIN-FORCE]` bypass; fail-open; kill switch `PRISM_RAW_GRAPH_GUARD_DISABLE=1`.
- `42bf1c598c` -- dead-pixel-guard -> `readGraphStreaming` + a 150MB size-gate that soft-skips gracefully instead of OOMing under the ~384MB hook-heap cap ([[windows-commit-reservation-hook-heap]]).
- `cb09c71d45` -- single-sourced `SCAN_ROOTS_REL` + recursive `scanTreeForRawGraphParse`; CLI + FLEET-LOCK test + hook share the scope.

Tests: hook 18/18, scanner 18/18; CLI lint clean; live E2E proved a `.claude/hooks` violation now blocks (was invisible before).

## Related
`scripts/lib/raw-graph-parse-guard.mjs` (scanner) · `scripts/lib/graph-io.mjs` (readGraphStreaming) · `.claude/hooks/raw-graph-parse-precommit-guard.mjs` (commit gate) · [[windows-commit-reservation-hook-heap]] · memory `reference_sierra_raw_graph_guard_wired_2026_06_24`.
