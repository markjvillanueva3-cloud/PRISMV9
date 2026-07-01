# AI-SYSTEMS-GNN/U-GNN-SEP-VOTE-WEIGHT-WIRE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT-WIRE (slot:india): wire + measure the separability vote lever -- gate-safe RANKING gain, NOT a coverage lever

**Commit:** `6028b7fd5d0f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T08:27:08-05:00
**Tags:** ai-systems-gnn, u-gnn-sep-vote-weight-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT-WIRE (slot:india): wire + measure the separability vote lever -- gate-safe RANKING gain, NOT a coverage lever

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-SEP-VOTE-WEIGHT-WIRE (slot:india): wire + measure the separability vote lever -- gate-safe RANKING gain, NOT a coverage lever

Threads the opt-in separabilityWeights hook (7a69c45316) through the whole vote path + measures it.

WIRING (all additive, default-absent = byte-identical; the DEPLOYED path only FORWARDS the opt --
the policy lives in the measurement harness, so the live classifier is unchanged):
- seed-ghost-gnn-classify.mjs: thread separabilityWeights to voteDispatcher at all 3 sites (main
  vote loop + fitDirectConfidenceCalibrator call + its internal voteOpts -- no latent inconsistency).
- nn-graph-eval.mjs assessHoldout: forward opts.separabilityWeights to classifyUnknownGhosts.
- measure-codebase-wired-refpool-auroc.mjs: buildSeparabilityFactorMap (per-class margin from the
  labeled 3206 via classSeparability -> factor 1 + k*margin) + a --sep-weight=K mode (focused
  baseline-vs-sep-weighted on the SAME deployed refs, no injection).

MEASURED (deployed 355 refs, vote re-weighted, --controlled fixed holdout):
  baseline:        AUROC 0.7891, deploy-ready-selective, cov 27.4%, 2 classes
  sep-weight k=5:  AUROC 0.8531 (+0.064), HELD, cov 27.4%, 2 classes
  sep-weight k=10: AUROC 0.8836 (+0.095), HELD, cov 26.2%, 1 class
  sep-weight k=20: AUROC 0.8900 (+0.101), HELD robust, cov 26.2%, 1 class

FINDINGS (R12):
1. The lever is a real, gate-safe RANKING improvement (+0.101 AUROC at k=20) using NO new refs --
   cleaner than the cap=20 ref-pool lever (#15) which needs a shared-graph mutation.
2. It does NOT broaden coverage (stays ~27%, 1-2 classes). Vote-tuning alone is INSUFFICIENT.
3. TWO independent levers (ref-pool growth U-GNN-CODEBASE-WIRED-CAP-SWEEP + vote re-weighting here)
   now CONFIRM the coverage ceiling is FEATURE-limited, not vote-limited -- the separability
   diagnostic's "needs BOTH" verdict is proven. The real coverage lever is sharper features
   (embed text / model / learned projection), a separate larger unit.

Tests: +2 buildSeparabilityFactorMap (harness 9/9), voteDispatcher hook 74/74, eval seam 80/80;
parse-clean on all 4 files. Solo-reviewed (MCP bridge down + scrutiny subagents rate-limited -- R12).
```

## Files touched (5)
- scripts/lib/nn-graph-eval.mjs                         |  2 ++
- scripts/measure-codebase-wired-refpool-auroc.mjs      | 52 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/measure-codebase-wired-refpool-auroc.test.mjs | 40 +++++++++++++++++++++++++++++++++++++++-
- scripts/seed-ghost-gnn-classify.mjs                   |  5 +++++
- 4 files changed, 98 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6028b7fd5d0f`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._