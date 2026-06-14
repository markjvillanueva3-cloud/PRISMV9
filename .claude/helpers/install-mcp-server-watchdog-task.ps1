param(
  [string]$TaskName = 'PRISM MCP Server Watchdog',
  [int]$EveryMinutes = 5,
  # Phase offset so this task doesn't fire at the same wall-clock minute as
  # the supervisor (AtStartup+AtLogon only) / fleet-reaper (+210s) / memory
  # monitor (+330s). +90s lands between them on the 5-min cycle.
  [int]$StartOffsetSeconds = 90,
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser,
  [switch]$AsSystem
)

# install-mcp-server-watchdog-task.ps1 - periodic MCP wedge detector + escalator.
#
# Closes the gap surfaced 2026-05-19: the MCP server can wedge mid-life
# (port bound, listener accepting connections, but app-layer unresponsive).
# The supervisor task only fires AtStartup + AtLogon, so a mid-day wedge
# stays invisible until reboot. This watchdog fires every $EveryMinutes
# minutes, probes /health, and after $FAIL_THRESHOLD consecutive failures
# kills the wedged listener PID and re-spawns the supervisor.
#
# Companion to install-mcp-server-task.ps1 - installs SEPARATELY (so a kill
# switch on either is isolated). Both can be uninstalled independently.
#
# Per memory feedback_never_delete_only_disable.md: registers; can be
# Disable-ScheduledTask'd. -Uninstall to remove.
#
# Mirrors install-mcp-server-task.ps1 / install-fleet-reaper-task.ps1
# pattern (SYSTEM principal default, AtStartup secondary trigger,
# RestartCount/Interval recovery).

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path. Watchdog must live in H:/prism (not a slot
# worktree) so the scheduled task can resolve it regardless of which slot
# the current human is in. The slot/hotel branch carries the source-of-truth
# version; H:/prism gets it once golf integrates.
$watchdogScript = 'H:\PRISM\scripts\mcp-server-watchdog.mjs'

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

if (-not (Test-Path $watchdogScript)) {
  throw "Watchdog script not found: $watchdogScript (run on the PRISM host with H:\PRISM present, and ensure scripts/mcp-server-watchdog.mjs is committed AND copied to H:\PRISM\scripts\ - the slot/hotel branch carries the source-of-truth)."
}

# Sanity: confirm the script is the watchdog.
$head = Get-Content $watchdogScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'mcp-server-watchdog') -and ($head -match 'FAIL_THRESHOLD'))) {
  throw "Refusing to install: $watchdogScript does not look like mcp-server-watchdog.mjs (missing header markers)."
}

$watchdogArgs = if ($DryRun) { "`"$watchdogScript`" --dry-run" } else { "`"$watchdogScript`"" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $watchdogArgs

# Triggers: every $EveryMinutes minutes (anchored +$StartOffsetSeconds off
# install) + AtStartup (boot resilience - if a peer killed the supervisor
# task too, the watchdog will still fire on boot and force a respawn).
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 2 min: a worst-case probe + kill + supervisor-spawn is
# ~30s; 2 min ceiling. MultipleInstances IgnoreNew so a slow probe never
# piles a second instance on itself. RestartCount/Interval self-heals a
# watchdog that crashes abnormally (host OOM, etc).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

$principal = $null
if (-not $Interactive) {
  if ($AsCurrentUser) {
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
      -LogonType S4U -RunLevel Highest
  } else {
    $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' `
      -LogonType ServiceAccount -RunLevel Highest
  }
}

$desc = "Periodic MCP server wedge detector - probes http://127.0.0.1:3100/health every $EveryMinutes min. After 2 consecutive failures (default ~10 min of confirmed wedge), kills the wedged listener PID and spawns the supervisor to respawn. Closes the gap where the supervisor's AtStartup+AtLogon triggers miss mid-life wedges. Companion to 'PRISM MCP Server' task."

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

$mode = if ($DryRun) { 'DRY-RUN (probe + decide, never kill/spawn)' } else { 'live (kill + respawn on confirmed wedge)' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy)'
} elseif ($AsCurrentUser) {
  'AUTONOMOUS as S4U / current user'
} else {
  'AUTONOMOUS as SYSTEM (no UAC, no window)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, mcp-server-watchdog.mjs, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "Knobs (env, read by the watchdog):"
Write-Host "  PRISM_MCP_WATCHDOG_DISABLE=1        watchdog exits 0 immediately (kill switch)"
Write-Host "  PRISM_MCP_WATCHDOG_TIMEOUT_MS=N     /health probe timeout (default 10000)"
Write-Host "  PRISM_MCP_WATCHDOG_FAIL_THRESHOLD=N consecutive fails before escalation (default 2; min 2)"
Write-Host "  PRISM_MCP_WATCHDOG_DRY_RUN=1        probe + decide, never kill/spawn (burn-in)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Watch watchdog activity:     Get-Content H:/PRISM/mcp-server/logs/watchdog.log -Tail 20 -Wait"
Write-Host "Inspect state:               Get-Content H:/PRISM/mcp-server/data/state/watchdog-state.json"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-mcp-server-watchdog-task.ps1' -Uninstall"
