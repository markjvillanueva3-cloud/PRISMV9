#requires -Version 5.0
<#
.SYNOPSIS
  Register / unregister the PRISM Daily Context Brief scheduled task (OBSIDIAN-INTELLIGENCE-MS3 / B1).

.DESCRIPTION
  Fires DailyContextWorkflowEngine at 06:00 local time daily. The engine reads
  yesterday's daily note + active project overviews + inbox captures and writes
  knowledge/memories/generated/DAILY-CONTEXT-YYYY-MM-DD.md via Ollama qwen2.5-coder:7b.

  Idempotent: re-running with no flags re-creates the task with the latest action
  string (so a path or model change is picked up on the next install).

  The engine ships as TypeScript; this task invokes the COMPILED .js under
  H:/prism/mcp-server/dist/engines/DailyContextWorkflowEngine.js. If dist is
  missing the script triggers `npm run build:fast` first (one-time bootstrap).

.PARAMETER DryRun
  Print what would happen without registering or running anything. Safe to run anywhere.

.PARAMETER Uninstall
  Remove the scheduled task and exit. Does not touch any other PRISM state.

.PARAMETER RunNow
  Register the task AND fire it immediately once (does not change the recurring schedule).

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/daily-context-cron.ps1
  # Registers the task at 06:00 daily (or refreshes the action string).

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/daily-context-cron.ps1 -DryRun
  # Prints the intended Register-ScheduledTask call, no side effects.

.EXAMPLE
  pwsh -File H:/prism/scripts/cron/daily-context-cron.ps1 -Uninstall
  # Removes the task and exits.

.NOTES
  Knob:  PRISM_DAILY_CONTEXT_VAULT_ROOT  (default H:/prism/knowledge/memories)
  Knob:  PRISM_DAILY_CONTEXT_DATE        (override target date — for backfill)
  Knob:  PRISM_DAILY_CONTEXT_OLLAMA_MODEL (default qwen2.5-coder:7b)
  Knob:  PRISM_DAILY_CONTEXT_OLLAMA_URL   (default http://127.0.0.1:11434/api/generate)
#>

[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Uninstall,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

$TaskName    = 'PRISM Daily Context Brief'
$TaskFolder  = '\PRISM\'
$RunAt       = '06:00'   # 24h local time
$RepoRoot    = 'H:/prism'
$EnginePath  = "$RepoRoot/mcp-server/dist/engines/DailyContextWorkflowEngine.js"
$NodeExe     = 'H:/.claude/bin/portable-node/node.exe'  # PRISM-standard portable node

# Fall back to system node if portable not present.
if (-not (Test-Path $NodeExe)) {
  $sysNode = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ($sysNode) { $NodeExe = $sysNode }
}

function Write-Info($msg) { Write-Host "[daily-context-cron] $msg" }
function Write-Warn($msg) { Write-Warning "[daily-context-cron] $msg" }

# ---------- Uninstall path ----------
if ($Uninstall) {
  Write-Info "Uninstalling scheduled task '$TaskName'..."
  $existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
  if ($null -eq $existing) {
    Write-Info "Task not registered — nothing to remove."
    exit 0
  }
  if ($DryRun) {
    Write-Info "DryRun: would call Unregister-ScheduledTask -TaskName '$TaskName' -TaskPath '$TaskFolder' -Confirm:`$false"
    exit 0
  }
  Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -Confirm:$false
  Write-Info "Task removed."
  exit 0
}

# ---------- Bootstrap: ensure compiled engine exists ----------
if (-not (Test-Path $EnginePath)) {
  Write-Warn "Compiled engine not found at $EnginePath"
  if ($DryRun) {
    Write-Info "DryRun: would run 'npm --prefix $RepoRoot/mcp-server run build:fast'"
  } else {
    Write-Info "Bootstrapping: running build:fast..."
    Push-Location "$RepoRoot/mcp-server"
    try {
      & npm run build:fast | Out-Host
      if ($LASTEXITCODE -ne 0) {
        Write-Warn "build:fast exited $LASTEXITCODE. The scheduled task will still register; first cron run may emit a build error."
      }
    } finally {
      Pop-Location
    }
  }
}

# ---------- Build the action ----------
# Wrap in -Command so we get stdout/stderr capture + an exit-code propagation.
$LogDir   = "$RepoRoot/state/shared/cron-logs"
$LogPath  = "$LogDir/daily-context-cron.log"
if (-not $DryRun -and -not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# PowerShell -Command wrapper: redirect both streams to the log, tee to console for foreground runs.
$Argument = @(
  '-NoProfile',
  '-NonInteractive',
  '-Command',
  "& '$NodeExe' '$EnginePath' --run *>> '$LogPath'"
) -join ' '

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $Argument

# Daily trigger at $RunAt local.
$TriggerTime = [DateTime]::Today.AddHours( [int]$RunAt.Split(':')[0] ).AddMinutes( [int]$RunAt.Split(':')[1] )
$Trigger     = New-ScheduledTaskTrigger -Daily -At $TriggerTime

# Run as current interactive user; no elevation needed.
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

# ---------- DryRun: print + exit ----------
if ($DryRun) {
  Write-Info "DryRun: would register task '$TaskName' in folder '$TaskFolder'"
  Write-Info "  Schedule : Daily at $RunAt local"
  Write-Info "  Action   : powershell.exe $Argument"
  Write-Info "  Log path : $LogPath"
  Write-Info "  Engine   : $EnginePath"
  Write-Info "  Node     : $NodeExe"
  exit 0
}

# ---------- Idempotent register ----------
$existing = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -ErrorAction SilentlyContinue
if ($existing) {
  Write-Info "Refreshing existing task '$TaskName' (action / trigger may have changed)..."
  Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder -Confirm:$false
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -TaskPath $TaskFolder `
  -Action $Action `
  -Trigger $Trigger `
  -Principal $Principal `
  -Settings $Settings `
  -Description "PRISM OBSIDIAN-INTELLIGENCE-MS3/B1 — synthesizes daily context brief from yesterday's note + projects + inbox via Ollama qwen2.5-coder. Log: $LogPath" | Out-Null

Write-Info "Registered '$TaskName' — daily at $RunAt local, action logs to $LogPath"

# ---------- Optional immediate fire ----------
if ($RunNow) {
  Write-Info "RunNow: firing one immediate execution..."
  Start-ScheduledTask -TaskName $TaskName -TaskPath $TaskFolder
  Write-Info "Task started. Tail $LogPath for output."
}

exit 0
