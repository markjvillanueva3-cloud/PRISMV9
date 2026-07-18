param(
  [string]$TaskName = 'PRISM SFC Proven Re-Mine',
  # Day of the week for the weekly trigger. Sunday keeps the heavy scan out of
  # the Mon-Fri production window; change to suit your shop schedule.
  [string]$DayOfWeek = 'Sunday',
  # Hour of day (24-h) for the weekly trigger anchor.
  [int]$Hour = 2,
  # Phase offset (seconds) applied to the initial -At anchor so a reinstall
  # never phase-locks onto the exact same clock second as prior runs. The
  # RepetitionInterval is WEEKLY so phase drift is negligible beyond install;
  # this is purely a guard against simultaneous multi-task contention on the
  # first run after registration.
  [int]$StartOffsetSeconds = 30,
  # Run the harness in dry-run / audit mode: pass --dry-run so it reads and
  # reports but does NOT write to the proven store. Useful for burn-in to
  # confirm the harness resolves all JM Die programs before committing writes.
  [switch]$DryRun,
  # After registering, trigger the task once immediately and poll until it
  # finishes or the timeout is reached. Use this to verify the install is wired
  # correctly without waiting a week. The harness is resumable + idempotent so
  # a -RunNow invocation is safe against a partially-mined store.
  [switch]$RunNow,
  # Poll ceiling (minutes) for -RunNow. The harness is resumable; a partial run
  # that hits this ceiling is not a problem -- the next scheduled run continues
  # from the cursor. 20 min covers the typical first-run corpus scan.
  [int]$RunNowTimeoutMinutes = 20,
  [switch]$Uninstall,
  # Legacy behavior: register with NO principal so the task runs only while the
  # installing user is interactively logged in (Logon Mode: Interactive only).
  # Default (this switch OFF) hardens the task to run whether-logged-on-or-not
  # via S4U (current user context, no stored password).
  [switch]$Interactive,
  # Escalate to the SYSTEM machine account. The harness only READS JM Die NC
  # programs and WRITES to mcp-server/data/state/ -- S4U (the installing user)
  # is sufficient. -AsSystem is offered for parity with the fleet-reaper
  # installer in case elevated write privileges are ever needed.
  [switch]$AsSystem
)

# install-sfc-remine-task.ps1 -- weekly re-mining cron for the JM Die proven
# speed/feed store (SFC galaxy, slot:oscar).
#
# WHAT IT DOES
#   Registers a Windows Scheduled Task named "PRISM SFC Proven Re-Mine" that
#   runs the resumable proven-extraction harness once per week:
#
#     npx tsx scripts/extract-jm-proven-speedfeed.ts --lane both --json
#
#   Working directory: H:\PRISM\mcp-server
#   Log (append):      H:\PRISM\mcp-server\data\state\sfc-remine.log
#
#   The harness (extract-jm-proven-speedfeed.ts) walks every JM Die NC program
#   under H:\PRISM\JM DIE\, extracts spindle-speed + feed-rate data paired with
#   the material + tool context, and upserts the results into the proven speed/
#   feed store.  It is RESUMABLE (cursor-based, skips already-mined files) and
#   IDEMPOTENT (re-running on a fully-mined corpus is a cheap no-op), so a
#   weekly scheduled run is safe even if a prior run was interrupted.
#
# HOW TO RUN THIS INSTALLER (requires elevated PowerShell)
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:\PRISM\.claude\helpers\install-sfc-remine-task.ps1
#
#   With immediate verification run:
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:\PRISM\.claude\helpers\install-sfc-remine-task.ps1 -RunNow
#
#   Burn-in (audit mode, no writes to proven store):
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:\PRISM\.claude\helpers\install-sfc-remine-task.ps1 -DryRun -RunNow
#
# HOW TO REMOVE
#   Unregister-ScheduledTask -TaskName 'PRISM SFC Proven Re-Mine' -Confirm:$false
#   -- OR --
#   & 'H:\PRISM\.claude\helpers\install-sfc-remine-task.ps1' -Uninstall
#
# HOW TO PAUSE WITHOUT REMOVING
#   Disable-ScheduledTask -TaskName 'PRISM SFC Proven Re-Mine'
#   Re-enable: Enable-ScheduledTask  -TaskName 'PRISM SFC Proven Re-Mine'
#
# KILL SWITCH (env, read by the harness)
#   PRISM_SFC_REMINE_DISABLE=1  -- skip all extraction and exit cleanly

$ErrorActionPreference = 'Stop'

# Registering / unregistering a task in the root \ folder needs an elevated
# context on Windows 11 -- fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical working directory for the harness. The task always targets the main
# tree, never a worktree (a worktree can be removed; the host-level task must
# not dangle on a missing working directory).
$workDir = 'H:\PRISM\mcp-server'
$harnessScript = 'scripts\extract-jm-proven-speedfeed.ts'
$logFile = 'H:\PRISM\mcp-server\data\state\sfc-remine.log'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
# This mirrors the resolution order used by every PRISM install-*.ps1 helper.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

# Resolve npx from the same directory as node (npm bundles npx.cmd alongside
# node.exe). Fall back to PATH.
$nodeDir = Split-Path $nodeExe -Parent
$npxCmd  = $null
foreach ($cand in @(
  (Join-Path $nodeDir 'npx.cmd'),
  (Join-Path $nodeDir 'npx')
)) {
  if (Test-Path $cand) { $npxCmd = $cand; break }
}
if (-not $npxCmd) { $npxCmd = (Get-Command npx -ErrorAction Stop).Source }

# The harness is invoked via cmd /c so we can redirect stdout+stderr to the
# append log in a single action (New-ScheduledTaskAction takes one executable,
# not a shell pipeline). The double->> append log never truncates on restart.
$harnessFlags = '--lane both --json'
if ($DryRun) { $harnessFlags += ' --dry-run' }

# Timestamp header written to log on every run so individual runs are
# distinguishable in the append log without a separate log-rotation scheme.
$cmdLine = "cmd /c ""echo === PRISM SFC Re-Mine %DATE% %TIME% === >> `"$logFile`" 2>&1 && cd /d `"$workDir`" && `"$npxCmd`" tsx `"$harnessScript`" $harnessFlags >> `"$logFile`" 2>&1"""

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

# Verify the working directory and harness exist before registering -- a task
# that silently fails every week because paths are wrong is worse than no task.
if (-not (Test-Path $workDir)) {
  throw "Working directory not found: $workDir (run on the PRISM host with H:\PRISM present)."
}
if (-not (Test-Path (Join-Path $workDir $harnessScript))) {
  throw "Harness script not found: $workDir\$harnessScript (ensure scripts/extract-jm-proven-speedfeed.ts is committed and the mcp-server tree is on this host)."
}

# Ensure the log directory exists so the first run does not fail on a missing
# parent. The data/state/ directory is git-tracked (gitkeep), but create it
# defensively in case this is a fresh clone.
$logDir = Split-Path $logFile -Parent
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  Write-Host "Created log directory: $logDir"
}

# The action wraps everything inside cmd.exe for shell-redirect support.
# -Execute cmd.exe, -Argument carries the full /c "..." string.
$action = New-ScheduledTaskAction `
  -Execute 'cmd.exe' `
  -Argument $cmdLine `
  -WorkingDirectory $workDir

# Weekly trigger anchored at $DayOfWeek $Hour:00 local time, starting
# $StartOffsetSeconds from now (so the very first run after registration is
# offset by at most 30 s from the anchor -- prevents phase-lock collisions on
# the initial poll). RepetitionDuration 3650 days = ~10 years of self-renewal.
$anchorDate = (Get-Date -Hour $Hour -Minute 0 -Second 0).AddSeconds($StartOffsetSeconds)
$weeklyTrigger = New-ScheduledTaskTrigger `
  -Weekly `
  -DaysOfWeek $DayOfWeek `
  -At $anchorDate

# ExecutionTimeLimit 60 min: a full first-run corpus scan of the JM Die archive
# (24,545 files) is expected to take 5-30 min. 60 min is a generous ceiling
# that still kills a genuinely hung run (e.g. tsx compile OOM). The harness
# writes a per-file cursor so work done before a kill is never lost.
# MultipleInstances IgnoreNew: if the prior week's run somehow overruns its
# window, ignore the new trigger rather than stacking runs.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 60) `
  -RestartCount 1 `
  -RestartInterval (New-TimeSpan -Minutes 10) `
  -MultipleInstances IgnoreNew

# Principal -- autonomy over interactive-only.
#   S4U   (DEFAULT) = current user context, whether-logged-on-or-not, no stored
#                     password.  Sufficient: harness only reads NC programs and
#                     writes to data/state/ (both owned by the installing user).
#   SYSTEM (-AsSystem) = machine account, max privileges, no UAC, no window.
#   NONE   (-Interactive) = legacy interactive-only logon (dies on log-off).
$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
      -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType S4U -RunLevel Highest
  }
}

$modeLabel = if ($DryRun) { ' --dry-run [AUDIT -- no proven-store writes]' } else { '' }
$desc = "Weekly re-mining of JM Die proven speed/feed data (extract-jm-proven-speedfeed.ts --lane both --json$modeLabel). Walks H:\PRISM\JM DIE NC programs, extracts spindle+feed context, upserts the proven store. Resumable + idempotent. Log: $logFile. SFC galaxy, slot:oscar."

# -Force makes Register-ScheduledTask overwrite an existing task of the same
# name without erroring -- this is the idempotency guarantee. Splat so
# -Principal is omitted entirely when -Interactive is set (-Principal $null
# throws; an absent key is the correct "no principal" form).
$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $weeklyTrigger
  Settings    = $settings
  Description = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }
Register-ScheduledTask @registerParams | Out-Null

$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy -- stops when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (whether-logged-on-or-not, max privileges)'
} else {
  'AUTONOMOUS as S4U / current user (whether-logged-on-or-not)'
}
$modeStr = if ($DryRun) { 'DRY-RUN audit (no proven-store writes)' } else { 'live' }
Write-Host "Registered: $TaskName ($modeStr, $autonomy)"
Write-Host "  Trigger:  Weekly $DayOfWeek at $($Hour):00 (anchor +$($StartOffsetSeconds)s from now)"
Write-Host "  Command:  npx tsx $harnessScript --lane both --json$modeLabel"
Write-Host "  Workdir:  $workDir"
Write-Host "  Log:      $logFile  (append)"
Write-Host "  npx:      $npxCmd"
Write-Host "  node:     $nodeExe"

if ($RunNow) {
  Write-Host ""
  Write-Host "Triggering immediate run for verification..."
  Start-ScheduledTask -TaskName $TaskName
  # LastTaskResult 267009 (0x41301) = task is still running. Poll until it
  # finishes or the timeout is reached. The harness is resumable so a timeout
  # here is not a data-loss event -- the next scheduled run continues cleanly.
  $deadline = (Get-Date).AddMinutes($RunNowTimeoutMinutes)
  do {
    Start-Sleep -Seconds 10
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Still running after $RunNowTimeoutMinutes min (LastTaskResult=267009)."
    Write-Host "That is OK -- the harness is resumable. Tail the log to monitor progress:"
    Write-Host "  Get-Content '$logFile' -Tail 30 -Wait"
  } else {
    Write-Host "Run complete. LastTaskResult=$($info.LastTaskResult)  (0 = success)"
    Write-Host "  Last run time:  $($info.LastRunTime)"
    if ($info.LastTaskResult -ne 0) {
      Write-Host "  Non-zero result -- check the log for details:"
      Write-Host "  Get-Content '$logFile' -Tail 50"
    }
  }
}

Write-Host ""
Write-Host "Management commands:"
Write-Host "  Verify registered:          schtasks /Query /TN '$TaskName'"
Write-Host "  Tail live log:              Get-Content '$logFile' -Tail 30 -Wait"
Write-Host "  Trigger manual run:         Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Pause (keep registered):    Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Resume after pause:         Enable-ScheduledTask  -TaskName '$TaskName'"
Write-Host "  Uninstall:                  & '$PSScriptRoot\install-sfc-remine-task.ps1' -Uninstall"
