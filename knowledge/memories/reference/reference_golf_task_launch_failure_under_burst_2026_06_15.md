---
name: golf-task-launch-failure-under-burst-2026-06-15
description: "FLEET-HYGIENE/golf lesson (2026-06-15): a PRISM scheduled-task last-result of 0xC0000142 (STATUS_DLL_INIT_FAILED) during a heavy fan-out burst is a TRANSIENT load-induced launch failure -- node.exe could not DLL-init while the box was saturated (observed: PRISM WSL Memory Guard failed 0xC0000142 at the peak of a 993-bash storm). It is NOT a broken task and does NOT need an elevated re-register. Golf remedy (in-domain, no UAC): (1) run the task's action script directly with node to confirm the script + subsystem are healthy; (2) once the burst drains, `Start-ScheduledTask` to trigger a clean run -> last-result clears to 0x0 -> fleet-task-health WARN resolves. The fleet-task-health watchdog flags it because it checks LAST-RESULT for launch-failure HRESULTs, whereas golf's census reaper=N/10 only checks State!=Disabled -- so a Ready-but-failing-last-result critical monitor passes the census but trips the watchdog. Reconcile the two."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_task_launch_failure_under_burst_2026_06_15
---


**Lesson (golf, 2026-06-15).** During the perpetual `/goal` fleet-health loop, mid-way through a sustained fan-out storm (peaked bash=993 / procs=2075), the `fleet-task-health` Stop-watchdog WARNed: `68/72 tasks healthy - PRISM WSL Memory Guard=failing`. WSL Memory Guard is one of golf's 10 CRITICAL reaper/monitor tasks.

## Why the census missed it (two different health definitions)
- Golf's per-tick **census** computes `reaper=N/10` as `count(critical tasks WHERE State != 'Disabled')`. WSL Memory Guard was `State=Ready`, so the census counted it healthy (10/10) the whole time.
- The **fleet-task-health watchdog** checks each task's `LastTaskResult` for a Windows launch-failure HRESULT. WSL Memory Guard's last run had errored, so the watchdog flagged it.
- **Reconcile:** a critical monitor can be `Ready` (enabled) yet have a failing last-result (its last scheduled launch failed). The census's `State!=Disabled` check does NOT catch that. Consider adding a last-result check to the census for the 10 critical tasks.

## Root cause: transient DLL-init-under-load, NOT a broken task
`LastTaskResult = 0xC0000142` = **STATUS_DLL_INIT_FAILED** ("application failed to initialize"). The task fired at 21:14:14 -- the exact window the 993-bash storm had the box saturated -- and node.exe could not complete DLL init under the resource contention. Evidence it was transient, not broken:
- Task structurally intact: correct action (`node scripts/system-health/27-wsl-memory-guard.mjs --json --quiet`), `State=Ready`, `RunLevel=Highest`, `missedRuns=0`, `nextRun` scheduled.
- Running the guard script DIRECTLY (golf can run node) returned `exit 0` + `status:healthy` (WSL running, cap 32GB, vmmem_ws 1.17GB well under cap) -- the script + subsystem are fine.

## Golf remedy (in-domain, no elevated re-register)
1. Diagnose: read `Get-ScheduledTaskInfo` LastTaskResult. `0xC000xxxx` STATUS_* codes during a burst = transient launch failure.
2. Run the action script directly with node to confirm script/subsystem health.
3. Once the burst drains, `Start-ScheduledTask -TaskName '<task>'` -> wait -> re-check LastTaskResult. It cleared `0xC0000142 -> 0x41301(running) -> 0x0`. Re-audit (`node scripts/fleet-task-health-watch.mjs --json`) -> `failing=none`.
- **Do NOT** jump to the elevated `install-<task>-task.ps1` re-register for a transient launch failure -- the task isn't broken. Re-register is for genuinely missing/corrupt task definitions.
- The task would ALSO have self-cleared on its own next scheduled run (nextRun 21:29) once load dropped; the `Start-ScheduledTask` just clears the WARN sooner.

## Connection
This is the burst-load cousin of [[reference_mcp_daemon_orphaned_by_design_2026_06_15]] (MCP probe-aborts under the same storm load) -- both are transient-under-load artifacts of heavy xhigh fan-out, NOT real failures. Both reinforce the pending fleet-restart (convert running chats off session-xhigh to end the storms). Siblings: [[reference_fleet_task_health_cry_wolf_2026_06_09]], [[reference_prism_task_always_active_hardening_2026_05_31]], [[feedback_golf_owns_reaper]].
