# system-shutdown-cleanup.ps1 — runs cleanup when claude.exe dies abruptly.
#
# Safe to run at any time. Idempotent. Designed for three callsites:
#   1. claude-with-cleanup.cmd wrapper (runs after claude.exe exits)
#   2. PowerShell profile Register-EngineEvent PowerShell.Exiting handler
#   3. Optional Scheduled Task on logoff/shutdown (admin install)
#
# Does NOT kill processes — Windows process-group cleanup handles that on
# terminal close or shutdown. This script ONLY clears stale STATE that
# survives process death, so the next chat boot doesn't see ghost claims.

$ErrorActionPreference = 'SilentlyContinue'

$logDir       = 'H:\prism\state\shared'
$logFile      = Join-Path $logDir 'system-shutdown-cleanup.log'
$ownership    = 'H:\prism\mcp-server\data\state\session-file-ownership.json'
$lockDir      = $logDir
$lockPattern  = 'GIT_LOCK_*.json'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$timestamp = [DateTime]::UtcNow.ToString('o')
Add-Content -Path $logFile -Value "[$timestamp] system-shutdown-cleanup START"

# 1. Reset file ownership claims (prevents ghost-claim CONFLICT spam in next chat)
if (Test-Path $ownership) {
  $reset = @{
    files     = @{}
    _resetAt  = $timestamp
    _reason   = 'system-shutdown-cleanup'
  } | ConvertTo-Json -Depth 4
  Set-Content -Path $ownership -Value $reset -Encoding utf8
  Add-Content -Path $logFile -Value "  cleared file-ownership.json"
}

# 2. Remove stale GIT_LOCK_*.json files
$locks = Get-ChildItem -Path $lockDir -Filter $lockPattern -ErrorAction SilentlyContinue
$lockCount = ($locks | Measure-Object).Count
if ($lockCount -gt 0) {
  $locks | ForEach-Object { Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue }
  Add-Content -Path $logFile -Value "  removed $lockCount git locks"
}

# 3. Workboard agent sections — leave alone here. The TTL sweeper
#    (stale-claim-sweeper.mjs at SessionStart) handles them with proper
#    timestamp parsing. Touching the markdown from PowerShell risks
#    corrupting the format.

Add-Content -Path $logFile -Value "[$timestamp] system-shutdown-cleanup END"
