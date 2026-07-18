---
name: reference_prismselfawareness_test_fossil_2026_06_23
description: "mcp-server/src/__tests__/engines/PRISMSelfAwarenessEngine.test.ts is a 134/134-FAILING stale fossil testing a DEAD sync-engine API (sync getManifest, hardcoded counts like jmDiePrograms===24545, a STRING getFullDriveAwareness returning markdown). The current engine is async/object. Separate large realign-or-delete unit. Surfaced 2026-06-23 (slot:india) by the 3-of-3 code-analyzer while shipping U-SELFAWARE-DRIVE-AWARENESS. NOT caused by that commit (it never touched this file)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.122Z
aliases: reference_prismselfawareness_test_fossil_2026_06_23
---


# PRISMSelfAwarenessEngine.test.ts is a stale fossil (dead engine API)

## UPDATE 2026-06-23 (slot:india) -- root-caused + partially revived (commit ad65e6c5f7)
The 134/134 crash had a SINGLE gating cause: `class PRISMSelfAwarenessEngine` was NOT exported
(singleton-only), so the test's `new PRISMSelfAwarenessEngine()` in `beforeEach` threw
`TypeError: PRISMSelfAwarenessEngine is not a constructor` for ALL 134, masking their real state.
**Fixed** by exporting the class (U-SELFAWARE-EXPORT-CLASS, engine-convention fix, additive, tsc-clean).
Now: **20 passed / 114 failed**. The remaining 114 are the REAL realign work (a dedicated session):

### Realign plan -- the 114 by fix-class (from `npx vitest run engines/PRISMSelfAwarenessEngine`):
1. **~10 REMOVED/RENAMED methods** (`engine.X is not a function`) -- per method decide renamed (update test) vs
   removed/superseded (delete test) vs regressed (re-add to engine): `analyzeGap`(7), `trackUsage`(5),
   `quickProactiveCheck`(4), `generateWebSearch`(3), `findRelevantSources`(3), `findDriveLocation`(3), + more.
   This needs engine-history knowledge -- DO NOT guess; `git log -S "<method>"` each.
2. **async getManifest** (~13 `actual value must be number or bigint, received undefined`): tests call
   `engine.getManifest()` SYNC but it returns `Promise` now -> `await` + make the `it` async.
3. **hardcoded counts** (drift): `dispatchers===82`, `actions===4296`, `engines===1559`, `jmDiePrograms===24545`
   -> replace with `toBeGreaterThan(0)` / canonical-source reads (CLAUDE.md "do NOT hardcode counts").
4. **getFullDriveAwareness string contract** (2): test expects markdown string; engine now returns OBJECT
   (U-SELFAWARE-DRIVE-AWARENESS) -> align test to object shape.
5. **~10 `expected undefined to be defined`**: likely renamed return fields -- inspect per assertion.

Original verification below (pre-export-fix).

---

**Verified 2026-06-23 (slot:india).** `npx vitest run engines/PRISMSelfAwarenessEngine` = **134 failed / 134** (before the export-class fix; now 114).
The dedicated engine test for a CORE engine (15 importers) is ENTIRELY red and has been ignored.

## Why it's a fossil
The file tests an OLD synchronous engine API that no longer exists:
- `const manifest = engine.getManifest();` then `manifest.counts.jmDiePrograms` -- but `getManifest()` is now
  **async** (`Promise<CapabilityManifest>`), so `.counts` is `undefined` on a Promise.
- `expect(manifest.counts.jmDiePrograms).toBe(24545)` -- a **hardcoded count** (live count drifts; the real
  value comes from PRISM-INVENTORY-LATEST.md).
- `const awareness = engine.getFullDriveAwareness();` then `expect(awareness).toContain("# H: Drive Awareness")`
  / `"JM DIE"` / `"Tribal Knowledge"` / `"External Sources"` / `"getJMDieCustomerPath"` -- expects a SYNC method
  returning a **markdown STRING report**. (Root-cause not fully drilled: could be N independent stale assertions
  OR a shared sync/await setup mismatch -- TBD by the owning session.)

## getFullDriveAwareness contract decision (R7)
I shipped `getFullDriveAwareness()` (`U-SELFAWARE-DRIVE-AWARENESS`, commit `c6c3d77bf9`) as an **async method
returning a structured OBJECT** (`{prism: ManifestCounts, jmDie:{customerCount,machineTypes,customersByMachineType}, manifestVersion, lastUpdated}`),
consistent with the CURRENT engine (getManifest->object, getJMDieCustomers->array) and the maintained
`UnifiedSearchCoverage.test.ts` ("for drive stats"). The fossil's STRING-markdown contract is part of the dead
spec. The two test files therefore disagree on the return type -- the object contract wins (current-engine-consistent);
the fossil must be realigned (await + assert object) or deleted when the 134/134 file is reconciled.

## No regression from c6c3d77bf9
That commit touched ONLY `PRISMSelfAwarenessEngine.ts` (added the method) + `UnifiedSearchCoverage.test.ts`. It
did NOT touch this fossil file. Adding a method cannot break a previously-passing test; the fossil's 2
getFullDriveAwareness tests merely changed failure-mode (was "not a function", now "Promise != string"), same red
count; the other 132 are pre-existing dead-API failures. Net: U-SELFAWARE-DRIVE-AWARENESS fixed 1 real red
(UnifiedSearchCoverage 24/25 -> 25/25) and regressed nothing.

## NEXT UNIT (separate, owner: india/tango -- discovery)
Reconcile `PRISMSelfAwarenessEngine.test.ts`: realign every test to the current async/object engine API (await
getManifest; counts from the live manifest not hardcoded 24545; getFullDriveAwareness -> object) OR delete the
file if it is a true superseded fossil with no salvageable intent. Verify root-cause first (single setup error vs
134 independent stale assertions). This is a CORE-engine coverage hole -- worth a dedicated session, NOT a
session-tail rush. Sibling: [[reference_fleet_test_sweep_triage_2026_06_21]] (which claimed this file was
"31/31 GREEN" on 2026-06-21 -- STALE/incorrect as of 2026-06-23; re-verify before trusting).

## RESOLVED 2026-06-23 (slot:india) -- commit 2864dddba6 (U-SELFAWARE-FOSSIL-RECONCILE)
The fossil is DELETED, not realigned. Decision (R7): realigning 114 assertions to a dead API would
fabricate tests for ~21 methods that DO NOT EXIST on the current engine. Instead:
- Verified (R12) the ~21 dead methods (analyzeGap singular, quickProactiveCheck, generateWebSearch,
  getDriveLocations, findDriveLocation, getJMDieMachineFolders, getResourceFiles, trackUsage,
  getUsageStats, clearCaches, getCacheStats, getTrustedSources, isSourceTrusted, getTribalKnowledgeSummary,
  getWebSearchSummary, etc.) have ZERO callers on prismSelfAwarenessEngine across mcp-server/src.
- Found the 4 REAL sync methods the fossil also touched (proactiveReason/whatCanIDo/howDoI/whoHandles)
  DO have live consumers (DeepAIIntelligenceEngine, LatheSelfAwarenessIntegrationEngine,
  MachiningIntelligenceOrchestratorEngine, AutonomousSessionIntegrationEngine) but had NO maintained coverage.
- Ported 19 real-value branch-exact tests into the MAINTAINED file (src/__tests__/PRISMSelfAwarenessEngine.test.ts,
  31 -> 50 tests, 50/50 green), then deleted the fossil at src/__tests__/engines/PRISMSelfAwarenessEngine.test.ts.
DO NOT re-open this as a "realign 114 tests" unit -- the fossil is gone. The maintained file is the single
source of truth. Remaining pre-existing coverage gap (separate follow-up): getFullDriveAwareness (0 consumers),
getJMDieProgramPaths/searchJMDieCustomer (corpus-coupled). See [[reference_selfaware_fossil_reconcile_2026_06_23]].
