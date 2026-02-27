@echo off
REM PRISM Quick Session Start
REM Run this before starting a Claude session

echo.
echo ========================================
echo   PRISM SESSION READY
echo ========================================
echo.

REM Show current state
echo Current Status:
python "%~dp0SCRIPTS\update_state.py" status 2>nul

echo.
echo ----------------------------------------
echo Copy this into Claude to start:
echo ----------------------------------------
echo.
echo PRISM Session. Read PROJECT_INDEX.json at %~dp0 and continue.
echo.
echo ----------------------------------------
echo.

pause
