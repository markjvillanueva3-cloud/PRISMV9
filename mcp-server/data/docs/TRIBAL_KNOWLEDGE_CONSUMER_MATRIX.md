# Tribal Knowledge Consumer Matrix

**Generated:** 2026-03-28 | **Version:** 1.0.0
**Wave:** TK-0 (Audit and Coverage Matrix)
**Source Roadmap:** `data/docs/roadmap/TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total static tips loaded at init | 4,129 |
| Production paths | 6 (1 persisted-silo, 2 ephemeral, 1 broken, 22 static) |
| Consumers wired | 2 (CourseBuilderEngine + knowledgeDispatcher) |
| Consumers display-only | 2 (ProductionPackageEngine + MasterPostProcessorEngine) |
| Consumers unwired (critical) | 39 |
| Consumers unwired (high) | 48 |
| Consumers unwired (medium) | 25 |

---

## Coverage by Domain

| Domain | Total Consumers | Wired | Coverage |
|--------|----------------|-------|----------|
| Manufacturing Calculation | 67 engines | 0 | **0%** |
| Manufacturing Pipelines | 9 pipelines | 0 | **0%** |
| Business / ERP | 20 engines | 0 | **0%** |
| Safety / Alarms | 14 engines | 0 | **0%** |
| Post Processing | 5 engines | 0 | **0%** |
| Training / Learning | 3 engines | 1 | **33%** |
| Frontend Pages | 8 pages | 0 | **0%** |
| Dispatchers | 7 dispatchers | 1 | **14%** |

---

## Production Path Status

| Path | Tips | Status | Persists? | Gap |
|------|------|--------|-----------|-----|
| Static CAM tips (21 files) | 3,752 | active-static | YES | None |
| KNOWLEDGE_BASE (hardcoded) | 377 | active-static | YES | None |
| Operator capture (tribal_capture) | unbounded | active-ephemeral | **NO** | Lost on restart |
| Apprentice capture | unbounded | active-ephemeral | **NO** | Separate silo, lost on restart |
| VideoLearningEngine | varies | **broken** | **NO** | Produces items, never captures |
| DocumentLearningDispatcher | varies | active-persisted-silo | YES | Not integrated into TK engine |

---

## Critical Unwired Consumers (Priority Order)

### Tier 1: Manufacturing Core (wire first)

| Consumer | Type | Knowledge Types | Priority |
|----------|------|-----------------|----------|
| SpeedFeedOrchestratorEngine | engine | speeds_feeds, tooling, material | CRITICAL |
| PrintToProgramPipelineEngine | pipeline | speeds_feeds, tooling, setup, safety | CRITICAL |
| SmartToolSelectorEngine | engine | tooling, material | CRITICAL |
| CuttingForceEngine | engine | speeds_feeds, material | CRITICAL |
| ChatterStabilityLobeEngine | engine | speeds_feeds, tooling, setup | CRITICAL |
| SurfaceFinishPredictorEngine | engine | surface_finish, speeds_feeds | CRITICAL |
| AlarmDiagnosticsEngine | engine | troubleshooting, maintenance, safety | CRITICAL |
| ScrapRootCauseEngine | engine | troubleshooting, quality | CRITICAL |
| InstantQuoteEngine | engine | speeds_feeds, tooling, setup | CRITICAL |
| QuoteToShipOrchestratorEngine | pipeline | all types | CRITICAL |

### Tier 2: Process Pipelines

| Consumer | Type | Knowledge Types | Priority |
|----------|------|-----------------|----------|
| TurningPrintToProgramEngine | pipeline | speeds_feeds, tooling, setup | CRITICAL |
| MultiAxisPrintToProgramEngine | pipeline | speeds_feeds, tooling, setup | CRITICAL |
| MillTurnSwissPipelineEngine | pipeline | speeds_feeds, tooling, setup | CRITICAL |
| EDMProgramAssemblerEngine | pipeline | setup, troubleshooting | HIGH |
| GrindingProgramAssemblerEngine | pipeline | speeds_feeds, surface_finish | HIGH |
| LaserProgramAssemblerEngine | pipeline | setup, material, safety | HIGH |
| WaterjetProgramAssemblerEngine | pipeline | speeds_feeds, setup | HIGH |

### Tier 3: Dispatchers + Post-Processing

| Consumer | Type | Knowledge Types | Priority |
|----------|------|-----------------|----------|
| calcDispatcher | dispatcher | speeds_feeds, tooling | CRITICAL |
| camDispatcher | dispatcher | tooling, setup | CRITICAL |
| diagnosisDispatcher | dispatcher | troubleshooting, safety | CRITICAL |
| PostProcessorPipelineEngine | engine | setup, safety | HIGH |
| CoolantStrategyEngine | engine | setup, material, safety | HIGH |

### Tier 4: Frontend Pages (Codex lane)

| Page | Knowledge Types | Priority |
|------|-----------------|----------|
| CalculatorPage | speeds_feeds, tooling | CRITICAL |
| ToolpathAdvisorPage | tooling, setup | CRITICAL |
| AlarmPage | troubleshooting, safety | CRITICAL |
| SafetyMonitorPage | safety, troubleshooting | HIGH |
| JobPlannerPage | setup, tooling | HIGH |
| SecondaryOpsPage | setup, quality | HIGH |
| WhatIfPage | speeds_feeds, surface_finish | MEDIUM |
| StockOptimizerPage | material, setup | MEDIUM |

---

## Upgrade Path: Display-Only to Fully Wired

| Consumer | Current Status | What's Missing |
|----------|---------------|----------------|
| ProductionPackageEngine | Fetches tips, pastes as text | Tips don't influence setup/tooling decisions |
| MasterPostProcessorEngine | References in comments only | No runtime query or injection |

---

## Broken Loops (Fix in TK-1)

1. **VideoLearningEngine** produces `VideoKnowledgeItem[]` but never calls `tribal_capture()` — knowledge items are discarded
2. **ApprenticeEngine** has separate `knowledgeBase` array not connected to TribalKnowledgeEngine
3. **DocumentLearningDispatcher** persists knowledge to `/knowledge_store/*.json` but TribalKnowledgeEngine never reads it
4. **tribal_capture** action works but tips are in-memory only — lost on server restart

---

## SVI Impact

Current SVI shows Tribal Tips at **30% wired** — the lowest subsystem.
Closing the gaps in this matrix directly raises Psi toward 100%.

| If wired | SVI Tribal Wired% | Impact |
|----------|-------------------|--------|
| Tier 1 (10 consumers) | ~45% | +15% |
| Tier 1 + Tier 2 (17 consumers) | ~55% | +25% |
| Tier 1-3 (22 consumers) | ~65% | +35% |
| All tiers + persistence | ~85% | +55% |

---

## Next Steps

1. **TK-1:** Build canonical knowledge spine with persistence (fix broken loops)
2. **TK-2:** Wire Tier 1 critical consumers (10 engines)
3. **TK-2 continued:** Wire Tier 2 process pipelines (7 pipelines)
4. **TK-4:** Frontend propagation (Codex lane, 8 pages)
