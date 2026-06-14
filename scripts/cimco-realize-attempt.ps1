# cimco-realize-attempt.ps1 - SPINE-2 U-CIMCO-SIM-1: can we realize the Codejock XTP ribbon UIA
# tree from a BACKGROUND launch (no operator interaction)? Diag proved a cold launch yields a
# 15-node subtree (0 tabs/buttons) and plain SetForegroundWindow is denied by the foreground-lock.
# This tries every known autonomous "wake the a11y provider" trick in sequence, re-measuring the
# frame subtree after each. If any pushes subtree > 50 -> autonomous realize works (record which).
# If none do -> the live driver genuinely requires an operator-opened interactive CIMCO.
# PURE ASCII. Run under: powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File ...
param([int]$WaitSec = 60, [switch]$KeepOpen)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m){ [void]$log.Add($m); Write-Output $m }
$Nc = "$env:TEMP\prism_cimco_collide.nc"
@("%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.","G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%") -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
L "REALIZE-ATTEMPT start"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L,T,R,B; }
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint x, uint y, uint d, IntPtr e);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
}
"@
$AE=[System.Windows.Automation.AutomationElement]; $TS=[System.Windows.Automation.TreeScope]
$root=$AE::RootElement
function Frame { $c=New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty,'XTPMainFrame'); $f=$root.FindAll($TS::Children,$c); if($f.Count -gt 0){return $f.Item(0)}; return $null }
function Sub($el){ try { return ($el.FindAll($TS::Subtree,[System.Windows.Automation.Condition]::TrueCondition)).Count } catch { return -1 } }

$proc=$null
try {
  Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $proc=Start-Process -FilePath $exe -ArgumentList "`"$Nc`"" -PassThru
  $sw=[System.Diagnostics.Stopwatch]::StartNew(); $frame=$null
  while($sw.Elapsed.TotalSeconds -lt $WaitSec){ $frame=Frame; if($frame){break}; Start-Sleep -Milliseconds 500 }
  if(-not $frame){ throw "no frame" }
  $h=[IntPtr]$frame.Current.NativeWindowHandle
  L "frame hwnd=$h baseline subtree=$(Sub $frame)"

  # trick 1: AttachThreadInput to the foreground thread, then force-foreground
  try {
    $fg=[W]::GetForegroundWindow(); $ft=[W]::GetWindowThreadProcessId($fg,[IntPtr]::Zero); $ct=[W]::GetCurrentThreadId()
    [void][W]::AttachThreadInput($ct,$ft,$true); [void][W]::BringWindowToTop($h); [void][W]::SetForegroundWindow($h); [void][W]::AttachThreadInput($ct,$ft,$false)
    Start-Sleep -Milliseconds 1500; L "trick1 AttachThreadInput+SetForeground -> subtree=$(Sub $frame)"
  } catch { L "trick1 err $($_.Exception.Message)" }

  # trick 2: minimize/restore repaint cycle
  try { [void][W]::ShowWindow($h,6); Start-Sleep -Milliseconds 800; [void][W]::ShowWindow($h,9); Start-Sleep -Milliseconds 1500; L "trick2 min/restore -> subtree=$(Sub $frame)" } catch { L "trick2 err" }

  # trick 3: synthetic mouse click on the ribbon tab strip (top of window)
  try {
    $r=New-Object W+RECT; [void][W]::GetWindowRect($h,[ref]$r)
    $x=$r.L+160; $y=$r.T+60   # ribbon tab row, approx
    [void][W]::SetCursorPos($x,$y); Start-Sleep -Milliseconds 300
    [void][W]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero); [void][W]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero)  # L down/up
    Start-Sleep -Milliseconds 1500; L "trick3 click@($x,$y) -> subtree=$(Sub $frame)"
  } catch { L "trick3 err $($_.Exception.Message)" }

  # trick 4: WM_GETOBJECT to the frame (OBJID_CLIENT) to poke the a11y provider
  try { [void][W]::SendMessage($h,0x003D,[IntPtr]::Zero,[IntPtr]0xFFFFFFFC); Start-Sleep -Milliseconds 1200; L "trick4 WM_GETOBJECT -> subtree=$(Sub $frame)" } catch { L "trick4 err" }

  # trick 5: poll a further 12s (some providers build async after first poke)
  $sw2=[System.Diagnostics.Stopwatch]::StartNew()
  while($sw2.Elapsed.TotalSeconds -lt 12){ $s=Sub $frame; if($s -gt 50){ L "REALIZED async at $([math]::Round($sw2.Elapsed.TotalSeconds,1))s subtree=$s"; break }; Start-Sleep -Milliseconds 1000 }

  $fin=Sub $frame
  L "FINAL subtree=$fin"
  L "REALIZE-VERDICT: $([bool]($fin -gt 50))"
}
catch { L "ERR: $($_.Exception.Message)" }
finally {
  if(-not $KeepOpen){ Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; L "cleaned up" } else { L "left RUNNING" }
  $log -join "`n" | Set-Content "$env:TEMP\cimco-realize-result.txt" -Encoding UTF8
}
