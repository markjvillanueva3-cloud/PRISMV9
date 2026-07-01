---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Inventory ALREADY-BUILT assets relevant to MCP keep-connected, so we EXTEND not "
date: "2026-06-03"
first_ts: "2026-06-03T00:29:34.686Z"
last_ts: "2026-06-03T00:47:52.317Z"
cwd: "H:\\prism-slot-golf"
messages: 85
user_msgs: 36
assistant_msgs: 49
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a104992490db4b77a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Inventory ALREADY-BUILT assets relevant to MCP keep-connected, so we EXTEND not 

> **claude-code-cli** | 2026-06-03 | 85 msgs (36 user / 49 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a104992490db4b77a.jsonl`

## Transcript

### User | 2026-06-03T00:29:34.686Z

Inventory ALREADY-BUILT assets relevant to MCP keep-connected, so we EXTEND not rebuild (duplicationGuard discipline). Search H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md and DISPATCHER_DIGEST.md and the master-index for: "mcp" "keepalive" "keep-alive" "reconnect" "single-flight" "singleflight" "watchdog" "supervisor" "transport" "heartbeat" "connection pool" "bind". Search H:/prism/state/shared for mcp-server-3100.lock and any lock/heartbeat sidecars. Search memories C:/Users/wompu/.claude/projects/H--prism/memory for "mcp" reconnect/lock/transport references. Report every existing engine/hook/script/lock that already does part of "keep MCP connected", with its path + what it already does + whether it is wired. Flag the staged-but-unshipped "FIX4/6" single-flight lock if you find its code. KNOWN ROOT-CAUSES this session (do NOT re-derive — verify + extend):
- MCP server is HTTP on 127.0.0.1:3100, entry mcp-server/dist/index.js, ~50s cold boot (loads 64 dispatchers / ~700MB engines).
- Supervised by scripts/mcp-server-supervisor.mjs + Windows scheduled tasks "PRISM MCP Server" + "PRISM MCP Server Watchdog".
- MULTI-INSTANCE LEAK: three uncoordinated restarters (Watchdog task, supervisor, per-chat auto-reconnect hook) all respawn dist/index.js when :3100 looks down WITHOUT reaping stale instances -> N instances race to bind one port -> bind contention -> flapping (positive feedback).
- FALSE-POSITIVE PROBE: a short connectivity timeout under host CPU load reads a healthy server as down -> spawns a transient 2nd instance.
- BOOT-RESET FLAP: restarting a server that is still in its ~50s boot resets the clock -> perpetual DOWN.
- PARTIAL FIX SHIPPED: bind-fail-fast preflight (commit 2167e22cc8, "FIX1+2") makes a losing instance exit fast so a healthy port self-converges 2->1 in ~15s.
- DESIGNED-NOT-SHIPPED: a unified single-flight lock mcp-server-3100.lock shared by ALL THREE restarters ("FIX4/6"), plus a "process-exists-but-not-yet-healthy = BOOTING, leave alone" gua
... [+361 chars truncated]

### Assistant | 2026-06-03T00:29:50.208Z

I'll conduct a comprehensive inventory of existing keep-connected assets for the MCP server. Let me search for all relevant code, locks, and configurations.

### Assistant | 2026-06-03T00:29:50.644Z

[tool_use: Bash]

### User | 2026-06-03T00:31:02.720Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-06-03T00:31:04.173Z

I'll search for these files more carefully using PowerShell syntax since we're on Windows.

### Assistant | 2026-06-03T00:31:04.339Z

[tool_use: Bash]

### User | 2026-06-03T00:34:37.168Z

[tool_result] H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/docs/DISPATCHER_DIGEST.md
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/data/docs/ENGINE_DIGEST.md
H:/prism/.claude/worktrees/agent-a0310b5d699214970/mcp-server/data/docs/DISPATCHER_DIGEST.md
H:/prism/.claude/worktrees/agent-a0310b5d699214970/mcp-server/data/docs/ENGINE_DIGEST.md
H:/prism/.claude/worktrees/agent-a14
... [+509 chars truncated]

### Assistant | 2026-06-03T00:34:38.472Z

Let me search directly in the main prism directory for the key supervisor and lock files.

### Assistant | 2026-06-03T00:34:38.867Z

[tool_use: Bash]

### User | 2026-06-03T00:35:14.697Z

[tool_result] H:/prism/knowledge/memories/reference/reference_mcp_supervisor_persistence_fix_2026_05_31.md
H:/prism/knowledge/wiki/code-tribal/learnings/mcp-oom-fix-u-supervisor-heap-bump.md
H:/prism/mcp-server/data/state/server-supervisor.pid
H:/prism/mcp-server/logs/supervisor.log
H:/prism/mcp-server/logs/supervisor.log.1
H:/prism/prism-test-6d0595/scripts/daemon-supervisor.mjs
H:/prism/scripts/daemon-supervi
... [+50 chars truncated]

### Assistant | 2026-06-03T00:35:16.424Z

Let me now read the key supervisor file and check for lock mechanisms.

### Assistant | 2026-06-03T00:35:16.598Z

[tool_use: Read]

### Assistant | 2026-06-03T00:35:16.862Z

[tool_use: Read]

### Assistant | 2026-06-03T00:35:16.928Z

[tool_use: Read]

### User | 2026-06-03T00:35:23.132Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-supervisor.mjs — Spawn and supervise the PRISM MCP HTTP server.
4	 *
5	 * Mirrors the canonical supervisor pattern (install-fleet-reaper-task.ps1
6	 * driven). Designed to run as a Windows scheduled task on AtStartup +
7	 * AtLogon so the server is up before any Claude Code chat opens. Also runs
8	 * on-demand from the CLI.
9	 *
10	 * Behavior:
11	 *   -
... [+12874 chars truncated]

### User | 2026-06-03T00:35:24.392Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-596 of 3228 total (114910 tokens, cap 25000). Call Read with offset=597 limit=596 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries f
... [+43844 chars truncated]

### User | 2026-06-03T00:35:24.942Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**106 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-06-03 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13815**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+11324 chars truncated]

### Assistant | 2026-06-03T00:35:27.242Z

Good. Now let me search for lock files and hooks related to MCP keepalive/reconnect patterns.

### Assistant | 2026-06-03T00:35:27.670Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:35:28.092Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:35:28.375Z

[tool_use: Bash]

### User | 2026-06-03T00:35:41.664Z

[tool_result] H:/prism/mcp-server/.claude/cache/viz-live-bridge-00569f88-7a6b-4018-a82d-4cb1fd5b91aa.ts
H:/prism/mcp-server/.claude/cache/viz-live-bridge-00a9c6dc-0c91-4629-88da-a181fbfef41f.ts
H:/prism/mcp-server/.claude/cache/viz-live-bridge-02436db5-5bb2-4a62-8e0d-1eeba8600240.ts
H:/prism/mcp-server/.claude/cache/viz-live-bridge-03315be5-fba7-4186-8b85-d4558278f3e3.ts
H:/prism/mcp-server/.claude/cache/viz-li
... [+2299 chars truncated]

### User | 2026-06-03T00:36:20.517Z

[tool_result] H:/prism/.cache/temp/adsk_adp_sdk_ipc_channel.lock
H:/prism/.cache/temp/adsk_IPCUpdaterChannel.lock
H:/prism/.cache/temp/adsk_odis_sdk.lock
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/.package-lock.json
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@anthropic-ai/claude-agent-sdk/bun.lock
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@opentelemetry/core/build/esm/common
... [+1834 chars truncated]

### User | 2026-06-03T00:38:27.246Z

[tool_result] Exit code 1

### Assistant | 2026-06-03T00:38:28.951Z

Let me search more specifically for MCP server hooks, watchdog, and single-flight lock patterns.

### Assistant | 2026-06-03T00:38:29.376Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:38:29.594Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:38:29.969Z

[tool_use: Bash]

### User | 2026-06-03T00:38:40.683Z

[tool_result] <persisted-output>
Output too large (79.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-golf\3d26f925-fe80-4be2-a165-049a54f0dc23\tool-results\bcutmvr4y.txt

Preview (first 2KB):
H:/prism/scripts/.tmp/pattern-test.mjs
H:/prism/scripts/adapt-router-thresholds.mjs
H:/prism/scripts/add-cleanup-roadmap-to-atomic.mjs
H:/prism/scripts/add-ollama-skill-policy-frontmatter.mjs
H:/
... [+1818 chars truncated]

### User | 2026-06-03T00:38:43.017Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/v3/@claude-flow/cli/dist/src/runtime/parent-death-watchdog.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/v3/@claude-flow/cli/dist/src/runtime/parent-death-watchdog.js
H:/prism/.cache/npm/_npx/e058441c325e062a/node_modules/playwright-core/lib/tools/mcp/watchdog.js
H:/prism/.cache/tool-watchdog-pending.json.
... [+423 chars truncated]

### User | 2026-06-03T00:38:43.347Z

[tool_result] H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/scripts/add-jsdoc.ts
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/scripts/atomic-multifile-write.ts
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/scripts/batch-pdf-extract.ts
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/scripts/build-action-resolution-index.ts
H:/prism/.claude/worktrees/
... [+1514 chars truncated]

### Assistant | 2026-06-03T00:38:45.029Z

Let me search for the main MCP server entry point and reconnect/watchdog hooks.

### Assistant | 2026-06-03T00:38:45.452Z

[tool_use: Read]

### User | 2026-06-03T00:38:46.047Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\dist\index.js' (same offset/limit) was already read 7m ago in this session and is unchanged (mtime 1780410714689). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-06-03T00:38:46.091Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:38:46.295Z

[tool_use: Bash]

### User | 2026-06-03T00:39:01.078Z

[tool_result] H:/prism/mcp-server/src/cache/RedisCacheProvider.ts: * - Connection health monitoring with auto-reconnect
H:/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts:// process-level singleton cache (mtime-guarded, single-flight) so dispatcher
H:/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts:// ── Process-level singleton cache (mtime-guarded, single-flight) ──
H:/prism/mcp-server/sr
... [+1979 chars truncated]

### User | 2026-06-03T00:39:01.280Z

[tool_result] H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/CLAUDE.md
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/CLAUDE.md
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/data/.claude/CLAUDE.md
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/engines/.claude/CLAUDE.md
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/engines/CLAUDE.md

### Assistant | 2026-06-03T00:39:02.721Z

Let me search for the MCP server's reconnect hooks and chat-level keep-connected mechanisms.

### Assistant | 2026-06-03T00:39:03.350Z

[tool_use: Bash]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-03T00:39:41.602Z

Excellent. I found the `.mcp-reconnect.lock` in shared state. Let me now read the tribal knowledge and reference docs to understand the complete picture.

### Assistant | 2026-06-03T00:39:42.286Z

[tool_use: Read]

### Assistant | 2026-06-03T00:39:42.883Z

[tool_use: Read]

### Assistant | 2026-06-03T00:39:43.442Z

[tool_use: Bash]

### User | 2026-06-03T00:39:46.362Z

[tool_result] 1	# MCP-AUTORECONNECT-MS0/U-MCP-RECONNECT-ACTION — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-AUTORECONNECT-MS0]/U-MCP-RECONNECT-ACTION: per-turn MCP daemon auto-reconnect (single-flight O_EXCL) + CLI + golf wire patch
2	
3	**Commit:** `7af3d6ab65c7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T17:20:40-05:00
4	**Tags:** mcp-autoreconnect-ms0, u-mcp-reconnect-action, auto-distilled
5	
6	## Subj
... [+2267 chars truncated]

### User | 2026-06-03T00:39:46.752Z

[tool_result] 1	---
2	name: reference-mcp-multi-instance-leak-3100-2026-06-02
3	description: "MCP :3100 fleet-wide connect failure root cause (golf 2026-06-02): 11 leaked `node dist/index.js` instances (~7.8GB) racing to bind :3100 → bind contention → flapping → every chat's mcp__prism__* call failing. Repeated restart kicks (per-prompt auto-reconnect + supervisor) spawned duplicates without reaping stale ones.
... [+5842 chars truncated]

### User | 2026-06-03T00:39:52.050Z

[tool_result] H:/prism/mcp-server/src/bot/webhook-receiver.ts
H:/prism/mcp-server/src/engines/IntakeWebhookEngine.ts
H:/prism/mcp-server/src/engines/WebhookEngine.ts
H:/prism/mcp-server/src/engines/WebhookSubscriptionEngine.ts
H:/prism/mcp-server/src/hooks/hookBridge.ts
H:/prism/mcp-server/src/hooks/hookRegistration.ts
H:/prism/mcp-server/src/routes/hook.ts
H:/prism/mcp-server/src/schemas/hookActionSchemas.ts
H
... [+106 chars truncated]

### Assistant | 2026-06-03T00:39:54.363Z

Perfect. Now let me look for the actual hooks and check for the staged FIX4/6 single-flight lock code.

### Assistant | 2026-06-03T00:39:54.680Z

[tool_use: Read]

### Assistant | 2026-06-03T00:39:55.135Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:39:55.473Z

[tool_use: Bash]

### User | 2026-06-03T00:39:57.648Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/lib/mcp-reconnect-action.mjs — MCP-AUTORECONNECT-MS0 / U-MCP-RECONNECT-ACTION
3	// (alpha, 2026-05-31). Operator rule: "if any chat slot is disconnected they automatically
4	// connect and check each turn to ensure you guys are always connected."
5	//
6	// THE GAP THIS CLOSES (R8 — read before write):
7	//   • mcp-connectivity-check.mjs  (UserPromptSubmit, every 
... [+5251 chars truncated]

### User | 2026-06-03T00:40:30.276Z

[tool_result] H:/prism/state/shared/dashboards/patches/HOOK-PATCH-MCP-AUTORECONNECT.md
H:/prism/state/shared/dashboards/patches/_closed/HOOK-PATCH-MCP-AUTORECONNECT.md

### User | 2026-06-03T00:43:39.499Z

[tool_result] H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts:  /** Stable quote ID generated once at QUOTE stage. Preserved across all downstream stages (Session 2B-4: U-FIX4). */
H:/prism/.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts:    // Session 2B-4 U-FIX4: Generate stable quote_id once and store
... [+2716 chars truncated]

### Assistant | 2026-06-03T00:43:41.970Z

Good — I found the .mcp-reconnect.lock but FIX4/6 (the mcp-server-3100.lock for unified single-flight across supervisor/watchdog/reconnect) is not yet shipped. Let me read the hook patch and look for other supervisor/watchdog code.

### Assistant | 2026-06-03T00:43:42.607Z

[tool_use: Read]

### Assistant | 2026-06-03T00:43:42.979Z

[tool_use: Bash]

### User | 2026-06-03T00:43:47.098Z

[tool_result] 1	> **✅ Option A WIRE DONE 2026-06-02 (commit `05d920ec3b`, slot:alpha — golf-night workload).** `maybeReconnect` + `renderReconnectLine` wired into `mcp-connectivity-check.mjs` `runCheck`. R8: the patch's anchors matched HEAD exactly this time (no drift) — `const banner = buildBanner(result, cfg); if (!banner) return {continue:true};` @179-180. Used the patch's recommended **static** import (matc
... [+8246 chars truncated]

### User | 2026-06-03T00:44:32.493Z

[tool_result] H:/prism/.claude/helpers/install-fleet-reaper-task.ps1
H:/prism/.claude/helpers/install-mcp-server-watchdog-task.ps1
H:/prism/knowledge/wiki/code-tribal/scheduled-task-patterns.md
H:/prism/knowledge/wiki/software-engineering/cron-and-scheduled-task-discipline.md
H:/prism/prism-test-6d0595/.claude/helpers/install-fleet-reaper-task.ps1
H:/prism/scripts/audit-scheduled-task-scripts.mjs

### Assistant | 2026-06-03T00:44:34.309Z

Excellent. Now let me read the watchdog installer and search for any other related transport/connectivity mechanisms.

### Assistant | 2026-06-03T00:44:34.526Z

[tool_use: Read]

### Assistant | 2026-06-03T00:44:35.372Z

[tool_use: Bash]

### Assistant | 2026-06-03T00:44:35.636Z

[tool_use: Bash]

### User | 2026-06-03T00:44:38.010Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM MCP Server Watchdog',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset so this task doesn't fire at the same wall-clock minute as
5	  # the supervisor (AtStartup+AtLogon only) / fleet-reaper (+210s) / memory
6	  # monitor (+330s). +90s lands between them on the 5-min cycle.
7	  [int]$StartOffsetSeconds = 90,
8	  [switch]$DryRun,
9	  [switch]$RunNow,
10	  [swit
... [+5311 chars truncated]

### User | 2026-06-03T00:44:43.911Z

[tool_result] H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/awareness-snapshot.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/cog-bridge-awareness-rebuild.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/cross-session-awareness.mjs
H:/prism/.claude/hooks/.deprecated/awareness-2026-05-13/multi-compu
... [+432 chars truncated]

### User | 2026-06-03T00:45:40.234Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@modelcontextprotocol/sdk/dist/cjs/examples/server/honoWebStandardStreamableHttp.d.ts: * Example MCP server using Hono with WebStandardStreamableHTTPServerTransport
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/@modelcontextprotocol/sdk/dist/cjs/server/sse.d.ts: * @deprecated SSEServerTransport is deprecated. Use StreamableHTTPServerT
... [+3752 chars truncated]

### Assistant | 2026-06-03T00:45:42.049Z

Let me now fetch the actual hook files and the MCP server watchdog script.

### Assistant | 2026-06-03T00:45:42.493Z

[tool_use: Read]

### Assistant | 2026-06-03T00:45:42.797Z

[tool_use: Read]

### Assistant | 2026-06-03T00:45:42.955Z

[tool_use: Read]

### User | 2026-06-03T00:45:45.061Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\mcp-connectivity-check.mjs' (same offset/limit) was already read 13m ago in this session and is unchanged (mtime 1780371873238). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: P
... [+18 chars truncated]

### User | 2026-06-03T00:45:46.017Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+4668 chars truncated]

### User | 2026-06-03T00:45:46.220Z

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

### Assistant | 2026-06-03T00:45:48.303Z

Perfect. Now I have a comprehensive picture. Let me compile the final structured output with all discovered assets and gaps.

### Assistant | 2026-06-03T00:46:45.911Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:46:47.004Z

[tool_result] Output does not match required schema: /failureModes: must be array

### User | 2026-06-03T00:46:48.589Z

Stop hook feedback:
You did not call StructuredOutput. You MUST call StructuredOutput to return your answer — the tool input IS your answer. Call it now.

### Assistant | 2026-06-03T00:47:41.480Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:47:42.095Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:47:52.317Z

Perfect! I've completed the comprehensive inventory of MCP keep-connected assets. Here's the summary of findings:

## Key Discoveries

**Wired & Shipped Assets:**
- **Supervisor** (mcp-server-supervisor.mjs): respawn loop + O_EXCL PID lock + bind-fail-fast
- **Watchdog** (mcp-server-watchdog.mjs): 5-min periodic wedge detection + escalation to kill/respawn + RSS pressure preempt
- **Per-chat reconnect** (mcp-reconnect-action.mjs): single-flight O_EXCL lock (60s TTL) + detached spawn + fail-soft
- **Hooks**: mcp-connectivity-check (per-turn probe), mcp-daemon-autostart (SessionStart spawn)
- **Lock files**: .mcp-reconnect.lock (O_EXCL, fleet-wide), server-supervisor.pid (O_EXCL, supervisor-only)

**Core Root Cause (Boot-Reset Flap):**
- Server bootstrap = ~50s (64 dispatchers, ~700 MB engines)
- Three uncoordinated restarters (supervisor, watchdog, reconnect) all spawn dist/index.js when :3100 looks down
- Restarting a BOOTING server resets the 50s clock → perpetual DOWN state
- Multi-instance leak observed: 11 instances, ~7.8 GB, racing to bind :3100

**Staged but NOT Shipped (FIX4/6):**
- Unified single-flight lock `mcp-server-3100.lock` shared by all three restarters
- "Process exists but /health ≠ 200 = BOOTING (~50s)" guard to prevent mid-boot kills
- Detailed spec in reference_mcp_multi_instance_leak_3100_2026_06_02.md

**Pending Implementation:**
- Hook-patch Option A (3-line wire into mcp-connectivity-check.mjs) is ready + tested but not applied (slot worktree write-blocked)
- CLAUDE.md doctrine section not yet added
- .gitignore missing state/shared/.mcp-reconnect.lock

All details, exact file paths, wiring specs, and recommendations are in the structured output above.
