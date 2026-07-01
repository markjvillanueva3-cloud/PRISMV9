# install-synthesis-crons.ps1 -- OBSIDIAN-RECALL-MEASURE (2026-06-09)
#
# Registers the dated-synthesis write-back crons the Obsidian-vault deep-dive
# found UNREGISTERED (Task Scheduler had no entry for any of them). These are
# the L4-intelligence "vault talks back / dated write-back" loops from the
# CyrilXBT/Karpathy second-brain framework -- the vault was filling up but never
# getting compounding dated synthesis written back into it.
#
# Three runners (all verified to run clean before this installer was written):
#   1. weekly-memory-synthesis.mjs  -> knowledge/memories/weekly-synthesis/<YYYY-WW>.md
#   2. run-daily-context.mjs        -> knowledge/memories/generated/DAILY-CONTEXT-<date>.md
#   3. run-knowledge-distillation.mjs -> clusters + distills recent notes
#
# NOTE the deep-dive also listed a "connection-finder" cron: scripts/find-connections.mjs
# is per-target (<target-slug> required), NOT a batch/cron runner, so it is NOT
# scheduled here. The on-demand `prism_memory:connections_materialize` dispatcher
# action is the correct surface for connection materialization until a batch
# runner exists. (R12: documenting what is NOT done, not silently dropping it.)
#
# Durable runner dir: writes each task's runner .ps1 into .claude/cron-runners/
# (NOT $env:TEMP -- the tmp-orphan janitor reaps TEMP, which is exactly what
# broke the tribal crons: LastTaskResult 0x41303 pointing at deleted scripts).
#
# Usage (NO elevation needed -- S4U/current-user principal):
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-synthesis-crons.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-synthesis-crons.ps1 -Uninstall
#   powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-synthesis-crons.ps1 -RunNow
param(
  [switch]$Uninstall,
  [switch]$RunNow,
  [string]$NodeBin = "H:/Tools/nodejs/node.exe",
  [string]$ProjectRoot = "H:/prism"
)

$ErrorActionPreference = "Stop"

# Resolve node: prefer the param, fall back to the C: install or PATH.
if (-not (Test-Path $NodeBin)) {
  foreach ($cand in @('C:\Program Files\nodejs\node.exe')) {
    if (Test-Path $cand) { $NodeBin = $cand; break }
  }
  if (-not (Test-Path $NodeBin)) { $NodeBin = (Get-Command node -ErrorAction Stop).Source }
}

$runnerDir = Join-Path $ProjectRoot ".claude/cron-runners"
if (-not (Test-Path $runnerDir)) { New-Item -ItemType Directory -Path $runnerDir -Force | Out-Null }

# Each cron: TaskName, runner filename, the node command(s), trigger, disable knob.
$crons = @(
  @{
    Name    = "PRISM Weekly Memory Synthesis"
    Runner  = "prism-weekly-memory-synthesis-cron.ps1"
    Knob    = "PRISM_WEEKLY_SYNTHESIS_CRON_DISABLE"
    Cmd     = "& '$NodeBin' scripts/weekly-memory-synthesis.mjs"
    Trigger = { New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At "06:14:00" }
    Desc    = "Weekly dated memory synthesis -> knowledge/memories/weekly-synthesis/<YYYY-WW>.md."
    Limit   = 30
  },
  @{
    Name    = "PRISM Daily Context Synthesis"
    Runner  = "prism-daily-context-cron.ps1"
    Knob    = "PRISM_DAILY_CONTEXT_CRON_DISABLE"
    Cmd     = "& '$NodeBin' scripts/run-daily-context.mjs"
    Trigger = { New-ScheduledTaskTrigger -Daily -At "06:42:00" }
    Desc    = "Daily dated context synthesis -> knowledge/memories/generated/DAILY-CONTEXT-<date>.md."
    Limit   = 20
  },
  @{
    Name    = "PRISM Knowledge Distillation"
    Runner  = "prism-knowledge-distillation-cron.ps1"
    Knob    = "PRISM_KNOWLEDGE_DISTILLATION_CRON_DISABLE"
    Cmd     = "& '$NodeBin' scripts/run-knowledge-distillation.mjs"
    Trigger = { New-ScheduledTaskTrigger -Daily -At "05:38:00" }
    Desc    = "Daily knowledge distillation -- clusters + distills recent notes back into the vault."
    Limit   = 20
  }
)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U

foreach ($c in $crons) {
  $existing = Get-ScheduledTask -TaskName $c.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $c.Name -Confirm:$false
    Write-Host "Unregistered: $($c.Name)"
  }
  if ($Uninstall) {
    if (-not $existing) { Write-Host "Not installed: $($c.Name)" }
    continue
  }

  # Knob-aware runner: fires regardless; self-exits early if the disable knob is set.
  $body = @"
if (`$env:$($c.Knob) -eq '1') { exit 0 }
Set-Location -Path '$ProjectRoot'
$($c.Cmd)
"@
  $runnerPath = Join-Path $runnerDir $c.Runner
  Set-Content -Path $runnerPath -Value $body -Encoding UTF8

  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`""
  $trigger = & $c.Trigger
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes $c.Limit) `
    -MultipleInstances IgnoreNew

  Register-ScheduledTask -TaskName $c.Name -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Description $c.Desc | Out-Null
  Write-Host "Registered: $($c.Name)  (runner: $($c.Runner), disable knob: $($c.Knob))"

  if ($RunNow) {
    Start-ScheduledTask -TaskName $c.Name
    Start-Sleep -Seconds 2
    $info = Get-ScheduledTaskInfo -TaskName $c.Name
    Write-Host ("  RunNow -> LastResult 0x{0:X}" -f $info.LastTaskResult)
  }
}

if (-not $Uninstall) {
  Write-Host ""
  Write-Host "Done. 3 synthesis crons registered (S4U/current-user, durable runners in .claude/cron-runners/)."
}
