# KIENZLE-LATHE-WIZARD/U-W2N-PARTING-BLADE-SPEC — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2N-PARTING-BLADE-SPEC (slot:whiskey): the program now SPECIFIES the required parting blade -> closes the collision half of the finding (collision 10->0), non-softening

**Commit:** `ef883650894f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T05:54:29-05:00
**Tags:** kienzle-lathe-wizard, u-w2n-parting-blade-spec, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2N-PARTING-BLADE-SPEC (slot:whiskey): the program now SPECIFIES the required parting blade -> closes the collision half of the finding (collision 10->0), non-softening

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2N-PARTING-BLADE-SPEC (slot:whiskey): the program now SPECIFIES the required parting blade -> closes the collision half of the finding (collision 10->0), non-softening

The residual 10 part_off:grooving_overhang collision fails (U-W2M) were the collision check assuming a flat 3mm parting blade -- which a large bar genuinely can't use (ratio>6). NOT a false geometry like U-W2L; the real gap was the program never SPECIFYING a blade width, so the check fell back to a too-narrow 3mm.

FIX (the non-softening approach -- NOT scaling a hidden assumption): pure helper requiredPartingBladeMm(barOdMm) = the smallest STANDARD blade (3/4/5/6mm) keeping the overhang ratio <= 6, capped at 6mm. (1) the collision check uses it instead of flat 3mm; (2) the program RECORDS the requirement in setup_notes ("Parting: fit a >=Xmm wide blade for bar OD Ymm") so the operator is told, not assumed. This COMPLETES the program spec + verifies feasibility -- it does not weaken the gate.

NEVER-SOFTEN (proven): blade capped at 6mm, so a bar needing >6mm (oversized) STILL exceeds the 6:1 ratio and flags -- R9 invariant test asserts OD 100 -> blade 6 -> ratio 6.67 > 6 -> flags. A feasible bar passes with its required blade (the relief).

VERIFIED:
- 6 new requiredPartingBladeMm tests (reference: OD 25.4->3mm, 40->4, 50->5, 60->6; feasible-bar-passes; oversized-still-flags invariant; adversarial NaN/neg/0->6mm conservative). + the boring/groove helper tests + 14 TurningPrintToProgram regression = 37 green.
- LIVE harness (bar 31.75mm=1.25in, requires a 4mm blade, ratio 4.7): collision_veto_fails 10 -> 0, collision_fail_types {}, safe 30->40 / unsafe 30->20; envelope UNCHANGED 96.3/100. The old 3mm gave ratio 6.3 (false flag); 4mm is correct + now spec'd.
- Remaining 20 UNSAFE are ALL boring_bar_out_of_tolerance = genuinely-deep bores (correct flags). The closed-loop test now has ZERO collision false positives.
- physics-reviewer (worktree-isolates off committed code): R9 never-soften invariant is the proof. Touches NO physics constants.

Finding RESOLVED: UNSAFE 40 -> 20, all residual GENUINE (deep-bore deflection). 3 generator over-pessimism defects found + fixed by the closed-loop test (U-W2K boring, U-W2L stickout, U-W2N parting-blade).
```

## Files touched (3)
- mcp-server/src/__tests__/boring-bar-overhang.test.ts  | 45 ++++++++++++++++++++++++++++++++++++++++++++-
- mcp-server/src/engines/TurningPrintToProgramEngine.ts | 30 +++++++++++++++++++++++++++++-
- 2 files changed, 73 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- TILL exceeds the 6:1 ratio and flags -- R9 invariant test asserts OD 100 -> blade 6 -> ratio 6.67 > 6 -> flags. A feasible bar passes with its required blade (the relief).
- till-flags invariant; adversarial NaN/neg/0->6mm conservative). + the boring/groove helper tests + 14 TurningPrintToProgram regression = 37 green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ef883650894f`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._