---
type: "chat-session"
source: "claude-code-cli"
session_id: "54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6"
title: "Read-and-report (plain prose, NO JSON). Map india's domain-LoRA DOCTRINE + infer"
date: "2026-06-04"
first_ts: "2026-06-04T17:55:24.449Z"
last_ts: "2026-06-04T18:00:56.890Z"
cwd: "H:\\prism"
messages: 57
user_msgs: 24
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-aba42da2f8cbb7e9c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Read-and-report (plain prose, NO JSON). Map india's domain-LoRA DOCTRINE + infer

> **claude-code-cli** | 2026-06-04 | 57 msgs (24 user / 33 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/54a75f3b-6a1a-45fa-9e6f-d10e71cf0be6/subagents/workflows/wf_2ac1be26-d2f/agent-aba42da2f8cbb7e9c.jsonl`

## Transcript

### User | 2026-06-04T17:55:24.449Z

Read-and-report (plain prose, NO JSON). Map india's domain-LoRA DOCTRINE + inference/cadence pattern in H:/prism.
Read mcp-server/src/engines/ai-training/CLAUDE.md + MEMORY.md (the india galaxy brain). Read mcp-server/src/engines/InferenceLoRAGateEngine.ts + ContinualLoRAEngine.ts + DetachedLoRARunnerEngine.ts headers.
REPORT EXACTLY:
1. India's canonical doctrine for adding/training/deploying a per-domain LoRA — the lifecycle (dataset -> train -> eval-gate -> deploy -> monitor -> cadence). Cite the engines that own each stage.
2. InferenceLoRAGate: how is a trained adapter gated before deployment (eval thresholds)? This matters because my trainset is ensemble-distilled pseudo-labels (under-powered calibration) — what gate would catch a bad blueprint LoRA?
3. DetachedLoRARunner / ContinualLoRA: is there a mechanism to run a long fine-tune detached (survives /compact) + continually refine? Real or stub?
4. What is the MINIMAL, correct way for slot:xray to hand its trainset to india's stack so india (full-system-training slot) owns the actual fine-tune? Name the exact engine/action/dispatcher.
Concrete with engine names. Flag stubs.

### Assistant | 2026-06-04T17:55:51.586Z

I'll read the india galaxy brain and the three LoRA engines, then report on the doctrine and pattern.

### Assistant | 2026-06-04T17:55:53.599Z

[tool_use: Read]

### Assistant | 2026-06-04T17:55:53.604Z

[tool_use: Read]

### Assistant | 2026-06-04T17:55:53.608Z

[tool_use: Glob]

### Assistant | 2026-06-04T17:55:54.526Z

[tool_use: Glob]

### Assistant | 2026-06-04T17:55:54.531Z

[tool_use: Glob]

### User | 2026-06-04T17:56:08.119Z

[tool_result] 1	# INDIA Galaxy Memory — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
2	
3	Append-only cross-session memory for the india slot.
4	
5	## Master-brain link
6	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
7	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowl
... [+5487 chars truncated]

### User | 2026-06-04T17:56:08.312Z

[tool_result] 1	# AI Training Galaxy (INDIA slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> INDIA - FULL SYSTEM TRAINING: AI SYSTEMS, NN, GNN, LORA, RAG, DEEP LEARNING, DEEP REASONING, MACHINE LEARNING, PATTERN RECOGNITION, ALGORITHM AND ENGINE COORDINATION, LOOP LEARNING AND TRAINING SYSTEM THAT IS SELF IMPROVING AND SELF UPDATING
5	
6	## What lives here
7	
8	The AI training surface — every mod
... [+5642 chars truncated]

### User | 2026-06-04T17:56:24.473Z

[tool_result] mcp-server\src\engines\InferenceLoRAGateEngine.ts

### User | 2026-06-04T17:56:26.915Z

[tool_result] mcp-server\src\engines\DetachedLoRARunnerEngine.ts

### User | 2026-06-04T17:56:27.068Z

[tool_result] mcp-server\src\engines\ContinualLoRAEngine.ts

### Assistant | 2026-06-04T17:56:32.014Z

Now let me read the three engine files. I'll read the headers plus enough body to understand the gate thresholds, detached mechanism, and continual-refine logic.

### Assistant | 2026-06-04T17:56:35.447Z

[tool_use: Read]

### Assistant | 2026-06-04T17:56:35.451Z

[tool_use: Read]

### Assistant | 2026-06-04T17:56:35.454Z

[tool_use: Read]

### User | 2026-06-04T17:56:37.799Z

[tool_result] 1	/**
2	 * InferenceLoRAGateEngine — U-LEARN-07
3	 * =====================================
4	 *
5	 * Wraps every recommendation engine's output. Given (engine, domain, context,
6	 * baseline), it resolves the best-matching active/canary adapter from the
7	 * registry, applies the residual per-field to the baseline, and emits a
8	 * provenance-tagged result. Provenance tells the operator (and downs
... [+5535 chars truncated]

### User | 2026-06-04T17:56:37.976Z

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

### User | 2026-06-04T17:56:38.059Z

[tool_result] 1	/**
2	 * DetachedLoRARunnerEngine (U-LPR-GPU-ASYNC)
3	 *
4	 * State machine + bounded queue for long-running detached LoRA training
5	 * jobs. The actual process-spawning is caller-injected (via
6	 * `ProcessLauncher`) so this engine stays pure and testable — it owns
7	 * the lifecycle book-keeping, not the nohup invocation.
8	 *
9	 * Lifecycle: queued → running → (paused ↔ running)* → {complete
... [+16235 chars truncated]

### Assistant | 2026-06-04T17:56:50.845Z

I need to check the LoRA registry/adapter schema and find the actual training/dataset/eval-gate engines that own the lifecycle stages, plus the dispatcher action for handing a trainset to india. Let me look at the supporting pieces.

### Assistant | 2026-06-04T17:56:51.728Z

[tool_use: Read]

### Assistant | 2026-06-04T17:56:51.824Z

[tool_use: Glob]

### Assistant | 2026-06-04T17:56:52.176Z

[tool_use: Glob]

### User | 2026-06-04T17:57:14.311Z

[tool_result] 1	/**
2	 * LoRA Adapter & Inference-Gate Schema — U-LEARN-07
3	 * ==================================================
4	 *
5	 * The belt that connects trained LoRAs to live inference. Utilization
6	 * Architect scrutiny (0.18 — the lowest score in any pass) said PRISM
7	 * trains LoRAs that never reach inference. This schema + the
8	 * LoRAAdapterRegistryEngine + InferenceLoRAGateEngine close that 
... [+6054 chars truncated]

### User | 2026-06-04T17:57:20.912Z

[tool_result] mcp-server\src\engines\LatheLoRACadenceEngine.ts
mcp-server\src\engines\LatheLoRAPipelineEngine.ts
mcp-server\src\engines\LatheLoRATrainingScriptEngine.ts
mcp-server\src\engines\LatheLoRAProgramParserEngine.ts
mcp-server\src\engines\LatheLoRAExampleGeneratorEngine.ts
mcp-server\src\engines\LatheLoRADatasetValidatorEngine.ts
mcp-server\src\engines\LatheLoRAHyperparameterOptimizerEngine.ts
mcp-serve
... [+4782 chars truncated]

### User | 2026-06-04T17:57:20.927Z

[tool_result] mcp-server\src\engines\LoRADriftCoordinatorEngine.ts
mcp-server\src\engines\LoRAAdapterRegistryEngine.ts
mcp-server\src\engines\LoRAMoEGatingEngine.ts
mcp-server\src\engines\LoRACompositionEngine.ts

### Assistant | 2026-06-04T17:57:34.601Z

There's a `BlueprintLoRABridgeEngine.ts` — directly relevant to xray (blueprint domain). And there's a full mill/cam/lathe LoRA stack with dataset-builder + cadence + verification + deployment. Let me read the BlueprintLoRABridge, the AdapterRegistry (gating/promotion logic), and find the dispatcher wiring. I'll also check the eval/verification engine that owns the gate thresholds.

### Assistant | 2026-06-04T17:57:35.211Z

[tool_use: Read]

### Assistant | 2026-06-04T17:57:35.327Z

[tool_use: Read]

### User | 2026-06-04T17:57:37.089Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\BlueprintLoRABridgeEngine.ts' was already read 2m ago in this session and is unchanged (mtime 1778900033436). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-04T17:57:41.275Z

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

### Assistant | 2026-06-04T17:57:48.153Z

The read-once guard says BlueprintLoRABridgeEngine was already read this session — but it wasn't read by me. Let me check it via Grep for its key exports, and find the cadence/dataset-builder pattern + the dispatcher wiring for handing a trainset to india. The mill stack mirrors what xray needs (a non-machining domain LoRA via the generic ContinualLoRA + registry path).

### Assistant | 2026-06-04T17:57:49.033Z

[tool_use: Read]

### Assistant | 2026-06-04T17:57:49.429Z

[tool_use: Read]

### User | 2026-06-04T17:57:51.172Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\BlueprintLoRABridgeEngine.ts' was already read 2m ago in this session and is unchanged (mtime 1778900033436). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-04T17:57:52.472Z

[tool_result] 1	/**
2	 * MillingLoRADatasetBuilderEngine — CAM-ML-CLOSEDLOOP-MS0 U-CMCCL01
3	 * =================================================================
4	 *
5	 * Builds LoRA fine-tuning datasets for milling operations by wrapping
6	 * {@link BaseLoRADatasetBuilder} with a milling-specific render function
7	 * and validation policy.
8	 *
9	 * INPUT: RawJob records sourced from PrintToProgramPipeline ou
... [+2090 chars truncated]

### Assistant | 2026-06-04T17:57:57.618Z

The read-once guard keeps blocking BlueprintLoRABridgeEngine. Let me grep its exports and read the MachineLoRABase (the shared dataset-builder base that defines the canonical schema contract), plus find the dispatcher action that wires training/dataset-build/adapter-register so I can name the exact handoff path.

### Assistant | 2026-06-04T17:57:59.871Z

[tool_use: Grep]

### Assistant | 2026-06-04T17:58:00.175Z

[tool_use: Read]

### User | 2026-06-04T17:58:09.306Z

[tool_result] 1	/**
2	 * MachineLoRABaseEngine — shared foundation for per-machine LoRA pipelines
3	 * ========================================================================
4	 *
5	 * CAM-ML-CLOSEDLOOP-MS0 foundation. Extracted from the production Lathe
6	 * LoRA pattern (49 engines) so that the 8 machine-type pipelines
7	 * (milling, 5-axis, mill-turn, WEDM, sinker EDM, laser, waterjet,
8	 * grinding) can sh
... [+3990 chars truncated]

### User | 2026-06-04T17:58:09.938Z

[tool_result] 4: * LoRA export bundle producer. Selects ground-truth training pairs from the
13: * HARD RULE (spec): exports stay in `mcp-server/data/training/lora/staging/`
18: * @milestone BLUEPRINT-OCR-TRAINING-MS1 / U-MS1-U8
28:export const LORA_PROVIDERS = ["gemini-finetune", "openai-finetune", "modal", "local-lora"] as const;
29:export type LoRAProvider = (typeof LORA_PROVIDERS)[number];
31:export const L
... [+1577 chars truncated]

### Assistant | 2026-06-04T17:58:16.247Z

I now have the full picture of the BlueprintLoRABridge (from the grep). Let me confirm the dispatcher wiring — which dispatcher/action exposes the blueprint LoRA bridge select/export, and whether there's an `ai_train` / `lora_train` action india owns. Let me also check the BlueprintLoRABridge's confidence-tier selection logic since xray's trainset is ensemble-distilled pseudo-labels (that maps exactly to the `ensemble_consensus` tier).

### Assistant | 2026-06-04T17:58:16.894Z

[tool_use: Read]

### Assistant | 2026-06-04T17:58:18.418Z

[tool_use: Grep]

### User | 2026-06-04T17:58:32.625Z

[tool_result] 112	export class BlueprintLoRABridgeEngine {
113	  public readonly schemaVersion = "1.0.0" as const;
114	
115	  private trainingSets = new Map<string, TrainingSetSelection>();
116	  private exportHistory: LoRABundleManifest[] = [];
117	  private activeEndpoints = new Map<string, ExternalEndpoint>();
118	
119	  /**
120	   * Select training pairs from the registry at the given confidence tier and
12
... [+7127 chars truncated]

### User | 2026-06-04T17:58:32.684Z

[tool_result] Found 5 files
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\tools\dispatchers\safetyDispatcher.ts
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\tools\dispatchers\millDispatcher.ts
mcp-server\src\tools\dispatchers\mlDispatcher.ts

### Assistant | 2026-06-04T17:58:38.200Z

The dispatcher wiring is across `mlDispatcher`, `cadDispatcher`, `aiReasoningDispatcher`. Let me grep those to find the exact action names that own LoRA train / dataset-build / adapter-register / gate, so I can name xray's exact handoff path.

### Assistant | 2026-06-04T17:58:41.069Z

[tool_use: Grep]

### Assistant | 2026-06-04T17:58:42.907Z

[tool_use: Grep]

### User | 2026-06-04T17:58:58.524Z

[tool_result] 64-let _crossTransfer: typeof import("../../engines/CrossCustomerPolicyTransferEngine.js").crossCustomerPolicyTransferEngine | null = null;
65:let _continualLoRA: typeof import("../../engines/ContinualLoRAEngine.js").continualLoRAEngine | null = null;
66-// U-LEARN-11 ProtoMAML Few-Shot engines
--
105-      return _provenance ??= (await import("../../engines/ProvenanceEngine.js")).provenanceEngine
... [+2432 chars truncated]

### User | 2026-06-04T17:59:00.312Z

[tool_result] 1864:          case "cad_training_start": {
1870:          case "cad_training_status": {
1876:          case "cad_training_corpus_stats": {
2987:          case "gt_training_pairs_by_customer": {
3251:          case "blueprint_lora_prepare_set": {
3258:            const { blueprintLoRABridgeEngine } = await import("../../engines/BlueprintLoRABridgeEngine.js");
3259:            const data = await bl
... [+1682 chars truncated]

### Assistant | 2026-06-04T17:59:04.712Z

I have everything needed. Let me identify which dispatcher exposes the `blueprint_lora_*` and `continual_lora_*` actions (the dispatcher name matters for the handoff), then I can report.

### Assistant | 2026-06-04T17:59:10.683Z

[tool_use: Grep]

### User | 2026-06-04T17:59:16.789Z

[tool_result] 553:export function registerCadDispatcher(server: any): void {

### Assistant | 2026-06-04T17:59:19.348Z

[tool_use: Grep]

### User | 2026-06-04T17:59:34.079Z

[tool_result] 2: * prism_ml — ML Pipeline Dispatcher — U-LEARN-03 + U-LEARN-11
175:    "prism_ml",
182:      log.info(`[prism_ml] Action: ${action}`);
1400:            return { content: [{ type: "text" as const, text: JSON.stringify(dispatcherError(`Unknown action: ${action}`, action, "prism_ml")) }] };
1404:        log.error(`[prism_ml] ${action} failed: ${msg}`);
1405:        return { content: [{ type: "text"
... [+102 chars truncated]

### Assistant | 2026-06-04T18:00:56.890Z

I have everything I need. The `blueprint_lora_*` actions live on `prism_cad` (cadDispatcher), and `continual_lora_*` / `lora_*` live on `prism_ml` (mlDispatcher). Here is the report.

---

# India's domain-LoRA doctrine + inference/cadence pattern

## 1. Canonical LoRA lifecycle (dataset → train → eval-gate → deploy → monitor → cadence)

India's stack is **layered, not monolithic** — there are two parallel families and a shared registry/gate spine. The canonical full-lifecycle pattern is the per-machine LoRA family; the cross-domain neural-weight piece is `ContinualLoRAEngine`.

**Stage-by-stage, with the engine that owns each:**

| Stage | Owning engine | Notes |
|---|---|---|
| Dataset assembly | `BaseLoRADatasetBuilder` in `MachineLoRABaseEngine.ts` (`mcp-server/src/engines/`) — the shared foundation extracted from the 49-engine Lathe pattern. Per-domain thin wrappers: `MillingLoRADatasetBuilderEngine`, `WEDMLoRADatasetBuilderEngine`, `FiveAxisLoRADatasetBuilderEngine`, `LatheLoRADatasetBuilderEngine`, etc. | Ingests `RawJob[]` → emits Alpaca-format `LoRAExample[]` with deterministic **geometry-hashed stratified** train/val/test split (`mulberry32` seed, default 0.8/0.1/0.1), `datasetFingerprint`. Each builder declares `requiredSchema()` (e.g. milling needs `material, tool_class, op_type, machine_class` features + `rpm, feed_mm_min` actuals). Stratification axes preserve rare combos. |
| Training (cross-domain, anti-forgetting) | `ContinualLoRAEngine` (`continualLoRAEngine` singleton) | EWC++ (Schwarz 2018) + SI (Zenke 2017) + DER++ (Buzzega 2020). `createAdapter()` → `train()` → `getState()`. **FLAG: the numeric core is a STUB** — `computeTaskLoss` uses `input[i % len]` as a fake prediction, `computeGradients`/`updateParams`/`updateEWC`/`measureForgetting` all return `Math.random()`. It tracks the continual-learning *bookkeeping* (Fisher accumulation shape, task list, forgetting history) correctly but does **not** do real gradient descent. WIRE-EXEMPT (49 tests 
... [+12448 chars truncated]
