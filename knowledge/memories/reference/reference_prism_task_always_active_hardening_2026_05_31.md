---
name: prism-task-always-active-hardening-2026-05-31
description: "13 of 23 PRISM scheduled tasks (reapers/monitors/janitors) ran logon=Interactive → DIED at user logoff. golf converted all to S4U + restart-3x + battery/idle gates cleared, and added a self-healing 'PRISM Task Hardener' (every 6h)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.122Z
aliases: reference_prism_task_always_active_hardening_2026_05_31
---


**The gap (found 2026-05-31, slot golf — operator: "fix them so they're always active no matter what").** An audit of all 23 `PRISM*` scheduled tasks found the reaper/monitor/janitor fabric was NOT logoff-proof:
- **13 tasks ran `logon=Interactive`** → they only run while `wompu` is interactively logged on; they **STOP at logoff/lock/session-end**. ([[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]], Hook Janitor, MCP Connectivity Monitor, Memory Pressure Auto-Relief, Node Orphan Cleaner, Orphan Process Reaper, Source Monitor Sweep, [[reference_synergy_regression_watch_2026_05_16|Synergy Regression Watch]], Tmp Sweep, Zombie Reaper v2, Cleanup Orchestrator, Blueprint Join, RGS Tool Planner.)
- **19 tasks had `RestartCount=0`** → a single transient failure was permanent until the next scheduled tick.
- **2 had `DisallowStartIfOnBatteries=true` + `StartWhenAvailable=false`** (Cleanup Orchestrator, Node Orphan Cleaner) → no run on battery, no catch-up.
- Only [[reference_fleet_reaper|Fleet Reaper]] / MCP Server / MCP Server Watchdog were `ServiceAccount=SYSTEM` (bulletproof).

**The fix (all applied, no elevation needed):**
- **Interactive → S4U** for all 13. S4U ("Service For User", `LogonType S4U`) runs **whether the user is logged on or not**, as the user identity. Chosen over SYSTEM because **S4U keeps the user's H: volume + node path** (SYSTEM may not see a user/mapped volume → would break the H:-rooted reapers). Validated: Zombie Reaper v2 ran `LastResult=0` post-conversion.
- `RestartCount=3` + `RestartInterval=PT1M` on all (auto-retry a failure 3×).
- `DisallowStartIfOnBatteries=false`, `StopIfGoingOnBatteries=false`, `StartWhenAvailable=true`, `RunOnlyIfNetworkAvailable=false`, `RunOnlyIfIdle=false`, `Enabled=true` on all.
- Modify the **existing** `$t.Settings` object in-place (NOT a fresh `New-ScheduledTaskSettingsSet`, which would reset ExecutionTimeLimit/triggers).

**Self-healing layer (the "no matter what"):** `H:/prism/.claude/helpers/harden-prism-tasks.ps1` (idempotent) re-applies all of the above to every `PRISM*` task, registered as the **`PRISM Task Hardener`** scheduled task (every 6h, S4U, restart-3x). So if an installer re-registers a task with weak defaults, a manual disable, or any drift — it's auto-corrected within 6h + after every reboot (StartWhenAvailable). Re-run manually: `powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/harden-prism-tasks.ps1`.

**Self-healing BOTH ways (hardener upgrade, same session):** the hardener now extracts each task's primary script (`Get-TaskScript`) and **auto-DISABLES any task whose script file is missing** (`Enabled = -not scriptMissing`) — stops endless exit-1 fail-spam — and **auto-RE-ENABLES** it when the script reappears. General: protects against any future broken task, not just zebra.

**The 2 originally-"failing" tasks — resolved:**
- `PRISM MCP Server` `LastResult=2` was **stale from 05/29** (2 days old). MCP is actually HEALTHY now (`/health` 200 on :3100, pid 62524). The earlier "MCP DISCONNECTED" banner was a transient probe-timeout false alarm, not a real outage.
- `PRISM Zebra Orchestrator` `LastResult=1` = **`MODULE_NOT_FOUND`**: the task runs `H:/prism/scripts/zebra-orchestrator-sweep.mjs`, which is **missing from the main tree** (built on a slot branch, never merged). Golf could NOT fix by copying — the dep chain (`scripts/lib/zebra-awareness-consumer.mjs`) is on zebra's/bravo's branch, not in golf's worktree. The upgraded hardener **disabled it** (auto-revives when merged). **ACTION FOR zebra/bravo:** the zebra-orchestrator feature (sweep + lib + zebra-awareness-consumer + drift-detect + bd-priority) is referenced by a fleet scheduled task but unmerged to `cad-fusion-live-ms0` — merge it to re-activate. (Same "built-but-not-merged" class as the 34K untracked + the galaxy-kit gap.)

Related: [[reference_fleet_reaper]], [[reference_fleet_task_health_ms0_2026_05_17]], [[feedback_golf_owns_reaper]], [[reference_main_tree_untracked_work_2026_05_30]].
