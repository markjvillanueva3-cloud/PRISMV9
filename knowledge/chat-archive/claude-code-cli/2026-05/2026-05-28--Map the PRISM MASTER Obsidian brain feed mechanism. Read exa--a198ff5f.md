---
type: "chat-session"
source: "claude-code-cli"
session_id: "a198ff5f-9c3d-44ad-a040-50b918b0a91a"
title: "Map the PRISM MASTER Obsidian brain feed mechanism. Read exactly these files: - "
date: "2026-05-28"
first_ts: "2026-05-28T20:38:31.223Z"
last_ts: "2026-05-28T20:38:47.215Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/workflows/wf_0776fb2c-f56/agent-aa82884522ba08c42.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Map the PRISM MASTER Obsidian brain feed mechanism. Read exactly these files: - 

> **claude-code-cli** | 2026-05-28 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a198ff5f-9c3d-44ad-a040-50b918b0a91a/subagents/workflows/wf_0776fb2c-f56/agent-aa82884522ba08c42.jsonl`

## Transcript

### User | 2026-05-28T20:38:31.223Z

Map the PRISM MASTER Obsidian brain feed mechanism. Read exactly these files:
- .claude/hooks/stop-obsidian-memory-feed.mjs (the Stop hook that copies C: memory -> H: knowledge/memories)
- C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md (master index)
Then Glob: knowledge/memories/*/ (what type/galaxy subdirs exist) and knowledge/memories/feedback/*.md (count).
Report (as MAP_SCHEMA, surface="master-brain-feed"): how a memory written to C:/.../memory/<type>_*.md reaches H:/knowledge/memories/<type>/, whether the feed routes into per-GALAXY subdirs (knowledge/memories/<galaxy>/) or only per-TYPE (feedback/reference/project), and the recall path (memory_search / semantic_search). Facts must be file-grounded.

### Assistant | 2026-05-28T20:38:47.215Z

Prompt is too long
