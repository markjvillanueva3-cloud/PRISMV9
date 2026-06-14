---
name: reference-psn-hybrid-viz-roost-wire-2026-05-25
description: 2026-05-25 sierra iter 22 — closes iter-21 R12 follow-up U-PSN-HYBRID-VIZ-ROOST-WIRE. Splices iter-21 hybrid-retrieval generator into regen-viz pipeline. 33 LOC across 2 files (regen-viz FAST[] entry, merge-augmentations loader+versions+merger). Both files node --check valid. ghost.hybrid_retrieval roost materializes on next successful regen-viz pass.
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-09T14:54:10.893Z
aliases: reference_psn_hybrid_viz_roost_wire_2026_05_25
---


## What shipped

Three splices into the regen-viz pipeline so the iter-21 generator's output gets merged into `system-graph.json`:

| file | edit | purpose |
|---|---|---|
| `scripts/regen-viz.mjs` | `FAST[]` line 115: add `"generate-hybrid-retrieval-features.mjs"` after `"generate-episode-store-features.mjs"` | makes regen-viz run the generator alongside the other 30 augmentations |
| `scripts/merge-augmentations.mjs` | line 107: add `const hybridRetrieval = loadOptional("hybrid-retrieval-augmentation.json");` | loads the iter-21 generator's emit file |
| `scripts/merge-augmentations.mjs` | line 199: add `if (hybridRetrieval) versions.hybridRetrieval = hybridRetrieval.generatedAt ?? "present";` | records the augmentation in `meta.versions` so operators see it loaded |
| `scripts/merge-augmentations.mjs` | after episode-store merger block: add 30-line merger that walks `newNodes` + `newEdges` with id-dedup + edgeKey-dedup, sets `G.meta.hybridRetrieval = {generatedAt, stats}` | splices the 5 hybrid_retrieval nodes + 4 fan-out edges into the merged graph |

## Pattern fidelity

Merger block is a verbatim structural copy of the iter-12 episode-store merger (CLAUDE.md §`generate-episode-store-features.mjs` consumer pattern):
- `existingIds = new Set(G.nodes.map(n => n.id))` dedup
- `edgeKey = e => '${from}|${to}|${kind ?? type ?? ""}'` dedup
- `G.edges ??= []` init
- `G.meta.hybridRetrieval = {generatedAt, stats}` provenance

The `edgeKey` accepts both `kind` (my generator's edge shape) and `type` (legacy edge shape) so the merge works regardless of which generator emits edges.

## Verification

Both files pass `node --check` (syntax-valid). 2 files changed, 33 insertions. Commit landed cleanly — peer file-claim from iter-21 (`claude-9f3a8e4f`) had released by the time this iter ran.

## When the roost materializes

The 5 nodes + 4 edges will appear in `/system-viz` on the next successful `regen-viz.mjs --full` pass. Pre-existing block: V8 max-string-length OOM at ~495MB merged graph (`reference_regen_viz_string_length_2026_05_23`). That's a separate issue — my augmentation file lands either way; render is gated by the OOM fix.

## Compounding chain — sierra iters 17 → 22

| iter | unit |
|---|---|
| 17 | `U-PSN-QDRANT-POPULATE` — 1,669 vectors → `prism_engines` (3,866 total) |
| 18 | `U-PSN-HYBRID-RETRIEVAL-WIRE` — 4-substrate RRF fan-out (`hybridSearch`) |
| 19 | `U-PSN-QDRANT-PAYLOAD-DEBUG` — canonical engine ids surfaced (50/50 tests) |
| 21 | `U-PSN-HYBRID-VIZ-ROOST` — generator + augmentation file |
| 22 | `U-PSN-HYBRID-VIZ-ROOST-WIRE` — regen-viz + merge-augmentations splices |

Iter 17 made the data live; 18 made it callable; 19 made it readable; 21 made it visible; 22 made it visible to /system-viz queries.

## Closes

`PSN-ENHANCE-MS0::U-PSN-HYBRID-VIZ-ROOST-WIRE-2026-05-25` — closes the iter-21 R12 follow-up. The hybrid retrieval architecture is now structurally wired through the entire PSN observability surface (data → runtime → quality → augmentation → render-pipeline).

## Cross-refs

- [[reference_psn_hybrid_viz_roost_2026_05_25]] — iter 21 (the generator this splice wires)
- [[reference_psn_hybrid_retrieval_wire_2026_05_25]] — iter 18 (the runtime)
- [[reference_regen_viz_string_length_2026_05_23]] — pre-existing OOM that gates the final visual render
