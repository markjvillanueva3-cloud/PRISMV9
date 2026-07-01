---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are reviewer C of three independent Claude PRISM reviewers — analyst pass on"
date: "2026-06-09"
first_ts: "2026-06-09T17:36:42.444Z"
last_ts: "2026-06-09T17:40:05.199Z"
cwd: "H:\\prism"
messages: 28
user_msgs: 10
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a64229abd76625659.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are reviewer C of three independent Claude PRISM reviewers — analyst pass on

> **claude-code-cli** | 2026-06-09 | 28 msgs (10 user / 18 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/agent-a64229abd76625659.jsonl`

## Transcript

### User | 2026-06-09T17:36:42.444Z

You are reviewer C of three independent Claude PRISM reviewers — analyst pass on the COMPLETE change of U-MCP-CONCURRENCY-HARDEN at H:/prism (branch cad-fusion-live-ms0), two commits ed94bc47~1..HEAD. This touches the live MCP server :3100 all 26 fleet chats depend on, plus its watchdog. A prior gate FAILED on a queued-disconnect slot leak (which you-class analysis caught); a fix extracted `acquireRequestSlot`. Verify the fix closes it WITHOUT introducing new silent breakage or regression, and re-check the watchdog/health changes still hold.

Read yourself:
- `git -C H:/prism diff ed94bc47~1..HEAD`
- H:/prism/mcp-server/src/index.ts — trace EVERY exit path of the /mcp POST handler now (shed/abandoned/proceed/buildRequestServer-throw/normal). Confirm each path: (a) fires decInflight exactly once, (b) releases the semaphore slot exactly once or holds none, (c) never sends two responses, (d) never double-closes transport/server.
- H:/prism/mcp-server/src/mcp/request-semaphore.ts — acquireRequestSlot + RequestSemaphore.
- H:/prism/scripts/mcp-server-watchdog.mjs — the RSS-pressure/defer branch and probeHealth (unchanged in the fix commit, but confirm still correct end-to-end with /health concurrency).

Probe for SILENT BREAKAGE / REGRESSION introduced by the fix:
- Could the "abandoned" early-return ever fire on a HEALTHY open connection (false abandon), dropping a live request? Reason about res.closed semantics and the closedWhileWaiting flag timing.
- Could the new pre-acquire 'close' observer + the helper's release listener + the handler's decInflight close listener + the transport-close listener exceed EventEmitter max-listeners (warning noise) or interact badly?
- Does the fix change the steady-state (non-burst) hot path cost meaningfully (an extra listener + a flag per request)? Acceptable, but confirm no per-request allocation surprise.
- Re-confirm the earlier accepted findings still hold: 503 defaults (64+512) won't shed at the 300-400 peak; watchdog defers cor
... [+399 chars truncated]

### Assistant | 2026-06-09T17:36:51.419Z

I'll analyze the U-MCP-CONCURRENCY-HARDEN change exhaustively. Let me read the diff and the three target files.

### Assistant | 2026-06-09T17:36:52.461Z

[tool_use: Bash]

### User | 2026-06-09T17:37:00.966Z

[tool_result]  .../__tests__/mcp-route-suggest-rtk-guard.test.mjs |  46 ++++
 .claude/hooks/mcp-route-suggest.mjs                |  17 +-
 mcp-server/src/__tests__/request-semaphore.test.ts | 232 +++++++++++++++++++++
 mcp-server/src/__tests__/spindlePowerClamp.test.ts | 139 ++++++++++++
 .../engines/SpeedFeedNineAxisOrchestratorEngine.ts |  46 ++++
 mcp-server/src/index.ts                            |  60 ++++
... [+391 chars truncated]

### Assistant | 2026-06-09T17:37:08.613Z

Let me read the three target files and the diff for the relevant pieces.

### Assistant | 2026-06-09T17:37:09.111Z

[tool_use: Read]

### Assistant | 2026-06-09T17:37:09.437Z

[tool_use: Read]

### User | 2026-06-09T17:37:13.912Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\mcp\request-semaphore.ts' was already read 20s ago in this session and is unchanged (mtime 1781026314524). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-09T17:37:13.933Z

[tool_result] read-once-guard: 'H:\prism\scripts\mcp-server-watchdog.mjs' was already read 15m ago in this session and is unchanged (mtime 1781025076864). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-09T17:37:19.384Z

The read-once guard is reporting these as already read, but they're not in my actual context (this is a fresh review session). Let me disable the cache and read them.

### Assistant | 2026-06-09T17:37:20.589Z

[tool_use: Bash]

### User | 2026-06-09T17:37:38.355Z

[tool_result]      1	/**
     2	 * RequestSemaphore -- bounded-concurrency + bounded-queue gate for the /mcp
     3	 * choke point (MCP-CONCURRENCY-HARDEN, slot golf 2026-06-09).
     4	 *
     5	 * Each concurrent /mcp POST builds a FRESH McpServer via buildRequestServer()
     6	 * (MCP-CONCURRENCY-FIX 2026-05-31) that binds the full dispatcher graph. Under a
     7	 * parallel-agent burst (26 slots x ultraco
... [+6868 chars truncated]

### Assistant | 2026-06-09T17:37:45.120Z

Now the index.ts handler changes and the watchdog.

### Assistant | 2026-06-09T17:37:47.209Z

[tool_use: Bash]

### User | 2026-06-09T17:37:55.032Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
diff --git a/mcp-server/src/index.ts b/mcp-server/src/index.ts
index 1ef8dd5e2f..98417176e5 100644
--- a/mcp-server/src/index.ts
+++ b/mcp-server/src/index.ts
@@ -50,6 +50,8 @@ import { registerToolpathDispatcher } from "./tools/dispatchers/toolpathDispatch
 import { registerCalcDispatcher } from "./tools/dispatchers/calcD
... [+4504 chars truncated]

### Assistant | 2026-06-09T17:38:02.902Z

Now let me see the full /mcp POST handler in current HEAD to trace all exit paths, plus the surrounding context (inflight increment, transport setup, server connect/close).

### Assistant | 2026-06-09T17:38:04.165Z

[tool_use: Bash]

### User | 2026-06-09T17:38:12.001Z

[tool_result]         _grab(c);
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
        if (_isCall && _blen > 0 && _blen < _CAP) {
          const p = JSON.parse(Buffer.concat(_chunks).toString("utf8"));
          if (p && (p.erro
... [+5088 chars truncated]

### Assistant | 2026-06-09T17:38:17.311Z

Now let me see the inflight increment point above (where `_isCall` and `metrics.incInflight` happen) and confirm `decInflight` pairing with `incInflight`.

### Assistant | 2026-06-09T17:38:18.961Z

[tool_use: Bash]

### User | 2026-06-09T17:38:35.450Z

[tool_result]   // .well-known/mcp.json — MCP Registry Discovery (RFC 9110 §4.1)
  app.get("/.well-known/mcp.json", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const discovery = buildMcpDiscoveryDocument(baseUrl);
    const authConfig = getAuthConfig();

    if (!authConfig.enabled) {
      delete discovery.authentication;
    }

    res.json(discovery);
  });

  // MCP Strea
... [+1627 chars truncated]

### Assistant | 2026-06-09T17:39:08.737Z

Now I have the full picture of the handler. `metrics.incInflight()` fires once at the top (line ~1170), `res.on("close", () => metrics.decInflight())` is registered before the slot acquisition. Let me verify the metrics inflight implementation to confirm incInflight/decInflight are symmetric and decInflight can't double-decrement.

### Assistant | 2026-06-09T17:39:08.739Z

[tool_use: Bash]

### User | 2026-06-09T17:39:23.668Z

[tool_result] 41:  inflight: number;
42:  peakInflight: number;
54:  inflight = 0;
55:  peakInflight = 0;
59:  incInflight(): void {
60:    this.inflight++;
61:    if (this.inflight > this.peakInflight) this.peakInflight = this.inflight;
64:  decInflight(): void {
65:    if (this.inflight > 0) this.inflight--;
152:      inflight: this.inflight,
153:      peakInflight: this.peakInflight,
178:        "# HELP pris
... [+565 chars truncated]

### Assistant | 2026-06-09T17:39:29.821Z

`decInflight` is guarded (`if (this.inflight > 0)`), so it can never go negative even if `res.on("close")` fired twice. `incInflight` is once per request. Good.

Now the critical concern: the `res.on("close", () => metrics.decInflight())` is registered ONCE per request and `'close'` fires at most once per response in Node — so decInflight is once. Let me now examine the watchdog changes (the RSS-pressure/defer branch and probeHealth).

### Assistant | 2026-06-09T17:39:31.314Z

[tool_use: Bash]

### User | 2026-06-09T17:39:55.310Z

[tool_result] diff --git a/scripts/mcp-server-watchdog.mjs b/scripts/mcp-server-watchdog.mjs
index 100fc3960b..13914038fd 100644
--- a/scripts/mcp-server-watchdog.mjs
+++ b/scripts/mcp-server-watchdog.mjs
@@ -72,6 +72,19 @@ const DRY_RUN = process.env.PRISM_MCP_WATCHDOG_DRY_RUN === "1" || process.argv.i
 // fires under genuine pressure. Env-overridable; =0 disables.
 const RSS_THRESHOLD_MB = parseInt(process.en
... [+6405 chars truncated]

### Assistant | 2026-06-09T17:40:05.199Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
