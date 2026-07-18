# QUOTING-SYNERGY-MS0/U-QP-COST-BASIS-NORMALIZE — [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-COST-BASIS-NORMALIZE (slot:charlie): units-correct $/in3 material cost basis from the $10M JM AP ledger (units-gated gotcha #25 lever). Density-FREE: block (qty=1, exact A*B*C vol)=consumable primary; round/bar=advisory (qty grain ambiguous). Live 20736 rows -> 9 consumable grades (H13 $1.55/S7 $1.23/A2 $1.40/4140 $1.62/O1 $4.41/1045 $0.85 per in3, plausible finished tool-steel). Cross-form invariant caught 2 bugs pre-ship (.500->500 1000x; qty>1 bar-vs-block). 2-reviewer per-file gate caught+fixed P0 grade-digit-bleed + P1 null-throw + P1 qty<=0; 26/26 incl CLI subprocess oracle + fail-on-revert. Artifact jm-material-cost-basis.json

**Commit:** `1a42acbc3088` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T10:47:15-05:00
**Tags:** quoting-synergy-ms0, u-qp-cost-basis-normalize, auto-distilled

## Subject
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-COST-BASIS-NORMALIZE (slot:charlie): units-correct $/in3 material cost basis from the $10M JM AP ledger (units-gated gotcha #25 lever). Density-FREE: block (qty=1, exact A*B*C vol)=consumable primary; round/bar=advisory (qty grain ambiguous). Live 20736 rows -> 9 consumable grades (H13 $1.55/S7 $1.23/A2 $1.40/4140 $1.62/O1 $4.41/1045 $0.85 per in3, plausible finished tool-steel). Cross-form invariant caught 2 bugs pre-ship (.500->500 1000x; qty>1 bar-vs-block). 2-reviewer per-file gate caught+fixed P0 grade-digit-bleed + P1 null-throw + P1 qty<=0; 26/26 incl CLI subprocess oracle + fail-on-revert. Artifact jm-material-cost-basis.json

## Body
```
[MAIN] [QUOTING-SYNERGY-MS0]/U-QP-COST-BASIS-NORMALIZE (slot:charlie): units-correct $/in3 material cost basis from the $10M JM AP ledger (units-gated gotcha #25 lever). Density-FREE: block (qty=1, exact A*B*C vol)=consumable primary; round/bar=advisory (qty grain ambiguous). Live 20736 rows -> 9 consumable grades (H13 $1.55/S7 $1.23/A2 $1.40/4140 $1.62/O1 $4.41/1045 $0.85 per in3, plausible finished tool-steel). Cross-form invariant caught 2 bugs pre-ship (.500->500 1000x; qty>1 bar-vs-block). 2-reviewer per-file gate caught+fixed P0 grade-digit-bleed + P1 null-throw + P1 qty<=0; 26/26 incl CLI subprocess oracle + fail-on-revert. Artifact jm-material-cost-basis.json
```

## Files touched (5)
- scripts/lib/material-cost-basis-normalize.mjs      | 293 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/material-cost-basis-normalize.test.mjs | 297 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/material-cost-basis-normalize.mjs          | 110 +++++++++++++++++++++++++++++
- state/shared/quoting/jm-material-cost-basis.json   | 150 ++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 850 insertions(+)

## Lessons surfaced in commit body
- gotcha #25 lever). Density-FREE: block (qty=1, exact A*B*C vol)=consumable primary; round/bar=advisory (qty grain ambiguous). Live 20736 rows -> 9 consumable grades (H13 $1.55/S7 $1.23/A2 $1.40/4140 $1.62/O1 $4.41/1045 $0.85 per in3, plausible finished tool-steel). Cross-form invariant caught 2 bugs pre-ship (.500->500 1000x; qty>1 bar-vs-block). 2-reviewer per-file gate caught+fixed P0 grade-digit-blee

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a42acbc3088`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._