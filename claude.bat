@echo off
REM Find claude in PATH or common locations
where claude >nul 2>nul && (claude %* & exit /b)
if exist "%USERPROFILE%\.local\bin\claude.exe" ("%USERPROFILE%\.local\bin\claude.exe" %* & exit /b)
if exist "%APPDATA%\npm\claude.cmd" ("%APPDATA%\npm\claude.cmd" %* & exit /b)
echo ERROR: claude not found. Install from https://claude.ai/download
exit /b 1
