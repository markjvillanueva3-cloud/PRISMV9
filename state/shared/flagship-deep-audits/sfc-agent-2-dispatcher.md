# SFC Deep Audit — Agent 2: Dispatcher

## Wired Actions
| Action | Engine | Schema | Test |
|--------|--------|--------|------|
| speed_feed | ManufacturingCalculations | ✓ | ✓ |
| surface_finish | ManufacturingCalculations | ✓ | ✓ |
| ultimate_speed_feed | UltimateSpeedFeedEngine | ✗ | ✓ |
| surface_finish_predictor_calc | SurfaceFinishPredictorEngine | ✗ | ✓ |
| grinding_surface_finish_calc | GrindingSurfaceFinishEngine | ✗ | ✓ |
| kienzle_force | KienzleForceModelEngine | ✗ | ✓ |
| kienzle_coefficients | KienzleForceModelEngine | ✗ | ✓ |
| kienzle_milling | KienzleForceModelEngine | ✗ | ✓ |
| kienzle_size_effect | KienzleForceModelEngine | ✗ | ✓ |
| hypermill_material_lookup | HyperMillMaterialBridgeEngine | ✗ | ✓ |
| hypermill_material_search | HyperMillMaterialBridgeEngine | ✗ | ✓ |
| hypermill_material_stats | HyperMillMaterialBridgeEngine | ✗ | ✓ |
| hypermill_machinability | HyperMillMaterialBridgeEngine | ✗ | ✓ |
| hypermill_diameter_sf | HyperMillMaterialBridgeEngine | ✗ | ✓ |

## Orphans
**Schema Orphans (12 actions):** Ultimate_speed_feed, all Kienzle variants (4), all HyperMILL material actions (5), grinding_surface_finish_calc—missing entries in ACTION_CALC_SCHEMAS.

**Engine Orphans (0):** All 14 case statements have corresponding lazy imports.

**Action Enum Orphans (0):** All 14 case statements present in calcDispatcher.

## Strengths
- **Complete dispatcher coverage**: 14 SFC actions have case statements (lines 1277–8327)
- **Lazy imports throughout**: All engines use `await import()` pattern, no stubs
- **Round-trip test suite**: calcDispatcher.uwire-sfc-batch1.test.ts covers 3 SFC engines
- **No circular dependencies**: Clean async engine loading
- **Anti-regression guards**: Test suite verifies action reachability

## Gaps
- **Critical: Schema map underspecified** — 12 of 14 SFC actions lack Zod validation
- **Validation bypass risk**: Params skip Zod for kienzle, ultimate_speed_feed, HyperMILL, grinding
- **No field documentation**: Missing `.describe()` on unschema'd actions blocks MCP introspection
- **Incomplete test coverage**: Only 3 of 14 SFC actions tested at dispatcher level

## Score
**62/100**

- +30 Complete dispatcher case coverage; working lazy imports
- +20 Functional test suite for core SFC paths
- +12 No orphan engines or missing case statements
- -20 12 actions missing schema validation
- -8 No dispatcher-level tests for Kienzle, HyperMILL, grinding variants
- -12 Validation gap creates runtime risk; params flow unchecked to engines

## Verdict
SFC dispatcher is **functionally wired but schema-light**. Lazy loading works; validation coverage incomplete. Add 12 Zod schemas to ACTION_CALC_SCHEMAS and expand test suite to all 14 actions for 85+.
