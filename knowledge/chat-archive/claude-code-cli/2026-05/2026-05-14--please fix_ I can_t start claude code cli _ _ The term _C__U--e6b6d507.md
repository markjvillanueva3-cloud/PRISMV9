---
type: "chat-session"
source: "claude-code-cli"
session_id: "e6b6d507-d49b-4fa6-97e8-527bf7bae037"
title: "please fix, I can't start claude code cli & : The term 'C:\\Users\\wompu\\AppData\\R"
date: "2026-05-14"
first_ts: "2026-05-14T22:03:38.818Z"
last_ts: "2026-05-14T22:08:35.565Z"
cwd: "H:\\prism"
messages: 13
user_msgs: 6
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/e6b6d507-d49b-4fa6-97e8-527bf7bae037.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:54"
---

# please fix, I can't start claude code cli & : The term 'C:\Users\wompu\AppData\R

> **claude-code-cli** | 2026-05-14 | 13 msgs (6 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e6b6d507-d49b-4fa6-97e8-527bf7bae037.jsonl`

## Transcript

### User | 2026-05-14T22:04:43.737Z

please fix, I can't start claude code cli & : The term 'C:\Users\wompu\AppData\Roaming\npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the spellingof the name, or if a path was included, verify that the path is correct and try again.At C:\Users\wompu\AppData\Roaming\npm\claude.ps1:14 char:5+   & "$basedir/node_modules/@anthropic-ai/claude-code/bin/claude.exe"  ...+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    + CategoryInfo          : ObjectNotFound: (C:\Users\wompu\.../bin/claude.exe:String) [], CommandNotFoundException

### Assistant | 2026-05-14T22:04:56.267Z

[tool_use: Bash]

### Assistant | 2026-05-14T22:05:00.521Z

[tool_use: Bash]

### User | 2026-05-14T22:05:02.960Z

[tool_result] claude.exe.old.1778796227831*
---PACKAGE---
{
  "name": "@anthropic-ai/claude-code",
  "version": "2.1.140",
  "bin": {
    "claude": "bin/claude.exe"
  },
  "scripts": {
    "postinstall": "node install.cjs",
    "prepare": "node -e \"if (!process.env.AUTHORIZED) { console.error('ERROR: Direct publishing is not allowed.\\nPlease see the release workflow documentation to publish this package.'); p
... [+504 chars truncated]

### User | 2026-05-14T22:05:07.281Z

[tool_result] ccusage*
ccusage.cmd
ccusage.ps1*
claude*
claude-code-intelligence*
claude-code-intelligence.cmd
claude-code-intelligence.ps1*
claude-flow*
claude-flow.cmd
claude-flow.ps1*
claude-intelligence-analyze-file*
claude-intelligence-analyze-file.cmd
claude-intelligence-analyze-file.ps1*
claude-intelligence-init*
claude-intelligence-init.cmd
claude-intelligence-init.ps1*
claude-intelligence-mcp*
claude-i
... [+1108 chars truncated]

### Assistant | 2026-05-14T22:05:18.912Z

[tool_use: Bash]

### User | 2026-05-14T22:05:21.791Z

[tool_result] -rwxr-xr-x 2 wompu 197611 227456160 May 13 16:43 C:/Users/wompu/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe.old.1778796227831*
---H:PRISM claude.bat---
@echo off
REM Locate the real Claude Code CLI without infinite recursion.
REM (A prior revision called `where claude` here, which matched THIS file
REM when run from H:\prism — causing BATCH RECURSION stack overflow.)

... [+600 chars truncated]

### Assistant | 2026-05-14T22:05:38.950Z

Found it. Your Claude Code auto-updater got interrupted mid-swap: it renamed the working binary to `claude.exe.old.1778796227831` but never wrote the new `claude.exe` in its place. The `.old` file is a complete, valid 227 MB executable (v2.1.140) — so I just need to rename it back.

### Assistant | 2026-05-14T22:05:39.875Z

[tool_use: Bash]

### User | 2026-05-14T22:05:43.529Z

[tool_result] -rwxr-xr-x 2 wompu 197611 227456160 May 13 16:43 claude.exe*
RESTORED
Shell cwd was reset to H:\prism

### Assistant | 2026-05-14T22:05:47.422Z

[tool_use: Bash]

### User | 2026-05-14T22:05:50.242Z

[tool_result] 2.1.140 (Claude Code)

### Assistant | 2026-05-14T22:05:58.245Z

Fixed. Verified working — `claude.exe --version` → `2.1.140 (Claude Code)`.

## What happened

Claude Code's auto-updater swaps binaries in two steps: rename `claude.exe` → `claude.exe.old.<timestamp>`, then write the new `claude.exe`. Yours got interrupted between those steps (May 13 16:43), so the `bin/` directory was left with **only** the `.old` file and no `claude.exe`. Every shim (`claude.ps1`, `claude.cmd`, and `H:\PRISM\claude.bat` which delegates to them) pointed at a binary that no longer existed.

## The fix

Renamed `claude.exe.old.1778796227831` back to `claude.exe`. The `.old` file was a complete, full-size (227 MB) v2.1.140 executable — nothing was corrupted, just misnamed — so no reinstall was needed.

You can start the CLI from a new terminal now.

## If it happens again

An interrupted update is the cause. If you hit it again and there's no intact `.old` file to restore, reinstall with:
```powershell
npm install -g @anthropic-ai/claude-code
```

One side note: `where.exe claude` resolves to `H:\PRISM\claude.bat` first. That's fine — it correctly delegates to the npm shim — just be aware your `claude` command chains through that wrapper.
