---
name: PSAU-FORESIGHT stack complete
description: All 18 PSAU-FORESIGHT units shipped. 36 test files, 629 assertions passing. /foresight skill registered.
type: project
originSessionId: 56e8282e-4899-4d55-92c6-7a6eccb3051f
---
**Status:** PSAU-FORESIGHT complete (U-FORE-01 through U-FORE-18 + U-FORE-12 orchestrator).

**Why:** 7-unit continuation closing out the Foresight roadmap — gives PRISM a pre-build verdict system (go / caution / no_go) grounded in risk forecasting, knowledge-gap scanning, context-budget forecasting, and teaching no-go responses.

**How to apply:** Call `/foresight` or `foresightOrchestratorEngine.reportFor()` before starting non-trivial builds. Composes RiskForecast + KnowledgeGap + ContextBudget + TeachingNoGo + ProgressiveDisclosure.

**Key commits this session:**
- `6127928a8` U-FORE-15 (HTN + STRIPS + CPM/PERT + MonteCarlo)
- `adad6d4c2` U-FORE-17 (AtomicWrites + Blast + ErrorBudget + SchemaMigration)
- `98ca29cf4` U-FORE-18 (CoordinationLedger + Replan + DistributedCriticalPath)
- U-FORE-12 (ForesightOrchestratorEngine + /foresight skill)
- `b9784d0b1` U-FORE-12-FIX (WIRE-EXEMPT marker)

**Engine inventory (U-FORE-14..18 + 12):**
ErrorExplainer, GitSafety, CopyPasteDetector, FeedbackLoopDoctor, HTNDecomposer, STRIPSPlanner, CPMPERT, MonteCarloSchedule, TypeAwareReference, SymbolImpact, TypeFlowTracer, AtomicWrites, BlastDampener, ErrorBudget, SchemaMigrationRollback, CoordinationLedger, ReplanTrigger, DistributedCriticalPath, ForesightOrchestrator.

**Known quirk:** devDispatcher.ts on this branch has CRLF line endings; the edit-verification hook blocks LF-keyed patches. Use `// WIRE-EXEMPT: <reason>` escape hatch when a library engine doesn't need dispatcher wiring, rather than fighting the line-ending mismatch.
