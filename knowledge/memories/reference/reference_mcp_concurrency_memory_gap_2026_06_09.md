---
name: reference_mcp_concurrency_memory_gap_2026_06_09
description: "MCP server memory under parallel-agent load is UNACCOUNTED-FOR. Each concurrent /mcp request builds a FRESH McpServer (binds all dispatchers) - memory scales with concurrency, not just the slow leak. The watchdog is concurrency-BLIND (preempts on RSS alone -> can restart mid-burst, killing all in-flight agent calls). The U-MCP-BLACKWELL-HEAP bump (heap 24GB/watchdog 18GB) addresses the leak, NOT this."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_concurrency_memory_gap_2026_06_09
---


**2026-06-09 (slot golf) - operator asked "did you account for the fleet spawning parallel agents?" re: the U-MCP-BLACKWELL-HEAP tuning. Answer: NO. Real gaps found:**

**1. Per-request memory scales with CONCURRENCY (the parallel-agent dimension).** `index.ts:1205` -- every concurrent `/mcp` POST builds a **fresh `McpServer` via `buildRequestServer()`** (MCP-CONCURRENCY-FIX 2026-05-31, fixes "Already connected to a transport"). Each fresh server binds ALL dispatchers. So N concurrent requests = N concurrent fresh servers each holding the dispatcher graph. The MCP-FLEET-CAPACITY-MS0 model (`index.ts:1316`) sizes the realistic peak at **300-400 concurrent** (26 slots x ~4 + workflow fan-out 16/slot) and `maxConnections=512` -- but it sized SOCKETS ("cheap ~few KB each") and HAND-WAVED the per-request server memory ("far below the heap", referencing the OLD 384MB cap). The fresh-server-per-request memory at peak is the unmodeled driver.

**2. The watchdog is concurrency-BLIND.** `mcp-server-watchdog.mjs` preempt-restarts on RSS >= threshold + cooldown ONLY -- it does NOT read inflight/concurrency (grep-confirmed: no inflight/concurren/peak refs). So during a parallel-agent BURST (when RSS legitimately spikes from concurrent fresh servers, not a leak), it can fire the restart at the WORST moment, killing every in-flight agent MCP call at once = a concurrency-amplified disconnect storm.

**3. Request concurrency is UNBOUNDED** (only the 512 socket cap). A burst of 400 concurrent requests = 400 concurrent fresh servers; nothing queues/limits the `buildRequestServer()` builds, so the memory spike is unbounded by design.

**What U-MCP-BLACKWELL-HEAP DID help:** raising watchdog 3GB->18GB means it trips far LESS readily during normal bursts (fewer mid-burst restarts), and 24GB heap gives margin. So my change is a net improvement but INCOMPLETE.

**The real fixes (next-session, priority order):**
- **A. Inflight-aware watchdog** (highest leverage, smallest): expose `metrics.inflight` in `/health`, and have the watchdog DEFER the preempt-restart while inflight > threshold (restart in a lull, never mid-burst). Directly prevents the "restart kills all parallel agents" failure.
- **B. Concurrency cap/queue on `buildRequestServer()`** (e.g. max ~64 concurrent builds, queue the rest) -- bounds the memory spike so a parallel-agent burst can't OOM past the heap.
- **C. MEASURE per-request server cost x peak concurrency** and size the heap to it, not just the leak.

Relates to [[reference_mcp_supervisor_persistence_fix_2026_05_31]], [[reference_post_ship_mcp-concurrency-fix-u-mcp-factory-refactor]], the error_ledger_recall_similar leak (still owed).
