param(
  [string]$TaskName = 'PRISM Slot Worktree Migration Status',
  # Cadence in MINUTES. The audit is a sub-second pure-data pass (git
  # worktree list + 2 JSON reads + computeMigrationStatus + 2 atomic
  # writes). 60-min default keeps the report fresh enough that operators
  # see drift within an hour but doesn't pile up trigger overhead. Override
  # with -EveryMinutes 15 for a tighter watch during fleet migration.
  [int]$EveryMinutes = 60,
  # Phase offset (seconds) for the trigger anchor. Other PRISM scheduled
  # tasks already use these offsets (Cleanup Orchestrator +60s,
  # Memory Pressure Auto-Relief +120s, Fleet Reaper +210s,
  # Fleet Memory Monitor +330s, NN-Graph Retrain +450s). +570s
  # lands the migration-status audit clear of all of them.
  [int]$StartOffsetSeconds = 570,
  [switch]$RunNow,
  # -RunNow poll ceiling (minutes). Audit completes in well under a minute
  # on this host so 2 is generous.
  [int]$RunNowTimeoutMinutes = 2,
  # Default principal: NT AUTHORITY\SYSTEM -- runs whether-logged-on-or-not,
  # no UAC, session 0 (no flashing window). Matches the Fleet Reaper
  # post-2026-05-18 default per [[reference_fleet_reaper_system_principal_2026_05_18]].
  [switch]$AsCurrentUser,
  [switch]$AsSystem,  # back-compat alias (now the default)
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
# Nested Join-Path (2 args each) -- multi-arg Join-Path is PS7-only; Windows
# PowerShell 5.1 (default powershell.exe) parse-errors on the 4-arg form, and
# the error surfaces at the next statement boundary (misleadingly l.42).
$Script = (Resolve-Path -Path (Join-Path (Join-Path (Join-Path $PSScriptRoot '..\..') 'scripts') 'slot-worktree-migration-status.mjs')).Path
$NodePath = $null
foreach ($candidate in @(
    (Join-Path 'H:\Tools\nodejs' 'node.exe'),
    (Join-Path (Join-Path (Join-Path (Join-Path $env:USERPROFILE '.claude') 'bin') 'portable-node') 'node.exe'),
    (Join-Path 'H:\.claude' 'bin' 'portable-node' 'node.exe'),
    (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty Source))) {
  if ($candidate -and (Test-Path $candidate)) { $NodePath = $candidate; break }
}
if (-not $NodePath) {
  Write-Error "node.exe not found on PATH and no portable-node candidate exists"
  exit 2
}

if ($Uninstall) {
  $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Uninstalled scheduled task '$TaskName'."
  } else {
    Write-Host "Scheduled task '$TaskName' not found -- nothing to remove."
  }
  exit 0
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Scheduled task '$TaskName' already exists -- re-registering with current settings."
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Action: invoke node + the script. No --json (cron writes the file; stdout
# is captured by Task Scheduler history). --quiet keeps the log readable.
$args = @($Script, '--quiet')
$action = New-ScheduledTaskAction -Execute $NodePath -Argument ($args -join ' ') -WorkingDirectory (Split-Path $Script)

$start = (Get-Date).Date.AddDays(1).AddSeconds($StartOffsetSeconds)
$trigger = New-ScheduledTaskTrigger -Once -At $start `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

# Principal selection -- SYSTEM by default; -AsCurrentUser for S4U.
if ($AsCurrentUser) {
  Register-ScheduledTask -TaskName $TaskName `
    -Action $action -Trigger @($trigger, $startupTrigger) -Settings $settings `
    -Description 'PRISM slot worktree migration status audit (U-WAVE5c-AUTO). Writes state/shared/SLOT-WORKTREE-MIGRATION-STATUS.{json,md} every cadence. Advisory only -- never mutates worktree or slot state.' | Out-Null
} else {
  $principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  Register-ScheduledTask -TaskName $TaskName `
    -Action $action -Trigger @($trigger, $startupTrigger) -Settings $settings -Principal $principal `
    -Description 'PRISM slot worktree migration status audit (U-WAVE5c-AUTO). Writes state/shared/SLOT-WORKTREE-MIGRATION-STATUS.{json,md} every cadence. Advisory only -- never mutates worktree or slot state.' | Out-Null
}

$mode = if ($AsCurrentUser) { 'current user (S4U)' } else { 'NT AUTHORITY\SYSTEM' }
Write-Host "Registered scheduled task '$TaskName' (every $EveryMinutes min, first run $start, principal=$mode)."

if ($RunNow) {
  Write-Host "Triggering an immediate run..."
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddMinutes($RunNowTimeoutMinutes)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    if ($info.LastRunTime -gt (Get-Date).AddMinutes(-$RunNowTimeoutMinutes)) { break }
  } while ((Get-Date) -lt $deadline)
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Last run: $($info.LastRunTime)  result: $($info.LastTaskResult)"
}
