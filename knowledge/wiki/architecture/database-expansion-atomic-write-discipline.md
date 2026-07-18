---
title: Atomic-Write Discipline (database-expansion)
kind: architecture
status: shipped
date: 2026-05-29
unit: U-PSGB-JULIETT
milestone: PER-SLOT-GALAXY-BUILDOUT
author: claude-a6304a93 (slot juliett)
---

# Atomic-Write Discipline

The load-bearing rule of the **slot:juliett** persistence domain: any JSON/state path that more than one chat or process can write goes through `atomicWriteJson` (`scripts/lib/atomic-json.mjs` — write-tmp + rename, lockfile-guarded), never a bare `fs.writeFileSync`.

## Why

The multi-writer race is PRISM's most-recurring persistence bug. Last-writer-wins with no error:
- `roadmap-index.json` — 5 writers, 3 non-atomic (DEV-TOOL-CONFLICT-AUDIT F4).
- `system-graph.json` — 3 writers; fixed with a single canonical regen writer + abort-on-shrink guard.
- `error-memory.json`, `skill-usage-stats.json` — latent race (orphan hooks not yet wired).

## The tmp+rename trap

`atomicWriteJson` writes `<path>.<pid>.tmp` then renames over the target. The rename is atomic — but the tmp is only cleaned if the writer unlinks it on failure. On 2026-05-29 slot:juliett found **46 orphaned `tribal-embed-index.json.<pid>.tmp` files, ~16 GB total** — crashed/overlapping writers whose rename never landed.

Fix pattern:
1. Writer-side `try/finally` unlink of the tmp on any non-rename exit.
2. Janitor sweep of `**/*.json.*.tmp` aged > N min **AND dead-PID** — never blind-delete (a 382 MB write can be in flight).
3. One canonical writer for regenerated indexes (don't let N processes regen the same 382 MB file).

## Verification

A write is not "done" until read back. Pairs with [[database-expansion-schema-versioning]]. Memory: `feedback_juliett_atomic_write_discipline`, `reference_juliett_tmp_orphan_leak_2026_05_29`, `reference_juliett_nwriter_race_map_2026_05_29`.
