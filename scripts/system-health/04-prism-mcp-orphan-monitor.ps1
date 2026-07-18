# PRISM MCP Orphan Monitor — kills orphan dist/index.js MCP servers + stale git locks.
#
# What it does:
#   1. Reports system memory (used %, free MB, total MB)
#   2. Reaps PRISM MCP node.exe running `dist/index.js` where ParentProcessId is dead
#      (age > MinAgeSec — protects fresh spawns).
#   3. Optionally sweeps stale .git/index.lock files (older than 60s).
#   4. Emits a one-line summary safe for cron consumption.
#
# Designed to complement (NOT replace):
#   - node-process-janitor.mjs (kills stale .claude/hooks node+bash; protects dist/index.js)
#   - stop_close_prism_nodes_v2.mjs (kills git.exe/node.exe with .claude/hooks cmdline + dead parent)
#   - helpers/node-orphan-cleaner.mjs (kills transient testing nodes; KEEP_PATTERNS protects dist/index.js)
#
# Those three explicitly protect dist/index.js — this script handles the gap:
# dist/index.js MCP servers whose parent process is dead (orphans from terminated chats).
#
# Exit code always 0 (best-effort). Logs to H:/prism/state/shared/mcp-orphan-monitor.log.

param(
  [int]$MinAgeSec = 120,
  [int]$GitLockMaxAgeSec = 60,
  [switch]$DryRun,
  [switch]$Verbose
)

$ErrorActionPreference = 'SilentlyContinue'
$logPath = 'H:/prism/state/shared/mcp-orphan-monitor.log'
$jsonlPath = 'H:/prism/state/shared/mcp-orphan-monitor.jsonl'

function Write-Log($msg) {
  try {
    $ts = (Get-Date).ToString('o')
    Add-Content -Path $logPath -Value "[$ts] $msg"
  } catch {}
}

function Write-Event($obj) {
  try {
    $obj | Add-Member -NotePropertyName ts -NotePropertyValue ((Get-Date).ToString('o')) -Force
    $line = $obj | ConvertTo-Json -Compress -Depth 4
    Add-Content -Path $jsonlPath -Value $line
  } catch {}
}

# ---------- Memory snapshot ----------
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$totalMB = if ($os) { [math]::Round($os.TotalVisibleMemorySize / 1024) } else { 0 }
$freeMB  = if ($os) { [math]::Round($os.FreePhysicalMemory / 1024) } else { 0 }
$usedMB  = $totalMB - $freeMB
$usedPct = if ($totalMB -gt 0) { [math]::Round(($usedMB / $totalMB) * 100, 1) } else { 0 }

# ---------- Process snapshot ----------
$procs = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
$alivePids = @{}
foreach ($p in $procs) { $alivePids[[int]$p.ProcessId] = $true }

$cutoff = (Get-Date).AddSeconds(-$MinAgeSec)

# Count category totals
$nodeCount = 0; $nodeMemMB = 0
$bashCount = 0; $gitCount = 0
$mcpAlive = 0; $mcpOrphan = 0; $mcpYoung = 0
$killed = 0; $freedMB = 0

foreach ($p in $procs) {
  $name = $p.Name
  $mem  = [math]::Round($p.WorkingSetSize / 1MB, 0)
  if ($name -eq 'node.exe') { $nodeCount++; $nodeMemMB += $mem }
  if ($name -eq 'bash.exe' -or $name -eq 'sh.exe') { $bashCount++ }
  if ($name -eq 'git.exe') { $gitCount++ }

  # PRISM MCP detection
  if ($name -ne 'node.exe') { continue }
  if ($null -eq $p.CommandLine) { continue }
  if (-not ($p.CommandLine -match 'mcp-server[\\/]+dist[\\/]+index\.js')) { continue }

  $ppid = [int]$p.ParentProcessId
  $parentAlive = $alivePids.ContainsKey($ppid)

  # Age guard — never kill fresh procs even if parent looks dead (race window)
  if ($null -eq $p.CreationDate -or $p.CreationDate -ge $cutoff) {
    $mcpYoung++
    continue
  }

  if ($parentAlive) {
    $mcpAlive++
    continue
  }

  # ORPHAN: parent dead AND past age gate
  $mcpOrphan++
  $ageMin = [math]::Round(((Get-Date) - $p.CreationDate).TotalMinutes, 1)
  $evt = [pscustomobject]@{
    event = if ($DryRun) { 'would_kill' } else { 'kill' }
    pid   = [int]$p.ProcessId
    ppid  = $ppid
    ageMin = $ageMin
    memMB = $mem
    name  = 'prism-mcp-orphan'
  }

  if ($DryRun) {
    Write-Event $evt
    if ($Verbose) { Write-Output ("DRY would-kill PID={0} PPID={1} age={2}m memMB={3}" -f $p.ProcessId, $ppid, $ageMin, $mem) }
    continue
  }

  try {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
    $killed++
    $freedMB += $mem
    Write-Event $evt
    Write-Log "killed PID=$($p.ProcessId) PPID=$ppid age=${ageMin}m memMB=$mem"
    if ($Verbose) { Write-Output ("KILLED PID={0} PPID={1} age={2}m memMB={3}" -f $p.ProcessId, $ppid, $ageMin, $mem) }
  } catch {
    $evt.event = 'kill_failed'
    Write-Event $evt
    Write-Log "kill_failed PID=$($p.ProcessId) err=$($_.Exception.Message)"
  }
}

# ---------- Stale .git/index.lock sweep ----------
$lockSwept = 0
$gitLockPaths = @(
  'H:/prism/.git/index.lock',
  'H:/prism-xproc-neural-aci/.git/index.lock',
  'H:/prism-blueprint-ocr-training/.git/index.lock'
)
foreach ($lockPath in $gitLockPaths) {
  if (Test-Path $lockPath) {
    try {
      $lockFile = Get-Item $lockPath -Force
      $lockAge = ((Get-Date) - $lockFile.LastWriteTime).TotalSeconds
      if ($lockAge -gt $GitLockMaxAgeSec) {
        if (-not $DryRun) {
          Remove-Item -Path $lockPath -Force -ErrorAction Stop
          $lockSwept++
          Write-Log "git-lock-swept $lockPath (age=${lockAge}s)"
        } elseif ($Verbose) {
          Write-Output "DRY would-sweep $lockPath (age=${lockAge}s)"
        }
      }
    } catch {
      Write-Log "git-lock-sweep-fail path=$lockPath err=$($_.Exception.Message)"
    }
  }
}

# ---------- Summary line ----------
$summary = "mem={0}%({1}MB free) node={2}({3}MB) bash={4} git={5} mcp=alive:{6}/orphan:{7}/young:{8} killed={9}(+{10}MB) git_locks_swept={11}" -f `
  $usedPct, $freeMB, $nodeCount, $nodeMemMB, $bashCount, $gitCount, $mcpAlive, $mcpOrphan, $mcpYoung, $killed, $freedMB, $lockSwept

Write-Output $summary
Write-Log "tick $summary"
Write-Event ([pscustomobject]@{
  event = 'tick'
  memUsedPct = $usedPct
  memFreeMB = $freeMB
  nodeCount = $nodeCount
  nodeMemMB = $nodeMemMB
  bashCount = $bashCount
  gitCount = $gitCount
  mcpAlive = $mcpAlive
  mcpOrphan = $mcpOrphan
  mcpYoung = $mcpYoung
  killed = $killed
  freedMB = $freedMB
  lockSwept = $lockSwept
})

exit 0
