---
name: reference-master-index-hit-counter-2026-05-18
description: "Per-query telemetry counter wired into master-index-precheck-inject.mjs (charlie 2026-05-18, U-MASTER-INDEX-HIT-COUNTER)"
aliases: reference_master_index_hit_counter_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.649Z
---


# U-MASTER-INDEX-HIT-COUNTER (2026-05-18 charlie)

Closes action #2 of [[high-roi-usage-audit-2026-05-18]] — system-viz had 154 wiki recalls / 9 days over 23,981 entries (0.6% coverage), no way to know which graph nodes were actually being surfaced. Counter mirrors the wiki-recall-counts.json pattern.

## What ships

- `scripts/lib/master-index-hit-counter.mjs` — pure-core lib: `mkEmptyState` / `applyHitDelta` / `pruneOverflow` / `summarizeState` (no I/O, deterministic).
- `scripts/lib/master-index-hit-counter.test.mjs` — 22 unit tests including malformed-state, dedup, purity, LRU edge, NaN-comparator regression guard.
- `.claude/hooks/master-index-precheck-inject.mjs` — patched: counter write happens AFTER `emit(block)` so disk I/O never delays `additionalContext`.
- `.claude/hooks/__tests__/master-index-precheck-inject.test.mjs` — 8 hook integration tests including critical-surface-path-reject + corrupt-aside-rename.
- Counter file: `mcp-server/data/state/master-index-hit-counts.json` (schemaVersion 1.0.0).

## Safety invariants

- **R12 honest recovery:** corrupt JSON renamed aside as `.corrupt-<ts>` + stderr breadcrumb (never silently overwritten — would erase `firstSeenIso` history).
- **Path-injection guarded:** env override path rejects critical-surface basenames (settings.json, CLAUDE.md, MEMORY.md, chat-slots.json, roadmap-index.json, package.json, tsconfig.json).
- **NaN-safe comparator:** `Number.isFinite(count)` coerce in `compareCountDescThenLastSeen` — hostile/legacy state can carry a string or NaN `count` without scrambling sort.
- **Emit-then-track:** source-grep regression guard asserts `trackHits()` CALL comes after `emit(block)` in main.

## Knobs

`PRISM_MASTER_INDEX_HIT_COUNTER=0` (off-switch) · `_FILE=<path>` (test override, critical-surface-guarded) · `_MAX_QUERIES=N` (default 2000) · `_MAX_NODES=N` (default 5000).

## Per-file scrutiny

2 reviewer agents in parallel after every file. Round-1 verdict: FAIL+FAIL (3 P1s from code-analyzer + 1 P1 from independent reviewer). 4 P1s fixed in-session:
1. Silent corrupt-recovery → rename-aside + stderr.
2. NaN sort under malformed `count` → finite-coerce in comparator.
3. Path-injection via env knob → critical-surface basename allowlist.
4. Zero doc-reflection → CLAUDE.md + wiki + this memory + MEMORY.md index updated (4-surface rule).

30/30 tests PASS post-fix (22 lib + 8 hook).

## Lesson

The per-file scrutiny pattern earns its keep at the doc-reflection rule (the 4th P1). Code can be functionally perfect and still fail the gate if CLAUDE.md / wiki / memory haven't been touched in the same session. **R5 doctrine is hook-enforced; doc reflection is reviewer-enforced.** Both gates matter.

## Sisters

[[reference-master-index-filter-contract-fix-2026-05-18]] — same hook, prior fix.
[[reference_master_index_surface]] — the broader master-index doctrine.
[[reference_subagent_per_task_presearch_2026_05_15]] — sister consumer of the search lib.
