# SFC-PAGE-CLOSED-LOOP/U-SFC-PANEL-VALIDATE-PROBE — [MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PANEL-VALIDATE-PROBE (slot:oscar): validate the 4 standalone codex-page panels + FIND the engagement-arc doubling bug

**Commit:** `fa6a037974a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T12:09:40-05:00
**Tags:** sfc-page-closed-loop, u-sfc-panel-validate-probe, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PANEL-VALIDATE-PROBE (slot:oscar): validate the 4 standalone codex-page panels + FIND the engagement-arc doubling bug

## Body
```
[MAIN-FORCE] [SFC-PAGE-CLOSED-LOOP]/U-SFC-PANEL-VALIDATE-PROBE (slot:oscar): validate the 4 standalone codex-page panels + FIND the engagement-arc doubling bug

The codex SFC page calls 7 backend actions; sfc_calculate is fully pinned (U-SFC-PAGE-MATERIAL-AWARE). This probe validates the 4 standalone panels the page also calls -- deflection / power_torque / engagement / cycle_time -- against hand-computed reference values (R15 validate-on-live-data).

Result: 3 of 4 CORRECT --
- power_torque (calculateSpindlePower): 1.25/1.563 kW, 3.75 Nm, 3979 rpm (Fc*Vc/60000, P/eta, 9549*P/rpm).
- deflection (calculateToolDeflection): 0.034 mm = F*L^3/3EI; L^3 scaling confirmed (L=100 -> 0.273 = 8x).
- cycle_time (estimateCycleTime): 2.0 min = cut_dist/feed.

FOUND 1 BUG (not fixed here -- gated): ToolpathCalculations.calculateEngagementAngle DOUBLES the engagement arc. half_angle_rad = acos(1-2ae/D) is ALREADY the full engagement angle phi, but arc_of_engagement = phi*2 (capped 180). 25% immersion returns 120deg (should be 60), 50% returns 180 (should be 90); slot is right ONLY because *2 hits the cap. average_chip_thickness also uses 2*phi (~half correct); max_chip_thickness accidentally correct. Survived because toolpath-calculations.test.ts only value-checks the slot case + a toBeDefined() stub (R9 -- tests verify behavior not intent).

The fix is chip-thinning/immersion GEOMETRY -> oscar soul defers to physics-reviewer, and calculateEngagementAngle is a SHARED CAM fn (ProductEngine + calcDispatcher:engagement + HyperMill thermal mapping consume arc_of_engagement) -> coordinate kilo (CAM owns ToolpathCalculations). Queued, not rushed. Full diagnosis: knowledge/memories/galaxies/speed-feed/reference_oscar_engagement_arc_doubled_bug_2026_06_23.md.
```

## Files touched (2)
- scripts/sfc-panel-validate-probe.mjs | 45 +++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 45 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fa6a037974a1`
- Milestone envelope: `mcp-server/data/milestones/SFC-PAGE-CLOSED-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._