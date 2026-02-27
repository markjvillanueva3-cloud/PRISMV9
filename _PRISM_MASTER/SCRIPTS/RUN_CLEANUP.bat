@echo off
echo ========================================
echo   PRISM Project Folder Cleanup
echo ========================================
echo.
echo This will archive old/superseded files from the project folder.
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

powershell -ExecutionPolicy Bypass -File "%~dp0cleanup_project_folder.ps1"

echo.
echo Press any key to close...
pause > nul
