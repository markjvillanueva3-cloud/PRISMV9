# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-HURCOV11 — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-HURCOV11 (slot:echo): guard HurcoV11 WinMax post emit against non-finite XNaN/FInfinity/SInfinity

**Commit:** `e502cfc993eb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:32:10-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-hurcov11, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-HURCOV11 (slot:echo): guard HurcoV11 WinMax post emit against non-finite XNaN/FInfinity/SInfinity

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-HURCOV11 (slot:echo): guard HurcoV11 WinMax post emit against non-finite XNaN/FInfinity/SInfinity

WHAT: completes the HurcoV11 arm of the non-finite-emit bug CLASS (the last of the
memo's flagged engines: RokuRoku + HaasNGC shipped; OkumaOSP shipped 59eae092f5; the
OkumaB250 lathe arm is in-flight by a peer). TRACE finding: HurcoV11 generateToolpath
iterates op.coordinates RAW (the isFinite normalization at L1851/1861 is a separate
method that never feeds this emit) -> a non-finite X/Y/Z emitted XNaN/ZInfinity. The
spindle-start line (generateSpindleStart L1126) emitted S{rpm} raw (SInfinity).

FIX (sibling convention -- warn loudly + skip/flag, never silently emit a wrong-but-
valid coord):
- generateToolpath(+warnings): non-finite coord move (incl present-but-non-finite Z)
  -> skipped + ERROR comment + warning; non-finite feed -> flagged F token; non-finite
  arc R/I/J -> omitted + warned.
- generateSpindleStart(+warnings): non-finite spindle_rpm -> flagged 0 token + warning.
- BYTE-IDENTICAL for finite inputs (verified: identical S/F/coord formatting; the 6 new
  cases are the only behavior change).

TEST: +6 cases in HurcoV11MillMasterPostEngine.test.ts (regression byte-path + NaN X/no
XNaN + Infinity Z/no ZInfinity + non-finite feed/no FInfinity + non-finite spindle/no
SInfinity + non-finite arc R/no RInfinity). Main file 78/78; engine tsc-clean.

NOTE (R12): 13 tests in 4 OTHER HurcoV11 files (SidecarIntegration/TribalFix/ProveOut/
Aggressiveness) FAIL -- but these are PRE-EXISTING + UNRELATED: verified by stashing my
changes and running against HEAD's committed engine (SidecarIntegration still 6/6 red).
They assert an `N100 S4000 M03 F800` spindle format the engine dropped 2026-05-22 (a
contract drift), NOT my coord/feed/spindle guard. Not fixed here (separate unit, possibly
peer territory). This closes the MILL side of the non-finite bug-class sweep.
```

## Files touched (3)
- mcp-server/src/__tests__/HurcoV11MillMasterPostEngine.test.ts | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts        | 56 +++++++++++++++++++++++++++++++---------
- 2 files changed, 115 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- wrong-but-
- till 6/6 red).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e502cfc993eb`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._