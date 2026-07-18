param(
  [string]$TaskName = 'PRISM WSL Memory Guard',
  [int]$EveryMinutes = 15,
  # Phase offset (seconds) so this task doesn't phase-lock onto the existing host tasks:
  #   "Cleanup Orchestrator"        ~+60s
  #   "Memory Pressure Auto-Relief" ~+120s
  #   "PRISM Fleet Reaper"          +210s
  #   "PRISM Fleet Memory Monitor"  +330s (install-fleet-memory-monitor-task.ps1:12)
  # Landing the WSL guard at +390s keeps its CIM read of vmmemWSL independent.
  [int]$StartOffsetSeconds = 390,
  # The guard runs ADVISE-ONLY from the scheduled task (no --enforce): an
  # unattended `wsl --shutdown` could kill Docker mid-build. The task SURFACES
  # the overrun (exit 2 + JSONL/stdout) so the operator runs the shutdown, or
  # runs the guard manually with --enforce. -Enforce bakes --enforce in anyway,
  # for operators who accept unattended reclaim (still gated on no active docker).
  [switch]$Enforce,
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsSystem
)

# install-wsl-memory-guard-task.ps1 — durable backbone for the WSL2 memory-cap
# guard (scripts/system-health/27-wsl-memory-guard.mjs).
#
# WHY (diagnosed 2026-06-08, slot:charlie): the recurring "API limit error" was
# host commit-memory pressure, NOT an Anthropic key limit. WSL2 ran with its
# .wslconfig `memory=16GB` cap NOT enforced — vmmemWSL ballooned to ~96 GB
# committed because a `wsl --shutdown` (which makes .wslconfig take effect) was
# never run. At ~99% host commit, outbound HTTPS/API calls + the MCP server
# fail allocation → looks like an API/rate limit. Killing zombie tsservers only
# dents it; WSL is the dominant, recurring offender.
#
# This guard polls vmmemWSL vs the configured cap every 15 min and surfaces the
# overrun BEFORE it becomes acute. Sibling of the 5-min Fleet Memory Monitor
# (whole-host RAM) — this one is WSL-specific because WSL is the root cause.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS a task; Disable-
# ScheduledTask pauses without removing. -Uninstall removes.

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell — (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Always target the canonical main tree, never a worktree.
$guardScript = 'H:\PRISM\scripts\system-health\27-wsl-memory-guard.mjs'

# Prefer the portable node; fall back to Program Files then PATH.
# Mirrors install-fleet-memory-monitor-task.ps1:67-71 — keep in sync.
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

if (-not (Test-Path $guardScript)) {
  throw "WSL memory-guard script not found: $guardScript (run on the PRISM host with H:\PRISM present, and ensure scripts/system-health/27-wsl-memory-guard.mjs is committed)."
}

# Sanity: confirm the script is the one we expect. A rename of the pure exports
# or header would break the task silently (task shows success while no-op'ing).
$head = Get-Content $guardScript -TotalCount 120 -ErrorAction SilentlyContinue
if (-not (($head -match 'wsl-memory-guard') -and ($head -match 'parseWslConfigCap'))) {
  throw "Refusing to install: $guardScript does not look like 27-wsl-memory-guard.mjs (missing header / parseWslConfigCap)."
}

# Advise-only by default (--json --quiet); -Enforce adds --enforce (gated on no
# active docker build inside the guard itself).
$guardArgs = if ($Enforce) { "`"$guardScript`" --json --quiet --enforce" } else { "`"$guardScript`" --json --quiet" }
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $guardArgs

# Two triggers: every-$EveryMinutes poll + AtStartup so a reboot resumes guarding.
$pollTrigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($pollTrigger, $startupTrigger)

# ExecutionTimeLimit 120s: worst case is a couple of CIM/powershell calls + a
# possible `wsl --shutdown` (a few seconds). IgnoreNew so a slow poll never piles.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Seconds 120) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew

# S4U default (runs whether-logged-on). -Enforce needs to call `wsl --shutdown`,
# which works under S4U for the installing user's WSL. SYSTEM is opt-in.
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

$desc = "WSL2 memory-cap guard for the PRISM fleet (27-wsl-memory-guard.mjs --json --quiet$(if ($Enforce) { ' --enforce' })). Polls vmmemWSL commit vs the .wslconfig memory= cap; flags overrun (cap NOT enforced — the recurring 'API limit error' root cause: WSL balloons past its cap when wsl --shutdown was never run). Advise-only by default (surfaces exit 2); -Enforce runs gated `wsl --shutdown` to reclaim. Runs whether-logged-on (S4U) + at boot. Sibling of the 5-min Fleet Memory Monitor (whole-host RAM)."

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

$mode = if ($Enforce) { 'ENFORCE (gated wsl --shutdown on overrun)' } else { 'advise-only' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy — dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, 27-wsl-memory-guard.mjs, every $EveryMinutes min + AtStartup, +$($StartOffsetSeconds)s phase offset, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run — still running after 60s (LastTaskResult=267009)."
  } else {
    # Exit codes: 0 healthy, 1 watch/no-cap, 2 overrun.
    $name = switch ($info.LastTaskResult) {
      0 { 'HEALTHY' }
      1 { 'WATCH' }
      2 { 'OVERRUN' }
      default { 'UNKNOWN' }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) ($name)"
  }
}

Write-Host ""
Write-Host "Knobs (CLI flags — full list in the guard script header):"
Write-Host "  --overrun-factor N   commit>cap*N => overrun (default 1.5)"
Write-Host "  --enforce            run `wsl --shutdown` on overrun (gated on no active docker)"
Write-Host "  --force              allow --enforce even with active containers (logged)"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Read current verdict:        & '$nodeExe' '$guardScript'"
Write-Host "Manual reclaim now:          wsl --shutdown   (frees the overrun; cap applies on WSL's next boot)"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-wsl-memory-guard-task.ps1' -Uninstall"
