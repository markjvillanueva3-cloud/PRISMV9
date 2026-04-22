# PRISM v9 Client-Side Data Model Review

## Files Reviewed
11 data files under `web/src/data/`, plus `web/src/types/sfc.ts`, `web/src/types/data.ts`, and `web/src/pages/SfcCalculatorPage.tsx`.

---

## Code Review Summary

### Strengths
- ISO 513 material grouping is correct and industry-standard (P/M/K/N/S/H)
- Operation taxonomy is broad and well-categorized (13 categories, 45+ operations)
- Machine mode system with grouped tabs (chip_removal / finishing / non_traditional) is a clean design pattern
- Sub-operation IDs are consistent between `machineModes.ts` and `operations.ts`
- Tool compatibility function in `tools.ts` cross-references coating suitability against ISO material groups
- `toolpathStrategies.ts` multiplier-based system is elegant and composable
- Helper functions (searchMaterials, getCompatibleTools, validateMachines, etc.) provide clean filtering APIs
- Cutting priority presets allow multiplier stacking: priority * CAM software * toolpath strategy

---

### CRITICAL Issues

#### 1. MaterialEntry is missing fields required by calculations and other subsystems

`MaterialEntry` in `materials.ts` has: `id, name, group, groupLabel, hardness, tensileStrength, machinability`

Missing fields that exist on the server-side `MaterialRecord` (in `types/data.ts`) and are needed by calculations:
- **`density_kg_m3`** -- required for stock weight estimation (`StockDimensions` cannot compute mass/cost), MRR-based power calculations, and the `StockOptimizerPage` which references `catalog.density_kg_m3`
- **`thermal_conductivity`** -- needed for thermal modeling (ThermalPage exists), coolant strategy selection, and predicting built-up-edge risk in non-ferrous/stainless
- **`specific_cutting_force` (kc1.1)** -- the `PowerTorqueRequest` type has an optional `specific_cutting_force` field; the `WhatIfPage` comments reference `Fc ~ kc * fz * ap`. Without kc per material on the client, power/torque calculations must always round-trip to the server even for local estimates
- **`youngs_modulus`** -- needed for deflection calculations (DeflectionRequest exists). Currently `tool_material` is a string; the actual E-modulus lookup must happen server-side

**Impact**: The client model is insufficient for offline/local preview calculations. Every derived metric (weight, cost, power, deflection) requires a server call.

#### 2. Hardness unit ambiguity

`MaterialEntry.hardness` is typed as bare `number` with no unit indicator. The "P" group materials appear to be in HB (Brinell), but the "H" group entries (4140HRC50: 500, D2HRC60: 620) are clearly HRC values scaled into a different range -- 60 HRC is not 620 on any standard scale. If these are HV (Vickers), 620 HV is plausible for 60 HRC, but the field name gives no indication. The `types/data.ts` server record uses `hardness_hrc`, implying HRC is the canonical unit.

**Impact**: Any calculation that interprets `hardness` will produce wrong results for hardened steels if the unit assumption is wrong. A 500-HRC value is physically impossible (HRC maxes at ~70).

#### 3. D2 Tool Steel classified as ISO group "P" (Steel) instead of "H" (Hardened Steel)

`D2` (id: "D2", hardness: 220) is listed under group "P". In its annealed state this is arguably correct, but D2 is almost always used hardened (58-62 HRC). More critically, both `D2` and `D2HRC60` exist, creating a confusing dual-entry situation. The same applies to `H13` vs `H13HRC48` and `4140` vs `4140HRC50`. There is no way to model a single material at different heat-treat conditions; the model treats each condition as a separate material.

**Impact**: Users may select the wrong D2 entry and get dangerous cutting parameters for hardened tool steel.

---

### MAJOR Issues

#### 4. Machine-to-controller relationship is broken

`MachineEntry.controller` is a free-text string (e.g., "Haas NGC", "CELOS Siemens", "SmoothX"), while `ControllerEntry.id` uses snake_case IDs (e.g., "haas_ngc", "siemens_840d", "mazak_smooth"). There is no foreign key relationship. The `MachineConfigPanel` lets users independently select a controller from `CONTROLLERS`, but `MachineEntry` also has its own controller string. These two are never reconciled.

**Impact**: A user could select a Haas VF-2 machine and pair it with a Siemens 840D controller, which is physically impossible. No validation exists to prevent this.

#### 5. Taper/spindle inconsistency between machines and tool holders

`SPINDLE_PRESETS` in `controllers.ts` specify tapers (CAT40, HSK-A63, etc.), and `TAPER_TYPES` in `toolHolders.ts` also define tapers. But `MachineEntry` has no taper field at all. When a user selects a machine (e.g., DMG DMU 50 which uses HSK-A63), there is no mechanism to filter tool holders to matching tapers, or to validate that the selected holder taper matches the machine spindle.

**Impact**: The tool holder selection is disconnected from the machine selection, allowing physically impossible combinations.

#### 6. Missing tool data for most operation categories

`TOOLS` in `tools.ts` covers: endmills, face mills, drills, turning inserts, and one thread mill (13 total entries). There are zero tools for: grinding, honing, boring, broaching, plasma, wire EDM, sinker EDM, laser, or waterjet operations. The `getCompatibleTools` function will return empty `compatible` arrays for any of these 9+ categories.

**Impact**: The tool selector will show nothing for roughly 60% of the available operation types. The non-traditional processes (EDM, laser, waterjet, plasma) correctly set `showToolHolder: false`, but grinding, honing, boring, and broaching also set `showToolHolder: false` yet have no tool entries either.

#### 7. Operation defaults use magic numbers with no provenance

Every `OperationType.defaults` block contains hardcoded numeric values:
- `face_milling`: `tool_diameter: 50, number_of_teeth: 6, depth: 2, width: 40`
- `slot_milling`: `tool_diameter: 12, number_of_teeth: 4, depth: 6, width: 12`
- `gun_drill`: `tool_diameter: 8, number_of_teeth: 1, depth: 200, width: 8`

No comments or references indicate where these defaults come from (manufacturer catalog, industry standard, arbitrary). The gun drill default of 200mm depth is reasonable for a gun drill, but the peck drill default of 50mm depth for a 10mm drill means 5xD which is moderate -- it's unclear if this is intentional engineering judgment or a placeholder.

#### 8. `requiredAxes` logic is hardcoded and incomplete

In `SfcCalculatorPage.tsx` line 320:
```typescript
const requiredAxes = operation?.category === "milling" ? 3 : 2;
```

This is wrong for 5-axis operations. A "finishing" or "semi-finishing" milling operation on a complex surface requires 5 axes, but this logic always reports 3. The toolpath strategy `minCamLevel: "mill_3d"` hints that some strategies need more axes, but this is never reflected in the axis requirement.

#### 9. No lathe-specific data in the machine model

`MachineEntry.tableSize` uses `{ x: number; y: number }` which makes no sense for lathes. For the ST-20, the values are `{ x: 533, y: 0 }` -- a zero Y dimension is a workaround. Lathes need:
- `maxTurningDiameter` (swing over bed)
- `maxTurningLength` (distance between centers)
- `barCapacity` (max bar diameter through spindle)
- `spindleBore`
- `chuckSize`

The generic `tableSize` field is wrong for half the machine types.

---

### MEDIUM Issues

#### 10. `CamSoftwareEntry.feedMultiplier` is a parallel array coupled to `levels` by index

```typescript
levels: [
  { id: "mill_2d", label: "Mill 2D" },
  { id: "mill_3d", label: "Mill 3D" },
  { id: "multiaxis", label: "Multiaxis" },
],
feedMultiplier: [1.0, 1.0, 1.05],
```

If someone adds a level but forgets to add the corresponding multiplier, `getCamFeedMultiplier` will silently return `1.0` (the fallback). This should be a single array of objects: `levels: [{ id, label, feedMultiplier }]`.

#### 11. `ToolpathStrategy.minCamLevel` is an unvalidated string

`minCamLevel: "mill_3d"` references a Mastercam level ID. But if the user is on Fusion 360, the levels are "personal", "standard", "mfg_ext". There is no mapping or comparison logic. The field exists but is never consumed in any filtering code visible in the data or page files.

#### 12. Duplicate coating data across two files

`COATINGS` in `tools.ts` defines coatings with `maxTemp, hardness, suitedFor, avoidFor`. `COATING_TYPES` in `toolHolders.ts` defines coatings with `maxTemp, color` but different IDs (lowercase: "altin" vs "AlTiN"). These are two independent, unsynchronized coating registries that could drift apart.

#### 13. No unit system in the data model

All dimensions are implicitly millimeters. The `imperial` toggle exists in the UI (passed to `StockDimensions`, `ParameterPanel`, `ComparisonView`, `ToolHolderSelector`), but the data files contain no unit metadata. The `SHANK_DIAMETERS_MM` and `SHANK_DIAMETERS_IN` arrays in `toolHolders.ts` are the only acknowledgment of dual units. Default values in `stockShapes.ts` use fractional mm values that are clearly inch conversions (152.4mm = 6", 101.6mm = 4", 50.8mm = 2"), which means the "default" experience is tuned for imperial users working in converted metric.

#### 14. Fixture `maxForceN` is never consumed

`FixtureType.maxForceN` is defined but I see no cutting-force calculation that validates whether the fixture can hold the part against the cutting forces. This is dead data unless there is server-side validation.

#### 15. Machine type union is too narrow

```typescript
type: "VMC" | "HMC" | "Lathe" | "Mill-Turn" | "5-Axis"
```

There are no machine entries for grinding machines, EDM machines, laser cutters, waterjet machines, or any of the non-traditional processes. The `MACHINE_MODES` config has 13 modes, but `MACHINES` only covers 5 types.

---

### SUGGESTIONS

#### 16. Static vs. Server-sourced data boundary

**Should be static (reference data, changes infrequently):**
- ISO material groups and their color codes
- Machine mode configurations (tab structure, UI layout hints)
- Stock shape geometries and their dimension field definitions
- Taper types, holder types, fixture categories
- Insert geometries (ISO standard shapes)
- Cutting priority presets (user-facing multiplier knobs)
- Overhang classification ratios

**Should come from MCP server (shop-specific, evolves, or is large):**
- Material catalog (shops add custom alloys, hardness varies by heat lot)
- Machine inventory (every shop is different)
- Cutting tool library (constantly changing, hundreds to thousands of entries)
- Controller list (tied to actual shop machines)
- CAM software and post-processor configurations (per-shop licensing)
- Toolpath strategy multipliers (should be tunable per shop via prism_calc)
- Coating performance data (manufacturer-specific, updated with new coatings)
- Fixture inventory (shop-specific)
- Spindle and ATC configurations (tied to specific machines)

#### 17. Add discriminated union for machine specs

Rather than a single `MachineEntry` with `tableSize: { x, y }`, create separate interfaces:
- `MillingMachineEntry` with `tableSize`, `taper`, `maxToolLength`
- `LatheMachineEntry` with `swingDiameter`, `turningLength`, `barCapacity`, `chuckSize`
- `EdmMachineEntry` with `tankSize`, `wireType`, `maxWorkpieceWeight`
- etc.

Use a discriminated union on `type`.

#### 18. Add material condition / heat-treat state

Instead of separate entries for "4140" and "4140HRC50", model:
```typescript
interface MaterialEntry {
  id: string;
  baseAlloy: string;
  condition: "annealed" | "normalized" | "quench_tempered" | "solution_treated" | string;
  hardnessHrc: number;  // explicit unit
  ...
}
```

#### 19. Tool-to-operation mapping should use enums, not strings

`suitedOperations: string[]` in `CuttingToolEntry` and `operationCategories: string[]` in `ToolpathStrategy` are stringly-typed. A typo like "slot_miling" would silently break compatibility matching. These should reference a union type or enum derived from the operation IDs.

---

### Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| Type safety | Moderate | Interfaces exist but cross-file references use raw strings |
| Data coverage | ~40% | Only milling/turning/drilling have real tool data |
| Cross-file consistency | Poor | Controller IDs don't match machine records; dual coating registries |
| Production readiness | Demo-quality | 30 materials, 13 tools, 9 machines is a starting point, not a production dataset |
| Unit handling | Weak | No units in types; implicit mm everywhere |
| Validation coverage | Low | Only tools.ts and machines.ts have validation functions |

---

### Action Items (Priority Order)

1. **[CRITICAL]** Fix hardness unit ambiguity -- add explicit `hardnessUnit: "HB" | "HRC" | "HV"` field or normalize all to one scale
2. **[CRITICAL]** Add `density_kg_m3` and `specific_cutting_force_kc11` to `MaterialEntry` for local power/weight calculations
3. **[CRITICAL]** Fix D2/H13 material classification or add heat-treat condition model
4. **[MAJOR]** Create foreign-key relationship between machines and controllers (add `controllerId` to MachineEntry, validate against CONTROLLERS)
5. **[MAJOR]** Add taper field to MachineEntry, validate against selected tool holder taper
6. **[MAJOR]** Add tool entries for grinding, boring, honing, and broaching operations, or disable the tool selector for those modes
7. **[MAJOR]** Fix requiredAxes logic to consider operation type and toolpath strategy
8. **[MAJOR]** Replace generic tableSize with discriminated union for machine-type-specific specs
9. **[MEDIUM]** Merge the two coating registries into one source of truth
10. **[MEDIUM]** Refactor CamSoftwareEntry to embed feedMultiplier inside level objects
11. **[MEDIUM]** Add string literal union types for operation IDs to prevent typos in cross-references
12. **[MEDIUM]** Implement minCamLevel filtering or remove the dead field
13. **[MEDIUM]** Wire fixture maxForceN into cutting force validation or remove it
14. **[SUGGESTION]** Migrate shop-specific data (materials, tools, machines) to MCP server endpoints
15. **[SUGGESTION]** Document provenance of all magic-number defaults in operation definitions
