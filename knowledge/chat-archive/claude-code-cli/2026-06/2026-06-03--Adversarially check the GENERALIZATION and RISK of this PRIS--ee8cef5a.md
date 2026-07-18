---
type: "chat-session"
source: "claude-code-cli"
session_id: "ee8cef5a-0329-4f80-9051-ad015abc53ba"
title: "Adversarially check the GENERALIZATION and RISK of this PRISM GPU AI-upgrade mas"
date: "2026-06-03"
first_ts: "2026-06-03T18:02:53.044Z"
last_ts: "2026-06-03T18:22:14.116Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/ee8cef5a-0329-4f80-9051-ad015abc53ba/subagents/workflows/wf_c789f27d-219/agent-ac20d8be2067ecf0c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Adversarially check the GENERALIZATION and RISK of this PRISM GPU AI-upgrade mas

> **claude-code-cli** | 2026-06-03 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ee8cef5a-0329-4f80-9051-ad015abc53ba/subagents/workflows/wf_c789f27d-219/agent-ac20d8be2067ecf0c.jsonl`

## Transcript

### User | 2026-06-03T18:02:53.044Z

Adversarially check the GENERALIZATION and RISK of this PRISM GPU AI-upgrade master plan. You are the generalization+risk skeptic.

=== PLAN ===
I have all 8 subsystem assessments. Let me synthesize them into one dependency-ordered master plan. This is a planning deliverable — return only markdown.

# PRISM Internal-AI Blackwell Master Plan (slot:india)
## 96GB RTX PRO 6000 Blackwell — Build-Once-in-India → All-34-Galaxies

> Scope: india owns the AI-system upgrades that *consume* GPU infra; golf owns the infra. This plan synthesizes 8 subsystem assessments (NN/GNN, LoRA, RAG, CAG, master-graph, model-routing, octopus, closed-loop) into one dependency-ordered build. Doctrine-bound: no stubs, no inlined physics constants, candidate→live only on deploy-gate pass (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15), per-file 2-arm scrutiny + 3-of-3 Stop gate when india later BUILDS each unit. **This session = plan only.**

---

## Executive summary — the 96GB unlock in 5 bullets

- **One GPU collapses three independent walls at once.** Every subsystem is blocked by the *same* CPU/JS ceiling: the GNN trains in single-threaded float64 JS capped at 6,000 of 302,447 nodes; RAG embedding is a serial 200ms/doc Ollama loop that has never finished a 38,710-file pass; all ~95 LoRA engines are orchestration shells whose `innerTrain` slot was never filled. 96GB Blackwell with a real PyTorch cu128/sm_120 stack removes the node cap, the serial-embed wall, and the no-trainer gap simultaneously — these are not three projects, they are one infra unlock with three payoffs.
- **The training/inference split is absolute and load-bearing.** Ollama is an inference server: it serves GGUF + embeddings + KV-cached CAG contexts, and it CANNOT train a GNN, fine-tune a LoRA, or run a backward pass. Every "training" claim that routes through Ollama is silently a no-op. All real learning (GNN retrain, QLoRA, reward modeling, EWC Fisher) goes through Python+CUDA; Ollama only *serves the result*. This boundary i
... [+31858 chars truncated]

### Assistant | 2026-06-03T18:03:06.467Z

I'll dig into the actual code to verify the plan's load-bearing claims before issuing a generalization+risk verdict. Let me check the key assets the plan names.

### Assistant | 2026-06-03T18:03:08.849Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:03:10.238Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:03:12.541Z

[tool_use: Bash]

### User | 2026-06-03T18:03:42.651Z

[tool_result] === nn-graph-retrain-lifecycle ===
./scripts/nn-graph-retrain-lifecycle.mjs

### User | 2026-06-03T18:04:47.382Z

[tool_result] ./scripts/lib/graphsage-predictor.mjs
./scripts/lib/graphsage-trainer.mjs
=== classifyGnn ===
./.claude/hooks/nn-graph-health-inject.mjs
./.claude/hooks/nn-graph-health-inject.test.mjs
./.claude/hooks/psn-leg-state-inject.mjs
./.claude/hooks/psn-leg-state-inject.test.mjs

### User | 2026-06-03T18:09:51.322Z

[tool_result] Command running in background with ID: bpfpo1sv4. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ee8cef5a-0329-4f80-9051-ad015abc53ba\tasks\bpfpo1sv4.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T18:09:54.497Z

Let me read the key files directly rather than shell-searching further.

### Assistant | 2026-06-03T18:09:55.652Z

[tool_use: Read]

### Assistant | 2026-06-03T18:09:56.681Z

[tool_use: Bash]

### User | 2026-06-03T18:10:00.814Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * nn-graph-retrain-lifecycle.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
4	 *
5	 * The autonomous half of the GNN tier-5 wiring classifier. Runs as a Windows
6	 * scheduled task (see .claude/helpers/install-nn-graph-retrain-task.ps1),
7	 * independent of any Claude session, on a periodic poll:
8	 *
9	 *   1. FINGERPRINT  — read system-graph.json, summarize {nodeCo
... [+5214 chars truncated]

### User | 2026-06-03T18:12:07.205Z

[tool_result] === deepseek-r1 refs (rtk) ===
mcp-server/src/engines/ConsensusAIBridgeEngine.ts:100:  plan:     { codexEffort: "xhigh",  ollamaModel: "deepseek-r1:14b",      timeoutMs: 180_000 },
mcp-server/src/engines/ConsensusAIBridgeEngine.ts:101:  build:    { codexEffort: "high",   ollamaModel: "deepseek-r1:14b",      timeoutMs: 120_000 },
mcp-server/src/engines/ConsensusAIBridgeEngine.ts:102:  review:   { c
... [+2384 chars truncated]

### Assistant | 2026-06-03T18:12:18.938Z

The `deepseek-r1:14b` hardcoding is real and widespread — but it's spread across more engines than the plan's keystone touches (`ConsensusAIBridgeEngine`, `ModelRoutingEngine`, `MultiModelConsensusEngine`, `OllamaContextFloorEngine`). Let me verify the promotion-arbiter claim and the model-routing surface the plan claims to "replace fleet-wide."

### Assistant | 2026-06-03T18:12:19.227Z

[tool_use: Read]

### Assistant | 2026-06-03T18:12:21.480Z

[tool_use: Bash]

### User | 2026-06-03T18:12:22.398Z

[tool_result] 1	/**
2	 * ModelRoutingEngine — Phase 0.19 U-LLM7
3	 *
4	 * Decide which LLM backend/model should service a given request so simple
5	 * queries take the local Ollama path (free, on-prem, fast once warm) and
6	 * only queries that genuinely need frontier reasoning fall back to the paid
7	 * Claude/OpenAI APIs. Pure scoring function: the engine does NO network I/O
8	 * — callers feed it request fea
... [+6906 chars truncated]

### User | 2026-06-03T18:17:32.666Z

[tool_result] Command running in background with ID: b2mynuubq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ee8cef5a-0329-4f80-9051-ad015abc53ba\tasks\b2mynuubq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T18:17:39.602Z

I have key findings already. Let me verify a few more load-bearing claims: the existing offload/router surface the plan says it will "replace fleet-wide," and whether `regen-viz` is actually broken (sierra's lane), plus the LoRA `innerTrain` claim.

### Assistant | 2026-06-03T18:17:41.225Z

[tool_use: Read]

### Assistant | 2026-06-03T18:17:44.135Z

[tool_use: Bash]

### User | 2026-06-03T18:17:47.897Z

[tool_result] 1	=== promoteDecision callers ===
2	scripts/nn-graph-retrain-lifecycle.mjs:29: * SAFETY INVARIANT (load-bearing): promoteDecision() returns promote:true if
3	scripts/nn-graph-retrain-lifecycle.mjs:35: * promoteDecision — unit-tested with reference values) + a fail-soft imperative
4	scripts/nn-graph-retrain-lifecycle.mjs:202:export function promoteDecision(opts = {}) {
5	scripts/nn-graph-retrain-li
... [+775 chars truncated]

### User | 2026-06-03T18:19:47.055Z

[tool_result] === innerTrain refs ===
scripts/lib/lora-training-pipeline.mjs
scripts/lib/lora-training-pipeline.test.mjs
=== lora-training-pipeline ===
./scripts/lib/lora-training-pipeline.mjs
=== aiSystemRouter file ===
./.claude/worktrees/agent-a01e7b81d0946a97b/mcp-server/src/engines/AISystemRouterEngine.ts
./.claude/worktrees/agent-a0310b5d699214970/mcp-server/src/engines/AISystemRouterEngine.ts
./.claude/w
... [+1477 chars truncated]

### Assistant | 2026-06-03T18:19:52.762Z

Confirmed: no existing capability-probe asset (keystone is genuinely new), `promoteDecision` is the sole arbiter as claimed, `innerTrain` lives in `lora-training-pipeline.mjs`, and the router/OllamaHookBridge surfaces exist. The `aiSystemRouter` only shows in worktrees — let me confirm it exists in the real tree and check regen-viz status, then verify the closed-loop and outcome-bus surface.

### Assistant | 2026-06-03T18:19:55.830Z

[tool_use: Bash]

### User | 2026-06-03T18:20:48.693Z

[tool_result] === AISystemRouter in main tree ===
mcp-server/src/engines/AISystemRouterEngine.ts
EXISTS
=== regen-viz ===
scripts/regen-viz.mjs*
EXISTS
=== outcome-bus / dev-outcomes ===
./.claude/hooks/outcome-bus-auto-tap.mjs
./knowledge/wiki/architecture/engines/xproc/outcomerlbridgeengine.md
./knowledge/wiki/architecture/engines-unwired/outcomerlbridgeengine.md
./knowledge/wiki/architecture/hooks/runtime/ou
... [+557 chars truncated]

### Assistant | 2026-06-03T18:22:14.116Z

All load-bearing claims verified against the live tree. The `OutcomeRLBridgeEngine` is in `engines-unwired/` wiki path (orphan), `system-graph.json` is the claimed 676MB Jun 3, regen-viz exists. I have enough to issue the adversarial verdict.

# Generalization + Risk Adversarial Review — BLACKWELL-AI Master Plan (slot:india)

Verified against the live tree: keystone `OllamaCapabilityProbeEngine` does NOT exist yet (genuinely new, good). `promoteDecision()` IS the sole GNN arbiter as claimed (`scripts/nn-graph-retrain-lifecycle.mjs:202,617`). `deepseek-r1:14b` is hardcoded in **6+ engines**, not just the 5 subsystems the plan names. `innerTrain` lives in `lora-training-pipeline.mjs`. `system-graph.json` is the claimed 676MB (Jun 3). `OutcomeRLBridgeEngine.ts` exists but sits in the **`engines-unwired/`** wiki bucket — it is an orphan, which the plan does not flag.

## Findings

**1. (P0 — generalization overclaim) The `deepseek-r1:14b` purge is scoped to 1 engine but the rot is in at least 6.** U-ROUTE-LADDER/U-OCTOPUS-PANEL name `MultiModelConsensusEngine` + `aiSystemRouterEngine`. But the hardcode also lives in `ConsensusAIBridgeEngine.ts` (4 separate `plan/build/review/validate` route entries, lines 100-106), `ModelRoutingEngine.ts:150` (its own `DEFAULT_MODEL_CATALOG`), and `OllamaContextFloorEngine.ts:5`. The plan's "zero hardcoded model strings remain (grep gate)" acceptance criterion will **fail on first run** because the grep will light up engines no unit touches. `ModelRoutingEngine` is the *real* fleet routing surface (`TaskKind`/`Backend`/`HardwareProfile` enum, already has a `home_blackwell` profile and a `qwen2.5-coder:32b` catalog entry) — it is a competing, more-mature router that the plan ignores in favor of `aiSystemRouterEngine`. **Fix:** expand U-ROUTE-LADDER scope to enumerate ALL hardcode sites (add `ConsensusAIBridgeEngine`, `ModelRoutingEngine`, `OllamaContextFloorEngine`); decide whether the ladder wraps `ModelRoutingEngine` (which already doe
... [+11111 chars truncated]
