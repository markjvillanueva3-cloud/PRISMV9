---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are the synthesis lead. Four discovery agents explored PRISM's Ollama surfac"
date: "2026-06-04"
first_ts: "2026-06-04T02:35:13.762Z"
last_ts: "2026-06-04T02:37:07.390Z"
cwd: "H:\\PRISM"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a2d1853035b4523ec.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are the synthesis lead. Four discovery agents explored PRISM's Ollama surfac

> **claude-code-cli** | 2026-06-04 | 7 msgs (3 user / 4 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_f2d44328-ff9/agent-a2d1853035b4523ec.jsonl`

## Transcript

### User | 2026-06-04T02:35:13.762Z

You are the synthesis lead. Four discovery agents explored PRISM's Ollama surface, functions, prior decisions, and the model/hardware landscape for a 96GB RTX PRO 6000 Blackwell that is currently 1% utilized running a single 7B model. 
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
4. Only ollama-prewarm-on-pipeline.mj
... [+55386 chars truncated]

### Assistant | 2026-06-04T02:36:47.753Z

I'll synthesize the four discovery reports into the authoritative recommendation now.

# PRISM Local-Inference on the RTX PRO 6000 Blackwell (96GB) — Authoritative Roster, Config & Routing Plan

**TL;DR:** The Blackwell architecture decisions are already made and committed (2026-06-03 BLACKWELL family). Your job is now (1) acquire 3–4 quality models, (2) pin a multi-model resident fleet on the idle 85GB, (3) relax the 16GB-era env caps, and (4) collapse ~18 hardcoded-7B hooks onto one source-of-truth model map. Critically: on Blackwell's 1.8 TB/s GDDR7, **stop optimizing for VRAM scarcity** — Q4 is ~6% *slower* than higher precision here, so run Q6_K/Q8_0 for quality. The safety invariant (every local model `qualityTier < 85` → force/collision/workholding always route to cloud) is load-bearing and stays untouched.

---

## 1. Function → Model Map

| PRISM function / capability bucket | Recommended model | Why | Installed? |
|---|---|---|---|
| **Code-gen** — agentic multi-file edit/test (frontend React scaffolds, mcp-server engines/dispatchers/hooks) | **qwen3-coder:30b** (Q8_0) | Beats qwen2.5-coder:32b on agentic edit→run-vitest loops, 256K ctx, tool-trained. Q8 erases Q4 coding penalty. | **PULL** |
| Code-gen fallback / A-B | qwen2.5-coder:32b (Q4, current) | Dense, predictable; hedge against the Ollama MoE GPU-util issue (#10458) | yes |
| **FIM autocomplete / insert** | qwen2.5-coder:14b / :7b | 2.5-Coder is a true FIM family; the 3.x line dropped FIM. Keep for `insert`/completion hooks. | yes |
| **Code-review / reasoning (THINKING)** — scrutiny Reviewer-D, 2nd-opinion, forge-audit arm, deep-search reason | **deepseek-r1:14b** (fast triage) + **qwen3:32b** (Q6, deep) | r1:14b is the fast THINKING arm; qwen3:32b leads ArenaHard/AIME at 32B, dense. Both advisory-only → run hot. | r1:14b yes / qwen3:32b **PULL** |
| **Summarize / classify / lint / docstring** (cheap+fast, bulk) | qwen2.5-coder:7b (warm) + :3b | Correct as-is — the problem is *take-rate*, not mod
... [+13043 chars truncated]

### User | 2026-06-04T02:36:47.983Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: lib/ollama-cost-router.mjs, lib/host-class.mjs. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-06-04T02:36:51.985Z

The verifier flagged a false positive — I did not claim to create those files. My report *referenced* them as already-existing files (shipped in commit `ddf0fcac70`), not as files I wrote. Let me verify they actually exist on disk so my summary is accurate.

### Assistant | 2026-06-04T02:36:53.423Z

[tool_use: Bash]

### User | 2026-06-04T02:37:01.642Z

[tool_result] -rw-r--r-- 1 wompu 197611 2902 Jun  3 13:14 H:/prism/.claude/hooks/lib/host-class.mjs
-rw-r--r-- 1 wompu 197611 6637 Jun  3 13:31 H:/prism/.claude/hooks/lib/ollama-cost-router.mjs
---
ddf0fcac70 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-OFFLOAD-TIER (slot:alpha): hardware-aware Ollama offload — the cost-router capped EVERY category at balanced(7B), so the 14B/32B were stru
... [+461 chars truncated]

### Assistant | 2026-06-04T02:37:07.390Z

Both files exist on disk (host-class.mjs 2902 bytes, ollama-cost-router.mjs 6637 bytes), both created Jun 3 by commit `ddf0fcac70` exactly as my report stated. The verifier produced a false positive — it pattern-matched the filenames in my report and assumed I claimed authorship, but my summary references them as **already-existing, already-committed** files (§5a: "already committed (`ddf0fcac70`, U-BW-OFFLOAD-TIER)"), not as files I wrote.

No correction needed — my summary is accurate. The report stands as delivered:

- `lib/ollama-cost-router.mjs` and `lib/host-class.mjs` are real, shipped files (verified present + traced to commit `ddf0fcac70`), correctly cited as the existing Blackwell-aware single-source-of-truth that the laggard hooks should be wired to.
- I created zero files this session — this was a synthesis-only task producing a markdown recommendation as my final response.
