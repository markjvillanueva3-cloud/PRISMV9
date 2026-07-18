---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "You are the SYNTHESIS lead. Below are 2 verified topic dossiers on improving PRI"
date: "2026-05-29"
first_ts: "2026-05-29T19:06:29.655Z"
last_ts: "2026-05-29T19:07:54.642Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_ac7baf7a-038/agent-a6f2f68326f9a5d58.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# You are the SYNTHESIS lead. Below are 2 verified topic dossiers on improving PRI

> **claude-code-cli** | 2026-05-29 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_ac7baf7a-038/agent-a6f2f68326f9a5d58.jsonl`

## Transcript

### User | 2026-05-29T19:06:29.655Z

You are the SYNTHESIS lead. Below are 2 verified topic dossiers on improving PRISM's AI systems (deep learning, deep reasoning, NN, GNN, RAG, CAG, LoRA, closed-loop, self-improving).

[{"topic":"CAG (cache-augmented generation)","currentState":"The CAG subsystem in this slot/india worktree is THINNER than the task brief implies — there is NO scripts/lib/cag-router.mjs (confirmed: file absent; the \"router\" exists only as a cold/hot/mixed CLASSIFICATION TABLE in state/shared/audit-2026-05-26-india/03-rag-cag-embeddings.md, not as code). What actually exists: (1) PromptCachingEngine.ts (mcp-server/src/engines/PromptCachingEngine.ts, 257 lines, 28 tests) — builds Anthropic system-block arrays with cache_control:{type:\"ephemeral\"}, sorts stable blocks biggest-first, caps at ANTHROPIC_MAX_CACHE_BREAKPOINTS=4, DEFAULT_MIN_CACHE_CHARS=4096, tracks hit_rate via recordUsage(), breakEvenReads() returns Infinity below 1024 tokens else 1. (2) One SessionStart hook cag-soul-cache-block.mjs (U-CAG-01) emitting the per-slot soul as a one-shot SessionStart additionalContext block + sidecar state/shared/cag-route/slot-soul-cached-<sid>.json. CRITICAL GAP verified by grep: PromptCachingEngine's cache_control output is consumed at ZERO live LLM call sites — no match for buildCachedSystem/cache_control in LLMEngine.ts or anywhere in scripts/; reachable ONLY via prism_dev MCP actions (pc_build_cached_system/pc_wrap_system_prompt/pc_break_even_reads/pc_get_stats). The 8 per-turn injectors re-emit static doctrine every turn and never call the engine. Telemetry channel (U-CAG-02, prompt-cache-stats.jsonl) does NOT exist on disk, so hit-rate is unmeasured. SPEC-INDIA-SUBSTRATE-GAP-PLAN maps this to open AUDIT-2026-05-16 F1 (static-doctrine churn) + F6 (no cache telemetry). NN-GRAPH state and RaBitQ/binary-quant libs from the git log live on MAIN, not in this worktree; india-awareness-inject.mjs is slot-gated and surfaces NN-GRAPH gate state via scripts/ai-training-awareness.mjs.","gaps":
... [+16104 chars truncated]

### Assistant | 2026-05-29T19:07:54.642Z

# PRISM AI-Stack Improvement Roadmap — slot:india (ai-training owner)

## 1. Executive Summary

PRISM's AI stack is architecturally complete but mechanically uncoupled — the engines exist, pass their tests, and are wired to MCP dispatcher actions, but the load-bearing data paths that would let them *learn* and *save tokens* in production are no-ops. The closed-loop RL/neural substrate (`OutcomeRLBridgeEngine` → QLearning/PolicyGradient/Bandit, `CrossProcessNeuralLearningEngine` with experience-replay + EWC) is genuinely ignited at boot (`index.ts:434` via `XProcNeuralAutoFireEngine.activate()`) — but its training store (`CrossProcessOutcomeStore`) has `storePath=null`, so every shop-floor signal evaporates on MCP restart. The CAG cold-anchoring engine (`PromptCachingEngine`) builds correct `cache_control:ephemeral` system blocks that **nothing sends to Anthropic** — a verified runtime no-op. The real leverage is not building new engines (duplicationGuard would block most of it anyway) — it is closing three short, surgical wiring gaps that turn already-built, already-tested machinery from ephemeral/decorative into durable/live. The NN-GRAPH gate is correctly DEFERRED on a data-side `poolSize=0` reference-pool shortfall (not a model defect) and the AUROC 0.096 figure is the link-prediction *pretext diagnostic*, not the deploy gate — do not chase it as a model bug.

## 2. The Single Highest-Leverage Thread

The synthesis dossiers split the top-leverage slot between two candidates. Honest read: **the NN-GRAPH AUROC lift is NOT the highest-leverage actionable thread for slot:india right now — it is GPU-gated AND main-tree-only AND data-blocked**, and chasing it violates the explicit deploy-gate constraint. The two confirmed P0s that ARE actionable rank above it:

> **Thread A (P0, worktree-now, leverage 8.5): Persist `CrossProcessOutcomeStore` at boot so the live learning loop survives MCP restart.**

This is the single highest genuinely-actionable lever. The loop is *al
... [+10373 chars truncated]
