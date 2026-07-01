---
name: reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17
description: "MCP \"still disconnecting\" root cause -- the durable restart scheduled tasks were DISABLED + the live :3100 supervisor was ORPHANED, so any server death was permanent. Always check task ENABLED-state, not just server /health."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_durable_tasks_disabled_orphan_supervisor_2026_06_17
---


**MCP recurring-disconnect root cause: disabled durable tasks + orphaned supervisor (2026-06-17, slot:golf).**

## Finding
Operator: "still having issues with the mcp server." Live probe showed the server HEALTHY (1 instance pid 29796,
51min uptime, `/health`+`/ready` 200 in <2ms, clean boot of 64 dispatchers, only 2 restart events in
`mcp-server/logs/supervisor.log` -- NOT churning). Bridges (`mcp-http-bridge.mjs`) are reaper-protected
(`fleet-reaper-mcp-zombie-hunter.mjs:200` PROTECT list + `process-slot-map.mjs:304`) and 0 appear in the kill
logs -- NOT being reaped. So the disconnects are NOT server crashes or bridge reaps.

The real gap: **all 4 MCP durable scheduled tasks were `[Disabled]`** (earlier the same session they were
`[Ready]/[Running]`) -- `PRISM MCP Server` last result `0x41306` = `SCHED_S_TASK_TERMINATED`. AND the live
supervisor (pid 7372) keeping :3100 up was **ORPHANED** (parent ppid 12920 dead). So :3100 ran on a detached
supervisor with NO durable auto-restart behind it -- if that orphaned process died (reboot/reap/crash), nothing
would relaunch the server -> permanent outage -> every chat disconnects until a manual restart. That is the
"recurring MCP disconnect" the operator keeps hitting (intermittent: only on the rare orphan death, but total).

## Fix
Re-enabled the CORE restart layer (no elevation needed this session): `Enable-ScheduledTask "PRISM MCP Server"`
+ `"PRISM MCP Server Watchdog"` -> both `[Ready]`. Left `Connectivity Monitor` + `Priority Guardian` DISABLED
(the redundant "competing managers" -- consolidation reduces restart/probe churn; owed #3). The supervisor's
O_EXCL PID lock means a durable-task relaunch while the orphan still lives just exits (no double-supervisor).

The bridge-level transient drops (a slow call exceeding the old 15s bridge request budget -> prism drops) are
separately addressed by `U-MCP-RETRY-BUDGET-HARDEN` (15s->75s, live on disk; takes effect on bridge respawn /
`/mcp` reconnect) + `U-MCP-CONNCHECK-DEBOUNCE` (no false DOWN banner).

## Lesson (add to MCP triage)
When diagnosing "MCP keeps disconnecting", a healthy `/health` is NOT sufficient -- ALSO check:
1. `Get-ScheduledTask | ? TaskName -match MCP` ENABLED-state (a disabled restart layer = latent total outage).
2. Whether the live supervisor is ORPHANED (parent dead) -- orphan + disabled task = no restart coverage.
The MCP connectivity/health check should surface scheduled-task ENABLED-state, not just the HTTP probe.
-> sibling [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]] (false-alarm side); this is the REAL-gap side.
