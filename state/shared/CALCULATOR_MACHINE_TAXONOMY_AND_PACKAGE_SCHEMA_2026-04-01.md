# Calculator Machine Taxonomy + Package Schema - 2026-04-01

## Canonical Taxonomy

### Mill

- `mill_vertical_3`
- `mill_vertical_4`
- `mill_vertical_5`
- `mill_horizontal_3`
- `mill_horizontal_4`
- `mill_horizontal_5`
- `mill_gantry_3`
- `mill_gantry_4`
- `mill_gantry_5`

### Lathe

- `lathe_2axis`
- `lathe_y_axis`
- `lathe_subspindle`
- `lathe_multitask`
- `lathe_swiss`
- `lathe_vtl`

### Nontraditional

- `edm_sinker`
- `wire_edm_wire`
- `laser_fiber`
- `waterjet_abrasive`

## Canonical Machine Package Contract

### Identity

- `canonicalMachineId`
- `packageId`
- `manufacturer`
- `model`
- `mode`

### Taxonomy

- `taxonomy.mode`
- `taxonomy.familyId`
- `taxonomy.familyLabel`
- `taxonomy.machineTypeId`
- `taxonomy.machineTypeLabel`
- `taxonomy.axisClass`
- `taxonomy.orientation`

### Published package options

- `controllerOptions`
- `spindleOptions`
- `coolantOptionIds`
- `controllerCapabilityOptions`
- `configurationOptions`

### Provenance

- `packageProvenance.source`
- `packageProvenance.confidence`
- `packageProvenance.sourceRecordIds`
- `packageProvenance.notes`

### Reuse posture

This package model is intended to bridge:

- calculator machine selection
- shop-specific saved machine presets
- user-owned machine profile overlays
- Print to CNC / Program Release
- future machine-aware consumers

## Confidence Semantics

- `published`
  source row contains published controller and spindle detail
- `inferred`
  source row is incomplete and some package details were synthesized conservatively
- `merged`
  canonical package was formed by merging multiple complementary registry rows
- `fallback`
  package came from the static fallback catalog rather than live registry truth

## Current Implementation Status

This contract is now partially wired into the calculator normalization layer through:

- `H:/PRISM/mcp-server/web/src/data/calculatorWorkspace.ts`
- `H:/PRISM/mcp-server/web/src/utils/machinePackageContract.ts`
- `H:/PRISM/mcp-server/web/src/api/calculatorData.ts`

That means normalized calculator machines now carry taxonomy and package provenance metadata even before downstream consumers are fully migrated.
