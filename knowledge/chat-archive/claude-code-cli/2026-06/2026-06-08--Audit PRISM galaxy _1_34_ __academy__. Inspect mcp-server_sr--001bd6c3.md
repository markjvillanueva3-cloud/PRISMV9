---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Audit PRISM galaxy #1/34: **academy**. Inspect mcp-server/src/engines/academy/{M"
date: "2026-06-08"
first_ts: "2026-06-08T20:33:55.877Z"
last_ts: "2026-06-08T20:35:57.732Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-aa40d33aa1cb4b8b8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Audit PRISM galaxy #1/34: **academy**. Inspect mcp-server/src/engines/academy/{M

> **claude-code-cli** | 2026-06-08 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-aa40d33aa1cb4b8b8.jsonl`

## Transcript

### User | 2026-06-08T20:33:55.877Z

Audit PRISM galaxy #1/34: **academy**. Inspect mcp-server/src/engines/academy/{MEMORY,PATHS,TOOLBELT,CLAUDE}.md and count its real domain assets. Score it x/8 against the rubric, list the GAPS, and give the exact FILL recommendation per gap.


GOAL (operator, helping zulu): audit each of the 34 PRISM galaxies "1 by 1 in sequential order to ensure their galaxies are setup to their maximum potential." The concern: many galaxies don't have all their memories, file paths, wikis, and tribal knowledge properly mapped — each chat slot needs FULL context of its domain at all times. Use Obsidian + the Ollama/Docker local stack to fill gaps.

GROUND TRUTH (verified this session):
- A galaxy = a doctrine/index folder at mcp-server/src/engines/<galaxy>/ with 4 artifacts: CLAUDE.md (domain doctrine), MEMORY.md (per-domain brain), PATHS.md (maps the galaxy's real assets), TOOLBELT.md (the galaxy's tools/dispatchers). ALL 34 galaxies HAVE all 4 files — the question is DEPTH/COMPLETENESS, not existence.
- Engines do NOT live inside the galaxy dir — they're flat in mcp-server/src/engines/*.ts; the galaxy's PATHS.md REFERENCES them (e.g. mill PATHS.md has 58 path-refs). So "complete PATHS" = it maps the galaxy's real scattered domain assets (engines, dispatchers, wiki, tribal, corpus paths).
- Vault mirror: knowledge/memories/galaxies/<galaxy>/MEMORY.md now exists for all 34 (just filled this session).
- Wiki: knowledge/wiki/{architecture,lessons,code-tribal,concepts,...}/ — coverage is UNEVEN (wedm ~49 wiki files, speed-feed ~2). Tribal: knowledge/wiki/code-tribal/.
- Local stack: Ollama UP (:11434, models incl gpt-oss:20b/qwen2.5-coder:32b for classification/summarization), MCP :3100 UP, Qdrant DOWN (semantic_search degraded — use lexical/file search).

THE COMPLETENESS RUBRIC (score each galaxy against this — from state/shared/specs/MASTER-BRAIN-TEMPLATE.md):
A galaxy is COMPLETE iff its MEMORY.md has the 4 standing sections + the 4 connection axes, AND its PATHS/TOOLBELT map the 
... [+1741 chars truncated]

### Assistant | 2026-06-08T20:34:29.053Z

I'll audit the academy galaxy. Let me start by reading all 4 artifacts in parallel.

### Assistant | 2026-06-08T20:34:29.683Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:30.250Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:31.821Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:31.823Z

[tool_use: Read]

### User | 2026-06-08T20:34:56.072Z

[tool_result] 1	# Academy Galaxy — PATHS.md (slot:lima H:/-wide path atlas)
2	
3	> Converts every future Grep/Glob for slot:lima from O(N) → O(1). Format: `<path> | <purpose> | <maintainer>`. Paths verified 2026-05-28 against integration tree `H:/prism` + slot worktree `H:/prism-slot-lima` (which holds the course-35..60 expansion). When in doubt about counts, read the file — don't trust a number cached here.
4	
... [+11222 chars truncated]

### User | 2026-06-08T20:34:56.190Z

[tool_result] 1	# Academy Galaxy — TOOLBELT.md (slot:lima tool-call efficiency)
2	
3	> Memoized tool-call patterns for the academy domain. Each entry saves tokens or time vs. the naive alternative. Reach for these before re-deriving a regex or path.
4	
5	## prism_* dispatcher actions used most (cheaper + structured vs Grep)
6	- `prism_knowledge:academy_courses` | list shipped courses | beats grepping Curriculum
... [+4325 chars truncated]

### User | 2026-06-08T20:34:56.192Z

[tool_result] 1	# Academy Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)
2	
3	> **Bibryam Context Cascade pattern (Pillar P1 of the Galaxy Doctrine).** Auto-loads when Claude edits under `mcp-server/src/engines/academy/`. Root `/CLAUDE.md` covers PRISM-wide doctrine; this file covers academy-specific surface.
4	>
5	> ## ⚠ HONEST STUB — alpha (mill specialist) is NOT the academy s
... [+7590 chars truncated]

### User | 2026-06-08T20:35:46.681Z

[tool_result] 1	# Academy Galaxy MEMORY.md — per-domain memory cascade index (P1+P4 hybrid, 2026-05-27)
2	
3	> **Per-domain memory cascade (Pillar P1 extended)** per SCOPE-EXPANSION-OPERATOR-7-DIRECTIVES-2026-05-26.md §Q2. Auto-loads when Claude edits under `mcp-server/src/engines/academy/`. Companion to `./CLAUDE.md` (galactic center) — that's domain doctrine, this is domain memory index.
4	>
5	> **Status: STU
... [+4383 chars truncated]

### Assistant | 2026-06-08T20:35:57.732Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
