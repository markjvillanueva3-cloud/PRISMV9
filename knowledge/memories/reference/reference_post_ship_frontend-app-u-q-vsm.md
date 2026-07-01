---
name: reference_post_ship_frontend-app-u-q-vsm
description: Auto-distilled learnings from shipping FRONTEND-APP/U-Q-VSM (commit 8f9f33ac4). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.869Z
aliases: reference_post_ship_frontend-app-u-q-vsm
---


# FRONTEND-APP/U-Q-VSM

[MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM (slot:quebec): real value_stream_map engine + dispatcher action + route (replaces erp.ts:367 501 stub). Composes JobTravelerEngine (planned+actual per-op times + scrap) + MachineDispatchEngine (WIP/queue) into a lean value-stream map; honest data_available:false (NO fabrication) when a job has no traveler. 5/5 reference-value tests, tsc clean, route->action contract CLEAN, 2-arm scrutiny PASS. Page UI binding (job selector) is Claude Design's.

**Shipped:** 2026-06-25T17:14:41-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[frontend-app-u-q-vsm]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._