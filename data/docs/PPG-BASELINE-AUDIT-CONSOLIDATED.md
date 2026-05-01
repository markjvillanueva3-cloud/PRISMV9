# PPG Baseline Audit — Consolidated Findings (5 Agents)

**File:** HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps (22,059 lines)
**Date:** 2026-04-07
**Agents:** Original Bug Audit, Machinist (20yr Hurco), Physics Specialist, Code Quality Expert, Product Manager

## CRITICAL (8) — Will crash machine or produce garbage G-code

1. **Missing F word** — `getFeed()` line 19062 returns raw number not `feedOutput.format(f)`. Affects facing + chamfer 2D contour.
2. **`prismEnabled` undefined** — 5 calls to non-existent property. Entire advanced feed optimization (700 lines) is dead code. Should be `prismEnableIntelligence`.
3. **`progFeed` undefined** — Smart override mode: `progFeed * 1.30` = NaN. Lines 19896-19897.
4. **No G49 before tool change** — Old length offset applied to new tool → Z crash risk. Lines 19565-19676.
5. **No G49 in safe start** — Program restart with active offset → wrong Z. Lines 17777-17781.
6. **G20/G21 never output** — `gUnitModal` defined but never used. Wrong unit mode = crash.
7. **5 undefined properties** — useMultiAxisFeatures, useABCPrepositioning, useDPMFeeds, safeRetractDistance, useG54x4 — referenced but never declared.
8. **`smoothingTolerance` undefined** — G5.2 block never outputs.

## HIGH (12) — Wrong results or machine alarms

9. **SQRT chip thinning wrong** — Uses `1/sqrt(ae/D)` instead of Sandvik `1/sqrt(ae/D*(1-ae/D))`. 13-26% error at 25-45% WOC. Line 14376.
10. **10+ digit decimals** — IEEE-754 float chain bypasses feedFormat. Line 19092 chain + bug 1 bypass.
11. **G05.3 never cancelled** — Stays active during canned cycles → Hurco alarm. No cancel in onSectionEnd.
12. **G05.3 only on tool change** — Same-tool finishing gets roughing smoothing value. Inside `if(insertToolCall)`.
13. **BNC dwell format** — Spindle warm-up G4 P75.0000: BNC interprets as milliseconds not seconds. Line 17811.
14. **Velocity overestimate 41%** — `getMaxFeedForSegment` uses `sqrt(2*a*L)` vs correct `sqrt(a*L)`. Line 17255.
15. **10,700 lines copy-paste** — 24 tool pockets × 446 lines = 48% of file. Code Quality.
16. **Safety-critical magic numbers** — LOC engagement thresholds 0.85/0.75/0.65/0.55 undocumented. Lines 18579-18594.
17. **Duplicate tool check disabled** — `if(false)` at line 17734. Dangerous for production.
18. **BNC G83 triple Z-word** — Ambiguous for Hurco BNC mode. Lines 20507-20513.
19. **Duplicate feed properties** — maximumFeedrate vs prismMaxFeedRate, minimumFeedrate vs minChipLoadFeed, global vs per-tool chip thin cap conflict.
20. **G64 UltiMotion claimed but never output** — Header mentions G64, code never writes it.

## MEDIUM (15)

21. Stickout uses flute length not true stickout (underestimates L/D). Line 18850.
22. Cutting force Fc = kc*ap*h missing engagement width. Line 15609.
23. Three different chip thickness formulas across file (inconsistent physics).
24. Tapping doesn't reset feed mode to G94 after G80. onCycleEnd.
25. M90/M91 not standard Hurco M-codes. Lines 21762-21823.
26. G05.3 P range allows 1-100 but some WinMax only accept 1-50. Lines 436-457.
27. Duplicate var prismEnhancedArcRadius. Lines 17875, 21174.
28. Dead function getAdjustedChipThinningForLimitedAe. Lines 18536-18550.
29. Dead property prismEnableMaterialIntelligence. Line 1044.
30. previousDirection/previousPosition never reset between operations. Lines 17872-17873.
31. Silent catch with 100 m/min fallback — dangerous for Ti/Inconel. Lines 16160-16175.
32. Double negation logic `!(... !== "off")`. Line 18367.
33. optMode duplicate in object literal. Lines 16105, 16119.
34. Washdown dwell `"P5."` raw string not formatted. Line 22038.
35. Confusing nested functions in calculateAxialDepthFactor. Lines 18418-18655.

## LOW (8)

36. toolChangePositionY description says "X axis". Line 383.
37. Div-by-zero gap in calculateDynamicDepthFeed. Line 18739.
38. M2 instead of M30 for program end. Line 22052.
39. Gravity constant hardcoded vs computed. Line 14686 vs 17172.
40. Rake angle correction sign convention undocumented. Line 15575.
41. Surface finish formula factor documentation. Lines 14998-15001.
42. Missing jerk unit exponent in comment (m/s not m/s^3). Line 17175.
43. UltiMotion G64 mentioned in header but not in code. Line 31.

## MISSING FEATURES (by impact)

| Feature | Current Score | Notes |
|---------|--------------|-------|
| Thread milling | 5% | Falls back to expandCyclePoint (linearized). No helical G2/G3+Z. |
| Program splitting | 0% | No split at tool changes. No max-lines property. |
| Sub-program generation | 5% | Only M98 for air-thru-spindle macros. No hole pattern sub-programs. |
| Setup sheet | 15% | Tool list only. No stock dims, fixtures, total time. |
| Custom M-code injection | 40% | No generic before/after tool change hooks. |
| G64 UltiMotion | 0% | Claimed but not implemented. |
| Toolpath filtering | 20% | No micro-segment filter or short segment merge. |
| Cycle time accumulation | 50% | Per-op only, no program total. |
| 5-axis rewind | 0% | onRewindMachineEntry returns false. |

## FEATURE COMPLETENESS: 50% overall

| Feature | Score |
|---------|-------|
| Probing (Renishaw) | 95% |
| Adaptive/Trochoidal | 90% |
| Inverse Time G93 | 90% |
| Post Notes/Comments | 85% |
| 5-Axis (3+2 + sim) | 70% |
| Metric/Imperial | 70% |
| HSM/Smoothing | 60% |
| Multi-Axis Drilling | 50% |
| Cycle Time | 50% |
| Custom M-Codes | 40% |
| Toolpath Filtering | 20% |
| Setup Sheet | 15% |
| Thread Milling | 5% |
| Sub-Programs | 5% |
| Program Splitting | 0% |
