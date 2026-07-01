# FRONTEND-APP/U-Q-VSM — [MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM (slot:quebec): real value_stream_map engine + dispatcher action + route (replaces erp.ts:367 501 stub). Composes JobTravelerEngine (planned+actual per-op times + scrap) + MachineDispatchEngine (WIP/queue) into a lean value-stream map; honest data_available:false (NO fabrication) when a job has no traveler. 5/5 reference-value tests, tsc clean, route->action contract CLEAN, 2-arm scrutiny PASS. Page UI binding (job selector) is Claude Design's.

**Commit:** `8f9f33ac4e73` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T17:14:41-05:00
**Tags:** frontend-app, u-q-vsm, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM (slot:quebec): real value_stream_map engine + dispatcher action + route (replaces erp.ts:367 501 stub). Composes JobTravelerEngine (planned+actual per-op times + scrap) + MachineDispatchEngine (WIP/queue) into a lean value-stream map; honest data_available:false (NO fabrication) when a job has no traveler. 5/5 reference-value tests, tsc clean, route->action contract CLEAN, 2-arm scrutiny PASS. Page UI binding (job selector) is Claude Design's.

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-VSM (slot:quebec): real value_stream_map engine + dispatcher action + route (replaces erp.ts:367 501 stub). Composes JobTravelerEngine (planned+actual per-op times + scrap) + MachineDispatchEngine (WIP/queue) into a lean value-stream map; honest data_available:false (NO fabrication) when a job has no traveler. 5/5 reference-value tests, tsc clean, route->action contract CLEAN, 2-arm scrutiny PASS. Page UI binding (job selector) is Claude Design's.
```

## Files touched (5)
- mcp-server/src/__tests__/ValueStreamMapEngine.test.ts  | 112 +++++++++++++++++++++++++++++
- mcp-server/src/engines/ValueStreamMapEngine.ts         | 218 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                           |  48 +++++++++++--
- mcp-server/src/tools/dispatchers/businessDispatcher.ts |   9 +++
- 4 files changed, 383 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8f9f33ac4e73`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._