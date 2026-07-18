<#
.SYNOPSIS
  Register (or remove) the per-user scheduled task that embeds generated
  tribal tips (pdf+video+resources) into the L1 tribal-embed-index autonomously.

.DESCRIPTION
  PDF-TRIBAL-HERMES/U-TRIBAL-EMBED-CRON-REARM (slot:papa 2026-06-25) -- the
  missing-durability WIRE for the embed half of zulu's overnight drain.

  ROOT CAUSE this fixes: the drain tasks ('PRISM Resources Tribal Drain' /
  'PRISM Tribal Resources Drain') generate tips every ~20 min with --no-embed
  ("cron embeds"). The ONLY consumer that injects those tips into the index is
  the 'PRISM Tribal Embed' task -- but it had been registered ad-hoc with a
  CAPPED trigger (RepetitionInterval PT30M, Duration PT13H). Once the 13h
  window elapsed its NextRunTime went EMPTY and it stopped firing, while the
  drains kept producing. The result was a producer-alive / consumer-dead
  backlog: 2,751 un-embedded tips measured 2026-06-25 (index 108,982 -> 111,733
  after a manual catch-up). The drains recur FOREVER (no Duration); the embed
  must too. This installer re-arms it with the same forever pattern as
  scripts/install-resources-tribal-drain-task.ps1 (clone-don't-fork) so the
  injection lane never silently dies again.

  PER-USER, NON-ELEVATED by design (matches the drain task): runs as the current
  interactive user, no admin. The embed is Ollama-first ($0 Claude, nomic-embed
  768-d), idempotent (per-tip input-hash skip -> a re-run only embeds the delta),
  and cross-process lock-safe (withTribalIndexLock + writeTribalIndexGuarded
  clobber-guard) -- so overlapping fires never corrupt or double-write the index;
  the loser skips cleanly.

.PARAMETER TaskName        Scheduled task name (default 'PRISM Tribal Embed').
.PARAMETER IntervalMinutes Minutes between fires (default 30 -- the original cadence).
.PARAMETER Unregister      Remove the task instead of creating it.
.PARAMETER RunNow          Start the task once immediately after registering.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-tribal-embed-cron.ps1 -RunNow
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/scripts/install-tribal-embed-cron.ps1 -Unregister
#>
param(
  [string]$TaskName = 'PRISM Tribal Embed',
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

# Repo root = parent of this script's dir (scripts/ -> repo root).
$repoRoot = Split-Path -Parent $PSScriptRoot
$embed = Join-Path $repoRoot 'scripts/embed-pdf-tribal-tips-into-index.mjs'
if (-not (Test-Path $embed)) { throw "embed script not found: $embed" }

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

# .cmd shims must be launched via cmd.exe; a real .exe runs directly.
if ($nodeExe -like '*.cmd') {
  $exec = $env:ComSpec
  $taskArgs = "/c `"`"$nodeExe`" `"$embed`"`""
} else {
  $exec = $nodeExe
  $taskArgs = "`"$embed`""
}

$action = New-ScheduledTaskAction -Execute $exec -Argument $taskArgs -WorkingDirectory $repoRoot
# Repeat FOREVER (no Duration cap -- the bug this fixes), starting 2 min from now.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
# IgnoreNew + the script's own cross-process lock make overlapping fires safe;
# give the run the full interval to finish a large catch-up before the next tick.
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes $IntervalMinutes)
# Current interactive user, LEAST privilege -> no elevation required.
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null
Write-Output "registered: $TaskName (every $IntervalMinutes min, forever, user-level)"
Write-Output "exec: $exec $taskArgs"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Output "started once now"
}
