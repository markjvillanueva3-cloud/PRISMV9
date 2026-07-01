# SFC-PAGE-CLOSED-LOOP/U-ENGAGEMENT-ARC-DOUBLING-FIX — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-ENGAGEMENT-ARC-DOUBLING-FIX (slot:oscar): fix the 2x-doubled engagement arc in calculateEngagementAngle (physics-reviewer adjudicated)

**Commit:** `247c5856f254` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T12:26:12-05:00
**Tags:** sfc-page-closed-loop, u-engagement-arc-doubling-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-ENGAGEMENT-ARC-DOUBLING-FIX (slot:oscar): fix the 2x-doubled engagement arc in calculateEngagementAngle (physics-reviewer adjudicated)

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-ENGAGEMENT-ARC-DOUBLING-FIX (slot:oscar): fix the 2x-doubled engagement arc in calculateEngagementAngle (physics-reviewer adjudicated)

calculateEngagementAngle (ToolpathCalculations.ts -- the SFC page engagement panel + CAM toolpath) returned arc_of_engagement = 2*phi. half_angle_rad = acos(1-2ae/D) is ALREADY the full swept engagement angle phi (misnamed), but the code doubled it: 25% immersion -> 120deg (should 60), 50% -> 180 (should 90); the slot case was right ONLY because the *2 hit the 180 cap. average_chip_thickness used 2*phi in the Altintas denominator (~half the true mean); max_chip_thickness = fz*sin(arc/2) was accidentally correct only because the buggy arc/2 == phi; entry/exit spanned 2*phi AND were identical for climb vs conventional.

Physics-reviewer adjudicated the coherent corrected geometry (Altintas Manufacturing Automation 2e Sec 2.4 / Eq 2.21):
- arc_of_engagement = min(phi_deg, 180) (remove the *2).
- max_chip_thickness = fz*sin(min(phi, 90deg)) -- DECOUPLED from arc/2 (mandatory once arc is un-doubled).
- average_chip_thickness = fz*ae/(R*phi) -- phi not 2*phi.
- entry/exit span = phi; climb enters deep (entry>exit), conventional at wall (entry<exit) -- previously identical for both.
RCTF chip-thinning speed compensation left untouched (separate correct model).

Why it survived (R9 -- tests verify behavior not intent): 4 oracles ENCODED the doubling -- the ae=R test asserted 180 (should 90), the avg-chip test computed expected with phi=120 (should 60), a toBeDefined() stub, and route-contract-sfc-speedfeed asserted 50%->'~120 deg'. All corrected; added an "engagement-arc reference values (R9 anti-doubling lock)" block (25/50/75/100% -> 60/90/120/180; max/avg per Altintas + band-symmetry + climb/conventional entry/exit) that fails loud on any reintroduced 2*phi.

Validation: live probe 25/50/100% -> 60/90/180 (was 120/180/180). toolpath 58/58 + route-contract-sfc-speedfeed (83/83 combined) + forge-debug-p0/p3 43/43 pass; tsc clean. 2-arm scrutiny: physics-reviewer PASS (impl matches adjudication, 0 transcription error) + independent reviewer caught the route-contract P0 (fixed this commit). No consumer breaks: ProductEngine imports but never CALLS it; HyperMill only docstrings it; dispatcher forwards it (page panel now correct). CROSS-GALAXY: ToolpathCalculations is CAM (kilo) -- chat-bus coordinated. Diagnosis memory: reference_oscar_engagement_arc_doubled_bug_2026_06_23.md.
```

## Files touched (4)
- mcp-server/src/__tests__/route-contract-sfc-speedfeed.test.ts |  9 ++++----
- mcp-server/src/__tests__/toolpath-calculations.test.ts        | 63 +++++++++++++++++++++++++++++++++++++++++++--------
- mcp-server/src/engines/ToolpathCalculations.ts                | 49 +++++++++++++++++++++++----------------
- 3 files changed, 87 insertions(+), 34 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 247c5856f254`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._