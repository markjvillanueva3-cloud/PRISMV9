@echo off
set TRANSPORT=http
set PORT=3000
set PRISM_BIND_HOST=127.0.0.1
cd /d C:\PRISM\mcp-server
"C:\Program Files\nodejs\node.exe" dist\index.js
