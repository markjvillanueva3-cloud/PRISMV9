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
python "%~dp0update_state.py" status 2>nul

echo.
echo ----------------------------------------
echo Copy this into Claude to start:
echo ----------------------------------------
echo.
echo PRISM Session. Read CURRENT_STATE.json at C:\Users\wompu\Box\PRISM REBUILD\ and continue.
echo.
echo ----------------------------------------
echo.

pause
