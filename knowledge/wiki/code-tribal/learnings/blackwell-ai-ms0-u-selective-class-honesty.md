# BLACKWELL-AI-MS0/U-SELECTIVE-CLASS-HONESTY — [MAIN] [BLACKWELL-AI-MS0]/U-SELECTIVE-CLASS-HONESTY (slot:india): surface emitted-set class concentration in the deploy-ready-selective verdict (R12 — stop "macro-F1 1.0" over-read)

**Commit:** `0977fea47202` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T01:07:39-05:00
**Tags:** blackwell-ai-ms0, u-selective-class-honesty, auto-distilled

## Subject
[MAIN] [BLACKWELL-AI-MS0]/U-SELECTIVE-CLASS-HONESTY (slot:india): surface emitted-set class concentration in the deploy-ready-selective verdict (R12 — stop "macro-F1 1.0" over-read)

## Body
```
[MAIN] [BLACKWELL-AI-MS0]/U-SELECTIVE-CLASS-HONESTY (slot:india): surface emitted-set class concentration in the deploy-ready-selective verdict (R12 — stop "macro-F1 1.0" over-read)

The selective-deploy verdict (shown fleet-wide) reports macro-F1 1.0 at production gate tau=0.7, but the 20-ghost emitted set spans only 2 of 6 dispatcher classes (high-confidence band = easy prism_turning lathe cluster). Surfacing the concentration so "macro-F1 1.0" is not over-read as "perfect across all dispatchers".

WIRED: selectiveDeployPoint computes totalClasses; gradeSelectiveDeploy carries classesEmitted + totalClasses + a concentrated flag + appends the caveat to its note. Surfaced in renderReport, the SessionStart NN-GRAPH digest, and the per-prompt PSN-leg-state banner ("spans 2/6 classes (concentrated)"). Additive + null-guarded.

195 tests green; live-verified (classesEmitted 2, totalClasses 6, concentrated true). SCOPED: calibration GATE_THRESHOLDS-sourcing P2 deferred. NOTE: verified U-ROUTE-LADDER already done (capability probe feeds route; deepseek refs are comments) — no rebuild.
```

## Files touched (9)
- .claude/hooks/nn-graph-health-inject.mjs      | 10 ++++++++--
- .claude/hooks/nn-graph-health-inject.test.mjs |  9 +++++++--
- .claude/hooks/psn-leg-state-inject.mjs        |  5 ++++-
- .claude/hooks/psn-leg-state-inject.test.mjs   |  3 ++-
- scripts/lib/nn-graph-eval.mjs                 | 25 ++++++++++++++++++++-----
- scripts/lib/nn-graph-eval.test.mjs            | 26 ++++++++++++++++++++++++++
- state/shared/nn-graph/NN-EVAL.json            | 12 ++++++++----
- state/shared/nn-graph/NN-EVAL.md              |  4 ++--
- 8 files changed, 77 insertions(+), 17 deletions(-)

## Lessons surfaced in commit body
- NOTE: verified U-ROUTE-LADDER already done (capability probe feeds route; deepseek refs are comments) — no rebuild.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0977fea47202`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._