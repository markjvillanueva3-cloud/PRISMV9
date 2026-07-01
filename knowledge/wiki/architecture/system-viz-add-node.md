---
title: system-viz-add-node (atomic single-node append)
type: architecture
tags: [system-viz, graph, atomic-write, write-lock, sierra]
status: active
maintainer: sierra
created: 2026-05-29
---

# system-viz-add-node — atomic single-node append

`scripts/system-viz-add-node.mjs` adds ONE node to the merged `system-graph.json` without a full `regen-viz` pass. It is the only sanctioned single-node mutation path.

## Why it exists
A full `regen-viz.mjs` is ~7 min and rewrites the entire 548 MB graph. For a one-off node add (e.g. a newly-built engine), that's wasteful. add-node appends incrementally.

## Safety
- Respects the PID write-lock in `scripts/lib/system-graph-write-lock.mjs` so it never races `regen-viz.mjs` (the canonical writer).
- Atomic rename (write temp → rename) so a reader never sees a half-written graph.
- This preserves the [[reference_sierra_one_writer_per_path|one-writer-per-path]] invariant: add-node is lock-respecting, not a competing canonical writer.

## When NOT to use
For bulk/structural changes, regenerate via `regen-viz.mjs` — add-node is for single additive nodes only. Ghost-roost data must go through the FAST[]+splice path ([[reference_sierra_fast_splice_dual_registration]]), not add-node.

## See also
[[system-viz-galaxy]] · [[regen-viz-merge-guard]] · [[reference_sierra_graph_writers_history]]
