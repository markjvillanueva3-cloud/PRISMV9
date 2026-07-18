# Two-stage lexical rerank — inject-hook retrieval upgrade

**Status:** U-RAG-2 complete across all 4 inject hooks (2026-05-22, slot bravo `claude-30a6a98b`)
**Commits:** `6df057e098` tribal-by-domain-inject · `c8acc5accd` master-index-precheck-inject · `52b1fe91e8` memory-relevance-inject · `bb1ff5f589` wiki-precheck-inject
**Memory:** [[reference_rag_upgrade_ms0_2026_05_22]]
**Spec:** `state/shared/specs/RAG-UPGRADE-MS0.md`
**Library:** `scripts/lib/lexical-rerank.mjs`

## Problem

PRISM's four context-inject hooks (`master-index-precheck-inject`, `memory-relevance-inject`, `wiki-precheck-inject`, `tribal-by-domain-inject`) surface top-K hits to the model on every UserPromptSubmit / PreToolUse. All four were **single-stage**: BM25-lite (or term-frequency) score → sort → `slice(0, TOP_K)`. A wider candidate pool with a coverage/phrase/labelHit rerank routinely yields better top-3 — the spec estimates +15-30% precision — but the hooks emitted whatever BM25-lite ranked first.

A naive rerank would also demote curated `boost_keywords` hits in the wiki hook (they're synthesized with a high score precisely *because* their BM25 token overlap is weak). The rerank design has to respect curation.

## Architecture

| Layer | Artifact | Role |
|-------|----------|------|
| Reranker | `scripts/lib/lexical-rerank.mjs` | Pure `rerank(query, candidates, opts)`. Weights: coverage 0.35, phrase 0.25, labelHit 0.15, stage1 0.15, density 0.10. Reads `cand.text`/`label`/`score`. Never throws — degrades to input order on bad input. |
| Hook integration | Each inject hook exports `applyLexicalRerank(query, items, topK)` | Synthesizes `text`+`label` (and `score` where the candidate's score field is named otherwise), calls `lexicalRerank`, strips synthesized fields on return so the renderer receives the original hit shape unchanged. |
| Stage-1 widening | `STAGE1_K = Math.min(30, Math.max(TOP_K, TOP_K * 5))` | Widens the BM25/TF recall to a pool large enough for the reranker's coverage/phrase signals to matter, capped to bound cost. |

## Per-hook adaptations

- **`master-index-precheck-inject`** — synthesized `text = label + wiki refs + memory refs` (bounded). Stage-1 hits carry `label/layer/status/wiki/memory`. Strip only `text`.
- **`memory-relevance-inject`** — synthesized `text = name + title + opening` (bounded by `extractTitleAndOpening`'s 350-char cap). Scoring `coverage` over the full memo body would length-bias toward long memos. The raw stage-1 score is the *term-frequency count* (renderer displays it verbatim); the reranker clamps to [0,1] so stage1 becomes a near-uniform 0.15 — exactly the intent. IIFE converted to `main()` + `isDirectRun` guard for test-importability.
- **`wiki-precheck-inject`** — **the boost-pinning invariant.** Curated `boost_keywords` candidates carry `boosted: true` and a synthetic `BOOST_BASE_SCORE = 12`. `applyLexicalRerank` splits the pool: `pinned = items.filter(x => x.boosted)` stays at the head in incoming (curated) order; `rerankable = items.filter(x => !x.boosted)` is reranked by lexical score. Return is `[...pinned, ...reranked].slice(0, topK)`. A boosted entry is **never** demoted below a non-boosted one. This protects the "boost_keywords exist precisely for queries with weak token overlap" contract — the very class of queries a lexical rerank would punish.
- **`tribal-by-domain-inject`** — original 3-of-3-PASSed reference pattern (`6df057e098`). Other three hooks mirror it.

## Test pattern

Each hook ships a paired `node:test` suite for the helper:

- non-array input → `[]`
- empty list → `[]`
- single-hit short-circuit (no synth-field leak)
- narrowing to topK + stripping all synthesized scoring inputs
- the original score field flows through unchanged (renderer/telemetry read it)
- malformed candidates (missing `body`/`name`/`e`/`label`) don't crash
- `topK = 0 → []`
- hook-specific invariants (memory-relevance: missing body fallback; wiki: boost-pin + curated order + non-boosted rerank)

Plus structural-regression-guard tests (where the existing suite already does it) that grep the live source for `.slice(0, STAGE1_K)` + `applyLexicalRerank(prompt, stage1, TOP_K)` — fails immediately on a revert.

Counts: master-index 7 tests · memory-relevance 8 · wiki-precheck 10 (added to the existing 24-case suite → 34/34) · tribal-by-domain (covered in the original commit).

## Why the lexical reranker and not the `nv-rerankqa` NIM

The spec floated `nv-rerankqa` (or 3b-NIM / Ollama LLM-rerank). The lexical reranker shipped instead because:

1. **Pure, never-throws, no GPU, no I/O.** Adds <1ms per hook fire over ≤30 candidates. The hooks are latency-sensitive (UserPromptSubmit on every prompt).
2. **No external dependency.** A NIM-down or Ollama-down day cannot disable the rerank.
3. **The coverage/phrase/labelHit features are exactly the lexical signals BM25-lite misses** — the precision gap is mostly lexical, not semantic, for these corpora.

The NIM swap remains a follow-up — it would land as a *third* stage (BM25 → lexical rerank → NIM rerank) gated on GPU availability.

## Files

| File | Role |
|------|------|
| `scripts/lib/lexical-rerank.mjs` | Pure reranker library |
| `.claude/hooks/master-index-precheck-inject.mjs` + `.test.mjs` | U-RAG-2 hook 1 |
| `.claude/hooks/memory-relevance-inject.mjs` + `.test.mjs` | U-RAG-2 hook 2 |
| `.claude/hooks/wiki-precheck-inject.mjs` + `.test.mjs` | U-RAG-2 hook 3 (boost-pinning) |
| `.claude/hooks/tribal-by-domain-inject.mjs` | U-RAG-2 hook 4 (reference) |
| `state/shared/specs/RAG-UPGRADE-MS0.md` | Spec + live `## Status` table |

## GNN integration (the wired half of /goal)

The U-RAG-1 wiki embeddings (`knowledge/wiki/architecture/_embeddings.jsonl`, 14,738 int8 768-d nomic-embed-text vectors) ARE the input to NN-GRAPH-MS2/NN-1's GraphSAGE feature layer. `scripts/lib/graphsage-train-pipeline.mjs` accepts `--embedding-source <path>` and swaps the 8-d projected features for the 768-d wiki embeddings (per [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]], shipped 2026-05-17).

The U2 self-retrain lifecycle (`scripts/nn-graph-retrain-lifecycle.mjs`) auto-promotes any checkpoint that clears AUROC ≥ 0.78 / macroF1 ≥ 0.55 / Brier ≤ 0.15. **No new code is needed to "wire" the RAG → GNN bridge** — the bridge IS the `--embedding-source` flag, and U2 is the deploy mechanism. The remaining operator action (gated on <90% commit memory):

```bash
node scripts/lib/graphsage-train-pipeline.mjs \
  --embedding-source H:/prism/knowledge/wiki/architecture/_embeddings.jsonl \
  --node-type-field layer \
  --neg-p-hard 0.7 \
  --out state/shared/nn-graph/graphsage-checkpoint-768d.json
```

The current `NN-EVAL.json` (`poolSize:0`, `auroc:0.096`) reflects the legacy 8-d projected-feature checkpoint. The 768-d retrain is the next lever — necessary but per R12 not sufficient (the empirical AUROC outcome under heterophilic graphs is answerable only by running the command).

## See also

- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker (corrected 2026-05-22)
- [[reference_tribal_index_keyscheme_clobber_2026_05_22]] — the U-RAG-1 audit blind-spot fix (sister unit; corpus must be embedded for the rerank to have anything to rerank)
- [[reference_nn_graph_ms2_nn1_768d_features_2026_05_17]] — the GraphSAGE 768-d feature swap (the bridge endpoint)
- [[reference_nn_graph_ms2_u2_2026_05_17]] — auto-promote lifecycle (the deploy mechanism)
