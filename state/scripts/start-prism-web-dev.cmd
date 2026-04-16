@echo off
cd /d C:\PRISM\mcp-server\web
"C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 3100
