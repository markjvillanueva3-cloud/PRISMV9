# OSCAR-SFC-9AXIS-MS0/U-OSC-COMBO-SWEEP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMBO-SWEEP (slot:oscar): full combinatorial SFC sweep across the now-live axes (goal first-clause)

**Commit:** `da41a58fd123` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T11:02:55-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-combo-sweep, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMBO-SWEEP (slot:oscar): full combinatorial SFC sweep across the now-live axes (goal first-clause)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMBO-SWEEP (slot:oscar): full combinatorial SFC sweep across the now-live axes (goal first-clause)

Executes "run calculations for every possible combination ... with max variability": 102,060 combinations (iso 6 x dia 3 x flutes 2 x tool_material 5 x coolant 7 x rigidity 3 x operation 3 x strategy 3 x mode 3) through UltimateSpeedFeedEngine.calculate(), 7.3s / 0.07ms-cell, 733 distinct Vc values, global Vc range 2..1040 m/min (515x).

Per-axis variability PROVES this session's 3 wired axes are live across the whole combination space (were 1.00x/inert before): tool_material 7.14x, machine_rigidity 1.57x, coolant 1.48x. (iso 7.93x, mode 2.06x, operation 1.76x, strategy 1.40x already were.) tool_diameter/flutes correctly 1.00x on Vc (surface speed is dia/flute-independent; they move RPM/feed).

Read-only (no engine change). Complements the vendor-comparison harness (sfc-baseline-compare-run.ts). The remaining goal work (vendor S/F extraction via Blackwell vision-OCR for the comparison-half, U-OSC-RIGIDITY-DOC, remaining axes, G-Wizard live data) stays multi-session.
```

## Files touched (2)
- mcp-server/scripts/sfc-combination-sweep.ts | 61 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 61 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da41a58fd123`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._