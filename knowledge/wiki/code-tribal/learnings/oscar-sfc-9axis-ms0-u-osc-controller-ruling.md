# OSCAR-SFC-9AXIS-MS0/U-OSC-CONTROLLER-RULING — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-RULING (slot:oscar): physics ruling on the controller axis + promote inlined look-ahead constant

**Commit:** `0a146e22c6e2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:04:52-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-controller-ruling, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-RULING (slot:oscar): physics ruling on the controller axis + promote inlined look-ahead constant

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-CONTROLLER-RULING (slot:oscar): physics ruling on the controller axis + promote inlined look-ahead constant

CONTROLLER AXIS -- physics-reviewer RULING (verdict B, product decision, NOT a physics gap): leave controller INERT on the default (prism_optimized) recommendation -- it is the correct controller-agnostic Pareto knee. Unlike the 3 accidentally-inert physics axes shipped this session (workholding/spindle-power/runout, all clean safe-direction fixes), controller_smoothing_factor is a feed BOOST (>=1.0) applied only in aggressive_rush by deliberate design.

Making it move the default is a PRODUCT decision the operator must make, and even the only safe form (controller realizability on effective-MRR/cycle-time ESTIMATE, never feed, default-normalized) carries a real physics tension: effective MRR cannot EXCEED the geometric/programmed MRR (best controller = 1.0 achieves ideal; worse < 1.0 falls short via corner deceleration), so a no-regression reference (default config = 1.0) conflicts with the physical bound (best = 1.0). That tension is exactly why it is a product/philosophy call, not a unilateral flip -- raising default feeds on the saleable product would violate the soul's softening-safety-thresholds refusal.

SHIPPED here (the one safe in-session fix the review surfaced): promote the inlined `1.05` controller look-ahead multiplier (computeAxisFactors) to a named `CONTROLLER_LOOK_AHEAD_MULT_STD` constant alongside the sibling CONTROLLER_*_MULT consts -- aligns with the no-inlined-constants rule + becomes the documented default-config no-regression reference if the operator ever wires controller to the default. Behavior-neutral (named 1.05 == inline 1.05); 33/33 SFC tests green, no regression.

OPERATOR DECISION REQUIRED to make controller non-inert: (1) should the balanced default chase controller productivity at all? (2) if yes, accept the default-recommendation change OR mandate the default-normalized realizability reference; (3) it may touch cycle_time/effective-MRR ESTIMATE only, never feed_rate (preserve feed==fz*flutes*rpm). Full ruling in [[reference_oscar_sfc_axis_liveness_map_2026_06_09]].
```

## Files touched (2)
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts | 5 +++--
- 1 file changed, 3 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a146e22c6e2`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._