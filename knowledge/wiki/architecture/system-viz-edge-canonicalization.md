---
title: System-viz edge-target canonicalization (G4 dead-edge fix)
type: architecture
slot: sierra
unit: U-VIZ-G4-DEAD-EDGE
date: 2026-05-31
status: shipped
tags: [system-viz, merge-augmentations, dead-edges, graph-integrity, dispatcher, engine]
---

# System-viz edge-target canonicalization

Fixes the two largest **dead-edge** classes in the merged `system-graph.json` —
edges whose target node id does not exist. Surfaced by
`scripts/system-viz-dead-pixel-sweep.mjs` (wired advisory in regen-viz). The
graph is the substrate the master-index / awareness hooks query fleet-wide, so
dangling edges degrade search.

## The two classes (measured on the live 573 MB graph, 2026-05-31)

| Class | Count | Root cause | Fix |
|-------|-------|-----------|-----|
| `dispatcher.prism_*` | ~2,676 | wrong prefix + wrong name — canonical dispatcher node id is the **file-derived** `disp.calcdispatcher`, not `dispatcher.prism_calc` | **fixed** — producers emit `disp.*` (Half A) + merge canonicalizes accumulated ones (Half C) |
| `engine.<ClassName>` | ~3,392 | the pdf-course-bridge maps reference engine class names with **no `eng.*` graph node** (some genuinely don't exist; some exist only as variants e.g. `ToolLifeEngine`→`Bayesian/StochasticToolLifeEngine`) | **NOT a prefix bug** — intentional gap-surfacing per the bridge's design; remap-pass is a no-op on these. Real fix is cross-lane (correct bridge maps) or sweep-reclassification (queued) |

## Architecture: why the remap lives in the merge, not the producers

The merged graph is **CUMULATIVE** — `merge-augmentations.mjs` reads the
persistent `system-graph.json`, adds augmentation edges (dedup by key), and
**never removes stale-target edges**. So fixing a producer to emit the canonical
id only affects NEW edges; the dead edges accumulated from prior merges persist
forever. The merge is also the **single writer** of the graph (one-writer-per-path),
so a separate rewriting script would violate that invariant. Therefore the
canonicalization runs as a post-splice pass inside the merge — the only place
with both the full node set in memory and write authority.

`canonicalizeGraphEdgeTargets(G)` (`scripts/lib/viz-engine-node-id-canon.mjs`),
one pass over ~1M edges before `writeGraphStreaming`:
- `engine.<X>` → `eng.<domain>.<name>` via a graph-derived alias index
  (last-segment match). **Alias-gated** → strictly dead→live; an `engine.*` with
  no `eng.*` alias is left as an honest dead pixel.
- `dispatcher.<X>` → `disp.<file-id>` via `mcpToolToDispNodeId`
  (`scripts/lib/viz-dispatcher-node-id.mjs`, the SSOT table). **Node-existence
  gated** → only remaps when the resolved `disp.*` node exists (never mints a
  fresh dead target like `disp.prism_shop`).
- A remap that would duplicate an existing edge is dropped (so the stale
  `dispatcher.prism_calc` dedup-drops onto the producer's new `disp.calcdispatcher`).
- `PRISM_VIZ_ENGINE_CANON_DISABLE=1` = byte-identical no-op.

## Producers (Half A — source-of-truth fix)

`mcpToolToDispNodeId` was extracted from `seed-ghost-from-unwired.mjs` (fixed
2026-05-20) into the shared lib. Three remaining producers now route through it:
`seed-ghost-llm-classify.mjs`, `seed-ghost-gnn-classify.mjs` (a third producer
that builds its own edge — easy to miss), and
`generate-pdf-course-bridge-features.mjs` (+ the `extract-cadcam-tribal-wiki.mjs`
consumer that imports its dispatcher tables).

## Standing lessons

1. **Cumulative merge** — any merged-graph edge-integrity fix must be done at the
   merge (the single writer with the full node set); producer fixes alone never
   clear accumulated edges.
2. **Dry-run before regen** — ALWAYS dry-run a graph transform against the live
   graph before a ~6.5-min regen. Half B's hermetic tests passed with *fabricated*
   `eng.*` nodes but remapped **0** on the real graph (the engine class turned out
   to be a node-coverage/advisory gap, not a prefix bug). Hermetic fakes don't
   prove production wiring.
3. **Don't miss a producer** — grep the full producer + *consumer* surface; the
   GNN-tier seeder and the tribal-wiki consumer were both nearly missed.

Memory: [[reference_sierra_dead_edge_id_mismatch_2026_05_30]] ·
[[reference_sierra_dispatcher_id_ssot]] · [[reference_seeder_prefix_fix_2026_05_20]].
