---
name: reference_workholding_db_safety_factor_drift_2026_06_03
description: WorkholdingDB.json (safety-critical discovery mirror) had drifted from WorkholdingEngine — missing 2 of 7 SAFETY_FACTORS; fixed by single-source generator
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.267Z
aliases: reference_workholding_db_safety_factor_drift_2026_06_03
---


**U-WORKHOLDING-MIRROR-GEN** (slot:juliett, DB-COVERAGE-GAPFILL-MS0, 2026-06-03) — the orphan-shadow drift risk MATERIALIZED on safety-critical data.

`data/databases/WorkholdingDB.json` is a discovery mirror loaded by `DatabaseRegistry` for `prism_data:database_search`. It declares `"source_file": "mcp-server/src/engines/WorkholdingEngine.ts"` but was a hand-maintained snapshot that had **drifted** from the engine (the live clamping-force safety path):

- **`safety_factors`: mirror carried 5 of the engine's 7** — missing `DRILLING: 2.5` and `TAPPING: 3.0` (`WorkholdingEngine.ts:401` `SAFETY_FACTORS`). A `database_search` for tapping/drilling clamping safety factor returned nothing while the engine correctly used them. SAFETY CRITICAL under-report.
- **`vacuum_seal_efficiency` + `magnetic_permeability`: 0 of 2** engine tables mirrored at all (coverage gap).
- friction_coefficients (14×6) + dynamic_force_factors (9) already matched.

**Fix:** exported the 5 authoritative consts from `WorkholdingEngine.ts` (`FRICTION_COEFFICIENTS`, `DYNAMIC_FACTORS`, `SAFETY_FACTORS`, `VACUUM_SEAL_EFFICIENCY`, `MAGNETIC_PERMEABILITY` — additive, zero behavior change) + new generator `mcp-server/scripts/generate-workholding-db.ts` (engine→JSON, atomic, idempotent, derives device_types/surface_conditions from the friction table, preserves the JSON-only blocks magnetic_chuck_data/vacuum_fixture_data, **fails loud** if those are absent) + drift-guard test `workholding-db-mirror.test.ts` (9 tests). Engine is now the single source of truth; the mirror is byte-locked to it (114 engine rows). Commit on `cad-fusion-live-ms0`.

**Why:** this is the 2nd application of the ToleranceDB single-source template (sister: `generate-tolerance-db-iso2768.ts`) — the proven fix for the orphan-shadow pattern. Direction is always **mirror ← engine** (engine = the live-calc authority), never the reverse. **How to apply:** any file-backed DB JSON that declares/implies a `source_file` engine is an orphan-shadow candidate — build a generator + drift-guard, never hand-edit the mirror. See [[reference_juliett_db_coverage_consolidation_insight_2026_06_03]] (keystone: epic = CONSOLIDATION, verify before acting) + [[reference_genomedb_kc_false_alarm_2026_06_03]].
