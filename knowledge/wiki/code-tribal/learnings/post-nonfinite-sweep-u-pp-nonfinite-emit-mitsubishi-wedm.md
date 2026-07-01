# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-MITSUBISHI-WEDM — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-MITSUBISHI-WEDM (slot:echo): guard Mitsubishi MV1200R wire-EDM post emit against non-finite XNaN/DNaN

**Commit:** `4eae3443f215` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:40:05-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-mitsubishi-wedm, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-MITSUBISHI-WEDM (slot:echo): guard Mitsubishi MV1200R wire-EDM post emit against non-finite XNaN/DNaN

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-MITSUBISHI-WEDM (slot:echo): guard Mitsubishi MV1200R wire-EDM post emit against non-finite XNaN/DNaN

WHAT: extends the non-finite-emit bug-class sweep to the WEDM side. A full-population
audit of ALL *PostEngine.ts (not just the memo's 5) surfaced MitsubishiMV1200RWireEDM
as CLEAN + vulnerable (0 guards) -- the one the original 5-engine audit MISSED. It
emitted raw `op.start_x/start_y.toFixed(3)` (rapid-to-start), `point.x/y/u/v/r/i/j`
(generateProfile), and `(offset*1000).toFixed(0)` (wire-offset comp) -- all -> literal
XNaN/UInfinity/DNaN the M800 control rejects.

FIX (sibling convention -- warn loudly + skip/flag, never silently emit a wrong coord):
- generateProfile(+warnings): non-finite point XY -> skipped + ERROR comment + warning;
  non-finite taper U/V -> omitted + warned; non-finite arc R/I/J -> omitted + warned.
- main loop: non-finite start_x/start_y -> rapid replaced with ERROR marker + warning;
  non-finite wire offset -> offset-comp line omitted + warned.
- BYTE-IDENTICAL for finite inputs (139/139 across all 4 MV1200R test files unchanged).

TEST: +5 cases (regression byte-path + NaN start_x/no XNaN + Infinity profile point
skipped + non-finite taper U/V omitted + non-finite arc R omitted). 28/28 main, 139/139
all MV1200R files, engine tsc-clean.

CLOSES the non-finite bug-class sweep across the CLEAN post-engine population: mill
(RokuRoku + HaasNGC + OkumaOSP 59eae092f5 + HurcoV11 e502cfc993) + WEDM (this). Only
remaining vulnerable engine = OkumaB250 lathe, DONE-but-in-flight by a peer session
(do not double-build -- see reference_echo_inflight_uncommitted_stale_memos).
```

## Files touched (3)
- mcp-server/src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.test.ts | 66 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/MitsubishiMV1200RWireEDMMasterPostEngine.ts        | 52 +++++++++++++++++++++++-------
- 2 files changed, 107 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- wrong coord):

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4eae3443f215`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._