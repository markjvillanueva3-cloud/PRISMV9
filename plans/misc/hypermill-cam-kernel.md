# Forge-Triple: hyperMILL CAM Kernel Enhancements

## Context
The hyperMILL manuals (Parts 1-4, 238 pages) have already been processed into HyperMillStrategyEngine + HyperMillSafetyHooks. Now we apply that same knowledge to improve the **actual CAM kernel engines** — filling stubs, adding real logic, and fixing safety gaps. This is a forge-triple: enhanced engines + new tests + safety hooks.

## Current State of CAM Kernels
| Engine | Lines | Real | Stubs/Gaps |
|--------|-------|------|-----------|
| CAMKernelEngine | 875 | 5/20 operations | 15 operations metadata-only |
| ToolpathGenerationEngine | 238 | Strategy lookup works | 18/21 strategies → same rectangular path |
| StockModelEngine | 202 | All 5 methods real | Scalar volume only, no geometry |
| CollisionEngine | 2050 | AABB/OBB/capsule math | Holder unused, HELICAL missing |

## 7 Enhancements — Execution Order

### Enhancement 1: Material-Specific Stepdown Defaults
**File:** `ToolpathGenerationEngine.ts`
**What:** Add material-aware ap (depth of cut) factors from hyperMILL Manual 4.
**Changes:**
- Add `MATERIAL_STEPDOWN_FACTORS` table: aluminium=1.5, steel=0.5, titanium=0.3, cast_iron=0.8, inconel=0.2, stainless=0.4, brass=1.2, copper=1.0, plastic=2.0
- Modify `generate()` to accept optional `material` param and multiply `stepdown_mm` by the material factor x tool diameter
- Add `getStepdownForMaterial(material, toolDiameter)` public method
**Lines:** ~40 new
**Tests:** 4 (aluminium high stepdown, titanium low stepdown, unknown material defaults to 0.5, getStepdownForMaterial returns correct values)

### Enhancement 2: Helical Entry Enhancement
**File:** `CAMKernelEngine.ts`
**What:** Enhance `selectEntryStrategy()` and `generateHelicalRamp()` with hyperMILL rules.
**Changes:**
- Expand `MATERIAL_ENTRY_FACTORS` with: `helix_diameter_pct` (% of tool dia), `min_helix_diameter_mm`, `pitch_chipload_factor`
- Update `selectEntryStrategy()`: compute min helix diameter from corner radius (helix_dia >= 2 * corner_radius + tool_dia), compute pitch from chip load, add ramp-then-helix fallback when feature too narrow
- Update `generateHelicalRamp()`: use material-specific helix diameter instead of fixed 0.7xdia, validate helix fits in feature width
**Lines:** ~60 new
**Tests:** 4 (aluminium wide helix, titanium narrow helix, narrow feature triggers ramp fallback, pitch computed from chip load)

### Enhancement 3: Clearance Plane + Linking Moves
**File:** `CAMKernelEngine.ts`
**What:** Add clearance plane computation and linking move logic from hyperMILL Manual 1.
**Changes:**
- Add `ClearancePlaneConfig` type: `{ globalClearanceZ, localClearanceZ?, linkingMode: 'direct'|'z_clearance'|'full_retract', minClearanceMm }`
- Add `computeClearancePlane(stockTopZ, fixtureTopZ, workpieceTopZ, marginMm?)` returns safe Z (default margin 5mm)
- Add `generateLinkingMove(fromPos, toPos, clearanceConfig)` returns Move[] for safe travel between operations
- Modify `generateProgram()` to insert linking moves between toolpaths when config is provided
- Integrate with existing `validateClearancePlane()` from HyperMillSafetyHooks
**Lines:** ~80 new
**Tests:** 5 (clearance above all obstacles, linking through clearance Z, direct link when safe, full retract mode, warning when <2mm clearance)

### Enhancement 4: Operation Sequencing Rules
**File:** `CAMKernelEngine.ts` (new method)
**What:** Add hyperMILL operation ordering rules.
**Changes:**
- Add `sequenceOperations(operations[])` method
- Rules: (1) face mill first, (2) roughing before finishing per feature, (3) largest tool first within same op type, (4) 2D before 3D, (5) holes/drilling last, (6) rest machining after referenced finish
- Each operation: `{ id, type, tool_diameter, feature_id, depends_on[] }`
- Build dependency graph, topological sort, return sorted + warnings for rule violations
**Lines:** ~100 new
**Tests:** 5 (face mill first, roughing before finishing, largest tool first, drilling last, rest after referenced finish)

### Enhancement 5: Rest Machining Logic
**File:** `ToolpathGenerationEngine.ts`
**What:** Add real rest machining code path (currently strategy name only).
**Changes:**
- Add `rest_machining` branch in `generate()`
- Input: `previousToolDiameter`, `currentToolDiameter`, feature `dimensions`
- Logic: rest zones = boundary offset (prevRadius - currRadius), contour-parallel passes within offset band
- Integrate with StockModelEngine: call `removeVolume()` after rest pass
**Lines:** ~70 new
**Tests:** 4 (rest generates smaller passes, prev tool affects zone width, corner zones for rectangular pockets, no rest when same tool size)

### Enhancement 6: Holder Collision Sweep
**File:** `CollisionEngine.ts`
**What:** Fix HELICAL move handling + add holder geometry to swept volume.
**Changes:**
- `generateSweptVolumeForMove()`: add HELICAL branch (sample as linear segments with Z interpolation)
- `generateSweptVolumeForMove()`: if `tool.holder` exists, generate holder swept segments using `holder.maxDiameter` as capsule diameter, offset by `tool.fluteLength` above tip
- Add `sweepHolderForMove(move, tool)` private helper
**Lines:** ~70 new
**Tests:** 4 (helical generates segments, holder wider than tool, holder collision in deep pocket, no check when holder undefined)

### Enhancement 7: Rapid Move vs Stock Validation
**File:** `CollisionEngine.ts`
**What:** Enhance `validateRapidMoves()` to check rapids against stock/workpiece.
**Changes:**
- After machine envelope and fixture checks, add workpiece stock AABB check
- If rapid passes through stock bounding box, flag CRITICAL collision warning
- Apply clearance plane rule: rapid Z must be above max(stockTopZ, fixtureTopZ) + margin
**Lines:** ~40 new
**Tests:** 3 (rapid through stock detected, rapid above stock passes, rapid near fixture flagged)

## New Test File
**File:** `mcp-server/src/__tests__/cam-kernel-enhancements.test.ts`
**Total:** ~29 new tests across all 7 enhancements

## Files Modified

| File | Action | Enhancements |
|------|--------|-------------|
| `mcp-server/src/engines/ToolpathGenerationEngine.ts` | MODIFY | #1 (stepdown), #5 (rest machining) |
| `mcp-server/src/engines/CAMKernelEngine.ts` | MODIFY | #2 (helix), #3 (clearance), #4 (sequencing) |
| `mcp-server/src/engines/CollisionEngine.ts` | MODIFY | #6 (holder), #7 (rapid vs stock) |
| `mcp-server/src/__tests__/cam-kernel-enhancements.test.ts` | CREATE | 29 tests |
| `mcp-server/data/docs/MASTER_INDEX.md` | MODIFY | Update engine descriptions |

## Execution Dependencies
```
#1 (stepdown) ──┐
#2 (helix)   ───┤──> #3 (clearance) ──> #4 (sequencing) ──> #5 (rest machining)
                │
#6 (holder)  ───┴──> #7 (rapid vs stock)
```

## Estimated Total
- ~460 lines new engine code across 3 files
- ~29 new tests (~250 lines)
- ~710 lines total

## Verification
1. `npm run build` — 0 errors
2. `npx vitest run` — 2412+ tests, 0 regression
3. `npx vitest run src/__tests__/cam-kernel-enhancements.test.ts` — 29 new pass
4. Commit: `feat(cam): enhance CAM kernels with hyperMILL knowledge — 7 improvements, 29 tests [FORGE-TRIPLE]`
