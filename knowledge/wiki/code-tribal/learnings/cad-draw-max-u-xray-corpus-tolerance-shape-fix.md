# CAD-DRAW-MAX/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX — [MAIN-FORCE] [CAD-DRAW-MAX]/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX (slot:xray): fix 16 tsc errors -- cad-validation-corpus callouts to real ToleranceCallout shape

**Commit:** `ccd055c23580` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:15:38-05:00
**Tags:** cad-draw-max, u-xray-corpus-tolerance-shape-fix, auto-distilled

## Subject
[MAIN-FORCE] [CAD-DRAW-MAX]/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX (slot:xray): fix 16 tsc errors -- cad-validation-corpus callouts to real ToleranceCallout shape

## Body
```
[MAIN-FORCE] [CAD-DRAW-MAX]/U-XRAY-CORPUS-TOLERANCE-SHAPE-FIX (slot:xray): fix 16 tsc errors -- cad-validation-corpus callouts to real ToleranceCallout shape

Closed the flagged-but-unowned ToleranceCallout.kind regression (reference_tolerancecallout_kind_tsc_regression_2026_06_23). Corpus used a type-INVALID {kind,value:string} callout shape (16 TS2353) that also encoded to an EMPTY signal at runtime (encoder reads tolerance_mm/gdt_symbol). Fix: tolerance callouts -> real ToleranceCallout {tolerance_mm} (INCH->mm total band x25.4, units-first); surface/material folded into intent (type models tolerances only; harness scores exported+expectedOpLogMin not callout contents). 2-arm scrutiny caught+fixed a self-introduced P1 (3 surfaces dropped w/o folding -- MILL-001/004/WEDM-001); re-review PASS. Test: bare count>=8 -> stronger per-callout tolerance_mm shape-lock + surface/material text-preservation check. tsc 19->3 (16 corpus gone; 3 remaining = separate CAM bugs); corpus test 22/22 (heap-bumped tsc).
```

## Files touched (3)
- mcp-server/src/__tests__/cad-validation-corpus.test.ts | 22 ++++++++++++++++++++--
- mcp-server/src/data/cad-validation-corpus.ts           | 42 ++++++++++++++++++------------------------
- 2 files changed, 38 insertions(+), 26 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ccd055c23580`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAW-MAX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._