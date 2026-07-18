# AI-SYSTEMS-GNN/U-GNN-SELECTIVE-PROMOTE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYSTEMS-GNN]/U-GNN-SELECTIVE-PROMOTE (slot:alpha): unblock the GNN tier-5 deploy path -- promote a robustly deploy-ready-SELECTIVE checkpoint (opt-in).

**Commit:** `088e74fb92e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T11:23:28-05:00
**Tags:** ai-systems-gnn, u-gnn-selective-promote, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYSTEMS-GNN]/U-GNN-SELECTIVE-PROMOTE (slot:alpha): unblock the GNN tier-5 deploy path -- promote a robustly deploy-ready-SELECTIVE checkpoint (opt-in).

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [AI-SYSTEMS-GNN]/U-GNN-SELECTIVE-PROMOTE (slot:alpha): unblock the GNN tier-5 deploy path -- promote a robustly deploy-ready-SELECTIVE checkpoint (opt-in).

THE thing that made the GNN build useless: the live tier-5 runs the ancient 8-dim AUROC-0.096 checkpoint because NO model clears the full-coverage gate (a research ceiling -- ref-pool + arch, not calibration) AND the lifecycle promoted ONLY on full-coverage verdict==='deploy-ready'. The production-ready selective checkpoint (AUROC 0.808, robust deploy-ready-selective @ tau=0.7, 32% coverage) could never go live.

FIX: extend promoteDecision (THE safety invariant) with a gated selective branch -- when the full-coverage gate cannot clear BUT the candidate is robustly deploy-ready-selective (AUROC certifies the global confidence order AND the emitted set clears Brier+macroF1 at AND above the production gate tau=GNN_DEFAULTS.minConf, robustAboveGate=every tau>=gate, not a lone spike), promote with mode:selective. SAFE: (1) opt-in PRISM_NN_SELECTIVE_PROMOTE=1, default OFF -> production NEVER auto-flips (live-proven: flag OFF promote=false, byte-identical); (2) no consumer change -- the tier-5 consumer ALREADY abstains below minConf and defers to the LLM tier, so the selective checkpoint is strictly better than the 0.096 model (good predictions above tau, 0 cost below); (3) requires the FULL selective grade to pass, not just a favorable tau.

WIRE: caller passes allowSelective from env; result.action records 'promoted-selective'/'dry-run-would-promote-selective' + result.promoteMode for the ledger. env-knob documented.
TEST: +6 reference tests (selective+flag promotes / NO flag=no auto-flip / not-robust rejected / selective-grade-fail rejected / full-coverage STILL promotes mode:full / deferred never promoted). 13/13 promoteDecision tests pass; safety invariant preserved.
VALIDATE (live): promoteDecision against the REAL state/shared/nn-graph/NN-EVAL.json -> flag OFF=promote:false, flag ON=promote:true mode:selective. The operator/india flips the flag to actually deploy.

NOTE (R12): the promote DECISION is tested + live-validated; the full end-to-end lifecycle run (548MB graph + retrain, heap-bumped runner, india's lane) was NOT executed here -- but it is gated behind the flag anyway, so this commit changes NO production behavior until opted in. Closes dispatch-plan row 1 (the decision path).
```

## Files touched (3)
- scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs                | 39 ++++++++++++++++++++++++++++++++++-----
- 2 files changed, 93 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- TILL promotes mode:full / deferred never promoted). 13/13 promoteDecision tests pass; safety invariant preserved.
- til opted in. Closes dispatch-plan row 1 (the decision path).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 088e74fb92e2`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._