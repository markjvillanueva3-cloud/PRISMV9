# Calculator Machine Source + Consumer Inventory - 2026-04-01

## Purpose

Inventory the machine-data sources and machine-consuming surfaces that must converge if the calculator is going to become the canonical machine-selection module for PRISM.

## Source Layers

### S1. Machine Registry layered corpus

Primary live source for the calculator path.

- Registry implementation: `H:/PRISM/mcp-server/src/registries/MachineRegistry.ts`
- Live route: `H:/PRISM/mcp-server/src/routes/data.ts`
- Current live corpus baseline: `920` enriched machine entries

Current physical sources under this layer:

- `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json`
- `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES.json`
- `H:/PRISM/data/machines/ENHANCED/json/*.json` brand packs
- `H:/PRISM/extracted/machines/ENHANCED/*.json`
- `H:/PRISM/extracted/machines/ENHANCED/*.js`
- `H:/PRISM/extracted/machines/ENHANCED/BY_COUNTRY/*`

Operational note:

- this is the richest machine source in the system today
- duplicate IDs and fragmented type labels are the main convergence hazards

### S2. Legacy machine-profile catalogs

Legacy structured machine profiles still used by validation-oriented engine surfaces.

- `H:/PRISM/mcp-server/src/data/machine-profiles-catalog.ts`
- `H:/PRISM/mcp-server/src/data/machine-profiles-catalog-ext.ts`
- `H:/PRISM/mcp-server/src/data/machine-profiles-catalog-ext2.ts`
- support data:
  - `machine-spindle-corrections.ts`
  - `machine-torque-curves.ts`
  - `machine-kinematics-*`

Operational note:

- useful as support data and shop-profile precedent
- not currently the richest source of per-machine configuration truth

### S3. MachineProfileEngine runtime store

Runtime machine validation and custom-machine entry surface.

- `H:/PRISM/mcp-server/src/engines/MachineProfileEngine.ts`

Composition:

- default hardcoded machines
- imported legacy catalog profiles
- imported `MachineRegistry` rows as a third data layer
- custom user-added machine profiles via `machine_profile_add`

Operational note:

- important because it already supports user-added machine profiles
- still shaped as a legacy profile contract, not the calculator’s richer machine-package model

### S4. Calculator fallback catalog

Static fallback machine selection when live backend data is unavailable.

- `H:/PRISM/mcp-server/web/src/data/calculatorWorkspace.ts`

Operational note:

- good as a continuity layer
- currently narrower than live registry truth
- should eventually inherit canonical package metadata too

### S5. Program Release static machine catalog

Current Program Release / Print to CNC machine source.

- `H:/PRISM/mcp-server/src/engines/ProgramReleaseCatalogEngine.ts`

Operational note:

- currently only a tiny static default machine list
- this is the highest-risk downstream drift from the calculator machine path

## Consumer Surfaces

### C1. Calculator machine-selection module

- fetch path: `H:/PRISM/mcp-server/web/src/api/calculatorData.ts`
- UI: `H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx`

Role:

- richest current frontend consumer
- already normalizes registry rows and merges duplicate machine records
- should become the canonical machine-package picker

### C2. MachineProfileEngine validation actions

- `machine_profile_get`
- `machine_profile_list`
- `machine_profile_validate`
- `machine_profile_add`

Role:

- machine-aware validation and custom shop-machine entry
- should eventually consume or emit the same canonical machine package / overlay model

### C3. Program Release / Print to CNC

- backend engine: `H:/PRISM/mcp-server/src/engines/ProgramReleaseCatalogEngine.ts`
- frontend consumers:
  - `H:/PRISM/mcp-server/web/src/pages/ProgramReleasePage.tsx`
  - `H:/PRISM/mcp-server/web/src/pages/QuoteBuilderPage.tsx`

Role:

- downstream machine-aware workspace
- currently uses a disconnected machine list and thinner machine contract

### C4. Data-route and lookup consumers

- `POST /api/v1/data/machine/search`
- discord bot lookup surface in `H:/PRISM/mcp-server/src/bot/discord-bot.ts`
- MCP resource notes in `H:/PRISM/mcp-server/src/mcp/resources.ts`

Role:

- non-calculator read surfaces that should stay aligned with the same machine identity truth

## Drift Summary

Current hierarchy in practice:

1. calculator live normalization on top of registry
2. machine-profile engine legacy store
3. Program Release static defaults
4. calculator fallback catalog

This is upside down for long-term convergence. The target hierarchy should be:

1. merged machine registry package
2. canonical normalized machine package
3. user-owned shop-machine overlay
4. fallback catalog

## Immediate Consequence

The next engineering slice should not be more UI flourish. It should be the package-level convergence work that lets the calculator, MachineProfileEngine, and Program Release speak the same machine language.
