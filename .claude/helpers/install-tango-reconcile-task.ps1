param(
  [string]$TaskName = 'PRISM Tango Queue Reconcile',
  [string]$Time = '04:37',
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser
)

# install-tango-reconcile-task.ps1 - durable daily cron for the TANGO queue
# reconciler (TANGO-COMPLETION-HARNESS, scripts/tango-reconcile-queue.mjs).
#
# WHY: a verify-on-disk audit found the priority-queue's ~3100 "tango-eligible"
# units are ~100% polluted with shipped-but-unflushed work (the 4 existing
# shipped-detection sources miss units whose commit subject does not contain the
# U-ID). The reconciler verifies each eligible unit on disk (exact unit-id token
# in a real commit subject) and writes the confirmed-shipped ids to
# state/shared/verified-shipped-overrides.json - the 5th picker source - so the
# picker stops surfacing them. As the fleet ships more, a daily re-run keeps the
# queue de-polluted.
#
# SAFE: writes an explicit OVERRIDE list (advisory); never flips operator-marked
# milestone envelopes. A false-positive only hides a unit from pickup (operator-
# recoverable via the roadmap), never the reverse - same benign direction as the
# existing bridge-commit source.
#
# A bounded daily batch (not a long-lived daemon): one off-minute Daily trigger
# (04:37 avoids :00/:30 fleet collisions) + AtLogOn. Per
# [[feedback_never_delete_only_disable]]: REGISTER + UNREGISTER supported;
# intermediate pause is Disable-ScheduledTask (not -Uninstall).

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path - never a worktree (the task must not dangle).
$reconcileScript = 'H:\PRISM\scripts\tango-reconcile-queue.mjs'

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

if (-not (Test-Path $reconcileScript)) {
  throw "Reconciler not found: $reconcileScript (run on the PRISM host with H:\PRISM present, scripts/tango-reconcile-queue.mjs committed)."
}

# Sanity: confirm the script is the tango reconciler (defensive against a typo).
$head = Get-Content $reconcileScript -TotalCount 80 -ErrorAction SilentlyContinue
if (-not (($head -match 'tango-reconcile-queue') -and ($head -match 'verified-shipped-overrides'))) {
  throw "Refusing to install: $reconcileScript does not look like tango-reconcile-queue.mjs (missing header markers). Ensure it is the committed version (HEAD)."
}

# --apply writes the overrides file; the reconciler is otherwise a read-only scan.
$reconcileArgs = "`"$reconcileScript`" --apply"
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $reconcileArgs -WorkingDirectory 'H:\PRISM'

# Daily off-minute + AtLogOn. No short-repeat: de-pollution is not time-critical;
# once a day keeps the queue fresh as the fleet ships.
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $Time
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$trigger = @($dailyTrigger, $logonTrigger)

# Bounded batch (10 min ceiling); IgnoreNew so an overrun never double-starts.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal - SYSTEM default (runs whether-logged-on-or-not, no UAC). The
# reconciler only reads git + writes a state JSON; no network exposure.
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

$desc = "Daily PRISM tango queue reconciler (tango-reconcile-queue.mjs --apply). Verifies each tango-eligible roadmap unit on disk (exact unit-id token in a real commit subject) and writes confirmed-shipped ids to state/shared/verified-shipped-overrides.json - the 5th picker shipped-source - de-polluting the ~100%-shipped priority-queue. Advisory; never flips milestone envelopes."

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
Write-Host "Registered: $TaskName ($autonomy, tango-reconcile-queue.mjs --apply, daily $Time + AtLogOn, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 6
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult). Verify: state/shared/verified-shipped-overrides.json mtime + state/shared/specs/TANGO-QUEUE-RECONCILE.md"
}

Write-Host ""
Write-Host "Uninstall: -Uninstall   Pause: Disable-ScheduledTask -TaskName '$TaskName'"
