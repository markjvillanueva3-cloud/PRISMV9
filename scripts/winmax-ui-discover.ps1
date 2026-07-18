# ===========================================================================
# winmax-ui-discover.ps1 — Hurco WinMax Desktop UI Inventory
# ===========================================================================
#
# HURCO-WINMAX-AUTOMATION-MS0/U-WMA01 — Phase A1 (slot:echo 2026-05-25).
#
# Operator runs this ONCE with WinMax Desktop open. The script walks
# WinMax's UI tree via the Windows UI Automation .NET API (built-in,
# no install needed) and writes a JSON inventory of every interactable
# element it finds — window titles, menu items, buttons, dialog
# locators, edit boxes, keyboard shortcuts. The inventory becomes the
# lookup table for HURCO-WINMAX-AUTOMATION-MS0 Phase A2 (`test-winmax.ps1`,
# the actual per-file test runner) and Phase B (custom `prism_winmax`
# MCP server with `winmax_load` / `winmax_simulate` / `winmax_diff`
# tool actions).
#
# OPERATOR RUNBOOK:
#   1. Open WinMax Desktop. Get it to the state you'd normally start
#      from (main window visible; no modal dialog open).
#   2. Open PowerShell (Windows Terminal or PS console).
#   3. Run:  pwsh -File H:\prism\scripts\winmax-ui-discover.ps1
#   4. Wait ~5-30 seconds (depends on how many UI elements). The script
#      shows a live count to stdout.
#   5. Output JSON is written to:
#         H:\prism\state\shared\winmax-automation\winmax-ui-inventory.json
#   6. Report back: "discovery PASS — N elements" OR paste any stderr.
#
# Requires PowerShell 5.1+ (built into Windows 10/11). NO admin needed.
# WinMax Desktop must be already-launched (script does NOT start it).
#
# Fail-loud per R12: detects missing WinMax, missing UIAutomation,
# truncated tree-walk; writes partial inventory on error with explicit
# `incomplete: true` flag instead of silently producing a bad inventory.
#
# ===========================================================================

[CmdletBinding()]
param(
  [string]$ProcessName = "WinMax",
  [string]$OutputPath = "H:\prism\state\shared\winmax-automation\winmax-ui-inventory.json",
  [int]$MaxDepth = 12,
  [int]$ElementCap = 5000
)

$ErrorActionPreference = "Stop"

# --- 1. Verify UIAutomation is available --------------------------------
try {
  Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop
  Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop
} catch {
  Write-Error "FAIL: System.Windows.Automation not available. PowerShell 5.1+ required on Windows 10/11. Error: $($_.Exception.Message)"
  exit 2
}

# --- 2. Find WinMax process ---------------------------------------------
# WinMax Desktop may register under several process names. Try the most
# common candidates in order; fail-loud if none match.
$candidates = @($ProcessName, "WinMaxDesktop", "WinMax9", "WinMax8", "Hurco.WinMax", "WinMaxMill", "WinMaxLathe")
$winmaxProc = $null
foreach ($cand in $candidates) {
  $p = Get-Process -Name $cand -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($p) { $winmaxProc = $p; break }
}

if (-not $winmaxProc) {
  $running = (Get-Process | Where-Object { $_.MainWindowTitle -match "winmax|hurco" } | Select-Object -First 3 | ForEach-Object { "$($_.Name) ($($_.MainWindowTitle))" }) -join "; "
  Write-Error "FAIL: No WinMax process found. Tried: $($candidates -join ', '). Running windows matching winmax/hurco: $running. Open WinMax Desktop and re-run."
  exit 3
}

Write-Host "Found WinMax: PID=$($winmaxProc.Id) Name=$($winmaxProc.ProcessName) Title='$($winmaxProc.MainWindowTitle)'"

# --- 3. Get root AutomationElement for WinMax's main window -------------
if ($winmaxProc.MainWindowHandle -eq [IntPtr]::Zero) {
  Write-Error "FAIL: WinMax process has no main window handle. The process may be running headless or minimized to tray. Bring WinMax to the foreground and re-run."
  exit 4
}

$root = [System.Windows.Automation.AutomationElement]::FromHandle($winmaxProc.MainWindowHandle)
if (-not $root) {
  Write-Error "FAIL: UIAutomation could not bind to WinMax's main window. WinMax may not be using a UIA-compatible UI framework (some legacy Win32 apps need MSAA bridging). Try running 'inspect.exe' from Windows SDK to verify."
  exit 5
}

Write-Host "UIAutomation root bound. ClassName='$($root.Current.ClassName)' Name='$($root.Current.Name)'"

# --- 4. Walk the UI tree ------------------------------------------------
$inventory = [System.Collections.ArrayList]@()
$walkErrors = [System.Collections.ArrayList]@()
$count = 0
$truncated = $false

function Walk-Element {
  param(
    [System.Windows.Automation.AutomationElement]$Elem,
    [int]$Depth,
    [string]$PathPrefix
  )

  if ($script:count -ge $ElementCap) {
    $script:truncated = $true
    return
  }
  if ($Depth -gt $MaxDepth) { return }

  try {
    $info = $Elem.Current
    $entry = @{
      depth         = $Depth
      path          = $PathPrefix
      automation_id = $info.AutomationId
      name          = $info.Name
      class_name    = $info.ClassName
      control_type  = $info.ControlType.ProgrammaticName
      is_enabled    = $info.IsEnabled
      is_offscreen  = $info.IsOffscreen
      bounds        = if ($info.BoundingRectangle) {
                        @{
                          x      = [int]$info.BoundingRectangle.X
                          y      = [int]$info.BoundingRectangle.Y
                          width  = [int]$info.BoundingRectangle.Width
                          height = [int]$info.BoundingRectangle.Height
                        }
                      } else { $null }
      access_key    = $info.AccessKey
      keyboard_shortcut = $info.AcceleratorKey
      help_text     = $info.HelpText
    }

    # Extract pattern-specific data the test runner will need
    $patterns = [System.Collections.ArrayList]@()
    if ($Elem.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)) { [void]$patterns.Add("Invoke") }
    if ($Elem.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)) { [void]$patterns.Add("Value") }
    if ($Elem.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern)) { [void]$patterns.Add("Toggle") }
    if ($Elem.GetCurrentPattern([System.Windows.Automation.SelectionPattern]::Pattern)) { [void]$patterns.Add("Selection") }
    if ($Elem.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)) { [void]$patterns.Add("Window") }
    if ($Elem.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern)) { [void]$patterns.Add("ExpandCollapse") }
    $entry.patterns = $patterns -join ","

    [void]$inventory.Add($entry)
    $script:count++

    if ($script:count % 100 -eq 0) {
      Write-Host "  walked $script:count elements (depth=$Depth)..."
    }

    # Recurse into children
    $children = $Elem.FindAll(
      [System.Windows.Automation.TreeScope]::Children,
      [System.Windows.Automation.Condition]::TrueCondition
    )
    $childIdx = 0
    foreach ($child in $children) {
      $childPath = if ($PathPrefix) { "$PathPrefix/$($info.ControlType.ProgrammaticName.Split('.')[-1])[$childIdx]" } else { "$($info.ControlType.ProgrammaticName.Split('.')[-1])[$childIdx]" }
      Walk-Element -Elem $child -Depth ($Depth + 1) -PathPrefix $childPath
      $childIdx++
    }
  } catch {
    [void]$script:walkErrors.Add(@{
      depth = $Depth
      path  = $PathPrefix
      error = $_.Exception.Message
    })
  }
}

Write-Host "Walking UI tree (max_depth=$MaxDepth element_cap=$ElementCap)..."
$startTime = Get-Date
Walk-Element -Elem $root -Depth 0 -PathPrefix ""
$elapsedMs = [int]((Get-Date) - $startTime).TotalMilliseconds

Write-Host ""
Write-Host "Walk complete: $count elements in ${elapsedMs}ms"
if ($truncated) { Write-Warning "Element cap ($ElementCap) reached — inventory is incomplete. Re-run with -ElementCap higher." }
if ($walkErrors.Count -gt 0) { Write-Warning "$($walkErrors.Count) walk errors recorded (see JSON output)" }

# --- 5. Write JSON ------------------------------------------------------
$outDir = Split-Path -Parent $OutputPath
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$payload = @{
  schemaVersion = "1.0.0"
  generated_at  = (Get-Date -Format "o")
  generator     = "winmax-ui-discover.ps1"
  milestone     = "HURCO-WINMAX-AUTOMATION-MS0/U-WMA01"
  winmax = @{
    process_name      = $winmaxProc.ProcessName
    process_id        = $winmaxProc.Id
    main_window_title = $winmaxProc.MainWindowTitle
    root_class_name   = $root.Current.ClassName
    root_name         = $root.Current.Name
  }
  walk = @{
    max_depth_param = $MaxDepth
    element_cap     = $ElementCap
    elements_found  = $count
    truncated       = $truncated
    elapsed_ms      = $elapsedMs
    walk_errors     = $walkErrors
    incomplete      = ($truncated -or ($walkErrors.Count -gt 0))
  }
  elements = $inventory
}

$json = $payload | ConvertTo-Json -Depth 10 -Compress:$false
Set-Content -Path $OutputPath -Value $json -Encoding UTF8

Write-Host ""
Write-Host "=========================================================="
Write-Host "INVENTORY WRITTEN: $OutputPath"
Write-Host "  elements: $count"
Write-Host "  truncated: $truncated"
Write-Host "  walk errors: $($walkErrors.Count)"
Write-Host "=========================================================="
Write-Host ""
Write-Host "NEXT STEP: report back to the chat:"
Write-Host "  'discovery PASS — $count elements (truncated=$truncated, errors=$($walkErrors.Count))'"
Write-Host "  OR paste any failure output above."
Write-Host ""
exit 0
