# MILL-MASTER-AI-WIRING — Changelog

> Version: v2 · Status: complete (17 of 17 units shipped)
> Branch: `work/mill-master`
> Envelope: `mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json`
> Spec source: U2-EXTRACT-HELPER global_contracts (additive-only API,
> legacy-bit-identical when `useAI='off'`, fail-closed AI path with legacy
> fallback, explicit p95 budgets, no new physics constants)

## Summary

This milestone wires the mill-master engine stack onto the shared PRISM AI
infrastructure (TreeOfThought, deepAIIntelligence, hypothesisRanker, Bayesian
optimization, etc.). Before this work, only `MillingUltimateAIEngine` reached
into the shared reasoning layer; every other mill engine rebuilt a bespoke
tiny-AI. After this work, every wired engine has a `useAI?` flag that opts
into the PRISM stack while preserving its legacy sync output bit-identically
when the flag is off.

## What landed

### New helper

- `src/engines/MillAIWiring.ts` (U2-EXTRACT-HELPER) — single-file shared
  wrapper exposing 4 entry points:
  - `withPRISMReasoning({question, ...})` → TreeOfThought summary
  - `rankCandidatesBayesian({candidates, ...})` → HypothesisRanker lifecycle
  - `recordCapabilityUsage(event)` → CapabilityEffectiveness adapter
  - `budgetedAIPath(useAI, legacyFn, aiFn, opts)` → useAI router with
    fail-closed legacy fallback (auto-records via recordUsage in U15)

### New dispatcher action (U16)

- `mill_prism_reason` (distinct from facade-routed `mill_agi_reason`) — direct
  invocation of the PRISM AI primitives via MillAIWiring. Zod schema:
  ```ts
  { op: enum(['reason','rank','explain','budget']) default 'reason',
    question?, goal?, context?, constraints?[], available_actions?[],
    candidates?[], budget_ms?: int 1..10000 }
  ```
  Routes per op:
  - `reason` / `explain` → `withPRISMReasoning(...)`
  - `rank` → `rankCandidatesBayesian(...)`
  - `budget` → `budgetedAIPath('on', legacy, withPRISMReasoning, {budgetMs})`

### 13 wired engines (U1–U14)

| Unit | Engine | Bespoke surface eliminated | New PRISM dependency |
| --- | --- | --- | --- |
| U1 | MillingMachineIntelligenceEngine | hand-weighted machine similarity + chain-of-thought | TreeOfThought, HypothesisRanker, AIDecisionExplanation, PRISMSelfAwareness |
| U3 | FiveAxisAIUltraIntelligenceEngine | bespoke "ultra intelligence" chain | PRISMCreativeReasoning, DeepAIIntelligence, MetaAIOrchestration, NeuralIntegration |
| U4 | FiveAxisOrchestrationEngine | static catalog routing | PRISMUnifiedOrchestrator, AgenticLoop, CognitiveBudgetAllocator |
| U5 | MillTurnSwissPipelineEngine | deterministic-only Taylor tool life | BayesianToolLife, PRISMCreativeReasoning, CrossDisciplinaryDeepLearning |
| U6 | MillingDeepAIHardeningEngine | rule-list approach | CounterfactualReasoning, HypothesisPrioritizer, AdvancedStatisticalLearning, SelfImprovementPattern |
| U7 | MillDeepLearningEngine.deepReason | inline deep-reason heuristic | TreeOfThought via MillAIWiring.withPRISMReasoning |
| U8 | MillComprehensiveNeuralEngine.deepReason | inline deep-reason heuristic | TreeOfThought via MillAIWiring.withPRISMReasoning |
| U9 | MillingProgramPatternEngine | session-only pattern memory | PersistentMemory, CrossDisciplinaryFormulaIntegration |
| U10 | MillingAIIntegrationEngine | bespoke parseNaturalLanguageQuery + cosine similarity | aiExtractionReasoner, prismNeuralKnowledgeSynthesis |
| U11 | MillingHeadIntelligenceEngine | hand-tuned head recommender | hypothesisRanker, aiDecisionExplanation |
| U12 | FiveAxisToolpathSynthesisEngine | hand-tuned strategy weights (0.30/0.25/0.15/0.15/0.15/0.05) | bayesianOptimizationEngine (GP-BO over historical outcomes) |
| U13 | FiveAxisDecisionEngine | bespoke decision logic | TreeOfThought + deepAIIntelligence (multi_path) via decideUltra |
| U14 | MillNeuralNetworkEngine | unregistered (route() couldn't reach it) | structured `encode(input)` + `mill_neural` pattern in NeuralIntegrationEngine |

### Telemetry (U15)

`MillAIWiring.budgetedAIPath` now auto-records every invocation via
`capabilityEffectivenessEngine.recordUsage`. Telemetry is fail-safe: a thrown
recordUsage never affects the call path. Disable per call with
`opts.recordTelemetry=false`. `capabilityCensusEngine.runLiveCensus()` picks
up MillAIWiring + the 13 wired engines on a fresh filesystem scan.

### Baseline benchmark

`data/benchmarks/mill-master-ai-wiring-baseline.json` (U0-BASELINE) captures
p50/p95 + output schema hash for the 13 target engines so legacy-path
regressions are detected by snapshot comparison in subsequent units.

## Unit ledger

| Unit | Title | Commit |
| --- | --- | --- |
| U0.5 | API audit pin | (envelope-internal) |
| U0 | Baseline benchmark capture | (envelope-internal) |
| U1 | MillingMachineIntelligenceEngine spike | (in-tree) |
| U2 | MillAIWiring helper extract | (in-tree) |
| U3 | FiveAxisAIUltraIntelligenceEngine retrofit | `83d91a762` |
| U4 | FiveAxisOrchestrationEngine retrofit | `83d91a762` |
| U5 | MillTurnSwissPipelineEngine retrofit | `6c822588c` |
| U6 | MillingDeepAIHardeningEngine retrofit | `4f3380e25` |
| U7 | MillDeepLearningEngine.deepReason retrofit | `09cbd9581` |
| U8 | MillComprehensiveNeuralEngine.deepReason retrofit | `92ea090fe` |
| U9 | MillingProgramPatternEngine retrofit | `7e6f0fe08` |
| U10 | MillingAIIntegrationEngine retrofit | `b2fb92e5b` |
| U11 | MillingHeadIntelligenceEngine retrofit | `f06a2c3e5` |
| U12 | FiveAxisToolpathSynthesisEngine retrofit | `302142608` |
| U13 | FiveAxisDecisionEngine retrofit | `abe676d02` |
| U14 | MillNeuralNetworkEngine retrofit | `2e4342308` |
| U15 | budgetedAIPath telemetry + census verify | `34690b27e` |
| U16 | mill_prism_reason dispatcher action + Zod schema + E2E | `3efd9d36a` |
| U17 | docs sweep | _this commit_ |

## Test coverage

- `MillAIWiring.test.ts` — base helper unit tests
- `MillMasterAIWiringMXU.test.ts` — telemetry recording, census visibility
- `MillMasterAIWiringE2E.test.ts` — Zod schema + dispatcher round-trip + each op
- 12+ engine-level test files extended with AI-path assertions

## Performance contract

- `useAI='off'` p95 ≤ 50 ms (snapshot-tested against U0 baseline)
- `useAI='auto'` p95 ≤ 100 ms (with cool-down auto-downgrade)
- `useAI='on'` p95 ≤ 500 ms / hard ceiling 2000 ms

## Out of scope

- The remaining ~55 mill engines without bespoke AI surfaces
- Web UI changes (MXU dashboard ingests census output automatically)
- Physics constants changes (`src/physics/constants.ts` unchanged)
- Lathe / EDM / waterjet engines (separate AI-wiring milestones)
- LLM-call integrations (this milestone wires only to classical PRISM
  reasoning engines, which are pure TypeScript)

## Followups

- **MILL-MASTER-AI-WIRING-V3** — extend pattern to the remaining ~55 mill
  engines after U0-style audit confirms which have bespoke AI surfaces.
- **Telemetry review cadence** — weekly for first month; tune latency
  budgets if `useAI='auto'` downgrade rate exceeds 15%.
- **Regression watch** — selfImprovementPatternEngine output checked each
  session for patterns tagged `mill_ai_wiring`. Three consecutive reports
  surface as an issue.
