---
type: "chat-session"
source: "claude-code-cli"
session_id: "99abda93-f068-4ff7-84d0-02ca67df3aee"
title: "READ-ONLY task (do NOT edit/write any file). You are gathering context for the P"
date: "2026-06-11"
first_ts: "2026-06-11T02:55:58.477Z"
last_ts: "2026-06-11T02:56:48.831Z"
cwd: "H:\\prism-slot-golf"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-golf/99abda93-f068-4ff7-84d0-02ca67df3aee/subagents/agent-a4e3800a4612949e7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# READ-ONLY task (do NOT edit/write any file). You are gathering context for the P

> **claude-code-cli** | 2026-06-11 | 15 msgs (7 user / 8 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/99abda93-f068-4ff7-84d0-02ca67df3aee/subagents/agent-a4e3800a4612949e7.jsonl`

## Transcript

### User | 2026-06-11T02:55:58.477Z

READ-ONLY task (do NOT edit/write any file). You are gathering context for the PRISM "golf" slot = the fleet-hygiene galaxy. Read these files IN FULL using absolute main-tree paths (H:/prism/...):
- H:/prism/mcp-server/src/engines/fleet-hygiene/MEMORY.md
- H:/prism/mcp-server/src/engines/fleet-hygiene/CLAUDE.md  (if it exists)
- H:/prism/mcp-server/src/engines/fleet-hygiene/PATHS.md
- H:/prism/mcp-server/src/engines/fleet-hygiene/TOOLBELT.md
- H:/prism/state/shared/per-slot-galaxy-buildout/golf.md
- H:/prism/knowledge/memories/patterns/fleet-hygiene_synthesis.md  (if it exists)

If a file is missing, say so explicitly (do not fabricate). 

Return a COMPACT digest (≤350 words, plain text, no preamble):
(a) what the golf/fleet-hygiene domain OWNS (responsibilities);
(b) key engines/scripts/hooks/scheduled-tasks named in these files (just names + 1-line role);
(c) explicit OPEN THREADS / "next" / "pending" / "gaps" mentioned anywhere in these files;
(d) context-retention WEAKNESSES you notice (stale dates, missing pointers, broken [[links]], TODO markers).
Cite the file each fact comes from. This digest is the tool result — return raw data, not a human-facing message.

### Assistant | 2026-06-11T02:56:01.884Z

I'll read all the requested files in parallel.

### Assistant | 2026-06-11T02:56:02.331Z

[tool_use: Read]

### User | 2026-06-11T02:56:03.229Z

[tool_result] 1	# GOLF Galaxy Memory — Fleet Hygiene + Reaper + MCP Server
2	
3	Cross-session memory for the **golf** slot (position 7 of 26 NATO, `alpha..zulu`). Golf is a full work slot that ALSO owns fleet-reaper duty (ownership moved alpha→golf 2026-05-16, [[feedback_golf_owns_reaper]]). Append-only — older entries collapse to `state/shared/MEMORY-RECENT.md` per the central `MEMORY.md` size discipline.
4	
5
... [+19392 chars truncated]

### Assistant | 2026-06-11T02:56:03.247Z

[tool_use: Read]

### Assistant | 2026-06-11T02:56:03.710Z

[tool_use: Read]

### Assistant | 2026-06-11T02:56:04.130Z

[tool_use: Read]

### Assistant | 2026-06-11T02:56:04.729Z

[tool_use: Read]

### Assistant | 2026-06-11T02:56:04.826Z

[tool_use: Read]

### User | 2026-06-11T02:56:05.461Z

[tool_result] 1	# Fleet Hygiene Galaxy (GOLF slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> GOLF — DESIGNATED FLEET REAPER (MUST KEEP RUNNING AT ALL TIMES; periodic check of zombie/orphan node, bash, git, read, grep, search tasks & processes), MCP server updates/upgrades/fixes, general work.
5	
6	This card is the per-domain operating doctrine. The full asset map, regression classes, and live-st
... [+7621 chars truncated]

### User | 2026-06-11T02:56:06.231Z

[tool_result] 1	# Fleet-Hygiene Galaxy — H:/-wide PATHS atlas (slot: golf)
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:golf. Format: `<path> | <purpose> | <maintainer>`. Verified 2026-05-29.
4	
5	## Reaper core (scripts)
6	- `H:/prism/scripts/fleet-reaper-sweep.mjs` | sweep brain (--once/--monitor-loop/--status/--json) | golf
7	- `H:/prism/scripts/fleet-memory-monitor.mjs` | RAM/per-claude-tree a
... [+5834 chars truncated]

### User | 2026-06-11T02:56:06.305Z

[tool_result] 1	# Fleet-Hygiene Galaxy — TOOLBELT (slot: golf)
2	
3	> Memoized tool-call patterns slot:golf reaches for most. Each saves tokens/time vs. the naive alternative. Verified 2026-05-29.
4	
5	## Bash one-liners (the reaper loop)
6	- `node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json` | the canonical sweep — pipe through a `node -e` JSON filter to print only `{mem,slots,pending,caveats,gpu,oll
... [+4543 chars truncated]

### User | 2026-06-11T02:56:06.531Z

[tool_result] 1	# Galaxy buildout — slot:golf (galaxy:fleet-hygiene)
2	
3	> **Auto-fire trigger:** this file is THE first prompt slot:golf executes on fresh-launch when `mcp-server/src/engines/fleet-hygiene/` is missing OR incomplete.
4	> **Master protocol:** `state/shared/specs/PER-SLOT-GALAXY-BUILD-KIT.md`
5	
6	## Your mission (per operator goal 2026-05-28)
7	
8	Build slot:golf's **complete galaxy** so future
... [+17649 chars truncated]

### User | 2026-06-11T02:56:07.027Z

[tool_result] 1	---
2	name: fleet-hygiene_synthesis
3	description: "[auto-synth · verify] Compounding synthesis of the fleet-hygiene domain — recurring patterns, decisions, open threads distilled from 7 memories (LLM-generated; verify against source memories before trusting)"
4	metadata:
5	  type: patterns
6	  galaxy: fleet-hygiene
7	  synthesizedFrom: 7
8	  model: gpt-oss:120b
9	  synthesizedAt: 2026-06-10T20:
... [+3832 chars truncated]

### Assistant | 2026-06-11T02:56:48.831Z

**COMPACT DIGEST: Golf / Fleet-Hygiene Galaxy**

---

**(a) DOMAIN OWNERSHIP**
Golf = process janitor + GPU/Ollama coordinator + service-health watchdog + fleet-config doctor for the 26-chat fleet. Canonical scope (CHAT-SLOT-DOMAINS.md, cited in MEMORY.md + CLAUDE.md): "DESIGNATED FLEET REAPER (MUST KEEP RUNNING AT ALL TIMES) — zombie/orphan node sweep (bash, git, read, grep, search, taskkill), MCP server updates/upgrades/fixes, general work." Full work-slot privileges since 2026-05-20 doctrine shift (CLAUDE.md).

---

**(b) KEY ASSETS** (source: MEMORY.md + PATHS.md + CLAUDE.md)

Scripts:
- `scripts/fleet-reaper-sweep.mjs` — sweep brain; --once/--monitor-loop/--status/--json
- `scripts/fleet-memory-monitor.mjs` — per-claude.exe-tree RAM advisor, 5-min cron
- `scripts/fleet-task-health-watch.mjs` — watchdog-over-watchdogs for 8+ PRISM scheduled tasks
- `scripts/fleet-services-watchdog.mjs` — Docker/service health
- `scripts/fleet-status.mjs` — slot roster renderer
- `scripts/fleet-doctrine-sweep.mjs` — doctrine-compliance sweep

Helpers:
- `.claude/helpers/chat-slots.mjs` — slot CRUD: reclaim/claim/golf-liveness/find
- `.claude/helpers/process-slot-map.mjs` — PID-to-slot classifier (full ancestry walk)
- `.claude/helpers/install-fleet-reaper-task.ps1` — registers PRISM Fleet Reaper scheduled task (ELEVATED required)
- `.claude/helpers/fleet-reaper-enum-cache.mjs` — enumeration cache sidecar (MS2)
- `.claude/helpers/fleet-reaper-host-presets.mjs` — cross-PC host filter (MS2; box = DESKTOP-N7MI1VB)
- `.claude/helpers/cleanup-orchestrator.mjs` — GENERIC stale locks/claims reaper (sibling to slot-aware sweep; run both)

Hooks:
- `.claude/hooks/golf-slot-reaper-guardian.mjs` — SessionStart+UserPromptSubmit backstop (golf-only)
- `.claude/hooks/fleet-reaper-stop.mjs` — Stop-hook sweep arm (45s global throttle)
- `.claude/hooks/fleet-task-health-stop.mjs` — task-health Stop audit
- `.claude/hooks/critical-memory-compact-nudge.mjs` — UserPromptSubmit; targets ONE /compact p
... [+3377 chars truncated]
