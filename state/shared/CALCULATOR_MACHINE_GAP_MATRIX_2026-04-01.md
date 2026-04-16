# Calculator Machine Gap Matrix - 2026-04-01

## Critical

### G1. Program Release machine drift

- Surface: `H:/PRISM/mcp-server/src/engines/ProgramReleaseCatalogEngine.ts`
- Problem: Program Release still uses a tiny static machine catalog instead of the `920`-machine canonical corpus.
- Impact: machine selection in Print to CNC cannot yet trust the same options as the calculator.

### G2. Type taxonomy fragmentation

- Surface: enriched machine corpus
- Problem: the raw source taxonomy contains overlapping labels like `vertical_machining_center`, `3AXIS_VMC`, `VMC`, `turning_center`, `lathe`, and `mill_turn_center`.
- Impact: naive UI grouping or filtering will miscategorize machines.

## High

### G3. Legacy MachineProfileEngine contract drift

- Surface: `H:/PRISM/mcp-server/src/engines/MachineProfileEngine.ts`
- Problem: user-owned machine profiles exist, but in a legacy validation contract rather than the richer calculator machine-package model.
- Impact: saved shop machines cannot yet flow cleanly into calculator + Print to CNC reuse.

### G4. Manufacturer alias drift

- Surface: enriched corpus and normalization
- Problem: manufacturer naming still risks hidden splits like `Doosan` vs `DN Solutions`.
- Impact: users can miss machines in filtered brand views and downstream analytics can fragment by alias.

### G5. Provenance not yet propagated downstream

- Surface: downstream consumers beyond calculator
- Problem: the calculator now carries package provenance, but Program Release and other consumers do not yet use it.
- Impact: downstream desks still cannot distinguish published vs inferred machine options.

## Medium

### G6. Fallback catalog lacks full package metadata

- Surface: `H:/PRISM/mcp-server/web/src/data/calculatorWorkspace.ts`
- Problem: fallback machine records are still thinner than the live normalized package contract.
- Impact: offline/degraded mode remains less trustworthy than live mode.

### G7. Browser-level machine-selection QA still incomplete

- Surface: calculator UI verification
- Problem: one machine-selection-focused Vitest file previously hung in this shell, and browser interaction proof is not yet exhaustive across all brands.
- Impact: there is still execution risk in the long tail of brand/configuration combinations.

## Priority Execution Order

1. `G2` taxonomy fragmentation
2. `G3` user-owned machine profile convergence
3. `G1` Program Release / Print to CNC machine-source migration
4. `G4` manufacturer alias cleanup
5. `G6` fallback package convergence
