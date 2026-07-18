param(
  [string]$TaskName = 'PRISM LoRA Dataset Refresh',
  [string]$Time = '03:47',
  [string]$DayOfWeek = 'Sunday',
  [switch]$RunNow,
  [switch]$Uninstall,
  [switch]$Interactive,
  [switch]$AsCurrentUser
)

# install-lora-dataset-refresh-task.ps1 - durable WEEKLY cron that keeps the
# Obsidian-vault LoRA training datasets fresh (scripts/refresh-lora-vault-datasets.mjs).
#
# WHY (verified 2026-06-21, slot:zulu knowledge-substrate audit). The vault->model
# loops compound on a schedule for the GNN (vault-to-gnn-refpool is a pre-retrain
# stage in nn-graph-retrain-lifecycle, run by "PRISM NN-Graph Retrain") and for
# tribal (74k index, 11 Galaxy-Mine crons). But the LoRA dataset FEEDERS
# (vault-to-lora-dataset 3 sources + vault-wiki-to-lora-dataset + vault-lessons-
# to-lora-dataset -- india's actively-growing set) had NO cron: the Alpaca pairs
# only refreshed on a manual run, so new feedback/synthesis/wiki/lesson memories
# did not reach the training corpus until someone rebuilt it by hand. This task
# closes the SAFE half of that loop: a $0, no-GPU, idempotent weekly refresh so
# india's fine-tuning input is always current.
#
# THE TRAIN HALF IS NOT WIRED HERE. Whether a doctrine-LoRA train cycle should
# CONSUME these refreshed jsonl files (cadence, GPU, eval-gate, base model) is
# india's LoRA-pipeline decision -- routed to india via the chat bus, not decided
# by this installer. This task only refreshes the DATASET (text scan + JSONL
# write); it never trains, never touches the GPU.
#
# COORDINATED per hermes-zulu grant B-1 (backend dev incl LoRA, coordinate w/
# india). A bounded weekly batch (not a daemon): one off-minute Weekly trigger
# (Sunday 03:47 avoids :00/:30 fleet collisions) + AtLogOn. Per
# [[feedback_never_delete_only_disable]]: REGISTER + UNREGISTER supported;
# intermediate pause is Disable-ScheduledTask (not -Uninstall).

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell - (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Canonical main-tree path - never a worktree (the task must not dangle).
$refreshScript = 'H:\PRISM\scripts\refresh-lora-vault-datasets.mjs'

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

if (-not (Test-Path $refreshScript)) {
  throw "Refresh harness not found: $refreshScript (run on the PRISM host with H:\PRISM present, scripts/refresh-lora-vault-datasets.mjs committed)."
}

# Sanity: confirm the script is the LoRA refresh harness (defensive against a typo).
$head = Get-Content $refreshScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'refresh-lora-vault-datasets') -and ($head -match 'vault-to-lora'))) {
  throw "Refusing to install: $refreshScript does not look like refresh-lora-vault-datasets.mjs (missing header markers). Ensure it is the committed version (HEAD)."
}

# The harness always refreshes every feeder; no flags needed.
$refreshArgs = "`"$refreshScript`""
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $refreshArgs -WorkingDirectory 'H:\PRISM'

# Weekly off-minute + AtLogOn. The feedback/wiki/lesson corpora do not churn fast;
# once a week keeps the datasets fresh as the fleet ships, bounding cost.
$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $Time
$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$trigger = @($weeklyTrigger, $logonTrigger)

# Bounded batch (15 min ceiling - the wiki-domain scan is the slowest; the live
# run wrote ~3,600 pairs in well under that). IgnoreNew so an overrun never
# double-starts.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -RestartCount 2 `
  -RestartInterval (New-TimeSpan -Minutes 2) `
  -MultipleInstances IgnoreNew

# Principal - SYSTEM default (runs whether-logged-on-or-not, no UAC). The harness
# only reads the vault + writes JSONL datasets; no network, no GPU.
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

$desc = "Weekly PRISM LoRA dataset refresh (refresh-lora-vault-datasets.mjs). Re-runs every vault->LoRA feeder (feedback/galaxy-synthesis/galaxy-ai-synergy/wiki-domain/lessons) so the Alpaca training datasets in state/shared/lora/ stay current with new feedback/wiki/lesson memories. \$0, no GPU, idempotent; refreshes the DATASET only -- it does NOT train (the train cycle is india's LoRA-pipeline decision)."

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
Write-Host "Registered: $TaskName ($autonomy, refresh-lora-vault-datasets.mjs, weekly $DayOfWeek $Time + AtLogOn, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 8
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult). Verify: state/shared/lora/*.jsonl mtimes (vault-feedback-dataset.jsonl et al.)."
}

Write-Host ""
Write-Host "Uninstall: -Uninstall   Pause: Disable-ScheduledTask -TaskName '$TaskName'"
