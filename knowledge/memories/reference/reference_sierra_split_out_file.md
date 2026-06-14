---
name: reference_sierra_split_out_file
description: generate-system-viz.mjs writes architecture-graph.json (53MB), NOT the merged system-graph.json — the U-VIZ-SPLIT-OUT-FILE fix.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.944Z
aliases: reference_sierra_split_out_file
---


**Two graph products, two files (U-VIZ-SPLIT-OUT-FILE).** PRISM has TWO distinct graphs:
- `state/shared/system-viz/system-graph.json` (370-575MB, ~244K nodes) — the MERGED filesystem-coverage + ghost-roost graph. Writer: `regen-viz.mjs`.
- `state/shared/system-viz/architecture-graph.json` (53MB) — the architecture-only L1-L10 layered graph. Writer: `generate-system-viz.mjs`.

Before the split fix, `generate-system-viz.mjs` wrote `system-graph.json` directly, silently clobbering regen-viz's merged product whenever run standalone (e.g. its own acceptance criteria "regenerated viz reports…"). The fix renamed its `OUT_FILE` → `architecture-graph.json`.

**Why:** the architecture producer and the merged producer were two independent writers of one path (last-writer-wins clobber).

**How to apply:** running `generate-system-viz.mjs` standalone is now safe (own file) but does NOT update the merged graph — follow with `regen-viz.mjs` if you need the merged surface refreshed. See [[reference_sierra_one_writer_per_path]] · [[reference_sierra_graph_writers_history]].
