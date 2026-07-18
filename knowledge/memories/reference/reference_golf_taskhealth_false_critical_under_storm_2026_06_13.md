---
name: golf-taskhealth-false-critical-under-storm-2026-06-13
description: "Under a severe hook-storm (procs 2000+), the fleet-task-health audit's own PowerShell spawn times out (ETIMEDOUT) and FALSE-flags healthy *Running* scheduled tasks as 'failing'/CRITICAL. Verify with a direct Get-ScheduledTask; if IT succeeds and shows State=Running/Ready + Enabled, the task is fine and the banner self-clears when the storm drains."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_taskhealth_false_critical_under_storm_2026_06_13
---


**Incident (2026-06-13 ~17:25Z, slot golf /yolo zombie-watch, session 02a2de10).** During a sustained mega hook-storm (procs oscillating 1300–2638, node+bash ~1000–1271, driven by ~26 active chat-bus claims), the Stop-hook task-health safety net fired **`⚠ PRISM scheduled-task safety net CRITICAL — 60/67 tasks healthy · PRISM Fleet Memory Monitor=failing`**. This was a **FALSE-POSITIVE**.

**Proof of false-positive:** a direct `Get-ScheduledTask 'PRISM Fleet Memory Monitor'` (which succeeded) showed **State=Running, Enabled=True, Last=0x41301 (267009 = SCHED_S_TASK_RUNNING, benign), MissedRuns=0, NextRun scheduled** — i.e. the task was actively running and healthy. Then a manual fresh audit `node scripts/fleet-task-health-watch.mjs --json` returned **`{"ok":false,"error":"fleet-task-health: PowerShell spawn failed: ETIMEDOUT","code":3}`**.

**Root cause = audit infrastructure starvation, NOT a failing task.** Under procs 2000+, spawning a child PowerShell to enumerate scheduled tasks **times out (ETIMEDOUT)**. The audit interprets the tasks it couldn't query as "failing"/degraded → emits CRITICAL. The same storm starvation also produces this episode's sibling false-positives: `consolidate-graph: mcp-down (operation aborted / fetch failed)` (its short-timeout fetch aborts while a direct `curl -sI :3100` returns 404 = UP, 3-4/4 every time) and `stop-regression-bundle: N gates NOT evaluated (timeout/crash)` escalating to 10/10. **The whole Stop-hook/audit layer degrades under the storm; the underlying services (MCP :3100, the scheduled tasks) stay healthy.**

**Golf rule:** on a task-health **CRITICAL/WARN naming a specific task as failing**, ALWAYS verify with a direct `Get-ScheduledTask <name>` + `Get-ScheduledTaskInfo` FIRST. If that call **succeeds** and shows State=Running|Ready + Enabled=True (+ a benign LastResult in {0,1,267009,267011,267014}), the task is fine — the banner is a storm/load false-positive and **self-clears when the storm drains** (a fresh audit runs clean once PowerShell spawns succeed again). Do NOT elevate-re-register a task that is actually Running. Only act if the direct query shows State=Disabled (→ Enable-ScheduledTask) or the task is genuinely absent (→ re-register). The aging banner timestamp (1m→5m with no reset) also confirms a frozen stale-cache snapshot, not fresh re-detection. Siblings: [[reference_fleet_task_health_47_benign_2026_06_11]] · [[golf-reaper-lastresult-1-is-benign-sweep-acted]] · [[golf-parent-dead-count-is-noisy-use-defunct-childless]] · [[reference_reaper_guardian_false_negative_2026_05_26]].
