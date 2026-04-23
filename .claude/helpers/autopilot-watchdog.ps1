#Requires -Version 5.1
<#
.SYNOPSIS
    PRISM Autopilot Watchdog — Monitors context pressure and auto-triggers /compact + resume

.DESCRIPTION
    Runs as a background process (started by Desktop Commander).
    Polls the context-pressure tracker file every 30 seconds.
    When critical threshold is reached:
      1. Finds the Claude Code Desktop window
      2. Sends /compact via SendKeys
      3. Waits for compaction to finish
      4. Sends the resume prompt

    This enables fully automated roadmap execution with zero user intervention.

.NOTES
    Activate:  node autopilot-flag.mjs set --track TRACK_NAME
    Start:     Desktop Commander start_process("powershell -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/autopilot-watchdog.ps1")
    Stop:      node autopilot-flag.mjs clear (watchdog exits on next poll)
#>

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@

# Config
$PressureFile = "H:\prism\.claude\cache\context-pressure"
$AutopilotFlag = "H:\prism\.claude\cache\autopilot-active"
$PollIntervalSec = 30
$CriticalThreshold = 600000  # 60% — compact early to be safe
$CompactWaitSec = 45         # Wait for compaction to finish
$LogFile = "H:\prism\.claude\cache\watchdog.log"

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$ts] $Message"
    Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue
    Write-Host $entry
}

function Get-ContextPressure {
    try {
        if (-not (Test-Path $PressureFile)) { return 0 }
        $data = Get-Content $PressureFile -Raw | ConvertFrom-Json
        return [int]$data.totalBytes
    } catch {
        return 0
    }
}

function Test-AutopilotActive {
    try {
        if (-not (Test-Path $AutopilotFlag)) { return $false }
        $data = Get-Content $AutopilotFlag -Raw | ConvertFrom-Json
        return $data.active -eq $true
    } catch {
        return $false
    }
}

function Find-ClaudeCodeWindow {
    # Look for Claude Code Desktop window or terminal running claude
    $windows = [System.Collections.ArrayList]::new()

    # Priority 1: Terminal windows running Claude Code (preferred targets)
    $terminalProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -and (
            $_.ProcessName -match "WindowsTerminal" -or
            $_.ProcessName -match "cmd" -or
            $_.ProcessName -match "powershell" -or
            $_.ProcessName -match "mintty" -or
            $_.ProcessName -match "ConEmu" -or
            $_.ProcessName -match "Hyper"
        ) -and $_.MainWindowTitle -match "[Cc]laude"
    }

    foreach ($proc in $terminalProcesses) {
        if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
            [void]$windows.Add([PSCustomObject]@{
                Handle  = $proc.MainWindowHandle
                Title   = $proc.MainWindowTitle
                Process = $proc.ProcessName
                ProcPID = $proc.Id
                Priority = 1
            })
        }
    }

    # Priority 2: Claude Desktop app (fallback only if no terminal found)
    if ($windows.Count -eq 0) {
        $claudeProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
            $_.MainWindowTitle -and
            $_.ProcessName -match "^claude$" -and
            $_.MainWindowTitle -notmatch "Firefox|Chrome|Edge"
        }

        foreach ($proc in $claudeProcesses) {
            if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
                [void]$windows.Add([PSCustomObject]@{
                    Handle  = $proc.MainWindowHandle
                    Title   = $proc.MainWindowTitle
                    Process = $proc.ProcessName
                    ProcPID = $proc.Id
                    Priority = 2
                })
            }
        }
    }

    return $windows
}

function Send-CompactCommand {
    param([IntPtr]$WindowHandle, [string]$WindowTitle)

    # Save current foreground window to restore later
    $previousWindow = [WinAPI]::GetForegroundWindow()

    try {
        # Bring Claude Code window to front
        [WinAPI]::ShowWindow($WindowHandle, 9)  # SW_RESTORE
        Start-Sleep -Milliseconds 200
        [WinAPI]::SetForegroundWindow($WindowHandle)
        Start-Sleep -Milliseconds 500

        # Verify we have focus
        $currentFg = [WinAPI]::GetForegroundWindow()
        if ($currentFg -ne $WindowHandle) {
            Write-Log "WARNING: Could not focus window '$WindowTitle'. Retrying..."
            [WinAPI]::SetForegroundWindow($WindowHandle)
            Start-Sleep -Milliseconds 500
        }

        # Type /compact and press Enter
        # Using SendKeys — {ENTER} sends Enter key
        [System.Windows.Forms.SendKeys]::SendWait("/compact")
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

        Write-Log "Sent /compact to window '$WindowTitle'"
        return $true
    } catch {
        Write-Log "ERROR sending /compact: $_"
        return $false
    } finally {
        # Restore previous window (optional — comment out to keep Claude focused)
        # [WinAPI]::SetForegroundWindow($previousWindow)
    }
}

function Send-ResumePrompt {
    param([IntPtr]$WindowHandle, [string]$WindowTitle)

    try {
        [WinAPI]::SetForegroundWindow($WindowHandle)
        Start-Sleep -Milliseconds 500

        # Type the resume prompt
        $resumeText = "continue from HANDOFF.md RESUME directive - autopilot active, do not ask, just execute"
        [System.Windows.Forms.SendKeys]::SendWait($resumeText)
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

        Write-Log "Sent resume prompt to window '$WindowTitle'"
        return $true
    } catch {
        Write-Log "ERROR sending resume: $_"
        return $false
    }
}

# Load Windows Forms for SendKeys
Add-Type -AssemblyName System.Windows.Forms

Write-Log "=== PRISM Autopilot Watchdog Started ==="
Write-Log "Polling every ${PollIntervalSec}s | Critical threshold: ${CriticalThreshold} bytes"
Write-Log "Autopilot flag: $AutopilotFlag"

# Main loop
while ($true) {
    # Check if autopilot is still active
    if (-not (Test-AutopilotActive)) {
        Write-Log "Autopilot flag cleared. Watchdog exiting."
        break
    }

    # Check context pressure
    $pressure = Get-ContextPressure

    if ($pressure -ge $CriticalThreshold) {
        Write-Log "CRITICAL PRESSURE: ${pressure} bytes (threshold: ${CriticalThreshold})"

        # Find Claude Code windows
        $windows = Find-ClaudeCodeWindow

        if ($windows.Count -eq 0) {
            Write-Log "No Claude Code windows found. Waiting..."
        } else {
            Write-Log "Found $($windows.Count) Claude Code window(s)"

            foreach ($win in $windows) {
                Write-Log "  -> '$($win.Title)' (PID: $($win.ProcPID), Process: $($win.Process))"
            }

            # Send /compact to the first (most likely active) window
            $target = $windows[0]
            Write-Log "Targeting: '$($target.Title)'"

            $sent = Send-CompactCommand -WindowHandle $target.Handle -WindowTitle $target.Title

            if ($sent) {
                Write-Log "Waiting ${CompactWaitSec}s for compaction to finish..."
                Start-Sleep -Seconds $CompactWaitSec

                # After compaction, send resume prompt
                # Re-find the window (it may have changed after compact)
                $windows = Find-ClaudeCodeWindow
                if ($windows.Count -gt 0) {
                    $target = $windows[0]
                    Send-ResumePrompt -WindowHandle $target.Handle -WindowTitle $target.Title
                    Write-Log "Resume prompt sent. Cycle complete."
                } else {
                    Write-Log "Window not found after compact. User may need to restart."
                }

                # Wait extra time for the resume to start executing
                Start-Sleep -Seconds 10
            }
        }
    } else {
        # Only log every 5th poll to reduce noise
        $pollCount = if (Test-Path "H:\prism\.claude\cache\watchdog-polls") {
            [int](Get-Content "H:\prism\.claude\cache\watchdog-polls" -ErrorAction SilentlyContinue)
        } else { 0 }
        $pollCount++
        Set-Content -Path "H:\prism\.claude\cache\watchdog-polls" -Value $pollCount -ErrorAction SilentlyContinue

        if ($pollCount % 5 -eq 0) {
            Write-Log "Poll #${pollCount}: Pressure=${pressure} bytes (OK, threshold=${CriticalThreshold})"
        }
    }

    Start-Sleep -Seconds $PollIntervalSec
}

Write-Log "=== PRISM Autopilot Watchdog Stopped ==="
