---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are mapping PRISM's Ollama consumption surface. == HARDWARE GROUND TRUTH (DE"
date: "2026-06-04"
first_ts: "2026-06-04T02:27:35.845Z"
last_ts: "2026-06-04T02:34:37.765Z"
cwd: "H:\\PRISM"
messages: 81
user_msgs: 35
assistant_msgs: 46
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a150f3d42442bd07f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are mapping PRISM's Ollama consumption surface. == HARDWARE GROUND TRUTH (DE

> **claude-code-cli** | 2026-06-04 | 81 msgs (35 user / 46 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a150f3d42442bd07f.jsonl`

## Transcript

### User | 2026-06-04T02:27:35.845Z

You are mapping PRISM's Ollama consumption surface. 
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
PRISM is a manufacturing-intelligence platform (print-to-program for mill/lathe/wire-EDM). It uses
... [+2350 chars truncated]

### Assistant | 2026-06-04T02:27:43.444Z

I'll map PRISM's Ollama consumption surface. Let me start by discovering the actual files in scope, then read their contents.

### Assistant | 2026-06-04T02:27:43.860Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:27:44.339Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:27:44.813Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:27:45.057Z

[tool_use: Glob]

### User | 2026-06-04T02:28:05.570Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:28:06.069Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:28:06.556Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:28:07.066Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T02:28:10.285Z

Glob is timing out (the ripgrep backend is scanning the 548MB tree). Let me use direct directory listing via Bash with absolute paths instead.

### Assistant | 2026-06-04T02:28:11.405Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:28:12.826Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:28:13.171Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:28:14.244Z

[tool_use: Bash]

### User | 2026-06-04T02:28:22.378Z

[tool_result] claudemd-ollama-enforcer.mjs*
ollama-auto-router.mjs*
ollama-autostart.mjs*
ollama-context-aggregator.mjs*
ollama-engine-api-extractor.mjs*
ollama-obsidian-rag.mjs*
ollama-pipeline-injector.mjs*
ollama-prewarm-on-pipeline.mjs*
ollama-prism-intelligence.mjs*
ollama-reviewer-second-opinion.mjs*
ollama-route-check-inject.mjs*
ollama-route-pretooluse.mjs*
ollama-route-pretooluse.test.mjs
ollama-route-
... [+339 chars truncated]

### User | 2026-06-04T02:28:23.960Z

[tool_result] posttool-ollama-offload-nudge.mjs*
posttool-ollama-rewriter-corpus.mjs*
prompt-rewriter-health-warn.mjs*
prompt-rewriter-ollama.mjs*

### User | 2026-06-04T02:28:27.010Z

[tool_result] add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
ask-ollama-fallback.test.mjs
ask-ollama.mjs*
batch-ollama-vision-extract.mjs*
batch-ollama-vision-extract.test.mjs
drift-close-iollama-session.mjs
ollama-cpu-throttle.ps1
ollama-docker-health.mjs*
ollama-hook-fire-audit.mjs*
ollama-hook-fire-audit.test.mjs
ollama-l3-agent.mjs*
ollama-l3-agent.test.mjs
ollama-offl
... [+183 chars truncated]

### User | 2026-06-04T02:28:34.276Z

[tool_result] add-ollama-skill-policy-frontmatter.mjs*
add-ollama-skill-policy-frontmatter.test.mjs
ask-ollama-fallback.test.mjs
ask-ollama.mjs*
batch-ollama-vision-extract.mjs*
batch-ollama-vision-extract.test.mjs
drift-close-iollama-session.mjs
ollama-cpu-throttle.ps1
ollama-docker-health.mjs*
ollama-hook-fire-audit.mjs*
ollama-hook-fire-audit.test.mjs
ollama-l3-agent.mjs*
ollama-l3-agent.test.mjs
ollama-offl
... [+183 chars truncated]

### Assistant | 2026-06-04T02:28:37.975Z

I have the full file inventory. Now let me read the key consumer files. I'll batch the reads of the highest-signal files first: the routing-table prewarm hook, the dead-path route-pretooluse, and the core routers.

### Assistant | 2026-06-04T02:28:38.466Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:39.426Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:39.430Z

[tool_use: Read]

### User | 2026-06-04T02:28:42.307Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\ollama-route-pretooluse.mjs' was already read 27s ago in this session and is unchanged (mtime 1780513527624). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T02:28:42.458Z

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

### User | 2026-06-04T02:28:43.593Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-auto-router.mjs — UserPromptSubmit hook
5	 *
6	 * AUTOMATIC Ollama routing — no manual /commands needed.
7	 * Detects task type from prompt and routes appropriate work to Ollama,
8	 * injecting results as context so Claude doesn't duplicate effort.
9	 *
10	 * Routes:
11	 * - Summarization requests → Ollama summarize
12	 * - Explanation requests
... [+6792 chars truncated]

### Assistant | 2026-06-04T02:28:46.679Z

ollama-route-pretooluse.mjs was already read this session. Let me retrieve it (I'll read it now since the cache says it's in context, but I need to actually see it) — and continue reading the other routers in parallel.

### Assistant | 2026-06-04T02:28:47.631Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:48.119Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:48.585Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:48.877Z

[tool_use: Read]

### User | 2026-06-04T02:28:49.995Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\ollama-route-pretooluse.mjs' was already read 35s ago in this session and is unchanged (mtime 1780513527624). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T02:28:52.070Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-route-recommender.mjs — UserPromptSubmit hook
5	 *
6	 * Event: UserPromptSubmit
7	 *
8	 * Layer 3 of Ollama Architecture:
9	 * Instead of Claude searching dispatchers to find the right action:
10	 * 1. Extract task intent from prompt
11	 * 2. Query Ollama with pre-indexed action patterns
12	 * 3. Inject recommended route (50 tokens vs 500+ for 
... [+9286 chars truncated]

### User | 2026-06-04T02:28:53.445Z

[tool_result] 1	// tier: T4
2	// NOTE: no shebang. The hook runs via explicit `node X.mjs` in the harness's
3	// UserPromptSubmit chain — never chmod+x. vite's SSR transform does not strip
4	// a line-1 `#!` and injects its preamble above, stranding the `#!` mid-file
5	// and breaking vitest's import of this file. Removing it is the cleanest fix.
6	/**
7	 * ollama-task-offloader.mjs — UserPromptSubmit hook
8	 *
... [+32363 chars truncated]

### User | 2026-06-04T02:28:53.447Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-unified-semantic-router.mjs — UserPromptSubmit hook
5	 *
6	 * UNIFIED OLLAMA ROUTING LAYER
7	 *
8	 * Instead of 48 separate hooks each doing pattern matching:
9	 * 1. Collect ALL semantic signals in one pass
10	 * 2. Make ONE Ollama call with full context
11	 * 3. Return structured recommendations for all domains
12	 *
13	 * Replaces: *-inject.
... [+11941 chars truncated]

### Assistant | 2026-06-04T02:28:59.848Z

The route-pretooluse content didn't appear in this turn's output (it was the cached read from earlier — but I never actually saw its body in MY context window since it was read before my session started). The read-once guard is blocking me. Let me bypass the cache with the env knob to actually see it, plus read the cost-router lib that's the heart of model selection.

### Assistant | 2026-06-04T02:29:00.474Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:00.917Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:01.982Z

[tool_use: Bash]

### User | 2026-06-04T02:29:03.827Z

[tool_result] 1	// tier: T4
2	// SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING — Cost-aware Ollama model selection
3	//
4	// Replaces hardcoded "first-of-preference-list" model selection with a
5	// category → tier → model decision. Smaller / faster models for trivial
6	// tasks (classify, format-convert, prism-inventory); larger / more
7	// capable models for complex codegen / multi-step reasoning.
8	//
9	// C
... [+6721 chars truncated]

### system

... [1 middle messages omitted -- see raw_file] ...

### User | 2026-06-04T02:29:16.967Z

[tool_result]      1	#!/usr/bin/env node
     2	// tier: T1
     3	/**
     4	 * ollama-route-pretooluse.mjs — PreToolUse:Read — route trivial bulk reads at the local LLM.
     5	 *
     6	 * U-HKA04 of HOOKS-AUTOMATION-V2-MS0. Tool-level complement to the prompt-level
     7	 * offloaders (ollama-auto-router.mjs / ollama-task-offloader.mjs) and to
     8	 * mcp-server/src/engines/OllamaHookBridgeEngine.ts.
   
... [+11209 chars truncated]

### Assistant | 2026-06-04T02:29:21.444Z

I have the route-pretooluse head (200 lines). I need the rest of the file to see the dead-path logic — specifically the runRoute function and where the nudge/auto decision lands. Let me read the remaining lines, plus the OllamaHookBridgeEngine and aiSystemRouterEngine.

### Assistant | 2026-06-04T02:29:22.024Z

[tool_use: Read]

### User | 2026-06-04T02:29:25.413Z

[tool_result] 200	 * fires — i.e. when offered, summary substitution is almost never wanted — so a
201	 * conservative allowlist is the correct default. See memory
202	 * reference_blackwell_token_synergy_ms0_2026_06_03 + the operator decision
203	 * (2026-06-03) to ship the narrow allowlist rather than blanket auto-route.
204	 */
205	const GIST_SAFE_EXT = new Set([".log", ".txt", ".out"]);
206	const GIST_SAFE_
... [+13217 chars truncated]

### Assistant | 2026-06-04T02:29:30.147Z

Now I have the full route-pretooluse logic — and the dead-path root cause is clear. The default mode is `"suggest"` (line 417), and even in `auto` mode the curated gist-allowlist (`isGistSafe`) plus the structured-data exclusion means almost nothing ever reroutes. Let me read the final main() tail, then the engine-side routing logic, plus a few more consumers (vision, RAG, reviewer, prompt-rewriter, the scripts).

### Assistant | 2026-06-04T02:29:31.105Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:31.599Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:32.032Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:32.516Z

[tool_use: Read]

### User | 2026-06-04T02:29:36.328Z

[tool_result] 498	  try {
499	    res = await runRoute({ stdin });
500	  } catch {
501	    return emit({ continue: true });
502	  }
503	
504	  if (res.action === "pass") return emit({ continue: true });
505	
506	  telemetry(process.env, {
507	    event: res.action,
508	    kind: res.kind,
509	    sizeKB: res.sizeKB,
510	    file: stdin?.tool_input?.file_path ?? null,
511	    session: stdin?.session_id ?? null,

... [+874 chars truncated]

### User | 2026-06-04T02:29:37.323Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-obsidian-rag.mjs — UserPromptSubmit hook
5	 *
6	 * RAG (Retrieval-Augmented Generation) over Obsidian vault:
7	 * 1. Detect queries that could benefit from memory lookup
8	 * 2. Search Obsidian vault for relevant memories
9	 * 3. Use Ollama to summarize relevant context
10	 *
11	 * Token savings: Avoids Claude reading 57+ memory files (~200 tok
... [+8434 chars truncated]

### User | 2026-06-04T02:29:37.553Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * ollama-reviewer-second-opinion — PreToolUse hook on Bash for `git commit`.
5	 *
6	 * Before every autonomous-mode commit, runs `git diff --staged` and asks
7	 * Ollama (qwen2.5-coder:7b by default) for a one-shot second-opinion review.
8	 * Ollama returns JSON of shape:
9	 *
10	 *   { "verdict": "PASS" | "CONCERN" | "FAIL",
11	 *     "reason":  string
... [+9978 chars truncated]

### User | 2026-06-04T02:29:37.664Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * prompt-rewriter-ollama.mjs — UserPromptSubmit hook
5	 * RE-ENABLED: 2026-04-26 (LOCAL-LLM-MS0 U-LLMH03)
6	 *
7	 * WHY: The user's raw prompts are often short, pronoun-heavy, and omit
8	 * the implicit constraints that Claude needs to ship correct work ("just
9	 * do the thing", "continue", "build it", "keep going"). This hook calls
10	 * a local Ollam
... [+14971 chars truncated]

### Assistant | 2026-06-04T02:29:43.098Z

Now I have the full route-pretooluse picture. Let me read the remaining consumers: the scripts (ask-ollama, l3-agent, prism-bridge, vision-extract, summarize-all-scripts) and the engine-side routers (aiSystemRouterEngine, OllamaHookBridgeEngine, ModelRoutingEngine), plus the remaining hooks (context-aggregator, prism-intelligence, posttool-rewriter-corpus).

### Assistant | 2026-06-04T02:29:43.999Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:44.520Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:44.767Z

[tool_use: Read]

### User | 2026-06-04T02:29:46.306Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\ask-ollama.mjs' was already read 89s ago in this session and is unchanged (mtime 1779208496889). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-04T02:29:48.161Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
5	 *
6	 * Designed for up to 8 concurrent chats — replaces 3 redundant routers
7	 * (ollama-route-recommender, ollama-unified-semantic-router,
8	 *  ollama-prism-intelligence) with one consolidated pattern matcher.
9	 *
10	 * Output blocks (only those that match are emitted):
11	 
... [+9386 chars truncated]

### User | 2026-06-04T02:29:48.236Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * ollama-prism-intelligence.mjs — UserPromptSubmit hook
5	 *
6	 * HYBRID INTELLIGENCE LAYER
7	 * Combines Ollama (free/fast) + PRISM AI engines (specialized) to augment Claude.
8	 *
9	 * Flow:
10	 * 1. Ollama classifies task complexity and domain
11	 * 2. PRISM AI engines provide specialized analysis:
12	 *    - CreativeReasoningEngine for cross-domain 
... [+8561 chars truncated]

### Assistant | 2026-06-04T02:29:52.069Z

ask-ollama.mjs is cached. Let me read the remaining scripts and engine-side routers. I'll grab the model strings from the cached/remaining scripts via targeted Grep (scoped to specific dirs to avoid the timeout), and read the engines directly.

### Assistant | 2026-06-04T02:29:54.022Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:29:56.373Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:29:57.437Z

[tool_use: Bash]

### User | 2026-06-04T02:30:00.752Z

[tool_result] 3: * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
5: * Routes token-heavy work to a LOCAL Ollama model so it never enters the
13: *                      Default: returns compact hits (fast, no model).
14: *                      --synth: also adds an Ollama-synthesized answer.
21: *   --synth            viz: add an Ollama-synthesized answer on top of hits
22: *   --model <
... [+2606 chars truncated]

### User | 2026-06-04T02:30:06.466Z

[tool_result] === ollama-l3-agent.mjs ===
3: * ollama-l3-agent.mjs — U-OE-L3 (OLLAMA-EXPAND-MS0 L3 layer)
6: * `scripts/ollama-prism-bridge.mjs`). Where L2 runs a single
19: * Ollama bridge daemon (`ollama-prism-bridge.mjs` / `ask-ollama.mjs`).
22: *   node scripts/ollama-l3-agent.mjs --goal "audit recent broker commits"
23: *   node scripts/ollama-l3-agent.mjs --goal "..." --max-steps 5 --model qwen2.5-coder:7
... [+8280 chars truncated]

### User | 2026-06-04T02:32:40.785Z

[tool_result] AISystemRouterEngine.ts
AISystemSynchronizerEngine.ts
LatheLoRAOllamaDeployerEngine.ts
ModelRoutingEngine.ts
OllamaCAMIntegrationEngine.ts
OllamaCapabilityProbeEngine.ts
OllamaClientEngine.ts
OllamaContextFloorEngine.ts
OllamaEmbedderEngine.ts
OllamaHookBridgeEngine.ts
OllamaIntegrationEngine.ts
OllamaTaskOffloaderEngine.ts

### Assistant | 2026-06-04T02:32:47.004Z

I have rich script-level model data. Now let me read the engine-side routers — the heart of model selection — and check the vision-model-select lib. These are the canonical model-tier sources.

### Assistant | 2026-06-04T02:32:49.378Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:32:51.730Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:32:55.689Z

[tool_use: Bash]

### User | 2026-06-04T02:33:00.507Z

[tool_result] === AISystemRouterEngine.ts ===
11: *   | ML inference        | Ollama: codellama / deepseek |
30:  | "ollama-codellama"
31:  | "ollama-deepseek"
139:        primary = "ollama-codellama";
140:        fallback = ["ollama-deepseek", "claude-haiku"];
141:        reason = "ML inference is cheap on local Ollama; falls back to Haiku";
271:        case "ollama-codellama":
272:        case "ollama-deepsee
... [+7714 chars truncated]

### User | 2026-06-04T02:33:06.063Z

[tool_result] === posttool-ollama-rewriter-corpus.mjs ===
7: * WHY: prompt-rewriter-ollama.mjs calls qwen2.5-coder:7b on every prompt to
25: *     model, raw_sample, rewrite_sample }
67: *   - `model` named
75:  if (typeof entry.model !== "string" || entry.model.length === 0) return false;
123:    model: entry.model,
=== posttool-ollama-offload-nudge.mjs ===
4: * posttool-ollama-offload-nudge.mjs — PostToolUse 
... [+4280 chars truncated]

### User | 2026-06-04T02:33:06.459Z

[tool_result] === vision-model-select.mjs ===
1:// scripts/lib/vision-model-select.mjs
3:// U-XRAY-VISION-PROFILE — profile/VRAM-aware vision-model selection for blueprint OCR.
6://   ollama-vision-extract-lib.mjs pins DEFAULT_VISION_MODEL = "qwen3-vl:8b-instruct"
7://   because the old RTX 4080 SUPER (16GB) could not fit a larger vision model
8://   GPU-resident alongside the chat fleet's coder offload (qwen2.
... [+3332 chars truncated]

### Assistant | 2026-06-04T02:33:11.065Z

I have a comprehensive picture now. Let me read the two most important engine-side files in full — ModelRoutingEngine's catalog (the canonical hardware-aware model spec) and OllamaHookBridgeEngine's task map (what `prism_dev:ollama_hook_query` actually routes), plus the pipeline-injector phase block — to confirm the exact model assignments and the live-vs-catalog gaps.

### Assistant | 2026-06-04T02:33:12.057Z

[tool_use: Read]

### Assistant | 2026-06-04T02:33:12.657Z

[tool_use: Read]

### User | 2026-06-04T02:33:13.164Z

[tool_result] 125	export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
126	  // ── Local Ollama — Blackwell GPU tier (RTX PRO 6000 96GB) ───────────
127	  // The 2026-06-03 BLACKWELL-GPU-SWAP made these large local models free
128	  // and fast (warm ~220 tok/s, full GPU residency). They are the token-
129	  // saving payoff: a free 32B coder beats paid cloud on `code` and on
130	  // substantial `reasoning`/`ch
... [+4981 chars truncated]

### User | 2026-06-04T02:33:13.694Z

[tool_result] 52	export interface OllamaModel {
53	  name: string;
54	  size: string;
55	  capabilities: TaskCategory[];
56	  maxTokens: number;
57	  avgLatencyMs: number;
58	}
59	
60	const OLLAMA_MODELS: OllamaModel[] = [
61	  {
62	    name: "qwen2.5-coder:7b",
63	    size: "7b",
64	    capabilities: ["explanation", "summary", "documentation", "format_convert"],
65	    maxTokens: 8192,
66	    avgLatencyMs: 200
... [+4599 chars truncated]

### Assistant | 2026-06-04T02:34:37.765Z

I now have everything needed for the inventory. The picture is complete: I've read the routing tables, the dead-path logic, the engine catalogs, and the script-level model assignments. Let me compile the structured report.

The key findings are clear:
1. **The 7B monoculture** is real and pervasive — hardcoded in ~14 files.
2. **The cost-router (`ollama-cost-router.mjs`) and ModelRoutingEngine already understand Blackwell** but the hooks bypass them.
3. **route-pretooluse dead-path root cause:** default mode is `suggest` + the curated gist allowlist makes `reroute` nearly unreachable.

Here is the inventory report.

---

# PRISM Ollama Consumption Surface — Model Routing Inventory

## A. Consumer → Category → Current Model Table

### Prompt-level hooks (UserPromptSubmit) — fire on every prompt across all 26 slots

| File | Category | Model requested | Volume / Notes |
|------|----------|----------------|----------------|
| `.claude/hooks/ollama-auto-router.mjs:130` | summarize / explain / classify / docstring / error-triage / scaffold | **`qwen2.5-coder:7b`** (hardcoded in `queryOllama`) | High. 20s rate-limit. The one hook that actually *embeds* Ollama output. 7B for ALL 6 task types incl. 800-token scaffold. |
| `.claude/hooks/ollama-task-offloader.mjs` | classify→offload (advisory only) | **cost-router** (`routeModelForTask`, `lib/ollama-cost-router.mjs`) + `detectHostClass()` | Highest-volume classifier. THIS is the one feeding the 11.2% dashboard stat. Does NOT call Ollama itself — emits an `ask-ollama.mjs` directive. Already Blackwell-aware (balanced→strong promote). |
| `.claude/hooks/ollama-route-recommender.mjs:166` | classify / route (dispatcher:action) | **`qwen2.5-coder:7b`** (hardcoded in `queryOllamaForRoute`) | 60s rate-limit. Also does Qdrant semantic search (nomic vectors via MCP). |
| `.claude/hooks/ollama-unified-semantic-router.mjs:197` | classify / route (8 domains) | **`qwen2.5-coder:7b`** (hardcoded) | 30s rate-limit. Only calls Ollama when 3+
... [+12531 chars truncated]
