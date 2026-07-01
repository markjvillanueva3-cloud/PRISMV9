# CAD-COMPLETE-MS0/U-BLISK-6SERIES-PARSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-COMPLETE-MS0]/U-BLISK-6SERIES-PARSE (slot:delta): fix lying validate + honest 6-series fail-loud

**Commit:** `c91fde85d19c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:47:09-05:00
**Tags:** cad-complete-ms0, u-blisk-6series-parse, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-COMPLETE-MS0]/U-BLISK-6SERIES-PARSE (slot:delta): fix lying validate + honest 6-series fail-loud

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-COMPLETE-MS0]/U-BLISK-6SERIES-PARSE (slot:delta): fix lying validate + honest 6-series fail-loud

BladeProfileLibraryEngine.parseDesignation rejected NACA 6-series ("65-010"/
"65-012") that BliskCADEngine.listProfiles() advertised AND BliskBladeSpec JSDoc
used as the example -> generate() threw at getProfile() while validate()
returned {valid:true} for the same profile (a lying validate). Fix:
- parseDesignation: specific honest 6-series AirfoilParseError (cites NACA Rpt
  824 / Abbott & von Doenhoff App. I), not the generic "expected 4-or-5-digits";
  dash/'A' marker can never false-match a valid 4-/5-digit (incl. NACA 6512).
- canGenerate(d): parse-only capability probe, structured {ok,reason}, no throw.
- BliskCADEngine.validate(): rejects ungeneratable profiles via canGenerate +
  guards missing blade -> generate() now fails loud (BliskSpecError at validate,
  not deep at getProfile). Closes the validate/generate inconsistency.
- listProfiles(): 6-series entries flagged generatable:false + honest notes.

6-series GEOMETRY generator deferred to U-BLISK-6SERIES-ORDINATES (needs verified
tabulated ordinates; fabricating airfoil data into a CAD engine is forbidden --
soul refuses silent-geometry-fallback). 109/109 tests (17 new, revert-verified:
12 fail without fix). tsc: 0 new errors in changed files. 2-of-2 per-file scrutiny PASS.
```

## Files touched (5)
- mcp-server/src/__tests__/BladeProfileLibraryEngine.test.ts | 64 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/BliskCADEngine.test.ts            | 97 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/BladeProfileLibraryEngine.ts        | 48 ++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/BliskCADEngine.ts                   | 40 ++++++++++++++++++++++++++++--
- 4 files changed, 247 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c91fde85d19c`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._