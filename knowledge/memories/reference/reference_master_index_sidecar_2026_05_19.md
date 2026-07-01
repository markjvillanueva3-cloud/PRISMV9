---
name: reference-master-index-sidecar-2026-05-19
description: U-MASTER-INDEX-SIDECAR — pre-built inverted-index sidecar restores full-coverage master-index search
aliases: reference_master_index_sidecar_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.649Z
---


U-MASTER-INDEX-SIDECAR (2026-05-19, slot alpha, /loop) — fixes the user-reported
"system index issue": `master-index-search-lib.mjs` `loadGraph` caps at 200 MB but
the merged `system-graph.json` is 372 MB / 243,687 nodes → every master-index
search silently degraded to the 28 MB architecture-graph fallback (~24,940 nodes).
Raising the cap was MEASURED non-viable (138 s / 1.6 GB RSS per call → fleet OOM).

Fix = an offline inverted-index sidecar. NEW `scripts/build-graph-index.mjs`
builds `system-graph-index.json` (parity-exact `tokenize`/blob from `loadGraph`;
compact searchGraphHits-shaped nodes; integer-index postings; self-re-execs 8 GB
heap; atomic write; mass-skip floor; fail-loud). `loadGraph` gained an additive
`tryLoadSidecar` fast-path (fresh+schema-match → rebuild `{nodes,inverted}` from
the sidecar; stale/absent/schema-mismatch/`PRISM_GRAPH_SIDECAR_DISABLE=1` →
byte-identical legacy path). `regen-viz.mjs` refreshes the sidecar post-merge
(non-fatal, like obsidian-bridge/wiki-debt).

MEASURED on the production graph: sidecar 105.6 MB (243,687/243,687 nodes,
119,707 tokens), build 70.8 s, `loadGraph` cold **1.45 s** (vs 138 s direct) —
full-coverage search restored, within the per-prompt hook budget.

5-file build, per-file scrutiny 2 reviewers/file all PASS. Notable reviewer
catches FIXED in-session: compact node must store `knowledge.{wikiEntries,
memoryEntries}` (searchGraphHits' shape, not flat `wiki`/`mem`); generator must
self-re-exec with a heap flag (bare invocation OOMs on 372 MB parse); a malformed
sidecar `nodes` element (null/non-object) crashed `searchGraphHits` →
hardened with a node filter (fixes the pre-existing legacy exposure too).

Lessons: a "pure core + injected" design that crosses a file boundary needs the
node shape verified against the REAL consumer (`searchGraphHits`), not the spec's
sketch; a derived-cache regen stage warns-without-`failed++` (cache freshness ≠
graph integrity). Knobs: `PRISM_GRAPH_SIDECAR_DISABLE`, `PRISM_BUILD_GRAPH_INDEX_
{MIN_RATIO,NO_REEXEC}`. Wiki: [[master-index-sidecar]]. Sister to
[[reference-master-index-surface]] · builds on [[U-VIZ-F11-CROSS-LOCK]].
