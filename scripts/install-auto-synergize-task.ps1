<#
  Registers a Windows scheduled task "PRISM Auto-Synergize" that runs the
  auto-synergize loop (scripts/auto-synergize-loop.mjs --apply) every 3 hours --
  zero Claude tokens. This is the "automatic system synergizing" mechanism: it
  detects when memories/wiki/cross-substrate edges have drifted ahead of the
  searchable system-viz graph and folds them in by firing regen-viz, so
  "everything communicates" without a human running regen by hand.

  The loop is self-protecting: a 90-min debounce + regen-viz's own graph
  write-lock (exit 4 = peer regen in progress -> skipped, not a failure) mean a
  3-hour cadence never stacks two 24GB folds. AUTO-SYNERGIZE-MS0, slot:india.
  Sister to the PRISM Fleet Reaper / PRISM Post Golden Drift installers.

  Run (elevated recommended so the task runs under your account at logon):
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-auto-synergize-task.ps1 [-RunNow]

  Disable the fold without removing the task: set PRISM_AUTO_SYNERGIZE_DISABLE=1.
  Remove the task:  Unregister-ScheduledTask -TaskName 'PRISM Auto-Synergize' -Confirm:$false

  Lesson [[reference_cron_temp_path_failure_2026_06_11]]: the action script must
  live in the repo (NOT %TEMP%), or the task fails 0xFFFD0000. This targets the
  in-repo path.
#>
param([switch]$RunNow)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $repo 'scripts\auto-synergize-loop.mjs'
if (-not (Test-Path $script)) { throw "loop script not found: $script" }

$node = if (Test-Path 'H:\Tools\nodejs\node.exe') { 'H:\Tools\nodejs\node.exe' } else { (Get-Command node).Source }
$taskName = 'PRISM Auto-Synergize'

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`" --apply --quiet" -WorkingDirectory $repo
# Every 3 hours, anchored at :23 (off the :00 mark -- cron hygiene). The loop's
# own debounce + write-lock make a missed/overlapping run harmless.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date '00:23') `
  -RepetitionInterval (New-TimeSpan -Hours 3) -RepetitionDuration ([TimeSpan]::MaxValue)
# IgnoreNew: never stack a second fold if one is still running. 45-min cap covers
# a full regen-viz on the ~862MB graph under fleet load with headroom; regen-viz's
# graph write-lock is TTL-guarded so a timeout-kill never permanently blocks future runs.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 45) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'PRISM auto-synergize: every 3h, fold new memories/wiki/cross-substrate edges into the searchable system-viz graph (fires regen-viz only when stale; debounced + write-lock guarded).' -Force | Out-Null

Write-Output "Registered scheduled task: $taskName (every 3h at :23)"
Write-Output "  exec: $node `"$script`" --apply --quiet"
Write-Output "  state:  state/shared/system-viz/AUTO-SYNERGIZE-STATE.json"
Write-Output "  ledger: state/shared/system-viz/AUTO-SYNERGIZE-LEDGER.jsonl"
if ($RunNow) {
  Start-ScheduledTask -TaskName $taskName
  Write-Output 'Started once now (check the ledger jsonl for the fold result).'
}
