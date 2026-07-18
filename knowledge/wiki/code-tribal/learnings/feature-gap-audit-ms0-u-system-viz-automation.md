# FEATURE-GAP-AUDIT-MS0/U-SYSTEM-VIZ-AUTOMATION — [MAIN] [FEATURE-GAP-AUDIT-MS0]/U-SYSTEM-VIZ-AUTOMATION: canonicalize 64 gap units + ghost-node generator + auto-flow

**Commit:** `b66dde0a68f0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T16:16:10-05:00
**Tags:** feature-gap-audit-ms0, u-system-viz-automation, auto-distilled

## Subject
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-SYSTEM-VIZ-AUTOMATION: canonicalize 64 gap units + ghost-node generator + auto-flow

## Body
```
[MAIN] [FEATURE-GAP-AUDIT-MS0]/U-SYSTEM-VIZ-AUTOMATION: canonicalize 64 gap units + ghost-node generator + auto-flow

Work order: add missing PRISM features strategically to the roadmaps, divide
among the chat slots, add ghost nodes + ghost wires to /system-viz, automate
so future audits flow through unchanged.

Canonicalize: FEATURE-GAP-UNITS-2026-05-17.json (64 audit-discovered features)
promoted to a real milestone — mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json
(schema-compatible with build-milestone-progress.mjs, units flat) and registered
in roadmap-index.json (750 -> 751 milestones; MILESTONE_PROGRESS +64 -> 5200).
allocate-domains-to-slots.mjs already routes these gap units to their owning
slot's queue as wave:GAP (lead position).

System-viz ghost nodes + ghost wires: new scripts/generate-feature-gap-features.mjs
follows the priority-queue/misc-tasks/bridge-synergy pattern — emits
ghost.feature_gap_audit roost (L8) + 64 gap-unit children (L9, color-coded by
domain) + 64 explicit audit-discovered edges. Atomic tmp+rename. Newest-by-
date-suffix glob over FEATURE-GAP-UNITS-*.json so future audit drops auto-
propagate without code changes.

Auto-flow registration:
  - scripts/regen-viz.mjs FAST[] += generate-feature-gap-features.mjs
  - scripts/merge-augmentations.mjs += loadOptional + splice block (dedup
    nodes by id, edges by from|to|type, G.meta.featureGap)

Post-commit + hourly cron regen-viz auto-picks up future audits. /system-viz
is the canonical task/roadmap tracking surface: 13 domain slot queues + ghost
roosts (priority_queue, misc_tasks, bridge_synergy, feature_gap_audit) render
every remaining PRISM unit.

Per-file 2-reviewer gate: PASS/PASS. 4-surface doc reflection.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (13)
- CLAUDE.md                                          |   2 +
- .../architecture/feature-gap-audit-2026-05-17.md   |  93 +++
- .../data/milestones/FEATURE-GAP-AUDIT-MS0.json     | 402 ++++++++++++
- mcp-server/data/roadmap-index.json                 |  27 +-
- scripts/generate-feature-gap-features.mjs          | 199 ++++++
- scripts/merge-augmentations.mjs                    |  30 +
- scripts/regen-viz.mjs                              |   1 +
- state/shared/MILESTONE_PROGRESS.json               | 689 ++++++++++++++++++++-
- state/shared/MILESTONE_PROGRESS.md                 |  16 +-
- state/shared/specs/ROADMAP-CONSOLIDATED.html       |  11 +-
_(+3 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b66dde0a68f0`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-GAP-AUDIT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._