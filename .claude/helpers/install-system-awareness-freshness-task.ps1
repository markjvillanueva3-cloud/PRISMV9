<#
.SYNOPSIS
  Install / uninstall the "PRISM System Awareness Freshness" Windows scheduled task.

.DESCRIPTION
  Sister pattern to install-fleet-reaper-task.ps1 (FLEET-REAPER-MS0).

  Registers a daily cron at 23:00 local (with +60s phase offset to clear the
  Fleet Reaper at :57:57 + Memory Monitor at :05:30 etc.) that runs
  system-awareness-freshness-cron.mjs. The cron appends a one-line row to
  state/shared/SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl and refreshes the
  baseline snapshot if older than 7 days.

  SYSTEM principal by default -- runs whether-logged-on-or-not, in session 0,
  no UAC, no flashing window. Use -AsCurrentUser to fall back to S4U mode
  (interactive-user, current session). Use -AsSystem as a documented no-op
  back-compat alias.

.PARAMETER DryRun
  Build the task definition + print what would be registered, but do not write.

.PARAMETER RunNow
  After registering, immediately invoke Start-ScheduledTask + poll for completion.

.PARAMETER Uninstall
  Remove the task. Reversible -- re-run without -Uninstall to re-register.

.PARAMETER AsCurrentUser
  Use S4U interactive-user principal instead of SYSTEM. Cannot kill / write
  files outside the user's permission scope. Conservative fallback.

.PARAMETER AsSystem
  Back-compat no-op (SYSTEM is the new default). Kept so prior invocations
  documented in CLAUDE.md still work.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File install-system-awareness-freshness-task.ps1 -RunNow

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File install-system-awareness-freshness-task.ps1 -Uninstall
#>

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$AsCurrentUser,
  [switch]$AsSystem
)

$ErrorActionPreference = "Stop"

$TaskName = "PRISM System Awareness Freshness"
$RepoRoot = "H:\prism"
$PortableNode = "H:\.claude\bin\portable-node.exe"
$CronScript = Join-Path $RepoRoot "scripts\system-awareness-freshness-cron.mjs"

# Resolve portable-node (the same canonical binary used by Fleet Reaper).
if (-not (Test-Path $PortableNode)) {
  $alt = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($alt) { $PortableNode = $alt } else {
    Write-Error "node not found -- install portable-node at $PortableNode or add node to PATH."
    exit 2
  }
}

if (-not (Test-Path $CronScript)) {
  Write-Error "Cron script missing: $CronScript"
  exit 2
}

# --- Uninstall path -----------------------------------------------------

if ($Uninstall) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    Write-Output "Task '$TaskName' not registered -- nothing to remove."
    exit 0
  }
  if ($DryRun) {
    Write-Output "DRY-RUN: would unregister task '$TaskName' (State: $($existing.State))"
    exit 0
  }
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Output "Task '$TaskName' unregistered. (Files preserved per never-delete-only-disable rule)"
  exit 0
}

# --- Install path -------------------------------------------------------

# Triggers: daily at 23:01 local (+60s phase from :00:00 + offset from other tasks),
# plus AtStartup so missed runs get a chance after reboot.
$DailyTrigger = New-ScheduledTaskTrigger -Daily -At "23:01"
$BootTrigger  = New-ScheduledTaskTrigger -AtStartup

# Action: portable-node + cron script.
$Action = New-ScheduledTaskAction `
  -Execute $PortableNode `
  -Argument "`"$CronScript`"" `
  -WorkingDirectory $RepoRoot

# Settings: bounded execution, restart on failure (the cron is short-running).
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# Principal: SYSTEM by default (works whether-logged-on-or-not, session 0).
# -AsCurrentUser falls back to S4U interactive-user. -AsSystem is a no-op alias.
if ($AsCurrentUser) {
  $principalArgs = @{ UserId = "$env:USERDOMAIN\$env:USERNAME"; LogonType = "S4U"; RunLevel = "Highest" }
  $principalLabel = "S4U / $($principalArgs.UserId)"
} else {
  $principalArgs = @{ UserId = "NT AUTHORITY\SYSTEM"; LogonType = "ServiceAccount"; RunLevel = "Highest" }
  $principalLabel = "SYSTEM (default)"
}
$Principal = New-ScheduledTaskPrincipal @principalArgs

$Description = "PRISM System Awareness Freshness MS0 / U-SAF-F2 -- daily 23:01 local cron. Runs system-awareness-freshness-cron.mjs which appends a row to SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl and refreshes the baseline snapshot when >7 days old. Advisory-only -- never modifies code."

if ($DryRun) {
  Write-Output "DRY-RUN: would register task '$TaskName'"
  Write-Output "  Principal:       $principalLabel"
  Write-Output "  Execute:         $PortableNode `"$CronScript`""
  Write-Output "  Working dir:     $RepoRoot"
  Write-Output "  Triggers:        Daily 23:01 + AtStartup"
  Write-Output "  Restart policy:  3x at 1m interval, timeout 10m"
  Write-Output "  Description:     $Description"
  exit 0
}

# Idempotent: if already registered, unregister first (so a re-run picks up
# any change to the action/trigger/principal).
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
  Write-Output "Task '$TaskName' exists (State: $($existing.State)) -- re-registering to pick up changes."
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger @($DailyTrigger, $BootTrigger) `
  -Principal $Principal `
  -Settings $Settings `
  -Description $Description | Out-Null

$t = Get-ScheduledTask -TaskName $TaskName
$info = $t | Get-ScheduledTaskInfo
Write-Output "Registered '$TaskName':"
Write-Output "  State:       $($t.State)"
Write-Output "  Principal:   $principalLabel"
Write-Output "  Next run:    $($info.NextRunTime)"

if ($RunNow) {
  Write-Output "RunNow: invoking Start-ScheduledTask..."
  Start-ScheduledTask -TaskName $TaskName
  # Poll for completion (cron should finish in <30s in normal operation).
  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    $info = $t | Get-ScheduledTaskInfo
    if ($info.LastRunTime -gt (Get-Date).AddMinutes(-5) -and $info.LastTaskResult -ne 267009) {
      Write-Output "Completed:   LastRunTime=$($info.LastRunTime) Result=0x$($info.LastTaskResult.ToString("X"))"
      break
    }
    Start-Sleep -Milliseconds 1000
  }
  if ((Get-Date) -ge $deadline) {
    Write-Warning "RunNow poll timed out after 2m -- task may still be running. Check 'Get-ScheduledTask $TaskName | Get-ScheduledTaskInfo'."
  }
}

exit 0
