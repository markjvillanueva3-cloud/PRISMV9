---
name: reference_cron_temp_path_failure_2026_06_11
description: 2026-06-11 — the 3 'failing' PRISM crons (PDF Corpus Watcher / Tribal Promotion / Wiki-Tribal Audit) failed 0xFFFD0000 because their action .ps1 lived in %TEMP% (reaped by the tmp-janitor). Fixed: re-pointed live tasks to .claude/cron-runners/ via Set-ScheduledTask (non-elevated). Root-cause class: never register a cron payload under %TEMP%.
type: reference
galaxy: fleet-hygiene
source: prism-memory
synced: 2026-06-27T20:30:46.534Z
aliases: reference_cron_temp_path_failure_2026_06_11
---


# Cron tasks failing 0xFFFD0000 = action script in %TEMP% (2026-06-11, slot:golf)

The fleet-task-health Stop advisory flagged 3 `failing` PRISM crons. Root cause (diagnosed read-only via `Get-ScheduledTaskInfo`):

- **`LastTaskResult = 0xFFFD0000`** (script-not-found) on PDF Corpus Watcher, Tribal Promotion Cron, Wiki-Tribal Audit Regen.
- Their registered action was `powershell -File C:\Users\wompu\AppData\Local\Temp\prism-*-cron.ps1` — and the file was **gone**. `%TEMP%` is cleaned by Windows AND by PRISM's own tmp-orphan janitor (a fleet-hygiene tool reaping the cron payloads other fleet tasks depend on — self-inflicted).
- (`PRISM Blueprint OCR Batch` was NOT failing — `LastResult=0`, just a stale last-run from an infrequent trigger.)

## The pre-existing partial fix + the gap
`install-tribal-promotion-cron.ps1` + `install-wiki-tribal-audit-task.ps1` were already durability-fixed **2026-06-09** to write into `.claude/cron-runners/` (durable, under the repo tree, not reaped) — BUT the **live tasks were never re-registered**, so they still carried the old `%TEMP%` action. `install-pdf-corpus-watcher-cron.ps1` had NOT been fixed (still wrote `%TEMP%`).

## Fix applied (golf)
1. Brought `install-pdf-corpus-watcher-cron.ps1` into the `.claude/cron-runners/` convention (commit, `[FLEET-TASK-HEALTH]/U-PDF-WATCHER-CRON-DURABLE-PATH`).
2. **Re-pointed all 3 LIVE tasks in-place** (no destructive unregister): wrote the durable runner `.ps1` into `.claude/cron-runners/` + `Set-ScheduledTask -Action (… -File <durable>)`. **This worked NON-ELEVATED** (modifying an own S4U task's action in place does not need admin — unlike `Register-ScheduledTask` which the fleet-task-health advisory assumes needs elevation).
3. Verified: pdf-watcher `LastTaskResult` `0xFFFD0000` → `0x41301` (running). All 3 actions now point at existing durable scripts.

**Why:** a recurring fleet-task-health WARN that the standing "re-register from ELEVATED shell" guidance over-scoped — the in-place `Set-ScheduledTask` path fixes it without UAC. **How to apply:** when a PRISM cron fails `0xFFFD0000`, check its action path; if it's under `%TEMP%`, re-point via `Set-ScheduledTask` to `.claude/cron-runners/` (non-elevated) rather than waiting for an elevated re-register. NEVER register a cron payload under `%TEMP%`. Related: [[reference_scheduled_task_install_pwsh7_2026_06_06]], [[feedback_golf_owns_reaper]].
