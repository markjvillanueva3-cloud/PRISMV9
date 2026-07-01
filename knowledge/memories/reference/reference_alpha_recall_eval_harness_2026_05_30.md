---
name: reference_alpha_recall_eval_harness_2026_05_30
description: memory-recall-eval.mjs — first recall-quality metric for the Obsidian-memory stack; A6 hybrid measurably beats BM25 (+7-17pts recall, +0.06-0.22 MRR)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.471Z
aliases: reference_alpha_recall_eval_harness_2026_05_30
---


Brain-upgrade rank 3, built 2026-05-30 (slot alpha) off the 8-agent sweep
([[reference_alpha_brain_refresh_ms0_2026_05_30]] sibling). `scripts/memory-recall-eval.mjs` — the
**first recall-quality metric the Obsidian-memory stack has ever had**. Before it, every recall
tuning lever (RRF k, top-K, weights, int8 precision, domain boost) was unfalsifiable.

**What:** self-anchor ground truth (query = a memory's own `description` minus slug-name tokens,
expected = that memory) → precision@1 / recall@k / MRR / nDCG; A/B BM25-only (`{hybrid:false}`) vs the
A6 hybrid (BM25+dense+RRF). Drives the real `runMemoryIndexSearch`. Pure scorers + injected-deps
`runEval` oracle; 23 node:test; isMain via pathToFileURL (BRAIN-REFRESH-MS0 lesson). Commit
`[OBSIDIAN-BRAIN]/...` (rank-3 unit).

**First result (real 10,983-memory vault, k=10, hybrid engaged 100%):** A6 hybrid **measurably beats
BM25-only** — recall@10 ~83-90% → ~97-100% (+7-17 pts), p@1 ~71-80% → ~87-92%, MRR +0.06-0.22,
nDCG +0.06-0.21 (range = n-sample variance). The dense+RRF arm shipped this session earns its cost —
falsifiable, not assumed.

**The two scrutiny P1s (both reviewers PASS) — honesty/scope, not correctness:**
1. **Don't overclaim the absolute number.** The query is the VERBATIM indexed description (not a
   paraphrase), so absolute p@1 is a *self-fingerprint / vocabulary-uniqueness* measure, NOT
   paraphrase-recall. The TRUSTWORTHY signal is the RELATIVE A/B (identical queries, only mode differs
   → the dense arm can't game it). Fixed: docstring + output now label it honestly (R12). A tuning
   change that games the self-anchor games BOTH arms equally, so the Δ stays honest.
2. **Namespace-blind.** Vault is ~97% `reference`, so the default-n stride aggregate is effectively a
   reference-only metric (doctrine namespaces invisible at n=60). Fixed: report emits a per-namespace
   histogram of the scored set + the skew caveat; `--namespace`/larger `--n` for per-namespace claims;
   stratified sampling = follow-up.

**Honesty property worth keeping:** `hybridEngagedRate` (from the `source` field) means a "no lift"
result caused by Ollama-down (hybrid silently → BM25) is never misread as "hybrid doesn't help" — it
shows engaged<100%. Reviewer B called this the strongest part of the design. Wiki: [[memory-recall-eval]].
