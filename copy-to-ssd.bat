@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  PRISM - Backup to Portable SSD
echo  Source: H:\prism + user profile
echo  Target: Specify drive letter as argument
echo  Usage:  copy-to-ssd.bat D
echo ============================================
echo.

:: Accept target drive letter as argument, default to D:
set TARGET_DRIVE=%~1
if "%TARGET_DRIVE%"=="" (
  echo Usage: copy-to-ssd.bat [DRIVE_LETTER]
  echo Example: copy-to-ssd.bat D
  echo.
  set /p TARGET_DRIVE="Enter target drive letter (e.g., D): "
)
set SSD=%TARGET_DRIVE%:
set USER=%USERPROFILE%
set SRC=H:\prism

:: Verify source exists
if not exist "%SRC%\mcp-server\package.json" (
  echo ERROR: H:\prism\mcp-server\package.json not found.
  echo This script should be run from a machine with PRISM on H: drive.
  pause
  exit /b 1
)

echo Backing up PRISM from H:\prism to %SSD%\
echo Press Ctrl+C to cancel, or
pause

:: ============================================
:: PRISM PROJECT (skipping heavy/generated dirs)
:: ============================================
echo.
echo [1/5] Copying PRISM project...

echo   H:\prism\ (skipping node_modules, dist, __pycache__, .venv, .git)...
robocopy "%SRC%" "%SSD%\prism" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /XD "node_modules" "dist" "__pycache__" ".venv" ".git" ^
  /XF "*.pyc" ^
  /LOG+:"%SSD%\copy-log.txt"

if exist "H:\PRISM_ARCHIVE_2026-02-01" (
  echo   H:\PRISM_ARCHIVE_2026-02-01\...
  robocopy "H:\PRISM_ARCHIVE_2026-02-01" "%SSD%\PRISM_ARCHIVE_2026-02-01" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /XD "node_modules" "__pycache__" ^
    /LOG+:"%SSD%\copy-log.txt"
)

:: ============================================
:: USER PROFILE — Claude, Codex, Dev Configs
:: ============================================
echo.
echo [2/5] Copying user profile configs to %SSD%\USER_PROFILE\...

echo   .claude\...
robocopy "%USER%\.claude" "%SSD%\USER_PROFILE\.claude" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\copy-log.txt"

echo   .claude-squad\...
if exist "%USER%\.claude-squad" (
  robocopy "%USER%\.claude-squad" "%SSD%\USER_PROFILE\.claude-squad" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   .codex\...
if exist "%USER%\.codex" (
  robocopy "%USER%\.codex" "%SSD%\USER_PROFILE\.codex" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   .local\ (binaries)...
robocopy "%USER%\.local" "%SSD%\USER_PROFILE\.local" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\copy-log.txt"

echo   bin\...
if exist "%USER%\bin" (
  robocopy "%USER%\bin" "%SSD%\USER_PROFILE\bin" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   Shell profiles...
if exist "%USER%\.bashrc" copy /Y "%USER%\.bashrc" "%SSD%\USER_PROFILE\.bashrc" >nul
if exist "%USER%\.bash_profile" copy /Y "%USER%\.bash_profile" "%SSD%\USER_PROFILE\.bash_profile" >nul
if exist "%USER%\.profile" copy /Y "%USER%\.profile" "%SSD%\USER_PROFILE\.profile" >nul

echo   .gitconfig...
if exist "%USER%\.gitconfig" copy /Y "%USER%\.gitconfig" "%SSD%\USER_PROFILE\.gitconfig" >nul

echo   .ssh\...
if exist "%USER%\.ssh" (
  robocopy "%USER%\.ssh" "%SSD%\USER_PROFILE\.ssh" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   .cursor\...
if exist "%USER%\.cursor" (
  robocopy "%USER%\.cursor" "%SSD%\USER_PROFILE\.cursor" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

:: ============================================
:: APPDATA
:: ============================================
echo.
echo [3/5] Copying AppData configs...

echo   Claude Desktop...
robocopy "%USER%\AppData\Roaming\Claude" "%SSD%\USER_PROFILE\AppData\Roaming\Claude" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /XD "Cache" "Code Cache" "GPUCache" "DawnGraphiteCache" "DawnWebGPUCache" "Crashpad" "ChromeNativeHost" ^
  /LOG+:"%SSD%\copy-log.txt"

echo   npm globals...
robocopy "%USER%\AppData\Roaming\npm" "%SSD%\USER_PROFILE\AppData\Roaming\npm" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\copy-log.txt"

echo   GitHub CLI...
if exist "%USER%\AppData\Roaming\GitHub CLI" (
  robocopy "%USER%\AppData\Roaming\GitHub CLI" "%SSD%\USER_PROFILE\AppData\Roaming\GitHub CLI" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   VS Code settings...
if exist "%USER%\AppData\Roaming\Code\User" (
  robocopy "%USER%\AppData\Roaming\Code\User" "%SSD%\USER_PROFILE\AppData\Roaming\Code\User" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /XD "workspaceStorage" "History" "globalStorage" ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   Cursor settings...
if exist "%USER%\AppData\Roaming\Cursor\User" (
  robocopy "%USER%\AppData\Roaming\Cursor\User" "%SSD%\USER_PROFILE\AppData\Roaming\Cursor\User" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /XD "workspaceStorage" "History" "globalStorage" ^
    /LOG+:"%SSD%\copy-log.txt"
)

echo   uv (Python manager)...
if exist "%USER%\AppData\Roaming\uv" (
  robocopy "%USER%\AppData\Roaming\uv" "%SSD%\USER_PROFILE\AppData\Roaming\uv" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

:: ============================================
:: POWERSHELL + PYTHON/NPM FREEZE
:: ============================================
echo.
echo [4/5] Copying PowerShell profile + saving package lists...

if exist "%USER%\Documents\PowerShell" (
  robocopy "%USER%\Documents\PowerShell" "%SSD%\USER_PROFILE\Documents\PowerShell" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\copy-log.txt"
)

where python >nul 2>nul && python -m pip freeze > "%SSD%\USER_PROFILE\requirements-freeze.txt" 2>nul
call npm list -g --depth=0 > "%SSD%\USER_PROFILE\npm-globals.txt" 2>nul

:: ============================================
:: SESSION SYNC — Claude Code + Codex conversations
:: ============================================
echo.
echo [5/6] Syncing Claude Code + Codex sessions to drive...
call "%~dp0sync-sessions.bat" save

:: ============================================
:: SUMMARY
:: ============================================
echo.
echo [6/6] Writing backup manifest...
echo PRISM Backup - %date% %time% > "%SSD%\BACKUP_MANIFEST.txt"
echo Source Machine: %COMPUTERNAME% >> "%SSD%\BACKUP_MANIFEST.txt"
echo Source User: %USERNAME% >> "%SSD%\BACKUP_MANIFEST.txt"
echo Source Drive: H:\prism >> "%SSD%\BACKUP_MANIFEST.txt"
echo Target Drive: %SSD% >> "%SSD%\BACKUP_MANIFEST.txt"

echo.
echo ============================================
echo  BACKUP COMPLETE!
echo  Log: %SSD%\copy-log.txt
echo  Manifest: %SSD%\BACKUP_MANIFEST.txt
echo ============================================
echo.
echo To set up on a new PC, run: %SSD%\prism\setup-new-pc.bat
echo.
pause
