param(
  [string]$TaskName = 'PRISM Fleet Task Health',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) so this task does not phase-lock onto the existing
  # 5-min host tasks. Cycle positions already taken (offset mod 300s):
  #   "PRISM Cleanup Orchestrator"      ~+60s
  #   "Memory Pressure Auto-Relief"     ~+120s
  #   "PRISM Fleet Reaper"              +210s (install-fleet-reaper-task.ps1:9)
  #   "PRISM Fleet Memory Monitor"      +330s (= +30s mod 300)
  # Landing this watchdog at +270s sits it in the widest gap (60s after the
  # reaper sweep, 60s before the memory monitor) so its PowerShell
  # Get-ScheduledTask enumeration never contends with another task's CIM read.
  [int]$StartOffsetSeconds = 270,
  # Burn-in: bake --dry-run so the audit classifies + reports but never writes
  # telemetry / emits AGENT_CHAT. Use for 1-2 cycles to confirm sampling, then
  # reinstall without -DryRun.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy: register with NO principal -> Logon Mode "Interactive only" (task
  # dies at logoff). Also the ONLY mode that needs no admin rights -- use it
  # when you cannot open an elevated shell (the watchdog reads-only, so an
  # interactive current-user task is functionally sufficient on a box where the
  # fleet only runs while you are logged on).
  [switch]$Interactive,
  # Strongest principal: run as SYSTEM (LogonType ServiceAccount). SYSTEM can
  # enumerate scheduled tasks registered by ANY user; S4U sees the installing
  # user's. The watchdog reads + advises but never kills/registers, so S4U is
  # sufficient -- SYSTEM is opt-in.
  [switch]$AsSystem
)

# install-fleet-task-health-task.ps1 -- durable backbone for the
# watchdog-over-the-watchdogs (scripts/fleet-task-health-watch.mjs).
#
# THE GAP THIS CLOSES. PRISM's crash-prevention safety net is a set of Windows
# scheduled tasks (PRISM Fleet Reaper, PRISM Fleet Memory Monitor, cleanup /
# orphan reapers, dev-cadence tasks). Each runs unattended -- but nothing
# durably watches whether THOSE tasks are themselves Enabled / firing /
# non-erroring. The fleet-task-health-watch.mjs Stop hook
# (.claude/hooks/fleet-task-health-stop.mjs) gives near-continuous coverage
# while chats are open, and is the PRIMARY layer. THIS scheduled task is the
# belt-and-suspenders add-on: it keeps auditing on a 5-min timer even when no
# chat is open (e.g. overnight), closing the only window the Stop hook cannot
# cover. It is NOT a substitute for the Stop hook -- it is defense-in-depth.
#
# Why separate from the reaper / memory-monitor tasks: they answer different
# questions.
#   * fleet-reaper-sweep.mjs       "which orphan processes of CRASHED slots
#                                   should I kill?"        -- destructive
#   * fleet-memory-monitor.mjs     "which LIVE chat tree is largest / is the
#                                   box under memory pressure?" -- advisory
#   * fleet-task-health-watch.mjs  "are the SAFETY-NET tasks themselves
#                                   registered, enabled, and firing?" -- advisory
#
# The watchdog NEVER kills a process and NEVER REGISTERS a task, and only ever
# Enable-ScheduledTask (never Disable). It DOES self-heal one narrow case: its
# G10 guard re-ENABLES a DISABLED crash-critical task (CRASH_CRITICAL_TASKS in
# the watch script) via Enable-ScheduledTask. It fires for any task that is
# (a) Disabled, (b) crash-critical, and (c) NOT in the watch script's
# EXPECTED_DISABLED_TASKS allowlist -- and is entirely off when
# PRISM_FTH_AUTO_REENABLE_DISABLE=1 or in -DryRun. NOTE: a migration freeze does
# NOT suppress this path -- a crash-critical task is load-bearing, so the watch
# deliberately re-enables it even mid-freeze (a prior freeze gate was removed
# after it neutered the guard for weeks). To keep a crash-critical task disabled
# on purpose, add it to EXPECTED_DISABLED_TASKS or set the knob. So the LIVE
# task is advisory + self-heal, NOT purely advisory -- install with -DryRun or
# set that knob for a detect-and-advise-only watchdog.
# It interprets a monitored task's OWN exit 1/2/3 as that task's FINDINGS
# (warn/critical/measurement-fail), not as a task-health failure -- so this
# installer's RunNow reporting below treats exit 1/2 from the watchdog as a
# fleet FINDING to surface, not a failure of this watchdog task itself.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS a task; it can be
# Disable-ScheduledTask'd to pause without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
# Only the S4U / SYSTEM (run-whether-logged-on) principals need admin to
# register. The -Interactive current-user fallback does not -- so only throw
# when the caller is asking for a hardened principal without elevation.
if (-not $isAdmin -and -not $Interactive) {
  throw "Run from an ELEVATED PowerShell to register '$TaskName' with the autonomous S4U/SYSTEM principal, OR re-run with -Interactive to register a current-user task that needs no admin (it runs only while you are logged on; sufficient because the watchdog reads-only and the fleet runs only while you are logged on)."
}

# Always target the canonical main tree, never a worktree (a worktree's
# scripts/ can be removed; the host-level task must not dangle).
$watchScript = 'H:\PRISM\scripts\fleet-task-health-watch.mjs'

# Prefer the portable node; fall back to PATH then Program Files. Mirrors
# install-fleet-memory-monitor-task.ps1:67-71 -- keep in sync.
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

if (-not (Test-Path $watchScript)) {
  throw "Fleet-task-health watch script not found: $watchScript (run on the PRISM host with H:\PRISM present, and ensure scripts/fleet-task-health-watch.mjs is committed)."
}

# Sanity: confirm the script is the one we expect and understands --once.
# A future refactor that renames --once would break the task silently
# (Get-ScheduledTaskInfo would show success while the audit no-op'd).
$head = Get-Content $watchScript -TotalCount 90 -ErrorAction SilentlyContinue
if (-not (($head -match 'fleet-task-health') -and ($head -match '--once'))) {
  throw "Refusing to install: $watchScript does not look like fleet-task-health-watch.mjs (missing header / --once flag)."
}

$auditArgs = if ($DryRun) { "`"$watchScript`" --once --dry-run" } else { "`"$watchScript`" --once" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $auditArgs

# Two triggers: the every-$EveryMinutes poll + a resume-on-boot trigger so the
# audit cadence restarts after a reboot. AtStartup needs the run-whether-logged-on
# principal; the -Interactive current-user fallback uses AtLogOn instead (the
# task can only run once a session exists anyway).
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$bootTrigger = if ($Interactive) { New-ScheduledTaskTrigger -AtLogOn } else { New-ScheduledTaskTrigger -AtStartup }
$trigger = @($pollTrigger, $bootTrigger)

# ExecutionTimeLimit 180s: the common audit is one PowerShell Get-ScheduledTask
# enumeration + a Get-ScheduledTaskInfo per PRISM task + JSON (the script's own
# PS query timeout is 15s, so a 76-task read is ~15s). The worst case adds the
# G10 auto-re-enable fan-out: one serial powershell.exe per disabled
# crash-critical task, each capped at PS_TIMEOUT_MS (15s). With 7
# CRASH_CRITICAL_TASKS that is up to ~7x15s = 105s of re-enable spawns on top of
# the ~15s sampler -- so 120s could clip a heal-heavy run. 180s covers
# sampler + full re-enable fan-out + node startup with margin. MultipleInstances
# IgnoreNew so a slow audit never piles on; RestartCount/Interval self-heals a crash.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 180) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
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

$desc = "Watchdog over the PRISM crash-prevention scheduled tasks (fleet-task-health-watch.mjs --once$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Each run enumerates every 'PRISM *' scheduled task via Get-ScheduledTask/Get-ScheduledTaskInfo, classifies healthy|disabled|failing|stale|never-ran against each task's OWN trigger interval, and on warn/critical emits ONE cooldowned AGENT_CHAT advisory naming the degraded task(s) + the exact re-install command. Never kills a process or registers a task (only ever Enable-ScheduledTask, never Disable); DOES self-heal by re-enabling a disabled crash-critical task NOT in EXPECTED_DISABLED_TASKS (G10 -- fires even during a migration freeze, since a crash-critical task is load-bearing; set PRISM_FTH_AUTO_REENABLE_DISABLE=1 or use -DryRun for detect-and-advise-only). Belt-and-suspenders to the fleet-task-health-stop.mjs Stop hook: keeps auditing on a 5-min timer even when no chat is open. Runs whether-logged-on (S4U) + at boot."

# Splat so -Principal is omitted entirely in legacy -Interactive mode
# (passing -Principal `$null throws; an absent key is the correct form).
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

$mode = if ($DryRun) { 'DRY-RUN burn-in (no telemetry/advisory writes)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy -- dies when you log off; needs no admin)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, fleet-task-health-watch.mjs --once, every $EveryMinutes min + boot, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # An audit takes ~5-20s; LastTaskResult reads 267009 (0x41301) while running.
  # Poll past that instead of reporting the misleading code.
  $deadline = (Get-Date).AddSeconds(90)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 90s (LastTaskResult=267009)."
  } else {
    # The watchdog's exit code is a FLEET FINDING, not a task failure:
    #   0 clean, 1 warn (a task degraded), 2 critical (must-exist task down /
    #   >=2 crash-critical degraded), 3 measurement/IO failure (R12).
    $name = switch ($info.LastTaskResult) {
      0 { 'CLEAN (all safety-net tasks healthy)' }
      1 { 'WARN (a task is degraded -- see AGENT_CHAT advisory)' }
      2 { 'CRITICAL (a must-exist task is down -- see AGENT_CHAT advisory)' }
      3 { 'MEASUREMENT-FAIL (the audit itself could not read task state)' }
      default { 'UNKNOWN' }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the watchdog -- full list in the watch script header):"
Write-Host "  PRISM_FLEET_TASKHEALTH_DISABLE=1                     watchdog refuses to write/emit"
Write-Host "  PRISM_FLEET_TASKHEALTH_STALE_MULT=N                  stale = trigger interval x N (default 3)"
Write-Host "  PRISM_FLEET_TASKHEALTH_ADVISORY_COOLDOWN_SEC=N       min seconds between AGENT_CHAT emits (default 900)"
Write-Host "  PRISM_FLEET_TASKHEALTH_PS_TIMEOUT_MS=N               PowerShell query timeout (default 15000)"
Write-Host "  PRISM_FTH_AUTO_REENABLE_DISABLE=1                    detect-and-advise-only (NO G10 self-heal re-enable of disabled crash-critical tasks)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Watch telemetry:             Get-Content H:/PRISM/state/shared/fleet-task-health-history.jsonl -Tail 20 -Wait"
Write-Host "Read last audit:             & '$nodeExe' '$watchScript' --status"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-fleet-task-health-task.ps1' -Uninstall"
