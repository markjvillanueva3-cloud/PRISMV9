---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "I need to author a Hermes skill (and possibly a cron job) for the Hermes Agent a"
date: "2026-06-15"
first_ts: "2026-06-15T00:52:54.871Z"
last_ts: "2026-06-15T00:56:49.504Z"
cwd: "H:\\prism-slot-sierra"
messages: 108
user_msgs: 47
assistant_msgs: 61
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a41bdba6aa9afdb97.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# I need to author a Hermes skill (and possibly a cron job) for the Hermes Agent a

> **claude-code-cli** | 2026-06-15 | 108 msgs (47 user / 61 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a41bdba6aa9afdb97.jsonl`

## Transcript

### User | 2026-06-15T00:52:54.871Z

I need to author a Hermes skill (and possibly a cron job) for the Hermes Agent app's "zulu" profile so it can launch an external PowerShell command (the PRISM Claude Code fleet launcher). Hermes Agent v0.16.0 (Nous Research) is installed at C:\Users\wompu\AppData\Local\hermes\. Report the exact skill + cron formats and where to place a zulu-profile skill. Be concrete and concise.

EXAMINE (read-only):
1. The Hermes skill format: read example skill files under C:\Users\wompu\.hermes\skills\ (e.g. skills/autonomous-ai-agents, skills/dogfood) and any per-profile skills under C:\Users\wompu\AppData\Local\hermes\profiles\*\skills\. What is the skill file structure (markdown? yaml frontmatter? a SKILL.md? a manifest)? How does a skill declare steps / tool calls / shell commands?
2. The existing PRISM skill referenced by Hermes cron: find the skill named `prism-vault-loop` (referenced in C:\Users\wompu\AppData\Local\hermes\cron\jobs.json). Where is it, what does it contain? It's the working example of a PRISM<->Hermes skill.
3. Does a `zulu` profile exist? Check C:\Users\wompu\AppData\Local\hermes\profiles\zulu\ — its config.yaml, skills/, cron/. If zulu is absent, note which profiles exist.
4. How does Hermes run a SHELL command from a skill or as an agent action? Look in the hermes-agent source C:\Users\wompu\AppData\Local\hermes\hermes-agent\ for the terminal/shell tool (terminal.backend: local in config). Can a skill/cron invoke `powershell -File ...`? 
5. How are Hermes cron jobs defined (cron/jobs.json schema) and how is a new one added (CLI command `hermes cron ...`?). What model + skill + schedule fields exist?

Report: the skill file format (with a real example), where to place a zulu-profile skill, the cron job schema + the CLI to add one, and confirmation that a skill can shell out to PowerShell. Cite exact paths + real file contents. If zulu profile is absent, say so.

### Assistant | 2026-06-15T00:52:59.038Z

I'll examine the Hermes installation systematically. Let me run all searches in parallel.

### Assistant | 2026-06-15T00:52:59.872Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:53:00.649Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:53:00.860Z

[tool_use: Bash]

### User | 2026-06-15T00:53:23.672Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### User | 2026-06-15T00:53:23.799Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### User | 2026-06-15T00:53:23.964Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-06-15T00:53:25.969Z

Let me search properly using PowerShell syntax and Glob/Read tools.

### Assistant | 2026-06-15T00:53:27.265Z

[tool_use: PowerShell]

### Assistant | 2026-06-15T00:53:28.165Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:29.357Z

[tool_result] [32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\.hermes\skills
C:\Users\wompu\.hermes\skills\apple
C:\Users\wompu\.hermes\skills\autonomous-ai-agents
C:\Users\wompu\.hermes\skills\creative
C:\Users\wompu\.hermes\skills\data-science
C:\Users\wompu\.hermes\skills\devops
C:\Users\wompu\.hermes\skills\diagramming
C:\Users\wompu\.hermes\skills\dogfood
C:\Users\wompu\.hermes\skills\doma
... [+17163 chars truncated]

### User | 2026-06-15T00:53:31.845Z

[tool_result] <persisted-output>
Output too large (1.1MB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tool-results\becen6orv.txt

Preview (first 2KB):
[32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\audio_cache
C:\Users\wompu\AppData\Local\hermes\bin
C:\Users\wompu\AppData\Local\hermes\bootstrap-cache
C:\Users\
... [+1762 chars truncated]

### Assistant | 2026-06-15T00:53:34.099Z

Let me read the key files in parallel now.

### Assistant | 2026-06-15T00:53:34.616Z

[tool_use: Read]

### Assistant | 2026-06-15T00:53:35.448Z

[tool_use: Read]

### Assistant | 2026-06-15T00:53:35.735Z

[tool_use: Read]

### User | 2026-06-15T00:53:36.502Z

[tool_result] 1	---
2	name: claude-code
3	description: "Delegate coding to Claude Code CLI (features, PRs)."
4	version: 2.2.0
5	author: Hermes Agent + Teknium
6	license: MIT
7	platforms: [linux, macos, windows]
8	metadata:
9	  hermes:
10	    tags: [Coding-Agent, Claude, Anthropic, Code-Review, Refactoring, PTY, Automation]
11	    related_skills: [codex, hermes-agent, opencode]
12	---
13	
14	# Claude Code — Herm
... [+36633 chars truncated]

### Assistant | 2026-06-15T00:53:36.878Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:37.101Z

[tool_result] 1	---
2	name: dogfood
3	description: "Exploratory QA of web apps: find bugs, evidence, reports."
4	version: 1.0.0
5	platforms: [linux, macos, windows]
6	metadata:
7	  hermes:
8	    tags: [qa, testing, browser, web, dogfood]
9	    related_skills: []
10	---
11	
12	# Dogfood: Systematic Web Application QA Testing
13	
14	## Overview
15	
16	This skill guides you through systematic exploratory QA testin
... [+6384 chars truncated]

### Assistant | 2026-06-15T00:53:37.123Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:37.271Z

[tool_result] 1	---
2	name: hermes-agent-skill-authoring
3	description: "Author in-repo SKILL.md: frontmatter, validator, structure."
4	version: 1.0.0
5	author: Hermes Agent
6	license: MIT
7	platforms: [linux, macos, windows]
8	metadata:
9	  hermes:
10	    tags: [skills, authoring, hermes-agent, conventions, skill-md]
11	    related_skills: [writing-plans, requesting-code-review]
12	---
13	
14	# Authoring Herme
... [+7738 chars truncated]

### User | 2026-06-15T00:53:38.419Z

[tool_result] [32;1mName      [0m[32;1m FullName[0m
[32;1m----      [0m [32;1m--------[0m
output     C:\Users\wompu\AppData\Local\hermes\cron\output
.tick.lock C:\Users\wompu\AppData\Local\hermes\cron\.tick.lock
jobs.json  C:\Users\wompu\AppData\Local\hermes\cron\jobs.json

### User | 2026-06-15T00:53:40.326Z

[tool_result] [32;1mName   [0m[32;1m FullName[0m
[32;1m----   [0m [32;1m--------[0m
alpha   C:\Users\wompu\AppData\Local\hermes\profiles\alpha
bravo   C:\Users\wompu\AppData\Local\hermes\profiles\bravo
charlie C:\Users\wompu\AppData\Local\hermes\profiles\charlie
delta   C:\Users\wompu\AppData\Local\hermes\profiles\delta
echo    C:\Users\wompu\AppData\Local\hermes\profiles\echo
foxtrot C:\Users\wo
... [+939 chars truncated]

### Assistant | 2026-06-15T00:53:43.424Z

Excellent — the `zulu` profile exists. Now let me read the cron jobs.json and explore the zulu profile and find the prism-vault-loop skill.

### Assistant | 2026-06-15T00:53:44.215Z

[tool_use: Read]

### User | 2026-06-15T00:53:44.961Z

[tool_result] read-once-guard: 'C:\Users\wompu\AppData\Local\hermes\cron\jobs.json' was already read 8m ago in this session and is unchanged (mtime 1781321666178). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-15T00:53:45.089Z

[tool_use: PowerShell]

### Assistant | 2026-06-15T00:53:45.820Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:46.596Z

[tool_result] <persisted-output>
Output too large (87.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tool-results\blhdembgi.txt

Preview (first 2KB):
[32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\profiles\zulu\audio_cache
C:\Users\wompu\AppData\Local\hermes\profiles\zulu\cache
C:\Users\wompu\AppData\Local\he
... [+1785 chars truncated]

### User | 2026-06-15T00:53:48.910Z

[tool_result] [32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\skills\.hub
C:\Users\wompu\AppData\Local\hermes\skills\agent-system-mirroring
C:\Users\wompu\AppData\Local\hermes\skills\agentic-development
C:\Users\wompu\AppData\Local\hermes\skills\apple
C:\Users\wompu\AppData\Local\hermes\skills\autonomous-ai-agents
C:\Users\wompu\AppData\Local\hermes\skills\creative
C:\Users\w
... [+5403 chars truncated]

### Assistant | 2026-06-15T00:53:51.554Z

[tool_use: PowerShell]

### Assistant | 2026-06-15T00:53:52.337Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:52.730Z

[tool_result] [32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\skills\prism\prism-daily-brief-loop
C:\Users\wompu\AppData\Local\hermes\skills\prism\prism-vault-loop
C:\Users\wompu\AppData\Local\hermes\skills\prism\zulu-autonomous-building
C:\Users\wompu\AppData\Local\hermes\skills\prism\prism-daily-brief-loop\SKILL.md
C:\Users\wompu\AppData\Local\hermes\skills\prism\prism-vault-
... [+97 chars truncated]

### Assistant | 2026-06-15T00:53:53.055Z

[tool_use: PowerShell]

### Assistant | 2026-06-15T00:53:53.695Z

[tool_use: PowerShell]

### User | 2026-06-15T00:53:55.048Z

[tool_result] <persisted-output>
Output too large (84.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-sierra\ed91599e-19b8-4bdb-8ea8-87e47b6ee322\tool-results\bus0wzyvp.txt

Preview (first 2KB):
[32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\profiles\zulu\skills\.hub
C:\Users\wompu\AppData\Local\hermes\profiles\zulu\skills\agent-system-mirroring
C:\User
... [+1793 chars truncated]

### User | 2026-06-15T00:53:56.346Z

[tool_result] [32;1mFullName[0m
[32;1m--------[0m
C:\Users\wompu\AppData\Local\hermes\profiles\zulu\cron\output

### User | 2026-06-15T00:53:57.552Z

[tool_result] {
  "jobs": [
    {
      "id": "044ec1701ace",
      "name": "PRISM morning vault brief",
      "prompt": "Run the 'morning vault brief' job exactly as defined in the prism-vault-loop skill. Use today's date for all file paths and date-stamps. You are ZULU; obey the skill's hard rules. If chained context from the previous evening's inbox sweep is present above, treat it as yesterday's state:
... [+3911 chars truncated]

### Assistant | 2026-06-15T00:54:00.899Z

Now let me read the key remaining files: prism-vault-loop SKILL.md, zulu-autonomous-building SKILL.md, the zulu profile's config.yaml and SOUL.md, and look for shell/terminal tool source.

### system

... [28 middle messages omitted -- see raw_file] ...

### User | 2026-06-15T00:54:42.833Z

[tool_result] 120	)
121	
122	
123	def _check_disk_usage_warning():
124	    """Check if total disk usage exceeds warning threshold."""
125	    try:
126	        scratch_dir = _get_scratch_dir()
127	
128	        # Get total size of hermes directories
129	        total_bytes = 0
130	        import glob
131	        for path in glob.glob(str(scratch_dir / "hermes-*")):
132	            for f in Path(path).rglob('*'):

... [+7548 chars truncated]

### User | 2026-06-15T00:54:50.648Z

[tool_result] [32;1mName                 [0m[32;1m FullName[0m
[32;1m----                 [0m [32;1m--------[0m
__pycache__           C:\Users\wompu\AppData\Local\hermes\hermes-agent\cron\__pycache__
scripts               C:\Users\wompu\AppData\Local\hermes\hermes-agent\cron\scripts
__init__.py           C:\Users\wompu\AppData\Local\hermes\hermes-agent\cron\__init__.py
blueprint_catalog.py  C:\User
... [+433 chars truncated]

### User | 2026-06-15T00:54:51.919Z

[tool_result] #!/usr/bin/env python3
"""
Hermes Agent CLI launcher.

This wrapper should behave like the installed `hermes` command, including
subcommands such as `gateway`, `[7mcron[0m`, and `doctor`.[0m
[7m[0m"""[0m
[7m[0m
[7m[0mif __name__ == "__main__":[0m
[7m[0m    from hermes_cli.main import main[0m
[7m[0m    main()[0m

### Assistant | 2026-06-15T00:54:55.110Z

Let me read the key remaining files — cron/jobs.py for create_job schema, the terminal_tool local execution function, and the hermes CLI cron subcommand:

### Assistant | 2026-06-15T00:54:55.501Z

[tool_use: Read]

### Assistant | 2026-06-15T00:54:57.630Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:54:58.042Z

[tool_use: Glob]

### User | 2026-06-15T00:55:00.973Z

[tool_result] 1	"""
2	Cron job storage and management.
3	
4	Jobs are stored in ~/.hermes/cron/jobs.json
5	Output is saved to ~/.hermes/cron/output/{job_id}/{timestamp}.md
6	"""
7	
8	import copy
9	import json
10	import logging
11	import shutil
12	import tempfile
13	import threading
14	import os
15	import re
16	import uuid
17	from datetime import datetime, timedelta
18	from pathlib import Path
19	from hermes_cons
... [+3915 chars truncated]

### User | 2026-06-15T00:55:02.536Z

[tool_result] 12-- "modal": Execute in Modal cloud sandboxes (direct Modal or managed gateway)
13-
14-Features:
15:- Multiple execution backends (local, docker, modal)
16-- Background task support
17-- VM/container lifecycle management
18-- Automatic cleanup after inactivity
--
571-        return False
572-
573-    try:
574:        probe = subprocess.run(
575-            ["sudo", "-n", "true"],
576-            
... [+1825 chars truncated]

### User | 2026-06-15T00:55:02.695Z

[tool_result] C:\Users\wompu\AppData\Local\hermes\hermes-agent\hermes_cli\cron.py
C:\Users\wompu\AppData\Local\hermes\hermes-agent\hermes_cli\subcommands\cron.py

### Assistant | 2026-06-15T00:55:06.359Z

Let me read the cron CLI subcommand and the terminal_tool function signature:

### Assistant | 2026-06-15T00:55:06.749Z

[tool_use: Read]

### Assistant | 2026-06-15T00:55:07.550Z

[tool_use: Read]

### Assistant | 2026-06-15T00:55:08.263Z

[tool_use: Read]

### User | 2026-06-15T00:55:10.754Z

[tool_result] 1	"""``hermes cron`` subcommand parser.
2	
3	Extracted verbatim from ``hermes_cli/main.py:main()`` — same arguments, same
4	``func=cmd_cron`` dispatch. The handler is injected so this module does not
5	import ``main`` (cycle avoidance).
6	"""
7	
8	from __future__ import annotations
9	
10	from typing import Callable
11	
12	from hermes_cli.subcommands._shared import add_accept_hooks_flag
13	
14	
15	
... [+5655 chars truncated]

### User | 2026-06-15T00:55:11.708Z

[tool_result] 1823	def terminal_tool(
1824	    command: str,
1825	    background: bool = False,
1826	    timeout: Optional[int] = None,
1827	    task_id: Optional[str] = None,
1828	    force: bool = False,
1829	    workdir: Optional[str] = None,
1830	    pty: bool = False,
1831	    notify_on_complete: bool = False,
1832	    watch_patterns: Optional[List[str]] = None,
1833	) -> str:
1834	    """
1835	    Execute
... [+3969 chars truncated]

### User | 2026-06-15T00:55:12.601Z

[tool_result] 120	
121	def _normalize_job_record(job: Dict[str, Any]) -> Dict[str, Any]:
122	    """Return a read-safe cron job shape for UI/API/tool/scheduler consumers.
123	
124	    Older or hand-edited jobs can have nullable fields like ``prompt``,
125	    ``name``, or ``schedule_display``.  Keep storage untouched on read, but
126	    ensure consumers never crash while formatting or running those records.
12
... [+4067 chars truncated]

### Assistant | 2026-06-15T00:55:15.472Z

Now I have all the information needed. Let me read the create_job function signature and check how the `--model` flag works in cron create:

### Assistant | 2026-06-15T00:55:16.983Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:55:18.123Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:55:19.395Z

[tool_use: Grep]

### User | 2026-06-15T00:55:19.917Z

[tool_result] 521-
522-
523:def create_job(
524-    prompt: Optional[str],
525-    schedule: str,
526-    name: Optional[str] = None,
527-    repeat: Optional[int] = None,
528:    deliver: Optional[str] = None,
529-    origin: Optional[Dict[str, Any]] = None,
530-    skill: Optional[str] = None,
531-    skills: Optional[List[str]] = None,
532:    model: Optional[str] = None,
533-    provider: Optional[str] = No
... [+3683 chars truncated]

### User | 2026-06-15T00:55:20.894Z

[tool_result] No matches found

### User | 2026-06-15T00:55:21.284Z

[tool_result] No matches found

### Assistant | 2026-06-15T00:55:25.145Z

Now let me check one more thing — how `--model` is passed through the CLI cron create, and how `terminal_tool` actually executes locally on Windows (to confirm PowerShell invocation):

### Assistant | 2026-06-15T00:55:26.751Z

[tool_use: Grep]

### User | 2026-06-15T00:55:27.989Z

[tool_result] No matches found

### Assistant | 2026-06-15T00:55:28.439Z

[tool_use: Grep]

### User | 2026-06-15T00:55:29.602Z

[tool_result] 263-                                  approval_callback=_get_approval_callback())
264-
265-
266-# Allowlist: characters that can legitimately appear in directory paths.
267:# Covers alphanumeric, path separators, Windows drive/UNC separators, tilde,
268-# dot, hyphen, underscore, space, plus, at, equals, and comma.  Everything
269-# else is rejected.
270-_WORKDIR_SAFE_RE = re.compile(r'^[A-Za-z0-9
... [+932 chars truncated]

### Assistant | 2026-06-15T00:55:31.833Z

Let me get the local execution path specifically for Windows in terminal_tool:

### Assistant | 2026-06-15T00:55:33.400Z

[tool_use: Grep]

### User | 2026-06-15T00:55:34.328Z

[tool_result] 351-        try:
352:            if platform.system() == "Windows":
353-                import msvcrt
354-                chars = []
355-                while True:
356-                    c = msvcrt.getwch()
357-                    if c in {"\r", "\n"}:

[Showing results with pagination = offset: 20]

### Assistant | 2026-06-15T00:55:34.378Z

[tool_use: Read]

### User | 2026-06-15T00:55:35.371Z

[tool_result] 620	    # Surface this as a clear ValueError at create time so bad configs never
621	    # reach the scheduler.
622	    if normalized_no_agent and not normalized_script:
623	        raise ValueError(
624	            "no_agent=True requires a script — with no agent and no script "
625	            "there is nothing for the job to run."
626	        )
627	
628	    # Normalize context_from: accept str 
... [+2037 chars truncated]

### Assistant | 2026-06-15T00:55:38.501Z

I now have everything needed. Let me do one final targeted read to confirm how terminal_tool dispatches locally on Windows (the local execution branch):

### Assistant | 2026-06-15T00:55:40.848Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:55:41.811Z

[tool_use: Read]

### User | 2026-06-15T00:55:43.217Z

[tool_result] 599-    Rewriting the tail to `A && { B & }` preserves `&&`'s error semantics
600-    (skip B if A fails) while replacing the subshell with a brace group.
601-    The brace group runs in the current shell (no fork), backgrounds B as
602:    a simple command (bash doesn't wait for it in non-interactive mode),
603-    and exits immediately. B runs as a normal backgrounded child, orphaned
604-    whe
... [+2342 chars truncated]

### User | 2026-06-15T00:55:43.795Z

[tool_result] 150	
151	    cron_remove = cron_subparsers.add_parser(
152	        "remove", aliases=["rm", "delete"], help="Remove a scheduled job"
153	    )
154	    cron_remove.add_argument("job_id", help="Job ID to remove")
155	
156	    # cron status
157	    cron_subparsers.add_parser("status", help="Check if cron scheduler is running")
158	
159	    # cron tick (mostly for debugging)
160	    cron_tick = cron_s
... [+200 chars truncated]

### Assistant | 2026-06-15T00:56:49.504Z

I have everything I need. Here is the complete concrete report.

---

## Hermes Skill + Cron Format for ZULU — PRISM Fleet Launcher

### 1. Skill File Format

Every skill is a single file named `SKILL.md` inside a directory named after the skill, inside a category directory. The file is pure Markdown with a YAML frontmatter block.

**Validated constraints** (from `tools/skill_manager_tool.py`):
- Must start at byte 0 with `---` (no leading blank line, no BOM)
- Closes with `\n---\n` before the body
- `name` field required, lowercase + hyphens, max 64 chars
- `description` field required, max 1024 chars
- Non-empty body after closing `---`
- Total file max 100,000 chars (aim for 8–15k)

**Real example** (`C:\Users\wompu\AppData\Local\hermes\skills\prism\prism-vault-loop\SKILL.md` frontmatter):
```yaml
---
name: prism-vault-loop
description: "ZULU's Obsidian-vault self-learning loop: read the PRISM vault before acting, write outcomes back after. Powers the morning brief, inbox sweep, and weekly self-improvement review."
version: 1.0.0
author: PRISM zulu slot (2026-06-09)
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [PRISM, vault, obsidian, self-learning, orchestration, zulu]
    related_skills: [obsidian]
---
```

The body is plain Markdown prose describing what the agent should do when the skill is loaded. Skills contain **no executable steps or YAML step arrays** — they are instruction documents for the LLM. The agent follows them using its tool calls (`terminal_tool`, `mcp_prism_*`, `write_file`, etc.). There is no separate manifest or step runner — the SKILL.md body IS the agent's system-prompt injection.

---

### 2. Where to Place a Zulu-Profile Skill

The zulu profile exists at:

`C:\Users\wompu\AppData\Local\hermes\profiles\zulu\`

Its skills tree is:

`C:\Users\wompu\AppData\Local\hermes\profiles\zulu\skills\`

The existing PRISM skills for zulu are already placed under a `prism` category within that tree:

```
C:\Users\wompu\AppData\Local\
... [+8748 chars truncated]
