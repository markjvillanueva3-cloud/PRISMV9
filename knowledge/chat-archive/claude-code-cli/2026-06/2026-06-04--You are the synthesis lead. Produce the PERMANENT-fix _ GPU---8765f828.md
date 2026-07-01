---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are the synthesis lead. Produce the PERMANENT-fix + GPU-improvement build pl"
date: "2026-06-04"
first_ts: "2026-06-04T03:43:23.335Z"
last_ts: "2026-06-04T03:46:43.343Z"
cwd: "H:\\PRISM"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a3ab5526fe69c2df0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are the synthesis lead. Produce the PERMANENT-fix + GPU-improvement build pl

> **claude-code-cli** | 2026-06-04 | 12 msgs (5 user / 7 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a3ab5526fe69c2df0.jsonl`

## Transcript

### User | 2026-06-04T03:43:23.335Z

You are the synthesis lead. Produce the PERMANENT-fix + GPU-improvement build plan for the recurring MCP-server drop on a 96GB-Blackwell box. 
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
- Ollama serve is now a scheduled task (PRISM Ollama Serve, Normal priori
... [+52603 chars truncated]

### Assistant | 2026-06-04T03:43:35.208Z

I'll produce the synthesis. Let me first verify the two load-bearing facts the plan hinges on — that `dist/` is rebuilt (fix deployed) and the current per-request `bindDispatchers` cost — then write the build plan.

### Assistant | 2026-06-04T03:43:38.491Z

[tool_use: Bash]

### Assistant | 2026-06-04T03:43:41.362Z

[tool_use: Bash]

### User | 2026-06-04T03:44:12.543Z

[tool_result] 2026-06-02 20:21:54.608302400 -0500 mcp-server/src/index.ts
2026-06-03 15:35:34.930687900 -0500 mcp-server/dist/index.js
---supervisor heap---
205:  const heapFlag = "--max-old-space-size=4096";
206:  const nextNodeOpts = existingNodeOpts.includes("--max-old-space-size")
---watchdog RSS---
34: *   PRISM_MCP_WATCHDOG_BOOTGUARD=1      enable the BOOTING guard (default OFF) — defer escalation
63:// P
... [+867 chars truncated]

### User | 2026-06-04T03:44:13.087Z

[tool_result] ===buildRequestServer + bindDispatchers===
416:// FRESH McpServer per /mcp request (SDK stateless pattern). bootstrapServices() runs the
420:let _bootstrapped = false;
421:let _postBindDone = false;
439:async function bootstrapServices(): Promise<void> {
440:  if (_bootstrapped) return;
441:  _bootstrapped = true;
523: * on fresh per-request servers built by buildRequestServer(). The temporary
527
... [+1211 chars truncated]

### Assistant | 2026-06-04T03:44:16.682Z

Verified. Now let me confirm the per-request cost claim (Cause A) — whether `buildRequestServer` truly re-runs the full ~7,244-action `bindDispatchers` registration on every POST, or if there's already a cache.

### Assistant | 2026-06-04T03:44:17.724Z

[tool_use: Read]

### Assistant | 2026-06-04T03:44:18.357Z

[tool_use: Read]

### User | 2026-06-04T03:44:30.439Z

[tool_result] 892	 * via the _postBindDone guard (already run on the shared server). A fresh server per request
893	 * is what eliminates the "Already connected to a transport" collision under concurrency —
894	 * each request owns its own McpServer + transport, so server.connect() never contends.
895	 */
896	async function buildRequestServer(): Promise<McpServer> {
897	  const s = new McpServer({ name: SERVER_
... [+1416 chars truncated]

### User | 2026-06-04T03:44:31.370Z

[tool_result] 1190	      metrics.recordTool(_tool, Date.now() - _m0, _ok);
1191	    });
1192	    res.on("close", () => metrics.decInflight());
1193	
1194	    const transport = new StreamableHTTPServerTransport({
1195	      sessionIdGenerator: undefined,
1196	      enableJsonResponse: true
1197	    });
1198	
1199	    // MCP-CONCURRENCY-FIX (2026-05-31): build a FRESH McpServer per request instead of
1200	    // 
... [+1476 chars truncated]

### Assistant | 2026-06-04T03:46:43.343Z

Confirmed all load-bearing facts. The diagnosis holds: `bindDispatchers(s)` runs unconditionally on every `/mcp` POST with zero caching, `dist/` is fresh (fix deployed), BOOTGUARD is default-OFF, RSS threshold is 3072, supervisor heap is 4096, and no priority guardian exists. Writing the synthesis now.

---

# PERMANENT MCP-Drop Fix + GPU-Improvement Build Plan
**DESKTOP-N7MI1VB (96GB RTX PRO 6000 Blackwell, Ryzen 7 7800X3D 16-thread, 127GB RAM) — golf, 2026-06-03**

Verified live ground truth before writing: `dist/index.js` rebuilt 2026-06-03 15:35 (newer than `src/index.ts` 2026-06-02 20:21 → the `1297b0a8f5` factory + `2167e22cc8` bind-fail-fast fixes ARE deployed). `bindDispatchers(s)` runs on **every** `/mcp` POST with no cache (index.ts:898 inside `buildRequestServer`, called at :1205 per request). Watchdog `RSS_THRESHOLD_MB=3072`, `BOOTGUARD` default-OFF (:69, :314). Supervisor heap `4096` (:205). No `mcp-priority-guardian.ps1` on disk. `ollama-cpu-throttle.ps1` present (the failed prior art). Host-presets file exists.

---

## 1. Root-cause ranking (what causes drops NOW, post-shipped-fixes)

| Rank | Cause | Mechanism → "MCP DISCONNECTED" | Confidence | Patched? |
|------|-------|-------------------------------|------------|----------|
| **1** | **Per-request `bindDispatchers()` CPU tax** | Every `/mcp` POST runs `buildRequestServer()` → `bindDispatchers(s)` (index.ts:898) re-registering ~90 dispatchers / ~7,244 actions + wrapping each in the universal-hook proxy, **synchronously on the single event loop**, with zero caching. Under 201 `/loop` sessions this is thousands of full re-registrations/sec → loop blocks → `/health` & in-flight calls exceed timeout → watchdog ETIMEDOUT → kill+respawn. The `1297b0a8f5` fix traded a *concurrency crash* for a *per-request CPU tax*. | **HIGH** | **NO** — new dominant cause |
| **2** | **CPU event-loop starvation + priority inversion** | 100% aggregate CPU (201 sessions + Obsidian + MsMpEng + ollama). MCP at Normal; olla
... [+20644 chars truncated]
