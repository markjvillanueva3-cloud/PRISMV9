# OSCAR-SFC-9AXIS-MS0/U-OSC-COMPARE-HSS-BASELINE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-HSS-BASELINE (slot:oscar): add HSS non-carbide comparison baseline — close the carbide-only reference-data gap

**Commit:** `c78faa5a7398` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:06:16-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-compare-hss-baseline, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-HSS-BASELINE (slot:oscar): add HSS non-carbide comparison baseline — close the carbide-only reference-data gap

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-HSS-BASELINE (slot:oscar): add HSS non-carbide comparison baseline — close the carbide-only reference-data gap

The tri-vendor comparison baseline was carbide-only, so PRISM's HSS recommendations had no
published reference to compare against (prior sweep: hss/ceramic/cbn = 0 baseline datapoints).
Adds 4 HSS milling-roughing baseline rows for the bread-and-butter HSS materials:
  P-1018 12mm vc=24 fz=0.05 / P-1018 6mm vc=24 fz=0.025 / N-6061 10mm vc=90 fz=0.075 /
  K-gray-iron 12mm vc=18 fz=0.075.

HONEST sourcing (soul: no fabricated vendor numbers): vc/fz are WEB-VERIFIED (cnccookbook HSS
speeds/feeds, cross-checked Toolmex/Regal/globalcuttingtools) + physics-reviewer-VALIDATED vs
Machinery's Handbook / ASM HSS milling tables. ONE honest cnccookbook citation each (NO
fabricated Sandvik/Kennametal HSS pages -> the engine's <3-source low-power warning is the
correct honest signal). mrr omitted (no published full-cut operating point). M-stainless /
S-titanium / H-hardened HSS rows intentionally ABSENT (HSS marginal->impossible there).

LIVE-VALIDATED via the sweep: HSS now gets 54 baseline datapoints (was 0). Per-ISO deltas:
aluminum -5% (PRISM agrees), steel +31%, CAST IRON +108%. The +108% is a genuine FINDING the
comparison earned -- PRISM's HSS-cast-iron speed model runs ~2x hot vs published HSS practice
(baseline vc=18 is literature-correct; reviewer exonerated the baseline). Flagged for a
separate SFC HSS speed-model review unit (not this PR).

6 tests (cited values, HSS<carbide invariant, chip-load-by-diameter, no-fabrication-M/S/H lock,
single-honest-source). physics-reviewer PASS (arm A, values) + reviewer PASS (arm B, honesty/
encoding/test-integrity), 0 P0/P1.
```

## Files touched (3)
- mcp-server/src/__tests__/baselineHssEntries.test.ts         | 72 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpeedFeedBaselineComparatorEngine.ts | 62 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++----
- 2 files changed, 130 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c78faa5a7398`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._