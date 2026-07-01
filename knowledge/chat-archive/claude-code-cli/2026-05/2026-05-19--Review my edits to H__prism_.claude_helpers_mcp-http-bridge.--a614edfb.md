---
type: "chat-session"
source: "claude-code-cli"
session_id: "a614edfb-8bcb-461d-bac1-a5df0acd7b73"
title: "Review my edits to H:/prism/.claude/helpers/mcp-http-bridge.mjs for correctness."
date: "2026-05-19"
first_ts: "2026-05-19T14:05:06.161Z"
last_ts: "2026-05-19T14:06:45.015Z"
cwd: "H:\\PRISM"
messages: 13
user_msgs: 6
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-af82d9c7d4b98a6ca.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review my edits to H:/prism/.claude/helpers/mcp-http-bridge.mjs for correctness.

> **claude-code-cli** | 2026-05-19 | 13 msgs (6 user / 7 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/a614edfb-8bcb-461d-bac1-a5df0acd7b73/subagents/agent-af82d9c7d4b98a6ca.jsonl`

## Transcript

### User | 2026-05-19T14:05:06.161Z

Review my edits to H:/prism/.claude/helpers/mcp-http-bridge.mjs for correctness. Context: this is the stdio→HTTP bridge connecting each Claude Code chat to the PRISM MCP server at 127.0.0.1:3100. The previous version had NO retry, NO startup health-gate, and NO liveness probe — bridges died on the first ECONNREFUSED, causing the "red X / MCP keeps dropping" symptom the user reported.

Read the WHOLE file (it's ~470 lines) and report any P0/P1 issues. Specifically verify:

1. **Retry wrapper correctness** — `forwardToHttp` (L164-ish) wraps `forwardToHttpOnce` and retries on `code in RETRYABLE_CODES` (ECONNREFUSED/ECONNRESET/ETIMEDOUT/EHOSTUNREACH/ENETUNREACH). Confirm the retry loop honors MAX_RETRIES (knob PRISM_BRIDGE_MAX_RETRIES, default 3), uses RETRY_DELAYS_MS, and that ALL non-retryable errors (including HTTP 4xx/5xx response parse errors) propagate immediately. Confirm `MAX_RETRIES=0` makes it byte-identical to legacy.

2. **forwardToHttpOnce error code preservation** — when `req.on("error", reject)` fires, `err.code` should reach the retry wrapper. When `req.on("timeout")` fires, the synthesized Error must carry `.code = "ETIMEDOUT"`. Verify.

3. **waitForServerReady** — exponential backoff polling /health up to HEALTH_GATE_MAX_MS (30s default). Must NOT block stdin (called fire-and-forget from main). Must respect HEALTH_GATE_DISABLE knob. Must not throw (caller's `.catch` is defense, not primary). Total wall-clock time bounded.

4. **startLivenessProbe** — `setInterval` every LIVENESS_INTERVAL_MS (30s). Escalates after LIVENESS_FAIL_THRESHOLD (2) consecutive failures. `livenessTimer.unref()` keeps the bridge from staying alive solely for the probe. Must respect LIVENESS_DISABLE knob.

5. **main() flow** — stdin readline is set up BEFORE the background health-gate (so Claude sees responsive bridge immediately). The shutdown handlers (`SIGINT`/`SIGTERM`/rl.close) clear `livenessTimer`. `waitForServerReady()` is fire-and-forget with a `.catch`.

6. **Backward c
... [+840 chars truncated]

### Assistant | 2026-05-19T14:05:44.080Z

I'll read the file and analyze it for correctness.

### Assistant | 2026-05-19T14:05:44.760Z

[tool_use: Read]

### User | 2026-05-19T14:05:46.941Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\mcp-http-bridge.mjs' was already read 2s ago in this session and is unchanged (mtime 1779199441998). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T14:05:55.519Z

[tool_use: Bash]

### User | 2026-05-19T14:05:59.549Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
468

### Assistant | 2026-05-19T14:06:04.030Z

[tool_use: Read]

### User | 2026-05-19T14:06:06.414Z

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
... [+6551 chars truncated]

### Assistant | 2026-05-19T14:06:10.835Z

[tool_use: Read]

### User | 2026-05-19T14:06:13.407Z

[tool_result] 170	    } catch (err) {
171	      lastErr = err;
172	      const code = err && err.code;
173	      const retryable = code && RETRYABLE_CODES.has(code);
174	      const more = i < attempts - 1;
175	      if (!retryable || !more) {
176	        if (i > 0) {
177	          log("error", "Request failed after retries", {
178	            method: jsonRpcRequest.method,
179	            id: jsonRpcRequest.id
... [+4855 chars truncated]

### Assistant | 2026-05-19T14:06:17.307Z

[tool_use: Read]

### User | 2026-05-19T14:06:21.409Z

[tool_result] 340	 * Cap respects HEALTH_GATE_MAX_MS even if the schedule has more slots.
341	 */
342	async function waitForServerReady() {
343	  if (HEALTH_GATE_DISABLE) {
344	    log("info", "Health gate disabled, skipping startup probe");
345	    return null;
346	  }
347	  const startedAt = Date.now();
348	  const schedule = [250, 500, 1000, 2000, 4000, 8000, 8000, 8000];
349	  let attempt = 0;
350	  for (co
... [+4536 chars truncated]

### Assistant | 2026-05-19T14:06:45.015Z

## Code Quality Analysis Report — mcp-http-bridge.mjs

### Summary
- Overall Quality Score: 8.5/10
- File: H:/prism/.claude/helpers/mcp-http-bridge.mjs (468 lines)
- Verdict: **PASS** with 2 P1 + 3 P2 findings

### Verification of 8 audit points
1. **Retry wrapper (L164-199)** — CORRECT. `attempts = max(0,MAX_RETRIES)+1`, RETRYABLE_CODES gated, non-retryable (incl. parse errors L137 with no `.code`) propagate via `!retryable || !more`. `MAX_RETRIES=0` → 1 attempt = byte-identical legacy. PASS.
2. **Error code preservation (L142-151)** — CORRECT. `req.on("error", reject)` passes the original err object preserving `.code`. Timeout synthesizes `e.code="ETIMEDOUT"` (L149). PASS.
3. **waitForServerReady (L342-373)** — CORRECT. Never throws (only awaits `checkServer` which never rejects), respects HEALTH_GATE_DISABLE, bounded by cap-shrinking on L360-362, called fire-and-forget L459. PASS.
4. **startLivenessProbe (L382-410)** — CORRECT. `LIVENESS_DISABLE` early-return, `livenessTimer.unref()` typeof-guarded, escalates on threshold. PASS.
5. **main() flow (L412-463)** — CORRECT. Readline set up L425 before `waitForServerReady()` L459 (fire-and-forget with `.catch`). All 3 shutdown paths clear `livenessTimer`. PASS.
6. **Backward compat** — happy path unchanged byte-for-byte (single forwardToHttpOnce success, no retry, log-only liveness). PASS.
7. **Unhandled-rejection (L387)** — see P1 below.
8. **/health 5xx semantic (L325)** — `< 500` matches the audit spec. ACCEPTABLE.

### P1 Findings
- **P1 — checkServer default port wrong for HTTPS** (L318): `port: url.port || 80` — should be `(isHttps ? 443 : 80)` mirroring L108. Bridge is broken if `MCP_HTTP_URL` is ever `https://...` without explicit port. forwardToHttpOnce already handles this correctly.
- **P1 — livenessProbe async throw is unhandled** (L387-406): the `async` callback to `setInterval` returns a floating promise. `checkServer` never rejects, but any future code change inside (or a thrown synchronous before the fi
... [+1002 chars truncated]
