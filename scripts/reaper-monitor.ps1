#!/usr/bin/env pwsh
# reaper-monitor.ps1 — single-cycle reaper for the Monitor loop.
# Echoes "CLEANUP <reasons>" only when something was actioned/alerted.
# (a) bash.exe >30min idle (empty MainWindowTitle)
# (b) node.exe >30min, NOT bound to TCP 3100, WS<500MB
# (c) stale H:\prism\.git\index.lock >300s
# (d) RAM <15% free
# (e) H: <20GB free
$ErrorActionPreference = "Continue"
$reasons = @()
$now = Get-Date

try {
  Get-Process bash -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -eq "" -and ($now - $_.StartTime).TotalMinutes -gt 30
  } | ForEach-Object {
    try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $reasons += "bash:$($_.Id)" } catch {}
  }
} catch {}

try {
  $port3100Pids = @((Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue).OwningProcess)
  Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $port3100Pids -notcontains $_.Id -and ($now - $_.StartTime).TotalMinutes -gt 30 -and $_.WS -lt 500MB
  } | ForEach-Object {
    try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $reasons += "node:$($_.Id)" } catch {}
  }
} catch {}

try {
  $lock = "H:\prism\.git\index.lock"
  if (Test-Path $lock) {
    $age = [Math]::Round(($now - (Get-Item $lock).LastWriteTime).TotalSeconds, 0)
    if ($age -gt 300) {
      Remove-Item $lock -Force -ErrorAction SilentlyContinue
      $reasons += "lock:${age}s"
    }
  }
} catch {}

try {
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
  if ($os) {
    $ramPct = [Math]::Round(($os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100, 1)
    if ($ramPct -lt 15) { $reasons += "RAM:${ramPct}%" }
  }
} catch {}

try {
  $h = Get-PSDrive H -ErrorAction SilentlyContinue
  if ($h) {
    $hGB = [Math]::Round($h.Free / 1GB, 1)
    if ($hGB -lt 20) { $reasons += "H:${hGB}GB" }
  }
} catch {}

if ($reasons.Count -gt 0) { Write-Output "CLEANUP $($reasons -join '; ')" }
