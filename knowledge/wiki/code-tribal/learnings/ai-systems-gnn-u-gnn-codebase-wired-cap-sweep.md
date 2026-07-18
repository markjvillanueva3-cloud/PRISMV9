# AI-SYSTEMS-GNN/U-GNN-CODEBASE-WIRED-CAP-SWEEP — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-CAP-SWEEP (slot:india): per-class-capped subset maps the density/coverage tradeoff -- ranking lever, NOT a coverage lever

**Commit:** `afeac9e1f470` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T22:04:55-05:00
**Tags:** ai-systems-gnn, u-gnn-codebase-wired-cap-sweep, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-CAP-SWEEP (slot:india): per-class-capped subset maps the density/coverage tradeoff -- ranking lever, NOT a coverage lever

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-CODEBASE-WIRED-CAP-SWEEP (slot:india): per-class-capped subset maps the density/coverage tradeoff -- ranking lever, NOT a coverage lever

Adds capPerClass() + --cap-per-class=N to the measure harness (the #14 density test).
The all-3206 collapse was density-driven; this sweeps balanced sparse subsets.

CONTROLLED (faithful, FIXED base 84 holdout, --controlled):
  baseline (355 refs): AUROC 0.7891, deploy-ready-selective, cov 27.4%, Brier@gate 0.0417, 2/13
  cap=5  (263 refs):   AUROC 0.8777 (+0.089), deploy-ready (HELD), cov 23.8%, Brier@gate 0.04, 1/13
  cap=10 (~440):       AUROC 0.879  (+0.090), deploy-ready (HELD)
  cap=20 (618 refs):   AUROC 0.8886 (+0.099, PEAK), deploy-ready (HELD, robust) -- AND live-eval HOLDS
  cap=50 (978 refs):   AUROC 0.8764, no-deployable-operating-point (COLLAPSED, Brier@gate 0.08)
  all-3206:            AUROC 0.7925, no-deployable (collapsed, Brier@gate 0.20)

FINDINGS (R12):
1. DENSITY HYPOTHESIS CONFIRMED -- sparse balanced subsets (cap<=20, <=618 refs) HOLD the selective
   gate; the calibration collapse threshold is BETWEEN cap=20 and cap=50. The all-3206 collapse was
   pure density (spurious high-confidence votes from a too-dense diverse pool).
2. cap=20 is the AUROC optimum (+0.099 controlled) AND the only point where the LIVE-EVAL verdict
   also holds (enriched deploy-ready-selective) -- harness says "APPLY is justified".
3. BUT NO cap BROADENS coverage -- every gate-holding cap NARROWS the emitted band to 1 class
   (coverage flat-to-down). The codebase-wired refs are a RANKING-quality lever, NOT a coverage
   lever. This REFUTES the standing "full-coverage via ref-pool growth" assumption for this ref
   source (full-coverage needs sharper features / H2GCN / retrain, not these refs).

DEPLOYMENT: cap=20 is a measured, gate-safe, live-safe RANKING improvement (+0.099 AUROC) but does
NOT serve the stated coverage goal (slightly reduces coverage). Applying it is an operator
ranking-vs-coverage decision + a supervised shared-graph mutation -- queued as optional #15, NOT
auto-applied. 7/7 harness tests (3 new capPerClass). Solo-reviewed (subagents rate-limited earlier).
```

## Files touched (3)
- scripts/measure-codebase-wired-refpool-auroc.mjs      | 44 ++++++++++++++++++++++++++++++++++++++++++--
- scripts/measure-codebase-wired-refpool-auroc.test.mjs | 27 ++++++++++++++++++++++++++-
- 2 files changed, 68 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show afeac9e1f470`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._