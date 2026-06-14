# cimco-backplot-setup-probe.ps1 - SPINE-2 U-CIMCO-SIM-1: resolve the EXACT control names that
# generate + populate the Simulation Report. The drive-probe found 0 report grids because the
# report toggles ("Report errors" / "Stop Conditions" / "Check collision and limit errors") are
# NOT top-level ribbon buttons. This probe stops GUESSING and stops being timing-brittle:
#   1. poll-until-present (Wait-ForTabs) - the Codejock ribbon a11y tree builds lazily; a fixed
#      sleep walks an empty tree (iter1 hit this: 15 nodes, tab NOT FOUND).
#   2. enumerate via FindAll(Descendants) per control-type - ControlViewWalker recursion
#      under-walks the Codejock ribbon; FindAll is proven on this tree (the uia-probe used it).
# Enumerates every interactive control (Button/CheckBox/MenuItem/SplitButton/RadioButton) on the
# sim ribbon BEFORE engaging the 3D engine (FindAll is fast pre-3D; ~2min only once 3D renders),
# then opens a Setup-like surface and dumps any NEW dialog window. Raw SWA, zero-install.
#
# Usage: pwsh -NoProfile -File scripts/cimco-backplot-setup-probe.ps1 [-Nc <p>] [-OutFile <p>] [-WaitSec 60] [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-backplot-setup-result.txt",
  [int]$WaitSec = 60,
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m) { [void]$log.Add($m); Write-Output $m }

if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_collide.nc"
  @(
    "%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.",
    "G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%"
  ) -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
}
L "SETUP-PROBE start exe=$exe nc=$Nc waitSec=$WaitSec"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
$AE = [System.Windows.Automation.AutomationElement]
$TS = [System.Windows.Automation.TreeScope]
$CT = [System.Windows.Automation.ControlType]
$root = $AE::RootElement

function Cond($ct) {
  # untyped param on purpose: PS 5.1 resolves param TYPES at parse time, before Add-Type loads
  # UIAutomationTypes - a typed [ControlType] param fails to parse under 5.1 (works under pwsh 7).
  return New-Object System.Windows.Automation.PropertyCondition($AE::ControlTypeProperty, $ct)
}
function Find-Frames {
  $c = New-Object System.Windows.Automation.PropertyCondition($AE::ClassNameProperty, 'XTPMainFrame')
  return ,($root.FindAll($TS::Children, $c))
}
function Invoke-El($el) {
  foreach ($p in @('Invoke','Legacy','SelectionItem')) {
    try {
      if ($p -eq 'Invoke') { $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
      elseif ($p -eq 'Legacy') { $el.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern).DoDefaultAction() }
      else { $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() }
      return $p
    } catch {}
  }
  return $null
}
# poll-until-present: wait for the lazily-built ribbon to expose >=1 control of $ctn
function Wait-ForType($scope, [string]$ctn, [int]$sec) {
  $cond = Cond ($CT::$ctn)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $sec) {
    $els = $scope.FindAll($TS::Descendants, $cond)
    if ($els.Count -gt 0) { return ,$els }
    Start-Sleep -Milliseconds 600
  }
  return ,($scope.FindAll($TS::Descendants, $cond))
}
function Find-ByName($scope, $name, [string[]]$cts) {
  foreach ($ctn in $cts) {
    $cond = New-Object System.Windows.Automation.AndCondition(
      (Cond ($CT::$ctn)),
      (New-Object System.Windows.Automation.PropertyCondition($AE::NameProperty, $name)))
    $el = $scope.FindFirst($TS::Descendants, $cond)
    if ($el) { return $el }
  }
  return $null
}
# enumerate every named control of a type via FindAll (proven on this tree)
function Dump-Type($scope, [string]$ctn) {
  $cond = Cond ($CT::$ctn)
  $els = $scope.FindAll($TS::Descendants, $cond)
  $n = 0
  for ($i=0; $i -lt $els.Count; $i++) {
    $e = $els.Item($i)
    try {
      $nm = $e.Current.Name
      if ($nm) {
        $en = if ($e.Current.IsEnabled) { '' } else { ' DISABLED' }
        L ("  [{0}{3}] '{1}' id='{2}'" -f $ctn, $nm, $e.Current.AutomationId, $en)
        $n++
      }
    } catch {}
  }
  return $n
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
  try { $frame.SetFocus() } catch {}   # help MFC/Codejock build the a11y tree

  # poll until the ribbon TabItems materialize (the iter1 brittleness fix)
  $tabs = Wait-ForType $frame 'TabItem' 30
  $tabNames=@(); for ($t=0; $t -lt $tabs.Count; $t++) { $tn=$tabs.Item($t).Current.Name; if ($tn) { $tabNames += "'$tn'" } }
  L "RIBBON TABS ($($tabs.Count)): $($tabNames -join ' | ')"

  # select the sim tab - exact 'Backplot' if present, else first tab matching Backplot|Simulation|Plot
  $simTab = $null
  for ($t=0; $t -lt $tabs.Count; $t++) { if ($tabs.Item($t).Current.Name -eq 'Backplot') { $simTab=$tabs.Item($t); break } }
  if (-not $simTab) { for ($t=0; $t -lt $tabs.Count; $t++) { if ($tabs.Item($t).Current.Name -match 'Backplot|Simulation|Plot') { $simTab=$tabs.Item($t); break } } }
  if ($simTab) { $p = Invoke-El $simTab; L "selected sim tab '$($simTab.Current.Name)' via $p" } else { L "NO sim tab matched" }
  Start-Sleep -Milliseconds 1500

  # GROUND TRUTH - every interactive control on the sim ribbon (pre-3D, FindAll is fast here)
  L "=== SIM RIBBON - interactive controls ==="
  $tot = 0
  foreach ($ctn in @('Button','SplitButton','CheckBox','RadioButton','MenuItem','ComboBox')) {
    $tot += (Dump-Type $frame $ctn)
  }
  L "  (named interactive controls: $tot)"

  # open a Setup-like surface; dump any NEW dialog window
  $preCount = ($root.FindAll($TS::Children, (Cond $CT::Window))).Count
  $opened = $false
  foreach ($sname in @('Setup','Backplot Setup','Simulation Setup','Options','Settings','Configure')) {
    $btn = Find-ByName $frame $sname @('Button','SplitButton','MenuItem')
    if ($btn) {
      $p = Invoke-El $btn; L "invoked Setup-candidate '$sname' via $p"
      Start-Sleep -Milliseconds 1800
      $postWins = $root.FindAll($TS::Children, (Cond $CT::Window))
      if ($postWins.Count -gt $preCount) {
        for ($i=0; $i -lt $postWins.Count; $i++) {
          $w = $postWins.Item($i); $wn = $w.Current.Name
          if ($wn -notmatch 'CIMCO Edit 2026') {
            L "--- DIALOG '$wn' class='$($w.Current.ClassName)' ---"
            foreach ($ctn in @('CheckBox','RadioButton','Button','ComboBox','Tab','TabItem')) { Dump-Type $w $ctn | Out-Null }
          }
        }
        $opened = $true; break
      } else { L "  (no new window after '$sname')" }
    }
  }
  if (-not $opened) { L "no Setup dialog opened - report controls likely inline checkboxes or a dropdown menu (see ribbon dump above)" }
  L "SETUP-PROBE done"
}
catch { L "SETUP-PROBE-ERROR: $($_.Exception.Message)" }
finally {
  if (-not $KeepOpen) {
    Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    L "cleaned up CIMCO processes"
  } else { L "left CIMCO RUNNING (-KeepOpen)" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
