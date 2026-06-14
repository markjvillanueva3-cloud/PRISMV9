# cimco-uia-diag.ps1 - SPINE-2 U-CIMCO-SIM-1 diagnostic: WHY is the freshly-launched CIMCO ribbon
# UIA tree empty (0 tabs / 0 buttons) when prior sessions walked 1200+ nodes on this same app?
# Hypotheses: (a) window launched from a background session never gets foreground/paint -> MFC
# builds no a11y tree; (b) a startup/modal dialog sits on top; (c) the tree needs activation.
# This probe: launch -> Win32 SetForegroundWindow on the frame -> enumerate ALL top-level windows
# (catch any modal/startup dialog) -> count the frame's actual subtree before & after foreground.
# PURE ASCII (PS 5.1 reads non-BOM files as ANSI; multibyte chars corrupt the parse). Raw SWA.
#
# Usage: powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File scripts/cimco-uia-diag.ps1 [-WaitSec 60] [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-uia-diag-result.txt",
  [int]$WaitSec = 60,
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m) { [void]$log.Add($m); Write-Output $m }

if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_collide.nc"
  @("%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.","G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%") -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
}
L "DIAG start exe=$exe nc=$Nc"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
# Win32 foreground/restore (the suspected unlock - UIA SetFocus alone does not paint an MFC frame)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
}
"@
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$CT = [System.Windows.Automation.ControlType]
$root = $AE::RootElement

function Find-Frames {
  $c = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'XTPMainFrame')
  return ,($root.FindAll($TS::Children, $c))
}
function Subtree-Count($el) {
  try { return ($el.FindAll($TS::Subtree, [System.Windows.Automation.Condition]::TrueCondition)).Count } catch { return -1 }
}
function Tab-Count($el) {
  try { return ($el.FindAll($TS::Descendants, (New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::TabItem)))).Count } catch { return -1 }
}

$proc = $null
try {
  Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $proc = Start-Process -FilePath $exe -ArgumentList "`"$Nc`"" -PassThru
  L "launched pid=$($proc.Id)"
  $sw=[System.Diagnostics.Stopwatch]::StartNew(); $frames=$null
  while ($sw.Elapsed.TotalSeconds -lt $WaitSec) { $frames=Find-Frames; if ($frames.Count -gt 0) { break }; Start-Sleep -Milliseconds 500 }
  if ($frames.Count -eq 0) { throw "no CIMCO window appeared" }
  $frame = $frames.Item(0)
  L "frame found elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s"

  # ALL top-level windows RIGHT NOW (catch any startup/modal dialog stealing the show).
  L "=== ALL top-level windows (RootElement children) ==="
  $allTop = $root.FindAll($TS::Children, [System.Windows.Automation.Condition]::TrueCondition)
  for ($i=0; $i -lt $allTop.Count; $i++) {
    $w = $allTop.Item($i)
    try { $cn=$w.Current.ClassName; $nm=$w.Current.Name; $ct=$w.Current.ControlType.ProgrammaticName -replace 'ControlType\.','' } catch { continue }
    if ($cn -match 'CIMCO|XTP|Afx|#32770|Dialog' -or $nm -match 'CIMCO|Simulation|Backplot') {
      L "  [$ct] class='$cn' name='$nm'"
    }
  }

  # BEFORE foreground.
  L "subtreeCount BEFORE foreground: $(Subtree-Count $frame) ; tabCount: $(Tab-Count $frame)"

  # Win32 foreground + restore on the frame's native handle, then re-measure.
  try {
    $h = [IntPtr]$frame.Current.NativeWindowHandle
    L "frame hwnd=$h visible=$([W32]::IsWindowVisible($h))"
    [void][W32]::ShowWindow($h, 9)        # SW_RESTORE
    [void][W32]::BringWindowToTop($h)
    [void][W32]::SetForegroundWindow($h)
    Start-Sleep -Milliseconds 2500
  } catch { L "foreground err: $($_.Exception.Message)" }

  L "subtreeCount AFTER foreground: $(Subtree-Count $frame) ; tabCount: $(Tab-Count $frame)"

  # poll up to 25s for tabs to appear post-foreground
  $sw2=[System.Diagnostics.Stopwatch]::StartNew()
  while ($sw2.Elapsed.TotalSeconds -lt 25) {
    $tc = Tab-Count $frame
    if ($tc -gt 0) { L "tabs appeared after foreground at $([math]::Round($sw2.Elapsed.TotalSeconds,1))s: $tc"; break }
    Start-Sleep -Milliseconds 1000
  }

  # dump tab names if any
  $tabs = $frame.FindAll($TS::Descendants, (New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $CT::TabItem)))
  $tn=@(); for ($t=0; $t -lt $tabs.Count; $t++) { $x=$tabs.Item($t).Current.Name; if ($x) { $tn += "'$x'" } }
  L "FINAL tabs ($($tabs.Count)): $($tn -join ' | ')"

  # also dump frame DIRECT children (what the top of the tree looks like)
  L "=== frame direct children ==="
  $kids = $frame.FindAll($TS::Children, [System.Windows.Automation.Condition]::TrueCondition)
  for ($i=0; $i -lt [Math]::Min($kids.Count,20); $i++) {
    $k=$kids.Item($i)
    try { L "  [$($k.Current.ControlType.ProgrammaticName -replace 'ControlType\.','')] name='$($k.Current.Name)' class='$($k.Current.ClassName)'" } catch {}
  }
  L "DIAG done"
}
catch { L "DIAG-ERROR: $($_.Exception.Message)" }
finally {
  if (-not $KeepOpen) {
    Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    L "cleaned up"
  } else { L "left CIMCO RUNNING (-KeepOpen)" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
