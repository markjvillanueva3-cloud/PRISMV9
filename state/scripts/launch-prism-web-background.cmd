@echo off
set SystemRoot=C:\Windows
set windir=C:\Windows
set ComSpec=C:\Windows\System32\cmd.exe
set PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL
cd /d C:\PRISM\mcp-server\web
start "" /b cmd /c "\"C:\Program Files\nodejs\npm.cmd\" run dev -- --host 127.0.0.1 --port 3100 > \"C:\PRISM\state\logs\web-dev-direct.log\" 2>&1"
