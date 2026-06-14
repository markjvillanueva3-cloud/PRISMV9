param(
  # Cadence (minutes). nomic-embed-text is pinned with keep_alive=30m, so a 4-min
  # tick keeps the 30m residency window always well ahead -- and re-warms within
  # <=4 min of any LRU eviction, so the latency-capped recall embed path almost
  # never finds the model cold.
  [int]$EveryMinutes = 4,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-ollama-embed-keepalive-task.ps1 -- durable USER-LEVEL scheduled task that
# keeps nomic-embed-text resident so the Obsidian memory-recall dense arm never goes
# dark on a cold-evicted embed model (slot:zulu 2026-06-10).
#
# Runs as the CURRENT USER (no UAC / no elevation) -- it only POSTs to the local
# Ollama API, never touches SYSTEM state or the Ollama service env. Re-run anytime
# to reconcile; -Uninstall removes it. Node + repo resolved from this file's location.

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$NodeExe  = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { 'H:\Tools\nodejs\node.exe' }
$TaskName = 'PRISM Ollama Embed Keepalive'

function Remove-IfExists([string]$name) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "  removed: $name"
  }
}

if ($Uninstall) {
  Remove-IfExists $TaskName
  Write-Host 'Ollama embed-keepalive task uninstalled.'
  return
}

if (-not (Test-Path $NodeExe)) { throw "node not found at $NodeExe (set PATH or edit installer)" }

$script = Join-Path $RepoRoot 'scripts\ollama-embed-keepalive.mjs'
if (-not (Test-Path $script)) { throw "missing $script" }

$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$script`"" -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Force `
  -Description "Keep nomic-embed-text resident so the Obsidian memory-recall dense arm stays warm. Kill: PRISM_EMBED_KEEPALIVE_DISABLE=1." | Out-Null
Write-Host "  registered: $TaskName (every $EveryMinutes min)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "  ran $TaskName once"
}

Write-Host 'Ollama embed-keepalive task installed (user-level, no UAC).'
