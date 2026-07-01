# WEDM-PHASE-A/U-PARSER-BLANK-LINES — [MAIN] [WEDM-PHASE-A]/U-PARSER-BLANK-LINES (slot:charlie iter33): parseDXFGroups strict-stride fix + Phase-A.1 end-to-end PROVEN on real JM Die DXF

**Commit:** `152d6970fbbd` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T21:14:30-05:00
**Tags:** wedm-phase-a, u-parser-blank-lines, auto-distilled

## Subject
[MAIN] [WEDM-PHASE-A]/U-PARSER-BLANK-LINES (slot:charlie iter33): parseDXFGroups strict-stride fix + Phase-A.1 end-to-end PROVEN on real JM Die DXF

## Body
```
[MAIN] [WEDM-PHASE-A]/U-PARSER-BLANK-LINES (slot:charlie iter33): parseDXFGroups strict-stride fix + Phase-A.1 end-to-end PROVEN on real JM Die DXF

Root cause (3rd parser bug found this session): blank lines in DXF are NOT
separators -- they are valid empty-string VALUES for text-type group codes.
AutoCAD's $DIMPOST / $DIMAPOST / etc. are text variables (code 1) whose
empty values render as a literally-blank value-line. Both the pre-2026-05-22
.filter() approach AND the intermediate "skip blanks in-place" fix
incorrectly treated those blanks as skippable -- which shifted pair-parity
and silently dropped ~9% of pairs on AF102-05.dxf, including the
(2, "ENTITIES") section header.

Fix: walk the line stream STRICT 2-at-a-time, NEVER skip blanks. A blank
value-line becomes an empty string. A non-numeric code-line drops the
pair but preserves parity by advancing i += 2 unconditionally.

8 vitest cases (PASSED, 8/8 plus 10/10 polyline regression = 18/18 total):
  - 0-blank baseline
  - blank line-pair at code position (between pairs)
  - blank value-line for text-type code (AutoCAD $DIMPOST pattern)
  - multiple consecutive blank pairs at code position
  - blank lines at start of file
  - blank lines at end of file
  - non-numeric code-line (garbage) tolerated without parity shift
  - AF102-05 REAL-FILE REGRESSION: 363KB shop DXF, must produce >= 3 entities

PHASE-A.1 END-TO-END PIPELINE NOW WORKS ON REAL SHOP DXF:
  AF102-05.dxf (real OMG INC die for JM Die Company)
    -> DXFGeometryParserEngine.parseDXF: 3 contours, 0 issues, units=inch
    -> wedmPrintToProgramEngine.generate (D2 / 12.7mm / brass wire / Mitsubishi)
    -> 795 chars of dialect-correct Mitsubishi WEDM G-code in 316ms

  state/shared/wedm-training-corpus/af102-05-phase-a1.json now contains
  the FIRST real Phase-A training datapoint generated from a JM Die
  blueprint + program pair.

Also fixed in scripts/wedm-phase-a1-demo.mjs:
  - missing `await` on wedmPrintToProgramEngine.generate (it's async,
    was returning a Promise treated as empty object)
  - contour-mapping dropped bbox/area/perimeter -- wizard reads those;
    now spreads the full WireEDMContour shape through

This is the LAST parser-side blocker. The 98-pair v4 sweep is now
unblocked. Estimated runtime for full sweep: ~30s at 316ms/pair.

Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

## Files touched (5)
- .../DXFGeometryParserEngine.blanklines.test.ts     | 147 +++++++++++++++++++++
- mcp-server/src/engines/DXFGeometryParserEngine.ts  |  36 ++++-
- scripts/wedm-phase-a1-demo.mjs                     |   6 +-
- .../wedm-training-corpus/af102-05-phase-a1.json    |  25 ++--
- 4 files changed, 194 insertions(+), 20 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 152d6970fbbd`
- Milestone envelope: `mcp-server/data/milestones/WEDM-PHASE-A.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._