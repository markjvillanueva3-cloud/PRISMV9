param(
  [string]$TaskName = 'PRISM MISC-Tasks Verify',
  [string]$Time = '05:23',
  [string]$DayOfWeek = 'Monday',
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser
)

# install-misc-verify-task.ps1 - durable WEEKLY cron for the MISC-TASKS
# open-status verifier (scripts/verify-misc-tasks-open.mjs).
#
# WHY: MISC-TASKS-INVENTORY.json merges a one-time 10-agent scan (2026-05-16) and
# is NEVER re-checked against the live repo. The productive fleet closes these
# items faster than the inventory tracks, so a chat "picking up leftover work in
# high-ROI order" routes at phantom-already-done items (15+ spot-checked top-ROI
# items were already built/shipped). The deterministic verifier re-probes every
# item against the LIVE repo ($0, no agents, no 429) -- now-wired (settings.json
# references the asset), shipped-in-git (the item's unit-id is in a post-scan
# commit), looks_completed -- and writes a fresh triage so the fleet routes at
# REAL open work. This task keeps that triage from rotting: as the fleet ships,
# a weekly re-run re-classifies newly-closed items via the git-log signal.
#
# WHICH ARM: the DETERMINISTIC arm only (verify-misc-tasks-open.mjs) -- fast,
# reliable, no model dependency. The Ollama recall arm
# (verify-misc-tasks-ollama.mjs, ~40s/item) stays manual/on-demand; a cron must
# not depend on Ollama being up.
#
# OUTPUT: state/shared/specs/MISC-TASKS-VERIFIED-LATEST.{json,md} (stable alias a
# consumer reads) + a dated MISC-TASKS-VERIFIED-<date>.{json,md} history file.
#
# SAFE: read-only re-probe (reads git log + settings.json + code basenames) that
# writes an advisory triage. CONSERVATIVE BY DESIGN -- only a high-precision
# signal yields likely-closed; a false-positive only flags an item for re-check
# before pickup (operator-recoverable), never flips a milestone envelope.
#
# A bounded weekly batch (not a long-lived daemon): one off-minute Weekly trigger
# (Monday 05:23 avoids :00/:30 fleet collisions) + AtLogOn. Per
# [[feedback_never_delete_only_disable]]: REGISTER + UNREGISTER supported;
# intermediate pause is Disable-ScheduledTask (not -Uninstall).

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path - never a worktree (the task must not dangle).
$verifyScript = 'H:\PRISM\scripts\verify-misc-tasks-open.mjs'

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

if (-not (Test-Path $verifyScript)) {
  throw "Verifier not found: $verifyScript (run on the PRISM host with H:\PRISM present, scripts/verify-misc-tasks-open.mjs committed)."
}

# Sanity: confirm the script is the MISC verifier (defensive against a typo).
$head = Get-Content $verifyScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'verify-misc-tasks-open') -and ($head -match 'MISC-TASKS-INVENTORY'))) {
  throw "Refusing to install: $verifyScript does not look like verify-misc-tasks-open.mjs (missing header markers). Ensure it is the committed version (HEAD)."
}

# The verifier always writes its triage; no flags needed (a read-only scan).
$verifyArgs = "`"$verifyScript`""
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $verifyArgs -WorkingDirectory 'H:\PRISM'

# Weekly off-minute + AtLogOn. No short-repeat: the leftover backlog does not
# churn fast; once a week keeps the triage fresh as the fleet ships, and bounds
# the dated-history file growth to ~52/yr (LATEST is the stable consume path).
$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$trigger = @($weeklyTrigger, $logonTrigger)

# Bounded batch (5 min ceiling - the deterministic scan is near-instant);
# IgnoreNew so an overrun never double-starts.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# Principal - SYSTEM default (runs whether-logged-on-or-not, no UAC). The
# verifier only reads git + settings + basenames and writes a state artifact;
# no network exposure.
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

$desc = "Weekly PRISM MISC-TASKS open-status verifier (verify-misc-tasks-open.mjs). Deterministically re-probes every MISC-TASKS-INVENTORY item against the live repo (now-wired + shipped-in-git + looks_completed signals) so a leftover-work picker routes at REAL open work, not phantom-already-done items. Writes state/shared/specs/MISC-TASKS-VERIFIED-LATEST.{json,md} + a dated history file. Conservative; advisory; never flips milestone envelopes."

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
Write-Host "Registered: $TaskName ($autonomy, verify-misc-tasks-open.mjs, weekly $DayOfWeek $Time + AtLogOn, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 6
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult). Verify: state/shared/specs/MISC-TASKS-VERIFIED-LATEST.md mtime."
}

Write-Host ""
Write-Host "Uninstall: -Uninstall   Pause: Disable-ScheduledTask -TaskName '$TaskName'"
