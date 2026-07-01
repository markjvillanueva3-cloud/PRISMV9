# SFC-CONVERGENCE/U-SFC-MILL-PROVEN-REQUIRE-FIX — [MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MILL-PROVEN-REQUIRE-FIX (slot:oscar): fix CommonJS require() in ESM -- mill proven-extraction path was 100% dead

**Commit:** `f10b3aec2a14` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T13:59:03-05:00
**Tags:** sfc-convergence, u-sfc-mill-proven-require-fix, auto-distilled

## Subject
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MILL-PROVEN-REQUIRE-FIX (slot:oscar): fix CommonJS require() in ESM -- mill proven-extraction path was 100% dead

## Body
```
[MAIN-FORCE] [SFC-CONVERGENCE]/U-SFC-MILL-PROVEN-REQUIRE-FIX (slot:oscar): fix CommonJS require() in ESM -- mill proven-extraction path was 100% dead

MillPatternMinerEngine.mineJMDiePrograms used inline `require("fs")` /
`require("./HaasParserEngine.js")` / Hurco / RokuRoku INSIDE an ESM codebase
("type":"module", NodeNext). Under ESM/tsx `require` is undefined -> EVERY mill
program threw `ReferenceError: require is not defined`, swallowed by the per-program
try/catch (DEBUG log) -> 0 tools / 0 chip-load samples. The mill half of the JM-Die
proven speed/feed pipeline never produced a single datum (found while extending the
proven harness to mill -- reference_oscar_mill_proven_path_broken_2026_06_21).

fix: convert the 4 require() calls to top-of-file static ESM imports (readFileSync +
the 3 parser singletons). No circular dep (verified: none of the parsers import
MillPatternMiner), so static imports are safe and mineJMDiePrograms stays synchronous.

VALIDATED LIVE on 26 real JM Die Haas .NC programs: 98 tools, 13 operations,
12 chip-load samples extracted, 0 require errors (was 100% require-error pre-fix).
+3 regression tests (synthetic Haas program -> tools>=2 + chiploads>=1 + programType
filter; the test FAILS if require() ever returns -- total_tools stays 0 on a thrown+
caught require). build:fast clean.

Note (queued, U-SFC-MILL-PROVEN-PATH-FIX #19): JM mill corpus is dominated by .mcx-8
Mastercam CAD binaries (only ~26 .NC G-code under CNC MILL HAAS), so G-code proven
yield is inherently sparse -- a Mastercam-native extractor + the existing
src/data/jmdie-proven-mill-programs.ts catalog are the path to fuller mill coverage.
```

## Files touched (3)
- mcp-server/src/__tests__/MillPatternMinerEngine-jmdie-require-fix.test.ts | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MillPatternMinerEngine.ts                          | 13 ++++++++-----
- 2 files changed, 84 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f10b3aec2a14`
- Milestone envelope: `mcp-server/data/milestones/SFC-CONVERGENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._