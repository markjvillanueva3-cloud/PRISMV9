---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "You are auditing PRISM's token-access surfaces for the Obsidian vault at H:/pris"
date: "2026-06-08"
first_ts: "2026-06-08T15:07:21.754Z"
last_ts: "2026-06-08T15:11:12.919Z"
cwd: "H:\\prism"
messages: 71
user_msgs: 31
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_a6916cfe-e9b/agent-a87526ee8cea9c65f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# You are auditing PRISM's token-access surfaces for the Obsidian vault at H:/pris

> **claude-code-cli** | 2026-06-08 | 71 msgs (31 user / 40 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/workflows/wf_a6916cfe-e9b/agent-a87526ee8cea9c65f.jsonl`

## Transcript

### User | 2026-06-08T15:07:21.754Z

You are auditing PRISM's token-access surfaces for the Obsidian vault at H:/prism. GOAL: enumerate every SKILL, SCRIPT, and HOOK that reads/reaches a vault node, with the cheap-token mechanism each provides.

Investigate:
- Skills (.claude/commands/*.md): grep for ones touching vault — wiki-query, wiki-ingest, memory-search, brain-recall, route-to-obsidian, node-card, synergy-recall, knowledge-query, master-index, deep-search, remember. For each: what node type it reaches + invocation.
- Scripts (scripts/*.mjs, scripts/lib/*.mjs): system-viz-query.mjs (find/node-card), node-card-read.mjs, node-card-offset-lib.mjs, graph-node-embedding-bridge, galaxy-knows-map.mjs, memory-search, wiki maintainers. For each: what it reads + the CLI + approx token cost.
- Hooks (.claude/hooks/*.mjs): pre-bash-graph-inject (exact-match banner with node->vault paths — KEY: U-SV-NODE-VAULT-PATHS), node-card-prefetch-inject, master-index-precheck-inject, memory-rag-inject, tribal-by-domain-inject, wiki-precheck-inject, cag-cold-cache-anchor. For each: trigger + what vault context it injects + token cost.
- CHEAP-NODE-ACCESS-MS0: read the CLAUDE.md section + node-card schema. Document seekCard(), readCard(), the offset index (node-cards.jsonl + node-card-offsets.json), node_card CLI. This is THE cheap-read primitive.

Return a structured map: for each ACCESS SURFACE { name, kind(skill|script|hook), node_types_reached, invocation, token_cost_estimate, free_or_paid }. Final text IS the data.

### Assistant | 2026-06-08T15:07:33.823Z

I'll audit PRISM's token-access surfaces for the Obsidian vault. Let me start by reading the canonical CHEAP-NODE-ACCESS-MS0 primitive and the key infrastructure files, then fan out across skills, scripts, and hooks.

### Assistant | 2026-06-08T15:07:36.641Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:07:37.375Z

[tool_use: Glob]

### User | 2026-06-08T15:07:42.910Z

[tool_result] scripts/build-card-offset-index.mjs*
scripts/lib/node-card-offset-lib.mjs
scripts/lib/node-card-read.mjs
scripts/lib/node-card-schema.mjs
scripts/system-viz-query.mjs*
---HOOKS---
.claude/hooks/cag-cold-cache-anchor.mjs*
.claude/hooks/master-index-precheck-inject.mjs*
.claude/hooks/memory-rag-inject.mjs*
.claude/hooks/node-card-prefetch-inject.mjs*
.claude/hooks/pre-bash-graph-inject.mjs*
.claude/
... [+74 chars truncated]

### User | 2026-06-08T15:07:57.731Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-08T15:08:01.837Z

All key files exist. The pre-bash-graph-inject hook just demonstrated itself in action. Let me read the core files in parallel — the CHEAP-NODE-ACCESS primitive first.

### Assistant | 2026-06-08T15:08:02.146Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:02.875Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:02.879Z

[tool_use: Read]

### User | 2026-06-08T15:08:04.985Z

[tool_result] 1	/**
2	 * node-card-read.mjs — token-cheap read-by-id over the system-viz node substrate
3	 * (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * `readCard(id)` returns a compact NodeCard (~200 tokens) for ANY of the ~302K
6	 * graph nodes WITHOUT loading the 644MB system-graph.json. It reads the freshest
7	 * compact projection sidecar (no new heavy build):
8	 *   - system-graph-index.json (~193MB, 
... [+14916 chars truncated]

### User | 2026-06-08T15:08:06.600Z

[tool_result] 1	/**
2	 * node-card-schema.mjs — the compact "node card" record shape for token-cheap
3	 * node reads (CHEAP-NODE-ACCESS-MS0, slot:sierra).
4	 *
5	 * THE PROBLEM: status-quo "find + read a node" loads the 644MB system-graph.json
6	 * to extract one node — ~186K tokens per access. A NodeCard is the minimal record
7	 * that lets an agent IDENTIFY + LOCATE a node (and route to its source doc) WITHOU
... [+5691 chars truncated]

### User | 2026-06-08T15:08:06.624Z

[tool_result] 1	/**
2	 * node-card-offset-lib.mjs — the seekable card-offset index for sub-parse
3	 * node reads (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-OFFSET-INDEX, slot:sierra).
4	 *
5	 * THE PROBLEM (the next layer down from node-card-read): readCard's full-sidecar
6	 * path parses the WHOLE 193MB system-graph-index.json (or 55MB find-cache) to
7	 * build an id->node Map. A long-lived process caches that, but a
... [+7488 chars truncated]

### Assistant | 2026-06-08T15:08:09.824Z

I have the cheap-read primitive fully understood. Now let me read the system-viz-query CLI and the key hooks in parallel.

### Assistant | 2026-06-08T15:08:10.275Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:11.256Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:11.354Z

[tool_use: Read]

### User | 2026-06-08T15:08:15.313Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+22400 chars truncated]

### User | 2026-06-08T15:08:15.524Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-bash-graph-inject.mjs — PreToolUse:Bash graph-context injector.
5	 *
6	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A4.
7	 *
8	 * Sibling of pre-read / pre-grep / pre-write graph-inject. Before a Bash
9	 * command runs, surface the master-index nodes the graph already knows —
10	 * but NARROW: bash is mostly `git` / `npm` / `node` / build commands that
11
... [+12992 chars truncated]

### User | 2026-06-08T15:08:15.532Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * node-card-prefetch-inject.mjs — UserPromptSubmit injector
5	 * (CHEAP-NODE-ACCESS-MS0 · U-NODECARD-PREFETCH-HOOK, slot:sierra)
6	 *
7	 * When a prompt NAMES a system-viz node id (e.g. `eng.mill`, `ghost.galaxy.wedm`,
8	 * `formula.kienzle`), this hook SEEKS that node's compact card from the offset
9	 * index and injects it as additionalContext — so th
... [+7227 chars truncated]

### Assistant | 2026-06-08T15:08:20.264Z

I have the cheap-read primitive (node-card-read, node-card-schema, node-card-offset-lib), the system-viz-query CLI, and 2 key hooks fully understood. Now let me read the remaining hooks and the vault-touching skills in parallel.

### Assistant | 2026-06-08T15:08:21.077Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:21.647Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:21.650Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:22.382Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:22.461Z

[tool_use: Read]

### User | 2026-06-08T15:08:26.692Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * master-index-precheck-inject.mjs — UserPromptSubmit injector
5	 *
6	 * Cuts Grep/Glob/Agent token waste by surfacing the top-K master-index hits
7	 * BEFORE the model decides which search tool to fire. Reads system-graph.json
8	 * directly (mtime-cached on disk) + the wiki/memory entries pre-joined to
9	 * each node. Sister hook to wiki-precheck-injec
... [+14564 chars truncated]

### User | 2026-06-08T15:08:27.027Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * memory-rag-inject.mjs — UserPromptSubmit hook
5	 *
6	 * When the user prompt contains memory-recall keywords (remember, recall,
7	 * previous, last time, earlier, prior, before, context from), surface the
8	 * most relevant entries from the H-drive vault (knowledge/memories/) and
9	 * inject them as additional context.
10	 *
11	 * INTEL-OLLAMA-OBSIDIA
... [+9321 chars truncated]

### User | 2026-06-08T15:08:27.029Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// tribal-by-domain-inject.mjs — UserPromptSubmit
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-TRIBAL-BY-DOMAIN-INJECT.
6	//
7	// Sibling of U-P1-WIKI-PRELOAD-BY-DOMAIN: the wiki-precheck-inject hook
8	// already biases wiki-entry ranking toward the active chat-slot's milestone
9	// domain (mill/lathe/wedm/cad/cam). This hook does the SAME for tribal
10	// knowledge — 
... [+18727 chars truncated]

### User | 2026-06-08T15:08:27.153Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// .claude/hooks/cag-cold-cache-anchor.mjs
4	//
5	// TOKEN-SAVINGS-PIVOT/U-CAG-CACHE-CONTROL (sierra 2026-05-27):
6	// SessionStart anchor for the broader CAG cold-tier doctrine set.
7	//
8	// SIBLING — `cag-soul-cache-block.mjs` (U-CAG-01-SOUL-TO-SESSIONSTART) already
9	// anchors the per-slot soul ONCE per session as a SessionStart additionalContext
10	// bl
... [+9684 chars truncated]

### User | 2026-06-08T15:08:27.309Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * wiki-precheck-inject.mjs — UserPromptSubmit hook.
5	 *
6	 * Karpathy LLM-Wiki integration: when the user's prompt mentions a concept
7	 * already in knowledge/wiki/index.md, inject the top-3 matching entries as
8	 * additionalContext so Claude doesn't re-derive what the wiki already knows.
9	 *
10	 * Scoring: BM25-lite over [[Name]] + description toke
... [+34000 chars truncated]

### Assistant | 2026-06-08T15:08:33.519Z

All five hooks are understood. Now let me read the vault-touching skills and the remaining scripts in parallel. I'll read the key skills (wiki-query, memory-search, brain-recall, route-to-obsidian, node-card, synergy-recall, knowledge-query, deep-search, master-index, remember, wiki-ingest) plus the galaxy-knows-map script.

### Assistant | 2026-06-08T15:08:34.015Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:34.477Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:34.958Z

[tool_use: Read]

### User | 2026-06-08T15:08:34.988Z

[tool_result] 1	---
2	name: node-card
3	description: Token-cheap read-by-id for ANY system-viz graph node. Returns a node's compact card (label, layer, kind, status, info, + the wiki/memory docs that document it) in ~200 tokens WITHOUT loading the 644MB system-graph.json. Use after `find` gives you an id, or whenever you know a node id and need its record + where to read more. CHEAP-NODE-ACCESS-MS0 (sierra).
4	
... [+2193 chars truncated]

### Assistant | 2026-06-08T15:08:35.432Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:35.527Z

[tool_use: Read]

### User | 2026-06-08T15:08:37.238Z

[tool_result] 1	---
2	name: route-to-obsidian
3	description: Summarize an Obsidian wiki entry via local Ollama (qwen2.5-coder) instead of reading it into Claude context. Use for any `knowledge/wiki/**/*.md` Read >500 lines — the wiki-read-offload-advisory PreToolUse hook surfaces this skill automatically. Saves ~3-10K tokens per call.
4	model: haiku
5	effort: XS
6	allowed-tools: Bash
7	triggers:
8	  keyword: "w
... [+4139 chars truncated]

### User | 2026-06-08T15:08:37.616Z

[tool_result] 1	---
2	description: Query the unified Obsidian-vault + system-graph + wiki BM25 brain
3	allowed-tools: ["Bash"]
4	---
5	
6	# /brain-recall — Unified BM25 brain query
7	
8	Free-text query across PRISM's 4-substrate memory system in one shot:
9	
10	- **Memory vault** — file-based `knowledge/memories/{feedback,reference,project,user,...}/*.md`
11	- **System graph** — `state/shared/system-viz/system-
... [+3760 chars truncated]

### User | 2026-06-08T15:08:38.128Z

[tool_result] 1	---
2	name: synergy-recall
3	description: Cross-surface recall — fan out a query across all 5 PRISM knowledge surfaces (master-index, tribal, memory, wiki, skills) in parallel and return ≤3 compact distilled lines per surface. Wraps the existing checkin-recall.mjs script that /checkin uses internally — exposed as a user-invokable slash command for ad-hoc "what does PRISM know about X" lookups WI
... [+5627 chars truncated]

### User | 2026-06-08T15:08:38.281Z

[tool_result] 1	---
2	description: Unified knowledge query — ONE MCP call replaces N Grep/Glob/Agent searches. Hits prism_session:master_index_query (system-viz graph + Obsidian vault wikiEntries + memoryEntries + capability index + BUILD_STATE classification + utilization scoring, all pre-joined per node). Use this BEFORE Grep/Glob/Agent whenever the question is "where is X / does Y exist / what's wired to Z /
... [+5534 chars truncated]

### Assistant | 2026-06-08T15:08:41.739Z

Excellent coverage. Now let me read the final batch of skills (wiki-query, memory-search, master-index, remember, deep-search, wiki-ingest) and the galaxy-knows-map + memory-search scripts.

### Assistant | 2026-06-08T15:08:42.349Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:42.828Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:43.177Z

[tool_use: Read]

### User | 2026-06-08T15:08:43.578Z

[tool_result] 1	---
2	name: wiki-query
3	description: Query the PRISM wiki by similarity (HNSW + Ollama embed), then synthesise an answer with citations.
4	consumes:
5	  - "prism_wiki:wiki_index_read"
6	---
7	# /wiki-query
8	
9	Answer a free-form question using the existing wiki vault — read first, derive only if no page is close enough.
10	
11	## When to use
12	- The user asks a manufacturing / domain question
... [+1196 chars truncated]

### Assistant | 2026-06-08T15:08:43.915Z

[tool_use: Read]

### Assistant | 2026-06-08T15:08:43.937Z

[tool_use: Read]

### User | 2026-06-08T15:08:44.083Z

[tool_result] 1	---
2	policy:
3	  tier: 1
4	  triggers:
5	    - "memory-search"
6	---
7	# Memory Search — Semantic Lookup Across PRISM Qdrant Collections
8	
9	Semantic search over PRISM's long-term memory: past programs, outcomes, tribal tips, formulas, rules, playbooks, operator notes. Returns the closest matches with payloads so the caller can reason over shop history.
10	
11	## Args: $ARGUMENTS
12	- `<query>
... [+2135 chars truncated]

### User | 2026-06-08T15:08:47.132Z

[tool_result] 1	---
2	name: remember
3	description: Remember — Structured Memory Persistence
4	composes_with:
5	  - "/audit-task"
6	  - "/context"
7	  - "/forge-debug"
8	  - "/ship"
9	  - "/slim"
10	---
11	# Remember — Structured Memory Persistence
12	
13	You are saving knowledge to persistent memory in the most token-efficient way possible. This command ensures every memory write is intentional, deduplicated, 
... [+5334 chars truncated]

### User | 2026-06-08T15:08:47.164Z

[tool_result] 1	---
2	description: Unified master search across system-viz graph + Obsidian vault + capability index + BUILD_STATE. Use INSTEAD OF Grep/Glob/Agent for "where is X" / "what handles Y" / "is Z built/wired/utilized" questions.
3	allowed-tools: mcp__prism_safe__prism_session, Bash, Read
4	composes_with:
5	  - "/system-viz"
6	consumes:
7	  - "prism_calc:cutting_force"
8	  - "prism_session:master_inde
... [+5529 chars truncated]

### User | 2026-06-08T15:08:47.975Z

[tool_result] 1	---
2	description: Search-first then deep-reason fallback. Runs master_index_query first; if top hits all score below the confidence floor, escalates to model deep-reasoning with the master-index hits pre-loaded as context. Cuts token waste on shallow lookups while keeping neural-grade answers for ambiguous queries.
3	allowed-tools: mcp__prism_safe__prism_session, mcp__prism_safe__prism_intellig
... [+6040 chars truncated]

### Assistant | 2026-06-08T15:08:57.799Z

I have comprehensive coverage of skills and hooks. Let me grab the last few scripts: galaxy-knows-map, the memory-search-lib + master-index-search-lib backing libs, the wiki-ingest skill, and verify the offset-index files exist live (vault operational state). I'll do these in parallel.

### Assistant | 2026-06-08T15:09:02.096Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:09:02.568Z

[tool_use: Glob]

### Assistant | 2026-06-08T15:09:03.027Z

[tool_use: Read]

### Assistant | 2026-06-08T15:09:03.756Z

[tool_use: Read]

### User | 2026-06-08T15:09:07.232Z

[tool_result] state/shared/system-viz/node-card-offsets.json          25349758 bytes
state/shared/system-viz/node-cards.jsonl                166756361 bytes
state/shared/system-viz/system-graph-index.json         202353792 bytes
state/shared/system-viz/find-cache.json                 57544649 bytes
state/shared/system-viz/system-graph.json               675838938 bytes
knowledge/wiki/index.md                   
... [+645 chars truncated]

### User | 2026-06-08T15:09:08.851Z

[tool_result] 1	---
2	name: wiki-ingest
3	description: Ingest a raw source (PDF, article, transcript, code excerpt) into the PRISM wiki via the 5-stage Ollama→Claude pipeline.
4	consumes:
5	  - "prism_wiki:wiki_ingest_finalize"
6	  - "prism_wiki:wiki_ingest_run"
7	---
8	# /wiki-ingest
9	
10	Run the Karpathy LLM-Wiki ingest pipeline against a raw source and file the synthesised page into `H:/prism/knowledge/wiki
... [+1629 chars truncated]

### User | 2026-06-08T15:09:10.572Z

[tool_result] 1	#!/usr/bin/env node
2	// Pure-core search over the Obsidian memory vault for free-floating memories
3	// not pre-joined to system-graph.json nodes.
4	//
5	// H7 of [[audit-system-synergy-2026-05-09]]: master-index-search-lib only finds
6	// memories that some system-graph node has linked via knowledge.memoryEntries[].
7	// The ~492 memory .md files in H:/prism/knowledge/memories/{feedback,refere
... [+3726 chars truncated]

### User | 2026-06-08T15:09:16.851Z

[tool_result] scripts\galaxy-knows-map.mjs

### Assistant | 2026-06-08T15:09:22.522Z

I now have everything needed. The vault is live and operational (offset index regenerated today 2026-06-08, 301,216 cards). Let me grab the galaxy-knows-map script head to complete the script inventory.

### Assistant | 2026-06-08T15:09:23.093Z

[tool_use: Read]

### User | 2026-06-08T15:09:25.336Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/galaxy-knows-map.mjs — CLI for GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-KNOWS-MAP.
3	//
4	//   node scripts/galaxy-knows-map.mjs build              # build KNOWS-MAP.json from the galaxy cards
5	//   node scripts/galaxy-knows-map.mjs who <query...>     # which galaxy holds context on <query>? (1-lookup)
6	//   node scripts/galaxy-knows-map.mjs build --json       # m
... [+2108 chars truncated]

### Assistant | 2026-06-08T15:09:31.960Z

I have full coverage now. Let me update the task list and return the structured map.

### Assistant | 2026-06-08T15:09:32.551Z

[tool_use: TaskUpdate]

### Assistant | 2026-06-08T15:09:32.711Z

[tool_use: TaskUpdate]

### User | 2026-06-08T15:09:33.113Z

[tool_result] Updated task #3 status

### User | 2026-06-08T15:09:33.283Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-08T15:11:12.919Z

# PRISM Obsidian-Vault Token-Access Surface Map

VAULT LIVE STATE (verified 2026-06-08): offset index regenerated TODAY — `node-card-offsets.json` 25.3MB / `node-cards.jsonl` 166.8MB / `count`=301,216 cards / sourceGraph stamp matches live 675.8MB `system-graph.json`. `system-graph-index.json` 202MB, `find-cache.json` 57.5MB, `wiki/index.md` 223KB, `tribal-embed-index.json` 532MB. Memory vault namespaces present: feedback, reference, project, user, patterns, mistakes, inbox, scrutiny, uncategorized, weekly-synthesis, galaxies, dreams. All cheap-read sidecars FRESH. The cheap-node-access pipeline is fully operational.

---

## CHEAP-NODE-ACCESS-MS0 — THE primitive (CLAUDE.md §CHEAP-NODE-ACCESS-MS0)

The status-quo cost of reading one graph node = Read the 675MB `system-graph.json` ≈ **~186K tokens**. CHEAP-NODE-ACCESS-MS0 replaces this with a ~200-token card via a 2-layer cheap path. Files: `scripts/lib/node-card-schema.mjs` (pure projection), `scripts/lib/node-card-read.mjs` (reader), `scripts/lib/node-card-offset-lib.mjs` (seek-index emitter).

API surface:
- `readCard(id, opts)` — full read; tries SEEK path first (parse 25MB offsets once → `fs.read` exact bytes from jsonl), falls back to full-sidecar parse (202MB graph-index → 57MB find-cache), THROWS on no sidecar (refuses 675MB graph; R12). Returns `{card, stale, staleReason, source, schemaVersion}` or null.
- `readCards(ids, opts)` — batch; index built once; per-id `{notFound}`/`{error}` on miss (never swallowed).
- `seekCard(id, opts)` — HOOK-SAFE seek-only; NEVER full-sidecar parse, NEVER throws → safe in per-prompt UserPromptSubmit budget. Returns card on fresh-offset-index hit, else null. This is what the prefetch + pre-bash hooks use.
- `cardCount(opts)` — total covered nodes.
- Card shape: `{id,label,layer,kind,status,info,noteCount,wikiPath,pointerPath,wikiEntries,memoryEntries,docTotals}` — `wikiEntries`/`memoryEntries` (top-8, DOC_CAP) ARE the vault doc pointers (the node→vault edge). `kind` derived fr
... [+15170 chars truncated]
