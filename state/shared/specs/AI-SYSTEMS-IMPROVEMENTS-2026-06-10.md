# AI-Systems Improvements — ranked plan (slot:india, 2026-06-10)

> Produced by the `ai-systems-improvement-survey` ultracode Workflow (run `wf_d6fc4216-b84`,
> 8 agents: 2 survey + 5 parallel web-research + 1 synthesis; 1.28M subagent tokens, 400s).
> Operator goal: "apply everything we've learned about AI systems (CAG/RAG/LoRA/loops/
> harnesses/self-improving/obsidian-brain) + find additional resources, ultracode + parallel
> agents + Ollama, Blackwell-aware, across all galaxies." This is the "find additional
> resources" deliverable. **Advisory** — verify each path before building (the synthesis
> already flagged path errors; see Honesty flags).

Target HW: RTX PRO 6000 Blackwell 96GB + Ryzen 9950X3D 32T + 136GB RAM + NVMe.

## Ranked improvements (ROI order)

### 1. [TOP-PICK] Hybrid BM25+dense -> RRF -> cross-encoder rerank in front of the dense-only RAG path
- **Mechanism:** RAG. **ROI/effort:** High / M. **Runnable NOW** (CPU BM25 + existing embeddings; cross-encoder optional on GPU).
- **Files:** dense-only rerank lives in `.claude/scripts/tribal-rerank.mjs` (verified) over sidecars read by `scripts/lib/load-tribal-index.mjs` (verified). Add `scripts/lib/rrf-fuse.mjs` (new) fusing a BM25 lexical pass with the dense pass on **ranks (Reciprocal Rank Fusion), not raw scores**, then cross-encoder reranks top-K. Wire into `tribal-rerank.mjs` + the recall injectors (`memory-relevance-inject.mjs`, `tribal-by-domain-inject.mjs`).
- **Why #1:** dense-only systematically misses rare tokens (SKUs, E-codes E952/E56xx, G-codes, alarm/part numbers) that dominate PRISM's manufacturing corpus; BM25 nails those. Hybrid lifts DPR recall 48.7->53.4%, nDCG@10 43.4->52.6. Improves EVERY recall injector that fires on every prompt across all 26 slots; zero data-block, no operator dependency.

### 2. Per-query CAG/RAG/hybrid Self-Route classifier hardening (gate on hit-ratio + reasoning-hops)
- **Mechanism:** CAG+RAG. **ROI/effort:** High / S. **Runnable NOW.**
- **Files:** `scripts/lib/cag-router.mjs` (verified) already classifies COLD/HOT/HYBRID. Extend to Self-Route: bounded lookup -> CAG cached prefix; large/fresh/attribution -> RAG; 3+ hops -> hybrid. Add a measured **hit-ratio guard** (CAG cached-prefix only wins above ~30% reuse; below it the +25% write premium is a net tax). Surface ratio via `scripts/ollama-offload-dashboard.mjs`.
- **Note:** the ~92KB static-doctrine prompt-cache must stay BYTE-IDENTICAL before the changing query block or cache invalidates every turn.

### 3. rsLoRA r=32-64 at 16-bit, target all attention+MLP projections
- **Mechanism:** LoRA. **ROI/effort:** High / M. **Needs GPU for train runs** (corpus assembly runnable now). **Blackwell: HIGH.**
- **Files:** the trainer consumer of `vault-to-lora-dataset.mjs` + `assemble-fleet-lora-corpus.mjs`; actual trainer in per-domain LoRA engines (`LatheLoRA*`/`MillLoRA*` flat in `mcp-server/src/engines/`). Change: `use_rslora=True`, r=32(SFT)->64(coding), alpha=2*r, target q/k/v/o/gate/up/down_proj, LR 2e-4 cosine ~3% warmup, 2-3 epochs, eff batch 16-64, **16-bit not 4-bit QLoRA** for <=32B. 96GB removes the reason to stay low-rank/4-bit.

### 4. Active-learning the GNN reference pool (uncertainty+diversity+class-balance)
- **Mechanism:** GNN. **ROI/effort:** High / M. **DATA-BLOCKED + operator** (needs labeled ghosts).
- **Files:** `scripts/lib/nn-graph-eval.mjs` (verified) builds holdout; `scripts/nn-graph-retrain-lifecycle.mjs` (verified) cadence. New `scripts/lib/gnn-active-pool-select.mjs` (GALAXY-style uncertainty + SAG pairwise dis/similarity, skip hostile-heterophily nodes) feeding the ref-pool `scripts/vault-to-gnn-refpool.mjs` seeds.
- **Root cause:** `insufficient-reference-pool`, AUROC 0.808 OK / macro-F1 0.439 below gate. **Label-starved, not architecture-starved.** Calibration is a measured DEAD-END (miscalibration 0.0197 of 0.179 Brier). This is the real #9 lever.

### 5. Cross-episode persistent learnings.md for agentic loops (Reflexion episodic memory)
- **Mechanism:** agentic-loop. **ROI/effort:** Med-High / S. **Runnable NOW.**
- **Files:** `.claude/hooks/loop-iteration-inject.mjs` + `.claude/helpers/loop-state.mjs` (verified). Add a persistent cross-run per-slot learnings.md (write at loop end, read at start) so failure-mode lessons accumulate across /compact + reboots. Ride the existing Obsidian Stop-feed (`stop-obsidian-memory-feed.mjs`). **Safety:** loop memory writes are an attack surface ("misevolution") -- gate behind the review path.

### 6. Split deterministic "computational sensors" from "inferential sensors" -- gate cheap-first
- **Mechanism:** agentic-loop/harness. **ROI/effort:** Med / S. **Runnable NOW.**
- **Files:** the 3-of-3 Stop gate (`.claude/hooks/scrutinize-before-stop.mjs` + `.claude/scripts/scrutiny-3way.mjs`). Run deterministic sensors (lint / `npx vitest run` / schema / units-guard) and gate BEFORE any LLM-judge arm fires. The judges are already decorrelated (Huang ICLR-2024); the gap is ORDERING not diversity.

### 7. vLLM Sleep Mode (or tuned Ollama co-residency) for the octopus consensus loop
- **Mechanism:** local-serving. **ROI/effort:** Med / M (Ollama env tune = S). **Runnable NOW (env)**; operator for vLLM. **Blackwell: HIGH.**
- **Files:** `MultiModelConsensusEngine.ask()` + `OllamaCapabilityProbeEngine` (names from survey, .ts not opened). (a) Ollama: `OLLAMA_MAX_LOADED_MODELS`, `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KEEP_ALIVE` tuned to octopus cadence to stop LRU evict-reload churn. (b) vLLM Sleep Mode: warm sub-second 32b<->120b<->20b switching. Set gpu_memory_utilization 0.70-0.80 (NOT 0.90); gpt-oss:120b ~64GB leaves little headroom -> FP8 the co-resident 32b.

### 8. Heterophily-aware encoder + learnable decoder for GNN link-prediction (replace dot-product)
- **Mechanism:** GNN. **ROI/effort:** Med / L. **DATA-BLOCKED + GPU** (gated behind #4). **Blackwell: HIGH.**
- **Files:** `scripts/lib/graphsage-trainer.mjs` + `scripts/lib/graphsage-train-pipeline.mjs` (verified). Separated node embeddings + learnable decoder (LP under heterophily needs this, not dot-product); GPR-GNN/GRAFF-LP baselines; optional PolyGCL/HeterGCL unsupervised pretrain on the 676MB graph. Per `feedback_multiseed_before_auroc_claim`: require >=3 seeds before any AUROC claim.

## [DONE-SKIP] Already shipped (do not rebuild)
- CAG COLD/HOT/HYBRID classifier + ephemeral prompt-cache (`cag-router.mjs`) -- #2 only HARDENS it.
- vault->LoRA Alpaca pipeline (`vault-to-lora-dataset.mjs`, `assemble-fleet-lora-corpus.mjs`, `audit-galaxy-ai-coverage.mjs`) -- this session.
- GNN autonomous retrain lifecycle + node-embedding bridge.
- GNN selective-deploy at tau=0.7 (Brier 0.041, F1 1.0 emitted set) -- abstain-and-defer done.
- Decorrelated multi-judge verification (3-of-3 + Codex + Ollama advisory).
- Octopus model-routing oracle (`OllamaCapabilityProbeEngine`, live-validated 2026-06-08).
- GNN calibration for Brier -- measured DEAD-END, do NOT pursue.

## Honesty flags (from the synthesis)
- `nn-graph-eval.mjs` is at `scripts/lib/nn-graph-eval.mjs` (survey path was wrong).
- `ai-upgrade-broadcast.mjs` does NOT exist fleet-wide -- no recommendation depends on it.
- LoRA trainer hyperparameters (#3) + `MultiModelConsensusEngine.ask()` API (#7) cited from survey by NAME; the `.ts` files were not opened -- confirm the "vanilla r=8/16" baseline before tuning.

## DEDUP CORRECTION (post-survey verification, slot:india 2026-06-10) -- READ THIS BEFORE BUILDING
The survey agents MISSED existing infrastructure, so the rankings overstate what is "not done". Verified against live code:
- **#1 TOP-PICK is LARGELY ALREADY BUILT.** `scripts/lib/hybrid-retrieval.mjs` (PSN-ENHANCE-MS0/U-PSN-HYBRID-RETRIEVAL-WIRE) ALREADY composes 4 substrates (memory-index BM25 + master-index graph BM25 + episode predicate + **Qdrant dense vector**) and fuses by **RRF (Cormack k=60)** with an Ollama-embeddings dense arm. `utils/reciprocalRankFusion.ts` (RAG-HYBRID v1, 2026-05-30) is the pure RRF utility + `prism_ml:rag_search_rerank`. A standalone `rrf-fuse.mjs` was started this iter and DELETED as a triple-dup (R8). **Do NOT build a new RRF.**
- **CORRECTION 2 (2026-06-10, deeper verify): the TOP-PICK is FULLY DONE -- the lexical improvement already exists at the CORRECT layer.** `tribal-rerank.mjs` IS dense-only (cosine + 2x domain boost) -- but that is stage-1 RECALL by design. U-RAG-2 (RAG-UPGRADE-MS0) already ships `scripts/lib/lexical-rerank.mjs` (pure, no-model, sub-ms) and the inject hooks (`tribal-by-domain-inject.mjs`, `memory-relevance-inject.mjs`) ALREADY do TWO-STAGE retrieval: tribal-rerank cosine = stage-1 (fetch STAGE1_K candidates), `lexicalRerank` = stage-2 (lexical precision re-score), fail-OPEN. So the dense->lexical hybrid the TOP-PICK proposed is LIVE fleet-wide at the hook layer. Adding lexical fusion INSIDE tribal-rerank would DOUBLE-APPLY lexical scoring (worse architecture) -- a would-be 4th-dedup build, caught + reverted before commit. **The RAG axis is fully wired. Nothing to build.** (The only un-wired thing is the Qdrant DENSE arm of `hybrid-retrieval.mjs`, which is a SEPARATE substrate-fusion path from the tribal injectors, and its dense arm was already honestly deferred in RAG-HYBRID v1 pending a precomputed dense index -- a different, lower-priority track.)
- **Trust caveat:** because the survey missed the above, RE-VERIFY each remaining item against live code before building (esp. #2 cag-router self-route -- `cag-router.mjs` already classifies COLD/HOT/HYBRID; #6 cheap-first sensors -- the scrutiny gate ordering).
- **#5 (cross-episode loop learnings) is ALSO ALREADY COVERED (verified 2026-06-10):** `.claude/hooks/handoff-memory-seed-stop.mjs` already carries "recent error events + just-shipped Obsidian memos + wiki code-tribal learnings" into the NEXT chat (cross-run Reflexion-style episodic memory; observed live in this session's startup payload as "Recent error signals (avoid repeating)"). The Obsidian Stop-feed + reference_* memories compound it. A new per-slot learnings.md would DUPLICATE this. Do NOT build it.

## TRUE REMAINING WORK (after live-code verification, 2026-06-10)
The ranked list above is mostly **already-covered** -- PRISM is a mature system; an incomplete survey over-reports gaps. Verified status:
- **ALREADY BUILT/COVERED (do not rebuild):** #1 RAG hybrid -- the dense->lexical improvement is LIVE via U-RAG-2 two-stage (`tribal-rerank.mjs` cosine recall -> `scripts/lib/lexical-rerank.mjs` precision rerank in the inject hooks), PLUS `hybrid-retrieval.mjs` 4-substrate RRF + `reciprocalRankFusion.ts`; #2 CAG classifier (`cag-router.mjs`, #2 only *hardens* routing); #5 cross-run lessons (`handoff-memory-seed-stop.mjs`); plus the DONE-SKIP block. Three would-be dups caught + reverted (rrf-fuse.mjs, the tribal-rerank lexical wiring).
- **The only un-wired RAG track (LOW priority, NOT the TOP-PICK):** the Qdrant DENSE arm of `hybrid-retrieval.mjs` (a separate substrate-fusion path from the tribal injectors) was honestly deferred in RAG-HYBRID v1 pending a precomputed dense index over the tribal corpus. Optional; the live injectors already have dense (cosine) + lexical two-stage.
- **GENUINE but GPU/DATA-BLOCKED (operator):** #3 rsLoRA r=32-64 16-bit train runs; #4 GNN active-learning ref-pool growth (the real #9 lever -- label-starved, NOT calibration); #8 heterophily encoder (gated behind #4 pool growth). All need the Blackwell GPU + operator-supplied labels.
- **MAYBE (verify first):** #6 cheap-first scrutiny-sensor ordering (`scrutinize-before-stop.mjs`) -- fleet-wide Stop gate, golf/system domain not india; #7 Ollama co-residency env-tuning (`OLLAMA_MAX_LOADED_MODELS`/`OLLAMA_FLASH_ATTENTION`) -- low-risk env change, but verify current octopus config first.
- **NET:** no clean low-risk runnable-now india code unit remains; the value-add items are operator/GPU-gated or fleet-wide-careful. The honest "no dormant nodes" conclusion: the AI-systems infra is largely BUILT; the lever is operator-supplied GPU train runs + GNN labels, not more code.

## Application order (india loop)
iter 8 = TOP-PICK core: build `scripts/lib/rrf-fuse.mjs` (pure RRF, hermetically tested) BEFORE wiring (R13 -- verifiable core first; `tribal-rerank.mjs` is a live PSN-leg-#5 surface firing every prompt fleet-wide, so its wiring is a separate careful step). iter 9 = wire RRF into tribal-rerank + recall injectors. Then #2 (CAG self-route, S), #5 (loop learnings.md, S), #6 (cheap-first sensors, S) -- all runnable-now. #3/#4/#8 GPU/data-blocked (operator).
