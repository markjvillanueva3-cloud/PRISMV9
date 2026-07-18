# BLACKWELL-AI-MS0/U-LEG-STATE-SELECTIVE-WIRE — [MAIN] [BLACKWELL-AI-MS0]/U-LEG-STATE-SELECTIVE-WIRE (slot:india): surface GNN tier-5 deploy-ready-selective in the fleet PSN health readers — correct the now-false "tier-5 dormant"

**Commit:** `15eceefa2431` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T00:44:54-05:00
**Tags:** blackwell-ai-ms0, u-leg-state-selective-wire, auto-distilled

## Subject
[MAIN] [BLACKWELL-AI-MS0]/U-LEG-STATE-SELECTIVE-WIRE (slot:india): surface GNN tier-5 deploy-ready-selective in the fleet PSN health readers — correct the now-false "tier-5 dormant"

## Body
```
[MAIN] [BLACKWELL-AI-MS0]/U-LEG-STATE-SELECTIVE-WIRE (slot:india): surface GNN tier-5 deploy-ready-selective in the fleet PSN health readers — correct the now-false "tier-5 dormant"

After U-GNN-SELECTIVE-DEPLOY (b0b5b08716), NN-EVAL.json carries selective.deployGrade (tier-5 deploy-ready-selective @ production gate tau=0.7, 32% coverage). But the fleet's per-prompt PSN-leg-state banner + the SessionStart NN-GRAPH health digest still read only the full-holdout grade and reported "BELOW-GATE / tier-5 dormant" — which is now FALSE: the tier contributes on 32% of ghosts and defers the rest to the LLM tier.

WIRED (single source of truth first): classifyGnn (nn-graph-health-inject.mjs) now exposes selectiveDeployReady + selectiveOperatingPoint from r.selective.deployGrade (null-guarded; legacy/absent selective -> false). Both consumers surface it:
- formatDigest: new "DEPLOY-READY-SELECTIVE @ tau=0.7, 32% of ghosts (Brier 0.041, macro-F1 1.0)" line instead of "below promotion gate - not yet contributing".
- legStateNnGraph (psn-leg-state-inject.mjs): new SELECTIVE-DEPLOY status instead of "BELOW-GATE ... (tier-5 dormant)".

Honest framing retained: still notes full-coverage pending reference-pool growth; full-holdout grade untouched; back-compat (graded-below without selective -> BELOW-GATE unchanged). 108 tests pass incl back-compat + anti-drift REAL-DATA guard (allowlist extended with SELECTIVE-DEPLOY) + the regression guard that the banner must NOT claim dormant. 1 reviewer PASS (0 P0/P1). Live-verified on the on-disk NN-EVAL.json.
```

## Files touched (5)
- .claude/hooks/nn-graph-health-inject.mjs      | 17 +++++++++++++++++
- .claude/hooks/nn-graph-health-inject.test.mjs | 50 ++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/psn-leg-state-inject.mjs        | 10 ++++++++++
- .claude/hooks/psn-leg-state-inject.test.mjs   | 27 ++++++++++++++++++++++++++-
- 4 files changed, 103 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till read only the full-holdout grade and reported "BELOW-GATE / tier-5 dormant" — which is now FALSE: the tier contributes on 32% of ghosts and defers the rest to the LLM tier.
- till notes full-coverage pending reference-pool growth; full-holdout grade untouched; back-compat (graded-below without selective -> BELOW-GATE unchanged). 108 tests pass incl back-compat + anti-drift REAL-DATA guard (allowlist extended with SELECTIVE-DEPLOY) + the regression guard that the banner must NOT claim dormant. 1 reviewer PASS (0 P0/P1). Live-verified on the on-disk NN-EVAL.json.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 15eceefa2431`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._