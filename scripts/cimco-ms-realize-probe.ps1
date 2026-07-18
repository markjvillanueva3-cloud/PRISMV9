# cimco-ms-realize-probe.ps1 - SPINE-2 U-CIMCO-SIM-1 DECISIVE experiment (from the
# cimco-full-drive-workaround workflow synthesis, wf_8b6783b5-262).
#
# Hypothesis: a cold BACKGROUND launch left the Codejock XTP ribbon UNREALIZED (subtree=15) because
# (a) it was launched WITHOUT the verified '/ms' flag (which opens Machine Simulation directly and,
# per the existence of the '--no-bring-to-front' switch S25874, SELF-PROMOTES to foreground by
# default) and (b) the foreground-lock denied our SetForegroundWindow. This experiment fixes BOTH:
# disable ForegroundLockTimeout, launch with '/ms <colliding NC>' (NOT --no-bring-to-front), let it
# own the foreground, then re-measure the UIA subtree. DECISIVE observable: subtree 15 -> 1000+
# with TabItems/Buttons/report-grid => realization dead-end BROKEN. Also runs a same-launch MSAA
# (oleacc IAccessible) side-probe on the XTPDockBar child (Codejock ships an MSAA provider where it
# ships no UIA provider) so one launch tests BOTH read channels.
#
# PURE ASCII. Run: powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File scripts/cimco-ms-realize-probe.ps1 [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-ms-realize-result.txt",
  [int]$SettleSec = 9,
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m){ [void]$log.Add($m); Write-Output $m }

# KNOWN-colliding NC: gross over-travel + plunge through table -> travel-limit/collision rows.
if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_collide.nc"
  @("%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.","G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%") -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
}
L "MS-REALIZE start exe=$exe nc=$Nc settle=${SettleSec}s"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
try { Add-Type -AssemblyName Accessibility } catch { L "WARN: Accessibility asm not loaded ($($_.Exception.Message))" }
Add-Type -ReferencedAssemblies Accessibility @"
using System; using System.Runtime.InteropServices; using Accessibility;
public class W {
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SystemParametersInfo(uint a, uint b, ref uint c, uint d);
  [DllImport("user32.dll", SetLastError=true, EntryPoint="SystemParametersInfo")] public static extern bool SystemParametersInfoSet(uint a, uint b, IntPtr c, uint d);
  [DllImport("user32.dll")] public static extern bool AllowSetForegroundWindow(int pid);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("oleacc.dll")] public static extern int AccessibleObjectFromWindow(IntPtr hwnd, int id, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IAccessible ppv);
}
"@
$AE=[System.Windows.Automation.AutomationElement]; $TS=[System.Windows.Automation.TreeScope]; $CT=[System.Windows.Automation.ControlType]
$root=$AE::RootElement
function Frame { $c=New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty,'XTPMainFrame'); $f=$root.FindAll($TS::Children,$c); if($f.Count -gt 0){return $f.Item(0)}; return $null }
function CntType($el,$ct){ try { return ($el.FindAll($TS::Descendants,(New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty,$ct)))).Count } catch { return -1 } }
function Sub($el){ try { return ($el.FindAll($TS::Subtree,[System.Windows.Automation.Condition]::TrueCondition)).Count } catch { return -1 } }

$running = @(Get-Process CIMCOEdit -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) { L "ABORT: $($running.Count) CIMCOEdit already running (single-instance guard) - close it first"; $log -join "`n" | Set-Content $OutFile -Encoding UTF8; exit 4 }

$savedTimeout = 0
$proc = $null
try {
  # 1. disable the foreground lock (save current first), transient (fWinIni=0)
  [void][W]::SystemParametersInfo(0x2000,0,[ref]$savedTimeout,0)   # SPI_GETFOREGROUNDLOCKTIMEOUT
  [void][W]::SystemParametersInfoSet(0x2001,0,[IntPtr]::Zero,0)    # SPI_SETFOREGROUNDLOCKTIMEOUT = 0
  L "ForegroundLockTimeout saved=$savedTimeout set=0"

  # 2. launch with /ms + colliding NC (NOT --no-bring-to-front -> let it self-foreground)
  $proc = Start-Process -FilePath $exe -ArgumentList '/ms', "`"$Nc`"" -PassThru
  L "launched pid=$($proc.Id) args=/ms"
  [void][W]::AllowSetForegroundWindow($proc.Id)

  # 3. wait for the frame, then settle for ribbon + sim-window first paint
  $sw=[System.Diagnostics.Stopwatch]::StartNew(); $frame=$null
  while($sw.Elapsed.TotalSeconds -lt 45){ $frame=Frame; if($frame){break}; Start-Sleep -Milliseconds 500 }
  if(-not $frame){ throw "no XTPMainFrame appeared" }
  L "frame found elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s subtree(pre-settle)=$(Sub $frame)"
  Start-Sleep -Seconds $SettleSec

  # 4. belt-and-braces foreground own
  try { $h=[IntPtr]$frame.Current.NativeWindowHandle; [void][W]::ShowWindow($h,9); [void][W]::BringWindowToTop($h); [void][W]::SetForegroundWindow($h); Start-Sleep -Milliseconds 2000 } catch { L "fg err $($_.Exception.Message)" }
  $frame = Frame   # re-fetch (window may have changed)

  # 5. DECISIVE measurement
  $sub=Sub $frame; $tabs=CntType $frame $CT::TabItem; $btns=CntType $frame $CT::Button
  $grids=(CntType $frame $CT::Table)+(CntType $frame $CT::DataGrid)+(CntType $frame $CT::DataItem)
  L "=== DECISIVE: subtree=$sub tabItems=$tabs buttons=$btns gridish=$grids ==="
  if ($tabs -gt 0) {
    $t=$frame.FindAll($TS::Descendants,(New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty,$CT::TabItem)))
    $tn=@(); for($i=0;$i -lt [Math]::Min($t.Count,40);$i++){ $x=$t.Item($i).Current.Name; if($x){$tn+="'$x'"} }
    L "TABS: $($tn -join ' | ')"
  }
  L "UIA-REALIZE-VERDICT: $([bool]($sub -gt 50))"

  # 6. MSAA side-probe (Codejock ships an MSAA provider where it ships NO UIA provider).
  #    Probe the frame + every command-bar pane hwnd via AccessibleObjectFromWindow(OBJID_CLIENT).
  #    DECISIVE: any pane with accChildCount>0 exposing 'Backplot'/'Machine Simulation' => MSAA wins.
  $IID_ACC = [Guid]"618736E0-3C3D-11CF-810C-00AA00389B71"
  function Probe-MSAA($hwnd, $label) {
    try {
      $ia = $null
      $hr = [W]::AccessibleObjectFromWindow($hwnd, -4, [ref]$IID_ACC, [ref]$ia)   # OBJID_CLIENT = -4 (0xFFFFFFFC)
      if ($hr -ne 0 -or -not $ia) { L "  MSAA[$label] hwnd=$hwnd hr=$hr (no IAccessible)"; return }
      $cc = 0; try { $cc = $ia.accChildCount } catch {}
      $self = ''; try { $self = $ia.get_accName(0) } catch {}
      L "  MSAA[$label] hwnd=$hwnd accChildCount=$cc name='$self'"
      if ($cc -gt 0) {
        $names=@(); $hit=$false
        for ($i=1; $i -le [Math]::Min($cc,60); $i++) {
          $nm=''
          try { $ch=$ia.get_accChild($i); if ($ch) { $cia=[Accessibility.IAccessible]$ch; $nm=$cia.get_accName(0) } } catch {}   # HARD cast triggers COM QI ('-as' does not)
          if (-not $nm) { try { $nm=$ia.get_accName($i) } catch {} }
          if ($nm) { $names+=$nm; if ($nm -match 'Backplot|Machine Simulation|Simulation|Collision|Setup') { $hit=$true } }
        }
        if ($names.Count) { L "    children: $(($names | Select-Object -First 40) -join ' | ')" }
        if ($hit) { L "    *** MSAA-HIT: ribbon/sim control names present via MSAA ***" }
      }
    } catch { L "  MSAA[$label] err: $($_.Exception.Message)" }
  }
  L "=== MSAA side-probe (OBJID_CLIENT) ==="
  Probe-MSAA ([IntPtr]$frame.Current.NativeWindowHandle) 'frame'
  foreach ($cls in @('XTPDockBar','XTPToolBar','XTPStatusBar','AfxWnd140','MDIClient')) {
    $cond = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty,$cls)
    $els = $frame.FindAll($TS::Descendants,$cond)
    for ($i=0; $i -lt [Math]::Min($els.Count,4); $i++) {
      $hh=[IntPtr]$els.Item($i).Current.NativeWindowHandle
      if ($hh -ne [IntPtr]::Zero) { Probe-MSAA $hh "$cls#$i" }
    }
  }
  L "MSAA-side-probe done"

  L "MS-REALIZE done"
}
catch { L "MS-REALIZE-ERROR: $($_.Exception.Message)" }
finally {
  # ALWAYS restore the foreground lock + kill CIMCO (single-instance must not leak)
  try { if($savedTimeout -ne 0){ [void][W]::SystemParametersInfoSet(0x2001,0,[IntPtr]$savedTimeout,0); L "restored ForegroundLockTimeout=$savedTimeout" } else { [void][W]::SystemParametersInfoSet(0x2001,0,[IntPtr]200000,0); L "restored ForegroundLockTimeout=200000(default)" } } catch {}
  if (-not $KeepOpen) { Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; L "cleaned up CIMCO" } else { L "left CIMCO RUNNING (-KeepOpen)" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
