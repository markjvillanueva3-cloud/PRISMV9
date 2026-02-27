@echo off
REM PRISM Quick Session End
REM Run this after completing a Claude session

echo.
echo ========================================
echo   PRISM SESSION END
echo ========================================
echo.

set /p COMPLETED="What did you complete? "
python "%~dp0SCRIPTS\update_state.py" complete "%COMPLETED%"

echo.
set /p NEXT_ID="Next session ID (e.g. 1.A.2): "
set /p NEXT_TASK="Next task description: "
python "%~dp0SCRIPTS\update_state.py" next "%NEXT_ID%" "%NEXT_TASK%"

echo.
echo Committing to Git...
cd /d "C:\Users\wompu\Box\PRISM REBUILD"
git add -A
git commit -m "Session complete: %COMPLETED%"
git push origin main

echo.
echo ========================================
echo   SESSION SAVED
echo ========================================
pause
