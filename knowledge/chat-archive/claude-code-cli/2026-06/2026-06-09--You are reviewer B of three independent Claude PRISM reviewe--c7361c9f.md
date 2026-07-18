---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are reviewer B of three independent Claude PRISM reviewers — an INDEPENDENT "
date: "2026-06-09"
first_ts: "2026-06-09T17:21:01.009Z"
last_ts: "2026-06-09T17:26:37.528Z"
cwd: "H:\\prism"
messages: 57
user_msgs: 22
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-adecbb69a344a5a33.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are reviewer B of three independent Claude PRISM reviewers — an INDEPENDENT 

> **claude-code-cli** | 2026-06-09 | 57 msgs (22 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-adecbb69a344a5a33.jsonl`

## Transcript

### User | 2026-06-09T17:21:01.009Z

You are reviewer B of three independent Claude PRISM reviewers — an INDEPENDENT second pass on commit ed94bc47 at H:/prism (branch cad-fusion-live-ms0). Do NOT assume reviewer A caught anything. You are weighted toward TEST INTEGRITY, release-exactly-once correctness, the defer/restart decision boundary, and inlined-constant / magic-number detection.

Read yourself:
- `git -C H:/prism show ed94bc47`
- Full files: H:/prism/mcp-server/src/mcp/request-semaphore.ts + its test H:/prism/mcp-server/src/__tests__/request-semaphore.test.ts; H:/prism/scripts/lib/mcp-preempt-decision.mjs + its test H:/prism/scripts/lib/mcp-preempt-decision.test.mjs
- Edited regions: H:/prism/mcp-server/src/index.ts (/health + /mcp POST handler) and H:/prism/scripts/mcp-server-watchdog.mjs (probeHealth + RSS-pressure branch).

Context: a RequestSemaphore (max concurrency + bounded queue + load-shed 503) gates the /mcp choke point; a pure decidePreemptRestart() decides restart/defer/skip for the watchdog's RSS preempt-restart so it won't kill a parallel-agent burst mid-flight (hard-ceiling override for true leaks).

Verify specifically:
- TEST INTEGRITY: do the 7 semaphore tests and 12 decision tests actually FAIL if the logic regresses? Check that FIFO ordering, the clamp (max>=1, queueMax>=0, floor, NaN/Infinity), release-at-zero no-op, and the >= defer-threshold boundary are each asserted with concrete expected values — not tautologies. Flag any test that would still pass against a broken implementation.
- SEMAPHORE CORRECTNESS: in release(), the slot is handed to a FIFO waiter (active unchanged) else active--. Confirm this cannot (a) go negative, (b) over-subscribe past max, (c) deadlock when queueMax=0. Confirm acquire() returns a still-pending Promise (not a dropped one) for a queued waiter.
- DECISION BOUNDARY: confirm the 5 skip gates short-circuit in the right order, hardLeak override beats burst-defer, and inflightDeferAt=0 disables defer. Confirm unknown/NaN inflight => 0.
- MAGIC NUM
... [+559 chars truncated]

### Assistant | 2026-06-09T17:21:10.792Z

I'll review commit ed94bc47 thoroughly, focusing on test integrity, semaphore correctness, the decision boundary, and magic numbers.

### Assistant | 2026-06-09T17:21:11.472Z

[tool_use: Bash]

### User | 2026-06-09T17:21:24.204Z

[tool_result] commit ed94bc479feee9c75b158f77a7aa0c91a8c7867d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 12:19:09 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed
    
    The fleet runs in ultracode mode: every slot can fan out unlimited para
... [+2665 chars truncated]

### Assistant | 2026-06-09T17:21:30.359Z

Noted on the git hint. Let me read the four core files in full and the edited regions.

### Assistant | 2026-06-09T17:21:30.868Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:31.237Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:32.198Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:32.256Z

[tool_use: Read]

### User | 2026-06-09T17:21:33.549Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\mcp\request-semaphore.ts' was already read 7s ago in this session and is unchanged (mtime 1781024661695). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T17:21:33.551Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\request-semaphore.test.ts' was already read 7s ago in this session and is unchanged (mtime 1781024701355). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-09T17:21:36.288Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-preempt-decision.test.mjs' was already read 10s ago in this session and is unchanged (mtime 1781024791560). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T17:21:37.777Z

[tool_result] 1	/**
2	 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
3	 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
4	 *
5	 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
6	 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
7	 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restart
... [+3889 chars truncated]

### Assistant | 2026-06-09T17:21:49.410Z

The read-once guard says I've already read these files this session, but I don't have them in my visible context (this is a fresh review task). Let me re-read with the cache disabled to get the actual content.

### Assistant | 2026-06-09T17:21:49.411Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:49.415Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:49.419Z

[tool_use: Read]

### User | 2026-06-09T17:21:51.726Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\mcp\request-semaphore.ts' was already read 26s ago in this session and is unchanged (mtime 1781024661695). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T17:21:51.772Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\request-semaphore.test.ts' was already read 26s ago in this session and is unchanged (mtime 1781024701355). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-09T17:21:51.773Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-preempt-decision.test.mjs' was already read 26s ago in this session and is unchanged (mtime 1781024791560). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T17:22:00.158Z

The read-once guard is blocking me. I'll disable the cache via the documented env var.

### Assistant | 2026-06-09T17:22:00.843Z

[tool_use: Bash]

### User | 2026-06-09T17:22:11.146Z

[tool_result] /**
 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
 * concurrent pea
... [+2977 chars truncated]

### Assistant | 2026-06-09T17:22:15.484Z

I have the semaphore source now. Let me get the test files and the edited regions.

### Assistant | 2026-06-09T17:22:16.830Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:22:17.369Z

[tool_use: Bash]

### User | 2026-06-09T17:22:30.634Z

[tool_result]      1	/**
     2	 * RequestSemaphore tests (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
     3	 *
     4	 * Verifies the concurrency contract the /mcp choke point depends on: cap the
     5	 * active set, queue the overflow, shed beyond the queue (503 backpressure), grant
     6	 * queued waiters FIFO on release, never go negative, and clamp pathological config.
     7	 * Each assertion fails 
... [+5329 chars truncated]

### User | 2026-06-09T17:22:50.584Z

[tool_result]      1	/**
     2	 * Tests for decidePreemptRestart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
     3	 *
     4	 * The function gates a DESTRUCTIVE restart, so the tests pin every branch: the five
     5	 * skip gates, restart-in-a-lull, defer-mid-burst, the hard-ceiling override that
     6	 * recycles a true leak even mid-burst, and the unknown-inflight fail-safe that
     7	 * preserves pr
... [+3801 chars truncated]

### Assistant | 2026-06-09T17:22:57.142Z

Now I have both test files and the decision lib. Let me read the edited regions of index.ts and the watchdog.

### Assistant | 2026-06-09T17:22:57.156Z

[tool_use: Bash]

### User | 2026-06-09T17:23:04.934Z

[tool_result] commit ed94bc479feee9c75b158f77a7aa0c91a8c7867d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 12:19:09 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed
    
    The fleet runs in ultracode mode: every slot can fan out unlimited para
... [+13695 chars truncated]

### Assistant | 2026-06-09T17:23:11.690Z

I now have the full picture of all changes. Let me verify two critical things: (1) the `metrics.inflight` / `metrics.peakInflight` fields actually exist as public on the metrics collector, and (2) whether there's a subtle double-counting concern between `metrics.inflight` and the semaphore. Let me also confirm the index.ts `incInflight`/`decInflight` placement relative to the acquire/release.

### Assistant | 2026-06-09T17:23:13.017Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:23:13.587Z

[tool_use: Bash]

### User | 2026-06-09T17:23:23.320Z

[tool_result] 41:  inflight: number;
42:  peakInflight: number;
54:  inflight = 0;
55:  peakInflight = 0;
59:  incInflight(): void {
60:    this.inflight++;
61:    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
64:  decInflight(): void {
65:    if (this.inflight > 0) this.inflight--;
152:      inflight: this.inflight,
153:      peakInflight: this.peakInflight,
178:        "# HELP pris
... [+565 chars truncated]

### User | 2026-06-09T17:23:29.147Z

[tool_result]         return _oe(c, ...a);
      };
    }
    res.on("finish", () => {
      let _ok = res.statusCode < 400;
      try {
        if (_isCall && _blen > 0 && _blen < _CAP) {
          const p = JSON.parse(Buffer.concat(_chunks).toString("utf8"));
          if (p && (p.error || (p.result && p.result.isError === true))) _ok = false;
        }
      } catch {
        /* unparseable / oversized body 
... [+2132 chars truncated]

### Assistant | 2026-06-09T17:23:36.759Z

Confirmed: `metrics.inflight` and `metrics.peakInflight` are public class fields (lines 54-55), incremented/decremented via `incInflight`/`decInflight`. The /health block reads real live values.

Now let me examine one important detail: the ordering. `res.on("close", () => metrics.decInflight())` is registered BEFORE the `await mcpSem.acquire()`. If the client disconnects WHILE a request is queued in the semaphore (waiting for a slot), what happens? The `acquire()` Promise is still pending — the waiter resolver sits in the `waiters[]` array. Let me trace this edge case carefully, plus verify where `incInflight` is called.

### Assistant | 2026-06-09T17:23:38.413Z

[tool_use: Bash]

### User | 2026-06-09T17:23:47.578Z

[tool_result] 1165:  app.post("/mcp", async (req, res) => {
1175:    metrics.incInflight();

### Assistant | 2026-06-09T17:23:58.441Z

[tool_use: Bash]

### User | 2026-06-09T17:24:05.377Z

[tool_result]   app.post("/mcp", async (req, res) => {
    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): instrument every MCP request at the
    // single choke point — per-tool count/latency + live/peak concurrency. Wrapped so
    // a telemetry bug can never alter dispatch behavior (collector never throws).
    const _m0 = Date.now();
    const _method = (req.body && typeof req.body.method === "string") ? req
... [+581 chars truncated]

### Assistant | 2026-06-09T17:24:15.033Z

Now I have the complete trace. Let me analyze the critical queued-disconnect edge case:

**Sequence when a client disconnects while QUEUED in the semaphore:**
1. `metrics.incInflight()` (line 1175) — inflight counts this request
2. `res.on("close", () => metrics.decInflight())` registered (line 1220)
3. `await mcpSem.acquire()` — request parks in `waiters[]` (all slots busy)
4. Client disconnects → `res` emits `'close'` → `metrics.decInflight()` fires. But the `acquire()` Promise is STILL PENDING — the resolver is still in `waiters[]`.
5. `releaseSlot` is NOT yet registered (it's registered AFTER acquire resolves, line 1250).
6. Later, a holder calls `release()` → `waiters.shift()` → resolves the dead request's `acquire()` with `true`, decrementing nothing but consuming the slot-handoff. Now the awaited code resumes on a closed `res`: it registers `releaseSlot` on `'close'` (already fired — won't fire again), builds a server, tries to write to a closed socket.

This is a real concern. Let me verify whether `res.on('close', releaseSlot)` re-fires after close, and whether the granted-but-dead slot leaks. Let me check how the code handles `res` already closed after acquire resolves.

### Assistant | 2026-06-09T17:24:15.908Z

[tool_use: Bash]

### User | 2026-06-09T17:24:22.578Z

[tool_result]     } catch (e) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32000, message: `server build failed: ${(e as Error).message}` },
          id: (req.body && (req.body as any).id) ?? null,
        });
      }
      return; // the res.on("close") metrics.decInflight() wired above still fires
    }

    res.on("close", () => {
      t
... [+1900 chars truncated]

### Assistant | 2026-06-09T17:24:35.108Z

Now I can fully analyze the queued-disconnect path. Critically: `releaseSlot` is registered as a SECOND `res.on("close", releaseSlot)` handler (line 1250), AFTER `acquire()` resolves. Node's `'close'` event fires once per response; if the client already disconnected while queued, the `'close'` already fired (decInflight ran). When the queued waiter later resolves `true` and execution resumes, `res.on("close", releaseSlot)` is attached to an already-closed response.

Let me verify Node's behavior: does attaching a `'close'` listener to an already-emitted-`'close'` response fire it? In Node.js, `'close'` is a one-shot event; attaching a listener after it has emitted does NOT re-fire it. This means **`releaseSlot` would never run for a request that disconnected while queued → the granted slot leaks permanently**. Let me confirm whether that's actually reachable, and check git log / any guard I might be missing. Let me re-read the release logic and the exact lifecycle once more for the queued waiter.

The key question: when client disconnects while queued, does the pending `acquire()` promise ever get a chance to register `releaseSlot`? Yes — `waiters.shift()` resolves it `true` later, and execution resumes. At that point `res` is closed. `res.on("close", releaseSlot)` won't fire. Then `await reqServer.connect()` / `handleRequest` run against a dead socket and may throw or no-op, but `releaseSlot` is never called → **slot leak**.

Let me verify there's no other release path and confirm this is genuinely reachable (not guarded by an `if (res.closed) return` check).

### Assistant | 2026-06-09T17:24:39.804Z

[tool_use: Bash]

### User | 2026-06-09T17:24:48.811Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-09T17:25:03.983Z

No closed-response guard exists. The queued-disconnect slot-leak is real but I need to assess its actual severity and likelihood. Let me think through it precisely:

The scenario requires a client to disconnect **specifically while its request is parked in the semaphore queue** (i.e., when active set is at max=64). Under the modeled 300-400 burst, the queue WILL be populated, so this is reachable, not theoretical. However, let me weigh the actual impact:

- When the slot is granted to a dead request, `releaseSlot` won't fire on the already-closed `res`. BUT — there's a subtlety. Does Node re-emit `'close'`? Actually, for HTTP, the response `'close'` event semantics: the FIRST `res.on('close')` (decInflight) was registered before the disconnect, so it fired. Registering a new listener after emission does not re-run it. So `releaseSlot` is orphaned.

Let me confirm this is genuinely a leak vs. self-healing by checking: does the abandoned dead request still call `transport.handleRequest` which then triggers another `'close'`? No — `'close'` already emitted; it's one-shot. The slot is consumed and never returned. Over a long-lived server with repeated burst-disconnects, `active` ratchets up toward `max`, eventually wedging the gate (all 64 slots leaked → permanent 503 + queue-shed).

This is a P1 — a latent slot-leak that defeats the gate's own purpose under exactly the burst conditions it was built for. Let me verify the tests don't cover it (they don't model a disconnect-while-queued) and double-check my Node semantics claim isn't wrong by checking if there's an `req.on('aborted')` or similar elsewhere. Let me run the actual tests to confirm baseline green, then finalize.

### Assistant | 2026-06-09T17:25:04.752Z

[tool_use: Bash]

### User | 2026-06-09T17:25:11.170Z

[tool_result]   ...
# Subtest: burst exactly at the defer threshold defers (>= is inclusive)
ok 11 - burst exactly at the defer threshold defers (>= is inclusive)
  ---
  duration_ms: 0.3129
  ...
# Subtest: burst one below the threshold restarts
ok 12 - burst one below the threshold restarts
  ---
  duration_ms: 0.1858
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# du
... [+17 chars truncated]

### Assistant | 2026-06-09T17:25:14.672Z

12/12 decision tests pass. Let me run the semaphore tests via vitest.

### Assistant | 2026-06-09T17:25:15.262Z

[tool_use: Bash]

### User | 2026-06-09T17:25:28.516Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/request-semaphore.test.ts (7 tests) 5ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  12:25:25
   Duration  181ms (transform 28ms, setup 0ms, import 40ms, tests 5ms, environment 0ms)

### Assistant | 2026-06-09T17:25:58.344Z

Both suites green: 7/7 semaphore, 12/12 decision. Now let me finalize my analysis of each verification axis.

**Test integrity — do they fail on regression?** Let me verify each is a real assertion, not a tautology:
- FIFO (lines 60-72): `expect(order).toEqual([1, 2, 3])` — if `release()` used `pop()` instead of `shift()`, order would be `[3,2,1]` → FAILS. Real.
- Clamp (93-107): concrete `toBe(1)`/`toBe(0)`/`toBe(3)`/`toBe(7)` — if floor/max removed, `frac.maxConcurrency` would be `3.9` ≠ `3` → FAILS. NaN→`toBe(1)`, Infinity→`toBe(0)`. Real.
- Release-at-zero (75-91): over-release then `expect(s.inUse).toBe(0)` AND re-acquire to max — if `active--` went negative, the re-acquire-to-max assertion (inUse=2) would break because active would be -1→grant 3. Real.
- Load-shed (44-58): `expect(await s.acquire()).toBe(false)` + `expect(s.queued).toBe(1)` (shed didn't enqueue). Real.

**Decision boundary tests:**
- `>=` inclusive boundary (87-90): inflight=8, deferAt=8 → defer. One-below (92-94): inflight=7 → restart. Both pinned. Real.
- hardLeak override (69-74): inflight=200 but rssMB≥hardMB → restart + hardLeak true. Real.
- inflightDeferAt=0 (82-85): high inflight but defer disabled → restart. Real.
- unknown inflight (76-80): null → inflight=0 → restart, asserts `d.inflight===0`. Real.

All tests are genuine intent-encoding assertions (R9-compliant). None would pass against a broken implementation in the dimensions they cover.

**Magic numbers:** All defaults are env-overridable: `PRISM_MCP_MAX_CONCURRENCY||64`, `PRISM_MCP_QUEUE_MAX||512`, `PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB||18432`, `RSS_THRESHOLD_MB+10240` (hard delta), `PRISM_MCP_WATCHDOG_INFLIGHT_DEFER||8`. The `+10240` hard-ceiling delta is the one semi-inlined constant — it's not its own env knob, but `RSS_HARD_MB` itself IS directly overridable via `PRISM_MCP_WATCHDOG_RSS_HARD_MB`, so the `+10240` is only the *default formula*. Acceptable. The `uptimeSec < 60` cold-start floor in the decision lib is a hard-code
... [+752 chars truncated]

### Assistant | 2026-06-09T17:25:59.425Z

[tool_use: Bash]

### User | 2026-06-09T17:26:07.147Z

[tool_result]   totalErrors: number;
  inflight: number;
  peakInflight: number;
  methods: Record<string, number>;
  rss: { last: number; max: number; samples: number };
  tools: ToolSnapshot[];
}

export class MetricsCollector {
  private tools = new Map<string, ToolStat>();
  private methods = new Map<string, number>();
  private rssRing: number[] = [];
  private startedAt = Date.now();
  private lastRssSamp
... [+402 chars truncated]

### Assistant | 2026-06-09T17:26:37.528Z

Confirmed: `inflight` and `peakInflight` are public mutable fields (lines 54-55, no `private`), and `mcpSem.inUse`/`.queued`/`.maxConcurrency`/`.maxQueue` are live getters reading `this.active` / `this.waiters.length`. The `/health` concurrency block reads real live values — no stale or fabricated numbers.

The watchdog "skip unreachable" claim is correct: the outer `if` guard already requires `rssMB >= RSS_THRESHOLD_MB && sinceLastPreempt >= PREEMPT_COOLDOWN_MS && uptimeOk` and `RSS_THRESHOLD_MB > 0`, so gates 1-5 in the decision lib can never return skip when called from there. The decision lib's redundant gates exist because it's a standalone testable pure function — defensible defensive design.

I have everything needed to render a verdict. Let me weigh the one substantive finding.

The queued-disconnect slot-leak: when a client aborts while its request is parked in `waiters[]`, the slot is later handed to it via `release()→waiters.shift()→resolve(true)`, but `res.on("close", releaseSlot)` is registered only AFTER acquire resolves — on an already-closed `res`, so it never fires. The slot is consumed and never returned. Under sustained bursts (exactly the design condition), `active` ratchets toward `max`, progressively wedging the gate. The first `res.on("close")` (decInflight, registered pre-acquire) fires correctly, so inflight accounting is fine — but the semaphore slot leaks. This is a genuine correctness gap in release-exactly-once under disconnect-while-queued, which the contract comment explicitly claims to handle ("frees the slot exactly once on res 'close' ... so a disconnect ... can never leak a slot"). The claim is false for the queued case.

This is a P1 (latent, burst-conditional, self-defeating under load) — not a P0 (no crash, no data loss, slow ratchet, recovered on server restart which the watchdog still performs). Per the FAIL-if-unsure directive and a real P1 that contradicts the code's own contract, I lean FAIL to surface it for a fix.

VERDIC
... [+3207 chars truncated]
