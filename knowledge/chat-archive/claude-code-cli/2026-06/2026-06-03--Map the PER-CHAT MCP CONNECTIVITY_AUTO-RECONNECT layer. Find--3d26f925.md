---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Map the PER-CHAT MCP CONNECTIVITY/AUTO-RECONNECT layer. Find the hook that emits"
date: "2026-06-03"
first_ts: "2026-06-03T00:29:34.684Z"
last_ts: "2026-06-03T00:43:00.625Z"
cwd: "H:\\prism-slot-golf"
messages: 101
user_msgs: 34
assistant_msgs: 67
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a8ac5b4ea0b48041a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Map the PER-CHAT MCP CONNECTIVITY/AUTO-RECONNECT layer. Find the hook that emits

> **claude-code-cli** | 2026-06-03 | 101 msgs (34 user / 67 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a8ac5b4ea0b48041a.jsonl`

## Transcript

### User | 2026-06-03T00:29:34.684Z

Map the PER-CHAT MCP CONNECTIVITY/AUTO-RECONNECT layer. Find the hook that emits the banner "MCP SERVER DISCONNECTED — every mcp__prism__* tool call will fail this turn" and "auto-reconnect: daemon (re)start initiated this turn (pid NNN)". Grep H:/prism/.claude/hooks/ for "mcp-connectivity", "maybeReconnect", "DISCONNECTED", "ECONNREFUSED", ":3100". Read the matching hook(s) end-to-end. Determine: the exact down-detection (timeout value? curl? single probe vs retries?), how it decides to respawn dist/index.js, whether it uses an O_EXCL single-flight claim, the TTL/throttle, and precisely how it produces false-positive 2nd-instance spawns under CPU load. KNOWN ROOT-CAUSES this session (do NOT re-derive — verify + extend):
- MCP server is HTTP on 127.0.0.1:3100, entry mcp-server/dist/index.js, ~50s cold boot (loads 64 dispatchers / ~700MB engines).
- Supervised by scripts/mcp-server-supervisor.mjs + Windows scheduled tasks "PRISM MCP Server" + "PRISM MCP Server Watchdog".
- MULTI-INSTANCE LEAK: three uncoordinated restarters (Watchdog task, supervisor, per-chat auto-reconnect hook) all respawn dist/index.js when :3100 looks down WITHOUT reaping stale instances -> N instances race to bind one port -> bind contention -> flapping (positive feedback).
- FALSE-POSITIVE PROBE: a short connectivity timeout under host CPU load reads a healthy server as down -> spawns a transient 2nd instance.
- BOOT-RESET FLAP: restarting a server that is still in its ~50s boot resets the clock -> perpetual DOWN.
- PARTIAL FIX SHIPPED: bind-fail-fast preflight (commit 2167e22cc8, "FIX1+2") makes a losing instance exit fast so a healthy port self-converges 2->1 in ~15s.
- DESIGNED-NOT-SHIPPED: a unified single-flight lock mcp-server-3100.lock shared by ALL THREE restarters ("FIX4/6"), plus a "process-exists-but-not-yet-healthy = BOOTING, leave alone" guard.
- RELATED REGRESSION: heartbeat-keepalive 8ms-timeout typo broke chat-slot heartbeat fleet-wide (commit 1d2678026, 2026-05-18) — a caution
... [+219 chars truncated]

### Assistant | 2026-06-03T00:29:48.071Z

I'll map the PER-CHAT MCP CONNECTIVITY/AUTO-RECONNECT layer by finding and analyzing the hook that emits the banner and controls the reconnection logic.

### Assistant | 2026-06-03T00:29:48.403Z

[tool_use: Bash]

### User | 2026-06-03T00:30:53.999Z

[tool_result] ./.claude/hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs
./.claude/hooks/.deprecated/awareness-2026-05-13/awareness-snapshot.mjs
./.claude/hooks/.deprecated/awareness-2026-05-13/cog-bridge-awareness-rebuild.mjs
./.claude/hooks/.deprecated/awareness-2026-05-13/cross-session-awareness.mjs
./.claude/hooks/.deprecated/awareness-2026-05-13/multi-computer-awareness.mjs
./.claude/hooks/.
... [+792 chars truncated]

### Assistant | 2026-06-03T00:30:55.217Z

Let me search for the specific connectivity and reconnect hooks.

### Assistant | 2026-06-03T00:30:55.581Z

[tool_use: Bash]

### User | 2026-06-03T00:31:28.870Z

[tool_result] claudemd-ollama-enforcer.mjs
error-block-prewarn.mjs
gsd-section-retrieve.mjs
mcp-broadcast-reconnect-inject.mjs
mcp-connectivity-check.mjs
mcp-connectivity-check.test.mjs
mcp-safety-bridge.mjs
memory-mirror-to-vault.mjs
ollama-obsidian-rag.mjs
ollama-route-recommender.mjs
ollama-skill-suggester.mjs
session-consolidate-graph.mjs
slot-context-bundle-inject.mjs

### Assistant | 2026-06-03T00:31:30.576Z

Now let me read the primary connectivity check hook:

### Assistant | 2026-06-03T00:31:30.577Z

[tool_use: Read]

### User | 2026-06-03T00:31:41.044Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * mcp-connectivity-check.mjs — UserPromptSubmit hook.
5	 *
6	 * Probes the PRISM MCP daemon (default http://127.0.0.1:3100) at the start of
7	 * every turn. On disconnect, injects an `additionalContext` banner naming
8	 * exactly what's down + the exact restart command — so the chat doesn't
9	 * silently degrade through a sequence of failing mcp__prism_
... [+9751 chars truncated]

### Assistant | 2026-06-03T00:31:42.652Z

Now let me read the reconnect action module that contains the actual reconnect logic:

### Assistant | 2026-06-03T00:31:42.939Z

[tool_use: Read]

### User | 2026-06-03T00:31:47.098Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\mcp-reconnect-action.mjs' was already read 70s ago in this session and is unchanged (mtime 1780264997231). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T00:31:48.739Z

Let me search for the mcp-reconnect-action file to understand its structure:

### Assistant | 2026-06-03T00:31:48.902Z

[tool_use: Bash]

### User | 2026-06-03T00:34:37.802Z

[tool_result] ./scripts/lib/mcp-reconnect-action.mjs

### Assistant | 2026-06-03T00:34:39.461Z

Let me grep for the maybeReconnect function to understand it:

### Assistant | 2026-06-03T00:34:39.768Z

[tool_use: Grep]

### User | 2026-06-03T00:34:44.754Z

[tool_result] Found 1 file
H:\prism\scripts\lib\mcp-reconnect-action.mjs

### Assistant | 2026-06-03T00:34:46.792Z

Let me check the MCP reconnect action file with a direct read by looking at its content:

### Assistant | 2026-06-03T00:34:47.049Z

[tool_use: Bash]

### User | 2026-06-03T00:34:54.825Z

[tool_result] 225 scripts/lib/mcp-reconnect-action.mjs
#!/usr/bin/env node
// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
// connect and check each turn to ensure you guys are always connected."
//
// THE GAP THIS CLOSES (R8 — read before write):
//   • mcp-connectivity-check.mjs
... [+2976 chars truncated]

### Assistant | 2026-06-03T00:34:56.257Z

Let me continue reading the file:

### Assistant | 2026-06-03T00:34:56.517Z

[tool_use: Bash]

### User | 2026-06-03T00:35:02.787Z

[tool_result] // caller should spawn. The lock's age is BOTH the single-flight guard (another chat is
// reconnecting) AND the throttle (don't re-spawn within the TTL of the last attempt).
//   up        : boolean — daemon reachable? (caller's probe result)
//   now       : number  — epoch ms
//   lock      : { startedAt:number, pid?:number } | null — parsed lockfile, or null if absent
//   ttlMs     : number  
... [+5440 chars truncated]

### Assistant | 2026-06-03T00:35:04.341Z

Let me continue reading to see the rest of the maybeReconnect function and related logic:

### Assistant | 2026-06-03T00:35:04.655Z

[tool_use: Bash]

### User | 2026-06-03T00:35:09.261Z

[tool_result]     const readLock = opts.readLockImpl
      || ((p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } });
    const lock = readLock(lockPath);
    const decision = decideReconnect({ up: false, now: now(), lock, ttlMs });
    if (!decision.shouldReconnect) {
      return { ok: true, connected: false, action: "skip", reason: decision.reason, lockAgeMs: decision.lock
... [+3385 chars truncated]

### Assistant | 2026-06-03T00:35:10.793Z

Now let me check the MCP broadcast reconnect hook to see how it coordinates with the connectivity check:

### Assistant | 2026-06-03T00:35:11.041Z

[tool_use: Read]

### User | 2026-06-03T00:35:17.465Z

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

### Assistant | 2026-06-03T00:35:19.027Z

Now let me check the supervisor and daemon helper scripts to understand the daemon lifecycle:

### Assistant | 2026-06-03T00:35:19.185Z

[tool_use: Bash]

### User | 2026-06-03T00:35:30.494Z

[tool_result] #!/usr/bin/env node
/**
 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
 *
 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
 * driven). Designed to run as a Windows scheduled task on AtStartup +
 * AtLogon so the server is up before any Claude Code chat opens. Also runs
 * on-demand from the CLI.
 *
 * Behavior:
 *   - On launch: probe /healt
... [+3437 chars truncated]

### Assistant | 2026-06-03T00:35:32.763Z

Let me get the daemon helper script:

### Assistant | 2026-06-03T00:35:33.087Z

[tool_use: Bash]

### User | 2026-06-03T00:35:43.335Z

[tool_result] 283 .claude/helpers/mcp-server-daemon.mjs
#!/usr/bin/env node
/**
 * mcp-server-daemon.mjs — Shared MCP Server Daemon Manager
 *
 * Manages a single PRISM MCP server instance that multiple Claude chats share.
 * Eliminates the "N chats = N processes" contention problem.
 *
 * Commands:
 *   start   - Start the daemon (if not running)
 *   stop    - Stop the daemon
 *   status  - Check if
... [+2908 chars truncated]

### Assistant | 2026-06-03T00:35:44.863Z

Let me search for the Windows scheduled task and lock-related code:

### Assistant | 2026-06-03T00:35:45.446Z

[tool_use: Bash]

### User | 2026-06-03T00:36:44.974Z

[tool_result] ./.claude/helpers/ensure-all-watchdogs.ps1:  @{ Name = 'PRISM MCP Server';                Installer = 'install-mcp-server-task.ps1';           Critical = $true;  Description = 'HTTP MCP server supervisor (AtStartup+AtLogon)' }
./.claude/helpers/ensure-all-watchdogs.ps1:  @{ Name = 'PRISM MCP Server Watchdog';       Installer = 'install-mcp-server-watchdog-task.ps1';  Critical = $true;  Description
... [+4063 chars truncated]

### system

... [21 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-03T00:37:35.405Z

Perfect! Now let me check the actual MCP HTTP server log to see how it handles bind failures:

### Assistant | 2026-06-03T00:37:35.530Z

[tool_use: Bash]

### User | 2026-06-03T00:37:41.405Z

[tool_result] [INFO] [prism_doc_learn] Registered 5 actions
[DEBUG] [AUTO-HOOK] Wrapped: prism_shop_practice with UNIVERSAL hooks (before/after/cadence/error)
[INFO] [prism_shop_practice] Registered 28 actions
[DEBUG] [AUTO-HOOK] Wrapped: prism_realtime with UNIVERSAL hooks (before/after/cadence/error)
[DEBUG] Registered: prism_realtime (6 actions)
[DEBUG] [AUTO-HOOK] Wrapped: prism_cnc_ops with UNIVERSAL hooks
... [+6748 chars truncated]

### Assistant | 2026-06-03T00:37:42.837Z

Let me check the .gitignore to see which lock files are tracked:

### Assistant | 2026-06-03T00:37:43.047Z

[tool_use: Bash]

### User | 2026-06-03T00:37:49.395Z

[tool_result] # negations work — /  (dir-form) blocks re-inclusion per Git semantics.
state/shared/.cron-locks/*.lock
# Regenerable artifacts that bloated git status to 351k untracked -> index.lock
state/shared/.cron-locks/

### Assistant | 2026-06-03T00:37:51.129Z

Now let me check the heartbeat timeout regression mentioned:

### Assistant | 2026-06-03T00:37:51.414Z

[tool_use: Bash]

### User | 2026-06-03T00:37:55.791Z

[tool_result] commit 1d2678026648b98cc4a4604b8020a8cce81d75cc
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon May 18 15:32:27 2026 -0500

    [MAIN] [SLOT-DRIFT-FIX-MS1]/U-SLOT-HEARTBEAT-FIX: root-cause + fix doc — heartbeat-keepalive 8ms timeout typo broke chat-slot heartbeat fleet-wide slot:alpha. Root cause: H:/.claude/settings.json wired heartbeat-keepalive.mjs with timeout: 8 (ms). 
... [+850 chars truncated]

### Assistant | 2026-06-03T00:37:57.347Z

Excellent! Now let me check the current state of the connectivity throttle and probe settings:

### Assistant | 2026-06-03T00:37:57.802Z

[tool_use: Bash]

### User | 2026-06-03T00:38:03.792Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T00:38:05.278Z

Let me check the test file to understand how the connectivity check works:

### Assistant | 2026-06-03T00:38:05.672Z

[tool_use: Bash]

### User | 2026-06-03T00:38:10.024Z

[tool_result] 232 .claude/hooks/mcp-connectivity-check.test.mjs
// mcp-connectivity-check.test.mjs — pure-core tests with injected http + fs.
// Run: node --test H:/prism/.claude/hooks/mcp-connectivity-check.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getConfig,
  loadState,
  saveState,
  shouldProbe,
  buildBanner,
  runCheck,
} from "./mcp-connectivity-chec
... [+4881 chars truncated]

### Assistant | 2026-06-03T00:38:12.494Z

Let me search for any existing unified lock documentation:

### Assistant | 2026-06-03T00:38:13.165Z

[tool_use: Bash]

### User | 2026-06-03T00:38:27.737Z

[tool_result] Exit code 1

### Assistant | 2026-06-03T00:38:31.137Z

Let me check for the issue tracking documentation:

### Assistant | 2026-06-03T00:38:31.523Z

[tool_use: Bash]

### User | 2026-06-03T00:39:27.146Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/mcp/CLAUDE.md
./.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/docs/CLAUDE.md
./.claude/memory/MEMORY.md
./.claude/worktrees/agent-a01e7b81d0946a97b/CLAUDE.md
./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/CLAUDE.md

### Assistant | 2026-06-03T00:39:28.791Z

Let me check the main CLAUDE.md:

### Assistant | 2026-06-03T00:39:28.917Z

[tool_use: Bash]

### User | 2026-06-03T00:39:35.416Z

[tool_result] -rw-r--r-- 1 wompu 197611 88617 Jun  2 19:10 CLAUDE.md

### Assistant | 2026-06-03T00:39:37.145Z

Let me grep for the MCP connectivity section in CLAUDE.md:

### Assistant | 2026-06-03T00:39:37.331Z

[tool_use: Bash]

### User | 2026-06-03T00:39:43.516Z

[tool_result] 150:- 2026-05-23 | **[MAIN] [MCP-OOM-FIX]/U-SUPERVISOR-HEAP-BUMP (slot:kilo iter9): mitigate :3100 OOM-kill loop — supervisor spawnChild() now injects NODE_OP...** | observed-in: ee8be4fd2 | fix: see commit | verify: `git -C H:/prism show ee8be4fd2`
463:- 2026-05-31 | **MCP :3100 "Already connected to a transport" disconnect — fresh McpServer per /mcp request (slot:golf)** | observed-in: 1297b0a8f
... [+609 chars truncated]

### Assistant | 2026-06-03T00:39:45.424Z

Now let me create a comprehensive mapping document by analyzing what I've found:

### Assistant | 2026-06-03T00:39:45.536Z

[tool_use: Bash]

### User | 2026-06-03T00:39:50.514Z

[tool_result] 988a5bec53 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-TOOLDB-FILL-MS0]/U-CTF-WIRE (slot:romeo): cimco_toollib_export -> prism_data (round-trip 7/7)
82c8352724 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-TRAIN-MS0]/U-MILL-PRODUCER-POWER-AUTODERATE (slot:foxtrot): opt-in power auto-derate -> the print->program producer self-corrects over-budget courses (feasible, not just flagged)
26ff54ae02 [MAIN] [TOKEN-SAV
... [+4800 chars truncated]

### Assistant | 2026-06-03T00:39:52.491Z

Now let me compile the comprehensive mapping. Let me check one more critical piece - how the watchdog task interacts:

### Assistant | 2026-06-03T00:39:53.379Z

[tool_use: Bash]

### User | 2026-06-03T00:40:00.115Z

[tool_result] $desc = "Periodic MCP server wedge detector - probes http://127.0.0.1:3100/health every $EveryMinutes min. After 2 consecutive failures (default ~10 min of confirmed wedge), kills the wedged listener PID and spawns the supervisor to respawn. Closes the gap where the supervisor's AtStartup+AtLogon triggers miss mid-life wedges. Companion to 'PRISM MCP Server' task."

$registerParams = @{
  TaskName
... [+1880 chars truncated]

### Assistant | 2026-06-03T00:40:01.827Z

Perfect. Now I have the complete picture. Let me create the final structured output:

### Assistant | 2026-06-03T00:41:35.754Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:41:36.577Z

[tool_result] Output does not match required schema: /failureModes: must be array, /existingAssets: must be array, /gaps: must be array, /recommendations: must be array

### Assistant | 2026-06-03T00:41:38.326Z

Let me fix the schema:

### Assistant | 2026-06-03T00:42:49.523Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:42:50.651Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:43:00.625Z

Perfect! I have completed the comprehensive mapping of the PER-CHAT MCP CONNECTIVITY/AUTO-RECONNECT layer. Here's the summary:

## Mapping Complete

I've conducted a thorough end-to-end analysis of the MCP connectivity and auto-reconnect architecture. The system comprises **three uncoordinated restarters** competing to keep the HTTP daemon alive on 127.0.0.1:3100:

### Key Findings:

**DOWN-DETECTION**: Per-turn hook (`mcp-connectivity-check.mjs`) probes /health with 3-second timeout (not 1s as documented), throttled at 30s when healthy but re-probes every 5s when DOWN.

**AUTO-RECONNECT**: Single-flight O_EXCL lock (`state/shared/.mcp-reconnect.lock`) with 60s TTL controls detached daemon spawning. Lock structure: `{pid, startedAt}`. Decision logic prevents multiple chats from spawning simultaneously.

**SERVER HARDENING**: Bind-fail-fast (commits 2167e22cc8 + 9dc5b30818) includes pre-bootstrap port preflight + EADDRINUSE→exit(0) handler. Losers exit cleanly in ~3.7s; healthy port converges 2→1 instances in ~15s.

**THREE RESTARTERS** (uncoordinated, HIGH-RISK):
1. **Watchdog task** (Windows scheduled, every 5min): 2 consecutive /health failures → escalate
2. **Supervisor** (AtStartup + respawn loop): Exponential backoff 5-60s on child exit
3. **Per-turn hook** (every UserPromptSubmit when DOWN): Detached spawn via shared lock

**CRITICAL GAPS**:
- **FIX4/6 not shipped**: Unified O_EXCL lock across all three restarters to prevent simultaneous spawns
- **BOOTING state guard missing**: No "process-exists + /health=500 + age<50s = BOOTING, leave alone" logic → boot-reset flap risk
- **Broadcast signal writer unknown**: Signal file (`mcp-reconnect-signal.json`) is stale; no documented writer
- **TTL coupling**: 60s locks = single-flight window + throttle + cold-boot budget = fragile invariant

All artifacts are mapped with exact file paths, line numbers, and documented knobs. The layer **stays up under normal load but flaps under CPU saturation** (false-positive probes
... [+98 chars truncated]
