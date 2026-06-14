# =====================================================================
# PRISM System Health 02 - Kill leaked TypeScript servers + node zombies
# =====================================================================
# Problem: tsserver.js holds the entire PRISM codebase (3000+ engines)
#   in memory. After hours of editing it leaks past 3 GB. VS Code,
#   Cursor, Windsurf all spawn their own instance per workspace.
#   Multiple stale instances = several GB of phantom commit.
#
# Safe to kill: VS Code/Cursor automatically respawn tsserver on next
#   keystroke or save. You lose ~5 sec re-index, no data loss.
#
# Also targets: node.exe orphans older than 60 min that are NOT children
#   of an active claude.exe (those are leaked MCP/playwright launchers).
# =====================================================================

param(
  [int]$MinAgeMinutes = 60,
  [int]$MinMemoryMB = 200,
  # Runaway override: a language-server-class node proc this large is a leak by
  # definition (the codebase index is ~3GB), so kill it past a SHORT age floor
  # even if it is under $MinAgeMinutes -- this is what lets a fresh 12GB tsserver
  # pile-up get reaped before commit maxes out. (2026-06-10 root-cause fix)
  [int]$RunawayMB = 3000,
  [int]$RunawayAgeMinutes = 20,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

Write-Host "=== PRISM Node Zombie Reaper ===" -ForegroundColor Cyan
Write-Host "Targeting: tsserver + dist/index.js + playwright launchers older than $MinAgeMinutes min" -ForegroundColor Yellow
if ($DryRun) { Write-Host "[DRY RUN - nothing will be killed]" -ForegroundColor Magenta }
Write-Host ""

# Build kill list.
# PERF (2026-06-10): pull ALL node command lines in ONE CIM query instead of a
# per-process Get-CimInstance (N WMI round-trips). Under the process pressure this
# script runs in (70+ node procs) the per-proc form ran long enough to blow the
# auto-relief task's ZombieCapSec timeout -> the run was tree-killed mid-scan and
# reclaimed nothing (the "ran but couldn't clear headroom" symptom).
$cmdById = @{}
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
  $cmdById[[int]$_.ProcessId] = $_.CommandLine
}

$candidates = Get-Process node -ErrorAction SilentlyContinue | ForEach-Object {
  $proc = $_
  $cmd = $cmdById[[int]$proc.Id]
  $ageMin = if ($proc.StartTime) { [math]::Round((New-TimeSpan -Start $proc.StartTime -End (Get-Date)).TotalMinutes, 0) } else { 0 }
  $pmMB = [math]::Round($proc.PrivateMemorySize64/1MB, 0)

  $reason = $null
  # Runaway override (2026-06-10): a language-server-class proc this large is a leak
  # by definition (this script's own premise: tsserver "leaks past 3 GB"). Kill it
  # past a SHORT age floor even if under $MinAgeMinutes, so a fresh runaway gets
  # reaped before commit maxes out. $RunawayMB is high enough (3GB) that a normal
  # actively-edited tsserver is spared (golf 2026-06-08: don't hurt active sessions).
  if ($cmd -match 'tsserver|typingsInstaller|typescript-language-server' -and $pmMB -ge $RunawayMB -and $ageMin -ge $RunawayAgeMinutes) {
    $reason = "runaway language-server ($pmMB MB, ${ageMin}min)"
  }
  # typingsInstaller = TypeScript's background @types fetcher. It is transient by
  # design (not an active-edit server) so it is safe to reap at the normal floor;
  # the prior pattern list MISSED it entirely, leaking GBs of stale installers.
  elseif ($cmd -match 'tsserver\.js|typingsInstaller' -and $ageMin -ge $MinAgeMinutes) {
    $reason = "tsserver/typings leak ($pmMB MB, ${ageMin}min)"
  }
  elseif ($cmd -match 'dist[/\\]index\.js' -and $ageMin -ge $MinAgeMinutes -and $pmMB -ge $MinMemoryMB) {
    $reason = "stale MCP server ($pmMB MB, ${ageMin}min)"
  }
  elseif ($cmd -match '@playwright[/\\]mcp' -and $ageMin -ge $MinAgeMinutes) {
    $reason = "playwright MCP zombie ($pmMB MB, ${ageMin}min)"
  }
  elseif ($cmd -match 'typescript-language-server' -and $ageMin -ge $MinAgeMinutes) {
    $reason = "stale ts-language-server ($pmMB MB, ${ageMin}min)"
  }

  if ($reason) {
    [PSCustomObject]@{
      PID = $proc.Id
      PM_MB = $pmMB
      AgeMin = $ageMin
      Reason = $reason
      Cmd = if ($cmd) { $cmd.Substring(0, [Math]::Min(100, $cmd.Length)) } else { '' }
    }
  }
}

if (-not $candidates) {
  Write-Host "No zombies found. System is clean." -ForegroundColor Green
  exit 0
}

$totalReclaim = ($candidates | Measure-Object PM_MB -Sum).Sum
Write-Host "Found $($candidates.Count) zombie(s), $totalReclaim MB to reclaim:" -ForegroundColor Yellow
$candidates | Format-Table -AutoSize -Wrap

if ($DryRun) {
  Write-Host "[DRY RUN] Re-run without -DryRun to actually kill." -ForegroundColor Magenta
  exit 0
}

foreach ($c in $candidates) {
  try {
    Stop-Process -Id $c.PID -Force -ErrorAction Stop
    Write-Host "  killed PID $($c.PID) ($($c.PM_MB) MB) - $($c.Reason)" -ForegroundColor Green
  } catch {
    Write-Host "  FAILED to kill PID $($c.PID): $_" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Reclaimed approximately $totalReclaim MB private memory." -ForegroundColor Cyan
Write-Host "VS Code/Cursor will respawn tsserver automatically on next file save."
