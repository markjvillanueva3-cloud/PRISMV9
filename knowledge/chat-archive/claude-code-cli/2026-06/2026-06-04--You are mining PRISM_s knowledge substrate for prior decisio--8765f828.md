---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are mining PRISM's knowledge substrate for prior decisions on Ollama model s"
date: "2026-06-04"
first_ts: "2026-06-04T02:27:35.846Z"
last_ts: "2026-06-04T02:31:41.885Z"
cwd: "H:\\PRISM"
messages: 67
user_msgs: 30
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-afd98cc93c67d3da5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are mining PRISM's knowledge substrate for prior decisions on Ollama model s

> **claude-code-cli** | 2026-06-04 | 67 msgs (30 user / 37 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-afd98cc93c67d3da5.jsonl`

## Transcript

### User | 2026-06-04T02:27:35.846Z

You are mining PRISM's knowledge substrate for prior decisions on Ollama model selection + offload. 
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
PRISM is a manufacturing-intelligence platform (pr
... [+1874 chars truncated]

### Assistant | 2026-06-04T02:27:44.776Z

I'll mine PRISM's knowledge substrate for prior Ollama model-selection decisions and the Blackwell milestone. Let me launch parallel searches across memory, wiki, and specs.

### Assistant | 2026-06-04T02:27:45.900Z

[tool_use: Grep]

### Assistant | 2026-06-04T02:27:46.919Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:27:48.319Z

[tool_use: Grep]

### Assistant | 2026-06-04T02:27:49.176Z

[tool_use: Grep]

### User | 2026-06-04T02:28:08.878Z

[tool_result] Found 22 files
state\shared\defer-queue.json
state\shared\.fleet-reaper-enum-cache-DESKTOP-N7MI1VB.json
state\shared\handoffs\HANDOFF-claude-b502aa8d-blackwell-token-syne.md
state\shared\handoffs\HANDOFF-claude-2f55d9ce-blackwell-token-syne.md
state\shared\handoffs\HANDOFF-claude-ee8cef5a-blackwell-ai-upgrade.md
state\shared\handoffs\HANDOFF-Claude-Agent@DESKTOP-N7MI1VB_ac620b97-6e06-41d5-bd3a-9c3
... [+1109 chars truncated]

### User | 2026-06-04T02:28:09.339Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:28:17.743Z

[tool_result] Found 20 files
knowledge\wiki\architecture\vision-ocr-ab-benchmark.md
knowledge\wiki\architecture\cross-substrate-synergy-ms0.md
knowledge\wiki\architecture\_orphans-rescue.md
knowledge\wiki\.hook-cache\0030da1af466bb613fda3f8c27bd3a59f8e0b4dd.json
knowledge\wiki\.hook-cache\053d9ae25a89f33aec6710d23eedb17ce5a9bc8c.json
knowledge\wiki\.hook-cache\615a11f8cd7fbcbc941ee1e2658e62825adac3e6.json
knowl
... [+1016 chars truncated]

### User | 2026-06-04T02:28:17.959Z

[tool_result] Found 60 files limit: 60
knowledge\wiki\architecture\vision-ocr-ab-benchmark.md
knowledge\wiki\code-tribal\learnings\blackwell-token-synergy-ms0-u-bw-auto-route-allowlist.md
knowledge\wiki\code-tribal\learnings\blackwell-ai-ms0-u-cap-probe.md
knowledge\wiki\.hook-cache\0050a7f0f089aeea6006181b1e3bb82870ed2c75.json
knowledge\wiki\.hook-cache\ad60b9241aa942071eb7daa86c55a2f3e159149b.json
knowledge\w
... [+3852 chars truncated]

### Assistant | 2026-06-04T02:28:22.923Z

Strong leads. Let me read the key wiki entries, the Blackwell milestone learnings, the relevant handoffs, and search the memory substrate in parallel.

### Assistant | 2026-06-04T02:28:23.444Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:24.498Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:24.894Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:25.948Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:26.295Z

[tool_use: Read]

### Assistant | 2026-06-04T02:28:26.587Z

[tool_use: Read]

### User | 2026-06-04T02:28:31.091Z

[tool_result] 1	---
2	title: OLLAMA-PIPELINE-MS0 — Wire local LLM into skill pipelines
3	slug: ollama-pipeline-ms0
4	kind: architecture
5	domain: ai-routing
6	status: shipped
7	shipped_at: 2026-05-15
8	shipped_by: claude-6eac1b66 (slot bravo)
9	commit: c34405927
10	milestone: OLLAMA-PIPELINE-MS0
11	unit: U-OPM01
12	related:
13	  - master-index-surface
14	  - awareness-stack
15	  - subagent-per-task-presearch
16
... [+8082 chars truncated]

### User | 2026-06-04T02:28:31.674Z

[tool_result] 1	# BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-AUTO-ROUTE-ALLOWLIST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-AUTO-ROUTE-ALLOWLIST (slot:alpha): curated gist-only auto-route — isGistSafe() gates auto-mode to logs/dumps/archives; digests/inventory/state/audit downgrade to suggest. Safe-by-construction; auto-mode OFF by default. Verified 15/15 direct eval. +7 tests.
2	
3	**Commit:**
... [+1583 chars truncated]

### User | 2026-06-04T02:28:31.954Z

[tool_result] 1	# BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-ROUTE-PROFILE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-ROUTE-PROFILE (slot:alpha): teach ModelRoutingEngine the RTX PRO 6000 Blackwell — home_blackwell profile + real 32B/14B GPU catalog so code+substantial-reasoning route to the FREE local qwen2.5-coder:32b instead of paid cloud (token-saving payoff). SAFETY preserved: every local t
... [+2080 chars truncated]

### User | 2026-06-04T02:28:32.692Z

[tool_result] 1	# BLACKWELL-AI-MS0/U-CAP-PROBE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-CAP-PROBE (slot:india): OllamaCapabilityProbeEngine — runtime host capability probe (keystone). The I/O layer ModelRoutingEngine (pure scorer) delegates: detects HardwareProfile from nvidia-smi, lists present/loaded models from Ollama /api/tags+/api/ps, computes runnable set, feeds route() via toRoutingContext/
... [+3267 chars truncated]

### User | 2026-06-04T02:28:32.891Z

[tool_result] 1	# BLACKWELL-GPU-SWAP/U-BLACKWELL-HOST-PRESET — [MAIN] [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET (slot:golf): fleet-reaper 'blackwell' host preset for RTX PRO 6000 96GB (qwen2.5-coder:32b prewarm, 24GB GPU floor, 60m keep-alive) + BUILTIN_PRESETS.blackwell + 3 tests (26/26 green) + nim-bridge/host-tuning 4080->Blackwell comment fixes. Pairs with live ollama v0.30.3 GPU consolidation (CPU 1.3->
... [+1820 chars truncated]

### User | 2026-06-04T02:28:33.088Z

[tool_result] 1	---
2	title: Vision-OCR A/B Benchmark (Blackwell OCR upgrade gate)
3	type: architecture
4	domain: blueprint-vision
5	slot: xray
6	created: 2026-06-03
7	tags: [ocr, blueprint-vision, blackwell, gpu, ollama, benchmark, vision-model-select, xray]
8	---
9	
10	# Vision-OCR A/B Benchmark — the empirical gate for the Blackwell OCR upgrade
11	
12	## Why this exists
13	`scripts/lib/vision-model-select.mj
... [+5851 chars truncated]

### Assistant | 2026-06-04T02:28:36.609Z

This is rich. The Blackwell milestone family is already substantial and shipped TODAY (2026-06-03). Let me read the milestone envelopes, the ModelRoutingEngine, the spec files, and search the memory substrate to find U-FLEET-WAKE-SEQUENCER and complete the picture.

### Assistant | 2026-06-04T02:28:37.557Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:28:39.167Z

[tool_use: Grep]

### Assistant | 2026-06-04T02:28:39.910Z

[tool_use: Glob]

### Assistant | 2026-06-04T02:28:41.287Z

[tool_use: Grep]

### User | 2026-06-04T02:28:54.013Z

[tool_result] Found 60 files limit: 60
C:\Users\wompu\.claude\projects\H--prism\memory\reference_xray_vision_ab_benchmark_2026_06_03.md
C:\Users\wompu\.claude\projects\H--prism\memory\feedback_never_remove_git_lock_on_assumed_time.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_blackwell_catalog_gpu_profile_2026_06_03.md
C:\Users\wompu\.claude\projects\H--prism\memory\reference_blackwell_embed_conc
... [+5543 chars truncated]

### User | 2026-06-04T02:28:58.579Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:29:01.990Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-04T02:29:04.204Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-04T02:29:07.168Z

The broad globs timed out (large repo). Let me read the high-signal memory files directly and the milestone envelopes via targeted paths.

### Assistant | 2026-06-04T02:29:07.605Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:08.589Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:09.070Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:10.026Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:10.427Z

[tool_use: Read]

### User | 2026-06-04T02:29:12.706Z

[tool_result] 1	---
2	name: reference_blackwell_token_synergy_ms0_2026_06_03
3	description: BLACKWELL-TOKEN-SYNERGY-MS0 (slot:alpha) — wired the RTX PRO 6000 Blackwell 96GB into the token-saving model-routing paths so code+reasoning route to free local 32B/14B
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: b502aa8d-3a90-4735-9eed-98f2a773f4e2
8	---
9	
10	**BLACKWELL-TOKEN-SYNERGY-MS
... [+2936 chars truncated]

### User | 2026-06-04T02:29:14.285Z

[tool_result] 1	---
2	name: reference_blackwell_ai_upgrade_plan_2026_06_03
3	description: "The Blackwell 96GB GPU AI-upgrade master plan (india) + its load-bearing reality-corrections — kimi2.6 cloud-only, ModelRoutingEngine already exists, Python 3.14 wrong for GPU wheels"
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: ee8cef5a-0329-4f80-9051-ad015abc53ba
8	---
9	
10	RTX PRO 6000 B
... [+2890 chars truncated]

### User | 2026-06-04T02:29:14.532Z

[tool_result] 1	---
2	name: reference_blackwell_catalog_gpu_profile_2026_06_03
3	description: Host-aware GPU profile for catalog/DB extraction — Blackwell unlocks concurrent vision-OCR (was overnight-gated 16GB assumption). BLACKWELL-DB-GEN-MS0 (slot:romeo).
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: b7624712-9339-4b1e-a90e-a42138fe6399
8	---
9	
10	**BLACKWELL-DB-GEN-MS0 / U-CGP
... [+3038 chars truncated]

### User | 2026-06-04T02:29:15.086Z

[tool_result] 1	---
2	name: ollama-blackwell-gpu-consolidation-2026-06-03
3	description: "Ollama on RTX PRO 6000 Blackwell ran on CPU after the GPU swap — a half-failed auto-upgrade left the engine stuck at v0.24.0; fix was a clean reinstall to v0.30.3 + single H: model store."
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: fc51c2d9-4fcf-4e38-82b0-3a6b100a553c
8	---
9	
10	On DESKTOP
... [+2399 chars truncated]

### User | 2026-06-04T02:29:15.373Z

[tool_result] 1	---
2	name: reference_blackwell_embed_concurrency_2026_06_03
3	description: Embedding/DB generation was serialized one /api/embeddings call at a time — concurrency gives 15x on the RTX PRO 6000 Blackwell (vectors identical). Use PRISM_EMBED_CONCURRENCY.
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: ebd141d5-aa17-49e2-8d55-26bf02dc2ae9
8	---
9	
10	PRISM's embedding/v
... [+1870 chars truncated]

### Assistant | 2026-06-04T02:29:18.501Z

Excellent. Now let me read the master upgrade plan spec, the CPU-contention lessons, and search for the U-FLEET-WAKE-SEQUENCER unit + the BLACKWELL-TOKEN-SYNERGY milestone envelope.

### Assistant | 2026-06-04T02:29:19.449Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:20.396Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:20.985Z

[tool_use: Read]

### User | 2026-06-04T02:29:23.322Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-295 of 445 total (31948 tokens, cap 25000). Call Read with offset=296 limit=295 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# BLACKWELL AI-UPGRADE PLAN — FINAL (corrected post-adversarial-review)
2	
3	> **slot:india** · 2026-06-03
... [+40359 chars truncated]

### User | 2026-06-04T02:29:24.834Z

[tool_result] 1	---
2	name: ollama-cpu-keepalive-nim-contention-2026-06-03
3	description: Why local Ollama was pegging the CPU (KEEP_ALIVE=0 reload churn + NIM owns the whole 16GB GPU) and the fixes applied
4	metadata: 
5	  node_type: memory
6	  type: reference
7	  originSessionId: 928b2eda-ccf9-446a-821f-c9b8034b7000
8	---
9	
10	2026-06-03 (slot golf). Operator: "make sure ollama isnt killing my cpu." Diagnosi
... [+2617 chars truncated]

### User | 2026-06-04T02:29:25.269Z

[tool_result] 1	---
2	name: reference-ollama-cpu-cap-fix-2026-06-03
3	description: "Durable fix for Ollama pinning host CPU at 100% (golf 2026-06-03). On the 16GB-VRAM box NIM owns ~15.8GB VRAM, so Ollama can't fit on GPU and falls back to CPU inference — a resident model then grinds all 16 logical cores (was AboveNormal, preempting MCP boot + Fusion360). Per-tick `ollama stop` only treats the symptom (cached h
... [+5432 chars truncated]

### Assistant | 2026-06-04T02:29:30.414Z

I have the full upgrade-plan front matter and roadmap (MS0-MS6). Let me read the remaining contention/config lessons and check the milestone envelope status, plus look at the embedding/offload-fix items the graph flagged. Let me also confirm the U-FLEET-WAKE-SEQUENCER unit — it wasn't found by grep, so let me check the milestone envelopes and the operator-preference memory directly.

### Assistant | 2026-06-04T02:29:31.330Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:32.319Z

[tool_use: Read]

### Assistant | 2026-06-04T02:29:33.267Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:29:35.588Z

[tool_use: Bash]

### User | 2026-06-04T02:29:36.751Z

[tool_result] 1	---
2	name: reference-ollama-cpu-inference-host-thrash-2026-06-02
3	description: "Sustained 100% CPU + MCP-won't-boot + delta CAD thrash were ALL one root cause (golf 2026-06-02): Ollama doing CPU inference at AboveNormal priority, preempting everything incl. the MCP server's ~50s boot. Models (nomic-embed-text for embeddings + deepseek-r1:14b for scrutiny/consensus pre-flight) were forced onto 
... [+3650 chars truncated]

### User | 2026-06-04T02:29:37.656Z

[tool_result] <system-reminder>This memory is 4 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: reference_alpha_ollama_coldload_not_contention_2026_05_29
3	description: "Ollama generation 'flapping'/timeout is usually COLD-LOAD latency (~57s
... [+2540 chars truncated]

### User | 2026-06-04T02:29:48.071Z

[tool_result] (Bash completed with no output)

### User | 2026-06-04T02:29:52.970Z

[tool_result] ---ENVELOPE-NAMES---
INTEL-OLLAMA-OBSIDIAN-MS0.json
INTEL-OLLAMA-OBSIDIAN-MS1.json
LOCAL-LLM-MS0.json
OLLAMA-EXPAND-MS0.json

### Assistant | 2026-06-04T02:30:03.887Z

The Blackwell milestones (BLACKWELL-TOKEN-SYNERGY-MS0, BLACKWELL-AI-MS0, BLACKWELL-GPU-SWAP, BLACKWELL-DB-GEN-MS0) don't have envelope JSONs in `mcp-server/data/milestones/` — they're git-log/distill driven. There's no U-FLEET-WAKE-SEQUENCER unit in the substrate; it appears to be a forward-looking proposal not yet recorded. Let me verify by checking the git log for any Blackwell/wake-sequencer commits and read the LOCAL-LLM-MS0 envelope plus the model-routing/cost-router source to ground the 7B-monoculture contradiction.

### Assistant | 2026-06-04T02:30:05.969Z

[tool_use: Bash]

### Assistant | 2026-06-04T02:30:06.833Z

[tool_use: Read]

### Assistant | 2026-06-04T02:30:09.367Z

[tool_use: Read]

### User | 2026-06-04T02:30:11.606Z

[tool_result] 4e1d41ccdc [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-AUTO-ROUTE-ALLOWLIST (slot:alpha): curated gist-only auto-route — isGistSafe() gates auto-mode to logs/dumps/archives; digests/inventory/state/audit downgrade to suggest. Safe-by-construction; auto-mode OFF by default. Verified 15/15 direct eval. +7 tests.
86716f4aaf [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-C
... [+6706 chars truncated]

### User | 2026-06-04T02:30:14.825Z

[tool_result] 1	{
2	  "id": "LOCAL-LLM-MS0",
3	  "title": "Local LLM Hook Migration — Ollama-Powered Advisory Hooks",
4	  "track": "LOCAL-LLM",
5	  "status": "complete",
6	  "version": "1.0.0",
7	  "created_at": "2026-04-26",
8	  "priority": "HIGH",
9	  "description": "Migrate advisory hooks from Claude API consumption to local Ollama inference. Reduces hook overhead from ~1200 tokens/edit to ~0 by using local 
... [+5380 chars truncated]

### User | 2026-06-04T02:30:14.902Z

[tool_result] 1	---
2	name: reference-ollama-cpu-cap-fix-2026-06-03
3	description: "Durable fix for Ollama pinning host CPU at 100% (golf 2026-06-03). On the 16GB-VRAM box NIM owns ~15.8GB VRAM, so Ollama can't fit on GPU and falls back to CPU inference — a resident model then grinds all 16 logical cores (was AboveNormal, preempting MCP boot + Fusion360). Per-tick `ollama stop` only treats the symptom (cached h
... [+438 chars truncated]

### Assistant | 2026-06-04T02:31:41.885Z

I now have the complete picture. The U-FLEET-WAKE-SEQUENCER turned out to be a HERMES-ORCHESTRATOR-MS1 unit (fleet wake staggering — unrelated to Ollama model selection; it's about token-gated chat-slot wake). Let me make one final targeted check on the `LOCAL-LLM-FOUNDATION` qwen3 catalog and the operator-preference note about kimi2.6, then I have everything needed.

The substrate is thoroughly mined. Here is the report.

---

# PRISM Local-Model Selection + Blackwell Milestone — Knowledge Substrate Report

## 1. Executive finding

The 7B-monoculture you're seeing is **already being actively dismantled** — a coordinated multi-slot milestone family (BLACKWELL-*) shipped **the same day as this task (2026-06-03)** specifically to fix it. The architecture decisions are made; the **gap is config + take-rate, not design.** Several of your "core problems" are already fixed in committed code (the `home_blackwell` profile exists, the cost-router 7B cap is lifted), and two of them are explicitly logged as **operator-decision-gated, not bugs**.

---

## 2. Prior model-selection decisions (with source)

| Decision | Model chosen | Rationale | Source |
|---|---|---|---|
| **Heavy local reasoning/code** | `qwen2.5-coder:32b` (~22GB) | The locally-viable heavy model. Routes `code` + substantial `reasoning` to FREE local instead of paid cloud. | `reference_blackwell_token_synergy_ms0_2026_06_03` · commit `d673f2866f` (U-BW-ROUTE-PROFILE) |
| **kimi2.6 is CLOUD-ONLY — strike from all local roles** | n/a (cloud API voice only, PII-gated) | Kimi K2.6 = 1T-param MoE, ~350–610GB; Ollama publishes only `kimi-k2.6:cloud`. Cannot fit 96GB. Draft plan assumed ~30GB (10× error). | `reference_blackwell_ai_upgrade_plan_2026_06_03` · `BLACKWELL-AI-UPGRADE-PLAN` P0-1 |
| **deepseek-r1:14b must be PURGED** | replace with capability-probe pick | Hardcoded in ~10 engine files (ModelRoutingEngine, MultiModelConsensusEngine, OllamaTaskOffloaderEngine, aiReasoningDispatcher, etc.) — **but deepseek-r1
... [+12028 chars truncated]
