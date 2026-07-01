---
name: reference_ai_systems_6unit_complete_2026_06_11
description: "The /goal \"improve ai systems (deep-reasoning/nn/gnn/lora/cag+rag+hybrids) across all galaxies\" -- 6 code-completable units shipped + scrutiny-passed (slot:charlie, 2026-06-11). Only the GPU AUROC/LoRA training RUNS remain (lifecycle now feeds them richer input)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.464Z
aliases: reference_ai_systems_6unit_complete_2026_06_11
---


Slot:charlie, /goal "improve ai systems, deep learning, deep reasoning, nn, gnn, lora, cag + rag + hybrids across all galaxies + synergize with vault/hermes/psn". Shipped a generic, build-once-for-all-34-galaxies AI stack on the galaxy reasoning bridge, each unit 3-of-3 scrutiny PASS + live-validated:

1. **deep-reasoning** -- `galaxy-reasoning-bridge.mjs` live-validated for all 34 galaxies (19fafee8b1); registry `GALAXY-AI-BRIDGE-REGISTRY.json` 34/34.
2. **RAG (sparse)** -- per-question retrieval over each galaxy's doctrine corpus; `galaxy-context-retrieval.mjs` REUSES `lexical-rerank` (aa45a70d9a).
3. **RAG hybrid (dense)** -- `galaxy-dense-rerank.mjs`: embed top-M (nomic-embed-text 768d) -> cosine -> RRF-fuse (REUSES `hybrid-retrieval.rrfMerge`); off by default `PRISM_GALAXY_RAG_DENSE=1` (caa0c29cb8 + c773d1af96).
4. **CAG** -- `galaxy-cag-cache.mjs`: answer cache keyed by (galaxy,model,question), corpus-fingerprint-invalidated (never stale), live 2ms hit (d65aa580c0).
5. **LoRA self-improvement** -- `galaxy-lora-emit.mjs`: every grounded reason -> an Alpaca {instruction,input,output} pair to a per-galaxy dataset; REUSES `redact-secrets`; opt-in `PRISM_GALAXY_BRIDGE_LORA_EMIT=1` (e165c015a7).
6. **NN/GNN node-features** -- `galaxy-node-embedding-row.mjs` + `build-galaxy-node-embeddings.mjs`: mints 768d node-features for all 34 `ghost.galaxy.<g>` roosts (the GNN's `node-embeddings-768d.jsonl` covered 0 galaxy nodes); REUSES india's `aggregateEmbeddings`/`quantizeInt8`; ADDITIVE merge (never drops the base 771 rows); **WIRED into `nn-graph-retrain-lifecycle.mjs`** (regenerated before each retrain, fail-soft) so it is not transient. Live: trainer's `loadEmbeddingFeatures` reads all galaxy rows dim=768 |v|~1.0 (c9ea46b9f1). Operator-authorized cross-galaxy build into india's pipeline.

**What's NOT done (honest):** the actual GPU AUROC retrain + LoRA model training are multi-hour training RUNS, not code -- they execute on india's scheduled lifecycle, which now consumes the richer galaxy node-features + the growing LoRA dataset this work feeds. The substrate is improved; the training run is india's GPU step.

**VALIDATE result (2026-06-11, unit #6, HONEST):** running the retrain to validate unit #6 surfaced + fixed a heap-OOM regression in `nn-graph-retrain-lifecycle.mjs` (HEAP-FIX-1/2/3, commits 8d6a481080 + 15123dff67 + the helper/execArgv pass): the lifecycle ran the eval + base-embedding builds IN-PROCESS (each loads the ~550MB graph) on the DEFAULT heap -- only the spawned trainer had `--max-old-space-size`; both the lifecycle proc and the step-2c galaxy-embed child OOM'd. Fixed via a self-reexec heap bump (pure `shouldReexecForHeap`/`hasHeapFlag`/`nodeArgsWithHeap`, 57/57 tests, 3-of-3 PASS). Post-fix the retrain RAN to completion (EXIT 0, 0 OOM). RESULT: **AUROC 0.40 / macro-F1 0.14 / Brier 0.25 on the 6000-node capped subgraph -- BELOW the 0.78 gate, correctly NOT promoted** (live checkpoint stays at the prior 0.096). The 34 galaxy node-features added COVERAGE (trainer `embedding 768d hit=6000 miss=0`, source now 805+ rows incl all 34 `ghost.galaxy.<g>`) but did NOT lift the gate -- consistent with the known link-pred-pretext variance + the selective-deploy framing (gate-clearing needs reference-pool GROWTH, not node-features alone). Lesson: a script that spawns a heap-bumped child but ALSO does heavy work in-process needs the bump on the parent too -- a self-reexec fixes every launch path (ad-hoc + scheduled) at once. See CLAUDE.md `## Recent regressions` 2026-06-11.

Lessons: a 6-agent hermes Workflow caught a real R8/dedup (don't hand-roll BM25 when `lexical-rerank` exists); ENOSPC (C: full) halted mid-session, recovered by the reaper. Pattern: improve an AI subsystem's INPUT/SUBSTRATE (node-features, training data, retrieval context) as the code-completable complement to the GPU training run. Related: [[feedback_metric_to_1_honestly]] · the wiki [[ai-synergy-audit-ms0]].
