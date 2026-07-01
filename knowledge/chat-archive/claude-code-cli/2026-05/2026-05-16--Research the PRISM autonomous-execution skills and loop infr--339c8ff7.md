---
type: "chat-session"
source: "claude-code-cli"
session_id: "339c8ff7-73f9-4ab2-9d68-2e10d32f5267"
title: "Research the PRISM autonomous-execution skills and loop infrastructure. Research"
date: "2026-05-16"
first_ts: "2026-05-16T13:16:46.049Z"
last_ts: "2026-05-16T13:20:29.486Z"
cwd: "H:\\prism"
messages: 56
user_msgs: 25
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a246f88985d73d2bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# Research the PRISM autonomous-execution skills and loop infrastructure. Research

> **claude-code-cli** | 2026-05-16 | 56 msgs (25 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/339c8ff7-73f9-4ab2-9d68-2e10d32f5267/subagents/agent-a246f88985d73d2bf.jsonl`

## Transcript

### User | 2026-05-16T13:16:46.049Z

Research the PRISM autonomous-execution skills and loop infrastructure. Research only — report findings, do not edit anything.

Files to read in full:
- `H:\.claude\commands\autopilot-full.md` (read the WHOLE file — it is large)
- `H:\.claude\commands\yolo-mode.md`
- `H:\prism\.claude\commands\run-continuous.md` if it exists (glob for it)
- `H:\prism\.claude\commands\loop.md` if it exists, and any `*loop*.md` in `.claude\commands\`
- `H:\prism\.claude\helpers\loop-state.mjs` — read it fully, document its CLI subcommands (start/tick/read/end/list/reap), arguments, and the JSON state shape it writes (where does it write — `state/shared/loop-state/loop-<sid>.json`?)

Context: PRISM runs up to 12 concurrent Claude chats, each in a "slot". I am integrating the autonomous continuous-work behavior of `autopilot-full` / `yolo-mode` INTO the `/checkin` skill so a checked-in chat keeps building roadmap units as long as possible, surviving `/compact` boundaries.

Report back, with exact file paths and line numbers where relevant:
1. autopilot-full.md — its complete section outline, and specifically: how does it decide WHAT to work on, how does it LOOP (the continuous-execution mechanism), what are its stop conditions, how does it handle compaction / handoff, what is its "MASTER PROTOCOL", and what is in its new "MODERN TOOLING LAYER" section.
2. yolo-mode.md — its core autonomous rules (zero-questions, auto-select, no unit caps, auto-fix protocol).
3. loop-state.mjs — full CLI surface: every subcommand, every flag, the exact JSON shape of a loop-state file, where files are stored, and how `reap` / stale detection works.
4. run-continuous.md and any loop.md — what they do, how they pick units, how they iterate, their stop conditions.
5. Any existing skill or helper that ALREADY does "pick a roadmap unit → build it → close it → pick the next" in a loop — name it and its path (look for /pick-unit, /pick-build-close, /rgs, /goal).
6. How does autonomous work survive a `/compact`? 
... [+221 chars truncated]

### Assistant | 2026-05-16T13:16:50.425Z

I'll conduct a thorough research of the PRISM autonomous-execution skills and loop infrastructure. Let me start by reading the key files you've specified.

### Assistant | 2026-05-16T13:16:50.639Z

[tool_use: Read]

### Assistant | 2026-05-16T13:16:50.856Z

[tool_use: Read]

### Assistant | 2026-05-16T13:16:51.082Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:16:51.105Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:16:51.280Z

[tool_use: Read]

### User | 2026-05-16T13:16:53.226Z

[tool_result] No files found

### User | 2026-05-16T13:16:53.228Z

[tool_result] .claude\commands\verify-loop.md

### User | 2026-05-16T13:16:53.419Z

[tool_result] 1	---
2	name: autopilot-full
3	description: Autopilot Full — Maximum Autonomous Development Pipeline
4	trigger:
5	  autoSuggest:
6	    keywords: ["autopilot full", "autopilot full maximum autonomous development pipeline", "ultimate", "prism", "development", "assesses", "entire", "system"]
7	_triggerBackfill: 2026-05-08T17:09:13.621Z
8	---
9	
10	# Autopilot Full — Maximum Autonomous Development Pip
... [+43505 chars truncated]

### User | 2026-05-16T13:16:53.678Z

[tool_result] 1	---
2	name: yolo-mode
3	description: YOLO Mode — Maximum Velocity Development
4	---
5	
6	# YOLO Mode — Maximum Velocity Development
7	
8	Move fast, decide autonomously, minimize questions, maximize output, auto-fix issues.
9	
10	## Args: $ARGUMENTS
11	- Empty: activate YOLO mode
12	- `off`: deactivate
13	- `status`: report state
14	
15	## Core Rules
16	- **Zero questions**: Never ask "Should I p
... [+5009 chars truncated]

### User | 2026-05-16T13:16:54.014Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-state.mjs — Per-session /loop iteration state helper.
4	 *
5	 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
6	 * chat has no idea the loop was running. This helper persists iteration metadata
7	 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
8	 *
9	 * Layout: state/shared/loop-state/loo
... [+6189 chars truncated]

### Assistant | 2026-05-16T13:16:55.907Z

I'll now search for additional loop and continuous-work related files, then compile my findings.

### Assistant | 2026-05-16T13:16:56.793Z

[tool_use: Read]

### Assistant | 2026-05-16T13:16:58.248Z

[tool_use: Bash]

### Assistant | 2026-05-16T13:16:58.372Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:16:58.406Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:16:58.408Z

[tool_use: Glob]

### User | 2026-05-16T13:16:59.878Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 20
4	triggers:
5	  - event: UserPromptSubmit
6	    matcher:
7	      type: keyword
8	      value: "verify loop|verification feedback|verify before ship|verification gate"
9	    score: 0.75
10	    action: suggest
11	---
12	
13	# Verify Loop — Build + Test + Review Pipeline
14	
15	Run the full verification pipeline: build check, test run, and optional review. Ensures 
... [+3008 chars truncated]

### User | 2026-05-16T13:18:14.712Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/agents/goal/code-goal-planner.md
./.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/agents/goal/goal-planner.md
./.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/agents/reasoning/goal-planner.md
./.claude/agents/goal/code-goal-planner.md
./.claude/agents/goal/goal-planner.md
./.claude/commands/pi
... [+913 chars truncated]

### User | 2026-05-16T13:18:17.201Z

[tool_result] H:\.claude\commands\run-continuous.md

### User | 2026-05-16T13:18:17.205Z

[tool_result] H:\.claude\commands\pick-task.md

### User | 2026-05-16T13:18:17.209Z

[tool_result] H:\.claude\commands\rgs.md
H:\.claude\commands\rgs2.md
H:\.claude\commands\rgs3.md
H:\.claude\commands\rgs4.md
H:\.claude\commands\rgs5.md
H:\.claude\commands\rgs6.md

### Assistant | 2026-05-16T13:18:19.094Z

Excellent! Now let me read the key autonomous-execution skills.

### Assistant | 2026-05-16T13:18:19.272Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:19.449Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:19.685Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:19.701Z

[tool_use: Read]

### User | 2026-05-16T13:18:22.437Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-16T13:18:22.712Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-16T13:18:24.874Z

[tool_result] 1	---
2	name: run-continuous
3	description: Per-chat work loop for the 6-chat synergy protocol. Auto-claims a phase from the master atomic roadmap, executes its units, runs constant /system-viz checks, posts "ready" when phase complete. NEVER commits during the loop — commits gated by /six-chat-commit-consensus.
4	---
5	
6	---
7	policy:
8	  tier: 4
9	  triggers:
10	    - "run-continuous"
11	---
12
... [+11888 chars truncated]

### User | 2026-05-16T13:18:24.964Z

[tool_result] 1	---
2	name: rgs
3	description: RGS — Roadmap Generation System
4	---
5	
6	# RGS — Roadmap Generation System
7	
8	You are the unified entry point for the PRISM Roadmap Generation System. Based on the arguments, route to the appropriate RGS operation.
9	
10	---
11	
12	## 🪨 ATOMIC-FIRST CROSS-REFERENCE (auto-injected 2026-05-08)
13	
14	**For master-roadmap synthesis, use `/rgs4 atomic-roadmap`** — 
... [+30583 chars truncated]

### Assistant | 2026-05-16T13:18:26.456Z

Now let me search for the actual skill files that exist in the .claude/commands directory:

### Assistant | 2026-05-16T13:18:27.033Z

[tool_use: Bash]

### Assistant | 2026-05-16T13:18:27.252Z

[tool_use: Bash]

### User | 2026-05-16T13:18:46.023Z

[tool_result] ls: cannot access 'H:\.claude\commands\pick-build-close.md': No such file or directory
ls: cannot access 'H:\.claude\commands\pick-unit.md': No such file or directory

### User | 2026-05-16T13:18:46.243Z

[tool_result] H:\.claude\commands/pick-task.md

### Assistant | 2026-05-16T13:18:47.680Z

Let me read the actual pick-task skill and check for other continuous/autonomous work skills:

### Assistant | 2026-05-16T13:18:48.133Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:48.367Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:18:48.372Z

[tool_use: Glob]

### Assistant | 2026-05-16T13:18:48.500Z

[tool_use: Glob]

### User | 2026-05-16T13:18:49.561Z

[tool_result] No files found

### User | 2026-05-16T13:18:49.672Z

[tool_result] H:\.claude\commands\autopilot-camk.md
H:\.claude\commands\autopilot.md
H:\.claude\commands\autopilot-full.md

### User | 2026-05-16T13:18:49.806Z

[tool_result] H:\.claude\commands\run-continuous.md

### User | 2026-05-16T13:18:50.073Z

[tool_result] 1	---
2	name: pick-task
3	description: You are about to pick and claim a task from the PRISM Roadmap Generation System (RGS) via the TaskClaimService. This connects you to the mul
4	---
5	
6	You are about to pick and claim a task from the PRISM Roadmap Generation System (RGS) via the TaskClaimService. This connects you to the multi-Claude coordination system so multiple terminals can work on diffe
... [+10194 chars truncated]

### Assistant | 2026-05-16T13:18:51.357Z

Let me read the other autopilot variants and search for the checkin skill you mentioned:

### Assistant | 2026-05-16T13:18:51.744Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:51.817Z

[tool_use: Read]

### Assistant | 2026-05-16T13:18:52.313Z

[tool_use: Bash]

### Assistant | 2026-05-16T13:18:52.441Z

[tool_use: Bash]

### User | 2026-05-16T13:18:56.871Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 30
4	trigger:
5	  autoSuggest:
6	    keywords: ["autopilot", "autopilot full development cycle pipeline", "verify", "complete", "prism", "development", "cycle", "pick"]
7	_triggerBackfill: 2026-05-08T17:09:13.621Z
8	---
9	
10	# Autopilot — Full Development Cycle Pipeline
11	
12	Complete PRISM development cycle: pick task → execute → commit → scrutinize → fix → regi
... [+10749 chars truncated]

### User | 2026-05-16T13:18:56.896Z

[tool_result] 1	---
2	name: autopilot-camk
3	description: Autopilot CAMK+SCI — CAM Kernel & Scientific Validation Pipeline
4	trigger:
5	  autoSuggest:
6	    keywords: ["autopilot camk", "autopilot camk sci cam kernel scientific validation pipeline", "autopilot camk sci cam kernel scientific validation pipe", "self-awareness-protocol", "full", "details"]
7	_triggerBackfill: 2026-05-08T17:09:13.621Z
8	---
9	
10	#
... [+7165 chars truncated]

### User | 2026-05-16T13:19:10.679Z

[tool_result] (Bash completed with no output)

### User | 2026-05-16T13:19:11.026Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-16T13:20:29.486Z

Perfect. I've gathered comprehensive research on PRISM's autonomous-execution infrastructure. Let me compile the complete findings.

---

# PRISM AUTONOMOUS-EXECUTION SKILLS & LOOP INFRASTRUCTURE — RESEARCH FINDINGS

## 1. AUTOPILOT-FULL.MD — Complete Architecture (H:\.claude\commands\autopilot-full.md)

### Section Outline:
- **Lines 1-124**: Header + Self-Awareness Protocol (Phase 0) with AI System Routing table
- **Lines 71-121**: MODERN TOOLING LAYER — RTK, Ollama offload, system-viz, Obsidian 2nd-brain, hooks, awareness stack, scrutiny gates, session continuity, MCP dispatchers
- **Lines 122-199**: EXHAUSTIVE SCIENCE LAW (hard rule enforced at every phase)
- **Lines 202-699**: PHASE 0–9 detailed execution (Bootstrap → Assessment → Gap Analysis → Planning → Knowledge → Forge → Execution → Testing → Registration → Quality Gate)
- **Lines 701-787**: Phase Dependency Map, Cross-Phase Feedback Loops, Context Management, Error Handling, Safety Rails, Engines/Tools Utilized, Skills Chained, Hooks Leveraged, DSL Shortcode Rules

### Decision-Making Logic (WHAT to work on):

**Lines 257-315 (Phase 2: Gap Analysis):**
- **2A**: Cross-reference 499 formulas against engines; identify formula→engine gaps
- **2B**: Test gap analysis (`/forge-tests scan`) — which engines lack tests, <3 tests, untested physics models
- **2C**: Knowledge gaps — unprocessed PDFs, unlearned sources
- **2D**: Skill gaps — missing slash commands
- **2E**: Hook gaps — missing safety/efficiency hooks
- **2F**: Roadmap gaps — incomplete tracks, missing milestones

Output: Ranked TOP 10 OPPORTUNITIES matrix (H/M/L impact × S/M/L/XL complexity).

### Looping Mechanism (HOW it LOOPS continuously):

**Lines 116-118** (Session Continuity):
```
/precompact before token limit → /compact (auto-writes handoff) → SessionStart auto-resume 
injects RESUME → terminal-pin re-binds the slot.
Per-chat handoff: state/shared/handoffs/HANDOFF-<slot>-<topic>.md
```

**Lines 725-730** (Cross-Phase Feedback Loops):
- Phase
... [+18861 chars truncated]
