# DISCOVERY-EFFICIENCY/U-INLINE-CONST-CLASSIFY — [MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-INLINE-CONST-CLASSIFY: split inline kc1.1 into matches-canonical vs non-group (triage), close the divergent blind spot

**Commit:** `f1f13896f4d8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T12:12:56-05:00
**Tags:** discovery-efficiency, u-inline-const-classify, auto-distilled

## Subject
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-INLINE-CONST-CLASSIFY: split inline kc1.1 into matches-canonical vs non-group (triage), close the divergent blind spot

## Body
```
[MAIN-FORCE] [DISCOVERY-EFFICIENCY]/U-INLINE-CONST-CLASSIFY: split inline kc1.1 into matches-canonical vs non-group (triage), close the divergent blind spot

The assess-engine-algo-improvements.mjs inline-constant regex matched ONLY the 6
canonical ISO-group kc1.1 values (1800/2100/1100/700/2800/3200), so it flagged the
harmless matches-canonical subset and was BLIND to every other value. Extract the
detection into a pure, unit-tested lib scripts/lib/inline-const-classify.mjs
(classifyInlineKc -> {values, matchesCanonical, divergent}) and broaden the VALUE
side to ANY number, then split the two. 11/11 node:test (real reference values).

inlineConstant 70 -> 73 (3 divergent-only files the old regex missed); new
inlineDivergent dimension = 36.

R12 / verify-on-disk -- did NOT ship the overclaim: inlineDivergent is NOT '36 safety
bugs'. The 6 canonical values are per-ISO-GROUP representatives; real engines carry
legitimate per-MATERIAL tables (KienzleForceModelEngine:260 = AISI 1045 kc1.1=1780
iso_group P, by design; CryogenicCuttingEngine aluminium kc1.1=750). Divergent =
'review whether this should reference MATERIAL_DB' -- a physics-reviewer triage signal,
occasionally real drift (historical CryogenicCutting 1500-below-ISO-3685), mostly
legitimate. All scanner/lib/test prose reworded to that honest framing; advisory +
must-human-verify preserved. scanner remains run-on-import (no behavior regression;
node --check clean).
```

## Files touched (4)
- scripts/assess-engine-algo-improvements.mjs | 22 +++++++++++++++-------
- scripts/lib/inline-const-classify.mjs       | 63 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/inline-const-classify.test.mjs  | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 153 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f1f13896f4d8`
- Milestone envelope: `mcp-server/data/milestones/DISCOVERY-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._