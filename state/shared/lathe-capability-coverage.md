# Lathe MACHINING-CAPABILITY Coverage (deterministic) -- (run date via git)

> Per-capability E/F/T/D coverage across the FULL lathe machining taxonomy (52 capabilities).
> Distinct from lathe-knowledge-coverage.md (which measures the 5 PRODUCT phases). Deterministic grep/index
> match -> use as the ground-truth cross-check for agent coverage audits. Regen: node scripts/lathe-capability-coverage.mjs

**Summary:** 41 COVERED · 11 PARTIAL · 0 GAP (of 52).
Legend: E=engine (ENGINE_DIGEST/filename) · F=formula (constants.ts/algorithms) · T=tribal (src/data) · D=dispatcher action.

| Cluster | Capability | E | F | T | D | Status |
|---|---|:-:|:-:|:-:|:-:|---|
| turning | OD turning (rough+finish) | ✅ | ✅ | ✅ | ✅ | COVERED |
| turning | ID boring | ✅ | ✅ | ❌ | ✅ | COVERED |
| turning | Facing | ✅ | ✅ | ✅ | ✅ | COVERED |
| turning | Contour / profile turning | ✅ | ✅ | ✅ | ✅ | COVERED |
| turning | Taper turning | ✅ | ✅ | ❌ | ✅ | COVERED |
| turning | Form turning | ✅ | ✅ | ✅ | ✅ | COVERED |
| turning | Chamfer / corner radius | ✅ | ✅ | ❌ | ❌ | PARTIAL |
| threading | Single-point external threading | ✅ | ❌ | ✅ | ✅ | COVERED |
| threading | Single-point internal threading | ✅ | ❌ | ✅ | ✅ | COVERED |
| threading | Tapping (rigid) | ✅ | ✅ | ✅ | ✅ | COVERED |
| threading | Multi-start threading | ✅ | ✅ | ✅ | ✅ | COVERED |
| threading | NPT / tapered pipe thread | ✅ | ✅ | ✅ | ❌ | COVERED |
| threading | Thread whirling | ✅ | ❌ | ❌ | ❌ | PARTIAL |
| threading | Thread minor-dia / depth math | ✅ | ❌ | ✅ | ✅ | COVERED |
| threading | Thread insert selection | ✅ | ❌ | ✅ | ✅ | COVERED |
| grooving | OD grooving | ✅ | ✅ | ✅ | ✅ | COVERED |
| grooving | ID grooving | ✅ | ❌ | ❌ | ✅ | PARTIAL |
| grooving | Face grooving | ✅ | ❌ | ❌ | ✅ | PARTIAL |
| grooving | Peck grooving (deep) | ✅ | ✅ | ❌ | ✅ | COVERED |
| grooving | Parting / cutoff | ✅ | ✅ | ❌ | ✅ | COVERED |
| grooving | Part-catcher timing | ✅ | ✅ | ❌ | ✅ | COVERED |
| grooving | Blade stress / deflection | ✅ | ✅ | ❌ | ✅ | COVERED |
| drilling | On-center drilling | ✅ | ✅ | ✅ | ✅ | COVERED |
| drilling | Peck drilling (G74/G83) | ✅ | ✅ | ✅ | ✅ | COVERED |
| drilling | Spot / center drilling | ✅ | ❌ | ✅ | ❌ | PARTIAL |
| drilling | Drill thrust force | ✅ | ✅ | ❌ | ✅ | COVERED |
| drilling | Live-tool cross-drilling @C | ✅ | ❌ | ❌ | ✅ | PARTIAL |
| drilling | Live-tool cross-tapping @C | ✅ | ✅ | ✅ | ✅ | COVERED |
| drilling | C-axis polar (G12.1/G112) milling | ✅ | ❌ | ❌ | ❌ | PARTIAL |
| drilling | Bolt-circle / hole pattern | ✅ | ✅ | ✅ | ✅ | COVERED |
| drilling | Boring-bar deflection (L/D) | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Live-tool milling on lathe | ✅ | ✅ | ✅ | ✅ | COVERED |
| millturn | Sub-spindle transfer (NO-DROP) | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Bar-feeder / bar-puller | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Swiss guide-bushing | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Polygon turning | ✅ | ✅ | ❌ | ❌ | PARTIAL |
| millturn | Y-axis on lathe | ✅ | ❌ | ❌ | ❌ | PARTIAL |
| millturn | Gang-tool / back-working | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Multi-channel scheduling | ✅ | ✅ | ❌ | ✅ | COVERED |
| millturn | Turret layout / interference | ✅ | ❌ | ❌ | ✅ | PARTIAL |
| physics | Regenerative chatter / stability lobes | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Part deflection | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Workpiece thermal growth | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Chuck-jaw grip + centrifugal | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Spindle torque limit | ✅ | ✅ | ✅ | ✅ | COVERED |
| physics | Spindle power limit | ✅ | ✅ | ✅ | ❌ | COVERED |
| physics | G50 overspeed clamp (G96 CSS) | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Tool wear / Taylor life | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Surface finish Ra-from-feed | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Hard-turning gate | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Toxic-material / Ti-fire gate | ✅ | ✅ | ❌ | ✅ | COVERED |
| physics | Residual stress / surface integrity | ✅ | ❌ | ❌ | ❌ | PARTIAL |

## GAPS
None -- every capability has at least an engine or a formula.

## PARTIAL (thin coverage -- verify) 
- Chamfer / corner radius (turning): missing T/D
- Thread whirling (threading): missing F/T/D
- ID grooving (grooving): missing F/T
- Face grooving (grooving): missing F/T
- Spot / center drilling (drilling): missing F/D
- Live-tool cross-drilling @C (drilling): missing F/T
- C-axis polar (G12.1/G112) milling (drilling): missing F/T/D
- Polygon turning (millturn): missing T/D
- Y-axis on lathe (millturn): missing F/T/D
- Turret layout / interference (millturn): missing F/T
- Residual stress / surface integrity (physics): missing F/T/D
