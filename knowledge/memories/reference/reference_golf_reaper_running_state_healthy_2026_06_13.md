---
name: golf-reaper-running-state-healthy
description: "PRISM Fleet Reaper task State=Running + LastTaskResult=267009 (SCHED_S_TASK_RUNNING) is HEALTHY mid-sweep — do NOT Start-ScheduledTask it"
metadata:
  node_type: memory
  type: feedback
---

When the golf zombie-watch polls the durable **`PRISM Fleet Reaper`** scheduled task, `Get-ScheduledTask` will often return **`State=Running`** and `Get-ScheduledTaskInfo` **`LastTaskResult=267009`**. Both are HEALTHY — the task fires every ~5 min and you simply caught it mid-sweep.

- `267009` = `0x41301` = **`SCHED_S_TASK_RUNNING`** ("the task is currently running") — an informational sentinel, NOT a failure HRESULT. The *previous* run is still in-flight so a completion code isn't posted yet.
- Other OK codes: `0` (last run succeeded), `267011`/`0x41303` (has-not-run-yet), `267008`/`0x41300` (ready).
- **Do NOT `Start-ScheduledTask` a `Running` task.** It's a harmless no-op (default `MultipleInstances=IgnoreNew`) but produces a false "had to restart it" signal in the report. Only `Start` when `State=Disabled`; surface a WARN only on a genuine failure HRESULT (negative / `0x8…`).

Observed 2026-06-13 (slot golf /yolo zombie-watch, session 02a2de10): a naive `if (State -ne 'Ready') { Start-ScheduledTask }` misfired on a healthy mid-sweep `Running` state. Treat **Ready AND Running** as healthy. The 15-min zombie-watch cron prompt was corrected the same session.

Sibling reap-discipline notes: [[feedback_golf_ancestry_orphan_reaping]] · [[reference_reaper_guardian_false_negative_2026_05_26]] · [[feedback_golf_insession_tail_not_viable]].
