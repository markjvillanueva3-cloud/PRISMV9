param(
  [string]$TaskName = 'PRISM Index Daemon',
  [int]$HeapMB = 2048,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser
)

# install-index-daemon-task.ps1 - durable autostart for the PRISM master-index
# search daemon (FLEET-SEARCH-DAEMON-MS0, scripts/master-index-daemon.mjs).
#
# The daemon parses the ~262MB full search sidecar ONCE into a warm in-memory
# index and serves fast full-coverage keyword search over http://127.0.0.1:3101,
# so per-spawn hooks never re-parse a giant index (the sidecar is rejected by the
# 384MB per-hook heap cap -> every fleet search silently degrades to the 59MB
# architecture-graph). On a 127GB Blackwell box a warm 262MB index is trivial.
#
# Why a REPEATING task (not a long-running supervisor loop): the daemon is the
# long-lived process itself, and it has a single-instance preflight (binds :3101;
# on EADDRINUSE it exits 0). So a task that re-launches it every 5 min is a safe
# no-op while one is alive, and refills the gap within 5 min of a death. Simpler
# than a separate supervisor file. Mirrors install-mcp-server-task.ps1.
#
# Per [[feedback_never_delete_only_disable]]: REGISTER + UNREGISTER supported;
# intermediate pause is Disable-ScheduledTask (not -Uninstall).

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path - never a worktree (the task must not dangle).
$daemonScript = 'H:\PRISM\scripts\master-index-daemon.mjs'

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

if (-not (Test-Path $daemonScript)) {
  throw "Daemon script not found: $daemonScript (run on the PRISM host with H:\PRISM present, scripts/master-index-daemon.mjs committed)."
}

# Sanity: confirm the script is the index daemon (defensive against a typo
# pointing the task at the wrong file).
$head = Get-Content $daemonScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'master-index-daemon') -and ($head -match 'PRISM_INDEX_DAEMON_PORT'))) {
  throw "Refusing to install: $daemonScript does not look like master-index-daemon.mjs (missing header markers). Ensure it is the committed version (HEAD)."
}

# Generous heap so the daemon can parse the ~262MB sidecar (the gap is utilization,
# not capacity - Blackwell box). The daemon raises PRISM_SIDECAR_MAX_BYTES itself.
$daemonArgs = "--max-old-space-size=$HeapMB `"$daemonScript`""
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $daemonArgs

# AtStartup + AtLogon (boot/login resilience) + a 5-min repetition (refills the
# gap within 5 min of a daemon death; the daemon's :3101 single-instance preflight
# makes a re-launch a safe no-op whenever one is alive). +90s phase offset so it
# does not pile onto the MCP server / reaper boot bursts.
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$repeatTrigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddSeconds(90)) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
$trigger = @($startupTrigger, $logonTrigger, $repeatTrigger)

# ExecutionTimeLimit 0 = run indefinitely (the daemon is long-lived).
# MultipleInstances IgnoreNew so the triggers cannot double-start (the daemon's
# port preflight also guards this; defense-in-depth is cheap).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal - SYSTEM default (runs whether-logged-on-or-not, no UAC, survives
# logoff). -AsCurrentUser is the conservative S4U alternative. The daemon listens
# only on 127.0.0.1:3101 (no inbound network exposure).
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

$desc = "Long-running PRISM master-index search daemon at 127.0.0.1:3101 (master-index-daemon.mjs). Parses the ~262MB system-graph-index.json sidecar once into a warm in-memory index and serves fast full-coverage keyword search; per-spawn hooks query it (searchViaDaemon) instead of re-parsing a giant index, and fall back to the in-process 59MB graph when it is down. Single-instance via :3101 port preflight. Mirrors install-mcp-server-task.ps1."

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
  'INTERACTIVE-ONLY (legacy - dies when you log off)'
} elseif ($AsCurrentUser) {
  'AUTONOMOUS as S4U / current user'
} else {
  'AUTONOMOUS as SYSTEM (no UAC, no window)'
}
Write-Host "Registered: $TaskName ($autonomy, master-index-daemon.mjs, heap=${HeapMB}MB, AtStartup+AtLogon+5min-repeat, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 4
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult). Verify: curl http://127.0.0.1:3101/health"
}

Write-Host ""
Write-Host "Knobs (env, read by the daemon): PRISM_INDEX_DAEMON_PORT (3101), PRISM_INDEX_DAEMON_HOST (127.0.0.1), PRISM_SIDECAR_MAX_BYTES (1GB)."
Write-Host "Uninstall: -Uninstall   Pause: Disable-ScheduledTask -TaskName '$TaskName'"
