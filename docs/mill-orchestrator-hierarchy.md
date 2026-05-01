# Mill Orchestrator Hierarchy — MS1-U-MIL11

**Status:** DEFINED | **Authority:** MILL-AI-INTEGRATION-ROADMAP-v2

## Problem
Forge-audit found 4 parallel orchestrators with overlapping concerns:
- `MillingAGIMasterEngine` (1,234 LOC) — wisdom, validation, stats
- `MillingAGIOrchestrationEngine` (1,566 LOC) — `analyzeWithAGI`, physics state pipeline
- `MillingUnifiedScienceOrchestrationEngine` (1,047 LOC) — 7-domain science synergy
- `MillingEndToEndOrchestrationEngine` (1,002 LOC) — print-to-program workflow

No single entry point. Callers must know which to invoke.

## Hierarchy (target)

```
                MillMasterOrchestratorFacadeEngine  [NEW — single entry]
                              │
       ┌──────────────────────┼──────────────────────┐
       │                      │                      │
MillingAGIMasterEngine   UnifiedScience...   MillingEndToEndOrch
(wisdom + validation)    (7-domain physics)  (print-to-program)
       │
MillingAGIOrchestrationEngine  [sub of AGI Master]
(physics-state calc pipeline)
```

## Routing Rules (facade dispatch)
| Request signal | Route to | Rationale |
|----------------|----------|-----------|
| `request.type === "print_to_program"` | MillingEndToEndOrchestrationEngine | End-to-end job pipeline |
| `request.type === "scientific"` / has material+Vc+fz | UnifiedScienceOrchestration | Multi-domain physics |
| `request.type === "agi"` / has rich context | AGIMaster → AGIOrchestration | Reasoning + physics state |
| `request.type === "validate"` / simple check | AGIMaster.validateApproach | Cheap validation |
| default | UnifiedScienceOrchestration.quickAnalyze | Safe minimum |

## Responsibilities (de-duplicated)
- **AGIMaster:** high-level wisdom, approach validation, stats aggregation, routes AGI sub
- **AGIOrchestration:** physics state pipeline (becomes sub-engine of AGIMaster)
- **UnifiedScience:** 7-domain synergy (thermo, tribo, metal, chem, dyn, mech, surf)
- **EndToEnd:** job workflow (quote → program → post)
- **Facade:** input normalization + route selection + result aggregation

## Out-of-scope for MS1
- Deep refactor of existing orchestrator internals (MS3/MS4 handle)
- Removing any of the 4 engines (all remain, facade coordinates)
- Dispatcher consolidation (MS5 handles)

## Exit Criteria
- [x] Doc exists and routing rules defined
- [ ] Facade engine built (U-MIL12/13)
- [ ] Single dispatcher action calls facade (U-MIL13)
- [ ] Existing tests still pass (U-MIL14)
