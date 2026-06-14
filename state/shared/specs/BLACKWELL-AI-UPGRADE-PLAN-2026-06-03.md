# BLACKWELL AI-UPGRADE PLAN — FINAL (corrected post-adversarial-review)

> **slot:india** · 2026-06-03 · session `ee8cef5a` · `[BLACKWELL-AI-MS0..MS6]`
> Produced by an 8-assessor parallel-agent Workflow (`w2a5ymndu`, 11 agents / 1.35M subagent tokens) → synthesis → 2 adversarial verifiers (both **REVISE**) → india self-verification of every load-bearing P0 against live code.
> **This front-matter is authoritative.** It folds in every verified P0/P1 correction and OVERRIDES Appendix A (the raw synthesized plan) wherever they conflict. Appendices B/C are the full verdicts.
> Division of labor (operator-set): **golf owns infra** (Ollama/NIM/model pulls/CUDA/PyTorch); **india owns the AI systems that consume it**.
>
> **★ AS-BUILT RECONCILIATION (2026-06-08, slot:alpha):** The training stack actually landed on **`torch 2.11.0+cu128` (sm_120)** — NOT the `cu129` this plan recommends below. The cu129 guidance reflects June-2026 research into sm_120 cuBLAS gaps; in practice the cu128 wheel installed clean into `H:/Tools/python-gpu` and reproduces GREEN/qlora-ready (`cuda.is_available()=True`, NF4 op OK — verified live this session; see [[reference_blackwell_gpu_training_ready_2026_06_06]]). **Treat every `cu129` mention below as historical research, not an install instruction — the working wheel is cu128.** The operator-facing gates (`gpu_health.py`, `GpuStackHealthEngine.ts`) were corrected to cu128 this session.

---

## TL;DR for the operator — 3 facts that reshape the stated goal

1. **The 96GB GPU is fully available right now.** `nvidia-smi` shows the RTX PRO 6000 Blackwell at **P8 / 2% util / 32W of 600W**; the alarming "96GB used" is a Windows **WDDM committed-pool reporting artifact** (real usage ≈ 9GB: Ollama's nomic-embed + qwen-7b). Driver ships **CUDA 13.2**, which supports Blackwell `sm_120`. The hardware side is ready.

2. **kimi2.6 CANNOT run locally on this GPU — the "wire in kimi2.6" goal must change shape.** Kimi K2.6 (Moonshot) is a **1-trillion-parameter MoE: ~350GB (2-bit) to ~610GB (full)**, and Ollama publishes it **cloud-only** (`kimi-k2.6:cloud`). There is no local GGUF that fits 96GB, let alone the ~30GB the draft plan assumed (a ~10× error). **Viable path:** treat Kimi as a **cloud API voice** in the octopus/reasoning panel (behind the PII-redaction gate), NOT a local resident and NOT a fine-tune base. The real local heavy model is **`qwen2.5-coder:32b`** (~22GB VRAM, fits comfortably). "Higher Qwen" *is* locally viable (Qwen 32B-class) and is the right local upgrade target. → golf: confirm the exact Kimi tag + whether any sub-96GB local quant exists before india names it anywhere.

3. **The Blackwell-aware model router ALREADY EXISTS — do not rebuild it.** `mcp-server/src/engines/ModelRoutingEngine.ts` already has `HardwareProfile="home_blackwell"` (96GB, 32B tier), a `DEFAULT_MODEL_CATALOG` with `qwen2.5-coder:32b` + `cloud_only` entries, and capability-aware scoring. The keystone is therefore **NOT "build a routing ladder"** — it's **"build the capability probe + wire the EXISTING `ModelRoutingEngine` to it + purge the ~10 `deepseek-r1:14b` hardcodes that bypass it."** (R8 read-before-write just prevented a duplicate router.)

---

## Verified hardware / stack facts (india self-checked this session — authoritative)

| Fact | Status |
|------|--------|
| GPU RTX PRO 6000 Blackwell, 96GB, sm_120 | ✅ present, **idle/available** (P8/2%); 96GB-used = WDDM artifact |
| Driver CUDA 13.2 | ✅ supports sm_120 |
| Ollama v0.30.3 GPU-backed | ✅ models present: qwen3-vl:8b, qwen2.5-coder:3b/7b, qwen2.5vl:7b, nomic-embed-text |
| qwen2.5-coder:32b | ⏳ NOT pulled yet (golf blackwell preset prewarms it) — the load-bearing local heavy model |
| kimi2.6 | ❌ cloud-only, 1T params / 350–610GB — NOT local-runnable on 96GB |
| Python GPU training stack (torch/peft/bitsandbytes/PyG/DGL) | ❌ **absent** — biggest golf dependency |
| Portable Python is 3.14.5 | ⚠️ **wrong interpreter for GPU wheels** — cp314 cu128 wheels are CPU-only/missing; training needs a dedicated **3.13** venv |
| `ModelRoutingEngine.ts` (home_blackwell profile + catalog) | ✅ exists — extend, don't duplicate |
| `deepseek-r1:14b` hardcoded | ⚠️ ~10 non-test engine files (ModelRoutingEngine, MultiModelConsensusEngine, ConsensusAIBridgeEngine, OllamaContextFloorEngine, OllamaHookBridgeEngine, OllamaTaskOffloaderEngine, ConsensusAuditLogEngine, LedgerStoreEngine, WikiIngestRouterEngine, aiReasoningDispatcher) — **deepseek-r1:14b is not even installed** |
| `OutcomeRLBridgeEngine.ts` | ⚠️ exists on disk; wiring/wiki-bucket = orphan → verify live consumer before treating as reward substrate |

---

## P0/P1 CORRECTIONS APPLIED (override Appendix A)

**P0-1 — Strike kimi2.6 from every local/resident/training role.** Re-cast as an optional cloud API voice only. Promote `qwen2.5-coder:32b` to the DEFAULT heavy-model role everywhere the draft said kimi (octopus-secondary, CAG-master, HyDE, RAG-rerank). Regenerate the VRAM tables (headroom *improves* to ~50GB).

**P0-2 — GPU training runs on a dedicated Python 3.13 venv, NOT portable 3.14.5.** Add `H:/Tools/python-gpu` (3.13) + `PRISM_PYTHON_GPU_PATH`. cp314 CUDA wheels are CPU-only today; `U-PYGPU-HEALTH` must assert a real bnb 4-bit dequant op runs *on GPU* (not just `torch.cuda.is_available()`), or it becomes a permanent red gate.

**P0-3 — Training-lib install is non-trivial on sm_120.** golf path = Unsloth Blackwell Docker image OR Studio venv (3.13), pin `torch 2.11+cu129`, bitsandbytes from the matching CUDA build, default env `TORCHDYNAMO_DISABLE=1` + `UNSLOTH_COMPILE_DISABLE=1`. Not a clean `pip install torch --index-url .../cu128`.

**P0-4 — Build on `ModelRoutingEngine`, don't duplicate it (R7).** `U-ROUTE-LADDER` scope = extend the existing engine + wire it to `U-CAP-PROBE`'s runtime probe; do NOT introduce a parallel ladder on `aiSystemRouterEngine`. Enumerate ALL ~10 hardcode sites; acceptance = "every enumerated site routes through the probe/ModelRoutingEngine," and the grep gate is **scoped to `src/engines/**` non-test** (test fixtures legitimately carry historical model names).

**P0-5 — Generative LoRA gate ≠ classification metrics.** `U-LORA-PROMOTE-GATE` must use exact-match / BLEU / pass@k on a held-out G-code set + S(x)≥0.95 safety floor + regression-vs-base delta. AUROC/macroF1/Brier apply ONLY to the GNN classifier and the reward model's preference accuracy.

**P0-6 — LoRA / CAG / reward generalization is ASPIRATIONAL, not build-once-fleet-wide today.** `GalaxyAdapterFactoryEngine` is unbuilt; the 67 forked LoRA engines need a real migration; `OutcomeRLBridgeEngine` wiring is orphaned. Mark these matrix rows "inherit **after a per-galaxy verify step**," not "inherit by data tag."

**P1 — MS3 promotes nothing today (honest framing).** Split: `U-GNN-EDGE-PREDICT` (link-prediction for dead-edge surfacing — deployable, NO reference-pool dependency → **reorder ahead** as the real MS3 win) vs `U-GNN-GPU-TRAIN` (multi-class candidate — fixes constant-vote collapse but **blocked from promotion** on reference-pool growth: 62 holdout, several classes at zero). Do not let "constant-vote fixed in a candidate" read as a fleet win until `promoteDecision()` clears it.

**P1 — Don't couple india's green gate to golf's lane.** `U-LOCAL-CAG` must degrade-and-pass (probe `OLLAMA_MAX_LOADED_MODELS`/`FLASH_ATTENTION`/keep_alive, skip-with-warning if unset) rather than hard-depend. `U-PYGPU-HEALTH` must not hardcode a torch version string that drifts from golf's install.

**P1 — "regen-viz is broken" is UNVERIFIED by india** (the graph is a fresh 676MB dated today). Before MS3: confirm regen state with **sierra** via chat bus; snapshot the graph with mtime+hash lock in checkpoint metadata; do NOT trigger regen-viz (sierra's lane); do not assert "broken" as fact.

**P1 — Decompose the over-scoped milestones.** `U-FULL-CORPUS-EMBED` (38,710 files + 302K nodes + resumable checkpointing) and `U-LORA-TRAINER-CORE` (Unsloth integration + innerTrain + lock wiring + 67-engine audit) are each multi-unit; split so every unit reaches a clean 3-of-3 Stop in one session.

**P2 — Embedding-space parity:** the GPU batch embedder (HF `nomic-embed-text-v1`) and Ollama's `nomic-embed-text` can silently diverge (pooling/normalization/`search_document:` prefix). Add a direct parity assert: same 50 strings through both → pairwise cosine > 0.99, else standardize on ONE path.

**P2 — Octopus is single-model self-consistency** until a *second* genuine local large model exists (qwen-32b is the only validated local heavy today). Name a real second local voice (a Qwen3/GLM-32B golf can pull) or label the tier honestly as "self-consistency + cloud-Kimi-when-available."

---

## Corrected keystone + immediate build order

**MS-(−1) — broadcast + claim (pre-step, before any file):** post to `AGENT_CHAT.jsonl` claiming action names (`prism_ai:capability_probe`, `prism_dev:gpu_stack_health`); notify **sierra** india will READ-not-write `system-graph.json` and needs a stable snapshot; notify **golf** the infra-dependency checklist (below) is posted; file-claim `ModelRoutingEngine.ts`, `MultiModelConsensusEngine.ts`, `nn-graph-retrain-lifecycle.mjs`.

**KEYSTONE — `U-CAP-PROBE` / `OllamaCapabilityProbeEngine`** (MS0): zero infra dependency, hermetic, every consumer gates on it, auto-lights-up the bigger models the moment golf pulls them. Runtime `nvidia-smi memory.free` + Ollama `/api/tags` present-model probe is the **sole authority** (static VRAM table is advisory). Pairs with `U-PYGPU-HEALTH` (real GPU-op assertion) as MS0 sibling. First discovery step: `Grep "deepseek-r1|:14b" src/engines/**` to enumerate the real purge set.

**Then:** MS1 `U-ROUTE-LADDER` (extend ModelRoutingEngine + purge hardcodes) → MS2 RAG re-embed (inference-only, can proceed before golf's training stack) + MS5 octopus local-voice + MS6 CAG (all inference-only, parallelizable) → MS3/MS4 (GNN retrain, LoRA trainer — **gated on golf's Python-GPU stack**).

---

## Corrected generalization scorecard (the core "apply to all 34 galaxies" question)

| Subsystem | Fleet-wide? | Mechanism |
|-----------|-------------|-----------|
| GNN tier-5 | ✅ genuine | one graph, one retrain |
| RAG / embeddings | ✅ genuine | one index, `domain` filter |
| Octopus / self-consistency | ✅ genuine | flag + route-policy keyword |
| Model routing ladder | ⚠️ true but understated | extend ModelRoutingEngine; ~10 hardcode sites |
| CAG resident | ⚠️ aspirational | bundle-fits-128K fails for large galaxies (mill ~222, lathe ~238 engines) |
| LoRA adapters | ❌ not today | needs unbuilt GalaxyAdapterFactory + 67-engine collapse |
| Closed-loop reward | ❌ not live | OutcomeRLBridgeEngine wiring orphaned |

**Honest unifying claim:** "shared flat substrate, per-galaxy input is just a data tag" holds cleanly for **3 of 7**, with caveats for 2, and is **false for 2** (LoRA, reward) until their propagation engines are built/wired.

---

## golf infra-dependency handoff (corrected — the message to golf)

1. **Pull local models:** `qwen2.5-coder:32b` (the heavy local workhorse); a second genuine local large model for true octopus consensus (Qwen3/GLM-32B class). Kimi K2.6 is **cloud-only** — wire as `kimi-k2.6:cloud` API or skip; do NOT attempt a local pull (350–610GB).
2. **Provision a dedicated Python 3.13 GPU venv** at `H:/Tools/python-gpu` (NOT the portable 3.14.5): `torch 2.11+cu129`, `bitsandbytes` from the matching CUDA build, `peft`, `accelerate`, `transformers`, `sentence-transformers`; PyG **or** DGL built for cu129/sm_120. Prefer the **Unsloth Blackwell Docker image / Studio venv**. Set default training env `TORCHDYNAMO_DISABLE=1` + `UNSLOTH_COMPILE_DISABLE=1`. Expose via `PRISM_PYTHON_GPU_PATH`.
3. **Ollama service config** for CAG/parallel: `OLLAMA_MAX_LOADED_MODELS`, `OLLAMA_FLASH_ATTENTION=1`, keep_alive tuning (india's units degrade-and-pass if unset, but set them for the resident-CAG win).
4. **(optional) NVIDIA NIM** endpoints if used — india routes to them via the capability probe's present-backend detection.

india proceeds NOW on inference-only units (MS0 probe, MS1 routing, MS2 RAG re-embed via Ollama embeddings, MS5 octopus, MS6 CAG); MS3/MS4 (GNN+LoRA GPU training) unblock when items 1–2 land.

---

## Risks & honest caveats (top)

- **The GPU fixes the COMPUTE wall, not the DATA wall.** The GNN's constant-vote collapse (AUROC 0.5, all→`prism_turning`) is genuinely fixable with GATv2/features/focal-loss on GPU — but the deploy gate (macroF1≥0.55) is arithmetically unreachable until the labeled reference pool grows (62 holdout, several classes at zero). Report candidates with honest metrics; reference-pool growth is a per-galaxy operator dependency. The deployable GNN win this cycle is **edge prediction** (dead-wiring surfacing), which needs no reference pool.
- **Don't report a milestone as a fleet win when it ships a never-promoted candidate.** MS3 architecture-fix ≠ MS3 deploy.
- **Scope realism:** several draft "units" are multi-week bakes — decomposed above.

---
---

# APPENDIX A — Raw synthesized master plan (8-assessor workflow, pre-correction)

> Preserved verbatim for traceability. Where this conflicts with the front-matter above, **the front-matter wins** (esp. kimi2.6, the Python 3.13 venv, and building on ModelRoutingEngine).

I have all 8 subsystem assessments. Let me synthesize them into one dependency-ordered master plan. This is a planning deliverable — return only markdown.

# PRISM Internal-AI Blackwell Master Plan (slot:india)
## 96GB RTX PRO 6000 Blackwell — Build-Once-in-India → All-34-Galaxies

> Scope: india owns the AI-system upgrades that *consume* GPU infra; golf owns the infra. This plan synthesizes 8 subsystem assessments (NN/GNN, LoRA, RAG, CAG, master-graph, model-routing, octopus, closed-loop) into one dependency-ordered build. Doctrine-bound: no stubs, no inlined physics constants, candidate→live only on deploy-gate pass (AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15), per-file 2-arm scrutiny + 3-of-3 Stop gate when india later BUILDS each unit. **This session = plan only.**

---

## Executive summary — the 96GB unlock in 5 bullets

- **One GPU collapses three independent walls at once.** Every subsystem is blocked by the *same* CPU/JS ceiling: the GNN trains in single-threaded float64 JS capped at 6,000 of 302,447 nodes; RAG embedding is a serial 200ms/doc Ollama loop that has never finished a 38,710-file pass; all ~95 LoRA engines are orchestration shells whose `innerTrain` slot was never filled. 96GB Blackwell with a real PyTorch cu128/sm_120 stack removes the node cap, the serial-embed wall, and the no-trainer gap simultaneously — these are not three projects, they are one infra unlock with three payoffs.
- **The training/inference split is absolute and load-bearing.** Ollama is an inference server: it serves GGUF + embeddings + KV-cached CAG contexts, and it CANNOT train a GNN, fine-tune a LoRA, or run a backward pass. Every "training" claim that routes through Ollama is silently a no-op. All real learning (GNN retrain, QLoRA, reward modeling, EWC Fisher) goes through Python+CUDA; Ollama only *serves the result*. This boundary is the single most dangerous thing to get wrong and is enforced structurally in every unit below.
- **The keystone is not a model — it's the capability probe + Python-GPU readiness gate.** Five subsystems independently hardcode `deepseek-r1:14b` (which isn't even installed) or assume a 24GB host. A single `OllamaCapabilityProbeEngine` (VRAM + present-models + sm_120 verification, 5-min cached) is the foundation every consumer gates on. Build it first; it makes every other unit *work-today-and-auto-light-up* when golf finishes the big pulls.
- **Build-once propagation is already architecturally complete — india just fills the trainers.** The 34-galaxy fan-out mechanisms exist: one fleet-wide system-graph (GNN improves all galaxies in one retrain), one shared tribal-embed-index keyed by doc-ID + domain (one re-embed closes the 98% wiki gap for every domain), `LoRAAdapterRegistryEngine` + per-galaxy inference gateways (train once → registry → all domains pick up), and the `prism_ai` singleton dispatcher surface. No per-galaxy code is written — galaxies inherit via registry/dispatcher, parameterized only by a `domain` dataset filter.
- **The honest ceiling: GPU fixes the compute wall, not the data wall.** The GNN's AUROC-0.5 constant-vote collapse is fixed by GATv2/H2GCN attention + 768-d LLM features + focal loss on GPU — but the deploy gate cannot pass without a larger labeled reference pool (62 holdout ghosts today, ~3-4/class, several classes at zero). india must report GPU-trained candidates with *honest* metrics and document reference-pool growth as a per-galaxy operator dependency. Do not declare "GNN complete" on a loss curve; declare it on a holdout that passed the three gates.

---

## VRAM budget (96GB) — fits with headroom

VRAM figures are Q4-class estimates; kimi2.6 is a soft estimate until golf confirms the installed GGUF size. India's runtime probes `nvidia-smi --query-gpu=memory.free` before any resident load or training spawn and evicts/defers rather than trusting the static table (fail-loud, R12).

### Steady-state config (inference-heavy session, no training running)

| Component | Role | VRAM | Residency |
|---|---|---|---|
| `qwen2.5-coder:32b` Q4_K_M | routing-ladder reasoning + RAG rerank + octopus primary voice + CAG large-galaxy | ~22 GB | resident (golf blackwell preset, keep_alive 60m) |
| `kimi2.6` Q4 (soft est.) | octopus secondary voice + CAG master-orchestrator + HyDE | ~28–36 GB | resident OR time-shared (see contention rule) |
| `nomic-embed-text` 768-d | RAG/graph query embedder + GNN feature source | ~0.6 GB | resident |
| `qwen2.5-coder:7b` | fast-tier offload workhorse + small-galaxy CAG | ~5 GB | resident (degrades to this when 32b busy) |
| RaBitQ HNSW index (302K×768 1-bit) | resident semantic search substrate | ~0.04 GB | resident (RAM, not VRAM) |
| Ollama KV cache (CAG resident galaxy context, 128K) | per-active-galaxy attention states | ~8–12 GB | LRU, 2–3 galaxies max |
| Driver + CUDA runtime overhead | — | ~2–4 GB | resident |
| **Steady-state total** | | **~68–82 GB** | **~14–28 GB headroom** |

Contention rule: kimi2.6 resident + a second resident 32B galaxy + CAG KV would exceed 96GB. The `LocalCAGEngine` LRU + `OllamaCapabilityProbeEngine.canParallelDual()` is the safety valve — refuse the third large resident, degrade to serialized dispatch or 7b fallback.

### Training-burst config (a GPU training job is running)

| Component | Role | VRAM | Mode |
|---|---|---|---|
| `qwen2.5-coder:7b` | minimal inference floor during training | ~5 GB | resident |
| `nomic-embed-text` | embedder stays warm | ~0.6 GB | resident |
| Driver/CUDA overhead | — | ~3 GB | resident |
| **One** of the following training jobs at a time: | | | |
| → GNN GATv2/H2GCN retrain (302K nodes, NeighborLoader [25,10]) | tier-5 classifier | ~6–12 GB peak | time-shared, 30–60 min |
| → QLoRA fine-tune 7B (NF4 + r=32 + optimizer + activations) | per-galaxy 7B adapter | ~6–8 GB peak | time-shared, ~10 min |
| → QLoRA fine-tune 32B (NF4) | large-galaxy adapter | ~24–35 GB peak | time-shared, 30–45 min |
| → GPU batch embed 302K nodes (sentence-transformers bs=512) | full-corpus re-embed | ~4–5 GB peak | one-shot, ~2–10 min |
| → Bradley-Terry reward model | learned reward head | ~2–4 GB peak | time-shared, ~5 min |
| **Training-burst total (worst case: 32B QLoRA + 7b floor)** | | **~33–43 GB** | **~53–63 GB headroom** |

Proof it fits: the heaviest single training job (32B QLoRA, ~35GB) + inference floor (~8.6GB) + overhead (~3GB) = **~47GB**, leaving ~49GB. Even kimi2.6 resident (~36GB) *plus* a 7B QLoRA job (~8GB) + floor (~9GB) = ~53GB fits. The **forbidden combination** is 32B-inference-resident + 32B-training simultaneously (22+35+floor ≈ 66GB — fits numerically but leaves no NeighborLoader spike margin); time-share these, never co-resident. GNN retrain (~12GB) is small enough to run concurrently with most inference.

Scheduling policy: heavy training (GNN full retrain, 32B QLoRA) fires on the existing S4U cron at off-peak (02:00 local); the lifecycle checks `memory.free ≥ 8GB` and defers if not. `DistributedLockManager.withLock("gpu-train-<domain>", fn)` serializes all training so two jobs never race the GPU or an adapter path.

---

## Dependency-ordered roadmap

The FOUNDATION layer (MS0) gates everything. No consumer milestone starts until its foundation dependency is green. Flavor: `[BLACKWELL-AI-MS#]/U-ID`.

### `[BLACKWELL-AI-MS0]` — Foundation: capability probe + Python-GPU readiness (NO consumer code yet)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-CAP-PROBE** | `OllamaCapabilityProbeEngine.ts` — `/api/tags` model enum + `nvidia-smi` VRAM read + sm_120 check; returns `{availableVRAM_MiB, models[], bestReasoningModel, canParallelDual}`; 5-min cache; wired `prism_ai:capability_probe`. Singleton. | golf: `nvidia-smi` on PATH (verify only) | Hermetic test (mock HTTP+subprocess) returns `qwen2.5-coder:7b` today, auto-upgrades to `:32b` when present; `canParallelDual()` false on 24GB mock, true on 96GB mock. |
| **U-PYGPU-HEALTH** | `scripts/py/gpu_health.py` + `GpuStackHealthEngine.ts` shim — asserts `torch.cuda.is_available()`, `get_device_capability()==(12,0)`, `"sm_120" in get_arch_list()`; fail-loud JSON. Wired `prism_dev:gpu_stack_health`. | golf: PyTorch cu128 installed at `H:/Tools/python` | `gpu_health.py` exits 0 with `{capability:[12,0], sm_120:true}`; on a non-cu128 wheel it exits 1 with structured error (never silent CPU fallback). |
| **U-PY-BRIDGE-LIB** | `scripts/lib/py-subprocess-bridge.mjs` — canonical Node→Python stdio-JSON spawn (used by GNN, LoRA, embed, reward jobs); reads `PRISM_PYTHON_GPU_PATH`; streams progress JSON; fail-loud on non-zero exit. | U-PYGPU-HEALTH | One reusable bridge; unit test round-trips a mock python echo script; asserts it surfaces the exit code, never swallows it. |

### `[BLACKWELL-AI-MS1]` — Model routing ladder (the consumer-facing foundation)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-ROUTE-LADDER** | Capability-aware model resolver wired into `aiSystemRouterEngine.route()` + a `prism_ai:model_ladder_pick` action: judgment→32b/kimi, mechanical→7b, embed→nomic; replaces every hardcoded `deepseek-r1:14b`/`32b-OOM` assumption fleet-wide. | U-CAP-PROBE | Round-trip test: a "summarize" task routes to 7b; a "physics tradeoff" task routes to 32b when present, 7b when not; zero hardcoded model strings remain (grep gate). |

### `[BLACKWELL-AI-MS2]` — RAG re-embed + resident index (closes the 98% wiki gap; unblocks semantic search + GNN features)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-GPU-EMBED-WORKER** | `scripts/py/gpu_embed_worker.py` (sentence-transformers `device=cuda`, bs=512, JSONL stdio) + `scripts/lib/gpu-batch-embedder.mjs` (Ollama-parity fallback). Must use the SAME model space Ollama serves at query time. | U-PY-BRIDGE-LIB; golf: `sentence-transformers` + nomic HF checkpoint | Pilot: embed 1,000 ghost nodes, assert same-dispatcher cosine > cross-dispatcher cosine before committing to full run. |
| **U-FULL-CORPUS-EMBED** | `scripts/gpu-embed-full-corpus.mjs` — resumable 38,710-file + 302K-node sweep; resets stale `embed-all-wiki-progress.json` (`state:running, done:0, >5min`); atomic checkpoint /2000; VRAM headroom pre-check. | U-GPU-EMBED-WORKER | Full pass completes in <10 min; `node-embeddings-768d.jsonl` grows 3,790 → ~302K; index `dim` assertion holds (no mixed-space). |
| **U-RABITQ-HNSW** | `scripts/lib/rabitq-hnsw-builder.mjs` consuming the already-wired `embeddings_quantize` action → binary HNSW at `state/shared/rabitq-hnsw-index.bin` (~7–37MB); two-stage (Hamming probe → float32 rerank top-K). | U-FULL-CORPUS-EMBED | Calibrate probe-K against a held-out query set; recall loss <5% vs exact cosine before declaring production-ready. |
| **U-RAG-ORCHESTRATOR** | `RAGCorpusOrchestratorEngine.ts` — HyDE → GPU-embed query → RaBitQ probe → float32 rerank → LLM rerank (32b); wired `prism_knowledge:rag_query_full`; `domain` filter param. | U-RABITQ-HNSW; U-ROUTE-LADDER | Real-data assertions: "kc1.1 SS304" returns a Kienzle tribal tip; "G84 tapping" returns a feed-rate tip. Not `toBeDefined()` stubs. |

### `[BLACKWELL-AI-MS3]` — GNN GPU retrain (fixes the constant-vote collapse fleet-wide)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-GNN-EMBED-ALL** | `scripts/py/gnn_embed_all_nodes.py` — embeds all 302K nodes by class-name + docstring + action names (decoupled from the wiki-path bridge so all 636 ghosts get a vector). | U-FULL-CORPUS-EMBED (reuses worker) | All 636 ghost nodes have a 768-d vector; coverage report logged. |
| **U-GNN-GPU-TRAIN** | `scripts/py/gnn_train.py` — PyG GATv2 (heterophily) OR H2GCN ego/neighbor-separation; `768→256→128→~20-class softmax`; `NeighborLoader [25,10]`; `CrossEntropyLoss(weight=inv_freq)` / focal loss; writes `graphsage-checkpoint.candidate.json` in the schema `classifyGnn()` reads. | U-GNN-EMBED-ALL; U-PYGPU-HEALTH | Standalone: loss decreases AND `distinctPredictions>1` on holdout (the constant-vote signal must break). Schema-validator test in `src/__tests__/` before production use. |
| **U-GNN-LIFECYCLE-WIRE** | Modify `nn-graph-retrain-lifecycle.mjs`: add `--python-backend` / `PRISM_NNG_GPU_TRAINER=1` to spawn `gnn_train.py`; JS trainer stays as graceful fallback. **JS `promoteDecision()` remains the sole promotion arbiter** (auditability + Stop-hook chain). | U-GNN-GPU-TRAIN | Candidate written by Python; promotion decided by unchanged JS gate; `graphsage-predictor.mjs` consumer needs zero change. |
| **U-GNN-EDGE-PREDICT** | `GnnEdgePredictionEngine.ts` + `scripts/py/edge_predict.py` — link-prediction head → ranked `(engine,dispatcher)` dead-edge candidates → `dead-edge-candidates.jsonl`; wired `prism_dev:infer_missing_wiring`; feeds `stop_on_unwired_assets.mjs`. | U-GNN-GPU-TRAIN | Top candidate for a known-wired engine matches its real dispatcher (held-out check). |

> Honest gate caveat: a GPU-trained candidate may still DEFER if the reference pool stays too small for a meaningful macro-F1. india reports the real metrics; promotion only on a clean holdout pass. Reference-pool growth (5–10 labeled ghosts per galaxy) is documented as a per-galaxy operator dependency, not silently assumed.

### `[BLACKWELL-AI-MS4]` — LoRA real trainer (fills the `innerTrain` ghost contract)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-LORA-TRAINER-CORE** | `scripts/lib/lora-trainer-blackwell.py` (Unsloth/PEFT QLoRA, NF4, `unsloth/Qwen2.5-Coder-32B-bnb-4bit` or 7B base, rank from existing `hyperparameterGrid()`) + `LoRATrainerBridgeEngine.ts` filling the pipeline's `innerTrain` slot; respects `DistributedLockManager.withLock("lora-train-<domain>")`; `PRISM_LORA_TRAINING_EXCLUSIVE` evicts large Ollama models first. | U-PY-BRIDGE-LIB; golf: PEFT/Unsloth/bitsandbytes cu128 | Lathe domain, 50-example corpus, r=8, 1 epoch: loss decreases AND adapter saves. Audit the 67 forked LoRA engines accept the standardized `innerTrain` before fleet rollout (U-MMO-LORA-PIPELINE-COLLAPSE-MIGRATE is NOT done). |
| **U-ADAPTER-DEPLOY** | `AdapterDeployPipelineEngine.ts` — `merge_and_unload()` → llama.cpp GGUF convert (per-domain quant level: Q8_0/bf16 for safety-critical G-code, Q4_K_M otherwise) → hands to existing `LatheLoRAOllamaDeployerEngine`. | U-LORA-TRAINER-CORE; golf: llama.cpp cu128 | Trained adapter round-trips to an `ollama create`'d model that responds; quant level is config, never hardcoded global. |
| **U-LORA-PROMOTE-GATE** | Add GNN-style promotion gate to `lora-training-pipeline.mjs` deploy step: candidate adapter → live only on AUROC≥0.78/macroF1≥0.55/Brier≤0.15 on a domain holdout, *in addition* to existing S(x)≥0.95 safety floor. Candidate-path → atomic promote. | U-ADAPTER-DEPLOY | A below-gate candidate is refused; safety veto still blocks independently. |

### `[BLACKWELL-AI-MS5]` — Octopus + reasoning local-voice upgrade (pure inference; no Python stack)

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-OCTOPUS-PANEL** | `MultiModelConsensusEngine.ts`: replace hardcoded `deepseek-r1:14b` with `OllamaCapabilityProbeEngine.getBestReasoningModel()`; add kimi2.6 secondary; remove dual-Ollama serialization when `availableVRAM≥44GB`; add semantic-agreement arm (`nomic` cosine) alongside Jaccard. | U-CAP-PROBE only (NO PyTorch) | Mock 96GB → parallel dispatch + 32b panel; mock 24GB → serialized fallback. Closes the live `deepseek-r1:14b`-not-installed bug. |
| **U-SELF-CONSISTENCY** | `OllamaSelfConsistencyEngine.ts` — 3-sample temp-vote `[0.15,0.45,0.75]` on resident 32b; shared `consensusScoringLib.ts` (Jaccard extracted from MMCE); gated `PRISM_LOCAL_SELF_CONSISTENCY=1`. | U-OCTOPUS-PANEL | Majority-vote test; reasoning engines call it when 32b present. |
| **U-ROUTE-POLICY-LIFT** | `octopus-route-policy.mjs`: add `reasoning/crossroad/brainstorm/plan/physics/tradeoff` triggers; default `route:ollama-only` when ≥32b resident, escalate to full octopus if local confidence <0.60; brainstorm workflow gets 2 local-voice lenses. | U-SELF-CONSISTENCY | Fleet-wide UserPromptSubmit routing; cheaper local-first verified on cost ledger. |

### `[BLACKWELL-AI-MS6]` — CAG resident tier (pure inference) + closed-loop reward model

| Unit | india builds | depends on | acceptance gate |
|---|---|---|---|
| **U-LOCAL-CAG** | `LocalCAGEngine.ts` (per-galaxy resident-context manager, latency-based warmth probe — NOT assumed residency, LRU eviction, `nvidia-smi` VRAM probe before load) + `CAGOrchestrationEngine.ts` + `scripts/lib/cag-galaxy-bundle.mjs` + physics-constant verification gate (cross-check numeric outputs vs `constants.ts`). Wired `prism_ai:cag_query_resident` / `cag_load_galaxy`. | golf: `OLLAMA_MAX_LOADED_MODELS≥3`, `OLLAMA_FLASH_ATTENTION=1`, keep_alive confirmed | Resident routing fires on COLD queries; falls back to Anthropic on model-not-warm; bundle fail-loud if it exceeds the model context window. |
| **U-REWARD-MODEL** | `scripts/py/reward_model_trainer.py` (Bradley-Terry/DPO head on `dev-outcomes.jsonl` pairs) + `OutcomeRLBridgeEngine` reward-signal upgrade; replaces fixed reward coefficients with a learned signal. | U-PY-BRIDGE-LIB | Learned reward correlates with held-out human-preference pairs > the fixed scorer. |
| **U-CONTINUAL-EWC** | `ContinualLoRAGPUEngine.ts` — EWC Fisher matrix via GPU backward pass; applied only when replay buffer <200 samples (else replay alone). | U-LORA-TRAINER-CORE | Catastrophic-forgetting test: old-domain accuracy retained after new-domain finetune. |
| **U-OUTCOME-RETRAIN-TRIGGER** | Add outcome-bus accumulation trigger to retrain lifecycles: ≥500 new rows (GNN) / ≥1000 (LoRA) fires GPU retrain without waiting for the 6h interval. Retrain trigger lives in the lifecycle, NOT in the Wilson-ranker `MetaLearningOptimizerEngine` (category-error guard). | MS3 + MS4 | Synthetic outcome flood fires exactly one locked retrain. |

---

## The keystone first unit — `U-CAP-PROBE` (`OllamaCapabilityProbeEngine`)

**Build this single engine this session. Argue:**

It is the one node every other subsystem hangs off. Five of the eight assessments independently hardcode a model string that is *wrong on this host right now*: octopus defaults to `deepseek-r1:14b` (not installed — a live bug), the consensus engine's dual-Ollama is calibrated for a 24GB host (96GB now), RAG's reranker silently degrades to original order on the absent model, CAG gates on "is 32b pulled?", and the routing ladder needs "what's the best resident reasoner?". Each of those is the *same question*: what models are present, how much VRAM is free, and is the GPU actually sm_120-capable. Answer it once, in one cached singleton, and every consumer becomes both **correct today** (degrades cleanly to `qwen2.5-coder:7b`, the present workhorse) and **auto-lit when golf finishes the pulls** (no india code change — the probe sees the new model and the ladder upgrades itself).

It is foundational, not a consumer — it writes no checkpoint, touches no graph, needs no PyTorch (it shells `nvidia-smi` + hits `/api/tags`, both available today). So it has **zero blocking infra dependency** — india can build and ship it this session while golf is still pulling kimi2.6 and installing cu128. It is also the cheapest possible unit to get to a clean 3-of-3 Stop gate (hermetic, mocked HTTP + subprocess, no GPU needed in CI), which makes it the ideal first real build under the doctrine. Every downstream milestone's acceptance gate references `capability_probe` output — building it first means MS1–MS6 inherit a tested, trusted oracle instead of re-deriving capability inline and drifting.

Pair it with `U-PYGPU-HEALTH` as the immediate next unit so that the moment golf reports cu128 installed, india has a one-command fail-loud verifier (`gpu_health.py` asserting `(12,0)` + `sm_120` in arch list) that gates every training milestone — turning the single most dangerous silent-failure mode (older wheel → silent CPU fallback at 1/50th speed) into a loud, early refusal.

---

## Build-once → apply-to-all-galaxies

Each upgrade fans to all 34 galaxies through an existing registry/dispatcher surface — india writes the mechanism once; galaxies inherit by data, not by code.

| Subsystem | Single shared artifact | Propagation mechanism (zero per-galaxy code) | Per-galaxy customization |
|---|---|---|---|
| **GNN tier-5** | one fleet-wide `system-graph.json` + one `graphsage-checkpoint.json` | The graph already contains all 34 galaxies' nodes; ONE GPU retrain reclassifies every galaxy's ghosts. `graphsage-predictor.mjs` consumer unchanged. Dead-edge list feeds `stop_on_unwired_assets.mjs` fleet-wide. | Reference-pool seed: each galaxy adds 5–10 labeled ghosts (the only manual input). |
| **RAG / embeddings** | one `tribal-embed-index` + one `rabitq-hnsw-index.bin`, keyed by doc-ID + `domain` field | ONE `gpu-embed-full-corpus` run closes the 98% gap across all domains at once (worst-covered: dev-infra 1.1%, logistics 5.3%, post-proc 9.6% — all close automatically). `RAGCorpusOrchestratorEngine.query(text, domain)` already takes a domain filter. | Galaxy dispatcher adds a one-line `rag_query_<domain>` wrapper (existing `tribal_search_domain` pattern). |
| **LoRA adapters** | `LoRAAdapterRegistryEngine` + per-galaxy inference gateways | `GalaxyAdapterFactoryEngine` reads each galaxy's `MEMORY.md`/`PATHS.md` corpus pointer → trains via the shared bridge → registers adapter → galaxy gateway picks it up at inference. New galaxy with a `PATHS.md` pointer gets an adapter for free. The 67 forked `*LoRA*` engines collapse to thin factory wrappers over time. | Dataset filter only: outcomes tagged `domain:"wedm"` route to the wedm adapter run. |
| **CAG resident** | `scripts/lib/cag-galaxy-bundle.mjs` reads `galaxy-cards/INDEX.json` | One bundle-builder produces `galaxy-bundle-<id>.txt` per galaxy from existing MEMORY.md + CLAUDE.md + ENGINE_DIGEST slice. `cag_load_galaxy` accepts any of the 34 IDs; `/checkin-<slot>` pre-warms. LRU keeps 2–3 resident. | Registration in `INDEX.json` is sufficient; no code. |
| **Model routing ladder** | `OllamaCapabilityProbeEngine` singleton + `prism_ai:model_ladder_pick` | Every galaxy's reasoning/inference call routes through `aiSystemRouterEngine` / `MultiModelConsensusEngine.ask()` — one probe, fleet-wide benefit. Galaxy CLAUDE.md files each get a single added pointer line (when india later builds, not this session). | `ConsensusInput.taskType` per-domain EMA weights (data, not code). |
| **Octopus / self-consistency** | `prism_ai:octopus_panel_query` + `PRISM_LOCAL_SELF_CONSISTENCY=1` | Fleet-wide flag + UserPromptSubmit route-policy keyword expansion. Every `prismCreativeReasoningEngine.explore()` / `multiPathReasoningEngine.reason()` call gets local-32b self-consistency with no per-galaxy edit. | Per-domain EMA in the performance ledger (accumulates by use). |
| **Closed-loop reward** | one `outcome-bus.jsonl` (auto-tapped) + `LoRAAdapterRegistryEngine` | Each slot publishes via `xproc_outcome_publish`; `GPUTrainDispatchEngine` takes a `domain` param; promoted adapters land in the registry; all gateways pick up. GNN retrain is fleet-wide by definition. | Outcome `domain:` tag segments the dataset. |

The unifying principle: **the substrate is shared and flat (one graph, one index, one registry, one probe, one dispatcher surface); the only per-galaxy input is a data tag or a registry entry.** No galaxy reimplements a trainer, an embedder, an index, or a router.

---

## golf infra-dependency handoff

> Message to golf. india is blocked on these items in this order. india will not touch any of them — india consumes them. Items 1–4 unblock the entire training stack (MS3/MS4/MS6); items 5–9 are inference-only and unblock MS1/MS2/MS5/MS6-CAG which can proceed in parallel.

**CRITICAL — Python GPU training stack (gates ALL training: GNN, LoRA, reward model):**

1. **PyTorch cu128 for sm_120** at `H:/Tools/python` (Python 3.14.5):
   `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128`
   **VERIFY before signalling india:** `python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_capability(), torch.cuda.get_arch_list())"` must show `True (12, 0)` and `sm_120` in the arch list. Older cu117/cu121/cu124 wheels lack sm_120 and will silently fall back to CPU at ~1/50th speed — this is the single most dangerous failure mode. Do not report "PyTorch installed" until the capability + arch-list check passes.
2. **PyG matched to the cu128 torch version:** `pip install torch_geometric` + `pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-<ver>+cu128.html`. Version must match the exact installed torch.
3. **LoRA training libs:** `pip install peft bitsandbytes transformers>=4.40 trl datasets accelerate` + Unsloth **latest/nightly** (`unsloth[cu128-...]` — stale pip releases lack sm_120 kernels).
4. **sentence-transformers** (for GPU batch embedding): `pip install sentence-transformers` + the HF `nomic-ai/nomic-embed-text-v1` checkpoint (~270MB) — must be the SAME model Ollama serves at query time (vector-space parity).
5. **llama.cpp built with CUDA 12.8 / sm_120:** `cmake -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=120` — for GGUF conversion of trained LoRA adapters (MS4).
6. **Expose `PRISM_PYTHON_GPU_PATH`** env var (defaults `H:/Tools/python/python.exe`) in the scheduled-task env block so india's Node bridge spawns the right interpreter; ensure `CUDA_VISIBLE_DEVICES=0` is set there too (prevents silent CPU fallback on subprocess import).

**Model pulls (post each pull, post the exact `ollama list` tag to `state/shared/AGENT_CHAT.jsonl` — india hardcodes the verified tag, never guesses):**

7. **`qwen2.5-coder:32b`** — confirm pull complete + responds at `127.0.0.1:11434` + keep_alive 60m firing (`ollama ps` shows it resident after warmup). The blackwell preset already prewarms it.
8. **`kimi2.6`** — verify the official Ollama registry tag EXISTS before india depends on it; report the installed GGUF quantization size (determines the ~28–36GB estimate and whether parallel dual-dispatch is safe). If no Ollama tag yet, india degrades CAG-master + octopus-secondary to `qwen2.5-coder:32b` — not a blocker.
9. **`nomic-embed-text`** — confirm it stays resident and is NOT evicted by the 32b pull.

**Ollama service config (Windows, golf owns):**

10. `OLLAMA_MAX_LOADED_MODELS=3` (default evicts too aggressively for multi-resident CAG).
11. `OLLAMA_FLASH_ATTENTION=1` (FlashAttention-2 for Blackwell — critical for 128K-context CAG KV cache; without it long-context OOMs/slows).
12. Set `PRISM_LOCAL_SELF_CONSISTENCY=1` in the fleet env once kimi2.6/32b confirmed resident.

**Verify-only (no install):** `nvidia-smi` on PATH (`C:\Windows\System32\nvidia-smi.exe` — driver 596.59 ships it). **NOT required:** NVIDIA NIM (optional later for faster link-pred/reward inference; not on any critical path). Ollama v0.30.3 is current — no upgrade needed.

---

## Risks & honest caveats

**Hard technical risks:**

- **sm_120 wheel gap (P0, gates all training).** If the cu128 wheel is unavailable or golf installs an older wheel, every training job silently CPU-falls-back (1/50th speed) or fails at PTX JIT. Mitigation: `U-PYGPU-HEALTH` asserts `(12,0)` + `sm_120` in arch list at *every* training-script entry and fails loud — india never starts a training milestone on an unverified stack. This is a structural gate, not a hope.
- **Vector-space mismatch on embedder change (P0).** The 33K-entry tribal index is only valid if corpus and query share one embedding space. A model swap requires a FULL atomic re-embed, not an incremental append — a mixed-dim/mixed-space index gives nonsense cosine scores. Mitigation: the `dim` assertion + a model-identifier meta-row check before any merge; a model change triggers a full rebuild, never a partial.
- **GNN data wall, not compute wall (P1 — the honest one).** GPU fixes the architecture (attention + 768-d features + focal loss break the constant-vote collapse), but the deploy gate cannot pass without a larger labeled reference pool: 62 holdout ghosts today, ~3–4 per class, several classes (e.g. `prism_5axis`) at ZERO labeled examples → 0 F1 on those. india must report GPU-trained candidate metrics *honestly* (macro-F1 over present classes only, same as today's eval) and explicitly NOT declare "GNN complete" until a clean post-GPU holdout passes all three gates. Reference-pool growth is a per-galaxy operator dependency india documents and surfaces — it cannot be coded away.
- **kimi2.6 VRAM is a soft estimate (P1).** The 28–36GB range is inferred from typical Q4 MoE ratios. If the installed GGUF is larger, parallel dual-dispatch (32b + kimi co-resident) may be unsafe and the system must time-share. Mitigation: `canParallelDual()` measures real free VRAM and refuses parallel dispatch below the combined footprint — degrades gracefully to serialized, never OOMs.
- **RaBitQ recall degradation (P1).** 1-bit binary probe with too-small top-K can lose 5–15% precision vs exact cosine. Mitigation: empirical probe-K calibration against a held-out query set BEFORE the index is declared production-ready; two-stage (binary probe → float32 rerank) recovers precision.
- **The `innerTrain` ghost-contract audit (P1).** The 67 forked `*LoRA*` engines reference `innerTrain` as an injection point but none ever received a real one, and `U-MMO-LORA-PIPELINE-COLLAPSE-MIGRATE` is NOT done — some forks may bypass the pipeline abstraction. india MUST audit `LatheLoRAPipelineEngine.ts` + `CAMLoRAAdapterTrainerEngine.ts` before assuming the standardized bridge drops in fleet-wide. Do not roll out to 67 engines on faith.
- **Ollama-as-trainer category error (P2, structural guard).** Any code routing a "training" call to Ollama `/api/generate` is silently a no-op (it runs inference, never updates weights). Guard: all training routes exclusively through the Python subprocess bridge; Ollama is strictly downstream (serving the GGUF-converted promoted adapter). Reviewers explicitly check this in every training unit.
- **Checkpoint/adapter promotion race (P2).** Concurrent same-domain training jobs would corrupt a live checkpoint. Guard: `DistributedLockManager.withLock("gpu-train-<domain>")` on every run + candidate-path → atomic-promote (train to `candidate/`, swap to `live/`). The JS `promoteDecision()` stays the sole arbiter for the GNN (auditability + Stop-hook chain) — do NOT move promotion logic into Python.
- **CAG hallucination on numerics (P2).** A local 7B/32B answering from a doctrine bundle produces confident-but-wrong speeds/feeds/constants. Guard: `CAGOrchestrationEngine` cross-checks any physics-numeric output against `constants.ts` via deterministic lookup before returning. CAG is grounded summarization + routing, never a substitute for the physics engine.

**External / cross-slot dependencies:**

- **system-viz regen is BROKEN (sierra-owned, not india).** `regen-viz.mjs` aborts with `STATUS_CONTROL_C_EXIT` at the merge-augmentations stage — fresh graph data is unavailable. india's GNN embed + retrain can SEED from the last stable `system-graph.json` (676MB, Jun 3) and logs the graph mtime in checkpoint metadata; the gate warns if stale >7 days. Not a blocker for the initial build, but full-graph freshness depends on sierra's fix.
- **kimi2.6 Ollama tag may not exist yet.** If unavailable, CAG-master + octopus-secondary degrade to `qwen2.5-coder:32b`. The whole CAG/octopus subsystem must NOT block on one model.

**Operator decisions needed:**

- **Reference-pool growth ownership.** The GNN gate cannot pass without each galaxy contributing 5–10 labeled ghost examples. Operator decides: is this a one-time fleet seeding push, or a standing per-galaxy-buildout step? india recommends the latter (document in each galaxy's buildout STEP).
- **Per-domain GGUF quant policy for safety-critical adapters.** Q4_K_M loses accuracy; for adapters emitting G-code with spindle limits / G50 clamps, india recommends Q8_0 or bf16 (larger files, ~65GB for 32B Q8_0). Operator confirms the quant floor for safety-critical domains — india exposes it as per-domain config, never a hardcoded global.
- **Base-model license.** `Qwen2.5-Coder-32B` is Apache 2.0 (safe for JM Die commercial use). kimi2.6's license must be verified by golf at pull time before any fine-tuned derivative is deployed commercially.
- **Always-resident kimi2.6 vs time-shared.** If operator wants kimi2.6 always resident (~36GB) for instant octopus/CAG, that permanently constrains the training-burst envelope and forbids 32B co-residence. india recommends time-sharing kimi2.6 (load for reasoning bursts, evict for training) unless the operator prioritizes consensus latency over training cadence.

---
---

# APPENDIX B — Feasibility / reality-check verdict (adversarial verifier A)

I now have enough verified facts to deliver the adversarial reality-check. Key findings confirmed:

1. **kimi2.6 / Kimi K2.6 is a 1T-parameter, 350GB+ (2-bit) / 610GB (full) model — Ollama only offers it as a `:cloud` tag.** The plan's "~28-36GB resident, locally fine-tunable" assumption is catastrophically wrong (off by ~10x and not even a local model).
2. **Python 3.14 cu128 GPU wheels are unreliable/missing.** Stable PyTorch sm_120 support is shaky; cp314 CUDA wheels were CPU-only on key indexes as of Dec 2025; the ecosystem (PyG extensions, bitsandbytes, flash-attention, xformers) lags hard on cp314 + sm_120.
3. **The training stack works on sm_120 only via Unsloth + careful version pinning (torch 2.11+cu129, matching bnb), often requiring source builds — NOT the clean `pip install torch --index-url .../cu128` the handoff implies.**

Let me write the findings.

# Adversarial Reality-Check — PRISM Blackwell AI Master Plan (slot:india)

Verdict-bearing findings below. I checked the six hard axes plus the load-bearing infra assumptions. The plan is *architecturally* sound and the training/inference split is correctly drawn — but it rests on three factual assumptions that are wrong-on-this-host-today, and one of them (kimi2.6) is wrong by an order of magnitude.

---

## Findings (severity-ordered)

**1. [P0] `kimi2.6` is a 1-trillion-parameter cloud model, NOT a ~28–36GB local resident.** This is the single most dangerous error in the plan. Kimi K2.6 (Moonshot) is a 1T-param MoE; full precision needs ~610GB disk, the Unsloth Dynamic 2-bit quant is ~350GB, and **Ollama only publishes it as `kimi-k2.6:cloud`** — there is no local-runnable GGUF tag that fits 96GB, let alone 28–36GB. The whole "octopus-secondary + CAG-master + HyDE resident voice" premise, the steady-state VRAM table row (~28–36GB), and the "always-resident vs time-shared kimi2.6" operator decision are all built on a model that physically cannot reside on this GPU. The "Q4 MoE ratio" estimate is not a soft estimate — it is a ~10× miss.
   - **Fix:** Strike kimi2.6 from every resident/training role. The plan ALREADY has the correct fallback wired ("degrade CAG-master + octopus-secondary to `qwen2.5-coder:32b`") — promote that to the DEFAULT, not the degraded path. Treat any Kimi as a `*:cloud` API voice only (network egress + cost + the PII/redaction gate already noted), never local, never a fine-tune base. Have golf verify the exact tag and whether a sub-96GB local quant exists before india writes a single line that names it. This does NOT block the plan — it just deletes a phantom subsystem.

**2. [P0] Python 3.14.5 is the wrong interpreter for the GPU training stack — cu128/sm_120 wheels for cp314 are missing/CPU-only and the ecosystem (PyG ext, bitsandbytes, xformers, flash-attention) lags hardest exactly there.** The handoff says "PyTorch cu128 at `H:/Tools/python` (Python 3.14.5)" with a clean `pip install torch --index-url .../cu128`. Reality: as of late 2025 cp314 CUDA wheels were installing **CPU-only** on the official indexes; stable PyTorch sm_120 support landed late and shakily; PyG extension wheels, bitsandbytes, and xformers/flash-attention trail cp314 + Blackwell by months and frequently require source builds. The plan's own "single most dangerous failure mode" (silent CPU fallback) is *more* likely on 3.14 than it admits, and `U-PYGPU-HEALTH` would correctly fail-loud — but then india is blocked with no remediation path because the wheels don't exist for that interpreter.
   - **Fix:** The GPU training stack must run on a **dedicated Python 3.12 or 3.13 venv** (Unsloth's own Blackwell guidance pins 3.13), NOT the portable 3.14.5. Add to the golf handoff: provision a separate `H:/Tools/python-gpu` (3.13) interpreter for training; `PRISM_PYTHON_GPU_PATH` points there. The portable 3.14 stays for Node-adjacent scripts. This is a real golf dependency the handoff currently mis-specifies — flag it explicitly or `U-PYGPU-HEALTH` becomes a permanent red gate.

**3. [P0] The training-library install commands are too optimistic and will not "just work" on sm_120.** Verified from real RTX 6000 Blackwell + RTX 5090 reports: the working path is `torch 2.11+cu129` (cu128 had cuBLAS sm_120 gaps in some builds), **bitsandbytes version must exactly match the torch CUDA target** (a cu130 torch bump silently broke bnb 0.49.2 with `libnvJitLink`/`cdequantize` symbol errors), xformers frequently needs a `TORCH_CUDA_ARCH_LIST="12.0"` source build, and `torch.compile`/Triton kernels fail to launch on sm_120 (needs `TORCHDYNAMO_DISABLE=1` + `UNSLOTH_COMPILE_DISABLE=1`). Stock PyPI Unsloth runs a generic SDPA path without Blackwell kernels. The handoff's `pip install peft bitsandbytes ... + Unsloth nightly` understates this by a lot.
   - **Fix:** Rewrite golf handoff items 1–3 as "use the **official Unsloth Blackwell Docker image** OR Unsloth Studio venv (3.13), pin torch+cu129, install bitsandbytes from the matching CUDA build, set `TORCHDYNAMO_DISABLE=1`/`UNSLOTH_COMPILE_DISABLE=1` as default training env." Keep `U-PYGPU-HEALTH` but extend it to assert a real bnb 4-bit dequant op runs on GPU (not just `cuda.is_available()`) — the silent-fallback mode here is bnb-specific, not torch-level.

**4. [P1] The GNN "fix" addresses the architecture wall but the plan's own honest caveat concedes it likely cannot pass the deploy gate — so MS3's headline benefit is overstated.** The diagnosis is correct: GATv2/H2GCN + 768-d features + focal/inverse-freq loss WILL break the constant-vote collapse (`distinctPredictions=1, all→prism_turning`) because that collapse is the signature of a model with no usable features under class imbalance — real node features + class-balanced loss genuinely produce ranking signal, this is not threshold-tuning a dead model. BUT the plan then admits 62 holdout ghosts, ~3–4/class, several classes (e.g. `prism_5axis`) at ZERO labeled examples → macro-F1≥0.55 is arithmetically unreachable (a class with zero holdout examples cannot contribute, and ~3 examples/class gives F1 variance that swamps the 0.55 bar). So `U-GNN-GPU-TRAIN`'s acceptance gate ("loss decreases AND distinctPredictions>1") is honest, but the milestone's framing as "fixes constant-vote collapse fleet-wide" implies a deployable classifier that the data cannot support.
   - **Fix:** Already mostly self-flagged — but make it structural: split MS3's success criterion into (a) **architecture-fixed** = constant-vote broken + loss curve + distinctPredictions>1 on holdout (achievable, GPU-gated), and (b) **deploy-gate-passed** = AUROC/macroF1/Brier (BLOCKED on reference-pool growth, operator dependency). Do NOT let (a) be reported as "GNN complete." The edge-prediction head (`U-GNN-EDGE-PREDICT`) is the genuinely deployable GPU win here — link-prediction for dead-edge surfacing does NOT need the multi-class reference pool — so reorder it ahead of the multi-class classifier as the MS3 keystone deliverable.

**5. [P1] VRAM budget arithmetic is internally sound BUT every number that includes kimi2.6 is void, and the "forbidden combination" margin is thinner than stated.** With kimi2.6 removed (Finding 1), steady-state collapses to a comfortable ~40–46GB (32b ~22 + nomic ~0.6 + 7b ~5 + KV 8–12 + overhead ~3), leaving ~50GB headroom — actually *better* than the plan claims. The training-burst math (32B QLoRA ~35GB + 7b floor ~9 + overhead ~3 ≈ 47GB) is plausible and fits. Two real nits: (a) the "forbidden combination" (32B-inference-resident + 32B-training ≈ 66GB) is correctly identified as time-share-only, good; (b) the qwen2.5-coder:32b Q4_K_M weight is ~20GB on disk / ~22–25GB VRAM *before* KV cache — at the 128K context the CAG tier wants, KV cache alone for a 32B model can add 10–20GB, which the table buries inside a generous "8–12GB KV" row shared across galaxies. Verify per-model KV at target context before declaring 2–3 resident galaxies safe.
   - **Fix:** Regenerate the VRAM tables post-kimi-removal (headroom improves, so this is good news). Add an explicit per-model KV-cache line item at the actual CAG context length (`OLLAMA_FLASH_ATTENTION=1` helps but does not eliminate it); have `LocalCAGEngine` probe `nvidia-smi memory.free` AFTER warmup, not from the static table (the plan says it does — make the reviewer enforce it).

**6. [P1] `deepseek-r1:14b` is hardcoded in live code and IS a real bug, but the plan should verify the count of hardcoded model strings before claiming "five subsystems."** The keystone argument (U-CAP-PROBE) is correct and well-motivated — a single capability probe is genuinely the right foundation, has zero infra dependency, and is the cheapest clean 3-of-3 unit. But the "five of eight assessments independently hardcode deepseek-r1:14b" claim is asserted, not shown. If india later builds on this premise and only 2 of the 5 actually hardcode it, the grep-gate acceptance criterion ("zero hardcoded model strings remain") may pass trivially or miss real ones.
   - **Fix:** Before/during U-CAP-PROBE, run the grep gate FIRST as a discovery step (`Grep "deepseek-r1|:14b|:32b" mcp-server/src`) to enumerate the actual hardcoded sites; make the acceptance criterion "every enumerated site routes through the probe," not a blanket "zero strings." Minor — the keystone choice itself is correct.

**7. [P1] Ollama-as-trainer category error: correctly identified and structurally guarded — no hallucination present.** Verified: the plan is RIGHT that Ollama is inference-only (serves GGUF + embeddings + KV-cached contexts, cannot run a backward pass), and it routes ALL training (GNN, QLoRA, reward, EWC) through the Python+CUDA subprocess bridge with Ollama strictly downstream serving the converted adapter. This is the one place a naive plan would hallucinate "Ollama fine-tunes the adapter" and this plan does not. The P2 guard ("reviewers check every training unit doesn't route to `/api/generate`") is appropriate. No fix needed — this is a strength; calling it out so it survives revision.

**8. [P2] sentence-transformers vs Ollama embedding-space parity is asserted but the two paths can silently diverge.** U-GPU-EMBED-WORKER requires the GPU batch embedder (HF `nomic-ai/nomic-embed-text-v1` via sentence-transformers) to produce vectors in the SAME space Ollama's `nomic-embed-text` serves at query time. These are the same base model but different inference stacks (HF transformers vs Ollama's GGUF) — pooling strategy, normalization, and the `search_document:`/`search_query:` prefix nomic requires can differ between the two, producing subtly mismatched vectors that pass a `dim` check but score garbage cosine.
   - **Fix:** The plan's pilot ("embed 1,000 nodes, assert same-dispatcher cosine > cross-dispatcher cosine") is necessary but insufficient — add a **direct parity assertion**: embed the same 50 strings through BOTH the GPU worker and Ollama `/api/embeddings`, assert cosine > 0.99 pairwise. If they diverge, standardize on ONE path (likely: GPU-embed corpus AND query both via the HF worker, use Ollama only for non-RAG generation) rather than mixing.

**9. [P2] Dependency order is correct, with one reorder.** MS0 (probe + GPU-health + bridge) correctly gates everything; MS1 routing depends only on the probe; MS2 RAG and MS5 octopus/MS6-CAG are correctly marked as inference-only (no Python stack) and can proceed in parallel while golf finishes the training stack; MS3/MS4/MS6-reward correctly gate on U-PYGPU-HEALTH. One reorder (from Finding 4): within MS3, put `U-GNN-EDGE-PREDICT` (deployable, no reference-pool dependency) ahead of the multi-class `U-GNN-GPU-TRAIN` (data-walled). Otherwise the foundation-before-consumers discipline holds.

**10. [P2] qwen2.5-coder:32b is real, runnable, and correctly sized — the one fully-validated resident model.** ~20GB GGUF / ~22–25GB VRAM at Q4_K_M, fits comfortably, pulls via `ollama pull qwen2.5-coder:32b`. The golf blackwell preset prewarming it is sound. With kimi removed, this becomes the load-bearing reasoning voice for octopus-primary, CAG-master, RAG-rerank, and self-consistency simultaneously — which is fine on 96GB but means the "octopus multi-MODEL consensus" is really single-model self-consistency until a *second* genuinely-local large model (e.g. a Qwen3-32B or GLM variant golf can actually pull) is identified. The plan should name a real second local voice or rename the octopus tier honestly as "self-consistency + cloud-Kimi-when-available."

---

## Sources

- [PyTorch sm_120 / Blackwell stable support tracking (Issue #164342, #159207, #157549)](https://github.com/pytorch/pytorch/issues/164342)
- [Fix PyTorch sm_120 on Blackwell: cu128 setup (Pillai, Medium)](https://medium.com/@harishpillai1994/fix-pytorch-sm-120-on-rtx-blackwell-gpus-cuda-docker-cu128-setup-to-run-llms-44f25179ac76)
- [Python 3.14 — no CUDA/GPU wheels available, CPU-only install (PyTorch Issue #169929)](https://github.com/pytorch/pytorch/issues/169929)
- [Python 3.14 support for PyTorch (Issue #156856)](https://github.com/pytorch/pytorch/issues/156856)
- [Fine-tuning LLMs with Blackwell, RTX 50 series & Unsloth (official docs)](https://unsloth.ai/docs/blog/fine-tuning-llms-with-blackwell-rtx-50-series-and-unsloth)
- [Gemma QLoRA on RTX 5090 sm_120 — what broke and what fixed it (Unsloth Issue #5154)](https://github.com/unslothai/unsloth/issues/5154)
- [Evaluating LLM fine-tuning on RTX 6000 Blackwell Max-Q (Fixstars)](https://blog.us.fixstars.com/evaluating-llm-fine-tuning-efficiency-on-nvidia-rtx-6000-blackwell-max-q/)
- [Kimi K2.6 — how to run locally (Unsloth docs: 1T params, 350–610GB)](https://unsloth.ai/docs/models/kimi-k2.6)
- [ollama.com/library/kimi-k2.6 (cloud-only tag)](https://ollama.com/library/kimi-k2.6)
- [qwen2.5-coder:32b-instruct-q4_K_M (Ollama library)](https://ollama.com/library/qwen2.5-coder:32b-instruct-q4_K_M)
- [PyG installation — Python 3.10–3.14, extension wheels by torch+CUDA combo](https://pytorch-geometric.readthedocs.io/en/latest/install/installation.html)

VERDICT: REVISE

---
---

# APPENDIX C — Generalization / risk verdict (adversarial verifier B)

All load-bearing claims verified against the live tree. The `OutcomeRLBridgeEngine` is in `engines-unwired/` wiki path (orphan), `system-graph.json` is the claimed 676MB Jun 3, regen-viz exists. I have enough to issue the adversarial verdict.

# Generalization + Risk Adversarial Review — BLACKWELL-AI Master Plan (slot:india)

Verified against the live tree: keystone `OllamaCapabilityProbeEngine` does NOT exist yet (genuinely new, good). `promoteDecision()` IS the sole GNN arbiter as claimed (`scripts/nn-graph-retrain-lifecycle.mjs:202,617`). `deepseek-r1:14b` is hardcoded in **6+ engines**, not just the 5 subsystems the plan names. `innerTrain` lives in `lora-training-pipeline.mjs`. `system-graph.json` is the claimed 676MB (Jun 3). `OutcomeRLBridgeEngine.ts` exists but sits in the **`engines-unwired/`** wiki bucket — it is an orphan, which the plan does not flag.

## Findings

**1. (P0 — generalization overclaim) The `deepseek-r1:14b` purge is scoped to 1 engine but the rot is in at least 6.** U-ROUTE-LADDER/U-OCTOPUS-PANEL name `MultiModelConsensusEngine` + `aiSystemRouterEngine`. But the hardcode also lives in `ConsensusAIBridgeEngine.ts` (4 separate `plan/build/review/validate` route entries, lines 100-106), `ModelRoutingEngine.ts:150` (its own `DEFAULT_MODEL_CATALOG`), and `OllamaContextFloorEngine.ts:5`. The plan's "zero hardcoded model strings remain (grep gate)" acceptance criterion will **fail on first run** because the grep will light up engines no unit touches. `ModelRoutingEngine` is the *real* fleet routing surface (`TaskKind`/`Backend`/`HardwareProfile` enum, already has a `home_blackwell` profile and a `qwen2.5-coder:32b` catalog entry) — it is a competing, more-mature router that the plan ignores in favor of `aiSystemRouterEngine`. **Fix:** expand U-ROUTE-LADDER scope to enumerate ALL hardcode sites (add `ConsensusAIBridgeEngine`, `ModelRoutingEngine`, `OllamaContextFloorEngine`); decide whether the ladder wraps `ModelRoutingEngine` (which already does capability-aware scoring) or replaces it — this is an R7 surface-don't-average conflict the plan blends silently. Per R7, pick the more-mature `ModelRoutingEngine` and say why, or justify the new surface.

**2. (P0 — generalization is honest only for GNN/RAG; LoRA + CAG are dressed-up-as-fleet-wide) Name the weak ones.** The "build-once → 34 galaxies" matrix is genuinely true for GNN (one graph, one retrain — mechanically fleet-wide) and RAG (one index keyed by `domain` — true). It is **aspirational** for the other four:
   - **LoRA**: the matrix says "67 forked engines collapse to thin factory wrappers over time" and "new galaxy with a PATHS.md pointer gets an adapter for free." Neither mechanism exists — `GalaxyAdapterFactoryEngine` and `LoRAAdapterRegistryEngine` are **named but not verified to exist** in the plan; the 67 forks each have bespoke pipeline shapes (the plan's own P1 risk admits `U-MMO-LORA-PIPELINE-COLLAPSE-MIGRATE` is NOT done). So "train once → all domains pick up" is a 67-engine migration project, not a registry inheritance. This is india-builds-the-trainer generalizing to *itself*, not to 34 galaxies.
   - **CAG**: `cag-galaxy-bundle.mjs` reading `galaxy-cards/INDEX.json` assumes every galaxy has a card AND a context bundle that fits a 128K window. 34 galaxies × MEMORY.md+CLAUDE.md+ENGINE_DIGEST slice will overflow for the large galaxies (mill ~222 engines, lathe ~238). "Registration in INDEX.json is sufficient; no code" is false the moment a bundle exceeds context.
   - **Closed-loop reward**: depends on `OutcomeRLBridgeEngine`, which is in the **`engines-unwired/` orphan bucket** — the reward signal has no live consumer wiring today. The plan treats it as a live substrate. **Fix:** downgrade LoRA/CAG/reward generalization claims from "inherit by data" to "inherit after a per-galaxy verify step"; explicitly mark the matrix rows as ASPIRATIONAL where the propagation engine is unbuilt/orphaned.

**3. (P0 — breaks the deploy-gate discipline by misapplying GNN metrics to LoRA) AUROC/macroF1/Brier are classification metrics; a generative LoRA adapter has no AUROC.** U-LORA-PROMOTE-GATE says "candidate adapter → live only on AUROC≥0.78/macroF1≥0.55/Brier≤0.15 on a domain holdout." A QLoRA fine-tune emits G-code/text — there is no class-probability output to compute AUROC/Brier over. This gate is a **category error copied from the GNN gate**. It cannot be implemented as written and a reviewer who waves it through ships a meaningless gate. **Fix:** define a generative-appropriate gate (exact-match / BLEU / pass@k on a held-out G-code set, + the existing S(x)≥0.95 safety floor + a regression-vs-base-model delta). Keep AUROC-family gates ONLY for the GNN classifier and the reward model's preference accuracy.

**4. (P1 — the GNN data wall is correctly flagged but the milestone still ships a no-promote unit) MS3 cannot pass its own deploy gate and the plan knows it.** The honest caveat is good (62 holdout ghosts, several classes at zero, `prism_5axis` at 0 F1). But U-GNN-GPU-TRAIN's acceptance gate is only "loss decreases AND distinctPredictions>1" — that is a *training-smoke* gate, not the deploy gate. So MS3 will produce a GPU-trained candidate that `promoteDecision()` correctly **refuses** (deferred on `insufficient-reference-pool`, exactly the current live state). The milestone "completes" while shipping zero production improvement. That is fine IF labeled honestly, but the executive summary's "fixes the constant-vote collapse fleet-wide" overstates it — breaking constant-vote in a candidate that never promotes is invisible to the fleet. **Fix:** split MS3 into "U-GNN-GPU-TRAIN (candidate, research)" and a separately-gated "U-GNN-PROMOTE (blocked on reference-pool ≥ N/class)"; do not let the milestone read as a fleet win until a candidate clears `promoteDecision()`.

**5. (P1 — steps on golf's infra lane in 2 places despite the clean handoff framing) The plan mostly respects the boundary but leaks.** The golf handoff is well-structured (india consumes, golf installs). Two leaks: (a) U-PYGPU-HEALTH ships `scripts/py/gpu_health.py` that asserts the cu128 stack — but *installing* and *version-pinning* PyG to the exact torch build (handoff item 2) is the kind of environment management that, if india's health script hardcodes a torch version string, will drift from what golf installs. (b) `OLLAMA_MAX_LOADED_MODELS`/`OLLAMA_FLASH_ATTENTION`/keep_alive are golf-owned Ollama service config, but U-LOCAL-CAG's acceptance gate *depends* on them being set — india's unit will FAIL CI/scrutiny if golf hasn't set them yet, coupling india's Stop-gate to golf's lane. **Fix:** U-LOCAL-CAG must degrade-and-pass (probe the config, skip-with-warning if unset) rather than hard-depend; never let an india unit's green gate require a golf env mutation.

**6. (P1 — sierra's system-viz lane: the plan asserts regen-viz is BROKEN as fact without owning the verification) `regen-viz.mjs` exists and the 676MB graph is dated Jun 3 (today).** The plan claims regen aborts with `STATUS_CONTROL_C_EXIT` at merge-augmentations — but a fresh 676MB graph from today suggests *something* is regenerating it. Either the claim is stale or the graph is being written by a different path. india is building GNN embed/retrain on top of this graph; if the "broken" premise is wrong, the "seed from last stable graph + warn if stale >7 days" mitigation is solving a non-problem, and if it's right, india's full-corpus embed (U-FULL-CORPUS-EMBED, 302K nodes) consumes a graph sierra may rewrite mid-run. **Fix:** before MS3, india must (a) confirm the regen-viz state with sierra via chat bus, (b) snapshot the graph with an mtime+hash lock in checkpoint metadata, (c) NOT assert "BROKEN" as fact in the plan without a repro — flag it as "reported broken, unverified by india."

**7. (P1 — scope realism: MS2 + MS4 are multi-week bakes disguised as session units) Flag the over-scoped milestones.**
   - **U-FULL-CORPUS-EMBED** claims "full pass completes in <10 min" for 38,710 files + 302K nodes. GPU batch embed of 302K nodes at bs=512 is plausible in minutes for *node* text, but 38,710 *files* requires chunking, dedup, and I/O that is not a 10-min job on first run, and the resumable-checkpoint logic (reset stale progress, atomic /2000) is itself a unit's worth of edge-case work. This is 2-3 units.
   - **U-LORA-TRAINER-CORE** bundles: Unsloth/PEFT integration + filling `innerTrain` + `DistributedLockManager` wiring + the 67-engine audit + Ollama-eviction logic. The "audit the 67 forked LoRA engines" alone is a multi-session investigation. This is a milestone, not a unit.
   - **Fix:** decompose both; the per-unit acceptance gates should each be independently shippable under one 3-of-3 Stop gate. A unit that cannot reach a clean Stop in one session violates the session-unit contract.

**8. (P2 — keystone is RIGHT, but U-PYGPU-HEALTH is the true co-foundation and should be a hard MS0 sibling, which it already is) Minor sequencing nit.** U-CAP-PROBE is correctly the keystone: zero infra dependency, hermetic, every consumer gates on it, lights up automatically when golf finishes pulls. No more-foundational unit exists (U-PY-BRIDGE-LIB depends on it transitively via health). The plan already pairs it with U-PYGPU-HEALTH. One refinement: U-CAP-PROBE's `canParallelDual()` and the VRAM table are **soft estimates** (kimi2.6 especially); ensure the probe's runtime `nvidia-smi` read is the sole authority and the static table is advisory-only — the plan says this but the VRAM-budget section's "proof it fits" arithmetic could lull a builder into trusting the table. Keep the fail-loud runtime probe as the gate.

**9. (P2 — coordination: what MUST hit the chat bus before india builds)** The plan's golf handoff is good but omits the broadcast obligations. Before india writes a single file: (a) post to `AGENT_CHAT.jsonl` claiming the `prism_ai:capability_probe` / `prism_dev:gpu_stack_health` / `prism_dev:infer_missing_wiring` action names so a peer doesn't race them; (b) notify **sierra** that india will read (not write) `system-graph.json` and needs a stable snapshot — india must NOT trigger regen-viz; (c) notify **golf** the handoff items are posted and india is blocked-but-proceeding on inference-only units (MS1/MS2-probe/MS5); (d) file-claim the consumer engines india will edit (`MultiModelConsensusEngine.ts`, `aiSystemRouterEngine.ts`, `nn-graph-retrain-lifecycle.mjs`) — the last one is shared infra that bravo/india have both touched recently (CLAUDE.md regressions list shows india owns the recent NN schema-read fixes, so this is likely safe, but claim it). **Fix:** add an explicit "MS-(-1): broadcast + claim" pre-step before MS0.

**10. (P2 — existing tests will break on the deepseek purge) The grep gate has test-file blast radius.** `AIDispatcherConsensusDecide.test.ts`, `ConsensusAuditLogEngine.test.ts` hardcode `deepseek-r1:14b` as fixture data (lines 50,54,37,41,72,76). A naive "remove all deepseek strings" purge breaks these tests. They are testing *audit-log shape* with a model name as opaque data — they should stay, but the grep gate must allowlist test fixtures or the gate self-reports false failure. **Fix:** scope the no-hardcode grep gate to `src/engines/**` non-test files; document that historical audit-log fixtures legitimately contain past model names.

## Generalization scorecard (the core question)
- **GNN tier-5**: GENUINELY fleet-wide (one graph, one retrain). ✅
- **RAG/embeddings**: GENUINELY fleet-wide (one index, `domain` filter exists). ✅
- **Model routing ladder**: PARTIALLY — true mechanism, but understated scope (6 hardcode sites, competing router). ⚠️
- **LoRA adapters**: NOT fleet-wide today — requires the unbuilt `GalaxyAdapterFactory` + 67-engine collapse; generalizes to india, not 34 galaxies. ❌
- **CAG resident**: ASPIRATIONAL — bundle-fits-context assumption fails for large galaxies. ⚠️
- **Octopus/self-consistency**: GENUINELY fleet-wide (flag + route-policy keyword expansion). ✅
- **Closed-loop reward**: NOT live — `OutcomeRLBridgeEngine` is an orphan (engines-unwired). ❌

The plan's unifying claim ("substrate shared and flat; only per-galaxy input is a data tag") holds for 3 of 7 subsystems cleanly, 2 with caveats, and is false for 2 (LoRA, reward) where the propagation engine is unbuilt or orphaned.

VERDICT: REVISE

The dependency ordering, keystone choice, training/inference boundary, and VRAM math are sound — this is a strong plan. But three P0s must be fixed before india builds: (1) the model-hardcode purge scope is understated by 5 engines and silently picks one of two competing routers (R7 violation), (2) the LoRA/CAG/reward generalization claims are dressed-up-as-fleet-wide when their propagation engines are unbuilt or orphaned, and (3) U-LORA-PROMOTE-GATE applies classification metrics (AUROC/Brier) to a generative adapter — a category error that ships a meaningless gate. P1s on MS3-promotes-nothing honesty, golf/sierra lane coupling, and the unverified "regen-viz is broken" premise round out the required revisions.

---

## SHIP LOG (append-only)

### 2026-06-03 (slot:india, session 501bd704) — MS0 foundation pair SHIPPED
- **U-CAP-PROBE** ✅ `86716f4aaf` — OllamaCapabilityProbeEngine (keystone; inference/VRAM routing).
- **U-PYGPU-HEALTH** ✅ `f11efe4047`+`9e5dcca6ad` — `scripts/py/gpu_health.py` (fail-loud GPU readiness; catches the silent-CPU-wheel) + `GpuStackHealthEngine.ts` wired `prism_dev:gpu_stack_health`. 17 vitest. assertReady() = hard gate; `ready` derived only from torch_ready.
- **U-PY-BRIDGE-LIB** ✅ `f11efe4047` — `scripts/lib/py-subprocess-bridge.mjs` (canonical Node→Python NDJSON spawn; never swallows non-zero exit; win32 taskkill /T tree-kill; incremental parse). 23 node:test.
- Scrutiny: 10 review passes (6 per-file + 1 wiring + 3-of-3 formal), ALL PASS. tsc-clean, round-trip E2E proven.
- **Live state today = RED** (`prism_dev:gpu_stack_health` → ready:false, torch_not_importable) — CORRECT: golf hasn't installed the Python GPU stack. Flips GREEN automatically when golf lands torch cu129/sm_120 in a Python 3.13 venv + `PRISM_PYTHON_GPU_PATH`.

### GOLF DEPENDENCY (the gate that unblocks all training MS3/MS4/MS6)
golf: install into a dedicated Python **3.13** venv (NOT portable 3.14.5 — cp314 cu wheels are CPU-only): `torch` cu129/sm_120, `bitsandbytes`, `peft`, `transformers`, `accelerate`, `sentence-transformers`; PyG/DGL for sm_120. Expose `PRISM_PYTHON_GPU_PATH` + `CUDA_VISIBLE_DEVICES=0` in the scheduled-task env. VERIFY: `prism_dev:gpu_stack_health` returns `ready:true` (and `qlora_ready:true` with `--require-bnb`). Until then india's training units are correctly blocked.

### NEXT PHASE — "improve training for ALL galaxies utilizing GPU VRAM" (operator directive 2026-06-03)
Dependency-ordered, on the proven foundation:
1. **`GpuTrainingSchedulerEngine`** (india-actionable NOW, NOT golf-gated) — the build-once VRAM-aware slot allocator every galaxy's training job acquires before spawning. Composes: `gpuStackHealthEngine.assertReady()` (refuse if stack not training-capable) + `ollamaCapabilityProbeEngine` free-VRAM headroom check + `DistributedLockManager.withLock("gpu-train-<domain>")` (serialize so two galaxies never race the 96GB GPU). API: `requestSlot(domain, estVramMiB, {requireBnb}) → {granted, reason, freeMiB}`. Wire `prism_dev`/`prism_ai`. This is the coordination layer for all-34-galaxy training fan-out — fully testable today via injected readers. **Build this next.**
2. **MS3 GNN GPU retrain** (golf-gated) — `gnn_train.py` (GATv2/H2GCN, fixes constant-vote collapse) spawned via the bridge, gated on the scheduler; `U-GNN-EDGE-PREDICT` (dead-wiring surfacing, NO reference-pool dep) is the deployable win.
3. **MS4 LoRA trainer + GalaxyAdapterFactory** (golf-gated) — fills the `innerTrain` ghost; trains per-galaxy adapters via the scheduler+bridge → registry → all galaxies inherit by `domain` data tag. This is the literal "training for all galaxies."
4. **MS6 reward model + outcome-retrain trigger** (golf-gated).
