---
name: reference_dev_schema_coverage_wire_2026_06_22
description: "Runtime dispatcher schema-coverage is now queryable on the MCP surface — prism_dev:dispatcher_schema_coverage_stats (read) + dispatcher_schema_coverage_reset; closes the U-DISPATCHER-SCHEMA-FAILLOUD orphan (getSchemaCoverageStats had no consumer)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.552Z
aliases: reference_dev_schema_coverage_wire_2026_06_22
---


# prism_dev schema-coverage wire (U-DEV-SCHEMA-COVERAGE-WIRE, 2026-06-22, slot:bravo)

Commit `51e97f74ff`. Closes the R15 orphan left by U-DISPATCHER-SCHEMA-FAILLOUD: `getSchemaCoverageStats`/`resetSchemaCoverageStats` (exported from `mcp-server/src/utils/dispatcherMiddleware.ts`) had NO MCP consumer (referenced only by their own unit test).

## What's now queryable
- **`prism_dev:dispatcher_schema_coverage_stats`** → `{validated, passthrough, missingActions}` — the LIVE per-process counts of validated vs unvalidated-passthrough dispatcher calls + the distinct no-schema actions seen. Because `validateActionParams` is a module singleton shared by ~96 dispatchers, this one prism_dev action reports FLEET-WIDE runtime schema coverage.
- **`prism_dev:dispatcher_schema_coverage_reset`** → zero the counters, returns the post-reset snapshot.

## DISTINCT from `schema_coverage_audit_*`
Those (SchemaCoverageAuditEngine) statically scan schema FILES. These report LIVE runtime traffic. Different source, different semantics — no duplication.

## Contract gotcha (slimResponse)
The dispatcher tail wraps results in `slimResponse` (`responseSlimmer.ts:42-44`) which strips `null`/`undefined` + EMPTY arrays but keeps numeric zeros. So a fresh `stats` call returns `{validated:N, passthrough:M}` and `missingActions` only appears when non-empty. Absent missingActions == none seen this window.

## Verified
tsc 0-err; 13/13 tests (7 round-trip wire `devDispatcher.schema-coverage-wire.test.ts` + 6 unit); 3-of-3 scrutiny PASS (arm C noted a P2: reset mutates the process-wide advisory counter — acceptable, no correctness consumer; optional `{confirm:true}` hardening if ever desired).

Related: [[reference_dispatcher_capability_assessment_2026_06_22]] · [[reference_dispatcher_engine_method_audit_2026_06_22]]
