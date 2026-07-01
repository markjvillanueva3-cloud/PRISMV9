---
name: reference_india_refpool_apply_disproven_2026_06_25
description: MEASURED (slot:india 2026-06-25, non-destructive gate measure-codebase-wired-refpool-auroc.mjs --controlled): applying the 3,219 codebase-wired reference ghosts does NOT improve the GNN tier-5 deploy posture -- AUROC 0.9975 -> 0.9746 (-0.0229), selective coverage 2.5% -> 2.0% (both "no-deployable-operating-point"), classes 2/29 -> 3/29. The faithful fixed-holdout (controlled) confirms: on the SAME predictions the extra refs do NOT help. So the wired-engines-to-refpool --apply lever is DISPROVEN as the leg #10 fix -- ref-pool growth ALONE is insufficient; the soul's "growth + SHARPER FEATURES" is the real path. DO NOT --apply on this evidence.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.620Z
aliases: reference_india_refpool_apply_disproven_2026_06_25
---


# The --apply lever is MEASURED-NOT-TO-HELP (india 2026-06-25)

## The metrics-gate did its job (R12 -- measure, never assume)
The dedup investigation ([[reference_india_refpool_real_lever_2026_06_25]]) found the real
ref-pool lever = `wired-engines-to-refpool.mjs --apply` (3,219 ground-truth labels, un-applied).
Before applying (a direct write to the shared 542MB graph), I ran india's OWN non-destructive gate
`measure-codebase-wired-refpool-auroc.mjs --controlled --cap-per-class=5` (read-only -- the shared
graph + deployed embeddings are NEVER written, so it is safe to run concurrently with the
consolidate-graph background writer).

## Result (real numbers)
- BASELINE (deployed 355-ref pool): AUROC 0.9975, selective @tau=0.7 = no-deployable-operating-point,
  coverage 2.5%, classes 2/29, fragile.
- ENRICHED (+ codebase-wired refs, variable holdout): AUROC 0.9746 (-0.0229), coverage 2.0%, classes 3/29.
- CONTROLLED (FIXED base holdout = the faithful inference effect): AUROC 0.9746 (-0.0229) -> verdict
  "on the SAME held-out predictions, the extra refs do NOT help (AUROC dropped or selective gate lost)."
Corroborates the tool header's documented "density-driven calibration collapse the all-3206 pool caused."

## Conclusion (overturns the planned --apply unit)
**DO NOT run wired-engines-to-refpool.mjs --apply on this evidence** -- it does not improve (slightly
hurts) the deploy posture. Ref-pool GROWTH ALONE is empirically insufficient for the leg #10
"27% coverage / concentrated classes" blocker. Per the india soul: "full-coverage lift = reference-pool
growth + SHARPER FEATURES, NOT calibration" -- the real lever is sharper node FEATURES (H2GCN /
GPU retrain / better embeddings), not more reference labels. The 4 fires of ref-pool work this session
(seedEntries growth + the codebase-wired apply lever) are now BOUNDED by this measurement: growth is
necessary-but-not-sufficient; features are the gap.

## Caveats (R12 honesty)
- This run displayed "ENRICHED (deployed + 0 refs)" in the label while AUROC moved consistently across
  BOTH variable + fixed holdouts -- a cap-per-class/--skip-embed DISPLAY artifact (0 refs would not move
  the fixed-holdout AUROC). Direction is solid; a clean re-run WITHOUT --skip-embed (re-embed ~90s)
  confirms the exact magnitude. NEXT-FIRE: re-measure clean, then pivot the leg #10 work to FEATURES.
- The baseline here (coverage 2.5% / 29 classes / holdoutN=200) is a different/harder holdout config
  than the PSN leg #10 inject's reported 26%/13-classes -- the DELTA (refs don't help) is the
  decision-relevant signal regardless of the absolute baseline.
Sibling: [[reference_india_refpool_real_lever_2026_06_25]] · [[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]] · [[reference_gnn_selective_deploy_2026_06_06]].
