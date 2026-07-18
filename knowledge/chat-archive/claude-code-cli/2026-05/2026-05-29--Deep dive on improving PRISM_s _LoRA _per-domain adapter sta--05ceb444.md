---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Deep dive on improving PRISM's \"LoRA (per-domain adapter stack)\". Focus: ~95 LoR"
date: "2026-05-29"
first_ts: "2026-05-29T19:17:18.324Z"
last_ts: "2026-05-29T19:41:26.152Z"
cwd: "H:\\prism-slot-india"
messages: 49
user_msgs: 20
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-ab485c5838eca455d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Deep dive on improving PRISM's "LoRA (per-domain adapter stack)". Focus: ~95 LoR

> **claude-code-cli** | 2026-05-29 | 49 msgs (20 user / 29 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/workflows/wf_d1cc0086-132/agent-ab485c5838eca455d.jsonl`

## Transcript

### User | 2026-05-29T19:17:18.324Z

Deep dive on improving PRISM's "LoRA (per-domain adapter stack)". Focus: ~95 LoRA engines, cadence/drift/deployment/monitoring, continual learning, adapter registry, 3 orphaned LoRA engines (AG-1), training-data pipeline + anonymization

PRISM grounding (READ real files in worktree H:/prism-slot-india; it is divergent from main H:/prism — NN-GRAPH state + many engines live ONLY on main):
- Galaxy brain: mcp-server/src/engines/ai-training/{KNOWLEDGE.md,RULES.md,MEMORY.md,PATHS.md}
- VERIFIED FACTS from the first deep-dive (do not re-litigate): closed-loop IS ignited at boot (index.ts:434 XProcNeuralAutoFireEngine.activate) but CrossProcessOutcomeStore is ephemeral (configureStorePath has 0 prod callers); CAG cold-anchor is a no-op (PromptCachingEngine output reaches no live call site; LLMEngine.ts:327 _callClaude sends plain string); NN-GRAPH AUROC 0.096 is the link-prediction PRETEXT diagnostic NOT the deploy gate (gate correctly DEFERRED on poolSize=0, data-side); stratified neg-sampling ALREADY coded (graphsage-trainer.mjs:167, main).
- Constraints: duplicationGuard THROWS on new dup engines; NEVER inline physics constants; NEVER bypass the NN deploy gate. Ollama /api/chat is DEAD this session (no live embed).

TASK: Read the relevant PRISM files (Read/Grep/Glob) to establish what EXISTS — cite real paths, do not guess. Then list concrete improvements with leverage(1-10), effort, venue, the PRISM target file/engine, the named technique, and duplicationRisk (search first — duplicationGuard THROWS). Prioritize genuinely high-impact wiring/coupling fixes over cosmetic ones; be honest about what's already built.
CRITICAL: You MUST finish by calling the StructuredOutput tool with your findings. Do your file reads FIRST, keep them focused, then call StructuredOutput. Do not end your turn with prose — the StructuredOutput call IS the deliverable.

### Assistant | 2026-05-29T19:17:32.373Z

I'll establish what exists in the ai-training galaxy, focusing on the LoRA adapter stack. Let me start with the galaxy brain docs and then dig into the actual engine files.

### Assistant | 2026-05-29T19:17:34.300Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:17:35.013Z

[tool_use: Bash]

### User | 2026-05-29T19:21:29.011Z

[tool_result] AI-SYSTEMS-IMPROVEMENT-ROADMAP.md  10.6K
CLAUDE.md  12.6K
KNOWLEDGE.md  4.2K
MEMORY.md  8.5K
PATHS.md  11.1K
RULES.md  4.7K
TOOLBELT.md  3.7K
---KNOWLEDGE---
H:/prism-slot-india/mcp-server/src/engines/ai-training/AI-SYSTEMS-IMPROVEMENT-ROADMAP.md  10.6K
H:/prism-slot-india/mcp-server/src/engines/ai-training/CLAUDE.md  12.6K
H:/prism-slot-india/mcp-server/src/engines/ai-training/KNOWLEDGE.md  4.2K

... [+284 chars truncated]

### User | 2026-05-29T19:26:25.951Z

[tool_result] slot/india
---LoRA engine files---
AdaLoRARankAllocatorEngine.ts  7.3K
CAMLoRAAdapterTrainerEngine.ts  26.2K
CAMLoRAEngine.ts  22.9K
ContinualLoRAEngine.ts  11.1K
CrossProcessCuriosityDrivenExplorationEngine.ts  9.5K
DetachedLoRARunnerEngine.ts  15.0K
FederatedLoRAEngine.ts  5.2K
FiveAxisLoRACadenceEngine.ts  2.6K
FiveAxisLoRADatasetBuilderEngine.ts  4.3K
GrindingLoRACadenceEngine.ts  2.0K
Grindin
... [+2782 chars truncated]

### Assistant | 2026-05-29T19:26:29.779Z

Substantial LoRA surface. Let me read the brain docs and the core registry/coordination engines in parallel. I notice a 0-byte file (`WEDMLoRADatasetBuilderEngine.ts`) already — a P0 candidate.

### Assistant | 2026-05-29T19:26:30.715Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:31.227Z

[tool_use: Read]

### Assistant | 2026-05-29T19:26:31.593Z

[tool_use: Read]

### User | 2026-05-29T19:26:49.557Z

[tool_result] 1	# AI Training Galaxy MEMORY.md — per-domain working brain (slot:india)
2	
3	Append-only cross-session memory for the india slot (full-system training: AI/NN/GNN/LoRA/RAG/DL/ML).
4	
5	## Master-brain link
6	> Cloned from `state/shared/specs/MASTER-BRAIN-TEMPLATE.md` (alpha-owned canonical pattern — fine-tuned for ai-training, brain wiring NOT re-derived).
7	- **UP (pull from master):** `C:/Users/
... [+8356 chars truncated]

### User | 2026-05-29T19:26:49.858Z

[tool_result] 1	# PATHS.md — slot:india (ai-training) H:/-wide path atlas
2	
3	> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
4	> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/gr
... [+10967 chars truncated]

### User | 2026-05-29T19:26:49.937Z

[tool_result] 1	# AI-Systems Improvement Roadmap — slot:india (ai-training owner)
2	
3	> **Provenance.** Generated by Workflow `wf_ac7baf7a-038` (2026-05-29) — 19 agents, 2.17M sub-agent tokens, 3 phases (Research → adversarial Verify → Synthesize). **Honesty caveat (R12):** 7 of 9 topic research agents (deep-learning, deep-reasoning, nn, gnn, rag, lora, self-improving) failed to emit structured output and prod
... [+10621 chars truncated]

### Assistant | 2026-05-29T19:26:58.954Z

The roadmap doc is unusually thorough and already grounds the closed-loop/CAG threads. My task is LoRA-specific, which that roadmap explicitly skipped (the LoRA research agent failed to emit). Let me read the actual LoRA core engines: the registry, drift coordinator, MoE gating, composition, the 3 orphaned engines, and the 0-byte file. Then check actual dispatcher wiring.

### Assistant | 2026-05-29T19:26:59.902Z

[tool_use: Read]

### Assistant | 2026-05-29T19:27:00.391Z

[tool_use: Read]

### Assistant | 2026-05-29T19:27:00.848Z

[tool_use: Read]

### User | 2026-05-29T19:27:13.670Z

[tool_result] 1	/**
2	 * LoRAAdapterRegistryEngine — U-LEARN-07
3	 * =======================================
4	 *
5	 * Cross-domain registry of every trained LoRA adapter PRISM knows about.
6	 * One active adapter per (domain, context-key); older versions stay archived
7	 * for instant rollback. Persists to state/adapters/registry.jsonl (append-only)
8	 * with atomic writes.
9	 *
10	 * Lifecycle: staged → shado
... [+13144 chars truncated]

### User | 2026-05-29T19:27:14.866Z

[tool_result] 1	/**
2	 * LoRADriftCoordinatorEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL10
3	 * ==============================================================
4	 *
5	 * Monitors drift signals from all 8 pipeline LoRA cadence engines.
6	 * Fires a MASTER retrain trigger when ≥ k pipelines drift within a
7	 * rolling time window — suggests a shared upstream cause (e.g. material
8	 * batch variation affecting milling A
... [+6485 chars truncated]

### User | 2026-05-29T19:27:15.007Z

[tool_result] 1	/**
2	 * PRISMLoRAAdapterEngine — Phase 0.19 U-LLM3
3	 *
4	 * Manages the *inventory* of LoRA adapters trained by
5	 * `IncrementalLearningEngine` (U-LLM6). This is the registry side —
6	 * adapters live on disk under a root directory, each in its own folder
7	 * with a small JSON descriptor. The engine supports:
8	 *
9	 *   - register()  : record a new adapter produced by a training run
10	 *  
... [+11086 chars truncated]

### Assistant | 2026-05-29T19:27:25.508Z

I have a clear picture of the three different adapter-registry engines now. There are THREE overlapping registry/inventory engines: `LoRAAdapterRegistryEngine` (state/adapters/registry.jsonl), `PRISMLoRAAdapterEngine` (data/lora-adapters/), and likely a third in the Lathe stack. Let me check the actual dispatcher wiring for the 3 orphaned engines and read the MoE gating, composition, continual, and the 0-byte file.

### Assistant | 2026-05-29T19:27:26.907Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:27:27.806Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:27:29.249Z

[tool_use: Grep]

### Assistant | 2026-05-29T19:27:29.759Z

[tool_use: Read]

### User | 2026-05-29T19:27:45.124Z

[tool_result] No files found

### User | 2026-05-29T19:27:50.727Z

[tool_result] Found 3 files
mcp-server\src\engines\ai-training\MEMORY.md
mcp-server\src\engines\AutoPrintToProgramBridgeEngine.ts
mcp-server\src\__tests__\p1-lora-pairs.test.ts

### User | 2026-05-29T19:27:55.072Z

[tool_result] No files found

### User | 2026-05-29T19:27:57.343Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
2	/**
3	 * LoRA MoE Gating Engine — U-LEARN-05
4	 * =====================================
5	 *
6	 * Top-K softmax router over adapter set. Selects best experts based on:
7	 * - 5-dimensional quality score (accuracy, stability, coverage, confidence, freshness)
8	 * - Material embedding similarity
9	 * - Machine embedding
... [+6238 chars truncated]

### Assistant | 2026-05-29T19:28:05.261Z

Confirmed: `PRISMLoRAAdapterEngine` and `LoRAAdapterRegistryEngine` have ZERO dispatcher refs in this worktree. `MillLoRAPipelineCoordinatorEngine` doesn't even exist as a file here (it's main-tree-only). The MoE gating engine has a `// WIRE-EXEMPT` tag but it's also a singleton. Let me verify the actual ml/aiReasoning dispatcher wiring and read the composition, continual, and inference-gate engines plus check the 0-byte file.

### Assistant | 2026-05-29T19:28:11.764Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:28:11.775Z

[tool_use: Read]

### User | 2026-05-29T19:28:36.996Z

[tool_result] 1	// WIRE-EXEMPT: tests in ContinualLearningEngines.test.ts (49 cases)
2	/**
3	 * Continual LoRA Engine — U-LEARN-10
4	 * ====================================
5	 *
6	 * Unified continual learning engine combining EWC++, Synaptic Intelligence,
7	 * and DER++ for cross-domain LoRA training without catastrophic forgetting.
8	 *
9	 * Unifies: WEDMEWCMemoryEngine + LatheLoRAContinualLearningEngine patt
... [+11931 chars truncated]

### User | 2026-05-29T19:32:58.358Z

[tool_result] === mlDispatcher lora refs ===
=== aiReasoningDispatcher lora refs ===
=== WEDMLoRADatasetBuilderEngine size ===
0
=== files importing the cross-domain LoRA engines (composition/continual/inference-gate/moe) ===
mcp-server/src/tools/dispatchers/mlDispatcher.ts

### Assistant | 2026-05-29T19:33:21.373Z

Important findings emerging. Critical observations:

1. The `mlDispatcher` imports the cross-domain LoRA engines (composition/continual/inference-gate/moe/adalora/olora/fedlora) — confirmed it's the only consumer. But my grep for `lora_` action strings in it returned nothing — meaning the action names use different casing. Let me verify the actual action surface in mlDispatcher.

2. `ContinualLoRAEngine.train()` is a **mathematical stub** — `computeGradients` returns `Math.random()`, `updateEWC` uses `Math.random()` for Fisher information, `measureForgetting` returns `Math.random() * 0.1`. This is decorative math citing real papers (EWC++/SI/DER++) but computing noise. This is a major honesty/correctness gap given the `RULES.md` "never assert without eval" doctrine.

Let me verify the mlDispatcher action surface and read the composition + inference-gate engines, plus check the Lathe registry overlap and the dataset-builder pattern (to size the 0-byte fix).

### Assistant | 2026-05-29T19:33:28.390Z

[tool_use: Bash]

### Assistant | 2026-05-29T19:33:29.081Z

[tool_use: Read]

### User | 2026-05-29T19:33:59.120Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/loraCompositionU-LEARN-05.test.ts
2	/**
3	 * LoRA Composition Engine — U-LEARN-05
4	 * ======================================
5	 *
6	 * Orchestrator that composes multiple LoRA adapters into a single forward pass.
7	 * Combines outputs from the component engines:
8	 * - LoRAMoEGatingEngine: expert selection
9	 * - DoRAAdapterEngine: magnitude/direction 
... [+9265 chars truncated]

### User | 2026-05-29T19:36:32.400Z

[tool_result] === mlDispatcher action enum (case-sensitive) ===
=== count case statements in mlDispatcher ===
129
=== Does mlDispatcher import the registry engines? ===
=== which dispatcher imports LatheLoRA* / drift coordinator ===
mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
mcp-server/src/tools/dispatchers/turningDispatcher.ts
=== reference dataset builder for 0-byte fix (Milling one, similar do
... [+95 chars truncated]

### Assistant | 2026-05-29T19:36:48.523Z

Now I have a strong picture. Key structural findings:

1. **mlDispatcher imports the cross-domain LoRA engines** but uses different action names (129 case statements, but my `lora_*` greps returned empty — actions are likely named `adalora_*`/`continual_lora_*` etc. via spread enums, OR camelCase). Let me get the actual action names. The DISPATCHER_DIGEST parser bug (noted in CLAUDE.md regressions) means spread-array enums show 0 actions — that's why my regex missed them.

2. **Three separate adapter registries** with no shared contract: `LoRAAdapterRegistryEngine` (state/adapters/registry.jsonl, status lifecycle staged→shadow→canary→active), `PRISMLoRAAdapterEngine` (data/lora-adapters/, baseModel→adapterId active map), plus the Lathe stack's `LatheLoRAModelRegistryEngine`. **Neither cross-domain registry is wired to any dispatcher in this worktree.**

3. **MoE gating's material/machine embedding similarity is dead code** — `cosineSimilarity` is defined but `gate()` never calls it; the `materialIndex`/`machineIndex` are populated nowhere (`registerExpert` only fills `domainIndex`). The docstring claims embedding similarity but the implementation only does quality-score × 1.2 domain bonus.

4. **ContinualLoRAEngine.train() computes noise** — Fisher info, gradients, forgetting all `Math.random()`.

Let me confirm the exact mlDispatcher action names and check the Lathe registry overlap + drift coordinator wiring before finalizing.

### Assistant | 2026-05-29T19:36:55.246Z

[tool_use: Bash]

### User | 2026-05-29T19:37:56.458Z

[tool_result] === mlDispatcher: lines importing lora engines + the action case labels (first 60 case strings) ===
45:let _loraMoE: typeof import("../../engines/LoRAMoEGatingEngine.js").loraMoEGatingEngine | null = null;
47:let _adaLoRA: typeof import("../../engines/AdaLoRARankAllocatorEngine.js").adaLoRARankAllocatorEngine | null = null;
48:let _oLoRA: typeof import("../../engines/OrthogonalLoRAEngine.js").orth
... [+4218 chars truncated]

### Assistant | 2026-05-29T19:38:08.311Z

This resolves the wiring picture precisely. The cross-domain LoRA *training/composition* engines ARE wired (`mlDispatcher`: `lora_gate`, `lora_compose`, `adalora_*`, `olora_*`, `fedlora_*`, `continual_lora_*`; `aiReasoningDispatcher`: `lora_drift_*` → drift coordinator; `turningDispatcher`: 27 LatheLoRA actions). 

The **gap is the two adapter REGISTRIES** — `LoRAAdapterRegistryEngine` (the canonical lifecycle/rollback registry, staged→shadow→canary→active) and `PRISMLoRAAdapterEngine` (disk inventory) — neither is wired to any dispatcher. The MoE `gate()` selects experts but there's no live registry to feed it which adapters are `active`, and no `resolve()` exposed to inference. This is the real coupling break: composition picks experts from an in-memory `registerExpert` set that nothing persists or populates from the registry.

Let me do final duplication-risk checks: confirm there's no existing registry dispatcher action, and verify the InferenceLoRAGate (the runtime selection gate) wiring + the dataset-builder pattern for the 0-byte fix.

### Assistant | 2026-05-29T19:38:15.716Z

[tool_use: Bash]

### User | 2026-05-29T19:40:10.518Z

[tool_result] === any dispatcher action for adapter registry resolve/rollback/register-adapter? (dup check) ===
(empty above = no existing registry action = wiring gap, low dup risk)
=== InferenceLoRAGateEngine wired? ===
=== LatheLoRAModelRegistryEngine — does it overlap LoRAAdapterRegistry? export + purpose ===
121:class LatheLoRAModelRegistryEngine {
621:export const latheLoRAModelRegistryEngine = new LatheL
... [+1637 chars truncated]

### Assistant | 2026-05-29T19:40:18.448Z

All findings confirmed. The picture is complete:

- **`InferenceLoRAGateEngine` is UNWIRED** (0 dispatcher refs) — this is the runtime adapter-selection gate, a clean wiring gap not in the AG-1 list.
- **`LoRAAdapterRegistryEngine` + `PRISMLoRAAdapterEngine` both UNWIRED**, no existing registry dispatcher action (low dup risk to wire).
- **0-byte `WEDMLoRADatasetBuilderEngine.ts`** — its sibling `WEDMLoRACadenceEngine` (60 lines) imports it per AG-1; the `MachineLoRABaseEngine` + Sinker/Milling builders are the exact pattern to follow (~108-110 lines).
- **`LatheLoRAModelRegistryEngine`** is a separate domain-scoped registry — three registries with no shared schema/contract.
- **MoE gating dead embedding code** and **ContinualLoRA random-math stub** are correctness/honesty gaps.

I have enough grounded evidence. Calling StructuredOutput.

### Assistant | 2026-05-29T19:41:13.297Z

[tool_use: StructuredOutput]

### User | 2026-05-29T19:41:16.178Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-29T19:41:26.152Z

I've completed the deep-dive on PRISM's LoRA per-domain adapter stack and returned findings via StructuredOutput. Summary of what I grounded in real files:

The LoRA training/composition layer is genuinely wired (mlDispatcher lora_gate/lora_compose/adalora/olora/fedlora/continual, aiReasoningDispatcher lora_drift_*, turningDispatcher 27 Lathe actions). The real high-leverage gaps are coupling/correctness, not new builds:

- **P0**: `WEDMLoRADatasetBuilderEngine.ts` is 0 bytes but imported by `WEDMLoRACadenceEngine.ts:60`.
- **P1**: Both cross-domain adapter registries (`LoRAAdapterRegistryEngine`, `PRISMLoRAAdapterEngine`) and `InferenceLoRAGateEngine` are unwired — there's no live train→register→resolve→select→compose path; the MoE gate selects from an ephemeral in-memory set.
- **P1**: `LoRAMoEGatingEngine.gate()` doesn't use the embedding similarity it advertises (`cosineSimilarity`/material+machine indices are dead code).
- **P1**: `ContinualLoRAEngine.train()` returns `Math.random()` for Fisher/gradients/forgetting while citing EWC++/SI/DER++ — fabricated metrics through a wired action.
- **P2**: three uncoordinated registries; drift-coordinator master-retrain trigger isn't subscribed to anything.

All improvements were dup-checked (grep confirmed no existing registry actions), and main-tree-only items are flagged as such per the worktree-staleness caveat.
