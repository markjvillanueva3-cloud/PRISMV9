' run-hidden.vbs - truly invisible launcher for scheduled tasks.
'
' Why this exists: powershell.exe -WindowStyle Hidden still briefly allocates
' a console before hiding it, producing a 1-frame flash. wscript.exe (Windows
' Script Host) NEVER allocates a console; a child process spawned via
' WScript.Shell.Run with windowStyle=0 inherits "no console" cleanly.
'
' Usage:
'   wscript.exe //nologo run-hidden.vbs <exe-path> [arg1] [arg2] ...
'
' Each argument is forwarded as a separate token; paths with spaces are
' re-quoted for Shell.Run. Returns the child's exit code (0 on success;
' WScript itself returns 0 even if the child failed since bWaitOnReturn
' is False - we don't block the task scheduler on long-running children).

Option Explicit

Dim cmdLine, i, arg
If WScript.Arguments.Count < 1 Then
  WScript.Quit 0
End If

' Re-construct a properly-quoted command line for Shell.Run.
cmdLine = Chr(34) & WScript.Arguments(0) & Chr(34)
For i = 1 To WScript.Arguments.Count - 1
  arg = WScript.Arguments(i)
  ' Quote anything containing whitespace; leave bare flags like --once alone.
  If InStr(arg, " ") > 0 Then
    cmdLine = cmdLine & " " & Chr(34) & arg & Chr(34)
  Else
    cmdLine = cmdLine & " " & arg
  End If
Next

' windowStyle=0 (vbHide), bWaitOnReturn=False (don't block).
CreateObject("WScript.Shell").Run cmdLine, 0, False
WScript.Quit 0
