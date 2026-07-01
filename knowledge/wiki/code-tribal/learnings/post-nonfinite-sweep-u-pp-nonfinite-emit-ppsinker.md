# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-PPSINKER — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PPSINKER (slot:echo): guard PP sinker-EDM post emit against non-finite XNaN/ZInfinity

**Commit:** `ce31781ef63d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:03:08-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-ppsinker, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PPSINKER (slot:echo): guard PP sinker-EDM post emit against non-finite XNaN/ZInfinity

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PPSINKER (slot:echo): guard PP sinker-EDM post emit against non-finite XNaN/ZInfinity

WHAT: a confirming full-population audit (broader pattern) found PPSinkerEDMPostEngine
CLEAN + vulnerable -- emits via the unguarded formatCoord (L129) at start XY (L233),
retract/plunge Z (G81/G83 L258/261), and orbit R (L250/268). The plunge Z derives from
`startZ - op.target_depth_mm - overBurn`, so a non-finite target_depth_mm -> ZInfinity
(and also corrupts the burn-depth summary). The `?? default` fallbacks miss NaN/Infinity.
(The same audit flagged CrossCAMPostEngine but it is a FALSE POSITIVE -- a toolpath
ANALYZER whose .toFixed are metric-rounding/parseFloat, not coordinate emits.)

FIX (PPOkumaTurning pattern -- one main-loop guard at op dispatch, warnings in scope):
module-level `nonFiniteSinkerEmitFields(op)` checks the 7 coord/depth fields (start_x/y/z,
target_depth_mm, retract_depth_mm, over_burn_mm, orbit_radius_mm); a non-finite op ->
ERROR marker + warning + continue (whole op halted, fail loud; also stops a NaN depth
corrupting the summary). BYTE-IDENTICAL for finite inputs (52/52 existing unchanged).

TEST: +5 cases (regression byte-path + NaN start_x/no XNaN + Infinity depth/no ZInfinity
+ NaN orbit R/no RNaN + bad-op-dropped-good-op-emits). 57/57 file, engine tsc-clean.
```

## Files touched (3)
- mcp-server/src/__tests__/PPSinkerEDMPostEngine.test.ts | 57 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PPSinkerEDMPostEngine.ts        | 31 +++++++++++++++++++++++++++++++
- 2 files changed, 88 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ce31781ef63d`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._