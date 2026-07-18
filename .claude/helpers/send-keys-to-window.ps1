<#
.SYNOPSIS
  send-keys-to-window.ps1 — UI Automation SendInput to a target PowerShell
  window by HWND, for the CHAT-ORCHESTRATOR-MS0 fleet orchestrator (U-CHO04).

.DESCRIPTION
  Given a target PowerShell window's HWND, types a text string into it
  followed by ENTER. The orchestrator uses this to send "/clear" or
  "/compact" into another chat's PowerShell window, or to type the
  respawn command after killing a crashed claude.exe.

  WHY THIS APPROACH instead of [System.Windows.Forms.SendKeys]::SendWait:
    SendKeys-via-WinForms requires Application.DoEvents() loops + a
    foreground-window dependency that breaks under elevated context,
    multiple-RDP-sessions, or when the user is typing. It also can't
    target a specific HWND — it always types into whatever has focus.

  This script uses User32.dll P/Invoke (FindWindowEx + SetForegroundWindow
  + SendInput) to:
    1. Validate the target HWND is alive and is a PowerShell host
       (Window class check — "ConsoleWindowClass" for legacy console,
       "PSHOST" / "CASCADIA_HOSTING_WINDOW_CLASS" for Windows Terminal).
    2. Bring the target window to the foreground (BringWindowToTop +
       SetForegroundWindow with the AttachThreadInput workaround for
       Win10/11 foreground restrictions).
    3. Synthesize keystrokes via SendInput one Unicode char at a time
       (the only reliable way to type into a foreground console window
       from another process).
    4. Synthesize an ENTER keypress.
    5. Restore the previous foreground window (best-effort).

  DOCTRINE — golf is an ORCHESTRATOR not a SEIZER. This script REQUIRES
  the caller to opt-in per call. Under `powershell.exe -File` (how every
  PRISM caller invokes it) the opt-in is the PRISM_SENDKEYS_CONFIRM=1 env
  var, NOT the -Confirm arg: -File binds argv as strings and the param-binder
  refuses to coerce "$true"/"1" into [bool]$Confirm (see .NOTES / U-ZM2-01).
  `-Confirm:$true` works ONLY when PowerShell itself parses the call (-Command).

.PARAMETER Hwnd
  Target window handle as integer (returned by Win32 FindWindow / ps-window-pin
  helpers).

.PARAMETER Text
  Text to type. ENTER is appended automatically — do NOT include a trailing
  newline. Maximum 2048 chars (defensive — the orchestrator sends single
  slash commands).

.PARAMETER Confirm
  Boolean. False (default) is dry-run -- script reports what it WOULD type but
  does not synthesize keystrokes. NOTE: under `-File` this arg cannot be set
  (the -File string->[bool] coercion fails, see U-ZM2-01); set the env var
  PRISM_SENDKEYS_CONFIRM=1 to actuate instead. The -Confirm arg only binds when
  PowerShell parses the call directly (-Command).

.PARAMETER DelayBetweenCharsMs
  Per-character delay in milliseconds. Default 15ms — fast enough that
  the operator doesn't see typing, slow enough that the target console
  doesn't drop characters under load. Range 5..200.

.PARAMETER TimeoutMs
  Maximum total time this script may run before aborting. Default 30000.
  Defensive — a wedged SetForegroundWindow shouldn't hang the cron.

.OUTPUTS
  JSON object on stdout: { ok, hwnd, className, windowTitle, chars, dryRun,
  durationMs, error? }. Exit codes: 0 success, 1 target invalid, 2 type
  failed mid-stream, 3 timeout, 4 confirmation required.

.EXAMPLE
  # Dry-run: report what would happen.
  powershell.exe -File send-keys-to-window.ps1 -Hwnd 0x12345 -Text "/clear"

.EXAMPLE
  # Actually send /clear into the window (env-var opt-in -- REQUIRED under -File;
  # `-Confirm:$true` as an arg does NOT bind here, see .PARAMETER Confirm / U-ZM2-01).
  $env:PRISM_SENDKEYS_CONFIRM=1; powershell.exe -File send-keys-to-window.ps1 -Hwnd 0x12345 -Text "/clear"

.NOTES
  CHAT-ORCHESTRATOR-MS0/U-CHO04 — golf-side fleet orchestrator.
  Knob: $env:PRISM_SENDKEYS_DISABLE = "1" → script returns error:"disabled".
  Companion: scripts/lib/chat-orchestrator-decisions.mjs (U-CHO01) decides
  WHAT to send; this script handles HOW.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)]
  [long]$Hwnd,

  [Parameter(Mandatory=$true)]
  [string]$Text,

  [bool]$Confirm = $false,

  [ValidateRange(5, 200)]
  [int]$DelayBetweenCharsMs = 15,

  [ValidateRange(1000, 600000)]
  [int]$TimeoutMs = 30000
)

$ErrorActionPreference = "Stop"
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# U-ZM2-01: env-var override for -Confirm. PowerShell's -File mode binds
# argv tokens as STRINGS, and `-Confirm:$true` / `-Confirm:1` reach the
# [bool]$Confirm param as a string and fail conversion (the param-binder
# refuses to coerce a literal string). PS reads env vars natively, no
# coercion involved. Sweep sets PRISM_SENDKEYS_CONFIRM=1 for execute mode;
# unset/0 keeps the script in dry-run. -Confirm:$true (when PS itself
# parses the script invocation, e.g. -Command) still wins if explicitly set.
if (-not $Confirm -and $env:PRISM_SENDKEYS_CONFIRM -eq "1") { $Confirm = $true }

# Kill-switch — operator can disable this entire script fleet-wide.
if ($env:PRISM_SENDKEYS_DISABLE -eq "1") {
  $out = @{ ok = $false; hwnd = $Hwnd; chars = 0; dryRun = $false; durationMs = 0; error = "disabled" }
  Write-Output ($out | ConvertTo-Json -Compress)
  exit 4
}

# Defensive length cap — orchestrator only sends short slash commands.
$MAX_TEXT_LEN = 2048
if ($Text.Length -gt $MAX_TEXT_LEN) {
  $out = @{ ok = $false; hwnd = $Hwnd; chars = 0; dryRun = $false; durationMs = 0; error = "text-too-long:$($Text.Length)>$MAX_TEXT_LEN" }
  Write-Output ($out | ConvertTo-Json -Compress)
  exit 1
}

# ───────────────────────────────────────────────────────────────────────────
# P/Invoke declarations. Add-Type compiles once per session; we wrap in
# try/catch so a re-import (orchestrator may call multiple times) is silent.
# ───────────────────────────────────────────────────────────────────────────
$pinvokeSig = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowSendKeys {
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool IsWindow(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true)]
  [return: MarshalAs(UnmanagedType.Bool)]
  public static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool BringWindowToTop(IntPtr hWnd);

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint GetCurrentThreadId();

  [DllImport("user32.dll", SetLastError = true)]
  public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

  [StructLayout(LayoutKind.Sequential)]
  public struct INPUT {
    public uint type;
    public InputUnion U;
  }

  [StructLayout(LayoutKind.Explicit)]
  public struct InputUnion {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }

  [StructLayout(LayoutKind.Sequential)]
  public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }

  [StructLayout(LayoutKind.Sequential)]
  public struct HARDWAREINPUT { public uint uMsg; public ushort wParamL; public ushort wParamH; }

  public const uint INPUT_KEYBOARD = 1;
  public const uint KEYEVENTF_KEYUP = 0x0002;
  public const uint KEYEVENTF_UNICODE = 0x0004;
  public const ushort VK_RETURN = 0x0D;

  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);
}
"@

try { Add-Type -TypeDefinition $pinvokeSig -ErrorAction Stop }
catch [System.Management.Automation.RuntimeException] {
  # Type already loaded from a previous invocation in the same PS session.
  if ($_.Exception.Message -notmatch "already exists") { throw }
}

# ───────────────────────────────────────────────────────────────────────────
# Target validation.
# ───────────────────────────────────────────────────────────────────────────
$hPtr = [IntPtr]::new($Hwnd)

if (-not [WindowSendKeys]::IsWindow($hPtr)) {
  $out = @{ ok = $false; hwnd = $Hwnd; chars = 0; dryRun = $false; durationMs = $stopwatch.ElapsedMilliseconds; error = "invalid-hwnd-not-a-window" }
  Write-Output ($out | ConvertTo-Json -Compress)
  exit 1
}

$sb = [System.Text.StringBuilder]::new(256)
[void][WindowSendKeys]::GetClassName($hPtr, $sb, $sb.Capacity)
$className = $sb.ToString()

$titleSb = [System.Text.StringBuilder]::new(512)
[void][WindowSendKeys]::GetWindowText($hPtr, $titleSb, $titleSb.Capacity)
$windowTitle = $titleSb.ToString()

# Acceptable PowerShell host window classes. ConsoleWindowClass = legacy
# conhost. CASCADIA_* = Windows Terminal. PSHOST/etc. = PS ISE / VSCode
# integrated. We're permissive — better to type into a "wrong" window
# (which the operator will see immediately and recover from) than to
# silently refuse a legitimate target because of a class-name miss.
$ALLOWED_CLASSES = @("ConsoleWindowClass", "CASCADIA_HOSTING_WINDOW_CLASS", "PSHOST")
$classAllowed = $false
foreach ($ac in $ALLOWED_CLASSES) {
  if ($className -eq $ac) { $classAllowed = $true; break }
}
# If unknown class, surface but continue — operator gates via -Confirm anyway.
$classWarning = if (-not $classAllowed) { "unknown-class:$className" } else { $null }

# ───────────────────────────────────────────────────────────────────────────
# Dry-run path (default) — report what we WOULD do, no keystrokes.
# ───────────────────────────────────────────────────────────────────────────
if (-not $Confirm) {
  $out = @{
    ok = $true; hwnd = $Hwnd; className = $className; windowTitle = $windowTitle
    chars = $Text.Length; dryRun = $true; durationMs = $stopwatch.ElapsedMilliseconds
    classWarning = $classWarning
    note = "dry-run - pass -Confirm:`$true to actually send keys"
  }
  Write-Output ($out | ConvertTo-Json -Compress)
  exit 0
}

# ───────────────────────────────────────────────────────────────────────────
# Foreground attach (the Win10/11 SetForegroundWindow workaround).
# ───────────────────────────────────────────────────────────────────────────
$prevForeground = [WindowSendKeys]::GetForegroundWindow()
$myThread = [WindowSendKeys]::GetCurrentThreadId()
$dummyPid = [uint32]0
$targetThread = [WindowSendKeys]::GetWindowThreadProcessId($hPtr, [ref]$dummyPid)
$attached = $false
if ($targetThread -ne 0 -and $targetThread -ne $myThread) {
  $attached = [WindowSendKeys]::AttachThreadInput($myThread, $targetThread, $true)
}
try {
  [void][WindowSendKeys]::BringWindowToTop($hPtr)
  [void][WindowSendKeys]::SetForegroundWindow($hPtr)
  Start-Sleep -Milliseconds 100  # let the foreground actually settle
}
finally {
  if ($attached) {
    [void][WindowSendKeys]::AttachThreadInput($myThread, $targetThread, $false)
  }
}

# ───────────────────────────────────────────────────────────────────────────
# SendInput one Unicode char at a time. Each char = two INPUT structs
# (key-down + key-up) with KEYEVENTF_UNICODE.
# ───────────────────────────────────────────────────────────────────────────
$charsTyped = 0
$structSize = [System.Runtime.InteropServices.Marshal]::SizeOf([type][WindowSendKeys+INPUT])

try {
  foreach ($ch in $Text.ToCharArray()) {
    if ($stopwatch.ElapsedMilliseconds -gt $TimeoutMs) {
      throw "timeout after $charsTyped chars"
    }
    $down = New-Object WindowSendKeys+INPUT
    $down.type = [WindowSendKeys]::INPUT_KEYBOARD
    $down.U.ki.wVk = 0
    $down.U.ki.wScan = [uint16]([int][char]$ch)
    $down.U.ki.dwFlags = [WindowSendKeys]::KEYEVENTF_UNICODE
    $down.U.ki.time = 0
    $down.U.ki.dwExtraInfo = [IntPtr]::Zero

    $up = New-Object WindowSendKeys+INPUT
    $up.type = [WindowSendKeys]::INPUT_KEYBOARD
    $up.U.ki.wVk = 0
    $up.U.ki.wScan = [uint16]([int][char]$ch)
    $up.U.ki.dwFlags = ([WindowSendKeys]::KEYEVENTF_UNICODE -bor [WindowSendKeys]::KEYEVENTF_KEYUP)
    $up.U.ki.time = 0
    $up.U.ki.dwExtraInfo = [IntPtr]::Zero

    $arr = @($down, $up)
    $sent = [WindowSendKeys]::SendInput(2, $arr, $structSize)
    if ($sent -ne 2) { throw "SendInput sent $sent of 2 events at char $charsTyped" }
    $charsTyped++
    if ($DelayBetweenCharsMs -gt 0) { Start-Sleep -Milliseconds $DelayBetweenCharsMs }
  }

  # Append ENTER.
  $entDown = New-Object WindowSendKeys+INPUT
  $entDown.type = [WindowSendKeys]::INPUT_KEYBOARD
  $entDown.U.ki.wVk = [WindowSendKeys]::VK_RETURN
  $entDown.U.ki.dwFlags = 0
  $entUp = New-Object WindowSendKeys+INPUT
  $entUp.type = [WindowSendKeys]::INPUT_KEYBOARD
  $entUp.U.ki.wVk = [WindowSendKeys]::VK_RETURN
  $entUp.U.ki.dwFlags = [WindowSendKeys]::KEYEVENTF_KEYUP
  [void][WindowSendKeys]::SendInput(2, @($entDown, $entUp), $structSize)
}
catch {
  # Best-effort: restore previous foreground window so user isn't stranded.
  if ($prevForeground -ne [IntPtr]::Zero) { [void][WindowSendKeys]::SetForegroundWindow($prevForeground) }
  $out = @{
    ok = $false; hwnd = $Hwnd; className = $className; windowTitle = $windowTitle
    chars = $charsTyped; dryRun = $false; durationMs = $stopwatch.ElapsedMilliseconds
    error = "send-failed:$($_.Exception.Message)"
  }
  Write-Output ($out | ConvertTo-Json -Compress)
  exit 2
}

# Restore previous foreground window — minimises user disruption.
if ($prevForeground -ne [IntPtr]::Zero) {
  Start-Sleep -Milliseconds 50  # let target console finish processing
  [void][WindowSendKeys]::SetForegroundWindow($prevForeground)
}

$out = @{
  ok = $true; hwnd = $Hwnd; className = $className; windowTitle = $windowTitle
  chars = $charsTyped; dryRun = $false; durationMs = $stopwatch.ElapsedMilliseconds
  classWarning = $classWarning
}
Write-Output ($out | ConvertTo-Json -Compress)
exit 0
