---
type: "chat-session"
source: "claude-code-cli"
session_id: "a614edfb-8bcb-461d-bac1-a5df0acd7b73"
title: "Independent second-pass review of H:/prism/.claude/helpers/mcp-http-bridge.mjs ("
date: "2026-05-19"
first_ts: "2026-05-19T14:05:24.485Z"
last_ts: "2026-05-19T14:06:27.621Z"
cwd: "H:\\PRISM"
messages: 10
user_msgs: 4
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-abb58ce7c123d7dc2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Independent second-pass review of H:/prism/.claude/helpers/mcp-http-bridge.mjs (

> **claude-code-cli** | 2026-05-19 | 10 msgs (4 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-abb58ce7c123d7dc2.jsonl`

## Transcript

### User | 2026-05-19T14:05:24.485Z

Independent second-pass review of H:/prism/.claude/helpers/mcp-http-bridge.mjs (just-edited). Don't assume arm A caught everything — focus on what's typically missed: integration coupling, security, naming/conformance, hidden coupling.

Context: this stdio→HTTP bridge proxies Claude Code's MCP traffic to a local HTTP server at 127.0.0.1:3100. I added three resilience layers to fix "MCP keeps dropping": (1) per-request retry on transient transport errors, (2) background startup health-gate, (3) periodic liveness probe. The prior version had zero of these. Knobs: PRISM_BRIDGE_HEALTH_GATE_DISABLE, PRISM_BRIDGE_MAX_RETRIES (default 3), PRISM_BRIDGE_LIVENESS_DISABLE.

Read the whole file. Weight your review toward:

1. **Integration with the request queue** — `forwardToHttp` is called inside `processQueue` (L223-ish) which currently times the request via `Date.now() - startTime`. With retries, queueWait now measures the time-to-finish, not the original queue wait. Is the log entry misleading? Worth flagging?

2. **Notification path** — `handleStdioMessage` differentiates requests vs notifications by `id` presence. Notifications fire `queueRequest(...).catch(...)` (no await). With the new retry, a notification's retries delay subsequent queue progress by up to ~10s. Is that a denial-of-service vector when one wedged notification blocks legit requests behind it?

3. **MAX_CONCURRENT interaction** — the queue caps concurrent in-flight at MAX_CONCURRENT (default 3, raised to 6 via env in `.mcp.json`). With retries, a single "in flight" request now holds its slot through multiple HTTP attempts. Under a degraded server, 6 stuck requests = full queue blocked. Suggest a retry-aware concurrency policy?

4. **Liveness probe write-amplification** — every 30s the probe does a GET /health and writes a log entry. Across 13 concurrent chats, 13 bridges = 26 probes/min. The shared log file `H:/prism/.claude/cache/mcp-bridge.log` is unbounded — does it rotate? If not, this fills disk.

5
... [+747 chars truncated]

### Assistant | 2026-05-19T14:05:42.292Z

I'll perform an independent second-pass review of the bridge file.

### Assistant | 2026-05-19T14:05:42.826Z

[tool_use: Read]

### User | 2026-05-19T14:05:45.461Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-http-bridge.mjs — Stdio-to-HTTP MCP Bridge with Request Queue
4	 *
5	 * Solves the multi-chat MCP contention problem:
6	 * - Each Claude chat connects via stdio to THIS bridge
7	 * - Bridge forwards requests to a single shared HTTP MCP server
8	 * - Request queue prevents concurrent tool call collisions
9	 * - Connection pooling keeps HTTP overhead minimal
10	 
... [+16733 chars truncated]

### Assistant | 2026-05-19T14:05:50.404Z

Now let me check the /health endpoint to verify the 503 semantics question.

### Assistant | 2026-05-19T14:05:51.872Z

[tool_use: Grep]

### User | 2026-05-19T14:05:55.631Z

[tool_result] 849-  log.info(SERVER_DESCRIPTION);
850-  
851-  await registerTools();
852-  
853-  const app = express();
854-  // OBSIDIAN-COMPOUND-MS1/S3/U-CAPTURE-WEBHOOK — MUST mount BEFORE
855-  // express.json so the raw body parser inside intake router sees the
856-  // exact bytes the HMAC was computed over (express.json would otherwise
857-  // consume the body stream first and break HMAC verification)
... [+949 chars truncated]

### Assistant | 2026-05-19T14:06:00.080Z

[tool_use: Read]

### User | 2026-05-19T14:06:01.291Z

[tool_result] 879	    const totalEntries = Object.values(registryStats).reduce((a, b) => a + b, 0);
880	    const healthy = totalEntries > 0 && heapUsedMB < 3500;
881	    
882	    res.status(healthy ? 200 : 503).json({ 
883	      status: healthy ? "healthy" : "degraded",
884	      server: SERVER_NAME, 
885	      version: SERVER_VERSION,
886	      uptime_seconds: Math.round(uptime),
887	      memory: { heap_used
... [+1597 chars truncated]

### Assistant | 2026-05-19T14:06:27.621Z

# Independent Second-Pass Review — mcp-http-bridge.mjs

**VERDICT: FAIL** — 2 P0, 4 P1 findings, all confirmed against source.

## P0 findings

**P0-1 — checkServer port fallback is HTTPS-broken (L318).** `port: url.port || 80` ignores `isHttps`. For `https://...` URLs without an explicit port, the probe hits port 80 over HTTPS → always returns `false` → bridge enters perpetual "not ready" and emits false-positive wedge alerts every 30s. `forwardToHttpOnce` (L108) correctly uses `(isHttps ? 443 : 80)` — divergent contract between the two probes. Fix: mirror L108's ternary.

**P0-2 — /health returns 503 when degraded, but bridge treats `<500` as healthy (L325 vs index.ts:882).** Confirmed: server emits `res.status(healthy ? 200 : 503)` on heap >3500MB OR zero registry entries. Bridge's `statusCode < 500` returns `true` for 503 — exactly the wedge state the liveness probe was built to surface goes undetected. The health-gate also greenlights a degraded server at startup. Fix: `resolve(res.statusCode >= 200 && res.statusCode < 400)`.

## P1 findings

**P1-1 — Notification head-of-line DoS (L289–298).** With `MAX_RETRIES=3` + `RETRY_DELAYS_MS=[100,500,2000,4000]`, a single wedged notification holds an `activeRequests` slot for up to ~6.6s. Three notifications (`initialized`, two `progress`) saturate the default `MAX_CONCURRENT=3` → legit `tools/call` requests stall behind fire-and-forget retries that no caller awaits. Notifications should bypass the retry wrapper (server returns 202 anyway) or run in a separate concurrency pool.

**P1-2 — `queueWait` log is misleading (L213).** After retries land, `Date.now() - startTime` measures end-to-end including retry sleeps. The metric is named `queueWait` but now mixes queue-wait + transport-wait + retry-backoff. Either split into `queueWait` (captured before `forwardToHttp`) and `totalDurationMs`, or rename.

**P1-3 — Retry-aware concurrency missing (L205).** Confirmed integration coupling: under a degraded server, 6 concurrent
... [+1430 chars truncated]
