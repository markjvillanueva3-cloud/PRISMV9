param(
  [string]$TaskName = 'PRISM H-Drive Vault Indexer',
  # Daily at this local time. Off-the-hour (4:17) so it doesn't phase-lock onto
  # the :00 host-task cluster. The full re-walk + re-categorize + sidecar reindex
  # takes a few minutes; 4:17am is off-peak.
  [string]$At = '4:17AM',
  # Per-domain walk cap for the unattended run -- higher than an interactive
  # session uses (default 20000) so overnight counts are more accurate. Domains
  # over the cap are honestly flagged truncated in the coverage map.
  [int]$MaxFiles = 40000,
  [switch]$DryRun,
  [switch]$RunNow,
  [switch]$Uninstall,
  # Legacy: register with NO principal -> "Interactive only" (dies at logoff).
  # Default (OFF) hardens to S4U so the indexer runs whether-logged-on-or-not.
  [switch]$Interactive,
  # Strongest principal: SYSTEM. The indexer only READS the tree + WRITES vault
  # notes under H:; S4U (installing user) is sufficient. SYSTEM is opt-in.
  [switch]$AsSystem
)

# install-h-drive-vault-task.ps1 -- durable cron backbone for the H-drive ->
# Obsidian vault categorization layer (scripts/h-drive-to-vault.mjs,
# H-DRIVE-VAULT-SYNERGY/U-2, slot:papa).
#
# Why a daily task: the H-drive codebase changes throughout the day (new
# engines, scripts, corpus). h-drive-to-vault.mjs re-walks H:/ top-level +
# H:/prism subdirs, re-categorizes every folder via the taxonomy SSOT, refreshes
# the per-domain vault index notes + the master state/shared/H-DRIVE-COVERAGE
# map, and (with --reindex) rebuilds the searchable memory sidecar so the 2nd
# brain stays current without manual runs. Idempotent: a re-run overwrites the
# same notes/map, never duplicates.
#
# Independence invariant: S4U principal + a daily trigger + RestartCount 3 means
# the indexer survives every claude session closing and every reboot. It is the
# freshness layer for the brain's whole-drive coverage -- never gated by any
# single chat. Sister task to "PRISM Fleet Memory Monitor"
# (install-fleet-memory-monitor-task.ps1) -- same pattern, different question:
# that one watches LIVE memory pressure, this one keeps the static coverage map
# fresh.
#
# Per [[feedback_never_delete_only_disable]]: this REGISTERS a task; pause with
# Disable-ScheduledTask, remove with -Uninstall. Memory:
# [[reference_papa_hdrive_vault_synergy_2026_06_14]].

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $isAdmin) {
  throw "Run from an ELEVATED PowerShell -- (un)registering the scheduled task '$TaskName' needs admin rights."
}

# Always target the canonical main tree, never a worktree (a worktree's scripts/
# can be removed; the host-level task must not dangle).
$indexScript = 'H:\PRISM\scripts\h-drive-to-vault.mjs'

# Prefer the portable node; fall back to Program Files then PATH. Mirrors
# install-fleet-memory-monitor-task.ps1:67-71 -- keep in sync.
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

if (-not (Test-Path $indexScript)) {
  throw "Indexer not found: $indexScript (run on the PRISM host with H:\PRISM present, and ensure scripts/h-drive-to-vault.mjs is committed)."
}

# Sanity: confirm the script is the one we expect and understands --max-files +
# --reindex. A future rename would otherwise break the task silently (the task
# would report success while the indexer no-op'd or errored).
$head = Get-Content $indexScript -TotalCount 60 -ErrorAction SilentlyContinue
if (-not (($head -match 'h-drive-to-vault') -and ($head -match '--max-files') -and ($head -match '--reindex'))) {
  throw "Refusing to install: $indexScript does not look like h-drive-to-vault.mjs (missing header / --max-files / --reindex)."
}

$idxArgs = if ($DryRun) {
  "`"$indexScript`" --dry-run --max-files $MaxFiles"
} else {
  "`"$indexScript`" --max-files $MaxFiles --reindex"
}
$action = New-ScheduledTaskAction -Execute $nodeExe -Argument $idxArgs

# Two triggers: the daily run + an AtStartup trigger so a reboot refreshes
# coverage on the next boot if a daily run was missed. StartWhenAvailable
# catches up a daily run the machine slept through.
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At $At
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$trigger = @($dailyTrigger, $startupTrigger)

# ExecutionTimeLimit 30m: a full re-walk of H:/ + H:/prism at --max-files 40000
# plus the sidecar rebuild is minutes, not seconds; 30m is generous headroom.
# MultipleInstances IgnoreNew so a slow run never piles on. RestartCount self-heals.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

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

$desc = "Daily H-drive -> Obsidian vault categorization indexer (h-drive-to-vault.mjs --max-files $MaxFiles --reindex$(if ($DryRun) { ' --dry-run [BURN-IN]' })). Re-walks H:/ top-level + H:/prism subdirs, re-categorizes every folder via the taxonomy SSOT, refreshes per-domain vault index notes + the master state/shared/H-DRIVE-COVERAGE map, and rebuilds the memory sidecar so the 2nd brain stays current. Idempotent, advisory (writes vault notes only, never deletes). Runs whether-logged-on (S4U) + at boot. H-DRIVE-VAULT-SYNERGY/U-2, slot:papa."

# Splat so -Principal is omitted entirely in legacy -Interactive mode (passing
# -Principal `$null throws; an absent key is the correct form).
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

$mode = if ($DryRun) { 'DRY-RUN burn-in (no note/map writes)' } else { 'live' }
$autonomy = if ($Interactive) {
  'INTERACTIVE-ONLY (legacy -- dies when you log off)'
} elseif ($AsSystem) {
  'AUTONOMOUS as SYSTEM (runs at boot + whether-logged-on-or-not)'
} else {
  'AUTONOMOUS as S4U (runs at boot + whether-logged-on-or-not)'
}
Write-Host "Registered: $TaskName ($mode, $autonomy, h-drive-to-vault.mjs, daily @ $At + AtStartup, --max-files $MaxFiles, node=$nodeExe)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  # The indexer takes minutes; LastTaskResult reads 267009 (0x41301) while running.
  $deadline = (Get-Date).AddMinutes(10)
  do {
    Start-Sleep -Seconds 5
    $info = Get-ScheduledTaskInfo -TaskName $TaskName
  } while ($info.LastTaskResult -eq 267009 -and (Get-Date) -lt $deadline)
  if ($info.LastTaskResult -eq 267009) {
    Write-Host "Triggered immediate run -- still running after 10m (LastTaskResult=267009; check the coverage map mtime)."
  } else {
    Write-Host "Triggered immediate run. LastTaskResult=$($info.LastTaskResult) (0 = success)."
  }
}

Write-Host ""
Write-Host "Knobs (env, read by the indexer):"
Write-Host "  PRISM_HDRIVE_VAULT_FROZEN_TIME=<iso>   pin generatedAt for diff-stable output"
Write-Host ""
Write-Host "Verify registered:           schtasks /Query /TN '$TaskName'"
Write-Host "Read coverage map:           Get-Content H:/PRISM/state/shared/H-DRIVE-COVERAGE.md -TotalCount 12"
Write-Host "Run once by hand:            & '$nodeExe' '$indexScript' --max-files $MaxFiles --reindex"
Write-Host "Pause without uninstalling:  Disable-ScheduledTask -TaskName '$TaskName'"
Write-Host "Uninstall:                   & '$PSScriptRoot\install-h-drive-vault-task.ps1' -Uninstall"
