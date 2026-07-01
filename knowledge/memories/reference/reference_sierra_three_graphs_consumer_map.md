---
name: reference_sierra_three_graphs_consumer_map
description: The 3 system-viz graph files and their distinct consumers — don't confuse merged vs architecture vs embeddings.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.201Z
aliases: reference_sierra_three_graphs_consumer_map
---


**The three system-viz graphs (each its own writer + consumer).** Confusing them = reading stale/wrong data.
| File | Size | Writer | Consumer |
|------|------|--------|----------|
| `state/shared/system-viz/system-graph.json` | ~548 MB merged, ~244K nodes | `regen-viz.mjs` (ONE canonical) | master-index, awareness-snapshot, all pre-*-graph hooks — the **fleet search substrate** |
| `state/shared/system-viz/architecture-graph.json` | ~53 MB, L1-L10 arch-only | `generate-system-viz.mjs` (standalone, safe) | the 3D viewer (`_server.cjs` / system-viz.html) |
| `state/shared/system-viz/_node-embeddings.jsonl` | ~555 MB, 1 node/line (`.partial` after OOM) | `seed-ghost-from-unwired.mjs` side-effect | india's GNN tier-5 wiring-inference |

**Why:** "regenerate the viz" is ambiguous — `generate-system-viz.mjs` only refreshes the ARCH graph; the MERGED graph (what search reads) only updates via `regen-viz.mjs`. A consumer reading the wrong file sees stale data with no error.

**How to apply:** match the file to the consumer; to refresh fleet search → `regen-viz.mjs`; to refresh the 3D viewer only → `generate-system-viz.mjs`. See [[reference_sierra_split_out_file]] · GSD §6.
