---
name: reference_fleet_task_health_recovery_2026_05_18
description: 5-installer paste-ready recovery for fleet-task-health WARN — re-register missing PRISM scheduled tasks
aliases: reference_fleet_task_health_recovery_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.119Z
---


2026-05-18 (delta /loop). `fleet-task-health-watch.mjs` Tier-3 Stop hook
classifies `PRISM *` scheduled tasks; when one drops out of
`Get-ScheduledTask` it's MISSING and the watchdog WARNs in AGENT_CHAT
repeatedly because it never auto-registers (advisory by design). 5 tasks
were missing today for 4+ hours: Blueprint Join Refresh / Memory Pressure
Auto-Relief / NN-Graph Retrain / RGS Tool Planner / Source Monitor Sweep.

Each maps to an installer at `H:/prism/.claude/helpers/install-<slug>-task.ps1`
(slug ≠ task name — grep `$TaskName` to discover the registered name). All
default to SYSTEM principal as of U-FR-ADMIN-HUNT (2026-05-18) and need
elevation for Register-ScheduledTask.

**Paste-ready elevated recovery** (Win+X → Terminal (Admin)):
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$h='H:/prism/.claude/helpers'; & \"$h/install-blueprint-join-refresh-task.ps1\" -RunNow; & \"$h/install-memory-pressure-task.ps1\" -RunNow; & \"$h/install-nn-graph-retrain-task.ps1\" -RunNow; & \"$h/install-rgs-planner-task.ps1\" -RunNow; & \"$h/install-source-monitor-task.ps1\" -RunNow"
```

Each installer is idempotent (un-register-if-present + register + `-RunNow`).
Verify: `Get-ScheduledTask | ? TaskName -like 'PRISM*' | Select TaskName,State`
(expect 13 Ready, was 8) or `node H:/prism/scripts/fleet-task-health-watch.mjs --once --json | jq .missing`.

Recurring class — Windows scheduled tasks are per-host, not git-tracked,
not auto-re-registered on machine-switch or fresh-clone. The watchdog
catches the gap; this pattern closes it. Why I named [[fleet-task-health-recovery]]
as a LESSON wiki — recovery playbook, not architecture.

Anti-patterns: don't edit watchdog's `missing[]` list (hides degradation);
don't try to register from Bash tool sandbox (no elevation); don't disable
the watchdog to silence (breaks fleet-wide visibility).

Wiki: `knowledge/wiki/lessons/fleet-task-health-recovery.md`. Sisters:
[[reference_fleet_task_health_ms0_2026_05_17]] (watchdog),
[[reference_fleet_reaper_system_principal_2026_05_18]] (same installer family),
[[feedback_never_delete_only_disable]] (reversibility).
