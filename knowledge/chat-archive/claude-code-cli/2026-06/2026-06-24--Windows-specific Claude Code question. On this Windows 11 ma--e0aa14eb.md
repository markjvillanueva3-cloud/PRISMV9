---
type: "chat-session"
source: "claude-code-cli"
session_id: "e0aa14eb-96ac-4068-9e34-949b091a0374"
title: "Windows-specific Claude Code question. On this Windows 11 machine, Claude Code r"
date: "2026-06-24"
first_ts: "2026-06-24T14:46:24.666Z"
last_ts: "2026-06-24T14:47:16.330Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/e0aa14eb-96ac-4068-9e34-949b091a0374/subagents/agent-a4dfc6b85a1f405bc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Windows-specific Claude Code question. On this Windows 11 machine, Claude Code r

> **claude-code-cli** | 2026-06-24 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e0aa14eb-96ac-4068-9e34-949b091a0374/subagents/agent-a4dfc6b85a1f405bc.jsonl`

## Transcript

### User | 2026-06-24T14:46:24.666Z

Windows-specific Claude Code question. On this Windows 11 machine, Claude Code runs every hook command by spawning git-bash — confirmed live: `claude.exe → "C:\Program Files\Git\bin\bash.exe" -c -l "<hook command>"`. Each git-bash spawn briefly pops a console window on screen. With hundreds of hooks firing per turn across multiple concurrent Claude Code sessions, these console windows constantly pop over the user's other apps and are very disruptive. `windowsHide:true` inside the hook scripts does NOT suppress the git-bash-allocated console.

Please find authoritative answers (cite Claude Code / Anthropic docs, changelog, or settings reference where possible; if something is undocumented or unsupported, say so plainly — do NOT guess):

1. Does Claude Code expose any setting (settings.json) or environment variable to change the SHELL used to run hook commands on Windows — e.g. to use cmd.exe or PowerShell instead of git-bash?
2. Is there any Claude Code setting/flag to HIDE or suppress the console window when it spawns the hook shell on Windows (a windowsHide / no-window / detached option for hook execution)?
3. Can Claude Code be pointed at a different bash binary (e.g. the non-console `Git\usr\bin\bash.exe` instead of `Git\bin\bash.exe`), or told to skip the login shell (`-l`)? Any `CLAUDE_CODE_GIT_BASH_PATH`-style env var or shell-path setting?
4. Any other officially-supported way to stop hook execution from flashing console windows on Windows (Claude Code version settings, terminal settings, known issues + workarounds)?

Return a concise, sourced summary: for each of the 4, state whether it's possible, the exact setting/env var/command if so, and the source. Flag clearly anything you cannot verify.

### Assistant | 2026-06-24T14:46:33.109Z

I'll search the Claude Code documentation and settings reference to find authoritative answers about hook shell configuration and console window behavior on Windows.

### Assistant | 2026-06-24T14:46:33.504Z

[tool_use: WebFetch]

### Assistant | 2026-06-24T14:46:34.106Z

[tool_use: WebFetch]

### User | 2026-06-24T14:46:37.133Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Overview

> Claude Code is an agentic coding tool that reads your codebase, edits files, runs commands, and integrates with your development tools. Available in your terminal, IDE, desktop app, and browser.

Claude 
... [+14882 chars truncated]

### User | 2026-06-24T14:46:37.182Z

[tool_result] <persisted-output>
Output too large (89.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\e0aa14eb-96ac-4068-9e34-949b091a0374\tool-results\toolu_01KY6gZAmbbo1HZXTtLbucdY.txt

Preview (first 2KB):
> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

#
... [+1828 chars truncated]

### Assistant | 2026-06-24T14:46:39.614Z

Let me fetch the specific documentation pages about hooks and settings.

### Assistant | 2026-06-24T14:46:40.062Z

[tool_use: WebFetch]

### Assistant | 2026-06-24T14:46:40.314Z

[tool_use: WebFetch]

### User | 2026-06-24T14:46:51.896Z

[tool_result] # Claude Code Settings Reference

Claude Code uses a **scope system** to manage configurations at different levels:

## Configuration Scopes

| Scope | Location | Who it affects | Shared? |
|-------|----------|----------------|---------|
| **Managed** | Server/MDM/system `managed-settings.json` | All machine users | Yes (IT-deployed) |
| **User** | `~/.claude/` | You, all projects | No |
| **Proje
... [+1792 chars truncated]

### User | 2026-06-24T14:46:53.445Z

[tool_result] # Claude Code Hooks Reference

This is the official reference documentation for Claude Code's hook system. Hooks are automated actions that trigger at specific points in Claude Code's lifecycle.

## Key Concepts

**Hooks** are user-defined commands, HTTP endpoints, or LLM prompts that execute automatically at specific lifecycle points. They enable you to:
- Automate security checks and validations
... [+2516 chars truncated]

### Assistant | 2026-06-24T14:46:55.742Z

Now let me search for more detailed information about shell configuration and Windows-specific settings:

### Assistant | 2026-06-24T14:46:56.628Z

[tool_use: Grep]

### User | 2026-06-24T14:46:56.660Z

[tool_result] <tool_use_error>Path does not exist: https://code.claude.com/docs/en. Note: your current working directory is H:\prism.</tool_use_error>

### Assistant | 2026-06-24T14:46:57.035Z

[tool_use: WebFetch]

### User | 2026-06-24T14:47:02.292Z

[tool_result] > ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Advanced setup

> System requirements, platform-specific installation, version management, and uninstallation for Claude Code.

This page covers system requirements, platform-specific installation details, updates, 
... [+26487 chars truncated]

### Assistant | 2026-06-24T14:47:16.330Z

Perfect. I found the key information. Let me provide you with the authoritative answers based on the official Claude Code documentation:

---

## Summary: Windows Hook Shell Configuration & Console Window Control

Based on official Claude Code documentation ([setup.md](https://code.claude.com/docs/en/setup.md) and [settings.md](https://code.claude.com/docs/en/settings.md)), here are the answers to your four questions:

### 1. **Change the SHELL used for hook commands on Windows**
**Status:** ✅ **PARTIALLY SUPPORTED**

- **Without Git for Windows:** Claude Code automatically uses PowerShell for shell commands.
- **With Git for Windows:** Claude Code uses Git Bash by default for the Bash tool.
- **To override the bash binary path** (but NOT change the shell entirely), use the documented environment variable:
  ```json
  {
    "env": {
      "CLAUDE_CODE_GIT_BASH_PATH": "C:\\Program Files\\Git\\bin\\bash.exe"
    }
  }
  ```

**However**, there is **NO documented setting to switch from Git Bash to PowerShell for hook execution**. The docs state:
> "With Git for Windows, Claude Code uses Git Bash for the [Bash tool](/en/tools-reference#bash-tool-behavior). If Claude Code can't find Git Bash, set the path in your [settings.json file](/en/settings)..."

**Workaround:** Uninstall Git for Windows and Claude Code will fall back to PowerShell. The docs confirm: "Without Git for Windows, Claude Code runs shell commands via the PowerShell tool."

---

### 2. **Hide/suppress the console window when Claude Code spawns the hook shell**
**Status:** ❌ **NOT DOCUMENTED / UNSUPPORTED**

There is **no official Claude Code setting** (in `settings.json` or environment variables) to suppress console window visibility for hook execution on Windows. The documentation makes no mention of:
- `windowsHide` settings for hooks
- `no-window` or `detached` options for hook execution
- Console visibility controls for hook shell spawning

**Finding:** The hooks documentation ([hooks.md](https://code
... [+2245 chars truncated]
