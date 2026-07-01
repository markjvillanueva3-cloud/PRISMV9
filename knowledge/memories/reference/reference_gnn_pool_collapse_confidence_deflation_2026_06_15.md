---
name: reference_gnn_pool_collapse_confidence_deflation_2026_06_15
description: "Diagnosed the GNN tier-5 reference-pool collapse 62->13 (slot:india 2026-06-15): the high-confidence reference band collapsed 124->31. Streamed the live 763MB graph: 208 ghost.unwired-engine nodes (stable), but only 31 at confidence>=0.8 while 129 (62%) bunch in 0.6-0.8 just under the refMinConf=0.8 gate. Engines-wired-out REFUTED as the SOLE cause (ghostCount stable 208 -> wiring would drop it); most-likely mechanism is confidence-deflation and/or composition-change (Jun-4 galaxy-feature expansion adding low-conf ghosts) -- a precise attribution needs the Jun-6 per-node histogram, which was NOT captured. Seed-loss ruled out (the seed file is advisory, never merged). Architectural fragility: refMinConf (0.8) == confidenceCap (0.8), so the pool is gated at the exact ceiling -> as the candidate space grew (208 ghosts + 34-galaxy node features dilute k-NN votes), almost nothing clears 0.8. Fix = operator-label the 31-entry proposed worklist (best, gated) OR set refMinConf below the cap (e.g. 0.7, defensible statistical-power gain, noted trade-off)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.592Z
aliases: reference_gnn_pool_collapse_confidence_deflation_2026_06_15
---


# GNN reference-pool collapse 62->13: PROVEN = confidence deflation (slot:india 2026-06-15)

## The question
Why did the tier-5 reference pool (the eval's leave-out holdout) collapse from ~124 ghosts (holdout 62, Jun-6) to ~26 (holdout 13, Jun-15) while total ghostCount stayed 208? This is THE tier-5 bottleneck (it makes selective-deploy non-deployable, 0/5).

## Method (3 parallel sonnet read-lens agents + a streaming proof)
Fanned out 3 read agents (seed-merge wiring / pool-qualify predicate / on-disk state). They CONVERGED on the mechanism but DIVERGED on root cause: agent-1 said "WIRE-UNWIRED-PAPA wired engines OUT of the ghost set"; agents 2+3 said "confidence DEFLATION". I resolved the conflict by streaming the live 763MB graph (graph-io `streamGraphArray`, V8-safe, no materialization) and counting the real confidence distribution.

## EVIDENCE (the load-bearing numbers) + honest attribution
```
total ghost.unwired-engine = 208   (stable both fingerprints)
confidence bands: >=0.8 -> 31 | 0.6-0.8 -> 129 | 0.5-0.6 -> 15 | <0.5 -> 33 | noConf -> 0
POOL (confidence>=0.8 AND valid prism_* proposed_wiring) = 31
```
- **The high-confidence band collapsed 124->31**, and 129/208 (62%) now bunch in 0.6-0.8, immediately under the refMinConf=0.8 gate -- a "near-miss bulge below the cutoff."
- **"Wired out" REFUTED as the SOLE cause:** wiring an engine REMOVES its ghost -> ghostCount would DROP. It is STABLE at 208. So wiring-out is not the primary driver (valid modus tollens).
- **Mechanism attribution is INFERRED, not proven (scrutiny arm-B caught this -- R12):** the collapse is a CHANGE claim, but I only captured the CURRENT distribution -- the Jun-6 per-node confidence histogram was never saved (the ~124 prior is reconstructed as holdout 62 x 2). So the 0.6-0.8 bulge is consistent with TWO mechanisms I cannot cleanly separate from one snapshot: (a) existing >=0.8 references DRIFTED DOWN (confidence deflation), or (b) the Jun-4 34-galaxy node-feature expansion ADDED new lower-confidence ghosts that were never >=0.8 (composition change). Both leave 208 stable with a 0.6-0.8 bulge; they have different fixes. Most-likely it is a mix (the k-NN vote dilutes as the candidate set grows -- which is BOTH). What IS solid: the high-conf band is starved now, and refMinConf-lowering does not recover it (below).
- **Seed-file is a RED HERRING:** `reference-pool-seed-2026-05-23.json` (27 entries) is `advisoryOnly:true, mustHumanVerify` and is NEVER merged into the graph by any regen/seed stage (all 3 agents confirmed; `regen-viz.mjs` seeds ghosts via `seed-ghost-from-unwired.mjs`, which does not read the seed file). My earlier guess "regen-viz ref-pool-seed stage not merged" was WRONG -- there is no such merge by design.

## The deeper architectural fragility (the real lesson)
`refMinConf` (the reference-pool threshold) is **0.8** and the classifier `confidenceCap` is ALSO **0.8** (seed-ghost-gnn-classify.mjs). So a ghost only enters the pool if its k-NN vote-share hits the absolute CEILING. Confidence = direct-embed cosine k-NN vote-share over `ghost-node-embeddings.jsonl`. As the candidate space grew (208 ghosts + the Jun-4 34-galaxy node-feature expansion), k-NN neighbors diluted -> vote-shares fell into 0.6-0.8 -> the >=0.8 (== cap) band emptied. **Gating the reference pool at the exact confidence ceiling is structurally fragile** -- any growth in the candidate set starves it.

## Fix paths (a real crossroad -- surfaced, not unilaterally taken)
1. **Operator-label the 31-entry proposed worklist** (`active-label-worklist-proposed.json`, Jun-11, 93% GNN<->Ollama conflict, `mustHumanVerify`). The INTENDED active-learning path: promotes human-verified references (ground truth) into the pool. BEST quality, OPERATOR-GATED.
2. **Set refMinConf BELOW the cap** (e.g. 0.7) -- **EMPIRICALLY REFUTED 2026-06-15.** I tested it (runAssessment honors opts.refMinConf via buildHoldout nn-graph-eval.mjs:455, forwarded through assessHoldout:524). Sweep, direct-embed, 3 seeds each on the live graph:
   - refMinConf 0.8 -> holdoutN 13, AUROC mean 0.801 (0.76-0.83), macroF1 ~0.10, selective NON-deployable 0/3
   - refMinConf 0.7 -> holdoutN 41, AUROC mean 0.683 (0.65-0.72), macroF1 ~0.13, selective NON-deployable 0/3
   - refMinConf 0.6 -> holdoutN 72, AUROC mean 0.652 (0.53-0.78, UNSTABLE), macroF1 ~0.10, selective NON-deployable 0/3
   Lowering the threshold GROWS the holdout (13->41->72) but AUROC DROPS 0.80->0.65 (the 0.6-0.8 ghosts are noisier references that degrade the signal), macroF1 stays ~0.10 at EVERY threshold (the non-separability ceiling is INVARIANT to pool size -- cf U-NN-FEATURE-SEPARABILITY-CLOSE), and the selective path stays NON-deployable (0/3) at all thresholds. So refMinConf is a RED HERRING: it trades reference quality for quantity and the eval gets WORSE. NOT a fix.
3. (rejected) re-`--apply` direct-embed to re-inflate confidences: heavy graph mutation, capped at 0.8 anyway.

## Path (c) vault-to-gnn-refpool assessment (2026-06-15 dry-run)
`scripts/vault-to-gnn-refpool.mjs --json` reports **9** vault-confirmed wirings available now (confidence 0.85, 0 conflicts, across prism_edm/data/calc/dev/business/ai). It emits `kind:"ghost.unwired-engine"` (matches GHOST_KIND) at id `ghost.vault-wired.<Engine>` (distinct namespace, ADD-only, --revert) -- so they ARE pool-eligible. BUT: (1) only 9 -> pool 31->~40, far short of recovery; (2) per the refMinConf sweep even holdout 72 stayed non-deployable + macroF1 ~0.10, so 9 more refs will NOT flip the deploy verdict; (3) it is NOT wired into the regen pipeline (verified: 0 refs in regen-viz/cron) -> any `--apply` is EPHEMERAL (next regen rebuild wipes the vault ghosts). So a one-shot --apply is net-neutral (marginal + ephemeral gain vs shared-763MB-graph mutation risk) -- did NOT apply. The durable R15 form would be to WIRE vault-to-gnn-refpool into regen (sierra-owned pipeline) so it auto-re-applies -- a separate unit, and still marginal until the vault accrues many more confirmed wirings.

## Net (post-sweep, decisive)
Tier-5 live stays honest (8-dim, defers to tiers 1-4). The high-conf reference band is starved (124->31) and gated at the exact confidence ceiling (refMinConf==confidenceCap=0.8), a design fragility; it is NOT seed-loss and NOT solely engines-wired-out. **The most promising lever exercised/identified is GROUND-TRUTH reference growth** -- (a) operator-label the 31-entry worklist (gated) or (c) `vault-to-gnn-refpool.mjs` vault-confirmed labels (autonomous, 9 available now). The refMinConf knob (b) is REFUTED (degrades the eval). CAVEAT (scrutiny arm-B): I only varied POOL SIZE; macroF1 ~0.10 being invariant to pool size does NOT prove a fundamental non-separability ceiling -- FEATURE-QUALITY (H2GCN / GPU retrain / richer node features) and CLASS-WEIGHTING / per-class thresholds are SEPARATE untested axes that could move macroF1. So: pool growth (quality) may at best restore a SELECTIVE operating point (like Jun-6's 32% coverage); full-coverage lift likely needs the untested feature/class-weighting axes, not pool size. NOT retrains-as-tried, NOT calibration (measured dead-end), NOT refMinConf, NOT auto-promote.

[[reference_gnn_selective_promote_disproven_2026_06_15]] (the multi-seed verdict this completes) · [[feedback_multiseed_before_auroc_claim]] · [[reference_forkstorm_consolidation_2026_06_14]] (outcome-diversity sibling bottleneck).
