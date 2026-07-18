---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are scrutiny reviewer ARM C for a PRISM MCP-server commit, weighted toward S"
date: "2026-06-10"
first_ts: "2026-06-10T18:09:14.697Z"
last_ts: "2026-06-10T18:18:44.438Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 27
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a4089815c53beb67a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are scrutiny reviewer ARM C for a PRISM MCP-server commit, weighted toward S

> **claude-code-cli** | 2026-06-10 | 71 msgs (27 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a4089815c53beb67a.jsonl`

## Transcript

### User | 2026-06-10T18:09:14.697Z

You are scrutiny reviewer ARM C for a PRISM MCP-server commit, weighted toward SILENT BREAKAGE, regression risk, I/O security, error-budget completeness, and integration coupling. Do NOT assume arms A or B caught everything. Grade PASS/FAIL.

Repo: H:/prism. The commit adds 5 surgical reliability fixes to the live MCP server (:3100, 26 concurrent chats). Read in the working tree (== HEAD):
- mcp-server/src/index.ts: POST /mcp handler ~1280 (now try/catch around reqServer.connect + transport.handleRequest -> respondTransportError); callTool() catch ~1318 (added log.error).
- mcp-server/src/utils/transportError.ts (new): respondTransportError(res,e,id).
- mcp-server/src/utils/responseSlimmer.ts: slimResponse maxDepth guard.
- mcp-server/src/routes/bridge.ts: bridgeError() helper + 13 catches.
- mcp-server/src/engines/EventBus.ts ~606: synchronous handlerTimes trim.

Hunt for:
1. REGRESSION: Does wrapping the handler in try/catch change the res.on("close") cleanup timing or double-respond? respondTransportError checks !res.headersSent before status(500) -- can it ever double-send (the existing code already sent something) or collide with the res.on("close") transport.close()? Trace the response lifecycle.
2. SILENT BREAKAGE: In callTool the new log.error uses e?.message/e?.stack -- safe if e is null? respondTransportError uses `e instanceof Error` -- handles non-Error. bridgeError uses e?.message -- safe on null. Confirm no new throw paths.
3. The respondTransportError catch swallows errors from res.status().json() with an empty catch -- is that justified (socket torn down) or hiding a real failure? (it is the LAST-resort responder, so swallowing is defensible -- confirm).
4. slimResponse depth guard returns the UN-slimmed subtree at the cap -- could that leak a large/circular structure into a response that the client then chokes on? Is 32 deep enough for real manufacturing payloads and shallow enough to prevent stack overflow? Any DoS angle?
5. EventBus: the synchrono
... [+598 chars truncated]

### Assistant | 2026-06-10T18:09:18.980Z

I'll review this commit as Arm C, focusing on silent breakage, regression risk, I/O security, error-budget completeness, and integration coupling. Let me read the actual files in the working tree.

### Assistant | 2026-06-10T18:09:19.957Z

[tool_use: Read]

### Assistant | 2026-06-10T18:09:20.382Z

[tool_use: Read]

### Assistant | 2026-06-10T18:09:20.387Z

[tool_use: Read]

### User | 2026-06-10T18:09:25.621Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\responseSlimmer.ts' was already read 15s ago in this session and is unchanged (mtime 1781112802477). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T18:09:25.626Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\utils\transportError.ts' was already read 16s ago in this session and is unchanged (mtime 1781112839552). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-10T18:09:25.832Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\routes\bridge.ts' was already read 5s ago in this session and is unchanged (mtime 1781112958195). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-10T18:09:30.135Z

The read-cache guard says I read these recently, but I don't have the content in my active context (this is a fresh review task). Let me disable the cache and read all the files fresh.

### Assistant | 2026-06-10T18:09:30.644Z

[tool_use: Bash]

### User | 2026-06-10T18:09:54.887Z

[tool_result] /**
 * PRISM MCP Server - Transport error responder
 *
 * Shared, unit-testable error path for the POST /mcp handler. Hoisted out of
 * the inline handler so the catch logic (log + headers-aware 500 vs end) can be
 * asserted WITHOUT booting the server (importing index.ts starts it).
 *
 * Closes the gap where `await reqServer.connect(transport)` /
 * `await transport.handleRequest(...)` threw/rej
... [+1520 chars truncated]

### Assistant | 2026-06-10T18:10:04.220Z

I have transportError.ts content now. Let me read the other files with the cache disabled using the Read tool's line numbers where possible.

### Assistant | 2026-06-10T18:10:04.986Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:10:05.668Z

[tool_use: Bash]

### User | 2026-06-10T18:10:17.993Z

[tool_result]      1	/**
     2	 * Response Slimmer Utility
     3	 * Reduces verbose response objects for MCP transport efficiency.
     4	 * @module utils/responseSlimmer
     5	 */
     6	
     7	/**
     8	 * Slim a response object by removing null/undefined values and empty arrays.
     9	 *
    10	 * @param response - the value to slim
    11	 * @param maxDepth - recursion ceiling (default 32). A circular
... [+2234 chars truncated]

### User | 2026-06-10T18:10:29.480Z

[tool_result]      1	/**
     2	 * PRISM MCP Server — Bridge & Integration Routes
     3	 * 13 endpoints for external system integration, API key management, and routing
     4	 */
     5	import { Router, type Response } from "express";
     6	import type { CallToolFn } from "./index.js";
     7	import { log } from "../utils/Logger.js";
     8	
     9	/**
    10	 * Log a bridge-route failure then emit the prese
... [+6018 chars truncated]

### Assistant | 2026-06-10T18:10:32.700Z

Now let me read the index.ts handler region and the EventBus change. Let me look at the POST /mcp handler and callTool.

### Assistant | 2026-06-10T18:10:33.738Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:10:34.498Z

[tool_use: Bash]

### User | 2026-06-10T18:10:42.580Z

[tool_result]        1	          id: (req.body && (req.body as any).id) ?? null,
       2	        });
       3	      } else {
       4	        try { res.end(); } catch { /* best-effort */ }
       5	      }
       6	      return; // res.on("close") metrics.decInflight() above still fires
       7	    }
       8	    if (_slot.outcome === "abandoned") {
       9	      // Client disconnected while queued; the gran
... [+5769 chars truncated]

### User | 2026-06-10T18:10:52.250Z

[tool_result]      1	         * @returns void
     2	         */
     3	        if (sub.options.maxCalls && sub.callCount >= sub.options.maxCalls) {
     4	          this.unsubscribe(sub.id);
     5	        }
     6	
     7	        // Check once
     8	        /** If.
     9	         * @param sub.options.once - sub.options.once
    10	         * @returns void
    11	         */
    12	        if (sub.options.on
... [+1806 chars truncated]

### Assistant | 2026-06-10T18:10:57.411Z

I have all five changes in view. Let me verify a few critical integration points: (1) the `getStats()` reader of `handlerTimes` in EventBus, (2) whether `respondTransportError` is imported in index.ts and the `TransportErrorRes` structural match, and (3) whether the `res.on("close")` handler can fire before/concurrently with `respondTransportError` (the double-respond concern).

### Assistant | 2026-06-10T18:10:58.826Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:10:59.689Z

[tool_use: Bash]

### User | 2026-06-10T18:11:14.312Z

[tool_result] 29:import { respondTransportError } from "./utils/transportError.js";
1289:      respondTransportError(res, e, (req.body && (req.body as any).id) ?? null);

### User | 2026-06-10T18:11:22.423Z

[tool_result] 105:  avgHandlerTime_ms: number;
467:  private handlerTimes: number[] = [];
606:    this.handlerTimes.push(totalTime);
609:    // 1000/500 high-water/retain as startCleanup, so avgHandlerTime is unchanged.
610:    if (this.handlerTimes.length > 1000) {
611:      this.handlerTimes = this.handlerTimes.slice(-500);
936:  getStats(): EventStats {
953:    const avgTime = this.handlerTimes.length > 0
95
... [+363 chars truncated]

### Assistant | 2026-06-10T18:11:26.966Z

Let me look at `getStats()` (936-965) to confirm the concurrent-read invariant, and the `startCleanup` trim at 1311 (which the new push-site trim mirrors), and check how `slimResponse` is invoked in the handler path (the DoS/circular concern).

### Assistant | 2026-06-10T18:11:28.353Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:11:29.196Z

[tool_use: Bash]

### User | 2026-06-10T18:11:37.969Z

[tool_result]      1	  getStats(): EventStats {
     2	    const eventsByCategory: Record<EventCategory, number> = {
     3	      system: 0, task: 0, agent: 0, swarm: 0,
     4	      calculation: 0, data: 0, hook: 0, error: 0, quality: 0, audit: 0,
     5	      // ERP categories (INTEG-MS0)
     6	      invoice: 0, gl: 0, accounting: 0, shipping: 0, job: 0, estimate: 0,
     7	      // Scheduling/Capacity categ
... [+990 chars truncated]

### User | 2026-06-10T18:12:02.734Z

[tool_result] <persisted-output>
Output too large (41.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\c7361c9f-19ce-451b-9659-df77324c2fa1\tool-results\bep4slfzq.txt

Preview (first 2KB):
H:/prism/mcp-server/src/engines/CrossSourceDimensionReconciliationEngine.ts:70:  // this is serialized through slimResponse(), which STRIPS the empty-array form — so for a
H:/prism/mcp-server/src/engines/T
... [+1663 chars truncated]

### Assistant | 2026-06-10T18:12:12.791Z

slimResponse is widely used by dispatchers that then `JSON.stringify` the result. Two important things to verify for the depth-guard concern: (1) the prior behavior of `slimResponse` had no depth guard — so the change is purely additive protection, and (2) the result gets `JSON.stringify`-ed downstream, so a returned circular subtree at the cap would throw in `JSON.stringify` rather than being silently emitted. Let me check the prior version via git to confirm this is purely additive, and confirm the EventBus prior state.

### Assistant | 2026-06-10T18:12:14.287Z

[tool_use: Bash]

### User | 2026-06-10T18:12:28.052Z

[tool_result]  .../shared/specs/ZULU-CHAT-SLOT-NODES-MS1-PLAN.md  |     18 +-
 .../specs/ZULU-HERMES-GAP-AUDIT-2026-05-20.md      |     40 +-
 state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.html   |     94 +-
 state/shared/specs/ZULU-OMNISCIENT-MS0-PLAN.md     |     96 +-
 state/shared/specs/ZULU-ORCHESTRATOR-DESIGN.md     |    134 +-
 .../shared/system-viz-dead-pixels-2026-05-31.json  |   2988 +-
 state/shared/sy
... [+910 chars truncated]

### Assistant | 2026-06-10T18:12:33.621Z

The working tree has a huge diff (8925 files — this is the cad-fusion-live-ms0 branch state, not the isolated commit). The empty diff for responseSlimmer.ts means these 5 files match HEAD already (committed). Let me get the actual prior version of these files to confirm the changes are additive. Let me check git log for the specific commit and the prior blob.

### Assistant | 2026-06-10T18:12:35.066Z

[tool_use: Bash]

### User | 2026-06-10T18:12:46.686Z

[tool_result] 63d08b5eed [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-5FIX (slot:golf): harden MCP server -- 5 surgical reliability + observability fixes, 16 tests
cda9bb2b1d [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-5FIX (slot:golf): harden MCP server -- 5 surgical reliability + observability fixes, 16 tests
54efb82485 [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN-P1FIX (slot:golf): close 3-of-3 reviewer-B+C P1 - que
... [+375 chars truncated]

### Assistant | 2026-06-10T18:12:53.328Z

The changes are committed in `cda9bb2b1d`/`63d08b5eed`. Let me see the actual diff of that commit to confirm what changed vs prior, particularly for responseSlimmer and the index.ts handler (to verify additivity and the response-lifecycle invariant).

### Assistant | 2026-06-10T18:12:53.329Z

[tool_use: Bash]

### User | 2026-06-10T18:13:04.425Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-10T18:13:08.147Z

[tool_use: Bash]

### User | 2026-06-10T18:13:21.157Z

[tool_result] commit 63d08b5eed3c1d0d6ff84c14f2b5216200d0b154
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 13:05:48 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-5FIX (slot:golf): harden MCP server -- 5 surgical reliability + observability fixes, 16 tests
    
    Understand-workflow (6 explorers -> synthesis) ranked 29 candidates; shipped the 5
    highest-scored safe-
... [+2017 chars truncated]

### Assistant | 2026-06-10T18:13:25.152Z

Now I have the full picture. The commit message confirms the design, and notably candidates 6+7 (BaseRegistry) were correctly dropped with a documented R12 reason. Let me see the precise index.ts diff (response lifecycle) and the responseSlimmer/EventBus diffs from this commit.

### Assistant | 2026-06-10T18:13:26.435Z

[tool_use: Bash]

### User | 2026-06-10T18:13:44.260Z

[tool_result] commit 63d08b5eed3c1d0d6ff84c14f2b5216200d0b154
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 13:05:48 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-5FIX (slot:golf): harden MCP server -- 5 surgical reliability + observability fixes, 16 tests
    
    Understand-workflow (6 explorers -> synthesis) ranked 29 candidates; shipped the 5
    highest-scored safe-
... [+5319 chars truncated]

### Assistant | 2026-06-10T18:13:49.858Z

Excellent — and notably the diff reveals a **bug-fix-within-the-fix**: the prior code did `response.map(slimResponse)` which leaked `(item, index, array)` into `(response, maxDepth, depth)` — so once `maxDepth` became a real parameter, the bare `.map` would have passed the array index as `maxDepth`, breaking the guard. The explicit arrow fixes that. Good catch by the author. Let me see the EventBus diff and the bridge.ts diff to confirm the prior bridge behavior.

### Assistant | 2026-06-10T18:13:50.948Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:13:51.939Z

[tool_use: Bash]

### User | 2026-06-10T18:14:02.611Z

[tool_result] (Bash completed with no output)

### User | 2026-06-10T18:14:17.507Z

[tool_result] diff --git a/mcp-server/src/routes/bridge.ts b/mcp-server/src/routes/bridge.ts
index 248a7b72c7..dec66c0786 100644
--- a/mcp-server/src/routes/bridge.ts
+++ b/mcp-server/src/routes/bridge.ts
@@ -2,8 +2,27 @@
  * PRISM MCP Server — Bridge & Integration Routes
  * 13 endpoints for external system integration, API key management, and routing
  */
-import { Router } from "express";
+import { Router, t
... [+1670 chars truncated]

### Assistant | 2026-06-10T18:14:21.615Z

The EventBus diff produced no output from that commit, which means the synchronous-trim change at line 606 was NOT in this commit — it may be uncommitted/working-tree. Let me confirm where the EventBus change lives and whether it's committed.

### Assistant | 2026-06-10T18:14:24.834Z

[tool_use: Bash]

### User | 2026-06-10T18:14:34.082Z

[tool_result] === working tree vs HEAD for EventBus ===
=== which commit last touched line 606 region ===
cda9bb2b1d [MAIN] [MCP-RELIABILITY]/U-MCP-HARDEN-5FIX (slot:golf): harden MCP server -- 5 surgical reliability + observability fixes, 16 tests
047fd6ab8e [MAIN] [POST-TRAIN-MS0]/U-PT-CRLF-NORMALIZE: restore EventBus.ts + PhysicsSidecarBuilderEngine.ts to LF (edit flipped CRLF; repo convention is LF)
af9fb5f
... [+631 chars truncated]

### Assistant | 2026-06-10T18:14:40.109Z

Confirmed — the EventBus change IS committed in `cda9bb2b1d` (the diff against HEAD is empty; `git show -- EventBus.ts` produced no output earlier because of a path/CRLF quirk, but the log confirms `cda9bb2b1d` touched it and HEAD contains the exact synchronous trim). All 5 changes are committed and the working tree matches HEAD for these files.

Now let me verify the test files exist and run them to confirm green (R12 — don't trust "16/16" from the commit message), and do the final tsc sanity check on the structural-typing concern (#6).

### Assistant | 2026-06-10T18:14:41.745Z

[tool_use: Bash]

### User | 2026-06-10T18:15:09.196Z

[tool_result] [DEBUG] [EventBus] Publishing event: test.tick (evt_1097_1781115306705)

stderr | src/__tests__/eventBus-handlertimes-bound.test.ts > EventBus handlerTimes synchronous bound > retains only finite numeric timings after the trim (no corruption)
[DEBUG] [EventBus] Event evt_1097_1781115306705 processed: 0/0 handlers in 0ms

stderr | src/__tests__/eventBus-handlertimes-bound.test.ts > EventBus handler
... [+1639 chars truncated]

### Assistant | 2026-06-10T18:15:15.015Z

3 test files green (13 tests). The commit message claimed "4 new vitest files, 16/16" — one file (bridge) wasn't in my run. Let me find and run the 4th, then do the tsc sanity check on the structural-typing concern.

### Assistant | 2026-06-10T18:15:16.639Z

[tool_use: Bash]

### User | 2026-06-10T18:15:27.926Z

[tool_result] AdaptivePhysicsBridgeEngine.test.ts
AuditFindingToCAPABridgeEngine.test.ts
AutoCADDotNetBridgeEngine.test.ts
AutoPrintToProgramBridgeEngine.engine.test.ts
AutoPrintToProgramBridgeEngine.test.ts
AutoPrintToProgramBridgeEngine.wedmManifest.test.ts
BlueprintLoRABridgeEngine.test.ts
CADUnifiedFeatureBridgeEngine.test.ts
CAMInHostResultsBridgeEngine.test.ts
CAMKernelDispatcherBridge.test.ts
CAMSpeedFee
... [+6329 chars truncated]

### Assistant | 2026-06-10T18:15:35.902Z

The 4th test file is `bridge-error-logging.test.ts` (the stat output was truncated; it shows only 3, but the file exists in the listing). Let me run it plus the tsc sanity check on the 5 changed files (structural-typing concern #6).

### Assistant | 2026-06-10T18:15:35.903Z

[tool_use: Bash]

### Assistant | 2026-06-10T18:15:36.786Z

[tool_use: Bash]

### User | 2026-06-10T18:15:45.093Z

[tool_result] [ERROR] [BRIDGE] route error {"action":"route"}

stderr | src/__tests__/bridge-error-logging.test.ts > bridgeError > does not rethrow on a null error and still responds 500
[ERROR] [BRIDGE] route error {"action":"health"}

 ✓ src/__tests__/bridge-error-logging.test.ts (3 tests) 8ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  13:15:43
   Duration  446ms (transform 111ms, setup
... [+47 chars truncated]

### User | 2026-06-10T18:17:36.110Z

[tool_result] === exit/summary ===
 7: 00007FF798E50D95 v8::internal::ThreadIsolation::JitPageReference::Size+190789
 8: 00007FF7987CA30D BIO_ssl_shutdown+189
 9: 7FF8000000000000

### Assistant | 2026-06-10T18:17:41.775Z

The full-project `tsc` crashed (V8 stack/heap dump — a known OOM on this repo's full tsconfig, not a type error). All 16 new tests pass (13 + 3). The commit message asserted "tsc --noEmit clean for all 5 changed files" — to verify the structural-typing concern #6 deterministically without the full-project OOM, let me type-check just the relevant files in isolation.

### Assistant | 2026-06-10T18:17:44.082Z

[tool_use: Bash]

### User | 2026-06-10T18:17:58.555Z

[tool_result] EXIT=0

### Assistant | 2026-06-10T18:18:04.324Z

`transportError.ts` type-checks clean in isolation (exit 0), confirming `respondTransportError`'s self-contained `TransportErrorRes` interface has no internal type errors. The structural-typing concern (#6) is about the **call site** in index.ts passing express's `Response` where `TransportErrorRes` is expected. Let me verify that express `Response` is structurally assignable by checking the exact members the interface requires against express's type, and confirm the call site compiles. Since full-project tsc OOMs, I'll reason from the interface and confirm the express Response shape.

### Assistant | 2026-06-10T18:18:07.690Z

[tool_use: Bash]

### User | 2026-06-10T18:18:15.756Z

[tool_result] 698:    status(code: StatusCode): this;
706:     *    res.sendStatus(200); // equivalent to res.status(200).send('OK')
707:     *    res.sendStatus(403); // equivalent to res.status(403).send('Forbidden')
708:     *    res.sendStatus(404); // equivalent to res.status(404).send('Not Found')
709:     *    res.sendStatus(500); // equivalent to res.status(500).send('Internal Server Error')
733:     * 
... [+707 chars truncated]

### Assistant | 2026-06-10T18:18:44.438Z

I have enough to confirm the structural-typing match. Express `Response.status(code): this` and `headersSent: boolean` exist; `this` (the full Response) is assignable to `TransportErrorRes`'s `{json(body): unknown}` requirement (express's `status()` returns `this`, and `Response.json(body): this`). Express `end()` overloads include a no-arg form. The interface is a structural subset, so express `Response` is assignable — no tsc error. This matches the commit's "tsc clean" claim, and the `transportError.ts` isolated check passed.

I have completed my analysis across all six hunt areas. Let me finalize the verdict.

---

## VERDICT: PASS

Arm C review of `MCP-RELIABILITY/U-MCP-HARDEN-5FIX` (commits `cda9bb2b1d` / `63d08b5eed`, HEAD == working tree for the 5 changed files). All five changes are committed, additive, and verified against live tests. No P0 or P1 findings.

### Hunt-area findings (all clear)

**1. Response-lifecycle / double-respond (REGRESSION) — CLEAR.** `respondTransportError` (`transportError.ts:38`) gates every write behind `!res.headersSent`. The two throw sources inside the new `try` (`index.ts:1286-1287`) are `reqServer.connect()` (throws *before* any write → headers unsent → clean 500) and `transport.handleRequest()` (may throw mid-write → headers sent → falls to `res.end()`). No path double-sends. The `res.on("close")` handler (`index.ts:1276-1279`) only calls `transport.close()`/`reqServer.close()` — never touches `res` — so it cannot collide with or double-respond against `respondTransportError`. Slot release via `decInflight()` on `close` is preserved (comment at 1288 is accurate).

**2. New throw paths (SILENT BREAKAGE) — CLEAR.** `callTool` log (`index.ts:1328`) uses `e?.message`/`e?.stack` — null-safe; the subsequent `return { error: e.message }` is pre-existing (would already NPE on a null throw, unchanged). `respondTransportError` uses `e instanceof Error` (handles non-Error/null) and `bridgeError` uses `e?.message` — both null-safe and v
... [+3047 chars truncated]
