---
type: "chat-session"
source: "claude-code-cli"
session_id: "c7361c9f-19ce-451b-9659-df77324c2fa1"
title: "You are the finalizing editor. Produce the AUTHORITATIVE final plan by folding t"
date: "2026-06-10"
first_ts: "2026-06-10T15:13:39.938Z"
last_ts: "2026-06-10T15:18:46.304Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-a8ac3ee0588b348b2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# You are the finalizing editor. Produce the AUTHORITATIVE final plan by folding t

> **claude-code-cli** | 2026-06-10 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c7361c9f-19ce-451b-9659-df77324c2fa1/subagents/workflows/wf_aab93b95-c57/agent-a8ac3ee0588b348b2.jsonl`

## Transcript

### User | 2026-06-10T15:13:39.938Z

You are the finalizing editor. Produce the AUTHORITATIVE final plan by folding the critique into plan v1, then WRITE it to disk.

PLAN V1:
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

**What:** Add vLLM (`vllm serve`, OpenAI-compatible) as a high-throughput serving layer for a small set of *hot, single-model* workloads on the RTX PRO 6000 Blackwell 96GB, while keeping native Ollama for the workloads vLLM structurally cannot serve well on one box (multi-model consensus/OCR ensembles, on-demand model swap, embeddings parity).

**Why:** vLLM's PagedAttention + continuous batching are explicitly designed to "serve many concurrent users from one GPU box" (E2) and the same source claims "2-4x more concurrent requests than alternatives on the same hardware." PRISM's defining load pattern — **26 concurrent Claude agent slots fanning grunt work at one local endpoint** — is exactly the high-concurrency-single-box case vLLM targets, and is exactly where Ollama (single-user-latency-optimized, per E2) is weakest.

**Recommendation posture:** **CONDITIONAL GO for Architecture Option A (vLLM ALONGSIDE Ollama), POC-gated.** Do NOT replace Ollama. The migration blast radius is wide (no single client chokepoint — ~150 files hand-roll `fetch`), three load-bearing Ollama-only capabilities (multi-model-on-one-endpoint, embeddings-corpus parity, auto 
... [+42688 chars truncated]

### Assistant | 2026-06-10T15:13:46.063Z

I'll fold the critique into the plan and write the authoritative final version. Let me first verify the key ground-truth claims the critique raised, since several P0s hinge on what files actually contain.

### Assistant | 2026-06-10T15:13:47.727Z

[tool_use: Bash]

### Assistant | 2026-06-10T15:13:48.356Z

[tool_use: Glob]

### Assistant | 2026-06-10T15:13:48.738Z

[tool_use: Glob]

### User | 2026-06-10T15:13:52.406Z

[tool_result] -rw-r--r-- 1 wompu 197611   77188 Jun  8 10:15 BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md
-rw-r--r-- 1 wompu 197611    9306 Jun  4 11:21 BLACKWELL-MODEL-UPGRADE-PLAN-2026-06-04.md
-rw-r--r-- 1 wompu 197611   10777 Jun  3 15:23 BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md
-rw-r--r-- 1 wompu 197611   13538 Jun  9 15:17 CANONICAL-HOST-FACTS-2026-06-09.html
-rw-r--r-- 1 wompu 197611    5036 Jun  9 15:16 CA
... [+1024 chars truncated]

### User | 2026-06-10T15:13:58.240Z

[tool_result] state\shared\specs\BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md
state\shared\specs\BLACKWELL-MODEL-UPGRADE-PLAN-2026-06-04.md
state\shared\specs\BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md

### User | 2026-06-10T15:13:58.268Z

[tool_result] state\shared\specs\LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md

### Assistant | 2026-06-10T15:14:08.833Z

The critique's claims check out — the sibling specs exist. Let me read the key ones to fold accurate citations into the final plan.

### Assistant | 2026-06-10T15:14:13.821Z

[tool_use: Read]

### Assistant | 2026-06-10T15:14:13.823Z

[tool_use: Read]

### User | 2026-06-10T15:14:15.359Z

[tool_result] 1	# PRISM LOCAL-LLM INTEGRATION BLUEPRINT — kimi2.6 + qwen3 on RTX PRO 6000 Blackwell (96GB)
2	
3	**Generated:** 2026-06-03 · slot:golf · deep-research workflow `wf_197110bb-e66` (8 agents: 3 ground [web+code] → 4 subsystem research → synthesis). Advisory; build from this with per-file + 3-of-3 scrutiny. Verify every `ollama pull` manifest + every file:line before editing.
4	
5	> ⚠️ **LIVE-CODE CO
... [+9864 chars truncated]

### User | 2026-06-10T15:14:15.428Z

[tool_result] 1	# Canonical Host Facts + Ollama Routing — DESKTOP-N7MI1VB (2026-06-09, slot:papa)
2	
3	> **Single source of truth** for this host's hardware + local-LLM roster. Verified LIVE 2026-06-09 (`os.cpus/totalmem/freemem`, `nvidia-smi`, `ollama /api/tags`). Every doc/skill/CLAUDE.md that cites specs or Ollama models should reference THIS file, not re-state numbers (that is how the drift this campaign ta
... [+4731 chars truncated]

### Assistant | 2026-06-10T15:14:33.448Z

The critique is fully validated. Key facts now confirmed from ground truth:

- **LOCAL-LLM-FOUNDATION-BLUEPRINT** is real: vLLM recipe (`vllm-qwen3next` on 8020, fp8, `--max-model-len 262144 --gpu-memory-utilization 0.45`), 88GB soft ceiling with >=8GB headroom, "NEVER both co-resident" rule, `home_blackwell`/`blackwell_96` enum work, qwen3 roster (qwen3-coder:30b-a3b, qwen3-next:80b-a3b as vLLM-pref, qwen3-embedding:8b mid-migration).
- **CANONICAL-HOST-FACTS** has zero vLLM content (P0-1 confirmed) and explicitly rules 136GB "approximately accurate, NOT drifted" (P2-1), flags qwen2.5-coder:7b documented-but-not-installed (P2-2).

Let me check the PSN-R4 throughput figure and the torch stack VRAM hold before writing.

### Assistant | 2026-06-10T15:14:36.427Z

[tool_use: Bash]

### User | 2026-06-10T15:14:40.944Z

[tool_result] 22:| **PagedAttention (vLLM)** | 10, 11 | S | KV-cache memory management; 24× higher throughput for production serving | Production-serving prerequisite when PRISM serves multiple slots simultaneously |
203:| Inference-time perf (NEW in R4) | — | — | — | **Speculative decoding**, PagedAttention/vLLM, Medusa |
===R4 DONE===
6:> Division of labor (operator-set): **golf owns infra** (Ollama/NIM/model
... [+8590 chars truncated]

### Assistant | 2026-06-10T15:14:57.048Z

All critique claims are now verified against ground truth. I have the exact numbers I need:

- **PSN-R4 line 22:** PagedAttention = "24x higher throughput for production serving" (P1-1 confirmed — the in-repo figure, not 2-4x).
- **BLACKWELL-AI-UPGRADE-PLAN lines 163-172:** The torch stack VRAM hold is concrete — GNN retrain ~6-12GB peak, full-corpus embed bs=512 ~4-5GB peak, 32B QLoRA ~35GB; "inference floor ~8.6GB"; forbidden combos explicitly modeled; training fires on S4U cron at 02:00 with `memory.free >= 8GB` deferral; `DistributedLockManager.withLock("gpu-train-<domain>")` serializes. torch 2.11.0+cu128/sm_120 at `H:/Tools/python-gpu` (3.13 venv).

Now I'll write the authoritative final plan, ASCII-only, all P0/P1 resolved.

### Assistant | 2026-06-10T15:18:18.346Z

[tool_use: Write]

### User | 2026-06-10T15:18:27.801Z

[tool_result] File created successfully at: H:/prism/state/shared/specs/VLLM-INCORPORATION-PLAN-2026-06-10.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T15:18:46.304Z

File written: `H:/prism/state/shared/specs/VLLM-INCORPORATION-PLAN-2026-06-10.md` (~430 lines).

**Recommended architecture:** Option A (vLLM ALONGSIDE Ollama, hybrid) - CONDITIONAL GO, Phase-0 POC-gated; do NOT replace Ollama.

**Operator decision-matrix questions:**
- Q1 - Throughput threshold: what measured multiplier at the 26-slot fan-out justifies a second serving stack?
- Q2 - Windows/WSL2 acceptance: run a permanent Linux-container GPU process and add it to the watchdog/reaper fleet?
- Q3 - Three-way VRAM policy: how much of the 88GB ceiling may vLLM permanently reserve given Ollama on-demand AND the torch training stack must also fit?
- Q4 - Embeddings scope: confirm embeddings stay out (owned by blueprint TIER-1.1, Ollama only)?
- Q5 - Octopus/OCR: keep on Ollama (Option A) or fund N-container proxy + verify vLLM multimodal (Option B)?
- Q6 - Enforcement posture: arm the co-residency guard as a HARD gate (vs advisory) under the standing YOLO bypass?
- Q7 - Scope: Option A vs Option B?
- Q8 - LoRA: move lathe LoRA to vLLM now, or defer?

**Critique items resolved:** 9 of 9 (P0-1 through P0-4, P1-1 through P1-5), plus P2-1/P2-2/P2-3 folded in and P2-4 was already a PASS. Key fixes: struck all unsourced "E1/E2" citations and re-marked as `[HYPOTHESIS - validate in POC]`; reconciled against the existing LOCAL-LLM-FOUNDATION-BLUEPRINT (vLLM already specced); re-pointed the vLLM candidate from legacy qwen2.5-coder:32b to qwen3-next:80b; rebuilt VRAM math as a three-way partition (vLLM + Ollama + torch training stack) against the 88GB ceiling; corrected the admission guard to advisory-PreToolUse and flagged the YOLO-bypass interaction.
