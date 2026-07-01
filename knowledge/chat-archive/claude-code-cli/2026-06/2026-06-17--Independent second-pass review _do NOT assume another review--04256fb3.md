---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent second-pass review (do NOT assume another reviewer caught everything"
date: "2026-06-17"
first_ts: "2026-06-17T18:56:22.673Z"
last_ts: "2026-06-17T18:58:04.772Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a0e9f997667f51936.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent second-pass review (do NOT assume another reviewer caught everything

> **claude-code-cli** | 2026-06-17 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a0e9f997667f51936.jsonl`

## Transcript

### User | 2026-06-17T18:56:22.673Z

Independent second-pass review (do NOT assume another reviewer caught everything) of an uncommitted change to `H:/prism/.claude/helpers/mcp-http-bridge.mjs` — the per-chat stdio→HTTP MCP bridge.

See it: `cd H:/prism && git diff -- .claude/helpers/mcp-http-bridge.mjs`. Read the full file.

The change raises three retry-budget DEFAULT constants: INIT 60000→90000, REQUEST 15000→75000, READY 60000→90000, plus a header-comment rewrite. Purpose: a mid-session MCP-server OOM-restart (~50s cold boot, ~every 2.4h) was causing regular tool calls to exhaust the old 15s request budget and throw a connection error, making Claude Code drop the `prism` server for the session.

Weight your review toward what a holistic reviewer might MISS:
1. **Value/units bugs:** are these millisecond values (not seconds)? Are they parsed correctly (`parseInt(env || "90000", 10)`)? Could a bad env override now produce NaN/0 and silently disable retry?
2. **Inlined-constant / magic-number concerns:** are 90000/75000/15000→75000 chosen with a stated, correct relationship to the ~50s boot and the 120000 MCP_TIMEOUT ceiling? Is the relationship documented so it can't silently regress again (this bug WAS a too-small constant)?
3. **Env-override symmetry:** the change moves DEFAULTS only. Does `.mcp.json` or any launcher already set `PRISM_MCP_REQUEST_RETRY_MS` / `PRISM_MCP_INIT_RETRY_MS` to a value that would OVERRIDE (and thus negate) this default fix? Check `H:/prism/.mcp.json`. If an env override exists, the default change is moot — flag it P1.
4. **Header accuracy:** does the rewritten header comment now correctly describe behavior (no remaining stale "~30s"/"60s" claims, no NEW false claim)?
5. Any `.skip`/weakened test or stub introduced? (Expect none — this is a config change with no test in the diff; note that the absence of a committed test for the boot<budget<ceiling invariant is a gap.)

Read-only. Grade PASS or FAIL with P0/P1 findings + file:line.

### Assistant | 2026-06-17T18:56:27.806Z

I'll review this change. Let me start by reading the diff and the full file, plus the related config.

### Assistant | 2026-06-17T18:56:28.769Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:56:29.228Z

[tool_use: Read]

### Assistant | 2026-06-17T18:56:29.308Z

[tool_use: Read]

### User | 2026-06-17T18:56:41.032Z

[tool_result] diff --git a/.claude/helpers/mcp-http-bridge.mjs b/.claude/helpers/mcp-http-bridge.mjs
index c36be6c6db..87105dbaae 100644
--- a/.claude/helpers/mcp-http-bridge.mjs
+++ b/.claude/helpers/mcp-http-bridge.mjs
@@ -18,10 +18,15 @@
  *   2. RETRY        - a request that fails with a connection-class error
  *      (ECONNREFUSED / ECONNRESET / socket hang up / EPIPE) is retried with
  *      backoff ins
... [+3769 chars truncated]

### User | 2026-06-17T18:56:42.177Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\mcp-http-bridge.mjs' was already read 24s ago in this session and is unchanged (mtime 1781722216860). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-17T18:56:42.682Z

[tool_result] 1	{
2	  "mcpServers": {
3	    "prism": {
4	      "type": "stdio",
5	      "command": "node",
6	      "args": [
7	        "H:/prism/.claude/helpers/mcp-http-bridge.mjs"
8	      ],
9	      "env": {
10	        "MCP_HTTP_URL": "http://127.0.0.1:3100/mcp",
11	        "MCP_MAX_CONCURRENT": "3",
12	        "MCP_TIMEOUT": "120000",
13	        "LOG_LEVEL": "info",
14	        "PRISM_MCP_READY_BUDGET_MS": "1
... [+42 chars truncated]

### Assistant | 2026-06-17T18:56:45.804Z

I have the diff, the full file (in context from earlier), and `.mcp.json`. Let me verify a few specific things: the env-override question, the supervisor's actual boot-time claim, and how the retry budgets are actually consumed in the file body.

### Assistant | 2026-06-17T18:56:47.691Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:56:49.100Z

[tool_use: Grep]

### Assistant | 2026-06-17T18:56:50.527Z

[tool_use: Grep]

### User | 2026-06-17T18:56:55.838Z

[tool_result] 95:const INIT_RETRY_BUDGET_MS = parseInt(process.env.PRISM_MCP_INIT_RETRY_MS || "90000", 10);
96:const REQUEST_RETRY_BUDGET_MS = parseInt(process.env.PRISM_MCP_REQUEST_RETRY_MS || "75000", 10);
105:// matches INIT_RETRY_BUDGET_MS for symmetry. Knob: PRISM_MCP_READY_BUDGET_MS.
107:const READY_BUDGET_MS = parseInt(process.env.PRISM_MCP_READY_BUDGET_MS || "90000", 10);
267:  const budget = isInit ? I
... [+231 chars truncated]

### User | 2026-06-17T18:57:00.066Z

[tool_result] .mcp.json:12:        "MCP_TIMEOUT": "120000",
.mcp.json:14:        "PRISM_MCP_READY_BUDGET_MS": "120000"
.claude\helpers\mcp-http-bridge.mjs:23: *      initialize (PRISM_MCP_INIT_RETRY_MS, default 90s) and requests
.claude\helpers\mcp-http-bridge.mjs:24: *      (PRISM_MCP_REQUEST_RETRY_MS, default 75s). A failed forward at handshake OR
.claude\helpers\mcp-http-bridge.mjs:29: *      MCP_TIMEOUT=120
... [+5397 chars truncated]

### User | 2026-06-17T18:57:01.032Z

[tool_result] 197:  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
198:  // killed every ~14 min (exit code 0xFFFFFFFF = Windows abnormal kill) at
202:  // OOM horizon out by ~10x (multi-hour mitigation). The true leak fix
207:  // and kept it → boot OOM if ever shim-invoked. A deliberately LARGER heap
211:  // 136GB Blackwell it forced OOM-restart disconnects every few hours. 24GB on 
... [+104 chars truncated]

### Assistant | 2026-06-17T18:57:05.043Z

This is a critical finding. The grep surfaced that `.mcp.json` does NOT currently contain a `PRISM_MCP_REQUEST_RETRY_MS` override (good — only `PRISM_MCP_READY_BUDGET_MS: 120000` is set), but the memory files reveal something important. Let me read the relevant memory and verify the actual consumption sites in the bridge body (lines 260-280, 470-540).

### Assistant | 2026-06-17T18:57:06.451Z

[tool_use: Read]

### Assistant | 2026-06-17T18:57:07.395Z

[tool_use: Read]

### User | 2026-06-17T18:57:07.477Z

[tool_result] 255	    req.write(body);
256	    req.end();
257	  });
258	}
259	
260	/**
261	 * Forward with retry. Connection-class failures trigger: self-heal spawn +
262	 * backoff + retry, until the per-method budget is exhausted. `initialize`
263	 * gets a long budget so the MCP handshake outlasts a server cold start.
264	 */
265	async function forwardWithRetry(request) {
266	  const isInit = request.method 
... [+1601 chars truncated]

### Assistant | 2026-06-17T18:57:07.840Z

[tool_use: Read]

### User | 2026-06-17T18:57:09.677Z

[tool_result] 465	 *
466	 * Difference from checkServer():
467	 *   - /health = port bound + heap < 3.5GB + registries non-empty
468	 *   - /ready  = /health PLUS canary lazy-import of toolpathDispatcher succeeded
469	 *
470	 * /ready returning 200 proves the ESM/JSON-import bug class (the BUG-1/BUG-2
471	 * from reference_mcp_server_3100_crash_fix_2026_05_22) cannot crash the
472	 * server on the next tool cal
... [+3075 chars truncated]

### User | 2026-06-17T18:57:11.484Z

[tool_result] 1	---
2	name: reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17
3	description: "Operator's recurring \"chats STILL getting kicked off the MCP server\" was (again) a FALSE fleet broadcast on a healthy server -- NOT an OOM. My first-pass OOM/concurrency diagnosis was WRONG; fixed the residual stale-cache false-positive by gating the broadcast on a LIVE :3100 probe."
4	type: reference
5	source:
... [+4304 chars truncated]

### Assistant | 2026-06-17T18:57:16.956Z

I now have everything needed. Let me verify the two remaining points: the `READY_BUDGET_MS` override interaction (`.mcp.json` sets `PRISM_MCP_READY_BUDGET_MS: 120000`), and confirm the supervisor's actual `~50s` boot claim and the `0xFFFFFFFF` exit-code framing in the diff comment, which the memory just contradicted.

### Assistant | 2026-06-17T18:57:17.964Z

[tool_use: Read]

### User | 2026-06-17T18:57:20.712Z

[tool_result] 190	  backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
191	}
192	
193	function spawnChild() {
194	  if (stopping) return;
195	  log("info", "Spawning MCP server", { entry: SERVER_ENTRY, host: SERVER_HOST, port: SERVER_PORT });
196	  const startedAt = Date.now();
197	  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
198	  // killed every ~14 min (exit code 0xFFFFFFFF = 
... [+3144 chars truncated]

### Assistant | 2026-06-17T18:58:04.772Z

I have all the verification I need. Let me consolidate the findings.

**Verified facts:**
1. **Values are milliseconds, parsed correctly.** Lines 95-96 use `parseInt(process.env.X || "90000", 10)` / `"75000"`. Same idiom as the surrounding 6 budget consts. A bad env override (`PRISM_MCP_REQUEST_RETRY_MS=abc`) would `parseInt`→`NaN`, but this is a pre-existing property of every const in this file, not introduced by this diff. With `NaN`, `forwardWithRetry`'s `deadline = Date.now() + NaN = NaN`, and `Date.now() >= NaN` is `false` forever → it would never break the retry loop (infinite retry, not "silently disable"). Not a new bug; not a regression introduced here.
2. **Consumption sites confirmed correct.** Line 267 `const budget = isInit ? INIT_RETRY_BUDGET_MS : REQUEST_RETRY_BUDGET_MS;` — both constants are actually wired in. `READY_BUDGET_MS` at line 506. The change reaches real behavior.
3. **Env-override check (the key holistic-miss item).** `.mcp.json` does NOT set `PRISM_MCP_REQUEST_RETRY_MS` or `PRISM_MCP_INIT_RETRY_MS` — so the two default raises that matter (init/request) are NOT negated; the fix is live. Grep across the repo (excluding node_modules) confirms no launcher sets them either.
4. **`READY_BUDGET_MS` raise (60000→90000) is INERT.** `.mcp.json:14` already sets `PRISM_MCP_READY_BUDGET_MS: "120000"`, which overrides the default at line 107. So the third constant the task mentions is moot in production — harmless but the diff/header implies all three raises take effect. Worth flagging.
5. **`~50s cold boot` claim is accurate** — `mcp-server-supervisor.mjs:238` states "~50s cold boot" verbatim. The relationships (75s > 50s boot; 75s, 90s < 120000 ceiling) are correct and now documented inline (lines 84-94).
6. **Header-accuracy concern.** The new comment (diff line, file ~83-85) asserts the OOM-restart as established fact: *"OOM-restarts roughly every ~2.4h (documented leak, exit 0xFFFFFFFF...)"*. The same-day memory `reference_mcp_kickoff_falsepos_liv
... [+5675 chars truncated]
