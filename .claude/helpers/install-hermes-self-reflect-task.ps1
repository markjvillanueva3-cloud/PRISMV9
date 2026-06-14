param(
  [string]$TaskName = 'PRISM Hermes Self-Reflect Weekly',
  # Sunday 20:53 local — off-minute discipline (avoid :00/:30 fleet collisions).
  # The B4 sister 'PRISM Weekly Synthesis' fires Sun 20:10 (LLM-based via
  # Ollama). This task fires 43 min later so the two weekly Hermes jobs don't
  # contend for the same memos/* I/O window. Both anchor on the same Sunday
  # UTC, so their outputs are complementary, not racing.
  [string]$DayOfWeek = 'Sunday',
  [string]$Time = '20:53',
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsSystem
)

# install-hermes-self-reflect-task.ps1 — durable backbone for the WEEKLY
# Hermes self-reflect populater (scripts/hermes-self-reflect-populater.mjs).
#
# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B1-HMEMV04-CRON-REGISTRATION
# (2026-05-28, slot:alpha follow-up — completes the OTHER half the 6f9a21c99a
# commit named). The dream-cycle installer (install-hermes-dream-cycle-task.ps1
# at 6f9a21c99a) only covered hermes-dream-cycle-synth.mjs; the unit
# description named TWO scripts. This installer closes the second.
#
# What it does: registers a Windows scheduled task that runs the self-reflect
# populater once weekly (Sunday 20:53 local). The populater walks
# knowledge/memories/{feedback,reference,project}/*.md from the past 7 days,
# groups by type, computes top-recurring keywords (stop-word filtered),
# writes a markdown digest at
# knowledge/memories/weekly-hermes-reflection-<anchor>.md — purely mechanical
# aggregation (no LLM dependency), deterministic, fast.
#
# Sister tasks (do not collide):
#   PRISM Weekly Synthesis           — Sunday 20:10, LLM via Ollama (B4)
#   PRISM Hermes Dream-Cycle Synth   — Nightly 03:17, mechanical (B1 sibling)
# This populater is WEEKLY (Sunday-anchored aggregation matches the snap
# formula in the dispatcher at memoryDispatcher.ts:729-732 and the populater
# script's own snapToSunday).
#
# Per the U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE sidecar (commits 618184b818
# + f3dce73b8d), prism_memory:weekly_synthesis_get now attaches a
# hermes_reflection sidecar that surfaces THIS populater's output. Without
# this nightly cron the dispatcher sidecar permanently reports
# exists:false / error:not_yet_populated. The two are paired: code-wired
# (already shipped) + cron-registered (this installer) = closed loop.
#
# Idempotent + atomic: Register-ScheduledTask -Force overwrites any same-
# name task in place; no destructive Unregister-then-Register window.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS; use -Uninstall
# to formally remove, or Disable-ScheduledTask to pause without removing.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

$populaterScript = 'H:\PRISM\scripts\hermes-self-reflect-populater.mjs'

# Prefer the portable node; fall back to PATH then Program Files. Mirrors
# install-hermes-dream-cycle-task.ps1:56-60 — keep in sync.
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

if (-not (Test-Path $populaterScript)) {
  throw "Self-reflect populater script not found: $populaterScript (run on the PRISM host with H:\PRISM present, and ensure scripts/hermes-self-reflect-populater.mjs is committed)."
}

# Sanity: confirm the script is the one we expect. A future refactor that
# renames the canonical file would break the task silently. Match both the
# filename marker AND the unit-id marker so a rename-without-touching the
# header still trips the gate.
$head = Get-Content $populaterScript -TotalCount 30 -ErrorAction SilentlyContinue
if (-not (($head -match 'hermes-self-reflect-populater') -and ($head -match 'HMEMV06'))) {
  throw "Refusing to install: $populaterScript does not look like hermes-self-reflect-populater.mjs (missing HMEMV06 header marker)."
}

$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "`"$populaterScript`""

# Weekly trigger on $DayOfWeek at $Time local. StartWhenAvailable means a
# PC that was off at trigger time runs the populater at the next opportunity
# — important for a weekly job that operators don't want to lose to a Sunday
# evening reboot.
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time

# ExecutionTimeLimit 120s: populater typically completes in <2s (no LLM,
# pure file IO + keyword frequency); cap at 2min guards against pathological
# corpora (e.g. >100K memos).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 120) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$principal = $null
if (-not $Interactive) {
  if ($AsSystem) {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
      -LogonType ServiceAccount -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType S4U -RunLevel Highest
  }
}

$desc = "Weekly Hermes self-reflect populater (hermes-self-reflect-populater.mjs). Walks past-7-day memos in knowledge/memories/{feedback,reference,project}/*.md, groups by type, computes top-recurring keywords, writes knowledge/memories/weekly-hermes-reflection-<anchor>.md (Sunday-snapped). Mechanical aggregation (no LLM), deterministic, fast. Paired with prism_memory:weekly_synthesis_get dispatcher sidecar (commits 618184b818 + f3dce73b8d). Closes U-GALAXY-MS1-B1-HMEMV04-CRON-REGISTRATION (alpha 2026-05-28). Sister tasks: PRISM Weekly Synthesis (Sun 20:10, LLM) + PRISM Hermes Dream-Cycle Synth (nightly 03:17, mechanical)."

if ($DryRun) {
  Write-Host "DRY-RUN: would register '$TaskName' with the following:"
  Write-Host "  Action:       $nodeExe `"$populaterScript`""
  Write-Host "  Trigger:      Weekly $DayOfWeek at $Time local"
  Write-Host "  Principal:    $($(if ($Interactive) {'INTERACTIVE'} elseif ($AsSystem) {'SYSTEM'} else {'S4U as ' + $env:USERNAME}))"
  Write-Host "  Description:  $desc"
  return
}

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

$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy — dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($autonomy, hermes-self-reflect-populater.mjs, weekly $DayOfWeek at $Time, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after 60s (LastTaskResult=267009)."
  } else {
    $name = switch ($info.LastTaskResult) {
      0 { 'OK' }
      2 { 'FAIL (populater exited non-zero)' }
      default { 'UNKNOWN' }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (CLI flags to the populater script — see script header for full list):"
Write-Host "  --root <path>             memos root (default H:/prism/knowledge/memories)"
Write-Host "  --days N                  recency window (default 7)"
Write-Host "  --out <path>              output file (default {root}/weekly-hermes-reflection-<anchor>.md)"
Write-Host "  --anchor YYYY-MM-DD       override Sunday-snap anchor (default: most-recent Sunday UTC)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Read last output:            Get-Content H:/prism/knowledge/memories/weekly-hermes-reflection-<YYYY-MM-DD>.md"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '`$PSScriptRoot\install-hermes-self-reflect-task.ps1' -Uninstall"
Write-Host "Dispatcher sidecar verify:   node -e `"console.log(require('fs').existsSync('H:/prism/knowledge/memories/weekly-hermes-reflection-' + new Date(Date.now() - new Date().getUTCDay()*86400000).toISOString().slice(0,10) + '.md'))`""
