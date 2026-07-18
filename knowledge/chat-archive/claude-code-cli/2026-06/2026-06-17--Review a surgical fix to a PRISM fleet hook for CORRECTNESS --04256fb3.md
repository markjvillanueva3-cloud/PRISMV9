---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Review a surgical fix to a PRISM fleet hook for CORRECTNESS and SAFETY (silent-b"
date: "2026-06-17"
first_ts: "2026-06-17T04:09:05.021Z"
last_ts: "2026-06-17T04:10:19.804Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-aeae060be7d110e2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Review a surgical fix to a PRISM fleet hook for CORRECTNESS and SAFETY (silent-b

> **claude-code-cli** | 2026-06-17 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-aeae060be7d110e2a.jsonl`

## Transcript

### User | 2026-06-17T04:09:05.021Z

Review a surgical fix to a PRISM fleet hook for CORRECTNESS and SAFETY (silent-breakage / regression focus). Read these two files end-to-end:
- H:/prism/.claude/hooks/mcp-connectivity-check.mjs
- H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs

CONTEXT: This is a UserPromptSubmit hook that runs every turn for all 26 chats. It probes the MCP server :3100 /health; on server-UP it (1) checks a per-chat liveness sentinel, then (2) USED to fall back to a fleet-wide `countBridges()===0` -> `buildDegradedBanner()` "MCP BRIDGE DOWN" banner. Empirical evidence (617-session study): that fleet-0 banner fired ~196 times in just 8 transcripts while the server served 32 concurrent initializes with 0 errors and only 4 REAL terminal bridge deaths exist across the entire log history — because bridges are TRANSIENT (1486 spawn/exit cycles; 0-live-bridges is the normal idle resting state). 

THE FIX (U-MCP-FALSEPOS-SUPPRESS, slot golf 2026-06-17): in the server-UP branch, the fleet-0 `buildDegradedBanner` call is now gated behind an off-by-default knob `PRISM_MCP_FLEET0_BANNER=1` (suppressed by default; legacy path preserved/restorable). Also DEFAULT_TIMEOUT_MS bumped 1000->3000 (a 1s probe timeout false-flags a slow-but-healthy server as DISCONNECTED).

VERIFY specifically (cite file:line):
1. Does the fix PRESERVE both REAL disconnect-detection paths? (a) the per-chat sentinel `buildClientDisconnectBanner` on confident pid-dead/stale-heartbeat — must still fire when THIS chat's bridge is dead; (b) the server-DOWN branch (result.ok===false) must still fire the DISCONNECTED banner + auto-reconnect.
2. Is there ANY scenario where suppressing the fleet-0 banner now HIDES a genuine disconnect that neither the sentinel nor the server-down probe would catch? (e.g. a sentinel-less / shared-tree chat whose bridge truly died while the server is up). Assess whether that's an acceptable trade (the chat's next prism call respawns its bridge with a 60s init-retry budget) or a real gap.
3. 
... [+617 chars truncated]

### Assistant | 2026-06-17T04:09:07.532Z

I'll review this fix end-to-end. Let me read both files.

### Assistant | 2026-06-17T04:09:08.499Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:08.561Z

[tool_use: Read]

### User | 2026-06-17T04:09:09.457Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+19103 chars truncated]

### User | 2026-06-17T04:09:09.810Z

[tool_result] 1	// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
2	// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  getConfig,
8	  loadState,
9	  saveState,
10	  shouldProbe,
11	  buildBanner,
12	  runCheck,
13	  countBridges,
14	  buildDegradedBanner,
15	  buil
... [+18592 chars truncated]

### Assistant | 2026-06-17T04:09:14.046Z

I have both files read end-to-end. Let me trace the dependencies the fix relies on to verify my findings — specifically the sentinel liveness module (the claim that the per-chat sentinel still fires when THIS chat's bridge is dead is load-bearing for the trade-off in question 2).

### Assistant | 2026-06-17T04:09:14.989Z

[tool_use: Read]

### Assistant | 2026-06-17T04:09:15.029Z

[tool_use: Read]

### User | 2026-06-17T04:09:16.018Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: lib
3	/**
4	 * mcp-bridge-liveness.mjs -- per-chat MCP bridge liveness sentinel + reader.
5	 *
6	 * THE GAP THIS CLOSES (MCP-CLIENT-ENFORCE-MS0, 2026-06-13, slot tango):
7	 *   The fleet already keeps the SHARED daemon (:3100) alive (supervisor +
8	 *   watchdog + connectivity-monitor scheduled tasks) and mcp-connectivity-
9	 *   check.mjs probes that daemon every 
... [+17047 chars truncated]

### User | 2026-06-17T04:09:16.864Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+21179 chars truncated]

### Assistant | 2026-06-17T04:09:23.056Z

I now have the full dependency picture. Let me verify two remaining adversarial concerns: (1) the test suite actually passes as-is, and (2) whether the per-chat sentinel is actually WIRED into live bridges (the trade-off in Q2 hinges on the sentinel being a real, populated signal — not just exported code).

### Assistant | 2026-06-17T04:09:24.142Z

[tool_use: Bash]

### Assistant | 2026-06-17T04:09:25.449Z

[tool_use: Grep]

### User | 2026-06-17T04:09:29.579Z

[tool_result]   ...
# Subtest: runCheck: per-chat sentinel disconnect takes PRECEDENCE over a healthy fleet count
ok 34 - runCheck: per-chat sentinel disconnect takes PRECEDENCE over a healthy fleet count
  ---
  duration_ms: 0.1262
  ...
# Subtest: runCheck: PRISM_MCP_CLIENT_CHECK_DISABLE=1 skips sentinel, still does countBridges
ok 35 - runCheck: PRISM_MCP_CLIENT_CHECK_DISABLE=1 skips sentinel, still does cou
... [+492 chars truncated]

### User | 2026-06-17T04:09:31.071Z

[tool_result] .claude\helpers\mcp-http-bridge.mjs:50:  writeSentinel,
.claude\helpers\mcp-http-bridge.mjs:51:  heartbeatSentinel,
.claude\helpers\mcp-http-bridge.mjs:53:} from "../../scripts/lib/mcp-bridge-liveness.mjs";
.claude\helpers\mcp-http-bridge.mjs:535:      writeSentinel(liveSlot, { pid: process.pid, cwd: process.cwd(), mcpUrl: MCP_HTTP_URL });
.claude\helpers\mcp-http-bridge.mjs:538:        try { hear
... [+74 chars truncated]

### Assistant | 2026-06-17T04:09:35.230Z

The sentinel is genuinely wired into the live bridge. Let me confirm the heartbeat cadence (the claim is "20s heartbeats / 90s stale" — if the heartbeat interval is wrong relative to staleMs, the sentinel could false-flag a healthy bridge, which would be a NEW false positive introduced as a side effect of relying on it more).

### Assistant | 2026-06-17T04:09:35.743Z

[tool_use: Read]

### User | 2026-06-17T04:09:36.648Z

[tool_result] 525	    toolDomains: TOOL_DOMAINS || "(none/all - fail-open)",
526	  });
527	
528	  // MCP-CLIENT-ENFORCE-MS0 (2026-06-13, slot tango): publish a per-slot liveness
529	  // sentinel + heartbeat so mcp-connectivity-check.mjs can answer the question the
530	  // daemon /health probe cannot -- "is THIS chat's bridge alive?". The whole block
531	  // is best-effort: any sentinel error is swallowed and
... [+1160 chars truncated]

### Assistant | 2026-06-17T04:09:39.879Z

[tool_use: Grep]

### User | 2026-06-17T04:09:41.613Z

[tool_result] 65:const SENTINEL_HEARTBEAT_MS = parseInt(process.env.PRISM_MCP_BRIDGE_HEARTBEAT_MS || "20000", 10);

### Assistant | 2026-06-17T04:10:19.804Z

All verification complete. Heartbeat is 20s vs a 90s stale threshold (4+ missed beats) — the sentinel will not false-flag a live bridge, and `unref()` means the heartbeat does not keep a zombie process alive (a SIGKILL leaves a stale sentinel that the reader correctly classifies as pid-dead/stale). My findings are fully verified.

---

VERDICT: PASS

summary: The fix correctly gates ONLY the fleet-wide `bridges===0` banner (proven false-positive: 196 fires in 8 transcripts vs 4 real deaths) behind the off-by-default `PRISM_MCP_FLEET0_BANNER=1` knob. Both genuine disconnect-detection paths are fully preserved and verified live — the per-chat sentinel (`buildClientDisconnectBanner`) still fires first on confident pid-dead/stale-heartbeat, and the server-DOWN branch (`result.ok===false`) still fires the DISCONNECTED banner + auto-reconnect. The one residual gap (a sentinel-less / shared-tree chat whose bridge truly dies on a healthy server) is real but acceptably mitigated, and the suppressed banner was never actionable for it anyway.

findings:
  - [INFO] `mcp-connectivity-check.mjs:285-293` -- Path 1 (per-chat sentinel) PRESERVED and verified. It runs BEFORE the gated fleet-0 block, is unaffected by the new knob, and `isConfidentlyDisconnected` (`mcp-bridge-liveness.mjs:205-207`) fires on `pid-dead`/`stale-heartbeat` -> `buildClientDisconnectBanner`. The sentinel is genuinely wired into the live bridge (`mcp-http-bridge.mjs:535,537-539`, 20s heartbeat vs 90s stale -> no false-flag of a healthy bridge), so this is a real populated signal, not dead exported code. Tests 31/34 (`runCheck: ...THIS chat's bridge dead`, `...takes PRECEDENCE over a healthy fleet count`) verify it fires even with `bridges:5/9`.
  - [INFO] `mcp-connectivity-check.mjs:270-275` -- Path 2 (server-DOWN) PRESERVED. The `result.ok === false` branch is wholly outside the `else if (result.ok === true)` block the fix lives in, so suppression cannot touch it; DISCONNECTED banner + `maybeReconnect` both 
... [+4263 chars truncated]
