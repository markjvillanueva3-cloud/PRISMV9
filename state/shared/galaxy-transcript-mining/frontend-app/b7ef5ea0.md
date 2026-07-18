# frontend-app session b7ef5ea0 (2026-05-28, 8.4MB, spine 63KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `regenerate-launch-fleet.mjs` – quoted `%PWSH%` in all wt.exe calls; injected `$env:PRISM_BOOT_SLOT='<slot>'` before each claude invocation.  
- `settings.json` (C:/Users/wompu/.claude and mirrored H:) – wired `chat-slot-heartbeat.mjs` into PostToolUse arm[0] (empty matcher) and wired `stop_on_uncommitted_critical.mjs` into Stop arm.  
- `MemoryGraphEngine.ts` – added dirty‑flag guard to `saveCheckpoint()` (U‑GMHL01); introduced static registry for process signal handlers with single bind (U‑GHM02). Updated tests in `MemoryGraphEngine.test.ts` (30/30 pass).  
- Audit script `scripts/audit-unwired-hooks-2026-05-27.mjs` and triage markdowns (`UNWIRED-HOOKS-AUDIT.md`, `UNWIRED-HOOKS-TRIAGE.md`).  
- MCP server – stopped hot‑loop by applying U‑GMHL01; scheduled task now stops the old instance, new dist will take effect on next restart.  

**DECISIONS**  
- Fleet‑reaper ownership moved from alpha → golf (unify hygiene under one slot).  
- `PRISM_BOOT_SLOT` env var is required for SessionStart auto‑resume to inject handoff data; added to launcher to guarantee resume works for all `/checkin‑<slot>` chats.  
- PostToolUse hook list now includes `chat-slot-heartbeat.mjs` so autonomous work keeps slot heartbeats alive.  
- Stop arm now includes `stop_on_uncommitted_critical.mjs` per CLAUDE.md doctrine.  
- MemoryGraphEngine checkpoint logic changed to guard against idle writes and signal‑handler races; single registry ensures graceful shutdown.  

**OPERATOR DIRECTIVES**  
- Delete stale file `C:/Users/wompu/.claude/commands/wedm-pcd.md`.  
- Decide on `--resume` policy vs always `/checkin` for new slots.  
- Run agent/task‑wait sidecar to handle long Agent waits.  
- Generate hook×PSN×system‑viz matrix (Task #9).  
- Add health‑probe to MCP watchdog; fix Stop‑ScheduledTask no‑op behavior.  

**FINDINGS/BUGS**  
- **B2**: SessionStart auto‑resume skipped because `PRISM_BOOT_SLOT` was never set → chats resumed from post‑compact state.  
- **B3**: Unquoted `%PWSH%` caused wt.exe to launch cmd or fail, dropping a window; also prevented 4th window.  
- Slot heartbeat missing → autonomous `/loop` chats lost slot binding after ~60 s of no UserPromptSubmit.  
- `stop_on_uncommitted_critical.mjs` was not wired, violating CLAUDE.md doctrine.  
- MCP server hung in a hot‑loop writing checkpoints on every tick (no dirty flag) causing :3100 to become unresponsive; watchdog could not recover until U‑GMHL01 applied.  
- Signal‑handler leak: multiple instances registered SIGINT listeners → potential race on shutdown.  

**DOMAIN SPECIFICS**  
- **Engines/Actions**: `MemoryGraphEngine` (checkpointing, WAL), `fleet-reaper` (slot reclamation, GPU coordination, Ollama hint emission).  
- **Dispatchers**: chat‑slots helper (`claim`, `reclaim`), MCP bridge (`mcp-http-bridge.mjs`).  
- **Metrics/Paths**: `/health` endpoint on :3100, checkpoint JSONL files, GPU utilization logs, Docker container health (ollama, qdrant, nim).  
- **Unique to this galaxy**: slot‑based chat lifecycle (golf, alpha, etc.), `PRISM_BOOT_SLOT`, `chat-slot-heartbeat.mjs`, `session-start-auto-resume.mjs`.  

**TOOLS USED**  
- `regenerate-launch-fleet.mjs` (launcher generator).  
- `chat-slots.mjs` helper.  
- `settings.json` (C: and H: mirrors).  
- `MemoryGraphEngine.ts` + tests.  
- Audit script `audit-unwired-hooks-2026-05-27.mjs`.  
- Docker compose for local stack, fleet‑reaper sweep script.  

**OPEN THREADS**  
- Resolve resume policy decision (Task #5).  
- Implement agent/task‑wait sidecar (long Agent waits).  
- Complete hook×PSN×system‑viz matrix (Task #9).  
- Add health‑probe to MCP watchdog and fix Stop‑ScheduledTask no‑op.  
- Load test MCP for 20+ simultaneous chats + agents; consider clustering or worker threads if needed.  
- Finish `/loop` execution after operator’s “continue /loop” directive.
