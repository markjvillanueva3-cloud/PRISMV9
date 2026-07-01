# SFC-VENDOR-PARITY/U-OSC-PARITY-VERDICT-UNCAPPED — [MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PARITY-VERDICT-UNCAPPED (slot:oscar): parity verdict compares the UNCAPPED Vc for RPM-capped cells

**Commit:** `d405d1bb193c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T01:53:43-05:00
**Tags:** sfc-vendor-parity, u-osc-parity-verdict-uncapped, auto-distilled

## Subject
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PARITY-VERDICT-UNCAPPED (slot:oscar): parity verdict compares the UNCAPPED Vc for RPM-capped cells

## Body
```
[MAIN-FORCE] [SFC-VENDOR-PARITY]/U-OSC-PARITY-VERDICT-UNCAPPED (slot:oscar): parity verdict compares the UNCAPPED Vc for RPM-capped cells

Completes the apples-to-apples parity work at the VERDICT level. prism_vs_consensus + pairwise feed
calibration ("a large PRISM-vs-consensus gap is where calibration would learn"). External vendors are
UNCAPPED, so comparing PRISM's machine/holder-RPM-capped achievable Vc against them injected a FALSE gap
(6mm alu: capped 226 vs 775 = -71%) that calibration would chase -- the exact false-bug U-OSC-VC-CAP-NOT-A-BUG
diagnosed. Now the verdict uses PRISM's UNCAPPED recommendation (460 vs 775 = -41%, the real
balanced-vs-aggressive modeling gap); axes.vc_mpm (capped) stays the operator-facing value.

Builds prismParityAxes at the call site (scale vc/rpm/feed by the un-cap ratio; fz/chip-load unchanged by
an RPM cap) ONLY when rpm_capped -> uncapped cells are byte-identical (the 10 existing comparator tests are
unchanged). 2 new R9 tests (capped cell verdict uses ~460 not ~226). tsc clean.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-parity-verdict-uncapped.test.ts | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedTriComparatorEngine.ts       | 22 +++++++++++++++++++---
- 2 files changed, 74 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d405d1bb193c`
- Milestone envelope: `mcp-server/data/milestones/SFC-VENDOR-PARITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._