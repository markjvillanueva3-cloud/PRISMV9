---
name: golf-reaper-lastresult-1-is-benign-sweep-acted
description: "PRISM Fleet Reaper scheduled-task LastTaskResult=1 is BENIGN (the sweep took reap action and succeeded) — NOT a failure, NOT a cwd/principal/registration bug. Do not re-register or 'fix' it."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.598Z
aliases: reference_golf_reaper_lastresult_1_is_benign_2026_06_13
---


The durable **`PRISM Fleet Reaper`** scheduled task frequently shows `Get-ScheduledTaskInfo … LastTaskResult=1`. **This is benign — do NOT treat the task as failed, do NOT re-register it, do NOT "fix" the script or the task definition.**

Verified 2026-06-13 (slot golf /yolo zombie-watch, session 02a2de10):
- Task is **Registered, State=Ready, scheduled** (~5-min cadence; principal SYSTEM/ServiceAccount; action `H:\Tools\nodejs\node.exe "H:\PRISM\scripts\fleet-reaper-sweep.mjs" --once`; **no WorkingDirectory** → cwd defaults to System32).
- The sweep **runs to completion and does real work** under that System32 cwd — reaps stuck bashes, detects crashes, classifies stale slots. **stderr is empty; no crash; not a cwd bug.**
- `fleet-reaper-sweep.mjs:3439` is `process.exit(result.ok ? 0 : 1)`. Empirically the exit code is **activity-dependent**: a sweep that REAPED something (observed: 2/2 stuck bashes) exits **1**; a quiet sweep (reaped 0, `ok:true`, `reapFailed:0`) exits **0** (confirmed `NODE_EXIT=0` on a `--json` run). The design comment near line 1971 states exit-1 is a deliberate load-bearing verdict explicitly protected from being flipped by Ollama glitches. So `LastResult=1` = "the sweep took reap action," NOT "the task failed."

**PITFALL — don't mask the exit code:** running `… --once --json | tail -42` reports the PIPE's exit status (tail), not node's. To see the real reaper exit code, capture it directly (`node … > f.json; echo $?`).

**267014 = `SCHED_S_TASK_TERMINATED` is ALSO benign (added 2026-06-13).** Observed `LastTaskResult=267014` (0x41306) with the task State=**Ready** + NextRun scheduled. This is another member of the SCHED_S_ informational-success family (0x41300–0x4131F) like 267009/267011 — it means the *prior run was terminated* (hit its ExecutionTimeLimit, or an overlapping-instance stop), NOT that the task failed. The task is Ready and will run again; the in-session `--once` sweeps (identical invocation) all complete in seconds, proving the script doesn't hang, and guardian + Stop-hook + the 15-min loop give redundant coverage. **Benign scheduled-task result set is therefore {0, 1, 267009, 267011, 267014}** — only escalate OUTSIDE that. (If 267014 becomes *persistent* across many consecutive ticks, then check the task's `ExecutionTimeLimit` — a one-off/occasional 267014 is benign.)

**Two recurring false alarms for THIS task, both to verify-then-ignore:** (1) guardian hook "PRISM Fleet Reaper is NOT REGISTERED" = FALSE-NEGATIVE — confirm with `Get-ScheduledTask` first ([[reference_reaper_guardian_false_negative_2026_05_26]]); (2) `LastResult=1` = benign sweep-acted signal. Only escalate a scheduled-task result code OUTSIDE {0, 1, 267009, 267011}. Siblings: [[reference_golf_reaper_running_state_healthy_2026_06_13]] · [[reference_golf_parent_dead_count_noisy_use_defunct_childless_2026_06_13]].
