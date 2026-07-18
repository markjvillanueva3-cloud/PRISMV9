# quoting session a614edfb (2026-05-19, 7.6MB, spine 49KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- 17‑chat resume‑picker titles renamed (alpha…romeo + lathe‑tribal‑wire) via `H:/prism/scripts/_oneshot-rename-resume-picker.mjs`.  
- MCP server “drops” permanently fixed:  
  - `mcp-http-bridge.mjs` now retries on ECONNREFUSED, has a background health gate and liveness probe.  
  - Supervisor (`scripts/mcp-server-supervisor.mjs`) added PID‑lock, exponential backoff respawn, `/health` idempotency.  
  - Watchdog (`install-mcp-server-watchdog-task.ps1`) probes `/health` every 5 min, kills wedged PIDs and triggers supervisor.  
- All 10 critical watchdogs (MCP server, MCP wedge, fleet reaper, memory monitor, cleanup orchestrator, memory‑pressure relief, zombie reaper, hook janitor, node orphan cleaner, synergy regression watch) are now auto‑launched via `/fleet-reaper` Step 0 (`ensure-all-watchdogs.ps1`).  
- `checkin-hotel` completed: slot locked, handoff written, worktree clean, watchdog stack verified.  

**DECISIONS**  
- Use NATO slot names for resume titles; infer objective from transcript when no slot history exists.  
- Keep runtime artifacts (supervisor, installer scripts) in `H:/prism`; delete only non‑referenced files.  
- Bridge resilience: 3× retry, 30 s health gate, liveness probe → prevents red‑X on transient server hiccups.  
- Supervisor runs at AtStartup/AtLogon **and** every 5 min (via watchdog) to catch mid‑session wedges.  
- Watchdog threshold: 2 consecutive failures → kill & respawn; cooldown to avoid thrashing.  
- `/fleet-reaper` Step 0 now performs a non‑elevated downgrade if the shell isn’t elevated, avoiding aborts.  

**OPERATOR DIRECTIVES**  
- Rename chat titles to slot names (alpha…romeo + inferred objectives).  
- Permanently fix MCP server dropping.  
- Build watchdog stack and auto‑launch via fleet reaper.  
- Implement CLAUDE.md change notification system; upgrade chat bus for targeted delivery; explore Slack/Discord integration.  
- Session‑scoped Stop hook: “complete all remaining tasks … /loop [5am] /goal” – start immediately, block until condition met.  

**FINDINGS/BUGS**  
- Runtime artifacts were deleted during cleanup → supervisor failed to restart server.  
- Supervisor lacked periodic trigger; mid‑session wedges went unnoticed until reboot.  
- Watchdog design initially used a single task; split into dedicated MCP wedge watchdog for clarity.  
- `install-cleanup-orchestrator-task.ps1` had a false negative due to `$LASTEXITCODE` handling in nested PowerShell call.  
- Non‑elevated shell threw on missing elevation; fixed by downgrading to report‑only.  

**DOMAIN SPECIFICS**  
- **Chat Slots / Worktrees:** `slot/<nato>` branches, `H:/prism-slot-<nato>/` worktrees, `chat-slots.mjs`.  
- **MCP Server & Bridge:** HTTP MCP at 127.0.0.1:3100 (`/health`, `/mcp`), stdio bridge (`mcp-http-bridge.mjs`).  
- **Watchdogs / Supervisor:** Windows Scheduled Tasks (`install‑*.ps1`), `ensure-all-watchdogs.ps1`.  
- **Handoff & AI‑Title Records:** `HANDOFF-<id>-<topic>.md`, `.jsonl` `ai-title` records for resume picker.  
- **Chat Bus Engine:** broadcast engine; targeted delivery requires schema change.  
- **CLAUDE.md Patch‑Sibling:** peer‑locked file updates, notification hooks.  

**TOOLS USED**  
- `mcp-http-bridge.mjs`, `scripts/mcp-server-supervisor.mjs`, `install-mcp-server-task.ps1`, `install-mcp-server-watchdog-task.ps1`, `ensure-all-watchdogs.ps1`.  
- `.claude/helpers/chat-slots.mjs`, `.claude/commands/checkin.md`, `.claude/commands/startup.md`.  
- `H:/prism/scripts/_oneshot-rename-resume-picker.mjs`.  
- Windows Scheduled Task API, PowerShell scripts.  

**OPEN THREADS**  
- Implement chat‑bus targeted delivery (add recipient field / filter).  
- Build CLAUDE.md change notification hook that automatically pushes updates to the owning slot’s chat bus.  
- Design and prototype Slack/Discord integration for slot‑specific messaging.  
- Finalize chat‑bus upgrade plan; rebase `slot/hotel` onto current main after resolving corrupted object.  
- Verify that all watchdogs remain healthy across restarts and mid‑session wedges in production.
