# STUB-HUNT-MS0/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER — [MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER (slot:bravo iter29, mill-galaxy): restore ToolSelectionRecommenderEngine.ts from 16-line U-EFF25 stub. millDispatcher routes 3 actions (recommend/assemblyCheck/matchHolder). Real implementation: recommend() emits Sandvik Coromant baseline by ISO group + operation tweak (rough P/M Ø≥12mm adds a flute, finish N/K drops one), fields {substrate, coating, flutes, helix_deg, rationale}; assemblyCheck() L:D classification (rigid≤3, standard≤5, long-reach≤8, extreme>8) with cantilever-deflection probe via MillingForceEngine (canonical δ=F·L³/3EI, soul-rule satisfied — NEVER inlined) + warnings on long-reach chatter risk; matchHolder() ER16/25/32 + HSK-A40/63/100 catalog with maxRpm + maxToolWeightKg gates, smallest-capable-fits-best selection. Material→ISO keyword scan (inconel→S, alum→N, iron→K, stainless→M, hardened→H, default→P). Named constants for L:D thresholds + tolerance. Fail-loud per R12 on missing inputs. 16/16 PASS vitest hermetic (6 recommend + 4 assemblyCheck + 5 matchHolder + 1 identity). STUB-HUNT progress: 7 of 9 rescued. Remaining: ToolpathStrategy + MillPrintToProgram (P1 mill) + 2 unwired (CADFeatureRecognition + CAMPhase5Stubs).

**Commit:** `c40a89ce22f8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T02:11:46-05:00
**Tags:** stub-hunt-ms0, u-stub-hunt-07-toolsel-recommender, auto-distilled

## Subject
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER (slot:bravo iter29, mill-galaxy): restore ToolSelectionRecommenderEngine.ts from 16-line U-EFF25 stub. millDispatcher routes 3 actions (recommend/assemblyCheck/matchHolder). Real implementation: recommend() emits Sandvik Coromant baseline by ISO group + operation tweak (rough P/M Ø≥12mm adds a flute, finish N/K drops one), fields {substrate, coating, flutes, helix_deg, rationale}; assemblyCheck() L:D classification (rigid≤3, standard≤5, long-reach≤8, extreme>8) with cantilever-deflection probe via MillingForceEngine (canonical δ=F·L³/3EI, soul-rule satisfied — NEVER inlined) + warnings on long-reach chatter risk; matchHolder() ER16/25/32 + HSK-A40/63/100 catalog with maxRpm + maxToolWeightKg gates, smallest-capable-fits-best selection. Material→ISO keyword scan (inconel→S, alum→N, iron→K, stainless→M, hardened→H, default→P). Named constants for L:D thresholds + tolerance. Fail-loud per R12 on missing inputs. 16/16 PASS vitest hermetic (6 recommend + 4 assemblyCheck + 5 matchHolder + 1 identity). STUB-HUNT progress: 7 of 9 rescued. Remaining: ToolpathStrategy + MillPrintToProgram (P1 mill) + 2 unwired (CADFeatureRecognition + CAMPhase5Stubs).

## Body
```
[MAIN] [STUB-HUNT-MS0]/U-STUB-HUNT-07-TOOLSEL-RECOMMENDER (slot:bravo iter29, mill-galaxy): restore ToolSelectionRecommenderEngine.ts from 16-line U-EFF25 stub. millDispatcher routes 3 actions (recommend/assemblyCheck/matchHolder). Real implementation: recommend() emits Sandvik Coromant baseline by ISO group + operation tweak (rough P/M Ø≥12mm adds a flute, finish N/K drops one), fields {substrate, coating, flutes, helix_deg, rationale}; assemblyCheck() L:D classification (rigid≤3, standard≤5, long-reach≤8, extreme>8) with cantilever-deflection probe via MillingForceEngine (canonical δ=F·L³/3EI, soul-rule satisfied — NEVER inlined) + warnings on long-reach chatter risk; matchHolder() ER16/25/32 + HSK-A40/63/100 catalog with maxRpm + maxToolWeightKg gates, smallest-capable-fits-best selection. Material→ISO keyword scan (inconel→S, alum→N, iron→K, stainless→M, hardened→H, default→P). Named constants for L:D thresholds + tolerance. Fail-loud per R12 on missing inputs. 16/16 PASS vitest hermetic (6 recommend + 4 assemblyCheck + 5 matchHolder + 1 identity). STUB-HUNT progress: 7 of 9 rescued. Remaining: ToolpathStrategy + MillPrintToProgram (P1 mill) + 2 unwired (CADFeatureRecognition + CAMPhase5Stubs).
```

## Files touched (3)
- .../ToolSelectionRecommenderEngine.test.ts         | 131 ++++++++++++++
- .../src/engines/ToolSelectionRecommenderEngine.ts  | 195 ++++++++++++++++++++-
- 2 files changed, 318 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- tilever-deflection probe via MillingForceEngine (canonical δ=F·L³/3EI, soul-rule satisfied — NEVER inlined) + warnings on long-reach chatter risk; matchHolder() ER16/25/32 + HSK-A40/63/100 catalog with maxRpm + maxToolWeightKg gates, smallest-capable-fits-best selection. Material→ISO keyword scan (inconel→S, alum→N, iron→K, stainless→M, hardened→H, default→P). Named constants for L:D thresholds + tol

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c40a89ce22f8`
- Milestone envelope: `mcp-server/data/milestones/STUB-HUNT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._