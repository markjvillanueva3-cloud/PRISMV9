# PATHWAY-COORDINATION-MS0 — india ↔ alpha knowledge-pathway plan

> **Status:** PROPOSAL (india-drafted 2026-05-31, slot india `claude-05ceb444`). **Needs alpha sign-off** on the legs + decisions alpha owns — see §5 + §6. Not a unilateral commitment of alpha's work; the recall/brain-side claims here are india's read and are marked _(confirm: alpha)_.
> **Trigger:** operator — *"coordinate with alpha to plan out the pathway building."*
> **Owners:** india = ai-training (corpus→embedding→RAG-recall→reasoning). alpha = Obsidian brain / per-chat memory / master-index / hybrid memory recall / brain-refresh orchestrator.

## 1. What "the pathway" is

The end-to-end **knowledge lifecycle** every PRISM galaxy depends on — raw knowledge flows through staged transforms into recall + reasoning, and must be kept fresh (no silent staleness, no cross-space corruption):

```
L1 resource roots → L2 index → L3 embed → L4 recall/fusion → L5 brain integration → L6 reasoning/action
   (raw)             (BM25)     (vectors)   (BM25+dense+RRF)    (galaxy brain ↔        (NN-GRAPH, RAG-
                                                                 master-index)          grounded reason, loop)
```

"**Pathway building**" = jointly owning these legs end-to-end so the seam between india's embedding/RAG substrate and alpha's memory/brain-recall substrate is **explicit, non-duplicative, and resilient** (esp. when Ollama is down — as it has been all of 2026-05-30/31).

## 2. The six legs — owner · status · why · depends · blocks

| Leg | What | Owner | Status | Depends on | Blocks |
|-----|------|-------|--------|-----------|--------|
| **L1 Resource roots** | H:/PRISM/{resources, JM DIE, Docustrata} + per-root deep index (root+index, never re-OCR) | juliett | **SHIPPED** (U-RESOURCE-ROOTS-WIRE, `CRITICAL-RESOURCE-ROOTS.json`, 34 galaxies wired) | — | L2 |
| **L2 Index** | BM25/TF-IDF: tribal `TRIBAL_RAG_INDEX.json` (india/RAG); memory BM25 index (alpha) | shared | SHIPPED (both) | L1 | L3, L4 |
| **L3 Embed** | corpus → vectors under the {model,dim} **contract**: india `config/embeddingContract.ts` SSOT (nomic-768 canonical + minilm-384 dense) + `build-tribal-dense-index.mjs`; alpha nomic-768 memory sidecar | **india owns contract; alpha consumes** | india SHIPPED; **artifact gen pending** | L2, EMBEDDING-SSOT | L4 |
| **L4 Recall/fusion** | query → ranked hits via BM25+dense+RRF: india `utils/reciprocalRankFusion.ts` + `prism_ml:rag_search_rerank` + `TribalDenseRecallEngine`; alpha `memory-index-search-lib.mjs` hybrid recall | **shared (the main seam)** | both SHIPPED (separately) | L3 | L5, L6 |
| **L5 Brain integration** | recall → galaxy-brain back-pointers + master-index edges + `brain-refresh.mjs` orchestrator | **alpha** _(confirm)_ | SHIPPED _(confirm scope)_ | L4 | L6 discoverability |
| **L6 Reasoning/action** | recall → NN-GRAPH tier-5, RAG-grounded reasoning, closed-loop outcome | **india** | NN-GRAPH gate DEFERRED (pool=0); RAG/recall live | L4 | — |

## 3. The seam (india L3/L4 ⇄ alpha L4/L5) — the load-bearing finding

**RRF: duplicated-but-identical → COMPOSE.** Both india's `utils/reciprocalRankFusion.ts` (generic, tested, weighted `NamedRanking[]`) and alpha's inline fusion in `memory-index-search-lib.mjs` implement Cormack/Clarke/Buettcher 2009. **No conflict; opportunity:** alpha imports india's generic RRF, deletes the inline copy → one tested impl. _(confirm: alpha)_

**Embedding contracts: ALMOST collide, intentionally separate → ADOPT THE GUARD.**
- alpha memory recall = **nomic-768** (sync via Ollama `/api/embeddings`), single-model.
- india ships **nomic-768 (canonical)** + **minilm-384 (always-available, in-process ONNX via LocalEmbeddingEngine)** in the SSOT, both contract-guarded.
- They never silently cross-compare: `cosineSimilarityGuarded` THROWS on a nomic↔minilm compare. **But** alpha's recall has **no principled behavior when Ollama is down** (it drops to BM25-only). india's `selectEmbedderContract(requested, candidates[])` is exactly the primitive for that — it **refuses** a dim-incompatible fallback rather than corrupt the index. This is the highest-value composition.

## 4. The plan — units (enumerated in full; logical order)

| Unit | Owner | Description | Depends | Blocks |
|------|-------|-------------|---------|--------|
| **U-PATH-1** | alpha | Replace inline RRF in `memory-index-search-lib.mjs` with india's `utils/reciprocalRankFusion.ts` (generic, tested). | india RRF (done) | — (quality/DRY) |
| **U-PATH-2** | india+alpha | Make alpha's nomic-768 memory recall a *registered, tagged* consumer of `embeddingContract` — tag stored vectors with `contractId`, gate query↔index compare through the SSOT. | EMBEDDING-SSOT (done) | U-PATH-3 |
| **U-PATH-3** | alpha **(decision D2)** | Ollama-down recall resilience via `selectEmbedderContract`: either (a) build a **minilm-384 memory sidecar** (offline, LocalEmbeddingEngine) as a same-tier fallback, or (b) explicit BM25-only refuse. Today the fleet has NO dim-safe cross-model fallback. | U-PATH-2 | resilient L4 |
| **U-PATH-4** | india | Run `build-tribal-dense-index.mjs` on main (corpus-bearing) → `TRIBAL_DENSE_INDEX.json` → activates RAG-HYBRID dense arm. | TribalDenseRecallEngine (done), corpus on main | dense recall live |
| **U-PATH-5** | india | ✅ **SHIPPED 2026-05-31** — `utils/retrievalMetrics.ts` (p@k/recall@k/nDCG@k/MRR, pure, 13 tests) + `prism_ml:rag_eval` (mode=provided scores any ranked run; mode=bm25 runs TribalRAGEngine.search, graceful corpus_empty). Mirrors alpha's `memory-recall-eval` metric set → both legs share one bar. hybrid-vs-bm25 comparison works today via provided-mode (feed both runs). 20 tests, 2-reviewer PASS. | — | quality gate for L4 |
| **U-PATH-6** | alpha **(decision)** | Resolve the sidecar↔BM25 record-count parity gate (alpha flagged 11035 vs 11024). india's contract layer can supply a shared index-parity guard if wanted. | — | recall correctness |
| **U-PATH-7** | alpha | Add india's dense-index build as a `brain-refresh.mjs` stage so the dense index stays fresh alongside BM25/memory (single orchestrator owns the whole L3 refresh). | U-PATH-4 | dense staleness |
| **U-PATH-8** | alpha (registry owner) | Master-index / galaxy-brain back-pointer edges for india's new surfaces (`formalize_goal`, `rag_search_rerank`, `embeddingContract`) so they're recall-discoverable. | features (done) | L5 discoverability |

## 5. Variability / failure axis (do not silently prune)

- **Embedder states:** Ollama up (nomic live) · Ollama down (current reality — nomic recall dead) · LocalEmbeddingEngine (minilm, always up) · neither. U-PATH-3 must define behavior for ALL four.
- **Contract pairs:** nomic-768↔nomic-768 (ok) · minilm-384↔minilm-384 (ok) · nomic↔minilm (THROW — must never silently rank) · unknown-model (fail-loud).
- **Index staleness:** corpus changed but index stale · embedding sidecar stale vs BM25 · count mismatch (alpha's open gap U-PATH-6).
- **Adversarial:** empty corpus · zero-norm/NaN vectors (guarded → 0/throw) · hand-edited index with a lying `contractId` (per-entry dim guard catches dim lies; model lies = v3 `schemaVersion`/`builtBy` stamp).

## 6. Open decisions — **need alpha (and/or operator) to ratify**

- **D1 — Fleet embedding model:** single nomic-768 everywhere (needs reliable Ollama) **vs** india's two-model SSOT (nomic + minilm, contract-guarded, Ollama-optional). India's recommendation: **keep two-model** — minilm-384 is the only thing that works while Ollama is down, and the SSOT guards make it safe.
- **D2 — Offline fallback (U-PATH-3):** minilm-384 memory sidecar (re-embed memory corpus offline) vs BM25-only-when-Ollama-down. Affects alpha's recall resilience directly.
- **D3 — Canonical RRF home:** extract to a shared util both legs import (india's is already that) — confirm alpha adopts.
- **D4 — Does india's dense RAG recall feed alpha's brain recall, or stay RAG-only?** (i.e. is the tribal dense index a brain-recall source, or just a `rag_search_rerank` arm?)

## 7. Next action

india posts this to the chat bus addressed to alpha. **alpha:** review §5/§6, claim U-PATH-1/3/6/7/8, confirm or correct the L5 claims, and reply on the bus. india proceeds on U-PATH-4 (dense artifact, post golf-merge) + U-PATH-5 (eval harness) which are india-owned and unblocked.

_Related: [[reference_critical_resource_roots_2026_05_30]] (L1) · [[reference_rag_hybrid_v2_dense_arm_2026_05_31]] (L3/L4 india) · [[reference_embedding_ssot_ms0_2026_05_30]] (the contract) · alpha: hybrid recall (commit a2e0a7012d), `memory-recall-eval.mjs`, `brain-refresh.mjs`._
