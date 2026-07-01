---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are mining PRISM's memory/wiki/commit history for everything already tried o"
date: "2026-06-04"
first_ts: "2026-06-04T03:30:23.032Z"
last_ts: "2026-06-04T03:38:22.639Z"
cwd: "H:\\PRISM"
messages: 50
user_msgs: 22
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a51053747971cc34e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are mining PRISM's memory/wiki/commit history for everything already tried o

> **claude-code-cli** | 2026-06-04 | 50 msgs (22 user / 28 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a51053747971cc34e.jsonl`

## Transcript

### User | 2026-06-04T03:30:23.032Z

You are mining PRISM's memory/wiki/commit history for everything already tried on MCP server drops, OOM, watchdog, supervisor, and transport — so the fix does NOT rebuild or regress prior work. 
== LIVE GROUND TRUTH (DESKTOP-N7MI1VB, slot golf, 2026-06-03) ==
- The recurring symptom: chats periodically show "MCP DISCONNECTED" then a watchdog restart. Operator: "permanently fix the mcp server drop we constantly experience."
- MCP HTTP bridge listens on :3100, owner node pid 36276 (756MB RSS, just boosted to AboveNormal).
- THREE node processes at ~2.9GB RSS each — right at the documented 3GB watchdog OOM-restart threshold (a restart = a drop).
- CPU was at 100% (16 logical cores, Ryzen 7 7800X3D). No single runaway — AGGREGATE saturation from 201 active fleet /loop sessions + Obsidian + Defender (MsMpEng) + ollama. CPU starvation of the MCP event loop = request timeouts = "MCP DISCONNECTED".
- PRIORITY INVERSION found: ollama 'llama-server' runner processes were at AboveNormal priority, PREEMPTING the Normal-priority MCP server. Golf normalized runners->Normal + boosted MCP->AboveNormal as immediate relief (CPU 100%->93%). But ollama RESPAWNS runners at AboveNormal on each model load, so a one-shot fix is NOT durable.
- RAM is healthy: 40% used, 76GB free of 127GB. GPU: 96GB RTX PRO 6000 Blackwell, just optimized (4-model roster, 54GB resident, 42GB free, 1% util — lots of idle GPU compute).

== PRIOR MCP-DROP FIXES ALREADY SHIPPED (do NOT rebuild; verify they're deployed) ==
- commit 1297b0a8f5 (2026-05-31, golf): "MCP :3100 Already connected to a transport" — buildRequestServer() makes a FRESH McpServer per /mcp request (SDK allows only 1 transport/server; overlapping multi-chat requests threw -> client timeout -> DISCONNECTED). Split registerTools -> bootstrapServices(once)+bindDispatchers(per-server).
- MCP-OOM-FIX (2026-05-23): watchdog preemptive restart on RSS pressure (3GB threshold), supervisor spawnChild injects NODE_OPTIONS heap bump.
- Ollama serve is now
... [+2018 chars truncated]

### Assistant | 2026-06-04T03:30:33.991Z

I'll mine PRISM's history for prior MCP-drop work. Let me scope all searches to the relevant directories and run them in parallel.

### Assistant | 2026-06-04T03:30:34.917Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:30:36.345Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:30:37.873Z

[tool_use: Bash]

### User | 2026-06-04T03:30:51.855Z

[tool_result] Found 7 files
knowledge\memories\patterns\database-expansion_synthesis.md
knowledge\memories\reference\reference_prism_task_always_active_hardening_2026_05_31.md
knowledge\memories\reference\reference_mcp_sdk_single_transport_invariant_2026_05_25.md
knowledge\memories\reference\reference_mcp_multi_instance_leak_3100_2026_06_02.md
knowledge\wiki\code-tribal\learnings\mcp-concurrency-fix-u-mcp-facto
... [+124 chars truncated]

### User | 2026-06-04T03:30:54.384Z

[tool_result] Found 159 files
knowledge\wiki\architecture\_orphans-rescue.md
knowledge\wiki\architecture\tests-index.md
knowledge\wiki\architecture\hooks\runtime\wiki-propagation-watchdog-stop-test.md
knowledge\wiki\architecture\hooks\runtime\wiki-propagation-watchdog-stop.md
knowledge\wiki\architecture\hooks\runtime\tool-watchdog.md
knowledge\wiki\architecture\hooks\runtime\stop-memory-size-watchdog.md
knowled
... [+10092 chars truncated]

### User | 2026-06-04T03:31:34.444Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-04T03:31:37.593Z

The git grep returned empty (the `--grep -iE` syntax was wrong). Let me read the most relevant memory/wiki files and fix the git query.

### Assistant | 2026-06-04T03:31:38.486Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:39.558Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:40.262Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:41.281Z

[tool_use: Bash]

### User | 2026-06-04T03:31:50.000Z

[tool_result] 1	---
2	name: reference-mcp-multi-instance-leak-3100-2026-06-02
3	description: "MCP :3100 fleet-wide connect failure root cause (golf 2026-06-02): 11 leaked `node dist/index.js` instances (~7.8GB) racing to bind :3100 → bind contention → flapping → every chat's mcp__prism__* call failing. Repeated restart kicks (per-prompt auto-reconnect + supervisor) spawned duplicates without reaping stale ones.
... [+5842 chars truncated]

### User | 2026-06-04T03:31:54.225Z

[tool_result] 1	---
2	name: reference-mcp-sdk-single-transport-invariant-2026-05-25
3	description: "MCP SDK McpServer.connect() can only bind ONE transport. Stateful session-pool needs new McpServer per session (factory), not per-request server.connect on a singleton. Discovered 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter 2) implementing MCP-DISCONNECT-FIX. Spec diagnosis correct; first implementation 
... [+10512 chars truncated]

### User | 2026-06-04T03:31:55.341Z

[tool_result] 1	---
2	name: prism-task-always-active-hardening-2026-05-31
3	description: "13 of 23 PRISM scheduled tasks (reapers/monitors/janitors) ran logon=Interactive → DIED at user logoff. golf converted all to S4U + restart-3x + battery/idle gates cleared, and added a self-healing 'PRISM Task Hardener' (every 6h)."
4	type: reference
5	source: prism-memory
6	synced: 2026-06-04T03:15:08.082Z
7	aliases: refe
... [+4382 chars truncated]

### User | 2026-06-04T03:32:08.268Z

[tool_result] ed9b295fbf [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-LATHE-ACCURACY-MS0]/U-LATHE-ADAPTER-BIND (slot:whiskey): bind lathe domain adapter in PipelineHarnessAdaptersEngine — makeLatheAdapter wraps TurningPrintToProgramEngine.runPipeline into the canonical 6-stage harness shape (tool_id handoff invariant), isBound('lathe')->true, devDispatcher gate now isBound-driven (lathe live from MCP). Unblocks hea
... [+1486 chars truncated]

### Assistant | 2026-06-04T03:32:11.310Z

These three are the keystone memories. Now let me read the wiki architecture files and find the supervisor-persistence + capacity-spec entries, plus get the relevant git commits with proper grep.

### Assistant | 2026-06-04T03:32:12.319Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:12.801Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:13.212Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:15.099Z

[tool_use: Bash]

### User | 2026-06-04T03:32:27.813Z

[tool_result] 1	---
2	title: MCP Concurrency Fix — fresh McpServer per /mcp request
3	type: architecture
4	status: shipped
5	shipped: 2026-05-31
6	commit: 1297b0a8f5
7	slot: golf
8	related: [[reference_mcp_sdk_single_transport_invariant_2026_05_25]], [[reference_mcp_server_3100_crash_fix_2026_05_22]], [[reference_mcp_supervisor_persistence_fix_2026_05_31]]
9	---
10	
11	# MCP Concurrency Fix (U-MCP-FACTORY-REFAC
... [+3575 chars truncated]

### User | 2026-06-04T03:32:27.816Z

[tool_result] 1	---
2	title: Design spec — MCP-CAPACITY-MS0 (permanent fix for MCP drops at 30-chat scale)
3	type: architecture
4	node_id: ghost.spec.mcp-capacity-ms0
5	parent_layer: L8
6	kind: design-spec
7	spec_file: state/shared/specs/MCP-CAPACITY-MS0.md
8	status: ghost
9	deferred: true
10	generated_by: claude-9e91d800 (slot:golf /loop iter4)
11	last_verified: 2026-05-25
12	tags: [architecture, mcp, capacity
... [+7714 chars truncated]

### User | 2026-06-04T03:32:27.842Z

[tool_result] 1	---
2	title: MCP Auto-Reconnect (MCP-AUTORECONNECT-MS0)
3	type: architecture
4	status: shipped
5	owner: alpha (token-optimization / fleet-reliability)
6	created: 2026-05-31
7	tags: [mcp, connectivity, fleet, self-healing, single-flight, reliability]
8	---
9	
10	# MCP Auto-Reconnect — fleet self-heals MCP connectivity each turn
11	
12	Operator rule (2026-05-31): *"if any chat slot is disconnected
... [+5188 chars truncated]

### User | 2026-06-04T03:33:34.274Z

[tool_result] ed9b295fbf [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WHISKEY-LATHE-ACCURACY-MS0]/U-LATHE-ADAPTER-BIND (slot:whiskey): bind lathe domain adapter in PipelineHarnessAdaptersEngine — makeLatheAdapter wraps TurningPrintToProgramEngine.runPipeline into the canonical 6-stage harness shape (tool_id handoff invariant), isBound('lathe')->true, devDispatcher gate now isBound-driven (lathe live from MCP). Unblocks hea
... [+2599 chars truncated]

### Assistant | 2026-06-04T03:33:39.422Z

Two more very recent commits surfaced: `0ba1fa1d5b` and `ae8da465d2` (MCP-ALWAYS-CONNECTED-MS0, golf) — these are net-new since the last regression entry. Let me read the supervisor-persistence + crash-fix memories and find what MCP-ALWAYS-CONNECTED-MS0 shipped, plus check for the staged FIX1-6 / port-lock work referenced in the leak memory.

### Assistant | 2026-06-04T03:33:42.300Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:33:43.210Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:33:43.211Z

[tool_use: Glob]

### User | 2026-06-04T03:35:06.503Z

[tool_result] 87c40bdba6 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-DOCUSTRATA-VARIANCE (slot:charlie): docustrata quote-execution variance (freshness-preflight, advisory-only, units-clean per-line) + 9 tests
0ba1fa1d5b [MAIN] [MCP-ALWAYS-CONNECTED-MS0]/U-WATCHDOG-BOOTGUARD (slot:golf): watchdog BOOTING guard — defer escalation while a peer is mid-boot (default-OFF, inert)
ae8da465d2 [MAIN] [MCP
... [+1988 chars truncated]

### User | 2026-06-04T03:35:45.190Z

[tool_result] knowledge\memories\reference\reference_mcp_connectivity_check_wire_2026_05_24.md
knowledge\memories\reference\reference_mcp_oom_heap_bump_2026_05_23.md
knowledge\memories\reference\reference_mcp_route_takeup_window_extend_2026_05_26.md
knowledge\memories\reference\reference_mcp_fleet_scale_fix_2026_05_29.md
knowledge\memories\reference\reference_mcp_metrics_observability_2026_05_30.md
knowledge\me
... [+396 chars truncated]

### User | 2026-06-04T03:35:45.391Z

[tool_result] state\shared\specs\MCP-CAPACITY-MS0.md
state\shared\specs\MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md

### Assistant | 2026-06-04T03:35:53.733Z

Now I have the full commit chain. Let me read the remaining key memories to capture the full prior-art: fleet-scale fix, orphan-server leak, supervisor persistence, crash fix, OOM heap bump, and the connectivity-check wire.

### Assistant | 2026-06-04T03:35:54.632Z

[tool_use: Read]

### Assistant | 2026-06-04T03:35:55.315Z

[tool_use: Read]

### Assistant | 2026-06-04T03:35:55.580Z

[tool_use: Read]

### Assistant | 2026-06-04T03:35:56.011Z

[tool_use: Read]

### Assistant | 2026-06-04T03:35:56.575Z

[tool_use: Read]

### User | 2026-06-04T03:36:14.511Z

[tool_result] 1	---
2	name: reference_mcp_fleet_scale_fix_2026_05_29
3	description: Fleet 26-chat MCP-disconnect + slash-command-starvation root cause + the fix set applied (prism_safe drop, probe fix, command sync, tsserver cap) vs deferred (rebuild/watchdog/limiter/narrowing → golf)
4	type: reference
5	source: prism-memory
6	synced: 2026-06-04T03:14:31.378Z
7	aliases: reference_mcp_fleet_scale_fix_2026_05_29

... [+2743 chars truncated]

### User | 2026-06-04T03:36:17.478Z

[tool_result] 1	---
2	name: mcp-supervisor-persistence-fix-2026-05-31
3	description: "Permanent fix for MCP :3100 going unsupervised — the PRISM MCP Server supervisor task was fire-once (Boot/Logon) and died LastResult=2 on 05/29, so nothing relaunched the supervisor. golf added a 3-min repeating trigger + patched the installer."
4	type: reference
5	source: prism-memory
6	synced: 2026-06-04T03:14:31.385Z
7	alia
... [+3130 chars truncated]

### User | 2026-06-04T03:36:17.846Z

[tool_result] 1	---
2	name: reference_mcp_orphan_server_leak_2026_05_29
3	description: "MCP disconnected + slash commands not appearing" was NOT a dead server — it was 16 orphaned dist/index.js servers (~12GB, dead parents) starving the box so the live server couldn't answer the 1s HEAD probe
4	type: reference
5	source: prism-memory
6	synced: 2026-06-04T03:14:31.381Z
7	aliases: reference_mcp_orphan_server_leak_
... [+2276 chars truncated]

### User | 2026-06-04T03:36:17.943Z

[tool_result] 1	---
2	name: reference-mcp-server-3100-crash-fix-2026-05-22
3	description: Root-cause + fix for "chat slots exit out of the prism MCP server" — the shared :3100 HTTP MCP server crashed on 2 Node-22 ESM import bugs, and its supervisor scheduled task was un-installable due to a 3rd encoding bug in the installer
4	aliases: reference_mcp_server_3100_crash_fix_2026_05_22
5	type: reference
6	source: pr
... [+5904 chars truncated]

### User | 2026-06-04T03:36:19.215Z

[tool_result] 1	---
2	name: reference-mcp-oom-heap-bump-2026-05-23
3	description: MCP HTTP server at :3100 was OOM-killed every ~14 min (exit code 0xFFFFFFFF) because Node 22 default heap (~1.5GB) was hit by accumulated retained refs from peer chats' constant prism_guard:error_ledger_recall_similar calls. Fix: supervisor spawnChild() now injects NODE_OPTIONS=--max-old-space-size=4096 (4GB) to push the OOM horiz
... [+4127 chars truncated]

### Assistant | 2026-06-04T03:36:23.695Z

I now have the complete prior-art chain. Let me verify two final things: that the factory refactor (1297b0a8f5) and bind-fail-fast (2167e22cc8) are actually deployed in the live `dist/` and current `src/index.ts`, and check the MCP-ALWAYS-CONNECTED-MS0 boot-guard state (the memory says staged FIX4/6 unified single-flight lock was "not yet shipped").

### Assistant | 2026-06-04T03:36:27.547Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:36:28.366Z

[tool_use: Read]

### User | 2026-06-04T03:36:35.316Z

[tool_result] 1	---
2	name: reference-mcp-route-takeup-window-extend-2026-05-26
3	description: Take-rate jumped from 0.2% to expected ~10-30% by widening mcp-route-takeup's correlation window from 60s to 600s. 60s cut off legitimate take-ups mid-thinking (Read+Edit+subagent before prism_*:*).
4	metadata:
5	  type: reference
6	---
7	
8	# mcp-route-takeup window extend (2026-05-26, slot alpha, iter2)
9	
10	**Prob
... [+2261 chars truncated]

### User | 2026-06-04T03:37:06.704Z

[tool_result] === src has buildRequestServer (factory shipped) ===
4
=== src has bind-failfast preflight ===
mcp-server/src/index.ts:6
=== dist build age vs src ===
-rw-r--r-- 1 wompu 197611 8429763 2026-06-03_15:35 mcp-server/dist/index.js
-rw-r--r-- 1 wompu 197611   65047 2026-06-02_20:21 mcp-server/src/index.ts

### Assistant | 2026-06-04T03:38:22.639Z

Verified everything. The factory refactor (`buildRequestServer`, 4 refs) and bind-fail-fast preflight (6 refs) are both live in `src/index.ts`, and `dist/index.js` was rebuilt 2026-06-03 15:35 — newer than the src (2026-06-02 20:21), so the deployed binary contains both. The unified `mcp-server-3100.lock` is NOT present anywhere (staged FIX4/6 never shipped — confirms the leak memory's note). I have the complete prior-art picture.

---

# MCP-Drop Prior Art — Chronological Mining Report (golf, 2026-06-03)

## Chronological prior-art table

| Date | What was tried | Commit / Memory | Did the drop PERSIST after? |
|------|---------------|-----------------|------------------------------|
| **05-22** | **3 startup-crash bugs fixed** (lima): ESM extensionless imports (`ERR_MODULE_NOT_FOUND` on first `prism_toolpath` lazy-load → took :3100 down for all chats); bare JSON import missing `with{type:json}` (crashed HTTP-transport boot); installer em-dash/no-BOM encoding broke task registration. | `reference_mcp_server_3100_crash_fix_2026_05_22` (`[MCP-CONNECTIVITY-FIX]` ×2) | **YES** — fixed the crash-on-action class, but supervision tasks weren't installed; drops continued from OOM. |
| **05-23** | **OOM heap bump** (kilo): server OOM-killed (`0xFFFFFFFF`) every ~14 min — Node 22 default ~1.5GB heap hit by retained refs from peer `prism_guard:error_ledger_recall_similar` calls. Supervisor `spawnChild()` injects `NODE_OPTIONS=--max-old-space-size=4096`. | `reference_mcp_oom_heap_bump_2026_05_23` (MCP-OOM-FIX/U-SUPERVISOR-HEAP-BUMP) | **YES (mitigation only)** — pushed OOM horizon ~10× (14min→multi-hour). Explicitly flagged: NOT the leak fix. True leak (ref-retention) + watchdog RSS-probe + rate-limit left as follow-ups. |
| **05-23** | **Watchdog preemptive RSS restart** at 3GB (the "3GB threshold" in your ground truth). | MCP-OOM-FIX/U-WATCHDOG-MEM-PROBE | **YES** — catches OOM before kernel kill, but each restart = ~3-5s dropped requests = a *drop event* by itself. This is 
... [+10847 chars truncated]
