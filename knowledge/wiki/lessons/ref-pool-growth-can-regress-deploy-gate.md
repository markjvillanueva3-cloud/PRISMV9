---
title: Ref-pool growth can REGRESS the GNN deploy gate (measure before applying)
type: lesson
slot: india
date: 2026-06-18
commit: cec53c06a9
tags: [gnn, tier-5, ref-pool, deploy-gate, calibration, selective-deploy, measure-before-mutate]
---

# Ref-pool growth can REGRESS the GNN deploy gate

## TL;DR
Adding more reference exemplars to the GNN tier-5 direct-embed pool is **NOT a free win**. The
"20x pool-growth lever" (3206 codebase-wired refs, `wired-engines-to-refpool.mjs`) was MEASURED
before applying and **REJECTED**: it spans all 29 dispatcher classes (fixing the 2/13 concentration)
but **wrecks emitted-set calibration** -- Brier@gate 0.04 -> 0.26, macroF1 1.0 -> 0.32, global AUROC
0.789 -> 0.772 (below the 0.78 gate), selective verdict `deploy-ready-selective` ->
`no-deployable-operating-point`. Applying would flip PSN leg #10 from SELECTIVE-DEPLOY to broken in
production. (slot:india, `cec53c06a9`)

## Why a bigger pool can hurt
The deployed tier-5 votes via confidence-weighted top-K=15 cosine k-NN over the ref pool. A small
CONCENTRATED pool (355 refs, 2 dominant dispatchers) gives the high-confidence band tight,
correct neighborhoods -> Brier@gate 0.04, macroF1 1.0 over 2 classes. Flooding it with 3206 diverse
refs spreads votes across 29 classes but DILUTES those confident-correct neighborhoods -> the
emitted predictions at the gate are now wrong far more often (Brier 0.26). Coverage and class-span
went UP while emitted QUALITY went DOWN. **Measure Brier@gate + the selective verdict, never just
coverage/AUROC.**

## Why the rejection is unconfounded for the deploy decision
The LIVE eval (`nn-graph-retrain-lifecycle` -> `nn-graph-eval.buildHoldout`) draws its holdout from
ALL `kind:ghost.unwired-engine` refs with `confidence>=0.8` on the real graph. So `--apply`-ing the
3206 makes the next live eval reproduce the enriched result (`no-deployable-operating-point`) ->
leg #10 breaks. The apples-to-oranges holdout-composition change (baseline holdoutN=84 vs enriched
200) is a caveat for the deeper "do the refs help the SAME predictions?" question, but does NOT
change the deployment decision: do not apply.

## The pattern: measure on a non-destructive copy BEFORE mutating the shared graph
`scripts/measure-codebase-wired-refpool-auroc.mjs` (mirrors `measure-binary-auroc.mjs`): build the
candidate refs, embed only the new ones to a temp file, merge with the deployed embeddings verbatim,
load the real graph, run BASELINE then inject-in-memory + ENRICHED. The shared 542MB
`system-graph.json` and the deployed `ghost-node-embeddings.jsonl` are NEVER written. This is the
india metrics-gate discipline: a tempting-sounding lever ("20x pool-growth") is not a measured one.

## Controlled confirmation (2026-06-18, `3ec8ca54a9`)
The harder-holdout confound is closed via an additive `assessHoldout` `holdoutGraph` seam (`buildHoldout(opts.holdoutGraph || graph)`, 0 external callers, byte-identical default). Holding the SAME base 84 items fixed and varying ONLY the reference pool: global AUROC marginally RISES (0.7891 -> 0.7925, +0.003) but the selective gate still COLLAPSES (`deploy-ready-selective` -> `no-deployable-operating-point`, coverage 27.4% -> 52.4%, Brier@gate 0.04 -> 0.20, macroF1 1.0 -> 0.23). **Rejection CONFIRMED -- not a holdout artifact.** Mechanism: a dense, diverse reference pool manufactures spurious high-confidence votes for wrong dispatchers, destroying the abstention discipline. Methodology lesson: global AUROC alone (+0.003) would pass; the **selective-deploy grade (Brier@gate + macroF1@gate + verdict)** is the correct decision criterion for an abstaining tier.

## Cap sweep (2026-06-18, `afeac9e1f4`) -- ranking lever, NOT a coverage lever
`--cap-per-class=N` sweeps balanced sparse subsets. On the FIXED 84 holdout (controlled): cap=5/10/20
all HOLD the gate while AUROC climbs (peak **cap=20 = 618 refs, AUROC 0.8886, +0.099**, gate held on
BOTH controlled AND the live-eval); cap=50 COLLAPSES (Brier@gate 0.08). So the **density-collapse
threshold is between cap=20 and cap=50** -- the all-3206 failure was pure density. **But no cap
broadens coverage** -- every gate-holding cap narrows the emitted band to 1 class. The codebase-wired
refs are a **ranking-quality lever, not a coverage lever**: they sharpen the confidence ordering
(+0.099 AUROC) without breaking calibration, but do NOT increase emitted coverage. The standing
"full-coverage via ref-pool growth" assumption is **refuted for this ref source** -- full-coverage
needs sharper features / H2GCN / retrain. cap=20 is an available, gate-safe ranking improvement left
as an operator ranking-vs-coverage decision (a supervised shared-graph mutation, not auto-applied).

## Sharp embed FEATURES (2026-06-18, `71f58c8c98` + `9423f0f982`) -- separability margin is a MISLEADING proxy
The third coverage lever: sharpen the EMBEDDING TEXT (opt-in `PRISM_NNG_GHOST_SHARP=1`) -- lead each
ghost with its highest-IDF (rarest, most domain-distinctive) tokens + drop the constant `kind`
("ghost.unwired-engine", identical for every ghost). On the labeled 3206 set this RAISED the global
separability margin 0.0526 -> 0.0648 (+23%), +5 separable classes, inter-class cosine 0.75 -> 0.60 --
the separability diagnostic verdict even flipped to "SEPARATE well". **It looked like a win.** It is
NOT: the clean single-scheme `--refs-only` coverage eval REJECTED it -- AUROC 0.7453 -> 0.7031,
Brier@gate 0.2243 -> 0.2736, coverage 45.5% -> 37.0% (both no-deployable). **Sharp made the deploy
gate WORSE.**

Reconciliation: sharp dropped inter-cosine 0.75->0.60 (margin up) but ALSO dropped INTRA-class
cohesion 0.83->0.72. k-NN voting needs TIGHT same-class neighborhoods; looser intra-cohesion = noisier
vote = worse AUROC/Brier/coverage. **The separability margin (a mean intra-minus-inter statistic) is a
MISLEADING PROXY for k-NN selective-deploy coverage** -- it rewards spreading the whole space apart,
which helps the global statistic but hurts the local neighborhoods the vote actually uses. Unsupervised
IDF reweighting is the wrong tool: it does not preserve within-class cohesion. The right tool is a
SUPERVISED projection (LDA-style: maximize the between/within scatter ratio) or a stronger embedding model.

## Supervised diagonal-LDA / Fisher reweighting (2026-06-18, `848f1be89c`) -- BEST scheme, still fails the gate
The sharp-text rejection pointed to a SUPERVISED fix (unsupervised IDF was the problem). Diagonal LDA:
per-dim Fisher weight `w[d]=sqrt(S_B[d]/S_W[d])` (between/within scatter) emphasizes discriminative
dimensions WHILE per-dim scaling (not a global spread) preserves within-class cohesion -- no
eigensolver, cheap (`scripts/fisher-reweight-embeddings.mjs`). Refs-only result: AUROC 0.7453 -> 0.7505
(+0.005), Brier@gate 0.2243 -> 0.2172 (-0.007). The BEST feature scheme -- it does NOT regress (unlike
sharp), confirming supervised reweighting preserves cohesion -- but the gain is MARGINAL and it STILL
fails the gate (0.75 < 0.78, Brier 0.22 >> 0.15, no-deployable). The diagonal constraint (per-dim scale,
no rotation; weights gentle, max 1.48 / median 0.98) is too weak.

## Synthesis: FOUR coverage levers, all measured, none clears the gate -- tier-5 is feature-limited
ref-pool growth (REGRESSES gate), per-class vote re-weighting (+AUROC, no coverage broadening), sharp
embed text (REGRESSES gate), and supervised diagonal-Fisher (BEST, +0.005, still no-deployable). Every
CHEAP lever -- unsupervised and the cheap-supervised diagonal -- fails the deploy gate. The deployed
narrow-but-robust 2-class selective operating point (`deploy-ready-selective` @ tau=0.7, 27% coverage,
Brier 0.04) is the correct production posture. Meta-lesson: a proxy that improves (separability margin
+23%) is NOT a result -- re-measure the actual deploy gate (AUROC + Brier@gate + selective verdict)
every time; it is the only valid arbiter for an abstaining tier.

## RESOLUTION: the binding constraint is the EMBEDDING MODEL, not a linear reprojection (full-LDA reasoned-deferred)
Two facts close the question without building full off-diagonal LDA:
1. **The lever measurements were LEAKAGE-OPTIMISTIC and STILL failed.** Sharp/Fisher fit their transform on
   the FULL labeled cache, then `--refs-only` splits a holdout from that same cache internally -- so the
   transform "saw" the holdout's class structure (leakage), making every measured AUROC an UPPER BOUND.
   Even so, diagonal-Fisher moved AUROC only +0.005 and stayed `no-deployable`. A rejection that holds
   under optimistic measurement is robust.
2. **Diagonal-Fisher IS LDA constrained to axis-scaling; full LDA only adds rotation.** Both are LINEAR
   transforms of the nomic embedding -- they re-weight/rotate the existing 768-d, they cannot ADD
   discriminative information not already linearly present. The leak-optimistic diagonal result (+0.005)
   bounds the linearly-extractable headroom as small; a full off-diagonal LDA, measured the same leaky
   way, would need a large margin to be credible -- unlikely. So full-LDA is LOW-EV + its measurement is
   leak-confounded with the current harness -> REASONED-DEFERRED, not empirically forced.
**Therefore the real remaining lever is a STRONGER EMBEDDING MODEL** (re-embed the corpus with a sharper
model), a separate large infrastructure unit -- NOT a linear reprojection of the current nomic vectors.
The deployed selective-deploy posture stays correct until that re-embed happens.

## Reusable tools
- `scripts/measure-codebase-wired-refpool-auroc.mjs [--controlled] [--cap-per-class=N] [--sep-weight=K] [--refs-only] [--skip-embed]` -- the measure-before-mutate harness. `--refs-only` = SELF-CONTAINED single-scheme eval (graph = refs only, no deployed-base merge, no 550MB load) for testing an embedding SCHEME free of cross-scheme confound.
- `assessHoldout(graph, predictor, { holdoutGraph })` -- the eval seam for any fixed-holdout / augmented-reference experiment.
- `ghostEmbedText(node, sig, { sharp, idf, leadK })` + `buildIdfMap`/`salientLead`/`tokenizeForIdf` in `build-node-embeddings.mjs` -- opt-in/default-OFF sharp-text infra (rejected at gate; reusable for future scheme experiments).

Related: [[gnn-selective-deploy]] · [[nn-graph-ms0]] · memories `reference_codebase_wired_refpool_rejected_2026_06_18`, `reference_gnn_embed_separability_2026_06_18`, `reference_gnn_sharp_embed_lever_2026_06_18`.
