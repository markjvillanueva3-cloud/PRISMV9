# SPEED-FEED-MS0/U-SFM-84-85-87-CORRECTIONS — [MAIN] [SPEED-FEED-MS0]/U-SFM-84-85-87-CORRECTIONS (slot:tango /goal /loop /yolo iter7 2026-05-27): trio of Speed-Feed Vc correction algorithms — 8.4 HardnessToVcInverter (ISO-18265 HRC↔HB + per-ISO Sandvik exponents), 8.5 CoolantVcModifier (6 ISO × 5 coolant lookup, flood=1.0 baseline), 8.7 HPCVcBoostCalculator (P_bar/Q_L_min/jet-aim → boost multiplier per ISO k-factor). All three closed-form, no physics constants inlined, R12 fail-loud on adversarial input. 58/58 tests PASS. prism_calc:{hardness_vc_multiplier, coolant_vc_modifier, hpc_vc_boost} wired. Closes 3/25 remaining audit-confirmed gaps from 58-algorithm scope enumeration.

**Commit:** `5ed0a618685c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-27T09:48:13-05:00
**Tags:** speed-feed-ms0, u-sfm-84-85-87-corrections, auto-distilled

## Subject
[MAIN] [SPEED-FEED-MS0]/U-SFM-84-85-87-CORRECTIONS (slot:tango /goal /loop /yolo iter7 2026-05-27): trio of Speed-Feed Vc correction algorithms — 8.4 HardnessToVcInverter (ISO-18265 HRC↔HB + per-ISO Sandvik exponents), 8.5 CoolantVcModifier (6 ISO × 5 coolant lookup, flood=1.0 baseline), 8.7 HPCVcBoostCalculator (P_bar/Q_L_min/jet-aim → boost multiplier per ISO k-factor). All three closed-form, no physics constants inlined, R12 fail-loud on adversarial input. 58/58 tests PASS. prism_calc:{hardness_vc_multiplier, coolant_vc_modifier, hpc_vc_boost} wired. Closes 3/25 remaining audit-confirmed gaps from 58-algorithm scope enumeration.

## Body
```
[MAIN] [SPEED-FEED-MS0]/U-SFM-84-85-87-CORRECTIONS (slot:tango /goal /loop /yolo iter7 2026-05-27): trio of Speed-Feed Vc correction algorithms — 8.4 HardnessToVcInverter (ISO-18265 HRC↔HB + per-ISO Sandvik exponents), 8.5 CoolantVcModifier (6 ISO × 5 coolant lookup, flood=1.0 baseline), 8.7 HPCVcBoostCalculator (P_bar/Q_L_min/jet-aim → boost multiplier per ISO k-factor). All three closed-form, no physics constants inlined, R12 fail-loud on adversarial input. 58/58 tests PASS. prism_calc:{hardness_vc_multiplier, coolant_vc_modifier, hpc_vc_boost} wired. Closes 3/25 remaining audit-confirmed gaps from 58-algorithm scope enumeration.
```

## Files touched (8)
- .../src/algorithms/CoolantVcModifier.test.ts       |  82 ++++++++++++
- mcp-server/src/algorithms/CoolantVcModifier.ts     | 102 ++++++++++++++
- .../src/algorithms/HPCVcBoostCalculator.test.ts    | 115 ++++++++++++++++
- mcp-server/src/algorithms/HPCVcBoostCalculator.ts  | 143 ++++++++++++++++++++
- .../src/algorithms/HardnessToVcInverter.test.ts    |  94 +++++++++++++
- mcp-server/src/algorithms/HardnessToVcInverter.ts  | 146 +++++++++++++++++++++
- mcp-server/src/tools/dispatchers/calcDispatcher.ts |  28 ++++
- 7 files changed, 710 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ed0a618685c`
- Milestone envelope: `mcp-server/data/milestones/SPEED-FEED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._