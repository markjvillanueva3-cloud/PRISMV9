---
session: claude-046765e9
topic: india-gnn-tier5
slot: india
written_at: 2026-06-15T21:16:34.063Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-046765e9
status: active
---

# HANDOFF: claude-046765e9
Updated: 2026-06-15T21:16:34.064Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-046765e9

## STATE
## Session 2026-06-15 (post-compact continue) -- GNN tier-5 bottleneck diagnosis

### Shipped (slot/india, 4 commits, 3-of-3 PASS)
- 931694d039 U-GNN-HOLDOUT-VARIANCE: nn-graph-holdout-variance.mjs (+test 15/15), multi-seed fixed-model variance diag. Corrected 'single-seed outlier' -> direct-embed AUROC seed-stable ~0.83 (range 0.119 on n=13); 0.4286 was a DIFFERENT (trained) classifier. Refreshed stale NN-EVAL.json -> PSN-leg honest BELOW-GATE.
- 804243c349 U-GNN-POOL-COLLAPSE-ROOTCAUSE: streamed graph -> 208 ghosts stable, 31 at >=0.8, 129 (62%) in 0.6-0.8. Wiring-out refuted (stable count). refMinConf==confidenceCap=0.8 ceiling fragility.
- da848f34fb U-GNN-REFMINCONF-REFUTED: sweep 0.8/0.7/0.6 -> holdout 13/41/72 but AUROC 0.80/0.68/0.65, selective 0/3 at all. refMinConf is a red herring.
- 6c6eba8e86 U-GNN-SCRUTINY-FIX: softened overclaims (arm-B) + phantom operand (arm-A).

### tier-5 state (honest)
Live=8-dim/0.096, defers to tiers 1-4. Direct-embed AUROC ~0.83 but macroF1 ~0.10 (one-class) + Brier ~0.22, selective non-deployable on 31-pool. Auto-promote OFF. NN-EVAL refresh live on main-tree disk (git-sync commits the mirror).

### Next levers
1. GROUND-TRUTH ref-pool growth: operator-label 31-entry worklist (gated) OR wire vault-to-gnn-refpool into regen (autonomous, 9 now).
2. UNTESTED full-coverage axes: H2GCN/GPU features; class-weighting (macroF1 invariance shown only vs pool size).
3. Merge-landing (gated): unblocks TS-engine queue.

Memories: reference_gnn_selective_promote_disproven_2026_06_15 + reference_gnn_pool_collapse_confidence_deflation_2026_06_15 (both scrutiny-corrected).

## RESUME
GNN tier-5 bottleneck FULLY DIAGNOSED this session (4 commits 931694d0..6c6eba8e, 3-of-3 PASS). Live PSN-leg #10 now honest BELOW-GATE (refreshed NN-EVAL.json). NEXT high-ROI: tier-5 selective-deploy recovery needs GROUND-TRUTH ref-pool growth -> (a) operator-label the 31-entry active-label-worklist-proposed.json [GATED, 93% GNN<->Ollama conflict] OR (b) wire vault-to-gnn-refpool.mjs into the regen pipeline for durable autonomous growth [9 refs available now, currently NOT regen-wired so one-shot --apply is ephemeral]. UNTESTED full-coverage axes (scrutiny arm-B): H2GCN/GPU richer features + class-weighting. Bigger unblock pending: the merge-landing (clean main worktree, cherry-pick slot/india -> lands TS-engine queue). Re-enter: /startup-india /loop [10m] /goal

## CONTEXT

