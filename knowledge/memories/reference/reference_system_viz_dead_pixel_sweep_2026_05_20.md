---
name: reference-system-viz-dead-pixel-sweep-2026-05-20
description: "2026-05-20 sierra G4 — pure dead-pixel detector finds edges referencing absent node ids; live first-run found a 500-edge generator naming-bug (ghost.unwired→dispatcher.* but graph uses disp.* prefix)."
aliases: reference_system_viz_dead_pixel_sweep_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.215Z
---


## SYSTEM-VIZ-HIGH-ROI-MS0 / U-VIZ-G4-DEAD-PIXEL-SWEEP — referenced-but-missing finder

**Shipped:** 2026-05-20 (slot sierra, /loop iter-2)

**Problem:** system-viz had 786,400 edges across 250,497 nodes but no audit
of edges pointing at absent node ids. Two distinct gaps the audit closes
together: real referenced-but-missing assets (= doc-debt) AND generator
naming bugs (= production write bugs in the merge pipeline).

**Fix:** pure-core + CLI runner:

- `scripts/lib/system-viz-dead-pixel-detector.mjs` — `detectDeadPixels(graph)`
  builds a Set of node ids in one pass, iterates edges in another, tolerates
  both `{from,to}` and `{source,target}` shapes, ranks orphan targets by
  inbound count, groups dead edges by source-layer + missing-prefix. 20
  `node:test` cases.
- `scripts/system-viz-dead-pixel-sweep.mjs` — CLI; needs `--max-old-space-size=12288`
  for the 405 MB graph. Writes paired `.md` + `.json` reports under
  `state/shared/system-viz-dead-pixels-<date>.*`.

**Live result:**
- 569 dead edges out of 786,400 (0.07% — graph is structurally very clean).
- Top orphan: `dispatcher.prism_cam` (157 inbound, all from
  `ghost.unwired.*Engine` nodes).
- ~500 of 569 are the same class: `seed-ghost-from-unwired.mjs` proposes
  wiring edges to `dispatcher.<name>` but the graph stores dispatchers
  under `disp.<name>` (per the G1 PREFIX_TO_TYPE SSOT). Wrong prefix
  convention in one generator → ~500 dead pixels.

**Insight:** G4 finds the kind of bug a CI test can't easily catch because
the seeder + the dispatcher generator both pass their own tests in
isolation; the failure mode is at the join. Sister to the G1 type-backfill
discovery (canonical field unfilled fleet-wide) — same class of "two
pieces both work but assume different conventions". Periodic dead-pixel
sweeps are the canary for that class.

**Follow-up units queued:**
- `U-VIZ-G4-SEEDER-FIX`: rewrite seeder to emit `disp.<name>` targets.
- `U-VIZ-G4-DEAD-PIXEL-CRON`: weekly dated report.
- `U-VIZ-G4-REGEN-WIRE`: post-merge audit in regen-viz.

Wiki: [[system-viz-dead-pixel-sweep]]. Related:
[[reference_system_viz_type_backfill_2026_05_20]] · [[reference_master_index_query_telemetry_2026_05_20]].
