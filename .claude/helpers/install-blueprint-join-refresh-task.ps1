param(
  [string]$TaskName = 'PRISM Blueprint Join Refresh',
  # Weekly cadence -- runs every Sunday at the local-time anchor below. Mirrors
  # the in-session golf-cron-registry entry `golf-blueprint-join-refresh`
  # (cronExpr '47 8 * * 0' = Sunday 08:47 UTC). Trigger semantics:
  #   * Windows Task Scheduler default: triggers fire in LOCAL time, not UTC.
  #   * On a PT host the local 08:47 fires at 15:47 UTC (~15 h offset from the
  #     golf reminder's 08:47 UTC = 00:47 PT). On a UTC host they coincide.
  # This is NOT minor drift -- the two mechanisms can fire on different
  # calendar days from the operator's wall-clock perspective. It is acceptable
  # ANYWAY because (a) phase20 + phase16 are idempotent and have no time-of-day
  # coupling, (b) the dual-mechanism design is "one fires when a golf chat is
  # open, the other fires regardless of which chat is open"; coinciding fires
  # would actually be wasteful. If you ever want them in lockstep, override
  # -AtTime to the local equivalent of 08:47 UTC on your host.
  [string]$AtTime = '08:47',
  # ValidateSet pins this to a real day name so a typo fails at param-bind time
  # instead of at New-ScheduledTaskTrigger with an opaque COM error.
  [ValidateSet('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')]
  [string]$DayOfWeek = 'Sunday',
  # Burn-in mode: bakes -DryRun into the task definition so the cron runs the
  # validation-only path of 33-blueprint-join-refresh.ps1 (skips phase20 +
  # phase16, just sanity-checks the existing v6 jsonl on disk + writes the log).
  # Watch state/shared/blueprint-join-refresh-last.json after a fire, then
  # reinstall without -DryRun to flip to the real rebuild.
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-blueprint-join-refresh-task.ps1 -- durable Windows Scheduled Task for
# the blueprint<->program join index weekly rebuild.
#
# Registers a Scheduled Task that runs the CANONICAL wrapper
# scripts/system-health/33-blueprint-join-refresh.ps1 every $DayOfWeek at $AtTime,
# independent of any Claude Code session. That wrapper (shipped by U-DOCU-04 in
# MS-DOCU-INGEST) is the single source of truth for HOW the refresh is invoked
# -- this installer only handles WHEN. It does NOT bypass the wrapper or
# re-implement its python orchestration / validation logic.
#
# Sibling to the in-session golf reminder in state/shared/golf-cron-registry.json
# (golf-blueprint-join-refresh -- shipped in the SAME U-DOCU-04 unit; the two
# files are atomically committed so this installer's description below is
# accurate at commit time). The two are DELIBERATELY DUAL MECHANISMS:
#   * Windows Scheduled Task (this installer) -- fires regardless of whether a
#     golf chat is open, does the real rebuild (phase20 + phase16 + validate +
#     log).
#   * Golf in-session reminder -- fires only when a golf chat is open during
#     the registered prompt window, runs the PS1 with -DryRun for a
#     freshness/plan check + reports.
# Same precedent as `golf-state-snapshot` (state/shared/golf-cron-registry.json
# entry + scripts/system-health/30-golf-state-snapshot.ps1 + its installer).
#
# Sibling Windows tasks (each addresses a different hygiene layer):
#   - PRISM Fleet Reaper                -- slot-attributed orphan reaping (5 min)
#   - PRISM Memory Pressure Auto-Relief -- memory-triggered escalation (5 min)
#   - PRISM Cleanup Orchestrator        -- generic locks/claims/orphans (5 min)
#   - PRISM Envelope Drift              -- milestone status drift sweep (30 min)
#   - PRISM Golf State Snapshot         -- daily golf-state backup (daily)
#   - PRISM Blueprint Join Refresh (this) -- weekly join index rebuild (Sunday)
#
# Per memory feedback_never_delete_only_disable.md: this REGISTERS a task; it
# can be Disable-ScheduledTask'd to pause without removing. Use -Uninstall to
# remove. Per the same memory: the wrapper itself is left alone by -Uninstall.
#
# Pause without uninstalling: Disable-ScheduledTask -TaskName 'PRISM Blueprint Join Refresh'
# Uninstall:                   & '$PSScriptRoot\install-blueprint-join-refresh-task.ps1' -Uninstall

$ErrorActionPreference = 'Stop'

# Registering / unregistering a task in the root \ folder needs an elevated
# context on Windows 11 -- fail with a clear message instead of a raw COM error.
# Matches the elevation pattern in install-cleanup-orchestrator-task.ps1.
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

# The scheduled task always targets the canonical main tree, never a worktree
# (a worktree's scripts/ can be removed; the host-level task must not dangle).
# Matches the sibling installers in this directory.
$wrapperScript = 'H:\PRISM\scripts\system-health\33-blueprint-join-refresh.ps1'

if (-not (Test-Path $wrapperScript)) {
  throw "Blueprint-join-refresh wrapper not found: $wrapperScript (run on the PRISM host with H:\PRISM present, and ensure scripts/system-health/33-blueprint-join-refresh.ps1 is committed)."
}

# Sanity: confirm the wrapper really is U-DOCU-04's refresh wrapper (not some
# renamed file). Both anchor strings live in its header docblock.
# -Encoding UTF8: explicit so a future doc edit introducing non-ASCII chars
# (em-dash, smart-quote, etc.) doesn't get mojibake-decoded under PS 5.1's
# default Windows-1252 codepage and silently miss the anchor match.
# Also probe for the shebang line so a stripped/regenerated wrapper without the
# canonical pwsh shebang fails the gate even if the keywords appear elsewhere.
$head = Get-Content $wrapperScript -TotalCount 60 -Encoding UTF8 -ErrorAction SilentlyContinue
$hasShebang = $head -and $head[0] -match '^#!.*pwsh'
$hasAnchorA = ($head -match 'blueprint-join-refresh').Count -gt 0
$hasAnchorB = ($head -match 'U-DOCU-04').Count -gt 0
if (-not ($hasShebang -and $hasAnchorA -and $hasAnchorB)) {
  throw "Refusing to install: $wrapperScript does not look like 33-blueprint-join-refresh.ps1 (need shebang on line 1 + 'blueprint-join-refresh' + 'U-DOCU-04' in first 60 lines; got shebang=$hasShebang anchorA=$hasAnchorA anchorB=$hasAnchorB). Ensure it is the committed version (HEAD)."
}

# Run the wrapper via powershell.exe (Windows-PowerShell 5.1) -- always present
# in the Task Scheduler service context, unlike pwsh.exe (PS7) which requires a
# separate install. The wrapper itself is PS 5.1-compatible (verified by the
# parser check in U-DOCU-04 per-file scrutiny). This matches every other PRISM
# system-health installer; do NOT switch to pwsh.exe even if a host has it.
$wrapperArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$wrapperScript`"$(if ($DryRun) { ' -DryRun' })"
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $wrapperArgs

# Weekly trigger -- Sunday at $AtTime local. Unlike the 5-min cadence siblings
# which need -Once with -RepetitionInterval (Task Scheduler cannot fire a
# trigger more often than 1 minute in -Weekly mode), a weekly cadence uses the
# native -Weekly trigger which is more reliable + handles DST automatically.
$trigger = New-ScheduledTaskTrigger `
  -Weekly `
  -DaysOfWeek $DayOfWeek `
  -At $AtTime

# ExecutionTimeLimit 30 min: phase20 + phase16 are O(n_pages x n_programs) and
# in production currently take ~3-8 min combined on JM Die's corpus (~60MB
# output). 30 min absorbs a 4-5x slowdown (corpus growth + slow-disk day) before
# the task is forcibly killed. If the limit is regularly hit, that is itself a
# signal that the phase scripts have regressed and need a profile pass. The
# fleet-reaper covers orphan python.exe survivors after a timeout kill.
#
# MultipleInstances IgnoreNew so a slow run never piles a second instance on
# itself -- once-a-week cadence makes that almost impossible, but the safeguard
# is cheap and matches the sibling installer pattern.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -MultipleInstances IgnoreNew

$desc = "Weekly blueprint<->program join index rebuild -- runs scripts/system-health/33-blueprint-join-refresh.ps1$(if ($DryRun) { ' -DryRun [BURN-IN]' }) every $DayOfWeek at $AtTime local. Rebuilds Docustrata/.index/blueprint-program-join-full-v6.jsonl via phase20 + phase16 python scripts, validates the output, writes state/shared/blueprint-join-refresh-last.json. Dual mechanism with state/shared/golf-cron-registry.json -> golf-blueprint-join-refresh: this task does the real rebuild regardless of which chat is open; the golf registry entry is an in-session freshness reminder."

# Existence probe: Register-ScheduledTask -Force silently overwrites a same-name
# task. Surface the replace instead of clobbering it silently -- matches the
# sibling installers' pattern. NOTE: -Force overwrites the ENTIRE task
# definition (Action, Trigger, Settings, Principal, RegistrationInfo,
# Description) -- including any manual triggers an operator added via the
# Task Scheduler UI (e.g. a wake-from-sleep trigger). The Write-Host below
# is honest about that scope; do not narrow it to "trigger/action/limit"
# alone (the model installer carries that less-precise wording -- not us).
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Replacing existing scheduled task '$TaskName' (state: $($existing.State)) -- the ENTIRE task definition (action, trigger, settings, principal, description, any UI-added triggers) will be overwritten by -Force."
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description $desc `
  -Force | Out-Null

$mode = if ($DryRun) { 'DRY-RUN burn-in (validates existing jsonl, skips python phases)' } else { 'live (phase20 + phase16 + validate + log)' }
Write-Host "Registered: $TaskName ($mode, runs 33-blueprint-join-refresh.ps1, weekly $DayOfWeek at $AtTime)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # A live run takes ~3-8 min for the real rebuild; LastTaskResult reads 267009
  # (0x41301 = "running") until it finishes -- poll past that rather than
  # reporting a misleading code. Deadline is generous (10 min) because we want
  # to know the real outcome here, not bail early.
  $deadline = (Get-Date).AddMinutes(10)
  do {
    Start-Sleep -Seconds 15
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 10 min (LastTaskResult=267009). Check state/shared/blueprint-join-refresh-last.json."
  } else {
    # KEEP-IN-SYNC with scripts/system-health/33-blueprint-join-refresh.ps1
    # .NOTES Exit: block. If a future U-DOCU unit adds an exit code, both
    # files must be updated together.
    # Wrapper exit codes (per 33-blueprint-join-refresh.ps1 .NOTES):
    #   0 = ok   2 = python bin missing   3 = phase failure
    #   4 = jsonl missing   5 = jsonl validation failed
    $knownCodes = @(0, 2, 3, 4, 5)
    $code = $info.LastTaskResult
    if ($code -lt 0 -or ($knownCodes -notcontains $code -and $code -ne 267009)) {
      # Non-mapped codes typically mean Task Scheduler terminated the task
      # externally (ExecutionTimeLimit hit at 30 min, host shutdown, or the
      # service force-stopped). The wrapper itself never returns these. The
      # previous state/shared/blueprint-join-refresh-last.json may be stale
      # from a prior healthy run -- check its mtime before trusting it.
      Write-Host "Triggered immediate run. LastTaskResult=$code (unmapped -- LIKELY KILLED BY TASK SCHEDULER, e.g. ExecutionTimeLimit hit at 30 min, service stop, host shutdown). The wrapper itself never returns this code. Inspect 'Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational -MaxEvents 20' + the wrapper log."
    } else {
      Write-Host "Triggered immediate run. LastTaskResult=$code (0=ok, 2=python-missing, 3=phase-failure, 4=jsonl-missing, 5=validation-failed)"
    }
  }
}

Write-Host ""
Write-Host "Wrapper flags (pass via -DryRun here, or run the wrapper directly): -DryRun, -Json, -FrozenTime"
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "See all PRISM hygiene tasks: Get-ScheduledTask | Where-Object { `$_.TaskName -like 'PRISM *' }"
Write-Host "Watch last-run record:       Get-Content H:/PRISM/state/shared/blueprint-join-refresh-last.json -Raw"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-blueprint-join-refresh-task.ps1' -Uninstall"
