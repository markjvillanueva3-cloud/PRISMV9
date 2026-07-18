---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "You are synthesizing a DURABLE \"MCP server stays connected for all chats no matt"
date: "2026-06-03"
first_ts: "2026-06-03T00:47:52.894Z"
last_ts: "2026-06-03T00:51:06.412Z"
cwd: "H:\\prism-slot-golf"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a69c864d7fec8c4b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# You are synthesizing a DURABLE "MCP server stays connected for all chats no matt

> **claude-code-cli** | 2026-06-03 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_d96659e3-ff9/agent-a69c864d7fec8c4b8.jsonl`

## Transcript

### User | 2026-06-03T00:47:52.894Z

You are synthesizing a DURABLE "MCP server stays connected for all chats no matter what" design from 5 architecture-mapping findings. The system is PRISM (manufacturing-intelligence MCP server, HTTP :3100, up to 26 concurrent Claude chats + an Obsidian app + a Hermes agent-fleet app, all MCP clients).

FINDINGS (JSON):
[
  {
    "facet": "MCP SERVER SUPERVISION LAYER: Port Binding, Lock Coordination, and Restart Orchestration",
    "currentState": "MCP Server Launch & Port Binding: Entry `H:/prism/mcp-server/dist/index.js` (from `src/index.ts`); HTTP on `127.0.0.1:3100`; cold boot ~50s, ~700MB RSS at peak. Port binding code (index.ts 944–1311): Preflight probe (FIX 2, lines 944–966, golf 2026-06-02) via net.createServer() listen; if EADDRINUSE, exit(0) before bootstrapServices(); Express app.listen() with error handler (FIX 1, lines 1304–1311) catches EADDRINUSE, exits cleanly(0); other errors exit(1) for supervisor retry. Health endpoints: GET /health (2xx/3xx healthy, 5xx degraded), GET /ready (stricter, canary dispatcher import), GET /metrics, POST /mcp (JSON-RPC). THREE UNCOORDINATED RESTARTERS: (1) Supervisor (mcp-server-supervisor.mjs, lines 1–328): Primary long-running loop launched by Windows Scheduled Task \"PRISM MCP Server\"; Triggers AtStartup, AtLogon, RepetitionInterval 3min (golf 2026-05-31). Entry dist/index.js with TRANSPORT=http PORT=3100 HOST=127.0.0.1. Idempotent health probe startup (301–305); PID lock O_EXCL (313–315) at H:/prism/mcp-server/data/state/server-supervisor.pid; spawnChild() with exponential backoff respawn (5s→60s cap). On child exit (229–256): if exit(0)+uptime<60s (bind-fail-fast), probe /health; if healthy peer owns port, stand down exit(0), else respawn; other exits spawn with backoff. Knobs: PRISM_MCP_SUPERVISOR_DISABLE, PRISM_MCP_SERVER_PORT/HOST, backoff/uptime tunables. (2) Watchdog (mcp-server-watchdog.mjs, lines 1–303): 5-min periodic wedge detector launched by Windows Scheduled Task \"PRISM MCP Server Watchdog\"; Trigger
... [+94781 chars truncated]

### Assistant | 2026-06-03T00:48:07.021Z

I'll analyze the five findings to synthesize the always-connected design. Let me verify the key load-bearing assets before producing the structured output.

### Assistant | 2026-06-03T00:48:10.426Z

[tool_use: Bash]

### User | 2026-06-03T00:48:19.143Z

[tool_result] -rwxr-xr-x 1 wompu 197611  9422 Jun  1 22:44 H:/prism/.claude/hooks/mcp-connectivity-check.mjs*
-rw-r--r-- 1 wompu 197611     5 Jun  2 17:43 H:/prism/mcp-server/data/state/server-supervisor.pid
-rwxr-xr-x 1 wompu 197611 13307 May 31 17:03 H:/prism/scripts/lib/mcp-reconnect-action.mjs*
-rwxr-xr-x 1 wompu 197611 12116 Jun  2 09:55 H:/prism/scripts/mcp-server-supervisor.mjs*
-rwxr-xr-x 1 wompu 197611
... [+292 chars truncated]

### Assistant | 2026-06-03T00:48:22.446Z

Confirmed: no unified 3100 lock exists yet; the three restarters and the reconnect lock are present. Let me inspect the reconnect-action lib (the staged FIX4/6 substrate) and the supervisor spawn point to ground the topRecommendation in exact code.

### Assistant | 2026-06-03T00:48:24.434Z

[tool_use: Bash]

### User | 2026-06-03T00:48:33.215Z

[tool_result] 21://   • single-flights across the whole fleet via an O_EXCL lockfile whose TTL doubles as the
26://   • PURE decision core (`decideReconnect`) + injected-deps orchestrator (`maybeReconnect`)
31:// Knobs: PRISM_MCP_AUTORECONNECT_DISABLE=1 (off), PRISM_MCP_AUTORECONNECT_TTL_MS=N
41:export const DEFAULT_DAEMON_HELPER = process.env.PRISM_MCP_DAEMON_HELPER
43:export const DEFAULT_LOCK_PATH = `${PRISM
... [+2317 chars truncated]

### Assistant | 2026-06-03T00:48:37.220Z

I have the exact API surface. The `mcp-reconnect-action.mjs` lib already has the lock primitive (`acquireReconnectLock` O_EXCL), a pure decision core (`decideReconnect`), and a probe (`probeDaemon`). This is the substrate to extend, not rebuild. Let me confirm the supervisor's spawn point and the watchdog's escalation point to anchor the BOOTING guard wiring.

### Assistant | 2026-06-03T00:48:39.681Z

[tool_use: Bash]

### User | 2026-06-03T00:48:46.728Z

[tool_result] 11: *   - On launch: probe /health. If already up → log "already running" and
48:const HEALTH_URL = `http://${SERVER_HOST}:${SERVER_PORT}/health`;
105:function acquirePidLock() {
143:function probeHealth(timeoutMs = 5000) {
186:  respawnTimer = setTimeout(() => { respawnTimer = null; spawnChild(); }, delay);
191:function spawnChild() {
194:  const startedAt = Date.now();
230:    const uptimeMs = D
... [+2557 chars truncated]

### Assistant | 2026-06-03T00:48:50.962Z

I now have the exact anchor points. The watchdog already has a `/health` endpoint read that surfaces `memory.rss_mb` — meaning the server's `/health` JSON is the natural place to add a `bootStartedAt`/`bootingMs` field, which is the cleanest, most robust BOOTING signal (better than the implicit "process-exists" rule). Let me confirm the `/health` endpoint shape in index.ts so the topRecommendation names the exact field to add.

### Assistant | 2026-06-03T00:48:52.769Z

[tool_use: Bash]

### User | 2026-06-03T00:49:00.362Z

[tool_result] 419:// startup event) against the shared server (still needed for REST routes + /health + bridge).
522: * Safe to call ONCE on the shared server (REST + /health + bridge) AND repeatedly
982:  app.get("/health", async (_, res) => {
984:    const uptime = process.uptime();
985:    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
998:    const healthy = totalEntries > 0 && heapUsedMB <
... [+1871 chars truncated]

### Assistant | 2026-06-03T00:49:07.773Z

I now have everything needed. The `/health` endpoint at index.ts:982-1010 already returns a JSON object with `status`, `uptime_seconds`, and `memory`. The cleanest BOOTING signal is additive: the `/health` handler is reachable the moment Express binds (~line 982 runs after listen), but the registries take ~50s to fill — during that window `totalEntries===0` returns `status:"degraded"`. The robust fix is a shared `isBooting(probeResult)` helper plus a unified port lock, both extending existing assets.

Key architectural insight: the load-bearing BOOTING distinction can be sourced two ways — (a) the implicit "process exists + /health != 200 + lock.bootStartedAt < 90s" rule (lock-file-based, no server change, ships now), or (b) a `phase:"booting"` field added to `/health` JSON (server change, needs 3-of-3 on critical file). The safe-to-ship-now path is (a), reading from the unified lock. Let me produce the structured output.

### Assistant | 2026-06-03T00:50:54.515Z

[tool_use: StructuredOutput]

### User | 2026-06-03T00:50:55.057Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-03T00:51:06.412Z

I've delivered the structured synthesis. The always-connected design is complete and grounded in the verified asset inventory.

Summary of the synthesis:

The load-bearing fix is coordinating the three uncoordinated restarters (watchdog task + supervisor + per-chat reconnect hook) through ONE unified single-flight lock (`.mcp-server-3100.lock`) plus a BOOTING guard that never restarts a process that exists-but-is-not-yet-healthy. This directly kills both verified root causes — the N-instance bind-race pileup and the boot-reset flap.

The entire fix extends existing assets rather than rebuilding: `mcp-reconnect-action.mjs` already ships the O_EXCL lock primitive (`acquireReconnectLock`), the pure decision core (`decideReconnect`), the probe, the detached spawn, and the fail-soft orchestrator — all 30/30 tested. The fix is roughly +1 lock file, +1 generalized predicate branch, +3 callsite reads, +1 supervisor stamp.

The first implementation step is both safe-to-ship-now and highest-leverage: add `BOOT_GRACE_MS = 90000` + a `peer-booting` branch to the pure `decideReconnect` in `H:/prism/scripts/lib/mcp-reconnect-action.mjs`, with matching tests. It is pure, additive, changes zero runtime behavior until a restarter opts in, and is the predicate every later step depends on — so golf cannot break the live :3100 server it is hardening.

Obsidian needs no MCP wiring (file-coupled, never calls :3100). Hermes is dispatcher-wired into the server itself, so its connection guarantee IS the unified lock; the only Hermes-specific add is making its scheduled callers probe `/ready` and defer-on-DOWN instead of failing.

The critical-file edit (adding `phase:'booting'` to `/health` in `index.ts`) is correctly sequenced LAST behind a 3-of-3 scrutiny gate — it is the most robust long-term signal but the highest-risk change, so it must not be pulled forward.
