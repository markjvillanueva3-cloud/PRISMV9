# PSN-SYNERGY-COLLECT-MS3/U-NN-DEGENERACY-HOOK-SURFACE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-NN-DEGENERACY-HOOK-SURFACE (slot:india): fleet-wide [DEGENERATE] per-prompt signal. classifyGnn additively reads NN-EVAL.json degeneracy field -> both consumer hooks (psn-leg-state per-prompt x26 + nn-graph-health SessionStart) now show [DEGENERATE] (constant-vote collapse, tie-break artifact, NOT a near-miss -> rearchitect not tune) instead of generic [BELOW-GATE]. Single-source via classifyGnn (no re-read divergence). Mode-agnostic wording (constant-vote AND constant-confidence). +7 tests (93 green), 2-reviewer PASS 0 P0/P1, live verified. Completes honest-signal chain: eval->JSON->classifyGnn->fleet.

**Commit:** `f844af7eb31f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-03T08:37:41-05:00
**Tags:** psn-synergy-collect-ms3, u-nn-degeneracy-hook-surface, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-NN-DEGENERACY-HOOK-SURFACE (slot:india): fleet-wide [DEGENERATE] per-prompt signal. classifyGnn additively reads NN-EVAL.json degeneracy field -> both consumer hooks (psn-leg-state per-prompt x26 + nn-graph-health SessionStart) now show [DEGENERATE] (constant-vote collapse, tie-break artifact, NOT a near-miss -> rearchitect not tune) instead of generic [BELOW-GATE]. Single-source via classifyGnn (no re-read divergence). Mode-agnostic wording (constant-vote AND constant-confidence). +7 tests (93 green), 2-reviewer PASS 0 P0/P1, live verified. Completes honest-signal chain: eval->JSON->classifyGnn->fleet.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [PSN-SYNERGY-COLLECT-MS3]/U-NN-DEGENERACY-HOOK-SURFACE (slot:india): fleet-wide [DEGENERATE] per-prompt signal. classifyGnn additively reads NN-EVAL.json degeneracy field -> both consumer hooks (psn-leg-state per-prompt x26 + nn-graph-health SessionStart) now show [DEGENERATE] (constant-vote collapse, tie-break artifact, NOT a near-miss -> rearchitect not tune) instead of generic [BELOW-GATE]. Single-source via classifyGnn (no re-read divergence). Mode-agnostic wording (constant-vote AND constant-confidence). +7 tests (93 green), 2-reviewer PASS 0 P0/P1, live verified. Completes honest-signal chain: eval->JSON->classifyGnn->fleet.
```

## Files touched (5)
- .claude/hooks/nn-graph-health-inject.mjs      | 15 +++++++++++++++
- .claude/hooks/nn-graph-health-inject.test.mjs | 45 +++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/psn-leg-state-inject.mjs        |  6 ++++++
- .claude/hooks/psn-leg-state-inject.test.mjs   | 19 ++++++++++++++++++-
- 4 files changed, 84 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f844af7eb31f`
- Milestone envelope: `mcp-server/data/milestones/PSN-SYNERGY-COLLECT-MS3.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._