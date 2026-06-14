---
title: Fleet-task-health recovery — re-register missing scheduled tasks
domain: backend-dev
tier: lesson
created: 2026-05-18
created_by: claude-68aad091 (delta) — /loop iter11
related:
  - architecture/fleet-task-health-ms0
  - architecture/fleet-reaper
  - reference/reference_fleet_task_health_ms0_2026_05_17
tags:
  - fleet-hygiene
  - scheduled-tasks
  - operator-action
  - recovery-playbook
---

# Lesson — When `fleet-task-health-watch` says tasks are MISSING, re-register them

## The signal

`fleet-task-health-watch.mjs` is the Tier-3 advisory Stop hook (FLEET-TASK-HEALTH-MS0)
that classifies each `PRISM *` scheduled task as
`healthy|disabled|failing|stale|never-ran|unknown-state`. When a task drops out
of `Get-ScheduledTask | Where-Object TaskName -like 'PRISM*'` entirely it's
classified **MISSING**, and the watchdog posts an `AGENT_CHAT` entry like:

```jsonl
{"ts":"2026-05-18T22:28:12.296Z","from":"fleet-task-health-watch","kind":"task-health",
 "level":"warn","missing":["PRISM Blueprint Join Refresh","PRISM Memory Pressure Auto-Relief",
 "PRISM NN-Graph Retrain","PRISM RGS Tool Planner","PRISM Source Monitor Sweep"],
 "message":"PRISM scheduled-task safety net degraded (WARN)..."}
```

The watchdog is **advisory** — it never auto-registers. Re-registration is an
operator action because `Register-ScheduledTask` requires admin (UAC prompt).

## Why tasks go missing

Three recurring causes observed on the fleet (2026-05-17..18):

1. **Per-machine drift.** `Get-ScheduledTask` is per-host. PC-A registered
   them last week; the operator switched to PC-B and the tasks were never
   re-installed there. (`settings.json` is per-machine too — same class.)
2. **Stale watchdog rollover.** Today's watchdog snapshot listed 7 tasks at
   19:48 and only **5** were missing — but by 22:28 the snapshot listed 8
   tasks with a different 5 missing (Cleanup Orchestrator dropped off the
   missing list, Memory Pressure joined). Tasks come and go between sweeps;
   one-shot `Get-ScheduledTask` polls catch a moment, not a steady state.
3. **Operator-initiated `Unregister-ScheduledTask`** during a debug session,
   never re-installed.

The watchdog WARNs the same 5 tasks repeatedly because nothing closes the
loop — it has no auto-fix. The recovery pattern is the operator's job.

## Recovery pattern

Every PRISM scheduled task has an installer at
`H:/prism/.claude/helpers/install-<slug>-task.ps1`. The installer:

- Sets `$TaskName = 'PRISM <Pretty Name>'` (back-tick or constant; this is
  the line you grep to discover the exact registered name).
- Throws `"Run from an ELEVATED PowerShell — (un)registering the scheduled
  task '$TaskName' needs admin rights."` when launched without elevation.
- Supports `-RunNow` (fire once immediately after registering),
  `-Uninstall` (`Unregister-ScheduledTask` reversal), and per-task
  scheduling defaults (cadence, principal, start-offset phase).
- Defaults to **SYSTEM principal** as of `U-FR-ADMIN-HUNT` (2026-05-18) —
  prior S4U mode would `Stop-Process: Access is denied` on elevated /
  cross-context node processes (see [[reference_fleet_reaper_system_principal_2026_05_18]]).

The mapping (verified 2026-05-18):

| MISSING task name              | Installer (`.claude/helpers/`)            |
| ------------------------------ | ----------------------------------------- |
| PRISM Blueprint Join Refresh   | `install-blueprint-join-refresh-task.ps1` |
| PRISM Memory Pressure Auto-Relief | `install-memory-pressure-task.ps1`     |
| PRISM NN-Graph Retrain         | `install-nn-graph-retrain-task.ps1`       |
| PRISM RGS Tool Planner         | `install-rgs-planner-task.ps1`            |
| PRISM Source Monitor Sweep     | `install-source-monitor-task.ps1`         |

Note: the installer slug ≠ the task name. The watchdog name comes from
`$TaskName` inside each installer; the file name is its own convention.
`grep TaskName .claude/helpers/install-*-task.ps1` is the discovery query.

## Paste-ready recovery command

Run from an **ELEVATED PowerShell** (Win+X → Terminal (Admin)):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "$h='H:/prism/.claude/helpers'; & \"$h/install-blueprint-join-refresh-task.ps1\" -RunNow; & \"$h/install-memory-pressure-task.ps1\" -RunNow; & \"$h/install-nn-graph-retrain-task.ps1\" -RunNow; & \"$h/install-rgs-planner-task.ps1\" -RunNow; & \"$h/install-source-monitor-task.ps1\" -RunNow"
```

What this does:
- Each installer un-registers its task if present (idempotent), re-registers
  it with the canonical schedule, and fires `-RunNow` so you don't wait for
  the next cadence to confirm it works.
- Failures are per-installer — one bad installer doesn't kill the others
  (each `&` invocation is its own scope; PowerShell continues on
  cmdlet-level errors unless `$ErrorActionPreference = 'Stop'`).

## Verification

After running, the watchdog's next Stop sweep should drop those 5 from
`missing[]`:

```bash
# Manual one-shot probe (skip the Stop wait):
node H:/prism/scripts/fleet-task-health-watch.mjs --once --json | jq '.missing // .summary'
```

Or check Windows directly:

```powershell
Get-ScheduledTask | Where-Object TaskName -like 'PRISM*' |
  Select-Object TaskName, State |
  Sort-Object TaskName
```

You should see 13 tasks Ready (was 8). The next `fleet-task-health-watch`
Stop sweep will downgrade WARN → clean.

## Anti-patterns

- **Don't kill the WARN by editing the watchdog's `missing[]` list.** That
  hides the degradation; the watchdog correctly surfaces it.
- **Don't try to register from the Bash tool sandbox.** Claude's Bash tool
  cannot elevate; `Register-ScheduledTask` fails silently or throws. The
  user must run the elevated command — Claude can only *prepare* the
  paste.
- **Don't disable the watchdog (`PRISM_FLEET_TASKHEALTH_DISABLE=1`) to
  silence the WARN.** That breaks the entire safety net visibility for the
  rest of the fleet. The WARN exists *because* you want to know.

## Why this is a recurring class

PRISM has ~13 PRISM-prefixed scheduled tasks across two PCs. They are NOT
git-tracked (Windows Task Scheduler stores them in registry/XML, not the
repo) and they're NOT re-registered automatically on fresh-clone or
machine-switch. Every machine pivot or task-debug session has the potential
to leave gaps. The watchdog catches the gaps; this recovery pattern closes
them.

A future hardening (NOT in scope here) would be to ship a single
`install-all-prism-tasks.ps1` umbrella installer that loops over the
known set and re-registers any missing ones — operator-friendly idempotent
recovery in one command. The blueprint is already here in this lesson.

## See also

- [[fleet-task-health-ms0]] — the watchdog architecture (FLEET-TASK-HEALTH-MS0)
- [[fleet-reaper]] — sister scheduled-task hygiene system (FLEET-REAPER-MS0/MS1/MS2)
- [[reference_fleet_reaper_system_principal_2026_05_18]] — SYSTEM-vs-S4U decision
  for the same installer family
- [[feedback_never_delete_only_disable]] — `-Uninstall` / `Disable-ScheduledTask`
  reversibility doctrine
