#!/usr/bin/env pwsh
<#
.SYNOPSIS
  CLEANUP-MS0/U-CLEANUP-DEFENDER -- One-shot Windows Defender exclusion bootstrap.

.DESCRIPTION
  Adds Windows Defender exclusions for PRISM's high-frequency state files so
  Defender stops scanning every JSONL append + every coordination-store write.

  Why this matters: state/shared/*.jsonl is appended on every Stop hook, every
  tool call, every chat-bus post -- hundreds of writes per session. Defender's
  real-time protection scans each write, adding 5-50ms latency per append and
  briefly pinning a CPU core. Over a 6-chat fleet running 8-12 hours/day the
  cumulative scan overhead is non-trivial (~1-2% of total CPU on a 7800X3D).

  Adding state/shared as a non-recursive exclusion drops the scan to zero
  without compromising security: these are append-only audit files written by
  trusted PRISM helpers, not untrusted user data.

  Exclusions added (Add-MpPreference -ExclusionPath):
    H:\prism\state\shared\*.jsonl       -- chat-bus, tool runtimes, audit logs
    H:\prism\state\shared\*.db          -- SQLite WAL coordination store
    H:\prism\state\shared\*.db-wal      -- SQLite WAL companion
    H:\prism\state\shared\*.db-shm      -- SQLite WAL shared memory
    H:\prism\state\shared\.cron-locks   -- directory of one-line lock files

  Idempotent: every Add-MpPreference call is gated by a presence check against
  the live MpPreference.ExclusionPath collection. Re-running this script is
  safe -- already-present exclusions are reported as "kept" and not re-added.

  One-shot: there is no scheduled task. Operator runs this once after setting
  up the H: drive on a new Windows host; Defender persists the exclusions
  across reboots until manually cleared.

.PARAMETER WhatIf
  Preview-only mode. Lists what would be added without calling Add-MpPreference.

.PARAMETER List
  Print the current PRISM-related exclusions and exit (no add). Useful for
  verifying state.

.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    H:\prism\scripts\system-health\00-defender-exclusion-bootstrap.ps1
    # Default: add the 5 exclusions, idempotent. Requires elevation (admin).

.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    H:\prism\scripts\system-health\00-defender-exclusion-bootstrap.ps1 -Preview
    # Preview without writing.

.EXAMPLE
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
    H:\prism\scripts\system-health\00-defender-exclusion-bootstrap.ps1 -List
    # Show current PRISM exclusions.

.NOTES
  Requires elevation for the default (apply) mode. -Preview and -List run as
  any user.

  Exit codes:
    0 = success, or -Preview/-List exited cleanly
    1 = one or more Add-MpPreference calls failed
    3 = not running as Administrator (default mode only)
    4 = Get-MpPreference failed (Defender disabled or removed)

  To remove exclusions later:
    Remove-MpPreference -ExclusionPath "H:\prism\state\shared\*.jsonl"
    (etc., one per path)
#>
param(
  [switch]$Preview,
  [switch]$List
)

$ErrorActionPreference = "Stop"

# --- Desired exclusion set ---------------------------------------------------

$DesiredExclusions = @(
  "H:\prism\state\shared\*.jsonl",
  "H:\prism\state\shared\*.db",
  "H:\prism\state\shared\*.db-wal",
  "H:\prism\state\shared\*.db-shm",
  "H:\prism\state\shared\.cron-locks"
)

# --- Helpers ----------------------------------------------------------------

function Test-Admin {
  $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object System.Security.Principal.WindowsPrincipal($id)
  return $principal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-CurrentExclusions {
  # Defender exposes preferences via Get-MpPreference; ExclusionPath is an array
  # (or $null when no exclusions exist).
  try {
    $pref = Get-MpPreference -ErrorAction Stop
    $arr = @($pref.ExclusionPath)
    return $arr | Where-Object { $_ } # filter out null/empty
  } catch {
    Write-Error "Get-MpPreference failed: $($_.Exception.Message)"
    exit 4
  }
}

# --- Main -------------------------------------------------------------------

if ($List) {
  $current = Get-CurrentExclusions
  # -like is case-insensitive in PowerShell by default -- one arm is sufficient.
  $prismOnly = $current | Where-Object { $_ -like "*\prism\*" }
  if (-not $prismOnly -or $prismOnly.Count -eq 0) {
    Write-Host "No PRISM-related Defender exclusions found."
  } else {
    Write-Host "Current PRISM-related Defender exclusions:"
    $prismOnly | ForEach-Object { Write-Host "  $_" }
  }
  exit 0
}

if (-not $Preview -and -not (Test-Admin)) {
  # Use Write-Warning rather than Write-Error here -- under
  # $ErrorActionPreference = "Stop" (set above), Write-Error would throw a
  # terminating ActionPreferenceStopException, exiting with code 1 before the
  # `exit 3` below can fire. Write-Warning is non-terminating regardless of
  # preference, so the exit 3 contract holds.
  Write-Warning "This script requires Administrator privileges (Add-MpPreference needs elevation)."
  Write-Host "Re-run from an elevated PowerShell prompt:"
  Write-Host "  Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','$PSCommandPath'"
  Write-Host "Or preview without writing: $PSCommandPath -Preview"
  exit 3
}

$current = Get-CurrentExclusions
$currentSet = @{}
foreach ($p in $current) {
  $currentSet[$p.ToLower()] = $true
}

$added = @()
$kept  = @()
$failed = @()

foreach ($path in $DesiredExclusions) {
  $key = $path.ToLower()
  if ($currentSet.ContainsKey($key)) {
    $kept += $path
    continue
  }

  if ($Preview) {
    $added += $path
    continue
  }

  try {
    Add-MpPreference -ExclusionPath $path -ErrorAction Stop
    $added += $path
  } catch {
    $failed += [pscustomobject]@{ Path = $path; Error = $_.Exception.Message }
  }
}

# --- Report -----------------------------------------------------------------

$mode = if ($Preview) { "[WhatIf]" } else { "[applied]" }
Write-Host "Defender exclusion bootstrap $mode"

if ($added.Count -gt 0) {
  Write-Host "  Added ($($added.Count)):"
  $added | ForEach-Object { Write-Host "    + $_" }
}

if ($kept.Count -gt 0) {
  Write-Host "  Kept ($($kept.Count) -- already present):"
  $kept | ForEach-Object { Write-Host "    = $_" }
}

if ($failed.Count -gt 0) {
  Write-Host "  Failed ($($failed.Count)):"
  $failed | ForEach-Object { Write-Host "    ! $($_.Path): $($_.Error)" }
  exit 1
}

if ($added.Count -eq 0 -and $kept.Count -eq $DesiredExclusions.Count) {
  Write-Host "  No changes needed -- all 5 desired exclusions already present."
}

exit 0
