param(
  [switch]$WhatIf,       # report only - never install/enable
  [switch]$Force,        # re-register every watchdog even if already Ready
  [switch]$Quiet,        # suppress per-task lines, print summary only
  [string[]]$Only = @(), # narrow to a specific watchdog (by task name)
  [string[]]$Skip = @()  # exclude specific watchdogs (by task name)
)

# ensure-all-watchdogs.ps1 - fleet-hygiene watchdog stack orchestrator.
#
# Idempotent registration of every critical PRISM scheduled task. Reads its
# canonical list from the WATCHDOGS table below; for each entry:
#   1. Probes via Get-ScheduledTask.
#   2. If absent -> runs the installer (-RunNow).
#   3. If Disabled -> enables.
#   4. If Ready -> no-op (unless -Force).
#   5. Reports per-task status.
#
# Mirrors the install-*-task.ps1 elevation pattern - must be run from an
# elevated PowerShell (the installers it calls require admin).
#
# The /fleet-reaper skill calls this as Step 0 so the whole watchdog stack
# is brought up by one slash command. Companion to install-fleet-reaper-task.ps1
# and install-mcp-server-watchdog-task.ps1.
#
# ASCII-ONLY by mandate: this script is invoked via `powershell` (Windows
# PowerShell 5.1), which decodes a no-BOM .ps1 as the system ANSI codepage.
# Any non-ASCII glyph (box-drawing, emoji, em-dash) corrupts the parse. Keep
# every character in this file in the 0x00-0x7F range - no exceptions.

$ErrorActionPreference = 'Continue'  # don't abort the whole stack on one failure

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltinRole]::Administrator)

# Elevation-aware. (Un)registering scheduled tasks needs admin rights - but
# /fleet-reaper Step 0 invokes this from a normally NON-elevated Bash/MCP
# shell. Aborting with a throw there would kill the whole /fleet-reaper
# pipeline on every routine invocation. Instead, a non-elevated shell
# DOWNGRADES to -WhatIf (report-only): the summary then shows what WOULD be
# installed and surfaces the exact elevated re-run command. An explicit
# -WhatIf is honored unchanged (no warning - the caller asked for it).
$elevationDowngraded = $false
if (-not $isAdmin -and -not $WhatIf) {
  $WhatIf = $true
  $elevationDowngraded = $true
  Write-Warning "Not an elevated PowerShell - running REPORT-ONLY (-WhatIf). Re-run from an ADMIN shell to actually install/enable watchdogs."
}

# Canonical watchdog list. Each entry: TaskName, Installer (relative to
# H:/PRISM/.claude/helpers/), Critical (true = always install; false = optional).
# Order = invocation priority (most critical first).
$WATCHDOGS = @(
  @{ Name = 'PRISM MCP Server';                Installer = 'install-mcp-server-task.ps1';           Critical = $true;  Description = 'HTTP MCP server supervisor (AtStartup+AtLogon)' }
  @{ Name = 'PRISM MCP Server Watchdog';       Installer = 'install-mcp-server-watchdog-task.ps1';  Critical = $true;  Description = 'MCP /health wedge detector (every 5 min)' }
  @{ Name = 'PRISM Fleet Reaper';              Installer = 'install-fleet-reaper-task.ps1';         Critical = $true;  Description = 'Slot-aware orphan process reaper (every 5 min)' }
  @{ Name = 'PRISM Fleet Memory Monitor';      Installer = 'install-fleet-memory-monitor-task.ps1'; Critical = $true;  Description = 'System RAM + per-chat-tree memory monitor (every 5 min)' }
  @{ Name = 'PRISM Cleanup Orchestrator';      Installer = 'install-cleanup-orchestrator-task.ps1'; Critical = $true;  Description = 'Generic locks/claims/bash reaper (every 5 min)' }
  @{ Name = 'PRISM Memory Pressure Auto-Relief'; Installer = 'install-memory-pressure-task.ps1';    Critical = $true;  Description = 'Memory-pressure auto-relief (every 5 min)' }
  @{ Name = 'PRISM Zombie Reaper v2';          Installer = 'install-zombie-reaper-task.ps1';        Critical = $true;  Description = 'Zombie/dead-parent reaper (every 5 min)' }
  @{ Name = 'PRISM Hook Janitor';              Installer = 'install-hook-janitor-task.ps1';         Critical = $true;  Description = 'Hook cache cleanup' }
  @{ Name = 'PRISM Node Orphan Cleaner';       Installer = 'install-node-cleaner-task.ps1';         Critical = $true;  Description = 'Generic node.exe orphan cleaner' }
  @{ Name = 'PRISM Synergy Regression Watch';  Installer = 'install-synergy-watch-task.ps1';        Critical = $true;  Description = 'Fleet-task-health watchdog-of-watchdogs' }
)

# Intentionally the MAIN tree, not a slot worktree - the per-watchdog
# installers AND the scheduled tasks they register are host-global (one set
# per machine, not per slot). Running this orchestrator from a slot worktree
# still resolves installers from H:/prism by design; do NOT "fix" this to
# $PSScriptRoot.
$helpersDir = 'H:\PRISM\.claude\helpers'

function Test-WatchdogTaskState {
  param([string]$TaskName)
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) { return @{ Exists = $false; State = 'Absent' } }
  return @{ Exists = $true; State = $task.State }
}

function Install-Watchdog {
  param([hashtable]$Spec, [switch]$DoWhatIf)
  $installerPath = Join-Path $helpersDir $Spec.Installer
  if (-not (Test-Path $installerPath)) {
    return @{ Status = 'MISSING-INSTALLER'; Detail = $installerPath }
  }
  if ($DoWhatIf) {
    return @{ Status = 'WOULD-INSTALL'; Detail = $installerPath }
  }
  # Capture stdout+stderr; never trust $LASTEXITCODE through nested pwsh & 2>&1
  # (it's unreliable when the child throws non-terminating errors or writes to
  # the success stream pre-throw). The load-bearing check is post-install:
  # Get-ScheduledTask must SEE the task. If it does, install succeeded
  # regardless of what exit code propagated.
  $result = & powershell -NoProfile -ExecutionPolicy Bypass -File $installerPath -RunNow 2>&1
  $childExit = $LASTEXITCODE
  Start-Sleep -Milliseconds 500   # task-scheduler commit latency
  $postProbe = Get-ScheduledTask -TaskName $Spec.Name -ErrorAction SilentlyContinue
  if ($postProbe) {
    $detail = if ($childExit -ne 0) {
      "task registered (post-install probe confirmed); child reported exit=$childExit but task IS present"
    } else {
      'task registered + first run triggered'
    }
    return @{ Status = 'INSTALLED'; Detail = $detail }
  }
  # Truly failed - task not present after install attempt.
  $tail = ($result | Out-String).Trim()
  if ($tail.Length -gt 240) { $tail = $tail.Substring($tail.Length - 240) }
  return @{ Status = 'INSTALL-FAILED'; Detail = "exit=$childExit - post-install probe found no task - tail=$tail" }
}

# ---------- main ----------

$results = [System.Collections.Generic.List[object]]::new()
$installed = 0
$enabled = 0
$skipped = 0
$alreadyReady = 0
$failed = 0

foreach ($wd in $WATCHDOGS) {
  $name = $wd.Name
  if ($Only.Count -gt 0 -and $Only -notcontains $name) { continue }
  if ($Skip -contains $name) { continue }

  $state = Test-WatchdogTaskState -TaskName $name
  $action = $null

  if (-not $state.Exists) {
    $result = Install-Watchdog -Spec $wd -DoWhatIf:$WhatIf
    $action = $result.Status
    if ($action -eq 'INSTALLED')        { $installed++ }
    elseif ($action -eq 'WOULD-INSTALL'){ $installed++ }
    elseif ($action -eq 'INSTALL-FAILED') { $failed++ }
    elseif ($action -eq 'MISSING-INSTALLER') { $failed++ }
  }
  elseif ($state.State -eq 'Disabled') {
    if ($WhatIf) {
      $action = 'WOULD-ENABLE'
      $enabled++
    } else {
      try {
        Enable-ScheduledTask -TaskName $name -ErrorAction Stop | Out-Null
        $action = 'ENABLED'
        $enabled++
      } catch {
        $action = "ENABLE-FAILED - $($_.Exception.Message.Substring(0, [Math]::Min(80, $_.Exception.Message.Length)))"
        $failed++
      }
    }
  }
  elseif ($Force) {
    $result = Install-Watchdog -Spec $wd -DoWhatIf:$WhatIf
    $action = "FORCED - $($result.Status)"
    if ($result.Status -match 'INSTALLED|WOULD-INSTALL') { $installed++ } else { $failed++ }
  }
  else {
    $action = 'READY'
    $alreadyReady++
  }

  $results.Add([PSCustomObject]@{
    Name        = $name
    PreState    = $state.State
    Action      = $action
    Description = $wd.Description
  })

  if (-not $Quiet) {
    $icon = switch -Regex ($action) {
      'INSTALLED|ENABLED|FORCED'   { '[NEW]' }
      'READY'                       { '[OK] ' }
      'WOULD-'                      { '[..] ' }
      'MISSING-INSTALLER|FAILED'    { '[!!] ' }
      default                       { '[??] ' }
    }
    $stateNote = if ($state.Exists) { "[$($state.State)]" } else { '[Absent]' }
    Write-Host "$icon $name $stateNote -> $action"
  }
}

# ---------- summary ----------

Write-Host ""
$line = "+- ensure-all-watchdogs ---------------------------------"
Write-Host $line
Write-Host ("| checked:    " + $results.Count + " watchdogs")
Write-Host ("| ready:      " + $alreadyReady)
Write-Host ("| installed:  " + $installed + $(if ($WhatIf) { ' (would-install)' } else { '' }))
Write-Host ("| enabled:    " + $enabled + $(if ($WhatIf) { ' (would-enable)' } else { '' }))
Write-Host ("| failed:     " + $failed)
if ($Skip.Count -gt 0) { Write-Host ("| skipped:    " + ($Skip -join ', ')) }
if ($Only.Count -gt 0) { Write-Host ("| filter:     -Only " + ($Only -join ', ')) }
$verdict = if ($failed -gt 0) {
  "[!] PARTIAL - $failed installer(s) failed; see lines above"
} elseif ($elevationDowngraded -and ($installed -gt 0 -or $enabled -gt 0)) {
  "[!] REPORT-ONLY (not elevated) - $installed would-install / $enabled would-enable - $alreadyReady ready"
} elseif ($elevationDowngraded) {
  "[OK] FLEET WATCHDOGS UP - all $alreadyReady already ready (report-only run, nothing to install)"
} elseif ($installed -gt 0 -or $enabled -gt 0) {
  if ($WhatIf) { "[..] DRY-RUN - would install $installed / enable $enabled" } else { "[OK] FLEET WATCHDOGS UP - $installed installed, $enabled re-enabled, $alreadyReady already ready" }
} else {
  "[OK] FLEET WATCHDOGS UP - all $alreadyReady already ready"
}
Write-Host ("| verdict:    " + $verdict)
if ($elevationDowngraded -and ($installed -gt 0 -or $enabled -gt 0)) {
  Write-Host "| elevate:    powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/ensure-all-watchdogs.ps1"
}
Write-Host "+--------------------------------------------------------"

# Exit 1 only on a genuine installer failure. A report-only downgrade is NOT a
# failure - Step 0 must not abort the /fleet-reaper pipeline just because the
# shell wasn't elevated; the verdict already surfaced the elevated re-run.
if ($failed -gt 0) { exit 1 }
exit 0
