param(
  [string]$TaskName = 'PRISM Hermes Dream-Cycle Synth',
  # Run nightly at 03:17 local -- off-hour minute to avoid the :00/:30 fleet
  # collision per the cron-style off-minute discipline. Also avoids the daily-
  # context window which fires earlier in the morning.
  [string]$Time = '03:17',
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsSystem
)

# install-hermes-dream-cycle-task.ps1 -- durable backbone for the nightly
# dream-cycle synthesis populater (scripts/hermes-dream-cycle-synth.mjs).
#
# DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B1-HMEMV04-CRON-REGISTRATION
# (2026-05-27, slot:alpha follow-up). Closes the cron-registration P1 from
# the B1 ship session (the synthesis script itself shipped at 0df9eac44c
# with the reverse-mirror hook 5bcf40f66f69 closing the other half of
# HMEMV04).
#
# What it does: registers a Windows scheduled task that runs the dream-
# cycle synthesis once nightly. The synth walks ALL memos in
# knowledge/memories/{feedback,reference,project}/*.md, computes Jaccard
# keyword-set similarity, writes knowledge/memories/dreams/<YYYY-MM-DD>.md
# with frontmatter + top-25 connections + top-10 cluster heads as Obsidian
# [[wikilinks]]. Mechanical aggregation (no LLM dependency), deterministic,
# fast (~245K Jaccard comparisons in <1s on V8 for ~700 memos).
#
# Sister tasks (do not collide):
#   PRISM Weekly Synthesis           -- Sunday 20:10, LLM via Ollama (B4)
#   PRISM Daily Context              -- earlier morning brief (B1 sibling)
#   PRISM Hermes Self-Reflect        -- separate weekly populater
# This dream-cycle is NIGHTLY (cross-memo connection discovery is fresh
# each day as new memos auto-feed in via the Stop-hook auto-memory layer).
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
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

$synthScript = 'H:\PRISM\scripts\hermes-dream-cycle-synth.mjs'

# Prefer the portable node; fall back to PATH then Program Files. Mirrors
# install-fleet-memory-monitor-task.ps1:66-71 -- keep in sync.
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

if (-not (Test-Path $synthScript)) {
  throw "Dream-cycle synth script not found: $synthScript (run on the PRISM host with H:\PRISM present, and ensure scripts/hermes-dream-cycle-synth.mjs is committed)."
}

# Sanity: confirm the script is the one we expect. A future refactor that
# renames the canonical file would break the task silently.
$head = Get-Content $synthScript -TotalCount 30 -ErrorAction SilentlyContinue
if (-not (($head -match 'hermes-dream-cycle-synth') -and ($head -match 'HMEMV04'))) {
  throw "Refusing to install: $synthScript does not look like hermes-dream-cycle-synth.mjs (missing HMEMV04 header marker)."
}

# --llm-synth: enrich the nightly dream connections with a local-LLM (Blackwell
# qwen2.5-coder:32b) "why these connect" rationale ($0 Claude tokens, fail-open).
# Validated live on the 11,476-memo production vault 2026-06-09 (U-OBS-DREAM-LLM-SYNTH).
# Takes effect on the next ELEVATED re-register of this task. Disable: drop the flag.
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument "`"$synthScript`" --llm-synth"

# Daily trigger at $Time local. StartWhenAvailable means a PC that was off
# at trigger time runs the synth at the next opportunity.
$trigger = New-ScheduledTaskTrigger -Daily -At $Time

# ExecutionTimeLimit 30min (was 120s): the nightly job is NO LONGER the <2s
# mechanical synth this cap was sized for (slot:alpha, ~700 memos). Three things
# were added since, none re-sizing the cap, so the 120s limit OS-killed the task
# -> LastTaskResult 267014 (SCHED_S_TASK_TERMINATED) every night EVEN THOUGH the
# dream md was already written:
#   (1) corpus grew ~700 -> 19K+ memos (synth ~9s -- still fine);
#   (2) the action gained --llm-synth (cold-loads qwen2.5-coder:32b + per-edge
#       Ollama rationale calls, up to 30s each);
#   (3) the runGalaxyCascade tail spawns galaxy-synthesis-refresh.mjs (Ollama L1
#       regen + sidecar rebuilds -- MINUTES when galaxies changed; blunt sibling
#       B1 is ~20min).
# 30min is generous-but-bounded (a truly-hung job still cannot run forever). The
# cascade itself self-aborts at 20min < this limit (PRISM_DREAM_CASCADE_TIMEOUT_MS),
# so the task should comfortably finish well under 30min. (slot:bravo 2026-06-17)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
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

$desc = "Nightly Hermes dream-cycle synthesis (hermes-dream-cycle-synth.mjs). Walks all memos in knowledge/memories/{feedback,reference,project}/*.md, computes Jaccard keyword-set similarity across pairs (top-20 keywords/memo, >=0.15 threshold), writes knowledge/memories/dreams/<date>.md with frontmatter + top-25 connections + top-10 cluster heads as Obsidian [[wikilinks]]. Mechanical aggregation (no LLM), deterministic, fast. Closes U-GALAXY-MS1-B1-HMEMV04-CRON-REGISTRATION (alpha 2026-05-27). Paired sibling: PRISM Weekly Synthesis (Sunday 20:10, LLM-based) + future Hermes Self-Reflect populater."

if ($DryRun) {
  Write-Host "DRY-RUN: would register '$TaskName' with the following:"
  Write-Host "  Action:       $nodeExe `"$synthScript`""
  Write-Host "  Trigger:      Daily at $Time local"
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
  'INTERACTIVE-ONLY (legacy -- dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($autonomy, hermes-dream-cycle-synth.mjs, daily at $Time, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 60s (LastTaskResult=267009)."
  } else {
    $name = switch ($info.LastTaskResult) {
      0 { 'OK' }
      2 { 'FAIL (synth exited non-zero)' }
      default { 'UNKNOWN' }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (CLI flags to the synth script -- see script header for full list):"
Write-Host "  --root <path>             memos root (default H:/prism/knowledge/memories)"
Write-Host "  --out <path>              output file (default {root}/dreams/<date>.md)"
Write-Host "  --min-jaccard N           similarity threshold (default 0.15)"
Write-Host "  --top-k-keywords N        keywords per memo (default 20)"
Write-Host "  --max-connections N       result cap (default 200)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Read last output:            Get-Content H:/prism/knowledge/memories/dreams/<date>.md"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '`$PSScriptRoot\install-hermes-dream-cycle-task.ps1' -Uninstall"
