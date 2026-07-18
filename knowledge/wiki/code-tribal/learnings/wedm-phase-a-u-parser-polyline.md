# WEDM-PHASE-A/U-PARSER-POLYLINE — [MAIN] [WEDM-PHASE-A]/U-PARSER-POLYLINE (slot:charlie iter32): DXFGeometryParserEngine legacy POLYLINE/VERTEX/SEQEND support + 10 tests

**Commit:** `d6403ac3d6e3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T20:49:13-05:00
**Tags:** wedm-phase-a, u-parser-polyline, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-PARSER-POLYLINE (slot:charlie iter32): DXFGeometryParserEngine legacy POLYLINE/VERTEX/SEQEND support + 10 tests

## Body
```
[MAIN] [WEDM-PHASE-A]/U-PARSER-POLYLINE (slot:charlie iter32): DXFGeometryParserEngine legacy POLYLINE/VERTEX/SEQEND support + 10 tests

v3 of DXFGeometryParserEngine supported LINE/ARC/CIRCLE/LWPOLYLINE/ELLIPSE/
SPLINE only. Legacy AcDb2dPolyline (POLYLINE header + N VERTEX subrecords +
SEQEND) was the dominant entity class in JM Die's shop DXFs and silently
yielded 0 contours -- the Phase-A.1 iter-30 audit named this as a P0 blocker.

parsePolyline() walks (0,VERTEX) subrecords accumulating (10,x)(20,y)
plus optional (42,bulge), terminates on (0,SEQEND). Group-70 closed-bit
honored. Group-70 bit-8/16 3D polylines projected to 2D. Iteration bounded
by MAX_DXF_GROUPS as DoS guard.

Wired into parseEntityToSegments() switch; extractBlocks() picks it up
automatically via parseEntityToRawSegments() (same switch).

10 vitest cases (PASSED, 10/10):
  - open polyline (3 vertices, 2 line segments)
  - closed polyline (4 vertices, 4 line segments, closing edge to start)
  - bulge arc on one vertex (mix of line + arc segments)
  - empty polyline (POLYLINE -> SEQEND, 0 segments, no crash)
  - orphan VERTEX without preceding POLYLINE (0 segments, no crash)
  - POLYLINE without SEQEND followed by a LINE (both parse correctly)
  - mixed POLYLINE + LINE + CIRCLE in one ENTITIES section (3 entities)
  - 3D polyline (group 70 bit 8, Z dropped, XY segments emitted)
  - polyline nested in BLOCK referenced by INSERT (translation correct)
  - AF102-05 reproduction fixture (2 CIRCLE + 1 POLYLINE closed square, 6 segs)

SECOND FINDING (pre-existing, separate scope, NOT fixed in this commit):
parseDXFGroups() pre-filters blank lines via `.filter(l => l.trim() !== "")`
BEFORE pairing. When the source DXF has blank lines (AF102-05 has 57),
parity shifts and 1,071 of ~12,410 pairs are silently dropped. The
(2, "ENTITIES") group is among the dropped pairs, so extractEntities()
never enters the section -> AF102-05 still returns 0 contours even with
POLYLINE handler wired in. Memory:
reference_wedm_phase_a1_parser_blank_line_bug_2026_05_22.md.

Fix for that second bug is a clean follow-on unit (U-PARSER-BLANK-LINES):
~10-line change to parseDXFGroups walking blanks in-place rather than
pre-filtering. Should be next iter.

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (3)
- .../DXFGeometryParserEngine.polyline.test.ts       | 236 +++++++++++++++++++++
- mcp-server/src/engines/DXFGeometryParserEngine.ts  |  93 ++++++++
- 2 files changed, 329 insertions(+)

## Lessons surfaced in commit body
- till returns 0 contours even with

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d6403ac3d6e3`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._