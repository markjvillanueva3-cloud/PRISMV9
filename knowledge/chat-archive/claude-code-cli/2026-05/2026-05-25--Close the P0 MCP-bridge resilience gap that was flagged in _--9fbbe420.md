---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Close the P0 MCP-bridge resilience gap that was flagged in `H:/prism/knowledge/m"
date: "2026-05-25"
first_ts: "2026-05-25T02:50:10.283Z"
last_ts: "2026-05-25T02:50:13.921Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-aa3b1701922837170.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Close the P0 MCP-bridge resilience gap that was flagged in `H:/prism/knowledge/m

> **claude-code-cli** | 2026-05-25 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-aa3b1701922837170.jsonl`

## Transcript

### User | 2026-05-25T02:50:10.283Z

Close the P0 MCP-bridge resilience gap that was flagged in `H:/prism/knowledge/memories/reference/reference_mcp_server_3100_crash_fix_2026_05_22.md` but never built. Without this fix, chats permanently drop the `prism` MCP for their whole session whenever they try to initialize during the ~30s window when :3100 is restarting/cold-starting.

EXACT PROBLEM (from the memo):
> Bridge resilience — install-mcp-server-task.ps1's own header claims "the bridge's in-process retry + health-gate close the transient half" but mcp-http-bridge.mjs has **no retry and no health-gate**. During the server's ~30s cold start, a chat's `initialize` forwarded to a not-yet-ready :3100 still gets a hard error → that chat drops `prism` for its whole session. A retry-with-backoff in `mcp-http-bridge.mjs` `forwardToHttp` would close this.

STEP 1 — Read the bridge source (required, ≤3 tool calls):

1. Read `H:/prism/.claude/helpers/mcp-http-bridge.mjs` IN FULL to understand the current shape.
2. Identify the `forwardToHttp` function (or equivalent — the function that POSTs JSON-RPC to http://127.0.0.1:3100/mcp).

STEP 2 — Edit ONE file (use Edit, not Write — preserve all other logic):

**File**: `H:/prism/.claude/helpers/mcp-http-bridge.mjs`

Add retry-with-exponential-backoff to the HTTP forward path. Requirements:

1. **Pre-flight health gate**: before the FIRST forward attempt, probe `http://127.0.0.1:3100/health` once with a 2s timeout. If it returns 200/204, proceed immediately. If it doesn't, enter the retry loop.

2. **Retry-with-backoff**:
   - max 12 attempts (covers ~60s of cold start)
   - backoff: 500ms, 750ms, 1125ms, 1687ms, 2531ms... (1.5× multiplier, capped at 5000ms)
   - retry on: ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ECONNRESET, HTTP 5xx
   - do NOT retry on: HTTP 4xx (client error), HTTP 200 (success obviously), parse errors

3. **Knobs** (env-configurable, with sensible defaults):
   - `PRISM_MCP_BRIDGE_RETRY_MAX_ATTEMPTS` (default 12)
   - `PRISM_MCP_BRIDGE_RETRY_BASE_MS` (
... [+2127 chars truncated]

### Assistant | 2026-05-25T02:50:13.921Z

You've hit your session limit · resets 1am (America/Chicago)
