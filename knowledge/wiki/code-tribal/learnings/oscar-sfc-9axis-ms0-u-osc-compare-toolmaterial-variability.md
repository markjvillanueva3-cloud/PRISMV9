# OSCAR-SFC-9AXIS-MS0/U-OSC-COMPARE-TOOLMATERIAL-VARIABILITY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-TOOLMATERIAL-VARIABILITY (slot:oscar): sweep tool_material in the tri-vendor comparison — close the carbide-only variability gap

**Commit:** `6a3ad5654581` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T14:34:56-05:00
**Tags:** oscar-sfc-9axis-ms0, u-osc-compare-toolmaterial-variability, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-TOOLMATERIAL-VARIABILITY (slot:oscar): sweep tool_material in the tri-vendor comparison — close the carbide-only variability gap

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OSCAR-SFC-9AXIS-MS0]/U-OSC-COMPARE-TOOLMATERIAL-VARIABILITY (slot:oscar): sweep tool_material in the tri-vendor comparison — close the carbide-only variability gap

The comparison-half hardcoded tool_material='carbide', so 'compare ALL parameters with max
variability' only ever ran carbide despite TriCompareInputSchema + both vendor adapters
modeling hss/cermet/ceramic/cbn/pcd. Now sweeps TOOL_MATERIALS=[carbide,hss,ceramic,cbn]
per cell (144 cells -> 576 comparisons), with a per-material rollup + ledger tool_material.

LIVE-VALIDATED (576 comparisons, 0 errors): PRISM computes genuinely different per-material
recommendations (one cell: carbide 90 / hss 31.5 / ceramic 225 / cbn 225 m/min -- 7x spread,
physically correct). HONEST FINDING (R12, surfaced in a NOTE + baseline_datapoints column):
the PRISM-vs-baseline DELTA lands only for carbide (120 baseline pts, -25.9%) -- hss/ceramic/
cbn have PRISM numbers but 0 baseline pts because the published 5-vendor baseline is
carbide-keyed. Closing that needs non-carbide reference data (the catalog-OCR unit), NOT a
PRISM change. Same lesson class as the G-Wizard crib (geometry-only) finding.

Gating is asymmetric (reviewer P1 fixed): vendor/baseline abstains on no-datum materials,
PRISM emits a Vc for every material (does not model tool/workpiece non-viability) -> the
output column reads 'PRISM ran', not 'viable'. Comparison-harness only, no engine/physics.
code-analyzer PASS (aggregation/counter/ledger invariant verified vs live contracts).
Deferred P2 cosmetics: isoSummary 'cells' label now holds comparisons (4x); cell_errors
conflates orchestrator-null + comparator-throw.
```

## Files touched (2)
- mcp-server/scripts/sfc-full-sweep-compare.mjs | 163 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++------------------------
- 1 file changed, 117 insertions(+), 46 deletions(-)

## Lessons surfaced in commit body
- lesson class as the G-Wizard crib (geometry-only) finding.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a3ad5654581`
- Milestone envelope: `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._