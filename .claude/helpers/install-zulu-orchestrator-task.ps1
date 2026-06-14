param(
  [string]$TaskName = 'PRISM Zebra Orchestrator',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) for the trigger anchor. Existing 5-min host tasks:
  #   Cleanup Orchestrator     ~+60s
  #   Memory Pressure Relief   ~+120s
  #   Fleet Reaper             ~+210s
  #   Fleet Memory Monitor     ~+330s
  # +420s lands zebra in its own slot of the 5-min cycle so no two PowerShell-
  # forking tasks pile onto the same minute.
  [int]$StartOffsetSeconds = 420,
  # Burn-in: bakes --dry-run into the task. Sweep classifies + decides but
  # never actually SendKeys. Watch state/shared/zebra-orchestrator-log.jsonl
  # to confirm correct decisions/HWND resolution, then reinstall without -DryRun.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy: register with NO principal -> "Interactive only" (dies when user
  # logs off). Default (this switch OFF) hardens task to whether-logged-on.
  [switch]$Interactive,
  # Conservative --run as SYSTEM. The orchestrator does NOT need kill privilege
  # (it only reads + SendKeys), but SYSTEM is safer for cross-context HWND
  # resolution + window foregrounding when a target chat runs elevated.
  [switch]$AsSystem
)

# install-zebra-orchestrator-task.ps1 --durable backbone for the chat-fleet
# orchestrator (U-ZEBRA03).
#
# Registers a Windows Scheduled Task that runs zebra-orchestrator-sweep.mjs
# --once every $EveryMinutes minutes, independent of any Claude Code session.
# This is the autonomous-firing layer that makes zebra useful: chat slots
# that have opted in (slots[name].zebraOptIn=true) receive a /clear or
# /compact + /checkin-<slot> directive when CHO01 decides one is warranted.
#
# Per memory feedback_never_delete_only_disable.md: REGISTERS a task; can be
# Disable-ScheduledTask'd to pause without removing. -Uninstall removes.
#
# Kill switch cascade (all read by the sweep, no installer change needed):
#   PRISM_ZEBRA_DISABLE=1       sweep refuses to plan any action
#   PRISM_ZEBRA_DRY_RUN=1       every plan downgrades to dry-run
#   PRISM_SENDKEYS_DISABLE=1    PS script self-aborts (PreToolUse-style)
#
# Safety: zebra+golf slots are SELF-EXEMPT in the sweep --the orchestrator
# never plans against the orchestrator itself OR the golf hygiene slot. The
# 24h opt-in grace window forces dry-run for newly-opted-in slots regardless
# of installer mode.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
# U-ZM1-04: only the principal-using paths (S4U or SYSTEM, both with RunLevel
# Highest) need admin. -Interactive registers a current-user / no-principal
# task -- which Register-ScheduledTask permits WITHOUT elevation -- so zebra
# can be armed fully autonomously with no UAC prompt. The interactive task
# runs only while the user is logged on, which matches the PRISM fleet's
# interactive lifecycle (the chats themselves are in interactive WT windows).
$needsAdmin = -not $Interactive
if ($needsAdmin -and (-not $isAdmin)) {
  throw "Run from an ELEVATED PowerShell -- registering '$TaskName' with the default S4U/Highest principal (or -AsSystem) needs admin. Pass -Interactive for a non-elevated install (task runs only while you are logged on)."
}

# The scheduled task always targets the canonical main tree, never a worktree
# (worktree scripts/ can be removed; the host-level task must not dangle).
$sweepScript = 'H:\PRISM\scripts\zebra-orchestrator-sweep.mjs'

# Portable node first, fallbacks after.
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

if (-not (Test-Path $sweepScript)) {
  throw "Zebra sweep script not found: $sweepScript (ensure scripts/zebra-orchestrator-sweep.mjs is committed)."
}

# Sanity: confirm we're targeting the zebra sweep, not a sibling script.
$head = Get-Content $sweepScript -TotalCount 30 -ErrorAction SilentlyContinue
if (-not (($head -match 'ZEBRA-ORCHESTRATOR-MS0') -and ($head -match '--once'))) {
  throw "Refusing to install: $sweepScript does not look like zebra-orchestrator-sweep.mjs (missing ZEBRA-ORCHESTRATOR-MS0 header / --once flag)."
}

$sweepArgs = if ($DryRun) { "`"$sweepScript`" --once --dry-run --json" } else { "`"$sweepScript`" --once --json" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $sweepArgs

# Two triggers: every-$EveryMinutes poll + AtStartup so a reboot resumes zebra
# without waiting for -StartWhenAvailable's missed-Once detection.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
# U-ZM1-04: -AtStartup is a system-level trigger and Register-ScheduledTask
# can reject it under a current-user principal without elevation. In
# -Interactive mode we keep only the poll trigger -- on reboot the user logs
# in and the next poll fires within $EveryMinutes minutes. The elevated paths
# (default S4U / -AsSystem) keep AtStartup so the task resumes immediately
# at boot.
if ($Interactive) {
  $trigger = @($pollTrigger)
} else {
  $startupTrigger = New-ScheduledTaskTrigger -AtStartup
  $trigger = @($pollTrigger, $startupTrigger)
}

# ExecutionTimeLimit 3 min: worst case is ~12 slots x (PS HWND resolve + 2x SendKeys
# + stagger) ~60-90s. 3 min generous ceiling. IgnoreNew prevents pile-up.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 3) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal:
#   DEFAULT  = S4U as current user. Zebra does not need to kill processes; it
#              reads chat-slots, spawns PowerShell for SendKeys, and writes a
#              JSONL log. S4U is sufficient and matches the lowest-privilege
#              principle.
#   -AsSystem = NT AUTHORITY\SYSTEM. Useful when target chats run elevated and
#              SetForegroundWindow needs the privilege boost.
#   -Interactive = legacy (no principal, dies on logoff).
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

$desc = "ZEBRA-ORCHESTRATOR-MS0 chat-fleet orchestrator (zebra-orchestrator-sweep.mjs --once$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Per opt-in slot: reads pressure via CHO02, decides /clear or /compact via CHO01, SendKeys the directive plus a /checkin-<slot> backend-dev priority payload via U-CHO04. Self-exempts zebra+golf slots; 24h dry-run grace for new opt-ins; cascade kill switches PRISM_ZEBRA_DISABLE / PRISM_ZEBRA_DRY_RUN / PRISM_SENDKEYS_DISABLE."

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

$mode = if ($DryRun) { 'DRY-RUN burn-in (logs decisions only --never SendKeys)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy --dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (admin --can target elevated windows; runs at boot + whether-logged-on)'
} else {
  'AUTONOMOUS as S4U / current user (runs at boot + whether-logged-on; cannot foreground-attach to elevated windows)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, zebra-orchestrator-sweep.mjs --once, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # 267009 = "task is currently running"; poll past it.
  $deadline = (Get-Date).AddSeconds(120)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run --still running after 120s (LastTaskResult=267009). Check state/shared/zebra-orchestrator-log.jsonl."
  } else {
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the sweep):"
Write-Host "  PRISM_ZEBRA_DISABLE=1         sweep refuses to plan any action"
Write-Host "  PRISM_ZEBRA_DRY_RUN=1         every plan downgrades to dry-run"
Write-Host "  PRISM_SENDKEYS_DISABLE=1      PS script self-aborts"
Write-Host "  PRISM_ZEBRA_STAGGER_MS=N      stagger between SendKeys lines (clamp >=5000)"
Write-Host "  PRISM_ZEBRA_LOG=<path>        override log file path"
Write-Host ""
Write-Host "Slot opt-in (per-slot, default OFF --edit state/shared/chat-slots.json):"
Write-Host "  slots[<name>].zebraOptIn = true"
Write-Host "  slots[<name>].zebraOptInAt = '<ISO-8601 timestamp>'   # 24h dry-run grace from this time"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Watch zebra activity:        Get-Content H:/PRISM/state/shared/zebra-orchestrator-log.jsonl -Tail 20 -Wait"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-zebra-orchestrator-task.ps1' -Uninstall"
