---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Read H:/prism/scripts/mcp-server-supervisor.mjs end to end. How does it spawn, m"
date: "2026-06-02"
first_ts: "2026-06-02T14:07:13.482Z"
last_ts: "2026-06-02T14:10:23.539Z"
cwd: "H:\\prism-slot-golf"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-aa6c8e954b393a24a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Read H:/prism/scripts/mcp-server-supervisor.mjs end to end. How does it spawn, m

> **claude-code-cli** | 2026-06-02 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-aa6c8e954b393a24a.jsonl`

## Transcript

### User | 2026-06-02T14:07:13.482Z

Read H:/prism/scripts/mcp-server-supervisor.mjs end to end. How does it spawn, monitor, health-check, and restart the MCP server (node mcp-server/dist/index.js on :3100)? Does it enforce a SINGLETON (reap stale dist/index.js before spawning a new one)? Does it use a port lock / O_EXCL / pidfile? What triggers a restart and could that cause a spawn storm under load?

Return a CONCISE plain-text report (<=30 lines, NO JSON). Cover: (a) current behavior in 3-5 bullets, (b) specific gaps under high concurrency / restart-storms — focus on the failure we just hit: 11 'node dist/index.js' instances piled up racing to bind :3100, hung at ~700MB each instead of exiting, fleet-wide connect failures, (c) 2-3 concrete hardening changes as file:function -> change. Be exact about file paths, function names, and line areas. Do NOT paste large code blocks; cite line ranges.

### Assistant | 2026-06-02T14:07:47.455Z

I'll read the supervisor file end to end first.

### Assistant | 2026-06-02T14:07:47.999Z

[tool_use: Read]

### User | 2026-06-02T14:08:41.124Z

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
... [+11351 chars truncated]

### Assistant | 2026-06-02T14:08:45.292Z

I have the full file. Let me check the server entry's bind behavior to confirm what happens when 11 instances race for :3100, since the supervisor's gaps depend on whether the child exits on EADDRINUSE.

### Assistant | 2026-06-02T14:08:47.349Z

[tool_use: Grep]

### User | 2026-06-02T14:09:22.176Z

[tool_result] H:\prism\mcp-server\src\bot\webhook-receiver.ts:110:    req.on('error', reject);
H:\prism\mcp-server\src\bot\webhook-receiver.ts:293:  server.listen(listenPort, webhookHost, () => {
H:\prism\mcp-server\src\index.ts:1265:  const httpServer = app.listen(port, host, () => {
H:\prism\mcp-server\src\cli\stdin.ts:36:    process.stdin.on("error", () => {
H:\prism\mcp-server\src\cache\RedisCacheProvider.t
... [+3876 chars truncated]

### Assistant | 2026-06-02T14:09:25.419Z

Let me check the server's `app.listen` at index.ts:1265 to see if it handles EADDRINUSE — this determines whether racing children exit or hang.

### Assistant | 2026-06-02T14:09:26.104Z

[tool_use: Read]

### User | 2026-06-02T14:10:00.252Z

[tool_result] 1255	    });
1256	
1257	    log.info(`[WEB] Serving built frontend from ${frontendDistDir}`);
1258	  } else {
1259	    log.warn(`[WEB] Built frontend not found at ${frontendDistDir}; HTTP mode serving API only`);
1260	  }
1261	  
1262	  const port = parseInt(process.env.PORT || "3000", 10);
1263	  // R6: Bind to localhost by default; set PRISM_BIND_HOST=0.0.0.0 for Docker/network exposure
1264	  c
... [+1670 chars truncated]

### Assistant | 2026-06-02T14:10:23.539Z

Confirmed the critical gap: `app.listen(port, host, ...)` at index.ts:1265 has NO `.on('error')` handler, so an EADDRINUSE on a racing instance is an uncaught exception path, and the long async bootstrap before `listen` is what lets instances pile at ~700MB before ever reaching the bind. This is the root failure mode.

MCP-SUPERVISOR singleton/spawn-storm analysis — H:/prism/scripts/mcp-server-supervisor.mjs

(a) Current behavior
- Singleton scope is SUPERVISOR-ONLY, not server: acquirePidLock (L105-132) O_EXCL-creates server-supervisor.pid (L50) and refuses a second SUPERVISOR if its PID is alive (L114). It never enumerates/reaps stray `node dist/index.js` children — there is NO server-process singleton, NO port lock, NO child pidfile.
- Spawn: spawnChild (L176-232) launches `node dist/index.js` with TRANSPORT=http PORT=3100 HOST=127.0.0.1 and --max-old-space-size=4096 (L190). Idempotency is a single /health probe at startup only (main L273-277).
- Health-check is one-shot at boot (probeHealth L143-163); there is NO recurring liveness loop — once spawned, the supervisor only reacts to child `exit` (L214), never to a hung-but-alive child.
- Restart trigger = child `exit` event only (L214-228): exponential backoff 5s→60s cap, reset after 60s stable uptime. SIGKILL fallback on shutdown (L244-249).

(b) Gaps that produced the 11-instance / :3100 race / ~700MB-hung pileup
- No server-side singleton + no recurring health gate: each scheduled-task fire / manual run only probes /health ONCE. If the server is mid-boot (not yet listening) the probe returns down and a fresh child is spawned — N concurrent supervisor launches ⇒ N children all racing :3100.
- The decisive defect is in the SERVER, not the supervisor: index.ts:1265 `app.listen(port, host)` has NO `.on('error')` / EADDRINUSE handler. The loser of the bind race does not exit — it has already completed the heavy bootstrap (DI graph, engine registration, ~700MB RSS) before reaching listen, so it sits resident instead
... [+1315 chars truncated]
