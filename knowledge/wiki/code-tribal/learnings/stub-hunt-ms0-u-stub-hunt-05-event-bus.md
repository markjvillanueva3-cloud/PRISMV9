# STUB-HUNT-MS0/U-STUB-HUNT-05-EVENT-BUS — [MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-05-EVENT-BUS (slot:bravo iter27): restore EventBusEngine.ts from U-EFF25 stub — P0 by inventory (9 dispatcher refs, fleet-wide blast). Original had partial publish/getRecentEvents/getStats with hardcoded subscribers:0. Real implementation: typed pub/sub with subscribe(eventType, handler) → unsubscribe handle, wildcard '*' subscribers for global listeners, synchronous fan-out (type-specific first, then wildcard), per-handler try/catch so one bad subscriber can't break the bus (R12 fail-soft), dropped_handler_count counter for observability, configurable historyLimit (default 1000) ring buffer, real subscriber count in getStats, publish_count + history_limit + dropped_handler_count fields added, clear() for test isolation. Named constants: DEFAULT_HISTORY_LIMIT, DEFAULT_GET_RECENT_LIMIT, ID_RAND_SLICE_START/END, WILDCARD. Throws on empty type / null handler per R12. 14/14 PASS vitest hermetic (4 publish + 5 subscribe + 2 getRecentEvents + 1 getStats + 1 clear + 1 singleton round-trip). 4 infraDispatcher call sites (event_bus_publish + event_bus_events + event_bus_stats + summary.event_bus) continue working unchanged — same singleton, same method signatures, richer return shapes. STUB-HUNT progress: 5 of 9 rescued (BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer + EventBus). Remaining mill-galaxy P1: MillScientificPipeline, MillPrintToProgram, ToolpathStrategy, ToolSelectionRecommender.

**Commit:** `45cfbe332b17` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:05:29-05:00
**Tags:** stub-hunt-ms0, u-stub-hunt-05-event-bus, auto-distilled

## Subject
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-05-EVENT-BUS (slot:bravo iter27): restore EventBusEngine.ts from U-EFF25 stub — P0 by inventory (9 dispatcher refs, fleet-wide blast). Original had partial publish/getRecentEvents/getStats with hardcoded subscribers:0. Real implementation: typed pub/sub with subscribe(eventType, handler) → unsubscribe handle, wildcard '*' subscribers for global listeners, synchronous fan-out (type-specific first, then wildcard), per-handler try/catch so one bad subscriber can't break the bus (R12 fail-soft), dropped_handler_count counter for observability, configurable historyLimit (default 1000) ring buffer, real subscriber count in getStats, publish_count + history_limit + dropped_handler_count fields added, clear() for test isolation. Named constants: DEFAULT_HISTORY_LIMIT, DEFAULT_GET_RECENT_LIMIT, ID_RAND_SLICE_START/END, WILDCARD. Throws on empty type / null handler per R12. 14/14 PASS vitest hermetic (4 publish + 5 subscribe + 2 getRecentEvents + 1 getStats + 1 clear + 1 singleton round-trip). 4 infraDispatcher call sites (event_bus_publish + event_bus_events + event_bus_stats + summary.event_bus) continue working unchanged — same singleton, same method signatures, richer return shapes. STUB-HUNT progress: 5 of 9 rescued (BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer + EventBus). Remaining mill-galaxy P1: MillScientificPipeline, MillPrintToProgram, ToolpathStrategy, ToolSelectionRecommender.

## Body
```
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-05-EVENT-BUS (slot:bravo iter27): restore EventBusEngine.ts from U-EFF25 stub — P0 by inventory (9 dispatcher refs, fleet-wide blast). Original had partial publish/getRecentEvents/getStats with hardcoded subscribers:0. Real implementation: typed pub/sub with subscribe(eventType, handler) → unsubscribe handle, wildcard '*' subscribers for global listeners, synchronous fan-out (type-specific first, then wildcard), per-handler try/catch so one bad subscriber can't break the bus (R12 fail-soft), dropped_handler_count counter for observability, configurable historyLimit (default 1000) ring buffer, real subscriber count in getStats, publish_count + history_limit + dropped_handler_count fields added, clear() for test isolation. Named constants: DEFAULT_HISTORY_LIMIT, DEFAULT_GET_RECENT_LIMIT, ID_RAND_SLICE_START/END, WILDCARD. Throws on empty type / null handler per R12. 14/14 PASS vitest hermetic (4 publish + 5 subscribe + 2 getRecentEvents + 1 getStats + 1 clear + 1 singleton round-trip). 4 infraDispatcher call sites (event_bus_publish + event_bus_events + event_bus_stats + summary.event_bus) continue working unchanged — same singleton, same method signatures, richer return shapes. STUB-HUNT progress: 5 of 9 rescued (BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer + EventBus). Remaining mill-galaxy P1: MillScientificPipeline, MillPrintToProgram, ToolpathStrategy, ToolSelectionRecommender.
```

## Files touched (3)
- mcp-server/src/__tests__/EventBusEngine.test.ts | 143 ++++++++++++++++++++++++
- mcp-server/src/engines/EventBusEngine.ts        | 124 +++++++++++++++++---
- 2 files changed, 254 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 45cfbe332b17`
- Milestone envelope: `mcp-server/data/milestones/STUB-HUNT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._