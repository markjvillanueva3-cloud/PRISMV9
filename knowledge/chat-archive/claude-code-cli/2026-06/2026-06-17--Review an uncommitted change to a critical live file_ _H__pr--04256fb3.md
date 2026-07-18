---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review an uncommitted change to a critical live file: `H:/prism/.claude/helpers/"
date: "2026-06-17"
first_ts: "2026-06-17T18:56:10.412Z"
last_ts: "2026-06-17T19:08:41.957Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 14
assistant_msgs: 21
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-af5b950b819e855f9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review an uncommitted change to a critical live file: `H:/prism/.claude/helpers/

> **claude-code-cli** | 2026-06-17 | 35 msgs (14 user / 21 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-af5b950b819e855f9.jsonl`

## Transcript

### User | 2026-06-17T18:56:10.412Z

Review an uncommitted change to a critical live file: `H:/prism/.claude/helpers/mcp-http-bridge.mjs` (the per-chat stdio→HTTP MCP bridge every Claude chat spawns to reach the shared PRISM MCP server at 127.0.0.1:3100).

See the exact change with: `cd H:/prism && git diff -- .claude/helpers/mcp-http-bridge.mjs` (or read `H:/prism/.git/mcp-bridge-budget-fix.patch`). Read the WHOLE file end-to-end for context.

THE CHANGE (3 retry-budget default constants + header doc):
- `INIT_RETRY_BUDGET_MS` default 60000 → 90000
- `REQUEST_RETRY_BUDGET_MS` default 15000 → 75000
- `READY_BUDGET_MS` default 60000 → 90000
- header comment updated (defense #3 now documents both init+request budgets; "~30s"→"~50s"; "default 60s"→"90s")

THE RATIONALE I'm verifying:
- Operator symptom: "chats will not stay connected" to the `prism` MCP server.
- The shared :3100 server OOM-restarts roughly every ~2.4h (documented memory leak, exit code 0xFFFFFFFF; verified in `mcp-server/logs/supervisor.log`: one Child-exited code=4294967295 after uptimeMs=8680129). Cold boot is ~50s (per `scripts/mcp-server-supervisor.mjs` comment "~50s cold boot").
- The bridge retries connection-class errors (ECONNREFUSED etc.) in `forwardWithRetry`, but a REGULAR request used only a 15s budget — far shorter than the 50s boot. So a tool call landing in a restart window exhausted 15s, threw a JSON-RPC connection error, and Claude Code then dropped `prism` for the whole session.
- `.mcp.json` sets `MCP_TIMEOUT=120000` (Claude Code's per-call ceiling for `prism`), so budgets must stay UNDER 120000 so a retried-then-succeeded call still returns in-window.

VERIFY (grade PASS/FAIL with P0/P1 findings + file:line):
1. Do the new budgets satisfy: boot(~50000) < value < ceiling(120000)? (90000, 75000, 90000)
2. Does `forwardWithRetry` actually use REQUEST_RETRY_BUDGET_MS for non-init requests, and does a longer budget correctly let a connection-class failure retry across the boot WITHOUT masking a genuine application error or
... [+553 chars truncated]

### Assistant | 2026-06-17T18:56:15.898Z

I'll review this change to the MCP HTTP bridge. Let me start by reading the file end-to-end and viewing the exact diff.

### Assistant | 2026-06-17T18:56:16.869Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:56:17.262Z

[tool_use: Read]

### User | 2026-06-17T18:56:19.211Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-http-bridge.mjs - Stdio-to-HTTP MCP Bridge with Request Queue + self-heal
4	 *
5	 * Solves the multi-chat MCP contention problem:
6	 * - Each Claude chat connects via stdio to THIS bridge
7	 * - Bridge forwards requests to a single shared HTTP MCP server
8	 * - Request queue prevents concurrent tool call collisions
9	 * - Connection pooling keeps HTTP overhead 
... [+25524 chars truncated]

### User | 2026-06-17T18:56:22.634Z

[tool_result] diff --git a/.claude/helpers/mcp-http-bridge.mjs b/.claude/helpers/mcp-http-bridge.mjs
index c36be6c6db..87105dbaae 100644
--- a/.claude/helpers/mcp-http-bridge.mjs
+++ b/.claude/helpers/mcp-http-bridge.mjs
@@ -18,10 +18,15 @@
  *   2. RETRY        - a request that fails with a connection-class error
  *      (ECONNREFUSED / ECONNRESET / socket hang up / EPIPE) is retried with
  *      backoff ins
... [+3769 chars truncated]

### Assistant | 2026-06-17T18:56:26.442Z

I've read the entire file and the diff. Let me verify the supporting claims in the rationale rather than taking them on faith. Let me check the supervisor cold-boot comment, the MCP_TIMEOUT in `.mcp.json`, the supervisor log evidence, and the concurrency/throttle interactions.

### Assistant | 2026-06-17T18:56:27.864Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:56:28.557Z

[tool_use: Bash]

### User | 2026-06-17T18:56:38.339Z

[tool_result] 238:  // BOOTING server during the ~50s cold boot and DEFERS instead of killing → ends the flap.

### User | 2026-06-17T18:57:20.497Z

[tool_result] ./.claude/.mcp.json
./.claude/plugins/cache/claude-plugins-official/chrome-devtools-mcp/0.22.0/.mcp.json
./.claude/plugins/cache/claude-plugins-official/chrome-devtools-mcp/32dc50d59bdb/.mcp.json
./.claude/plugins/cache/claude-plugins-official/context7/ae21a9367949/.mcp.json
./.claude/plugins/cache/claude-plugins-official/figma/2.1.7/.mcp.json
./.claude/plugins/cache/claude-plugins-official/figma/
... [+738 chars truncated]

### Assistant | 2026-06-17T18:57:24.658Z

Important finding: the live `.mcp.json` sets `PRISM_MCP_READY_BUDGET_MS=120000`, which means the `READY_BUDGET_MS` default change (60000 → 90000) is overridden in production and is inert for the `prism` server. Let me verify the supervisor cold-boot context, the OOM log evidence, and the self-heal throttle interaction.

### Assistant | 2026-06-17T18:57:25.615Z

[tool_use: Read]

### User | 2026-06-17T18:57:26.508Z

[tool_result] 220	    // in mcp-server/.env (ANTHROPIC_API_KEY, PRISM_OBSIDIAN_API_KEY, ...) was
221	    // silently unloaded on the supervised path while loading fine via
222	    // scripts/start-http.mjs launched from the repo. Pin cwd to the server
223	    // root so both launch paths see the same env.
224	    cwd: "H:/prism/mcp-server",
225	    env: {
226	      ...process.env,
227	      TRANSPORT: "http",
2
... [+1862 chars truncated]

### Assistant | 2026-06-17T18:57:26.982Z

[tool_use: Bash]

### Assistant | 2026-06-17T18:57:28.990Z

[tool_use: Bash]

### User | 2026-06-17T18:57:34.022Z

[tool_result] 1:{"ts":"2026-06-17T18:34:32.953Z","pid":4360,"level":"warn","msg":"Child exited","code":4294967295,"signal":null,"uptimeMs":8680129}

### User | 2026-06-17T19:02:30.747Z

[tool_result] Command running in background with ID: b1tve44k6. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\854a26eb-9246-433c-8656-a42e0ab5f1eb\tasks\b1tve44k6.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-17T19:02:34.270Z

The supervisor log confirms the OOM exit (code=4294967295, uptimeMs=8680129 ≈ 2.41h) and the ~50s cold boot comment is verified at supervisor.mjs:238. Let me wait for the grep results on budget-knob references and tests.

### Assistant | 2026-06-17T19:02:34.757Z

[tool_use: Read]

### User | 2026-06-17T19:02:35.919Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-3 of 10 total (59502 tokens, cap 25000). Call Read with offset=4 limit=3 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	./.claude/helpers/mcp-http-bridge.mjs:23: *      initialize (PRISM_MCP_INIT_RETRY_MS, default 90s) and requests
2
... [+259 chars truncated]

### Assistant | 2026-06-17T19:02:39.020Z

The grep output is large (128KB), likely matching many wiki/log files. Let me narrow to only the live config/code files (not wiki/log/docs noise) plus dedicated bridge tests.

### Assistant | 2026-06-17T19:02:41.413Z

[tool_use: Bash]

### Assistant | 2026-06-17T19:02:43.351Z

[tool_use: Bash]

### User | 2026-06-17T19:03:18.835Z

[tool_result] ---tests in scripts/lib---
mcp-bridge-enforce.mjs*
mcp-bridge-enforce.test.mjs*
mcp-bridge-liveness.mjs*
mcp-bridge-liveness.test.mjs
---any test importing the bridge---
./.claude/hooks/mcp-connectivity-check.test.mjs
./.claude/hooks/__tests__/mcp-bridge-enforce-pretool.test.mjs
./scripts/lib/mcp-bridge-enforce.test.mjs

### User | 2026-06-17T19:07:55.037Z

[tool_result] Command running in background with ID: b2rcgq2gm. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\854a26eb-9246-433c-8656-a42e0ab5f1eb\tasks\b2rcgq2gm.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-17T19:07:58.311Z

Let me wait for the narrowed grep result and check the bridge tests.

### Assistant | 2026-06-17T19:07:59.108Z

[tool_use: Read]

### User | 2026-06-17T19:08:00.242Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-17T19:08:03.947Z

The narrowed grep returned no matches in live code/config (other than the bridge file itself), confirming no test asserts on these specific budget constants and no other consumer reads them. Let me verify there's truly no test coverage for `forwardWithRetry` and check the self-heal throttle math against the new budget.

### Assistant | 2026-06-17T19:08:04.883Z

[tool_use: Grep]

### Assistant | 2026-06-17T19:08:06.425Z

[tool_use: Grep]

### User | 2026-06-17T19:08:07.057Z

[tool_result] No files found

### User | 2026-06-17T19:08:08.017Z

[tool_result] 64:const MAX_CONCURRENT = parseInt(process.env.MCP_MAX_CONCURRENT || "3", 10);
98:const SUPERVISOR_SPAWN_THROTTLE_MS = parseInt(process.env.PRISM_MCP_SUPERVISOR_THROTTLE_MS || "15000", 10);
121:let lastSupervisorSpawn = 0;
184:  if (now - lastSupervisorSpawn < SUPERVISOR_SPAWN_THROTTLE_MS) return;
185:  lastSupervisorSpawn = now;
309:  if (activeRequests >= MAX_CONCURRENT || requestQueue.length ==
... [+45 chars truncated]

### Assistant | 2026-06-17T19:08:41.957Z

I have everything I need. Let me consolidate the analysis.

Verified facts:
- `forwardWithRetry` (line 265-267): `budget = isInit ? INIT_RETRY_BUDGET_MS : REQUEST_RETRY_BUDGET_MS` — confirmed the request path uses the changed constant.
- `isConnectionError` (line 161-174) + the early `throw err` at line 279-282 confirm app errors / non-connection failures (including a wedged-but-alive server returning a JSON-RPC error or HTTP 500-with-body) return immediately and are NOT retried. The longer budget only extends retries for genuine connection-class failures (ECONNREFUSED/RESET/EPIPE/socket hang up/empty body).
- Supervisor cold-boot ~50s confirmed at `supervisor.mjs:238`.
- OOM exit confirmed in `supervisor.log:1` (code=4294967295, uptimeMs=8680129 ≈ 2.41h).
- `.mcp.json` confirms `MCP_TIMEOUT=120000`.
- No dedicated test exercises `forwardWithRetry`/budget constants (grep returned no test files).

Key discrepancy: `.mcp.json` (`.claude/.mcp.json:14`) sets `PRISM_MCP_READY_BUDGET_MS=120000`, which overrides the `READY_BUDGET_MS` default. The init/request retry budgets are NOT set in `.mcp.json`, so the 90000/75000 defaults DO take effect for `prism`.

---

VERDICT: PASS

summary: The three budget changes are arithmetically and logically sound — both retry budgets now exceed the verified ~50s cold-boot/OOM-restart window while staying under the 120000ms `MCP_TIMEOUT` ceiling, and `forwardWithRetry` correctly applies `REQUEST_RETRY_BUDGET_MS` only to connection-class failures (app errors and wedged-but-alive servers still throw immediately at mcp-http-bridge.mjs:279-282). The change is minimal (3 constants + comments, zero logic change) and the OOM/cold-boot rationale is corroborated by `supervisor.log` and `supervisor.mjs:238`. One P2 doc-accuracy nit: the `READY_BUDGET_MS` default bump (60000→90000) is inert for the `prism` server because `.mcp.json` already pins `PRISM_MCP_READY_BUDGET_MS=120000`.

findings:
  - [P2] `.claude/.mcp.json:14` vs `mcp-http-bridge.mjs:107
... [+4223 chars truncated]
