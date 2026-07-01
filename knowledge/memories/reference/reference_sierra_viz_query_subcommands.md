---
name: reference_sierra_viz_query_subcommands
description: Verified system-viz-query.mjs subcommand surface — the viz-first search CLI (find/headline/roadmap-candidates/blast-radius/...).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.204Z
aliases: reference_sierra_viz_query_subcommands
---


**system-viz-query.mjs subcommands (verified on disk 2026-05-29).** The viz-first search CLI (`node scripts/system-viz-query.mjs <cmd> [args]`) — use INSTEAD of Grep/Glob (recursive Glob over H:/prism times out). Verified subcommands:
- `find <noun>` — ranked node hits (the canonical lookup; short-circuits before the full graph parse for speed).
- `headline` — graph headline metrics.
- `roadmap-candidates` — unwired + pending + drift, roadmap-shaped (feeds rgs/forge).
- `blast-radius <id>` — downstream edges (refactor planning).
- `dispatcher-summary` — dispatcher coverage.
- `coverage-by-domain` — L5 engine-domain coverage.
- `worktrees` — slot-worktree state.
- `build-order` — dependency build order.

**Gotcha:** there is a DEAD second `cmd === "find"` branch (~line 192) marked UNREACHABLE — the top-of-file `find` short-circuit wins. Don't edit the dead branch expecting effect.

**Why:** the `audit-viz-first` hook auto-runs `find`; knowing the full subcommand surface unlocks blast-radius/roadmap-candidates without re-deriving.

**How to apply:** for any "where is X / what's unwired / what breaks if I change Y" question, reach for these before fs scans. See [[reference_sierra_viz_first_search]] · GSD §5.
