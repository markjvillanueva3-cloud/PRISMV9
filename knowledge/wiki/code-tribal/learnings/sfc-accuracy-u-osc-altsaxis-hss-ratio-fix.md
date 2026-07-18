# SFC-ACCURACY/U-OSC-ALTSAXIS-HSS-RATIO-FIX — [MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ALTSAXIS-HSS-RATIO-FIX (slot:oscar): correct an outdated exact-0.35 HSS/carbide ratio assertion that U-OSC-HSS-AGGR-VC-CAP (cb40bbba7b) correctly invalidated

**Commit:** `a5790c321726` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T16:02:42-05:00
**Tags:** sfc-accuracy, u-osc-altsaxis-hss-ratio-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ALTSAXIS-HSS-RATIO-FIX (slot:oscar): correct an outdated exact-0.35 HSS/carbide ratio assertion that U-OSC-HSS-AGGR-VC-CAP (cb40bbba7b) correctly invalidated

## Body
```
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ALTSAXIS-HSS-RATIO-FIX (slot:oscar): correct an outdated exact-0.35 HSS/carbide ratio assertion that U-OSC-HSS-AGGR-VC-CAP (cb40bbba7b) correctly invalidated

altsAxisPropagation asserted the 9-axis HSS headline Vc is exactly 0.35x carbide. That held only BEFORE the
HSS aggressive-Vc cap (cb40bbba7b): on P milling-roughing the 9-axis prism_optimized default runs
shop_recommended (the balanced->aggressive blend), and pre-cap HSS got the full blend x 0.35 = 0.35x carbide.
The cap (correctly) clamps the HSS blend back to balanced -- HSS has no aggressive cutting-SPEED gear
(red-hardness ~600 C) -- while carbide keeps the full blend, so HSS now lands ~0.27x carbide (= balanced
0.77x-of-blend x the 0.35 tool-material factor). Live-probed: carbide 208, hss 56 (0.269), ceramic 452 --
ordering hss < carbide < ceramic still correct; only the exact ratio shifted.

This is NOT a 9-axis material-blindness bug (my initial hypothesis -- investigated + DISPROVEN: the 9-axis
reads UltimateSpeedFeedEngine's already-factored sfc.cutting_speed.value, so it has always been material-aware).
It is an over-specified test assertion my own cap invalidated and which I missed in the cb40bbba7b validation
batch (that file was not in it). Fix: assert the 0.35 tool-material factor as a CEILING (hss/carbide <= 0.35,
since the cap can only LOWER it) + a sane floor (> 0.20, still ~1/3 carbide), with a comment explaining the
combined derate+cap. Keeps the ordering assertions. NOT a weakening -- it encodes the correct post-cap physics
(the exact 0.35 was the value that was wrong). 4/4 altsAxisPropagation green; other HSS-ratio tests (GWizard,
core-manufacturing, sys-ms2, variability, toolMaterialSpeedFactor) all pass -- no other cb40bbba7b casualty.
(Pre-existing/unrelated: sfcAllAxisSweep.test.ts is a process.exit sweep harness, "no tests", not a Vc assertion.)
```

## Files touched (2)
- mcp-server/src/__tests__/altsAxisPropagation.test.ts | 9 ++++++++-
- 1 file changed, 8 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till correct; only the exact ratio shifted.
- till ~1/3 carbide), with a comment explaining the
- wrong). 4/4 altsAxisPropagation green; other HSS-ratio tests (GWizard,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a5790c321726`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._