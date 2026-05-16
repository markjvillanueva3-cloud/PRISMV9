#requires -Version 5.0
<#
.SYNOPSIS
  Register / unregister the PRISM Weekly Synthesis scheduled task
  (OBSIDIAN-INTELLIGENCE-MS3 / B4 - U-WEEKLY-SYNTHESIS).

.DESCRIPTION
  Fires the WeeklySynthesisEngine CLI once a week, Sunday evening. The engine
  reads the last 7 DAILY-CONTEXT-YYYY-MM-DD.md briefs that B1
  (DailyContextWorkflowEngine) emits into knowledge/memories/generated/,
  synthesizes a 4-section weekly retro (Moved / Didn't move / Emerging
  patterns / Top-3 next-week leverage) via Ollama qwen2.5-coder:7b, and
  writes WEEKLY-<ISO-year>-W<NN>.md alongside the daily briefs.

  INVOCATION - runs the engine TypeScript SOURCE directly through tsx:
    node node_modules/tsx/dist/cli.mjs src/engines/WeeklySynthesisEngine.ts --run
  This deliberately does NOT use a compiled dist/engines/*.js path. PRISM's
  build (npm run build / build:fast) is an esbuild BUNDLE - it emits only
  dist/index.js + dist/chunks/, never a per-engine dist/engines/<Name>.js.
  A cron pointed at dist/engines/WeeklySynthesisEngine.js would find it
  permanently missing and never run. tsx (already a PRISM dependency - see
  package.json "dev" and "release-gate") runs the .ts directly, no build
  step, no stale-dist hole.
  NOTE: the sibling B1/B2/B3 crons (daily-context / connection-finder /
  queue-processor) still point at the non-existent dist/engines/*.js and
  share that latent defect - flagged for a B-track cron-invocation fix.

  Anchor date: the engine's --run CLI computes the retro anchor itself
  (today-UTC snapped back to the most-recent Sunday), so a Sunday-evening
  fire on a host west of UTC - where that instant is already Monday UTC -
  still anchors on the correct Sunday. This script therefore does NOT set
  PRISM_WEEKLY_SYNTHESIS_DATE: that env var is the manual BACKFILL override
  (used verbatim, no snap).

  Principal: -LogonType S4U - run whether or not the user is logged on, with
  no stored password and no interactive desktop. Correct for an unattended
  weekly task. H: is a local fixed volume on this host, so a non-interactive
  session resolves it. (The B1/B2/B3 sibling default -LogonType Interactive
  silently does NOT run when the user is logged off - wrong for a retro.)

  Idempotent + atomic: Register-ScheduledTask -Force overwrites any existing
  same-name task in place, with no destructive Unregister-then-Register
  window (a failed re-create would otherwise leave the host with no task).

.PARAMETER DryRun
  Print what would happen without registering or running anything.

.PARAMETER Uninstall
  Remove the scheduled task and exit. Does not touch any vault state
  (generated/ files are left exactly where they are).

.PARAMETER RunNow
  Register the task AND fire it immediately once, then WAIT for it to finish
  and surface the engine's exit code (0 ok / 1 engine-failure / 2 CLI-crash).
  Does not change the weekly schedule.

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/weekly-synthesis-cron.ps1
  # Registers the task: every Sunday at 8:10 PM local.

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/weekly-synthesis-cron.ps1 -DryRun

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/weekly-synthesis-cron.ps1 -Uninstall

.NOTES
  Knob:  PRISM_WEEKLY_SYNTHESIS_VAULT_ROOT        (default H:/prism/knowledge/memories)
  Knob:  PRISM_WEEKLY_SYNTHESIS_DATE              (manual backfill anchor; unset for the recurring task)
  Knob:  PRISM_WEEKLY_SYNTHESIS_OLLAMA_URL        (default http://127.0.0.1:11434/api/generate)
  Knob:  PRISM_WEEKLY_SYNTHESIS_OLLAMA_MODEL      (default qwen2.5-coder:7b)
  Knob:  PRISM_WEEKLY_SYNTHESIS_OLLAMA_TIMEOUT_MS (default 90000)
  Log:   each run appends stdout+stderr to
         state/shared/cron-logs/weekly-synthesis-cron.log. The log is
         append-only and not rotated; at a weekly cadence (~52 short lines a
         year) growth is negligible - prune by hand if it is ever a concern.
  Missed week: with -StartWhenAvailable a PC that was off on Sunday runs the
  retro at the next opportunity (anchor still snaps to the missed Sunday).
  But a PC off for 8+ days loses the intervening week - backfill it manually
  by setting PRISM_WEEKLY_SYNTHESIS_DATE to that Sunday and running the
  engine once by hand.
  Rollback: -Uninstall stops the cadence; generated/ files stay untouched.
#>

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

$TaskName   = 'PRISM Weekly Synthesis'
$TaskFolder = '\PRISM\'
$RepoRoot   = 'H:/prism'
$WorkDir    = "$RepoRoot/mcp-server"
$EngineSrc  = "$RepoRoot/mcp-server/src/engines/WeeklySynthesisEngine.ts"
$TsxCli     = "$RepoRoot/mcp-server/node_modules/tsx/dist/cli.mjs"

# Resolve node.exe: prefer the PRISM portable node, fall back to PATH. The
# candidate list keeps this robust if the portable-node install moves.
$NodeExe = $null
foreach ($cand in @('H:/Tools/nodejs/node.exe', 'H:/.claude/bin/portable-node/node.exe')) {
  if (Test-Path $cand) { $NodeExe = $cand; break }
}
if (-not $NodeExe) {
  $sysNode = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($sysNode) { $NodeExe = $sysNode }
}

function Write-Info($msg) { Write-Host "[weekly-synthesis-cron] $msg" }
function Write-Warn($msg) { Write-Warning "[weekly-synthesis-cron] $msg" }

if (-not $NodeExe) {
  Write-Warn "No node.exe found (tried H:/Tools/nodejs, H:/.claude/bin/portable-node, and PATH). Cannot register."
  exit 1
}

# ---------- Uninstall path ----------
if ($Uninstall) {
  Write-Info "Uninstalling scheduled task '$TaskName'..."
  $existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    Write-Info "Task not registered - nothing to remove."
    exit 0
  }
  if ($DryRun) {
    Write-Info "DryRun: would call Unregister-ScheduledTask -TaskName '$TaskName' -TaskPath '$TaskFolder' -Confirm:`$false"
    exit 0
  }
  Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -Confirm:$false
  Write-Info "Task removed. (generated/ files left untouched.)"
  exit 0
}

# ---------- Pre-flight presence check (warn, never fail) ----------
# $EngineSrc / $TsxCli are the post-merge MAIN-tree locations. If this script
# is run from a worktree before B4 has merged to the main tree the engine
# source will be absent here - that is expected; the task still registers and
# starts producing retros once B4 lands.
if (-not (Test-Path $EngineSrc)) {
  Write-Warn "Engine source not found at $EngineSrc - expected if B4 has not yet merged to the main tree. Registering anyway; the task will produce a retro once B4 lands."
}
if (-not (Test-Path $TsxCli)) {
  Write-Warn "tsx CLI not found at $TsxCli - run 'npm install' in $WorkDir. Registering anyway, but the task fails until tsx is present."
}

# ---------- Build the action ----------
$LogDir  = "$RepoRoot/state/shared/cron-logs"
$LogPath = "$LogDir/weekly-synthesis-cron.log"
if (-not $DryRun -and -not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# The action invokes the engine .ts SOURCE through tsx (see .DESCRIPTION for
# why - the esbuild bundle has no per-engine dist file). The --run flag is
# required: the engine's CLI guard only synthesizes when argv includes --run.
#
# The action FIRST self-creates the log dir (`New-Item -Force`, a no-op if it
# already exists): the registrar creates $LogDir too, but a run-time
# `New-Item` makes the redirect target guaranteed-present even if the dir was
# removed after registration - otherwise `*>> '$LogPath'` would throw and
# `; exit $LASTEXITCODE` would surface a PowerShell failure, not the engine's.
#
# The trailing `; exit $LASTEXITCODE` is REQUIRED: powershell.exe -Command
# does NOT auto-surface a &-invoked exe's exit code - it collapses every
# non-zero result to 1, which would flatten the engine's 0/1/2 contract
# (0 success, 1 engine failure, 2 CLI crash) to pass/fail in Task Scheduler's
# "Last Run Result". `$LASTEXITCODE` is backtick-escaped so it is evaluated at
# run time inside the scheduled powershell.exe, not expanded now (and only the
# native `& node` call sets it - the cmdlet New-Item does not). All four
# interpolated paths are single-quoted so a future space in any of them does
# not break the inner command parse.
$Argument = @(
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  "New-Item -ItemType Directory -Force -Path '$LogDir' -ErrorAction SilentlyContinue | Out-Null; & '$NodeExe' '$TsxCli' '$EngineSrc' --run *>> '$LogPath'; exit `$LASTEXITCODE"
) -join ' '

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Argument -WorkingDirectory $WorkDir

# Trigger: weekly, every Sunday at 8:10 PM local. `-Weekly -DaysOfWeek` is the
# native recurring verb - no -RepetitionInterval / -RepetitionDuration needed
# (and crucially no [TimeSpan]::MaxValue, whose ~10.7M-day span overflows the
# task-XML schema and is rejected/clamped on Win10/11). The 8:10 PM time is
# offset 10 min past the hour so it does not pile onto top-of-hour tasks.
$FireTime = [datetime]'20:10'
$Trigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At $FireTime

# -LogonType S4U: run whether or not the user is logged on (no stored
# password, no interactive desktop). Correct for an unattended weekly task;
# H: is a local fixed volume so a non-interactive session resolves it.
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited

# -StartWhenAvailable matters for a weekly task: if the PC was off on Sunday
# evening, the retro still runs at the next opportunity rather than silently
# skipping the whole week.
$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

# ---------- DryRun: print + exit ----------
if ($DryRun) {
  Write-Info "DryRun: would register task '$TaskName' in folder '$TaskFolder'"
  Write-Info "  Schedule  : every Sunday at $($FireTime.ToString('h:mm tt'))"
  Write-Info "  Action    : powershell.exe $Argument"
  Write-Info "  WorkingDir: $WorkDir"
  Write-Info "  Log path  : $LogPath"
  Write-Info "  Engine    : $EngineSrc (run via tsx)"
  Write-Info "  Node      : $NodeExe"
  Write-Info "  Principal : S4U (runs logged-on or not)"
  Write-Info "  Reentry   : MultipleInstances=IgnoreNew"
  exit 0
}

# ---------- Idempotent + atomic register ----------
# -Force overwrites an existing same-name task in place. No explicit
# Unregister first: a delete-then-recreate pair would, if the recreate threw,
# leave the host with no task at all.
$existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
if ($existing) {
  Write-Info "Refreshing existing task '$TaskName' (atomic overwrite via -Force)..."
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -TaskPath $TaskFolder `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Force `
  -Description "PRISM OBSIDIAN-INTELLIGENCE-MS3/B4 - every Sunday 8:10 PM synthesizes the last 7 daily-context briefs into a WEEKLY-<year>-W<NN>.md retro via Ollama qwen2.5-coder (engine .ts run through tsx). Log: $LogPath" | Out-Null

Write-Info "Registered '$TaskName' - every Sunday at $($FireTime.ToString('h:mm tt')); action logs to $LogPath"

# ---------- Optional immediate fire ----------
if ($RunNow) {
  Write-Info "RunNow: firing one immediate execution..."
  # Capture the prior LastRunTime BEFORE firing. Task Scheduler can take more
  # than the 3 s poll interval to cold-start powershell.exe, so a naive
  # "while State -eq Running" poll can exit on iteration 1 - before the task
  # has even entered Running - and report a STALE LastTaskResult from a
  # previous run. Completion of THIS run is therefore defined as: State is no
  # longer Running AND LastRunTime has advanced past the pre-fire timestamp.
  $beforeInfo = Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
  $beforeRun  = if ($beforeInfo -and $beforeInfo.LastRunTime) { $beforeInfo.LastRunTime } else { [datetime]::MinValue }

  Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder

  # Deadline is past the 15-min ExecutionTimeLimit so the loop cannot outlive
  # the task it is waiting on.
  $deadline = (Get-Date).AddMinutes(16)
  $info = $null
  $done = $false
  do {
    Start-Sleep -Seconds 3
    $info  = Get-ScheduledTaskInfo -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
    $state = (Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue).State
    if ($state -ne 'Running' -and $info -and $info.LastRunTime -gt $beforeRun) {
      $done = $true
    }
  } while (-not $done -and (Get-Date) -lt $deadline)

  if ($done -and $info) {
    $rc = $info.LastTaskResult
    Write-Info "RunNow: finished. LastTaskResult=$rc (0 ok / 1 engine-failure / 2 CLI-crash). Log: $LogPath"
  } else {
    Write-Warn "RunNow: did not observe this run complete within 16 min - inspect $LogPath."
  }
}

exit 0
