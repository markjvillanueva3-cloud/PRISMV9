<#
.SYNOPSIS
  Register (or remove) the per-user scheduled task that drives the REPUTABLE
  ONLINE-SOURCE -> tribal-tip drain autonomously (curated web queue: vendor docs,
  college/MIT pages, machining wikis the operator asked to pull in).

.DESCRIPTION
  WEB-SOURCE-TRIBAL-LANE autonomy WIRE for drain-web-sources-tribal.mjs
  (the lane: slot:india U-WEB-SOURCE-TRIBAL-LANE 2026-06-25). The operator asked to
  "add more from reputable sources online like college textbooks, MIT courses we did
  not download, and other sources." That lane fetches each curated URL, strips HTML
  to text, mines it with Ollama (REUSED youtube-free-extract tip extractor), and
  promotes the tips into the tribal store via U-TK01 content-dedup + the per-id
  promotion ledger. It was BUILT but had no durable scheduler (the same gap the
  resources-PDF drain had before install-resources-tribal-drain-task.ps1). This is
  the missing wire -- a clone of install-html-help-tribal-drain-task.ps1 (R8/R15
  clone-don't-fork: every drain lane gets the identical proven scheduler).

  PER-USER, NON-ELEVATED by design (like the resources-PDF + html-help drains): runs
  as the current interactive user, no elevation. Ollama-first ($0 Claude), bounded
  (--max-sources per run), fully resumable (per-source 7d cooldown + promotion
  ledger), MultipleInstances IgnoreNew so overlapping fires are safe. fetched HTML is
  DATA (instruction-source-boundary): it is stripped to text and mined for machining
  tips only, never executed as instructions.

  SAFETY: fetches PUBLIC reputable pages the operator explicitly requested. It reads
  external content; it never sends user data out. The queue is curated
  (state/shared/web-source-queue.json) -- it does not crawl arbitrary URLs.

.PARAMETER TaskName     Scheduled task name (default 'PRISM Web Sources Tribal Drain').
.PARAMETER IntervalMinutes  Minutes between fires (default 120; per-source 7d cooldown means
                            most fires find few/none due and exit fast -- frequent is harmless).
.PARAMETER MaxSources   Sources fetched per run (default 3 -- network fetch + Ollama tip-gen).
.PARAMETER MaxChars     Cap chars mined per source so one huge page cannot stall a run (default 120000).
.PARAMETER Unregister   Remove the task instead of creating it.
.PARAMETER RunNow       Start the task once immediately after registering.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-web-sources-tribal-drain-task.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-web-sources-tribal-drain-task.ps1 -Unregister
#>
param(
  [string]$TaskName = 'PRISM Web Sources Tribal Drain',
  [int]$IntervalMinutes = 120,
  [int]$MaxSources = 3,
  [int]$MaxChars = 120000,
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
$drain = Join-Path $repoRoot 'scripts/drain-web-sources-tribal.mjs'
if (-not (Test-Path $drain)) { throw "drain script not found: $drain" }

# Prefer a REAL node.exe -- a scheduled task launches it directly (clean, no nested
# cmd wrapper). The portable-node.cmd shim mangles the script path when launched via
# cmd /c, so it is the LAST resort (matches install-resources/html-help drain tasks).
$nodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node.cmd')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { $nodeExe = $cmd.Source }
}
if (-not $nodeExe) { throw 'node executable not found (portable-node / Tools / PATH all missing)' }

$drainArgs = "--max-sources $MaxSources --max-chars $MaxChars"
if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs = "/c `"`"$nodeExe`" `"$drain`" $drainArgs`""
} else {
  $exec = $nodeExe
  $taskArgs = "`"$drain`" $drainArgs"
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
# Repeat forever, starting 5 min from now (offset from resources +2 / html-help +3 so
# the drains do not all spike the single Ollama GPU at the same instant).
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $IntervalMinutes)
# Current interactive user, LEAST privilege -> no elevation required.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "registered: $TaskName (every $IntervalMinutes min, --max-sources $MaxSources, user-level)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
