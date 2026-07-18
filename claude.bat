@echo off
REM Locate the real Claude Code CLI without infinite recursion.
REM (A prior revision called `where claude` here, which matched THIS file
REM when run from H:\prism -- causing BATCH RECURSION stack overflow.)
REM Order: most-likely-correct on THIS host first, then portable fallbacks.
REM Use goto-based control flow + delayed expansion so %ERRORLEVEL%
REM does NOT freeze at parse-time inside () blocks.
REM
REM Default flags baked in (user-requested 2026-05-19): every invocation runs
REM with --dangerously-skip-permissions. Bypass by calling the real shim
REM directly: H:\Tools\nodejs\claude.cmd <your-args>
setlocal enabledelayedexpansion
REM Opus 4.8 default-wiring (2026-05-28 slot:alpha — same gap as
REM claude-with-cleanup.cmd: bare `claude.exe` here was inheriting Sonnet).
REM claude.exe respects the LAST --model on the command line, so a user can
REM override with their own --model flag and it'll win.
set "CLAUDE_FLAGS=--dangerously-skip-permissions --model claude-opus-4-8[1m] --fallback-model claude-opus-4-7[1m]"

if not exist "H:\Tools\nodejs\claude.cmd" goto :try2
call "H:\Tools\nodejs\claude.cmd" %CLAUDE_FLAGS% %*
endlocal & exit /b %ERRORLEVEL%

:try2
if not exist "%APPDATA%\npm\claude.cmd" goto :try3
call "%APPDATA%\npm\claude.cmd" %CLAUDE_FLAGS% %*
endlocal & exit /b %ERRORLEVEL%

:try3
if not exist "%USERPROFILE%\.local\bin\claude.exe" goto :try4
"%USERPROFILE%\.local\bin\claude.exe" %CLAUDE_FLAGS% %*
endlocal & exit /b %ERRORLEVEL%

:try4
if not exist "C:\Program Files\nodejs\claude.cmd" goto :notfound
call "C:\Program Files\nodejs\claude.cmd" %CLAUDE_FLAGS% %*
endlocal & exit /b %ERRORLEVEL%

:notfound
echo ERROR: claude.cmd not found in any of:
echo   H:\Tools\nodejs\claude.cmd             ^[npm-global on this host^]
echo   %%APPDATA%%\npm\claude.cmd              ^[npm-user default^]
echo   %%USERPROFILE%%\.local\bin\claude.exe   ^[user-local^]
echo   C:\Program Files\nodejs\claude.cmd     ^[system-wide nodejs^]
echo.
echo To install, run the following at a cmd prompt:
echo   npm install -g @anthropic-ai/claude-code
endlocal & exit /b 1
