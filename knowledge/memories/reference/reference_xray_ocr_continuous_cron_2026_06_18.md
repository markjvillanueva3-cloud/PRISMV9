---
name: reference_xray_ocr_continuous_cron_2026_06_18
description: "The PRISM OCR Training Loop scheduled task is now CONTINUOUS (not nightly): trigger repeats every 1h (Duration P365D), MultipleInstances=IgnoreNew so overlapping fires are no-ops and a run relaunches within ~1h of any 5h-window end or crash. Resumable per-print + reaper-immune -> self-sustaining, no manual restart. Also: --page-classify now enabled on the run. slot:xray 2026-06-18."
type: reference
slot: xray
source: prism-memory
synced: 2026-06-27T20:30:47.275Z
aliases: reference_xray_ocr_continuous_cron_2026_06_18
---


# OCR closed-loop training -> CONTINUOUS cron -- slot:xray 2026-06-18

Operator: "is the closed loop training running in the background or do we need to set crons up
to run continuously?" -> it WAS nightly-only; now made continuous.

## Before (nightly, ~11 nights to drain)
`PRISM OCR Training Loop` scheduled task: trigger `Daily @ 02:00`, NO repetition; runner uses a 5h
weak-label window (`--max-time-sec 18000`). ExecutionTimeLimit PT12H. So ~5h/day of processing
(~700 prints/night) -> the 7142-print corpus drained over ~11 nights; ~19h/day idle.

## After (continuous, ~2-3 days to drain)
Changed the trigger to repeat: `RepetitionInterval=PT1H, RepetitionDuration=P365D`
(`Set-ScheduledTask -Trigger` with `$trigger.Repetition = (...).Repetition`). `MultipleInstances`
is already `IgnoreNew` (installer default), so the hourly fires that land WHILE a 5h window is
running are silently ignored (no overlap, no queue backlog); the first hourly tick AFTER a window
ends (5h cap) or a crash relaunches the run within ~1h. Net: near-continuous, self-sustaining --
no manual `Start-ScheduledTask` needed anymore. Resumable per-print cursor + reaper-immune
(node parented to Task Scheduler service) make a relaunch cost <=1 print.

## Verified live
`Get-ScheduledTask` -> `Trigger RepetitionInterval=PT1H Duration=P365D`, `MultipleInstances=IgnoreNew`,
`State=Running`, 1 live node proc carrying `--page-classify`. cursor 305/7142 at change time.

## Overhead + revert
- Overhead: each 5h window recalibrates 24 synthetic-GT prints (~20min, ~7% of the window). Acceptable.
- The 5h window itself is unchanged (wrapper `--max-time-sec 18000`); only the TRIGGER cadence changed.
- REVERT to nightly: `Set-ScheduledTask -TaskName 'PRISM OCR Training Loop' -Trigger
  (New-ScheduledTaskTrigger -Daily -At 2am)` (drops the hourly repetition).
- Verify progress any time: `wc -l state/shared/ocr-training-loop/corpus-train/processed-cursor.jsonl`
  (climbs toward 7142). Liveness = GPU util + curls + node-alive, NOT log mtime (block-buffered).

## GOTCHA (2026-06-17): a CONTINUOUS trigger does NOTHING if the task is DISABLED
Found the task `State=Disabled` (last run terminated 15:03, LastResult `0x41306`=SCHED_S_TASK_TERMINATED),
0 node procs, GPU 0% util -- training silently stopped despite the `PT1H/P365D` trigger still being
present. A disabled task never fires; the trigger config alone is NOT proof it's running. Cause of the
disable was not determinable in-session (manual / hygiene / crash -- do NOT fabricate). Fix:
`Enable-ScheduledTask -TaskName 'PRISM OCR Training Loop'; Start-ScheduledTask -TaskName 'PRISM OCR
Training Loop'` -> State=Running (`0x41301`), node pid carries `--page-classify`, GPU->99%, curls=2,
cursor resumed 305->422. **Verification checklist must read `$t.State` FIRST, not just `$_.Repetition`.**

Related: [[reference_xray_corpus_train_nightly_armed_2026_06_16]] (the prior nightly arming this
supersedes) · [[reference_xray_percall_timeout_cap_2026_06_16]] (per-call cap that keeps a window
healthy) · the --page-classify enablement (commit b1bc1c58a7).
