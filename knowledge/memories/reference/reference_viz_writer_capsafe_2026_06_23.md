---
name: reference_viz_writer_capsafe_2026_06_23
description: "U-VIZ-WRITER-CAPSAFE completed the V8-string-cap hardening of ALL system-graph.json writers (sierra, 2026-06-23)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
aliases: reference_viz_writer_capsafe_2026_06_23
---


**system-viz cap-safe class FULLY CLOSED (slot:sierra, 2026-06-23, cad-fusion-live-ms0).**

The 862MB merged `system-graph.json` exceeds V8's ~512MiB string cap, so any raw
`JSON.parse(readFileSync(graph,"utf8"))` or `JSON.stringify(graph)` throws `RangeError:
Invalid string length` BEFORE the IO. Prior passes hardened part of it; this pass closed
the rest. The full trilogy:

- **Readers** — `U-VIZ-READER-CAPSAFE` (2026-06-10) + the fleet `>256MB ? readGraphStreaming : JSON.parse`
  inline size-gate pattern. 256MB gate < 512MiB cap, so the 862MB graph always streams; the raw
  branch only runs for sub-256MB graphs. SAFE.
- **Pipeline writers** — `U-VIZ-POSTMERGE-CAPSAFE` (80f8059cb1, 2026-06-10): dedup/repair/reparent/
  add-parent → `writeGraphStreamingAtomic`. `U-VIZ-SEEDGHOST-CAPSAFE`: seed-ghost-from-unwired.
- **Non-pipeline writers (THIS pass)** — `U-VIZ-WRITER-CAPSAFE` (4 files) + `-L12` (1 file):
  the writers that were hardened for READS in 2026-06-10 but left raw on WRITES (unconditional
  `atomicWrite(GRAPH, JSON.stringify(...))`, no size gate → always broke on 862MB):
  `seed-ghost-nodes.mjs` (×2, the documented L13 ghost seeder), `seed-ghost-gnn-classify.mjs`
  (imported by gnn-active-pool-select.mjs:422), `seed-ghost-llm-classify.mjs`,
  `system-viz-type-backfill.mjs`, and `expand-system-viz-l12-files.mjs` (the documented operator
  fix-command for a missing fs-coverage layer per h-drive-graph-parity.mjs:200 — its breakage is a
  likely cause of [[reference_system_viz_fs_coverage_layer_absent_2026_06_15]]). All now import +
  use `writeGraphStreamingAtomic` (and readGraphStreaming where they raw-read).

**Verified:** node --check clean on all 5; `scripts/lib/graph-io.test.mjs` 33/33; full re-audit →
0 genuinely-cap-unsafe system-graph.json IO sites (the only remaining raw read is
`audit-token-savings-coverage.mjs` on the 68MB `architecture-graph.json`, under the cap — safe).

**Lesson:** when a "make X cap-safe" pass fixes only the READ side, the WRITE side of the same
files is the silent R15 gap — a writer that raw-stringifies the graph throws just like a raw reader.
Audit BOTH directions. Anchor the fix on `writeGraphStreamingAtomic` (the proven writer
seed-ghost-from-unwired --apply ran to exit 0 on the 353886-node live graph), not a local
`atomicWrite`+`JSON.stringify`. See wiki [[seed-ghost-v8-string-cap]]. Siblings:
[[reference_postmerge_capsafe_2026_06_10]], [[reference_post_ship_system-viz-u-viz-reader-capsafe-1]].
