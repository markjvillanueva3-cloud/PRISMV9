# OSCAR-SFC-9AXIS-MS0/U-OSC-FULL-SWEEP — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FULL-SWEEP (slot:oscar): full-input-space SFC sweep vs vendors + fix material-ISO misclassification (aluminum filed as stainless)

**Commit:** `891c66e728ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T14:36:13-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-full-sweep, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FULL-SWEEP (slot:oscar): full-input-space SFC sweep vs vendors + fix material-ISO misclassification (aluminum filed as stainless)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-FULL-SWEEP (slot:oscar): full-input-space SFC sweep vs vendors + fix material-ISO misclassification (aluminum filed as stainless)

Goal: compare ALL potential SFC-app-page inputs to G-Wizard + HSMAdvisor.
Built scripts/sfc-full-sweep-compare.mjs — enumerates the full prod-mode input
space and drives EVERY cell through the wired tri-vendor comparator vs LIVE
vendor data, emitting a per-cell JSONL ledger (training input for the downstream
GPU calibration layer) + a per-ISO PRISM-vs-baseline delta aggregate.

LIVE-CAUGHT via the sweep (R12):
1. MATERIAL-ISO MISCLASSIFICATION: PROD/DEMO_MATERIALS_BY_ISO filed
   aluminum_6061 under M (stainless) → aluminum physics forced through a
   stainless ISO label, poisoning the M-group comparison. Aluminum is N.
   Fixed: M=304 (real stainless), N=6061.
2. MISSING COVERAGE: N (aluminum) + H (hardened) were EMPTY → never swept.
   "All inputs" was silently 4-of-6 ISO groups. Added N=6061, H=D2.

Full 6-group sweep (74 cells, 0 errors, live): P -33.2% / M -25.9% / N -36.5%
(conservative=SAFE) / K +0% (neutral) / S+H no-baseline (honest gap). G-Wizard
0/74 (crib geometry-only). This per-regime delta is the calibration signal.

10/10 exhaustive-engine tests (old bug not test-encoded).
Bootstrap one-shot: shared-tree commit.
```

## Files touched (3)
- mcp-server/scripts/sfc-full-sweep-compare.mjs                  | 201 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedExhaustiveCombinationEngine.ts |  17 ++++--
- 2 files changed, 212 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 891c66e728ac`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._