<#
.SYNOPSIS
  Register a dedicated generator task that turns html-help-nodes into tips.jsonl
  overnight. Decouples node writing (drain) from tip generation (Ollama).

.DESCRIPTION
  Runs:
    PRISM_TRIBAL_SOURCE_DIR=state/shared/pdf-tribal-tips/html-help-nodes
    PRISM_TRIBAL_OUT=state/shared/pdf-tribal-tips/html-help-tips.jsonl
    node scripts/generate-pdf-tribal-tips-hermes.mjs --concurrency 8 --ollama-only

  This ensures tips keep being produced even when the drain runs with --no-embed.
  User-level, non-elevated. Fail-soft. 30-minute cadence so it trails the drain.

.PARAMETER TaskName
  Default: 'PRISM HTML Help Generator'

.PARAMETER IntervalMinutes
  Default: 30

.PARAMETER Unregister
  Remove the task.

.PARAMETER RunNow
  Start once after registering.
#>
param(
  [string]$TaskName = 'PRISM HTML Help Generator',
  [int]$IntervalMinutes = 30,
  [switch]$Unregister,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

if ($Unregister) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Output "removed: $TaskName"
  } else {
    Write-Output "not present: $TaskName"
  }
  return
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$gen = Join-Path $repoRoot 'scripts/generate-pdf-tribal-tips-hermes.mjs'
if (-not (Test-Path $gen)) { throw "generator not found: $gen" }

$nodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node.cmd')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { throw 'node executable not found' }

$envPrefix = 'PRISM_TRIBAL_SOURCE_DIR=state/shared/pdf-tribal-tips/html-help-nodes PRISM_TRIBAL_OUT=state/shared/pdf-tribal-tips/html-help-tips.jsonl'
$genArgs = '--concurrency 8 --ollama-only'

if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs = "/c `"set $envPrefix && `"$nodeExe`" `"$gen`" $genArgs`""
} else {
  $exec = $nodeExe
  $taskArgs = "`"$gen`" $genArgs"
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(4) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

Write-Output "registered: $TaskName (every $IntervalMinutes min)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
