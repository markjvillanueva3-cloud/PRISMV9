@echo off
REM Locate the real Claude Code CLI without infinite recursion.
REM (A prior revision called `where claude` here, which matched THIS file
REM when run from H:\prism — causing BATCH RECURSION stack overflow.)

if exist "%APPDATA%\npm\claude.cmd" (
  "%APPDATA%\npm\claude.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%USERPROFILE%\.local\bin\claude.exe" (
  "%USERPROFILE%\.local\bin\claude.exe" %*
  exit /b %ERRORLEVEL%
)
if exist "C:\Program Files\nodejs\claude.cmd" (
  "C:\Program Files\nodejs\claude.cmd" %*
  exit /b %ERRORLEVEL%
)
echo ERROR: claude not found. Install with: npm install -g @anthropic-ai/claude-code
exit /b 1
