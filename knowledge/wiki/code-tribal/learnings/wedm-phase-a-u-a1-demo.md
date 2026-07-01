# WEDM-PHASE-A/U-A1-DEMO — [MAIN] [WEDM-PHASE-A]/U-A1-DEMO (slot:charlie iter30): parse→wizard demo + 2 P0 gap findings

**Commit:** `8a40c12f5407` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:25:43-05:00
**Tags:** wedm-phase-a, u-a1-demo, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-A1-DEMO (slot:charlie iter30): parse→wizard demo + 2 P0 gap findings

## Body
```
[MAIN] [WEDM-PHASE-A]/U-A1-DEMO (slot:charlie iter30): parse→wizard demo + 2 P0 gap findings

Phase-A.1 demo script runs the canonical pipeline on the first verified
DXF training pair (AF102-05, exact-tier from v3 results):
  read pair → DXFGeometryParserEngine.parseDXF → wedmPrintToProgramEngine
  → persist manifest to state/shared/wedm-training-corpus/<stem>-phase-a1.json

Gap-tolerant by design: any of v3's 148 pairs can feed this script and
produce a structured diagnostic entry (parse-gap / wizard-error / OK).
Becomes the corpus-building sweep script once the P0s below are fixed.

Two P0 findings, both unblockers for Phase-A:

(1) **DXF surface narrower than expected** — only 3 of 148 pairs have ANY
    .dxf. Of those 3, AF102-05 is the only real one; `edm_spring` and
    `edm_spring_holder` are tier-3 false-positives (matched to
    "31366 SPRING PLATE" via the generic word "SPRING" + HAAS-HURCO
    customer overlap). 145 pairs are PDF-scan only (Phase-A.3 gated on
    BlueprintVisionOCR).

    Fix → walker v4: stopword filter on extractCore OR require core to
    contain ≥1 digit. Orphans are digit-heavy (9100928, b-18823, etc.) so
    the digit filter loses no real pairs.

(2) **DXFGeometryParserEngine missing POLYLINE entity support** — AF102-05
    uses legacy AcDb2dPolyline (POLYLINE + VERTEX + SEQEND). Parser
    supports LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/SPLINE only. Parse
    returns 0 entities + 0 contours on a real 363KB AutoCAD R2007 DXF.

    Fix → add `case "POLYLINE"` to parseEntityToSegments: walk forward
    through VERTEX records collecting (10,x) (20,y) pairs until SEQEND,
    handle the 70-group closed bit and the 42-group bulge factor.
    Estimated 2-3h with 8-10 vitest cases.

Full diagnosis: memory reference_wedm_phase_a1_parser_gap_2026_05_22.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (3)
- scripts/wedm-phase-a1-demo.mjs                     | 180 +++++++++++++++++++++
- .../wedm-training-corpus/af102-05-phase-a1.json    |  30 ++++
- 2 files changed, 210 insertions(+)

## Lessons surfaced in commit body
- til SEQEND,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8a40c12f5407`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._