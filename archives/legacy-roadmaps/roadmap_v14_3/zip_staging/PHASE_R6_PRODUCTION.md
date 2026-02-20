# PHASE R6: PRODUCTION HARDENING — v14.2 (STUB — expand via Brainstorm-to-Ship at phase start)
# Status: not-started | Sessions: 2-3 | Role: Production Safety Officer
# v13.9: Cross-Audit Governance Hardening — SYSTEM_CONTRACT.md as gate artifact,
#         full fault injection suite, all test levels required (XA-1,5,7,13).
# v13.5: strictNullChecks MOVED TO P0 (SL-4 — no longer a 300-error R6 surprise).
#         Safety-score-under-load validation added (SL-5 — verify S(x) doesn't degrade under load).
#         Parallel equivalence uses tolerance-based comparison, not exact diff (CB-5).
#         Offline cache implementation (designed in R4, implemented here — AG-1).
#         Full monitoring + alerting deployment (foundations from R4 — AG-5).
#         Multi-user concurrency model: dev state vs production runtime state separation (AG-6).
#         Cross-platform path audit for Linux deployment (AG-7).
# v13.3: Test suite growth path documented (R2→R3→R4→R5→R6 cumulative npm test).
#         Tool anchors added (regression, stress, security, performance, Opus audit per MS).
# v13.0: 1M context load testing. Fast Mode benchmarking. Full Opus 4.6 feature audit.
#         Omega >= 0.85 required (elevated from standard 0.70 for production readiness).

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R3 (intelligence actions), R4 (enterprise infrastructure), R5 (visual platform),
  R7 (coupled physics + optimization), R8 (intent engine + 22 app skills) ALL complete.
  The system PRISM ships to users is now complete. All safety baselines maintained through R2.

WHAT THIS PHASE DOES: Final production hardening of the COMPLETE system. Stress testing the full
  pipeline including intent engine and persona routing under load. Performance profiling. Security
  audit. Full regression suite. Omega >= 0.85 required for production release.

WHAT COMES AFTER: R9 (real-world integration), R11 (product packaging). This is not the final
  phase, but it is the production QUALITY gate. Nothing ships without passing R6.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: PHASE_FINDINGS.md (R3+R4+R5+R7+R8 sections), R2_CALC_RESULTS.md (baselines for SL-5),
            COUPLED_PHYSICS_VALIDATION.md (from R7), INTENT_ENGINE_ACCURACY.md (from R8),
            All src/__tests__/ from R2-R8, SYSTEM_CONTRACT.md
  PRODUCES: PRODUCTION_READINESS_REPORT.md, SECURITY_AUDIT_REPORT.md, PERFORMANCE_BASELINE.md,
            src/__tests__/stressTest.test.ts, src/__tests__/memoryProfile.test.ts,
            src/__tests__/securityAudit.test.ts

TEST LEVELS: L1-L7 ALL required (full test taxonomy — this is production gate)

FAULT INJECTION SUITE (XA-13 — R6 runs ALL fault tests, not just one):
  Run ALL prior phase fault tests (R1-R8) under production-like conditions:
    R1 test: Registry unavailable → Tier 2 degradation
    R2 test: NaN input → safety block
    R3 test: Batch task timeout → partial results
    R4 test: Tenant disconnect → no data leakage
    R5 test: Malformed API data → error display
    R7 test: Coupled physics divergence → fallback to uncoupled with warning
    R8 test: Intent engine misparse → safe default (explicit mode), no silent wrong action
  PLUS R6-specific fault tests:
    Dispatcher death mid-calculation → graceful error, no operator-visible garbage
    Memory pressure (heap > 3GB) → system remains responsive, degrades gracefully
    Concurrent write contention → atomicWrite prevents corruption

---

## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these)

```
1. strictNullChecks: ALREADY ENABLED from P0 (SL-4). Verify no @ts-expect-error comments remain.
   If any remain from P0 → fix them in R6-MS0. Zero tolerance for null-unsafe code in production.
2. Memory profiling with heap snapshots (baseline + post-1000-requests comparison)
3. --max-old-space-size=4096 set in production start script
4. Runbooks cover: boot, restart, recovery, backup, monitoring, rollback, registry reload
5. Load test with realistic workload (mix of material_get, speed_feed, alarm_decode)
6. All 14 wiring chains pass under load (not just in isolation)
7. Health check endpoint returns accurate metrics under load
8. Log rotation configured (structured logs can fill disk without rotation)
9. Backup and restore procedure tested (not just documented)
10. SAFETY-SCORE-UNDER-LOAD VALIDATION (SL-5):
    For each of 10 R2 baseline materials, compare safety_score under load vs in isolation.
    Delta must be < 0.02. If > 0.02 → investigate if adaptive thinking degrades under pressure.
11. PARALLEL EQUIVALENCE TOLERANCE (CB-5):
    Parallel vs sequential diff uses tolerance-based comparison (not exact equality).
    Physical quantities: |delta|/value < 1e-10. Safety scores: |delta| < 0.001.
12. OFFLINE CACHE IMPLEMENTATION (AG-1 — designed in R4):
    Read-only cache of top 200 materials. Response marked "CACHED — not live-computed."
13. MONITORING + ALERTING (AG-5): Health polling, threshold alerts, notification channel.
14. DEV vs PROD STATE SEPARATION (AG-6): ROADMAP_TRACKER etc. removed from production.
    Production queries are stateless.
15. CROSS-PLATFORM PATH AUDIT (AG-7): All paths use path.resolve(). Test on Linux.

OMEGA STEPPING STONES (expected trajectory):
  After R2: ~0.70-0.72 (baseline)
  After R3: ~0.72-0.75 (data quality boost)
  After R4: ~0.77-0.80 (enterprise reliability)
  After R5: ~0.80-0.83 (visual platform completeness)
  R6 target: >= 0.85 (production hardening closes the gap)
```

## STUB OBJECTIVES (expand at phase start using PHASE_TEMPLATE.md)

1. Full regression: ALL R2 tests (standard + manual + AI edge cases) pass
2. Stress test: 1000+ concurrent calc requests via batch API
3. Performance: Response time baselines for all safety calcs
4. Security: Input sanitization audit on all 368 actions
5. Memory: Heap profiling under sustained load (flag if >3GB from boot health)
6. Omega >= 0.85 (elevated threshold for production)

## TEST SUITE GROWTH PATH (how npm test evolves from R2 → R6)

```
The test suite is NOT static. Each phase adds tests. By R6, npm test is the FULL regression gate.

R2-MS3 CREATES (baseline):
  src/__tests__/safetyMatrix.test.ts — 50 calcs (10 materials × 5 operations)
  src/__tests__/edgeCases.test.ts — 6 manual + 10-15 AI-generated edge cases
  src/__tests__/health.test.ts — health endpoint smoke test (created in P0-MS0)

R3 ADDS (expansion):
  src/__tests__/batchCalcs.test.ts — representative sample from each batch campaign (not all 250+)
  src/__tests__/pfpCalibration.test.ts — PFP prediction accuracy tests
  Each R3 brainstorm MUST include: "Add tests to vitest suite for new calcs"

R4 ADDS (enterprise):
  src/__tests__/tenantIsolation.test.ts — cross-tenant data leak tests
  src/__tests__/compliance.test.ts — template validation tests
  src/__tests__/apiGateway.test.ts — rate limiting, auth, input validation tests

R5 ADDS (visual):
  src/__tests__/dashboardData.test.ts — data source integration tests (not UI tests)
  src/__tests__/reportGeneration.test.ts — report output validation

R7 ADDS (intelligence):
  src/__tests__/physicsPrediction.test.ts — coupled physics accuracy
  src/__tests__/optimization.test.ts — optimization engine convergence
  COUPLED_PHYSICS_VALIDATION.md — validation against R2 baselines

R8 ADDS (experience):
  src/__tests__/intentEngine.test.ts — intent decomposition accuracy
  src/__tests__/personaRouting.test.ts — persona-adaptive response validation
  INTENT_ENGINE_ACCURACY.md — accuracy benchmarks

R6 RUNS ALL OF THE ABOVE:
  npm test → vitest run → ALL test files execute → ALL must pass → build gate.
  If ANY test fails → build FAILS → cannot deploy to production.
  This now covers the COMPLETE system: data → calcs → intelligence → UX → production.
  
  R6 ALSO ADDS:
  src/__tests__/stressTest.test.ts — 1000+ concurrent request simulation
  src/__tests__/memoryProfile.test.ts — heap growth under sustained load
  src/__tests__/securityAudit.test.ts — input sanitization on sample actions
```

## TOOL ANCHORS (concrete starting points for Brainstorm-to-Ship expansion)

```
MS0 — FULL REGRESSION:
  npm test  → ALL tests from R2+R3+R4+R5 must pass.
  prism_dev action=build target=mcp-server  [effort=medium]
  If any test fails → fix before proceeding. This is the gate.

MS1 — STRESS TEST:
  CLARIFICATION: "1000+ concurrent" means 1000 TOTAL requests with CONTROLLED concurrency.
  This is a sustained-load endurance test, NOT a DDoS-style burst test.
  Use p-queue to fire 1000+ requests with controlled concurrency:
  prism_orchestrate action=swarm_execute pattern="parallel_batch"  [effort=max]
    tasks=[1000 × random material/operation combinations]
  RATE LIMIT: Must use p-queue with concurrency=5, intervalCap=50/minute (matching API tier).
  Total test duration: ~20 minutes at 50 req/min.
  Measure: response time P50, P95, P99. Error rate. Memory growth (heap snapshots).

  SAFETY-SCORE-UNDER-LOAD VALIDATION (SL-5 — CRITICAL):
  For EACH of the 10 R2 baseline materials (4140, 1045, D2, 316SS, Ti-6Al-4V, 6061-T6, GG25, C360, 718, 2205):
    Run speed_feed at effort=max DURING the stress test (while other calcs are running).
    Compare safety_score to the R2 baseline safety_score (recorded in R2_CALC_RESULTS.md).
    Delta must be < 0.02. If > 0.02 → STOP DEPLOYMENT.
    Investigate: is adaptive thinking silently reducing effort under resource pressure?
    Is the API returning lower-quality results under load?
    WHY: A system that approves unsafe cuts under load that it rejects in isolation is WORSE
    than no system at all — it provides a false sense of safety.

MS2 — SECURITY AUDIT:
  prism_dev action=code_search pattern="req\.\(body\|params\|query\)" path="src/"  [effort=high]
  → Find all input access points. Verify each has validation (zod/joi schema).
  Run: injection test strings through each input (SQL injection, XSS, path traversal).

MS3 — PERFORMANCE BASELINE:
  For each safety calc (speed_feed, cutting_force, tool_life, spindle_speed):
    Run 100 iterations → measure mean response time.
    prism_calc action=[calc] material="4140" operation="turning"  [effort=max, structured output]
    Record: { calc, mean_ms, p95_ms, p99_ms, structured_output_valid }

MS4 — OPUS 4.6 FEATURE AUDIT:
  Compaction API: prism_dev action=code_search pattern="compact_20260112" path="src/"  [effort=high]
  Adaptive Thinking: prism_dev action=code_search pattern="type.*adaptive" path="src/"  [effort=high]
  Structured Outputs: prism_dev action=code_search pattern="json_schema" path="src/"  [effort=high]
  Prefilling: prism_dev action=code_search pattern="prefill\|assistant.*content" path="src/"  [effort=high]
  → Each must match expected pattern. No deprecated patterns found.

MS5 — AGENT TEAMS VALIDATION (parallel vs sequential diff):
  Run P0-MS8 chains BOTH parallel AND sequential.
  TOLERANCE-BASED COMPARISON (CB-5 — NOT exact diff):
    Physical quantities (Vc, fz, ap, Fc, n_rpm, tool_life_min):
      |parallel - sequential| / sequential < 1e-10 (floating point ULP tolerance).
    Safety scores: |delta| < 0.001.
    String fields: exact match.
  WHY: IEEE 754 floating point is not deterministic across execution orders.
  Parallel execution may reorder operations: (a+b)+c ≠ a+(b+c).
  Results that differ by 1 ULP are mathematically equivalent, not bugs.
  prism_orchestrate action=swarm_execute pattern="parallel_batch" tasks=[chains 1-14]
  Then: run same chains via pattern="sequential_chain"
  Compare: every field within tolerance → PASS. Any field beyond tolerance → debug.

QUALITY GATE:
  prism_ralph action=assess target="R6 Production Hardening"  [effort=max]  → Ralph >= A
  prism_omega action=compute target="R6 complete"  [effort=max]  → Omega >= 0.85
```

## OPUS 4.6 PATTERNS FOR R6

```
1M CONTEXT LOAD TESTING: Test system behavior at maximum context utilization.
  Run full P0-MS8 integration chains in single 1M context session.
  Verify: Compaction API triggers correctly at 150K in 200K mode.
  Verify: 1M mode handles full regression suite without splitting.
  Benchmark: retrieval accuracy at various context depths (C3 finding: 76% at 1M, 93% at 256K).

FAST MODE BENCHMARKING: Measure wall-clock improvement from Fast Mode on diagnostic ops.
  Run identical diagnostic suite with and without speed: "fast".
  Document: latency improvement, cost increase, recommendation for production config.

FULL OPUS 4.6 FEATURE AUDIT: Verify all features configured in P0-MS0 still active.
  Compaction API: ✓ still triggering correctly
  Adaptive Thinking: ✓ effort tiers applied correctly
  Structured Outputs: ✓ all safety calcs schema-validated
  Agent Teams: ✓ parallel execution producing same results as sequential
  Fine-grained Streaming: ✓ large outputs stream correctly
  Data Residency: ✓ ITAR calcs route to US inference
  Context Editing: ✓ tool result clearing functioning
  Prefilling: ✓ no assistant prefilling anywhere in codebase

AGENT TEAMS VALIDATION: Run P0-MS8 chains both parallel AND sequential.
  Diff results. Must be identical. If not: debug, fix, re-run.
  This is the final proof that parallel execution is production-safe.

PFP AT MAX EFFORT (final calibration):
  Run PFP predictions against all R2 baseline data.
  Measure prediction accuracy. Document confidence intervals.
  This leverages Opus 4.6's 30% improvement in software failure diagnosis.
```

## GATE REQUIREMENTS
Ralph >= A | Omega >= 0.85 | Build passes | npm test passes (full regression suite from R2)
All regressions pass | Stress test passes
Security audit clean | Memory under threshold | All Opus 4.6 features verified
SYSTEM_CONTRACT.md: ALL safety invariants (INV-S1 through INV-S5) verified under load
SYSTEM_CONTRACT.md: ALL correctness invariants (INV-C1 through INV-C4) verified
Fault injection suite: ALL 10 tests pass (R1-R8 tests + 3 R6-specific)
Human review: R6 gate is HUMAN-REVIEW-RECOMMENDED (see SYSTEM_CONTRACT.md §Human Review Protocol)


---

## ADDITIONAL EXIT CRITERIA (v14.3)

### Plugin Packaging Gate
Package complete PRISM Claude Code configuration (15+ skills, 5 subagents, 5 commands,
hooks, MCP connection config) as a distributable Claude Code plugin.

Verify: fresh install of plugin on clean machine produces working PRISM development
environment within 5 minutes. See CLAUDE_CODE_INTEGRATION.md §Plugin Packaging for
full contents and verification criteria.

This gate ensures the development toolchain is reproducible and bridges to R11
product packaging for customer-facing installations.
