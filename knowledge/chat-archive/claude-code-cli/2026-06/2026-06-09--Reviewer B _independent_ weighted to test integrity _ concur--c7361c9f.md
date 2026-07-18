---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Reviewer B (independent, weighted to test integrity + concurrency lifecycle) of "
date: "2026-06-09"
first_ts: "2026-06-09T17:44:13.650Z"
last_ts: "2026-06-09T17:50:07.799Z"
cwd: "H:\\prism\\mcp-server"
messages: 48
user_msgs: 17
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a5eab15abc6fc3d6f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Reviewer B (independent, weighted to test integrity + concurrency lifecycle) of 

> **claude-code-cli** | 2026-06-09 | 48 msgs (17 user / 31 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a5eab15abc6fc3d6f.jsonl`

## Transcript

### User | 2026-06-09T17:44:13.650Z

Reviewer B (independent, weighted to test integrity + concurrency lifecycle) of a 3-of-3 PRISM scrutiny gate. Re-review committed unit U-MCP-CONCURRENCY-HARDEN on H:/prism (branch cad-fusion-live-ms0): `git -C H:/prism diff ed94bc47~1..HEAD`. Working tree is clean = HEAD. Do NOT assume the fix is correct.

A prior gate FAILED on a queued-disconnect semaphore slot leak. The fix: `acquireRequestSlot(sem,res)` in mcp-server/src/mcp/request-semaphore.ts registers a 'close' observer BEFORE acquire(); on grant to an already-closed res it releases + returns "abandoned".

Read mcp-server/src/mcp/request-semaphore.ts and mcp-server/src/__tests__/request-semaphore.test.ts in full.

Verify rigorously:
- The leak-repro test ("does NOT leak a slot when the client disconnects WHILE queued") genuinely reproduces the race and asserts capacity recovery (outcome "abandoned", inUse 0, reusable). Confirm it would FAIL if the closedWhileWaiting/res.closed check were removed. (I observed exactly that: removing it yields "proceed" + a wedged gate + test timeout.)
- The sustained-burst test (6 mid-queue disconnects) asserts full capacity recovery (catches a partial leak).
- In acquireRequestSlot: no await between grant and the closedWhileWaiting check (no missed-close race); release() is idempotent; a "proceed" result cannot still leak; the "abandoned" path does not double-release or send a response.
- RequestSemaphore core unchanged & still correct (FIFO, clamp, release-at-zero, queueMax=0 shed).
- Knobs still env-overridable; no newly inlined magic numbers.

First line MUST be exactly 'VERDICT: PASS' or 'VERDICT: FAIL'. Then 'BLOCKER:' lines (P0/P1), then <=5 notes. If unsure, FAIL.

### Assistant | 2026-06-09T17:44:21.393Z

I'll review this committed unit rigorously. Let me read the implementation and test files in full, plus examine the actual diff.

### Assistant | 2026-06-09T17:44:22.451Z

[tool_use: Bash]

### User | 2026-06-09T17:44:30.498Z

[tool_result]  .../__tests__/mcp-route-suggest-rtk-guard.test.mjs |   46 +
 .claude/hooks/mcp-route-suggest.mjs                |   17 +-
 .../reference_india_transcript_synthesis.md        |  122 +
 mcp-server/src/__tests__/holderRunoutLife.test.ts  |   79 +
 mcp-server/src/__tests__/request-semaphore.test.ts |  232 +
 mcp-server/src/__tests__/spindlePowerClamp.test.ts |  139 +
 .../engines/SpeedFeedNineAxisOrc
... [+5715 chars truncated]

### Assistant | 2026-06-09T17:44:36.103Z

The unit touches many files, but my scope is the request-semaphore. Let me read the two target files in full plus the actual semaphore diff and the index.ts/watchdog integration.

### Assistant | 2026-06-09T17:44:36.708Z

[tool_use: Read]

### User | 2026-06-09T17:44:38.435Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\mcp\request-semaphore.ts' was already read 7s ago in this session and is unchanged (mtime 1781026994543). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T17:44:43.656Z

The read-once-guard says the file is already in my context, but I need to actually see it. Let me use a different approach to view it.

### Assistant | 2026-06-09T17:44:44.926Z

[tool_use: Bash]

### User | 2026-06-09T17:44:51.043Z

[tool_result] /**
 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
 * concurrent pea
... [+5783 chars truncated]

### Assistant | 2026-06-09T17:44:56.280Z

Now the test file in full.

### Assistant | 2026-06-09T17:44:57.716Z

[tool_use: Bash]

### User | 2026-06-09T17:45:08.360Z

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

### Assistant | 2026-06-09T17:45:13.167Z

Now the index.ts integration (the actual caller) and the watchdog changes, to verify the "proceed"/"abandoned"/"shed" paths are consumed correctly and no double-response.

### Assistant | 2026-06-09T17:45:14.704Z

[tool_use: Bash]

### User | 2026-06-09T17:45:23.084Z

[tool_result] diff --git a/mcp-server/src/index.ts b/mcp-server/src/index.ts
index 1ef8dd5e2f..98417176e5 100644
--- a/mcp-server/src/index.ts
+++ b/mcp-server/src/index.ts
@@ -50,6 +50,8 @@ import { registerToolpathDispatcher } from "./tools/dispatchers/toolpathDispatch
 import { registerCalcDispatcher } from "./tools/dispatchers/calcDispatcher.js";
 // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): in-process MCP
... [+4428 chars truncated]

### Assistant | 2026-06-09T17:45:27.180Z

Now let me verify the close ordering in the index.ts handler — specifically whether the `res.on("close", () => metrics.decInflight())` is registered before `acquireRequestSlot`, and check the watchdog integration for the inflight-aware deferral.

### Assistant | 2026-06-09T17:45:28.276Z

[tool_use: Bash]

### User | 2026-06-09T17:45:41.682Z

[tool_result]         } catch {
          /* never break the response */
        }
      };
      (res as any).write = (c: any, ...a: any[]) => {
        _grab(c);
        return _ow(c, ...a);
      };
      (res as any).end = (c: any, ...a: any[]) => {
        _grab(c);
        return _oe(c, ...a);
      };
    }
    res.on("finish", () => {
      let _ok = res.statusCode < 400;
      try {
        if (_isCall
... [+2379 chars truncated]

### Assistant | 2026-06-09T17:45:46.411Z

Now let me verify the test actually fails if the fix is removed. Let me run the test suite first to confirm it passes as-is, then do the mutation check.

### Assistant | 2026-06-09T17:45:47.901Z

[tool_use: Bash]

### User | 2026-06-09T17:45:58.451Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/request-semaphore.test.ts (12 tests) 11ms
 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  12:45:55
   Duration  263ms (transform 53ms, setup 0ms, import 81ms, tests 11ms, environment 0ms)

### Assistant | 2026-06-09T17:46:05.538Z

12 tests pass. Now the mutation test: remove the `closedWhileWaiting || res.closed === true` check and confirm the leak-repro test FAILS (proving the test genuinely guards the race).

### Assistant | 2026-06-09T17:46:08.695Z

[tool_use: Bash]

### User | 2026-06-09T17:46:15.990Z

[tool_result] mutated

### Assistant | 2026-06-09T17:46:24.178Z

[tool_use: Bash]

### User | 2026-06-09T17:47:05.137Z

[tool_result]      ✓ release() is idempotent on the proceed path (close + manual release) 0ms
     × sustained burst with mid-queue disconnects never erodes capacity 30013ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/request-semaphore.test.ts > acquireRequestSlot (close-while-queued race) > does NOT leak a slot when the client disconnects WHILE queued (the P1 repro)
AssertionError: expected 'proceed'
... [+1333 chars truncated]

### Assistant | 2026-06-09T17:47:12.512Z

Confirmed exactly as the reviewer claimed. Removing the guard:
1. The P1 leak-repro test FAILS with `expected 'proceed' to be 'abandoned'` — it genuinely catches the leak.
2. The sustained-burst test (6 disconnects) hard-TIMES-OUT (30s) — proving the gate wedges (`Promise.all` never resolves because the dead-waiter handoffs leak slots and the final `acquireRequestSlot(fresh)` parks forever, exactly the "wedged gate" failure mode).

Now restore the file and verify byte-identical.

### Assistant | 2026-06-09T17:47:15.018Z

[tool_use: Bash]

### User | 2026-06-09T17:47:32.772Z

[tool_result] ---restored, tree clean for this file:
(empty = clean)

### Assistant | 2026-06-09T17:47:43.945Z

Restored byte-identical (working tree clean). Now let me also run a second mutation: confirm the `res.closed === true` half of the guard is load-bearing (the already-closed-before-acquire case), and verify the sustained-burst test catches a *partial* leak (not just total wedge). Let me also confirm tests pass again after restore, plus do a focused re-read of the FIFO/clamp core.

### Assistant | 2026-06-09T17:47:48.211Z

[tool_use: Bash]

### User | 2026-06-09T17:47:58.601Z

[tool_result] mutated: only res.closed branch
EXIT:0

### Assistant | 2026-06-09T17:48:04.704Z

The grep filtered everything out. Let me re-run capturing the full result lines.

### Assistant | 2026-06-09T17:48:05.944Z

[tool_use: Bash]

### User | 2026-06-09T17:48:12.608Z

[tool_result]  RUN  v4.1.7 H:/PRISM

No test files found, exiting with code 1

filter: src/__tests__/request-semaphore.test.ts
include: src/__tests__/**/*.test.ts
exclude:  **/node_modules/**, **/.git/**

EXIT:0

### Assistant | 2026-06-09T17:48:16.397Z

The cwd reset to H:/prism (not mcp-server). The earlier runs worked because cwd was mcp-server. Let me re-run from the correct directory.

### Assistant | 2026-06-09T17:48:17.629Z

[tool_use: Bash]

### User | 2026-06-09T17:48:34.964Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/request-semaphore.test.ts (12 tests) 7ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  12:48:34
   Duration  184ms (transform 36ms, setup 0ms, import 51ms, tests 7ms, environment 0ms)

EXIT:0

### Assistant | 2026-06-09T17:48:50.580Z

Mutation 2 is informative: with only `res.closed === true` (dropping `closedWhileWaiting`), all 12 tests still pass. This is because `FakeRes.close()` sets `this.closed = true` before emitting, so at the post-grant check `res.closed === true` is observed. The `closedWhileWaiting` flag and `res.closed` are partially redundant *for the FakeRes test harness*.

However, this is NOT a defect in the fix — the `closedWhileWaiting` flag guards a real-world case the `res.closed` snapshot might miss: an express `res` where the `closed` getter could behave differently, or where the close fired during the queued wait but `closed` was reset/unreliable. The belt-and-suspenders (`||`) is correct defensive design. The key load-bearing assertion (mutation 1, removing BOTH) genuinely fails. Let me restore and run the full original suite one final time, then check the watchdog/preempt-decision wiring (Fix C) since it's part of the concurrency lifecycle.

### Assistant | 2026-06-09T17:48:52.181Z

[tool_use: Bash]

### User | 2026-06-09T17:49:01.806Z

[tool_result] (empty=clean)
/**
 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
 *
 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restart
... [+3683 chars truncated]

### Assistant | 2026-06-09T17:49:09.547Z

The preempt-decision lib is clean and well-bounded (the hard-ceiling-beats-burst logic is the correct R12 safety design — defer is overridden by a true runaway leak). This is outside my core scope but confirms the concurrency lifecycle integration is coherent. Let me verify the preempt-decision tests pass and run the full original suite one last time to confirm the restore is clean.

### Assistant | 2026-06-09T17:49:12.714Z

[tool_use: Bash]

### User | 2026-06-09T17:49:23.476Z

[tool_result] # tests 12
# pass 12
# fail 0

### Assistant | 2026-06-09T17:49:28.080Z

[tool_use: Bash]

### User | 2026-06-09T17:49:44.582Z

[tool_result]  ✓ src/__tests__/request-semaphore.test.ts (12 tests) 11ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  12:49:43
   Duration  179ms (transform 30ms, setup 0ms, import 50ms, tests 11ms, environment 0ms)

=== final tree check ===
(empty=clean, HEAD restored)

### Assistant | 2026-06-09T17:50:07.799Z

I have completed my rigorous verification. Tree is clean (HEAD restored), all 12 tests pass, and the mutation analysis confirmed the leak guard is load-bearing.

VERDICT: PASS

Verification performed (not assumed):

1. **Leak-repro test genuinely reproduces the race + asserts capacity recovery.** Read `request-semaphore.test.ts:163-189`. The "P1 repro" test: holder occupies the only slot → queues `res` → `res.close()` fires BEFORE grant → holder `release()` hands the still-held slot to the dead waiter. Asserts `outcome === "abandoned"`, `inUse === 0`, `queued === 0`, AND that a fresh `acquireRequestSlot` then `proceed`s (capacity genuinely reusable, not just zeroed). **Mutation 1 (replaced `if (closedWhileWaiting || res.closed === true)` with `if (false)`): the P1 test FAILED with `expected 'proceed' to be 'abandoned'`** — confirming the reviewer's observation exactly. Restored byte-identical.

2. **Sustained-burst test catches partial leak + wedge.** `request-semaphore.test.ts:198-227`: 6 mid-queue disconnects, 2 holders released into dead waiters; asserts `inUse === 0 && queued === 0` and a fresh acquire `proceed`s. **Under mutation 1 this test hard-TIMED-OUT at 30s** (the wedged-gate failure mode — `Promise.all` over leaked-slot handoffs never settles and the final fresh acquire parks forever). The `inUse===0` assertion would catch a *partial* leak even without the timeout.

3. **`acquireRequestSlot` race-safety.** No `await` between `sem.acquire()` grant and the `closedWhileWaiting || res.closed` check (comment at `request-semaphore.ts:148-149` is accurate — the only `await` precedes it), so no macrotask can interleave a missed close. `release()` is idempotent via the `released` boolean guard and try/catch — the idempotency test (close + double manual release → `inUse===0`) passes. The "abandoned" path calls `release()` once and returns no response; the caller (`index.ts:1247-1250`) just `return`s (decInflight already fired on the earlier 'close'). The "proceed"
... [+1720 chars truncated]
