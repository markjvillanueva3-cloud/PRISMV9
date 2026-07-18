# INDIA Galaxy Memory — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)

Append-only cross-session memory for the india slot.

## Master-brain link
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:ai-training]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29   ← STALE: master MEMORY.md updated 2026-06-04; this file edited 2026-06-08 (NN-GRAPH/RAG-HYBRID work) without a master re-pull. Re-pull before next india session.


<!-- GALAXY-BRAIN-FILL:BEGIN -->

## High-ROI memories
> Distilled from `knowledge/memories/patterns/ai-training_synthesis.md` (gpt-oss:120b-synthesized from 10 domain memories — ⚠ advisory, verify against the cited source memory before trusting safety-relevant rules).

- **Rule 1: Compounding First** – before any model update, each galaxy must produce a compounding synthesis file; downstream jobs consume only these files [reference_alpha_b1_galaxy_reflection_2026_05_29].
- **Rule 2: Slot‑Based Execution** – jobs are tagged with a slot identifier and the bootstrap system enforces that slots execute in the prescribed hierarchy (e.g., `india` before `bravo`) to prevent race conditions [reference_post_ship_obsidian-ai-synergy-u-lora-galaxy-synthesis].
- **Rule 3: Uniform LoRA Dataset** – the LoRA feeder pulls exactly 512 advisory‑tagged Alpaca pairs per galaxy; any deviation aborts the pipeline [reference_reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Rule 4: Sparse Memory Injection** – each synthesis run must include the 20 pre‑selected domain memories; omission triggers a validation error [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories].
- **Per‑galaxy compounding synthesis** – each galaxy’s raw transcripts are distilled into a unified `<galaxy>_synthesis.md` that feeds the “compounding arm” of the Obsidian brain [reference_alpha_b1_galaxy_reflection_2026_05_29].
- **Cross‑session auto‑distillation** – pipelines (e.g., *POST_SHIP* jobs) automatically extract learnings from shipped modules and append them to a central wiki for reuse [reference_post_ship_domain-galaxy-doctrine-ms1-u-galaxy-ms1-b3-weekly-synthesis-populater], [reference_post_ship_galaxy-context-fill-u-galaxy-sparse-memories], [reference_post_ship_galaxy-enrich-u-ge-ai-training-xcut].
- **LoRA‑wide training signal** – a single LoRA dataset is generated from advisory‑tagged Alpaca pairs across all 34 galaxies and applied uniformly during model fine‑tuning [reference_reference_lora_galaxy_synthesis_feeder_2026_06_10].

## Indexed memories
- **Domain corpus (live counts):** 113 curated memory file(s) · 519 wiki entr(y/ies) · 66 tribal tip(s) matching this galaxy's keyword heuristic. _(plus 167 auto-generated `node_*` graph-node files excluded from this count)_
- **Recall (UP):** `prism_memory:semantic_search query="ai-training" topK=20` against the master Obsidian brain.
- **Galaxy artifacts:** [`PATHS.md`](PATHS.md) (file map) · [`TOOLBELT.md`](TOOLBELT.md) (dispatchers/skills) · [`CLAUDE.md`](CLAUDE.md) (doctrine).
- **Sample memories:** `knowledge/memories/reference/reference_ai-training_transcript_synthesis.md` · `knowledge/memories/reference/reference_charlie_train_data_coverage_2026_06_02.md` · `knowledge/memories/reference/reference_gnn_edge_predict_foundation_2026_06_08.md` · `knowledge/memories/reference/reference_gnn_node_embedding_bridge_2026_05_23.md` · `knowledge/memories/reference/reference_gnn_selective_deploy_2026_06_06.md`
- **Sample wiki:** `knowledge/wiki/os/commands/cad-rag.md` · `knowledge/wiki/os/commands/cad-train.md` · `knowledge/wiki/os/commands/lathe-lora.md` · `knowledge/wiki/os/commands/train-lora.md`
- **Sample tribal:** `knowledge/wiki/code-tribal/embedding-and-rag-patterns.md` · `knowledge/wiki/code-tribal/lora-fine-tuning-patterns.md` · `knowledge/wiki/code-tribal/learnings/ai-synergy-audit-ms0-u-aisyn-gnn-nodefeat.md`

## Cross-galaxy bridges
- `engines/system-viz/` (sierra) — NN-GRAPH input; sierra's regen sequence affects india's eval
- `engines/cad/` (delta) — CAD classifier feeds AI training corpus
- `engines/tribal-knowledge/` — tribal RAG drives prompt augmentation
- `engines/token-optimization/` (alpha) — alpha audits token cost of AI inference paths
- `engines/post-processor/` (echo) — post-emitted G-code is RL outcome surface

## Known failure modes
> Open threads / risk areas distilled from this galaxy's memories (advisory):
- **Integration depth of tribal‑knowledge synthesis** – how much of the tribal‑knowledge galaxy should be merged into the ai‑training compounding patterns without diluting technical focus? [reference_reference_tribal-knowledge_transcript_synthesis].
- **Scalability of LoRA across >34 galaxies** – current pipelines assume 34 galaxies; extending to additional clusters may require redesign of the `--source galaxy` mode. [reference_reference_lora_galaxy_synthesis_feeder_2026_06_10].
- **Conflict resolution between slots** – no explicit policy exists for handling contradictory directives that arise when two slots produce overlapping synthesis files. [reference_post_ship_obsidian-ai-synergy-u-lora-galaxy-synthesis-wire].
- **Metrics for compounding quality** – lacking a standardized evaluation to measure how well the compounded patterns improve downstream model performance. [reference_ai-training_transcript_synthesis].

_Auto-surfaced by `scripts/fill-galaxy-memory-sections.mjs` from existing synthesis + live corpus counts. Idempotent: re-run to refresh. Edit the source memories/synthesis, not this block._

<!-- GALAXY-BRAIN-FILL:END -->

## REMAINING-WORK STATE (verified 2026-06-10, slot:india) — READ FIRST
> **FASTEST regain path: `state/shared/INDIA-CONTEXT-LEDGER.md`** — the curated, ROI-ordered, git-reconciled one-read ledger (the india analogue of DELTA-CONTEXT-LEDGER). Read it FIRST on `/startup-india`; reconcile it on each `/handoff-india`.
> One-read context regain for the next india session. Canonical backlog: `state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md` (8-agent ultracode survey `wf_d6fc4216-b84` + live-code dedup verification). **NET: the AI-systems infra is largely BUILT; the levers are operator/GPU-gated, not more code.**

**DONE / do-not-rebuild (dedup-verified — 4 catches as of 2026-06-10):**
1. **RAG hybrid (dense→lexical)** — LIVE via U-RAG-2 two-stage: `.claude/scripts/tribal-rerank.mjs` cosine recall → `scripts/lib/lexical-rerank.mjs` precision re-score in the inject hooks (`tribal-by-domain-inject.mjs`, `memory-relevance-inject.mjs`), fail-open; PLUS `scripts/lib/hybrid-retrieval.mjs` 4-substrate RRF + `utils/reciprocalRankFusion.ts` (Cormack k=60). 3 would-be dups reverted (rrf-fuse.mjs, tribal-rerank lexical wiring, the double-apply 4th build).
2. **CAG COLD/HOT/HYBRID classifier** (`scripts/lib/cag-router.mjs`) — #2 would only *harden* routing, not new.
3. **Cross-run loop lessons** (`.claude/hooks/handoff-memory-seed-stop.mjs`) — Reflexion episodic memory already carried into the next chat; a per-slot learnings.md would dup it.
4. **Ollama octopus co-residency tuning (#7) — ALREADY DONE** (verified live env 2026-06-10): `OLLAMA_MAX_LOADED_MODELS=4 · NUM_PARALLEL=4 · FLASH_ATTENTION=1 · KEEP_ALIVE=30m · KV_CACHE_TYPE=f16 · CONTEXT_LENGTH=65536 · GPU_OVERHEAD=2GB`. Well-tuned Blackwell config; do not re-build.
- Plus the map's DONE-SKIP block: GNN autonomous retrain lifecycle + node-embedding bridge · GNN selective-deploy τ=0.7 (emitted Brier 0.041, F1 1.0, 32% cov) · 3-of-3 decorrelated judges · capability-probe oracle (`OllamaCapabilityProbeEngine`, live-validated 2026-06-08) · **GNN-calibration-for-Brier = measured DEAD-END (miscalibration 0.0197 of 0.179), do NOT pursue.**

**GENUINE OPEN (india-owned, runnable-now CODE) — NOW BUILT:**
- **#4 GNN active-learning ghost selector — SHIPPED 2026-06-10** (`U-GNN-ACTIVE-POOL-SELECT`, commit `f512700c56` + testfix `b0ae289273`). `scripts/lib/gnn-active-pool-select.mjs`: ranks unlabeled ghosts by acquisition = wU·uncertainty + wB·classRarity (greedy class-diversity re-rank; NO per-node heterophily skip — the direct-embed k-NN is edgeless, that's the future #8 path). Streams ghosts past the V8 string cap (`graph-io.streamGraphArray`); **default direct-embed** (model-mode collapses to a uniform vote). Emits `state/shared/nn-graph/active-label-worklist.{json,md}` seeding `vault-to-gnn-refpool`. WIRED: CLI + `selectFromClassifications` pure seam + fail-soft `refreshActiveLabelWorklist` in `nn-graph-retrain-lifecycle` (fires on not-promoted). 30/30 node:test + 62 lifecycle tests; 3-of-3 PASS. LIVE-validated direct-embed (33 unlabeled / 23 refs / 5 classes). **Do NOT rebuild.** *Payoff still needs operator labels* (then retrain lifts macro-F1 0.439→gate). [[reference_india_commit_own_slot_branch]] note: committed to coherent tree `cad-fusion-live-ms0`, not stale `slot/india`.
- **No clean low-risk runnable-now india CODE unit remains** (matches the map's NET): the value-add levers are now GPU/DATA-blocked (below).

**GPU/DATA-BLOCKED (operator):** #3 rsLoRA r=32-64 16-bit train runs · #4 ref-pool growth *payoff* (needs labeled ghosts) · #8 heterophily LP encoder (gated behind #4 pool growth). All need the Blackwell GPU + operator-supplied labels.
**LOW-priority un-wired:** Qdrant DENSE arm of `hybrid-retrieval.mjs` (separate substrate-fusion path; honestly deferred in RAG-HYBRID v1 pending a precomputed dense index over the tribal corpus).

### NEW AXIS -- dispatcher REACHABILITY of india AI engines (bravo cross-galaxy, 2026-06-11)
> India's survey covered the deploy gate + LoRA training but NOT whether india's AI engines are
> dispatcher-reachable. **bravo** (galaxy_access:all-galaxies, [[feedback_bravo_free_reign_backend_incl_india]])
> ran an ultracode sonnet fan-out (`wf_4ebeaa0f-2cc`) over the 21 dispatcher-DARK AI-net engines -> 8 are
> WIRE_SAFE_DATA. **R12 invariant honored: only deterministic DATA/stats/provenance wired, NEVER NN inference.**
- **SHIPPED:** KnowledgeLineageEngine (`f7ae1ac016`, prism_ai `knowledge_lineage_{report,stats,pending_conflicts}`)
  + LocalEmbeddingEngine (`894be27d1f`, prism_ai `local_embedding_{status,similarity}`; embed() left gated).
- **6 REMAINING WIRE_SAFE_DATA** (IntentClassifier, PolicyExperienceLedger, TransferLearning, TemporalReasoning,
  RealTimeAnomalyDetection, KnowledgeIngestion) + the false-WIRE-EXEMPT / exempt list: durable queue
  `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`. india can finish these or leave to bravo.
- **Resolves an open cross-slot discrepancy:** `SFCInferenceGateWireEngine` is in-process MIDDLEWARE, NEVER
  dispatcher-wired -- [[reference_sfc_inference_gate_wire_la1_2026_06_01]] claiming it's wired via
  `ultimate_speed_feed` is STALE/unmerged on cad-fusion-live-ms0 (grep: zero refs). Confirm + correct that memory.
- **ConsensusModelPerformanceEngine is a build-unblock STUB** (methods throw) -- do NOT wire until real impl lands.

## Standing focus (india-canonical)

1. **NN-GRAPH deploy gate** — AUROC ≥ 0.78, macro-F1 ≥ 0.55, Brier ≤ 0.15. Current state (2026-06-06, direct-embed, live 62-ghost holdout): **AUROC 0.808 ✓, macro-F1 0.439 ✗, Brier 0.179 ✗**. **Calibration is a DEAD END for the Brier gate** — measured: Murphy reliability (miscalibration) is only 0.0197 of the 0.179; best density-matched LOO-CV calibrator 0.178 > 0.15; the residual is refinement loss, not miscalibration. **BUT the tier is DEPLOY-READY-SELECTIVE at the production gate** (`GNN_DEFAULTS.minConf=0.7`): emitted-set Brier 0.041, macro-F1 1.0, 32% coverage, robust — tier-5 abstains below the gate and defers to the LLM tier (textbook risk@coverage). Full-coverage lift path = reference-pool growth (labeled ghosts/class) + sharper features (H2GCN/GPU retrain), **NOT calibration**. See [[reference_gnn_selective_deploy_2026_06_06]] · wiki [[architecture/gnn-selective-deploy]] · `scripts/nn-graph-calibration-analysis.mjs`.
2. **Retrain lifecycle autonomy** — `scripts/nn-graph-retrain-lifecycle.mjs` runs as scheduled task (6h cadence, S4U). Promotes candidate→live IFF gates clear. Never auto-promotes deferred candidates.
3. **LoRA cadence orchestration** — per-domain LoRA stacks (lathe + mill) have dedicated cadence/drift/deployment/monitoring engines. India audits these.
4. **RAG corpus health** — blueprint/CAD/tribal/MIT-OCW/PDF corpora must be re-indexed when underlying source changes (fingerprint discipline).
5. **Model routing = capability-probe oracle** (BLACKWELL-AI-MS0). `OllamaCapabilityProbeEngine` (keystone U-CAP-PROBE) is the single authority for "what local model can run right now" — every AI consumer should pick its local voice from it, never a hardcoded id (the deepseek-r1:14b-not-installed bug class). It exposes `getBestReasoningModel()` / `getBestChatModel()` / `getBestLocalModel(axis)` (U-OCTOPUS-PANEL, 2026-06-08, commit `c1b40183c1`): highest catalog-tier RUNNABLE model (present + fits VRAM + runsOn host), chat-capability gated by TAG (`tags.includes("chat") && !"vision"` — excludes embedders/rerankers/VLMs), null when none → caller MUST fall back to cloud. `MultiModelConsensusEngine.ask()` (the octopus) now consults it for the default voice; explicit `input.ollamaModel` always overrides. BOTH branches are wired: the legacy default-voice branch (`?? probedPrimary ??`, MultiModelConsensusEngine.ts:540/551) AND the diverse-panel branch (`resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds)`, :505-518 — U-OCTOPUS-DIVERSE-PROBE SHIPPED, not deferred). **LIVE-VALIDATED 2026-06-08** (R15-step-3): against the live host the probe returned `runnableModelIds=[qwen2.5-coder:32b, qwen3-vl:8b, gpt-oss:20b]` — correctly EXCLUDING `gpt-oss:120b` (present but VRAM-starved, won't fit free); `getBestReasoningModel`/`getBestChatModel` both → `qwen2.5-coder:32b` (vision-gate dropped qwen3-vl); a direct generate with that pick produced real output (`"READY"`, 84 tok/s, 614ms). **P3 noted (not a defect):** the terminal `?? DEFAULT_OLLAMA_MODEL` (`gpt-oss:120b`, :245/551) is the last hardcoded id; it's reached ONLY when the probe returns null (nothing runnable / probe threw), and `resolveOllamaModels` then list-substitutes it against `installedOllama` and a failed local voice drops out while cloud voices carry consensus — a documented graceful-degrade path (:525-534), so left as-is. Future hardening: when probedPrimary is null, prefer omitting the ollama voice over seating a non-runnable hardcoded model. See [[reference_octopus_live_validation_2026_06_08]]. **Model-retired-but-test-stale** is a regression class here: retiring a model from `DEFAULT_MODEL_CATALOG` silently REDs catalog/default-driven tests — fix the test to the live catalog, never weaken the assertion ([[reference_model_retired_test_stale_2026_06_08]]).

## Known regression classes

- **Heterophily collapse** — uniform neg-sampling produces anti-correlated AUROC on type-marginal-skewed graphs (NN-GRAPH MS1 root cause)
- **Checkpoint promotion race** — concurrent training writes corrupt live checkpoint (mitigated by candidate-file pattern)
- **Stale RAG cache** — corpus changed but RAG cache held; mitigated by source-fingerprint invalidation
- **OOM on 372K-node embed** — bulk embedding requires streaming JSONL reader, not in-memory load
- **Schema-read-blindness** — META tool reading wrong schema version (see [[reference_lintstaged_noop_config_eats_commits]] class)

## Cross-galaxy bridges

- `engines/system-viz/` (sierra) — NN-GRAPH input; sierra's regen sequence affects india's eval
- `engines/cad/` (delta) — CAD classifier feeds AI training corpus
- `engines/tribal-knowledge/` — tribal RAG drives prompt augmentation
- `engines/token-optimization/` (alpha) — alpha audits token cost of AI inference paths
- `engines/post-processor/` (echo) — post-emitted G-code is RL outcome surface

## Wiki cross-refs

- [[architecture/nn-graph-ms0]] · [[ms1]] · [[ms2]] (research-shipped, deploy-gate pending)
- [[architecture/rag-upgrade-ms0]]
- [[lessons/heterophily-collapse-class]]
- [[reference_nn_graph_ms2_u2_2026_05_17]] (autonomous retrain lifecycle)

## Available algorithm primitives (wired by tango, ALGO-SYNERGY 2026-05-29)

Invokable now via `prism_algorithm` — compose these instead of re-deriving the math (PSN leg #8 Engines/Algorithms → this brain):

- **Transformer stack (composition chain, all shipped):** `ml_attention` (ScaledDotProductAttention, single-head operator) → `ml_multihead_attention` (MultiHeadAttention, composes ml_attention per head) + `ml_layernorm` (LayerNormalization) → `ml_transformer_block` (TransformerBlock = MHA + LayerNorm + position-wise FFN + residuals; pre-LN default or post-LN). The block takes weights as input (stateless) — india owns the **stateful inference-engine layer** that holds learned weights and stacks N blocks; these primitives are the math substrate so that engine never re-derives attention/norm/FFN. Identity invariant: zero W_v + zero FFN ⇒ block(x)=x.
- `ml_lowrank` (LowRankApproximation, truncated SVD) — the math core under india's ~95 LoRA engines (low-rank adaptation IS low-rank approximation).
- `ml_pca` (PrincipalComponentAnalysis, composes `ml_lowrank`) — feature dim-reduction.
- `ml_knn` (KNearestNeighbors, cosine/euclidean/manhattan; search/classify/regress) — RAG retrieval core.
- `ml_gmm` (GaussianMixtureModel, EM soft clustering) — probabilistic cluster assignment with per-point confidence.
- `ml_viterbi` (exact MAP) + `ml_beam_search` (BeamSearchDecoder, n-best top-K) — sequence decoding for deep-reasoning hypothesis enumeration; beam is the large-vocab/approximate companion to exact Viterbi.
- `graph_heterophily_aggregate` (HeterophilyAwareAggregator, H2GCN ego/neighbour-sep) — **the documented model-side lever for the NN/GNN deploy gate (AUROC 0.096 heterophily)**; feeds richer features into the GraphSAGE pipeline.

Batch detail: `reference_tango_algo_synergy_batch_2026_05_29` · wiki [[architecture/algo-synergy-ml-batch]].

— Established 2026-05-28 by slot:alpha claude-168624b9 (india-pending).

## Karpathy agent discipline (applies to this galaxy)
This galaxy's AI operates under Andrej Karpathy's two frameworks — full card: [[karpathy-agent-discipline]] (`knowledge/wiki/architecture/karpathy-agent-discipline.md`).
- **CLAUDE.md-as-agent-OS (6 workflow principles):** Plan-mode first · Verify relentlessly (stay in the loop) · Keep it simple (100 lines > 1000) · Surgical edits only · Goal-driven (give success criteria, let it iterate) · Parallelize with subagents (one task each, merge with judgment). Core: Simplicity First · No Laziness (root causes) · Minimal Impact (no side effects/new bugs).
- **Knowledge = a system, not RAG (LLM-Wiki):** this MEMORY.md IS this galaxy's LLM-wiki node — compound it (Concepts/Entities/Insights/Connections via [[wikilinks]]), query before re-deriving, stay consistent, get smarter over time. "RAG is broken — build a knowledge system."
_Applied fleet-wide 2026-06-02 (operator directive). PRISM embodiment: global CLAUDE.md §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13 + §PRISM WIKI._

## Authoritative free-source corpus (papa 2026-06-09, GALAXY-ENRICH)
Pull-fresh-on-demand EXTERNAL knowledge for ai-training (keeps this domain non-stagnant; complements internal CRITICAL-RESOURCE-ROOTS). Full per-galaxy index: `state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md` (15 sources: T1=12/T2=0/T3=3). Top primary:
- [Hu, Shen, Wallis, Allen-Zhu, Li, Wang, Wang, Chen — *LoRA: Low-Rank Adaptation of Large Language Models*](https://arxiv.org/abs/2106.09685)
- [rsLoRA — *A Rank Stabilization Scaling Factor for Fine-Tuning with LoRA*](https://arxiv.org/abs/2312.03732)
- [DoRA — *Weight-Decomposed Low-Rank Adaptation*](https://arxiv.org/abs/2402.09353)
Deep cited domain research (UNVERIFIED -- india verifies vs source before any live engine/doctrine use): `knowledge/wiki/ai-training/_staging/deep-domain-research-2026-06-09.md`. R12: source pointers verifiable; physics/cost claims owner-gated. Regen: `scripts/build-galaxy-free-source-corpus.mjs`.

<!-- AI-SYSTEMS-STATE:BEGIN -->
## AI-systems fleet state (synergy pointer)
> Live fleet AI-systems state -- GNN selective-deploy, octopus consensus, RAG/CAG, Ollama
> offload, AI-synergy -- is persisted at `knowledge/memories/patterns/ai-systems-fleet-state.md`
> (recall-discoverable; this galaxy's reasoning-bridge + CAG already consume it). Regenerate:
> `node scripts/ai-systems-fleet-state.mjs`. Synergy: [[reference_ai_systems_fleet_state_2026_06_11]]
> - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] - [[zulu-ledger-reconciler]].
<!-- AI-SYSTEMS-STATE:END -->
