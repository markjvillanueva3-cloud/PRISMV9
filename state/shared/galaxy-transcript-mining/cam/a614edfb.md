# cam session a614edfb (2026-05-19, 7.6MB, spine 49KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Renamed resume‑picker titles for 17 last‑night chats (alpha…romeo + lathe‑tribal‑wire) via `ai-title` records; undo log created.  
- MCP server permanent fix:  
  - Added retry & liveness probe to `mcp-http-bridge.mjs`.  
  - Implemented supervisor (`scripts/mcp-server-supervisor.mjs`) with PID lock, exponential backoff, `/health` idempotency.  
  - Created watchdog task (`install-mcp-server-watchdog-task.ps1`) that probes `/health`, kills wedged PIDs, respawns via supervisor.  
- Wrote `ensure-all-watchdogs.ps1` orchestrator; wired it into `/fleet-reaper` Step 0 so all 10 critical watchdogs start with a single slash command.  
- Executed `/checkin-hotel`: slot‑locked hotel, bound handoff, ran full checkin pipeline, committed watchdog stack and doc reflections.  

**DECISIONS**  
- Keep MCP as HTTP API (`:3100`) + stdio bridge; no monolithic rewrite needed for Electron future.  
- Bridge retry = 3×, liveness probe every 30 s, background `/health` gate to avoid cold‑start race.  
- Supervisor runs at AtStartup+AtLogon and will be extended with a 5‑min periodic trigger (future P0).  
- Watchdog task is separate from bridge; watches for 503/timeout, kills wedged server, respawns via supervisor.  
- Runtime artifacts (`install-mcp-server-task.ps1`, `mcp-server-supervisor.mjs`) must stay in `H:/prism` until golf merges slot/hotel back to main.  
- Slot‑worktree architecture: each chat slot has its own branch/worktree; integration handled by golf.  
- Upgrade chat bus to include a recipient field so messages can be routed to the owning slot (not yet implemented).  

**OPERATOR DIRECTIVES**  
- `/startup-hotel` – force‑take hotel slot, bind handoff `hotel-work`, run standard startup pipeline.  
- `/checkin-hotel` – same as above but runs full checkin pipeline; args forwarded verbatim.  
- “Make a wiki/memory to always message claude.md file changes to the chat slot controlling it and make sure it can see it without me telling it.” (requires new hook & chat‑bus upgrade).  
- “Upgrade the chat bus if needed so a specific chat slot always gets its intended messages automatically. Can we use Slack/Discord for that?” (Slack/Discord integration pending).  

**FINDINGS / BUGS**  
- Server wedge caused by missing periodic supervisor trigger; fixed by adding 5‑min watchdog task.  
- Bridge had no retry on ECONNREFUSED → red‑X at session start; now retries and background `/health` gate added.  
- Cleanup script accidentally deleted runtime artifacts (`mcp-server-supervisor.mjs`, `install-mcp-server-task.ps1`) → supervisor failed to respawn server; restored from slot/hotel commit.  
- Orchestrator used `$LASTEXITCODE` incorrectly in nested PowerShell call; fixed by explicit exit‑code check.  
- Non‑elevated shell caused orchestrator to throw; downgraded to report‑only mode.  
- Slot‑worktree migration missed earlier; corrected during `/checkin-hotel`.  

**DOMAIN SPECIFICS**  
- **Engines/Actions:** `mcp-http-bridge.mjs`, `scripts/mcp-server-supervisor.mjs`, `ensure-all-watchdogs.ps1`, `chat-slots.mjs`, `slot-bind-enforce.mjs`.  
- **Dispatchers:** `/health` endpoint, bridge request handler, watchdog probe.  
- **Metrics/Paths:** `/mcp` JSON‑RPC, `/health` JSON body (`status: healthy`, `uptime_seconds`, `heap_used_mb`).  
- **Unique Paths:** `ai-title` records in `.jsonl` for resume picker; handoff files `HANDOFF-<id>-<topic>.md`.  

**TOOLS USED**  
- PRISM tools: `mcp-http-bridge.mjs`, `scripts/mcp-server-supervisor.mjs`, `install-mcp-server-task.ps1`, `install-mcp-server-watchdog-task.ps1`, `ensure-all-watchdogs.ps1`, `chat-slots.mjs`, `slot-bind-enforce.mjs`, `checkin.md` pipeline, `/fleet-reaper`.  
- Claude‑Code hooks: `ai-title` appender, `slot-bind-enforce.mjs`, `chat-bus-inject.mjs`.  
- Windows Scheduled Tasks (PowerShell scripts).  

**OPEN THREADS**  
- Integrate watchdog stack into main branch (`cad-fusion-live-ms0`) after golf merges slot/hotel.  
- Implement directed chat‑bus recipient field and corresponding hook to auto‑deliver CLAUDE.md changes to owning slot.  
- Design & prototype Slack/Discord integration for chat notifications (requires bot tokens, adapters).  
- Resolve remaining bridge test flakiness (spawn/stdin race).  
- Add periodic supervisor trigger (5 min) as P0 follow‑up.  
- Tune watchdog fail threshold and cooldown to avoid thrashing.
