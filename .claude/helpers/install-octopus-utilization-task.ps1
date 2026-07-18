param(
  [string]$TaskName = 'PRISM Octopus Utilization',
  # Interval (hours) between utilization ticks. The daily trigger repeats every
  # $IntervalHours so the octopus consensus ledger grows continuously instead of
  # only when a human runs the proof. 4h => ~6 ticks/day; raise to throttle GPU.
  [int]$IntervalHours = 4,
  # Minute-of-hour anchor for the daily trigger. Deliberately OFF :00/:30 so this
  # task never phase-locks onto the top-of-hour burst every other PRISM cron uses
  # (the cron-jitter doctrine: pick a non-:00 minute to spread fleet contention).
  [int]$AnchorMinute = 17,
  # Hour-of-day anchor (24h) for the first daily tick; repetition fans out from here.
  [int]$AnchorHour = 1,
  # Questions to run per tick. 1 keeps each tick to a single ~3-voice consensus
  # (one GPU job); raise for a heavier sweep across more galaxies per tick.
  [int]$Count = 1,
  # Add the FREE-managed Grok cross-family voice (--with-hermes-grok). Zero metered
  # spend: XAI_API_KEY stays cleared, Grok can only fire via the keyless CLI or the
  # local Hermes OAuth proxy (:8645). Off => local-only 2-voice Ollama panel.
  [switch]$NoHermesGrok,
  # OCTOPUS-HERMES-MULTIMODEL: comma-separated DISTINCT Grok model ids, e.g.
  # "grok-4.3,grok-4.20-0309-reasoning". When set, the cron seats ONE Grok voice PER model
  # (all via the free OAuth proxy -> genuine cross-model diversity at $0) and auto-enables the
  # Grok voice. Empty (default) => single Grok voice, byte-identical registration. NOTE: takes
  # effect once dist/engines is refreshed by a routine fleet `npm run build` (the driver loads
  # the COMPILED engine; the src is already tested + live-validated).
  [string]$HermesModels = '',
  # After registering, fire one run immediately and poll until it finishes -- use
  # to verify the install end-to-end without waiting for the first scheduled tick.
  [switch]$RunNow,
  [int]$RunNowTimeoutMinutes = 15,
  [switch]$Uninstall,
  # Legacy interactive-only logon (task dies on log-off). Default (off) hardens to
  # S4U (current user, whether-logged-on-or-not, no stored password).
  [switch]$Interactive,
  # Escalate to the SYSTEM machine account. Not needed: the driver only reads/writes
  # state/shared/ and hits the local Ollama service on :11434 (reachable under S4U).
  [switch]$AsSystem
)

# install-octopus-utilization-task.ps1 -- continuous octopus-consensus utilization
# cron (PSN-OCTOPUS-FLEET-SYNERGY-MS0 / U-ALPHA-OCTOPUS-DRIVER, slot:alpha).
#
# WHAT IT DOES
#   Registers a Windows Scheduled Task named "PRISM Octopus Utilization" that runs
#   the rotating utilization driver every $IntervalHours:
#
#     node H:\PRISM\scripts\octopus-utilization-driver.mjs --count <N> [--with-hermes-grok] --json
#
#   Each tick rotates to a fresh real cross-galaxy consensus question and runs it
#   through the proven LOCAL-ONLY runLive() (zero metered spend): the local Ollama
#   Blackwell panel + the opt-in free-managed Grok voice. The recorded outcome
#   feeds the consensus ledger -> WeeklySynthesis -> system-viz roost. This turns
#   the DORMANT octopus substrate (only fired by hand before) into a continuously
#   utilized one, the operator's "engineered loops, harnesses, crons" intent.
#
#   Working directory: H:\PRISM
#   Log (append):      H:\PRISM\state\shared\octopus-utilization.log
#
# SAFETY -- ZERO METERED SPEND BY CONSTRUCTION
#   The driver composes octopus-first-live-record's buildLocalOnlyEnv(), which
#   CLEARS XAI_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY and sentinels the codex
#   binary, so no external metered provider can ever fire. --with-hermes-grok adds
#   the Grok voice ONLY via its free CLI / local Hermes proxy backend.
#
# KILL SWITCH (env, read by the driver -- pause without unregistering)
#   PRISM_OCTOPUS_UTILIZATION_DISABLE=1  -- the tick skips + exits 0 (task stays green).
#
# HOW TO RUN THIS INSTALLER (requires elevated PowerShell)
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File H:\PRISM\.claude\helpers\install-octopus-utilization-task.ps1 -RunNow
#
# HOW TO REMOVE
#   & 'H:\PRISM\.claude\helpers\install-octopus-utilization-task.ps1' -Uninstall
#
# HOW TO PAUSE WITHOUT REMOVING
#   Disable-ScheduledTask -TaskName 'PRISM Octopus Utilization'
#   Re-enable: Enable-ScheduledTask -TaskName 'PRISM Octopus Utilization'

$ErrorActionPreference = 'Stop'

# Registering a task in the root \ folder needs an elevated context on Win11.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering '$TaskName' needs admin rights."
}

# Canonical working dir: the main tree (never a worktree -- a worktree can be
# removed, dangling the task's working directory).
$workDir = 'H:\PRISM'
$harnessScript = 'scripts\octopus-utilization-driver.mjs'
$logFile = 'H:\PRISM\state\shared\octopus-utilization.log'

# Prefer the portable node this PC uses; fall back to PATH then Program Files
# (mirrors every PRISM install-*.ps1 helper's resolution order).
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

# Verify the working directory + harness exist before registering -- a task that
# silently fails every tick because the path is wrong is worse than no task.
if (-not (Test-Path $workDir)) {
  throw "Working directory not found: $workDir (run on the PRISM host with H:\PRISM present)."
}
if (-not (Test-Path (Join-Path $workDir $harnessScript))) {
  throw "Harness not found: $workDir\$harnessScript (ensure scripts/octopus-utilization-driver.mjs is committed on this host)."
}

# Ensure the log directory exists so the first run does not fail on a missing parent.
$logDir = Split-Path $logFile -Parent
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  Write-Host "Created log directory: $logDir"
}

# Build the driver flags. Local-only is the DRIVER DEFAULT (buildLocalOnlyEnv);
# the free Grok voice is opt-in and ON unless -NoHermesGrok is passed.
$driverFlags = "--count $Count --json"
if (-not $NoHermesGrok) { $driverFlags += ' --with-hermes-grok' }
# OCTOPUS-HERMES-MULTIMODEL: seat one Grok voice per DISTINCT model when -HermesModels is set.
# Quoted with the same backtick-escape pattern this file already uses for paths, so the
# comma-separated value survives the cmd /c wrapper as ONE argv element.
$hm = $HermesModels.Trim()
if ($hm.Length -gt 0) { $driverFlags += " --hermes-models `"$hm`"" }

# The action wraps cmd.exe for single-action stdout+stderr append redirection.
# A timestamp header makes individual runs distinguishable in the append log
# without a separate rotation scheme. PRISM_OCTOPUS_LIVE_DISPATCH=1 is set
# explicitly (belt-and-suspenders -- the driver also sets it via buildLocalOnlyEnv).
$cmdLine = "cmd /c ""echo === PRISM Octopus Utilization %DATE% %TIME% === >> `"$logFile`" 2>&1 && cd /d `"$workDir`" && set PRISM_OCTOPUS_LIVE_DISPATCH=1&& `"$nodeExe`" `"$harnessScript`" $driverFlags >> `"$logFile`" 2>&1"""

$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $cmdLine -WorkingDirectory $workDir

# Daily trigger anchored at $AnchorHour:$AnchorMinute, repeating every
# $IntervalHours for ~10 years of self-renewal. The off-:00 anchor minute keeps
# this task out of the top-of-hour fleet burst.
$anchorDate = (Get-Date -Hour $AnchorHour -Minute $AnchorMinute -Second 0)
$trigger = New-ScheduledTaskTrigger -Daily -At $anchorDate
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At $anchorDate `
  -RepetitionInterval (New-TimeSpan -Hours $IntervalHours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)).Repetition

# ExecutionTimeLimit 30 min: a cold 2-3 voice local consensus (model load +
# prewarm + inference) is expected to take ~2-6 min; 30 min is a generous ceiling
# that still kills a genuinely hung run. MultipleInstances IgnoreNew so two GPU
# consensus jobs never stack if a prior tick overruns.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -RestartCount 1 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

# Principal -- autonomy over interactive-only. S4U (current user, no stored
# password) is sufficient: the driver writes state/shared/ and hits the local
# Ollama service on :11434, both reachable whether-logged-on-or-not.
$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
  }
}

$grokLabel = if ($NoHermesGrok) { 'local-only 2-voice' } else { 'local + free Grok 3-voice' }
$desc = "Continuous octopus-consensus utilization driver ($grokLabel, zero metered spend). Every $IntervalHours h rotates a real cross-galaxy consensus question through octopus-utilization-driver.mjs --count $Count, growing the consensus ledger -> WeeklySynthesis -> system-viz roost. Log: $logFile. Kill switch: PRISM_OCTOPUS_UTILIZATION_DISABLE=1. PSN-OCTOPUS-FLEET-SYNERGY-MS0/U-ALPHA-OCTOPUS-DRIVER, slot:alpha."

# -Force => idempotent overwrite of an existing same-name task. Splat so
# -Principal is omitted entirely under -Interactive (-Principal $null throws).
$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $trigger
  Settings    = $settings
  Description = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }
Register-ScheduledTask @registerParams | Out-Null

$autonomy = if ($Interactive) { 'INTERACTIVE-ONLY (stops on log-off)' }
  elseif ($AsSystem) { 'AUTONOMOUS as SYSTEM' }
  else { 'AUTONOMOUS as S4U / current user' }
Write-Host "Registered: $TaskName ($grokLabel, $autonomy)"
Write-Host "  Trigger:  Daily at $($AnchorHour):$('{0:D2}' -f $AnchorMinute), repeating every $IntervalHours h"
Write-Host "  Command:  node $harnessScript $driverFlags"
Write-Host "  Workdir:  $workDir"
Write-Host "  Log:      $logFile  (append)"
Write-Host "  node:     $nodeExe"

if ($RunNow) {
  Write-Host ""
  Write-Host "Triggering immediate run for verification..."
  Start-ScheduledTask -TaskName $TaskName
  # 267009 (0x41301) = still running. Poll until it finishes or the timeout hits.
  $deadline = (Get-Date).AddMinutes($RunNowTimeoutMinutes)
  do {
    Start-Sleep -Seconds 10
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Still running after $RunNowTimeoutMinutes min -- tail the log:"
    Write-Host "  Get-Content '$logFile' -Tail 30 -Wait"
  } else {
    Write-Host "Run complete. LastTaskResult=$($info.LastTaskResult)  (0 = success)"
    if ($info.LastTaskResult -ne 0) {
      Write-Host "  Non-zero -- check the log: Get-Content '$logFile' -Tail 50"
    }
  }
}

Write-Host ""
Write-Host "Management commands:"
Write-Host "  Verify registered:        schtasks /Query /TN '$TaskName'"
Write-Host "  Tail live log:            Get-Content '$logFile' -Tail 30 -Wait"
Write-Host "  Trigger manual run:       Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Pause (keep registered):  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "  Resume after pause:       Enable-ScheduledTask  -TaskName '$TaskName'"
Write-Host "  Uninstall:                & '$PSScriptRoot\install-octopus-utilization-task.ps1' -Uninstall"
