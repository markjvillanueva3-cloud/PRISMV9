---
name: reference_post_ship_stub-hunt-ms0-u-stub-hunt-05-event-bus
description: Auto-distilled learnings from shipping STUB-HUNT-MS0/U-STUB-HUNT-05-EVENT-BUS (commit 45cfbe332). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.765Z
aliases: reference_post_ship_stub-hunt-ms0-u-stub-hunt-05-event-bus
---


# STUB-HUNT-MS0/U-STUB-HUNT-05-EVENT-BUS

[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-05-EVENT-BUS (slot:bravo iter27): restore EventBusEngine.ts from U-EFF25 stub — P0 by inventory (9 dispatcher refs, fleet-wide blast). Original had partial publish/getRecentEvents/getStats with hardcoded subscribers:0. Real implementation: typed pub/sub with subscribe(eventType, handler) → unsubscribe handle, wildcard '*' subscribers for global listeners, synchronous fan-out (type-specific first, then wildcard), per-handler try/catch so one bad subscriber can't break the bus (R12 fail-soft), dropped_handler_count counter for observability, configurable historyLimit (default 1000) ring buffer, real subscriber count in getStats, publish_count + history_limit + dropped_handler_count fields added, clear() for test isolation. Named constants: DEFAULT_HISTORY_LIMIT, DEFAULT_GET_RECENT_LIMIT, ID_RAND_SLICE_START/END, WILDCARD. Throws on empty type / null handler per R12. 14/14 PASS vitest hermetic (4 publish + 5 subscribe + 2 getRecentEvents + 1 getStats + 1 clear + 1 singleton round-trip). 4 infraDispatcher call sites (event_bus_publish + event_bus_events + event_bus_stats + summary.event_bus) continue working unchanged — same singleton, same method signatures, richer return shapes. STUB-HUNT progress: 5 of 9 rescued (BusinessSync + CashFlow + MillingForce + MillProgramAnalyzer + EventBus). Remaining mill-galaxy P1: MillScientificPipeline, MillPrintToProgram, ToolpathStrategy, ToolSelectionRecommender.

**Shipped:** 2026-05-27T02:05:29-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[stub-hunt-ms0-u-stub-hunt-05-event-bus]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._