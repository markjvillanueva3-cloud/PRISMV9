# india session a614edfb (2026-05-19, 7.6MB, spine 49KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Renamed 17 chat resume‑picker titles by appending `ai-title` records to each `.jsonl`.  
- Added retry, health gate, and liveness probe to `mcp-http-bridge.mjs`; syntax‑cleaned to 506 lines.  
- Implemented supervisor (`scripts/mcp-server-supervisor.mjs`) with PID lock, exponential backoff, idempotent `/health` check; installed Windows task `install-mcp-server-task.ps1`.  
- Created watchdog script `scripts/mcp-server-watchdog.mjs` and installer `install-mcp-server-watchdog-task.ps1`; runs every 5 min, kills wedged MCP after 2 consecutive failures.  
- Added orchestrator `ensure-all-watchdogs.ps1`, wired into `/fleet-reaper` Step 0; all 10 critical watchdogs now auto‑launched.  
- Committed watchdog stack to slot/hotel (`bfb498bc42`) and updated patch‑siblings for CLAUDE.md resiliency.

**DECISIONS**  
- Bridge retry: max 3 attempts, exponential backoff, log on failure; no longer exits on transient ECONNREFUSED.  
- Supervisor uses PID lock + `/health` idempotency to avoid double‑binds; scheduled task now repeats every 5 min.  
- Watchdog threshold set to 2 consecutive failures before killing wedged MCP; includes cooldown to prevent thrashing.  
- Runtime artifacts (supervisor, installer) must remain in `H:/prism` until golf merges slot worktrees.  
- Resume‑picker labels sourced from `ai-title` records rather than handoff files.

**OPERATOR DIRECTIVES**  
- “Rename chat titles to slot names” for last night’s 17 chats.  
- “Permanent fix for PRISM MCP server keeps dropping.”  
- “Make the watchdog and any other important watchdogs auto‑launch with the fleet reaper slash command pipeline.”  
- Execute `/checkin-hotel` (force‑take hotel slot, bind handoff, run full checkin pipeline).  
- Stop hook condition: `[ complete all remaining tasks … ] /loop [5am] /goal`.

**FINDINGS/BUGS**  
- Bridge had no retry on ECONNREFUSED → added.  
- MCP wedge detected via CLOSE_WAIT; watchdog kills wedged PID.  
- Supervisor task only at startup → fixed by adding repetition interval.  
- Cleanup removed runtime artifacts, breaking supervisor → restored.  
- Watchdog tests flaky due to spawn/stdio race → resolved with probe timing adjustment.  
- Chat bus is broadcast‑only; recipient filter needed for targeted delivery (pending).  
- Slack/Discord adapters stubbed; external tokens required.

**AI‑SYSTEM SPECIFICS**  
- Engines: `mcp-http-bridge`, supervisor, watchdog, ensure‑all‑watchdogs orchestrator.  
- Actions: retry on bridge requests, health gate, liveness probe, PID lock, exponential backoff, scheduled tasks.  
- Metrics: `/health` returns `{status:"healthy", uptime_seconds, heap_used_mb}`; server version 2.10.0.  
- Deploy gates: HTTP MCP at :3100, supervisor task, watchdog task, fleet‑reaper Step 0.  
- Model: Claude Flow MCP (via `npx claude-flow mcp start`).  
- Corpus paths: not specified.

**OPEN THREADS**  
- Implement Slack/Discord integration to notify chat slot of CLAUDE.md changes; requires external bot accounts and tokens.  
- Add recipient filter to ChatBusEngine for targeted message delivery.  
- Formal chat system (Slack/Discord) for `checkin‑nato` / `startup‑nato` commands.  
- Fine‑tune watchdog thresholds/cooldowns.  
- Merge patch‑siblings into main branch via golf integration.
