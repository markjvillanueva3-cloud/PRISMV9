---
name: hermes-obsidian-bridge-stall-2026-06-14
description: 2026-06-14 (slot:bravo) -- the "PRISM Hermes-Obsidian Bridge" scheduled task (15-min cadence) silently stopped auto-running for 3 days (PSN leg #1 Hermes<->Obsidian sync dead); restored via manual Start-ScheduledTask. Includes an R12 self-correction: do NOT infer a task's cadence from LastRun->NextRun -- READ the trigger repInterval.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.606Z
aliases: reference_hermes_obsidian_bridge_stall_2026_06_14
---


2026-06-14 (slot:bravo). Surfaced by the fleet-task-health Stop WARN ("PRISM Hermes-Obsidian Bridge=stale, PRISM Slot Worktree Migration Status=stale").

## R12 self-correction (the lesson)
I first called it a **false-positive** -- I inferred a "~3-day cadence" from `LastRun=6/11 -> NextRun=6/14` and concluded a 3-day-old run was healthy. **WRONG.** Reading the actual trigger (`Get-ScheduledTask .Triggers`) showed:
- Hermes-Obsidian Bridge: `MSFT_TaskTimeTrigger repInterval=PT15M` (**every 15 minutes**), repDuration P3650D.
- Slot Worktree Migration Status: `repInterval=PT1H` (**hourly**) + a BootTrigger.
So a 3-day gap on a 15-min/1h task = **genuinely stale** (the fleet-task-health classifier was CORRECT: `stale = interval x 3` => 45 min / 3 h thresholds, both blown by 3 days). **Lesson: never infer a scheduled task's cadence from LastRun/NextRun; READ the trigger's `repInterval`. `NextRun` is the next scheduled slot, not the cadence.** This was the exact "verify before claiming" trap (sibling of [[feedback_verify_actual_contract_not_proxy]]).

## The real finding + fix
The Hermes<->Obsidian bridge (PSN leg #1, directly relevant to every "synergize with the obsidian vault" goal) had **not auto-run since 6/11** -- 3 days of dead sync -- while 66/69 other PRISM tasks stayed healthy (so NOT a machine-off/sleep miss; these 2 specifically stalled their repetition).
- **Immediate mitigation (done):** `Start-ScheduledTask` on both -> ran NOW, `LastResult=0x0` (success). Sync restored. (Start needs no elevation.)
- **Durable fix (operator-gated, elevation):** `Slot Worktree Migration Status` re-registers via `.claude/helpers/install-slot-worktree-migration-status-task.ps1` (elevated). **The "PRISM Hermes-Obsidian Bridge" task has NO matching install-*.ps1** (grepped all of them) -- its registration source is unknown; golf/operator should locate it or author an installer. The task EXECUTES fine (0x0); only its 15-min repetition stalled -- root cause of the repetition-stall is unconfirmed.

## Action for golf (fleet-task-health owner)
The classifier is correct here. But it should ALSO surface the per-task repInterval + last-N missed-run count in the WARN so a reader doesn't (as I did) misread cadence -- and the "re-register via install-<task>.ps1" advice is misleading when no such installer exists (Hermes-Obsidian Bridge).

-> [[feedback_verify_actual_contract_not_proxy]] · [[feedback_bravo_launches_hermes_obsidian_apps]] · [[reference_ollama_generate_wedge_gpu_free_2026_06_14]]
