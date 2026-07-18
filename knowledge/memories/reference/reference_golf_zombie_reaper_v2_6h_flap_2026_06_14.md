---
name: golf-zombie-reaper-v2-6h-flap-2026-06-14
description: "RESOLVED-DIAGNOSIS (live catch 2026-06-14): 'PRISM Zombie Reaper v2=disabled' is a GENUINE ~6h flap, NOT a cry-wolf. Caught live in its Disabled window via direct Get-ScheduledTask; the Operational event log named the disabler = EventID 140 (task UPDATE / re-registration) by user 'wompu' at 12:08:29 -- something periodically RE-REGISTERS ZR2 in a disabled state and the guardian/fleet-task-health auto-re-enables it (25 reenable-ledger entries). NOT a Disable cmdlet (142), NOT a watchdog false-read. Fix target: find the ~6h registrar (ensure-all-watchdogs / a re-register cron / migration script) that lands ZR2 disabled. Coverage held by auto-re-enable."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.600Z
aliases: reference_golf_zombie_reaper_v2_6h_flap_2026_06_14
---


**Investigation (2026-06-14, slot golf, session 02a2de10).** Recurring scheduled-task safety-net WARN — `PRISM Zombie Reaper v2=disabled · [auto-re-enabled 1]` firing on ~every Stop. Chased to ground truth.

**FINAL + DEFINITIVE ROOT CAUSE (live catch):** A later light tick caught ZR2 **`Disabled`** via direct `Get-ScheduledTask` (not a watchdog read — the live CIM state itself). Re-enabled it (Disabled→Ready). The now-enabled Operational log then named the disabler: **EventID 140 @ 12:08:29 — `User "DESKTOP-N7MI1VB\wompu" updated Task Scheduler task "\PRISM Zombie Reaper v2"`.** So the disable is a **task UPDATE / RE-REGISTRATION** that lands it disabled — NOT a `Disable` cmdlet (142), NOT a watchdog false-read. Something running as the user periodically (~6h) re-registers ZR2 disabled; the guardian + fleet-task-health re-enable it (the 25 reenable-ledger rows). **It IS a genuine flap.** Fix target = find the ~6h registrar (candidate: `ensure-all-watchdogs.ps1` / a re-register cron / a migration-freeze enforcer) and make it register ZR2 ENABLED (or skip re-register when already present+enabled).

**Path honesty (R12) — I flip-flopped THREE times before the live catch settled it:** (1) cry-wolf from spot-checks always Ready; (2) "genuine flap" from the reenable-ledger; (3) RE-corrected to cry-wolf from an 8h event-log window showing only clean 5-min runs — **WRONG: that window captured only the re-enabled cycles, never the disable**; (4) FINAL: caught it live Disabled + EventID 140 named the re-registration disabler. **Lesson: a sampled event-log window can show only the healed state — catch the anomaly IN its failure window before concluding. The reenable-ledger (which logs the DETECTION) was right all along; my "Windows shows no disable" was a sampling artifact.**

## Windows ground truth (authoritative) — `Microsoft-Windows-TaskScheduler/Operational`
The Operational channel was **DISABLED** (`IsEnabled=False`, 0 records) — why the disabler was historically invisible. **ENABLED this session** via `wevtutil set-log "Microsoft-Windows-TaskScheduler/Operational" /enabled:true` (succeeded NON-elevated). 8h of capture for ZR2:
- Trigger = **PT5M (every 5 minutes)**, `ExecTimeLimit=PT2M`, `StartWhenAvailable=True`, no EndBoundary, no DeleteExpiredAfter, **`Settings.Enabled=True`**.
- Runs complete with **return code 0** (clean) on the 5-min cadence (e.g. 11:17:20, 11:21:25).
- **ZERO EventID-142 (task disabled). ZERO EventID-140 (registered/updated). ZERO EventID-111 (terminated/time-limit).** i.e. Windows NEVER disables it, never rewrites its definition, never even time-limit-kills the action.

## Reconciliation — the WARN is NOT corroborated by Windows
The `state/shared/fleet-task-reenable-ledger.jsonl` has 25 rows = 25 times `fleet-task-health-watch.mjs` *classified* ZR2 `disabled` (its `selectReenableTargets`→`Enable-ScheduledTask`, which on an already-enabled task is a no-op "success"). But Windows logged NO disable in 8h. **The watchdog's `disabled` reads are therefore almost certainly FALSE** — a transient `Get-ScheduledTask` state read (a race against the 5-min run cycle: State can momentarily mis-surface) or a `sampleScheduledTasks`/`classifyTask` bug. The "~6h cadence" I cited earlier is the cadence of the watchdog's FALSE detections, NOT the task (which runs every 5min). Sibling of [[reference_fleet_task_health_cry_wolf_2026_06_09]] / [[reference_fleet_task_health_47_benign_2026_06_11]] — same cry-wolf family.

## Definitive test (instrumentation now in place — next golf tick)
The Operational log is now durably enabled. **On the NEXT reenable-ledger row for ZR2**, check the Operational log for a matching EventID-142 within ±2min of that ledger timestamp:
```powershell
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-TaskScheduler/Operational'; StartTime=(Get-Date).AddHours(-8)} |
  Where-Object { $_.Message -like '*Zombie Reaper v2*' -and ($_.Id -eq 142 -or $_.Message -like '*disabl*') } |
  Sort-Object TimeCreated | Select-Object TimeCreated, Id, Message | Format-List
```
- **No matching 142 ⇒ PROVEN false read** → fix the watchdog: harden `sampleScheduledTasks` against transient State reads (e.g. re-sample once on a `Disabled` hit before classifying, or require 2 consecutive disabled reads). That kills the every-Stop WARN noise at the source.
- **A matching 142 ⇒ real disabler** → its message names the principal/cause; fix root cause.

## Status
**Coverage UNAFFECTED** — ZR2 runs every 5min and completes rc=0 regardless of the false WARN; the (no-op) auto-heal does no harm. Priority = **low-medium** (eliminate WARN noise so a REAL reaper failure isn't lost in cry-wolf). Sibling memories above; watchdog = [[reference_fleet_task_health_ms0_2026_05_17]]; ownership [[feedback_golf_owns_reaper]].
