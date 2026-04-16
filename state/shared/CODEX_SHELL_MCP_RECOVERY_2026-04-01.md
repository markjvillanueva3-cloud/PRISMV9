# Codex Shell + MCP Recovery

Date: 2026-04-01
Status: staged

## What Was Added

- `H:\.codex\config.toml`
- `H:\PRISM\.codex\config.toml`
- `H:\PRISM\scripts\repair_codex_shell_and_mcp.ps1`
- `H:\LAUNCH\Repair Codex Shell + PRISM MCP.bat`
- `C:\Users\Mark Villanueva\powershell.cmd`
- `C:\Users\Mark Villanueva\pwsh.cmd`

## Intended Effect

1. Force Codex project-scoped shell environment back onto a sane Windows baseline.
2. Restore a direct MCP target for `prism` and `prism_safe` at `http://127.0.0.1:3000/mcp`.
3. Provide a one-click local repair path that:
   - restores key user env vars
   - kills stale PRISM node workers
   - relaunches the PRISM HTTP server
   - probes `/health`

## Current Limitation

The active Codex thread still cannot launch shell commands at all, so these repairs could be staged but not executed from inside this session.

## Next Step

Close and reopen Codex in `H:\PRISM`. If the shell is still broken after reopen, run:

- `H:\LAUNCH\Repair Codex Shell + PRISM MCP.bat`

Then start a fresh Codex thread in `H:\PRISM` and verify:

- shell command execution works
- `list_mcp_resources` is non-empty
- `http://127.0.0.1:3000/health` responds
