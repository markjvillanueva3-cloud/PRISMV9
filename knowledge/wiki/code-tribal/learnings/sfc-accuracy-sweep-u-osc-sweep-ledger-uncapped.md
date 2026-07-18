# SFC-ACCURACY-SWEEP/U-OSC-SWEEP-LEDGER-UNCAPPED — [MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-LEDGER-UNCAPPED (slot:oscar): persist prism_vc_uncapped_mpm + prism_rpm_capped in the sweep ledger row so india + accuracy analysis distinguish a TRUE over/under-speed from a machine-RPM-cap artifact WITHOUT a manual probe. The capped prism_vc_mpm masks the engine's true Vc on small/high-Vc tools -- proven this session: the HSS aggressive 'asymmetry' (carbide 1.13x vs hss 2.2x) was carbide cap-compression (uncapped both scale 2.2x), NOT HSS over-speed. Validated: prod smoke 117/576 rows rpm_capped=true; additive fields, prod-equal when uncapped.

**Commit:** `b7287949eb76` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T04:50:32-05:00
**Tags:** sfc-accuracy-sweep, u-osc-sweep-ledger-uncapped, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-LEDGER-UNCAPPED (slot:oscar): persist prism_vc_uncapped_mpm + prism_rpm_capped in the sweep ledger row so india + accuracy analysis distinguish a TRUE over/under-speed from a machine-RPM-cap artifact WITHOUT a manual probe. The capped prism_vc_mpm masks the engine's true Vc on small/high-Vc tools -- proven this session: the HSS aggressive 'asymmetry' (carbide 1.13x vs hss 2.2x) was carbide cap-compression (uncapped both scale 2.2x), NOT HSS over-speed. Validated: prod smoke 117/576 rows rpm_capped=true; additive fields, prod-equal when uncapped.

## Body
```
[MAIN-FORCE] [SFC-ACCURACY-SWEEP]/U-OSC-SWEEP-LEDGER-UNCAPPED (slot:oscar): persist prism_vc_uncapped_mpm + prism_rpm_capped in the sweep ledger row so india + accuracy analysis distinguish a TRUE over/under-speed from a machine-RPM-cap artifact WITHOUT a manual probe. The capped prism_vc_mpm masks the engine's true Vc on small/high-Vc tools -- proven this session: the HSS aggressive 'asymmetry' (carbide 1.13x vs hss 2.2x) was carbide cap-compression (uncapped both scale 2.2x), NOT HSS over-speed. Validated: prod smoke 117/576 rows rpm_capped=true; additive fields, prod-equal when uncapped.
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 7 +++++++
- 1 file changed, 7 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b7287949eb76`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._