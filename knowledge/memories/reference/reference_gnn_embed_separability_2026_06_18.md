---
name: reference_gnn_embed_separability_2026_06_18
description: "GNN tier-5 coverage-ceiling ROOT CAUSE (slot:india 2026-06-18, f203722316): the deployed nomic ghost embeddings only PARTIALLY separate dispatchers -- mean intra-inter cosine margin 0.0526, high baseline crowding (inter ~0.75), 22/43 classes separable (>0.05). Entangled = large generic dispatchers (prism_dev margin 0.015, prism_safety 0.011); separable = small distinctive (weldingjoining 0.118, 5axis 0.078). Coverage needs vote/gate tuning (for the 22 separable) + sharper features (for the entangled), NOT ref-pool growth. Tool: scripts/analyze-ghost-embed-separability.mjs."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.590Z
aliases: reference_gnn_embed_separability_2026_06_18
---


**slot:india, 2026-06-18. Root-causes the standing PSN-leg #10 coverage limitation ("spans 2/13 classes -- full-coverage pending ref-pool growth") with real numbers, after the cap-sweep (afeac9e1f4) proved ref-pool growth is NOT a coverage lever.**

## The diagnostic
`scripts/analyze-ghost-embed-separability.mjs` (+7/7 test) -- NON-destructive, no 550MB graph load. Loads the 3206 codebase-wired labeled embedding cache (`.cwref-newemb.jsonl`) + joins the engine->dispatcher map (single-dispatcher ground truth). Per dispatcher class (>=5 members): mean intra-class cosine vs mean inter-class cosine; margin = intra - inter.

## Result
- 3206 vectors, 72 dispatcher classes, 43 scored. **Mean margin 0.0526** (small positive), range 0.0113..0.1176. **22/43 separable** (margin > 0.05).
- **High baseline crowding:** inter-class cosine ~0.75 -- nomic embeds all engine source text into a globally crowded region (manufacturing/code text is all similar), so dispatchers overlap heavily.
- **Well-separated (small + semantically distinctive):** prism_weldingjoining +0.118 (n=5), prism_skillscript +0.115, prism_resourceharvester +0.089, prism_security +0.083 (n=17), prism_5axis +0.078 (n=9).
- **Entangled (large + generic):** prism_dev +0.015 (n=284), prism_safety +0.011 (n=60) -- a "dev"/"safety" engine could be anything, so its embeddings spread across the whole space.

## What it means (the coverage lever, finally pinned)
- Coverage is **FEATURE-limited for the entangled majority** (large generic dispatchers) -- adding refs just adds crowding. This is exactly WHY the cap-sweep showed ref-pool growth can't broaden coverage.
- BUT **22/43 dispatchers ARE separable** -> for those, coverage is **GATE/VOTE-limited, not feature-limited**. A per-class vote/gate tuning could surface them (broaden the emitted band from 2 toward ~22 classes) with NO new features and NO shared-graph mutation. **This is the concrete, autonomous coverage lever** the "full-coverage via ref-pool growth" assumption ([[reference_gnn_refpool_growth_2026_06_13]]) missed.
- For the entangled tail: sharper embed text (prepend dispatcher-discriminative tokens) / a different embedding model / a learned projection (deferred -- bigger unit).

## VOTE-LEVER RESULT (#16 DONE, 7a69c45316 + 6028b7fd5d) -- coverage is FEATURE-limited, proven by TWO levers
Built the separability vote lever: opt-in `separabilityWeights` in `voteDispatcher` (per-class factor `1 + k*margin`, default-absent = byte-identical, deployed path only forwards) + `--sep-weight=K` measurement mode (`buildSeparabilityFactorMap` from the labeled 3206). MEASURED on the deployed 355 refs (controlled fixed holdout):
- baseline: AUROC 0.7891, cov 27.4%, 2 classes.
- k=5: AUROC 0.8531 (+0.064), HELD, cov 27.4%, 2 classes.
- k=10: AUROC 0.8836 (+0.095), HELD, cov 26.2%, 1 class.
- k=20: AUROC 0.8900 (+0.101), HELD robust, cov 26.2%, 1 class.

**The lever is a real GATE-SAFE RANKING gain (+0.101 AUROC) using NO new refs** (cleaner than the cap=20 ref-pool lever #15 -- no shared-graph mutation), **but it does NOT broaden coverage** (stays ~27%, 1-2 classes). So **TWO independent levers -- ref-pool growth ([[reference_codebase_wired_refpool_rejected_2026_06_18]] cap-sweep) AND vote re-weighting -- now CONFIRM the coverage ceiling is FEATURE-limited, not vote-limited.** The separability diagnostic's "needs BOTH" is proven: vote-tuning alone is insufficient.

## THE coverage lever (#17, queued) -- sharper FEATURES, the confirmed binding constraint
The only remaining lever for full-coverage is sharper embeddings so dispatchers actually separate (mean margin 0.053 with baseline crowding ~0.75 is too weak for the gate to emit >2 classes confidently). Options, in rising cost: (a) sharper ghost embed TEXT (`ghostEmbedText` in build-node-embeddings -- prepend dispatcher-discriminative source tokens), measurable non-destructively via re-embed + the separability diagnostic + `--sep-weight`; (b) a learned linear PROJECTION fit to maximize per-class separation (LDA-style) over the labeled 3206; (c) a different embedding model. Start with (a) -- cheapest, uses the existing harness. HIGH-BLAST (changes deployed embeddings) -> own unit, fresh headroom.

Related: [[reference_codebase_wired_refpool_rejected_2026_06_18]] (the cap-sweep that motivated this) · [[reference_gnn_selective_deploy_2026_06_06]] (the selective-deploy gate) · [[reference_post_ship_blackwell-ai-ms0-u-gnn-direct-embed]] (the direct-embed vote this analyzes).
