---
name: reference_gnn_sharp_embed_lever_2026_06_18
description: "GNN tier-5 SHARP ghost-embed feature lever (slot:india 2026-06-18, commit 71f58c8c98): opt-in PRISM_NNG_GHOST_SHARP=1 -> IDF-salience lead + drop-constant-kind in ghostEmbedText. RAISES global separability margin 0.0526->0.0648 (+23%, +5 classes, inter-crowding 0.75->0.60) BUT REJECTED AT THE DEPLOY GATE: the clean single-scheme refs-only eval shows sharp is WORSE (AUROC 0.7453->0.7031, Brier@gate 0.2243->0.2736, coverage 45.5%->37.0%, both no-deployable). Margin is a MISLEADING proxy -- sharp loosens intra-class cohesion 0.83->0.72, making the k-NN vote noisier. TEXT-LEVEL feature reweighting REJECTED. Remaining coverage levers: (b) supervised learned projection (LDA-style, preserves intra-cohesion) or (c) different embedding model. Lever kept opt-in/default-OFF (reusable measurement infra); do NOT deploy. Added --refs-only single-scheme gate to the harness."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_sharp_embed_lever_2026_06_18
---


**slot:india, 2026-06-18, commit 71f58c8c98 `[AI-SYSTEMS-GNN]/U-GNN-SHARP-EMBED-FEATURES`.** The feature-lever follow-up to the separability root-cause [[reference_gnn_embed_separability_2026_06_18]] (margin 0.053, "needs sharper FEATURES").

## What shipped (NON-DESTRUCTIVE, default-off)
`ghostEmbedText(node, sourceSignal, opts)` gained an opt-in SHARP path (`PRISM_NNG_GHOST_SHARP=1` -> `opts.sharp` + an `opts.idf` Map). Two crowding reducers, both targeting the diagnosed inter-class cosine ~0.75:
1. **IDF-salience lead** -- prepend each engine's top-K (default 12) highest-IDF tokens (rarest = most domain-distinctive; the diagnostic proved domain vocab is the separator). The lead INTENTIONALLY repeats tokens already in the body -- repetition biases nomic's mean-pooled vector toward the rare tokens (do NOT de-dup; documented in-code).
2. **Drop the constant `kind`** -- "ghost.unwired-engine" is identical for every ghost, a pure shared direction that inflates every pairwise cosine.
IDF is **leak-free** (source-frequency only via new pure `tokenizeForIdf`/`buildIdfMap`=ln(N/df)/`salientLead`; never the dispatcher label). Default path (no opts / non-Map idf) is **byte-identical** (proven by test). 46/46 tests; 2-of-2 per-file scrutiny PASS (code-analyzer + reviewer), 0 P0/P1. Deployed `ghost-node-embeddings.jsonl` untouched.

## MEASURED (3206 codebase-wired labeled ghosts, re-embedded sharp via nomic on Blackwell, `analyze-ghost-embed-separability.mjs`)
| metric | baseline | sharp | delta |
|---|---|---|---|
| mean margin (intra-inter cosine) | 0.0526 | 0.0648 | +23% |
| separable classes (>0.05) | 22/43 | 27/43 | +5 |
| inter-class cosine (crowding) | ~0.75 | ~0.60 | -0.15 |
| diagnostic verdict | "PARTIALLY separate / needs BOTH" | "SEPARATE well / GATE-VOTE-limited" | flipped |

The mechanism worked: dropping the constant kind + leading with rare tokens **directly cut the inter-class crowding** that capped tier-5. This **REFUTES** the strict "text-level features cannot be sharpened" reading -- features CAN be sharpened, pushing +5 classes into the separable band.

## The CONFOUND (why coverage is NOT yet measured -- R12)
The only available coverage harness (`measure-codebase-wired-refpool-auroc.mjs`) MERGES the non-sharp deployed 355 base + the (now sharp) 3206 refs into one cosine pool. Sharp vectors live at inter-cosine ~0.60, non-sharp at ~0.75 -- **different regions, so mixing HURTS**. Empirically confirmed (--skip-embed --controlled, heap-bumped, nonsharp-3206 vs sharp-3206 ENRICHED arm):
- nonsharp enriched: AUROC 0.7716, Brier 0.2533, no-deployable
- sharp enriched: AUROC **0.7198** (WORSE), Brier 0.2775, no-deployable
Sharp is worse here ONLY because the non-sharp base contaminates the sharp pool -- this measures "scheme-mixing hurts", NOT "sharp's coverage effect". (Both arms also stay no-deployable because the variable holdout re-samples all 29 labeled classes -> fragile, same as the cap-sweep [[reference_codebase_wired_refpool_rejected_2026_06_18]].)

## #18 RESULT (DONE) -- the CLEAN all-sharp coverage gate test: SHARP REJECTED
Added `--refs-only` to `measure-codebase-wired-refpool-auroc.mjs`: a SELF-CONTAINED single-scheme eval (graph = the 3206 refs only, holdout + ref pool both from one cache, NO deployed-base merge, no 550MB load) -- removes the cross-scheme confound. Ran nonsharp-cache vs sharp-cache (`--refs-only --skip-embed`, holdoutN=200):
| scheme | AUROC | Brier@gate | coverage | classes | verdict |
|---|---|---|---|---|---|
| nonsharp | 0.7453 | 0.2243 | 45.5% | 26/24 | no-deployable |
| sharp | 0.7031 | 0.2736 | 37.0% | 26/24 | no-deployable |
**Sharp is WORSE on every gate metric even with the confound removed.** RECONCILIATION with the +23% margin: sharp dropped inter-cosine 0.75->0.60 (margin up) BUT ALSO dropped intra-class cohesion 0.83->0.72; k-NN voting needs TIGHT same-class neighborhoods, so looser intra-cohesion -> noisier vote -> lower AUROC / higher Brier / less coverage. **The separability margin is a MISLEADING proxy for selective-deploy coverage** -- the real deploy gate (AUROC/Brier) is the only valid arbiter (india discipline VINDICATED: the proxy would have shipped a regression). Both schemes are no-deployable on the 3206 set anyway (24 classes, fragile) -- the DEPLOYED-355 narrow-but-robust 2-class operating point remains the right production posture.

## RESOLUTION (full-LDA reasoned-deferred -- the binding constraint is the EMBEDDING MODEL)
Two facts close the coverage question WITHOUT building full off-diagonal LDA: (1) the sharp/Fisher lever measurements were LEAKAGE-OPTIMISTIC -- the transform was fit on the FULL labeled cache, then `--refs-only` splits a holdout from that same cache internally, so the transform saw the holdout's structure (every measured AUROC is an UPPER BOUND) -- and diagonal-Fisher STILL only moved +0.005 and stayed no-deployable (a rejection robust under optimistic measurement); (2) diagonal-Fisher IS LDA constrained to axis-scaling, full LDA only adds rotation -- both are LINEAR transforms of the nomic embedding that re-weight/rotate the existing 768-d, they cannot ADD discriminative info not already linearly present, and the leak-optimistic +0.005 bounds the linear headroom as small. So full-LDA is LOW-EV + leak-confounded -> REASONED-DEFERRED. **The real remaining lever is a STRONGER EMBEDDING MODEL** (re-embed the corpus), a separate large infra unit -- not a linear reprojection. EigensolverEngine.ts (756 lines, QR + generalized eig) exists if a future chat does build full-LDA anyway.

## What's LEFT for tier-5 coverage (CHEAP lever space EXHAUSTED -- 4 levers, none clears the gate)
Text-level (sharp) REJECTED. The supervised DIAGONAL-Fisher lever (`848f1be89c`, `scripts/fisher-reweight-embeddings.mjs`, per-dim `w[d]=sqrt(S_B/S_W)`) is now TESTED: refs-only AUROC 0.7453->0.7505 (+0.005), Brier@gate 0.2243->0.2172 -- the BEST feature scheme (does NOT regress, unlike sharp; confirms supervised preserves cohesion) but MARGINAL and STILL no-deployable. So FOUR levers (ref-pool / vote / sharp-text / diagonal-Fisher) are all measured + none clears the gate. Remaining (bigger units, own headroom): (1) FULL off-diagonal LDA -- an eigensolver that can ROTATE the space (not just scale dims like diagonal-Fisher), fit on the labeled 3206; (2) a stronger/larger embedding model. The `--refs-only` harness + `fisherDimWeights`/`applyDimWeights` + the opt-in scheme toggle are the reusable measurement infra for either. The deployed-355 narrow-robust 2-class selective operating point remains the correct production posture -- broadening it is NOT a cheap-lever problem.

Related: [[reference_gnn_embed_separability_2026_06_18]] (the diagnostic) · [[reference_codebase_wired_refpool_rejected_2026_06_18]] (ref-pool lever, also rejected) · [[reference_gnn_selective_deploy_2026_06_06]] (the selective-deploy gate).
