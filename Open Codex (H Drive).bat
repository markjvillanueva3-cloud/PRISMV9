@echo off
setlocal
set "ROOT=H:\"
cd /d "%ROOT%"
where python >nul 2>nul && python "H:\PRISM\sync-sessions.py" restore
powershell -NoProfile -ExecutionPolicy Bypass -File "H:\PRISM\scripts\repair_codex_shell_and_mcp.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -File "H:\PRISM\scripts\open_codex_from_h_drive.ps1"
endlocal
