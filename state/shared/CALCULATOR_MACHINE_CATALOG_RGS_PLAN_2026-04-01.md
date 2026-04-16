# Calculator Machine Catalog RGS Plan - 2026-04-01

## Purpose

Generate a focused `/rgs` roadmap slice that completes the machine-selection truth chain for the calculator without breaking the active `finish-current-delivery-first` collaboration gate.

This roadmap is specifically for:

- calculator machine selection correctness
- per-machine controller/spindle/coolant/capability filtering
- user-owned machine profiles and overrides
- downstream reuse by Print to CNC, Program Release, quoting, what-if, and other machine-aware surfaces

## Current Verified Position

- The active shared gate is still `finish-current-backend-and-frontend-work-first`.
- The enriched machine corpus currently contains `920` machine entries in `H:/PRISM/data/machines/ENHANCED/json/ALL_MACHINES_ENRICHED.json`.
- The raw machine type taxonomy is fragmented and cannot be trusted directly by the calculator. Examples include:
  - `vertical_machining_center`
  - `3AXIS_VMC`
  - `VMC`
  - `5axis_machining_center`
  - `5AXIS`
  - `turning_center`
  - `lathe`
  - `mill_turn_center`
- Largest current manufacturers in the enriched corpus include `Haas (132)`, `Mazak (107)`, `DMG MORI (94)`, `Okuma (60)`, `DN Solutions (56)`, `Brother (28)`, and `Citizen (13)`.
- The live calculator path is already converging on the correct surfaces:
  - backend registry: `H:/PRISM/mcp-server/src/registries/MachineRegistry.ts`
  - calculator normalization: `H:/PRISM/mcp-server/web/src/api/calculatorData.ts`
  - calculator UI: `H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx`
- Existing downstream machine-aware engines already exist and should be reused instead of bypassed:
  - `H:/PRISM/mcp-server/src/engines/MachineProfileEngine.ts`
  - `H:/PRISM/mcp-server/src/engines/ProgramReleaseCatalogEngine.ts`

## Working Rule

Do not fork a disconnected machine-intelligence program. Keep this roadmap tightly anchored to the calculator selection module and the shared machine profile contract that downstream desks can consume.

## Canonical Artifacts

- Formal milestone envelope: `H:/PRISM/mcp-server/data/milestones/MCAT-MS0.json`
- Position state: `H:/PRISM/mcp-server/data/state/MCAT-MS0/position.json`
- Formal roadmap markdown: `H:/PRISM/mcp-server/data/docs/roadmap/MCAT-MS0-machine-catalog-convergence.md`

## Milestone Summary

`MCAT-MS0` — `Machine Catalog Convergence for Calculator + Shop Profiles`

Phases:

- `P0`: truth hierarchy + taxonomy
- `P1`: registry convergence + configuration matrices
- `P2`: calculator machine-selection convergence
- `P3`: downstream machine-profile reuse
- `P4`: validation, audit, and operational hardening

## Expected Outcomes

When `MCAT-MS0` is complete:

- every calculator machine selection resolves to a canonical machine package
- controller, spindle, coolant, and control-package options are filtered by published availability
- unsupported options do not appear
- user machine selections can become durable shop-specific machine profiles
- Print to CNC and other downstream surfaces can consume the same machine package instead of a second disconnected model

## Immediate Resume Slice

Start with `MCAT-MS0 / P0-U01`:

- inventory every current machine source
- inventory every current machine consumer
- write the truth hierarchy before further UI expansion
