---
name: reference_scheduled_task_install_pwsh7_2026_06_06
description: "PRISM scheduled-task install scripts need pwsh 7 (not powershell 5.1) + register current-user without UAC; self-reflect had a \\\" parse bug"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.919Z
aliases: reference_scheduled_task_install_pwsh7_2026_06_06
---


The 5 "MISSING" PRISM scheduled tasks (Cost Alarm, Handoff Prune, Hermes Dream-Cycle, Hermes Self-Reflect, PDF Corpus Watcher) were re-registered by slot:golf 2026-06-06 — all 5 now `Ready`. Two corrections to the standing "re-register from an ELEVATED shell" guidance in the fleet-task-health Stop-hook message:

1. **They register as the CURRENT USER with NO elevation.** Cost Alarm needs `-AsCurrentUser` (default principal is SYSTEM); Handoff Prune / Dream-Cycle / Self-Reflect default to current-user (only `-AsSystem` opts up to the UAC-requiring SYSTEM principal); PDF Corpus Watcher (a `-cron.ps1`, not `-task.ps1`) defaults current-user. S4U principal = "runs whether logged on or not, no UAC."
2. **Invoke with `pwsh` (7), NOT `powershell` (5.1).** These scripts use PS7-only syntax → under `powershell` they throw a `ParserError: UnexpectedToken` at *runtime* (the outer `ParseFile` under pwsh7 reports 0 errors, so the file IS valid PS7 — it's the 5.1 parser that rejects it). PDF watcher ran under 5.1 only because it avoided PS7-isms. So the documented `powershell -File install-<task>-task.ps1` is itself a trap for these.

Working command (current user, no admin):
`pwsh -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-<task>-task.ps1 [-AsCurrentUser]`

Separately, `install-hermes-self-reflect-task.ps1` line 187 had a real parse bug (committed fix): a `Write-Host` help line escaped inner double-quotes C-style `\"` instead of PowerShell backtick `` `" `` → the string terminated early and the JS `node -e` payload's `(`/`+` produced 5 parse errors → the whole script died before registering → task went MISSING. Fixed `\"`→`` `" ``. Verify-don't-assume win (the earlier "needs elevated shell" claim was wrong on both counts).

**Full drain (same session):** the audit's broad discovery (post `213a1da6f8`) surfaced MISSING in rolling batches of ~5 as each was fixed — total **15 → 0** (47 PRISM tasks now registered). Two MORE genuinely-broken scripts were caught **only by validating live exit codes** (R15), NOT by registration succeeding — registration ≠ works:
- `scripts/cost-alarm-tick.mjs` (commit `54655e1c4d`): a cron literal `` `*/15 * * * *` `` inside the JSDoc header contained `*/`, which **closes a block comment** → everything after parsed as code → `SyntaxError` → Cost Alarm crashed (exit 1) on every run, had never functioned. Reusable gotcha: **never write a cron/regex containing `*/` inside a `/* */` comment.** Reworded to "every 15 minutes".
- `install-slot-worktree-migration-status-task.ps1` (commit `54655e1c4d`): node-path candidate list omitted `H:/Tools/nodejs/node.exe` (the fleet's portable node) → registration aborted. Added it first. Also: it defaults to SYSTEM principal but the script **fails as SYSTEM, exits 0 as the user** → pass `-AsCurrentUser` (rebind live via `Set-ScheduledTask -Principal $(New-ScheduledTaskPrincipal -LogonType S4U ...)`).

Lesson: after registering a scheduled task, **force-run it and check `LastTaskResult`** (0=ok, 267009=running, 267011=never-ran-yet self-clears, other=real failure). Several PRISM hygiene scripts were registerable-but-broken. Related: [[reference_shared_tree_git_contention_plumbing_merge_2026_06_06]] · [[feedback_verify_actual_contract_not_proxy]] · [[fleet-task-health-discovery-drift]].
