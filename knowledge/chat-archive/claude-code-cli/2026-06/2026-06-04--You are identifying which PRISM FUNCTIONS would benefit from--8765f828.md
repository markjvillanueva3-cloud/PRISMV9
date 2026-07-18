---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are identifying which PRISM FUNCTIONS would benefit from local LLM inference"
date: "2026-06-04"
first_ts: "2026-06-04T02:27:35.846Z"
last_ts: "2026-06-04T02:35:12.977Z"
cwd: "H:\\PRISM"
messages: 44
user_msgs: 18
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a1fc2b2c23617df97.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are identifying which PRISM FUNCTIONS would benefit from local LLM inference

> **claude-code-cli** | 2026-06-04 | 44 msgs (18 user / 26 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a1fc2b2c23617df97.jsonl`

## Transcript

### User | 2026-06-04T02:27:35.846Z

You are identifying which PRISM FUNCTIONS would benefit from local LLM inference on an idle 96GB GPU. 
== HARDWARE GROUND TRUTH (DESKTOP-N7MI1VB, verified live this session) ==
- GPU: NVIDIA RTX PRO 6000 Blackwell Workstation Edition — 96GB VRAM (97887 MiB). Currently only ~11GB used, ~85GB FREE, GPU util 1%, 30C, 20W of 600W. MASSIVELY underutilized.
- CPU: AMD Ryzen 7 7800X3D (8-core). RAM: 127GB total (~98GB free).
- Ollama models dir: H:/Tools/ollama/models. Ollama server reachable at http://127.0.0.1:11434.

== 11 MODELS ALREADY INSTALLED (ollama, sorted by size) ==
- qwen2.5-coder:32b (19.9GB) completion/tools/insert
- qwen2.5-coder:14b (9.0GB) completion/tools/insert
- deepseek-r1:14b (9.0GB) completion/THINKING
- llama3.2-vision:11b (7.8GB) vision/completion
- qwen3-vl:8b-instruct (6.1GB) vision/completion/tools
- qwen3-vl:8b (6.1GB) vision/completion/tools/THINKING
- qwen2.5vl:7b (6.0GB) vision/completion
- qwen2.5-coder:7b (4.7GB) completion/tools/insert
- qwen2.5-coder:3b (1.9GB) completion/tools/insert
- moondream:1.8b (1.7GB) completion/vision
- nomic-embed-text:latest (0.3GB) embedding

== CURRENT OLLAMA CONFIG (env vars, live) ==
OLLAMA_FLASH_ATTENTION=1 (good) · OLLAMA_NUM_PARALLEL=4 · OLLAMA_MAX_LOADED_MODELS=4 · OLLAMA_KEEP_ALIVE=-1 (infinite) · OLLAMA_KV_CACHE_TYPE=UNSET · OLLAMA_GPU_OVERHEAD=UNSET.
These are conservative settings tuned for a 16GB card (the machine was an RTX 4080 SUPER until a 2026-06-03 BLACKWELL-GPU-SWAP).

== THE CORE PROBLEM ==
1. Offload rate is only 11.2% (354 offloaded vs 2810 kept on Claude); CLAUDE.md target is >=30%.
2. ~18 PRISM hooks HARDCODE qwen2.5-coder:7b — the entire local-inference fleet is a 7B monoculture, leaving 85GB of a $10K workstation GPU idle.
3. The hook ollama-route-pretooluse.mjs fired 4606 times and offloaded 0 (dead routing path).
4. Only ollama-prewarm-on-pipeline.mjs has a richer phase->model table (32b/14b/deepseek-r1:14b/7b).

== PRISM CONTEXT ==
PRISM is a manufacturing-intelligence platform (
... [+1991 chars truncated]

### Assistant | 2026-06-04T02:27:43.957Z

I'll query the PRISM master index and read the build state surfaces to enumerate local-inference candidates. Let me start by gathering ground truth in parallel.

### Assistant | 2026-06-04T02:27:45.854Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:27:47.267Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:27:48.059Z

[tool_use: Bash]

### User | 2026-06-04T02:28:00.333Z

[tool_result] BUILD_STATE EXISTS
AWARENESS EXISTS
ROADMAP EXISTS

### User | 2026-06-04T02:28:01.451Z

[tool_result] H:/prism/.claude/hooks/claudemd-ollama-enforcer.mjs*
H:/prism/.claude/hooks/ollama-auto-router.mjs*
H:/prism/.claude/hooks/ollama-autostart.mjs*
H:/prism/.claude/hooks/ollama-context-aggregator.mjs*
H:/prism/.claude/hooks/ollama-engine-api-extractor.mjs*
H:/prism/.claude/hooks/ollama-obsidian-rag.mjs*
H:/prism/.claude/hooks/ollama-pipeline-injector.mjs*
H:/prism/.claude/hooks/ollama-prewarm-on-pip
... [+891 chars truncated]

### User | 2026-06-04T02:28:02.186Z

[tool_result] H:/prism/scripts/add-ollama-skill-policy-frontmatter.mjs*
H:/prism/scripts/add-ollama-skill-policy-frontmatter.test.mjs
H:/prism/scripts/ask-ollama-fallback.test.mjs
H:/prism/scripts/ask-ollama.mjs*
H:/prism/scripts/batch-ollama-vision-extract.mjs*
H:/prism/scripts/batch-ollama-vision-extract.test.mjs
H:/prism/scripts/drift-close-iollama-session.mjs
H:/prism/scripts/ollama-docker-health.mjs*
H:/pr
... [+465 chars truncated]

### Assistant | 2026-06-04T02:28:04.831Z

Let me read the key state files and the richest routing hooks to understand the current phase→model mappings and what functions exist.

### Assistant | 2026-06-04T02:28:05.306Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:05.611Z

[tool_use: Read]

### User | 2026-06-04T02:28:08.390Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * ollama-prewarm-on-pipeline.mjs — UserPromptSubmit hook
5	 *
6	 * When a pipeline trigger fires (/forge*, /rgs, /scrutinize, /dedup,
7	 * /deep-search, /pdf-learn, /close-out-audit, /precompact) AND the
8	 * required Ollama model is NOT yet warm in VRAM, fire a tiny
9	 * background /api/generate request to pre-load it. Returns instantly;
10	 * the mode
... [+5922 chars truncated]

### User | 2026-06-04T02:28:08.661Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * ollama-pipeline-injector.mjs — UserPromptSubmit hook
5	 *
6	 * Fires when the user invokes /forge, /forge-audit, /rgs, /scrutinize, /dedup,
7	 * /precompact, /handoff or any pipeline that historically did NOT route work
8	 * to Ollama even though the local models were loaded and idle.
9	 *
10	 * Injects an additionalContext block listing CONCRETE Olla
... [+14856 chars truncated]

### Assistant | 2026-06-04T02:28:12.236Z

Now let me look at the dead routing path (the hook that fired 4606 times and offloaded 0), the aiSystemRouterEngine, and the vision/embedding consumers to map the full surface.

### Assistant | 2026-06-04T02:28:12.691Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:13.434Z

[tool_use: Read]

### User | 2026-06-04T02:28:18.080Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
5	 *
6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
9	 *
10	 * WHY: a 50 KB .log / .jsonl / gen
... [+25256 chars truncated]

### User | 2026-06-04T02:28:18.659Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+27574 chars truncated]

### Assistant | 2026-06-04T02:28:22.298Z

Now let me look at the vision/blueprint OCR consumers, the aiSystemRouterEngine, and the build state / roadmap surfaces to map the full PRISM function surface in parallel.

### Assistant | 2026-06-04T02:28:23.047Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:24.502Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:28:25.084Z

[tool_use: Grep]

### User | 2026-06-04T02:28:30.625Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/batch-ollama-vision-extract.mjs
3	//
4	// U-PSGB-XRAY-BATCH (#6) — resumable overnight batch vision-OCR runner.
5	//
6	// Orchestrates run-ollama-vision-extract.mjs over a worklist of blueprint PDFs,
7	// designed to run UNATTENDED overnight when the chat fleet is down and the GPU
8	// is uncontended (the live-pilot blocker this session was fleet GPU+CPU
9	// sat
... [+4037 chars truncated]

### User | 2026-06-04T02:28:33.036Z

[tool_result] Found 30 files
.claude\hooks\ollama-route-pretooluse.mjs
.claude\hooks\__tests__\ollama-cost-router.test.mjs
.claude\hooks\lib\ollama-cost-router.mjs
.claude\hooks\prompt-rewriter-ollama.mjs
.claude\hooks\__tests__\posttool-ollama-rewriter-corpus.test.mjs
.claude\hooks\posttool-ollama-rewriter-corpus.mjs
.claude\hooks\session-start-ollama-chat-probe.mjs
.claude\hooks\__tests__\prompt-rewriter-heal
... [+953 chars truncated]

### User | 2026-06-04T02:28:37.451Z

[tool_result] H:/prism/mcp-server/src/engines/AISystemRouterEngine.ts
H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts

### Assistant | 2026-06-04T02:28:41.020Z

I have a strong picture of the local-inference consumer surface. Let me read the AISystemRouterEngine task-type map and the offload-stats to ground the volume numbers, plus scan the frontend app routes.

### Assistant | 2026-06-04T02:28:42.924Z

[tool_use: Grep]

### Assistant | 2026-06-04T02:28:44.331Z

[tool_use: Bash]

### User | 2026-06-04T02:28:47.345Z

[tool_result] 14: * The engine is read-only / advisory: callers consult `route(task)` and decide
118:  route(taskDescription: string): RouteDecision {
126:      case "physics_validation":
132:      case "engine_building":
138:      case "ml_inference":
144:      case "batch_processing":
150:      case "reasoning":
156:      case "code_review":
162:      case "search":
168:      case "blueprint_extraction":
174:
... [+607 chars truncated]

### User | 2026-06-04T02:28:53.427Z

[tool_result]   "offloaded": 354
  "keptOnClaude": 2810
  "estimatedTokensSaved": 327949
  "byHook": {
    "ollama-task-offloader": {
      "fired": 3819
      "offloaded": 352
      "kept": 2810
      "suggested": 657
      "tokensSaved": 327649
      "fired": 2
      "offloaded": 2
      "kept": 0
      "suggested": 0
      "tokensSaved": 300
      "fired": 4624
      "offloaded": 0
      "kept": 4623
      "
... [+1193 chars truncated]

### Assistant | 2026-06-04T02:28:55.946Z

Let me read the AISystemRouterEngine route cases in detail to capture the canonical task-type → model map, then check the frontend app routes.

### Assistant | 2026-06-04T02:28:56.895Z

[tool_use: Read]

### User | 2026-06-04T02:28:57.859Z

[tool_result] 118	  route(taskDescription: string): RouteDecision {
119	    const taskClass = this.classify(taskDescription);
120	    let primary: AIBackend;
121	    let fallback: AIBackend[];
122	    let reason: string;
123	    let estimatedCost: RouteDecision["estimatedCost"];
124	
125	    switch (taskClass) {
126	      case "physics_validation":
127	        primary = "docker-physics-agent";
128	        fallb
... [+4936 chars truncated]

### Assistant | 2026-06-04T02:28:58.137Z

[tool_use: Bash]

### User | 2026-06-04T02:29:03.727Z

[tool_result] NO web/app

### Assistant | 2026-06-04T02:29:06.167Z

The frontend isn't at web/app. Let me find the actual Next.js frontend location and check the BUILD_STATE for frontend/pending work.

### Assistant | 2026-06-04T02:29:08.522Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:29:09.830Z

[tool_use: Bash]

### User | 2026-06-04T02:29:20.930Z

[tool_result] # BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge
- **1137** wiki entries indexed
- **2** codex frontend builds awaiting merge
3664/3774 engines wired (97%); 1137 wiki entries indexed.
| Embedding | 1 |
**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-r
... [+1387 chars truncated]

### User | 2026-06-04T02:33:40.286Z

[tool_result] ---ROUTES VIA app dir---
H:/prism/cqask/ui/app

### Assistant | 2026-06-04T02:33:45.512Z

I now have a complete picture. The frontend is React+Vite at `mcp-server/web` (not Next.js App Router — the prompt's "Next.js" framing is approximate; the actual main frontend is Vite+React, plus a pending React 19 CadQuery viewer). I have the canonical task-type→model map, the live offload stats showing exactly where the 11% comes from, and the full hook/script consumer surface. Let me do two final targeted reads: the frontend's API surface to find user-facing inference touch points, and confirm the dead-routing hook's offload count.

### Assistant | 2026-06-04T02:33:47.519Z

[tool_use: Bash]

### User | 2026-06-04T02:33:59.532Z

[tool_result] /components
/components/calculator
/components/charts
/components/chat
/components/employee
/components/jobs
/components/learning
/components/mill
/components/operating-system
/components/operator
/components/optimization-report
/components/ppg
/components/puoa
/components/quote
/components/quoting
/components/results
/components/sfc
/components/shared
/components/shell
/components/ui
/components/
... [+1215 chars truncated]

### Assistant | 2026-06-04T02:35:12.977Z

I have everything I need. The frontend has a `chat/` component dir, a `CalculatorBackendAiReview.tsx` (user-facing AI review surface), and consumer API modules. I have the full picture across all six capability buckets. Let me compile the report.

# PRISM Local-Inference Candidate Map — by Model Capability

**Hardware reality:** 96GB Blackwell, ~85GB free, 1% util. Current local fleet is a **7B monoculture** (~18 hooks hardcode `qwen2.5-coder:7b`). Offload rate 11.2% (354/3164). The 85GB headroom can hold **qwen2.5-coder:32b (20GB) + deepseek-r1:14b (9GB) + qwen3-vl:8b-instruct (6GB) + nomic-embed (0.3GB) all resident simultaneously** — a tiered fleet, not one model. The task below is to say *which PRISM functions* feed each tier.

**Volume ground truth (from `ollama-offload-stats.json`):**
- `ollama-task-offloader`: fired 3819, offloaded 352, **kept-on-Claude 2810**, suggested 657 — this is where ~all real offload happens, and where the 2810 missed candidates live.
- `ollama-route-pretooluse`: fired **4624, offloaded 0** (the dead path — gist-only allowlist + ~0% nudge take-rate means it never substitutes).
- `prompt-rewriter` / verb-injector / `wiki-read-offload-advisory`: fire thousands of times, **suggest-only, offload 0**.

---

## Bucket 1 — CODE-GEN / COMPLETION
**Tier target: qwen2.5-coder:32b (was 7b) for quality work; 7b/3b for bulk boilerplate.**

| PRISM function | Surface | Quality bar | Volume |
|---|---|---|---|
| Engine/dispatcher boilerplate scaffolding (`/forge-triple`, `/forge7`, forge-engines) | mcp-server | Medium — Claude must still own physics+safety logic; 32b drafts the class shell, zod schema, imports | Medium, bursty |
| Test assertion **stubs** (forge-tests) | mcp-server | Medium — local drafts the structure, **Claude validates real-value bounds** (R9; `toBeDefined()` stubs are hook-rejected) | Medium |
| Wiki entry stub drafting (forge-audit Phase 5) | knowledge | Low — Claude only edits | Per-audit |
| Frontend React component scaffolds
... [+9992 chars truncated]
