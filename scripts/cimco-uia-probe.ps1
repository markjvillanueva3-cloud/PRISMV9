# cimco-uia-probe.ps1 — SPINE-2 de-risk probe: can Windows UI-Automation read the LIVE CIMCO Edit MFC window?
#
# Launches the real licensed CIMCO Edit 2026 with a test NC, waits for the main window, and walks the
# UI-Automation tree (ControlType / Name / AutomationId / ClassName) to a bounded depth — the smallest
# experiment that proves (or disproves) the chosen automation channel BEFORE building the full driver.
# Writes a JSON-ish tree dump to -OutFile and ALWAYS cleans up the launched process (no orphan).
#
# Usage: pwsh -NoProfile -File scripts/cimco-uia-probe.ps1 [-Nc <path>] [-OutFile <path>] [-WaitSec 45] [-Depth 4] [-KeepOpen]
param(
  [string]$Nc,
  [string]$OutFile = "$env:TEMP\cimco-uia-probe-result.txt",
  [int]$WaitSec = 45,
  [int]$Depth = 4,
  [string]$SelectTab,   # e.g. "Backplot" — selects that ribbon TabItem via UIA before dumping
  [switch]$KeepOpen
)
$ErrorActionPreference = "Stop"
$exe = "C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe"
$log = New-Object System.Collections.ArrayList
function L($m) { [void]$log.Add($m); Write-Output $m }

if (-not (Test-Path $exe)) { L "FATAL: CIMCOEdit.exe not found at $exe"; $log -join "`n" | Set-Content $OutFile; exit 2 }

# Test NC (synthetic, ASCII) if none supplied.
if (-not $Nc) {
  $Nc = "$env:TEMP\prism_cimco_probe.nc"
  "%`r`nO0001 (PRISM UIA PROBE)`r`nG20`r`nG90 G54`r`nG0 X0 Y0`r`nG1 Z-0.1 F10.`r`nM30`r`n%" | Set-Content -Path $Nc -Encoding ASCII
}
L "PROBE start  exe=$exe  nc=$Nc  waitSec=$WaitSec depth=$Depth"

try { Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes }
catch { L "FATAL: UIA assemblies not loadable: $($_.Exception.Message)"; $log -join "`n" | Set-Content $OutFile; exit 3 }

$proc = $null
try {
  # CIMCO Edit is SINGLE-INSTANCE: launching while an instance exists forwards the file to it and the
  # new process EXITS, so the launched pid's MainWindowHandle is unreliable. Pre-kill for a clean slate
  # (unless -Reuse), then find the window GLOBALLY by class 'XTPMainFrame' — never by the launched pid.
  if (-not $Reuse) {
    Get-Process CIMCOEdit,CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  $proc = Start-Process -FilePath $exe -ArgumentList "`"$Nc`"" -PassThru
  L "launched pid=$($proc.Id) (window found globally by class, not by pid)"

  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $frameCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'XTPMainFrame')
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $wins = $null
  while ($sw.Elapsed.TotalSeconds -lt $WaitSec) {
    $wins = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $frameCond)
    if ($wins.Count -gt 0) { break }
    Start-Sleep -Milliseconds 500
  }
  L "XTPMainFrame window(s) found: $($wins.Count)  elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s"

  # Let the Codejock ribbon finish building its TabItems before we search for / select one.
  if ($wins.Count -gt 0) {
    Start-Sleep -Milliseconds 1800
    $tabItemCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)
    $allTabs = $wins.Item(0).FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabItemCond)
    $tabNames = @(); for ($t=0; $t -lt $allTabs.Count; $t++) { $tabNames += "'$($allTabs.Item($t).Current.Name)'" }
    L "RIBBON TABS ($($allTabs.Count)): $($tabNames -join ' | ')"
  }
  # Optionally select a ribbon tab (e.g. Backplot = Machine Simulation) before dumping, so its ribbon renders.
  if ($SelectTab -and $wins.Count -gt 0) {
    $tabCond = New-Object System.Windows.Automation.AndCondition(
      (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::TabItem)),
      (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $SelectTab))
    )
    $tab = $wins.Item(0).FindFirst([System.Windows.Automation.TreeScope]::Descendants, $tabCond)
    if ($null -ne $tab) {
      $done = $false
      # Codejock XTP ribbon tabs typically support Invoke or LegacyIAccessible, NOT SelectionItem. Try in order.
      foreach ($try in @('SelectionItem','Invoke','Legacy')) {
        if ($done) { break }
        try {
          if ($try -eq 'SelectionItem') { $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select(); $done = $true }
          elseif ($try -eq 'Invoke') { $tab.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke(); $done = $true }
          elseif ($try -eq 'Legacy') { $tab.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern).DoDefaultAction(); $done = $true }
          if ($done) { L "SELECTED tab '$SelectTab' via $try" }
        } catch { }
      }
      if (-not $done) { L "tab '$SelectTab' found but NO usable pattern (SelectionItem/Invoke/Legacy all failed)" }
      Start-Sleep -Milliseconds 1000
    } else { L "tab '$SelectTab' NOT found in UIA tree" }
  }

  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $nodeCount = 0
  function Dump-Node($el, $lvl) {
    if ($null -eq $el -or $lvl -gt $Depth) { return }
    $script:nodeCount++
    if ($script:nodeCount -gt 1200) { return }  # bound the walk
    try {
      $ct = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\.',''
      $nm = $el.Current.Name; $ai = $el.Current.AutomationId; $cn = $el.Current.ClassName
      $en = $el.Current.IsEnabled
    } catch { $ct='?'; $nm='<err>'; $ai=''; $cn=''; $en=$true }
    $pad = '  ' * $lvl
    if ($nm -or $ai -or $ct -ne 'Pane') {  # skip nameless Panes to cut noise, keep everything else
      $enTag = if ($en) { '' } else { ' DISABLED' }
      L ("{0}[{1}{5}] name='{2}' id='{3}' class='{4}'" -f $pad, $ct, $nm, $ai, $cn, $enTag)
    }
    $child = $walker.GetFirstChild($el)
    while ($null -ne $child) { Dump-Node $child ($lvl + 1); $child = $walker.GetNextSibling($child) }
  }
  for ($i = 0; $i -lt $wins.Count; $i++) {
    $w = $wins.Item($i)
    L "=== WINDOW ${i}: name='$($w.Current.Name)' class='$($w.Current.ClassName)' ==="
    Dump-Node $w 0
  }
  L "TOTAL nodes walked: $nodeCount"
  L "PROBE-VERDICT: UIA-READABLE=$([bool]($nodeCount -gt 3))"
}
catch {
  L "PROBE-ERROR: $($_.Exception.Message)"
}
finally {
  if ($proc -and -not $KeepOpen) {
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue; L "cleaned up pid=$($proc.Id)" } catch {}
    # also sweep any CIMCOSimulation child
    Get-Process CIMCOSimulation -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  } elseif ($KeepOpen) { L "left CIMCO RUNNING (-KeepOpen)" }
  $log -join "`n" | Set-Content $OutFile -Encoding UTF8
  L "wrote $OutFile"
}
