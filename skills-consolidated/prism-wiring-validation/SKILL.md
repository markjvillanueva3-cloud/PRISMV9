---
name: prism-wiring-validation
description: Pre-migration and consumer registration checklists — 7-phase database validation, 6-phase consumer validation, and troubleshooting for common wiring failures
---
# Wiring Validation

## When To Use
- Before migrating any database to a new version (pre-migration checklist)
- Before registering any new consumer (consumer registration checklist)
- When build fails with utilization error or SYS-CMD1-WIRING hook blocks
- "Why is my database showing low utilization?" / "Consumer can't find data"
- After completing wiring procedure steps (prism-wiring-procedure) to verify correctness
- NOT for: the initial wiring steps (use prism-wiring-procedure for how to wire)

## How To Use
**PRE-MIGRATION CHECKLIST** (7 phases, complete before migrating ANY database):

Phase 1 — Consumer Identification:
  List ALL modules that use this database. Document which fields each needs.
  Verify actual consumer count meets minimum (Materials: 15, Machines: 12, Tools: 10).

Phase 2 — Field Coverage:
  Document ALL fields. Map each field to its consumers. Flag fields with 0 consumers.
  Decision: unused field → either REMOVE it or ADD a consumer. No orphan fields.

Phase 3 — Route Verification:
  List all Gateway routes for this database. Test each route responds correctly.
  Verify route handlers match current field names (schema changes break routes).

Phase 4 — Dependency Check:
  Identify databases that depend on THIS database. Verify cascading updates work.
  Check: if material changes, do all downstream calculators get notified?

Phase 5 — Fallback Verification:
  Test each consumer's behavior when this database is unavailable.
  Every consumer must degrade gracefully (fallback data or clear error), never crash.

Phase 6 — Size/Schema Comparison:
  Compare old vs new: record count (must be >=), field count (must be >=), schema structure.
  Run anti-regression check on the database file itself.

Phase 7 — Integration Testing:
  Test each consumer's access pattern end-to-end. Verify routes return expected data.
  Test with missing/invalid IDs. Verify fallback behavior works under load.

**CONSUMER REGISTRATION CHECKLIST** (6 phases):

Phase 1 — Data Source Declaration:
  List ALL databases this consumer needs. Document specific fields from each.
  Classify: required vs optional sources. Define fallback for each required source.

Phase 2 — Connection Setup:
  Implement init(). Connect to all required databases via Gateway.
  Register as consumer with each database. Handle connection failures gracefully.

Phase 3 — Calculation Verification:
  Verify consumer uses ALL declared data sources (no dead connections).
  Verify output includes _sources tracking showing which data was actually used.

Phase 4 — Error Handling:
  Test with each data source unavailable individually. Verify graceful degradation.
  Test with invalid input data. Verify clear error messages, not crashes.

Phase 5 — Output Verification:
  Verify output includes: primary values, confidence, uncertainty, _sources, _timestamp.
  Verify output types match route declarations.

Phase 6 — Registration Confirmation:
  Verify consumer appears in each source database's _consumers list.
  Run PRISM_UTILIZATION_VERIFIER.verifyDatabase() on each source — utilization should increase.

**TROUBLESHOOTING:**
  LOW_UTILIZATION: Build fails with < 100%. Fix: find unused fields, add consumers or remove fields.
  CONSUMER_NOT_FOUND: Consumer registered but database doesn't list it. Fix: re-run registerConsumer.
  ROUTE_MISMATCH: Route returns wrong data after schema change. Fix: update route handler field names.
  CASCADE_FAILURE: Upstream database change breaks downstream consumers. Fix: version data contracts.

## What It Returns
- Pre-migration: confidence that database migration won't break existing consumers
- Consumer registration: confirmation that consumer is properly wired to all sources
- Troubleshooting: specific fix for the wiring failure you're experiencing
- If any phase fails: exactly which step failed and what to do about it

## Examples
- Input: "Migrating PRISM_MATERIALS_MASTER from v8 to v9, added 12 new fields"
  Run pre-migration checklist. Phase 2 critical: 12 new fields need consumers.
  If any new field has 0 consumers → either remove it or wire a calculator to use it.
  Phase 6: v9 record count (3518) must equal or exceed v8 count (3518). Schema must be superset.

- Input: "Build fails: PRISM_UTILIZATION_VERIFIER reports 94% on tools database"
  Troubleshoot: LOW_UTILIZATION. Find which fields have 0 consumers.
  Run field-to-consumer mapping. Likely cause: recently added fields without wiring consumers.
  Fix: wire existing calculators to use new fields, or remove fields if truly unnecessary.

- Edge case: "Consumer works in test but fails in production — fallback activates constantly"
  Phase 5 of consumer checklist: test with each source unavailable individually.
  If fallback fires constantly: Gateway route may be misconfigured or database not loading.
  Check: PRISM_GATEWAY.getRoute('materials/get') returns valid handler. Check database init() runs.
SOURCE: Split from prism-wiring-templates (15.2KB)
RELATED: prism-wiring-procedure
