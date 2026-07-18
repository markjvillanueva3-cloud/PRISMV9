# OSCAR-SFC-9AXIS-MS0/U-OSC-ALL-AXIS-SWEEP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALL-AXIS-SWEEP (slot:oscar): run calculations across EVERY named goal axis with max variability (clause 1)

**Commit:** `08d7fc6d37ad` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:08:27-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-all-axis-sweep, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALL-AXIS-SWEEP (slot:oscar): run calculations across EVERY named goal axis with max variability (clause 1)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALL-AXIS-SWEEP (slot:oscar): run calculations across EVERY named goal axis with max variability (clause 1)

The comparison sweep held the machine-side axes at orchestrator defaults; this enumerates ALL
25 named axes (machine/spindle/controller/material/workholding/tool-holder connection+balance+
runout/tooling+insert/coolant/toolpath-strategy/operation/cut-type/finish-Ra/diameter/flutes/
ap/ae/mode) through the live NineAxisOrchestrator. Two phases: OAT x2 regimes (rigid-roughing +
light/hi-RPM/finishing so cap+finish axes bind -- holder_balance 36.8%->144.4% once the hi-RPM
regime exercises the ISO-1940 cap) + a bounded factorial (3888 core / full-enum on --mode full,
NVMe-streamed). FINDING (R12): 16/25 axes LIVE with strong spreads (material 733% MRR, etc.);
9 inert-at-baseline -- honest taxonomy (by-design controller_brand/accuracy; optimizer-internalized
ap/ae in prism_optimized; candidate gap controller_features) queued as U-OSC-DEAD-AXIS-TRIAGE, NOT
alarmed as bugs. 8 methodology tests green (material-spread doubles as material-blindness regression guard).
```

## Files touched (3)
- mcp-server/scripts/sfc-all-axis-sweep.mjs        | 417 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/sfcAllAxisSweep.test.ts |  80 +++++++++++++++++++++++++
- 2 files changed, 497 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 08d7fc6d37ad`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._