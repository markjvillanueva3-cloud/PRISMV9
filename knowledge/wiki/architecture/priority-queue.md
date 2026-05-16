---
name: priority-queue
type: architecture
layer: orchestration
created: 2026-05-16
boost_keywords: [priority queue, pickup queue, backend-dev first, color-coded units, pickNextUnit, ghost.priority_queue, autonomous pickup]
description: Master color-coded priority queue surfacing every remaining ROADMAP-CONSOLIDATED unit in /system-viz, with backend-dev units sorted to the TOP. Runtime API picks the next eligible unit (already-shipped + peer-claimed filtered).
links:
  - script: scripts/generate-priority-queue-features.mjs
  - test: scripts/generate-priority-queue-features.test.mjs
  - helper: .claude/helpers/priority-queue.mjs
  - test: .claude/helpers/priority-queue.test.mjs
  - source: state/shared/specs/ROADMAP-CONSOLIDATED.json
  - wired: scripts/regen-viz.mjs (FAST[]), scripts/merge-augmentations.mjs (splice)
  - companion: roadmap-consolidation, checkin-loop-fullstack
  - memory: priority-queue-ms0-2026-05-16
---

# Priority Queue — Master pickup order for the 5826-item remaining-work set

## Promise

When a chat finishes a unit, the next unit to pick is **deterministic and
visible**: backend-dev tools first (blue), then bridge units (amber), then
app-functionality (green). One viz node + one helper API = no more "which unit
should I take next?" ambiguity.

## What it does

`scripts/generate-priority-queue-features.mjs` reads `ROADMAP-CONSOLIDATED.json`
(5826 items = 4497 pending + 969 prose + 42 bridge) and emits the
`ghost.priority_queue` roost + one color-coded `priority-unit` child per
remaining item, ordered by `(priority asc, milestone asc, unit_id asc)`.

**Categorization** (pure `classifyUnit({milestone, suggested_domain, source})`):
- **backend-dev** (priority 0, color `#3b82f6`) — milestone matches
  `BACKEND-DEVTOOLS|RGS|INFRA|HOOK|DEV-VELOCITY|COMMAND-KERNEL|SYSTEM-VIZ|
  FLEET-REAPER|CLEANUP|TRIBAL-GRAPH|MEMORY|CHECKIN|OLLAMA|AUTOCOMPACT|
  SLOT-WORKTREE|MISC-TASKS|ROADMAP-CONSOL|PRIORITY-QUEUE|NN-GRAPH|
  OBSIDIAN-INTELLIGENCE` OR domain ∈ `{hooks, infra, docs}`.
- **bridge** (priority 1, color `#f59e0b`) — units flagged `source==='bridge'`
  by the emitter (`bridge_units.{wiring,deep_integration}` from the
  consolidated inventory).
- **app-functionality** (priority 2, color `#10b981`) — everything else
  (CAM, mill, lathe, wedm, SFC, etc.).

## Runtime API

`.claude/helpers/priority-queue.mjs`:
```
node .claude/helpers/priority-queue.mjs --summary
# → total=5508 byCategory={"app-functionality":5221,"backend-dev":245,"bridge":42}

node .claude/helpers/priority-queue.mjs --pick --top 3
# → U-CLEANUP-A1 [backend-dev p0] CLEANUP-MS0 — A1 — extend SLOT_NAMES...
#   U-CLEANUP-A2 [backend-dev p0] CLEANUP-MS0 — A2 — fleet-status.mjs renderer
#   U-CLEANUP-A3 [backend-dev p0] CLEANUP-MS0 — A3 — /checkin --golf docs
```

`pickNextUnit({slot, excludeIds, topN})` returns the highest-priority eligible
unit, filtering out already-shipped (`MILESTONE_PROGRESS.shipped`) + units
referenced in active slot topics. The runtime API and the visualization use the
**same** `classifyUnit` import — no drift between what the viz shows and what
the helper picks.

## First-run numbers (2026-05-16, slot juliett)

- Roost: 1 (`ghost.priority_queue`, parent `ghost.planned_features`)
- Total units classified: **5,508** (4497 pending + 969 prose + 26 wiring + 16 deep-integration)
- Color split: **245 backend-dev (blue) · 42 bridge (amber) · 5221 app-functionality (green)**
- Nodes emitted: 3,588 (rest collapse on title-hash for idless items)
- Misc-tasks orphans (318) surface via the existing `ghost.misc_tasks` roost (separate sibling)

## Deferred follow-ups

Three Stop hooks were planned but deferred (separate /loop or follow-up
session): `stop-auto-pickup-next.mjs` (advise next unit when one ships),
`stop-wiring-check.mjs` (verify shipped engines wired), `stop-high-roi-proposer.mjs`
(suggest high-leverage extensions). The priority-queue helper is the API
contract; the Stop hooks consume it.

## Safety

Advisory only. The viz is `ghost`/`status=ghost`. No envelope mutation. The
runtime API never auto-claims — it only suggests. Strict claim enforcement at
commit time remains `commit-ownership-guard`.
