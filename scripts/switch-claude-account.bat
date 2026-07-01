@echo off
REM ============================================================
REM PRISM Account Switcher — Seamlessly switch Claude Max accounts
REM Double-click this when you hit your weekly limit.
REM ============================================================

echo.
echo  ===================================
echo   PRISM Claude Account Switcher
echo  ===================================
echo.

REM Step 1: Save current session state
echo [1/4] Saving session state...
if exist "H:\prism\state\HANDOFF.md" (
    copy /Y "H:\prism\state\HANDOFF.md" "H:\prism\state\HANDOFF_backup.md" >nul 2>&1
    echo       HANDOFF.md backed up
) else (
    echo       No active HANDOFF.md (OK)
)

REM Step 2: Kill orphaned node processes to free memory
echo [2/4] Cleaning up orphaned processes...
node "H:\prism\.claude\helpers\node-orphan-cleaner.mjs" >nul 2>&1
echo       Orphan cleanup done

REM Step 3: Logout current account
echo [3/4] Logging out current account...
echo.
call claude logout 2>nul
echo.

REM Step 4: Login with new account
echo [4/4] Login with your other account...
echo       (Browser will open for authentication)
echo.
call claude login
echo.

REM Verify
echo  ===================================
echo   Switch complete!
echo  ===================================
echo.
echo   All settings, hooks, memory, and
echo   MCP server config are preserved.
echo.
echo   To resume work:
echo     cd H:\prism
echo     claude
echo.
echo   The session will auto-load:
echo   - CLAUDE.md (project context)
echo   - 52 hooks (settings.json)
echo   - MEMORY.md (shared memory)
echo   - HANDOFF.md (resume point)
echo.
pause
