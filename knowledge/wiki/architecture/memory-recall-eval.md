---
title: memory-recall-eval — the recall-quality measurement substrate (brain-upgrade rank 3)
type: architecture
status: shipped
shipped: 2026-05-30
slot: alpha
tags: [obsidian-brain, recall, hybrid, bm25, evaluation, metric]
---

# memory-recall-eval

Before this, PRISM's Obsidian-memory recall had **no quality metric anywhere** (brain-upgrade sweep
rank 3) — so every tuning lever (RRF k, top-K, weights, int8 precision, domain boost, magnitude
fusion: ranks 13/24/28) was unfalsifiable. `scripts/memory-recall-eval.mjs` produces the first one
and A/B's BM25-only vs the A6 hybrid (BM25+dense+RRF) path.

## Ground truth = self-anchor

For a sampled memory, the query is its own frontmatter `description` (minus the doc's own slug-name
tokens) and the expected answer is that memory. Scores **precision@1 / recall@k / MRR / nDCG@k**.
Deterministic stride sampling (no RNG) → reproducible.

**Honesty (R12 — what the number is and isn't):** the query is the VERBATIM indexed description, not
a paraphrase. So the **absolute** number is a *self-fingerprint / vocabulary-uniqueness* measure (can
a doc's description still single it out among ~11K vocabulary-overlapping memories), NOT a true
paraphrase-recall rate. The **trustworthy signal is the relative A/B**: BM25-only vs hybrid on
byte-identical queries — the dense arm cannot game the self-anchor, so the Δ is honest. That Δ is
exactly what the tuning levers optimize.

The report also emits `hybridEngagedRate` (the `source` field: hybrid|sidecar|live) — so a "no lift"
result caused by Ollama being down (hybrid silently falling back to BM25) is never misread as "hybrid
doesn't help"; and a per-namespace histogram of the scored set (the vault is ~97% `reference`, so the
default-n aggregate is effectively a reference-namespace metric — use `--namespace`/larger `--n` for
per-namespace claims; stratified sampling is a follow-up).

## First baseline (2026-05-30, n=24–30, k=10, hybrid engaged 100%)

| metric | BM25-only | Hybrid (A6) | Δ |
|--------|-----------|-------------|---|
| recall@10 | ~83–90% | ~97–100% | **+7 to +17 pts** |
| precision@1 | ~71–80% | ~87–92% | **+7 to +21 pts** |
| MRR | ~0.73–0.82 | ~0.88–0.95 | **+0.06 to +0.22** |
| nDCG@10 | ~0.76–0.84 | ~0.90–0.96 | **+0.06 to +0.21** |

→ The A6 hybrid recall shipped this session **measurably beats BM25-only** — the first falsifiable
confirmation that the dense+RRF arm earns its cost. (Range = sample variance across n.)

## Design + operate

Pure scorers (`rankOf`/`scoreQuery`/`aggregate`/`compareModes`/`buildQuery`/`sampleStride`) +
injected-deps `runEval` (the A/B oracle). 23 node:test (incl. a real A/B oracle that fails if the
two modes ever collapse + the engagement-honesty path). isMain via `pathToFileURL` (the
BRAIN-REFRESH-MS0 Windows entry-point lesson). Drives the real
`runMemoryIndexSearch(q,{hybrid})` from `scripts/lib/memory-index-search-lib.mjs` (`{hybrid:false}`
forces BM25-only).

```
node scripts/memory-recall-eval.mjs [--n 60] [--topk 10] [--namespace reference,feedback] [--json] [--verbose]
```
Exit 0 always (a report, not a gate). Knobs: `PRISM_RECALL_EVAL_{N,TOPK}` · `PRISM_MEMORY_VAULT_ROOT`.

Memory: [[reference_alpha_recall_eval_harness_2026_05_30]]. Sweep: [`PRISM-BRAIN-UPGRADES-2026-05-30`](../../../state/shared/specs/PRISM-BRAIN-UPGRADES-2026-05-30.md).
