#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Reconfigure the Windows page file for the PRISM fleet workload.

.DESCRIPTION
  Replaces the current sprawl of 5 pagefiles (F:, G:, H: USB, J:, L:) with a
  clean configuration on the three WD_BLACK SN770 PCIe 4.0 NVMes plus a small
  dump-only pagefile on C:.

  Default = Option D (Three-drive symmetric stripe):
    C:\pagefile.sys     4 GB / 4 GB   (kernel mini-dump only)
    G:\pagefile.sys    32 GB / 32 GB  (PCIe 4.0)
    J:\pagefile.sys    32 GB / 32 GB  (PCIe 4.0)
    L:\pagefile.sys    32 GB / 32 GB  (PCIe 4.0)
    Total swap = 96 GB (textbook 1.5x RAM at 64 GB)
    Removes pagefile from F: (slow SATA) and H: (USB-portable).

  Three pagefiles on identical-speed NVMes give ~3x parallel swap bandwidth
  under concurrent fault load (which is the multi-chat scenario).

  Idempotent. Snapshots the prior pagefile layout to JSON the first time it's
  run, so -Revert restores the exact previous configuration.

.PARAMETER Aggressive
  Option E: 40 / 40 / 32 + 4 C: dump = 112 GB total swap.

.PARAMETER Conservative
  Option A: 32 G: + 4 C: dump only = 32 GB total swap (single drive).

.PARAMETER SnapshotPath
  Where to read/write the baseline JSON. Defaults to
  H:\prism\state\shared\pagefile-snapshot.json.

.EXAMPLE
  # Apply Option D (elevated)
  powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\apply-pagefile-config.ps1

.EXAMPLE
  # Option E
  powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\apply-pagefile-config.ps1 -Aggressive

.EXAMPLE
  # Roll back to whatever was there before this script first ran
  powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\apply-pagefile-config.ps1 -Revert
#>

[CmdletBinding(DefaultParameterSetName='OptionD')]
param(
  [Parameter(ParameterSetName='Aggressive')]   [switch]$Aggressive,
  [Parameter(ParameterSetName='Conservative')] [switch]$Conservative,
  [Parameter(ParameterSetName='Revert')]       [switch]$Revert,
  [string]$SnapshotPath
)

$ErrorActionPreference = 'Stop'
if (-not $SnapshotPath) {
  $SnapshotPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'state\shared\pagefile-snapshot.json'
}

$results = New-Object System.Collections.Generic.List[object]

function Step {
  param([string]$Name, [scriptblock]$Action)
  Write-Host ""
  Write-Host "===== $Name =====" -ForegroundColor Cyan
  try {
    & $Action
    $results.Add([pscustomobject]@{ Step = $Name; Status = 'OK'; Detail = '' })
    Write-Host "  OK" -ForegroundColor Green
  } catch {
    $results.Add([pscustomobject]@{ Step = $Name; Status = 'FAIL'; Detail = $_.Exception.Message })
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
  }
}

function Get-PagefileSnapshot {
  $cs = Get-CimInstance Win32_ComputerSystem
  $pfs = @(Get-CimInstance Win32_PageFileSetting | ForEach-Object {
    [pscustomobject]@{ Name = $_.Name; InitialSize = $_.InitialSize; MaximumSize = $_.MaximumSize }
  })
  [pscustomobject]@{
    Timestamp                = (Get-Date).ToString('o')
    Host                     = $env:COMPUTERNAME
    AutomaticManagedPagefile = $cs.AutomaticManagedPagefile
    PageFiles                = $pfs
  }
}

function Set-AutomaticManagedPagefile {
  param([bool]$Enable)
  # Win32_ComputerSystem cannot be modified via Set-CimInstance reliably across
  # PS versions — use the WMI provider directly.
  $wmi = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
  if ($wmi.AutomaticManagedPagefile -ne $Enable) {
    $wmi.AutomaticManagedPagefile = $Enable
    $r = $wmi.Put()
    if (-not $r) { throw "Failed to set AutomaticManagedPagefile=$Enable" }
  }
}

function Clear-AllPagefiles {
  # Removing a Win32_PageFileSetting record schedules the file for deletion on
  # next reboot; the .sys file itself is locked while running. That's expected.
  Get-WmiObject Win32_PageFileSetting | ForEach-Object {
    Write-Host "  Removing existing pagefile setting: $($_.Name)  (init=$($_.InitialSize) MB, max=$($_.MaximumSize) MB)"
    $_.Delete() | Out-Null
  }
}

function Add-Pagefile {
  param([string]$Path, [int]$InitMB, [int]$MaxMB)
  $drive = (Split-Path -Qualifier $Path).TrimEnd(':')
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive`:'"
  if (-not $disk) { throw "Drive $drive`: not present" }
  $freeGB = [math]::Round($disk.FreeSpace/1GB,1)
  if (($MaxMB/1024) -gt $freeGB) {
    throw ("Drive {0}: has only {1} GB free; cannot host {2} MB pagefile" -f $drive, $freeGB, $MaxMB)
  }
  Set-WmiInstance -Class Win32_PageFileSetting `
                  -Arguments @{ Name = $Path; InitialSize = $InitMB; MaximumSize = $MaxMB } | Out-Null
  Write-Host ("  + {0}  init={1} MB  max={2} MB  ({3} GB free on {4}: before this change)" -f $Path, $InitMB, $MaxMB, $freeGB, $drive)
}

# -----------------------------------------------------------------------------
# REVERT
# -----------------------------------------------------------------------------
if ($Revert) {
  if (-not (Test-Path $SnapshotPath)) { throw "No snapshot at $SnapshotPath. Nothing to revert." }
  $snap = Get-Content $SnapshotPath -Raw | ConvertFrom-Json
  Write-Host "Reverting pagefile config to snapshot from $($snap.Timestamp) on $($snap.Host)" -ForegroundColor Yellow

  Step "Disable AutomaticManagedPagefile (transient)" {
    Set-AutomaticManagedPagefile -Enable $false
  }

  Step "Remove every current pagefile setting" {
    Clear-AllPagefiles
  }

  Step "Recreate prior pagefile settings from snapshot" {
    foreach ($pf in $snap.PageFiles) {
      Add-Pagefile -Path $pf.Name -InitMB ([int]$pf.InitialSize) -MaxMB ([int]$pf.MaximumSize)
    }
  }

  Step "Restore AutomaticManagedPagefile flag" {
    Set-AutomaticManagedPagefile -Enable ([bool]$snap.AutomaticManagedPagefile)
  }

  Write-Host ""
  Write-Host "===== REVERT SUMMARY =====" -ForegroundColor Cyan
  $results | Format-Table -AutoSize | Out-Host
  Write-Host "REBOOT REQUIRED for the pagefile layout to take effect." -ForegroundColor Yellow
  Write-Host "Snapshot retained at $SnapshotPath."
  return
}

# -----------------------------------------------------------------------------
# APPLY — pick the option
# -----------------------------------------------------------------------------
if     ($Aggressive)   { $option = 'E'; $config = @(@{Path='C:\pagefile.sys';Init=4096;Max=4096}, @{Path='G:\pagefile.sys';Init=40960;Max=40960}, @{Path='J:\pagefile.sys';Init=40960;Max=40960}, @{Path='L:\pagefile.sys';Init=32768;Max=32768}) }
elseif ($Conservative) { $option = 'A'; $config = @(@{Path='C:\pagefile.sys';Init=4096;Max=4096}, @{Path='G:\pagefile.sys';Init=32768;Max=32768}) }
else                   { $option = 'D'; $config = @(@{Path='C:\pagefile.sys';Init=4096;Max=4096}, @{Path='G:\pagefile.sys';Init=32768;Max=32768}, @{Path='J:\pagefile.sys';Init=32768;Max=32768}, @{Path='L:\pagefile.sys';Init=32768;Max=32768}) }

$totalSwapGB = [math]::Round(($config | Where-Object { $_.Path -notlike 'C:*' } | Measure-Object -Property Max -Sum).Sum/1024,1)
$dumpGB      = [math]::Round((($config | Where-Object Path -like 'C:*').Max)/1024,1)

Write-Host ""
Write-Host "Applying Option $option" -ForegroundColor Cyan
Write-Host "  C: dump pagefile: $dumpGB GB"
Write-Host "  Swap total:       $totalSwapGB GB across $($config.Count - 1) NVMe(s)"
foreach ($c in $config) { Write-Host ("    {0,-20} init={1} MB  max={2} MB" -f $c.Path, $c.Init, $c.Max) }
Write-Host ""

# Pre-flight: verify every target drive has enough free space
foreach ($c in $config) {
  $drive = (Split-Path -Qualifier $c.Path).TrimEnd(':')
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive`:'"
  if (-not $disk) { Write-Host "PRE-FLIGHT FAIL: drive $drive`: missing." -ForegroundColor Red; throw "Drive $drive`: not present" }
  $freeGB = [math]::Round($disk.FreeSpace/1GB,1)
  $needGB = [math]::Round($c.Max/1024,1)
  $afterGB = [math]::Round($freeGB - $needGB,1)
  if ($needGB -gt $freeGB) {
    Write-Host "PRE-FLIGHT FAIL: $drive`: has $freeGB GB free, need $needGB GB." -ForegroundColor Red
    throw "Insufficient space on $drive`: ($freeGB GB free, $needGB GB requested)"
  }
  Write-Host ("  PRE-FLIGHT OK: {0}: {1} GB free, {2} GB needed, {3} GB remaining after." -f $drive, $freeGB, $needGB, $afterGB)
}
Write-Host ""

# Snapshot the prior layout (only on first apply; preserves true baseline)
$snapDir = Split-Path -Parent $SnapshotPath
if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir -Force | Out-Null }
if (Test-Path $SnapshotPath) {
  Write-Host "Snapshot already exists at $SnapshotPath -- preserving the ORIGINAL baseline." -ForegroundColor Yellow
} else {
  Write-Host "Snapshotting current pagefile layout to $SnapshotPath" -ForegroundColor Yellow
  (Get-PagefileSnapshot | ConvertTo-Json -Depth 5) | Set-Content -Encoding UTF8 -Path $SnapshotPath
}

Step "Disable AutomaticManagedPagefile" {
  Set-AutomaticManagedPagefile -Enable $false
}

Step "Remove existing pagefile settings on F:, G:, H:, J:, L:" {
  Clear-AllPagefiles
}

Step "Add Option-$option pagefiles" {
  foreach ($c in $config) {
    Add-Pagefile -Path $c.Path -InitMB $c.Init -MaxMB $c.Max
  }
}

Write-Host ""
Write-Host "===== POST-CONFIG VERIFICATION =====" -ForegroundColor Cyan
$post = Get-CimInstance Win32_PageFileSetting | Select-Object Name,InitialSize,MaximumSize
$post | Format-Table -AutoSize | Out-Host

Write-Host ""
Write-Host "===== STEP RESULTS =====" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-Host

$failed = @($results | Where-Object Status -eq 'FAIL').Count
Write-Host ""
if ($failed -gt 0) {
  Write-Host "$failed step(s) failed — review the Detail column above." -ForegroundColor Red
} else {
  Write-Host "All steps OK." -ForegroundColor Green
}
Write-Host "REBOOT REQUIRED for the new pagefile layout to take effect." -ForegroundColor Yellow
Write-Host "  The old .sys files on F: and H: become deletable after reboot — free up that space then."
Write-Host "Snapshot:  $SnapshotPath"
Write-Host "Revert:    powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Revert"
