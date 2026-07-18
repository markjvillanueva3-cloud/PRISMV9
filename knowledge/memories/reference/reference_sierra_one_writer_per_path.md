---
name: reference_sierra_one_writer_per_path
description: system-graph.json has exactly ONE canonical writer (regen-viz.mjs) — concurrent writers silently clobber.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.199Z
aliases: reference_sierra_one_writer_per_path
---


**One-writer-per-path doctrine (system-viz).** `state/shared/system-viz/system-graph.json` (370-575MB merged, ~244K nodes) has exactly ONE canonical writer: `scripts/regen-viz.mjs`. Historically THREE scripts wrote it (`generate-system-viz.mjs`, `regen-viz.mjs`, `system-viz-add-node.mjs`) → last-writer-wins silent clobber (the 2026-05-17 regression class). Fixed by U-VIZ-SPLIT-OUT-FILE: `generate-system-viz.mjs` now writes `architecture-graph.json` instead. `system-viz-add-node.mjs` respects the `scripts/lib/system-graph-write-lock.mjs` PID lock for atomic single-node appends.

**Why:** two writers race → a reader mid-write sees truncated JSON; a stale generator overwrites the merged graph, degrading master-index search fleet-wide.

**How to apply:** NEVER add a second writer to system-graph.json; route everything through regen-viz; for one-off node adds use system-viz-add-node (lock-respecting). See [[reference_sierra_graph_writers_history]] · [[reference_u_regen_viz_merge_faillod_2026_05_17]].
