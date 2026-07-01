# KIENZLE-LATHE-WIZARD/U-W-STEP-RUNGC-LOOP — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-RUNGC-LOOP (slot:whiskey): STEP geometry closed-loop leg -- flips full_geometry_loop_closed (pure JS, no GPU)

**Commit:** `1567dba6f164` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T10:47:46-05:00
**Tags:** kienzle-lathe-wizard, u-w-step-rungc-loop, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-RUNGC-LOOP (slot:whiskey): STEP geometry closed-loop leg -- flips full_geometry_loop_closed (pure JS, no GPU)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W-STEP-RUNGC-LOOP (slot:whiskey): STEP geometry closed-loop leg -- flips full_geometry_loop_closed (pure JS, no GPU)

The G1 keystone. STEP-side geometry leg of the lathe closed loop, wired into the
unified driver. Unlike the OCR/PDF leg (GPU-bound, stuck at 0 scored), this reads
REAL JM STEP geometry via occt-import-js (pure JS) so it RUNS TO COMPLETION.

Chain (all REAL production engines, R15 test-through-the-path):
  STEP -> stepFileToProfile (occt mesh -> rotational profile, units-resolved, body-segmented)
       -> profileToTurningFeatures (NEW pure lib, od_contour/id_contour features, mm)
       -> normalizeLatheInput -> turningPrintToProgramEngine.runPipeline
       -> scoreProgram vs Rung A cloud (34,993 .MIN) + scoreSafetyEfficiency -> pair to .MIN

LIVE: AGRATI 9070219 OP2 STEP -> 2 ops, both SFM+IPR in-band 100% -> geometry loop
CLOSED (full_geometry_loop_closed_step=true). Non-revolution bodies (electrodes/molds/
toolholders) correctly skipped as suspect -- never scored against bad geometry (R12).

Per-file 2-arm scrutiny: arm B P1 (path-casing double-count) FIXED via lowercase canon key;
arm A P2s FIXED (occt-failed retriable; OP/v suffix-strip pairing; done-aware enumerate;
metre units-unsupported). Deferred P2: spindle/power limits undefined -> safety PARTIAL
(honest, never false-SAFE; cross-leg ShopConfig follow-up).
```

## Files touched (9)
- scripts/lathe-closed-loop-full.mjs                  |  46 ++++++--
- scripts/lathe-rungc-step-loop.mjs                   | 350 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/lathe-step-profile-to-features.mjs      | 100 ++++++++++++++++
- scripts/lib/lathe-step-profile-to-features.test.mjs | 140 +++++++++++++++++++++++
- state/shared/dashboards/lathe-closed-loop-full.json | 107 +++++++++++++++++
- state/shared/dashboards/lathe-closed-loop-full.md   |  22 ++--
- state/shared/dashboards/lathe-rungc-step.json       | 118 +++++++++++++++++++
- state/shared/dashboards/lathe-rungc-step.md         |  10 ++
- 8 files changed, 878 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1567dba6f164`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._