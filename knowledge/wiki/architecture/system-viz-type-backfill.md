---
name: system-viz-type-backfill
description: G1 from SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 — pure id-prefix → canonical-type backfill, closes the 100%-untyped gap under `node.type`.
type: architecture
status: shipped
shipped_at: 2026-05-20
slot: sierra
commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
unit_ids:
  - U-VIZ-G1-TYPE-BACKFILL
related:
  - "[[system-viz-find-cache]]"
  - "[[nn-graph-ms0]]"
  - "[[checkin-loop-fullstack]]"
---

# system-viz Node-Type Backfill (G1)

Closes the 100%-untyped gap in `state/shared/system-viz/system-graph.json`
under the canonical `node.type` field. Before this unit, every downstream
classifier (master-index BM25 type-weight, viewer per-type coloring,
blast-radius type-filter, NN-GRAPH input features) degraded to `?` because
the L12 FS expansion + atomic generators emit nodes with an id-prefix +
label but no canonical type. The `type`-shaped data in the live graph was
actually living in `node.kind` (an alternative field), confusing every
consumer that read `node.type` per the documented schema.

## Files

- `scripts/lib/system-viz-type-backfill.mjs` — pure lib (`PREFIX_TO_TYPE`,
  `inferType`, `applyTypeBackfill`, `countTypeCoverage`). No filesystem
  touch, no subprocess; pure-core per
  [[reference_fleet_reaper_ms1]] design.
- `scripts/lib/system-viz-type-backfill.test.mjs` — 24 `node:test` cases
  covering happy path + R12 fail-loud + idempotency + real-world
  distribution simulation.
- `scripts/system-viz-type-backfill.mjs` — CLI runner. Reads graph,
  applies, atomic-writes back, honors `PRISM_SYSTEM_GRAPH_WRITE_LOCK_OFF`
  (cross-lock per U-VIZ-F11). Flags: `--dry-run`, `--allow-unknown`,
  `--skip-unknown`, `--json`, `--graph <path>`.

## R12 policy

`onUnknown` default is `"throw"` — surfaces novel prefixes instead of
silently typing them. Three explicit modes:

- `throw` (default) — fail-loud. First unknown prefix throws with a
  descriptive message naming the prefix + an example id.
- `allow` — type the node as `"unknown"`, accumulate prefix counts in
  `report.unknownPrefixes`. Use this for the first live pass; surface the
  list, then add the legitimate prefixes to `PREFIX_TO_TYPE` and re-run.
- `skip` — leave untyped, count in `report.skippedUnknown`.

The lib is idempotent: nodes that already have a non-empty `type` are
never overwritten. Empty-string `type` is treated as untyped (length check).

## Live results — first run, 2026-05-20

- Graph: 250,497 nodes / 786,400 edges / 399.3 MB
- Before: 0 typed (0.0%) / 250,497 untyped — under canonical `node.type`
- After: 250,497 typed (100.0%) / 0 untyped
- Delta: 249,106 mapped via PREFIX_TO_TYPE + 1,391 allowed as `unknown`
- Novel prefixes surfaced: `fe` (457), `memory_reference` (217),
  `memory_feedback` (86), several `memory_*` buckets, `wt` (78), `tr` (20),
  `boxextract` (58), `untracked` (36), plus a handful with single-digit
  counts. The first 8 were added to `PREFIX_TO_TYPE`; remaining truly-rare
  prefixes (single-digit counts) accepted as `unknown` and left for a
  follow-up unit when their producing generator can be identified.

## Wire-up

The lib + runner are stage-runnable today (one-shot CLI). The natural
next steps are:

1. **Wire into `scripts/regen-viz.mjs`** as a post-merge stage between
   dedup and parent-edges (~10 LOC, spawnSync to the runner script).
   This makes type-backfill automatic on every regen. Pending unit
   `U-VIZ-G1-REGEN-WIRE`.
2. **Strengthen the prefix extractor** to handle the `<bucket>_<sub>`
   underscore-separated memory ids cleanly (the current `indexOf('.')`
   logic absorbs the underscore section into the prefix; not strictly
   wrong but the canonical type for all `memory_*` is `memory_entry`).
   Pending unit `U-VIZ-G1-PREFIX-NORMALIZE`.
3. **Consumer-side adoption**: master-index BM25 weights should boost
   high-trust types (engine, dispatcher_router) over low-trust
   (untracked_file). Pending unit `U-MASTER-INDEX-TYPE-WEIGHTS`.

## Verify

```bash
cd H:/prism
node --test scripts/lib/system-viz-type-backfill.test.mjs      # 24/24
node scripts/system-viz-type-backfill.mjs --dry-run --json     # report
node scripts/system-viz-type-backfill.mjs --allow-unknown      # apply
```

After apply, the live `node.type` field should be ≥99% populated.
