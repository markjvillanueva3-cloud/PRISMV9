---
type: "chat-session"
source: "claude-code-cli"
session_id: "3d26f925-fe80-4be2-a165-049a54f0dc23"
title: "Flesh out the STUB galaxy-brain MEMORY.md for the PRISM \"tribal-knowledge\" galax"
date: "2026-06-01"
first_ts: "2026-06-01T17:24:02.189Z"
last_ts: "2026-06-01T17:27:53.986Z"
cwd: "H:\\prism-slot-golf"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_00438497-b07/agent-a0883b90c0c78f74b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:50"
---

# Flesh out the STUB galaxy-brain MEMORY.md for the PRISM "tribal-knowledge" galax

> **claude-code-cli** | 2026-06-01 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/3d26f925-fe80-4be2-a165-049a54f0dc23/subagents/workflows/wf_00438497-b07/agent-a0883b90c0c78f74b.jsonl`

## Transcript

### User | 2026-06-01T17:24:02.189Z

Flesh out the STUB galaxy-brain MEMORY.md for the PRISM "tribal-knowledge" galaxy into a GROUNDED domain-context index.
It feeds galaxy-card -> CAG cold-anchor -> per-session injection, so it must be a verifiable INDEX of what EXISTS, never invented prose.

FILE: H:/prism/mcp-server/src/engines/tribal-knowledge/MEMORY.md
Master-index one-liner: "tribal-tip store, all galaxies emit/consume"
Recall query for this domain: "tribal knowledge cited tip shop distill"

STEPS:
1. Read H:/prism/mcp-server/src/engines/tribal-knowledge/MEMORY.md. PRESERVE the "## Master-brain link" block VERBATIM (UP / DOWN / MASTER-INDEX edge lines) but change "Last master-sync:" to 2026-06-01. Keep any already-cited real content (e.g. tango algorithm primitives).
2. Discover REAL assets (ground everything you assert):
   - Glob H:/prism/mcp-server/src/engines/tribal-knowledge/** ; Read its CLAUDE.md / PATHS.md / TOOLBELT.md if present.
   - prism_session:master_index_query keyword="tribal knowledge cited tip shop distill" (top real nodes).
   - Grep H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md and DISPATCHER_DIGEST.md for the domain (real engines + dispatcher.action pairs).
   - Grep H:/prism/knowledge/wiki/ for real wiki entries; Grep C:/Users/wompu/.claude/projects/H--prism/memory/ for real reference_*/feedback_* memories.
3. Compose the NEW file with ONLY sections you can GROUND with a path you read (omit any you cannot cite):
   # tribal-knowledge Galaxy MEMORY.md   (drop the STUB tag)
   ## Master-brain link        (preserved verbatim; sync bumped to 2026-06-01)
   ## Primary domain           (2-4 lines: what this galaxy's primary domain IS — the context any chat needs to orient instantly)
   ## Key engines & paths      (cited real engine files/dirs under engines/tribal-knowledge/ + dispatcher actions)
   ## Standing patterns / invariants  (domain rules grounded in CLAUDE.md/wiki — cite each; NEVER inline physics constants, reference src/physics/constants.ts instead)
   ## Known assets
... [+626 chars truncated]

### Assistant | 2026-06-01T17:24:30.877Z

I'll start by reading the existing MEMORY.md file and discovering the real assets for the tribal-knowledge galaxy.

### Assistant | 2026-06-01T17:24:31.827Z

[tool_use: Read]

### Assistant | 2026-06-01T17:24:31.879Z

[tool_use: Glob]

### User | 2026-06-01T17:25:15.382Z

[tool_result] H:/prism/mcp-server/src/engines/tribal-knowledge\MEMORY.md
H:/prism/mcp-server/src/engines/tribal-knowledge\CLAUDE.md
H:/prism/mcp-server/src/engines/tribal-knowledge\TOOLBELT.md
H:/prism/mcp-server/src/engines/tribal-knowledge\PATHS.md

### User | 2026-06-01T17:25:16.994Z

[tool_result] 1	# Tribal-Knowledge Galaxy MEMORY.md (2026-05-27 STUB)
2	
3	
4	## Master-brain link
5	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="tribal knowledge" topK=20`
6	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
7	- **MAST
... [+430 chars truncated]

### Assistant | 2026-06-01T17:25:33.853Z

I have the existing file and the directory structure. Let me read the sibling docs and run discovery queries in parallel.

### Assistant | 2026-06-01T17:25:33.853Z

[tool_use: Read]

### Assistant | 2026-06-01T17:25:33.994Z

[tool_use: Read]

### Assistant | 2026-06-01T17:25:34.436Z

[tool_use: Read]

### User | 2026-06-01T17:26:01.863Z

[tool_result] 1	# Tribal-Knowledge Galaxy — Stub Sentinel (2026-05-27)
2	
3	> Auto-loads when editing under `engines/tribal-knowledge/`. **⚠ HONEST STUB.** No canonical slot — golf hosts hygiene of tribal-tip pipeline; per-domain tribal tips live in respective galaxy MEMORY.md indexes.
4	
5	## Scope
6	Operator tribal knowledge: cited tips (echo iter12-15 POST-PDF-NODE-MS0 pipeline), per-domain tribal-tip rerank
... [+953 chars truncated]

### User | 2026-06-01T17:26:03.021Z

[tool_result] 1	# tribal-knowledge galaxy — TOOLBELT (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — owning slot enriches with domain-specific tool-call patterns. Companion: [`PATHS.md`](./PATHS.md).
4	
5	## Shared token-lean patterns (apply to every galaxy)
6	- **Route before Grep** — `prism_session:master_index_query` answers most "where 
... [+1181 chars truncated]

### User | 2026-06-01T17:26:03.041Z

[tool_result] 1	# tribal-knowledge galaxy — PATHS atlas (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — the owning slot should ENRICH this with the domain's true hot paths. Companion: [`CLAUDE.md`](./CLAUDE.md) · [`MEMORY.md`](./MEMORY.md) · [`TOOLBELT.md`](./TOOLBELT.md).
4	
5	## Engines (name-matched to this domain, 93 found — verify owne
... [+7099 chars truncated]

### Assistant | 2026-06-01T17:26:09.703Z

Now let me run the master-index query and grep the digests for the real engines and dispatcher actions. The PATHS.md gives me name-matched candidates, but I need to verify which actually relate to tribal-knowledge and find dispatcher actions.

### Assistant | 2026-06-01T17:26:11.281Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:26:12.193Z

[tool_use: Grep]

### User | 2026-06-01T17:26:52.923Z

[tool_result] 386:- **CAMTribalKnowledgeEngine**: production CAM tribal-knowledge surface
387:- **CAMTribalKnowledgeInjectionEngine**: Context Tooltips for CAM UI (U-CAM101)
388:- **CAMTribalRAGEngine**: U-CAM-ML-06
389:- **CAMTribalTipLinkerEngine**: U-CAM-ENRICH-02
677:- **CustomerKnowledgeEngine**: Manages customer-specific knowledge profiles for personalized tribal knowledge.
1440:- **LatheLoRATribalAugment
... [+1612 chars truncated]

### User | 2026-06-01T17:26:52.976Z

[tool_result] No matches found

### Assistant | 2026-06-01T17:27:09.874Z

The DISPATCHER_DIGEST has no tribal entries by that pattern. Let me search the dispatcher digest more broadly for the actual dispatcher that exposes tribal actions, and check the master index plus wiki/memory grounding.

### Assistant | 2026-06-01T17:27:09.875Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:27:09.876Z

[tool_use: Grep]

### Assistant | 2026-06-01T17:27:09.876Z

[tool_use: Grep]

### User | 2026-06-01T17:27:21.941Z

[tool_result] <persisted-output>
Output too large (24KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-golf\3d26f925-fe80-4be2-a165-049a54f0dc23\tool-results\toolu_01XxtJatGyxvLdReHoEkyRa1.txt

Preview (first 2KB):
Found 250 files limit: 250
C:\Users\wompu\.claude\projects\H--prism\memory\reference_fleet_synergy_audit_2026_06_01.md
C:\Users\wompu\.claude\projects\H--prism\memory\MEMORY.md
... [+1795 chars truncated]

### User | 2026-06-01T17:27:25.208Z

[tool_result] 26:| cadDrawingKnowledgeDispatcher | prism_cad_drawing_kb — CAD Drawing Knowledge — GD&T selection (14 symbols per Y1... | 11 |
39:| documentLearningDispatcher | prism_doc_learn — Document knowledge extraction: upload PDFs/notes/articles... | 5 |
58:| knowledgeDispatcher | prism_knowledge — Unified knowledge query across 9 PRISM registries. Action... | 253 |
59:| knowledgeExtDispatcher | prism_kno
... [+330 chars truncated]

### User | 2026-06-01T17:27:29.970Z

[tool_result] Found 250 files limit: 250
H:\prism\knowledge\wiki\lessons\dispatcher-false-wire-and-dead-duplicate-case.md
H:\prism\knowledge\wiki\index.md
H:\prism\knowledge\wiki\code-tribal\learnings\context-economy-u-tribal-hotpath.md
H:\prism\knowledge\wiki\code-tribal\hot-path-injector-safety-patterns.md
H:\prism\knowledge\wiki\lessons\context-economy-injector-knobs.md
H:\prism\knowledge\wiki\code-tribal\le
... [+19098 chars truncated]

### Assistant | 2026-06-01T17:27:53.986Z

You've hit your session limit · resets 3:30pm (America/Chicago)
