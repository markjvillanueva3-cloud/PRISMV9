# cimco-msaa-map-probe.ps1 - SPINE-2 U-CIMCO-SIM MSAA control-map (operationalizes the breakthrough).
# cimco-ms-realize-probe.ps1 proved XTPToolBar exposes 213 MSAA children where UIA shows 0. This probe
# enumerates those children's NAME / ROLE / DEFAULT-ACTION via the canonical AccessibleChildren()
# (the per-index get_accName failed; AccessibleChildren returns proper VARIANT child refs), confirms
# 'Backplot' / 'Machine Simulation' / 'Check collision...' are present, and emits the name->childId map
# the driver will invoke via accDoDefaultAction(childId). One level of recursion into object children.
# PURE ASCII. Run: powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File scripts/cimco-msaa-map-probe.ps1 [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-msaa-map-result.txt",
  [int]$SettleSec = 9,
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m){ [void]$log.Add($m); Write-Output $m }
if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_collide.nc"
  @("%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.","G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%") -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
}
L "MSAA-MAP start exe=$exe nc=$Nc"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes; Add-Type -AssemblyName Accessibility
Add-Type -ReferencedAssemblies Accessibility @"
using System; using System.Runtime.InteropServices; using Accessibility;
public class M {
  [DllImport("oleacc.dll")] public static extern int AccessibleObjectFromWindow(IntPtr hwnd, int id, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IAccessible ppv);
  [DllImport("oleacc.dll")] public static extern int AccessibleChildren([MarshalAs(UnmanagedType.Interface)] object c, int start, int count, [Out, MarshalAs(UnmanagedType.LPArray, ArraySubType=UnmanagedType.Struct)] object[] kids, out int got);
}
"@
$AE=[System.Windows.Automation.AutomationElement]; $TS=[System.Windows.Automation.TreeScope]
$root=$AE::RootElement
$IID_ACC=[Guid]"618736E0-3C3D-11CF-810C-00AA00389B71"
# MSAA ROLE_SYSTEM_* numeric -> short label (only the ones we care about)
$ROLE=@{ 22='toolbar'; 21='list'; 33='window'; 10='client'; 43='pushbutton'; 37='pagetab'; 60='pagetablist'; 12='menuitem'; 11='menubar'; 9='pane'; 0x14='grouping'; 30='statictext'; 24='separator'; 27='pagetab2' }
function Frame { $c=New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty,'XTPMainFrame'); $f=$root.FindAll($TS::Children,$c); if($f.Count -gt 0){return $f.Item(0)}; return $null }
function AccFromHwnd($hwnd) { $ia=$null; $hr=[M]::AccessibleObjectFromWindow($hwnd,-4,[ref]$IID_ACC,[ref]$ia); if($hr -eq 0 -and $ia){return $ia}; return $null }
$script:rows = New-Object System.Collections.ArrayList
function Walk($ia, $path, $depth) {
  if ($null -eq $ia -or $depth -gt 2) { return }
  $cnt=0; try { $cnt=[int]$ia.accChildCount } catch { return }
  if ($cnt -le 0 -or $cnt -gt 5000) { return }
  $arr = [object[]]::new($cnt)
  $got = 0
  try { [void][M]::AccessibleChildren($ia,0,$cnt,$arr,[ref]$got) } catch { L "    AccChildren[$path] threw: $($_.Exception.Message)"; return }
  for ($i=0; $i -lt $got; $i++) {
    $c=$arr[$i]
    if ($null -eq $c) { continue }
    if ($c -is [int] -or $c -is [ValueType]) {
      $cid=[int]$c; $nm=''; $rl=0; $da=''
      try { $nm=$ia.get_accName($cid) } catch {}
      try { $rl=[int]$ia.get_accRole($cid) } catch {}
      try { $da=$ia.get_accDefaultAction($cid) } catch {}
      if ($nm) { [void]$script:rows.Add([pscustomobject]@{ name=$nm; role=$rl; da=$da; cid=$cid; kind='simple'; path=$path }) }
    } else {
      $cia=$null; try { $cia=[Accessibility.IAccessible]$c } catch {}
      if ($null -eq $cia) { continue }
      $nm=''; $rl=0; $da=''
      try { $nm=$cia.get_accName(0) } catch {}
      try { $rl=[int]$cia.get_accRole(0) } catch {}
      try { $da=$cia.get_accDefaultAction(0) } catch {}
      if ($nm) { [void]$script:rows.Add([pscustomobject]@{ name=$nm; role=$rl; da=$da; cid=0; kind='object'; path=$path }) }
      try { if ($cia.accChildCount -gt 0) { Walk $cia "$path>$nm" ($depth+1) } } catch {}
    }
  }
}

$running = @(Get-Process CIMCOEdit -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) { L "ABORT: CIMCOEdit already running (single-instance)"; $log -join "`n" | Set-Content $OutFile -Encoding UTF8; exit 4 }
$proc=$null
try {
  $proc=Start-Process -FilePath $exe -ArgumentList '/ms',"`"$Nc`"" -PassThru
  L "launched pid=$($proc.Id) args=/ms"
  $sw=[System.Diagnostics.Stopwatch]::StartNew(); $frame=$null
  while($sw.Elapsed.TotalSeconds -lt 45){ $frame=Frame; if($frame){break}; Start-Sleep -Milliseconds 500 }
  if(-not $frame){ throw "no frame" }
  L "frame found elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s; settling ${SettleSec}s"
  Start-Sleep -Seconds $SettleSec
  $frame = Frame

  foreach ($cls in @('XTPToolBar','XTPDockBar','XTPStatusBar','AfxWnd140','MDIClient')) {
    $cond=New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty,$cls)
    $els=$frame.FindAll($TS::Descendants,$cond)
    for ($k=0; $k -lt [Math]::Min($els.Count,4); $k++) {
      $hh=[IntPtr]$els.Item($k).Current.NativeWindowHandle
      if ($hh -eq [IntPtr]::Zero) { continue }
      $ia=AccFromHwnd $hh
      if ($ia) { $before=$script:rows.Count; Walk $ia "$cls#$k" 0; L "  walked $cls#$k hwnd=$hh -> +$($script:rows.Count-$before) named" }
    }
  }

  L "=== NAMED MSAA CONTROLS ($($script:rows.Count)) ==="
  $uniq = $script:rows | Sort-Object name -Unique
  foreach ($r in ($uniq | Select-Object -First 250)) {
    $rn = if($ROLE.ContainsKey($r.role)){$ROLE[$r.role]}else{"r$($r.role)"}
    L ("  [{0}] '{1}' da='{2}' cid={3} <{4}>" -f $rn, $r.name, $r.da, $r.cid, $r.path)
  }
  L "=== TARGET HITS ==="
  $targets = 'Backplot|Machine Simulation|Simulation|Check collision|Collision|Setup|Backplot Setup|Limit'
  $hits = $script:rows | Where-Object { $_.name -match $targets } | Sort-Object name -Unique
  if ($hits) { foreach ($h in $hits) { $rn=if($ROLE.ContainsKey($h.role)){$ROLE[$h.role]}else{"r$($h.role)"}; L ("  HIT [{0}] '{1}' da='{2}' cid={3} <{4}>" -f $rn,$h.name,$h.da,$h.cid,$h.path) } }
  else { L "  (no Backplot/Machine-Simulation name found among $($script:rows.Count) named controls)" }
  L "MSAA-MAP-VERDICT: named=$($script:rows.Count) targetHits=$(@($hits).Count)"
}
catch { L "MSAA-MAP-ERROR: $($_.Exception.Message)" }
finally {
  if (-not $KeepOpen) { Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue; L "cleaned up" } else { L "left RUNNING" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
