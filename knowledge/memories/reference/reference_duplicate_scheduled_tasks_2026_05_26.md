---
name: reference_duplicate_scheduled_tasks_2026_05_26
description: 5 PRISM scheduled tasks have duplicate registrations causing concurrent-instance races on shared state. Likely the latent cause of git-lock-sweeper not keeping up with lock accumulation.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.557Z
aliases: reference_duplicate_scheduled_tasks_2026_05_26
---


# Duplicate PRISM scheduled tasks — operator cleanup needed (2026-05-26, slot:golf /loop iter3)

## Trigger
Operator: "chats are having issues with git calls / monitors are supposed to stay up at all times, please fix"

Direct cause of git hangs this session: 5.5MB stale `H:/PRISM/.git/index.lock` from a crashed mid-write (timestamped 10:45 AM). Manually cleared.

## Latent cause: concurrent scheduled-task races

`schtasks /Query /FO LIST` shows 5 PRISM tasks registered TWICE:

| Task | Copies |
|---|---|
| PRISM [[reference_fleet_reaper|Fleet Reaper]] | 2 |
| PRISM MCP Server | 2 |
| PRISM MCP Server Watchdog | 2 |
| PRISM NN-Graph Retrain | 2 |
| PRISM Zulu Orchestrator | 2 |

Each pair fires at the same cron cadence on the same lockfiles + state JSON files. Race conditions:
- Two Fleet Reapers reaping the same orphans → double-kill or kill races.
- Two Zulu Orchestrators SendKeys-ing the same chat windows → double-typed `/compact`.
- Two MCP Server Watchdogs restarting the same daemon → restart-loop.
- Two NN-Graph Retrains writing the same model artifacts → corrupted weights.

Most relevant to the current symptom: two reaper instances doing `git status` + lock-clear concurrently could explain why `git-lock-sweeper.mjs` (which DOES exist and IS wired via `bash-bundle.mjs` line 50 → `settings.json` line 644 PreToolUse:Bash with 30s threshold + NTFS retry-with-backoff) sometimes lets a 5.5MB partial-index-write lock persist long enough to block other chats.

## Operator fix (elevated PowerShell required)

For EACH duplicate task:

```powershell
# 1. Inspect both copies (look for differing principals, schedules, command paths)
schtasks /Query /TN "PRISM Fleet Reaper" /FO LIST /V

# 2. Delete BOTH
schtasks /Delete /TN "PRISM Fleet Reaper" /F

# 3. Re-install once from the canonical installer
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow
```

The other installers:
- `install-mcp-server-task.ps1` (or equivalent)
- `install-mcp-watchdog-task.ps1`
- `install-nn-graph-retrain-task.ps1`
- `install-zulu-orchestrator-task.ps1`

Find each under `H:/prism/.claude/helpers/install-*-task.ps1`.

## Why this accumulated

Likely cause: each fresh chat that ran `schtasks /Create` for the same task name on a different host (multi-PC operation per `feedback_no_public_h_drive` + multi-host coexistence rule) succeeded if the task didn't ALREADY exist under that hostname's task scheduler. When one host's task got mirrored back via the c-to-h-mirror, the installer ran again and created a sibling registration.

OR: the installer's "idempotent" path was using a stale check (e.g., greping `schtasks /Query` for the task name string, which failed when the output format changed across Windows versions) and re-installed even though the task existed.

Either way: the right durable fix is to make the installers ALWAYS `schtasks /Delete /TN <name> /F` before `schtasks /Create` — explicit replace, not idempotent-check. Tracked as a candidate follow-up: `U-SCHEDULED-TASK-INSTALLER-REPLACE-FIRST`.

## Why this chat couldn't fix it

`schtasks /Delete` requires an admin shell. Claude Code's PowerShell tool runs at the operator's user-mode rights — the deletes return ACCESS DENIED. Operator must paste the commands above into an elevated terminal.

## Related

- [[reference_monitor_persistent_unreliable]] — Claude Code in-session Monitor is unreliable under pressure; durable layer IS the scheduled tasks. Doubly important when those tasks are duplicated.
- [[reference_fleet_reaper_ms3_2026_05_19]] — [[reference_fleet_reaper|fleet-reaper]] MS3 ship; the install script.
- [[feedback_settings_wiring_drift_2026_05_16]] — same class of silent-state-drift bug across the fleet.
- `H:/prism/.claude/hooks/git-lock-sweeper.mjs` — the hook is correctly wired; root cause was unusual 5.5MB partial-index-write lock that the 3× NTFS retry-with-backoff (50/100/200ms) couldn't keep up with under concurrent task pressure.
