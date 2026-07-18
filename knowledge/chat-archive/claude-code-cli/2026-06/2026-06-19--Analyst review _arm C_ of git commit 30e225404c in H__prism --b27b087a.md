---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27b087a-eaab-4f76-8f35-ee3b32efc1c9"
title: "Analyst review (arm C) of git commit 30e225404c in H:/prism (`git -C H:/prism sh"
date: "2026-06-19"
first_ts: "2026-06-19T19:57:37.907Z"
last_ts: "2026-06-19T20:01:30.367Z"
cwd: "H:\\prism"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a80d5d6435ff666e9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Analyst review (arm C) of git commit 30e225404c in H:/prism (`git -C H:/prism sh

> **claude-code-cli** | 2026-06-19 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b27b087a-eaab-4f76-8f35-ee3b32efc1c9/subagents/agent-a80d5d6435ff666e9.jsonl`

## Transcript

### User | 2026-06-19T19:57:37.907Z

Analyst review (arm C) of git commit 30e225404c in H:/prism (`git -C H:/prism show 30e225404c`): a renamed loopback HTTP server engine (HyperMillACBridgeEngine -> HyperMillACServerEngine) with 2 error-path fixes + a WIRE-EXEMPT tag + tracked test.

Weighted toward SILENT BREAKAGE / regression / HTTP-correctness:
  1. OVERSIZE FIX CORRECTNESS: the readJsonBody oversize branch now does `res.setHeader("Connection","close"); safeSend(413,...)` and returns, WITHOUT `req.destroy()`. Scrutinize: with the client still uploading 1.5MB, does Connection:close reliably flush the 413 before teardown? Is there a risk the server leaks the socket / hangs if the client keeps writing and nothing drains/closes it? Is `sizeLimitHit` still preventing the later `req.on("end")` from double-processing? Could a real (non-test) oversize upload now hang a connection instead of resetting? Read the FULL readJsonBody (req.on data/end/error handlers) and reason about it.
  2. MALFORMED-JSON: confirm the engine's `req.on("end")` JSON.parse->400 path is genuinely reached now (the prior hang was a test Content-Length bug, not an engine bug) — and that there is no remaining server-side way for a client that under-sends vs its Content-Length to hang the server indefinitely (is there a body-read timeout? if not, note it as a P2 robustness gap — a real slowloris/incomplete-body client could hang a connection).
  3. RENAME REGRESSION: confirm nothing outside the renamed file + its test referenced the old class/singleton in code (the wired twin in BatchCAMAPIBridgeEngines.ts is independent). Run `git -C H:/prism grep -nE "HyperMillACBridgeEngine|hyperMillACBridgeEngine" -- 'mcp-server/src/**/*.ts'` and confirm every remaining hit is the SEPARATE Batch twin, not a dangling ref to the renamed file.
  4. Build: `cd H:/prism/mcp-server && npx tsc --noEmit 2>&1 | grep -iE "HyperMillACServer" | head` (expect none).

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then <=5 notes. If u
... [+19 chars truncated]

### Assistant | 2026-06-19T19:57:41.236Z

I'll analyze commit 30e225404c with focus on silent breakage, HTTP correctness, and the rename's blast radius.

### Assistant | 2026-06-19T19:57:42.153Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:57:42.688Z

[tool_use: Bash]

### User | 2026-06-19T19:57:52.099Z

[tool_result] commit 30e225404cad8f044263a61699ed4e5e3a6a4d50
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:57:01 2026 -0500

    [MAIN-FORCE] [WIRING]/U-ACSERVER-RESOLVE (slot:romeo, for kilo): resolve the HyperMillAC orphan -- rename (kill collision) + fix 2 error-path bugs + track + honest WIRE-EXEMPT
    
    Resolves the orphan romeo flagged to kilo (03c5a33c5b). The unt
... [+1502 chars truncated]

### User | 2026-06-19T19:57:57.826Z

[tool_result] commit 30e225404cad8f044263a61699ed4e5e3a6a4d50
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Fri Jun 19 14:57:01 2026 -0500

    [MAIN-FORCE] [WIRING]/U-ACSERVER-RESOLVE (slot:romeo, for kilo): resolve the HyperMillAC orphan -- rename (kill collision) + fix 2 error-path bugs + track + honest WIRE-EXEMPT
    
    Resolves the orphan romeo flagged to kilo (03c5a33c5b). The unt
... [+17062 chars truncated]

### Assistant | 2026-06-19T19:58:00.326Z

Now let me read the full engine source, focusing on the HTTP body-read paths.

### Assistant | 2026-06-19T19:58:00.585Z

[tool_use: Read]

### User | 2026-06-19T19:58:04.072Z

[tool_result] 1	// WIRE-EXEMPT: loopback HTTP server (start/stop lifecycle, bound 127.0.0.1) started by the host/operator process (per-workstation prism_ac install) to receive inbound hyperCAD-S panel calls -- NOT a request/response prism_* dispatcher action. Renamed from HyperMillACBridgeEngine to resolve a class+singleton name collision with the OUTBOUND CAM-API bridge in BatchCAMAPIBridgeEngines.ts (the camD
... [+19219 chars truncated]

### Assistant | 2026-06-19T19:58:07.304Z

Now I have the full body of `readJsonBody`. Let me trace the rename blast radius and verify the build, plus check the related config/executor files exist.

### Assistant | 2026-06-19T19:58:09.226Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:58:10.671Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:58:12.323Z

[tool_use: Bash]

### User | 2026-06-19T19:58:29.300Z

[tool_result] mcp-server/src/__tests__/HyperMillACServerConfig.test.ts:41:  it("AC_SERVER_DEFAULT_PORT = 18365 (matches HyperMillACBridgeEngine)", () => {
mcp-server/src/engines/BatchCAMAPIBridgeEngines.ts:15: *   HyperMillACBridgeEngine       — Port 18365  (hyperMILL Automation Center)
mcp-server/src/engines/BatchCAMAPIBridgeEngines.ts:703:// ─── Engine 4: HyperMillACBridgeEngine ──────────────────────────────
... [+1276 chars truncated]

### User | 2026-06-19T19:58:40.669Z

[tool_result] mcp-server/src/__tests__/HyperMillACServerEngine.test.ts:2: * Tests for HyperMillACServerEngine — loopback HTTP companion server.
mcp-server/src/__tests__/HyperMillACServerEngine.test.ts:15:import { HyperMillACServerEngine } from "../engines/HyperMillACServerEngine.js";
mcp-server/src/__tests__/HyperMillACServerEngine.test.ts:67:let engine: HyperMillACServerEngine;
mcp-server/src/__tests__/HyperMi
... [+1797 chars truncated]

### User | 2026-06-19T19:58:55.765Z

[tool_result] mcp-server/data/docs/ENGINE_DIGEST.md:1354:- **HyperMillACBridgeEngine**: Loopback HTTP companion server for OPEN MIND
mcp-server/data/docs/galaxies/mill/ENGINE_DIGEST.md:81:| `HyperMillACBridgeEngine.ts` | 17.4K | flat | Automation Center (AC) / hyperCAD-S / hyperMILL. |
mcp-server/data/milestones/DEA-MS0.json:509:        "HyperMillACBridgeEngine",
mcp-server/data/milestones/DEA-MS0.json:517:    
... [+1665 chars truncated]

### Assistant | 2026-06-19T19:59:00.151Z

Key finding for the rename regression: every remaining `HyperMillACBridgeEngine`/`hyperMillACBridgeEngine` code reference is in the SEPARATE Batch twin (`BatchCAMAPIBridgeEngines.ts`) plus the camDispatcher line that imports it from `BatchCAMAPIBridgeEngines.js` — NOT a dangling import of the renamed file. The config file's two refs are comment-only. Let me verify the config file refs are truly comments and check whether the old file still physically exists on disk (untracked).

### Assistant | 2026-06-19T19:59:01.099Z

[tool_use: Read]

### Assistant | 2026-06-19T19:59:02.520Z

[tool_use: Bash]

### User | 2026-06-19T19:59:04.346Z

[tool_result] 1	/**
2	 * HyperMillACServerConfig — Automation Center Companion HTTP Server Configuration
3	 *
4	 * Provides configuration for the PRISM-side AC companion HTTP server that
5	 * bridges MCP commands to hyperMILL's Automation Center API.
6	 *
7	 * Key design decisions:
8	 *   - Binds ONLY to 127.0.0.1 (loopback) — never 0.0.0.0 — preventing
9	 *     unintended network exposure on shop-floor machine
... [+1111 chars truncated]

### Assistant | 2026-06-19T19:59:04.815Z

[tool_use: Bash]

### User | 2026-06-19T19:59:16.246Z

[tool_result] Exit code 2
ls: cannot access 'mcp-server/src/engines/HyperMillACBridgeEngine.ts': No such file or directory
-rw-r--r-- 1 wompu 197611  5009 May 20 13:04 mcp-server/src/engines/HyperMillACScriptExecutor.ts
-rw-r--r-- 1 wompu 197611  7913 May 20 13:04 mcp-server/src/engines/HyperMillACServerConfig.ts
-rw-r--r-- 1 wompu 197611 18577 Jun 19 14:55 mcp-server/src/engines/HyperMillACServerEngine.ts

### User | 2026-06-19T19:59:27.606Z

[tool_result] config tracked at this commit
mcp-server/src/engines/HyperMillACScriptExecutor.ts
mcp-server/src/engines/HyperMillACServerConfig.ts

### Assistant | 2026-06-19T19:59:32.669Z

Confirmed: the old `HyperMillACBridgeEngine.ts` file no longer exists on disk (renamed cleanly), and both deps (`HyperMillACServerConfig.ts`, `HyperMillACScriptExecutor.ts`) are tracked and present. The two config refs to the old name are comment-only (lines 10, 26). Now let me verify the security-validation contract (the test asserts non-loopback throws) and the build, plus check the test's Content-Length helper claim.

### Assistant | 2026-06-19T19:59:35.034Z

[tool_use: Bash]

### Assistant | 2026-06-19T19:59:36.030Z

[tool_use: Bash]

### User | 2026-06-19T19:59:51.411Z

[tool_result] 8: *   - Binds ONLY to 127.0.0.1 (loopback) — never 0.0.0.0 — preventing
13: *   - Auth: loopback-only (no token needed for 127.0.0.1 clients).
15: * Agent 18 finding: AC companion server missing, port mismatch.
16: * This module fixes the port and binding configuration.
25:/** Default port for the AC companion HTTP server.
26: *  Matches HyperMillACBridgeEngine (E1144) default port.
28:export con
... [+1332 chars truncated]

### User | 2026-06-19T20:00:15.346Z

[tool_result] ---tsc-grep-exit done---

### Assistant | 2026-06-19T20:00:19.960Z

tsc is clean for these engines (no `HyperMillACServer`/`HyperMillACBridge` errors), and the config validation error strings (`Security violation: host must be "127.0.0.1"`, `Port N is outside the valid range`) match the test's `.toThrow` regexes exactly. 

Now the core HTTP-correctness analysis. Let me reason carefully about the oversize-413 path and the missing body-read timeout. Let me check whether the executor and the broader server have any socket-timeout configuration.

### Assistant | 2026-06-19T20:00:22.114Z

[tool_use: Bash]

### User | 2026-06-19T20:00:35.604Z

[tool_result] 230:    // BEFORE destroying the socket, and gate the data/end/error handlers on a
245:        // Reject the oversize upload WITHOUT resetting the socket: Connection:close lets
306:      typeof body.timeout_ms === "number" && body.timeout_ms > 0 ? Math.floor(body.timeout_ms) : undefined;
397:      result = await this.executor.execute(script, { timeout_ms: timeoutMs ?? this.config.timeoutMs });
---
... [+46 chars truncated]

### Assistant | 2026-06-19T20:00:51.033Z

Confirmed: no `server.setTimeout`, `requestTimeout`, or `headersTimeout` is configured. The server relies entirely on node's defaults. Let me confirm node's default `requestTimeout` provides a backstop, and analyze the oversize path one more time for the socket-leak concern.

Let me reason through the two HTTP-correctness questions precisely now that I have the full handler.

**Oversize (413) path analysis (lines 240-253):**
- On `total > MAX_BODY`: sets `sizeLimitHit=true`, sets `Connection: close`, calls `safeSend(413,...)` which writes head + `res.end(...)`, then `return`.
- The socket is NOT destroyed. With `Connection: close`, node will close the TCP connection after the response is fully flushed.
- `sizeLimitHit` guard: subsequent `data` events early-return (line 241); `end` early-returns (line 255). So no double-processing. Good — `responseSent` also guards `safeSend`.
- The concern: the client is still uploading 1.5MB. After the server sends the 413 and half-drains, does the unread inbound body hang the socket? In node, once `res.end()` is called with `Connection: close`, node stops reading the request and destroys the socket after flush. The client's remaining writes get an RST, but the client has already received the 413 response (the test asserts `result.body.error === "payload_too_large"` and passes). This is the standard node pattern and the test proves the client reads the 413. Not a leak.

**The real robustness gap:** there is no application-level body-read timeout. A slowloris/incomplete-body client (sends `Content-Length: 1000`, then dribbles or stalls) leaves `req.on("end")` never firing — the request handler's promise-equivalent never resolves. Node's `http.Server` default `requestTimeout` (300s since node 18) and `headersTimeout` (60s) provide a backstop, so it's bounded, not infinite — but at the application layer nothing aborts a stalled body read. This is a P2 robustness gap (the commit message itself frames the malformed-JSON fix as a test bu
... [+181 chars truncated]

### Assistant | 2026-06-19T20:00:52.652Z

[tool_use: Bash]

### User | 2026-06-19T20:00:56.395Z

[tool_result] node v22.12.0
default requestTimeout(ms): 300000
default headersTimeout(ms): 60000
default keepAliveTimeout(ms): 5000

### Assistant | 2026-06-19T20:01:02.510Z

Confirmed: node v22 default `requestTimeout=300000ms` (5min) is in effect — so a slowloris/incomplete-body client is bounded at 5 minutes per connection, not infinite. This downgrades the slowloris concern from "indefinite hang" to "a 5-minute connection hold per malicious connection with no app-level abort" — a genuine P2 robustness gap on a loopback-only server (low exploitability since it binds 127.0.0.1 only, so only local processes can reach it).

Let me do a final check: run the actual test file to confirm the claimed 20 passed / 1 skipped / 0 failed, and verify there's no lingering open-handle leak (the original concern about the oversize socket).

### Assistant | 2026-06-19T20:01:04.290Z

[tool_use: Bash]

### User | 2026-06-19T20:01:10.352Z

[tool_result] [INFO] [HyperMillACServer] listening http://127.0.0.1:56175
[INFO] AC Companion Server:
  Bind:        127.0.0.1:56175
  Timeout:     30000ms
  Concurrent:  4 max
  Mock mode:   true
  Routes:      /status, /execute, /job-status, /extract, /optimize
  CORS origins: http://localhost:3000, http://127.0.0.1:3000, null

stderr | src/__tests__/HyperMillACServerEngine.test.ts > HyperMillACServerEngine —
... [+700 chars truncated]

### Assistant | 2026-06-19T20:01:30.367Z

Tests confirmed: **20 passed | 1 skipped | 0 failed**, 323ms total (no 60s hang — the malformed-JSON fix is real). The oversize test passed and the suite exited cleanly with no open-handle warning, confirming the 413 path does not leak the socket.

All four investigation axes are complete. Final verdict.

VERDICT: PASS

summary: Commit 30e225404c is a clean rename (HyperMillACBridgeEngine -> HyperMillACServerEngine) of an untracked loopback HTTP server plus two real error-path fixes. The rename has zero dangling references — every remaining `HyperMillACBridgeEngine`/`hyperMillACBridgeEngine` code hit is the SEPARATE camDispatcher-wired Batch twin in `BatchCAMAPIBridgeEngines.ts` (verified independent), the old file is gone from disk, both tracked deps (Config/Executor) resolve, tsc is clean, and the test suite is 20/0 with no hang. The oversize-413 path is correct (no socket leak proven by the live test); the only gap is the absence of an app-level body-read timeout, bounded by node's 5-min default `requestTimeout` and mitigated by loopback-only binding.

findings:
- [P2] `mcp-server/src/engines/HyperMillACServerEngine.ts:221-273` -- `readJsonBody` has no application-level body-read/idle timeout. A client that sends a `Content-Length` header then stalls (slowloris / incomplete body) leaves `req.on("end")` un-fired; the only backstop is node's default `server.requestTimeout` (300000ms, verified live on node v22) so the connection is held up to 5 minutes rather than indefinitely. Low exploitability (server binds 127.0.0.1 only, local processes only). Fix: set `server.requestTimeout`/`server.headersTimeout` explicitly in `start()`, or add a per-request idle timer that `safeSend(408)` + closes. (Commit message correctly frames the prior malformed-JSON hang as a test Content-Length bug, not an engine bug — that part is verified.)
- [P2] `mcp-server/data/docs/ENGINE_DIGEST.md:1354`, `mcp-server/data/docs/galaxies/mill/ENGINE_DIGEST.md:81`, `mcp-server/src/engines/pdf-corp
... [+1411 chars truncated]
