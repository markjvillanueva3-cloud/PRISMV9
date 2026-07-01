param(
  [string]$TaskName = 'PRISM Synergy Regression Watch',
  # Local time-of-day for the daily run. Defaults to 08:13 to match the
  # in-session CronCreate fallback registered by /forge-audit-v2 2026-05-16,
  # and to dodge the :00/:30 minute marks every other host task piles onto.
  [string]$AtTime = '08:13',
  # Bake a stricter threshold into the task definition (machine-persistent,
  # unlike a per-invocation --threshold). Default = the script's own 0.5pp.
  [double]$ThresholdPp = 0.005,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-synergy-watch-task.ps1 -- durable backbone for the synergy watcher.
#
# Registers a Windows Scheduled Task that runs synergy-regression-watch.mjs once
# per day, independent of any Claude Code session. This is the "survives all
# chats closing" half of the synergy-watch pipeline shipped by /forge-audit-v2
# 2026-05-16. The in-session CronCreate job (id 040081ef) is session-only and
# auto-expires after 7 days; only THIS scheduled task keeps the week-over-week
# regression detector alive across reboots and session deaths.
#
# What the watcher does (see scripts/synergy-regression-watch.mjs): runs
# system-synergy-map.mjs, appends the ratio to state/shared/synergy-history.jsonl
# (atomic-rename, parallel-safe), compares against the 7d-old baseline, and
# exits 1 when synergy regressed beyond the threshold. The 2026-05-09 22.2pct
# datapoint is seeded into the history so the regression reproduces independently.
#
# Why daily (not 5-min like the fleet-reaper): synergy is a slow-moving
# architectural metric -- it shifts when engines wire/unwire, not minute to
# minute. A daily sample catches week-over-week drift with zero host-load
# footprint. Output is appended to state/shared/synergy-watch.log so a missed
# alert is still recoverable from the log tail.
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it can
# be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to remove.

$ErrorActionPreference = 'Stop'

# Registering a task in the root folder needs an elevated context on Win11 --
# fail with a clear message instead of a raw COM error.
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree scripts/ can be removed; the host-level task must not dangle).
$watchScript = 'H:\PRISM\scripts\synergy-regression-watch.mjs'
$logFile     = 'H:\PRISM\state\shared\synergy-watch.log'

# Prefer the portable node this PC uses; fall back to PATH then Program Files.
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

if (-not (Test-Path $watchScript)) {
  throw "Synergy-watch script not found: $watchScript (run on the PRISM host with H:\PRISM present, and ensure scripts/synergy-regression-watch.mjs is committed)."
}

# Sanity: confirm the script is the synergy watcher and understands --json.
$head = Get-Content $watchScript -TotalCount 40 -ErrorAction SilentlyContinue
if (-not (($head -match 'synergy-regression') -and ($head -match 'json'))) {
  throw "Refusing to install: $watchScript does not look like synergy-regression-watch.mjs (missing the synergy-regression header / json flag). Ensure it is the committed version (HEAD)."
}

# Validate the AtTime is parseable HH:mm before handing it to the trigger.
try { $atParsed = [DateTime]::ParseExact($AtTime, 'HH:mm', $null) }
catch { throw "Invalid -AtTime '$AtTime' -- expected 24h HH:mm (e.g. 08:13)." }

# The watcher writes its own JSONL history; we additionally tee node stdout/
# stderr into the log so a missed alert is recoverable. powershell.exe -Command
# performs the append redirect within the single task action. PowerShell's
# `*>>` redirects every stream (stdout + stderr + warning + verbose + debug)
# to the file in append mode -- equivalent to cmd's `>> file 2>&1`.
#
# Switched from cmd.exe to powershell.exe with `-WindowStyle Hidden` so the
# scheduled task does NOT pop a visible console window every Daily fire.
# cmd.exe always allocates a visible conhost when invoked by a task running
# under an Interactive principal; PowerShell's -WindowStyle Hidden suppresses
# it. Functional behavior (append redirect of all streams) is preserved.
$threshArg = $ThresholdPp.ToString([System.Globalization.CultureInfo]::InvariantCulture)
$psInner = "& '" + $nodeExe + "' '" + $watchScript + "' --json --threshold " + $threshArg + " *>> '" + $logFile + "'"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -Command "' + $psInner + '"')

$trigger = New-ScheduledTaskTrigger -Daily -At $atParsed

# A synergy measurement is ~3-10s (spawns system-synergy-map.mjs). 5-min ceiling
# is generous. StartWhenAvailable so a powered-off-at-08:13 host still runs the
# missed sample on next wake. MultipleInstances IgnoreNew -- a slow run never
# stacks a second on top of itself.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$desc = "Daily synergy-regression watch (synergy-regression-watch.mjs --json, threshold ${ThresholdPp}pp). Runs system-synergy-map.mjs, appends to state/shared/synergy-history.jsonl, exits 1 on week-over-week regression. Output teed to state/shared/synergy-watch.log. Durable counterpart to the session-only CronCreate job from /forge-audit-v2 2026-05-16. Runs independent of Claude sessions."

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description $desc `
  -Force | Out-Null

Write-Host "Registered: $TaskName (daily at $AtTime, synergy-regression-watch.mjs --json --threshold $threshArg, node=$nodeExe)"
Write-Host "  Log:     $logFile"
Write-Host "  History: H:\PRISM\state\shared\synergy-history.jsonl"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # The watcher finishes in ~3-10s; LastTaskResult reads 267009 (0x41301 =
  # "running") until it completes -- poll past that rather than misreporting.
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Seconds 3
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 60s. Check $logFile."
  } else {
    # Exit 0 = clean, 1 = regression detected, 2 = measurement error.
    $verdict = switch ($info.LastTaskResult) {
      0 { 'no regression (synergy stable)' }
      1 { 'REGRESSION DETECTED -- inspect the log + chat bus' }
      2 { 'measurement error / corrupt history -- inspect synergy-history.jsonl' }
      default { "unexpected exit code $($info.LastTaskResult)" }
    }
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) -- $verdict"
  }
}

Write-Host ""
Write-Host "Knobs (CLI flags, read by the watcher -- full list in the script header):"
Write-Host "  --threshold N    week-over-week drop pct that fires an alert (default 0.005 = 0.5pp)"
Write-Host "  --json           machine-readable output (used by this task)"
Write-Host "  --history        dump synergy-history.jsonl without measuring"
Write-Host ""
Write-Host "Verify registered:          schtasks /Query /TN '$TaskName'"
Write-Host "Watch synergy activity:     Get-Content $logFile -Tail 20 -Wait"
Write-Host "Pause without uninstalling: Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                  Re-run this script with -Uninstall"
