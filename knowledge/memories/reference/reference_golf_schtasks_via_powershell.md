---
name: reference-golf-schtasks-via-powershell
description: Query Windows scheduled tasks via PowerShell Get-ScheduledTask — the Bash tool (git-bash) mangles the /Query flag into a path.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_schtasks_via_powershell
---


**Gotcha (slot:golf):** Running `schtasks /Query /TN "PRISM Fleet Reaper"` through the **Bash tool** fails — git-bash MSYS path-conversion rewrites `/Query` → `C:/Program Files/Git/Query`, producing `ERROR: Invalid argument/option`.

**Fix:** Query scheduled tasks via the **PowerShell tool** instead:
```powershell
$t = Get-ScheduledTask -TaskName "PRISM Fleet Reaper" -ErrorAction SilentlyContinue
if ($t) { Get-ScheduledTaskInfo -TaskName "PRISM Fleet Reaper" }  # State / LastRunTime / NextRunTime / LastTaskResult
```
Same class as the broader rule: use the PowerShell tool for Windows-native commands with `/flags`, and Bash for POSIX. Verified 2026-05-29.
