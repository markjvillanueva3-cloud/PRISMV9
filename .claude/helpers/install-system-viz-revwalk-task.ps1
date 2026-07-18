# install-system-viz-revwalk-task.ps1 -- SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CRON-RUNNER
#
# Registers a daily Windows scheduled task ("PRISM System-Viz Re-walk Daily") that
# invokes cron-revwalk.mjs at 03:15 local time (off-set from the 03:00 cleanup +
# 03:30 reaper tasks so the disk doesn't take three simultaneous walks). Idempotent
# -- re-running updates the existing task.
#
# Companion to:
#   scripts/cron-revwalk.mjs                  -- the runner
#   scripts/lib/namespace-churn-ranker.mjs    -- the ranker
#
# Usage:
#   .\install-system-viz-revwalk-task.ps1                     # register + leave disabled (-Disabled)
#   .\install-system-viz-revwalk-task.ps1 -RunNow             # register + run once now
#   .\install-system-viz-revwalk-task.ps1 -DryRun             # registered as dry-run mode
#   .\install-system-viz-revwalk-task.ps1 -StartTime 04:30    # override 03:15 default
#   .\install-system-viz-revwalk-task.ps1 -TopN 3             # only top-3 namespaces per run
#   .\install-system-viz-revwalk-task.ps1 -Uninstall          # remove the task

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$RunNow,
    [switch]$Uninstall,
    [string]$StartTime = "03:15",
    [int]$TopN = 5,
    [int]$MaxFiles = 250000,
    [int]$HeapMb = 8192
)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM System-Viz Re-walk Daily"

# -- Elevation gate ------------------------------------------------------------
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object System.Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Run from an ELEVATED PowerShell (Admin)." -ForegroundColor Red
    Write-Host "Scheduled-task registration requires admin privilege." -ForegroundColor Yellow
    exit 1
}

# -- Uninstall path ------------------------------------------------------------
if ($Uninstall) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -eq $existing) {
        Write-Host "Task '$TaskName' not registered -- nothing to remove." -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed scheduled task '$TaskName'." -ForegroundColor Green
    exit 0
}

# -- Resolve paths -------------------------------------------------------------
$RepoRoot = "H:\prism"
$Runner = Join-Path $RepoRoot "scripts\cron-revwalk.mjs"
$NodeExe = "H:\Tools\nodejs\node.exe"
$LogDir = Join-Path $RepoRoot ".cache"
$LogFile = Join-Path $LogDir "cron-revwalk.log"

if (-not (Test-Path $Runner)) {
    Write-Host "ERROR: Runner not found at $Runner" -ForegroundColor Red
    exit 2
}
if (-not (Test-Path $NodeExe)) {
    # Fallback to system PATH
    $NodeExe = "node.exe"
    Write-Host "WARN: Portable node not at H:\Tools\nodejs -- falling back to PATH 'node.exe'." -ForegroundColor Yellow
}
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

# -- Build the action argument string ------------------------------------------
$RunnerArgs = @(
    "`"$Runner`"",
    "--top", "$TopN",
    "--max-files", "$MaxFiles",
    "--heap", "$HeapMb",
    "--log", "`"$LogFile`""
)
if ($DryRun) { $RunnerArgs += "--dry-run" }
$ActionArgs = $RunnerArgs -join " "

# -- Register the task ---------------------------------------------------------
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $existing) {
    Write-Host "Task '$TaskName' already exists -- updating in place..." -ForegroundColor Cyan
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$Action = New-ScheduledTaskAction -Execute $NodeExe -Argument $ActionArgs -WorkingDirectory $RepoRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At $StartTime
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 0 `
    -MultipleInstances IgnoreNew
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "PRISM SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-CRON-RUNNER -- daily re-walk of top-N highest-churn namespaces in state/shared/system-viz/system-graph.json. Companion: namespace-churn-ranker.mjs." `
    | Out-Null

Write-Host "Registered scheduled task '$TaskName'." -ForegroundColor Green
Write-Host "  trigger:  Daily at $StartTime" -ForegroundColor Gray
Write-Host "  action:   $NodeExe $ActionArgs" -ForegroundColor Gray
Write-Host "  log:      $LogFile" -ForegroundColor Gray
if ($DryRun) { Write-Host "  mode:     DRY-RUN (will report ranking only, no walks)" -ForegroundColor Yellow }

if ($RunNow) {
    Write-Host "Starting task now..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Host "  lastRunTime:   $($info.LastRunTime)" -ForegroundColor Gray
    Write-Host "  lastTaskResult: $($info.LastTaskResult)" -ForegroundColor Gray
    Write-Host "  nextRunTime:   $($info.NextRunTime)" -ForegroundColor Gray
    Write-Host "Tail the log to see output: Get-Content '$LogFile' -Wait" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Companion commands:" -ForegroundColor Cyan
Write-Host "  manual run:     node `"$Runner`" --dry-run" -ForegroundColor Gray
Write-Host "  task status:    schtasks /Query /TN `"$TaskName`" /V /FO LIST" -ForegroundColor Gray
Write-Host "  uninstall:      .\install-system-viz-revwalk-task.ps1 -Uninstall" -ForegroundColor Gray
