param(
  [string]$TaskName = 'PRISM Hermes Doctor',
  [int]$EveryMinutes = 15,
  # Phase offset (seconds) off install so this does not phase-lock onto the other host
  # tasks (Cleanup +60s, Memory +60s, Hermes Proxy +150s, Fleet Reaper +210s). +270s is clear.
  [int]$StartOffsetSeconds = 270,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-hermes-doctor-task.ps1 -- durable drift-guard that keeps the Hermes desktop/CLI
# LAUNCH-READY (HERMES-LAUNCH-RELIABILITY-MS0, slot:bravo 2026-06-30).
#
# Registers a Windows Scheduled Task that runs hermes-doctor.mjs (--no-warm) every
# $EveryMinutes minutes. The doctor is idempotent + lightweight (NO agent inference --
# it does not fire a Hermes/NVIDIA call, so it can NOT starve the desktop the way the
# enrichment crons did). Each tick:
#   - reasserts IPv4 preference (so the Nous boot/NAS-JWT can't IPv6-hang on this box),
#   - re-applies the known-good config (gpt-oss:120b @>=64K, strips the <64K NVIDIA
#     fallback that HARD-FAILS launch) if a slot/update drifted it,
#   - reaps a confirmed-dead :8645 proxy (frees the port + clears the DARK banner).
# This is the "no more mixups" guarantee: even if a future chat rewrites the AppData
# config, the next tick heals it back to the source-of-truth.
#
# --no-warm: the periodic task does NOT load gpt-oss:120b (60GB) -- that would hog VRAM
# from the fleet. Pre-warming happens at actual launch (the launcher prepend or a manual
# `node scripts/hermes-doctor.mjs`). Connect-RELIABILITY is fixed by config+IPv4+port,
# which this task maintains; the warm only speeds the FIRST message.
#
# Principal: S4U / CURRENT USER, RunLevel Highest. Needs: the user-scoped AppData hermes
# config; admin for `netsh ... set prefixpolicy` + reaping the user proxy. Per
# feedback_never_delete_only_disable: Disable-ScheduledTask pauses; -Uninstall removes.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

# Always target the canonical main tree (a worktree's scripts/ can be removed).
$doctorScript = 'H:\PRISM\scripts\hermes-doctor.mjs'
if (-not (Test-Path $doctorScript)) {
  throw "Doctor script not found: $doctorScript (run on the PRISM host; ensure scripts/hermes-doctor.mjs is committed)."
}
# Sanity: confirm it is the doctor (header marker + a doctor flag).
$head = Get-Content $doctorScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'hermes-doctor') -and ($head -match 'launch'))) {
  throw "Refusing to install: $doctorScript does not look like hermes-doctor.mjs."
}

$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

$doctorArgs = "`"$doctorScript`" --no-warm --json"
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $doctorArgs

$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$trigger = @($pollTrigger, $startupTrigger, $logonTrigger)

# ExecutionTimeLimit 5 min: the no-warm doctor finishes in seconds; 5 min is a generous
# ceiling. IgnoreNew so a slow tick never stacks. Self-heal on abnormal exit.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# S4U / current user -- needs the user's AppData hermes config + user-owned proxy.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType S4U -RunLevel Highest

$desc = "Drift-guard that keeps the Hermes desktop/CLI launch-ready (hermes-doctor.mjs --no-warm). Idempotently reasserts IPv4 preference, re-applies the known-good config (gpt-oss:120b @>=64K, no <64K NVIDIA fallback), and reaps a dead :8645 proxy. Lightweight (no agent inference). Runs as current user, every $EveryMinutes min + AtStartup + AtLogOn."

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description $desc -Force | Out-Null

Write-Host "Registered: $TaskName (every $EveryMinutes min + AtStartup + AtLogOn, +$($StartOffsetSeconds)s offset, S4U current user, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "Verify:                      schtasks /Query /TN '$TaskName'"
Write-Host "Run the doctor (with warm):  node H:\PRISM\scripts\hermes-doctor.mjs"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-hermes-doctor-task.ps1' -Uninstall"
