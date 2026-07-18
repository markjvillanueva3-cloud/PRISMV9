---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "Read H:/prism/scripts/mcp-server-watchdog.mjs fully. Map the preemptive-restart "
date: "2026-06-09"
first_ts: "2026-06-09T16:17:05.814Z"
last_ts: "2026-06-09T16:18:12.584Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a3a4c27b77673a69a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Read H:/prism/scripts/mcp-server-watchdog.mjs fully. Map the preemptive-restart 

> **claude-code-cli** | 2026-06-09 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_55c35507-b60/agent-a3a4c27b77673a69a.jsonl`

## Transcript

### User | 2026-06-09T16:17:05.814Z

Read H:/prism/scripts/mcp-server-watchdog.mjs fully. Map the preemptive-restart logic (RSS_THRESHOLD_MB check ~line 251, cooldown, decision path) and specify EXACTLY how to make it INFLIGHT-AWARE: defer the RSS-pressure restart while the server has high in-flight request count, so it never restarts mid-burst and kills parallel-agent calls. It reads /health.memory.rss_mb today. Return: (1) restart-decision code location (file:line), (2) the exact gating change (defer if inflight > threshold, with a hard-ceiling override so a wedged high-inflight server still restarts), (3) the /health field it must read.

### Assistant | 2026-06-09T16:17:13.669Z

I'll read the watchdog file fully to map the restart logic and specify the inflight-aware change.

### Assistant | 2026-06-09T16:17:13.872Z

[tool_use: Read]

### User | 2026-06-09T16:17:22.011Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+16993 chars truncated]

### Assistant | 2026-06-09T16:18:12.584Z

I've read the full file. Here is the complete map and the exact inflight-aware gating spec.

## (1) Restart-decision code location

The preemptive RSS-pressure restart decision lives in **`H:/prism/scripts/mcp-server-watchdog.mjs:255`** — the single `if` guard inside `main()`'s healthy branch:

```js
// line 252-271
const rssMB = probe.rssMB;
const sinceLastPreempt = Date.now() - (state.lastPreemptiveRestartAt || 0);
const uptimeOk = (probe.uptimeSec ?? 0) >= 60;
if (RSS_THRESHOLD_MB > 0 && typeof rssMB === "number" && rssMB >= RSS_THRESHOLD_MB && sinceLastPreempt >= PREEMPT_COOLDOWN_MS && uptimeOk) {
  log("warn", "Memory pressure — preemptive restart", { ... });
  const preemptState = { ...state, consecutiveFails: FAIL_THRESHOLD, lastFailReason: `rss_pressure_${rssMB}MB` };
  escalate(preemptState);                       // line 267 — the kill+respawn
  state.lastPreemptiveRestartAt = Date.now();
  state.consecutiveFails = 0;
}
```

`escalate()` (line 190) is the destructive path: `findListenerPid(:3100)` → `taskkill /F /PID` → respawn supervisor. A restart == fleet disconnect, so this is exactly the burst-killer to gate.

Note this is the ONLY decision to change. The **wedge** escalation (line 286-340) must NOT be gated by inflight — a wedged server reporting high inflight is the failure mode, and the existing boot-guard already protects that path. Inflight gating applies to the RSS-pressure path only, because that is the path that fires while the server is healthy and actively serving.

## (2) The exact gating change

Threshold values (env-overridable, following the file's existing `parseInt` convention; place near line 73-74):

```js
// INFLIGHT-AWARE PREEMPT (defer RSS restart mid-burst):
// Defer the orderly RSS recycle while the server is actively serving a burst of
// parallel-agent calls, so a restart never severs in-flight requests. A hard
// ceiling overrides the defer so a server WEDGED with stuck high-inflight (counter
// never drains) still recycles i
... [+7242 chars truncated]
