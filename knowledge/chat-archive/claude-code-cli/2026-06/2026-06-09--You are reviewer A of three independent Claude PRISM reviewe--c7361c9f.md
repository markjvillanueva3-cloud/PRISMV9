---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are reviewer A of three independent Claude PRISM reviewers — strict, holisti"
date: "2026-06-09"
first_ts: "2026-06-09T17:20:46.085Z"
last_ts: "2026-06-09T17:23:37.750Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a7a3858d1bf99226b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are reviewer A of three independent Claude PRISM reviewers — strict, holisti

> **claude-code-cli** | 2026-06-09 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a7a3858d1bf99226b.jsonl`

## Transcript

### User | 2026-06-09T17:20:46.085Z

You are reviewer A of three independent Claude PRISM reviewers — strict, holistic — reviewing commit ed94bc47 on the PRISM repo at H:/prism (branch cad-fusion-live-ms0).

Read the commit and the surrounding context yourself:
- `git -C H:/prism show ed94bc47` (the full diff)
- Read end-to-end: H:/prism/mcp-server/src/mcp/request-semaphore.ts, H:/prism/mcp-server/src/__tests__/request-semaphore.test.ts, H:/prism/scripts/lib/mcp-preempt-decision.mjs, H:/prism/scripts/lib/mcp-preempt-decision.test.mjs
- Read the edited regions in context: H:/prism/mcp-server/src/index.ts (the /health handler ~982-1010 and the /mcp POST handler ~1137-1260) and H:/prism/scripts/mcp-server-watchdog.mjs (probeHealth + the RSS-pressure branch in main()).

What this commit does (MCP-CONCURRENCY-HARDEN): the fleet runs unlimited parallel agents, so :3100 sees bursts of concurrent /mcp POSTs; each POST builds a fresh McpServer. Fix A exposes concurrency in /health; Fix B caps+queues+sheds(503) those builds via a RequestSemaphore; Fix C makes the watchdog DEFER its RSS preempt-restart while inflight is high (so a restart doesn't kill a live agent burst), with a hard-ceiling override for true leaks.

Acceptance criteria:
1. No stubs/TODOs/placeholder returns.
2. Tests use concrete assertions that would FAIL if the logic regressed (no toBeDefined blanket stubs).
3. No inlined physics/material constants (N/A here but check).
4. No NEW floating promises / unsafe any-spread introduced (the single `req.body as any` mirrors the existing sibling line 1211 — acceptable only if it truly matches).
5. No silent breakage of the existing /mcp dispatch path or the existing watchdog wedge-escalation path.

Adversarial concurrency probes (THE point of this change — verify each):
- Slot release EXACTLY once: confirm the released-once guard + res 'close' wiring frees the semaphore slot exactly once even if buildRequestServer throws, the client disconnects early, or finish+close both fire. Look for any path that ac
... [+714 chars truncated]

### Assistant | 2026-06-09T17:20:52.983Z

I'll review commit ed94bc47 by reading the diff and all the relevant files end-to-end.

### Assistant | 2026-06-09T17:20:53.554Z

[tool_use: Bash]

### User | 2026-06-09T17:21:01.045Z

[tool_result] commit ed94bc479feee9c75b158f77a7aa0c91a8c7867d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 12:19:09 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed
    
    The fleet runs in ultracode mode: every slot can fan out unlimited para
... [+2665 chars truncated]

### Assistant | 2026-06-09T17:21:07.098Z

Let me read the full diff and all relevant files in parallel.

### Assistant | 2026-06-09T17:21:08.449Z

[tool_use: Bash]

### Assistant | 2026-06-09T17:21:08.961Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:09.488Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:09.930Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:10.256Z

[tool_use: Read]

### User | 2026-06-09T17:21:23.564Z

[tool_result] <persisted-output>
Output too large (30.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\c7361c9f-19ce-451b-9659-df77324c2fa1\tool-results\bm77rahte.txt

Preview (first 2KB):
commit ed94bc479feee9c75b158f77a7aa0c91a8c7867d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 9 12:19:09 2026 -0500

    [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slo
... [+1797 chars truncated]

### User | 2026-06-09T17:21:31.621Z

[tool_result] 1	/**
2	 * RequestSemaphore tests (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
3	 *
4	 * Verifies the concurrency contract the /mcp choke point depends on: cap the
5	 * active set, queue the overflow, shed beyond the queue (503 backpressure), grant
6	 * queued waiters FIFO on release, never go negative, and clamp pathological config.
7	 * Each assertion fails if the corresponding behavior regre
... [+4842 chars truncated]

### User | 2026-06-09T17:21:31.718Z

[tool_result] 1	/**
2	 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
3	 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
4	 *
5	 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
6	 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
7	 * parallel-agent burst (26 slots x ultracode fan-out -> a modeled 300-400
8	 
... [+3236 chars truncated]

### User | 2026-06-09T17:21:31.820Z

[tool_result] 1	/**
2	 * mcp-preempt-decision.mjs -- pure decision for the watchdog's RSS preemptive
3	 * restart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
4	 *
5	 * The preempt-restart is a DISCONNECT for every in-flight agent call. Under an
6	 * ultracode parallel-agent burst RSS legitimately spikes from N concurrent fresh
7	 * request-servers (MCP-CONCURRENCY-FIX 2026-05-31) -- not a leak -- so restart
... [+3889 chars truncated]

### User | 2026-06-09T17:21:31.835Z

[tool_result] 1	/**
2	 * Tests for decidePreemptRestart (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
3	 *
4	 * The function gates a DESTRUCTIVE restart, so the tests pin every branch: the five
5	 * skip gates, restart-in-a-lull, defer-mid-burst, the hard-ceiling override that
6	 * recycles a true leak even mid-burst, and the unknown-inflight fail-safe that
7	 * preserves pre-2026-06-09 behavior on an older s
... [+3416 chars truncated]

### Assistant | 2026-06-09T17:21:38.405Z

Now let me read the full diff text file and the edited regions in index.ts and the watchdog.

### Assistant | 2026-06-09T17:21:42.572Z

[tool_use: Read]

### User | 2026-06-09T17:21:51.628Z

[tool_result] 1	commit ed94bc479feee9c75b158f77a7aa0c91a8c7867d
2	Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
3	Date:   Tue Jun 9 12:19:09 2026 -0500
4	
5	    [MAIN] [MCP-RELIABILITY]/U-MCP-CONCURRENCY-HARDEN (slot:golf): bound /mcp concurrency + inflight-aware watchdog so parallel-agent bursts can't OOM or get restart-killed
6	    
7	    The fleet runs in ultracode mode: every slot can fan out 
... [+33368 chars truncated]

### Assistant | 2026-06-09T17:21:58.120Z

I have the full diff. Now let me verify the critical wiring claims against the live files — specifically the `metrics.inflight`/`peakInflight` API on the metrics collector, the existing `res.on("close")` sibling line, the `req.body as any` sibling at ~1211, and the watchdog `escalate` path. Let me read those regions in context.

### Assistant | 2026-06-09T17:21:59.084Z

[tool_use: Read]

### Assistant | 2026-06-09T17:21:59.424Z

[tool_use: Read]

### User | 2026-06-09T17:22:01.377Z

[tool_result] 1190	            if (b) {
1191	              _chunks.push(b);
1192	              _blen += b.length;
1193	            }
1194	          }
1195	        } catch {
1196	          /* never break the response */
1197	        }
1198	      };
1199	      (res as any).write = (c: any, ...a: any[]) => {
1200	        _grab(c);
1201	        return _ow(c, ...a);
1202	      };
1203	      (res as any).end = (c: an
... [+4280 chars truncated]

### User | 2026-06-09T17:22:02.289Z

[tool_result] 1	/**
2	 * MetricsCollector — in-process MCP request telemetry (OBSERVABILITY-MS0, slot:bravo 2026-05-30).
3	 *
4	 * WHY: chats "disconnecting" from the MCP server was invisible until processes were
5	 * hand-counted. This makes the contention class measurable — per-tool call counts,
6	 * latency percentiles (p50/p95/p99), error counts, live + peak concurrency, and a
7	 * rolling RSS ring. Surface
... [+11526 chars truncated]

### Assistant | 2026-06-09T17:22:08.145Z

The metrics API is confirmed: `metrics.inflight` and `metrics.peakInflight` are public fields, `decInflight()` floors at 0. Now let me verify the `incInflight()` call site (where inflight is bumped relative to the acquire/release wiring) and the watchdog `escalate` + the full RSS-pressure branch in context. The ordering of `incInflight` vs `acquire` matters for whether a shed 503 is counted in inflight.

### Assistant | 2026-06-09T17:22:09.530Z

[tool_use: Read]

### Assistant | 2026-06-09T17:22:10.046Z

[tool_use: Read]

### User | 2026-06-09T17:22:13.409Z

[tool_result] 1137	    if (req.query && req.query.format === "json") {
1138	      res.json({ registries: rs, ...metrics.snapshot() });
1139	      return;
1140	    }
1141	    res.set('Content-Type', 'text/plain; version=0.0.4');
1142	    res.send(lines.join('\n') + '\n' + metrics.prometheus() + '\n');
1143	  });
1144	  
1145	  // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): live auto-refreshing HTML view of /metri
... [+2190 chars truncated]

### User | 2026-06-09T17:22:13.552Z

[tool_result] 230	    return;
231	  }
232	  log("info", "Spawning supervisor", { script: SUPERVISOR_SCRIPT });
233	  const child = spawn(process.execPath, [SUPERVISOR_SCRIPT, "--once"], {
234	    detached: true,
235	    stdio: "ignore",
236	    windowsHide: true,
237	  });
238	  child.unref();
239	  log("info", "Supervisor spawned detached", { childPid: child.pid });
240	}
241	
242	// ---------- main ----------
... [+4844 chars truncated]

### Assistant | 2026-06-09T17:22:35.196Z

I now have the complete picture. Let me verify the critical concurrency contract by reasoning through every path carefully, and check the one remaining concern: the failure case of the watchdog (wedge-escalation path) is untouched, and whether `decInflight` ordering creates any inconsistency.

Let me trace the key adversarial paths:

**1. Slot release exactly once.** `incInflight()` fires at line 1175 (before acquire). `res.on("close", () => metrics.decInflight())` wired at 1220 (before acquire). Then `acquire()` at 1229.
- If acquire resolves **false** (shed): no slot acquired. `releaseSlot` is NOT wired (it's defined after the `return`). `res.on("close")` still fires `decInflight()`. No slot to release → correct, no leak, no over-release. ✓
- If acquire resolves **true**: `_slotReleased=false`, `releaseSlot` wired on `res.on("close")` at 1251. On normal finish OR abort, `close` fires once → `releaseSlot()` runs once, guard flips, `mcpSem.release()` called exactly once. ✓
- If `buildRequestServer()` throws (1265): handler returns, but the slot was already acquired and `res.on("close", releaseSlot)` is wired → when the response closes, slot released once. ✓
- Node guarantees `res` emits `close` exactly once. Even if `finish` + `close` both fire, only `close` carries `releaseSlot`, and the `_slotReleased` guard makes a double-fire idempotent. ✓

**2. The queue-handoff release accounting.** When `release()` is called with a waiter queued, the slot is handed to the waiter (`active` unchanged). The original holder's `releaseSlot` already flipped its own `_slotReleased` guard — so the released slot now belongs to the waiter, who has its OWN `releaseSlot` closure with its own guard. No double-accounting. ✓ This is the classic correct semaphore-with-queue handoff.

**3. 503 shed path.** Confirmed above: `decInflight` fires via the pre-wired close handler; no slot acquired. ✓

**4. Watchdog fail-OPEN.** `import()` wrapped in try/catch → on throw, `decision = {action:"restar
... [+906 chars truncated]

### Assistant | 2026-06-09T17:22:36.064Z

[tool_use: Bash]

### User | 2026-06-09T17:22:52.283Z

[tool_result]   ...
# Subtest: burst exactly at the defer threshold defers (>= is inclusive)
ok 11 - burst exactly at the defer threshold defers (>= is inclusive)
  ---
  duration_ms: 0.2411
  ...
# Subtest: burst one below the threshold restarts
ok 12 - burst one below the threshold restarts
  ---
  duration_ms: 0.1749
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
... [+18 chars truncated]

### Assistant | 2026-06-09T17:23:02.457Z

12/12 preempt-decision tests pass. Let me run the RequestSemaphore vitest suite to confirm the 7/7 claim.

### Assistant | 2026-06-09T17:23:03.103Z

[tool_use: Bash]

### User | 2026-06-09T17:23:18.055Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/request-semaphore.test.ts (7 tests) 5ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
   Start at  12:23:14
   Duration  256ms (transform 34ms, setup 0ms, import 51ms, tests 5ms, environment 0ms)

### Assistant | 2026-06-09T17:23:37.750Z

Both suites pass (7/7 + 12/12). I have verified every acceptance criterion and every adversarial concurrency probe against the live code. My review is complete.

VERDICT: PASS

Notes (≤6):
1. Slot-release-exactly-once verified across all four hazard paths: shed-false (no slot, `releaseSlot` defined after the early `return`, only pre-wired `decInflight` fires); acquire-true normal/abort (`res` emits `close` once, `_slotReleased` guard idempotent); `buildRequestServer()` throw (slot already acquired, `res.on("close", releaseSlot)` wired at 1251 before the try, releases on close); finish+close both firing (only `close` carries `releaseSlot`, guard absorbs). The queued-handoff (`release()` → waiter, `active` unchanged) is the correct semaphore pattern — each waiter owns its own guarded `releaseSlot`, no double-accounting, no over-subscribe.
2. Watchdog fail-OPEN confirmed: `import()` in try/catch → `{action:"restart"}` on throw; lib-returned "skip" is unreachable/no-op under the redundant outer guard (threshold+uptime+cooldown already proven), so "skip" can never strand a pressured server nor cause a wrongful restart. The wedge-escalation failure path (line 333+) is fully untouched; the `escalate`/`lastPreemptiveRestartAt`/`consecutiveFails=0` semantics inside the restart branch are byte-equivalent to the pre-commit block.
3. Unknown-inflight fail-safe verified: `j?.concurrency?.inflight ?? null` → lib coerces non-finite/null to 0 → `burstActive` false → never defers → pre-2026-06-09 behavior preserved (test line 76). Defer deliberately does NOT stamp `lastPreemptiveRestartAt`, so a leak outliving the burst recycles in the next lull and a true runaway crosses `RSS_HARD_MB` mid-burst — correct.
4. Tests are concrete and regression-sensitive (FIFO order array, exact `inUse`/`queued` counts, shed-did-not-enqueue, clamp boundaries, `>=`-inclusive defer threshold + one-below); no `toBeDefined` blanket stubs. No stubs/TODOs/inlined physics constants. No new floating promises 
... [+586 chars truncated]
