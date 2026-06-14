# install-brain-refresh-task.ps1 — register the PRISM brain-refresh scheduled task (freshness FLOOR).
#
# brain-refresh.mjs fans out to the 5 unwired brain refresh pipelines (memory recall sidecars,
# AMP2 galaxy synthesis, wiki→tribal embed, +regen-viz under --with-viz). The Stop hook
# (stop-brain-refresh.mjs) triggers the LIGHT refreshes densely as chats stop; this scheduled task
# is the time-based FLOOR that guarantees a full refresh — INCLUDING the heavy regen-viz step
# (--with-viz) — at least every ~2h even in a quiet-commit / low-Stop window.
#
# Mirrors install-fleet-reaper-task.ps1: S4U principal (runs whether-logged-on-or-not, no stored
# password), an AtStartup trigger (resume after reboot), restart-on-failure, phase offset (+450s)
# to clear Cleanup Orchestrator (+60s) / Memory Pressure (+120s) / Fleet Reaper (+210s) /
# Fleet Memory Monitor (+330s). The orchestrator's own 30-min throttle + O_EXCL lock keep this
# task and the Stop hook from ever double-running, so this cannot stampede.
#
# Reversibility (per [[feedback_never_delete_only_disable]]): -Uninstall removes it; or
# `Disable-ScheduledTask -TaskName 'PRISM Brain Refresh'`.
#
# Usage (one elevated run, set-and-forget):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-brain-refresh-task.ps1 -RunNow
#   ...                                                                                   -Uninstall
param(
  [int]$IntervalHours = 2,
  [int]$StartOffsetSeconds = 450,
  [switch]$Interactive,   # legacy: run only when the installing user is logged on
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$TaskName = 'PRISM Brain Refresh'
$Node = 'H:/.claude/bin/portable-node/node.exe'
if (-not (Test-Path $Node)) { $Node = (Get-Command node -ErrorAction SilentlyContinue).Source }
$Script = 'H:/prism/scripts/brain-refresh.mjs'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "[brain-refresh] uninstalled scheduled task '$TaskName'"
  } else {
    Write-Host "[brain-refresh] no task '$TaskName' to uninstall"
  }
  return
}

if (-not $Node)            { throw "node.exe not found (portable-node or PATH)" }
if (-not (Test-Path $Script)) { throw "brain-refresh.mjs not found at $Script" }

# The scheduled run passes --with-viz (heavy regen-viz floor) but NOT --force — the 30-min throttle
# still skips it if a Stop-hook run just refreshed, so this is a true floor, not a forced double-run.
$Action = New-ScheduledTaskAction -Execute $Node -Argument "`"$Script`" --with-viz --verbose" -WorkingDirectory 'H:/prism'

$startAt = (Get-Date).AddSeconds($StartOffsetSeconds)
$repeat  = New-TimeSpan -Hours $IntervalHours
$trigInterval = New-ScheduledTaskTrigger -Once -At $startAt -RepetitionInterval $repeat -RepetitionDuration ([TimeSpan]::MaxValue)
$trigStartup  = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Default: S4U (runs whether-logged-on-or-not, no stored password). -Interactive for legacy mode.
$register = @{
  TaskName = $TaskName
  Action   = $Action
  Trigger  = @($trigInterval, $trigStartup)
  Settings = $settings
  Description = 'PRISM brain-refresh floor: re-runs the 5 brain refresh pipelines (memory sidecars, galaxy synthesis, wiki-tribal embed, system-viz regen) every ~2h. Source: scripts/brain-refresh.mjs / state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md'
  Force    = $true
}
if (-not $Interactive) {
  $register.Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
}

if ($DryRun) {
  Write-Host "[brain-refresh] DRY-RUN — would register '$TaskName':"
  Write-Host "  node:     $Node"
  Write-Host "  script:   $Script --with-viz --verbose"
  Write-Host "  cadence:  every $IntervalHours h, first run +$StartOffsetSeconds s, +AtStartup"
  Write-Host "  principal: $(if ($Interactive) { 'interactive (current user)' } else { 'SYSTEM / S4U RunLevel Highest' })"
  return
}

Register-ScheduledTask @register | Out-Null
Write-Host "[brain-refresh] registered scheduled task '$TaskName' (every $IntervalHours h, +$StartOffsetSeconds s offset, +AtStartup)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "[brain-refresh] kicked an immediate run; check state/shared/.brain-refresh-stamp.json"
}
