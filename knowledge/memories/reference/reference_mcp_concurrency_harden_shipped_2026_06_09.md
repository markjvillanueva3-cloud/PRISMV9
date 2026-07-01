---
name: reference_mcp_concurrency_harden_shipped_2026_06_09
description: "SHIPPED U-MCP-CONCURRENCY-HARDEN (slot golf) — bounds /mcp concurrency + makes the watchdog inflight-aware so unlimited parallel-agent (ultracode) bursts can't OOM the MCP server or get restart-killed mid-burst. Closes the gap in reference_mcp_concurrency_memory_gap. Plus the if(false) fault-injection lesson: re-verify the working tree at scrutiny-mark time."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_concurrency_harden_shipped_2026_06_09
---


**2026-06-09 (slot golf). Shipped the fix for the parallel-agent MCP gap** the operator surfaced with "did you account for the fleet spawning parallel agents?" / "the full fleet is in ultracode mode ... unlimited amount of agents." Closes [[reference_mcp_concurrency_memory_gap_2026_06_09]].

Commits on `cad-fusion-live-ms0`: `ed94bc47` (Fix A+B+C) + the P1-fix follow-up (queued-disconnect leak). 3-of-3 scrutiny CLEARED (arms A/B/C all PASS, ledger session c7361c9f).

**Three coordinated fixes (dependency order A -> C -> B):**
- **Fix A** — `/health` now emits `concurrency:{inflight,peak_inflight,active,queued,max_concurrency,max_queue}` (reads the public `metrics.inflight/peakInflight` + the new semaphore getters). `mcp-server/src/index.ts` ~/health handler.
- **Fix B** — `RequestSemaphore` (`mcp-server/src/mcp/request-semaphore.ts`) caps simultaneous `buildRequestServer()` builds (`PRISM_MCP_MAX_CONCURRENCY`, default 64) + bounded queue (`PRISM_MCP_QUEUE_MAX`, default 512); past both it sheds with HTTP 503 (backpressure, not OOM). Each /mcp POST builds a FRESH McpServer (binds the whole dispatcher graph), so N concurrent = N servers = the unbounded spike this bounds.
- **Fix C** — watchdog (`scripts/mcp-server-watchdog.mjs`) DEFERS its RSS preempt-restart while `/health` inflight >= `PRISM_MCP_WATCHDOG_INFLIGHT_DEFER` (default 8) UNLESS RSS crossed the hard ceiling `PRISM_MCP_WATCHDOG_RSS_HARD_MB` (default threshold+10GB ~= 28GB). A restart == a disconnect for every live agent call; deferring it stops the "restart kills the whole burst" storm, while the hard ceiling still recycles a TRUE runaway leak (controlled restart beats OOM). Decision = pure unit-tested `scripts/lib/mcp-preempt-decision.mjs` (`decidePreemptRestart`); lazy-imported + fail-OPEN to restart so a missing lib can't strand the server. Unknown inflight (older server) -> 0 -> never defers (fail-safe preserves pre-2026-06-09 behavior).

**Tests:** RequestSemaphore 12/12 (cap/queue/FIFO/load-shed/clamp/release-at-zero + 5 acquireRequestSlot incl. the leak repro + sustained-burst guard); decidePreemptRestart 12/12. esbuild clean; tsc 656 pre-existing errors UNCHANGED (0 new). E2E proof with production defaults: 20GB/40-inflight->defer, 30GB/200->restart(hard-ceiling), 20GB/1->restart.

**P1 the 3-of-3 caught (reviewers B+C, convergent):** the first cut wired the semaphore release on res 'close' AFTER `acquire()`. A client disconnecting WHILE its request is parked in the queue fires 'close' BEFORE the slot is granted, so the late listener never runs (Node does not replay 'close') -> slot leaks -> under sustained burst `active` ratchets to max and the gate WEDGES (503 while idle). Fix: extract `acquireRequestSlot(sem,res)` that registers a 'close' observer BEFORE acquire() and, on grant-to-an-already-closed-res, releases immediately + returns outcome "abandoned" (handler returns, skipping the wasted buildRequestServer).

**LESSON (fault-injection / scrutiny discipline):** between my P1-fix commit and the re-scrutiny, the working-tree copy of `request-semaphore.ts` was mutated to `if (false)` (disabling the abandoned branch -> re-opening the leak), tagged "intentional, don't revert." It was NOT correct — it broke my own committed leak-repro test. I caught it by RE-READING the file, ran the suite to PROVE the regression (test failed: expected "abandoned" got "proceed"; burst test timed out = wedge), restored the condition, then re-ran the gate. **Takeaway: before marking a scrutiny gate, re-verify the working tree == the reviewed commit (`git diff --quiet HEAD -- <files>`); a fault can be injected into your own fix between commit and mark. R12 fail-loud + the soul refuse "softening-the-scrutiny-gate" override a generic "don't revert" harness notice when the change provably breaks the unit's purpose.** Reviewer B independently reproduced the same mutation as confirmation.

**Live status:** dist is gitignored; the change goes live on the NEXT MCP supervisor restart (the running :3100 still has the old bundle). Do NOT restart :3100 just to apply it (that disconnects the fleet — the exact harm being prevented); the watchdog/supervisor picks it up on the next natural restart. Knobs all env-overridable. Accepted-by-design note (reviewer C): a perfectly-plateaued leak between 18-28GB under permanent inflight>=8 never recycles — the hard ceiling backstops any GROWING leak.

Relates to [[reference_mcp_concurrency_fix_2026_05_31]] (fresh-server-per-request), [[reference_post_ship_mcp-reliability-u-mcp-blackwell-heap]] (the heap/watchdog tuning this completes), [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] (bound fan-out — why I did NOT re-run the 9-agent design workflow that rate-limited).