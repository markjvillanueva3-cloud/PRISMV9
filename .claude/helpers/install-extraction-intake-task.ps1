param(
  [string]$TaskName = 'PRISM Extraction Intake',
  # Hourly is plenty: the PostToolUse trigger + Stop-drain hook already cover every
  # chat-active extraction. This durable task only covers extractions run while NO
  # chat is active (e.g. a future auto-extract cron). Each run loads the ~537MB
  # tribal index once (~5-10s, self-reexec'd 8GB heap), so a tight cadence would be
  # wasteful when there is usually nothing new.
  [int]$EveryMinutes = 60,
  # Phase offset so this does not phase-lock onto the +60s/+210s/+330s host tasks.
  [int]$StartOffsetSeconds = 405,
  # Bounded per run so a single drain always finishes well under the fleet-reaper's
  # ~10-min orphan window (a scheduled-task node process is not slot-owned, so a long
  # run could be misread as an orphan). 8 entries x ~40s ~ 5 min worst case.
  [int]$MaxPerRun = 8,
  [switch]$RunNow,
  [switch]$Uninstall,
  # DEFAULT principal is S4U (current user, whether-logged-on-or-not, no stored
  # password): the intake reads+writes H:\PRISM\state\shared\, which is the user's
  # files -- a SYSTEM-context task can hit ownership/ACL surprises there. -AsSystem
  # opts into SYSTEM if a host policy needs it.
  [switch]$AsSystem
)

# install-extraction-intake-task.ps1 -- durable backstop for EXTRACTION-INTAKE-MS0.
#
# Registers a Windows Scheduled Task that runs scripts/extraction-intake.mjs every
# $EveryMinutes minutes, independent of any Claude session. The intake discovers
# extraction wiki entries (knowledge/wiki/code-tribal/youtube-*.md) not yet in the
# live tribal index and drives `tribal-embed-index.mjs --add` on each (convert +
# inferDomain galaxy-tag + nomic-embed + clobber-guarded write). Idempotent +
# resumable, so re-runs are cheap when there is nothing new.
#
# This is the third coverage layer (the PostToolUse trigger + Stop-drain hook are the
# first two, for chat-active extractions). Per feedback_never_delete_only_disable.md
# this REGISTERS a task; Disable-ScheduledTask to pause, -Uninstall to remove.
#
# Run from an ELEVATED PowerShell:
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\install-extraction-intake-task.ps1 -RunNow

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

# Always target the canonical main tree, never a slot worktree (a worktree's
# scripts/ can be removed; a host-level task must not dangle) -- the
# reference_cron_temp_path_failure_2026_06_11 lesson: NEVER point the action at %TEMP%.
$intakeScript = 'H:\PRISM\scripts\extraction-intake.mjs'
if (-not (Test-Path $intakeScript)) {
  throw "Intake script not found: $intakeScript (ensure scripts/extraction-intake.mjs is committed to the main tree)."
}
# Sanity: confirm it is the EXTRACTION-INTAKE script before installing.
$head = Get-Content $intakeScript -TotalCount 40 -ErrorAction SilentlyContinue
if (-not ($head -match 'EXTRACTION-INTAKE')) {
  throw "Refusing to install: $intakeScript does not look like extraction-intake.mjs (missing EXTRACTION-INTAKE header)."
}

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
$nodeExe = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $nodeExe = $cand; break }
}
if (-not $nodeExe) { $nodeExe = (Get-Command node -ErrorAction Stop).Source }

# The intake self-reexecs with an 8GB heap, so the action just runs the script.
$intakeArgs = "`"$intakeScript`" --max $MaxPerRun"
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $intakeArgs

$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit 10 min: a bounded --max $MaxPerRun drain is ~5 min worst case;
# 10 min is a generous ceiling that also stays inside the reaper's orphan window.
# MultipleInstances IgnoreNew so a slow drain never stacks a second instance.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew

if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
} else {
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
}

$desc = "EXTRACTION-INTAKE-MS0 durable backstop (extraction-intake.mjs --max $MaxPerRun every $EveryMinutes min). Auto-ingests extraction wiki entries into the live tribal index (convert + inferDomain galaxy-tag + nomic-embed + clobber-guarded write) for extractions run while no chat is active. Idempotent; the PostToolUse trigger + Stop-drain hook cover chat-active extractions."

$registerParams = @{
  TaskName    = $TaskName
  Action      = $action
  Trigger     = $pollTrigger
  Settings    = $settings
  Description = $desc
  Force       = $true
}
if ($principal) { $registerParams['Principal'] = $principal }

Register-ScheduledTask @registerParams | Out-Null
Write-Host "Registered task: $TaskName (every $EveryMinutes min, --max $MaxPerRun, $(if ($AsSystem) {'SYSTEM'} else {'current-user S4U'}))"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started task now: $TaskName (watch the tribal index --stats grow)"
}
