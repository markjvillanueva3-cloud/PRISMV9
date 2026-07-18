# mcp-priority-guardian.ps1  (PRISM MCP Priority Guardian, slot golf, 2026-06-03)
# mcp-priority-guardian / PRISM_MCP_GUARDIAN_DISABLE  (installer sanity markers).
#
# PURPOSE — permanently fix the recurring "MCP DISCONNECTED" drop caused by CPU
# event-loop starvation under aggregate fleet load (200+ /loop sessions +
# Obsidian + Defender + ollama). Two compounding causes this closes:
#   (cause #2) PRIORITY INVERSION — ollama `llama-server` RUNNER processes
#     respawn at AboveNormal on every model load and structurally PREEMPT the
#     Normal-priority MCP server, starving its single-threaded event loop until
#     /health probes time out and the watchdog kills it (a user-visible drop).
#   (cause #3-amplifier) — the MCP server has no priority FLOOR, so under 100%
#     box CPU its loop is not guaranteed to be scheduled.
#
# FIX — every run (1-min scheduled cadence):
#   * demote ollama RUNNERS (llama-server.exe) -> Normal  (yield to MCP)
#   * raise the MCP :3100 listener            -> AboveNormal (CPU floor)
#   * (optional, env-gated) hard CPU-affinity islands so MCP's worst-case
#     scheduling latency is BOUNDED, not just usually-fine.
#
# WHY THIS, NOT ollama-cpu-throttle.ps1 (now DISABLED, kept per
# feedback_never_delete_only_disable): the old throttle pinned `ollama.exe`
# SERVE (the model-LOAD path) to BelowNormal + half-cores -> 180s+ model loads
# on the 96GB Blackwell. This guardian targets the RUNNER (llama-server.exe)
# ONLY, never serve, so loads stay fast while inference yields to MCP. It also
# raises the MCP floor, which the throttle never did.
#
# Idempotent (only changes a process when its class/affinity differs),
# fail-soft (per-process try/catch; a process exiting mid-loop is skipped),
# knob-gated. NEVER sets High/Realtime (would starve the OS). AboveNormal only.
#
# Disable:  schtasks /Change /TN "PRISM MCP Priority Guardian" /DISABLE
#           or env PRISM_MCP_GUARDIAN_DISABLE=1
# Knobs (env):
#   PRISM_MCP_GUARDIAN_DISABLE=1     guardian exits 0 immediately (kill switch)
#   PRISM_MCP_PRIORITY_CLASS=<cls>   MCP target class (default AboveNormal)
#   PRISM_MCP_AFFINITY_MASK=<int>    MCP affinity bitmask (default 0 = no pin)
#   PRISM_OLLAMA_RUNNER_MASK=<int>   ollama-runner affinity bitmask (default 0 = no pin)
#   PRISM_MCP_GUARDIAN_PORT=N        MCP listen port (default 3100)
# Affinity is OPT-IN (default off): priority alone is the proven, low-risk
# lever (verified live: MCP-boost + runner-demote moved box CPU 100% -> 93%).
# Set masks only after observing residual starvation. Example 7800X3D split:
#   MCP cores 0-3 = 15 (0x000F), ollama runners cores 4-15 = 65520 (0xFFF0).

$ErrorActionPreference = 'SilentlyContinue'
if ($env:PRISM_MCP_GUARDIAN_DISABLE -eq '1') { exit 0 }

$logDir = 'H:\PRISM\mcp-server\logs'
$log    = Join-Path $logDir 'priority-guardian.log'
try { if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null } } catch {}

$mcpClass   = if ($env:PRISM_MCP_PRIORITY_CLASS) { $env:PRISM_MCP_PRIORITY_CLASS } else { 'AboveNormal' }
# Guard against ever setting a dangerous class.
if ($mcpClass -notin @('Normal','AboveNormal')) { $mcpClass = 'AboveNormal' }
$mcpMaskN    = [int64]($(if ($env:PRISM_MCP_AFFINITY_MASK)   { $env:PRISM_MCP_AFFINITY_MASK }   else { 0 }))
$ollamaMaskN = [int64]($(if ($env:PRISM_OLLAMA_RUNNER_MASK)  { $env:PRISM_OLLAMA_RUNNER_MASK }  else { 0 }))
$port        = if ($env:PRISM_MCP_GUARDIAN_PORT) { [int]$env:PRISM_MCP_GUARDIAN_PORT } else { 3100 }

# NOTE: affinity masks are APPLIED, never reverted — to undo a mask experiment,
# clear the env var AND restart the target (or reboot). Overlapping MCP/ollama
# masks defeat the hard-island goal (priority still arbitrates, but cores are
# shared). Warn so an operator isn't silently surprised.
if ($mcpMaskN -gt 0 -and $ollamaMaskN -gt 0 -and (($mcpMaskN -band $ollamaMaskN) -ne 0)) {
  try { Add-Content -Path $log -Value ("{0} WARN affinity masks overlap (mcp={1} ollama={2}) -- islands NOT disjoint" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'), $mcpMaskN, $ollamaMaskN) } catch { }
}

$runnersDemoted = 0
$mcpRaised      = $false
$mcpPid         = $null

# 1) Demote ollama RUNNERS (llama-server.exe) to Normal so inference yields to MCP.
foreach ($p in (Get-Process llama-server -ErrorAction SilentlyContinue)) {
  try {
    if ($p.PriorityClass -ne [System.Diagnostics.ProcessPriorityClass]::Normal) {
      $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal; $runnersDemoted++
    }
    if ($ollamaMaskN -gt 0) {
      $m = [IntPtr]$ollamaMaskN
      if ($p.ProcessorAffinity -ne $m) { $p.ProcessorAffinity = $m }
    }
  } catch { }   # runner may exit mid-loop, or be protected — skip
}

# 2) Raise the MCP :3100 listener to the priority floor.
# IDENTITY GATE (fail-closed): only boost the REAL MCP server — a node process
# whose command line matches the MCP server/supervisor/bridge. Never boost an
# impostor that transiently binds :3100 during a restart window (a stale PID,
# a half-open System socket, or an unrelated tool). Filter junk PIDs (<=4),
# require ProcessName=node, and confirm the command line. Mirrors the
# fleet-reaper bridge-protect regex so the two stay in lock-step.
try {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
           Where-Object { $_.OwningProcess -and $_.OwningProcess -gt 4 }
  foreach ($conn in $conns) {
    $cand = $conn.OwningProcess
    $mp = Get-Process -Id $cand -ErrorAction SilentlyContinue
    if (-not $mp -or $mp.ProcessName -ne 'node') { continue }
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$cand" -ErrorAction SilentlyContinue).CommandLine
    if ($cmd -notmatch 'mcp-server-supervisor|dist[\\/]index\.js|mcp-http-bridge|TRANSPORT=http') { continue }
    $mcpPid = $cand
    $target = [System.Diagnostics.ProcessPriorityClass]$mcpClass
    if ($mp.PriorityClass -ne $target) { $mp.PriorityClass = $target; $mcpRaised = $true }
    if ($mcpMaskN -gt 0) {
      $m = [IntPtr]$mcpMaskN
      if ($mp.ProcessorAffinity -ne $m) { $mp.ProcessorAffinity = $m }
    }
    break   # boosted the verified MCP listener; done
  }
} catch { }

# 3) Append a one-line audit record (best-effort; never fail the run on log IO).
# Rotate first: cap the log so a 1-min cadence can't grow it unbounded (~525k
# lines/yr). Keep the last 500 lines when it crosses 5MB.
try {
  if ((Test-Path $log) -and ((Get-Item $log).Length -gt 5MB)) {
    $keep = Get-Content $log -Tail 500
    Set-Content -Path $log -Value $keep
  }
} catch { }
try {
  $ts  = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  $cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue).LoadPercentage
  Add-Content -Path $log -Value ("{0} mcpPid={1} mcpRaised={2} runnersDemoted={3} cpu={4}% mcpMask={5} ollamaMask={6}" -f `
    $ts, $mcpPid, $mcpRaised, $runnersDemoted, $cpu, $mcpMaskN, $ollamaMaskN)
} catch { }

exit 0
