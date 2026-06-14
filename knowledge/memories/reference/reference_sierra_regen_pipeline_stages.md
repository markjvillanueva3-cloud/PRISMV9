---
name: reference_sierra_regen_pipeline_stages
description: regen-viz.mjs stage order — FAST[] generators → merge-augmentations → repair → dedup → reparent → parent-edges → seed-ghost → drift-gate.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.943Z
aliases: reference_sierra_regen_pipeline_stages
---


**regen-viz.mjs pipeline stage order (system-viz).** The master regenerator runs (roughly): (1) FAST[] generator stages (each `generate-*-features.mjs` emits an augmentation), (2) `merge-augmentations.mjs` (splices augmentations into the merged graph — fail-loud via `regen-viz-merge-guard`), (3) `repair-graph-engine-classification.mjs`, (4) `dedup-graph-nodes.mjs`, (5) `reparent-viz-categories.mjs`, (6) `add-parent-contains-edges.mjs`, (7) `seed-ghost-from-unwired.mjs` (post-merge ref-pool seed for the GNN), (8) drift-gate. ~7 min/run with `--max-old-space-size=16384`. Writes `.last-successful-regen.json` / `.last-regen-failure.json` + `EXECUTIVE-BRIEFING.{json,md}`.

**Why:** the merge gate is the load-bearing safety point — a SIGKILLed merge must abort, NOT continue through stages 3-8 reading a stale graph (the 2026-05-17 lima silent-stale-continue bug).

**How to apply:** to add a stage, register in FAST[] AND (if it's a roost) the merge splice; verify via `.last-successful-regen.json` pendingCount=0 + sidecarOk=true. See [[reference_sierra_fast_splice_dual_registration]] · [[reference_u_regen_viz_merge_faillod_2026_05_17]].
