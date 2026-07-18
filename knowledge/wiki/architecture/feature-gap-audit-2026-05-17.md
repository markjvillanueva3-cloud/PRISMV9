---
title: Feature-Gap Audit 2026-05-17
type: architecture
status: shipped
milestone: FEATURE-GAP-AUDIT-MS0
slot: juliett
created: 2026-05-17
tags: [forge-audit-v2, feature-gap, system-viz, ghost-nodes, automation]
---

# Feature-Gap Audit — 2026-05-17

`/forge-audit-v2` run by slot juliett that surfaced **64 PRISM features absent
from the task queue**, canonicalized them as `FEATURE-GAP-AUDIT-MS0`, and wired
the audit findings into the live system-viz graph as ghost nodes for ongoing
visibility.

## Pipeline (now automated)

```
/forge-audit-v2
   ↓ (6 parallel agents — specs, handoffs, unwired engines, extracted/, Resources/, JM DIE/)
FEATURE-GAP-UNITS-<date>.json
   ↓ (canonicalize)
mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json + roadmap-index entry
   ↓ (build-milestone-progress + consolidate-roadmaps)
MILESTONE_PROGRESS + ROADMAP-CONSOLIDATED
   ↓ (allocate-domains-to-slots.mjs)
slot-task-queues.json — domain-keyed, gap units lead each queue (wave:GAP)
   ↓ (generate-feature-gap-features.mjs, registered in regen-viz FAST + merge-augmentations splice)
system-viz: ghost.feature_gap_audit roost + 64 gap-unit nodes + 64 ghost wires
```

The system-viz integration is **automatic** — `regen-viz.mjs` runs on every
post-commit + hourly cron, so future audits dropped into a new
`FEATURE-GAP-UNITS-<date>.json` flow through unchanged: the generator's
date-suffix glob picks the newest file each run.

## Headline gap

- **674 unwired engines, ~595 absent from any roadmap** — clearest "shipped but
  unplanned" debt. Worst: lathe 77, wire 73, misc 328, cam 26.
- **v8.89 monolith digest=0 features** — CAD geometry kernel (geodesic /
  mesh-decimation / surface-recon / spectral-graph), CAM toolpath primitives
  (adaptive-clearing / Clipper2 / aircut-elim), full ERP subsystem
  (subscription / quoting / job-costing / scheduling), 220-courses academy,
  2500-alarm controller DB.
- **Resources/ + JM DIE/** — largely covered by `RES-ROADMAP.json` (RES-MS0-27);
  net-new corpus signals: JM DIE `_PART LIBRARY/` 76K print↔program pairs.

## System-viz integration

`scripts/generate-feature-gap-features.mjs` emits:

- `ghost.feature_gap_audit` roost (L8, parent `ghost.planned_features`).
- 64 `gap-unit` children (L9), color-coded by domain.
- 64 explicit `audit-discovered` ghost wires (gap-unit → roost) — these are the
  "ghost wires" the user asked for; the parent-hierarchy edge would render
  visually but the explicit edge tags the audit relationship for queries.

Registered in:

- `scripts/regen-viz.mjs` `FAST[]` array (after `generate-priority-queue-features.mjs`).
- `scripts/merge-augmentations.mjs` `loadOptional("feature-gap-augmentation.json")` + splice block (mirrors the priority-queue block, dedups nodes by id and edges by `(from|to|type)`, records stats to `G.meta.featureGap`).

Query the roost via `node scripts/system-viz-query.mjs find feature_gap_audit`
once the next regen-viz completes.

## Domain distribution of gap units

```
mill 2 · lathe 3 · wire 2 · cad 9 · cam 7 · tribal 4 · erp 9 · post 4 ·
speedfeed 3 · print2prog 3 · academy 6 · database 7 · misc 5
```

Each gap unit lands in its owning slot's queue (`allocate-domains-to-slots.mjs`
honors the explicit `domain` field, leading the queue as `wave:GAP`).

## Honest caveats

- All 64 units are **proposals** (`advisory_only:true`, `must_human_verify:true`).
  Each still passes `duplicationGuardEngine.mustCheckBeforeCreating()` before
  any `/forge-triple`.
- The audit was time-bounded — additional unplanned features may exist beyond
  what 6 agents surfaced in one session. Re-run `/forge-audit-v2` for refresh.

## See also

- [[per-slot-rgs-allocation]] §Domain-specialized
- [[juliett-12chat-allocation-ms0]]
- [[roadmap-consolidation]]
- `state/shared/specs/FEATURE-GAP-AUDIT-2026-05-17.md` — full audit doc
- `state/shared/specs/FEATURE-GAP-UNITS-2026-05-17.json` — 64 units
