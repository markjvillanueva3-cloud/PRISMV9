# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-ADVPOST — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-ADVPOST (slot:echo): guard AdvancedPostProcessor probe-measure emit against non-finite ZNaN/DInfinity

**Commit:** `a96024210dff` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:40:58-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-advpost, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-ADVPOST (slot:echo): guard AdvancedPostProcessor probe-measure emit against non-finite ZNaN/DInfinity

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-ADVPOST (slot:echo): guard AdvancedPostProcessor probe-measure emit against non-finite ZNaN/DInfinity

WHAT: AdvancedPostProcessorEngine.generateMeasurementBlock emits feature.nominal.toFixed(3)
into in-process probe macros (G65 P9811/P9812/P9814/P9843 Z/D/W, Siemens CYCLE977/978,
Heidenhain Q263) across every controller branch. A non-finite feature.nominal -> literal
ZNaN/DInfinity the probe macro rejects.

FIX (one guard at the method top covers all controller branches; this block-builder returns
string[] with no warnings channel, so fail loud via an inline (ERROR: ...) marker like
EDMProgramAssembler/FiveAxis): non-finite feature.nominal -> ERROR marker, no probe emitted.
BYTE-IDENTICAL for finite inputs (22/22 existing tests unchanged; 3 importers HurcoV11/
MasterPost/OkumaOSP unaffected for finite).

TEST: +3 cases (regression finite Fanuc G65 P9811 Z25.400 + NaN nominal/no ZNaN + Infinity
nominal/no ZInfinity), asserting no /[ZDWQ](NaN|Infinity)/ token + the NON-FINITE NOMINAL
marker. 25/25 file, engine tsc-clean.

13 units this session. Echo-domain fleet-wide sweep continues per the per-engine-verification
discipline (raw -> guard/skip; Zod -> .finite()).
```

## Files touched (3)
- mcp-server/src/__tests__/AdvancedPostProcessorEngine.test.ts | 34 ++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/AdvancedPostProcessorEngine.ts        |  8 ++++++++
- 2 files changed, 42 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a96024210dff`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._