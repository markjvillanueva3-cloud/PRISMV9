# POST-NONFINITE-SWEEP/U-PP-NONFINITE-EMIT-PROGSTRUCT — [MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PROGSTRUCT (slot:echo): guard ProgramStructureEngine safe_z retract against non-finite ZNaN/ZInfinity

**Commit:** `dc7df09213d2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T09:46:55-05:00
**Tags:** post-nonfinite-sweep, u-pp-nonfinite-emit-progstruct, auto-distilled

## Subject
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PROGSTRUCT (slot:echo): guard ProgramStructureEngine safe_z retract against non-finite ZNaN/ZInfinity

## Body
```
[MAIN-FORCE] [POST-NONFINITE-SWEEP]/U-PP-NONFINITE-EMIT-PROGSTRUCT (slot:echo): guard ProgramStructureEngine safe_z retract against non-finite ZNaN/ZInfinity

WHAT: ProgramStructureEngine.assemble uses `safeZ = input.safe_z_mm ?? DEFAULT_SAFE_Z`
(`??` catches undefined, NOT NaN/Infinity), and safeZ feeds 3 retract emits (RAPID TO
SAFE Z, RETRACT TO SAFE Z, G43 tool-length-comp Z). A non-finite safe_z_mm -> literal
ZNaN/ZInfinity retract the control rejects.

FIX (one source-guard covers all 3 sites): non-finite safe_z_mm -> default to the
known-safe DEFAULT_SAFE_Z (50mm) + warn. A retract to a safe default is genuinely safe
(it's a retract height, not a cut), and the warning surfaces it (fail loud). BYTE-IDENTICAL
for finite/undefined inputs (Number.isFinite(x)?x:default == x??default for finite).

TEST: new companion ProgramStructureEngine.test.ts (5 cases): singleton + regression
finite retract + NaN safe_z defaults+warns/no ZNaN + Infinity defaults+warns/no ZInfinity
+ -Infinity. 5/5, engine tsc-clean.

14 units this session. Echo-domain fleet-wide sweep continues.
```

## Files touched (3)
- mcp-server/src/__tests__/ProgramStructureEngine.test.ts | 59 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ProgramStructureEngine.ts        |  9 ++++++++-
- 2 files changed, 67 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dc7df09213d2`
- Milestone envelope: `mcp-server/data/milestones/POST-NONFINITE-SWEEP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._