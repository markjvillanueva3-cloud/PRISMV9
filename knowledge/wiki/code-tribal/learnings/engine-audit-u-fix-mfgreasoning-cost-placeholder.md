# ENGINE-AUDIT/U-FIX-MFGREASONING-COST-PLACEHOLDER — [MAIN-FORCE] [ENGINE-AUDIT]/U-FIX-MFGREASONING-COST-PLACEHOLDER (slot:bravo): stop presenting non-computed cost as a 0.7-confidence figure (R12 honesty)

**Commit:** `9db0128439e0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:30:53-05:00
**Tags:** engine-audit, u-fix-mfgreasoning-cost-placeholder, auto-distilled

## Subject
[MAIN-FORCE] [ENGINE-AUDIT]/U-FIX-MFGREASONING-COST-PLACEHOLDER (slot:bravo): stop presenting non-computed cost as a 0.7-confidence figure (R12 honesty)

## Body
```
[MAIN-FORCE] [ENGINE-AUDIT]/U-FIX-MFGREASONING-COST-PLACEHOLDER (slot:bravo): stop presenting non-computed cost as a 0.7-confidence figure (R12 honesty)

The 9th fabricated-output candidate (detector-found): applyCostImpact pushed
estimated_cost:0.50 (//Placeholder) + 0 into chain.cost_implications -> summed
into a returned totalCost AT CONFIDENCE 0.7/0.6, presenting a fabricated cost as
real. ManufacturingProblem carries no tool price / cycle time / machine rate, so
a real cost genuinely cannot be derived here (verified the type). R12-honest fix:
relabel both as explicit PLACEHOLDER (description + notes), drop confidence to 0.1,
zero the fabricated 0.50 -- surfaces the estimate instead of fabricating it. Real
values need ToolROIEngine/cost-optimizer wiring (tracked in the audit report sec 3d).
No fake data invented. tsc clean (all 4 importers compile); detector confirms the
candidate is removed. Same fabricated-output class, integration-blocked variant.
```

## Files touched (2)
- mcp-server/src/engines/ManufacturingReasoningEngine.ts | 21 +++++++++++++--------
- 1 file changed, 13 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9db0128439e0`
- Milestone envelope: `mcp-server/data/milestones/ENGINE-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._