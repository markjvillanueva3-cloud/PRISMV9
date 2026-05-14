# RAM + Orphan Process Monitor (session-bound)
# Runs every 180s. Emits status only on:
#   - memory >85%
#   - any process killed
#   - 15-min heartbeat tick
#
# Kills:
#   - long-lived orphan bash (>30 min) — current bash.exe processes
#   - long-running git (>10 min) — usually hung clone/push
#   - delegates node reaping to PRISM janitor (--full)
#
# Logs to state/shared/ram-orphan-monitor.log for after-the-fact audit.

$ErrorActionPreference = "SilentlyContinue"

$nodeExe   = "H:\Tools\nodejs\node.exe"
$janitor   = "H:\prism\mcp-server\scripts\node-process-janitor.mjs"
$logPath   = "H:\prism\state\shared\ram-orphan-monitor.log"
$myPid     = $PID
$tickCount = 0

# Best-effort log header (don't fail the monitor if log dir missing)
try {
  Add-Content -Path $logPath -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] monitor-start pid=$myPid" -ErrorAction SilentlyContinue
} catch {}

while ($true) {
  $tickCount++
  $ts = Get-Date -Format "HH:mm:ss"

  # Memory %
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
  if ($os) {
    $memUsedPct = [math]::Round(100 - ($os.FreePhysicalMemory * 100 / $os.TotalVisibleMemorySize), 1)
  } else {
    $memUsedPct = -1
  }

  $killedBash = 0
  $killedGit  = 0
  $janitorOut = ""

  # 1) PRISM node janitor (battle-tested — handles MCP-orphans + zombie nodes safely)
  if ((Test-Path $janitor) -and (Test-Path $nodeExe)) {
    try {
      $janitorRaw = & $nodeExe $janitor --full 2>&1 | Out-String
      $janitorOut = ($janitorRaw -replace "\s+", " ").Trim()
      if ($janitorOut.Length -gt 160) { $janitorOut = $janitorOut.Substring(0, 160) + "..." }
    } catch {
      $janitorOut = "janitor-err:$($_.Exception.Message)"
    }
  }

  # 2) Kill bash processes >30 min old (skip self)
  $bashes = Get-Process -Name bash -ErrorAction SilentlyContinue
  foreach ($p in $bashes) {
    if ($p.Id -eq $myPid) { continue }
    try {
      $age = (Get-Date) - $p.StartTime
      if ($age.TotalMinutes -gt 30) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $killedBash++
      }
    } catch {}
  }

  # 3) Kill git processes >10 min old (hung clone/push)
  $gits = Get-Process -Name git -ErrorAction SilentlyContinue
  foreach ($p in $gits) {
    try {
      $age = (Get-Date) - $p.StartTime
      if ($age.TotalMinutes -gt 10) {
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
        $killedGit++
      }
    } catch {}
  }

  $nodeCount = (Get-Process -Name node -ErrorAction SilentlyContinue).Count
  $bashCount = (Get-Process -Name bash -ErrorAction SilentlyContinue).Count
  $gitCount  = (Get-Process -Name git  -ErrorAction SilentlyContinue).Count

  $anyKilled = ($killedBash + $killedGit) -gt 0
  $memHigh   = $memUsedPct -gt 85
  $heartbeat = ($tickCount % 5 -eq 0)  # ~every 15 min at 3-min cycle

  if ($memHigh -or $anyKilled -or $heartbeat) {
    $level = if ($memHigh) { "WARN" } elseif ($anyKilled) { "REAP" } else { "hb" }
    $line = "[$ts] $level mem=${memUsedPct}% node=$nodeCount bash=$bashCount git=$gitCount killed{bash=$killedBash,git=$killedGit}"
    if ($janitorOut.Length -gt 0 -and ($anyKilled -or $memHigh)) {
      $line += " janitor='$janitorOut'"
    }
    Write-Output $line
    try { Add-Content -Path $logPath -Value $line -ErrorAction SilentlyContinue } catch {}
  } else {
    # Silent tick — still log to disk for forensics
    try { Add-Content -Path $logPath -Value "[$ts] silent mem=${memUsedPct}% node=$nodeCount bash=$bashCount git=$gitCount" -ErrorAction SilentlyContinue } catch {}
  }

  Start-Sleep -Seconds 180
}
