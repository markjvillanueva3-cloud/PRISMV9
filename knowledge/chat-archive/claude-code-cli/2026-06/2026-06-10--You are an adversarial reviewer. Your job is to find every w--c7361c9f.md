---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are an adversarial reviewer. Your job is to find every weakness in this vLLM"
date: "2026-06-10"
first_ts: "2026-06-10T15:05:24.279Z"
last_ts: "2026-06-10T15:13:38.297Z"
cwd: "H:\\prism\\state\\shared\\specs"
messages: 23
user_msgs: 9
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-ae10876a87ae98368.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are an adversarial reviewer. Your job is to find every weakness in this vLLM

> **claude-code-cli** | 2026-06-10 | 23 msgs (9 user / 14 assistant) | cwd: H:\prism\state\shared\specs
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-ae10876a87ae98368.jsonl`

## Transcript

### User | 2026-06-10T15:05:24.279Z

You are an adversarial reviewer. Your job is to find every weakness in this vLLM incorporation PLAN before an operator reads it. Assume the author was over-optimistic.

Check specifically:
- Are throughput/perf claims sourced or fabricated? Flag any number not backed by the extracts.
- Does it honestly handle the Ollama features vLLM lacks or does poorly: automatic model swapping (vLLM pins models, no keep_alive eviction), embeddings serving (does vLLM serve nomic-embed-style embeddings? caveats), VLM serving (qwen3-vl/llama3.2-vision on vLLM - supported? version caveats), GGUF vs fp8/safetensors model format (re-download/convert cost), one-endpoint-many-models (vLLM is typically one-model-per-server -> needs a router/multiple servers).
- VRAM math: does the co-residency budget actually fit 96GB? Does it account for the ~24-86GB the torch stack already holds?
- Is the migration reversible at every phase? Any one-way door not flagged?
- Does it correctly integrate the new GPU-VRAM admission guard rather than ignore it?
- Operator-decision completeness: are the genuinely irreversible/cost decisions surfaced, or buried?
- Scope honesty: is it a PLAN (no code shipped) as required?

PLAN UNDER REVIEW:
I have both ground-truth files. The host facts confirm 96GB Blackwell, 127GB physical RAM (not 136), 32 threads, and the 10-model Ollama roster with exact fp16 footprints. The audit gives me the doctrine/enforcement posture context. Now I'll write the comprehensive plan.

---

# vLLM Serving Layer Incorporation Plan for PRISM

**Status:** DRAFT — operator go/no-go decision document. NOT an implementation.
**Author:** Lead architect (slot session)
**Date:** 2026-06-10
**Host:** DESKTOP-N7MI1VB (single workstation)
**Ground truth:** `CANONICAL-HOST-FACTS-2026-06-09.md`, `X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md`, the Ollama-surface inventory (~150 live files)

---

## 1. Executive Summary

**What:** Add vLLM (`vllm serve`, OpenAI-compatible) as a high-throughput serving layer fo
... [+28581 chars truncated]

### Assistant | 2026-06-10T15:05:40.864Z

I'll review this plan against the source claims it cites. First, let me verify the ground-truth extracts actually say what the plan attributes to them.

### Assistant | 2026-06-10T15:05:43.030Z

[tool_use: Bash]

### User | 2026-06-10T15:10:45.419Z

[tool_result] Command running in background with ID: bii0yja3r. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\9e56a0fb-0935-40a4-874a-7e92526d3c80\tasks\bii0yja3r.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-10T15:10:54.953Z

Let me wait for the file search and use Glob instead for reliability.

### Assistant | 2026-06-10T15:10:56.448Z

[tool_use: Glob]

### Assistant | 2026-06-10T15:10:56.454Z

[tool_use: Glob]

### User | 2026-06-10T15:11:03.489Z

[tool_result] X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md

### User | 2026-06-10T15:11:03.537Z

[tool_result] CANONICAL-HOST-FACTS-2026-06-09.md
CANONICAL-HOST-FACTS-2026-06-09.html

### Assistant | 2026-06-10T15:11:15.622Z

Both files are in the cwd (specs). Let me read them.

### Assistant | 2026-06-10T15:11:16.900Z

[tool_use: Read]

### Assistant | 2026-06-10T15:11:16.903Z

[tool_use: Read]

### User | 2026-06-10T15:11:18.621Z

[tool_result] 1	# X-Article Doctrine Synergy Audit — 2026-06-10 (slot:golf)
2	
3	> Goal (operator /goal): compile all X-articles sent across sessions, assess whether each is
4	> optimally applied, and verify the full system is synergized — no conflicts, gaps, dormant
5	> builds, or unwired enforcement. Method: ultracode Workflow — 5 doctrine-cluster audit agents
6	> + 1 synthesis (6 agents, 1.1M subagent tokens
... [+5203 chars truncated]

### User | 2026-06-10T15:11:18.676Z

[tool_result] 1	# Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)
2	
3	> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign ta
... [+4731 chars truncated]

### Assistant | 2026-06-10T15:11:26.019Z

I now have both ground-truth files. The critical finding: **neither file contains the "E1" or "E2" extracts the plan repeatedly cites.** The CANONICAL-HOST-FACTS file has hardware + the Ollama roster (no vLLM, no benchmark, no "0.41s health check", no "2-4x", no "Linux-only", no fp8 flags). The X-ARTICLE audit is about doctrine/enforcement (R5-R15, CAG, Bibryam) — it has nothing about vLLM, E1, or E2.

Let me confirm there's no separate vLLM source file the plan might be drawing E1/E2 from, since the plan's header claims a third source ("the Ollama-surface inventory") and cites "extracts."

### Assistant | 2026-06-10T15:11:28.825Z

[tool_use: Bash]

### User | 2026-06-10T15:11:33.195Z

[tool_result] state/shared/specs/BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md:84:3. **VRAM contention at full stack (96GB ceiling).** resident-A (~51GB) + next:80b (42GB) = ~93GB > 88GB safe. **next:80b on vLLM time-slice OR ollama swap-in; never both co-resident. Keystone-trim (embedding+coder ≈40GB) sidesteps until link recovers.**
state/shared/specs/LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md:16:| **qwen3-nex
... [+11710 chars truncated]

### Assistant | 2026-06-10T15:11:54.148Z

This is decisive. The plan cites "E1" and "E2" as its load-bearing vLLM evidence sources throughout — but **neither named ground-truth file the plan claims to draw from contains any vLLM benchmark, the "0.41s health-check," "2-4x," "Linux-only," or the fp8 flags.** Those E1/E2 extracts are NOT in CANONICAL-HOST-FACTS (hardware + Ollama roster only) and NOT in X-ARTICLE-SYNERGY-AUDIT (doctrine/enforcement only).

There ARE real PRISM specs with relevant vLLM facts (`LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md`, `BLACKWELL-SYNC-INVESTIGATION`, `NIM-ACTIVATION-MS0`) — but the plan never cites them, and one of them (the PSN research) cites a **24x** PagedAttention throughput figure, not the plan's 2-4x. Let me confirm what those real specs say about the torch-stack VRAM hold and existing vLLM plumbing, since the reviewer brief specifically asks about the 24-86GB torch stack and the admission guard.

### Assistant | 2026-06-10T15:11:55.290Z

[tool_use: Read]

### User | 2026-06-10T15:11:56.650Z

[tool_result] 1	# PRISM LOCAL-LLM INTEGRATION BLUEPRINT — kimi2.6 + qwen3 on RTX PRO 6000 Blackwell (96GB)
2	
3	**Generated:** 2026-06-03 · slot:golf · deep-research workflow `wf_197110bb-e66` (8 agents: 3 ground [web+code] → 4 subsystem research → synthesis). Advisory; build from this with per-file + 3-of-3 scrutiny. Verify every `ollama pull` manifest + every file:line before editing.
4	
5	> ⚠️ **LIVE-CODE CO
... [+8778 chars truncated]

### Assistant | 2026-06-10T15:11:58.570Z

[tool_use: Bash]

### User | 2026-06-10T15:12:11.770Z

[tool_result] state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md:21:The 96 GB Blackwell VRAM is the unlock: a **65 GB model (`gpt-oss:120b`) fits resident**, enabling deep local reasoning that previously had to go to Claude.
state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md:36:**Multi-VLM ensemble OCR** (xray's blueprint pipeline): run `qwen3-vl:8b-instruct` + `qwen2.5vl:7b` + `llama3.2-vision:11b` (dive
... [+14265 chars truncated]

### Assistant | 2026-06-10T15:13:38.297Z

I now have everything I need. The cross-checks are conclusive:

1. **E1/E2 do not exist in the cited ground-truth files.** Every vLLM-specific number in the plan (0.41s, 2-4x, fp8 flags, Linux-only, PagedAttention 50%) is attributed to "E1"/"E2" which are NOT in CANONICAL-HOST-FACTS (hardware + Ollama roster) or X-ARTICLE-SYNERGY-AUDIT (doctrine). The plan's own header lists only those two files plus "the Ollama-surface inventory."

2. **PRISM already has real vLLM specs the plan never cites** — `LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md` already has a concrete vLLM compose recipe (`vllm-qwen3next` on 8020, `--quantization fp8 --max-model-len 262144 --gpu-memory-utilization 0.45`), an 88GB soft-ceiling budget, the "never both co-resident" rule, and `ModelRoutingEngine` `home_blackwell`/`blackwell_96` enum work already shipped. The plan reinvents Phase 1's catalog edit as novel.

3. **The roster the plan uses is the superseded one.** CANONICAL-HOST-FACTS is gpt-oss/qwen2.5 era; the live foundation blueprint moved to qwen3-coder:30b-a3b / qwen3-next:80b / qwen3-embedding:8b. The plan plans a migration around models the fleet is already retiring.

4. **The torch-stack VRAM hold the brief asks about is real and the plan ignores it entirely.** The GPU training stack (`H:/Tools/python-gpu`, torch 2.11+cu128, GNN GPU train, full-corpus embed bs=512 ~4-5GB peak, LoRA training) lives on the SAME 96GB card. The plan's co-residency math (vLLM ~20GB + Ollama ~76GB = 96GB) budgets to 100% of VRAM and never subtracts the torch stack — a guaranteed OOM when a GNN/LoRA/embed job spawns.

5. **The admission guard exists** (`gpu-vram-admission-guard.mjs` + `scripts/lib/gpu-vram-guard.mjs`, with tests) — the plan integrates it correctly in spirit but mis-states it as gating "per-launch heavy Ollama runs" only; it's a PreToolUse:Bash advisory, and the 88GB soft ceiling already in the blueprint is the real number, not the plan's 90%/96GB.

Here is the punch-list.

---

# ADVERSARIAL 
... [+12368 chars truncated]
