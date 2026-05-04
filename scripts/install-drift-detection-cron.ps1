# install-drift-detection-cron.ps1
# ================================
#
# INTEL-OLLAMA-OBSIDIAN-MS0/P19-U01.
#
# Registers Windows Task Scheduler entries for clock-scheduled
# drift-detection scripts described in scripts/drift-detection-manifest.json.
# Event-triggered tasks (PreEdit, SessionEnd, post-build) are NOT registered
# here — they live in .claude/hooks/ or npm scripts respectively.
#
# Usage:
#   .\install-drift-detection-cron.ps1                  # install all eligible tasks
#   .\install-drift-detection-cron.ps1 -DryRun          # show what would happen, no schtasks calls
#   .\install-drift-detection-cron.ps1 -Force           # overwrite existing tasks (default: skip if present)
#   .\install-drift-detection-cron.ps1 -Uninstall       # delete all PRISM-* scheduled tasks from this manifest
#   .\install-drift-detection-cron.ps1 -ManifestPath X  # alternate manifest location
#
# Exit codes:
#   0 — success (or dry-run rendered without errors)
#   1 — manifest missing / unparseable
#   2 — at least one schtasks invocation failed
#
# Tasks are named PRISM-<task.id>. The script logs every action to
# mcp-server/data/state/cron-runs.jsonl as a JSONL row so the
# drift-alert-surface.mjs hook can pick up failures at SessionStart.

[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Force,
    [switch]$Uninstall,
    [string]$ManifestPath = "$PSScriptRoot\drift-detection-manifest.json",
    [string]$RepoRoot = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Level, [string]$TaskId, [string]$Message, [string]$Action)
    $logDir  = Join-Path $RepoRoot "mcp-server\data\state"
    $logFile = Join-Path $logDir "cron-runs.jsonl"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $row = @{
        ts       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        level    = $Level
        task_id  = $TaskId
        action   = $Action
        message  = $Message
        host     = [System.Net.Dns]::GetHostName()
    } | ConvertTo-Json -Compress
    Add-Content -Path $logFile -Value $row -Encoding utf8
}

function Resolve-ScriptPath {
    param([string]$RelPath)
    return Join-Path $RepoRoot $RelPath
}

function Read-Manifest {
    if (-not (Test-Path $ManifestPath)) {
        Write-Error "Manifest not found at $ManifestPath"
        exit 1
    }
    try {
        return Get-Content $ManifestPath -Raw | ConvertFrom-Json
    } catch {
        Write-Error "Failed to parse manifest: $_"
        exit 1
    }
}

function Get-TaskName {
    param([string]$Id)
    return "PRISM-$Id"
}

function Build-RunCommand {
    param([object]$Task)
    $scriptAbs = Resolve-ScriptPath $Task.script_path
    switch ($Task.interpreter) {
        "node"   { return "node `"$scriptAbs`"" }
        "tsx"    { return "npx tsx `"$scriptAbs`"" }
        "python" { return "python `"$scriptAbs`"" }
        default  {
            Write-Warning "Unknown interpreter '$($Task.interpreter)' for $($Task.id) — skipping"
            return $null
        }
    }
}

function Install-Task {
    param([object]$Task)
    $name = Get-TaskName $Task.id

    if (-not $Task.schtasks_args) {
        Write-Verbose "Skipping $($Task.id): event-triggered, not a Task Scheduler entry"
        Write-Log -Level "info" -TaskId $Task.id -Action "skip" -Message "event-triggered (no schtasks_args)"
        return $true
    }

    $scriptAbs = Resolve-ScriptPath $Task.script_path
    if (-not (Test-Path $scriptAbs)) {
        if ($Task.skip_if_missing) {
            Write-Warning "Skipping $($Task.id): source script missing at $($Task.script_path)"
            Write-Log -Level "warn" -TaskId $Task.id -Action "skip" -Message "source script missing: $($Task.script_path)"
            return $true
        }
        Write-Error "$($Task.id): source script missing at $scriptAbs (skip_if_missing=false)"
        Write-Log -Level "error" -TaskId $Task.id -Action "fail" -Message "source script missing"
        return $false
    }

    $runCmd = Build-RunCommand -Task $Task
    if (-not $runCmd) {
        Write-Log -Level "error" -TaskId $Task.id -Action "fail" -Message "unknown interpreter"
        return $false
    }

    $existing = & schtasks /Query /TN $name 2>$null
    $taskExists = $LASTEXITCODE -eq 0
    if ($taskExists -and -not $Force) {
        Write-Host "Skipping $name (already exists; use -Force to overwrite)"
        Write-Log -Level "info" -TaskId $Task.id -Action "skip-exists" -Message "task already registered"
        return $true
    }

    $args = @("/Create", "/TN", $name, "/TR", $runCmd, "/F", "/RL", "LIMITED")
    $args += $Task.schtasks_args

    if ($DryRun) {
        Write-Host "[DRY-RUN] schtasks $($args -join ' ')"
        Write-Log -Level "info" -TaskId $Task.id -Action "dry-run" -Message ($args -join ' ')
        return $true
    }

    Write-Host "Installing $name -> $runCmd"
    & schtasks @args | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Error "schtasks failed for $name (exit $LASTEXITCODE)"
        Write-Log -Level "error" -TaskId $Task.id -Action "schtasks-fail" -Message "exit $LASTEXITCODE"
        return $false
    }
    Write-Log -Level "info" -TaskId $Task.id -Action "install" -Message $runCmd
    return $true
}

function Uninstall-Task {
    param([object]$Task)
    $name = Get-TaskName $Task.id
    if (-not $Task.schtasks_args) { return $true }

    if ($DryRun) {
        Write-Host "[DRY-RUN] schtasks /Delete /TN $name /F"
        return $true
    }

    & schtasks /Delete /TN $name /F 2>$null | Out-Host
    if ($LASTEXITCODE -ne 0) {
        # Most likely "task does not exist" — non-fatal.
        Write-Verbose "Could not delete $name (probably absent; exit $LASTEXITCODE)"
        Write-Log -Level "info" -TaskId $Task.id -Action "uninstall-skip" -Message "task absent"
        return $true
    }
    Write-Host "Removed $name"
    Write-Log -Level "info" -TaskId $Task.id -Action "uninstall" -Message "removed"
    return $true
}

# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

$manifest = Read-Manifest
if (-not $manifest.tasks) {
    Write-Error "Manifest has no 'tasks' array"
    exit 1
}

$allOk = $true
foreach ($task in $manifest.tasks) {
    if ($Uninstall) {
        if (-not (Uninstall-Task -Task $task)) { $allOk = $false }
    } else {
        if (-not (Install-Task -Task $task)) { $allOk = $false }
    }
}

if (-not $allOk) {
    Write-Host "FAIL: at least one task failed to install" -ForegroundColor Red
    exit 2
}

if ($DryRun) {
    Write-Host "DRY-RUN: no scheduled tasks were modified" -ForegroundColor Cyan
} elseif ($Uninstall) {
    Write-Host "All eligible tasks uninstalled (or already absent)." -ForegroundColor Green
} else {
    Write-Host "All eligible tasks installed (skip_if_missing entries skipped)." -ForegroundColor Green
}
exit 0
