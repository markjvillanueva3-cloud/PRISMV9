# cad session b7ef5ea0 (2026-05-28, 8.4MB, spine 63KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `regenerate-launch-fleet.mjs` – quoted `%PWSH%`, injected `PRISM_BOOT_SLOT` env var for every slot launch.  
- `chat-slot-heartbeat.mjs` wired into PostToolUse arm[0] in both C: and H: settings.json (slot heartbeat during autonomous work).  
- `stop_on_uncommitted_critical.mjs` wired into Stop arm after `stop_on_failing_tests`.  
- `MemoryGraphEngine.ts` – added dirty‑state guard to `saveCheckpoint()` (U‑GML01) and static registry for process signal handlers (U‑GHM02).  
- Audit script `scripts/audit-unwired-hooks-2026-05-27.mjs` plus triage markdowns (`UNWIRED-HOOKS-AUDIT`, `UNWIRED-HOOKS-TRIAGE`).  
- MCP scheduled task stopped; hot‑loop bug fixed in GraphEngine, new dist ready for next restart.  

**DECISIONS**  
- Golf slot now owns the fleet‑reaper (Doctrine shift 2026‑05‑16).  
- Slot binding via `chat-slots.mjs reclaim/claim` with no legacy hygiene flag; golf treated as normal work slot.  
- SessionStart auto‑resume requires `PRISM_BOOT_SLOT`; launcher updated to set it per slot.  
- All autonomous‑work chats must keep heartbeat via PostToolUse hook; added `chat-slot-heartbeat`.  
- MCP server designed for >20 concurrent chat + agent connections, single Node process with event loop; no clustering but capable of current load.  

**OPERATOR DIRECTIVES** (verbatim)  
- “please fix the issue of chats not continuing where they left off when I shut down or restart and launch the prism fleet.”  
- “check all hooks and assess each one on what they're for and how it would synergize with our current build /system‑viz and PSN.”  
- “continue /loop” (request to resume loop after fixes).  

**FINDINGS/BUGS**  
- SessionStart auto‑resume skipped because `PRISM_BOOT_SLOT` was never set by the launcher.  
- Launcher generated unquoted `%PWSH%`, causing some tabs to launch in cmd and a 4th window to fail.  
- `chat-slot-heartbeat.mjs` existed but was not wired, leading to slot disconnects during autonomous work.  
- `stop_on_uncommitted_critical.mjs` was unwired despite being documented.  
- MCP server hung due to hot‑loop in `MemoryGraphEngine.ts`: unconditional checkpoint writes from periodic timer and operation‑driven path.  
- Static signal‑handler registration caused MaxListenersExceededWarning and potential race on shutdown.  

**DOMAIN SPECIFICS** (unique to this galaxy)  
- **Fleet‑Reaper** – orphan‑process janitor, GPU coordinator, Ollama routing‑hint emitter; always runs on `/checkin-golf`.  
- **Slot Management** – `chat-slots.mjs` reclaim/claim, slot heartbeat hooks, PRISM_BOOT_SLOT for resume.  
- **MCP Server** – single Node process exposing HTTP/WebSocket API on :3100, backed by `MemoryGraphEngine.ts`, watchdog (`mcp-server-watchdog.mjs`) probes `/health`.  
- **Graph Engine** – WAL‑based memory graph with checkpointing; hot‑loop bug fixed.  
- **Watchdog & Scheduler** – `PRISM MCP Server` scheduled task, health probe, RSS preemption, and per‑prompt “MCP DISCONNECTED” banner.  

**TOOLS USED**  
- PRISM scripts: `regenerate-launch-fleet.mjs`, `chat-slots.mjs`, `session-start-auto-resume.mjs`.  
- Hooks: `golf-slot-write-allowlist.mjs`, `chat-slot-heartbeat.mjs`, `stop_on_uncommitted_critical.mjs`, `MemoryGraphEngine.ts`.  
- Audit script: `scripts/audit-unwired-hooks-2026-05-27.mjs`.  
- Docker/compose for local compute stack (ollama, qdrant, nvidia‑nim).  

**OPEN THREADS**  
1. Decide on `--resume` policy vs always `/checkin` for new slots.  
2. Implement agent/task‑wait sidecar to keep heartbeat during long Agent waits.  
3. Complete hook×PSN×system‑viz assessment matrix (Task #9).  
4. Extend watchdog to probe `/health` and fix Stop‑ScheduledTask no‑op behavior on `PRISM MCP Server`.  
5. Load‑test MCP for >200 concurrent agent requests; consider clustering or worker threads if needed.
