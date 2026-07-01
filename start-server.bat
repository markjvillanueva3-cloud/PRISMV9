@echo off
REM Drive-portable: resolve relative to this script's location, not a hardcoded C:.
set TRANSPORT=http
set PORT=3000
cd /d "%~dp0mcp-server"
node dist\index.js
