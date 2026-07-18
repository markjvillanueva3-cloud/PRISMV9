# KIENZLE-LATHE-WIZARD/U-W2J-UNSAFE-BY-ARCHETYPE — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2J-UNSAFE-BY-ARCHETYPE (slot:whiskey): pin the 40/60 UNSAFE to exact archetypes (crossroad-auto-decide: bounded diagnostic, not the physics fix)

**Commit:** `54c888e8ffd1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T05:00:15-05:00
**Tags:** kienzle-lathe-wizard, u-w2j-unsafe-by-archetype, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2J-UNSAFE-BY-ARCHETYPE (slot:whiskey): pin the 40/60 UNSAFE to exact archetypes (crossroad-auto-decide: bounded diagnostic, not the physics fix)

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W2J-UNSAFE-BY-ARCHETYPE (slot:whiskey): pin the 40/60 UNSAFE to exact archetypes (crossroad-auto-decide: bounded diagnostic, not the physics fix)

Rolls the UNSAFE verdicts up by archetype so the generator fix targets the right configs, not a blind sweep. PRECISE FINDING (deterministic, 10/10 across all 10 materials):
- id_bore + drill_center (20 progs) -> boring_bar_out_of_tolerance (2 boring ops each = the 40 op-level count): the generated boring/center-drill bar L/D + deflection exceeds tolerance.
- groove_od + part_off (20 progs) -> collision_veto_fails (20): grooving/parting overhang collision (LatheCollisionZoneEngine overhang checks).
- overspeed + overpower still 0 (G50 cap + power fine).

So the generator defect is archetype-specific + systematic: TurningPrintToProgramEngine boring-op bar/holder selection + DOC (id_bore/drill_center deflection) and groove/part-off tool overhang vs collision zone. The FIX (physics-relevant, needs physics-reviewer) is the next unit on fresh budget. unsafe_by_archetype + boring_fail_by_archetype now in the dashboard.
```

## Files touched (2)
- mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts | 11 ++++++++++-
- 1 file changed, 10 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till 0 (G50 cap + power fine).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54c888e8ffd1`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._