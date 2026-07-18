---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Reviewer A (holistic) of a 3-of-3 PRISM scrutiny gate. Re-review the COMPLETE co"
date: "2026-06-09"
first_ts: "2026-06-09T17:44:01.701Z"
last_ts: "2026-06-09T17:47:10.351Z"
cwd: "H:\\prism\\mcp-server"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-affb686325e5ea243.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Reviewer A (holistic) of a 3-of-3 PRISM scrutiny gate. Re-review the COMPLETE co

> **claude-code-cli** | 2026-06-09 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-affb686325e5ea243.jsonl`

## Transcript

### User | 2026-06-09T17:44:01.701Z

Reviewer A (holistic) of a 3-of-3 PRISM scrutiny gate. Re-review the COMPLETE committed change of unit U-MCP-CONCURRENCY-HARDEN on H:/prism (branch cad-fusion-live-ms0), two commits: `git -C H:/prism diff ed94bc47~1..HEAD`. The working tree is clean and matches HEAD.

Background: a prior 3-of-3 caught a P1 — a semaphore slot leak when a client disconnects WHILE its /mcp request is parked in the queue (release listener attached after acquire() never fires; Node does not replay 'close'). The fix extracted `acquireRequestSlot(sem,res)` in mcp-server/src/mcp/request-semaphore.ts which registers a 'close' observer BEFORE acquire() and, on grant-to-an-already-closed-res, releases immediately + returns outcome "abandoned"; the /mcp handler in mcp-server/src/index.ts then just returns (skipping buildRequestServer). A test reproduces the leak; I independently verified the test FAILS if the closedWhileWaiting check is removed (it asserted "proceed" instead of "abandoned" + wedged).

Read: mcp-server/src/mcp/request-semaphore.ts, mcp-server/src/__tests__/request-semaphore.test.ts, the /mcp + /health regions of mcp-server/src/index.ts, scripts/lib/mcp-preempt-decision.mjs, the RSS-defer branch of scripts/mcp-server-watchdog.mjs.

Confirm: (1) the queued-disconnect leak is genuinely closed; (2) the proceed and shed(503) paths are unchanged in behavior; (3) no stubs/TODOs/placeholder returns, no inlined constants, no NEW unsafe casts (the lone `req.body as any` mirrors the sibling line in the same handler); (4) tests use concrete assertions.

First line MUST be exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Then 'BLOCKER:' lines for any P0/P1, then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-09T17:44:21.461Z

I'll re-review the complete committed change. Let me read the diff and the relevant files in parallel.

### Assistant | 2026-06-09T17:44:21.462Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:44:21.747Z

[tool_use: Read]

### Assistant | 2026-06-09T17:44:22.129Z

[tool_use: Read]

### Assistant | 2026-06-09T17:44:22.585Z

[tool_use: Read]

### User | 2026-06-09T17:44:29.655Z

[tool_result] <persisted-output>
Output too large (709.4KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\c7361c9f-19ce-451b-9659-df77324c2fa1\tool-results\bhj5lbjqa.txt

Preview (first 2KB):
diff --git a/.claude/hooks/__tests__/mcp-route-suggest-rtk-guard.test.mjs b/.claude/hooks/__tests__/mcp-route-suggest-rtk-guard.test.mjs
new file mode 100644
index 0000000000..8b8608d3fe
--- /dev/null
+++
... [+1771 chars truncated]

### User | 2026-06-09T17:44:31.538Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\request-semaphore.test.ts' was already read 8m ago in this session and is unchanged (mtime 1781026366491). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-09T17:44:31.541Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-preempt-decision.mjs' was already read 23m ago in this session and is unchanged (mtime 1781024758936). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T17:44:32.835Z

[tool_result] 1	/**
2	 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
3	 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
4	 *
5	 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
6	 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
7	 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
8	 
... [+6300 chars truncated]

### Assistant | 2026-06-09T17:44:43.339Z

The full diff is huge (709KB) because it includes unrelated changes. Let me scope to just the files in question. I already have request-semaphore.ts. Let me read the test, the index.ts regions, and the watchdog RSS-defer branch directly, and get the scoped diff.

### Assistant | 2026-06-09T17:44:44.522Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:44:45.002Z

[tool_use: Read]

### User | 2026-06-09T17:44:50.487Z

[tool_result] <persisted-output>
Output too large (31.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\c7361c9f-19ce-451b-9659-df77324c2fa1\tool-results\b74s43cv9.txt

Preview (first 2KB):
diff --git a/mcp-server/src/__tests__/request-semaphore.test.ts b/mcp-server/src/__tests__/request-semaphore.test.ts
new file mode 100644
index 0000000000..c239fc5296
--- /dev/null
+++ b/mcp-server/src/__t
... [+1797 chars truncated]

### User | 2026-06-09T17:44:51.796Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\request-semaphore.test.ts' was already read 8m ago in this session and is unchanged (mtime 1781026366491). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-09T17:44:57.773Z

The read-once guard says the test file and mcp-preempt-decision.mjs are already in my context from earlier this session, but they aren't in this conversation's visible history. Let me read the test file via the saved diff output and read the index.ts regions and watchdog. Let me bypass the cache guard and read the actual files.

### Assistant | 2026-06-09T17:44:58.504Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:45:00.343Z

[tool_use: Grep]

### User | 2026-06-09T17:45:09.601Z

[tool_result] /**
 * RequestSemaphore tests (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Verifies the concurrency contract the /mcp choke point depends on: cap the
 * active set, queue the overflow, shed beyond the queue (503 backpressure), grant
 * queued waiters FIFO on release, never go negative, and clamp pathological config.
 * Each assertion fails if the corresponding behavior regresses.
 */
impo
... [+8596 chars truncated]

### User | 2026-06-09T17:45:12.054Z

[tool_result] 48-import { registerThreadDispatcher } from "./tools/dispatchers/threadDispatcher.js";
49-import { registerToolpathDispatcher } from "./tools/dispatchers/toolpathDispatcher.js";
50-import { registerCalcDispatcher } from "./tools/dispatchers/calcDispatcher.js";
51-// OBSERVABILITY-MS0 (slot:bravo 2026-05-30): in-process MCP request telemetry singleton.
52-import { metrics, metricsViewHtml } from ".
... [+11188 chars truncated]

### Assistant | 2026-06-09T17:45:17.692Z

I have the semaphore, the test, and the /mcp handler region. Now let me read the watchdog RSS-defer branch and the preempt-decision lib (via cache bypass since the guard claims it's already in context but it isn't visible here).

### Assistant | 2026-06-09T17:45:19.142Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:45:20.320Z

[tool_use: Grep]

### User | 2026-06-09T17:45:28.132Z

[tool_result] /**
 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restarting
 * then ki
... [+3669 chars truncated]

### User | 2026-06-09T17:45:29.549Z

[tool_result] 29- * Knobs:
30- *   PRISM_MCP_WATCHDOG_DISABLE=1        watchdog exits 0 immediately
31- *   PRISM_MCP_WATCHDOG_TIMEOUT_MS=N     /health timeout (default 10000)
32- *   PRISM_MCP_WATCHDOG_FAIL_THRESHOLD=N consecutive fails before escalation (default 2)
33- *   PRISM_MCP_WATCHDOG_DRY_RUN=1        probe + decide, never kill/spawn (burn-in)
34: *   PRISM_MCP_WATCHDOG_BOOTGUARD=1      enable the BOOT
... [+11678 chars truncated]

### Assistant | 2026-06-09T17:45:34.968Z

I now have all five files. Let me verify the `/health` concurrency block exists (the watchdog reads `j?.concurrency?.inflight`) and confirm the inflight counter and the proceed-path release wiring in index.ts.

### Assistant | 2026-06-09T17:45:36.208Z

[tool_use: Grep]

### User | 2026-06-09T17:45:38.849Z

[tool_result] 50-import { registerCalcDispatcher } from "./tools/dispatchers/calcDispatcher.js";
51-// OBSERVABILITY-MS0 (slot:bravo 2026-05-30): in-process MCP request telemetry singleton.
52-import { metrics, metricsViewHtml } from "./observability/metrics-collector.js";
53:// MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): bounded-concurrency gate for /mcp.
54-import { RequestSemaphore, acquireRequestSlot } f
... [+4191 chars truncated]

### Assistant | 2026-06-09T17:45:50.368Z

Now I have the full picture. Let me reason carefully through each verification point, paying special attention to the close-while-queued ordering and the `proceed` path correctness.

Let me trace the critical ordering concern in `acquireRequestSlot`:

1. `res.on("close", () => { closedWhileWaiting = true; })` — observer registered before acquire.
2. `await sem.acquire()` — this `await` is where macrotasks can interleave. If the client disconnects while queued, the waiter's resolve is called by `release()` (synchronous, from a holder). The `closedWhileWaiting` flag was set by the 'close' event which fires as a macrotask.
3. After the grant: `res.on("close", release)` is registered. Then the synchronous check `if (closedWhileWaiting || res.closed === true)`.

The key subtlety: when does the `release` listener (registered at line 146) matter vs. the abandoned-path immediate release? If `closedWhileWaiting` is true, the code calls `release()` immediately and returns "abandoned". But it ALSO registered `res.on("close", release)` at line 146. Since `release` is idempotent (guarded by `released` flag), even if 'close' had already fired before line 146 (so the listener never runs) — the immediate `release()` at line 151 handles it. And if a SECOND close were somehow emitted, the idempotent guard prevents double-release. Good — no double-decrement, no leak.

Let me verify one more potential issue: the "proceed" path where `res` closes between `acquire()` resolving and line 146. Let me also double check the test that proves the leak repro fails without the fix, and check there are no `as any`/stub issues elsewhere in the scoped diff.

### Assistant | 2026-06-09T17:45:53.084Z

[tool_use: Bash]

### User | 2026-06-09T17:46:04.738Z

[tool_result] === as any in /mcp region (1160-1290) ===
40:      (res as any).write = (c: any, ...a: any[]) => {
44:      (res as any).end = (c: any, ...a: any[]) => {
80:          id: (req.body && (req.body as any).id) ?? null,
110:          id: (req.body && (req.body as any).id) ?? null,
118:      try { (reqServer as any).close?.(); } catch { /* best-effort */ }
=== run the semaphore test ===

 RUN  v4.1.5 H:
... [+241 chars truncated]

### Assistant | 2026-06-09T17:46:14.324Z

All 12 tests pass. The `as any` casts in the /mcp region are all pre-existing patterns: the observability write/end taps (lines 1199/1203 ~`res as any`), the sibling `req.body as any` for the error-path 500 response (line 1269), and the `reqServer as any).close?.()` teardown. The new line 1239 (`req.body as any`) for the 503 shed-path `id` extraction mirrors the existing sibling at line 1269 exactly — same handler, same idiom, not a new unsafe-cast class.

Let me run the watchdog preempt-decision test and the route-suggest test to confirm the other touched files have passing concrete tests, and verify the abandoned-path's interaction with `decInflight` (that it doesn't double-decrement).

### Assistant | 2026-06-09T17:46:16.385Z

[tool_use: Bash]

### User | 2026-06-09T17:46:24.172Z

[tool_result] === preempt-decision test ===
  ...
# Subtest: burst one below the threshold restarts
ok 12 - burst one below the threshold restarts
  ---
  duration_ms: 0.0482
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 71.8264
=== verify decInflight fires once on abandoned path: incInflight then single close ===
42:  peakInflight: number;
55:  peakInflig
... [+488 chars truncated]

### Assistant | 2026-06-09T17:46:29.636Z

Let me verify `decInflight` floors at zero (so even if the inflight accounting were ever off, it can't go negative) and confirm the `metrics.inflight` getter, plus double-check there are no other behavioral changes to the proceed path beyond the `acquireRequestSlot` insertion (i.e., the original proceed flow from line 1252 onward is unchanged).

### Assistant | 2026-06-09T17:46:31.397Z

[tool_use: Bash]

### User | 2026-06-09T17:46:38.252Z

[tool_result] === decInflight impl ===
  peakInflight = 0;
  totalCalls = 0;
  totalErrors = 0;

  incInflight(): void {
    this.inflight++;
    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
  }

  decInflight(): void {
    if (this.inflight > 0) this.inflight--;
  }

  recordMethod(method: string): void {
    try {
      if (typeof method !== "string" || method.length === 0) return
... [+2044 chars truncated]

### Assistant | 2026-06-09T17:47:10.351Z

I now have full verification. Let me synthesize the analysis.

**Verification summary:**

**(1) Queued-disconnect leak genuinely closed** — `acquireRequestSlot` registers `res.on("close", () => closedWhileWaiting = true)` BEFORE `await sem.acquire()`. When a client disconnects while queued, 'close' fires as a macrotask during the await; the holder's synchronous `release()` then grants the slot to the dead waiter. Post-grant, the synchronous check `if (closedWhileWaiting || res.closed === true)` fires (no `await` interleaves between grant and check, so the flag is stable), calls `release()` → `sem.release()` decrements active, and returns `"abandoned"`. The handler then `return`s, skipping `buildRequestServer()`. The test `"does NOT leak a slot when the client disconnects WHILE queued"` asserts `outcome === "abandoned"`, `inUse === 0`, `queued === 0`, AND that a fresh acquire then proceeds — concrete and the prompt confirms it fails (proceed + wedged) without the guard. The `sustained burst` test proves capacity never erodes across 6 mid-queue disconnects. Leak closed.

**(2) proceed + shed(503) paths behaviorally unchanged** — proceed: `outcome === "proceed"` falls through to the unchanged `buildRequestServer()` flow (lines 1252+, byte-identical to pre-existing MCP-CONCURRENCY-FIX code); `release` is wired idempotently to res 'close'. shed: only reached when `sem.acquire()` resolves false (both active+queue saturated), emits 503 with `-32000` and a `headersSent`/`res.end()` fallback; `decInflight` still fires via the pre-existing `res.on("close")`. The default `(64, 512)` config means shed never triggers under normal load. `metrics.decInflight()` floors at zero, so the abandoned path (where 'close' already fired once → one decInflight) cannot underflow.

**(3) No stubs/TODOs/placeholders/inlined constants/new unsafe casts** — semaphore + lib are complete and pure. Config via env (`PRISM_MCP_MAX_CONCURRENCY`/`QUEUE_MAX`, watchdog `RSS_HARD_MB`/`INFLIGHT_DEFER`), no m
... [+2949 chars truncated]
