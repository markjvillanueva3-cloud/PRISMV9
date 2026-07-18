---
name: reference_erp_taylorc_nullaccess_2026_06_12
description: PRE-EXISTING null-access bug in ERPIntegrationEngine._computePhysicsStep (taylor_C on undefined resolveMaterial) — for hotel/ERP owner
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.568Z
aliases: reference_erp_taylorc_nullaccess_2026_06_12
---


# Pre-existing bug: ERPIntegrationEngine taylor_C null-access (discovered 2026-06-12 slot:charlie)

**NOT a charlie regression** — found while running a regression sweep for U-QP-RATE-WIRE; proven pre-existing by stashing the rate-wire edits and re-running (`physics-fed-costing.test.ts` 4/11 still fail at clean HEAD `35d074884d`).

## The bug
`mcp-server/src/engines/ERPIntegrationEngine.ts:111-112` (the `catch` fallback in `_computePhysicsStep`):
```ts
const mat = resolveMaterial(material);            // can return undefined
const vc = isFinish ? mat.taylor_C * 0.3 : mat.taylor_C * 0.5;  // CRASHES when mat is undefined
```
`resolveMaterial(material)` (from `src/physics/constants.ts`) returns `undefined` for the materials the 4 failing tests pass, so `mat.taylor_C` throws `TypeError: Cannot read properties of undefined`.

## Failing tests (all in `src/__tests__/physics-fed-costing.test.ts` > "U-PHYSCOST1: ERPIntegrationEngine physics-backed routing")
- importWorkOrder produces physics-backed Vc (not hardcoded 400/200)
- importWorkOrder uses physics cycle time (not Math.random)
- recordCostFeedback returns deterministic actuals (no Math.random)
- volume_to_remove_cm3 controls MRR-based cycle time

## Fix (for hotel / ERP owner — physics-constant aware)
Guard `mat` before use. The correct fallback is a canonical default Taylor C constant (NEVER inline a number — pull from `physics/constants.ts`), OR make `resolveMaterial` return a documented default material instead of undefined. Either way the no-inline-constants rule applies. Verify which materials the tests pass and whether `resolveMaterial` SHOULD resolve them (the material-key alias map may be missing an entry).

## Why charlie deferred
ERPIntegrationEngine is hotel/ERP domain (charlie soul: defer-work-order-to-hotel); the fix needs a canonical physics-constant default, not a charlie-domain change. Recorded per autonomous-loop drift discipline (cap anomaly at <=1 tick, record, return to loop). Related: [[reference_hotel_business_engine_buckets_2026_05_28]].
