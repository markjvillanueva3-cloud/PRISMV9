@echo off
REM Wrapper for the PRISM MCP Connectivity Monitor scheduled task.
REM Single-line invocation avoids the Task Scheduler quoting gotchas that
REM bit the direct cmd.exe /c registration (LastResult=1 with no JSONL row).
REM
REM Edit knobs (env in the task definition, not here):
REM   PRISM_MONITOR_DISABLE=1 — script no-ops
cd /d H:\prism
call H:\.claude\bin\portable-node.cmd H:\prism\scripts\monitor-mcp-and-reaper.mjs --once
exit /b %ERRORLEVEL%
