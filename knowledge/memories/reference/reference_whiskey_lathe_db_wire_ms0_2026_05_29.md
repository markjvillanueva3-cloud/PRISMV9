---
name: reference-whiskey-lathe-db-wire-ms0-2026-05-29
description: slot:whiskey wired 5 dormant/partial lathe DBs onto the prism_turning surface (LATHE-DB-WIRE-MS0). Captures the slot-divergence recon trap + the validate-is-drilling-not-turning R12 catch.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-27T20:30:47.259Z
aliases: reference_whiskey_lathe_db_wire_ms0_2026_05_29
---


Operator directive ("wire in all databases for [lathe]: machines, materials, controllers, tooling, tool holders, fixturing, tool paths, sfc, post processors, alarms"). A 5-auditor Workflow produced `state/shared/specs/LATHE-DB-WIRING-MATRIX.md`: of 10 categories, **9 already WIRED** (materials/sfc/vendor-inserts/fixturing-physics/strategy/feature-recog/wear/osp-dialect-KB/generic-controller/posts — mostly on `prism_data`/`prism_cam`), leaving 5 PARTIAL + 4 GAP.

**Shipped (5 `prism_turning` actions, 3 commits, 13/13 tests, per-file 2-reviewer PASS/PASS):**
- `lathe_insert_grade_lookup` (GAP 5b) → `lathe-tooling-catalog` getGradesByMaterial/Finishing/Roughing (27 grades, was 0 consumers)
- `lathe_toolholder_lookup` (GAP 6) → SANDVIK/KMT/ISCAR OD+Capto holders + getCaptoHoldersBySize
- `lathe_boring_bar_select` (GAP 6) → Capto+shank boring bars
- `lathe_canned_cycle_validate` (GAP 8d) → `ppCannedCycleValidatorEngine.validate`
- `okuma_osp_parse` (PARTIAL 9b) → `okumaOSPParserEngine.parse` (was only an internal fingerprint sub-call)

3 wiring surfaces per action: `turningDispatcher.ts` ACTIONS list + grouped `case` handler (lazy `await import`, `params as any`→`p`, `result={success,data}`) + `turningActionSchemas.ts` const + `TURNING_ACTION_SCHEMAS` map entry. Test file `turningDispatcherLatheDbWire.test.ts`.

**LESSON 1 — slot-divergence recon trap (HIGH, cross-cutting).** Did all recon (file existence, exports, method signatures) on the SHARED tree `H:/prism`, but edits land in the SLOT worktree `H:/prism-slot-whiskey` which was **1543 commits behind** the integration branch. `MonolithWorkholdingDatabaseEngine.ts` exists on shared but is ABSENT in the slot → the wired `lathe_workholding_catalog_lookup` action's `await import` would have thrown at runtime. Caught only when the vitest import failed. **Rule: any slot doing dispatcher/engine wiring MUST verify every file + export + signature against the SLOT version, not the shared tree.** Dropped/deferred the workholding action (GAP 7b) until the slot syncs. See [[feedback_checkin_args_are_primary_work_order]].

**LESSON 2 — R12 mis-scope catch.** The matrix assumed `PPCannedCycleValidatorEngine` validates G70–G76 TURNING canned cycles. Reading the engine showed it validates G80–G89 DRILLING cycles (peck/rigid-tap). On-axis drilling/tapping IS lathe-domain (galaxy scope §1), so the wiring is valid — but the test had to assert real drilling defects (`tap_without_rigid_mode`), not G71. Also: holders use field `designation`, not the matrix's assumed `shankCode`.

**Env note:** slot worktree `node_modules` was empty (no esbuild/vitest/zod) → junctioned `mcp-server/node_modules` to `H:/prism/mcp-server/node_modules` to run vitest (gitignored, local-only, reversible).

**Deferred (matrix work-list):** `lathe_machine_lookup` (ShopMachine has NO `controller` field; reachable via `prism_business`), `lathe_alarm_lookup` (needs a verified real Okuma code; reachable via `prism_data:alarm_decode`), `lathe_canned_cycle_dialect` (needs a dialect-table getter), kinematics re-key (edits the engine DB), workholding (engine absent from slot). Matrix: `state/shared/specs/LATHE-DB-WIRING-MATRIX.md`.
