@echo off
REM Server-free PRISM engine invoker (Windows). Runs call-engine.mjs through tsx
REM so TS engine sources + their deps resolve from mcp-server/node_modules.
REM Usage: scripts\call-engine.cmd <module> <export.method> "<json-params>"
npx --prefix H:/prism/mcp-server tsx H:/prism/scripts/call-engine.mjs %*
