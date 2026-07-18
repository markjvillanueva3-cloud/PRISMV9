---
name: reference_stale_tasks_overdue_not_broken_2026_06_25
description: "The recurring \"PRISM NN-Graph Retrain / Tribal Embed = stale -> re-register from elevated shell\" Stop-hook warning is a MIS-diagnosis -- both tasks are Ready + lastTaskResult 0 (success), just OVERDUE (scheduler didn't fire). They do NOT need re-registering."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.211Z
aliases: reference_stale_tasks_overdue_not_broken_2026_06_25
---


**Diagnosis (slot:papa, 2026-06-25 autonomous overnight).** The Stop-hook safety-net WARN that fires every turn -- "PRISM NN-Graph Retrain=stale, PRISM Tribal Embed=stale ... re-register from an ELEVATED shell via `.claude/helpers/install-<task>-task.ps1`" -- OVER-states the fix. `node scripts/fleet-task-health-watch.mjs --json` shows both are healthy, just overdue:

- **PRISM NN-Graph Retrain**: `status:stale, state:Ready, lastTaskResult:0 (success), lastRunTime 2026-06-17, interval 360min`. Stale only because last fire was ~7.4 days ago (threshold = interval x3 = 1080min). NOT failing -- last run succeeded.
- **PRISM Tribal Embed**: `status:stale, state:Ready, lastTaskResult:0 (success), lastRunTime 2026-06-24T19:52Z, interval 30min`. Last succeeded ~7h ago; overdue vs the 90min (30x3) threshold.

**So:** both tasks are REGISTERED + Ready + last-run-SUCCESS. They do NOT need re-registering -- they just haven't been triggered on schedule (a Windows Task Scheduler non-fire, e.g. machine busy / scheduler hiccup, not a task defect). The `fleet-task-health-watch` "stale" status keys purely on last-run-age vs interval x3, so a healthy-but-not-recently-fired task reads "stale" and the hook appends the generic re-register advice.

**Correct action (operator, AM):** just TRIGGER them (`schtasks /run /tn "PRISM Tribal Embed"`) or let the scheduler catch up -- re-registering is unnecessary (and the install scripts would just rewrite an already-correct registration). If they REPEATEDLY fail to auto-fire, THEN investigate the Task Scheduler trigger/principal -- but lastTaskResult:0 says the task body works.

**Relevance to papa's work:** Tribal Embed last embedded ~7h ago, BEFORE the 102 rescued domain-corpus LoRA pairs + the 65-spec rescue this session. Those become semantically searchable in the tribal index only on Tribal Embed's NEXT fire. Do NOT manually run the tribal-embed script to force it -- it has the V8-string-cap + fail-open clobber regression history ([[reference_tribal_index_v8_string_cap_2026_06_08]]); let the dedicated scheduled task do it.

**Lesson:** a "stale" task-health status is an AGE signal (last-run vs interval), NOT a health/failure signal -- check `lastTaskResult` + `state` before recommending a re-register. (sibling of [[reference_token_awareness_stale_zone_fix_2026_06_11]] -- staleness is orthogonal to the thing it is being read as.)

**CORRECTION (R12 self-check, same session, ~hours later):** the "just trigger it" advice above was INCOMPLETE for Tribal Embed. A `Start-ScheduledTask -TaskName 'PRISM Tribal Embed'` was a NO-OP -- `Get-ScheduledTaskInfo` shows `state=Running, LastRunTime=2026-06-24T21:55:55, lastTaskResult=267009 (SCHED_S_TASK_RUNNING)` UNCHANGED before+after the trigger. So the task is NOT idle/overdue -- it has a run **STUCK in Running state for ~5 hours** (a 30-min-interval task running 5h is abnormal: hung, or doing a full re-embed of the 537MB/33K-entry index instead of incremental). That is WHY it reads "stale": `fleet-task-health-watch` keys on last-COMPLETION age, and a stuck run never completes, so it looks overdue. You cannot start an already-Running task; the trigger did nothing.

**CORRECT operator action (SUPERVISED -- do NOT do unattended):** investigate the stuck embed process (is it genuinely hung, or a slow full re-embed?). If hung: `Stop-ScheduledTask` then let the next scheduled run restart -- BUT the tribal-embed has the V8-string-cap + fail-open CLOBBER regression history ([[reference_tribal_index_v8_string_cap_2026_06_08]]); stopping it MID-WRITE risks a torn-index corruption of the 537MB brain. So stop+restart only with the clobber-guard confirmed active + a backup. Papa did NOT stop it (unsupervised corruption risk). Root meta-lesson: `state=Running` for >> the task interval is a HUNG-RUN signal, distinct from "overdue/never-fired" -- check LastRunTime-age-vs-interval AND whether it is currently Running; a stuck run masquerades as "stale/overdue".
