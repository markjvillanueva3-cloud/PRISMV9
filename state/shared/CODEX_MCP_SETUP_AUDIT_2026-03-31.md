# Codex MCP Setup Audit - 2026-03-31

## Scope

Audit the home-PC Codex setup after the March 30, 2026 migration/update wave and verify whether Codex is fully prepared to use the full PRISM MCP-server operating stack.

## Yesterday's H Drive Update Footprint

Files touched on `H:\` during `2026-03-30`:

- `PRISM`: `66,047`
- `USER_PROFILE`: `103`
- `LAUNCH`: `7`
- `state`: `3`
- `.claude`: `1`

Largest `H:\PRISM` update buckets on `2026-03-30`:

- `mcp-server/node_modules`: `18,571`
- `mcp-server/web`: `16,169`
- `cad-engine/.venv`: `15,536`
- `.claude/worktrees`: `13,764`
- `state/externalized`: `919`
- `mcp-server/src`: `119`
- `state/shared`: `66`
- `.claude/helpers`: `47`
- `.claude/commands`: `9`

## Verified Good

- Live Codex profile exists at `C:\Users\Mark Villanueva\.codex`.
- Live plugin exists at `C:\Users\Mark Villanueva\plugins\prism-ops`.
- Live local plugin registry exists at `C:\Users\Mark Villanueva\.agents\plugins\marketplace.json`.
- Codex app cache exists under `C:\Users\Mark Villanueva\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\Codex`.
- Shared PRISM directives, queue files, coordination state, and helper stack are present under `H:\PRISM`.
- `C:\PRISM` is a junction targeting `H:\prism`, so legacy `C:\PRISM` references resolve to the migrated home-PC workspace.
- Live Codex config now points `mcp_servers.prism` and `mcp_servers.prism_safe` at `H:/PRISM/...`.
- Live PRISM command plugin no longer carries stale `Admin.DIGITALSTORM-PC` references.
- Workspace-level `H:\PRISM\.mcp.json` now advertises `prism` and `prism_safe` in addition to the existing auxiliary MCP servers.

## Verified Drift / Risks

### 1. Native PowerShell ShellExecute launch path is unreliable

The raw PowerShell native-command path was failing with:

- `The COM+ registry database detected a system error`

Root symptom during audit:

- shell sessions were missing `HOME`, `USERPROFILE`, `SystemRoot`, and `windir`

Current status:

- repaired at the Codex shell layer via explicit environment restoration and direct-process wrappers in the PowerShell profile
- `node`, `git`, `python`, `npm`, and `npx` now work in normal Codex shell usage
- shared PRISM Node helpers now execute successfully

Residual note:

- the underlying Windows ShellExecute path was not directly repaired at the OS level; Codex is operational because the shell now routes around it reliably

### 2. App-level MCP resource attachment is still opaque in this thread

Observed during audit:

- `list_mcp_resources` returned no resources
- `list_mcp_resource_templates` returned no templates

Current status:

- Codex can still use the PRISM MCP server from this session via the live HTTP dev surfaces and shared Node helpers
- the remaining uncertainty is whether the Codex app UI/runtime has hot-reloaded the updated MCP config yet

### 3. `H:\PRISM\mcp-server\.mcp.json` was empty

Current status:

- repaired during this audit
- the `mcp-server` subtree now self-describes `prism` and `prism_safe`

## Disk-Side Fixes Applied During This Audit

- updated `C:\Users\Mark Villanueva\.codex\config.toml` to point PRISM MCP entries at `H:/PRISM/...`
- updated `C:\Users\Mark Villanueva\.codex\AGENTS.md` to the home-PC profile/path reality
- updated PRISM Ops command wrappers in `C:\Users\Mark Villanueva\plugins\prism-ops\commands\`
- added `prism` and `prism_safe` server entries to `H:\PRISM\.mcp.json`
- added `prism` and `prism_safe` server entries to `H:\PRISM\mcp-server\.mcp.json`
- restored stable Windows env vars for Codex shells in `C:\Users\Mark Villanueva\.codex\config.toml`
- added direct-process PowerShell wrappers for `node`, `git`, `python`, `npm`, and `npx` in the user PowerShell profile

## Live Verification After Repair

Successful from this Codex session:

- `node H:\PRISM\.claude\helpers\task-queue.mjs next --agent-family Codex`
- `node H:\PRISM\.claude\helpers\roadmap-sync.mjs status`
- `node H:\PRISM\.claude\helpers\position-sync.mjs`
- `node H:\PRISM\.claude\helpers\svi-refresh.mjs`
- `node H:\PRISM\.claude\helpers\sync-memory.mjs`
- `GET http://127.0.0.1:3000/health`
- `GET http://127.0.0.1:3000/.well-known/mcp.json`
- `GET http://127.0.0.1:3000/api/v1/dev/server-info`
- `POST http://127.0.0.1:3000/api/v1/dev/session-boot`
- `GET http://127.0.0.1:3000/api/v1/dev/svi/summary`
- `GET http://127.0.0.1:3000/api/v1/dev/test/results`
- `POST http://127.0.0.1:3000/api/v1/dev/build`

Build endpoint result after repair:

- reachable and working
- returned project truth, not environment failure
- current repo posture: pre-build check reports `248 errors, 1072 warnings`

## Current Audit Verdict

Codex is now operational for PRISM MCP-server utilization on the home PC.

Reason:

- configuration and command surfaces are aligned with `H:\PRISM`
- Codex shell sessions can now run the shared Node helper stack
- the live PRISM server and its `prism_dev` HTTP mirrors are reachable and usable from this session

Remaining nuance:

- native app-level MCP hot-reload may still require a Codex reopen before the UI/runtime itself reflects the updated config automatically

## Optional Next Step

The critical unblock is complete.

Optional polish:

1. reopen Codex once so the app runtime can hot-reload the updated MCP config cleanly
2. continue PRISM work using the repaired helper + REST dev-surface path immediately
