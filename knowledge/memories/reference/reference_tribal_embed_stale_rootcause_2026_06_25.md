---
name: reference_tribal_embed_stale_rootcause_2026_06_25
description: Fleet hygiene lesson (india diag, 2026-06-25) -- a "PRISM <task>=stale" WARN is NOT necessarily a registration degradation. The PRISM Tribal Embed task was state=Ready (registered fine); the real causes were (1) lastTaskResult=1 from a TRANSIENT Ollama-down when it fired + (2) NextRun=EMPTY (the repeating trigger was gone, so it never retried). Triggering it via Start-ScheduledTask with Ollama up completed exit 0 and cleared the staleness. Check lastTaskResult + NextRun BEFORE assuming the elevated-re-register remediation.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.227Z
aliases: reference_tribal_embed_stale_rootcause_2026_06_25
---


# "Tribal Embed=stale" root-caused + fixed (india, 2026-06-25)

## The recurring advisory
The Stop-hook scheduled-task safety net surfaced `PRISM Tribal Embed=stale (80/88 healthy)` on
every Stop, advising "re-register from an ELEVATED shell via install-<task>-task.ps1". That generic
remediation was misleading -- the task was NOT degraded/unregistered.

## Real root cause (diagnose, do not assume -- R12)
`fleet-task-health-watch.mjs --json` + `Get-ScheduledTaskInfo`:
- task **state=Ready** (registered fine -- NOT a registration failure).
- **lastTaskResult=1** at 02:55 = the embed SCRIPT (`scripts/embed-pdf-tribal-tips-into-index.mjs`,
  zulu's PDF-TRIBAL-HERMES) exited 1. The embed needs Ollama `nomic-embed-text:latest`; it was a
  TRANSIENT Ollama-down when the task fired at 02:55.
- **NextRun=EMPTY** = the repeating 30-min trigger is gone, so after the transient failure the task
  NEVER retried -> 309 min stale.
- The index itself is HEALTHY: 105,167 entries (not clobbered); `--dry-run` exit 0 (reads 34,969
  source tips clean); `--limit 3` exit 0 with Ollama up (embed+write path proven, lock-skip exit is 4
  not 1).

## Fix (non-elevated, verified)
`Start-ScheduledTask -TaskName "PRISM Tribal Embed"` (Ollama now up) -> ran through the scheduler ->
**LastResult=0x0, completed exit 0, LastRun fresh** -> staleness cleared, index refreshed. A one-shot
manual `node` run does NOT update the scheduled task's lastRunTime; you must trigger via the scheduler.

## Durable gap (operator-gated)
NextRun=EMPTY means the repeating trigger needs restoring -- re-register via the elevated
install-<task>-task.ps1 (elevation = operator-gated). Until then the task runs only when manually
triggered. Flagged to golf (task-health) + zulu (script owner) via chat bus.

## Lesson (fleet-wide, golf/fleet-task-health)
A "<task>=stale" WARN has THREE distinct causes -- distinguish them before acting: (a) registration
degraded (state != Ready -> re-register), (b) last RUN failed (lastTaskResult != 0 -> fix the script /
its deps, e.g. Ollama down), (c) trigger not firing (NextRun empty -> restore the repeating trigger).
The advisory's blanket "re-register elevated" only fixes (a)+(c); a transient (b) just needs a re-run.

**Builds on papa's read-only diagnosis** [[reference_tribal_embed_transient_under_load_2026_06_25]] (which
corrected [[reference_stale_tasks_overdue_not_broken_2026_06_25]]) -- papa identified the transient-under-load
cause; THIS note adds the NextRun=EMPTY trigger-gap finding + the APPLIED + verified fix (Start-ScheduledTask
-> exit 0). Sibling: [[reference_golf_disabled_reaper_reenable_2026_06_15]] · [[reference_golf_task_launch_failure_under_burst_2026_06_15]].
