---
name: reference_nn_graded_schema_read_fix_2026_06_03
description: NN-EVAL GRADED-shape schema-read fix — classifyGnn now reads metrics.auroc; leg
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.227Z
aliases: reference_nn_graded_schema_read_fix_2026_06_03
---


# NN/GNN GRADED-shape schema-read fix (slot:india, 2026-06-03, commit 93f85ec067)

`U-NN-REFPOOL-REEVAL` re-ran `scripts/lib/nn-graph-eval.mjs` against today's live 676MB
`state/shared/system-viz/system-graph.json`. The perma-DEFERRED tier-5 eval (poolSize 0,
stale May-16) finally produced a real **62-ghost reference holdout** — the deploy gate is no
longer data-blocked. NN/GNN leg #10 moved `DEFERRED (insufficient-reference-pool)` →
`SHIPPED-RESEARCH-ONLY`, measured **AUROC 0.5 / macro-F1 0.133 / Brier 0.26**. The 8-dim
GraphSAGE checkpoint has **collapsed to a constant `prism_turning` predictor** (every one of the
62 holdout ghosts predicted `prism_turning` @ conf 0.4 — accuracy 0.5 only because ~half the
high-confidence ghosts are genuinely Lathe*/Swiss* → `prism_turning`).

## The follow-on bug (this is the regression class)

The refresh exposed a SECOND schema-read blindness, one shape deeper than [[nn-leg-schema-read-fix]]
(f436b2c614). `nn-graph-eval.runAssessment` emits TWO shapes:
- **DEFERRED**: `{deferred:true, checkpointPresent, poolSize, checkpointMeta:{auroc=link-pred PRETEXT, brierCalibrated, brierRaw}}`
- **GRADED**: `{deferred:false, holdoutN, metrics:{auroc=REAL deploy gate, brier}, grade:{verdict}}` — NO checkpointMeta, NO checkpointPresent.

`classifyGnn` (the single-source-of-truth reader both consumer hooks route through) read AUROC
*only* from `checkpointMeta.auroc`. So a GRADED report classified `{dormant:true, auroc:null}` →
both fleet hooks (`psn-leg-state-inject` per-prompt ×26 slots + `nn-graph-health-inject`
SessionStart) newly mis-reported the real measured grade as "DORMANT poolSize 0 / AUROC n/a".
It was latent because the producer's GRADED shape was NEVER exercised while the eval was
data-blocked at poolSize 0.

## Fix

`classifyGnn` (`.claude/hooks/nn-graph-health-inject.mjs`): read `metrics.auroc/brier` (deploy
gate) FIRST, fall back to `checkpointMeta` (pretext); `graded = !deferred && metricAuroc!==null`;
`checkpointPresent ||= graded` (a scored holdout implies a loaded checkpoint) → a graded report is
NEVER dormant, only below-gate/healthy. `deferred` stays authoritative (a stray metrics block can't
flip a deferred report live). +9 tests (87 total green incl real-data E2E + negative-assert
`AUROC **n/a**` can't render on a graded doc). 2-reviewer PASS 0 P0/P1.

## Diagnosis: the gate is stuck UPSTREAM of the checkpoint (verified iter3)

Evaluated `graphsage-checkpoint-768d-rag-upgrade.json` against the SAME live holdout (`--no-write`):
**byte-identical result** — AUROC 0.5, all 62 targets → `prism_turning` @ conf EXACTLY 0.4. Two
different-dimension checkpoints producing an identical constant proves the `0.4` is NOT a model
output. In `seed-ghost-gnn-classify.mjs` the prediction confidence is `min(confidenceCap=0.8,
voteShare)` of a confidence-weighted k-NN vote (weight = `linkScore * ref.confidence`). When the
GraphSAGE link scores don't separate dispatcher classes on this heterophilous, type-imbalanced
graph, the vote collapses to the **reference-pool class prior** — and that pool is Lathe*-dominant
(→ `prism_turning`), so every target gets `prism_turning` @ the constant prior share ≈ 0.4.
Constant confidence ⇒ arbitrary ranking ⇒ AUROC 0.5 (chance) by construction.

**Implication:** swapping checkpoints (8-dim ↔ 768d) cannot move the gate. The fix is upstream —
node features/embeddings that actually separate dispatcher classes AND/OR class-balanced reference
sampling AND/OR a vote that doesn't collapse to the global prior.

## Next units

1. ✅ SHIPPED `U-NN-EVAL-DEGENERATE-GUARD` (c354432cf6, 2026-06-03): `detectDegeneracy(scores,
   predicted)` flags constant-confidence collapse (the AUROC-invalidating signal) → `assessHoldout`/
   `runAssessment` carry a `degeneracy` field, `renderReport` emits a DEGENERATE warning, `NN-EVAL.json`
   carries it. Live 8-dim eval now reports `DEGENERATE(constant-vote, all→prism_turning@0.4)` instead
   of a deceptive below-gate near-miss. Boundary: catches EXACT collapse (distinct≤1), not near-collapse
   (documented). +10 tests (58 green), 2-reviewer PASS. (Also rescued papa's orphaned streaming fix:
   `U-NNG-STREAMING-RESCUE`.)
2. ✅ SHIPPED `U-NN-DEGENERACY-HOOK-SURFACE` (f844af7eb3, 2026-06-03): `classifyGnn` additively reads
   `evalReport.degeneracy` → both consumer hooks now show `[DEGENERATE]` (constant-vote, tie-break
   artifact, NOT a near-miss → rearchitect not tune) instead of generic `[BELOW-GATE]`. Live per-prompt
   fleet signal verified. Single-source via classifyGnn. Mode-agnostic. +7 tests (93 green), 2-reviewer
   PASS. **The full honest-signal chain (eval→JSON→classifyGnn→fleet) is now complete.**
3. `U-NN-FEATURE-SEPARABILITY` (REMAINING — the real model fix, LARGE research unit, fresh session):
   class-balanced reference sampling (the pool is Lathe*-dominant → prior collapse) + audit whether the
   768d node embeddings separate dispatcher classes at all (`node-embeddings-768d.jsonl`). The vote in
   `seed-ghost-gnn-classify.mjs` (`min(cap, voteShare)`, weight = linkScore·refConf) collapses to the
   class prior when link scores don't discriminate. Gate is LIVE (62-ghost holdout) so any retrain/
   feature change is immediately gradeable — and the degeneracy guard will confirm if the collapse
   actually breaks. This is the unit that could finally move AUROC off 0.5.

See CLAUDE.md §NN-GRAPH. Related: [[reference_gnn_node_embedding_bridge_2026_05_23]].
