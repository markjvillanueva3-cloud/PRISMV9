# conhost-orphan-janitor.ps1 -- fleet-hygiene (slot:golf)
#
# WHY: On this Windows host the Claude Code harness launches ~284 hooks/turn via the
# extensionless `H:/.claude/bin/portable-node` shim (a bash script). Across the active
# fleet that spawns a storm of console-host (conhost.exe) windows that ORPHAN when their
# short-lived parent exits -- leftover windows pile up over the user's other apps.
# Creation is in the harness spawn path (not patchable from PRISM code), so we close the
# orphans as fast as they appear.
#
# SAFETY: ONLY closes conhost.exe whose parent process is NOT alive AND that is older than
# MinAgeSec (avoids racing a just-born conhost mid-wire to a live parent). A conhost with a
# LIVE parent (= a real, in-use terminal/MCP/hook) is NEVER touched. Single persistent
# process; native Get-CimInstance enumeration (no per-tick child spawns).
#
# KILL SWITCH: set env PRISM_CONHOST_JANITOR_DISABLE=1 (checked each tick -> clean exit).
# SINGLETON: a global mutex prevents two janitors running at once.

param(
  [int]$IntervalMs = $(if ($env:PRISM_CONHOST_JANITOR_INTERVAL_MS) { [int]$env:PRISM_CONHOST_JANITOR_INTERVAL_MS } else { 1500 }),
  [int]$MinAgeSec  = $(if ($env:PRISM_CONHOST_JANITOR_MIN_AGE_SEC) { [int]$env:PRISM_CONHOST_JANITOR_MIN_AGE_SEC } else { 2 })
)

$ErrorActionPreference = 'SilentlyContinue'
$logPath = 'H:\prism\state\shared\conhost-janitor.log'

# Singleton guard
$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, 'Global\PRISM_CONHOST_ORPHAN_JANITOR', [ref]$createdNew)
if (-not $createdNew) { return }

function Log([string]$msg) {
  try {
    $line = ('{0}  {1}' -f (Get-Date).ToString('s'), $msg)
    Add-Content -Path $logPath -Value $line -Encoding utf8
  } catch {}
}

Log "janitor START intervalMs=$IntervalMs minAgeSec=$MinAgeSec pid=$PID"
$totalClosed = 0

while ($true) {
  if ($env:PRISM_CONHOST_JANITOR_DISABLE -eq '1' -or $env:PRISM_FLEET_REAPER_DISABLE -eq '1') {
    Log "kill-switch set -- exiting (totalClosed=$totalClosed)"; break
  }
  try {
    $livePids = @{}
    foreach ($p in (Get-Process -ErrorAction SilentlyContinue)) { $livePids[[int]$p.Id] = $true }
    $now = Get-Date
    $conhosts = Get-CimInstance Win32_Process -Filter "Name='conhost.exe'" -ErrorAction SilentlyContinue
    $closed = 0
    foreach ($c in $conhosts) {
      $ppid = [int]$c.ParentProcessId
      if ($livePids[$ppid]) { continue }                       # live parent -> real window, never touch
      $ageSec = ($now - $c.CreationDate).TotalSeconds
      if ($ageSec -lt $MinAgeSec) { continue }                 # too young -> may be mid-wire to a live parent
      try { Stop-Process -Id $c.ProcessId -Force -ErrorAction Stop; $closed++ } catch {}
    }
    if ($closed -gt 0) { $totalClosed += $closed; Log "closed=$closed totalClosed=$totalClosed" }
  } catch {}
  Start-Sleep -Milliseconds $IntervalMs
}
$mutex.ReleaseMutex() 2>$null
