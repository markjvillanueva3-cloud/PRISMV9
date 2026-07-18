<#
  Registers a daily Windows scheduled task "PRISM Launch Readiness" that runs the
  launch-readiness cron (scripts/launch-readiness-cron.mjs) -- zero Claude tokens.
  Sister to the PRISM Fleet Reaper / system-awareness-freshness installers.

  Run:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-launch-readiness-cron.ps1 [-RunNow]

  Lesson [[reference_cron_temp_path_failure_2026_06_11]]: the action script must live
  in the repo (NOT %TEMP%), or the task fails 0xFFFD0000. This script targets the
  in-repo path, so it is safe.
#>
param([switch]$RunNow)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $repo 'scripts\launch-readiness-cron.mjs'
if (-not (Test-Path $script)) { throw "cron script not found: $script" }

$node = if (Test-Path 'H:\Tools\nodejs\node.exe') { 'H:\Tools\nodejs\node.exe' } else { (Get-Command node).Source }
$taskName = 'PRISM Launch Readiness'

$action   = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $repo
# 7:13 AM -- deliberately off the :00 mark (cron hygiene).
$trigger  = New-ScheduledTaskTrigger -Daily -At '7:13AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Daily PRISM frontend launch-readiness check; appends a regression alert to AGENT_CHAT on PASS->FAIL drift.' -Force | Out-Null

Write-Output "Registered scheduled task: $taskName (daily 7:13 AM)"
Write-Output "  exec: $node `"$script`""
if ($RunNow) {
  Start-ScheduledTask -TaskName $taskName
  Write-Output 'Started once now (check state/shared/dashboards/launch-readiness-history.jsonl).'
}
