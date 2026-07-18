# KIENZLE-LATHE-WIZARD/U-W2M-COLLISION-FAIL-TYPES — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2M-COLLISION-FAIL-TYPES (slot:whiskey): pin the residual collision fails by archetype:check_type -- confirms U-W2L worked + isolates the deeper issue

**Commit:** `2f3ef5448d42` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T05:38:05-05:00
**Tags:** kienzle-lathe-wizard, u-w2m-collision-fail-types, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2M-COLLISION-FAIL-TYPES (slot:whiskey): pin the residual collision fails by archetype:check_type -- confirms U-W2L worked + isolates the deeper issue

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2M-COLLISION-FAIL-TYPES (slot:whiskey): pin the residual collision fails by archetype:check_type -- confirms U-W2L worked + isolates the deeper issue

Added collision_fail_types instrumentation to the Rung B harness (archetype:check_type -> count, like violations_by_axis). DEFINITIVE result: the 10 residual collision_veto_fails are ALL `part_off:grooving_overhang` -- ZERO groove_od and ZERO boring_reach.

This CONFIRMS U-W2L did its job: isolated probes show groove_od -> 0 collision fails and part_off (small bar OD 25.4) -> 0 collision fails. The 10 residual part_off fails are the harness's LARGER bar stock: with the now-correct geometry stickout (part_od/2 + clearance) the ratio still exceeds the 6x parting limit because the collision builder hardcodes a 3mm parting blade (TurningPrintToProgramEngine.ts:1673) regardless of bar size. A 3mm blade genuinely cannot safely part a >~30mm bar -- so this is a REAL constraint (the check correctly flags it), NOT the false-40mm-stickout positive U-W2L removed.

NEXT (separate unit): scale the parting/grooving blade_width with bar OD (a real shop uses a 4-6mm blade for large parting) OR have the generator select a wider parting tool -- then the residual relieves where physically valid and still flags genuinely-undersized blades. NOT a softening issue.

Finding fully characterized: UNSAFE 40->30. Relieved: 10 part_off + (boring) blind-bore false positives. Remaining genuine: 20 deep-bore deflection + 10 part_off (3mm blade vs large bar).
```

## Files touched (2)
- mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts | 7 +++++++
- 1 file changed, 7 insertions(+)

## Lessons surfaced in commit body
- till exceeds the 6x parting limit because the collision builder hardcodes a 3mm parting blade (TurningPrintToProgramEngine.ts:1673) regardless of bar size. A 3mm blade genuinely cannot safely part a >~30mm bar -- so this is a REAL constraint (the check correctly flags it), NOT the false-40mm-stickout positive U-W2L removed.
- till flags genuinely-undersized blades. NOT a softening issue.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2f3ef5448d42`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._