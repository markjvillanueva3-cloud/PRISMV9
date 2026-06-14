---
name: u-rag-2-two-stage-rerank-2026-05-22
description: "U-RAG-2 complete — two-stage lexical rerank wired into all 4 inject hooks. Stage-1 BM25/TF widened to STAGE1_K, lexical rerank narrows to TOP_K. wiki hook pins curated boost_keywords."
aliases: reference_u_rag_2_two_stage_rerank_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.020Z
---


# U-RAG-2 — two-stage lexical rerank in all 4 inject hooks (2026-05-22)

Shipped across the campaign in 4 commits:
- `6df057e098` — `tribal-by-domain-inject` (reference, 3-of-3 PASS, prior session)
- `c8acc5accd` — `master-index-precheck-inject` (this session)
- `52b1fe91e8` — `memory-relevance-inject` (this session, IIFE→main conversion)
- `bb1ff5f589` — `wiki-precheck-inject` (this session, boost_keywords pinning)

## Pattern (mirrored across all 4 hooks)

1. Widen stage-1 recall: `STAGE1_K = Math.min(30, Math.max(TOP_K, TOP_K * 5))` instead of slicing direct to TOP_K.
2. Exported `applyLexicalRerank(query, items, topK)`: synthesize `text`/`label` (and `score` where the candidate's score field is named otherwise), call `scripts/lib/lexical-rerank.mjs`, strip synthesized fields on return so the renderer receives the original hit shape unchanged.
3. Reranker weights: coverage 0.35, phrase 0.25, labelHit 0.15, stage1 0.15, density 0.10. Pure, never throws — degrades to input order on bad input.

## Per-hook adaptation

- **master-index** — `text = label + wiki refs + memory refs` (bounded).
- **memory-relevance** — `text = name + title + opening` (bounded; full body would length-bias `coverage`). IIFE converted to `main()` + `isDirectRun` for test-importability.
- **wiki-precheck** — **boost-pinning invariant**: curated `boost_keywords` candidates (`boosted: true`, synthetic `BOOST_BASE_SCORE = 12`) are PINNED at the head and never reranked. boost_keywords exist precisely for queries with weak token overlap — a lexical rerank must not demote a deliberate curation. Only the non-boosted pool is reranked.
- **tribal-by-domain** — original reference pattern.

## Why the lexical reranker (not nv-rerankqa NIM the spec floated)

Pure, no GPU, no I/O, <1ms per hook fire. Hooks are latency-sensitive. NIM-down day cannot disable the rerank. The coverage/phrase/labelHit features are exactly the lexical signals BM25-lite misses — for these corpora the precision gap is lexical, not semantic. NIM swap remains a follow-up (3-stage cascade BM25→lexical→NIM gated on GPU).

## Tests

Each hook ships a paired `node:test` suite for the helper. master-index 7 · memory-relevance 8 · wiki-precheck +10 to existing 24 → 34/34 · tribal-by-domain covered in original commit. Per-file scrutiny 2/2 PASS on every hook.

## See also

- Wiki: [[two-stage-lexical-rerank]] — architecture entry
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_tribal_index_keyscheme_clobber_2026_05_22]] — U-RAG-1 sister unit
