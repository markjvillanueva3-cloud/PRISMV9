---
name: Load-bearing Windows Scheduled Tasks (PRISM)
description: Background tasks that MUST stay enabled or zombie processes pile up and chats hang. Re-enable if disabled.
type: reference
originSessionId: 845cf238-2caf-4b83-9e12-d2a1ea10059c
---
## `PRISM Node Orphan Cleaner` — Windows Scheduled Task

**What:** Runs `node-orphan-cleaner.mjs --scheduled --quiet` every 5 minutes, independent of any Claude Code session. Cleans orphan node.exe processes from dead hooks.

**Install path:** `H:\PRISM\.claude\helpers\install-node-cleaner-task.ps1`

**Was disabled at:** discovered 2026-05-10 ~21:24 local. Re-enabled the same minute. After re-enable, first run found 11 node procs, killed 0 (all live).

**Why disabling causes hangs:**
- Hook subprocess leaks accumulate at ~1/min under multi-chat load.
- Without this task, only Claude Code's own Stop/SessionStart reapers run — they only fire on session lifecycle events, not during active work.
- After ~30 min of multi-chat activity, ~30-50 zombie node procs hold the system in fork-exhaustion territory (Cygwin Win32 errors 1455 + 299 — see last.md).

**Re-enable command (PowerShell):**
```powershell
Enable-ScheduledTask -TaskName "PRISM Node Orphan Cleaner"
Start-ScheduledTask -TaskName "PRISM Node Orphan Cleaner"  # immediate first run
Get-ScheduledTaskInfo -TaskName "PRISM Node Orphan Cleaner" | Format-List LastRunTime, LastTaskResult, NextRunTime
```

**Verify it's running:**
```bash
tail -5 H:/prism/state/shared/node-orphan-cleaner.log
# Should see entries every ~5 min with "Scan (scheduled-task): found N node processes"
```

## Companion reaper NOT scheduled (intentional scope)

`bash-orphan-cleaner.mjs` walks the claude.exe ancestor chain to scope its kills to the SAME chat. Cannot run as a scheduled task — no claude.exe parent means it no-ops. Bash zombies must be cleaned via the chat's own Stop hook.

## How to apply
- On any new machine setup: run `install-node-cleaner-task.ps1` once.
- On suspected hang: first check `Get-ScheduledTask -TaskName "PRISM*"` for State=Disabled. Re-enable + Start before more invasive debugging.
- Never delete this task per the never-delete-only-disable rule. To temporarily pause: `Disable-ScheduledTask`. To restore: `Enable-ScheduledTask`.
