---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Reviewer C (analyst, weighted to silent breakage + regression) of a 3-of-3 PRISM"
date: "2026-06-09"
first_ts: "2026-06-09T17:44:18.504Z"
last_ts: "2026-06-09T17:54:40.886Z"
cwd: "H:\\prism\\mcp-server"
messages: 73
user_msgs: 25
assistant_msgs: 48
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a6bb670e4e0cfeb0d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Reviewer C (analyst, weighted to silent breakage + regression) of a 3-of-3 PRISM

> **claude-code-cli** | 2026-06-09 | 73 msgs (25 user / 48 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a6bb670e4e0cfeb0d.jsonl`

## Transcript

### User | 2026-06-09T17:44:18.504Z

Reviewer C (analyst, weighted to silent breakage + regression) of a 3-of-3 PRISM scrutiny gate. Re-review committed unit U-MCP-CONCURRENCY-HARDEN on H:/prism (branch cad-fusion-live-ms0): `git -C H:/prism diff ed94bc47~1..HEAD`. Working tree is clean = HEAD. This touches the live MCP server :3100 the whole 26-chat fleet depends on, plus its watchdog.

A prior gate FAILED on a queued-disconnect semaphore slot leak; the fix extracted `acquireRequestSlot` (registers a 'close' observer before acquire(); grant-to-closed-res -> release + "abandoned"; handler returns, skipping buildRequestServer).

Read: mcp-server/src/index.ts (/mcp POST handler — trace EVERY exit: shed/abandoned/proceed/build-throw/normal), mcp-server/src/mcp/request-semaphore.ts, scripts/mcp-server-watchdog.mjs (RSS-defer branch + probeHealth).

Probe for regressions introduced by the fix:
- Could the "abandoned" early-return ever FALSE-fire on a healthy OPEN connection and drop a live request? Reason about res.closed + closedWhileWaiting timing.
- Every /mcp exit path: decInflight fires exactly once; the semaphore slot is released exactly once or none held; no double response; no double transport/server close.
- EventEmitter listener count per request (pre-acquire decInflight close + helper's closedWhileWaiting close + helper's release close + transport close) — any max-listeners warning or bad interaction?
- Re-confirm still-valid earlier findings: 503 defaults (64+512) don't shed at the 300-400 peak; watchdog defers correctly with hard-ceiling recycle guarantee; /health concurrency field additive/safe for the watchdog + supervisor consumers.
- Exhaustively rule out any "proceed" path that never releases.

First line MUST be exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Then 'BLOCKER:' lines (P0/P1), then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-09T17:44:23.287Z

I'll review this unit by examining the diff and the three key files, tracing every exit path through the `/mcp` handler.

### Assistant | 2026-06-09T17:44:24.717Z

[tool_use: Bash]

### User | 2026-06-09T17:44:34.826Z

[tool_result] ed94bc479f [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed
2070c472a4 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-WORKHOLDING-FORCE-CAP (slot:oscar): wire the inert workholding axis live -- part-retention feed derate
e423995877 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [IN
... [+1712 chars truncated]

### Assistant | 2026-06-09T17:44:40.192Z

The diff stat is dominated by india-transcript-mining noise. Let me isolate the actual code changes for this unit.

### Assistant | 2026-06-09T17:44:41.421Z

[tool_use: Bash]

### User | 2026-06-09T17:44:47.075Z

[tool_result]     Fix B (index.ts /mcp) - RequestSemaphore caps simultaneous request-server builds
      Decision is the unit-tested pure lib mcp-preempt-decision.mjs (decideRestart
    esbuild build:fast clean. tsc adds 0 new errors (6 pre-existing index.ts errors
 mcp-server/src/__tests__/request-semaphore.test.ts | 128 +++++++++++++++++++++
 mcp-server/src/index.ts                            |  61 +++++++++-
... [+344 chars truncated]

### Assistant | 2026-06-09T17:44:51.453Z

The actual unit code is 6 files. The prompt references commit `ed94bc47` but says "this fix extracted `acquireRequestSlot`" — the prior gate FAILED on a slot leak. Let me check whether `acquireRequestSlot` is in this commit or a follow-up, since the working tree is clean = HEAD which is this commit.

### Assistant | 2026-06-09T17:44:52.791Z

[tool_use: Bash]

### User | 2026-06-09T17:45:02.788Z

[tool_result] mcp-server/src/index.ts:54:import { RequestSemaphore, acquireRequestSlot } from "./mcp/request-semaphore.js";
mcp-server/src/index.ts:1223:    // McpServers built/handled at once (see mcpSem above). acquireRequestSlot() caps
mcp-server/src/index.ts:1230:    const _slot = await acquireRequestSlot(mcpSem, res);
mcp-server/src/mcp/request-semaphore.ts:90:/** Minimal response shape acquireRequestSlot 
... [+1450 chars truncated]

### Assistant | 2026-06-09T17:45:10.356Z

HEAD (`8b191d54`) is NOT `ed94bc47`. The `acquireRequestSlot` extraction (the slot-leak fix) is in a follow-up commit after `ed94bc47`. The prompt says "working tree is clean = HEAD" and the fix extracted `acquireRequestSlot`. So the review target is the cumulative state at HEAD. Let me get the full range and the actual follow-up commits.

### Assistant | 2026-06-09T17:45:10.709Z

[tool_use: Bash]

### User | 2026-06-09T17:45:16.660Z

[tool_result] ===commits ed94bc47..HEAD===
2999dac687 [MAIN] [OBSIDIAN-VAULT-SYNERGY]/U-GOAL-DISCOVERY-SYNTHESIS (slot:alpha): final synthesized discovery report (the /goal deliverable)
8b191d5427 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-HOLDER-RUNOUT-LIFE (slot:oscar): wire the inert tool_holder runout axis live -- apply the existing runout life model to the recommendation
45968ce7bd [MAIN] 
... [+1414 chars truncated]

### Assistant | 2026-06-09T17:45:23.406Z

Now I have the full picture. The review window `ed94bc47~1..HEAD` includes both `ed94bc47` (original) and `54efb82485` (the P1 fix that extracted `acquireRequestSlot`). The cumulative diff is what I review. Let me read the three key files in full at HEAD.

### Assistant | 2026-06-09T17:45:23.542Z

[tool_use: Read]

### User | 2026-06-09T17:45:24.310Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\mcp\request-semaphore.ts' was already read 53s ago in this session and is unchanged (mtime 1781026994543). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T17:45:29.012Z

The read-once guard says I already read it (a prior agent in this session context). Let me read it fresh — the guard is from a prior session's read. Let me use the cache bypass.

### Assistant | 2026-06-09T17:45:30.113Z

[tool_use: Bash]

### User | 2026-06-09T17:45:45.190Z

[tool_result] /**
 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
 * concurrent pea
... [+5783 chars truncated]

### Assistant | 2026-06-09T17:45:53.757Z

Now the index.ts /mcp handler. Let me read the full handler region.

### Assistant | 2026-06-09T17:45:53.758Z

[tool_use: Bash]

### User | 2026-06-09T17:46:01.936Z

[tool_result]      1	        } catch {
     2	          /* never break the response */
     3	        }
     4	      };
     5	      (res as any).write = (c: any, ...a: any[]) => {
     6	        _grab(c);
     7	        return _ow(c, ...a);
     8	      };
     9	      (res as any).end = (c: any, ...a: any[]) => {
    10	        _grab(c);
    11	        return _oe(c, ...a);
    12	      };
    13	    }
    14	
... [+5654 chars truncated]

### Assistant | 2026-06-09T17:46:08.911Z

Now let me see the start of the handler — where `_m0`, `_isCall`, `decInflight`'s `incInflight` happens, and where `mcpSem` is defined. I need to trace the listener registration order and confirm `incInflight`/`decInflight` pairing.

### Assistant | 2026-06-09T17:46:10.322Z

[tool_use: Bash]

### User | 2026-06-09T17:46:19.295Z

[tool_result]      1	
     2	  // .well-known/mcp.json — MCP Registry Discovery (RFC 9110 §4.1)
     3	  app.get("/.well-known/mcp.json", (req, res) => {
     4	    const baseUrl = `${req.protocol}://${req.get("host")}`;
     5	    const discovery = buildMcpDiscoveryDocument(baseUrl);
     6	    const authConfig = getAuthConfig();
     7	
     8	    if (!authConfig.enabled) {
     9	      delete discovery.authe
... [+1866 chars truncated]

### Assistant | 2026-06-09T17:46:29.096Z

Now I have the full handler. Let me confirm where `mcpSem` is constructed (the 64+512 defaults) and trace listener ordering. The order of `res.on("close")` registrations matters for the listener-count analysis.

### Assistant | 2026-06-09T17:46:30.477Z

[tool_use: Bash]

### User | 2026-06-09T17:46:37.554Z

[tool_result] 987:  // caps simultaneous builds (PRISM_MCP_MAX_CONCURRENCY) and queues the overflow
992:  const MCP_MAX_CONCURRENCY = Math.max(1, Number(process.env.PRISM_MCP_MAX_CONCURRENCY) || 64);
994:  const mcpSem = new RequestSemaphore(MCP_MAX_CONCURRENCY, MCP_QUEUE_MAX);
1031:        active: mcpSem.inUse,
1032:        queued: mcpSem.queued,
1033:        max_concurrency: mcpSem.maxConcurrency,
1034:      
... [+652 chars truncated]

### Assistant | 2026-06-09T17:46:43.410Z

[tool_use: Bash]

### User | 2026-06-09T17:47:01.088Z

[tool_result]      1	  // graph) via buildRequestServer(), so N concurrent requests = N concurrent servers
     2	  // = an unbounded memory spike under an ultracode parallel-agent burst. The gate
     3	  // caps simultaneous builds (PRISM_MCP_MAX_CONCURRENCY) and queues the overflow
     4	  // (PRISM_MCP_QUEUE_MAX); excess sheds with HTTP 503 so a burst applies backpressure
     5	  // to clients instead of 
... [+3211 chars truncated]

### Assistant | 2026-06-09T17:47:04.608Z

Now the watchdog. Let me read the RSS-defer branch and probeHealth in full.

### Assistant | 2026-06-09T17:47:06.719Z

[tool_use: Bash]

### User | 2026-06-09T17:47:27.405Z

[tool_result] 34: *   PRISM_MCP_WATCHDOG_BOOTGUARD=1      enable the BOOTING guard (default OFF) — defer escalation
61:// MCP-OOM-PERMANENT (slot:kilo 2026-05-23): memory-pressure preemptive restart.
62:// Watchdog reads /health.memory.rss_mb every probe cycle. If RSS exceeds
63:// PRISM_MCP_WATCHDOG_RSS_THRESHOLD_MB (default 3072 = 3GB, well below the
64:// 4GB heap cap shipped in MCP-OOM-FIX), trigger an ORDE
... [+4723 chars truncated]

### Assistant | 2026-06-09T17:47:34.182Z

Let me read the preempt-decision lib (the unit-tested pure decision) and the watchdog defer branch context lines 145-330.

### Assistant | 2026-06-09T17:47:35.157Z

[tool_use: Bash]

### User | 2026-06-09T17:47:39.779Z

[tool_result] /**
 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restarting
 * then ki
... [+3669 chars truncated]

### Assistant | 2026-06-09T17:47:47.524Z

Now there's a discrepancy: the watchdog calls `decidePreemptRestart` but only enters the block when `RSS_THRESHOLD_MB > 0 && rssMB >= RSS_THRESHOLD_MB && sinceLastPreempt >= PREEMPT_COOLDOWN_MS && uptimeOk` (line 272). The lib re-checks gates 1-5 internally. Let me read the watchdog defer branch fully to verify the guard interaction and confirm the hard-ceiling recycle guarantee.

### Assistant | 2026-06-09T17:47:48.747Z

[tool_use: Bash]

### User | 2026-06-09T17:47:56.910Z

[tool_result]      1	  const probe = await probeHealth();
     2	  if (probe.ok) {
     3	    if (state.consecutiveFails > 0) {
     4	      log("info", "Recovery detected", { priorFails: state.consecutiveFails, statusCode: probe.statusCode });
     5	    } else {
     6	      log("debug", "Healthy", { statusCode: probe.statusCode, rssMB: probe.rssMB, uptimeSec: probe.uptimeSec });
     7	    }
     8	    state
... [+4267 chars truncated]

### Assistant | 2026-06-09T17:48:07.390Z

Now let me check the defaults: `INFLIGHT_DEFER`, `PREEMPT_COOLDOWN_MS`, and confirm the env var lines 75-90 of the watchdog. I also need to verify the prompt's claim about "503 defaults (64+512) don't shed at the 300-400 peak" — at 64 active + 512 queued = 576 capacity, a 300-400 peak fits without shedding. That's correct. Let me verify INFLIGHT_DEFER default and check the "abandoned" timing concern in the helper closely.

### Assistant | 2026-06-09T17:48:09.842Z

[tool_use: Bash]

### User | 2026-06-09T17:48:27.050Z

[tool_result]      1	// MCP-CONCURRENCY-HARDEN (slot golf 2026-06-09): inflight-aware preempt restart.
     2	// The RSS preempt-restart is a DISCONNECT for every in-flight agent call. Under an
     3	// ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
     4	// request-servers (MCP-CONCURRENCY-FIX) -- not a leak -- so restarting then kills
     5	// the whole burst at the worst mo
... [+1680 chars truncated]

### Assistant | 2026-06-09T17:48:34.581Z

Now I have everything. Let me verify the critical regression concern: the "abandoned" false-fire on a healthy OPEN connection. The key claim in the helper is "No await runs between the grant and this check." Let me trace the exact sequence in `acquireRequestSlot`:

1. `res.on("close", ...)` registers `closedWhileWaiting` setter (sync)
2. `await sem.acquire()` — this is the await point
3. After resolve: register `res.on("close", release)`, then check `closedWhileWaiting || res.closed === true`

The concern: between `await sem.acquire()` resolving and the synchronous check, is there any microtask/macrotask gap where a `close` on a *healthy still-open* connection could set `closedWhileWaiting`? Let me reason about the two acquire paths and whether the express handler being `async` introduces a gap before `res.closed` is checked. Let me also confirm the test file covers the abandoned path and check listener count.

### Assistant | 2026-06-09T17:48:36.014Z

[tool_use: Bash]

### User | 2026-06-09T17:48:44.326Z

[tool_result]      1	describe("acquireRequestSlot (close-while-queued race)", () => {
     2	  it("proceeds with an open res and releases the slot on close", async () => {
     3	    const s = new RequestSemaphore(2, 4);
     4	    const res = new FakeRes();
     5	    const slot = await acquireRequestSlot(s, res);
     6	    expect(slot.outcome).toBe("proceed");
     7	    expect(s.inUse).toBe(1);
     8	    r
... [+4135 chars truncated]

### Assistant | 2026-06-09T17:48:55.238Z

Strong test coverage. Now let me reason carefully about the **most important regression concern: false-fire of "abandoned" on a healthy OPEN connection.** This is the critical silent-breakage risk. Let me examine the two acquire paths precisely:

**Path 1 — immediate grant (`active < max`):** `sem.acquire()` returns `Promise.resolve(true)`. The `await` on an already-resolved promise yields one microtask. Between the `res.on("close")` registration and the await resolving, no `close` event for an open connection. After resolve, the check runs synchronously. For a healthy open res, `closedWhileWaiting` is false and `res.closed` is false → "proceed". Correct.

**Path 2 — queued grant:** the waiter resolves via `release()` calling `next(true)` synchronously. The `await` resumes on a microtask. For a healthy open connection that was merely *queued* (not disconnected), `closedWhileWaiting` stays false → "proceed". Correct.

The concern would be: could a real `close` macrotask for an open-but-now-finishing connection sneak in during the await window and falsely trigger "abandoned"? Let me verify whether `res.closed` could be transiently true, and confirm there's no `await` between grant and check. Let me also run the tests to confirm green at HEAD.

### Assistant | 2026-06-09T17:48:56.919Z

[tool_use: Bash]

### User | 2026-06-09T17:49:13.412Z

[tool_result] 14:const tick = () => Promise.resolve();
16:/** Minimal stand-in for an express response: emits 'close' and exposes `closed`. */
17:class FakeRes extends EventEmitter {
18:  closed = false;
19:  close(): void {
20:    this.closed = true;
21:    this.emit("close");
41:    await tick();
59:    await tick();
77:    await tick();
126:    await tick();

### Assistant | 2026-06-09T17:49:21.575Z

The cwd reset — I'm in a fresh shell. Let me run the actual test suites to confirm green at HEAD, and check the preempt-decision tests too.

### Assistant | 2026-06-09T17:49:22.441Z

[tool_use: Bash]

### User | 2026-06-09T17:49:40.572Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/request-semaphore.test.ts (12 tests) 8ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  12:49:39
   Duration  156ms (transform 23ms, setup 0ms, import 34ms, tests 8ms, environment 0ms)

### Assistant | 2026-06-09T17:49:50.518Z

12/12 green. Let me run the preempt-decision tests and confirm the build is clean (no new tsc errors).

### Assistant | 2026-06-09T17:49:51.108Z

[tool_use: Bash]

### User | 2026-06-09T17:49:58.376Z

[tool_result]   ...
# Subtest: burst one below the threshold restarts
ok 12 - burst one below the threshold restarts
  ---
  duration_ms: 0.0903
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 84.3811

### Assistant | 2026-06-09T17:50:07.217Z

Both suites green (12+12). Now let me verify the two remaining regression-critical concerns with precision:

**Concern 1 — double-close of transport/server vs the abandoned/build-throw early returns.** The `res.on("close", () => { transport.close(); reqServer.close() })` is registered AFTER the build succeeds (line 1275). On the abandoned and build-throw paths, the handler returns before that listener is registered, so no transport/server double-close. Good. But I need to confirm: on the **proceed→build-throw** path, is the slot released? The slot's `release` is wired to `res 'close'` inside the helper. On build-throw, the handler returns but `res` will eventually emit 'close' (express closes the response after the 500 json), firing both `decInflight` and the helper's `release`. Let me verify the express response definitely closes on these synchronous-return paths.

**Concern 2 — "proceed" path that never releases.** The only way the slot leaks is if `res` never emits 'close'. For a held slot, release is bound to `res 'close'`. Let me confirm there's no path where proceed is returned but res never closes. Let me check the most subtle one: what if `buildRequestServer()` succeeds, `reqServer.connect`/`handleRequest` throws (uncaught — there's no try/catch around lines 1280-1281)?

### Assistant | 2026-06-09T17:50:10.968Z

[tool_use: Bash]

### User | 2026-06-09T17:50:20.299Z

[tool_result]      1	    await reqServer.connect(transport);
     2	    await transport.handleRequest(req, res, req.body);
     3	  });
     4	
     5	  // MCP Streamable HTTP — GET (SSE stream for server-initiated messages)
=== is the app.post callback wrapped by an express error handler / async-catch? ===
1430:process.on("unhandledRejection", (reason) => {

### Assistant | 2026-06-09T17:50:28.080Z

Key finding to assess: lines 1280-1281 (`reqServer.connect` / `transport.handleRequest`) are **not** wrapped in try/catch. If either throws (async), the express `async` route handler's returned promise rejects. Express 4 does **not** catch async rejections → it becomes an unhandled rejection. The critical question for my regression review: **does the slot still release?**

The answer: the slot's `release` is bound to `res 'close'`. Even if `connect`/`handleRequest` throws, the underlying socket/response will still eventually emit `'close'` (the connection terminates). So `release` and `decInflight` both fire on `'close'`. The slot does NOT leak even on this uncaught-throw path. This is a pre-existing characteristic (these two awaits were unwrapped before this unit too — let me confirm this isn't a regression introduced by the unit).

### Assistant | 2026-06-09T17:50:29.931Z

[tool_use: Bash]

### User | 2026-06-09T17:50:37.091Z

[tool_result] === was connect/handleRequest already unwrapped BEFORE this unit (ed94bc47~1)? ===
523: * on fresh per-request servers built by buildRequestServer(). The temporary
810:  // built by buildRequestServer(). Guarded by _postBindDone (the first call = shared server).
896:async function buildRequestServer(): Promise<McpServer> {
1205:      reqServer = await buildRequestServer();
1222:    await reqServer
... [+175 chars truncated]

### Assistant | 2026-06-09T17:50:46.034Z

Confirmed: `connect`/`handleRequest` were already unwrapped pre-unit (lines 1222-1223 in the parent). The unit did not introduce this. And critically, the slot-release-on-`'close'` wiring means even an uncaught throw there releases the slot — so the unit's gate doesn't add a leak on that path. This is **not a regression**.

Now let me close out the listener-count concern precisely. Per request, on the proceed path, how many `'close'` listeners get attached to `res`?

1. Line 1220: `decInflight` close listener (in handler)
2. Helper: `closedWhileWaiting` setter close listener
3. Helper: `release` close listener
4. Line 1275: transport/server close listener

That's 4 `'close'` listeners. Node's default `maxListeners` is 10. 4 < 10 → no warning. Plus the `finish` listener (line 1214) and the write/end overrides. Let me verify there isn't an existing high listener count on `res` that 2 new ones would push past 10.

### Assistant | 2026-06-09T17:50:47.555Z

[tool_use: Bash]

### User | 2026-06-09T17:50:56.682Z

[tool_result] === count ALL res.on / res.once listeners in the /mcp POST handler (lines 1165-1282) ===
44:    res.on("finish", () => {
56:    res.on("close", () => metrics.decInflight());
80:      return; // res.on("close") metrics.decInflight() above still fires
108:      return; // the res.on("close") metrics.decInflight() wired above still fires
111:    res.on("close", () => {

### Assistant | 2026-06-09T17:51:11.750Z

Listener tally on `res` per proceed request:
- `finish` × 1 (line 1214)
- `close` × 1 `decInflight` (line 1220)
- `close` × 1 `closedWhileWaiting` setter (helper, pre-acquire)
- `close` × 1 `release` (helper, post-grant)
- `close` × 1 transport/server (line 1275)

Total `'close'` listeners = **4**, plus 1 `'finish'`. Max distinct-event listener count = 4 `'close'`, under the default cap of 10. No `MaxListenersExceededWarning`. The unit added 2 of the 4 close listeners (closedWhileWaiting + release); pre-unit there were 2 (decInflight + transport). 4 < 10 — safe, with comfortable margin. No concern.

Now the final regression sweep — the watchdog double-gate interaction. The outer guard (line 272) requires `uptimeOk` (≥60), `sinceLastPreempt >= PREEMPT_COOLDOWN_MS`, `rssMB >= RSS_THRESHOLD_MB`. The lib re-checks the same gates and would return "skip" only if those fail — but the outer guard already guarantees they pass, so "skip" is unreachable inside (correctly noted in the comment line 326). The only lib outcomes reachable are "restart" or "defer". Let me confirm the **hard-ceiling recycle guarantee** holds: when `rssMB >= RSS_HARD_MB`, `hardLeak=true`, so `burstActive && !hardLeak` is false → "restart" regardless of inflight. 

Let me verify one final edge: `RSS_HARD_MB` parsing when `RSS_THRESHOLD_MB=0` (feature disabled). If threshold is 0, the outer guard `RSS_THRESHOLD_MB > 0` short-circuits — the lib is never called. So the `RSS_HARD_MB = RSS_THRESHOLD_MB + 10240` default being computed even when threshold=0 is harmless. Good.

Let me confirm the build is clean (no NEW tsc errors from the unit) per the commit message claim, and check `metrics.inflight`/`peakInflight` exist.

### Assistant | 2026-06-09T17:51:13.668Z

[tool_use: Bash]

### User | 2026-06-09T17:52:14.405Z

[tool_result] src/observability/metrics-collector.ts:42:  peakInflight: number;
src/observability/metrics-collector.ts:55:  peakInflight = 0;
src/observability/metrics-collector.ts:59:  incInflight(): void {
src/observability/metrics-collector.ts:61:    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
src/observability/metrics-collector.ts:64:  decInflight(): void {
src/observability/me
... [+535 chars truncated]

### Assistant | 2026-06-09T17:52:22.100Z

`metrics.inflight`/`peakInflight`/`decInflight` all exist and `incInflight` guards the peak. Let me verify `decInflight` clamps at zero (so a double-fire from shed/abandoned + close can't drive inflight negative) — relevant to whether the "abandoned" path's earlier-`close`-fired `decInflight` is sound.

### Assistant | 2026-06-09T17:52:23.153Z

[tool_use: Bash]

### User | 2026-06-09T17:52:31.834Z

[tool_result]      1	  peakInflight = 0;
     2	  totalCalls = 0;
     3	  totalErrors = 0;
     4	
     5	  incInflight(): void {
     6	    this.inflight++;
     7	    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
     8	  }
     9	
    10	  decInflight(): void {
    11	    if (this.inflight > 0) this.inflight--;
    12	  }
    13	
    14	  recordMethod(method: string): void {
    
... [+88 chars truncated]

### Assistant | 2026-06-09T17:52:47.538Z

`decInflight` clamps at zero. `decInflight` is wired to a **single** `res 'close'` listener (line 1220), and `incInflight` fires exactly once at handler entry (line 1175). One `'close'` per response → exactly one `decInflight` per `incInflight`. No double-decrement. Clamp is defense-in-depth.

Now let me complete the final exit-path trace table to be exhaustive. Every `/mcp` POST exit:

| Exit | Slot held? | release fires? | decInflight fires? | double-response? | transport/server close? |
|------|-----------|----------------|--------------------|--------------------|------------------------|
| **shed** (1231) | No (helper returned shed, release = no-op) | release is no-op | yes, on res 'close' | 503 sent once (headersSent guarded) | listener never registered |
| **abandoned** (1246) | granted-then-released in helper | already fired in helper | already fired on earlier 'close' | none | never registered |
| **build-throw** (1264) | yes (proceed held) | on res 'close' (express closes after 500) | on res 'close' | 500 sent once (headersSent guarded) | never registered (registered AFTER build) |
| **proceed normal** (1280-81) | yes | on res 'close' | on res 'close' | handleRequest sends once | registered, fires once on close |
| **proceed→connect/handleRequest throw** (uncaught) | yes | on res 'close' (socket terminates) | on res 'close' | partial/none | registered, fires on close |

Every path: decInflight exactly once (on the single close), slot released exactly once or none held, no double transport close. Let me do a last confirmation that the build:fast is clean and that I haven't missed a release path — specifically, can `res 'close'` ever NOT fire for a held slot? That's the only true leak vector. In Node http, `res` emits `'close'` when the underlying connection closes, which is guaranteed for any response (success, error, or abort). Let me verify the commit message's "6 pre-existing index.ts errors, 0 new" claim isn't masking a new error.

### Assistant | 2026-06-09T17:52:49.142Z

[tool_use: Bash]

### User | 2026-06-09T17:54:06.839Z

[tool_result] src/hooks/index.ts(102,1): error TS2308: Module "./CrossReferenceHooks.js" has already exported a member named 'preMachineControllerCompatibility'. Consider explicitly re-exporting to resolve the ambiguity.
src/index.ts(798,23): error TS2345: Argument of type 'McpServer' is not assignable to parameter of type 'Server<{ method: string; params?: { [x: string]: unknown; _meta?: { [x: string]: unknown
... [+1081 chars truncated]

### Assistant | 2026-06-09T17:54:40.886Z

The `index.ts` errors at 798-801 and 1154 are all `McpServer`/`Server` SDK-typing mismatches and `Expected 0 arguments` — these are the pre-existing 6 errors the commit message references (lines 798-801, 1154, plus the hooks/index re-export at 102). **None are at the unit's touched lines** (1175-1282, the `acquireRequestSlot`/`mcpSem` wiring) or in `request-semaphore.ts`. The 656 total are whole-workspace pre-existing. The 5 index.ts errors are at lines unrelated to this unit's edits. Zero NEW type errors introduced — claim verified.

I have exhaustively traced every concern. Let me write the verdict.

---

VERDICT: PASS

The fix is correct and introduces no regressions. I traced every `/mcp` POST exit path, both `acquire()` paths, listener counts, the watchdog defer/hard-ceiling logic, and the inflight accounting. Both test suites green at HEAD (request-semaphore 12/12, preempt-decision 12/12). No new tsc errors at any touched line.

Notes (≤5):

1. **"abandoned" cannot false-fire on a healthy OPEN connection — confirmed safe.** In `acquireRequestSlot`, the only `await` is `sem.acquire()`; the `closedWhileWaiting || res.closed === true` check runs synchronously immediately after the grant with no interleaving macrotask, so a real `'close'` for an open connection cannot sneak in. The `closedWhileWaiting` flag is only set by an actual `'close'` event, which Node only emits when the connection genuinely terminates. A merely-queued-but-alive request keeps the flag false → "proceed". The P1 repro test ("does NOT leak … WHILE queued") and the "proceeds with an open res" test both pin this. No live request is dropped.

2. **Every exit path: decInflight exactly once, slot released exactly once or none held, no double transport close — verified exhaustively.** shed (no slot, release no-op), abandoned (released in helper, decInflight on earlier close), build-throw (held slot + decInflight both fire on the eventual res 'close'; transport/server listener registered only AFTER 
... [+2081 chars truncated]
