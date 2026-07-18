# OSCAR-SFC-9AXIS-MS0/U-OSC-ALTS-FACTOR — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALTS-FACTOR (slot:oscar): the linchpin — make the 3 wired axes reach the orchestrator surface

**Commit:** `f998f8af7106` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T10:25:16-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-alts-factor, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALTS-FACTOR (slot:oscar): the linchpin — make the 3 wired axes reach the orchestrator surface

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-ALTS-FACTOR (slot:oscar): the linchpin — make the 3 wired axes reach the orchestrator surface

Fixes finding 2 of SFC-VENDOR-COMPARISON-2026-06-09: the tool_material/coolant/rigidity factors were applied to UltimateSpeedFeedEngine's PRIMARY Vc but NOT its alternative parameter sets (alts), and the 9-axis orchestrator's default PRISM-optimized mode (buildModeRecommendation:789-794) reads sfc.alternatives.balanced.vc — so the axes were INERT on the surface the comparator + CAD/CAM consume (carbide vc == hss vc == 140).

- Hoisted toolMatFactor + coolantFactor computation to function scope (single source) so BOTH the primary Vc AND the alts use them; applied toolMat x coolant x rigidity (axisVcMult) to alts.{conservative,balanced,aggressive}.vc.
- Behaviour-preserving: all 3 factors are 1.0 when their axis is unset -> gauntlet (52) + variability (106) byte-identical (182 green). No primary-Vc math change (else-branch now uses the hoisted vars).
- NEW altsAxisPropagation.test.ts (4): asserts the axes now move recommendation.cutting_speed_mpm THROUGH speedFeedNineAxisOrchestratorEngine.run() (hss<carbide<ceramic; dry<flood; rigidity low<high; unspecified==baseline). R15 round-trip-through-the-surface, not the singleton.
- LIVE proof (sfc-baseline-compare-run.ts PASS 2): orchestrator carbide=140 vs hss=49 -> FORWARDED (was DROPPED). The 3 axis commits now reach production.
- Remaining: re-run full comparison; vendor-calibrate the ~25% under-speeding (finding 1); U-OSC-RIGIDITY-DOC; holder/spindle/controller/workholding/insert; full sweep.
```

## Files touched (3)
- mcp-server/src/__tests__/altsAxisPropagation.test.ts | 65 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts    | 66 +++++++++++++++++++++++++++++++++++-------------------------------
- 2 files changed, 100 insertions(+), 31 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f998f8af7106`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._