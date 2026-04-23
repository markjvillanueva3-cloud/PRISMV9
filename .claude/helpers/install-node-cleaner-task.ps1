param(
  [string]$TaskName = 'PRISM Node Orphan Cleaner',
  [int]$EveryMinutes = 5,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

$cleanerScript = 'H:\PRISM\.claude\helpers\node-orphan-cleaner.mjs'
$nodeExe = 'C:\Program Files\nodejs\node.exe'

if (-not (Test-Path $cleanerScript)) {
  throw "Cleaner script not found: $cleanerScript"
}

if (-not (Test-Path $nodeExe)) {
  $nodeCommand = Get-Command node -ErrorAction Stop
  $nodeExe = $nodeCommand.Source
}

$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "`"$cleanerScript`" --scheduled --quiet --reason=scheduled-task"
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Description 'Cleans up stale transient node.exe workers left behind by PRISM/Codex shell, test, and browser runs.' `
  -Force | Out-Null

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
}
