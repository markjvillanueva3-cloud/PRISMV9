# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-FIVEAXIS — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-FIVEAXIS (slot:echo): guard 5-axis getCoordRotation against non-finite NaN/Infinity orientation -- CLOSES the clean-population sweep

**Commit:** `ca64e2f6d6b8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T08:58:10-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-fiveaxis, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-FIVEAXIS (slot:echo): guard 5-axis getCoordRotation against non-finite NaN/Infinity orientation -- CLOSES the clean-population sweep

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-FIVEAXIS (slot:echo): guard 5-axis getCoordRotation against non-finite NaN/Infinity orientation -- CLOSES the clean-population sweep

WHAT: the last clean engine in the non-finite-emit bug-class sweep. FiveAxisPostEngine
.getCoordRotation substitutes angles a/b/c + origin x/y/z into a tilted-work-plane template
(G68.2 / CYCLE800 / PLANE SPATIAL) via `.replace("{a}", angles.a.toFixed(3))` etc. A
non-finite angle/origin substituted a literal "NaN"/"Infinity" into the orientation block
the control rejects. The `?? 0` on origin caught undefined, NOT NaN/Infinity.

FIX (adapted to a pure-string helper with NO warnings channel): sanitize each value to a
safe 0.000 (a valid orientation/origin, not a crash-into-part risk like a linear rapid)
AND append a loud `(WARNING: NON-FINITE ORIENTATION/ORIGIN SANITIZED TO 0 - REVIEW SETUP)`
flag comment when any input is non-finite -- fail-loud without a warnings array, never a
silent bad orientation token. BYTE-IDENTICAL for finite inputs.

TEST: +4 cases (regression finite + omitted-origin + NaN angle sanitized&flagged/no NaN +
Infinity origin sanitized&flagged/no Infinity). 38/38 file, engine tsc-clean.

SWEEP COMPLETE across the CLEAN post-engine population: mill (RokuRoku+HaasNGC+OkumaOSP
59eae092f5 + HurcoV11 e502cfc993) + WEDM (Mitsubishi 4eae3443f2 + PPWireEDM d34456a31d) +
turning (PPOkumaTurning aec3dab6e6) + 5-axis (this). Only OkumaB250 lathe remains, and it
is DONE-but-in-flight by a peer (already has nonFiniteOperationFields guard -- do not
double-build). This is the R15 apply-to-all completion of the bug class.
```

## Files touched (3)
- mcp-server/src/__tests__/FiveAxisPostEngine.test.ts | 33 +++++++++++++++++++++++++++++++++
- mcp-server/src/engines/FiveAxisPostEngine.ts        | 27 +++++++++++++++++++--------
- 2 files changed, 52 insertions(+), 8 deletions(-)

## Lessons surfaced in commit body
- tilted-work-plane template

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ca64e2f6d6b8`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._