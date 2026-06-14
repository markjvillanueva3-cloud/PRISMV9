<#
.SYNOPSIS
  Snap 4 Windows Terminal windows to monitor quadrants by title.

.DESCRIPTION
  Called by LAUNCH-PRISM-FLEET.bat after the 4 wt windows have launched
  (titles: prism-NW / prism-NE / prism-SW / prism-SE). Uses Win32
  SetWindowPos to move each to a corner of the primary monitor's work
  area (excludes taskbar).

  Retries each window up to RetrySec seconds — wt.exe needs a moment to
  finish creating the window + setting its title.

.PARAMETER RetrySec
  Max seconds to wait for each window to appear. Default 10.

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\snap-wt-quadrants.ps1
#>
[CmdletBinding()]
param([int]$RetrySec = 10)

$ErrorActionPreference = "Continue"

# --- Win32 API for window enum + move ---
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinApi {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, ref RECT pvParam, uint fWinIni);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@ -ErrorAction SilentlyContinue

function Get-WorkArea {
    $rect = New-Object WinApi+RECT
    [WinApi]::SystemParametersInfo(0x0030, 0, [ref]$rect, 0) | Out-Null
    return @{ X = $rect.Left; Y = $rect.Top; W = $rect.Right - $rect.Left; H = $rect.Bottom - $rect.Top }
}

function Find-WindowByTitle {
    param([string]$Pattern)
    $script:found = [IntPtr]::Zero
    $script:findPattern = $Pattern
    $cb = [WinApi+EnumWindowsProc] {
        param($hwnd, $lparam)
        if (-not [WinApi]::IsWindowVisible($hwnd)) { return $true }
        $len = [WinApi]::GetWindowTextLength($hwnd)
        if ($len -le 0) { return $true }
        $sb = New-Object System.Text.StringBuilder ($len + 2)
        [WinApi]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
        $t = $sb.ToString()
        if ($t -match [regex]::Escape($script:findPattern)) {
            $script:found = $hwnd
            return $false
        }
        return $true
    }
    [WinApi]::EnumWindows($cb, [IntPtr]::Zero) | Out-Null
    return $script:found
}

function Move-And-Restore {
    param([IntPtr]$h, [int]$X, [int]$Y, [int]$W, [int]$H)
    # SW_RESTORE = 9 (in case it's maximized — moving a maximized window is a no-op)
    [WinApi]::ShowWindow($h, 9) | Out-Null
    Start-Sleep -Milliseconds 80
    # SWP_NOZORDER = 0x0004 | SWP_NOACTIVATE = 0x0010 | SWP_SHOWWINDOW = 0x0040
    [WinApi]::SetWindowPos($h, [IntPtr]::Zero, $X, $Y, $W, $H, 0x0054) | Out-Null
}

function Snap-One {
    param([string]$TitlePattern, [string]$Quadrant, [hashtable]$Area)
    $totalW = $Area.W; $totalH = $Area.H
    $halfW = [int]($totalW / 2); $halfH = [int]($totalH / 2)
    switch ($Quadrant) {
        "NW" { $x = $Area.X;          $y = $Area.Y;          $w = $halfW;          $h = $halfH }
        "NE" { $x = $Area.X + $halfW; $y = $Area.Y;          $w = $totalW - $halfW; $h = $halfH }
        "SW" { $x = $Area.X;          $y = $Area.Y + $halfH; $w = $halfW;          $h = $totalH - $halfH }
        "SE" { $x = $Area.X + $halfW; $y = $Area.Y + $halfH; $w = $totalW - $halfW; $h = $totalH - $halfH }
        default { Write-Warning "unknown quadrant $Quadrant"; return $false }
    }

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $RetrySec) {
        $hwnd = Find-WindowByTitle -Pattern $TitlePattern
        if ($hwnd -ne [IntPtr]::Zero) {
            Move-And-Restore -h $hwnd -X $x -Y $y -W $w -H $h
            Write-Host "[snap] $TitlePattern -> $Quadrant ($x,$y ${w}x${h})" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Milliseconds 300
    }
    Write-Warning "[snap] $TitlePattern not found within ${RetrySec}s"
    return $false
}

$area = Get-WorkArea
Write-Host "[snap] work area: $($area.X),$($area.Y) $($area.W)x$($area.H)" -ForegroundColor Cyan

Snap-One -TitlePattern "prism-NW" -Quadrant "NW" -Area $area | Out-Null
Snap-One -TitlePattern "prism-NE" -Quadrant "NE" -Area $area | Out-Null
Snap-One -TitlePattern "prism-SW" -Quadrant "SW" -Area $area | Out-Null
Snap-One -TitlePattern "prism-SE" -Quadrant "SE" -Area $area | Out-Null

exit 0
