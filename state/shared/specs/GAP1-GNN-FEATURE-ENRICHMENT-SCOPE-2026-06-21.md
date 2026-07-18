# GAP#1 — GNN node-feature enrichment (india, leg#10 coverage lever)

> Scoped 2026-06-21 (slot:india) after R8 reads. Execute in fresh context; do NOT re-derive the seam.
> Goal: lift the GNN's **1/7-class separability** (deployed tier-5 spans only 2/13 classes @ τ=0.7) by adding a
> DENSE leak-free per-engine node feature, **MEASURED before any GPU retrain** (india soul: measure-before-promote, multi-seed).

## Verified seam (file:line — do NOT re-derive)
- `scripts/build-node-embeddings.mjs:278` `embedTextFor(node, {ghostsOnly, sourceSignal, sharp, idf, leadK})` — ghosts delegate to `ghostEmbedText(node, sourceSignal, {...})`; non-ghost → `nodeEmbedText(node)`.
- **`sourceSignal` IS the leak-safe injection seam** (per-node extra text). `embedResumeHash` (lines 290-292) hashes `id + embedTextFor(...)`, so a CHANGED `sourceSignal` correctly forces a re-embed (no stale-skip). **Enrich `sourceSignal`, NOT `nodeEmbedText`.**
- Leak discipline: the `wikiSafe` guard (~lines 440-441) only reuses wiki vectors if the wiki cache predates the graph snapshot (post-hoc wiring = leakage). Mirror it: the feature must be computable WITHOUT the ghost's own dispatcher label. For an UNWIRED ghost the action-surface is empty BY DESIGN → the feature is a TRAINING-SIGNAL on WIRED refs (engine→action text), generalized to unwired ghosts via GraphSAGE message-passing (NOT the ghost's own label → NOT the fake-0.98 leak).
- Still TODO read: `ghostEmbedText` + `nodeEmbedText` bodies + the `sourceSignalById` builder (where `sourceSignal` is populated per node).

## Build plan (logical order, R13)
1. **NEW pure lib `scripts/lib/engine-action-surface.mjs`**: engine name → the dispatcher ACTION names+descriptions it backs (parse dispatcher source; sibling of `scripts/lib/wired-engine-mapper.mjs` which gives engine→dispatcher-ns). Optionally + per-engine tribal-tip text via `load-tribal-index` `streamTribalEntries` (domain-matched, O(1) heap, sharded-safe). Tests: happy + ≥3 failure + ≥2 adversarial.
2. **Wire into the `sourceSignalById` builder** in `build-node-embeddings.mjs` behind a flag, leak-stripped.
3. **MEASURE (non-destructive, NO retrain):** re-embed the 178-ref holdout with the enriched `sourceSignal` → `node scripts/analyze-ghost-embed-separability.mjs --emb <new> --json` → compare `classSeparability` vs the **1/7 baseline** (meanMargin 0.0263; only `prism_turning` separable). REPORT real numbers.
4. **ONLY if separability improves:** GPU/H2GCN retrain gated AUROC≥0.78 / macroF1≥0.55 / Brier≤0.15 **MULTI-SEED** (separate unit; never single-seed — `[[feedback_multiseed_before_auroc_claim]]`).

## Guards (do NOT repeat ruled-out work)
- RULED OUT: 1-hop engine-import feature (null for 72% of engines) + domain-subdir one-hot (flat root) — `[[reference_gnn_structural_feature_probe_2026_06_21]]`.
- cap=20 ref-pool growth = ranking-not-coverage, NOT the lever — `[[reference_gnn_refpool_cap20_reverify_2026_06_21]]`.
- No shared 542MB graph mutation without a non-destructive measure first.
- Diagnostic baseline: `[[reference_gnn_embed_separability_diagnostic_2026_06_21]]`.
