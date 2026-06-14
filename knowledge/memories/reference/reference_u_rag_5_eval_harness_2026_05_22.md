---
name: u-rag-5-eval-harness-2026-05-22
description: "U-RAG-5 DONE — retrieval eval harness (RetrievalEvalEngine + prism_dev rag_eval_score/run). Baseline-first: makes every later RAG change measurable."
aliases: reference_u_rag_5_eval_harness_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.021Z
---


# U-RAG-5 — retrieval eval harness (DONE)

Shipped prior session (`619e22f9cc`): `RetrievalEvalEngine` — precision@k, recall@k, MRR, mAP over a fixed query set. 20/20 tests. Wired to `prism_dev` as `rag_eval_score` + `rag_eval_run`.

## Why baseline-first

[[reference_rag_upgrade_ms0_2026_05_22|RAG-UPGRADE-MS0]] deliberately sequenced U-RAG-5 ahead of U-RAG-1/2/3 so every later change has a quantitative before/after. Without the harness, claims like "+15-30% from rerank" are aspirational; with it, they're empirical.

## Usage

- `prism_dev:rag_eval_run` — execute a query set over `memory_search` or the 4 inject surfaces, emit precision@k / recall@k / MRR / mAP.
- `prism_dev:rag_eval_score` — score a single retrieval against the gold set.
- Source: `mcp-server/src/engines/RetrievalEvalEngine.ts` + tests at `mcp-server/src/__tests__/RetrievalEvalEngine.test.ts`.

## Open follow-up

The eval harness exists but no scheduled baseline-comparison job runs it post-U-RAG-2 / post-U-RAG-3. A weekly cron + dashboard would surface regressions automatically — tracked as a follow-up, not in U-RAG-5 scope.

## See also

- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_u_rag_2_two_stage_rerank_2026_05_22]] — the first change the harness measures
