---
name: rag-upgrade-ms0-2026-05-22
description: "RAG-UPGRADE-MS0 — PRISM retrieval upgrade milestone (/goal /loop). U-RAG-5/1/2 DONE (2-stage rerank in all 4 inject hooks), U-RAG-4 partial; U-RAG-3 + synergy-wiring pending."
aliases: reference_rag_upgrade_ms0_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.144Z
---


# RAG-UPGRADE-MS0 — PRISM retrieval upgrade (2026-05-22, slot golf, /goal /loop)

Operator goal: research RAG setups for Claude Code, then upgrade PRISM's RAG and
synergize with system-viz / obsidian / wiki / GNN. Spec: `state/shared/specs/RAG-UPGRADE-MS0.md`.

## Research conclusion
PRISM's RAG *technique* is already advanced (hybrid retrieval, RRF, MMR, HNSW,
RaBitQ). The real deficits are **corpus coverage** and a **missing rerank
stage** — not technique. The session-start audit measured wiki embedding
coverage at **0.8%** (23,802 / 23,992 wiki files un-embedded) — the vector
index was nearly empty relative to the corpus.

## Shipped
- **U-RAG-5 complete** (`619e22f9cc`) — `RetrievalEvalEngine` (precision@k /
  recall@k / MRR / mAP), 20/20 tests, wired to `prism_dev` as `rag_eval_score`
  + `rag_eval_run`. Baseline-first: makes every later RAG change measurable.
- **U-RAG-1 complete** (`e07edcbf76`) — **the "0.8% coverage" was a 1-function
  audit blind spot, NOT a real gap.** `wiki-tribal-cross-ref-audit.mjs`
  `tribalWikiPath()` only counted `wiki:`-scheme ids; the canonical embedder
  keys entries `external:<abs-path>`, so the corpus was already ~97.2%
  embedded. The fix: a guarded 3rd branch counting `external:` ids under
  `knowledge/wiki/`. The earlier `embed-all-wiki.mjs` `wiki:`-scheme rewrite
  was REVERTED (would have doubled the corpus). Full story:
  [[reference_tribal_index_keyscheme_clobber_2026_05_22]].
- **U-RAG-2 complete** — two-stage lexical rerank wired into **all 4** inject
  hooks: `tribal-by-domain-inject` `6df057e098` · `master-index-precheck-inject`
  `c8acc5accd` · `memory-relevance-inject` `52b1fe91e8` · `wiki-precheck-inject`
  `bb1ff5f589`. Pattern: stage-1 recall widened to STAGE1_K (×5 clamped
  [k,30]), exported `applyLexicalRerank()` reranks via
  `scripts/lib/lexical-rerank.mjs` (coverage 0.35 / phrase 0.25 / labelHit 0.15
  / stage1 0.15 / density 0.10), narrows to TOP_K. The reranker is the LEXICAL
  scorer — NOT the `nv-rerankqa` NIM the spec floated; the lexical reranker is
  pure, never throws, needs no GPU, and ships now (NIM swap = follow-up).
  Per-hook nuances: memory-relevance synthesizes `text` from name+title+opening
  (bounded — full body would length-bias `coverage`); wiki-precheck PINS
  curated `boost_keywords` hits at the head (a lexical rerank must not demote a
  deliberate curation). Each hook got a paired `node:test` suite; IIFEs
  converted to `main()`+`isDirectRun` for test-importability. Per-file
  scrutiny 2/2 PASS on every hook.
- **U-RAG-4 lib + 1 hook** (`25b770e195`, `2b4654a710`) — `scripts/lib/
  edge-order.mjs` (lost-in-the-middle reorder), wired into
  `master-index-precheck-inject`.

## Key findings (carry forward)
1. **Embedder parity** — the wiki corpus MUST embed with `nomic-embed-text`
   (768-d), the same model `tribal-rerank.mjs` embeds *queries* with. The GPU
   `nv-embedqa-e5-v5` NIM (1024-d) is a different vector space → cosine
   meaningless. A GPU-embedder swap is a joint corpus+query migration (U-RAG-6,
   deferred). See [[reference_nim_gpu_capacity_ceiling_2026_05_22]].
2. **Ollama nomic context is small** — a 16000-char embed input still 500s
   ("input length exceeds the context length"). Fix: clamp embed input to 6000
   chars + skip-on-oversize (one bad file must not kill a 24K backfill).
3. **Edge-ordering is high-value only for large blocks** — PRISM's inject hooks
   emit top-3/top-5 blocks; edge-order matters most post-rerank when blocks grow.

## Remaining (for goal completion)
- **U-RAG-3** — Contextual Retrieval: prepend an Ollama-generated 1-2 sentence
  context blurb to each chunk before embedding. Needs a fresh embed pass.
- **U-RAG-4 synergy-wiring** — the "wired" half of the /goal: system-viz ghost
  roost (`generate-rag-upgrade-features.mjs` + `regen-viz.mjs` FAST[] +
  `merge-augmentations.mjs` splice), per-unit obsidian memories, wiki entries
  under `knowledge/wiki/architecture/`, GNN reference-pool feed (the 768-d wiki
  embeddings → GraphSAGE feature layer; NN-GRAPH is DORMANT, poolSize 0).
- **U-RAG-6** — DEFERRED (GPU embedder migration, out of goal scope).
