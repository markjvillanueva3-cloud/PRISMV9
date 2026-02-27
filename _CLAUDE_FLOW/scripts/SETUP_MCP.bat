@echo off
echo ============================================
echo PRISM MCP Setup - Running PowerShell Script
echo ============================================
echo.
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_mcp.ps1"
echo.
pause
