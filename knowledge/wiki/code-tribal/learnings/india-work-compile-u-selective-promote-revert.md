# INDIA-WORK-COMPILE/U-SELECTIVE-PROMOTE-REVERT — [MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-REVERT (slot:india): revert auto-promote -- single-seed 0.808 disproven by a fresh 0.4286 retrain

**Commit:** `b36894cc5406` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T09:44:21-05:00
**Tags:** india-work-compile, u-selective-promote-revert, auto-distilled

## Subject
[MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-REVERT (slot:india): revert auto-promote -- single-seed 0.808 disproven by a fresh 0.4286 retrain

## Body
```
[MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-REVERT (slot:india): revert auto-promote -- single-seed 0.808 disproven by a fresh 0.4286 retrain

Operator asked to activate GNN selective-deploy; I enabled PRISM_NN_SELECTIVE_PROMOTE
+ ran a forced retrain to reach the promote step. The retrain DISPROVED the premise:
fresh eval AUROC 0.4286 / macroF1 0.1053 / Brier 0.2557 -- failed full-coverage AND
selective gates -> not-promoted (gate correctly protected the live checkpoint). The
Jun-6 'AUROC 0.808 deploy-ready-selective' was a SINGLE-SEED outlier (0.38 swing),
exactly the high-variance non-separable behavior of feedback_multiseed_before_auroc_claim
+ U-NN-FEATURE-SEPARABILITY-CLOSE. robustAboveGate guards across-tau NOT across-seed, so
auto-promote could deploy a lucky seed -> reverted (env removed both scopes + this
installer edit). Auto-promote stays opt-in/default-off pending MULTI-SEED validation. Live
tier-5 unchanged (8-dim, defers to tiers 1-4 -- honest). PARSE_OK.
Memory reference_gnn_selective_promote_disproven_2026_06_15.
```

## Files touched (2)
- .claude/helpers/install-nn-graph-retrain-task.ps1 | 22 ++++++++--------------
- 1 file changed, 8 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b36894cc5406`
- Milestone envelope: `mcp-server/data/milestones/INDIA-WORK-COMPILE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._