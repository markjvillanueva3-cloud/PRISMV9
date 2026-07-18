# KIENZLE-LATHE-WIZARD/U-W2K-BORING-OVERHANG-FIX — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2K-BORING-OVERHANG-FIX (slot:whiskey): boring-bar deflection pre-check used part length, not bore depth -- 50% FALSE deflection flags (the U-W2J finding root cause)

**Commit:** `680145c93371` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T05:15:43-05:00
**Tags:** kienzle-lathe-wizard, u-w2k-boring-overhang-fix, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2K-BORING-OVERHANG-FIX (slot:whiskey): boring-bar deflection pre-check used part length, not bore depth -- 50% FALSE deflection flags (the U-W2J finding root cause)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2K-BORING-OVERHANG-FIX (slot:whiskey): boring-bar deflection pre-check used part length, not bore depth -- 50% FALSE deflection flags (the U-W2J finding root cause)

The closed-loop test (U-W2J) pinned 40/60 UNSAFE to boring_bar_out_of_tolerance on id_bore + drill_center. ROOT CAUSE: TurningPrintToProgramEngine's boring-bar deflection pre-check set `overhang = part_length_mm * 1.2` for EVERY id/bore op regardless of actual bore depth. A boring bar's unsupported stickout is governed by REACH TO THE BORE BOTTOM (the feature depth), not the whole part -- so a blind bore (depth < part length) got a falsely-inflated L/D + deflection -> false within_tolerance:false (deflection ~ L^3/D^4, so over-stating L is over-stating deflection cubically).

FIX: pure exported helper boringBarOverhangMm(feat, partLengthMm) = min(boreDepth, partLength) * 1.2, where boreDepth = feat.depth_mm -> feat.length_mm -> partLengthMm (conservative fallback). The boring check looks up the op's feature (input.features.find by feature_id) and calls it.

NEVER-SOFTEN (this is the safety crux): the min() cap guarantees overhang <= the legacy part_length*1.2 -- it ONLY RELIEVES false positives, never increases. A missing/0/negative/NaN depth falls back to the conservative legacy value (NOT 0 -- which would mask a real deep-bore deflection). It is an ADVISORY check (severity:"warning", does NOT veto emission).

VERIFIED:
- 9 new unit tests (boring-bar-overhang.test.ts): reference values (blind depth 10 in 100mm -> 12mm overhang vs legacy 120mm; through bore -> 120mm unchanged) + the never-exceeds-legacy INVARIANT (overhang <= partLength*1.2 over a 44-case sweep) + adversarial (negative/NaN/0/over-length -> conservative fallback). 9/9.
- Regression: TurningPrintToProgramEngine.test.ts 14/14 + boring-bar-deflection-engine.test.ts 10/10 = no break.
- LIVE harness: boring_bar_out_of_tolerance 40 -> 20 (false positives relieved; the remaining 20 are genuinely-deep bores that STILL flag -- proves it is NOT blanket-softening), envelope_agreement UNCHANGED 96.3/100 (no blast radius).
- physics-reviewer: validated the MODEL in principle (bore-depth L correct, min-cap correct, 1.2 factor reasonable, never-soften algebra holds) but ran in an isolated worktree off a stale HEAD so could not see the uncommitted diff (documented: physics-reviewer sees only committed code) -- the R9 invariant test is the proof of the never-soften fallback it flagged. Re-review against this commit recommended.

Touches NO physics constants (geometric input only; constants.ts + boringBarDeflectionEngine unchanged).
```

## Files touched (3)
- mcp-server/src/__tests__/boring-bar-overhang.test.ts  | 70 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/TurningPrintToProgramEngine.ts | 27 +++++++++++++++++++++++++--
- 2 files changed, 95 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TILL flag -- proves it is NOT blanket-softening), envelope_agreement UNCHANGED 96.3/100 (no blast radius).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 680145c93371`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._