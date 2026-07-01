---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "RECON for building an \"ask-before-adding-dependency\" gate in PRISM (Article 3 wo"
date: "2026-06-08"
first_ts: "2026-06-08T17:12:38.788Z"
last_ts: "2026-06-08T17:19:15.974Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_adbf59c4-b15/agent-a71cdc53f9d866df8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# RECON for building an "ask-before-adding-dependency" gate in PRISM (Article 3 wo

> **claude-code-cli** | 2026-06-08 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_adbf59c4-b15/agent-a71cdc53f9d866df8.jsonl`

## Transcript

### User | 2026-06-08T17:12:38.788Z

RECON for building an "ask-before-adding-dependency" gate in PRISM (Article 3 working-signal #1; doctrine exists at global CLAUDE.md but NO hook enforces it). DO NOT BUILD — recon + design only.
STEPS (read actual files):
1. Dedup: Grep H:/prism/.claude/hooks/ for any existing hook that gates npm install / package.json dependency additions (search: "npm install", "package.json", "dependencies", "addDependency", "new dep"). READ any candidate fully. Is there already a dep gate? (the duplication-hard-block / ai-duplication-guard gate ASSET creation, NOT npm deps — confirm they don't cover this.)
2. READ how an existing PreToolUse Bash-gating hook is shaped (e.g. find one that inspects Bash commands in C:/Users/wompu/.claude/settings.json PreToolUse Bash matcher) so a new gate matches conventions.
3. READ the global CLAUDE.md line ~45 "Ask before adding an unseen library" to anchor the doctrine the hook would enforce.
DESIGN OUTPUT: exact hook spec — name, matcher (PreToolUse on Bash for "npm install <pkg>" / "pnpm add" / "yarn add" + on Edit/Write to package.json dependencies), block-vs-warn decision (the doctrine says "ask first" => advisory warn that surfaces the dep + asks, NOT a hard block that breaks legit installs), the additionalContext message, env knob name, and exactly where it wires in settings.json. Flag the fleet-wide consequence (all 26 slots). Be concrete with file:line evidence. Note if this is genuinely worth building or if doctrine-only is sufficient.

### Assistant | 2026-06-08T17:12:54.188Z

I'll conduct a thorough reconnaissance for the "ask-before-adding-dependency" gate in PRISM. Let me start by examining the existing hooks and the global doctrine.

### Assistant | 2026-06-08T17:12:54.460Z

[tool_use: Bash]

### User | 2026-06-08T17:12:58.262Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-06-08T17:13:02.586Z

I'll reframe this to use proper Bash syntax for Windows PowerShell environment.

### Assistant | 2026-06-08T17:13:03.035Z

[tool_use: Bash]

### User | 2026-06-08T17:13:07.758Z

[tool_result] AGI_INFRA_PHASE_A_WIRING.md
HOOK-TYPE-GUIDE.md
HOOK_DIGEST.md
README.md
__tests__/
_disabled/
_envelope.mjs*
_rpc-shim.mjs*
_rpc-shim.test.mjs
activate-before-build-precheck.mjs*
activate-before-build-precheck.test.mjs
active-chat-priority-boost.mjs*
active-chat-priority-decay.mjs*
agent-boundary-guard.mjs*
agent-pid-tracker.mjs*
agent-registry-load.mjs*
agent-rules-inject.mjs*
agent-util-log.mjs*
... [+41 chars truncated]

### Assistant | 2026-06-08T17:13:10.559Z

Now let me search for existing dependency-gating hooks and examine the structure:

### Assistant | 2026-06-08T17:13:10.918Z

[tool_use: Bash]

### User | 2026-06-08T17:13:16.645Z

[tool_result] H:/prism/.claude/hooks/auto-consensus-sync-bash.test.mjs:  assert.equal(classifyDestructiveBash("rm -rf node_modules; npm install"), "rm-recursive-force");
H:/prism/.claude/hooks/grep-index-first.mjs:  { regex: /import.*from/, suggestion: 'Import search → consider checking package.json or tsconfig paths' },
H:/prism/.claude/hooks/hook-circular-dep-check.mjs: * Detects circular dependencies using T
... [+1683 chars truncated]

### Assistant | 2026-06-08T17:13:19.220Z

Let me check if there are any PreToolUse Bash hooks that gate npm commands:

### Assistant | 2026-06-08T17:13:19.645Z

[tool_use: Bash]

### User | 2026-06-08T17:13:23.901Z

[tool_result] H:/prism/.claude/hooks/auto-consensus-sync-bash.mjs
H:/prism/.claude/hooks/auto-fork-executor.mjs
H:/prism/.claude/hooks/bash-destructive-guard.mjs
H:/prism/.claude/hooks/build-cache-guard.mjs
H:/prism/.claude/hooks/claude-no-delete-files.mjs
H:/prism/.claude/hooks/commit-coordination-acquire.mjs
H:/prism/.claude/hooks/commit-draft-suggest.mjs
H:/prism/.claude/hooks/commit-ownership-guard.mjs
H:/p
... [+93 chars truncated]

### Assistant | 2026-06-08T17:13:26.801Z

Let me examine the bash-destructive-guard hook to understand the PreToolUse Bash pattern:

### Assistant | 2026-06-08T17:13:26.862Z

[tool_use: Read]

### User | 2026-06-08T17:13:29.060Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * bash-destructive-guard.mjs - PreToolUse Bash
5	 * Blocks or warns on destructive shell commands. Prevents accidental data loss.
6	 *
7	 * Git rules mirror GitSafetyEngine (mcp-server/src/engines/GitSafetyEngine.ts) —
8	 * 10-rule classifier with confirmationPrompt + saferAlternative + protected-branch
9	 * detection. Kept inline here because hooks can
... [+13649 chars truncated]

### Assistant | 2026-06-08T17:13:34.872Z

Let me now read the global CLAUDE.md to find the doctrine about "Ask before adding an unseen library":

### Assistant | 2026-06-08T17:13:35.145Z

[tool_use: Read]

### User | 2026-06-08T17:13:35.964Z

[tool_result] 1	# PRISM Global CLAUDE.md — Operational Playbook v2.5
2	
3	> **Edit `C:\Users\<your-user>\.claude\settings.json` ONLY** — the `c-to-h-mirror` hook (`.claude/hooks/mirror-c-to-h.mjs`, INTEL-OLLAMA-OBSIDIAN-MS0/P6-U01, **wired into both settings.json 2026-05-15**) auto-replicates C: → H: on every Edit/Write/MultiEdit/NotebookEdit. One-way only; SHA-256 byte-equal skip; 2s throttle; excludes cache/l
... [+10799 chars truncated]

### Assistant | 2026-06-08T17:13:38.934Z

Let me search for the specific doctrine about "Ask before adding" dependencies:

### Assistant | 2026-06-08T17:13:39.438Z

[tool_use: Bash]

### User | 2026-06-08T17:13:45.249Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-08T17:13:48.457Z

Let me check the project-level CLAUDE.md (not the system one):

### Assistant | 2026-06-08T17:13:48.568Z

[tool_use: Bash]

### User | 2026-06-08T17:13:53.019Z

[tool_result] 128:- 2026-05-27 | **[MAIN] [UI-UX-IMPROVEMENT-MS0]/U-Q-REFERENCE-LIBRARY-WIRE (slot:quebec): wire /reference-library route + restore App.tsx tracking + catal...** | observed-in: f7c373071 | fix: see commit | verify: `git -C H:/prism show f7c373071`
508:- 2026-06-01 | **fleet-task-health watched only 12/39 PRISM scheduled tasks — `discoverInstallerTasks` blind in 2 dims (slot:bravo)** | observed-i
... [+582 chars truncated]

### Assistant | 2026-06-08T17:13:56.744Z

Let me look for the Article 3 working-signal documents that mention this doctrine:

### Assistant | 2026-06-08T17:13:57.068Z

[tool_use: Bash]

### User | 2026-06-08T17:18:59.616Z

[tool_result] Command running in background with ID: brtgpqmzi. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\cc0552e9-dba5-4152-a1c1-dadd255f5c78\tasks\brtgpqmzi.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-08T17:19:02.729Z

Let me check the task reference — it says Article 3 working-signal #1. Let me search for that in state/shared:

### Assistant | 2026-06-08T17:19:02.883Z

[tool_use: Bash]

### User | 2026-06-08T17:19:10.796Z

[tool_result] -rw-r--r-- 1 wompu 197611      9184 May 15 09:45 UNWIRED-SIGNAL-VALIDATION-2026-05-15.json
-rw-r--r-- 1 wompu 197611       422 Jun  2 13:45 mcp-reconnect-signal.json
-rw-r--r-- 1 wompu 197611     75496 May 24 00:41 psn-training-signal.jsonl

### Assistant | 2026-06-08T17:19:14.579Z

Perfect—I can see task #10 is "G1: ask-before-deps gate (advisory hook or doctrine)". Let me now examine the settings.json to understand how PreToolUse hooks are wired:

### Assistant | 2026-06-08T17:19:14.847Z

[tool_use: Read]

### User | 2026-06-08T17:19:15.974Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "PRISM_PYTHON_GPU_PATH": "H:/Tools/python-gpu/Scripts/python.
... [+5927 chars truncated]
