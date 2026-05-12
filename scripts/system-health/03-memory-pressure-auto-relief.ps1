param(
  [int]$LightThresholdPct = 85,
  [int]$MediumThresholdPct = 92,
  [int]$HeavyThresholdPct = 97,
  [string]$LogPath = 'H:\prism\.cache\memory-pressure-log.jsonl',
  [int]$LogMaxLines = 500,
  [switch]$DryRun
)

# 03-memory-pressure-auto-relief.ps1 — automated memory-pressure relief.
#
# Runs every 5 minutes via the "PRISM Memory Pressure Auto-Relief" Windows
# Scheduled Task (install via install-memory-pressure-task.ps1). Cheap when
# memory is OK (~50ms — one Win32_OS query then exit). When memory crosses
# a threshold, escalates relief actions:
#
#   < $LightThresholdPct  : noop (log only if -DryRun)
#   < $MediumThresholdPct : run 02-kill-zombie-tsservers.ps1 (stale MCP +
#                          tsservers + playwright >60 min). Typical
#                          reclaim: 0.5–2 GB.
#   < $HeavyThresholdPct  : zombie-tsservers + node-process-janitor --full
#                          (reaps Git-for-Windows bash.exe wrappers, orphan
#                          @playwright/mcp / mcp-http-bridge, dead-parent
#                          MCP servers).
#   ≥ $HeavyThresholdPct  : above + dump top 10 processes by RSS to the log
#                          + emit a Windows toast (best-effort) so the
#                          operator sees it. Does NOT kill live processes
#                          unprovoked.
#
# Safety: never kills anything the existing scripts wouldn't already kill;
# this is just an automation wrapper that picks WHEN to invoke them.
#
# Log format (JSONL): {t, pct, action, reclaimedMB?, killed?}.
#
# Pause without uninstalling: Disable-ScheduledTask -TaskName 'PRISM Memory Pressure Auto-Relief'
# Uninstall:                   & '$PSScriptRoot\..\..\.claude\helpers\install-memory-pressure-task.ps1' -Uninstall

$ErrorActionPreference = 'Continue'  # Never throw — this task must be silent on errors

function Get-MemoryPct {
  try {
    $os = Get-CimInstance Win32_OperatingSystem
    $total = $os.TotalVisibleMemorySize
    $free  = $os.FreePhysicalMemory
    if ($total -le 0) { return @{ pct = 0; totalGB = 0; usedGB = 0 } }
    $pct = [math]::Round((($total - $free) / $total) * 100, 1)
    return @{
      pct = $pct
      totalGB = [math]::Round($total / 1MB, 2)
      usedGB  = [math]::Round(($total - $free) / 1MB, 2)
    }
  } catch {
    return @{ pct = 0; totalGB = 0; usedGB = 0 }
  }
}

function Append-Log {
  param([hashtable]$Entry)
  try {
    $logDir = Split-Path -Parent $LogPath
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    # Cap the log (keep last $LogMaxLines)
    if (Test-Path $LogPath) {
      $lines = Get-Content -Path $LogPath -ErrorAction SilentlyContinue
      if ($lines -and $lines.Count -ge $LogMaxLines) {
        $kept = $lines | Select-Object -Last ($LogMaxLines - 1)
        Set-Content -Path $LogPath -Value $kept -Encoding UTF8
      }
    }

    $Entry.t = (Get-Date).ToString('o')
    $json = $Entry | ConvertTo-Json -Compress
    Add-Content -Path $LogPath -Value $json -Encoding UTF8
  } catch { }
}

function Invoke-ZombieTsservers {
  $script = 'H:\prism\scripts\system-health\02-kill-zombie-tsservers.ps1'
  if (-not (Test-Path $script)) { return @{ reclaimedMB = 0; killed = 0; error = 'script_missing' } }
  $output = & $script 2>&1
  $reclaimed = 0
  $killed = 0
  foreach ($line in $output) {
    if ($line -match 'Reclaimed approximately (\d+) MB') { $reclaimed = [int]$Matches[1] }
    if ($line -match '^Found (\d+) zombie')              { $killed    = [int]$Matches[1] }
  }
  return @{ reclaimedMB = $reclaimed; killed = $killed }
}

function Invoke-NodeJanitor {
  $script = 'H:\prism\.claude\hooks\node-process-janitor.mjs'
  if (-not (Test-Path $script)) { return @{ ran = $false } }
  $nodeExe = $null
  foreach ($cand in @('H:\Tools\nodejs\node.exe', 'C:\Program Files\nodejs\node.exe')) {
    if (Test-Path $cand) { $nodeExe = $cand; break }
  }
  if (-not $nodeExe) { return @{ ran = $false; error = 'node_missing' } }
  try {
    & $nodeExe $script '--full' 2>&1 | Out-Null
    return @{ ran = $true }
  } catch {
    return @{ ran = $false; error = $_.Exception.Message }
  }
}

function Dump-TopProcs {
  try {
    Get-Process | Sort-Object WorkingSet64 -Descending |
      Select-Object -First 10 ProcessName, Id, @{N='RSS_MB';E={[int]($_.WorkingSet64/1MB)}} |
      ConvertTo-Json -Compress
  } catch { '[]' }
}

function Try-Toast {
  param([string]$Title, [string]$Body)
  # Best-effort Windows toast (silent failure if BurntToast not installed).
  try {
    if (Get-Module -ListAvailable -Name BurntToast -ErrorAction SilentlyContinue) {
      New-BurntToastNotification -Text $Title, $Body -ErrorAction SilentlyContinue
    }
  } catch { }
}

# ─── MAIN ───────────────────────────────────────────────────────────────
$mem = Get-MemoryPct
$pct = $mem.pct

if ($DryRun) {
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; totalGB = $mem.totalGB; action = 'dry_run' }
  Write-Host "DRY-RUN: memory $($mem.usedGB)/$($mem.totalGB) GB = $pct% — no action (dryrun)"
  return
}

if ($pct -lt $LightThresholdPct) {
  # Healthy — no action, no log spam.
  return
}

if ($pct -lt $MediumThresholdPct) {
  Write-Host "Memory $pct% > light threshold $LightThresholdPct% — running zombie-tsservers."
  $r = Invoke-ZombieTsservers
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'light'; reclaimedMB = $r.reclaimedMB; killed = $r.killed }
  return
}

if ($pct -lt $HeavyThresholdPct) {
  Write-Host "Memory $pct% > medium threshold $MediumThresholdPct% — zombie + janitor."
  $r1 = Invoke-ZombieTsservers
  $r2 = Invoke-NodeJanitor
  Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'medium'; reclaimedMB = $r1.reclaimedMB; killed = $r1.killed; janitorRan = $r2.ran }
  return
}

# ≥ heavy
Write-Host "Memory $pct% > heavy threshold $HeavyThresholdPct% — escalated relief."
$r1 = Invoke-ZombieTsservers
$r2 = Invoke-NodeJanitor
$topProcs = Dump-TopProcs
Try-Toast 'PRISM memory pressure' "$pct% used. Reaper ran. Top procs in log: $LogPath"
Append-Log @{ pct = $pct; usedGB = $mem.usedGB; action = 'heavy'; reclaimedMB = $r1.reclaimedMB; killed = $r1.killed; janitorRan = $r2.ran; topProcs = $topProcs }
