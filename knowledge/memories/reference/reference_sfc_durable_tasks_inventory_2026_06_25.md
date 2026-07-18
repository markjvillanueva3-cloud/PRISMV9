---
name: reference_sfc_durable_tasks_inventory_2026_06_25
description: "The SFC gauntlet never-stop automation is LARGELY ALREADY BUILT as durable Windows tasks (verified live 2026-06-25). A non-elevated `schtasks /query` shows 0 PRISM tasks -- that is a VISIBILITY artifact (SYSTEM/S4U-principal tasks are invisible without elevation), NOT absence. Do NOT conclude 'no durable tasks exist' from a non-elevated query."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_durable_tasks_inventory_2026_06_25
---


**Verified live 2026-06-25 (slot:oscar):** `state/shared/sfc-variability-guard.jsonl` had entries at 13:57:03 / 14:02:03 / 14:07:03 -- exactly 5 min apart, current -- proving the "PRISM SFC Variability Guard" scheduled task is REGISTERED + firing every 5 min independent of any Claude session.

**Existing durable SFC Windows-task installers (`.claude/helpers/`):**
- `install-sfc-variability-task.ps1` -> "PRISM SFC Variability Guard" (every 5 min + AtStartup, runs `sfc-variability-resume-guard.mjs`) + "PRISM SFC Variability Batch Mill" + "...Lathe" (on-demand, action = `sfc-variability-launch.mjs --domain <d>`; guard triggers them via `schtasks /run`). This is the synthetic "billions/trillions of combinations" sweep -> SFC-ACCURACY-MS1. ALREADY NEVER-STOPS.
- `install-sfc-remine-task.ps1` -> "PRISM SFC Proven Re-Mine" (weekly, runs `scripts/extract-jm-proven-speedfeed.ts`) -> mines JM PROVEN speeds/feeds from the corpus.
- `scripts/install-sfc-gauntlet-task.ps1` -> "PRISM SFC Gauntlet" (NEW 2026-06-25, U-OSC-SFC-GAUNTLET-DURABLE-TASK, every 6h) -> runs `sfc-jm-accuracy-refresh.mjs --json` (corpus build/incremental + corpus-analyze + physics-compare REPORT). This was the ONE leg that was Claude-cron-only (scheduled_tasks.json `13 3 * * *`); now durable. Distinct from the above (different runner + output: the accuracy-vs-JM report), NOT a duplicate -- but it DOES re-scan the JM corpus, mild overlap with remine's corpus touch.

**Lesson (R12 + never-claim-absence-without-deep-search):** to inventory PRISM scheduled tasks, query from an ELEVATED shell (`schtasks /query` or `Get-ScheduledTask`); a non-elevated query returns 0 even when SYSTEM/S4U tasks exist. Cross-check freshness of the task's OUTPUT artifact (guard.jsonl, *.log) to confirm a task is live. The Claude-REPL crons in `.claude/scheduled_tasks.json` are a SEPARATE mechanism (session-only); the Windows tasks are the true never-stop layer. [[reference_oscar_sfc_jm_gauntlet_accuracy_verdict_2026_06_25]] · [[reference_oscar_sfc_product_bridge_2026_06_25]].
