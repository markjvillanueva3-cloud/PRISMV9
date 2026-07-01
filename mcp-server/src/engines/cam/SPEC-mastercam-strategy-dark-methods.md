# SPEC: MastercamStrategyEngine dark dispatcher methods
# Owner: slot:kilo (CAM domain specialist)
# Filed: camDispatcher drift audit, session 2026-06-24
# Status: SPEC -- do NOT implement without kilo sign-off

## Background

`camDispatcher.ts` has 6 case handlers that call methods on `MastercamStrategyEngine`
that do not exist on the class. The dispatcher key is `"mastercamStrategy"` which
resolves to `MastercamStrategyEngine` via getEngine(). Because getEngine() returns
`any`, these calls compile but throw `TypeError: eng.X is not a function` at runtime.

The existing class has: `selectStrategy(req: StrategyRequest)`, `compare(req)`,
`getCycleByCode(code)`, `getSupportedOperations()`, `getSupportedMaterialGroups()`.
It does NOT have the 6 methods called by the dispatcher.

## Verified missing methods (file:line in camDispatcher.ts)

### 1. `mastercam_strategy_recommend` -> `eng.recommend(feature, material, machine, tool, priority)`
- Dispatcher lines: ~8252-8258
- Dispatcher call: `eng.recommend(params.feature, params.material, params.machine, params.tool, params.priority)`
- 5 positional args; engine's closest equivalent is `selectStrategy(req: StrategyRequest)` with object arg
- StrategyRequest shape: `{ operation, iso_group, tool_diameter_mm?, flutes?, feature?, prefer_dynamic?, prefer_opti? }`
- Arg mapping needed: feature -> req.feature, material -> iso_group lookup, machine -> (no field), tool -> tool_diameter_mm, priority -> prefer_dynamic/prefer_opti flags

SPEC for kilo:
  Option A (adapter): Add `recommend(feature, material, machine, tool, priority)` that:
    1. Maps `material` string -> `iso_group` via MATERIAL_PATTERNS (already in NLPCAMParserEngine, can share)
    2. Maps `priority` string ("speed"|"finish"|"tool_life") -> prefer_dynamic/prefer_opti booleans
    3. Delegates to `selectStrategy(req)` and returns its result
    4. Must handle unknown material gracefully (default iso_group "P")
  Option B (dispatcher fix): Rework camDispatcher case to call `selectStrategy({...})` directly with mapped args.
  Recommendation: Option B is safer -- avoids adding a method that is just an impedance adapter.

### 2. `mastercam_strategy_params` -> `eng.getParameters(strategy_name: string)`
- Dispatcher lines: ~8260-8264
- Dispatcher call: `eng.getParameters(params.strategy_name)`
- No method exists. Engine has `getCycleByCode(code)` which looks up by numeric code, not string name.
- Requires: a map from strategy display name ("Dynamic Motion", "OptiRough", etc.) to full parameter sets
  (step-over %, depth-of-cut ratios, entry moves, arc lead-in radii -- Mastercam-specific data)

SPEC for kilo:
  1. Build a `STRATEGY_PARAMS` catalog (could live in `src/data/mastercam-strategy-params.ts`) mapping
     strategy_name -> { stepover_pct, max_doc_times_d, arc_lead_in_deg, ... }
  2. Add `getParameters(strategy_name: string): StrategyParameters | null` to MastercamStrategyEngine
  3. Return null (not throw) for unknown names; dispatcher should surface "unknown strategy" error

### 3. `mastercam_strategy_dynamic_motion` -> `eng.dynamicMotionDetails()`
- Dispatcher lines: ~8266-8270
- Returns detailed description of Mastercam Dynamic Motion cycle (HST dynamic milling):
  trochoidal entry, constant engagement, micro-lift on retracts, chip-thinning compensation
- This is documentary/advisory data, not a physics calculation

SPEC for kilo:
  Add `dynamicMotionDetails(): DynamicMotionInfo` returning a typed object with:
    - description: string
    - engagement_pct_max: number (typically 8-15% for dynamic)
    - preferred_tool_type: string
    - entry_strategy: string
    - mastercam_cycle_code: string (e.g. "2D Dynamic")
  Data can be hardcoded from Mastercam documentation -- no runtime computation needed.

### 4. `mastercam_strategy_optirough` -> `eng.optiRoughDetails()`
- Dispatcher lines: ~8272-8276
- Returns details of Mastercam OptiRough (volumetric roughing with constant chip load)

SPEC for kilo:
  Add `optiRoughDetails(): OptiRoughInfo` returning:
    - description: string
    - stepdown_strategy: string ("waterline" or "constant_z")
    - chip_load_control: string
    - rest_material_handling: string
    - mastercam_cycle_code: string (e.g. "Optirough")

### 5. `mastercam_strategy_profit_turning` -> `eng.profitTurningDetails()`
- Dispatcher lines: ~8278-8282
- Returns details of Mastercam Profit Turning (high-speed turning strategy)

SPEC for kilo:
  Add `profitTurningDetails(): ProfitTurningInfo` returning:
    - description: string
    - turning_type: string ("OD" | "ID" | "facing")
    - chip_thinning_compensation: boolean
    - preferred_insert_geometry: string
    - mastercam_cycle_code: string

### 6. `mastercam_strategy_list` -> `eng.listStrategies(category: string)`
- Dispatcher lines: ~8284-8288
- Dispatcher call: `eng.listStrategies(params.category)`
- Engine has `getSupportedOperations()` which returns readonly OperationType[] (no filtering by category)
- Requires: a strategy catalog indexed by category (mill/lathe/multi-axis/etc.)

SPEC for kilo:
  Option A: Add `listStrategies(category?: string): StrategyEntry[]` that filters the internal
    mastercamCycleCatalog by category (which is already used inside selectStrategy via
    mastercamCycleCatalogEngine). StrategyEntry: { name, category, cycle_code, description }
  Option B: Dispatcher calls `getSupportedOperations()` with category filter applied in the case body.
  Recommendation: Option A if the catalog has category fields; verify mastercamCycleCatalogEngine schema first.

## Files to touch (when implementing)

- `mcp-server/src/engines/MastercamStrategyEngine.ts` -- add the 4-6 new methods
- `mcp-server/src/data/mastercam-strategy-params.ts` -- new catalog file for getParameters (item 2)
- `mcp-server/src/tools/dispatchers/camDispatcher.ts` -- fix recommend() call or add adapter
- `mcp-server/src/__tests__/MastercamStrategyEngine.dark-methods.test.ts` -- R9 tests for each

## R9 test contract (to be written by kilo)

For each method:
  - Happy path: known input returns expected typed output with correct fields
  - Unknown input: returns null / empty list, not throw
  - Round-trip through camDispatcher: action returns {success:true, data:{...}}
  - Adversarial: empty string category, null strategy_name, unrecognised material

## Non-negotiable constraints

- No physics constants inlined -- import from src/physics/constants.ts if any calc needed
- No stubs -- every method must return real data or null (never a placeholder string)
- ASCII only in source files
- All 6 methods need companion tests before merging
