param(
  [string]$TaskName = 'PRISM MCP Priority Guardian',
  [int]$EveryMinutes = 1,
  # Phase offset so this task doesn't land on the same wall-clock minute as
  # the supervisor / watchdog (+90s) / fleet-reaper (+210s) / memory monitor
  # (+330s). +150s lands clear of them.
  [int]$StartOffsetSeconds = 150,
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$AsSystem
)

# install-mcp-priority-guardian-task.ps1 - registers the MCP Priority Guardian.
#
# Closes the live-2026-06-03 root cause of the recurring "MCP DISCONNECTED"
# drop: CPU event-loop starvation + priority inversion (ollama llama-server
# runners respawn AboveNormal and preempt the Normal-priority MCP server under
# 200+ /loop fleet load). The guardian (scripts/mcp-priority-guardian.ps1)
# demotes ollama RUNNERS->Normal and raises the MCP :3100 listener->AboveNormal
# every minute. Supersedes the DISABLED ollama-cpu-throttle.ps1 task (which
# wrongly throttled `ollama.exe` serve, slowing model loads). Old task kept
# disabled-not-deleted per feedback_never_delete_only_disable.
#
# Default principal = CURRENT USER (S4U, Highest) - matches the PRISM Ollama
# Serve task and does NOT require an elevated shell to register the user's own
# task. Pass -AsSystem for a SYSTEM-principal install (requires elevation).
#
# Disable without uninstalling: Disable-ScheduledTask -TaskName '<name>'.
# -Uninstall removes it.

$ErrorActionPreference = 'Stop'

$guardianScript = 'H:\PRISM\scripts\mcp-priority-guardian.ps1'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered task: $TaskName"
  } else {
    Write-Host "Task not found (already uninstalled): $TaskName"
  }
  return
}

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if ($AsSystem -and -not $isAdmin) {
  throw "-AsSystem needs an ELEVATED PowerShell. Re-run elevated, or drop -AsSystem to register as the current user (S4U)."
}

if (-not (Test-Path $guardianScript)) {
  throw "Guardian script not found: $guardianScript"
}
# Sanity: confirm the script is the guardian (header markers).
$head = Get-Content $guardianScript -TotalCount 5 -ErrorAction SilentlyContinue
# Markers reflect REAL guardian content (the disable knob it implements) — not a
# borrowed convention. Both live in the header (lines 1-2).
if (-not (($head -match 'mcp-priority-guardian') -and ($head -match 'PRISM_MCP_GUARDIAN_DISABLE'))) {
  throw "Refusing to install: $guardianScript does not look like mcp-priority-guardian.ps1 (missing header markers)."
}

$psExe = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source
if (-not $psExe) { $psExe = 'powershell.exe' }
$guardianArgs = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$guardianScript`""
$action = New-ScheduledTaskAction -Execute $psExe -Argument $guardianArgs

# Triggers: every $EveryMinutes minute(s) (anchored +$StartOffsetSeconds off
# install) + AtStartup (so the floor is re-asserted after a reboot).
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 1 min: the guardian completes in <2s; 1 min ceiling.
# MultipleInstances IgnoreNew so a slow run never piles a 2nd on itself.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
} else {
  # Authoritative DOMAIN\user (correct for MSA / non-domain logins where
  # $env:USERDOMAIN\$env:USERNAME can drift from the real logon SID name).
  $me = ([Security.Principal.WindowsIdentity]::GetCurrent()).Name
  $principal = New-ScheduledTaskPrincipal -UserId $me -LogonType S4U -RunLevel Highest
}

$desc = "MCP Priority Guardian - every $EveryMinutes min, demotes ollama llama-server runners->Normal and raises the MCP :3100 listener->AboveNormal so MCP's event loop is never starved by ollama inference or the 200+ /loop fleet. Supersedes the disabled 'PRISM Ollama CPU Throttle'. Knobs: PRISM_MCP_GUARDIAN_DISABLE / PRISM_MCP_AFFINITY_MASK / PRISM_OLLAMA_RUNNER_MASK / PRISM_MCP_PRIORITY_CLASS."

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description $desc -Force | Out-Null

$who = if ($AsSystem) { 'SYSTEM' } else { "S4U/$env:USERNAME" }
Write-Host "Registered: $TaskName (every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s offset, principal=$who)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult)"
}

Write-Host ""
Write-Host "Verify:    schtasks /Query /TN '$TaskName'"
Write-Host "Activity:  Get-Content H:/PRISM/mcp-server/logs/priority-guardian.log -Tail 20 -Wait"
Write-Host "Pause:     Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall: & '$PSScriptRoot\install-mcp-priority-guardian-task.ps1' -Uninstall"
