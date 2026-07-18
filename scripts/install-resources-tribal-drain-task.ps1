<#
.SYNOPSIS
  Register (or remove) the per-user scheduled task that drives the resources-PDF
  -> tribal-tip -> L1-index drain autonomously.

.DESCRIPTION
  PDF-TRIBAL-HERMES/U-TRIBAL-DRAIN-TASK (slot:india 2026-06-24) -- the missing
  autonomy WIRE for zulu's U-TRIBAL-OVERNIGHT-DRAIN. That unit's docstring said
  "a scheduled task can run it every ~20 min overnight" but never shipped the
  task. This registers it.

  PER-USER, NON-ELEVATED by design: unlike the fleet-reaper task (SYSTEM
  principal -> needs admin), this runs as the current interactive user and needs
  NO elevation. The drain is Ollama-first ($0 Claude), bounded (--max-pdfs per
  run), and fully resumable (attempted-PDF cursor + chunk cursor + embed
  hash-skip) with a run-lock so overlapping fires are safe. Drains the full
  resources index (4338 PDFs incl. the 196 MIT-COURSES PDFs) over many runs.

.PARAMETER TaskName     Scheduled task name (default 'PRISM Resources Tribal Drain').
.PARAMETER IntervalMinutes  Minutes between fires (default 20).
.PARAMETER MaxPdfs      PDFs attempted per run -- keep small enough to finish inside one interval (default 4).
.PARAMETER Unregister   Remove the task instead of creating it.
.PARAMETER RunNow       Start the task once immediately after registering.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-resources-tribal-drain-task.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-resources-tribal-drain-task.ps1 -Unregister
#>
param(
  [string]$TaskName = 'PRISM Resources Tribal Drain',
  [int]$IntervalMinutes = 20,
  # Small per-run batch: qwen2.5-coder:32B tip-gen is ~minutes/PDF, so keep the
  # batch tiny enough to make steady resumable progress inside the interval
  # (verified 2026-06-24: one large catalog PDF can exceed ~5 min on its own).
  [int]$MaxPdfs = 4,
  # Cap chunks per doc so a giant catalog PDF cannot stall an entire run.
  [int]$MaxChunksPerDoc = 30,
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
$drain = Join-Path $repoRoot 'scripts/drain-resources-tribal.mjs'
if (-not (Test-Path $drain)) { throw "drain script not found: $drain" }

# Prefer a REAL node.exe -- a scheduled task launches it directly (clean, no
# nested-quote cmd wrapper). The portable-node.cmd shim is for interactive PATH
# use; launching it via `cmd /c ""shim" "script"..."` mangles the script path
# (MODULE_NOT_FOUND -- verified 2026-06-24), so it is the LAST resort.
$nodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node.cmd')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { throw 'node executable not found (portable-node / Tools / PATH all missing)' }

$drainArgs = "--max-pdfs $MaxPdfs --max-chunks-per-doc $MaxChunksPerDoc"
# .cmd shims must be launched via cmd.exe; a real .exe runs directly.
if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs ="/c `"`"$nodeExe`" `"$drain`" $drainArgs`""
} else {
  $exec = $nodeExe
  $taskArgs ="`"$drain`" $drainArgs"
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
# Repeat forever, starting 2 min from now (let this session settle first).
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $IntervalMinutes)
# Current interactive user, LEAST privilege -> no elevation required.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "registered: $TaskName (every $IntervalMinutes min, --max-pdfs $MaxPdfs, user-level)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
