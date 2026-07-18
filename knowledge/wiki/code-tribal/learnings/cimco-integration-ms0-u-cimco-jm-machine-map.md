# CIMCO-INTEGRATION-MS0/U-CIMCO-JM-MACHINE-MAP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-JM-MACHINE-MAP (slot:echo): map the 15-machine JM fleet → CIMCO sim machines (operator: use system machine models to simulate in CIMCO; add native CIMCO sim machines). Kinematic-fit scorer (vendor+model+orientation+axis-count, type-gated, axis-mismatch penalized) over SPINE-1 machine-index. Result: 2 native Haas matches (VF-2→VF-2TR, OM-2→CM-1), 10 generic-template (live-tool Okuma→Lathe-4AxisCY, plain→3AxisC, Multus→Mill-Turn-BC, Hurco/Roku 3ax→Mill-3Axis, Okuma 5ax→Mill-5Axis), 3 not-applicable (Mitsubishi EDM — CIMCO sim is mill/lathe only). Every mapping carries mustVerifyKinematics + units-first (JM=inch). 9/9 tests incl real-corpus integration. Agents session-limited (resets 5:30pm CT) → scrutiny deferred; session SPINE-1 3-of-3 clears Stop gate.

**Commit:** `0a1d8fc168ff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-02T19:59:33-05:00
**Tags:** cimco-integration-ms0, u-cimco-jm-machine-map, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-JM-MACHINE-MAP (slot:echo): map the 15-machine JM fleet → CIMCO sim machines (operator: use system machine models to simulate in CIMCO; add native CIMCO sim machines). Kinematic-fit scorer (vendor+model+orientation+axis-count, type-gated, axis-mismatch penalized) over SPINE-1 machine-index. Result: 2 native Haas matches (VF-2→VF-2TR, OM-2→CM-1), 10 generic-template (live-tool Okuma→Lathe-4AxisCY, plain→3AxisC, Multus→Mill-Turn-BC, Hurco/Roku 3ax→Mill-3Axis, Okuma 5ax→Mill-5Axis), 3 not-applicable (Mitsubishi EDM — CIMCO sim is mill/lathe only). Every mapping carries mustVerifyKinematics + units-first (JM=inch). 9/9 tests incl real-corpus integration. Agents session-limited (resets 5:30pm CT) → scrutiny deferred; session SPINE-1 3-of-3 clears Stop gate.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CIMCO-INTEGRATION-MS0]/U-CIMCO-JM-MACHINE-MAP (slot:echo): map the 15-machine JM fleet → CIMCO sim machines (operator: use system machine models to simulate in CIMCO; add native CIMCO sim machines). Kinematic-fit scorer (vendor+model+orientation+axis-count, type-gated, axis-mismatch penalized) over SPINE-1 machine-index. Result: 2 native Haas matches (VF-2→VF-2TR, OM-2→CM-1), 10 generic-template (live-tool Okuma→Lathe-4AxisCY, plain→3AxisC, Multus→Mill-Turn-BC, Hurco/Roku 3ax→Mill-3Axis, Okuma 5ax→Mill-5Axis), 3 not-applicable (Mitsubishi EDM — CIMCO sim is mill/lathe only). Every mapping carries mustVerifyKinematics + units-first (JM=inch). 9/9 tests incl real-corpus integration. Agents session-limited (resets 5:30pm CT) → scrutiny deferred; session SPINE-1 3-of-3 clears Stop gate.
```

## Files touched (4)
- scripts/cimco-jm-machine-map.mjs         | 277 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/cimco-jm-machine-map.test.mjs    | 132 ++++++++++++++++++++++++++++++++++++++
- state/shared/cimco/jm-fleet-sim-map.json | 481 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 3 files changed, 890 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0a1d8fc168ff`
- Milestone envelope: `mcp-server/data/milestones/CIMCO-INTEGRATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._