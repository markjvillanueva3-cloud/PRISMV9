---
type: "chat-session"
source: "claude-code-cli"
session_id: "414c2529-cd21-4d95-b81f-eb81280c1006"
title: "You are the synthesis lead for an MCP-server fleet-resilience hardening pass on "
date: "2026-06-04"
first_ts: "2026-06-04T19:19:46.802Z"
last_ts: "2026-06-04T19:20:33.694Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/414c2529-cd21-4d95-b81f-eb81280c1006/subagents/workflows/wf_4bac22d7-23f/agent-a15438307828c45bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# You are the synthesis lead for an MCP-server fleet-resilience hardening pass on 

> **claude-code-cli** | 2026-06-04 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/414c2529-cd21-4d95-b81f-eb81280c1006/subagents/workflows/wf_4bac22d7-23f/agent-a15438307828c45bf.jsonl`

## Transcript

### User | 2026-06-04T19:19:46.802Z

You are the synthesis lead for an MCP-server fleet-resilience hardening pass on PRISM (server at :3100, 26 chats × N subagents concurrent load). Below are 5 subsystem diagnoses. Merge them into a TIGHT, ACTIONABLE build plan. Output EXACTLY these sections, concise (no padding, ~500 words max):

1. RANKED DOWN-MODES (most-likely-to-take-it-down first), each one line with the root cause.
2. ALREADY MITIGATED (do NOT rebuild — R8): bullet list of what existing code already handles, with file refs.
3. TOP 3 FIXES TO SHIP (the highest-ROI, each: file:line · the specific change · a one-line draft of the code/approach · how to test it · risk level low/med/high). These must be the changes that most reduce "server goes down" under fleet+subagent load.
4. FULL DEPENDENCY-ORDERED PLAN (the complete remaining hardening as a numbered list — what to build after the top 3, in logical order, no orphans).
5. ONE-LINE VERDICT: is the dominant down-mode a BOOT/RESTART problem, a CONCURRENCY/backpressure problem, or an OOM problem? (decides what to ship first.)

The 5 diagnoses:

=== spawn-lifecycle ===
I have enough to diagnose the spawn-lifecycle subsystem. The key finding: the two spawn paths use **different PID files and different lock primitives**, and the unified port lock is written non-exclusively by both.

---

**SPAWN-LIFECYCLE down-mode diagnosis (subsystem: spawn-lifecycle)**

**(a) DOWN-MODES**
1. **Double-spawn race / two uncoordinated paths.** Supervisor (`mcp-server-supervisor.mjs`) and the reconnect daemon helper (`mcp-server-daemon.mjs`) are *separate* lifecycle owners with *separate* PID files — `data/state/server-supervisor.pid` (supervisor.mjs:51) vs `.claude/cache/mcp-daemon.pid` (daemon.mjs:27). Neither checks the other's lock. Under fleet load, the per-turn reconnect hook fires `spawnDaemon` → `daemon.mjs start` (reconnect-action:201-216) at the same moment the supervisor's respawn timer fires `spawnChild` (supervisor:192). Both race `server.listen(:3100)`; the 
... [+12919 chars truncated]

### Assistant | 2026-06-04T19:20:33.694Z

I have all five diagnoses. Let me synthesize directly — the data is detailed enough that the merge is the deliverable. No exploration needed.

# 1. RANKED DOWN-MODES

1. **Per-request `bindDispatchers` allocation storm** — `index.ts:1205` re-registers all 64 dispatchers + rebuilds universal-hook proxy closures on EVERY /mcp POST; 26×N subagents = GC-pressuring transient-per-call that drives RSS climb → OOM/preempt-kill.
2. **Connection-storm thundering herd** — `mcp-http-bridge.mjs` uses default global agent (no `maxSockets`/keep-alive); N bridges open unbounded concurrent sockets to one :3100 → event-loop/socket exhaustion → 120s timeouts.
3. **BOOTGUARD default-OFF** — watchdog kills supervisor's mid-boot child (~50s cold boot) every cycle; the flap fix shipped this session but stays dormant (`mcp-server-watchdog.mjs:314` gated on `=1`).
4. **Two uncoordinated spawn paths** — supervisor vs reconnect-daemon share no lock/PID file; both race `listen(:3100)` → EADDRINUSE / "Already connected" churn.
5. **RSS preempt kills busy server** — `watchdog.mjs:251` recycles at 3072MB ignoring inflight count → false-positive OOM kill mid-request.
6. **`error_ledger_recall_similar` ref-retention** — the named true leak (supervisor.mjs:202 defers it); 4GB cap only moves the OOM horizon.

# 2. ALREADY MITIGATED (R8 — do NOT rebuild)

- Per-bridge concurrency cap `MAX_CONCURRENT=3` + in-process queue — `mcp-http-bridge.mjs:50,282-325`
- Connection-class retry w/ backoff + `/ready` gate + uncaughtException keep-alive — `mcp-http-bridge.mjs:239-277,477-501,564-569`
- Pre-bootstrap port preflight (killed the 11-instance/7.8GB bind-race load) — `index.ts:944-966`
- Fresh `buildRequestServer()` per request (the SDK single-transport fix `1297b0a8f5`) — correct pattern, just allocates too much
- Heap ceiling 4GB, override-safe — `supervisor.mjs:205-217`
- RSS preempt gated by 30-min cooldown + uptime≥60s + healthy-probe — `watchdog.mjs:248-267`
- `/health` exposes `rss_mb`/`heap_used_mb`
... [+3390 chars truncated]
