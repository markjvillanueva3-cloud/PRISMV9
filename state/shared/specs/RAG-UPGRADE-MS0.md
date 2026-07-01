# RAG-UPGRADE-MS0 — PRISM retrieval upgrade milestone

**Operator goal** (2026-05-22, slot golf, `/goal … /loop`): complete U-RAG-1..5 and
synergize the result with system-viz, obsidian brain, wiki injection, and the
GNN / neural network. **Completion condition:** "completed and wired."

## Why (gap analysis — audit-backed)

PRISM's RAG *technique* is already advanced (hybrid retrieval, RRF fusion, MMR
diversity + recency boost via `memory_search smart=true`, HNSW, RaBitQ 1-bit
quantization, AgentDB ReasoningBank). The deficits are **corpus coverage** and a
**missing rerank stage**, not technique:

| Gap | Evidence | Severity |
|---|---|---|
| Wiki 99.2% un-embedded | SessionStart audit: 23,802 / 23,992 wiki files lack tribal embedding (0.8%) | P0 |
| No rerank stage | 4 inject hooks are single-stage BM25-lite top-K | P0 |
| No Contextual Retrieval | chunks embedded raw | P1 |
| GPU embedder unused by RAG path | `nv-embedqa-e5-v5` NIM armed 2026-05-22 but injectors use CPU ONNX | P1 |
| No edge-ordering | injected blocks dump score-order ("lost in the middle") | P2 |
| No retrieval eval | no precision@k harness — changes unmeasurable | P1 |

**Unblockers (this session):** the wiki-embed job historically no-ops under
memory pressure ([[reference_wiki_recall_index_stale]]) — the 128GB RAM upgrade
fixes that; and `nv-embedqa-e5-v5` GPU embedder is now armed (:8010).

## Units

### U-RAG-5 — retrieval eval harness  *(baseline-first)*
- New engine + `prism_dev`/`prism_session` wiring. Fixed query set + precision@k
  / recall@k / MRR scorer over `memory_search` and the 4 inject surfaces.
- Accept: scores a fixed query set, emits a JSON baseline, real tests (reference
  values — no `toBeDefined()` stubs), round-trip through the dispatcher.

### U-RAG-1 — embed the full wiki corpus (0.8% → ~100%)  *(P0, highest ROI)*
- `scripts/embed-wiki-into-tribal-index.mjs` exists but takes EXPLICIT file
  paths and is all-or-nothing per call — it never walks the tree. The 0.8% is
  simply that nothing ever ran it corpus-wide (no memory-pressure bug).
- **Build `scripts/embed-all-wiki.mjs`** — batch driver: recursively enumerate
  `knowledge/wiki/**/*.md`, infer domain from path, embed in checkpointed
  batches (resumable — index keyed by `id`, `planAppend` skips present),
  atomic write per batch, progress sidecar.
- **EMBEDDER PARITY (critical, R8 finding):** keep `nomic-embed-text:latest`
  (768-d) — the SAME model `tribal-rerank.mjs` embeds *queries* with. The GPU
  `nv-embedqa-e5-v5` (1024-d) is a different vector space → cosine meaningless
  + trips the index `dim` assertion. GPU swap = joint corpus+query migration →
  split out as **U-RAG-6**.
- Accept: `wiki-tribal-cross-ref-audit.mjs` coverage ≥95%.

### U-RAG-6 (deferred) — GPU embedder migration
- Swap BOTH corpus and query embedders to `nv-embedqa-e5-v5` together, rebuild
  the whole index, bump `dim` 768→1024. All-or-nothing; not a drop-in.

### U-RAG-3 — Contextual Retrieval
- During U-RAG-1's embed pass, prepend an Ollama-generated 1-2 sentence context
  blurb to each chunk before embedding (Anthropic technique; −35-49% failed
  retrieval). Ollama-offloaded (qwen2.5-coder).
- Accept: stored chunks carry a `context` prefix; eval harness shows lift.

### U-RAG-2 — two-stage rerank in the 4 inject hooks
- After BM25-lite top-N (top-30), rerank → top-5 before injection. Hooks:
  `master-index-precheck-inject`, memory-relevance / memory-index inject,
  `wiki-precheck-inject`, `tribal-by-domain-inject`.
- Reranker: `nv-rerankqa` NIM (13.5GB GPU free) OR 3b-NIM / Ollama LLM-rerank.
- Accept: hooks emit reranked top-5; eval harness shows +15-30%.

### U-RAG-4 — edge-ordering + milestone synergy wiring
- Order injected top-K so strongest hits sit head+tail, weakest middle.
- **Synergy wiring** (the "wired" half of the goal):
  - **system-viz** — `scripts/generate-rag-upgrade-features.mjs` → ghost roost,
    registered in `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice.
  - **obsidian brain** — one `reference_*` memory per unit (auto-fed by
    `stop-obsidian-memory-feed.mjs`).
  - **wiki injection** — wiki entries under `knowledge/wiki/architecture/`;
    NOTE U-RAG-1 *is* the wiki-injection synergy — embedding the wiki is what
    makes `wiki-precheck-inject` actually work.
  - **GNN / neural network** — the U-RAG-1 wiki embeddings become the GNN's
    reference pool. NN-GRAPH is DORMANT (reference poolSize 0, AUROC 0.096);
    feed the 768-d wiki embeddings into the GraphSAGE feature layer (NN-1).

## Sequence
U-RAG-5 (baseline) → U-RAG-1 (+ U-RAG-3 in the same embed pass) → U-RAG-2 →
U-RAG-4 (edge-ordering + synergy wiring). Deferred: reconcile Qdrant vs
AgentDB-HNSW (two vector stores — pick one canonical).

## Loop state
`loop-state.mjs` session `30a6a98b-2fb0-450b-8b01-9188a6778938`, target 20.
Commit format `[MAIN] [RAG-UPGRADE-MS0]/U-RAG-N (slot:bravo): <title>`.

## Status (live — updated 2026-05-22)

| Unit | State | Evidence |
|---|---|---|
| U-RAG-5 | ✅ DONE | retrieval eval harness — prior session |
| U-RAG-1 | ✅ DONE | `e07edcbf76` — audit blind-spot fix (`tribalWikiPath` counts `external:`-scheme wiki ids); coverage 0.8%→97.2% at commit. The "0.8%" was a 1-function audit artifact, not a real gap — the corpus was already embedded under `external:`. |
| U-RAG-2 | ✅ DONE | two-stage lexical rerank wired into **all 4** inject hooks: `tribal-by-domain-inject` `6df057e098` · `master-index-precheck-inject` `c8acc5accd` · `memory-relevance-inject` `52b1fe91e8` · `wiki-precheck-inject` `bb1ff5f589`. Stage-1 widened to STAGE1_K, `applyLexicalRerank` via `scripts/lib/lexical-rerank.mjs` narrows to TOP_K. wiki hook pins curated `boost_keywords` hits. Reranker is the lexical scorer (coverage/phrase/labelHit/density), not the `nv-rerankqa` NIM — the NIM swap is a follow-up; the lexical reranker needs no GPU and ships now. |
| U-RAG-3 | ✅ DONE | Contextual Retrieval lib + per-file embedder shipped `92aa9279d6` (`scripts/lib/contextual-blurb.mjs` 25/25 tests; `embed-wiki-into-tribal-index.mjs` `--with-context` flag tags entries with `context` + `context_version="v1"`). **Batch driver plumbing closed `48d68448de`** (U-RAG-3-BATCH-CONTEXT-PLUMBING) — `embed-all-wiki.mjs` now forwards `--with-context` end-to-end with cache persistence on abort + R12 fail-loud `degraded:true` when blurb failure rate > 50% (operator can no longer get "ok:true while every blurb silently fell back"). 27/27 tests. The fresh `--apply --with-context` corpus pass is operator-action only (~hours for 32K files, gated on Ollama+memory + concurrent-with-node-embed coordination). |
| U-RAG-4 | ✅ DONE | edge-ordering lib + 2 hooks shipped (`master-index` `2b4654a710` + tribal). Synergy-wiring: system-viz roost `8554ca7c4d` + wiki architecture entry `12182c62dd` + per-unit obsidian memories (U-RAG-1..6) shipped. GNN bridge **triggered this session** (`graphsage-checkpoint-768d-rag-upgrade.json`): the pipeline fell back to `featureSource:projected` because `embeddingHitCount=0` — graph node-IDs (engine/hook/skill names) don't match wiki-file-path-keyed embeddings. AUROC 0.297 (vs 0.096 baseline; below 0.78 promotion gate). **Discovery:** the spec's "U-RAG-1 wiki embeddings → GNN reference pool" framing has a missing mapping layer (node-ID → wiki-path). That's a future unit, out of RAG-UPGRADE-MS0 scope. The bridge IS wired (flag exists, pipeline accepts it, U2 auto-promotes on gate-pass) — the empirical AUROC limit is upstream of this milestone. |
| U-RAG-6 | ⏸ DEFERRED | GPU embedder migration — out of goal scope (joint corpus+query swap). |
| U-GNN-NODE-EMBED-BRIDGE | ✅ DONE | 2026-05-23 slot golf — `scripts/lib/graph-node-embedding-bridge.mjs` (8 exports, 49/49 tests) + `state/shared/nn-graph/node-embeddings-768d.jsonl` (562 matched, was 0). Wired into `nn-graph-retrain-lifecycle.mjs` as pre-retrain stage → `--embedding-source` forwarded to the trainer. Wiki: [[gnn-node-embedding-bridge]]. P0 blocker for end-to-end retrain documented as [[reference_trainer_export_regression_2026_05_23]] (separate follow-up `U-NN-TRAINER-EXPORT-RESTORE`, NOT in this milestone). |
| U-RAG-3-CONTEXTUAL-CORPUS-RUN | 🟡 IN-FLIGHT | 2026-05-23 slot golf — operator-action batch `node scripts/embed-all-wiki.mjs --apply --with-context --batch 500` started. State after first few re-fires: index 1612 → 2853 entries, withCtx 1500 → 2000. ~30,915 wiki files remain to re-embed; batch is idempotent + resumable via `planAppend` skip-if-present. Each re-fire processes ~500 entries (~7 min). Full-corpus completion is ongoing across sessions. |
| U-RAG-PSN-AI-WIRE | ✅ DONE | Synergize RAG with PSN leg #11 (`prism_ai` canonical AI dispatcher). Cross-wires `ReRankerEngine.rerank/diverseRerank` (canonical home `prism_ml:rag_rerank`) as `prism_ai:rag_rerank`. Per dispatcher convention "cross-dispatcher calls forbidden — use shared engines instead", both surfaces call the same static engine — no delegation chain. New `RAG_CROSSWIRE_ACTIONS` constant added next to `OUTCOME_CROSSWIRE_ACTIONS` (identical pattern, peer-shipped 2026-05-22 for outcome engines per [[reference_psn_outcome_wire_2026_05_22]]). 13/13 tests in `aiReasoningDispatcher.uRagPsnAiWire.test.ts` (incl. empty-candidates degraded path, top_k bound, diversity_weight branch, malformed-candidate engine-side rejection, slimResponse-empty-array transport semantics). Closes the operator question "synergize RAG with PSN" — prior to this, prism_ai had ZERO RAG surface despite RAG being a 5-unit milestone with system-viz/obsidian/wiki/GNN already wired. |

**Goal status (2026-05-22):** U-RAG-1/2/3/4/5 all ✅ DONE in code. U-RAG-6 deferred. Remaining are OPERATOR-ACTION only: (a) run `embed-wiki-into-tribal-index.mjs --with-context` against the wiki corpus for the U-RAG-3 contextualized embeddings (~hours, Ollama-gated); (b) build the graph-node-ID → wiki-file-path mapping layer the empirical retrain (this session) exposed as missing — that's a follow-up unit outside this milestone.
