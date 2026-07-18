---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Third independent reviewer (arm C) — weighted toward SILENT BREAKAGE, regression"
date: "2026-06-17"
first_ts: "2026-06-17T18:56:36.043Z"
last_ts: "2026-06-17T18:57:53.262Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a443a661becae6b34.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Third independent reviewer (arm C) — weighted toward SILENT BREAKAGE, regression

> **claude-code-cli** | 2026-06-17 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a443a661becae6b34.jsonl`

## Transcript

### User | 2026-06-17T18:56:36.043Z

Third independent reviewer (arm C) — weighted toward SILENT BREAKAGE, regression risk, and integration coupling. Do NOT assume arms A/B caught everything.

Target: uncommitted change to `H:/prism/.claude/helpers/mcp-http-bridge.mjs` (the stdio→HTTP MCP bridge each Claude chat spawns). View: `cd H:/prism && git diff -- .claude/helpers/mcp-http-bridge.mjs`; read the whole file.

Change: retry-budget DEFAULT constants raised — INIT_RETRY_BUDGET_MS 60000→90000, REQUEST_RETRY_BUDGET_MS 15000→75000, READY_BUDGET_MS 60000→90000 — plus header doc. Goal: keep `prism` connected through a ~50s MCP-server cold-boot/OOM-restart by ensuring a regular request RETRIES across the boot instead of throwing at 15s and making Claude Code drop the server for the session. Budgets kept under the `.mcp.json` MCP_TIMEOUT=120000 per-call ceiling.

Analyze for:
1. **Regression / silent breakage:** does raising REQUEST_RETRY_BUDGET_MS to 75s change any timing assumption elsewhere — e.g., `waitForReady` (READY_BUDGET_MS now 90s, but it's fail-open), the request queue draining, the SUPERVISOR_SPAWN_THROTTLE (15000) interaction with the retry loop, or the heartbeat/sentinel? Could a request now retry for 75s while holding a concurrency slot (MCP_MAX_CONCURRENT=3), starving other requests (head-of-line blocking) during a boot?
2. **Worst-case behavior on a PERMANENTLY-down server:** with 75s budget, does a request to a genuinely-dead server hang 75s then error — and is that acceptable vs. the old 15s? Does the self-heal still fire?
3. **Per-attempt timeout:** does each `forwardToHttp` attempt have its own socket/timeout so the retry loop actually iterates and the budget is real (not one infinite hang)? Cite the timeout.
4. **Coupling with Claude Code:** does a 75s/90s bridge-side retry risk exceeding any Claude-Code-side per-call timeout other than the 120000 in .mcp.json? Is 90s (init) safely under 120s under load?
5. Any I/O, error-budget, or fail-open path that the new values weaken.

Read-only.
... [+65 chars truncated]

### Assistant | 2026-06-17T18:56:42.233Z

I'll analyze this change. Let me start by reading the diff and the full file.

### Assistant | 2026-06-17T18:56:43.173Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:56:43.595Z

[tool_use: Read]

### User | 2026-06-17T18:56:44.008Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-17T18:56:44.585Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\mcp-http-bridge.mjs' was already read 27s ago in this session and is unchanged (mtime 1781722216860). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-17T18:56:47.976Z

The diff is cached and the file was already read this session. Let me work from the context I have, but I need to actually see the file contents since the read-once guard fired. Let me grep the relevant constants and logic to verify the specifics, since I need concrete file:line citations.

### Assistant | 2026-06-17T18:56:49.332Z

[tool_use: Grep]

### User | 2026-06-17T18:56:58.548Z

[tool_result] 29: *      MCP_TIMEOUT=120000 per-call ceiling so a retried call still returns in-window.
64:const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
65:const REQUEST_TIMEOUT = parseInt(process.env.MCP_TIMEOUT || "120000", 10);
91:// MCP_TIMEOUT=120000 per-call ceiling (so a retried call still returns in-window):
95:const INIT_RETRY_BUDGET_MS = parseInt(process.env.PRISM_MCP_INI
... [+752 chars truncated]

### Assistant | 2026-06-17T18:57:01.105Z

Let me read the key sections of the file to verify the retry loop, per-attempt timeout, concurrency gating, and self-heal paths.

### Assistant | 2026-06-17T18:57:01.646Z

[tool_use: Read]

### User | 2026-06-17T18:57:04.522Z

[tool_result] 240	        try {
241	          const response = JSON.parse(data);
242	          resolve(response);
243	        } catch (e) {
244	          reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
245	        }
246	      });
247	    });
248	
249	    req.on("error", reject);
250	    req.on("timeout", () => {
251	      req.destroy();
252	      reject(new Error(`Request timeout after ${REQU
... [+3431 chars truncated]

### Assistant | 2026-06-17T18:57:08.261Z

Now let me read the full request-forwarding section (the HTTP request setup with timeout) and the queue/concurrency state, plus the waitForReady self-heal area.

### Assistant | 2026-06-17T18:57:09.602Z

[tool_use: Read]

### Assistant | 2026-06-17T18:57:10.558Z

[tool_use: Read]

### User | 2026-06-17T18:57:12.253Z

[tool_result] 460	}
461	
462	/**
463	 * Probe /ready (the stricter readiness endpoint added 2026-05-28 U-MCPR01).
464	 * Returns true on 200, false on anything else (timeout, error, 503).
465	 *
466	 * Difference from checkServer():
467	 *   - /health = port bound + heap < 3.5GB + registries non-empty
468	 *   - /ready  = /health PLUS canary lazy-import of toolpathDispatcher succeeded
469	 *
470	 * /ready retur
... [+3594 chars truncated]

### User | 2026-06-17T18:57:12.306Z

[tool_result] 200	  }
201	}
202	
203	/**
204	 * Forward a JSON-RPC request to the HTTP MCP server (single attempt).
205	 * Resolves `null` on an empty body (valid for a notification).
206	 */
207	async function forwardToHttp(jsonRpcRequest) {
208	  return new Promise((resolve, reject) => {
209	    const url = new URL(MCP_HTTP_URL);
210	    const isHttps = url.protocol === "https:";
211	    const client = isHttp
... [+1539 chars truncated]

### Assistant | 2026-06-17T18:57:19.505Z

Now I have a clear picture of the core retry mechanics. Let me verify two remaining coupling points: (1) the per-attempt socket timeout vs. budget interaction (REQUEST_TIMEOUT is 120000, but the budget is 75000 — so a single hung attempt could exceed the budget), and (2) where `forwardWithRetry` / `forwardToHttp` is the only request path and how `ensureServerStarted` / `SUPERVISOR_SPAWN_THROTTLE` self-heal interacts. Let me read the header doc block and the `ensureServerStarted`/`isConnectionError` area.

### Assistant | 2026-06-17T18:57:20.994Z

[tool_use: Read]

### Assistant | 2026-06-17T18:57:21.527Z

[tool_use: Read]

### User | 2026-06-17T18:57:22.157Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-http-bridge.mjs - Stdio-to-HTTP MCP Bridge with Request Queue + self-heal
4	 *
5	 * Solves the multi-chat MCP contention problem:
6	 * - Each Claude chat connects via stdio to THIS bridge
7	 * - Bridge forwards requests to a single shared HTTP MCP server
8	 * - Request queue prevents concurrent tool call collisions
9	 * - Connection pooling keeps HTTP overhead 
... [+6481 chars truncated]

### User | 2026-06-17T18:57:22.516Z

[tool_result] 150	      queueLength: requestQueue.length,
151	      timestamp: Date.now()
152	    }));
153	  } catch {}
154	}
155	
156	/**
157	 * True when the error means "the server is not there" (vs a genuine
158	 * application error or a slow-but-alive server). Only connection-class
159	 * failures are worth retrying.
160	 */
161	function isConnectionError(err) {
162	  if (!err) return false;
163	  const co
... [+1601 chars truncated]

### Assistant | 2026-06-17T18:57:53.262Z

I now have the full picture. Let me verify the one remaining concern: whether a single `forwardToHttp` attempt with `timeout: REQUEST_TIMEOUT` (120000) could blow through the 75s budget — i.e., the per-attempt timeout exceeds the retry budget. And let me confirm the queue's head-of-line behavior is `shift`-based FIFO with no per-request queue-wait timeout.

The key facts are established. Let me do a final check on whether `forwardToHttp`'s `timeout: REQUEST_TIMEOUT` is the only socket timeout (so a connection that *connects* but stalls reading the body during a slow boot could hang up to 120s on a single attempt, exceeding the 75s budget check which only runs between attempts).

I have everything I need to render the verdict.

---

VERDICT: PASS

summary: The change is a pure default-constant bump (three retry budgets raised) on knobs that were already env-overridable; the retry loop, per-attempt socket timeout, self-heal, fail-open `waitForReady`, and concurrency gating are all structurally unchanged. The new values are internally consistent with the stated goal (outlast a ~50s boot, stay under the 120s MCP_TIMEOUT ceiling). I traced two real second-order effects (head-of-line blocking on a 3-slot pool during a boot, and a single hung attempt being able to exceed its own budget) — both are pre-existing properties of the loop that this change *amplifies in duration* rather than introduces, and neither breaks a contract. P2 only.

findings:
  - [P2] `mcp-http-bridge.mjs:309,313,327` -- HEAD-OF-LINE BLOCKING amplified during a boot. `processQueue` holds a concurrency slot (`activeRequests++`) for the *entire* duration of `forwardWithRetry`, which now retries up to 75s (was 15s) per request before releasing the slot. With `MAX_CONCURRENT=3`, three requests landing in a cold-boot/OOM window each pin a slot for up to 75s; a 4th+ request sits in `requestQueue` un-drained for that whole window. This is correct behavior for a single-chat bridge (one chat rarely has >3 in-fl
... [+3234 chars truncated]
