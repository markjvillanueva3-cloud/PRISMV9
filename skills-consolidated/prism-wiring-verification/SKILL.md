---
name: prism-wiring-verification
description: Build-time utilization verifier and validation checklists — run after wiring to confirm databases meet minimum consumer counts and all fields have documented consumers
---
# Wiring Verification

## When To Use
- After completing a wiring procedure (prism-wiring-procedure) to confirm it's correct
- At build time to catch under-wired databases before they ship
- "Does this database have enough consumers?" / "Are all fields being used?"
- During code review when someone adds or modifies a database or consumer
- When build fails with utilization error — diagnose which database is under-wired
- NOT for: performing the initial wiring (use prism-wiring-procedure)

## How To Use
**RUN THE UTILIZATION VERIFIER:**
```typescript
// Single database check
const result = PRISM_UTILIZATION_VERIFIER.verifyDatabase('PRISM_MATERIALS_MASTER');
// result: { valid: true, consumers: 17, minimum: 15, fieldCoverage: 100% }

// Full system check (runs at build time automatically)
PRISM_UTILIZATION_VERIFIER.verifyAll();

// Enforce at build — fails build if any database under-wired
PRISM_UTILIZATION_VERIFIER.enforceAtBuild();
```

**MINIMUM CONSUMER THRESHOLDS** (non-negotiable):
  PRISM_MATERIALS_MASTER: 15 | PRISM_MACHINES_DATABASE: 12 | PRISM_TOOLS_DATABASE: 10
  PRISM_WORKHOLDING_DATABASE: 8 | PRISM_POST_PROCESSOR_DATABASE: 8
  Other major databases: 6-8 | Lookup tables: 4 | Physics engines: 6 | AI/ML engines: 4

**DATABASE VALIDATION CHECKLIST** (run before migrating any database):
  Phase 1 — Consumer ID: List ALL modules using this database. Count meets minimum?
  Phase 2 — Field Coverage: Map every field to its consumers. Any field with 0 consumers = remove or add consumer.
  Phase 3 — Route Verification: All Gateway routes registered and returning data?
  Phase 4 — Layer Integrity: CORE/ENHANCED/USER/LEARNED layers populated correctly?
  Phase 5 — Cross-references: Foreign keys and IDs resolve to valid records in other databases?
  Phase 6 — Fallback Testing: Each consumer handles missing data gracefully (returns fallback, not crash)?
  Phase 7 — Integration Test: Each consumer's access pattern tested with real data?

**CONSUMER VALIDATION CHECKLIST** (run before registering any consumer):
  Phase 1 — Source Declaration: All data sources listed in _meta.dataSources?
  Phase 2 — Connection Setup: init() connects to all sources via Gateway (not direct access)?
  Phase 3 — Source Tracking: Every output includes _sources object?
  Phase 4 — Error Handling: Missing data returns fallback, not exception?
  Phase 5 — Registration: Consumer registered with each source database's _consumers list?
  Phase 6 — Test: Valid inputs produce expected outputs? Missing data triggers fallback?

**TROUBLESHOOTING COMMON FAILURES:**
  LOW_UTILIZATION: Build says "X/Y consumers" — find which consumers SHOULD use this data but don't.
    Fix: identify calculation engines that COULD benefit from this data, wire them.
  ORPHAN_FIELD: Field has 0 consumers — it's dead data.
    Fix: remove the field OR add a consumer that uses it. Never ship unused fields.
  MISSING_ROUTE: Consumer calls Gateway route that doesn't exist.
    Fix: register the route in the database module's _routes definition.
  DIRECT_ACCESS: Consumer bypasses Gateway and reads database directly.
    Fix: refactor to use PRISM_GATEWAY.get() or .query(). Direct access is prohibited.

## What It Returns
- verifyDatabase: { valid: bool, consumers: N, minimum: M, fieldCoverage: pct, unusedFields: [] }
- verifyAll: aggregate report across all databases with pass/fail per database
- enforceAtBuild: build passes if all databases meet minimums, fails with specific violations if not
- Checklists: concrete pass/fail for each phase, identifying exact items to fix

## Examples
- Input: "Build failed: PRISM_WORKHOLDING_DATABASE has 5/8 consumers"
  Diagnosis: 3 consumers short. Check which engines should use workholding data.
  Candidates: SafetyValidator (needs clamp force), CycleTimeCalc (needs setup time), CostEstimator (needs fixture cost)
  Fix: wire those 3 consumers, re-run verifier. 8/8 = PASS.

- Input: "Field 'thermal_conductivity' in materials database has 0 consumers"
  Diagnosis: ORPHAN_FIELD. Data exists but nothing uses it.
  Decision: ThermalCalculator should consume this → wire it. Or if no calculator exists yet, plan it for R2.
  Interim: document the gap in ROADMAP_TRACKER as "pending consumer for thermal_conductivity."

- Edge case: "All consumer counts pass but integration test fails"
  Diagnosis: consumer is registered but its calculate() doesn't actually call the database.
  This is a PHANTOM CONSUMER — counts in the list but doesn't use the data.
  Fix: verify each consumer's calculate() method calls Gateway for the registered sources.
SOURCE: Split from prism-wiring-templates (15.2KB)
RELATED: prism-wiring-procedure
