# cad session a614edfb (2026-05-19, 7.6MB, spine 49KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- 17 chat‑resume titles renamed via `_oneshot-rename-resume-picker.mjs` (commit bfb498bc42).  
- `mcp-http-bridge.mjs` updated with retry, health gate, liveness probe (506 lines).  
- Supervisor (`mcp-server-supervisor.mjs`) and watchdog (`mcp-server-watchdog.mjs`) installed; scheduled tasks added (`install-mcp-server-task.ps1`, `install-mcp-server-watchdog-task.ps1`).  
- `/fleet-reaper` Step 0 wired to run `ensure-all-watchdogs.ps1`; all 10 critical watchdogs now ready.  
- Slot‑worktree for `hotel` committed (commit 4b5234bb6d) and integrated with checkin pipeline.  

**DECISIONS**  
- Adopt HTTP MCP server at :3100 + stdio bridge with retry → resilience to transient ECONNREFUSED.  
- Supervisor handles boot‑time respawn; watchdog monitors mid‑life wedges via `/health`.  
- Slot‑worktree architecture (`H:/prism-slot‑<slot>`) keeps per‑chat state isolated; runtime artifacts must stay in `H:/prism` until golf merges.  
- Chat bus remains broadcast; plan to add recipient field for directed delivery.  
- Patch‑sibling pattern used for CLAUDE.md changes; Slack/Discord integration deferred.  

**OPERATOR DIRECTIVES** (verbatim)  
- “Rename chat resume‑picker titles to slot names …” – done.  
- “Permanent fix for PRISM MCP server keeps dropping” – implemented.  
- “Make the watch dog and any other important watch dogs we have in the system, auto launch with the fleet reaper slash command pipeline” – wired.  
- “make a wiki or memory to always message claude.md file changes to the chat slot controlling it … upgrade the chat bus … use Slack/Discord” – pending.  

**FINDINGS / BUGS**  
- Server wedge caused by PID 21848; supervisor lacked periodic trigger → added 5‑min watchdog.  
- Bridge had no retry → now retries up to 3× with backoff.  
- Cleanup over‑eagerness removed runtime artifacts (`install-mcp-server-task.ps1`, `mcp-server-supervisor.mjs`).  
- Chat bus only broadcasts; no recipient filtering → requires schema change.  
- Patch‑sibling notifications missing; Slack/Discord adapters stubbed.  

**DOMAIN SPECIFICS**  
- MCP HTTP server: 127.0.0.1:3100, `/health` endpoint (status, uptime, heap).  
- `mcp-http-bridge.mjs`: stdio → HTTP proxy with retry & liveness probe.  
- Supervisor (`mcp-server-supervisor.mjs`) + watchdog (`mcp-server-watchdog.mjs`).  
- Slot‑worktree paths: `H:/prism-slot-<slot>`; branch `slot/<slot>`.  
- Chat bus engine (`ChatBusEngine.ts`), inject hook (`chat-bus-inject.mjs`).  
- Scheduled tasks: `install-mcp-server-task.ps1`, `install-mcp-server-watchdog-task.ps1`, `install-fleet-reaper-task.ps1`, etc.  
- Hook suite: `slot-bind-enforce.mjs`, `chat-slots.mjs`.  

**TOOLS USED**  
- PRISM scripts: `_oneshot-rename-resume-picker.mjs`, `ensure-all-watchdogs.ps1`, `mcp-server-supervisor.mjs`, `mcp-server-watchdog.mjs`.  
- Helpers: `.claude/helpers/chat-slots.mjs`, `.claude/helpers/mcp-http-bridge.mjs`.  
- Commands: `/startup.md`, `/checkin.md`.  
- Windows PowerShell scheduled tasks.  

**OPEN THREADS**  
- Implement directed chat‑bus delivery (add recipient field, update inject hook).  
- Slack/Discord integration for CLAUDE.md change notifications and slot‑specific messaging.  
- Finalize periodic supervisor trigger (5‑min repeat).  
- Complete synergy upgrades per `MCP-SYNERGY-PROPOSAL`.  
- Resolve interrupted stop‑hook condition (“complete all remaining tasks …”) to auto‑run without user prompt.
