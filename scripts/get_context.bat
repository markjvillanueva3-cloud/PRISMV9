@echo off
REM PRISM Context Generator - Creates minimal context for Claude sessions
REM Run this to get copy-paste ready context

set "PRISM_ROOT=%~dp0.."

echo ============================================
echo   PRISM SESSION CONTEXT
echo   Copy everything below into Claude
echo ============================================
echo.
echo ---BEGIN CONTEXT---
echo.
echo PRISM v9.0 Rebuild Session
echo.
echo ## Project Index (read PROJECT_INDEX.json for full context):
type "%PRISM_ROOT%\PROJECT_INDEX.json" 2>nul || (
  echo PROJECT_INDEX.json not found, falling back to CURRENT_STATE.json:
  type "%PRISM_ROOT%\CURRENT_STATE.json" 2>nul || echo No state file found
)
echo.
echo ## Quick Rules:
echo - USE EVERYTHING: Wire all DBs to consumers
echo - CARRY FORWARD: Preserve all existing code
echo - VERIFY: Check before and after changes
echo - NO PARTIALS: Complete extractions only
echo.
echo ## Paths:
echo - Repo: %PRISM_ROOT%
echo - Extracted: %PRISM_ROOT%\EXTRACTED\
echo - Scripts: %PRISM_ROOT%\SCRIPTS\
echo.
echo ---END CONTEXT---
echo.
echo ============================================
pause
