param(
  [string]$TaskName = 'PRISM Hermes Proxy',
  [int]$EveryMinutes = 5,
  # Phase offset (seconds) off install so this keepalive does not phase-lock onto
  # the other 5-min host tasks (Cleanup Orchestrator +60s, Fleet Reaper +210s,
  # Memory Pressure +60s). +150s lands it clear of those.
  [int]$StartOffsetSeconds = 150,
  [ValidateSet('xai','nous')]
  [string]$Provider = 'xai',
  [int]$Port = 8645,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-hermes-proxy-task.ps1 -- durable keepalive for the Hermes OpenAI proxy.
#
# Registers a Windows Scheduled Task that runs hermes-proxy-ensure.mjs every
# $EveryMinutes minutes. The ensure script is idempotent: it probes :$Port/v1 and
# starts `hermes proxy start --provider $Provider` (detached) only if it is down.
# This keeps the Hermes path of scripts/ask-hermes.mjs reliably live without a
# manual start; if the proxy is up, the task is a fast no-op.
#
# Principal: S4U / CURRENT USER (whether-logged-on-or-not), NOT SYSTEM. The proxy
# reads the user-scoped Hermes OAuth credentials under
# C:\Users\<you>\AppData\Local\hermes -- a SYSTEM-context proxy would not see them.
#
# Per feedback_never_delete_only_disable: this REGISTERS a task; Disable-ScheduledTask
# pauses it without removing. Use -Uninstall to remove.

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
$ensureScript = 'H:\PRISM\scripts\hermes-proxy-ensure.mjs'
if (-not (Test-Path $ensureScript)) {
  throw "Ensure script not found: $ensureScript (run on the PRISM host; ensure scripts/hermes-proxy-ensure.mjs is committed)."
}

# Sanity: confirm it is the keepalive script (header marker + the --provider flag).
$head = Get-Content $ensureScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'hermes-proxy-ensure') -and ($head -match 'proxy'))) {
  throw "Refusing to install: $ensureScript does not look like hermes-proxy-ensure.mjs."
}

$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

$ensureArgs = "`"$ensureScript`" --provider $Provider --port $Port --json"
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $ensureArgs

$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 5 min: a cold start probes up to ~30s; 5 min is a generous
# ceiling. IgnoreNew so a slow start never stacks a second instance. Self-heal on
# abnormal exit.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# S4U / current user -- the proxy needs the user's Hermes OAuth creds.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType S4U -RunLevel Highest

$desc = "Keepalive for the Hermes OpenAI proxy (hermes-proxy-ensure.mjs, provider=$Provider, port=$Port). Idempotently probes :$Port/v1 and starts the proxy detached only if down, so scripts/ask-hermes.mjs has a live Hermes path. Runs as the current user (user-scoped OAuth creds), every $EveryMinutes min + AtStartup."

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Description $desc -Force | Out-Null

Write-Host "Registered: $TaskName (provider=$Provider, port=$Port, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s offset, S4U current user, node=$nodeExe)"

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
Write-Host "Probe the proxy:             node H:\PRISM\scripts\hermes-proxy-ensure.mjs --json"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-hermes-proxy-task.ps1' -Uninstall"
