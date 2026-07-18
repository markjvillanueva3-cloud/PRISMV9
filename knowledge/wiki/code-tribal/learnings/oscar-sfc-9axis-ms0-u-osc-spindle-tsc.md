# OSCAR-SFC-9AXIS-MS0/U-OSC-SPINDLE-TSC — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC (slot:oscar): wire through-spindle-coolant into MRR (FIX-1) + the missing coolant_effectiveness clamp

**Commit:** `1a59c22336ef` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:36:27-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-spindle-tsc, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC (slot:oscar): wire through-spindle-coolant into MRR (FIX-1) + the missing coolant_effectiveness clamp

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-SPINDLE-TSC (slot:oscar): wire through-spindle-coolant into MRR (FIX-1) + the missing coolant_effectiveness clamp

through_spindle_coolant was inert for milling (only a drilling-gated ROI advisory consumed it). FIX:
fold TSC into coolant_effectiveness (MRR-only -- vc/rpm/fz canonical) via a named TSC_EFFECTIVENESS_BONUS,
GATED off through_tool(1.25)/cryogenic(1.40) which already model thru-tool delivery (no double-count).
Plus the prerequisite clamp: coolant_effectiveness feeds a post-engine MRR scalar bypassing the core
power/torque envelope, so bound it via COOLANT_EFFECTIVENESS_MAX=1.45. CRITICAL: the triage workflow
proposed a 1.08 clamp which would REGRESS the real cryogenic(1.40)/through_tool(1.25) base -- corrected
to 1.45 (bounds stacking only). LIVE: spindle_thru INERT->speed_feed 8.5% MRR; sweep 20->21/25 LIVE.
7 tests (MRR-up / vc-rpm-fz canonical / double-count gate / clamp-no-crush-cryo / backward-compat / R15
dispatcher round-trip); 48/48 SFC suite green.
```

## Files touched (3)
- mcp-server/src/__tests__/spindleTscWiring.test.ts             | 108 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedNineAxisOrchestratorEngine.ts |  20 ++++++++++++++++++++
- 2 files changed, 128 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a59c22336ef`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._