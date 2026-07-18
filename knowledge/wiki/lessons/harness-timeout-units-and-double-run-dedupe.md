---
title: Harness timeout-units bug + double-run dedupe (HARNESS-EFFICIENCY-MS0 P1)
date: 2026-07-02
tags: [hooks, performance, settings, fleet-hygiene, lessons]
---

# Harness timeout units + hook double-runs (why Claude Code felt slow)

**Symptom:** every task in Claude Code CLI crawled while bare-model lanes (Hermes) flew.

**Root causes (measured, 2026-07-02):**

1. **settings.json hook `timeout` is SECONDS, not ms** (docs-verified). The whole fleet
   wrote ms values -> budgets ~1000x intent; a hung hook stalled its event up to the 600s
   default, and events wait for the SLOWEST parallel hook. Fixed: 420 values -> `max(3, ceil(v/1000))`.
   RULE: any new hook entry gets a timeout in single/double-digit SECONDS.
2. **Two drifted settings layers.** C: user layer was bundle-consolidated; H:/prism project
   layer stayed a pre-consolidation snapshot. Claude Code dedupes IDENTICAL command strings
   across layers (those were free), but 69 wires were live DOUBLE-RUNS: hooks standalone AND
   inside a wired bundle (different strings). stop_on_failing_tests ran vitest twice per
   turn-end; session-consolidate-graph provably fired 2x per Stop. Fixed: 73 coverage-proven
   removals. RULE: when a bundle absorbs a hook, delete the standalone wire in BOTH layers
   in the same commit (the stop-regression-bundle docstring already warned this).
3. **Tombstone spawns:** `node -e "/* comment */ exit 0"` entries cost a process per event.
   Retire by DELETING the entry (git keeps history), never by keeping a no-op spawn.

**Tools shipped:** `scripts/audit-hook-wiring-dedup.mjs` (deterministic wiring matrix:
layers x bundles x static block/network signals; 18 tests) and
`scripts/apply-harness-optimization.mjs` (fail-loud curated transform: exact-count spec,
coverage invariants, checkpoints, C:->H:/.claude mirror sync).

**Verify after any future wiring change:**
`node scripts/audit-hook-wiring-dedup.mjs` -> expect timeoutSuspects 0, tombstones 0,
BUNDLE_DOUBLE_RUN <= 8 (the 6 scope-keeps + 2 known comment-mention false positives).

**Caveats:** analyzer's absorbed-map scans ALL .mjs mentions in bundle sources including
comments -- always confirm against real SUB_HOOKS `path:` lines before acting (this caught
build-cache-manager/build-tracker as false positives). Matcher scope matters: a hook wired
under a different event/matcher than its absorbing bundle is COVERAGE, not duplication.

Full spec + Phase 2 (ups-core-bundle, stop-bundle extension): `state/shared/specs/HARNESS-EFFICIENCY-MS0-2026-07-02.md`.
