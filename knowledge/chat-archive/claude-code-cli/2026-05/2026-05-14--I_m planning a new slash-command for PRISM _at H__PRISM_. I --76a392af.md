---
type: "chat-session"
source: "claude-code-cli"
session_id: "76a392af-6ede-4688-ba7e-5ef9ec1099cd"
title: "I'm planning a new slash-command for PRISM (at H:\\PRISM). I need to understand h"
date: "2026-05-14"
first_ts: "2026-05-14T12:20:18.509Z"
last_ts: "2026-05-14T12:29:20.622Z"
cwd: "H:\\PRISM"
messages: 94
user_msgs: 39
assistant_msgs: 55
raw_file: "H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-a372dcde775f3838b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# I'm planning a new slash-command for PRISM (at H:\PRISM). I need to understand h

> **claude-code-cli** | 2026-05-14 | 94 msgs (39 user / 55 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-a372dcde775f3838b.jsonl`

## Transcript

### User | 2026-05-14T12:20:18.509Z

I'm planning a new slash-command for PRISM (at H:\PRISM). I need to understand how PRISM slash commands / skills are structured so my new one matches conventions.

Search "very thorough" and report back:

1. The directory layout of `.claude/commands/` in H:\PRISM (project-level skills) and `C:\Users\Mark Villanueva\.claude\commands\` (user-level skills). Are there subdirectories? How are they named?

2. Read 3-4 representative skill `.md` files end-to-end and show me their full structure — especially the frontmatter (YAML at top: name, description, model, effort, context, allowed-tools, pipeline_integrations, etc.). Pick ones that are "pipeline" or "orchestrator" style if possible. Good candidates: `.claude/commands/reap-zombies.md`, `.claude/commands/pick-build-close.md`, `.claude/commands/forge-triple.md`, any `/loop`-related or monitor-related skill, `.claude/commands/system-viz.md` (it starts a local server), `.claude/commands/checkin.md`.

3. Specifically: how do existing skills invoke background processes, monitors, or recurring work? Does any skill use the `Monitor` tool, `run_in_background`, `Bash` with `&`, or register a scheduled task? Show me the exact pattern.

4. How do skills reference scripts and helpers — do they call `node scripts/foo.mjs` or `node .claude/helpers/foo.mjs`? What's the convention for where a skill's backing script lives?

5. Is there a `pipeline_integrations:` frontmatter convention? Show an example. What does `extract-skill-triggers.mjs` consume (the `_skill-triggers.jsonl` ledger)?

6. How does the skill-auto-trigger system work — `.claude/hooks/skill-auto-trigger.mjs` and `scripts/extract-skill-triggers.mjs`? Briefly.

Show full file contents of at least 2 skill .md files so I can copy the exact frontmatter + body conventions.

### Assistant | 2026-05-14T12:20:20.465Z

I'll conduct a thorough search of PRISM's slash-command/skill structure. Let me start by exploring the directory layouts and then reading representative skill files.

### Assistant | 2026-05-14T12:20:20.922Z

[tool_use: Bash]

### User | 2026-05-14T12:20:46.106Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Format-Table: command not found

### Assistant | 2026-05-14T12:20:47.263Z

I see you're in plan mode. Let me switch to PowerShell (the correct shell for Windows) and explore the directory structure.

### Assistant | 2026-05-14T12:20:47.476Z

[tool_use: PowerShell]

### User | 2026-05-14T12:20:55.036Z

[tool_result] (PowerShell completed with no output)

### Assistant | 2026-05-14T12:20:56.360Z

Let me check if the directory exists and explore both locations:

### Assistant | 2026-05-14T12:20:57.066Z

[tool_use: PowerShell]

### User | 2026-05-14T12:21:02.609Z

[tool_result] <persisted-output>
Output too large (36.7KB). Full output saved to: C:\Users\Mark Villanueva\.claude\projects\H--PRISM\76a392af-6ede-4688-ba7e-5ef9ec1099cd\tool-results\bp77847d3.txt

Preview (first 2KB):
Project-level:

    Directory: H:\PRISM\.claude\commands

[32;1mMode   [0m[32;1m              LastWriteTime[0m[32;1m         Length[0m[32;1m Name[0m
[32;1m----   [0m [32;1m       
... [+1786 chars truncated]

### Assistant | 2026-05-14T12:21:03.634Z

Good, there are many skills. Let me search for specific files you mentioned and explore the structure:

### Assistant | 2026-05-14T12:21:04.039Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:21:04.283Z

[tool_use: Glob]

### Assistant | 2026-05-14T12:21:04.464Z

[tool_use: Glob]

### User | 2026-05-14T12:21:25.127Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:21:25.481Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-14T12:21:25.580Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-14T12:21:26.754Z

Let me use more targeted searches and read files directly:

### Assistant | 2026-05-14T12:21:26.944Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:27.293Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:27.509Z

[tool_use: Read]

### User | 2026-05-14T12:21:28.809Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\commands\reap-zombies.md' was already read 46s ago in this session and is unchanged (mtime 1778092003769). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-14T12:21:31.473Z

[tool_result] 1	---
2	name: pick-build-close
3	description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
4	trigger:
5	  autoSuggest:
6	    keywords: ["pick b
... [+5957 chars truncated]

### User | 2026-05-14T12:21:31.866Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 30
4	---
5	
6	# Forge Triple — Engines + Skills + Hooks Pipeline
7	
8	Run three forge pipelines back-to-back in a single session for maximum system growth.
9	
10	## Args: $ARGUMENTS
11	- Empty: run all three in sequence (engines → skills → hooks)
12	- `engines-only`: just engines
13	- `skills-only`: just skills
14	- `hooks-only`: just hooks
15	- `[count]`: create u
... [+9880 chars truncated]

### Assistant | 2026-05-14T12:21:34.408Z

Now let me read a few more representative skills with complete frontmatter and check for ones that use background processes/monitors:

### Assistant | 2026-05-14T12:21:34.866Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:35.078Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:35.085Z

[tool_use: Read]

### Assistant | 2026-05-14T12:21:35.294Z

[tool_use: Read]

### User | 2026-05-14T12:21:38.940Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-05-14T12:21:40.219Z

[tool_result] 1	---
2	name: checkin
3	description: Check this chat into the 7-slot PRISM fleet (claim alpha/bravo/charlie/delta/echo/foxtrot work slots OR golf hygiene slot), bind the handoff filename to the slot, reap crashed slots + stale file-claims, and verify there's no envelope/code drift, no peer-owned files staged, no stale index.lock, no diverge-from-origin. Run once at the start of any chat that's par
... [+17537 chars truncated]

### User | 2026-05-14T12:21:40.517Z

[tool_result] 1	---
2	name: system-viz
3	description: Open the PRISM Live System Map (3D, 10-layer atomic neural-network viz of the entire codebase). Auto-regenerates the graph from live state, starts the local server on :8765, and opens it in the browser.
4	---
5	
6	# System Viz — PRISM Live System Map
7	
8	**Location:** `H:/prism/state/shared/system-viz/`
9	**URL when running:** http://127.0.0.1:8765/
10	
11	
... [+5181 chars truncated]

### User | 2026-05-14T12:21:40.758Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "schedule"
6	---
7	# /schedule — Job Scheduling
8	
9	Schedule manufacturing jobs with capacity planning, due date optimization, and resource allocation.
10	
11	## Usage
12	```
13	/schedule [job-id] [--mode optimize|manual|auto]
14	```
15	
16	## MCP Action
17	```
18	prism_scheduling:schedule_job
19	```
20	
21	## Advisor Strategy (`advisor_20260418`)
... [+1027 chars truncated]

### Assistant | 2026-05-14T12:21:43.194Z

Let me check for the loop.md file with a different path and search for more examples with background processes:

### Assistant | 2026-05-14T12:21:43.532Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:21:43.956Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:21:44.186Z

[tool_use: Bash]

### User | 2026-05-14T12:22:07.003Z

[tool_result] H:\PRISM\.claude\commands/awareness-snapshot.md

### User | 2026-05-14T12:22:09.132Z

[tool_result] total 2480
-rwxr-xr-x 1 Mark V 197608   5108 Jan 20 11:14 worker-manager.sh*
-rwxr-xr-x 1 Mark V 197608   5677 Jan 20 11:14 validate-v3-config.sh*
-rwxr-xr-x 1 Mark V 197608   3282 Jan 20 11:14 v3.sh*
-rwxr-xr-x 1 Mark V 197608   2494 Jan 20 11:14 v3-quick-status.sh*
-rwxr-xr-x 1 Mark V 197608   4945 Jan 20 11:14 update-v3-progress.sh*
-rwxr-xr-x 1 Mark V 197608   7823 Jan 20 11:14 sync-v3-metrics
... [+856 chars truncated]

### User | 2026-05-14T12:22:12.105Z

[tool_result] total 8576
-rw-r--r-- 1 Mark V 197608    410 Jan 23 15:23 requirements.txt
-rwxr-xr-x 1 Mark V 197608  14705 Jan 24 14:35 regression_checker.py*
-rw-r--r-- 1 Mark V 197608  20828 Jan 30 15:45 api_swarm_executor_v2.py
-rw-r--r-- 1 Mark V 197608  10570 Jan 30 23:01 parallelGenerator.ts
-rwxr-xr-x 1 Mark V 197608  19435 Jan 31 13:55 ilp_combination_engine.py*
-rwxr-xr-x 1 Mark V 197608   6534 Jan 31 
... [+919 chars truncated]

### system

... [14 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-14T12:25:25.136Z

Let me read the skill auto-trigger and extract-skill-triggers files:

### Assistant | 2026-05-14T12:25:25.856Z

[tool_use: Read]

### Assistant | 2026-05-14T12:25:26.198Z

[tool_use: Read]

### Assistant | 2026-05-14T12:25:26.223Z

[tool_use: Bash]

### User | 2026-05-14T12:25:31.018Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
5	 *
6	 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
7	 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
8	 * event, scores the prompt against every trigger and emits top-K suggestions a
... [+6074 chars truncated]

### User | 2026-05-14T12:25:31.251Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * extract-skill-triggers.mjs — Phase D.3 of DEV-VELOCITY-AUTOTRIGGER-MS0.
4	 *
5	 * Walks every `.claude/commands/*.md` skill manifest (project + global), parses
6	 * the YAML frontmatter, extracts the `triggers:` block, and writes one JSONL
7	 * line per trigger to `knowledge/wiki/architecture/_skill-triggers.jsonl`.
8	 *
9	 * Consumed by: `skill-auto-trigger.mjs` U
... [+5652 chars truncated]

### User | 2026-05-14T12:25:46.955Z

[tool_result] file not found

### Assistant | 2026-05-14T12:25:49.399Z

Let me now search for skills that use background processes, Monitor, or run_in_background patterns:

### Assistant | 2026-05-14T12:25:49.827Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:25:50.008Z

[tool_use: Bash]

### User | 2026-05-14T12:25:58.355Z

[tool_result] H:\PRISM\.claude\commands/checkin.md
H:\PRISM\.claude\commands/claude-flow-help.md
H:\PRISM\.claude\commands/claude-flow-swarm.md
H:\PRISM\.claude\commands/continue-roadmap.md
H:\PRISM\.claude\commands/deep-search.md

### User | 2026-05-14T12:26:04.245Z

[tool_result] H:\PRISM\.claude\commands/cad-train.md:## Convergence Monitoring
H:\PRISM\.claude\commands/claude-flow-memory.md:- Monitor storage statistics
H:\PRISM\.claude\commands/claude-flow-swarm.md:## 📊 Monitoring and Control
H:\PRISM\.claude\commands/claude-flow-swarm.md:# Monitor swarm activity
H:\PRISM\.claude\commands/claude-flow-swarm.md:# Monitor specific component

### Assistant | 2026-05-14T12:26:05.490Z

Let me check a few more representative skills and look at the directory structure for scripts:

### Assistant | 2026-05-14T12:26:05.713Z

[tool_use: Read]

### Assistant | 2026-05-14T12:26:06.084Z

[tool_use: Read]

### Assistant | 2026-05-14T12:26:06.480Z

[tool_use: Bash]

### User | 2026-05-14T12:26:11.080Z

[tool_result] 1	---
2	name: claude-flow-swarm
3	description: Coordinate multi-agent swarms for complex tasks
4	policy:
5	  tier: 1
6	  triggers:
7	    - events:
8	      - "UserPromptSubmit"
9	      keywords:
10	      - "claude flow swarm"
11	  mode: "suggest"
12	  priority: 40
13	  timeout_ms: 2000
14	  token_budget: 300
15	---
16	
17	# 🐝 Claude-Flow Swarm Coordination
18	
19	Advanced multi-agent coordination s
... [+5609 chars truncated]

### User | 2026-05-14T12:26:12.328Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "continue-roadmap"
6	---
7	Continue executing a roadmap from its current position.
8	
9	## Prerequisites
10	Load these skills before starting:
11	1. `prism_skill_script->skill_content(id="prism-roadmap-schema")` -- understand the canonical schema
12	2. `prism_skill_script->skill_content(id="prism-roadmap-scrutinizer")` -- quality checks between uni
... [+6516 chars truncated]

### User | 2026-05-14T12:26:28.892Z

[tool_result] 90

### Assistant | 2026-05-14T12:26:32.489Z

Let me check the settings.json for pipeline_integrations and look at a couple more representative skill files:

### Assistant | 2026-05-14T12:26:32.491Z

[tool_use: Read]

### Assistant | 2026-05-14T12:26:32.497Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:26:32.503Z

[tool_use: Read]

### User | 2026-05-14T12:26:39.246Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "NIM_URL": "http://127.0.0.1:8000/v1",
7	    "NIM_EMBED_URL":
... [+7830 chars truncated]

### User | 2026-05-14T12:26:39.709Z

[tool_result] 1	---
2	name: big-blob-hunt
3	title: Big Blob Hunt — Git History Blob Size Audit
4	description: Scan git history for blobs above a size threshold; emit a candidates table with filter-repo / lfs-migrate / gc recommendations. Feeds U-GC-02 (history rewrite) decision-making and the GIT-TREE-DECISIONS ledger blast-radius section.
5	type: skill
6	model: sonnet
7	effort: low
8	context: development
9	all
... [+4225 chars truncated]

### User | 2026-05-14T12:26:50.374Z

[tool_result] H:\PRISM\.claude\commands/big-blob-hunt.md
H:\PRISM\.claude\commands/dispatcher-coverage.md
H:\PRISM\.claude\commands/envelope-drift-fix.md

### Assistant | 2026-05-14T12:26:54.443Z

Now let me look at user-level skills directory structure and read one more complete example:

### Assistant | 2026-05-14T12:26:54.916Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:26:55.553Z

[tool_use: Read]

### User | 2026-05-14T12:26:59.374Z

[tool_result] 1	---
2	description: Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries.
3	allowed-tools: mcp__prism_safe__prism_session, mcp__prism_safe__prism_intellig
... [+5740 chars truncated]

### User | 2026-05-14T12:27:10.133Z

[tool_result] C:\Users\Mark Villanueva\.claude\commands@

### Assistant | 2026-05-14T12:27:11.659Z

Perfect! Now let me check if there's a `.claude/commands` symlink at the user level and gather a final summary of the directory structure:

### Assistant | 2026-05-14T12:27:12.138Z

[tool_use: Bash]

### Assistant | 2026-05-14T12:27:12.525Z

[tool_use: Bash]

### User | 2026-05-14T12:27:38.273Z

[tool_result]   File: C:\Users\Mark Villanueva\.claude\commands -> /h/.claude/commands
  Size: 19        	Blocks: 0          IO Block: 65536  symbolic link
Device: bdd99080h/3185152128d	Inode: 11821949022621576  Links: 1
Access: (0777/lrwxrwxrwx)  Uid: (197608/  Mark V)   Gid: (197608/ UNKNOWN)
Access: 2026-04-28 09:09:55.490673000 -0500
Modify: 2026-04-21 08:24:38.687463300 -0500
Change: 2026-04-28 09:09:55.48
... [+57 chars truncated]

### User | 2026-05-14T12:27:39.667Z

[tool_result] H:\PRISM\.claude\commands-archive/
Archive dir exists

### Assistant | 2026-05-14T12:27:41.174Z

Excellent! Now let me create a comprehensive summary document by reviewing what I've found:

### Assistant | 2026-05-14T12:27:41.344Z

[tool_use: Bash]

### User | 2026-05-14T12:27:51.889Z

[tool_result]  16336 total

### Assistant | 2026-05-14T12:29:20.622Z

Perfect! Now I have all the information I need. Let me compile the comprehensive report:

---

## PRISM Slash-Command/Skill Structure — Complete Analysis

I've thoroughly explored PRISM's skill architecture. Here's the complete picture for your new slash-command:

### 1. Directory Layout

**Project-level skills:** `H:\PRISM\.claude\commands\`
- **~350+ skills** (.md files totaling ~16k lines)
- No subdirectories — all skills are flat at root
- Naming: kebab-case (e.g., `reap-zombies.md`, `pick-build-close.md`, `forge-triple.md`)
- Archive: `H:\PRISM\.claude\commands-archive\` for deprecated/obsolete skills

**User-level skills:** `C:\Users\Mark Villanueva\.claude\commands@` 
- **Symlink** to `/h/.claude/commands` (WSL path)
- Follows same flat structure as project level
- Precedence: **project .md > user .md > archive** (project wins on name collision)

**Helper scripts:** `H:\PRISM\.claude\helpers\` (various .mjs files for stateful operations)
**Hooks:** `H:\PRISM\.claude\hooks\` (enforcement, injection, auto-trigger logic)

---

### 2. Full Skill Frontmatter Structure + Body Conventions

**FRONTMATTER SCHEMA** (YAML at top, between `---` markers):

```yaml
---
# (REQUIRED)
name: skill-name                           # kebab-case; becomes /slash-name
description: One-line or short para        # Shown in skill help + auto-suggest list

# (OPTIONAL — context+routing)
type: skill                                # always "skill" (vs "hook", "engine")
model: sonnet|opus|haiku                   # model preference (default: Sonnet 4.6)
effort: low|medium|high                    # throughness calibration
context: development|manufacturing|safety  # domain hint
allowed-tools:                             # which tool categories this skill uses
  - Bash
  - Read
  - Grep
  - mcp__prism_safe__prism_session
  
# (OPTIONAL — auto-trigger for UserPromptSubmit)
trigger:                                   # Deprecated syntax (see triggers below)
  autoSuggest:
    keywords: ["keyword1
... [+23804 chars truncated]
