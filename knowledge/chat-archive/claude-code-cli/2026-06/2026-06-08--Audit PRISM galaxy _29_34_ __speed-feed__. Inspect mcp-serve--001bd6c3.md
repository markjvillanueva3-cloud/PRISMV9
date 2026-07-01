---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Audit PRISM galaxy #29/34: **speed-feed**. Inspect mcp-server/src/engines/speed-"
date: "2026-06-08"
first_ts: "2026-06-08T20:35:39.597Z"
last_ts: "2026-06-08T20:36:01.883Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-ac5d8a4dba9ecfe04.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Audit PRISM galaxy #29/34: **speed-feed**. Inspect mcp-server/src/engines/speed-

> **claude-code-cli** | 2026-06-08 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-ac5d8a4dba9ecfe04.jsonl`

## Transcript

### User | 2026-06-08T20:35:39.597Z

Audit PRISM galaxy #29/34: **speed-feed**. Inspect mcp-server/src/engines/speed-feed/{MEMORY,PATHS,TOOLBELT,CLAUDE}.md and count its real domain assets. Score it x/8 against the rubric, list the GAPS, and give the exact FILL recommendation per gap.


GOAL (operator, helping zulu): audit each of the 34 PRISM galaxies "1 by 1 in sequential order to ensure their galaxies are setup to their maximum potential." The concern: many galaxies don't have all their memories, file paths, wikis, and tribal knowledge properly mapped — each chat slot needs FULL context of its domain at all times. Use Obsidian + the Ollama/Docker local stack to fill gaps.

GROUND TRUTH (verified this session):
- A galaxy = a doctrine/index folder at mcp-server/src/engines/<galaxy>/ with 4 artifacts: CLAUDE.md (domain doctrine), MEMORY.md (per-domain brain), PATHS.md (maps the galaxy's real assets), TOOLBELT.md (the galaxy's tools/dispatchers). ALL 34 galaxies HAVE all 4 files — the question is DEPTH/COMPLETENESS, not existence.
- Engines do NOT live inside the galaxy dir — they're flat in mcp-server/src/engines/*.ts; the galaxy's PATHS.md REFERENCES them (e.g. mill PATHS.md has 58 path-refs). So "complete PATHS" = it maps the galaxy's real scattered domain assets (engines, dispatchers, wiki, tribal, corpus paths).
- Vault mirror: knowledge/memories/galaxies/<galaxy>/MEMORY.md now exists for all 34 (just filled this session).
- Wiki: knowledge/wiki/{architecture,lessons,code-tribal,concepts,...}/ — coverage is UNEVEN (wedm ~49 wiki files, speed-feed ~2). Tribal: knowledge/wiki/code-tribal/.
- Local stack: Ollama UP (:11434, models incl gpt-oss:20b/qwen2.5-coder:32b for classification/summarization), MCP :3100 UP, Qdrant DOWN (semantic_search degraded — use lexical/file search).

THE COMPLETENESS RUBRIC (score each galaxy against this — from state/shared/specs/MASTER-BRAIN-TEMPLATE.md):
A galaxy is COMPLETE iff its MEMORY.md has the 4 standing sections + the 4 connection axes, AND its PATHS/TOOLBELT m
... [+1748 chars truncated]

### Assistant | 2026-06-08T20:35:45.830Z

I'll audit galaxy #29/34 (speed-feed). Let me start by reading its 4 artifacts and gathering ground truth in parallel.

### Assistant | 2026-06-08T20:35:46.878Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:47.217Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:47.793Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:48.206Z

[tool_use: Read]

### User | 2026-06-08T20:35:48.801Z

[tool_result] 1	# Speed-Feed Galaxy MEMORY.md (2026-05-27 STUB)
2	
3	
4	## Master-brain link
5	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="speed feed" topK=20`
6	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
7	- **MASTER-INDEX edg
... [+2709 chars truncated]

### User | 2026-06-08T20:35:49.787Z

[tool_result] 1	# Speed-Feed (SFC) Galaxy — PATHS.md (H:/-wide path atlas for slot:oscar)
2	
3	> THE highest-ROI artifact: converts every future Grep/Glob from O(N) → O(1) for slot:oscar.
4	> Format: `<absolute-path> | <purpose> | <maintainer-slot>`. Verify mtime before trusting a stale row.
5	> Engines live FLAT at `mcp-server/src/engines/` — there is no per-engine `speed-feed/` subdir (this dir is the doctrin
... [+14898 chars truncated]

### User | 2026-06-08T20:35:54.272Z

[tool_result] 1	# Speed-Feed (SFC) Galaxy — TOOLBELT.md (tool-call efficiency for slot:oscar)
2	
3	> Memoized Grep/Glob/Bash/Read/git/dispatcher patterns slot:oscar reaches for most.
4	> Each entry saves tokens or time vs. the naive alternative. Verify a path against PATHS.md if stale.
5	> Rule 1: hit `reference_oscar_sfc_domain_map_2026_05_27` or `master_index_query` BEFORE any broad Grep/Glob.
6	
7	## Grep pa
... [+5334 chars truncated]

### User | 2026-06-08T20:35:57.321Z

[tool_result] 1	# Speed-Feed (SFC) Galaxy — Stub Sentinel (2026-05-27)
2	
3	> Auto-loads when editing under `engines/speed-feed/`. **⚠ HONEST STUB.** Canonical slot: oscar (de-facto — OSCAR-SFC-9AXIS-MS0 active).
4	
5	## Scope
6	Speed/Feed Calculator (SFC) — one of two saleable subscription products per root CLAUDE.md. 9-axis SFC + auto-speed-feed + per-material/per-tool/per-machine speed+feed prediction. Recen
... [+1987 chars truncated]

### Assistant | 2026-06-08T20:36:01.883Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
