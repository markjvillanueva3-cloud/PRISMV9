# ai-training session a614edfb (2026-05-19, 7.6MB, spine 49KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- Renamed 17 chat‑resume titles via `ai-title` records (`_oneshot-rename-resume-picker.mjs`).  
- Added retry, health gate, and liveness probe to `mcp-http-bridge.mjs`.  
- Installed supervisor task (`install-mcp-server-task.ps1`) with PID lock & exponential backoff.  
- Created watchdog task (`install-mcp-server-watchdog-task.ps1`) that probes `/health`, kills wedged PIDs, respawns via supervisor.  
- Wrote `ensure-all-watchdogs.ps1` orchestrator; wired it into `/fleet-reaper` Step 0 so all 10 critical watchdogs start automatically.  
- Updated scheduled‑task registry: MCP server, MCP watchdog, fleet reaper, memory monitor, cleanup orchestrator, memory‑pressure relief, zombie reaper, hook janitor, node orphan cleaner, synergy regression watch—all ready.  
- Committed changes to `slot/hotel` branch; 4‑surface doc reflection (wiki, auto‑memory, MEMORY.md, CLAUDE.md patch‑sibling) completed.

**DECISIONS**  
- Use HTTP MCP server at :3100 as the sole API surface; bridge handles stdio→HTTP with retry.  
- Supervisor pattern: PID lock + exponential backoff; watchdog uses consecutive‑failure threshold and 5 min repetition.  
- Keep runtime artifacts (supervisor, installer) in `H:/prism` until golf integration to avoid missing scheduled tasks.  
- Slot‑worktree architecture remains; checkin‑hotel forces claim, binds handoff, runs full `/checkin` pipeline.  
- All critical watchdogs auto‑launched via `/fleet-reaper` Step 0 for fleet hygiene.

**OPERATOR DIRECTIVES**  
- Session‑scoped Stop hook: treat condition `[ complete all remaining tasks … ] /loop [5am] /goal` as directive; start work immediately, no pause or manual `/goal clear`.  
- Build a wiki/memory that automatically notifies claude.md changes to the controlling chat slot and upgrades chat bus so each slot receives its intended messages.  
- Explore formal chat integration (Slack/Discord) for auto‑notification of claude.md edits and targeted message delivery.

**FINDINGS / BUGS**  
- Bridge had no retry on ECONNREFUSED → added 3× retry logic.  
- Supervisor lacked periodic trigger; added 5 min repetition interval to catch mid‑life wedges.  
- Cleanup orchestrator failed due to missing install script; fixed.  
- Chat bus was broadcast‑only; requires recipient field for targeted delivery.  
- Slack/Discord integration not yet implemented; needs external tokens and bot process.

**DOMAIN SPECIFICS**  
- Engines: `mcp-http-bridge`, supervisor, watchdog, chat‑bus engine, slot claim system.  
- Actions: handoff binding, slot reclaim/claim, checkin pipeline, startup‑hotel wrapper.  
- Dispatchers: MCP dispatcher via HTTP RPC; chat bus dispatch to slots.  
- Metrics: `/health` status, server uptime, heap/RSS usage, watchdog consecutive‑failure counter.  
- Paths: `H:/prism-slot-hotel`, `.claude/helpers/mcp-http-bridge.mjs`, `scripts/install-mcp-server-task.ps1`, `install-mcp-server-watchdog-task.ps1`.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`.  
- Scripts: `_oneshot-rename-resume-picker.mjs`, `ensure-all-watchdogs.ps1`, install‑*.ps1, supervisor script.  
- Hooks: `slot-bind-enforce.mjs`, `chat-bus-inject.mjs`, CLAUDE.md patch‑sibling.

**OPEN THREADS**  
- Implement Slack/Discord adapters for claude.md change notifications and slot‑specific message delivery.  
- Extend chat bus to include recipient field; add logic in `chat-bus-inject.mjs` for targeted dispatch.  
- Finalize session‑scoped Stop hook: auto‑start work, auto‑clear on condition met.  
- Integrate CLAUDE.md change notification into memory/wiki system so slots see updates without manual triggers.
