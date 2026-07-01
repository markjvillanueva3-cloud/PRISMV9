# INDIA-WORK-COMPILE/U-SELECTIVE-PROMOTE-ACTIVATE — [MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-ACTIVATE (slot:india): activate GNN selective-deploy on the retrain cron

**Commit:** `7a7245557723` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T09:08:31-05:00
**Tags:** india-work-compile, u-selective-promote-activate, auto-distilled

## Subject
[MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-ACTIVATE (slot:india): activate GNN selective-deploy on the retrain cron

## Body
```
[MAIN-FORCE] [INDIA-WORK-COMPILE]/U-SELECTIVE-PROMOTE-ACTIVATE (slot:india): activate GNN selective-deploy on the retrain cron

TIER-1 #1 unlock + enhancement: the live tier-5 serves the 8-dim AUROC-0.096
checkpoint while the validated 768d candidate (selective @ tau=0.7, AUROC 0.808)
sits unpromoted because PRISM_NN_SELECTIVE_PROMOTE was default-OFF. The retrain
task's elevated installer now sets that flag Machine-scope (gated on isAdmin,
preserves an explicit =0 opt-out), so the operator's next standard re-install
activates selective-promote -- the next scheduled retrain promotes a gate-clearing
768d candidate (promoteDecision still requires deployGrade.pass + robustAboveGate,
so gate-PROTECTED, not a bypass). Immediate live-enable without re-install:
[Environment]::SetEnvironmentVariable('PRISM_NN_SELECTIVE_PROMOTE','1','Machine')
(elevated). PARSE_OK verified.
```

## Files touched (2)
- .claude/helpers/install-nn-graph-retrain-task.ps1 | 17 ++++++++++++++++-
- 1 file changed, 16 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till requires deployGrade.pass + robustAboveGate,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a7245557723`
- Milestone envelope: `mcp-server/data/milestones/INDIA-WORK-COMPILE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._