# MCP-RELIABILITY/U-MCP-CONCURRENCY-HARDEN — [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed

**Commit:** `ed94bc479fee` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T12:19:09-05:00
**Tags:** mcp-reliability, u-mcp-concurrency-harden, auto-distilled

## Subject
[MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed

## Body
```
[MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed

The fleet runs in ultracode mode: every slot can fan out unlimited parallel
Workflow agents, so :3100 sees bursts of concurrent /mcp POSTs. Each POST builds
a FRESH McpServer (binds the full dispatcher graph) via buildRequestServer()
(MCP-CONCURRENCY-FIX 2026-05-31), so N concurrent requests = N concurrent servers
= an UNBOUNDED memory spike, and the RSS preempt-restart that the watchdog fires
to relieve it is a DISCONNECT for every in-flight agent call. U-MCP-BLACKWELL-HEAP
raised the leak ceiling but did NOT model the concurrency dimension (see
reference_mcp_concurrency_memory_gap_2026_06_09). This closes it:

Fix A (/health) - expose live concurrency {inflight, peak_inflight, active,
  queued, max_concurrency, max_queue} so the watchdog can see burst load.

Fix B (index.ts /mcp) - RequestSemaphore caps simultaneous request-server builds
  (PRISM_MCP_MAX_CONCURRENCY, default 64) and queues the overflow
  (PRISM_MCP_QUEUE_MAX, default 512); past both it sheds with HTTP 503 so a burst
  applies backpressure to clients instead of OOMing the process. Slot released
  exactly once on res 'close' (idempotent guard) so a disconnect/throw can't leak.

Fix C (watchdog) - inflight-aware preempt: DEFER the RSS restart while
  inflight >= PRISM_MCP_WATCHDOG_INFLIGHT_DEFER (default 8) UNLESS RSS crossed the
  hard ceiling PRISM_MCP_WATCHDOG_RSS_HARD_MB (default threshold+10GB = ~28GB) - a
  true runaway leak still recycles (controlled restart beats OOM crash). Unknown
  inflight (older server) -> 0 -> pre-2026-06-09 behavior preserved (fail-safe).
  Decision is the unit-tested pure lib mcp-preempt-decision.mjs (decideRestart
  precedent); lazy-imported + fail-OPEN so a missing lib can't strand the server.

Tests: RequestSemaphore 7/7 (cap/queue/FIFO/load-shed/clamp/release-at-zero),
decidePreemptRestart 12/12 (5 skip gates + restart/defer/hard-ceiling/failsafe).
esbuild build:fast clean. tsc adds 0 new errors (6 pre-existing index.ts errors
at 798-801/1154 are untouched SDK-typing drift). E2E proof with production
defaults: 20GB/40-inflight->defer, 30GB/200->restart(hard-ceiling), 20GB/1->restart.
```

## Files touched (7)
- mcp-server/src/__tests__/request-semaphore.test.ts | 128 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/index.ts                            |  61 +++++++++++++++++++++++++++++++++++++-
- mcp-server/src/mcp/request-semaphore.ts            |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-preempt-decision.mjs               |  75 ++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-preempt-decision.test.mjs          |  95 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/mcp-server-watchdog.mjs                    |  89 +++++++++++++++++++++++++++++++++++++++++++++----------
- 6 files changed, 519 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- till recycles (controlled restart beats OOM crash). Unknown

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed94bc479fee`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._