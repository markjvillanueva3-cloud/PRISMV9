---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Audit PRISM galaxy #23/34: **pdf-corpus**. Inspect mcp-server/src/engines/pdf-co"
date: "2026-06-08"
first_ts: "2026-06-08T20:34:55.285Z"
last_ts: "2026-06-08T20:36:18.589Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-a5e07a9e4d7e5f612.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Audit PRISM galaxy #23/34: **pdf-corpus**. Inspect mcp-server/src/engines/pdf-co

> **claude-code-cli** | 2026-06-08 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-a5e07a9e4d7e5f612.jsonl`

## Transcript

### User | 2026-06-08T20:34:55.285Z

Audit PRISM galaxy #23/34: **pdf-corpus**. Inspect mcp-server/src/engines/pdf-corpus/{MEMORY,PATHS,TOOLBELT,CLAUDE}.md and count its real domain assets. Score it x/8 against the rubric, list the GAPS, and give the exact FILL recommendation per gap.


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

### Assistant | 2026-06-08T20:35:49.960Z

I'll audit galaxy #23/34: pdf-corpus. Let me empirically inspect its 4 artifacts and count its real domain assets.

### Assistant | 2026-06-08T20:35:51.255Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:51.820Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:52.756Z

[tool_use: Read]

### Assistant | 2026-06-08T20:35:52.759Z

[tool_use: Read]

### User | 2026-06-08T20:36:03.447Z

[tool_result] 1	# pdf-corpus Galaxy MEMORY.md
2	
3	## Master-brain link
4	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="pdf corpus" topK=20`
5	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
6	- **MASTER-INDEX edge:** master `MEMORY.m
... [+6767 chars truncated]

### User | 2026-06-08T20:36:03.451Z

[tool_result] 1	# pdf-corpus galaxy — PATHS atlas (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — the owning slot should ENRICH this with the domain's true hot paths. Companion: [`CLAUDE.md`](./CLAUDE.md) · [`MEMORY.md`](./MEMORY.md) · [`TOOLBELT.md`](./TOOLBELT.md).
4	
5	## Engines (name-matched to this domain, 73 found — verify ownership)
... [+6538 chars truncated]

### User | 2026-06-08T20:36:03.550Z

[tool_result] 1	# pdf-corpus galaxy — TOOLBELT (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — owning slot enriches with domain-specific tool-call patterns. Companion: [`PATHS.md`](./PATHS.md).
4	
5	## Shared token-lean patterns (apply to every galaxy)
6	- **Route before Grep** — `prism_session:master_index_query` answers most "where is X?"
... [+1175 chars truncated]

### User | 2026-06-08T20:36:03.551Z

[tool_result] 1	# PDF-Corpus Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)
2	
3	> Auto-loads when editing under `engines/pdf-corpus/`. **⚠ HONEST STUB.** Canonical slot: lima (de-facto — owns pypdf page-by-page extraction per [[feedback_use_lima_pypdf_page_extractor]] CANONICAL).
4	
5	## 1. Domain scope
6	
7	PDF-corpus covers: PDF ingestion (76x deeper via lima's pypdf vs pdf-pa
... [+1542 chars truncated]

### Assistant | 2026-06-08T20:36:18.589Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
