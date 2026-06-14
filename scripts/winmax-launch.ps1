<#
.SYNOPSIS
  Guarded, idempotent launcher for the Hurco WinMax DS/MT Desktop simulators (mill | lathe).
  slot:echo. Fixes the "WinMax apps don't finish launching" wedge.

.DESCRIPTION
  Root cause of the wedge (diagnosed 2026-06-01):
    1. The two products launch from DIFFERENT installs via DIFFERENT CNC_Launcher.exe and REQUIRE a
       /product argument. A bare CNC_Launcher.exe (no /product) just sits idle — nothing spawns.
         mill  -> "C:\Program Files (x86)\Hurco\DS WinMax Mill\x64\CNC_Launcher.exe" /company Hurco /product "DS WinMax Mill"
         lathe -> "C:\Program Files\Hurco\MT WinMax Desktop\CNC_Launcher.exe"        /company Hurco /product "MT WinMax Lathe"
    2. The two installs ship DIFFERENT RTServices.dll versions (DS Mill 01/28/2026 vs MT Desktop
       12/15/2025) and both bind net.tcp :4502 + share RT-service singletons. Running mill + lathe
       CONCURRENTLY, or double-launching one, makes the RT components crash-fault in RTServices.dll
       (Max5UI / WinmaxMillRT / CNC_MachineConfigMgr / CNC_LogMgr all die) and the RT engine never
       comes back -> the GUI shell loads but never "finishes launching".

  THE FIX this script enforces:
    - ONE product at a time. Always kills EVERY stale WinMax-stack process (both installs) first,
      so a relaunch starts from a guaranteed-clean slate (frees :4502 + RT singletons + mutexes).
    - Launches the correct CNC_Launcher.exe with the correct /product args, exactly once.
    - Waits for readiness (net.tcp :4502 listening + Max5UI up + no new RTServices crash) and
      FAILS LOUD with the crash detail if the stack faults.

.PARAMETER Product   mill (default) | lathe
.PARAMETER KillOnly  Just clear a wedge (kill all WinMax processes), do not launch.
.PARAMETER TimeoutSec  Readiness wait budget (default 90).

.EXAMPLE  pwsh -ExecutionPolicy Bypass -File scripts\winmax-launch.ps1 -Product mill
.EXAMPLE  pwsh -ExecutionPolicy Bypass -File scripts\winmax-launch.ps1 -Product lathe
.EXAMPLE  pwsh -ExecutionPolicy Bypass -File scripts\winmax-launch.ps1 -KillOnly
.NOTES    Requires PowerShell 7 (pwsh). Invoke with pwsh, NOT Windows PowerShell 5.1.
#>
[CmdletBinding()]
param(
  [ValidateSet('mill','lathe')] [string]$Product = 'mill',
  [switch]$KillOnly,
  [int]$TimeoutSec = 90
)

$ErrorActionPreference = 'Stop'

# Canonical launch map — sourced from the operator's own Start-Menu shortcuts (v10/v11 WinMax *.lnk).
$MAP = @{
  mill  = @{ exe = 'C:\Program Files (x86)\Hurco\DS WinMax Mill\x64\CNC_Launcher.exe'; product = 'DS WinMax Mill';  rt = 'WinmaxMillRT' }
  lathe = @{ exe = 'C:\Program Files\Hurco\MT WinMax Desktop\CNC_Launcher.exe';        product = 'MT WinMax Lathe'; rt = 'CNC_RT' }
}
# Every process name in the WinMax stack (both installs) — the clean-slate kill set.
$STACK_RE = 'CNC_|Max5|Winmax|WcfData'

function Get-WinMaxProcs { Get-Process 2>$null | Where-Object { $_.ProcessName -match $STACK_RE } }

function Clear-WinMaxStack {
  $p = Get-WinMaxProcs
  if ($p) {
    Write-Host "[winmax-launch] clearing $($p.Count) stale WinMax-stack process(es): $(( $p | Select-Object -Expand ProcessName -Unique ) -join ', ')"
    $p | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
  } else {
    Write-Host "[winmax-launch] no stale WinMax processes — slate already clean"
  }
}

# --- always clear the wedge first ---
Clear-WinMaxStack
if ($KillOnly) { Write-Host "[winmax-launch] KillOnly done."; @{ ok = $true; mode = 'kill-only'; remaining = (Get-WinMaxProcs | Measure-Object).Count } | ConvertTo-Json -Compress; exit 0 }

$cfg = $MAP[$Product]
if (-not (Test-Path $cfg.exe)) {
  $msg = "launcher not found: $($cfg.exe) — is the '$($cfg.product)' install present?"
  Write-Error $msg; @{ ok = $false; error = $msg } | ConvertTo-Json -Compress; exit 2
}

Write-Host "[winmax-launch] launching $Product : `"$($cfg.exe)`" /company Hurco /product `"$($cfg.product)`""
$t0 = Get-Date
Start-Process -FilePath $cfg.exe -ArgumentList '/company','Hurco','/product',"`"$($cfg.product)`"" -WorkingDirectory (Split-Path $cfg.exe)

# --- poll for readiness or crash ---
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$result = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 6
  $procs = Get-WinMaxProcs
  $rtAlive = [bool]($procs | Where-Object { $_.ProcessName -eq $cfg.rt })
  $uiAlive = [bool]($procs | Where-Object { $_.ProcessName -eq 'Max5UI' })
  $port4502 = [bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 4502 })
  $crash = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=2; StartTime=$t0} -MaxEvents 8 -ErrorAction SilentlyContinue |
           Where-Object { $_.Message -match 'RTServices|WinmaxMill|WinmaxLathe|Max5|CNC_' }
  $elapsed = [int]((Get-Date) - $t0).TotalSeconds
  Write-Host ("[winmax-launch] t+{0,3}s procs={1,2} RT={2} UI={3} :4502={4} crashes={5}" -f $elapsed, $procs.Count, $rtAlive, $uiAlive, $port4502, ($crash | Measure-Object).Count)
  if ($crash) {
    $lines = $crash | Select-Object -First 4 | ForEach-Object { $_.Message.Split("`n")[0].Trim() }
    $result = @{ ok = $false; product = $Product; reason = 'RTServices crash cascade'; crashes = @($lines); hint = 'A different WinMax product or a stale stack is conflicting (RTServices.dll version mismatch). Run -KillOnly, ensure ONLY one product runs, then relaunch.' }
    break
  }
  # Readiness: WCF bus up + UI up. RT-process name is informational (lathe RT name may differ).
  if ($port4502 -and $uiAlive) {
    $result = @{ ok = $true; product = $Product; readySec = $elapsed; rtAlive = $rtAlive; procs = (@($procs | Select-Object -Expand ProcessName)) }
    break
  }
}
if (-not $result) { $result = @{ ok = $false; product = $Product; reason = "not ready within ${TimeoutSec}s"; procs = (@(Get-WinMaxProcs | Select-Object -Expand ProcessName)) } }

if ($result.ok) { Write-Host "[winmax-launch] >>> $Product STACK HEALTHY (WCF :4502 + Max5UI up, no crash)" }
else            { Write-Host "[winmax-launch] >>> $Product LAUNCH FAILED: $($result.reason)" }
$result | ConvertTo-Json -Compress
exit ([int](-not $result.ok))
