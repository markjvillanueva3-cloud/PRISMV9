---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "CANONICAL HOST + ROSTER (the truth to align docs to), verified 2026-06-09, BLACK"
date: "2026-06-09"
first_ts: "2026-06-09T23:48:36.919Z"
last_ts: "2026-06-09T23:50:19.464Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 18
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_6a55636c-55a/agent-aed50826380e0bc98.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# CANONICAL HOST + ROSTER (the truth to align docs to), verified 2026-06-09, BLACK

> **claude-code-cli** | 2026-06-09 | 52 msgs (18 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_6a55636c-55a/agent-aed50826380e0bc98.jsonl`

## Transcript

### User | 2026-06-09T23:48:36.919Z

CANONICAL HOST + ROSTER (the truth to align docs to), verified 2026-06-09, BLACKWELL migration 2026-06-04:
- Hardware: RTX PRO 6000 Blackwell, 96GB VRAM (driver 596.59); Ryzen 9 9950X3D 32-thread; ~127GB physical RAM (227GB = commit limit incl pagefile).
- Ollama roster INSTALLED: gpt-oss:120b (deep, ~65GB), gpt-oss:20b (mid, ~14GB), qwen2.5-coder:32b (heavy code / default offload, ~20GB), qwen2.5-coder:1.5b (trivial), 5 VLMs (qwen3-vl:8b-instruct, qwen3-vl:8b, qwen2.5vl:7b, llama3.2-vision:11b, moondream:1.8b), nomic-embed-text.
- RETIRED 2026-06-04 (NO LONGER INSTALLED): qwen2.5-coder:3b, qwen2.5-coder:7b, qwen2.5-coder:14b, deepseek-r1:14b, codellama, deepseek-coder. Also retired: the OLD 16GB RTX 4080 / RTX 4080 SUPER hardware era.
- Canonical replacement: 7b->qwen2.5-coder:32b (or :1.5b trivial); 3b->qwen2.5-coder:1.5b; 14b/deep->gpt-oss:120b; mid->gpt-oss:20b; deepseek-r1:14b->gpt-oss:120b.
- Canonical spec doc to point at: state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md

You are auditing a SCOPED subtree of the PRISM repo for documentation DRIFT against the canonical facts above.
DRIFT AXES: (a) retired Ollama model tags named as a CURRENT/recommended/default choice; (b) stale host-spec strings (RTX 4080, "16GB VRAM", "4080 SUPER", old GPU/CPU) presented as the current machine.

METHOD: use rg (ripgrep) scoped ONLY to your assigned paths. EXCLUDE node_modules, dist, .bak*, commands-archive, __tests__, *.test.*, knowledge_store, cad-engine/knowledge_store. Read just enough excerpt around each hit to classify.

For EACH occurrence, classify into exactly one bucket:
  FIX  = LIVE doc/doctrine/comment/config that tells a future reader or operator what to USE NOW and is WRONG (names a retired model/hardware as current/default/recommended).
  LEAVE = historical record / provenance / dated event / "retired"/"rm`d"/"was"/"legacy" note / test fixture / a -synthesized-by stamp / an example output box. Rewriting it would FALSIFY history.
DEFAULT TO LEAVE when unce
... [+836 chars truncated]

### Assistant | 2026-06-09T23:48:39.654Z

I'll audit the slash-command skills in the PRISM repo for documentation drift against the canonical host facts. Let me start by identifying the files in scope and then scanning them.

### Assistant | 2026-06-09T23:48:40.085Z

[tool_use: Bash]

### User | 2026-06-09T23:48:47.597Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Sort-Object: command not found

### Assistant | 2026-06-09T23:48:49.127Z

Let me use the Bash tool instead:

### Assistant | 2026-06-09T23:48:49.421Z

[tool_use: Bash]

### User | 2026-06-09T23:48:59.264Z

[tool_result] nav.md
navigate.md
node-card.md
nx-cam-setup.md
nx-strategy-guide.md
observability.md
octopus.md
offload-stats.md
okuma-macro.md
ollama-architecture-plan.md
ollama-boilerplate.md
ollama-bridge.md
ollama-classify.md
ollama-diff-summary.md
ollama-docstring.md
ollama-error-triage.md
ollama-explain.md
ollama-extract.md
ollama-route-check.md
ollama-summarize.md
ollama-test-stub.md
operating-system.md
o
... [+5284 chars truncated]

### Assistant | 2026-06-09T23:49:01.524Z

I'll now scan these files for drift. Let me search for the key patterns: retired Ollama models and stale hardware specs.

### Assistant | 2026-06-09T23:49:02.992Z

[tool_use: Grep]

### User | 2026-06-09T23:49:06.977Z

[tool_result] .claude\commands\activate-local.md:88:- **Local inference** (Ollama): codellama/mistral/qwen2.5-coder for private/offline LLM work
.claude\commands\ask-local.md:21:Routes token-heavy work to a **local Ollama model** (`qwen2.5-coder:3b`) via
.claude\commands\autopilot.md:98:| ML inference | Ollama: codellama/deepseek |
.claude\commands\autopilot-full.md:76:| Code summarize / explain / classify / li
... [+5711 chars truncated]

### Assistant | 2026-06-09T23:49:08.737Z

Now let me read specific files to classify each hit properly. I'll start with the most critical ones:

### Assistant | 2026-06-09T23:49:09.103Z

[tool_use: Read]

### User | 2026-06-09T23:49:10.975Z

[tool_result] 1	---
2	name: ask-local
3	description: Offload token-heavy work to a LOCAL Ollama model so it never enters the Claude context window. Use BEFORE reading a large file, searching the system-viz graph, explaining unfamiliar code, or triaging a build/error dump — the heavy input is processed in a subprocess and only a compact answer returns. Drastically cuts Claude token spend.
4	version: 1.0.0
5	tier
... [+3760 chars truncated]

### Assistant | 2026-06-09T23:49:13.228Z

I'll continue reading the files with the retired model references to classify them properly:

### Assistant | 2026-06-09T23:49:13.968Z

[tool_use: Read]

### User | 2026-06-09T23:49:16.563Z

[tool_result] 1	---
2	name: autopilot-full
3	description: Autopilot Full — Maximum Autonomous Development Pipeline
4	trigger:
5	  autoSuggest:
6	    keywords: ["autopilot full", "autopilot full maximum autonomous development pipeline", "ultimate", "prism", "development", "assesses", "entire", "system"]
7	_triggerBackfill: 2026-05-08T17:09:13.621Z
8	composes_with:
9	  - "/addtomatrix"
10	  - "/autopilot"
11	  - 
... [+6717 chars truncated]

### Assistant | 2026-06-09T23:49:18.526Z

Now let me check the fleet-reaper files more carefully:

### Assistant | 2026-06-09T23:49:18.976Z

[tool_use: Read]

### User | 2026-06-09T23:49:21.697Z

[tool_result] 1	---
2	name: fleet-reaper-home
3	description: Configure THIS PC as a fleet-reaper host — auto-detects the GPU class from nvidia-smi VRAM and writes the matching preset (blackwell: RTX PRO 6000 96GB → qwen2.5-coder:32b resident, 24GB GPU floor; home: RTX 4080-class 16GB → qwen2.5-coder:7b resident, 2GB GPU floor) to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so t
... [+4541 chars truncated]

### Assistant | 2026-06-09T23:49:23.472Z

Let me continue reading the fleet-reaper-home file:

### Assistant | 2026-06-09T23:49:23.945Z

[tool_use: Read]

### User | 2026-06-09T23:49:30.138Z

[tool_result] 100	  try { Start-ScheduledTask -TaskName \$_ -EA Stop; Write-Host ('FIRED: ' + \$_) }
101	  catch { Write-Host ('SKIP: ' + \$_) }
102	}"
103	```
104	
105	| Task | What it kills |
106	|------|---------------|
107	| `PRISM Node Orphan Cleaner` | Build watchers (tsc --watch, webpack, esbuild), npm worker_threads, vitest workers |
108	| `PRISM Zombie Reaper v2` | PRISM node.exe from stop_close chain 
... [+4423 chars truncated]

### Assistant | 2026-06-09T23:49:32.438Z

Let me now check fleet-reaper-work:

### Assistant | 2026-06-09T23:49:32.802Z

[tool_use: Read]

### User | 2026-06-09T23:49:35.083Z

[tool_result] 1	---
2	name: fleet-reaper-work
3	description: Configure THIS PC as a "work" fleet-reaper host (smaller GPU ~8GB free at idle + tighter RAM tier — qwen2.5-coder:3b resident, 85% mem floor, 1GB GPU floor, more aggressive Ollama offload). Writes the work preset to state/shared/dashboards/fleet-reaper-host-presets.json keyed by THIS hostname so the durable scheduled task picks it up automatically. Af
... [+7117 chars truncated]

### Assistant | 2026-06-09T23:49:37.116Z

Now let me check the other files with hits. Let me read a few more critical ones:

### Assistant | 2026-06-09T23:49:37.579Z

[tool_use: Read]

### User | 2026-06-09T23:49:40.051Z

[tool_result] 40	# Pick the most relevant `path` field from the hits, then:
41	node H:/prism/scripts/ask-ollama.mjs summarize <picked-path> --json --timeout 60000
42	```
43	
44	### Pattern 3 — multi-entry batch
45	```bash
46	# When the topic spans 2-4 entries, summarize each then synthesize.
47	for f in knowledge/wiki/architecture/fleet-{reaper,memory-monitor}.md; do
48	  node H:/prism/scripts/ask-ollama.mjs su
... [+1357 chars truncated]

### Assistant | 2026-06-09T23:49:41.897Z

Let me check the other files with Ollama model references. Let me look at the forge2.md file:

### Assistant | 2026-06-09T23:49:42.106Z

[tool_use: Read]

### User | 2026-06-09T23:49:44.568Z

[tool_result] 160	//   reasoning | code_review | search | calculation
161	const route = AISystemRouterEngine.route(brief);
162	// → primary backend (claude-opus | claude-sonnet | claude-haiku | ollama-qwen | ollama-deepseek | docker-physics-agent | docker-batch-processor)
163	```
164	
165	If `taskClass ∈ {code_review, search, calculation, ml_inference}` and Ollama up → pre-warm via `OllamaHookBridgeEngine` (mod
... [+5583 chars truncated]

### Assistant | 2026-06-09T23:49:46.660Z

Let me check the COMMANDS_DIGEST file and the activate-local file:

### Assistant | 2026-06-09T23:49:47.124Z

[tool_use: Read]

### User | 2026-06-09T23:49:50.869Z

[tool_result] 255	| `/E2 Setup` | Connect PRISM to your E2 Shop System instance for bidirectional work order sync, tool inventory import, and time tracki… |
256	| `/erp-health` | ERP persistence health check |
257	| `/error-learn-review` | Review captured hook-block / tool-error patterns from the error-learn ledger. Inspect what's been blocked, see frequenc… |
258	| `/find` | Single-shot symbol/file resolver vi
... [+2255 chars truncated]

### Assistant | 2026-06-09T23:49:52.937Z

Let me read the activate-local.md file:

### Assistant | 2026-06-09T23:49:53.120Z

[tool_use: Read]

### User | 2026-06-09T23:49:55.350Z

[tool_result] 80	
81	Report saved: H:/prism/state/shared/DOCKER_RUNTIME_STATE.json
82	```
83	
84	## When to Use
85	
86	Run `/activate-local` when:
87	- **Embeddings work** (Qdrant + nomic-embed-text): vector search, semantic indexing, RAG
88	- **Local inference** (Ollama): codellama/mistral/qwen2.5-coder for private/offline LLM work
89	- **Batch processing**: extract 100+ PDFs, embed the codebase, ingest large 
... [+999 chars truncated]

### Assistant | 2026-06-09T23:49:57.478Z

Now let me check the train-lora.md file and a few others with model references:

### Assistant | 2026-06-09T23:49:57.677Z

[tool_use: Read]

### User | 2026-06-09T23:49:59.842Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "train-lora"
6	---
7	# Train LoRA — Nightly Adapter Training From Shop Outcomes
8	
9	Kick off a LoRA fine-tune of the local base model using recent shop outcomes as training signal. Queries `OutcomeTrackingEngine` for good/adjusted records, emits a training manifest, and shells out to the Python trainer.
10	
11	## Args: $ARGUMENTS
12	- Empty: `nigh
... [+2161 chars truncated]

### Assistant | 2026-06-09T23:50:02.168Z

Now let me check local-health.md and model-status.md:

### Assistant | 2026-06-09T23:50:02.425Z

[tool_use: Read]

### User | 2026-06-09T23:50:04.848Z

[tool_result] 1	---
2	name: local-health
3	description: Check Ollama/Docker stack health and token savings potential
4	---
5	
6	# Local LLM Infrastructure Health
7	
8	Check the health of local Ollama/Docker stack for token-saving operations.
9	
10	## What it checks
11	1. **Docker status**: Is Docker daemon running? Version?
12	2. **Ollama availability**: Is Ollama server responding at localhost:11434?
13	3. **P
... [+1699 chars truncated]

### Assistant | 2026-06-09T23:50:06.904Z

Let me now check model-status.md and the distill-tribal file:

### Assistant | 2026-06-09T23:50:07.086Z

[tool_use: Read]

### User | 2026-06-09T23:50:09.058Z

[tool_result] 40	```
41	
42	## Expected Healthy Output
43	```
44	Ollama: connected @ http://localhost:11434 (12 models, avg 47ms)
45	Active models:
46	  qwen2.5-coder:7b  → adapter: nightly-2026-04-16  (okStreak=12, 0 failures)
47	  nomic-embed-text  → no adapter
48	Routing catalog: 11 entries, 8 local, 3 cloud
49	```
50	
51	## Red Flags
52	- `failStreak > 3` — daemon flapping; restart `ollama serve`
53	- `avgL
... [+145 chars truncated]

### Assistant | 2026-06-09T23:50:10.993Z

Let me read the distill-tribal.md file and check a few more files:

### Assistant | 2026-06-09T23:50:11.321Z

[tool_use: Read]

### User | 2026-06-09T23:50:13.490Z

[tool_result] 75	## Lifecycle (per TribalEvolutionEngine)
76	- **Draft** — emitted by this skill; SME has not yet validated
77	- **Current** — promoted after SME review
78	- **Deprecated** — superseded by a newer canonical block
79	- **Archived** — kept for audit but not retrieved
80	
81	The skill writes blocks at `Draft` only. Promote via `TribalEvolutionEngine.lifecycle_transition` after review.
82	
83	## Tok
... [+661 chars truncated]

### Assistant | 2026-06-09T23:50:16.139Z

Let me now check the wiki-related files and other files that mention qwen2.5-coder:

### Assistant | 2026-06-09T23:50:16.308Z

[tool_use: Read]

### User | 2026-06-09T23:50:19.464Z

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
