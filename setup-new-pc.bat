@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  PRISM Portable SSD - New PC Setup
echo  Source: %~d0\prism  (this drive)
echo  Target: %USERPROFILE%
echo ============================================
echo.

set SSD=%~d0
set USER=%USERPROFILE%

:: Verify we're running from the portable drive
if not exist "%SSD%\prism\mcp-server\package.json" (
  echo ERROR: Cannot find %SSD%\prism\mcp-server\package.json
  echo Are you running this from the correct drive?
  pause
  exit /b 1
)

if not exist "%SSD%\USER_PROFILE" (
  echo WARNING: %SSD%\USER_PROFILE not found.
  echo Run copy-to-ssd.bat on your primary machine first to create USER_PROFILE backup.
  pause
  exit /b 1
)

echo This will copy Claude Code, Codex, and dev configs to your user profile.
echo Press Ctrl+C to cancel, or
pause

:: ============================================
:: STEP 1: Core Claude/Codex Configs
:: ============================================
echo.
echo [1/6] Copying Claude Code configs...

echo   .claude\...
robocopy "%SSD%\USER_PROFILE\.claude" "%USER%\.claude" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\setup-log.txt"

echo   .claude-squad\...
robocopy "%SSD%\USER_PROFILE\.claude-squad" "%USER%\.claude-squad" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\setup-log.txt"

echo   .codex\...
robocopy "%SSD%\USER_PROFILE\.codex" "%USER%\.codex" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\setup-log.txt"

:: ============================================
:: STEP 2: Binaries and Shell Profiles
:: ============================================
echo.
echo [2/6] Copying binaries and shell profiles...

echo   .local\ (claude.exe, codebase-memory-mcp.exe)...
robocopy "%SSD%\USER_PROFILE\.local" "%USER%\.local" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\setup-log.txt"

echo   bin\ (claude-squad.exe)...
if exist "%SSD%\USER_PROFILE\bin" (
  robocopy "%SSD%\USER_PROFILE\bin" "%USER%\bin" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\setup-log.txt"
)

echo   Shell profiles...
if exist "%SSD%\USER_PROFILE\.bashrc" copy /Y "%SSD%\USER_PROFILE\.bashrc" "%USER%\.bashrc" >nul
if exist "%SSD%\USER_PROFILE\.bash_profile" copy /Y "%SSD%\USER_PROFILE\.bash_profile" "%USER%\.bash_profile" >nul
if exist "%SSD%\USER_PROFILE\.profile" copy /Y "%SSD%\USER_PROFILE\.profile" "%USER%\.profile" >nul

echo   .gitconfig...
if exist "%SSD%\USER_PROFILE\.gitconfig" copy /Y "%SSD%\USER_PROFILE\.gitconfig" "%USER%\.gitconfig" >nul

echo   .ssh\...
if exist "%SSD%\USER_PROFILE\.ssh" (
  robocopy "%SSD%\USER_PROFILE\.ssh" "%USER%\.ssh" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\setup-log.txt"
)

:: ============================================
:: STEP 3: AppData — Claude Desktop, npm, IDE
:: ============================================
echo.
echo [3/6] Copying AppData configs...

echo   Claude Desktop config...
robocopy "%SSD%\USER_PROFILE\AppData\Roaming\Claude" "%USER%\AppData\Roaming\Claude" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /XD "Cache" "Code Cache" "GPUCache" "DawnGraphiteCache" "DawnWebGPUCache" "Crashpad" "ChromeNativeHost" ^
  /LOG+:"%SSD%\setup-log.txt"

echo   npm globals...
robocopy "%SSD%\USER_PROFILE\AppData\Roaming\npm" "%USER%\AppData\Roaming\npm" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
  /LOG+:"%SSD%\setup-log.txt"

echo   GitHub CLI...
if exist "%SSD%\USER_PROFILE\AppData\Roaming\GitHub CLI" (
  robocopy "%SSD%\USER_PROFILE\AppData\Roaming\GitHub CLI" "%USER%\AppData\Roaming\GitHub CLI" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\setup-log.txt"
)

echo   VS Code settings...
if exist "%SSD%\USER_PROFILE\AppData\Roaming\Code\User" (
  robocopy "%SSD%\USER_PROFILE\AppData\Roaming\Code\User" "%USER%\AppData\Roaming\Code\User" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /XD "workspaceStorage" "History" "globalStorage" ^
    /LOG+:"%SSD%\setup-log.txt"
)

echo   Cursor settings...
if exist "%SSD%\USER_PROFILE\AppData\Roaming\Cursor\User" (
  robocopy "%SSD%\USER_PROFILE\AppData\Roaming\Cursor\User" "%USER%\AppData\Roaming\Cursor\User" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /XD "workspaceStorage" "History" "globalStorage" ^
    /LOG+:"%SSD%\setup-log.txt"
)

:: ============================================
:: STEP 4: PowerShell Profile
:: ============================================
echo.
echo [4/6] Copying PowerShell profile...
if exist "%SSD%\USER_PROFILE\Documents\PowerShell" (
  robocopy "%SSD%\USER_PROFILE\Documents\PowerShell" "%USER%\Documents\PowerShell" /E /MT:8 /R:2 /W:1 /NFL /NDL /NP ^
    /LOG+:"%SSD%\setup-log.txt"
)

:: ============================================
:: STEP 5: Patch claude_desktop_config.json
:: ============================================
echo.
echo [5/6] Patching Claude Desktop config for this machine...

set CONFIG="%USER%\AppData\Roaming\Claude\claude_desktop_config.json"
if exist %CONFIG% (
  echo   Updating MCP server paths to use %SSD%\prism...
  powershell -NoProfile -Command ^
    "$f = Get-Content %CONFIG% -Raw; " ^
    "$f = $f -replace 'C:/PRISM/', '%SSD:\=/%/prism/'; " ^
    "$f = $f -replace 'C:\\\\PRISM\\\\', '%SSD:\=\\%\\\\prism\\\\'; " ^
    "$f | Set-Content %CONFIG% -Encoding UTF8; " ^
    "Write-Host '  claude_desktop_config.json patched.'"

  echo   NOTE: Python path in config may need manual update.
  echo   Run 'where python' and update the python.exe path in:
  echo     %CONFIG%
) else (
  echo   WARNING: claude_desktop_config.json not found at %CONFIG%
)

:: ============================================
:: STEP 6: Restore Claude Code + Codex Sessions
:: ============================================
echo.
echo [6/7] Restoring conversation sessions...
if exist "%SSD%\prism\.sessions\SYNC_MANIFEST.txt" (
  call "%SSD%\prism\sync-sessions.bat" restore
) else (
  echo   No saved sessions found. You can sync later with:
  echo     %SSD%\prism\sync-sessions.bat restore
)

:: ============================================
:: STEP 7: Install Dependencies
:: ============================================
echo.
echo [7/7] Installing dependencies...

where node >nul 2>nul
if %errorlevel% equ 0 (
  echo   Running npm ci in mcp-server...
  cd /d "%SSD%\prism\mcp-server"
  call npm ci 2>nul
  if %errorlevel% equ 0 (
    echo   npm ci completed.
  ) else (
    echo   WARNING: npm ci failed. Run manually: cd %SSD%\prism\mcp-server ^&^& npm ci
  )
) else (
  echo   WARNING: Node.js not found. Install it first, then run:
  echo     cd %SSD%\prism\mcp-server ^&^& npm ci ^&^& npm run build:fast
)

echo.
echo ============================================
echo  SETUP COMPLETE!
echo  Log: %SSD%\setup-log.txt
echo ============================================
echo.
echo REMAINING MANUAL STEPS:
echo  1. If not installed: Node.js, Python 3.12+, Git, GitHub CLI
echo  2. Run: claude login
echo  3. Run: codex login  (if using Codex)
echo  4. Run: gh auth login
echo  5. Update Python path in claude_desktop_config.json:
echo     Run 'where python' and paste the path into the config
echo  6. Build: cd %SSD%\prism\mcp-server ^&^& npm run build:fast
echo  7. Test: cd %SSD%\prism\mcp-server ^&^& npx vitest run
echo.
echo TO RESUME YOUR LAST CONVERSATION:
echo  Claude Code: cd %SSD%\prism ^&^& claude --resume
echo  Codex:       Open Codex Desktop - previous sessions should appear
echo.
echo Drive letter for PRISM: %SSD%
echo Launch Claude Code: cd %SSD%\prism ^&^& claude
echo.
pause
