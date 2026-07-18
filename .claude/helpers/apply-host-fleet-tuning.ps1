#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Host-level tuning for high-fanout fleet load (20 chats x 10 agents).

.DESCRIPTION
  Applies four reversible system tweaks:
    1. Widen ephemeral TCP/UDP port range to 1025-65534 (IPv4 + IPv6)
    2. Add Windows Defender exclusions for missing process + path entries
    3. Activate the Ultimate Performance power plan
    4. Set TdrDelay / TdrDdiDelay = 60 s (RTX PRO 6000 Blackwell + CUDA / Ollama)

  Idempotent. Snapshots the prior state to JSON the first time it's run so
  -Revert can restore the exact original values (not just "the defaults").

.PARAMETER Revert
  Restore the pre-tuning state from the snapshot file.

.PARAMETER SnapshotPath
  Where to read/write the baseline JSON. Defaults to
  H:\prism\state\shared\host-tuning-snapshot.json.

.EXAMPLE
  # Apply (run from an elevated PowerShell)
  powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\apply-host-fleet-tuning.ps1

  # Revert later
  powershell -NoProfile -ExecutionPolicy Bypass -File H:\prism\.claude\helpers\apply-host-fleet-tuning.ps1 -Revert
#>

[CmdletBinding()]
param(
  [switch]$Revert,
  [string]$SnapshotPath = (Join-Path (Split-Path -Parent $PSScriptRoot) '..\state\shared\host-tuning-snapshot.json' | Resolve-Path -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -ErrorAction SilentlyContinue)
)

# Resolve a usable default if the path doesn't exist yet
if (-not $SnapshotPath) {
  $SnapshotPath = Join-Path (Split-Path -Parent $PSScriptRoot) '..\state\shared\host-tuning-snapshot.json'
}

$ErrorActionPreference = 'Stop'
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

function Get-PortRange {
  param([string]$Family, [string]$Proto)
  try {
    $out = (netsh int $Family show dynamicport $Proto) -join "`n"
    $startMatch = [regex]::Match($out, 'Start Port\s+:\s+(\d+)')
    $numMatch   = [regex]::Match($out, 'Number of Ports\s+:\s+(\d+)')
    if (-not $startMatch.Success -or -not $numMatch.Success) { return $null }
    [pscustomobject]@{
      start = [int]$startMatch.Groups[1].Value
      num   = [int]$numMatch.Groups[1].Value
    }
  } catch { $null }
}

function Get-CurrentSnapshot {
  $gd = 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers'
  $tdr = Get-ItemProperty $gd -ErrorAction SilentlyContinue
  $mp  = Get-MpPreference -ErrorAction SilentlyContinue
  $active = (powercfg /getactivescheme) -join ''
  $activeGuid = ([regex]::Match($active, '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})')).Value
  [pscustomobject]@{
    Timestamp        = (Get-Date).ToString('o')
    Host             = $env:COMPUTERNAME
    PortsTcpV4       = Get-PortRange ipv4 tcp
    PortsUdpV4       = Get-PortRange ipv4 udp
    PortsTcpV6       = Get-PortRange ipv6 tcp
    PortsUdpV6       = Get-PortRange ipv6 udp
    PowerPlanGuid    = $activeGuid
    TdrDelay         = $tdr.TdrDelay
    TdrDdiDelay      = $tdr.TdrDdiDelay
    DefenderProcess  = @($mp.ExclusionProcess)
    DefenderPath     = @($mp.ExclusionPath)
  }
}

function Restore-PortRange {
  param($Snapshot)
  if ($Snapshot.PortsTcpV4) { netsh int ipv4 set dynamicport tcp start=$($Snapshot.PortsTcpV4.start) num=$($Snapshot.PortsTcpV4.num) | Out-Null }
  if ($Snapshot.PortsUdpV4) { netsh int ipv4 set dynamicport udp start=$($Snapshot.PortsUdpV4.start) num=$($Snapshot.PortsUdpV4.num) | Out-Null }
  if ($Snapshot.PortsTcpV6) { try { netsh int ipv6 set dynamicport tcp start=$($Snapshot.PortsTcpV6.start) num=$($Snapshot.PortsTcpV6.num) | Out-Null } catch {} }
  if ($Snapshot.PortsUdpV6) { try { netsh int ipv6 set dynamicport udp start=$($Snapshot.PortsUdpV6.start) num=$($Snapshot.PortsUdpV6.num) | Out-Null } catch {} }
}

# -------------------------------------------------------------
# REVERT MODE
# -------------------------------------------------------------
if ($Revert) {
  if (-not (Test-Path $SnapshotPath)) { throw "No snapshot at $SnapshotPath. Nothing to revert." }
  $snap = Get-Content $SnapshotPath -Raw | ConvertFrom-Json
  Write-Host "Reverting to snapshot from $($snap.Timestamp) on $($snap.Host)" -ForegroundColor Yellow

  Step "Restore ephemeral port ranges" { Restore-PortRange -Snapshot $snap }

  Step "Restore power plan" {
    if ($snap.PowerPlanGuid) { powercfg /setactive $snap.PowerPlanGuid | Out-Null }
  }

  Step "Restore TdrDelay / TdrDdiDelay" {
    $gd = 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers'
    if ($null -eq $snap.TdrDelay) {
      Remove-ItemProperty $gd -Name TdrDelay -ErrorAction SilentlyContinue
    } else {
      Set-ItemProperty $gd -Name TdrDelay -Type DWord -Value ([int]$snap.TdrDelay)
    }
    if ($null -eq $snap.TdrDdiDelay) {
      Remove-ItemProperty $gd -Name TdrDdiDelay -ErrorAction SilentlyContinue
    } else {
      Set-ItemProperty $gd -Name TdrDdiDelay -Type DWord -Value ([int]$snap.TdrDdiDelay)
    }
  }

  Step "Restore Defender exclusions (remove additions only — never removes a pre-existing exclusion)" {
    $mp = Get-MpPreference
    $baselineProc = @($snap.DefenderProcess)
    $baselinePath = @($snap.DefenderPath)
    $addedProc = @($mp.ExclusionProcess) | Where-Object { $baselineProc -notcontains $_ }
    $addedPath = @($mp.ExclusionPath)    | Where-Object { $baselinePath -notcontains $_ }
    foreach ($p in $addedProc) { Remove-MpPreference -ExclusionProcess $p -ErrorAction SilentlyContinue }
    foreach ($p in $addedPath) { Remove-MpPreference -ExclusionPath    $p -ErrorAction SilentlyContinue }
    Write-Host "  Removed $($addedProc.Count) process + $($addedPath.Count) path exclusions added by this script."
  }

  Write-Host ""
  Write-Host "===== REVERT SUMMARY =====" -ForegroundColor Cyan
  $results | Format-Table -AutoSize | Out-Host
  Write-Host "Snapshot retained at: $SnapshotPath  (delete manually to forget the prior baseline)"
  return
}

# -------------------------------------------------------------
# APPLY MODE
# -------------------------------------------------------------
$snapDir = Split-Path -Parent $SnapshotPath
if (-not (Test-Path $snapDir)) { New-Item -ItemType Directory -Path $snapDir -Force | Out-Null }

if (Test-Path $SnapshotPath) {
  Write-Host "Snapshot already exists at $SnapshotPath  -- preserving the ORIGINAL baseline." -ForegroundColor Yellow
} else {
  Write-Host "Snapshotting current state to $SnapshotPath" -ForegroundColor Yellow
  (Get-CurrentSnapshot | ConvertTo-Json -Depth 5) | Set-Content -Encoding UTF8 -Path $SnapshotPath
}

Step "Widen ephemeral TCP/UDP port range to 1025-65534" {
  # IPv4 is load-bearing for Anthropic API; IPv6 best-effort
  netsh int ipv4 set dynamicport tcp start=1025 num=64510 | Out-Null
  netsh int ipv4 set dynamicport udp start=1025 num=64510 | Out-Null
  try { netsh int ipv6 set dynamicport tcp start=1025 num=64510 | Out-Null } catch { Write-Host "  (ipv6 tcp range not configurable — ok)" }
  try { netsh int ipv6 set dynamicport udp start=1025 num=64510 | Out-Null } catch { Write-Host "  (ipv6 udp range not configurable — ok)" }
  $cur = Get-PortRange ipv4 tcp
  Write-Host "  IPv4 TCP range now: $($cur.start)..$($cur.start + $cur.num - 1)  ($($cur.num) ports)"
}

Step "Add Defender exclusions (idempotent)" {
  $procs = @('claude.exe','git.exe','bash.exe','pwsh.exe','powershell.exe')
  foreach ($p in $procs) {
    Add-MpPreference -ExclusionProcess $p -ErrorAction SilentlyContinue
    Write-Host "  + process $p"
  }
  $paths = @(
    'H:\prism',
    'C:\Users\wompu\.claude',
    'C:\Users\wompu\.claude\projects\H--PRISM',
    'C:\Users\wompu\AppData\Roaming\npm',
    'C:\Users\wompu\AppData\Local\npm-cache',
    'H:\Tools\nodejs',
    'H:\Tools\python'
  )
  foreach ($p in $paths) {
    if (Test-Path $p) {
      Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue
      Write-Host "  + path    $p"
    } else {
      Write-Host "  - skip (not present) $p"
    }
  }
  Write-Host "  Note: process exclusions widen attack surface — malware named claude.exe / node.exe / git.exe will not be scanned at runtime."
}

Step "Activate Ultimate Performance power plan" {
  $list = powercfg /list
  $up = $list | Select-String 'Ultimate Performance' | Select-Object -First 1
  if (-not $up) {
    Write-Host "  Ultimate Performance not present — duplicating from template"
    powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Out-Null
    $list = powercfg /list
    $up = $list | Select-String 'Ultimate Performance' | Select-Object -First 1
  }
  if (-not $up) { throw "Ultimate Performance scheme could not be created on this Windows SKU." }
  $guid = ([regex]::Match($up.Line, '([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})')).Value
  if (-not $guid) { throw "Could not parse Ultimate Performance GUID from: $($up.Line)" }
  powercfg /setactive $guid | Out-Null
  Write-Host "  Active scheme set to $guid"
}

Step "Set TdrDelay = 60 s and TdrDdiDelay = 60 s" {
  $gd = 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers'
  Set-ItemProperty $gd -Name TdrDelay    -Type DWord -Value 60
  Set-ItemProperty $gd -Name TdrDdiDelay -Type DWord -Value 60
  Write-Host "  Reboot required for the GPU driver to honor the new TDR delays."
}

Write-Host ""
Write-Host "===== AFTER STATE =====" -ForegroundColor Cyan
$post = Get-CurrentSnapshot
"PortsTcpV4:      $($post.PortsTcpV4.start)..$($post.PortsTcpV4.start + $post.PortsTcpV4.num - 1)  ($($post.PortsTcpV4.num) ports)"
"PortsUdpV4:      $($post.PortsUdpV4.start)..$($post.PortsUdpV4.start + $post.PortsUdpV4.num - 1)  ($($post.PortsUdpV4.num) ports)"
"PowerPlanGuid:   $($post.PowerPlanGuid)"
"TdrDelay:        $($post.TdrDelay) s"
"TdrDdiDelay:     $($post.TdrDdiDelay) s"
"DefenderProcess: $($post.DefenderProcess -join '; ')"

Write-Host ""
Write-Host "===== STEP RESULTS =====" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-Host

$failed = @($results | Where-Object Status -eq 'FAIL').Count
$tdrOk  = ($results | Where-Object Step -Match 'TdrDelay').Status -eq 'OK'
Write-Host ""
if ($failed -gt 0) {
  Write-Host "$failed step(s) failed — see Detail column above." -ForegroundColor Red
} else {
  Write-Host "All steps OK." -ForegroundColor Green
}
if ($tdrOk) {
  Write-Host "REBOOT REQUIRED for TdrDelay to take effect on the RTX PRO 6000 Blackwell." -ForegroundColor Yellow
}
Write-Host "Snapshot: $SnapshotPath"
Write-Host "Revert:   powershell -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Revert"
