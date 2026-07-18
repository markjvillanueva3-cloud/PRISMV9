param(
  # Cadence (minutes). The guard is double-gated (only the 'wedged' class triggers a
  # reap+restart), so a 10-min tick on a HEALTHY host just runs the fast generate probe
  # (smallest RESIDENT generate-capable model via /api/ps, resident-first 2026-07-01;
  # falls back to qwen2.5-coder:1.5b cold-load only when nothing is resident) -> it
  # doubles as a health monitor + warm-probe.
  # On a real wedge it self-heals within <=10 min instead of staying dark for days.
  [int]$EveryMinutes = 10,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-ollama-wedge-guard-task.ps1 -- durable USER-LEVEL scheduled task that runs
# `node scripts/ollama-wedge-guard.mjs --recover` so the recurring Ollama /api/generate
# WEDGE (tags+embeddings respond, generate hangs, resources free) self-heals unattended.
# This is the deferred wiring from U-OLLAMA-WEDGE-GUARD (golf/Tier-3 domain), authorized
# by the operator 2026-06-23 (slot:zulu).
#
# Runs as the CURRENT USER (no UAC / no elevation) -- the guard only probes the local
# Ollama API and, ONLY on a confirmed wedge, reaps a dead-parent llama-server orphan +
# enable+restarts the user-level "PRISM Ollama Serve" scheduled task. It deliberately does
# NOT restart on 'resource-starved' (a restart cannot fix an OOM). Re-run anytime to
# reconcile; -Uninstall removes it. Node + repo resolved from this file's location.

$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$NodeExe  = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { 'H:\Tools\nodejs\node.exe' }
$TaskName = 'PRISM Ollama Wedge Guard'

function Remove-IfExists([string]$name) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "  removed: $name"
  }
}

if ($Uninstall) {
  Remove-IfExists $TaskName
  Write-Host 'Ollama wedge-guard task uninstalled.'
  return
}

if (-not (Test-Path $NodeExe)) { throw "node not found at $NodeExe (set PATH or edit installer)" }

$script = Join-Path $RepoRoot 'scripts\ollama-wedge-guard.mjs'
if (-not (Test-Path $script)) { throw "missing $script" }

$action  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$script`" --recover" -WorkingDirectory $RepoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes)
# IgnoreNew + a 5-min limit so a hung probe (gen timeout 45s + recover 60s + settle + re-probe ~160s
# worst case) can never STACK overlapping instances on the 10-min tick (scrutiny P2, 2026-06-23).
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force `
  -Description "Detect + auto-recover the recurring Ollama /api/generate wedge (reap dead-parent orphan + enable+restart 'PRISM Ollama Serve'). Double-gated: only a confirmed wedge triggers a restart. Exit 1 = wedged-and-not-recovered/down (the PRISM Fleet Task Health watchdog alerts). Disable: Disable-ScheduledTask -TaskName 'PRISM Ollama Wedge Guard'." | Out-Null
Write-Host "  registered: $TaskName (every $EveryMinutes min, --recover)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "  ran $TaskName once"
}

Write-Host 'Ollama wedge-guard task installed (user-level, no UAC).'
