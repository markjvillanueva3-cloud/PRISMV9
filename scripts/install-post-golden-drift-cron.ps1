<#
  Registers a daily Windows scheduled task "PRISM Post Golden Drift" that runs the
  post-processor golden-NC drift cron (scripts/post-golden-drift-cron.mjs) -- zero Claude
  tokens. It regenerates every JM master-post NC and fails on ANY emit drift (the
  fleet-coverage verifier + golden byte-lock snapshots), appending a DRIFT alert to
  AGENT_CHAT on a NEW regression. Sister to the PRISM Launch Readiness / Fleet Reaper
  installers (U-PP-GOLDEN-NC-CRON, slot:echo).

  Run:
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-post-golden-drift-cron.ps1 [-RunNow]

  Lesson [[reference_cron_temp_path_failure_2026_06_11]]: the action script must live in
  the repo (NOT %TEMP%), or the task fails 0xFFFD0000. This script targets the in-repo path.
#>
param([switch]$RunNow)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $repo 'scripts\post-golden-drift-cron.mjs'
if (-not (Test-Path $script)) { throw "cron script not found: $script" }

$node = if (Test-Path 'H:\Tools\nodejs\node.exe') { 'H:\Tools\nodejs\node.exe' } else { (Get-Command node).Source }
$taskName = 'PRISM Post Golden Drift'

$action   = New-ScheduledTaskAction -Execute $node -Argument "`"$script`"" -WorkingDirectory $repo
# 2:47 AM -- off the :00 mark (cron hygiene), distinct from PRISM Launch Readiness (7:13 AM).
$trigger  = New-ScheduledTaskTrigger -Daily -At '2:47AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Daily PRISM post-processor golden-NC drift check; regenerates every JM master-post NC and appends a DRIFT alert to AGENT_CHAT on a new emit regression.' -Force | Out-Null

Write-Output "Registered scheduled task: $taskName (daily 2:47 AM)"
Write-Output "  exec: $node `"$script`""
if ($RunNow) {
  Start-ScheduledTask -TaskName $taskName
  Write-Output 'Started once now (check state/shared/post-training/golden-drift-history.jsonl).'
}
