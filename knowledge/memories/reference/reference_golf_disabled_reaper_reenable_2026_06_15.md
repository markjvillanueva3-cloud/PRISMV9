---
name: golf-disabled-reaper-reenable-2026-06-15
description: "ROOT CAUSE FOUND + FIXED (golf, 2026-06-15): the recurring 'crash-critical PRISM scheduled tasks keep getting silently DISABLED' pattern (alpha re-enabled 7 on 2026-05-19 2bc54961b; golf re-enabled Zombie Reaper v2 on 2026-06-09; again 2026-06-15) was NOT a peer/Windows/operator disable -- it was `PRISM Task Hardener` (harden-prism-tasks.ps1, runs every 6h) FALSE-disabling healthy tasks via a buggy script-path regex. `Get-TaskScript` used `([A-Za-z]:\\[^\"]+?\.(?:mjs|js|ps1))` which excluded only DOUBLE-quotes, so when a task command had a FULL-PATH interpreter before the script -- unquoted (`H:\\Tools\\nodejs\\node.exe H:\\prism\\scripts\\foo.mjs`) or quoted (`\"& 'C:\\..node.exe' 'H:\\..foo.mjs'\"`) -- the non-greedy match SPANNED the space/quote and concatenated interpreter+script into a garbage path that fails Test-Path -> hardener concluded scriptMissing -> set Enabled=false. FIX: regex `[^\"]` -> `[^\"'\\s]` (exclude whitespace+quotes too) so the interpreter (.exe, never a script suffix) is skipped and the real script isolated. Validated across all 69 live tasks: 4 false-disabled tasks fixed (Zombie Reaper v2 + Hermes-Obsidian Bridge + Ollama Night Batch + Slot Worktree Migration Status, scripts all exist), 0 regressions; the 2 genuinely-missing (Tribal Consolidate's deleted %TEMP% cron, Zebra's absent script) correctly stay disabled. Live hardener run: disabled-broken 5->2, reaper-net 10/10. 8/8 regression test (harden-prism-tasks.test.ps1). The G10 auto-re-enable guard in fleet-task-health-watch.mjs stays as the safety net (belt+suspenders)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_disabled_reaper_reenable_2026_06_15
---


**ROOT CAUSE of the recurring crash-critical-task-disable pattern -- FOUND + FIXED (2026-06-15, slot golf, perpetual /goal fleet-health loop).**

## The recurrence that pointed here
Crash-critical PRISM scheduled tasks getting silently DISABLED has recurred for weeks across slots:
- 2026-05-19 `2bc54961b` (alpha): re-enabled 7 crash-critical tasks.
- 2026-06-09 (golf): re-enabled `PRISM Zombie Reaper v2` (the 8th); root cause left OPEN, G10 auto-re-enable guard proposed + later built.
- 2026-06-15 (golf, this): found Zombie Reaper v2 + 4 others disabled again. The re-enable ledger (`state/shared/fleet-task-reenable-ledger.jsonl`) showed the G10 guard had re-enabled Zombie Reaper v2 **~8 times in 2 days on a ~6h cadence** -- i.e. something was DISABLING it every ~6h and the guard kept healing it. A working band-aid masking an unfixed root cause.

## Root cause = the Task Hardener's own regex (the irony)
The ~6h cadence matched `PRISM Task Hardener` (interval=PT6H, action `.claude/helpers/harden-prism-tasks.ps1`). TaskScheduler op-log confirmed its 00:08 run "updated" the tasks. The hardener's job is to keep tasks always-active, and it auto-DISABLES any task whose script file is "missing" (to stop exit-1 fail-spam): `$s.Enabled = -not $scriptMissing`. The bug was in how it decided "missing":

`Get-TaskScript` extracted the script path with `([A-Za-z]:\\[^"]+?\.(?:mjs|js|ps1))` -- char-class excluded only `"`. Two real PRISM command shapes broke it:
- **unquoted full-path interpreter** (Hermes-Obsidian Bridge): `H:\Tools\nodejs\node.exe H:\prism\scripts\hermes-obsidian-memory-bridge.mjs` -- `[^"]+?` spans the SPACE -> extracts `H:\Tools\nodejs\node.exe H:\prism\scripts\hermes-obsidian-memory-bridge.mjs` as ONE garbage path.
- **quoted full-path interpreter** (Zombie Reaper v2): `... -Command "& 'C:\Program Files\nodejs\node.exe' 'H:\PRISM\.claude\hooks\stop_close_prism_nodes_v2.mjs'"` -- `[^"]+?` spans the single-quote boundary -> garbage.

Garbage path fails Test-Path -> `scriptMissing=true` -> hardener sets Enabled=false every 6h. Tasks with a BARE interpreter (`node.exe H:\...\sweep.mjs`, e.g. Fleet Reaper) were unaffected -- the regex starts at the script's drive-letter and extracts cleanly. That's why only full-path-interpreter tasks got false-disabled.

## The fix
`harden-prism-tasks.ps1` `Get-TaskScript` regex `[^"]` -> `[^"'\s]` (exclude whitespace AND both quote kinds). The match now stops at the same boundaries the shell uses to split args, so the interpreter (`.exe`, never a `.mjs/.js/.ps1` suffix) is skipped and the real script isolated. PS-single-quote escaping: the literal in source is `[^"''\s]` (the `''` -> `'`).

NOTE: the FIRST attempt was `[^"']` (quotes only) -- it fixed the QUOTED case (Zombie Reaper v2) but NOT the unquoted-space case; the R15 live-validation (Test-Path the 5 "missing" scripts -> 3 actually EXISTED) caught the incompleteness. Lesson: validate on live data, don't trust the regex simulation -- the first fix's "1 flip, done" was wrong; the complete fix flips 4.

## Validation (R15)
- All 69 live PRISM tasks: old-regex would-disable 6, new-regex would-disable 2, **4 flips all "was false-disabled", 0 regressions**. The 4 fixed: Zombie Reaper v2, Hermes-Obsidian Bridge, Ollama Night Batch, Slot Worktree Migration Status (scripts confirmed to exist). The 2 still-disabled are genuinely-missing-script (CORRECT): `PRISM Tribal Consolidate Weekly` -> deleted `%TEMP%\prism-tribal-consolidate-cron.ps1`; `PRISM Zebra Orchestrator` -> `H:\PRISM\scripts\zebra-orchestrator-sweep.mjs` absent everywhere.
- Live fixed-hardener run: `disabled-broken 5->2`, reaper-net **10/10**, the 4 restored to Ready/Running.
- Regression test `harden-prism-tasks.test.ps1` (NEW): 8/8 pass, zero-drift (reads the production regex literal out of the file), incl. an anti-vacuity arm proving the OLD `[^"]` regex spans. Both files ASCII-clean. 3-of-3 scrutiny PASS (2 per-file reviewers + Stop gate).
- The G10 auto-re-enable guard (`fleet-task-health-watch.mjs` selectReenableTargets/reenableTasks) REMAINS as the safety net -- belt+suspenders for crash-critical tasks if any future disabler appears.

## Queued follow-ups (NOT fixed here -- other domains / separate units)
1. `PRISM Tribal Consolidate Weekly` points at a `%TEMP%` cron script that got cleaned up -> re-install the cron to a permanent path or retire the task (tribal/knowledge domain).
2. `PRISM Zebra Orchestrator` script `zebra-orchestrator-sweep.mjs` is absent -> owned by zebra/zulu; either ship the script or retire the task.
3. The hardener has NO `EXPECTED_DISABLED_TASKS` awareness -- it unconditionally enables any present-script task, which could fight a deliberate migration-freeze ([[project_scheduled_task_migration_freeze_2026_06_08]]). Pre-existing (not introduced by this fix); a separate hardening unit could make the hardener consult the same exclusion list the G10 guard uses.
4. Forward-slash command lines (`H:/prism/...`, ~15 tasks) never match the `\\`-requiring regex -> return null -> always enabled (fail-safe, identical pre/post-fix). Separate unit if forward-slash validation is wanted.

Commit: `[MAIN] [FLEET-HYGIENE]/U-HARDENER-REGEX-FIX`. Siblings: [[reference_golf_g7_zombie_reaper_reenabled_2026_06_09]], [[reference_prism_task_always_active_hardening_2026_05_31]], [[feedback_reapers_disabled_2026_06_11]], [[reference_fleet_task_health_ms0_2026_05_17]], [[feedback_golf_owns_reaper]].
