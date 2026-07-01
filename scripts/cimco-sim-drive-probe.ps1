# cimco-sim-drive-probe.ps1 — SPINE-2 U-CIMCO-SIM-1 de-risk: drive the LIVE CIMCO Machine Simulation
# far enough to answer THE gating question: does the Simulation-Report surface read via UIA
# (GridPattern/TablePattern/TextPattern) or is it a custom-drawn control needing OCR?
#
# Exploratory + bounded: launch a deliberately-bad NC -> Backplot tab -> invoke 'Machine Simulation'
# -> wait -> enumerate ALL CIMCO windows (CIMCOEdit XTPMainFrame + any CIMCOSimulation child window)
# -> for every Table/DataGrid/List/Document control, attempt a cell/text read -> report control types
# + whether real text came back. ALWAYS cleans up. Raw System.Windows.Automation (no NuGet).
#
# Usage: pwsh -NoProfile -File scripts/cimco-sim-drive-probe.ps1 [-Nc <path>] [-WaitSec 45] [-SimSec 8] [-OutFile <p>] [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-sim-drive-result.txt",
  [int]$WaitSec = 45,
  [int]$SimSec = 8,
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m) { [void]$log.Add($m); Write-Output $m }

# Deliberately-bad NC: gross over-travel + plunge through table -> guarantees travel-limit/collision rows.
if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_collide.nc"
  @(
    "%","O0002 (PRISM COLLISION TEST)","G21","G90 G54","G0 X0 Y0 Z50.",
    "G0 X99999. Y99999.","G1 Z-9999. F500.","G0 Z50.","M30","%"
  ) -join "`r`n" | Set-Content -Path $Nc -Encoding ASCII
}
L "DRIVE start exe=$exe nc=$Nc waitSec=$WaitSec simSec=$SimSec"
Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
function Find-Frames {
  $c = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'XTPMainFrame')
  # leading comma prevents PowerShell from unrolling the AutomationElementCollection to a bare element
  return ,($root.FindAll([System.Windows.Automation.TreeScope]::Children, $c))
}
function Invoke-ByName($scope, $name, [string[]]$ctTypes) {
  foreach ($ct in $ctTypes) {
    $cond = New-Object System.Windows.Automation.AndCondition(
      (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, ([System.Windows.Automation.ControlType]::$ct))),
      (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $name)))
    $el = $scope.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
    if ($el) {
      foreach ($p in @('Invoke','SelectionItem','Legacy')) {
        try {
          if ($p -eq 'Invoke') { $el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
          elseif ($p -eq 'SelectionItem') { $el.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() }
          else { $el.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern).DoDefaultAction() }
          return "invoked '$name' [$ct] via $p"
        } catch {}
      }
      return "found '$name' [$ct] but no usable pattern"
    }
  }
  return "NOT FOUND '$name'"
}

# Try to read a grid/table/list/document control's cells/text via UIA patterns. THE gating test.
function Read-GridLike($el, $label) {
  $out = @()
  try {
    $gp = $el.GetCurrentPattern([System.Windows.Automation.GridPattern]::Pattern)
    $rows = $gp.Current.RowCount; $cols = $gp.Current.ColumnCount
    $out += "  GRIDPATTERN $label rows=$rows cols=$cols"
    for ($r=0; $r -lt [Math]::Min($rows,8); $r++) {
      $cells=@(); for ($c=0; $c -lt [Math]::Min($cols,6); $c++) { try { $cell=$gp.GetItem($r,$c); $cells += "'$($cell.Current.Name)'" } catch { $cells += '<x>' } }
      $out += "    row${r}: $($cells -join ' | ')"
    }
    return ,$out
  } catch {}
  try {
    $tp = $el.GetCurrentPattern([System.Windows.Automation.TablePattern]::Pattern)
    $out += "  TABLEPATTERN $label rows=$($tp.Current.RowCount) cols=$($tp.Current.ColumnCount)"
    return ,$out
  } catch {}
  try {
    $txt = $el.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)
    $doc = $txt.DocumentRange.GetText(800)
    if ($doc.Trim()) { $out += "  TEXTPATTERN $label (first 800): $($doc -replace '\s+',' ')"; return ,$out }
  } catch {}
  # Fallback: child ListItem/DataItem names (a custom grid often still exposes item children).
  try {
    $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
    $kids=@(); $ch=$walker.GetFirstChild($el); $n=0
    while ($ch -and $n -lt 12) { $cn=$ch.Current.Name; if ($cn) { $kids += "'$cn'" }; $ch=$walker.GetNextSibling($ch); $n++ }
    if ($kids.Count) { $out += "  CHILDREN ${label}: $($kids -join ' ')" }
  } catch {}
  return ,$out
}

$proc = $null
try {
  Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
  $proc = Start-Process -FilePath $exe -ArgumentList "`"$Nc`"" -PassThru
  L "launched pid=$($proc.Id)"
  $sw=[System.Diagnostics.Stopwatch]::StartNew(); $frames=$null
  while ($sw.Elapsed.TotalSeconds -lt $WaitSec) { $frames=Find-Frames; if ($frames.Count -gt 0) { break }; Start-Sleep -Milliseconds 500 }
  L "XTPMainFrame found: $($frames.Count) elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s"
  if ($frames.Count -eq 0) { throw "no CIMCO window appeared" }
  $frame = $frames.Item(0)
  Start-Sleep -Milliseconds 1800
  L (Invoke-ByName $frame 'Backplot' @('TabItem'))
  Start-Sleep -Milliseconds 1200
  L (Invoke-ByName $frame 'Machine Simulation' @('Button','MenuItem'))
  Start-Sleep -Seconds 3
  # Enable the report + run the collision/limit check (names from CHM recon). Try each; log outcome.
  foreach ($rn in @('Report errors','Show Errors','Show Warning','Stop Conditions')) {
    L (Invoke-ByName $frame $rn @('CheckBox','MenuItem','Button'))
  }
  L (Invoke-ByName $frame 'Backplot' @('Button'))       # run the backplot/sim
  Start-Sleep -Seconds $SimSec
  foreach ($cc in @('Check collision and limit errors','Check collision and limit','Collision Check')) {
    $r = Invoke-ByName $frame $cc @('Button','MenuItem'); L $r; if ($r -match '^invoked') { break }
  }
  L "waiting $SimSec s for collision check to populate report..."
  Start-Sleep -Seconds $SimSec

  # Enumerate ALL CIMCO windows now (the 3D sim may be a separate CIMCOSimulation top-level window).
  $simProcs = Get-Process CIMCOSimulation -ErrorAction SilentlyContinue
  L "CIMCOSimulation processes: $(($simProcs | Measure-Object).Count)"
  $allFrames = Find-Frames
  $simWinCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Window)
  L "=== hunting report/grid controls across CIMCO windows ==="
  # Search the main frame + any other top-level windows for Table/DataGrid/List/Document controls.
  $targets = @()
  for ($i=0; $i -lt $allFrames.Count; $i++) { $targets += $allFrames.Item($i) }
  # also any standalone windows whose name mentions Simulation/Report
  $topWins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $simWinCond)
  for ($i=0; $i -lt $topWins.Count; $i++) { $w=$topWins.Item($i); $nm=$w.Current.Name; if ($nm -match 'CIMCO|Simulation|Report|Backplot') { $targets += $w; L "  +window '$nm' class='$($w.Current.ClassName)'" } }

  # BOUNDED depth-capped walk (FindAll-Descendants is ~2min on the rendered sim tree — too slow).
  $gridCT = @('Table','DataGrid','List','Document','DataItem')
  $script:found = 0; $script:walked = 0
  $walker2 = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  function Walk-ForGrids($el, $lvl) {
    if ($null -eq $el -or $lvl -gt 9 -or $script:walked -gt 1500) { return }
    $script:walked++
    try {
      $ct = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\.',''
      if ($gridCT -contains $ct) {
        $script:found++
        L "[$ct] name='$($el.Current.Name)' id='$($el.Current.AutomationId)' class='$($el.Current.ClassName)'"
        foreach ($line in (Read-GridLike $el $ct)) { L $line }
      }
    } catch {}
    try { $c = $walker2.GetFirstChild($el); while ($c) { Walk-ForGrids $c ($lvl+1); $c = $walker2.GetNextSibling($c) } } catch {}
  }
  foreach ($tgt in $targets) { Walk-ForGrids $tgt 0 }
  L "nodes walked: $script:walked ; report-candidate controls found: $script:found"
  L "GRID-READ-VERDICT: $([bool]($script:found -gt 0))"
}
catch { L "DRIVE-ERROR: $($_.Exception.Message)" }
finally {
  if (-not $KeepOpen) {
    Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    L "cleaned up CIMCO processes"
  } else { L "left CIMCO RUNNING (-KeepOpen)" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
