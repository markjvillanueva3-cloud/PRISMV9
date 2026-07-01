# CAMX-MS22/U-GRIND-ADAPTERS — [MAIN-FORCE] [CAMX-MS22]/U-GRIND-ADAPTERS (slot:india): add grindingProgramAssemblerEngine singleton + flat-spec generate*GrindProgram adapters

**Commit:** `4e674a29f787` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T19:52:59-05:00
**Tags:** camx-ms22, u-grind-adapters, auto-distilled

## Subject
[MAIN-FORCE] [CAMX-MS22]/U-GRIND-ADAPTERS (slot:india): add grindingProgramAssemblerEngine singleton + flat-spec generate*GrindProgram adapters

## Body
```
[MAIN-FORCE] [CAMX-MS22]/U-GRIND-ADAPTERS (slot:india): add grindingProgramAssemblerEngine singleton + flat-spec generate*GrindProgram adapters

Closes 2 of 3 CAMX-MS22 failures (generateCylindricalGrindProgram +
generateSurfaceGrindProgram). The engine had the real grinding logic
(assembleCylindricalGrind / assembleSurfaceGrind, full physics + dressing +
wheel-wear + cycle-time) but NO `grindingProgramAssemblerEngine` singleton
export -- so the test import was undefined and crashed -- and no flat-spec
entry points.

- export const grindingProgramAssemblerEngine (the import every consumer/test
  references; engine was previously only class-instantiable).
- generateCylindricalGrindProgram({od_start/od_target/length/feed/...}): maps the
  flat job spec onto a CylindricalGrindProfile (radial stock = (od_start-od_target)/2
  per side, op od_plunge) and delegates to assembleCylindricalGrind -- which
  auto-generates the roughing infeed + finish + spark-out passes (NOT a stub;
  returns the full GrindingProgram with real gcode/physics/uncertainty).
- generateSurfaceGrindProgram({length/width/depth/step_over/table_speed/...}):
  maps onto a SurfaceGrindProfile (depth->stock, step_over->cross feed,
  table_speed->v_w) and delegates to assembleSurfaceGrind.
- Sensible precision-grind defaults fill the geometry the flat spec omits
  (cyl wheel 350x25mm, surface wheel 200x13mm, Ra 0.4um); both registered in stats().

Remaining CAMX-MS22 failure: EDMProgramAssemblerEngine.assembleSinkerEDM (sinker
EDM = electrode-plunge + burn schedule, a real WEDM-domain method -- taken as the
next unit, NOT delegated to the wire path which would emit a semantically-wrong
program).

Verify: rtk npx vitest run src/__tests__/CAMX-MS22-TestDrivenPipelineValidation.test.ts
        (60 tests: 59 pass, only assembleSinkerEDM remains). tsc --noEmit 0 errors.
```

## Files touched (2)
- mcp-server/src/engines/GrindingProgramAssemblerEngine.ts | 78 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 78 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4e674a29f787`
- Milestone envelope: `mcp-server/data/milestones/CAMX-MS22.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._