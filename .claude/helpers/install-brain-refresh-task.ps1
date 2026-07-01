param(
  [string]$TaskName = 'PRISM Brain Refresh',
  [int]$IntervalMinutes = 45,
  [switch]$AsCurrentUser,   # S4U (runs logged-on-or-not; needs elevation to register)
  [switch]$AsSystem,        # SYSTEM principal (needs elevation)
  [switch]$Uninstall,
  [switch]$RunNow
)

# install-brain-refresh-task.ps1 - durable scheduler for the PRISM Obsidian-brain refresh.
#
# WHY (slot:golf 2026-05-31): scripts/brain-refresh.mjs is the consolidated orchestrator for the
# brain's FIVE refresh pipelines (BM25 memory index, dense embeddings sidecar, tribal index,
# wiki->tribal embed, system-viz graph). Its own header names the disease: "all depend on a HUMAN
# to run them, so each silently rots between runs." It was wired NOWHERE (no task, not in
# settings.json) -> the dense-embeddings arm went 33h stale (recent memories BM25-reachable but
# dense-invisible). This task fires it on a wall-clock cadence so the brain stays fresh.
#
# SAFE TO FIRE OFTEN: brain-refresh self-throttles (PRISM_BRAIN_REFRESH_COOLDOWN_MS default 30m),
# is O_EXCL lock-serialized (never two concurrent writers), and benign-defers (exit 3) when Ollama
# is down. So a 45m repetition only ever does real work once per cooldown window.
#
# DEFAULT principal: current interactive user (NO elevation required) - runs while logged on, which
# is exactly when the fleet adds memories. Use -AsCurrentUser (S4U) or -AsSystem for runs-when-
# logged-off robustness (those need an elevated PowerShell). ASCII-only (PS 5.1 codepage safe).

$ErrorActionPreference = 'Stop'

if ($Uninstall) {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Unregistered: $TaskName"
  } else { Write-Host "Not found (already uninstalled): $TaskName" }
  return
}

$refreshScript = 'H:\PRISM\scripts\brain-refresh.mjs'
if (-not (Test-Path $refreshScript)) { throw "Not found: $refreshScript (run on the PRISM host)." }

$node = $null
foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
  if (Test-Path $cand) { $node = $cand; break }
}
if (-not $node) { $node = (Get-Command node -ErrorAction Stop).Source }

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$refreshScript`"" -WorkingDirectory 'H:\PRISM'

# -Once + RepetitionInterval = fire every N minutes indefinitely. brain-refresh's internal cooldown
# gates real work, so a tight interval just guarantees freshness without wasted runs.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

# ExecutionTimeLimit 30m: brain-refresh is a periodic BATCH (re-embed + tribal + viz), not a
# forever-loop - cap it so a wedged step never lingers. RestartCount handles a crashed run.
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
  -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) `
  -MultipleInstances IgnoreNew

$desc = "Keeps the PRISM Obsidian brain fresh: runs scripts/brain-refresh.mjs (the 5-pipeline refresh orchestrator). Self-throttled 30m, O_EXCL lock-serialized, benign-defers when Ollama down. Closes the silent-rot gap that left the dense-embeddings arm 33h stale. slot:golf."

# Principal: only attach one for the elevated variants. Default = current interactive user (no
# -Principal => registers in the caller's context, no elevation needed).
$principal = $null
if ($AsSystem) {
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
} elseif ($AsCurrentUser) {
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
}

$params = @{ TaskName = $TaskName; Action = $action; Trigger = $trigger; Settings = $settings; Description = $desc; Force = $true }
if ($principal) { $params['Principal'] = $principal }
Register-ScheduledTask @params | Out-Null

$mode = if ($AsSystem) { 'SYSTEM (logged-off-capable, no UAC)' } elseif ($AsCurrentUser) { 'S4U/current-user (logged-off-capable)' } else { 'current interactive user (runs while logged on)' }
Write-Host "Registered: $TaskName (every $IntervalMinutes min, $mode, node=$node)"

if ($RunNow) {
  Start-ScheduledTask -TaskName $TaskName
  Start-Sleep -Seconds 3
  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  Write-Host "Triggered now. LastTaskResult=$($info.LastTaskResult) (0=clean, 3=Ollama-deferred/benign)"
}

Write-Host ""
Write-Host "Knobs (env, read by brain-refresh.mjs):"
Write-Host "  PRISM_BRAIN_REFRESH_DISABLE=1        kill switch (orchestrator exits immediately)"
Write-Host "  PRISM_BRAIN_REFRESH_COOLDOWN_MS=N    throttle window (default 1800000 = 30m)"
Write-Host "Verify:    schtasks /Query /TN '$TaskName'"
Write-Host "Dry-run:   & '$node' '$refreshScript' --dry-run"
Write-Host "Uninstall: & '$PSScriptRoot\install-brain-refresh-task.ps1' -Uninstall"
