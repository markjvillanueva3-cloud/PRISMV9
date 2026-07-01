# POST-TRAIN-MS0/U-PT-HAAS-CYCLE-BYTE-MATCH — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-TRAIN-MS0]/U-PT-HAAS-CYCLE-BYTE-MATCH (slot:echo): byte-match the Haas canned-cycle output to the REAL JM golden archive (bare line + G99 default)

**Commit:** `8601451b27a0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T22:52:50-05:00
**Tags:** post-train-ms0, u-pt-haas-cycle-byte-match, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-TRAIN-MS0]/U-PT-HAAS-CYCLE-BYTE-MATCH (slot:echo): byte-match the Haas canned-cycle output to the REAL JM golden archive (bare line + G99 default)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-TRAIN-MS0]/U-PT-HAAS-CYCLE-BYTE-MATCH (slot:echo): byte-match the Haas canned-cycle output to the REAL JM golden archive (bare line + G99 default)

U-PT-HAAS-CANNED-CYCLES shipped against the SYNTHETIC SAMPLE-PRISM-Base-Hurco-RICH.nc (XY-on-the-cycle-
line + G98), which byte-DRIFTS from the real JM Haas golden. Grep of `JM DIE/CNC MILL HAAS/**/*.NC`:
17 cycle-def lines, 100% G99 (ZERO G98), and ZERO carry X/Y — real JM drilling reads
`N31 G99 G83 Z-.4375 R.1 Q.1 F1.8` (bare; XY positioned by the preceding G0 approach). Echo soul rule #4
(byte-equivalence vs the golden archive) → fix:

- emitCannedCycle first-hole line is now BARE: `{G98|G99} G8x Z R [Q/P] F` — no X/Y (the per-op approach
  block already rapided to the first hole's XY). Subsequent holes stay modal `X Y`. Cancel `G80`.
- retract default flipped G98 -> G99 (JM is 100% G99). retract_mode:"initial" -> G98 opt-in, documented
  for the fixturing-above-the-R-plane case.
- JSDoc/comments re-cite the REAL JM .NC (not the synthetic Hurco sample) as ground truth.
- +18 assertions updated to the bare/G99 format + a byte-guard `not.toMatch(/G8[1-6] X/)` (catches an
  XY-on-cycle-line regression). 47/47 tests + 3/3 corpus PERFECT + esbuild clean.

SCRUTINY 2-of-2 PASS — both reviewers INDEPENDENTLY re-grepped the golden archive and confirmed the
bare/G99 byte-format. Both caught 2 real P1 robustness gaps the bare-line refactor exposed (FIXED):
  P1a: the bare line drills hole #1 wherever the approach left the tool; the approach's rapid-preferring
       first point can diverge from holes[0] (leading non-rapid / NaN-filtered coord) -> wrong-XY drill.
       Added an R12 divergence warn (fmt-exact compare) so it fails loud instead of silently mis-drilling.
  P1b: the approach guard checked `=== undefined` not Number.isFinite -> a NaN x/y leaked as literal
       `XNaN` (Haas alarms). Now Number.isFinite-guarded + defaulted to 0,0 with a warn.
(A 3rd "honesty: 0 of 17 -> 15" flag was a reviewer mis-count; re-verified the golden = 17, claim stands.)
```

## Files touched (3)
- mcp-server/src/__tests__/HaasNGCMillMasterPostEngine.test.ts | 102 ++++++++++++++++++++-------------
- mcp-server/src/engines/HaasNGCMillMasterPostEngine.ts        |  36 +++++++++---
- 2 files changed, 90 insertions(+), 48 deletions(-)

## Lessons surfaced in commit body
- wrong-XY drill.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8601451b27a0`
- Milestone envelope: `mcp-server/data/milestones/POST-TRAIN-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._