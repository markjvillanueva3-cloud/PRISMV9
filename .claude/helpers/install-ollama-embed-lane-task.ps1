param(
  # Cadence (minutes). The guardian is idempotent: lane up -> ~0.2s warm-pin
  # no-op; lane down -> boot + warm. 5 min bounds the worst-case lane outage
  # while keeping the tick cost negligible.
  [int]$EveryMinutes = 5,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-ollama-embed-lane-task.ps1 -- durable USER-LEVEL scheduled task that
# owns the dedicated CPU embed lane (ollama serve @ 127.0.0.1:11435), so the
# embed substrate (tribal-embed cron, memory-recall dense arm, keepalive) never
# starves behind fleet inference on the shared :11434 instance
# (U-INDIA-EMBED-LANE, slot:india 2026-07-01).
#
# Runs as the CURRENT USER (no UAC / no elevation) -- it never touches the main
# Ollama service or its env; the lane is a separate additive process. The TASK
# owns the serve process (a chat-spawned instance gets reaped as an orphan by
# the fleet-reaper -- observed live). Re-run anytime to reconcile; -Uninstall
# removes the task (the running lane process, if any, is left to drain -- kill
# it via Stop-Process -Name ollama only if you know the main instance is the
# service-owned one).

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$NodeExe  = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { 'H:\Tools\nodejs\node.exe' }
$TaskName = 'PRISM Ollama Embed Lane'

function Remove-IfExists([string]$name) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "  removed: $name"
  }
}

if ($Uninstall) {
  Remove-IfExists $TaskName
  Write-Host 'Ollama embed-lane task uninstalled.'
  return
}

if (-not (Test-Path $NodeExe)) { throw "node not found at $NodeExe (set PATH or edit installer)" }

$script = Join-Path $RepoRoot 'scripts\ollama-embed-lane.mjs'
if (-not (Test-Path $script)) { throw "missing $script" }

$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$script`"" -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Force `
  -Description "Own + keep-warm the dedicated CPU embed lane (ollama serve @ :11435) so embeds never starve behind fleet inference. Kill: PRISM_EMBED_LANE_DISABLE=1." | Out-Null
Write-Host "  registered: $TaskName (every $EveryMinutes min)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "  ran $TaskName once"
}

Write-Host 'Ollama embed-lane task installed (user-level, no UAC).'
