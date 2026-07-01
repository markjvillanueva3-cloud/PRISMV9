---
name: reference_india_refpool_real_lever_2026_06_25
description: R8/dedup CORRECTION (slot:india 2026-06-25) -- do NOT build a seedEntries->ghost feeder (it would duplicate wired-engines-to-refpool.mjs, india's own U-GNN-CODEBASE-WIRED-REFPOOL 2026-06-18). The REAL NN/GNN ref-pool growth lever: that feeder DRY-RUNS to 3,219 ground-truth labels (every engine->dispatcher import, confidence 1.0, all classes) but ghost.codebase-wired = 0 in the live graph = UN-APPLIED. Running `wired-engines-to-refpool.mjs --apply` (+ siblings vault/outcome) + regen + retrain + eval is the leg #10 fix, dwarfing the 37 seedEntries. Supersedes the "build a seedEntries feeder" next-unit in [[reference_india_refpool_grow_classes_2026_06_25]].
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.621Z
aliases: reference_india_refpool_real_lever_2026_06_25
---


# The REAL ref-pool growth lever -- 3,219 labels sit UN-APPLIED (india 2026-06-25)

## The dedup catch (R8 before build)
Scoping "build a feeder that translates seedEntries -> ghost.unwired-engine nodes" (my prior
next-unit rec) hit DuplicationGuard territory: `scripts/wired-engines-to-refpool.mjs`
(U-GNN-CODEBASE-WIRED-REFPOOL, **india's own 2026-06-18 work**) ALREADY feeds the live ref-pool
from the codebase's confirmed engine->dispatcher imports -- the STRONGEST ground truth (a literal
import, confidence 1.0), with conflict-policy (multi-dispatcher = ambiguous, not emitted),
--apply/--revert, streaming graph IO + heap-reexec. Its siblings: `vault-to-gnn-refpool.mjs`
(updated 2026-06-24) + `ghost-wire-outcomes-to-refpool.mjs`. The growth INFRASTRUCTURE is COMPLETE.

## The quantified lever (R12 numbers)
- `node scripts/wired-engines-to-refpool.mjs --json` (dry-run, no graph write) -> **would-emit 3,219
  labels** (key `byDispatcher` = the class spread, ALL dispatcher classes -- not 1/13).
- `system-viz-query find "ghost.codebase-wired"` -> **0 hits** in the live graph/sidecar = the feeder
  has NOT been --applied (or not re-indexed). So 3,219 ground-truth labels are sitting un-applied.
- buildHoldout (nn-graph-eval.mjs) builds its holdout from the cascade's OWN high-confidence
  ghost.unwired-engine nodes (proposed_wiring valid + confidence>=refMinConf), deduping by engine
  LABEL (first-seen wins). So applying the 3,219 codebase-wired ghosts grows the live reference set
  spanning all classes -- the genuine "27% coverage / 1/13 classes concentrated" (leg #10) fix.

## Correction to the record (R12 honest)
Last fire's U-REFPOOL-GROW-CLASSES (348252bfec, +10 Tier-A seedEntries spanning 4 classes) was to
the **DORMANT** `reference-pool-seed-2026-05-23.json` -- NOT in the live path (no .mjs consumer). It is
harmless (verified, advisory, no live consumer so no poison reached the classifier) but SUPERSEDED by
the codebase-wired feeder. The 10 hand-picked entries are dwarfed by the 3,219 the feeder extracts.

## NEXT UNIT (replaces the seedEntries-feeder rec; heavy graph op -> fresh fire / cron, metrics-gated)
Run `wired-engines-to-refpool.mjs --apply` (+ vault/outcome siblings) -> regen-viz (re-index the new
ghosts) -> retrain -> EVAL and report the held-out AUROC/macro-F1/Brier lift (india soul: gate on REAL
metrics, never "looks grown"). Heavy (548MB streaming merge + regen + retrain) but atomic-safe on kill
(writeGraphStreamingAtomic preserves the old graph) + reversible (--revert). The confidence-deflation
holdout-collapse ([[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]]) is a SEPARATE issue
that may still cap full-coverage even after the pool grows -- measure, don't assume.
