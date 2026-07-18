# OSCAR-SFC-9AXIS-MS0/U-OSC-COMPARE-CERAMIC-CBN-BASELINE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-CERAMIC-CBN-BASELINE (slot:oscar): ceramic + CBN baselines — non-carbide comparison now COMPLETE (all 4 tool materials)

**Commit:** `835df42c74b5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:25:26-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-compare-ceramic-cbn-baseline, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-CERAMIC-CBN-BASELINE (slot:oscar): ceramic + CBN baselines — non-carbide comparison now COMPLETE (all 4 tool materials)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-CERAMIC-CBN-BASELINE (slot:oscar): ceramic + CBN baselines — non-carbide comparison now COMPLETE (all 4 tool materials)

Closes the last comparison-coverage gap. After HSS (c78faa5a73), ceramic + cbn still had 0
baseline datapoints. Adds 3 turning baseline rows:
  K/ceramic/25mm/turning/roughing  vc=600 fz=0.30  (ntk + iscar, 2 sources)
  S/ceramic/25mm/turning/finishing vc=400 fz=0.15  (ntk)
  H/cbn/25mm/turning/finishing     vc=180 fz=0.10 ap=0.2  (tungaloy)

HONEST sourcing: extended BaselineSource enum with the REAL vendors I found published data
from -- ntk/iscar/tungaloy (NOT fabricated Sandvik/Kennametal ceramic pages; that was the
HSS-unit discipline). vc web-verified (NTK/Iscar/Tungaloy) + physics-reviewer-VALIDATED vs
CANONICAL_TURNING_SPEEDS/FEEDS scaled by the ceramic/CBN regime. physics-reviewer correction
applied: ceramic-Inconel is FINISHING (not roughing -- ceramic on Inconel is a high-speed
finish regime). mrr omitted; CBN keeps its cited ap=0.2. APPLICABILITY-honest: ceramic only
K/S (chips on ductile P/N -> absent), CBN only H hardened (>45 HRC). enum extension grep-
confirmed safe (no exhaustive switch on BaselineSource).

LIVE-VALIDATED via sweep: ALL 4 tool materials now compared -- carbide -25.9%, hss +107.8%,
ceramic -49% (PRISM conservative -- under-exploits ceramic hot-running), cbn +48.6% (n=6,
PRISM aggressive). 12 tests (6 HSS + 6 ceramic/cbn: cited values, finishing cut_type,
applicability-exclusion locks for ceramic-P/N + cbn-P/N, honest-vendor-only source set).
physics-reviewer PASS (values + enum + cut_type + applicability) + 12 tests + live sweep.
```

## Files touched (3)
- mcp-server/src/__tests__/baselineHssEntries.test.ts         | 47 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts | 52 +++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 98 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till had 0
- tile P/N -> absent), CBN only H hardened (>45 HRC). enum extension grep-

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 835df42c74b5`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._