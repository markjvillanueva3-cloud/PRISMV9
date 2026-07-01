# H:/prism/scripts/reaper-tick.ps1
# One cycle of the in-session reaper. Emits AT MOST one stdout line per call.
# Driven by an external loop (Monitor tool / scheduled task) that supplies -Cycle.
#
# Targets (action-only emit):
#   1. node.exe >30 min old, NOT bound to TCP 3100 (MCP server), <500MB working set
#   2. bash.exe >30 min old, empty MainWindowTitle (orphan shell)
#   3. H:\prism\.git\index.lock >300s stale
#   4. RAM <15% free  (alert only — no kill)
#   5. H: drive <20GB free  (alert only — no kill)
#
# Heartbeat: every 5th cycle, emit a clean heartbeat so the operator can confirm liveness.
# Silent cycles in between (no notification = no log noise).

[CmdletBinding()]
param(
  [int]$Cycle = 0
)

$ErrorActionPreference = 'SilentlyContinue'
$reasons = @()
$now = Get-Date

# ---------------------------------------------------------------------------
# 1. Identify MCP server PIDs (TCP 3100 owners — these are LOAD-BEARING, never reap)
# ---------------------------------------------------------------------------
$mcpPids = @()
try {
  $mcpPids = @(Get-NetTCPConnection -LocalPort 3100 |
    Where-Object { $_.State -eq 'Listen' } |
    Select-Object -ExpandProperty OwningProcess -Unique)
} catch {
  # Get-NetTCPConnection can fail on locked-down hosts — leave mcpPids empty and
  # fall back to the working-set guard, which keeps any node >500MB safe regardless.
}

# ---------------------------------------------------------------------------
# 2. Reap stale node.exe (only when StartTime resolves; skip system / inaccessible)
# ---------------------------------------------------------------------------
$staleNode = @()
foreach ($p in (Get-Process node)) {
  try {
    if ($p.StartTime -lt $now.AddMinutes(-30) `
        -and $p.WorkingSet64 -lt 500MB `
        -and ($mcpPids -notcontains $p.Id)) {
      $staleNode += $p
    }
  } catch {
    # StartTime throws on processes we can't open — ignore those.
  }
}
if ($staleNode.Count -gt 0) {
  $killedNodeCount = 0
  foreach ($p in $staleNode) {
    try { Stop-Process -Id $p.Id -Force; $killedNodeCount++ } catch { }
  }
  if ($killedNodeCount -gt 0) {
    $reasons += "killed-$killedNodeCount-stale-node"
  }
}

# ---------------------------------------------------------------------------
# 3. Reap stale bash.exe (cygwin shells with no window — almost always orphans)
# ---------------------------------------------------------------------------
$staleBash = @()
foreach ($p in (Get-Process bash)) {
  try {
    if ($p.StartTime -lt $now.AddMinutes(-30) `
        -and [string]::IsNullOrEmpty($p.MainWindowTitle)) {
      $staleBash += $p
    }
  } catch { }
}
if ($staleBash.Count -gt 0) {
  $killedBashCount = 0
  foreach ($p in $staleBash) {
    try { Stop-Process -Id $p.Id -Force; $killedBashCount++ } catch { }
  }
  if ($killedBashCount -gt 0) {
    $reasons += "killed-$killedBashCount-stale-bash"
  }
}

# ---------------------------------------------------------------------------
# 4. Sweep stale git index.lock (>300s — leftover from crashed git proc)
# ---------------------------------------------------------------------------
$lock = 'H:\prism\.git\index.lock'
if (Test-Path $lock) {
  try {
    $age = [int]($now - (Get-Item $lock).LastWriteTime).TotalSeconds
    if ($age -gt 300) {
      Remove-Item $lock -Force
      $reasons += "removed-index-lock-${age}s"
    }
  } catch { }
}

# ---------------------------------------------------------------------------
# 5. RAM alert (no kill — operator action required)
# ---------------------------------------------------------------------------
try {
  $os = Get-CimInstance Win32_OperatingSystem
  $ramPct = [math]::Round(($os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100, 1)
  if ($ramPct -lt 15) {
    $reasons += "RAM-${ramPct}pct-free"
  }
} catch { }

# ---------------------------------------------------------------------------
# 6. H: disk alert
# ---------------------------------------------------------------------------
try {
  $h = Get-PSDrive H
  if ($h) {
    $freeGB = [math]::Round($h.Free / 1GB, 1)
    if ($freeGB -lt 20) {
      $reasons += "H-${freeGB}GB-free"
    }
  }
} catch { }

# ---------------------------------------------------------------------------
# Emit (one line max per cycle)
# ---------------------------------------------------------------------------
if ($reasons.Count -gt 0) {
  Write-Host "[reaper c=$Cycle] CLEANUP $($reasons -join ' ')"
} elseif ($Cycle -gt 0 -and ($Cycle % 5) -eq 0) {
  $hbRam = ''
  try {
    $os2 = Get-CimInstance Win32_OperatingSystem
    $rp = [math]::Round(($os2.FreePhysicalMemory / $os2.TotalVisibleMemorySize) * 100, 1)
    $hbRam = " ram=${rp}%"
  } catch { }
  $hbDisk = ''
  try {
    $h2 = Get-PSDrive H
    if ($h2) {
      $fg = [math]::Round($h2.Free / 1GB, 1)
      $hbDisk = " h=${fg}gb"
    }
  } catch { }
  Write-Host "[reaper c=$Cycle] heartbeat clean$hbRam$hbDisk"
}
# else: silent — no log noise on idle cycles
