# install-mcp-monitor-task.ps1 -- register "PRISM MCP Connectivity Monitor"
#
# Scheduled task runs every 5 minutes under the current user (no elevation
# required). Each invocation = one tick of monitor-mcp-and-reaper.mjs --once:
# probes :3100/health, tails fleet-reaper.log, appends one JSONL row to
# H:/prism/state/shared/dashboards/mcp-reaper-monitor.jsonl.
#
# Idempotent -- re-running just refreshes the trigger schedule. Adopt the
# same pattern as PRISM Fleet Reaper + PRISM MCP Server Watchdog.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .claude\helpers\install-mcp-monitor-task.ps1 [-RunNow]
#
# Knobs (env, read by the script):
#   PRISM_MONITOR_DISABLE=1 -- script no-ops (existence preserved)

param([switch]$RunNow)

$ErrorActionPreference = "Stop"
$TaskName = "PRISM MCP Connectivity Monitor"
# Resolve portable-node shim (.cmd on Windows). Falls back to a system node.
$NodeExe = $null
foreach ($candidate in @("H:\.claude\bin\portable-node.cmd", "H:\.claude\bin\node.cmd", "H:\.claude\bin\node.exe")) {
  if (Test-Path $candidate) { $NodeExe = $candidate; break }
}
if (-not $NodeExe) { throw "portable-node / node not found under H:\.claude\bin\" }
$Wrapper = "H:\prism\scripts\monitor-mcp-and-reaper.bat"
if (-not (Test-Path $Wrapper)) { throw "wrapper bat missing at $Wrapper" }

# Action: single-line .bat wrapper. Avoids Task Scheduler's argument-
# quoting hell with cmd.exe /c; the .bat handles cd + portable-node + script
# in one process. LastResult=1 with no JSONL row was the symptom of the
# direct cmd.exe /c path.
$action = New-ScheduledTaskAction -Execute $Wrapper -WorkingDirectory "H:\prism"

# Trigger: every 5 minutes, indefinitely, starting 1 minute from now to avoid
# clashing with the initial install.
$start = (Get-Date).AddMinutes(1)
$trigger = New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Minutes 5)

# Settings: don't allow concurrent instances; let it run when battery (laptop OK).
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 2)

# Principal: current user, run only when logged on (no elevation).
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Register (replaces any existing).
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
  Write-Host "$TaskName : updated"
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Probes :3100/health every 5 min and tails fleet-reaper.log; appends JSONL row to state/shared/dashboards/mcp-reaper-monitor.jsonl." | Out-Null
  Write-Host "$TaskName : installed"
}

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "$TaskName : first run kicked"
}
