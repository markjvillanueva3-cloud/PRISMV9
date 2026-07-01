<#
.SYNOPSIS
  Register (or remove) the per-user scheduled task that drives the CAD/CAM SOFTWARE
  HELP-HTML -> tribal-tip drain autonomously (Fusion / hyperCAD-S / hyperMILL /
  Mastercam help systems).

.DESCRIPTION
  CAD-LEARNING-AI/U-HTML-HELP-TRIBAL-LANE (slot:india 2026-06-26) -- the autonomy
  WIRE for drain-html-help-tribal.mjs. The operator's named CAD/CAM software ships
  its real procedural knowledge as HTML help systems that the resources-PDF drain
  structurally cannot reach (~3081 deduped English, newest-version help docs). This
  task drains them in bounded, resumable batches.

  PER-USER, NON-ELEVATED by design (like the resources-PDF drain task): runs as the
  current interactive user, no elevation. Ollama-first ($0 Claude), bounded
  (--max-docs per run), fully resumable (per-doc attempted cursor + chunk cursor +
  embed hash-skip), run-lock so overlapping fires are safe.

  Runs with --no-embed: tip GENERATION only. The separate "PRISM Tribal Embed" task
  (embed-pdf-tribal-tips-into-index.mjs, no args -> default sources now include
  "html") owns the shard-safe index writes, so this drain never contends for the
  ~1.18GB tribal index lock. Tips stay durable in html-help-tips.jsonl until embedded.

.PARAMETER TaskName     Scheduled task name (default 'PRISM HTML Help Tribal Drain').
.PARAMETER IntervalMinutes  Minutes between fires (default 20).
.PARAMETER MaxDocs      Help docs attempted per run (default 12 -- ~18% are rich, tip-gen ~minutes/doc).
.PARAMETER MaxChunksPerDoc  Cap chunks per doc so one huge help page cannot stall a run (default 20).
.PARAMETER Unregister   Remove the task instead of creating it.
.PARAMETER RunNow       Start the task once immediately after registering.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-html-help-tribal-drain-task.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-html-help-tribal-drain-task.ps1 -Unregister
#>
param(
  [string]$TaskName = 'PRISM HTML Help Tribal Drain',
  [int]$IntervalMinutes = 20,
  [int]$MaxDocs = 12,
  [int]$MaxChunksPerDoc = 20,
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

# Repo root = parent of this script's dir (scripts/ -> repo root).
$repoRoot = Split-Path -Parent $PSScriptRoot
$drain = Join-Path $repoRoot 'scripts/drain-html-help-tribal.mjs'
if (-not (Test-Path $drain)) { throw "drain script not found: $drain" }

# Prefer a REAL node.exe -- a scheduled task launches it directly (clean, no nested
# cmd wrapper). The portable-node.cmd shim mangles the script path when launched via
# cmd /c, so it is the LAST resort (matches install-resources-tribal-drain-task.ps1).
$nodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node.cmd')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { throw 'node executable not found (portable-node / Tools / PATH all missing)' }

$drainArgs = "--max-docs $MaxDocs --max-chunks-per-doc $MaxChunksPerDoc --no-embed"
if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs = "/c `"`"$nodeExe`" `"$drain`" $drainArgs`""
} else {
  $exec = $nodeExe
  $taskArgs = "`"$drain`" $drainArgs"
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
# Repeat forever, starting 3 min from now (offset from the resources-PDF drain's +2 min
# so the two drains do not both spike Ollama at the exact same instant).
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(3) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $IntervalMinutes)
# Current interactive user, LEAST privilege -> no elevation required.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "registered: $TaskName (every $IntervalMinutes min, --max-docs $MaxDocs, user-level)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
