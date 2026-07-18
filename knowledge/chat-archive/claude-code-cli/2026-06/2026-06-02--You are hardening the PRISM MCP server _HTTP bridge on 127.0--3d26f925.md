---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "You are hardening the PRISM MCP server (HTTP bridge on 127.0.0.1:3100) so it sur"
date: "2026-06-02"
first_ts: "2026-06-02T14:16:50.282Z"
last_ts: "2026-06-02T14:19:36.188Z"
cwd: "H:\\prism-slot-golf"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a2d10ca27180c7914.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# You are hardening the PRISM MCP server (HTTP bridge on 127.0.0.1:3100) so it sur

> **claude-code-cli** | 2026-06-02 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_e45e5839-3e2/agent-a2d10ca27180c7914.jsonl`

## Transcript

### User | 2026-06-02T14:16:50.282Z

You are hardening the PRISM MCP server (HTTP bridge on 127.0.0.1:3100) so it survives a fleet-wide load surge: assume all 26 chats simultaneously launch Workflows that spawn sub-agents, all making mcp__prism__* calls. We JUST recovered from a failure where 11 'node dist/index.js' instances leaked (~7.8GB) racing to bind :3100, causing flapping + fleet-wide connect failures.

From the reader findings below, produce a CONCRETE, dependency-ordered hardening plan. For EACH change give: file path, function/area, and the exact change (plain text, small snippets ok). Prioritize:
1. SINGLETON GUARD — never >1 dist/index.js bound to :3100; reap stale instances before spawn (supervisor + reconnect hook + watchdog must share one guard).
2. BIND-RACE FAIL-FAST — on EADDRINUSE the server must exit immediately, NOT load engines then hang at 700MB.
3. LOAD CAPACITY — handle high concurrent request volume without RSS-driven flap (concurrency limits, graceful SIGTERM drain on restart, sane RSS threshold so a load spike doesn't trigger a kill loop).
Flag which changes are LOW-RISK (safe to ship while keeping :3100 up) vs HIGHER-RISK (need careful staged rollout). Keep it under 60 lines.

FINDINGS:

Confirmed the critical gap: `app.listen(port, host, ...)` at index.ts:1265 has NO `.on('error')` handler, so an EADDRINUSE on a racing instance is an uncaught exception path, and the long async bootstrap before `listen` is what lets instances pile at ~700MB before ever reaching the bind. This is the root failure mode.

MCP-SUPERVISOR singleton/spawn-storm analysis — H:/prism/scripts/mcp-server-supervisor.mjs

(a) Current behavior
- Singleton scope is SUPERVISOR-ONLY, not server: acquirePidLock (L105-132) O_EXCL-creates server-supervisor.pid (L50) and refuses a second SUPERVISOR if its PID is alive (L114). It never enumerates/reaps stray `node dist/index.js` children — there is NO server-process singleton, NO port lock, NO child pidfile.
- Spawn: spawnChild (L176-232) launches `node dist/in
... [+14270 chars truncated]

### Assistant | 2026-06-02T14:17:05.903Z

I'll review the key source locations to ground the plan in the actual code before producing it.

### Assistant | 2026-06-02T14:17:06.858Z

[tool_use: Read]

### Assistant | 2026-06-02T14:17:07.524Z

[tool_use: Read]

### User | 2026-06-02T14:18:01.506Z

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
... [+3971 chars truncated]

### User | 2026-06-02T14:18:02.288Z

[tool_result] 38	
39	const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
40	
41	export const DEFAULT_DAEMON_HELPER = process.env.PRISM_MCP_DAEMON_HELPER
42	  || `${PRISM_ROOT}/.claude/helpers/mcp-server-daemon.mjs`;
43	export const DEFAULT_LOCK_PATH = `${PRISM_ROOT}/state/shared/.mcp-reconnect.lock`;
44	export const DEFAULT_LOCK_TTL_MS = 60000;     // single-flight + throttle window (≈ daemon warmup budget
... [+7523 chars truncated]

### Assistant | 2026-06-02T14:18:11.636Z

Now let me look at the supervisor spawn/lock area, the daemon start guard, and the watchdog escalate to confirm exact function boundaries.

### Assistant | 2026-06-02T14:18:12.551Z

[tool_use: Read]

### Assistant | 2026-06-02T14:18:13.509Z

[tool_use: Read]

### Assistant | 2026-06-02T14:18:13.690Z

[tool_use: Read]

### User | 2026-06-02T14:19:03.901Z

[tool_result] 40	import fs from "node:fs";
41	import http from "node:http";
42	import path from "node:path";
43	import process from "node:process";
44	
45	const SERVER_ENTRY = "H:/prism/mcp-server/dist/index.js";
46	const SERVER_HOST = process.env.PRISM_MCP_SERVER_HOST || "127.0.0.1";
47	const SERVER_PORT = parseInt(process.env.PRISM_MCP_SERVER_PORT || "3100", 10);
48	const HEALTH_URL = `http://${SERVER_HOST}:$
... [+1768 chars truncated]

### User | 2026-06-02T14:19:04.683Z

[tool_result] 176	function spawnChild() {
177	  if (stopping) return;
178	  log("info", "Spawning MCP server", { entry: SERVER_ENTRY, host: SERVER_HOST, port: SERVER_PORT });
179	  const startedAt = Date.now();
180	  // MCP-OOM-FIX (slot:kilo 2026-05-23): bump heap to 4GB. Server was OOM-
181	  // killed every ~14 min (exit code 0xFFFFFFFF = Windows abnormal kill) at
182	  // RSS 720MB / heap 624/664MB — past N
... [+2516 chars truncated]

### User | 2026-06-02T14:19:05.062Z

[tool_result] 100	
101	async function start() {
102	  // Check if already running
103	  const existingPid = readPid();
104	  if (existingPid && isProcessRunning(existingPid)) {
105	    const healthy = await checkHealth();
106	    if (healthy) {
107	      log(`Daemon already running (PID ${existingPid}), health OK`);
108	      return true;
109	    }
110	    log(`Daemon PID ${existingPid} exists but not healthy, 
... [+1756 chars truncated]

### Assistant | 2026-06-02T14:19:36.188Z

I have confirmed all the exact code locations and function boundaries. Producing the plan.

# PRISM :3100 Hardening Plan — dependency-ordered

Build order rationale: the server-side bind-fail-fast (FIX 1) is the keystone — once a bind-loser exits in <1s instead of hanging at 700MB, the supervisor/hook/watchdog single-flight guards (FIX 4-6) become cleanup, not life-support. Ship 1→3 first; they collapse 11→1 even with today's spawners untouched.

---

**FIX 1 — Server bind-fail-fast [LOW-RISK, ship first]**
File: `mcp-server/src/index.ts` · fn `runHTTP`, at the `app.listen` (L1265).
Change: attach an error handler to the returned server BEFORE/at listen:
```
const httpServer = app.listen(port, host, () => { log.info(`MCP server running on http://${host}:${port}/mcp`); });
httpServer.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { log.warn(`[BIND] :${port} owned by peer — exiting (no leak)`); process.exit(0); }
  log.error('[BIND] listen failed', e); gracefulShutdown('listen-error'); process.exit(1);
});
```
exit(0) on EADDRINUSE (peer owns it = success-for-fleet, no respawn-loop trigger). LOW-RISK: pure additive; the winner is unaffected.

**FIX 2 — Pre-bootstrap port preflight [LOW-RISK, ship first]**
File: `mcp-server/src/index.ts` · fn `runHTTP`, very TOP (before any heavy engine bootstrap ~L800s) and before the `await import(...)` chain.
Change: probe the port with a throwaway listener and exit at ~50MB if taken, BEFORE loading engines:
```
const port = parseInt(process.env.PORT||"3000",10); const host = process.env.PRISM_BIND_HOST||'127.0.0.1';
await new Promise((res)=>{ const probe=net.createServer(); probe.once('error',e=>{ if(e.code==='EADDRINUSE'){ console.error(`[PREFLIGHT] :${port} taken — exit pre-bootstrap`); process.exit(0);} res(); }); probe.once('listening',()=>probe.close(res)); probe.listen(port,host); });
```
This is the cheap loser-kills-itself path (no 30s/700MB waste). Keep FIX 1 too (TOCTOU window between preflight close and real listen 
... [+3069 chars truncated]
