---
name: system-viz-dead-pixel-sweep
description: G4 from SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 — detect edges pointing at absent node ids; finds referenced-but-missing assets + generator naming bugs.
type: architecture
status: shipped
shipped_at: 2026-05-20
slot: sierra
commit_scope: SYSTEM-VIZ-HIGH-ROI-MS0
unit_ids:
  - U-VIZ-G4-DEAD-PIXEL-SWEEP
related:
  - "[[system-viz-type-backfill]]"
  - "[[master-index-query-telemetry]]"
---

# system-viz dead-pixel sweep (G4)

Finds edges whose source OR target node id isn't present in `graph.nodes` —
the system-viz equivalent of dangling references. Two distinct value paths:

1. **Referenced-but-missing assets** — ranked by inbound count. A high-inbound
   orphan is many components expecting something that doesn't exist (= real
   doc-debt / wiring gap).
2. **Generator naming bugs** — when many ghosts of one prefix all dead-ref a
   canonical id of a different prefix, the *generator* emitting those ghosts
   is using the wrong prefix convention (= production bug in the merge
   pipeline).

## Files

- `scripts/lib/system-viz-dead-pixel-detector.mjs` — pure `detectDeadPixels`
  + `renderDeadPixelMarkdown`. 20 `node:test` cases.
- `scripts/lib/system-viz-dead-pixel-detector.test.mjs`.
- `scripts/system-viz-dead-pixel-sweep.mjs` — CLI runner. Writes paired
  `.md` + `.json` to `state/shared/system-viz-dead-pixels-<date>.{md,json}`.
  Flags: `--graph`, `--out`, `--top`, `--max-examples`, `--json`,
  `--no-write`, `--help`.

## Live first-run, 2026-05-20

- 250,497 nodes / 786,400 edges / 405 MB
- 569 dead edges (0.07% — graph is very clean)
- Top orphan target: `dispatcher.prism_cam` (157 inbound, all from
  `ghost.unwired.*Engine`)
- Other heavy orphans: `dispatcher.prism_dev` (70), `dispatcher.prism_turning`
  (61), `dispatcher.prism_calc` (42), `dispatcher.prism_session` (37),
  `dispatcher.prism_ai` (29), `dispatcher.prism_intelligence` (28)
- Verdict: this is a **generator naming-bug** in `seed-ghost-from-unwired.mjs`.
  PREFIX_TO_TYPE (the G1 SSOT) maps `disp` → `dispatcher_router` — every
  real dispatcher in the graph has id `disp.<name>`, not `dispatcher.<name>`.
  The seeder emits proposed `wires_to` edges pointing at `dispatcher.<name>`
  which never exist. ~500/569 dead edges trace to this one bug.

## Pending follow-up units

- `U-VIZ-G4-SEEDER-FIX`: rewrite `seed-ghost-from-unwired.mjs` to emit
  `disp.<name>` instead of `dispatcher.<name>` as the target id of proposed
  wiring edges. Re-run regen; ~500 dead pixels disappear.
- `U-VIZ-G4-DEAD-PIXEL-CRON`: weekly cron writing the dated report.
  Sister to U-VIZ-G2-WEEKLY-CRON.
- `U-VIZ-G4-REGEN-WIRE`: embed the detector as a non-blocking post-merge
  audit in `regen-viz.mjs` — surface drift loudly when dead-edge count rises.

## Verify

```bash
cd H:/prism
node --test scripts/lib/system-viz-dead-pixel-detector.test.mjs           # 20/20
node --max-old-space-size=12288 scripts/system-viz-dead-pixel-sweep.mjs --top 30
# wrote state/shared/system-viz-dead-pixels-<date>.md + .json
```
