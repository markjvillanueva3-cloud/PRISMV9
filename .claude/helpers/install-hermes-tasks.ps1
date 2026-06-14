param(
  # Cadence for the cron-prewarm task (every N minutes). The prewarm reads
  # Hermes cron/jobs.json and warms the next-due local model so a cron tick
  # never pays the cold-load stall. 10 min comfortably covers the default
  # 15-min lead window the script selects on.
  [int]$PrewarmEveryMinutes = 10,
  # GEPA weekly anchor -- stages a Hermes skill-optimization candidate from
  # cron traces (NEEDS-REVIEW, never touches the live skill). Sunday evening,
  # AFTER the Hermes weekly self-review + evening crons, so it mines fresh
  # traces. Local time (Task Scheduler fires in local, not UTC).
  [ValidateSet('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')]
  [string]$GepaDayOfWeek = 'Sunday',
  [string]$GepaAtTime = '21:07',
  # Skill-loop closure (S2-S6): nightly cluster->gate->ship of AUTO-PASS skill
  # DRAFTS to state/shared/specs/ staging (NEEDS-REVIEW, never live commands).
  # Early-morning off-peak, offset from the evening GEPA/dream/reflect cluster
  # and the Fleet-Reaper / Memory-Monitor phases.
  [string]$SkillLoopAtTime = '03:17',
  [switch]$RunNow,
  [switch]$Uninstall
)

# install-hermes-tasks.ps1 -- durable USER-LEVEL Windows Scheduled Tasks for the
# three Hermes acceleration loops: (1) cron-prewarm (OBSIDIAN-HERMES-ACCEL/
# U-HERMES-CRON-PREWARM), (2) the GEPA skill-OPTIMIZATION flywheel, and (3) the
# skill-loop CLOSURE (S2-S6: observed tool-sequences -> gated skill drafts).
# slot:zulu 2026-06-10; skill-loop closure added slot:sierra 2026-06-14.
#
# Both run as the CURRENT USER (no UAC / no elevation) -- they only touch the
# local Ollama server + the per-user Hermes home + the repo, never SYSTEM state.
# This is WHY they install without an elevated shell (unlike the SYSTEM-principal
# PRISM tasks). Re-run anytime to reconcile; -Uninstall removes both.
#
#   Node + repo are resolved from this file's location so the installer is
#   host-portable (no hardcoded H:\ assumption beyond the repo root fallback).

$ErrorActionPreference = 'Stop'

# Resolve repo root (this file lives at <repo>/.claude/helpers/)
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$NodeExe  = if (Get-Command node -ErrorAction SilentlyContinue) { (Get-Command node).Source } else { 'H:\Tools\nodejs\node.exe' }

$PrewarmTask   = 'PRISM Hermes Cron Prewarm'
$GepaTask      = 'PRISM Hermes GEPA Weekly'
$SkillLoopTask = 'PRISM Hermes Skill Loop'

function Remove-IfExists([string]$name) {
  if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "  removed: $name"
  }
}

if ($Uninstall) {
  Remove-IfExists $PrewarmTask
  Remove-IfExists $GepaTask
  Remove-IfExists $SkillLoopTask
  Write-Host 'Hermes tasks uninstalled.'
  return
}

if (-not (Test-Path $NodeExe)) { throw "node not found at $NodeExe (set PATH or edit installer)" }

# --- 1) cron-prewarm: repeating every N minutes -------------------------------
$prewarmScript = Join-Path $RepoRoot 'scripts\hermes-cron-prewarm.mjs'
if (-not (Test-Path $prewarmScript)) { throw "missing $prewarmScript" }
$pAction  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$prewarmScript`"" -WorkingDirectory $RepoRoot
$pTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $PrewarmEveryMinutes)
Register-ScheduledTask -TaskName $PrewarmTask -Action $pAction -Trigger $pTrigger -Force `
  -Description "Pre-warm the Ollama model before each Hermes cron tick (kills cold-load stall). Kill: PRISM_HERMES_PREWARM_DISABLE=1." | Out-Null
Write-Host "  registered: $PrewarmTask (every $PrewarmEveryMinutes min)"

# --- 2) GEPA weekly flywheel --------------------------------------------------
$gepaScript = Join-Path $RepoRoot 'scripts\hermes-skill-gepa.mjs'
if (-not (Test-Path $gepaScript)) { throw "missing $gepaScript" }
$gAction  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$gepaScript`" --apply" -WorkingDirectory $RepoRoot
$gTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $GepaDayOfWeek -At $GepaAtTime
Register-ScheduledTask -TaskName $GepaTask -Action $gAction -Trigger $gTrigger -Force `
  -Description "Weekly GEPA-lite: stage a Hermes skill-optimization candidate from cron traces (NEEDS-REVIEW, never touches live skill)." | Out-Null
Write-Host "  registered: $GepaTask ($GepaDayOfWeek $GepaAtTime)"

# --- 3) skill-loop nightly: CLOSE the observe->cluster->gate->ship loop --------
# The S1 observe stage (skill-candidate-observe Stop hook) already feeds
# state/shared/skill-candidates.jsonl on every session. This is the missing S2-S6
# driver: it clusters those candidates, gates them, and ships AUTO-PASS entries as
# skill DRAFTS under state/shared/specs/ (NEVER live .claude/commands/). Safe to
# automate: idempotent (never overwrites an existing draft), every ship is audited
# to state/shared/skill-loop-verdicts.jsonl, and NEEDS-REVIEW items only surface a
# reviewer prompt -- they are not auto-published.
$skillLoopScript = Join-Path $RepoRoot 'scripts\skill-loop-run.mjs'
if (-not (Test-Path $skillLoopScript)) { throw "missing $skillLoopScript" }
$sAction  = New-ScheduledTaskAction -Execute $NodeExe -Argument "`"$skillLoopScript`" --apply" -WorkingDirectory $RepoRoot
$sTrigger = New-ScheduledTaskTrigger -Daily -At $SkillLoopAtTime
Register-ScheduledTask -TaskName $SkillLoopTask -Action $sAction -Trigger $sTrigger -Force `
  -Description "Nightly Hermes skill-loop closure: cluster observed tool-sequences (skill-candidates.jsonl) -> gate -> ship AUTO-PASS skill DRAFTS to state/shared/specs/ staging (NEEDS-REVIEW, never live commands). Idempotent + audited to skill-loop-verdicts.jsonl." | Out-Null
Write-Host "  registered: $SkillLoopTask (daily $SkillLoopAtTime, --apply staging drafts)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $PrewarmTask
  Write-Host "  ran $PrewarmTask once (GEPA not auto-run -- it invokes Ollama on traces; let it fire on schedule)"
}

Write-Host 'Hermes tasks installed (user-level, no UAC).'
