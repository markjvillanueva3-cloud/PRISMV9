# WEDM-P2P-PRODUCTION-MS0 Execution Plan

## Context
Execute Phase 1 (Safety-Critical Foundation) of the WEDM Print-to-Program Production Readiness milestone. User approved with "do it".

## Phase 1 Units (6 total)
1. U-PROD-01: WEDMCurrentDensityGuardEngine
2. U-PROD-02: WEDMPulseLimitEngine
3. U-PROD-03: WEDMPowerDensityGuardEngine
4. U-PROD-04: WEDMKerfWidthEngine
5. U-PROD-05: WEDMWireDeflectionEngine
6. U-PROD-06: WEDMThinWireDerateEngine

## Existing Infrastructure
- `wire-spec-sheets.ts` has max_current_density_A_mm2 per wire type
- `WireEDMSettingsEngine.ts` line 528 has partial current density check
- `EDM_PHYSICS.wire_safety` constants in physics/constants.ts

## Execution Approach
For each unit:
1. Check /dedup for existing coverage
2. Create engine with physics formula
3. Create test file with 10+ tests
4. Export from index.ts
5. Run vitest to verify
6. Build to confirm

## Verification
- Build passes after each unit
- Tests pass (10+ per engine)
- Safety guards integrated with WEDMSafetyEnvelopeEngine
