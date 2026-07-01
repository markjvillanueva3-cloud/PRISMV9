# PRISM SYSTEM CONTRACT — v13.9
# The complete set of invariants PRISM guarantees, their enforcement mechanisms,
# and what happens when each is violated.
# This document is the auditable truth source for PRISM's safety, correctness,
# and operational guarantees. Every invariant listed here MUST have:
#   (a) a measurable threshold, (b) an enforcement mechanism, (c) a violation response.
# If an invariant cannot satisfy all three, it is an ASPIRATION, not a CONTRACT.
#
# Created: v13.9 (2026-02-14) — sourced from cross-audit of external governance review
# against three internal infrastructure audits (IA1-IA3).
# Load: At phase gates ONLY (coherence check). Not every session.

---

## SAFETY INVARIANTS (Violations = Deployment Block)

These invariants protect human life. Violations are hard stops — no override without
documented human review and explicit risk acceptance.

```
INV-S1: SAFETY SCORE THRESHOLD
  Guarantee: S(x) >= 0.70 for ALL cutting parameter recommendations
  Enforcement: Structured output schema with exclusiveMinimum on safety_score field.
               Pre-output blocking hook rejects any response with S(x) < 0.70.
  Violation: BLOCK operation. Log safety_block record. Do NOT return parameters to operator.
  Recovery: Recalculate with different parameters or escalate to manufacturing engineer.
  Tested at: R2-MS0 (50-calc matrix), R2-MS1.5 (AI edge cases), R6-MS1 (under load)

INV-S2: NO UNDEFINED NUMERICAL OUTPUT
  Guarantee: No NaN, null, undefined, or Infinity in any numerical output to operators.
  Enforcement: Structured output schema with required fields + exclusiveMinimum:0 on
               physical quantities. Cross-field physics validation post-schema.
  Violation: BLOCK operation. Log data_integrity_error. Return error message, not numbers.
  Recovery: Trace to source — data issue (registry) or calc issue (formula). Fix and rerun.
  Tested at: R2-MS0 (all 50 calcs), R2-MS1 (manual edge: NaN input test)

INV-S3: STRUCTURED OUTPUT VALIDATION
  Guarantee: ALL safety-critical calculations return schema-validated structured output.
  Enforcement: Server-level JSON Schema enforcement (output_config.format = "json_schema").
               Schema includes: additionalProperties:false, physical upper bounds (Vc<=2000,
               Fc<=100000), type enforcement on all fields.
  Violation: API returns 400 if output doesn't match schema. Retry with same input.
             If 3 retries fail → BLOCK. Log schema_violation. Escalate per Stuck Protocol.
  Recovery: Inspect model output. Fix schema if too restrictive. Fix prompt if model confused.
  Tested at: P0-MS0b (schema wiring), R2-MS0 (all calcs), R6-MS4 (feature audit)

INV-S4: CROSS-FIELD PHYSICS VALIDATION
  Guarantee: Vc × fz × ap must be physically realizable for the given material + operation.
             Cutting force must be positive and below machine capacity.
             Tool life must be positive and below 1000 minutes.
  Enforcement: Post-schema imperative validation function (physics cannot be expressed in
               JSON Schema alone). Runs on every calc result after schema validation passes.
  Violation: BLOCK operation. Log physics_violation with specific field that failed.
  Recovery: Likely a formula bug or material data error. Debug per R2-MS2 fix cycle.
  Tested at: R2-MS0 (all 50 calcs), R2-MS1.5 (AI edge cases target physics boundaries)

INV-S5: SAFETY STABILITY UNDER LOAD
  Guarantee: |S(x)_loaded - S(x)_isolated| < 0.02 for all baseline materials.
  Enforcement: R6-MS1 stress test compares safety scores under concurrent load vs in isolation.
  Violation: STOP DEPLOYMENT. Investigate if adaptive thinking degrades under resource pressure.
             A system that approves unsafe cuts under load is worse than no system.
  Recovery: Adjust concurrency limits, increase resource allocation, or fix model routing.
  Tested at: R6-MS1 (1000+ concurrent request stress test)
```

---

## CORRECTNESS INVARIANTS (Violations = Bug, Not Safety Block)

These invariants ensure mathematical accuracy. Violations indicate bugs that need fixing
but do not directly endanger operators (safety invariants catch dangerous outputs separately).

```
INV-C1: CALCULATION ACCURACY
  Guarantee: All calculations within R2_TOLERANCES per category:
             speed_feed_vc: ±15%, speed_feed_fz: ±15%, cutting_force_fc: ±20%,
             tool_life: ±25%, thread_calcs: ±5%, alarm_decode: exact match (structured-field),
             edge_case: ±30%, multi_op: ±15%
  Enforcement: R2 test matrix compares calc results against reference values from
               src/data/referenceValues.ts (sourced from Machinery's Handbook + manufacturer data).
  Violation: Log tolerance_violation. Add to R2_CALC_RESULTS.md. Enter R2-MS2 fix cycle.
  Recovery: Hand-calculate expected value → compare → classify (formula bug vs data bug vs
            formula limitation). Fix and rerun. See PRISM_PROTOCOLS_CORE.md §R2 Fix Cycle.
  Tested at: R2-MS0 (50-calc matrix), R3 (batch campaigns), R6-MS0 (full regression)

INV-C2: REGISTRY COMPLETENESS
  Guarantee: All registries loaded ≥ 95% per type.
             Materials: ≥ 3,342 of 3,518+ | Machines: ≥ 782 of 824+
             Tools: ≥ 1,846 of 1,944+ | Alarms: ≥ 8,740 of 9,200+
  Enforcement: R1 loader reports load counts. REGISTRY_AUDIT.md documents gaps.
  Violation: Log registry_incomplete. Investigate loader errors for missing records.
  Recovery: Fix loader (type coercion, null-fill, encoding issues per R1-MS1 patterns).
  Tested at: R1-MS2 (all registries), R1-MS4 (coverage audit)

INV-C3: SYSTEM COHERENCE
  Guarantee: MASTER_INDEX.md S1 counts match live system at all times.
             Dispatcher count, action count, engine count must be exact.
  Enforcement: Phase gate smoke test reads MASTER_INDEX.md and compares to health endpoint.
  Violation: Log coherence_violation. Determine if code or documentation is wrong. Fix both.
  Recovery: Update whichever is incorrect. Rebuild. Re-verify.
  Tested at: P0-MS8 (integration gate), every phase boundary (Boot Step 2.5)

INV-C4: CALC RESULT REPRODUCIBILITY
  Guarantee: Same input → same output (within floating-point tolerance: |delta|/value < 1e-10).
             Parallel execution produces equivalent results to sequential.
  Enforcement: R6-MS5 runs all P0-MS8 chains both parallel and sequential, compares with
               tolerance-based comparison (physical quantities: 1e-10, safety scores: 0.001).
  Violation: Log reproducibility_violation. Debug execution ordering effects.
  Recovery: Identify non-deterministic path. Fix or document as known variance with bounds.
  Tested at: R6-MS5 (parallel equivalence validation)
```

---

## OPERATIONAL INVARIANTS (Violations = Degraded Service)

These invariants ensure system health. Violations trigger graceful degradation, not hard stops.

```
INV-O1: HEALTH ENDPOINT VALIDITY
  Guarantee: Health endpoint returns valid data within 5 seconds.
             Response matches HEALTH_SCHEMA: status, dispatchers (int ≥ 0),
             heap_used_mb (number ≥ 0), uptime_s (number ≥ 0).
  Enforcement: Boot Step 1.1 validates against HEALTH_SCHEMA every session.
  Violation: Health endpoint is BROKEN. Restart MCP server. If persists → debug.
  Recovery: Check for build errors. Rebuild. Restart. Re-verify.
  Tested at: Every session boot (Step 1.1)

INV-O2: COMPACTION RECOVERY
  Guarantee: State recovery succeeds within 3 calls after compaction event.
             Layer 1: CURRENT_POSITION.md + active phase doc section.
             Layer 2: ROADMAP_TRACKER.md + COMPACTION_SURVIVAL.json (deep recovery).
             Layer 3: Restart from last complete MS (always works).
  Enforcement: 3-layer recovery cascade in PRISM_PROTOCOLS_CORE.md §Compaction Recovery.
  Violation: Log compaction_recovery_failure at Layer 1/2 → escalate to next layer.
  Recovery: Automatic cascade. If Layer 3 required → note wasted work in ROADMAP_TRACKER.
  Tested at: P0-MS8 (recovery drill), continuous (compaction telemetry in ROADMAP_TRACKER)

INV-O3: BOOT PROTOCOL COMPLETION
  Guarantee: Full boot protocol completes within 60 seconds (wall-clock).
  Enforcement: Boot Steps -1 through 3.5, monitored by operator.
  Violation: Investigate slow step. Common causes: MCP server not running, network issues.
  Recovery: Restart MCP server. Verify connection. Re-run boot.
  Tested at: Every session (implicit — operator notices if boot takes too long)

INV-O4: GRACEFUL DEGRADATION
  Guarantee: System degrades gracefully through 5 tiers, never crashes silently.
             Tier 1: Full operation | Tier 2: Reduced data (registries partial)
             Tier 2.1: Suspect data quarantine | Tier 2.5: Partial dispatcher failure
             Tier 3: No API (offline cache) | Tier 4: MCP server down | Tier 5: DC down
  Enforcement: Degradation hierarchy in PRISM_PROTOCOLS_CORE.md §Graceful Degradation.
  Violation: System should never be in an unlabeled state. If behavior doesn't match any
             tier → debug. The tier system IS the diagnostic framework.
  Recovery: Diagnose which tier is active → fix the root cause → re-verify health.
  Tested at: R1 (fault injection: kill registry mid-load), R6-MS1 (stress test)

INV-O5: POSITION PERSISTENCE
  Guarantee: Current roadmap position survives session death, compaction, and MCP restart.
             At least one of: CURRENT_POSITION.md, ROADMAP_TRACKER.md, ACTION_TRACKER.md
             contains enough state to resume without repeating completed work.
  Enforcement: Multi-file state persistence. Atomic writes. Position validation at boot.
  Violation: All three files missing or stale → restart from last known phase gate.
  Recovery: Phase gates are natural recovery points. Maximum lost work: 1 MS.
  Tested at: Continuous (every session exercises position recovery)
```

---

## PERFORMANCE THRESHOLDS (Baseline Expectations)

```
OPERATION                    THRESHOLD        MEASURED AT
Health check                 < 500ms          Every session (Boot Step 1.1)
Material lookup              < 2s             R1-MS3 (pipeline tests)
Safety calculation           < 10s            R2-MS0 (at effort=max)
Batch of 10 calcs            < 60s            R3 (batch campaigns)
Full regression suite        < 30min          R6-MS0 (npm test)
Boot protocol                < 60s            Every session
Phase gate check             < 5min           Phase boundaries
```

---

## COMPLEXITY BUDGET

```
METRIC                       LIMIT            CURRENT         HEADROOM
Dispatchers                  35 max           31              4
Actions per dispatcher       20 max           ~18 max         2
Total actions                400 max          368             32
Schema depth                 5 levels max     3 current       2
Framework token load         25K max          ~15-19K         6-10K
System overhead              42K max          ~37K            5K

GROWTH RULE: If any metric reaches 90% of its limit, expanding the limit requires:
  1. Document WHY the increase is necessary (not just convenient)
  2. Measure the token/performance impact
  3. Update this budget table
```

---

## CHANGE CONTROL TIERS

```
TIER 1 — SAFETY-CRITICAL (requires code change + rationale + manual verification):
  Files: src/schemas/tolerances.ts, structured output schemas, S(x) threshold,
         physics validation functions, referenceValues.ts
  Process: Code change → rationale in commit message → manual verification against
           handbook values → build + test → deploy

TIER 2 — OPERATIONAL (requires code change + build pass + health check):
  Files: Dispatcher logic, registry loaders, boot protocol, engine implementations,
         PRISM_PROTOCOLS_CORE.md, phase docs
  Process: Code change → npm run build → health check → deploy

TIER 3 — DOCUMENTATION/COSMETIC (requires code change only):
  Files: Comments, README, non-operational docs, ROADMAP_TRACKER entries
  Process: Code change → commit
```

---

## HUMAN REVIEW PROTOCOL

```
PHASE GATE TYPES:
  AUTOMATED:              P0, R1 (deterministic pass/fail — machine can judge)
  HUMAN-REVIEW-RECOMMENDED: R2, R6 (safety calcs + production readiness need human eyes)
  AUTOMATED-WITH-OVERRIDE: R3, R4, R5 (automated unless human wants to inspect)

REVIEWER QUALIFICATION:
  R2 gate: Must understand CNC manufacturing parameters (not just software)
  R6 gate: Must understand both manufacturing AND production operations
  Override: Manufacturing engineer or project lead

REVIEW CHECKLIST:
  R2: Verify 5 random calcs against Machinery's Handbook values
      Verify all AI-generated edge cases have reasonable bounds
      Verify S(x) blocks are working (at least 1 VALID-DANGEROUS case)
  R6: Verify stress test results are realistic (not synthetic passes)
      Verify security audit findings are resolved (not just documented)
      Verify runbooks are executable (try one recovery procedure)

OVERRIDE PROTOCOL:
  If reviewer overrides a failing gate:
    Record in ROADMAP_TRACKER: "[GATE] OVERRIDE by [name]: [reason]. Risk accepted: [risk]"
    Both the override and the risk acceptance become part of the audit trail.
    Overrides do NOT clear the underlying failure — it remains flagged for future resolution.
```

---

## TEST TAXONOMY (L1-L7 Mapping to Phases)

```
LEVEL   NAME              FIRST REQUIRED   RUNS AT
L1      Unit              P0               Every build (npm test)
L2      Contract          P0-MS8           Every build
L3      Integration       R1               Every build from R1+
L4      Orchestration     R2               Every build from R2+
L5      Safety invariants R2               Every build from R2+
L6      Load & stress     R6               R6 gate + production monitoring
L7      Fault injection   R1 (1 test)      Per-phase (see §Fault Injection Schedule)

MILESTONE REQUIREMENT:
  Each milestone MUST declare which test levels are required to pass.
  Format in phase docs: "TEST LEVELS: L1-L3 required, L4 recommended"

FAULT INJECTION SCHEDULE (one test per phase, escalating complexity):
  R1: Kill material registry mid-load → verify Tier 2 degradation activates
  R2: Feed NaN to safety calc → verify S(x) blocks it (NaN >= 0.70 must NOT be true)
  R3: Timeout one batch task → verify batch continues without it (partial results OK)
  R4: Simulate tenant disconnect → verify no data leakage to other tenants
  R5: Return malformed data from API → verify dashboard shows error, not garbage
  R6: Full fault injection suite (all of above + dispatcher death + memory pressure)
```

---

## LOG SCHEMA & OBSERVABILITY

```
STRUCTURED LOG FORMAT (all logs from P0 onward):
  {
    "timestamp": "ISO-8601",
    "level": "debug|info|warn|error|fatal",
    "dispatcher": "prism_calc",
    "action": "speed_feed",
    "correlationId": "uuid-v4",
    "durationMs": 1234,
    "effort": "max",
    ...payload
  }

TRACE PROPAGATION:
  Every API call chain gets a correlationId (UUID v4) at entry point.
  All downstream calls (including swarm sub-tasks) include this correlationId.
  Recovery can trace any result back to its root request.

SAFETY DECISION RECORD (logged when S(x) blocks an operation):
  {
    "type": "safety_block",
    "material": "Ti-6Al-4V",
    "operation": "turning",
    "safety_score": 0.62,
    "threshold": 0.70,
    "failing_parameters": ["Vc exceeds safe limit for titanium", "ap too aggressive"],
    "correlationId": "uuid"
  }
```

---

## SCHEMA VERSIONING PROTOCOL

```
WITHIN P0→R6 (development):
  Additive only. New optional fields OK. Removing/renaming fields FORBIDDEN.
  New required fields must have defaults. New actions are additive.
  Breaking changes require SYSTEM_CONTRACT.md review + phase doc update.

POST-R6 (production):
  Semantic versioning on dispatcher response schemas:
    PATCH (0.0.x): New optional fields, documentation changes, bug fixes
    MINOR (0.x.0): New required fields with defaults, new actions, new dispatchers
    MAJOR (x.0.0): Removed fields, changed types, removed actions, removed dispatchers
  MAJOR requires 1-version overlap period where old + new schemas both accepted.
  MAJOR requires DEPRECATION_LIFECYCLE protocol (IA3-12.1): announce → warn → remove.

HOOK OUTPUT SCHEMAS:
  Additive-only versioning (IA3-5.1). Hooks may add fields to output.
  Hooks may NOT remove or rename output fields. Consumers tolerate unknown fields.

STATE FILE SCHEMAS:
  Backward-compatible field additions (IA2-12.1). Parsers tolerate missing trailing fields.
  No version header needed for plain-text state files.
```

---

## DRY-RUN MODE

```
ACTIVATION: Set DRY_RUN=true in .env (or pass --dry-run to MCP server start)

EFFECT:
  prism_doc action=write/append → Logged but NOT executed. Returns "[DRY-RUN] Would write..."
  prism_dev action=build → Logged but NOT executed. Returns "[DRY-RUN] Would build..."
  All calculations → Execute normally (to verify logic)
  All reads → Execute normally (to verify data access)
  State files → NOT modified (CURRENT_POSITION, ROADMAP_TRACKER, ACTION_TRACKER)

USE CASES:
  Pre-flight check before committing to a phase gate
  Validating roadmap changes without side effects
  Training new operators on the system

LIMITATION: Dry-run cannot validate that writes SUCCEED — only that logic is correct.
            Always do a real run before declaring a milestone complete.
```

---

## ARTIFACT DEPENDENCY TABLE

```
This table shows which files each phase REQUIRES (must exist at entry) and PRODUCES
(must exist at exit). Phase entry validation checks REQUIRES artifacts exist + are non-empty.

PHASE   REQUIRES                                          PRODUCES
P0      (none — first phase)                              PHASE_FINDINGS.md (P0 section)
                                                          P0_DISPATCHER_BASELINE.md
                                                          SYSTEM_ACTIVATION_REPORT.md
                                                          OPUS_CONFIG_BASELINE.md
                                                          SKILL_NAME_MAP.md

R1      PHASE_FINDINGS.md (P0 section)                    REGISTRY_AUDIT.md
        P0_DISPATCHER_BASELINE.md                         PHASE_FINDINGS.md (R1 section)
        OPUS_CONFIG_BASELINE.md

R2      REGISTRY_AUDIT.md                                 R2_CALC_RESULTS.md
        PHASE_FINDINGS.md (R1 section)                    PHASE_FINDINGS.md (R2 section)
                                                          src/__tests__/safetyMatrix.test.ts
                                                          src/__tests__/edgeCases.test.ts

R3      R2_CALC_RESULTS.md                                PHASE_FINDINGS.md (R3 section)
        PHASE_FINDINGS.md (R2 section)                    src/__tests__/batchCalcs.test.ts
                                                          src/__tests__/pfpCalibration.test.ts

R4      R2_CALC_RESULTS.md                                PHASE_FINDINGS.md (R4 section)
        PHASE_FINDINGS.md (R2 section)                    src/__tests__/tenantIsolation.test.ts
                                                          src/__tests__/compliance.test.ts
                                                          src/__tests__/apiGateway.test.ts

R5      PHASE_FINDINGS.md (R4 section)                    PHASE_FINDINGS.md (R5 section)
                                                          src/__tests__/dashboardData.test.ts

R6      PHASE_FINDINGS.md (R3+R4+R5 sections)             PRODUCTION_READINESS_REPORT.md
        R2_CALC_RESULTS.md (baselines for SL-5)           SECURITY_AUDIT_REPORT.md
        All src/__tests__/ from R2-R5                     PERFORMANCE_BASELINE.md
        SYSTEM_CONTRACT.md (this document)                src/__tests__/stressTest.test.ts
                                                          src/__tests__/memoryProfile.test.ts
                                                          src/__tests__/securityAudit.test.ts

VALIDATION RULE:
  At phase entry (Boot Step 2.5), check ALL REQUIRES artifacts exist + are non-empty.
  If ANY missing → STOP. The prior phase did not complete correctly.
  Log: "[PHASE] ARTIFACT MISSING: [file]. Prior phase completion is suspect."
```
