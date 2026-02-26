@echo off
REM PRISM Context Generator - Creates minimal context for Claude sessions
REM Run this to get copy-paste ready context

echo ============================================
echo   PRISM SESSION CONTEXT
echo   Copy everything below into Claude
echo ============================================
echo.
echo ---BEGIN CONTEXT---
echo.
echo PRISM v9.0 Rebuild Session
echo.
echo ## Current State:
type "C:\Users\wompu\Box\PRISM\CURRENT_STATE.json" 2>nul || echo State file not found
echo.
echo ## Quick Rules:
echo - USE EVERYTHING: Wire all DBs to consumers
echo - CARRY FORWARD: Preserve all existing code
echo - VERIFY: Check before and after changes
echo - NO PARTIALS: Complete extractions only
echo.
echo ## Paths:
echo - Box: C:\Users\wompu\Box\PRISM\
echo - Extracted: [Box]\EXTRACTED\
echo - Scripts: [Box]\SCRIPTS\
echo.
echo ---END CONTEXT---
echo.
echo ============================================
pause
