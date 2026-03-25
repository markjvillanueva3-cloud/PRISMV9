# Forge-Triple Opportunities: Untested Engines (2026-03-06)

## Summary
Found 15 major forge-triple candidates: engines with substantial code (800-2600 LOC) that lack comprehensive test coverage and/or dispatcher wiring. Priority ranked by impact (code complexity × missing tests × missing wiring).

## PRIORITY P1: CRITICAL (Large + Untested + No Dispatcher)

### 1. ProductEngine (2644 LOC) — HIGHEST PRIORITY
- **Status**: Exported from index.ts, minimal test coverage
- **Test Coverage**: Only tested in forge-debug-p5-regression.test.ts (2 basic cases)
- **Missing**: Full functional tests (50+ tests needed), integration tests
- **Dispatcher Wiring**: productDispatcher.ts exists but UNDERFUNCTIONAL
- **Impact**: Core product configuration engine — likely used by many downstream systems
- **Forge-Triple Scope**: 
  - Tests: 40-50 unit tests covering: SKU generation, pricing logic, variant management
  - Wiring: 8-12 new product actions in productDispatcher (product_create, product_variant, product_cost, etc.)
  - Exports: Ensure all types exported from index.ts

### 2. GenerativeProcessEngine (1176 LOC)
- **Status**: Exported, NO TESTS FOUND
- **Test Coverage**: 0% — not mentioned in any test file
- **Missing**: All tests, full action wiring
- **Dispatcher Wiring**: productDispatcher has stub reference, incomplete
- **Impact**: Critical for automatic process plan generation
- **Forge-Triple Scope**:
  - Tests: 45-50 unit tests (feature recognition, setup planning, operation sequencing)
  - Wiring: 10 actions (genplan_*) fully implemented in productDispatcher
  - Safety: Add validation for feature dependencies

### 3. CAMIntegrationEngine (1251 LOC)
- **Status**: Exported, minimal coverage
- **Test Coverage**: NOT FOUND in test files (0%)
- **Missing**: All integration tests, CAM system adapters
- **Dispatcher Wiring**: camDispatcher exists but missing cam_integration actions
- **Impact**: Bridge between PRISM and external CAM systems (Fusion 360, Mastercam, NX)
- **Forge-Triple Scope**:
  - Tests: 40-50 tests covering: parameter export, tool sync, post-processor generation
  - Wiring: 8-10 cam_integration_* actions in camDispatcher
  - Enhancements: Multi-format export (ISO 6983, FANUC, Siemens, Haas)

### 4. NLHookEngine (1125 LOC) — F6 Feature
- **Status**: Exported, F6 safety-critical feature
- **Test Coverage**: NOT FOUND (0%)
- **Missing**: All safety/sandbox tests, validation tests
- **Dispatcher Wiring**: nlHookDispatcher referenced but INCOMPLETE
- **Impact**: Natural language hook authoring — unsafe if untested
- **Forge-Triple Scope**:
  - Tests: 60+ safety tests (sandbox isolation, static analysis, runtime protection)
  - Wiring: 8-12 nl_hook_* actions (parse, compile, validate, sandbox, deploy, rollback)
  - CRITICAL: Add adversarial test cases (injection attacks, infinite loops, resource bombs)

## PRIORITY P2: HIGH (800-1200 LOC + Partial Coverage)

### 5. ShopSchedulerEngine (770 LOC)
- **Status**: Exported but limited test coverage
- **Test Coverage**: Basic structure tested, but missing optimization tests
- **Missing**: Job scheduling optimization tests, constraint satisfaction tests
- **Dispatcher Wiring**: schedulingDispatcher exists, but missing shop_schedule_* actions
- **Forge-Triple Scope**: 35-40 tests + 6-8 wiring actions

### 6. MachineConnectivityEngine (873 LOC)
- **Status**: Exported, minimal testing
- **Test Coverage**: rem-ms4-architecture.test.ts has 2 structural checks only
- **Missing**: Full signal processing, DFT analysis, anomaly detection tests
- **Dispatcher Wiring**: telemetryDispatcher has stubs, needs full implementation
- **Forge-Triple Scope**: 40-45 tests + 10-12 machine_connect_* actions

### 7. PredictiveMaintenanceEngine (844 LOC)
- **Status**: Exported, mentioned in l2-mfg-intelligence.test.ts but NOT fully tested
- **Test Coverage**: 1-2 smoke tests only
- **Missing**: 50+ tests for wear prediction, failure rate modeling, RUL calculation
- **Dispatcher Wiring**: maintenanceDispatcher incomplete
- **Forge-Triple Scope**: 50-60 tests + 8-10 maintenance_* actions

### 8. MemoryGraphEngine (1234 LOC) — F2 Feature
- **Status**: Exported, F2 cross-session memory feature
- **Test Coverage**: NOT FOUND (0%)
- **Missing**: All graph persistence tests, session linkage tests
- **Dispatcher Wiring**: memoryDispatcher referenced but INCOMPLETE
- **Forge-Triple Scope**: 40-50 tests + 8 memory_graph_* actions

### 9. FederatedLearningEngine (833 LOC)
- **Status**: Exported, NO TESTS FOUND
- **Test Coverage**: 0%
- **Missing**: All tests (data distribution, consensus, aggregation)
- **Dispatcher Wiring**: autonomousDispatcher incomplete
- **Forge-Triple Scope**: 35-45 tests + 6-8 fedlearn_* actions

### 10. CoolantValidationEngine (775 LOC) — Safety-Critical
- **Status**: Exported from index.ts, TESTED but incomplete
- **Test Coverage**: safety-engines-unit.test.ts (2-3 tests only)
- **Missing**: 30+ edge case tests (MQL flow, pressure variations, temperature effects)
- **Dispatcher Wiring**: safetyDispatcher wired but missing edge case actions
- **Forge-Triple Scope**: 30-40 comprehensive safety tests + 5-6 validation actions

## PRIORITY P3: MEDIUM (Wiring Gaps Only — Tests Exist)

### 11. CamKnowledgePortabilityEngine (932 LOC)
- **Status**: Tested in cam-portability.test.ts
- **Missing**: Dispatcher wiring (camDispatcher missing cam_portability_* actions)
- **Forge-Triple Scope**: 8-10 wiring actions in camDispatcher

### 12. KnowledgeGraphEngine (941 LOC)
- **Status**: Exported, untested
- **Test Coverage**: 0%
- **Missing**: All tests (50+), dispatcher wiring
- **Forge-Triple Scope**: 40-50 tests + 8-10 knowledge_graph_* actions

### 13. ParametricPartLibraryEngine (909 LOC)
- **Status**: Tested in parametric-part-library.test.ts
- **Missing**: Dispatcher wiring gaps, integration with CAD generation
- **Forge-Triple Scope**: 5-8 wiring actions + 20 integration tests

### 14. QuoteEstimatorEngine (918 LOC)
- **Status**: Tested in quoting-system.test.ts
- **Missing**: Dispatcher wiring, cost model validation tests
- **Forge-Triple Scope**: 6-8 wiring actions + 15 cost validation tests

### 15. RoadmapExecutor (904 LOC)
- **Status**: Tested in roadmap-executor.test.ts
- **Missing**: Edge cases, dispatcher wiring to orchestration
- **Forge-Triple Scope**: 10-15 edge case tests + 4-6 wiring actions

## Dispatcher Opportunities

### Dispatchers Needing Expansion (8-12 actions each):
1. **productDispatcher.ts** — Missing: 10+ actions for GenerativeProcessEngine
2. **camDispatcher.ts** — Missing: 8+ cam_integration_* actions
3. **nlHookDispatcher.ts** — Missing: 10+ nl_hook_* actions (critical safety)
4. **schedulingDispatcher.ts** — Missing: 6+ shop_schedule_* actions
5. **telemetryDispatcher.ts** — Missing: 8+ machine_connect_* actions
6. **maintenanceDispatcher.ts** — Missing: 8+ maintenance_* actions
7. **memoryDispatcher.ts** — Missing: 8+ memory_graph_* actions
8. **autonomousDispatcher.ts** — Missing: 6+ fedlearn_* actions

## Test Gap Analysis

### Total Opportunity: ~500 New Tests
- P1 engines: 200+ tests (ProductEngine, GenerativeProcessEngine, CAMIntegrationEngine, NLHookEngine)
- P2 engines: 250+ tests (6 engines × 40-50 tests avg)
- P3 engines: 50+ tests (dispatcher integration + edge cases)

### Critical Safety Tests Needed (80+ tests):
- NLHookEngine sandbox isolation (30 tests)
- CoolantValidationEngine edge cases (20 tests)
- MachineConnectivityEngine anomaly detection (20 tests)
- PredictiveMaintenanceEngine failure modes (20 tests)

## Implementation Roadmap

### Phase 1 (Week 1): Safety-Critical
1. NLHookEngine (60+ tests, 10 actions) — BLOCKING feature
2. CoolantValidationEngine (30+ tests) — Manufacturing safety
3. PredictiveMaintenanceEngine (50+ tests) — Downtime prevention

### Phase 2 (Week 2): Core Manufacturing
1. ProductEngine (40+ tests, 10 actions)
2. GenerativeProcessEngine (45+ tests, 10 actions)
3. CAMIntegrationEngine (40+ tests, 8 actions)

### Phase 3 (Week 3): Intelligence & Infrastructure
1. MachineConnectivityEngine (40+ tests)
2. MemoryGraphEngine (40+ tests, 8 actions)
3. KnowledgeGraphEngine (40+ tests, 8 actions)

### Phase 4 (Week 4): Wiring Completion
1. Fill dispatcher gaps (8+ dispatchers × 8-10 actions each)
2. Integration tests (20 E2E tests)
3. Cross-engine validation (15 tests)

## Estimated Effort

- **Total Tests**: ~500 new tests (consolidates to ~2800 backend tests, matching roadmap target)
- **Total Actions**: ~70 new dispatcher actions (consolidates to ~1360 actions, matching roadmap target)
- **Estimated LOC**: 3500-4000 new test code
- **Timeline**: 4 weeks @ 2 engineers (daily forge-triple sessions)
- **Impact**: Closes all major coverage gaps in L8-L10 architecture layers
