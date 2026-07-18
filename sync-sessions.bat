@echo off
setlocal enabledelayedexpansion

:: ============================================
::  PRISM Session Sync — Portable Drive
::  Usage:  sync-sessions.bat save     (PC → H: drive)
::          sync-sessions.bat restore  (H: drive → PC)
:: ============================================

set MODE=%~1
set SSD=%~d0
set USER=%USERPROFILE%
set SYNC_DIR=%SSD%\prism\.sessions
set LOG=%SSD%\prism\sync-sessions-log.txt

if "%MODE%"=="" goto :usage
if /i "%MODE%"=="save" goto :save
if /i "%MODE%"=="restore" goto :restore
goto :usage

:: ============================================
:: SAVE — Copy sessions from this PC to H: drive
:: ============================================
:save
echo ============================================
echo  SAVE: Copying sessions from PC to H: drive
echo  Source: %USER%
echo  Target: %SYNC_DIR%
echo ============================================
echo.

:: --- Claude Code Sessions ---
echo [1/4] Claude Code project sessions (H--prism)...
set CLAUDE_SRC=%USER%\.claude\projects\H--prism
set CLAUDE_DST=%SYNC_DIR%\claude\projects\H--prism

if exist "%CLAUDE_SRC%" (
  robocopy "%CLAUDE_SRC%" "%CLAUDE_DST%" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
  echo   Synced: %CLAUDE_SRC%
) else (
  echo   SKIP: %CLAUDE_SRC% not found
)

:: Also sync any C--PRISM sessions (legacy, may have recent work)
set CLAUDE_SRC_LEGACY=%USER%\.claude\projects\C--PRISM
set CLAUDE_DST_LEGACY=%SYNC_DIR%\claude\projects\C--PRISM

if exist "%CLAUDE_SRC_LEGACY%" (
  echo   Also syncing C--PRISM legacy sessions...
  robocopy "%CLAUDE_SRC_LEGACY%" "%CLAUDE_DST_LEGACY%" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)

:: Claude Code global history + credentials (small files)
echo [2/4] Claude Code global state...
if exist "%USER%\.claude\history.jsonl" (
  copy /Y "%USER%\.claude\history.jsonl" "%SYNC_DIR%\claude\history.jsonl" >nul 2>nul
)
if exist "%USER%\.claude\.credentials.json" (
  copy /Y "%USER%\.claude\.credentials.json" "%SYNC_DIR%\claude\.credentials.json" >nul 2>nul
)
if exist "%USER%\.claude\.mcp.json" (
  copy /Y "%USER%\.claude\.mcp.json" "%SYNC_DIR%\claude\.mcp.json" >nul 2>nul
)

:: --- Codex Sessions ---
echo [3/4] Codex Desktop sessions...
set CODEX_SRC=%USER%\.codex
set CODEX_DST=%SYNC_DIR%\codex

:: Codex SQLite databases (conversation state)
if exist "%CODEX_SRC%\state_5.sqlite" (
  echo   Copying state database...
  copy /Y "%CODEX_SRC%\state_5.sqlite" "%CODEX_DST%\state_5.sqlite" >nul 2>nul
  if exist "%CODEX_SRC%\state_5.sqlite-wal" copy /Y "%CODEX_SRC%\state_5.sqlite-wal" "%CODEX_DST%\state_5.sqlite-wal" >nul 2>nul
  if exist "%CODEX_SRC%\state_5.sqlite-shm" copy /Y "%CODEX_SRC%\state_5.sqlite-shm" "%CODEX_DST%\state_5.sqlite-shm" >nul 2>nul
)

if exist "%CODEX_SRC%\logs_1.sqlite" (
  echo   Copying logs database...
  copy /Y "%CODEX_SRC%\logs_1.sqlite" "%CODEX_DST%\logs_1.sqlite" >nul 2>nul
  if exist "%CODEX_SRC%\logs_1.sqlite-wal" copy /Y "%CODEX_SRC%\logs_1.sqlite-wal" "%CODEX_DST%\logs_1.sqlite-wal" >nul 2>nul
  if exist "%CODEX_SRC%\logs_1.sqlite-shm" copy /Y "%CODEX_SRC%\logs_1.sqlite-shm" "%CODEX_DST%\logs_1.sqlite-shm" >nul 2>nul
)

:: Codex session index
if exist "%CODEX_SRC%\session_index.jsonl" (
  copy /Y "%CODEX_SRC%\session_index.jsonl" "%CODEX_DST%\session_index.jsonl" >nul 2>nul
)

:: Codex session folders (only recent — last 7 days to avoid copying 8GB+)
echo   Copying recent session folders (last 7 days)...
if exist "%CODEX_SRC%\sessions" (
  :: Use robocopy with /MAXAGE to only copy recent files
  robocopy "%CODEX_SRC%\sessions" "%CODEX_DST%\sessions" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP /MAXAGE:7 ^
    /LOG+:"%LOG%"
)

:: Codex config, rules, memories, agents
echo [4/4] Codex config and rules...
if exist "%CODEX_SRC%\config.toml" copy /Y "%CODEX_SRC%\config.toml" "%CODEX_DST%\config.toml" >nul 2>nul
if exist "%CODEX_SRC%\AGENTS.md" copy /Y "%CODEX_SRC%\AGENTS.md" "%CODEX_DST%\AGENTS.md" >nul 2>nul
if exist "%CODEX_SRC%\.codex-global-state.json" copy /Y "%CODEX_SRC%\.codex-global-state.json" "%CODEX_DST%\.codex-global-state.json" >nul 2>nul
if exist "%CODEX_SRC%\models_cache.json" copy /Y "%CODEX_SRC%\models_cache.json" "%CODEX_DST%\models_cache.json" >nul 2>nul

if exist "%CODEX_SRC%\rules" (
  robocopy "%CODEX_SRC%\rules" "%CODEX_DST%\rules" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)
if exist "%CODEX_SRC%\memories" (
  robocopy "%CODEX_SRC%\memories" "%CODEX_DST%\memories" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)
if exist "%CODEX_SRC%\skills" (
  robocopy "%CODEX_SRC%\skills" "%CODEX_DST%\skills" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)

:: Write sync manifest
echo SAVE completed: %date% %time% > "%SYNC_DIR%\SYNC_MANIFEST.txt"
echo Source Machine: %COMPUTERNAME% >> "%SYNC_DIR%\SYNC_MANIFEST.txt"
echo Source User: %USERNAME% >> "%SYNC_DIR%\SYNC_MANIFEST.txt"

echo.
echo ============================================
echo  SAVE COMPLETE!
echo  Sessions saved to: %SYNC_DIR%
echo  Log: %LOG%
echo ============================================
echo.
echo To restore on another PC:
echo   %SSD%\prism\sync-sessions.bat restore
echo.
goto :end

:: ============================================
:: RESTORE — Copy sessions from H: drive to PC
:: ============================================
:restore
echo ============================================
echo  RESTORE: Copying sessions from H: drive to PC
echo  Source: %SYNC_DIR%
echo  Target: %USER%
echo ============================================
echo.

if not exist "%SYNC_DIR%\SYNC_MANIFEST.txt" (
  echo WARNING: No saved sessions found at %SYNC_DIR%
  echo Run 'sync-sessions.bat save' on your source machine first.
  pause
  exit /b 1
)

echo Last save info:
type "%SYNC_DIR%\SYNC_MANIFEST.txt"
echo.
echo Press Ctrl+C to cancel, or
pause

:: --- Claude Code Sessions ---
echo [1/3] Restoring Claude Code sessions...

set CLAUDE_DST=%USER%\.claude\projects\H--prism
set CLAUDE_SRC=%SYNC_DIR%\claude\projects\H--prism

if exist "%CLAUDE_SRC%" (
  if not exist "%USER%\.claude\projects" mkdir "%USER%\.claude\projects" 2>nul
  robocopy "%CLAUDE_SRC%" "%CLAUDE_DST%" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP /XO ^
    /LOG+:"%LOG%"
  echo   Restored Claude Code H--prism sessions.
)

:: Legacy C--PRISM sessions
set CLAUDE_SRC_LEGACY=%SYNC_DIR%\claude\projects\C--PRISM
if exist "%CLAUDE_SRC_LEGACY%" (
  robocopy "%CLAUDE_SRC_LEGACY%" "%USER%\.claude\projects\C--PRISM" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP /XO ^
    /LOG+:"%LOG%"
  echo   Restored Claude Code C--PRISM legacy sessions.
)

:: Global files
if exist "%SYNC_DIR%\claude\history.jsonl" (
  copy /Y "%SYNC_DIR%\claude\history.jsonl" "%USER%\.claude\history.jsonl" >nul 2>nul
)

:: --- Codex Sessions ---
echo [2/3] Restoring Codex Desktop sessions...

set CODEX_SRC=%SYNC_DIR%\codex
set CODEX_DST=%USER%\.codex

if not exist "%CODEX_DST%" mkdir "%CODEX_DST%" 2>nul

:: SQLite databases
if exist "%CODEX_SRC%\state_5.sqlite" (
  echo   Restoring state database...
  copy /Y "%CODEX_SRC%\state_5.sqlite" "%CODEX_DST%\state_5.sqlite" >nul 2>nul
  if exist "%CODEX_SRC%\state_5.sqlite-wal" copy /Y "%CODEX_SRC%\state_5.sqlite-wal" "%CODEX_DST%\state_5.sqlite-wal" >nul 2>nul
  if exist "%CODEX_SRC%\state_5.sqlite-shm" copy /Y "%CODEX_SRC%\state_5.sqlite-shm" "%CODEX_DST%\state_5.sqlite-shm" >nul 2>nul
)

if exist "%CODEX_SRC%\logs_1.sqlite" (
  echo   Restoring logs database...
  copy /Y "%CODEX_SRC%\logs_1.sqlite" "%CODEX_DST%\logs_1.sqlite" >nul 2>nul
  if exist "%CODEX_SRC%\logs_1.sqlite-wal" copy /Y "%CODEX_SRC%\logs_1.sqlite-wal" "%CODEX_DST%\logs_1.sqlite-wal" >nul 2>nul
  if exist "%CODEX_SRC%\logs_1.sqlite-shm" copy /Y "%CODEX_SRC%\logs_1.sqlite-shm" "%CODEX_DST%\logs_1.sqlite-shm" >nul 2>nul
)

:: Session index and folders
if exist "%CODEX_SRC%\session_index.jsonl" (
  copy /Y "%CODEX_SRC%\session_index.jsonl" "%CODEX_DST%\session_index.jsonl" >nul 2>nul
)

if exist "%CODEX_SRC%\sessions" (
  echo   Restoring session folders...
  robocopy "%CODEX_SRC%\sessions" "%CODEX_DST%\sessions" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP /XO ^
    /LOG+:"%LOG%"
)

:: Config, rules, memories
echo [3/3] Restoring Codex config...
if exist "%CODEX_SRC%\config.toml" copy /Y "%CODEX_SRC%\config.toml" "%CODEX_DST%\config.toml" >nul 2>nul
if exist "%CODEX_SRC%\AGENTS.md" copy /Y "%CODEX_SRC%\AGENTS.md" "%CODEX_DST%\AGENTS.md" >nul 2>nul
if exist "%CODEX_SRC%\.codex-global-state.json" copy /Y "%CODEX_SRC%\.codex-global-state.json" "%CODEX_DST%\.codex-global-state.json" >nul 2>nul

if exist "%CODEX_SRC%\rules" (
  robocopy "%CODEX_SRC%\rules" "%CODEX_DST%\rules" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)
if exist "%CODEX_SRC%\memories" (
  robocopy "%CODEX_SRC%\memories" "%CODEX_DST%\memories" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)
if exist "%CODEX_SRC%\skills" (
  robocopy "%CODEX_SRC%\skills" "%CODEX_DST%\skills" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%LOG%"
)

echo.
echo ============================================
echo  RESTORE COMPLETE!
echo  Log: %LOG%
echo ============================================
echo.
echo Claude Code: cd H:\prism ^&^& claude --resume
echo Codex:       Open Codex Desktop app - sessions should appear
echo.
echo NOTE: You may need to re-authenticate:
echo   claude login
echo   codex login
echo   gh auth login
echo.
goto :end

:usage
echo ============================================
echo  PRISM Session Sync
echo ============================================
echo.
echo  Usage:
echo    sync-sessions.bat save      Save sessions from this PC to H: drive
echo    sync-sessions.bat restore   Restore sessions from H: drive to this PC
echo.
echo  Run 'save' before unplugging the drive.
echo  Run 'restore' after plugging into a new PC.
echo.
echo  Claude Code: syncs project sessions + memory + history
echo  Codex:       syncs SQLite DBs + recent sessions + config + rules
echo.

:end
endlocal
