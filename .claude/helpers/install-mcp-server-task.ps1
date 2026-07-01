param(
  [string]$TaskName = 'PRISM MCP Server',
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser,
  [switch]$AsSystem
)

# install-mcp-server-task.ps1 - durable autostart for the PRISM HTTP MCP server.
#
# Registers a Windows Scheduled Task that runs `mcp-server-supervisor.mjs`
# at boot and at every user logon, so the MCP server at 127.0.0.1:3100 is
# already listening before any Claude Code chat opens. This closes the
# "red X at session start" half of the MCP-dropping symptom - the bridge's
# in-process retry + health-gate close the transient half.
#
# Why long-running (not poll-every-N-min like the reaper): the supervisor
# itself loops forever (spawn -> wait child exit -> backoff -> respawn) so the
# scheduled task only needs to LAUNCH it once per boot/logon, then it stays
# resident. No RepetitionInterval. ExecutionTimeLimit 0 = run indefinitely.
#
# Idempotency: the supervisor's FIRST act is GET /health. If a server is
# already responding, it logs `already running` and exits 0 - so a manual
# `npm start` is never double-bound by the supervisor.
#
# Per [[feedback_never_delete_only_disable]]: REGISTER + UNREGISTER are
# supported; intermediate pause is `Disable-ScheduledTask` (no -Uninstall).
#
# Mirrors install-fleet-reaper-task.ps1 (see that file for the canonical
# explanation of SYSTEM-vs-S4U-vs-Interactive principal choices).

$ErrorActionPreference = 'Stop'

# Elevated PowerShell required to (un)register tasks in the root \ folder.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path - never a worktree (the task must not dangle).
$supervisorScript = 'H:\PRISM\scripts\mcp-server-supervisor.mjs'

# Portable node preferred; fall back to PATH / Program Files.
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

if (-not (Test-Path $supervisorScript)) {
  throw "Supervisor script not found: $supervisorScript (run on the PRISM host with H:\PRISM present, and ensure scripts/mcp-server-supervisor.mjs is committed)."
}

# Sanity: confirm the script is the MCP supervisor (defensive against typo
# pointing the task at the wrong file).
$head = Get-Content $supervisorScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'mcp-server-supervisor') -and ($head -match 'SERVER_ENTRY'))) {
  throw "Refusing to install: $supervisorScript does not look like mcp-server-supervisor.mjs (missing header markers). Ensure it is the committed version (HEAD)."
}

# --dry-run baked into the task = supervisor probes /health, exits without
# spawning. Useful for verifying the task wiring without affecting a running
# server.
$supervisorArgs = if ($DryRun) { "`"$supervisorScript`" --dry-run" } else { "`"$supervisorScript`"" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $supervisorArgs

# Triggers: AtStartup (boot resilience) + AtLogon (cold-start after sleep/login,
# in case AtStartup's race conditions with the network stack let the supervisor
# launch too early to bind).
# PLUS a 3-min REPETITION (golf 2026-05-31): the "supervisor is a long-running loop
# so fire-once is enough" assumption FAILS when the loop itself dies (observed:
# this task LastResult=2 since 2026-05-29 with only Boot/Logon triggers => the
# supervisor was never relaunched => :3100 went UNsupervised, recovery fell to the
# slow 5-min watchdog + reactive bridge self-heal). The repetition relaunches the
# supervisor every 3 min; its O_EXCL PID lock makes a re-run a safe no-op whenever
# one is already alive, so this only ever fills a gap, never double-spawns.
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes 3) -RepetitionDuration (New-TimeSpan -Days 3650)
$trigger = @($startupTrigger, $logonTrigger, $repeatTrigger)

# ExecutionTimeLimit 0 = run indefinitely (supervisor loops forever).
# MultipleInstances IgnoreNew so AtStartup + AtLogon firing close together
# doesn't double-start (the supervisor's /health idempotency also guards
# this, but defense-in-depth is cheap).
# RestartCount/Interval handles "supervisor itself crashed" - three quick
# restarts at 1-min intervals before giving up.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal - same logic as fleet-reaper. The MCP server doesn't need to kill
# other processes (so SYSTEM isn't load-bearing for "can it do its job?"), but
# SYSTEM:
#   1. Runs whether-logged-on-or-not - covers the headless / first-boot case.
#   2. Survives a logoff without dying mid-session.
#   3. Has no UAC prompt - clean unattended autostart.
# S4U (-AsCurrentUser) is the conservative alternative if SYSTEM-context server
# is unacceptable on this host (rare; the server listens on 127.0.0.1, no
# inbound network exposure).
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

$desc = "Long-running supervisor for the PRISM HTTP MCP server at 127.0.0.1:3100 (mcp-server-supervisor.mjs). Spawns node mcp-server/dist/index.js with TRANSPORT=http, respawns with exponential backoff on crash, and refuses to start if a server is already responding healthy (probes /health first). Closes the 'red X at session start' half of the MCP-dropping bug. Mirrors fleet-reaper installer."

# Splat so -Principal is omitted (not `$null`) in legacy -Interactive mode.
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

$mode = if ($DryRun) { 'DRY-RUN (probe + exit, never spawns)' } else { 'live (spawn + supervise)' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy - dies when you log off)'
} elseif ($AsCurrentUser) {
  'AUTONOMOUS as S4U / current user (runs at boot + AtLogon)'
} else {
  'AUTONOMOUS as SYSTEM (no UAC, no window; runs at boot + AtLogon)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, mcp-server-supervisor.mjs, AtStartup+AtLogon, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # Supervisor is long-running by design - LastTaskResult will read 267009
  # (= "task running") for the entire server uptime. Just confirm it started.
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run - supervisor is now running (LastTaskResult=267009 / RUNNING). Verify with: curl http://127.0.0.1:3100/health"
  } else {
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) - check H:/PRISM/mcp-server/logs/supervisor.log for details."
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the supervisor - full list in scripts/mcp-server-supervisor.mjs):"
Write-Host "  PRISM_MCP_SUPERVISOR_DISABLE=1   supervisor exits 0 immediately (kill switch)"
Write-Host "  PRISM_MCP_SERVER_PORT=N          override default 3100"
Write-Host "  PRISM_MCP_SERVER_HOST=H          override default 127.0.0.1"
Write-Host "  PRISM_MCP_BACKOFF_INITIAL_MS=N   default 5000 (5s)"
Write-Host "  PRISM_MCP_BACKOFF_MAX_MS=N       default 60000 (60s cap)"
Write-Host ""
Write-Host "Bridge resilience knobs (read by .claude/helpers/mcp-http-bridge.mjs):"
Write-Host "  PRISM_BRIDGE_HEALTH_GATE_DISABLE=1    skip background health-gate at bridge startup"
Write-Host "  PRISM_BRIDGE_MAX_RETRIES=N            per-request transient-error retry cap (default 3, 0 = legacy)"
Write-Host "  PRISM_BRIDGE_LIVENESS_DISABLE=1       disable periodic /health probe"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Server health:               curl -m 2 http://127.0.0.1:3100/health"
Write-Host "Watch supervisor activity:   Get-Content H:/PRISM/mcp-server/logs/supervisor.log -Tail 20 -Wait"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-mcp-server-task.ps1' -Uninstall"
