---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "You are investigating PRISM's MCP bridge connection-loss problem (read-only; do "
date: "2026-06-16"
first_ts: "2026-06-16T18:51:12.950Z"
last_ts: "2026-06-16T19:10:16.790Z"
cwd: "H:\\prism"
messages: 92
user_msgs: 43
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a4096549f90764834.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# You are investigating PRISM's MCP bridge connection-loss problem (read-only; do 

> **claude-code-cli** | 2026-06-16 | 92 msgs (43 user / 49 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a4096549f90764834.jsonl`

## Transcript

### User | 2026-06-16T18:51:12.950Z

You are investigating PRISM's MCP bridge connection-loss problem (read-only; do NOT edit). The operator reports: "chats still losing connection and enforcements in place for chats to check to see if they're connected don't work." Right now a SessionStart hook reported: "WARN MCP BRIDGE DOWN -- the prism server (:3100) is UP but 0 bridge processes are running. Every chat's prism MCP is disconnected. ACTION: run /mcp to reconnect prism (a hook cannot respawn the harness bridge)."

Your job: MAP THE TERRITORY with exact file:line citations. Do NOT fabricate — read the actual files. Find and report:

1. The MCP bridge detection hook/script. Golf recently shipped something like `U-MCP-BRIDGE-DETECT`. Search: `git -C H:/prism log --oneline -20 --all | grep -i bridge`, and Glob/Grep for `mcp-bridge-detect`, `bridge process`, `:3100`, `bridge.*down` under H:/prism/.claude/hooks/ and H:/prism/scripts/. Report the file paths and how detection works (what it checks to decide "bridge down").

2. The actual technical constraint: WHY can a hook detect the down state but not fix it? Read the detection hook's code and any comments. Quote the "a hook cannot respawn the harness bridge" reasoning. What spawns the MCP bridge process? Look at H:/.claude/settings.json and H:/prism/.claude/settings.json `mcpServers` / `mcp` config — find the `prism` server entry and the `prism_safe` entry. Report their launch commands.

3. What "reconnect" actually requires. Is there a `/mcp` slash command behavior? Any existing reconnect script? Search for `reconnect`, `respawn`, `restart.*bridge`, `/mcp` references in hooks/scripts/commands.

4. What signals are available to a hook at runtime to KNOW a chat is disconnected and to NUDGE the model to act (since the model CAN run /mcp but a hook cannot). E.g., does the bridge-detect hook fire on UserPromptSubmit / SessionStart / PreToolUse? What's its current wiring in settings.json (grep the settings files for the hook filename)?

5. Any prior memory/wiki
... [+500 chars truncated]

### Assistant | 2026-06-16T18:51:31.158Z

I'll investigate this systematically. Let me search in parallel across all the relevant locations.

### Assistant | 2026-06-16T18:51:32.376Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:51:32.995Z

[tool_use: Glob]

### Assistant | 2026-06-16T18:51:33.107Z

[tool_use: Glob]

### User | 2026-06-16T18:52:11.106Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
bd4c358a3f [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-A1-LIVE-VERIFY (slot:zulu): LIVE-verify Bridge A against the real He...
---
[rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings

### User | 2026-06-16T18:52:39.903Z

[tool_result] .claude\hooks\cog-bridge-ai-memory-capture.mjs
.claude\hooks\.deprecated\awareness-2026-05-13\cog-bridge-awareness-rebuild.mjs
.claude\hooks\cog-bridge-context-auto-compact.mjs
.claude\hooks\lib\local-llm-bridge.mjs
.claude\hooks\lib\nim-embed-bridge.mjs
.claude\hooks\lib\vllm-hook-bridge.mjs
.claude\hooks\mcp-safety-bridge.mjs
.claude\hooks\__tests__\mcp-safety-bridge.test.mjs
.claude\hooks\cog-b
... [+1298 chars truncated]

### User | 2026-06-16T18:52:40.266Z

[tool_result] scripts\fusion360-prism-addin\prism_bridge.py
scripts\index\build-command-bridge.mjs
scripts\system-viz-obsidian-bridge.mjs
scripts\golf-watchdog-wiring-bridge.mjs
scripts\__tests__\golf-watchdog-wiring-bridge.test.mjs
scripts\generate-hook-bridges.mjs
scripts\generate-layer-bridges.mjs
scripts\lib\ollama-bridge-telemetry.mjs
scripts\lib\ollama-bridge-telemetry.test.mjs
scripts\__tests__\ollama-pr
... [+2649 chars truncated]

### Assistant | 2026-06-16T18:52:43.061Z

Found `scripts/lib/mcp-bridge-liveness.mjs`. Now let me read the key files in parallel.

### Assistant | 2026-06-16T18:52:43.456Z

[tool_use: Read]

### Assistant | 2026-06-16T18:52:43.839Z

[tool_use: Read]

### Assistant | 2026-06-16T18:52:45.927Z

[tool_use: Bash]

### User | 2026-06-16T18:53:02.187Z

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

### User | 2026-06-16T18:53:05.712Z

[tool_result] 1	// mcp-bridge-liveness.test.mjs -- pure-core tests with injected fs + clock + pid probe.
2	// Run: node --test H:/prism/scripts/lib/mcp-bridge-liveness.test.mjs
3	
4	import { test } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  DEFAULT_STALE_MS,
8	  getLiveDir,
9	  getStaleMs,
10	  resolveSlotName,
11	  sentinelPath,
12	  buildSentinelRecord,
13	  defaultIsPidAlive,
... [+14490 chars truncated]

### User | 2026-06-16T18:53:25.374Z

[tool_result] .claude/hooks/error-fix-vault-bridge.mjs
.claude/hooks/mcp-broadcast-reconnect-inject.mjs
.claude/hooks/mcp-connectivity-check.mjs
.claude/hooks/mcp-connectivity-check.test.mjs
.claude/hooks/route-savings-session-start-inject.mjs
.claude/hooks/slot-context-bundle-inject.mjs
.claude/hooks/system-viz-live-bridge.mjs
---
.claude/hooks/claudemd-ollama-enforcer.mjs
.claude/hooks/docker-service-health-s
... [+645 chars truncated]

### Assistant | 2026-06-16T18:53:43.468Z

Now let me read the two key hooks and the settings files in parallel.
[tool_use: Read]
[tool_use: Read]
[tool_use: Bash]

### User | 2026-06-16T18:54:02.407Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+17128 chars truncated]

### User | 2026-06-16T18:54:02.555Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-broadcast-reconnect-inject.mjs — UserPromptSubmit hook.
4	 * Surfaces a "/mcp reconnect" nudge when a fleet-wide MCP reconnect signal
5	 * is newer than this chat's last-seen timestamp. Tracks per-chat "seen"
6	 * state in .claude/cache/mcp-broadcast-seen-<chatId>.ts.
7	 *
8	 * Knobs:
9	 *   PRISM_MCP_BROADCAST_INJECT_DISABLE=1   disable
10	 *   PRISM_MCP_BROAD
... [+3940 chars truncated]

### User | 2026-06-16T18:54:21.629Z

[tool_result]           {
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
            "timeout": 2000
          },
          {
            "type": "command",
            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/node-capability-inject.mjs",
--
          {
            "type": "command",
         
... [+314 chars truncated]

### Assistant | 2026-06-16T18:54:27.041Z

Now let me get the MCP server entries from settings.json, the reconnect action module, and the SessionStart hook where the warning fires:

### Assistant | 2026-06-16T18:54:28.879Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:54:29.475Z

[tool_use: Read]

### Assistant | 2026-06-16T18:54:32.854Z

[tool_use: Bash]

### User | 2026-06-16T18:54:51.768Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+21179 chars truncated]

### User | 2026-06-16T18:55:37.167Z

[tool_result] (Bash completed with no output)

### User | 2026-06-16T18:55:44.094Z

[tool_result] .claude/hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/awareness-snapshot.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/multi-computer-awareness.mjs
.claude/hooks/.deprecated/awareness-2026-05-13/prism-awareness-v2.mjs
.claude/hooks/agent-registry-load.mjs
.claude/hooks/agent-worktree-stale-unlock.mjs
.claude/hooks/ai-command-awa
... [+1631 chars truncated]

### Assistant | 2026-06-16T18:55:49.918Z

Now let me get the full settings.json MCP entries and the SessionStart hook that emits the warning message, plus the bridge process itself:

### Assistant | 2026-06-16T18:55:52.995Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:55:53.373Z

[tool_use: Glob]

### Assistant | 2026-06-16T18:55:56.111Z

[tool_use: Bash]

### User | 2026-06-16T18:56:25.980Z

[tool_result] {}

### User | 2026-06-16T18:56:54.165Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-16T18:57:06.354Z

[tool_result] .claude/hooks/mcp-connectivity-check.mjs:45:// countBridges (below) is FLEET-WIDE (detects a total outage: 0 bridges anywhere);
.claude/hooks/mcp-connectivity-check.mjs:48:// countBridges is the fallback for sentinel-less (pre-upgrade) bridges.
.claude/hooks/mcp-connectivity-check.mjs:62:// Bridge-layer health (U-MCP-BRIDGE-DETECT, slot golf 2026-06-12). The probe tests the SERVER
.claude/hooks/mc
... [+2539 chars truncated]

### Assistant | 2026-06-16T18:57:09.918Z

Let me get the MCP settings entries directly, find the bridge process script, and check what the SessionStart warning fires from:

### Assistant | 2026-06-16T18:57:11.343Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:57:12.989Z

[tool_use: Bash]

### Assistant | 2026-06-16T18:57:13.961Z

[tool_use: Bash]

### User | 2026-06-16T18:59:22.043Z

[tool_result] MCP SERVERS: {}

### User | 2026-06-16T18:59:31.459Z

[tool_result] agent-coordination-daemon.mjs
cog-bridge-drain.mjs
daemon-manager.sh
install-index-daemon-task.ps1
install-mcp-monitor-task.ps1
install-mcp-priority-guardian-task.ps1
install-mcp-server-task.ps1
install-mcp-server-watchdog-task.ps1
install-slot-bridge-tasks.ps1
mcp-action-router.mjs
mcp-health-recovery.mjs
mcp-http-bridge.mjs
mcp-posttool-tracker.mjs
mcp-pretool-injector.mjs
mcp-server-daemon.mjs

... [+1848 chars truncated]

### User | 2026-06-16T18:59:31.508Z

[tool_result] 255:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ai-command-awareness.mjs",
1620:            "command": "\"H:/.claude/bin/portable-node\" -e \"/* TIER3e 2026-05-10: mcp-posttool-tracker moved from (none) matcher to mcp__prism__.* matcher. Source preserved at H:/prism/.claude/helpers/mcp-posttool-tracker.mjs. The (none) copy fired on EVERY tool call but the hook o
... [+2042 chars truncated]

### system

... [12 middle messages omitted -- see raw_file] ...

### User | 2026-06-16T19:00:20.480Z

[tool_result] 114:    "prism",
---

### User | 2026-06-16T19:00:21.754Z

[tool_result] docker-intel-autostart.mjs
ensure-index-daemon-guardian.mjs
mcp-daemon-autostart.mjs
nim-autostart.mjs
obsidian-learning-revival-sessionstart.mjs
obsidian-learning-revival-sessionstart.test.mjs
ollama-autostart.mjs
prism-http-autostart.mjs
route-savings-session-start-inject.mjs
session-start-auto-resume.mjs
session-start-cag-hitrate-headline.mjs
session-start-cag-hitrate-headline.test.mjs
session-
... [+765 chars truncated]

### Assistant | 2026-06-16T19:00:24.468Z

[tool_use: Read]

### User | 2026-06-16T19:00:25.435Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * mcp-daemon-autostart.mjs — SessionStart Hook
5	 *
6	 * Auto-starts the shared MCP HTTP daemon on session start.
7	 * This ensures all Claude chats share a single MCP server instance
8	 * instead of each spawning their own stdio process.
9	 *
10	 * @hook SessionStart
11	 */
12	
13	import { spawn } from "child_process";
14	import http from "http";
15	
1
... [+2336 chars truncated]

### Assistant | 2026-06-16T19:00:26.016Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:00:27.675Z

[tool_use: Bash]

### User | 2026-06-16T19:00:30.998Z

[tool_result] 704:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop_on_unsafe_gcode.mjs",

### User | 2026-06-16T19:00:46.850Z

[tool_result] ---

### Assistant | 2026-06-16T19:00:55.152Z

Let me get the remaining pieces: prism_safe config, the SessionStart warning source, and the mcp-connectivity-check wiring line numbers:

### Assistant | 2026-06-16T19:00:55.153Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:00:55.518Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:00:57.738Z

[tool_use: Bash]

### User | 2026-06-16T19:01:07.885Z

[tool_result] ALL MCP SERVER KEYS: []

### User | 2026-06-16T19:01:18.472Z

[tool_result] H:/.claude/settings.json -- no mcpServers
H:/prism/.claude/settings.json -- no mcpServers
C:/Users/wompu/.claude/settings.json -- no mcpServers

### User | 2026-06-16T19:01:29.169Z

[tool_result] 114:    "prism",
---

### Assistant | 2026-06-16T19:01:34.181Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:01:36.381Z

[tool_use: Bash]

### User | 2026-06-16T19:01:36.503Z

[tool_result] 109:   "permissions": {
110:     "defaultMode": "bypassPermissions"
111:   },
112:   "model": "opus",
113:   "enabledMcpjsonServers": [
114:     "prism",
115:     "claude-flow"
116:   ],
117:   "skillOverrides": {
118:     "ollama-explain": "user-invocable-only",
119:     "ollama-summarize": "user-invocable-only",
120:     "ollama-docstring": "user-invocable-only",
121:     "ollama-classify": "use
... [+549 chars truncated]

### User | 2026-06-16T19:01:41.259Z

[tool_result] 4:     "PRISM_FLEET_REAPER_DISABLE": "0",
5:     "PRISM_GOLF_GUARDIAN_DISABLE": "0",
6:     "PRISM_GALAXY_MEMORY_OBSIDIAN_MIRROR": "1",
7:     "PRISM_OBSIDIAN_LIVE": "1",
10:     "PRISM_PYTHON_GPU_PATH": "H:/Tools/python-gpu/Scripts/python.exe",
11:     "PRISM_PYTHON_PATH": "H:/Tools/python/python.exe",
12:     "PRISM_EMBED_CONCURRENCY": "24",
13:     "PRISM_ROUTER_TABLE_ADVISE_DISABLE": "1",
14: 
... [+2479 chars truncated]

### Assistant | 2026-06-16T19:01:48.550Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:01:50.106Z

[tool_use: Bash]

### User | 2026-06-16T19:02:01.614Z

[tool_result] 113:   "enabledMcpjsonServers": [
1390:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
1570:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-broadcast-reconnect-inject.mjs",

### User | 2026-06-16T19:02:04.645Z

[tool_result] 113:   "enabledMcpjsonServers": [
1390:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
1570:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-broadcast-reconnect-inject.mjs",

### Assistant | 2026-06-16T19:02:12.920Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:02:15.231Z

[tool_use: Bash]

### User | 2026-06-16T19:03:58.053Z

[tool_result] 1383:           {
1384:             "type": "command",
1385:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/path-replay-advise.mjs",
1386:             "timeout": 3000
1387:           },
1388:           {
1389:             "type": "command",
1390:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
1391:      
... [+1402 chars truncated]

### User | 2026-06-16T19:04:58.849Z

[tool_result] 195:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/ollama-autostart.mjs",
194:             "type": "command",
196:             "timeout": 5000
---
200:             "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/nim-autostart.mjs",
199:             "type": "command",
201:             "timeout": 5000
---
205:             "command": "\"H:/.claude
... [+145 chars truncated]

### Assistant | 2026-06-16T19:05:05.005Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:05:05.611Z

[tool_use: Read]

### User | 2026-06-16T19:05:13.546Z

[tool_result] (Bash completed with no output)

### User | 2026-06-16T19:05:20.592Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	// sessionstart-bundle.mjs — single SessionStart hook for the context-injector /
4	// non-critical SessionStart hooks.
5	//
6	// Why: SessionStart had ~32 hooks, each a fresh node.exe at session start
7	// (≈3-5 s of cold-start fan-out before the session is usable). This bundle
8	// absorbs only the ~19 pure context-injectors / convenience hooks. The
9	// ~13 
... [+3933 chars truncated]

### Assistant | 2026-06-16T19:05:25.941Z

Now I have enough to write the complete report. Let me do one final check on where the SessionStart "WARN MCP BRIDGE DOWN" warning actually originates from, since the operator said it came from a SessionStart hook but the countBridges/buildDegradedBanner are in the UserPromptSubmit hook:

### Assistant | 2026-06-16T19:05:28.776Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:05:32.743Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:05:35.065Z

[tool_use: Bash]

### User | 2026-06-16T19:05:59.254Z

[tool_result] .claude/hooks/mcp-connectivity-check.mjs:45:// countBridges (below) is FLEET-WIDE (detects a total outage: 0 bridges anywhere);
.claude/hooks/mcp-connectivity-check.mjs:48:// countBridges is the fallback for sentinel-less (pre-upgrade) bridges.
.claude/hooks/mcp-connectivity-check.mjs:65:// chat's prism MCP disconnected (observed 2026-06-12: server up, 0 bridges; the operator had to
.claude/hooks/
... [+1221 chars truncated]

### User | 2026-06-16T19:06:23.860Z

[tool_result] 129 SECTION: "SessionStart": [
518 SECTION: "Stop": [
883 SECTION: "PreToolUse": [
1269 SECTION: "UserPromptSubmit": [
  1390: "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-connectivity-check.mjs",
  1570: "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/mcp-broadcast-reconnect-inject.m
1594 SECTION: "PostToolUse": [

### User | 2026-06-16T19:06:29.384Z

[tool_result] FOUND at path: hooks.UserPromptSubmit.0.hooks.23.command
FOUND at path: hooks.UserPromptSubmit.0.hooks.23.command

### User | 2026-06-16T19:08:41.256Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   Read-only territory mapping of PRISM's MCP bridge connection-loss problem. The operator reported chats losing connection and that "enforcements in place for chats to check to see if they're connected don't work." A SessionStart hook reportedly emitted: "WARN MCP BRIDGE DOWN -- the prism server (:3100) is UP but 0 bridge processes are running. Every chat's prism MCP is disconnected. ACTION: run /mcp to reconnect prism (a hook cannot respawn the harness bridge)."

   The operator asked for exact file:line citations covering:
   1. The MCP bridge detection hook/script (find U-MCP-BRIDGE-DETECT, how detection works)
   2. The technical constraint: WHY a hook detects but cannot fix
   3. What "reconnect" actually requires
   4. What runtime signals allow a hook to NUDGE the model to act
   5. Any prior memory/wiki on this topic

   Constraint: Read-only. Do NOT edit any files.

2. Key Technical Concepts:
   - MCP (Model Context Protocol): Claude Code connects to PRISM tools via MCP
   - stdio bridge architecture: Claude Code harness spawns `mcp-http-bridge.mjs` as a child stdio process per chat; the bridge forwards to a shared HTTP daemon at :3100
   - Shared HTTP daemon vs per-chat bridge: The `:3100` daemon is fleet-wide; the stdio bridge is per-chat. The daemon can be healthy while a chat's bridge is dead — causing silent MCP disconnection
   - Per-chat sentinel system (MCP-CLIENT-ENFORCE-MS0, tango 2026-06-13): bridge writes a JSON sentinel file and heartbeats it every 20s; the connectivity hook reads it to determine if THIS chat's bridge is alive
   - Fleet-wide bridge count fallback (U-MCP-BRIDGE-DETECT, golf 2026-06-12): reads the fleet-reaper process-enumeration cache and counts `mcp-http-bridge` processes
   - Harness ownership constraint: The Claude Code harness owns t
... [+14192 chars truncated]

### Assistant | 2026-06-16T19:10:16.790Z

All data confirmed. The wiring is UserPromptSubmit at index 23 in the hook array, not SessionStart. Here is the complete structured territory-map report:

---

## MCP Bridge Connection-Loss Territory Map

### (a) Detection Mechanism — File:Line Citations

**Two-tier detection in `H:/prism/.claude/hooks/mcp-connectivity-check.mjs`, wired at `UserPromptSubmit` (settings.json line 1390, hook index 23, timeout 2000ms):**

**Tier 1 — Per-chat sentinel (precise):**
- `mcp-connectivity-check.mjs:44-62`: calls `readBridgeLiveness(slot, opts)` from `scripts/lib/mcp-bridge-liveness.mjs`
- `mcp-bridge-liveness.mjs:22-27`: the honest-scope comment: "a hook/script CANNOT force the Claude Code harness to re-initialize a dead stdio MCP client mid-session"
- `mcp-bridge-liveness.mjs`: `readBridgeLiveness()` reads `H:/prism/.claude/cache/mcp-bridge-live/<slot>.json` (sentinel JSON), checks `process.kill(pid, 0)` for process liveness AND heartbeat age (stale threshold: `DEFAULT_STALE_MS = 90_000ms`, i.e. 4+ missed 20s heartbeats)
- `isConfidentlyDisconnected(verdict)`: returns `true` only for `reason = 'pid-dead'` or `'stale-heartbeat'`; NOT for `'no-sentinel'` or `'unknown-slot'` (those are "no signal", not "confident disconnect")
- `mcp-connectivity-check.mjs:115-124`: `buildClientDisconnectBanner(slot, verdict, cfg)` — per-chat precision banner

**Tier 2 — Fleet-wide fallback (total-outage detection, the operator's exact banner):**
- `mcp-connectivity-check.mjs:78`: `export function countBridges(env, deps)` — reads `.fleet-reaper-enum-cache-<hostname>.json` from `state/shared/`, counts processes matching `/mcp-http-bridge/i`
- `mcp-connectivity-check.mjs:71`: `BRIDGE_CACHE_MAX_AGE_SEC = 900` (15 min stale ceiling; fail-soft if cache absent/stale — never false-fires)
- `mcp-connectivity-check.mjs:100-108`: `buildDegradedBanner(bc)` — generates the EXACT text the operator saw:
  ```
  WARN MCP BRIDGE DOWN -- the prism server (:3100) is UP but 0 bridge processes are running.
  Every 
... [+7518 chars truncated]
