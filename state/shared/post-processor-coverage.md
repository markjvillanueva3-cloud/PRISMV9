# Post-Processor Coverage Matrix

Generated: 2026-05-24T06:55:11.953Z
Source: `scripts/audit-post-processor-coverage.mjs`

## Summary

- Engines scanned: **86**
- Canonical cells: 12 brands × 7 machine-classes = **84**
- Covered cells: **66**
- Gap cells: **18** (coverage 79%)

## Coverage matrix

| Brand | mill (3-axis) | mill (5-axis) | lathe | mill-turn | swiss | wedm-wire | wedm-sinker |
|---|---|---|---|---|---|---|---|
| Hurco | ✓ 21 | ✓ 12 | ✓ 15 | ✓ 5 | ✓ 3 | ✓ 2 | ❌ |
| Haas | ✓ 31 | ✓ 17 | ✓ 27 | ✓ 6 | ✓ 7 | ✓ 4 | ❌ |
| Mazak | ✓ 24 | ✓ 15 | ✓ 23 | ✓ 7 | ✓ 7 | ✓ 4 | ❌ |
| DMG Mori | ✓ 9 | ✓ 4 | ✓ 9 | ✓ 3 | ✓ 3 | ✓ 2 | ❌ |
| Brother | ✓ 9 | ✓ 7 | ✓ 5 | ✓ 3 | ✓ 2 | ❌ | ❌ |
| Okuma | ✓ 48 | ✓ 25 | ✓ 55 | ✓ 9 | ✓ 10 | ✓ 7 | ✓ 1 |
| Fanuc (generic) | ✓ 27 | ✓ 17 | ✓ 26 | ✓ 6 | ✓ 7 | ✓ 2 | ❌ |
| Siemens (generic) | ✓ 21 | ✓ 14 | ✓ 18 | ✓ 5 | ✓ 3 | ✓ 2 | ❌ |
| Mitsubishi | ✓ 26 | ✓ 8 | ✓ 21 | ✓ 5 | ✓ 6 | ✓ 4 | ✓ 1 |
| Sodick | ✓ 2 | ✓ 1 | ✓ 2 | ❌ | ✓ 1 | ❌ | ❌ |
| Agie | ✓ 1 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Makino | ✓ 5 | ✓ 3 | ✓ 4 | ✓ 1 | ✓ 2 | ✓ 1 | ❌ |

_Legend: ✓ N = N engine(s) cover this cell · ❌ = gap (operator-actionable)._

## Gap punch list (operator-actionable)

Each gap is a candidate master-post-engine milestone.

- **Hurco wedm-sinker** — no engine matched
- **Haas wedm-sinker** — no engine matched
- **Mazak wedm-sinker** — no engine matched
- **DMG Mori wedm-sinker** — no engine matched
- **Brother wedm-wire** — no engine matched
- **Brother wedm-sinker** — no engine matched
- **Fanuc (generic) wedm-sinker** — no engine matched
- **Siemens (generic) wedm-sinker** — no engine matched
- **Sodick mill-turn** — no engine matched
- **Sodick wedm-wire** — no engine matched
- **Sodick wedm-sinker** — no engine matched
- **Agie mill (5-axis)** — no engine matched
- **Agie lathe** — no engine matched
- **Agie mill-turn** — no engine matched
- **Agie swiss** — no engine matched
- **Agie wedm-wire** — no engine matched
- **Agie wedm-sinker** — no engine matched
- **Makino wedm-sinker** — no engine matched

## All scanned engines

- `AdvancedPostProcessorEngine.ts` — brands=[Hurco, Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis)]
- `CAMPostInvokeOrchestratorEngine.ts` — brands=[?] · classes=[mill (3-axis), lathe]
- `CAMPostSelectorUIEngine.ts` — brands=[Hurco, Haas, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), lathe]
- `CrossCAMPostEngine.ts` — brands=[Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (3-axis), lathe, mill-turn]
- `FiveAxisPostEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis), lathe]
- `HurcoV11MillMasterPostEngine.ts` — brands=[Hurco, Okuma] · classes=[mill (3-axis), mill (5-axis), lathe]
- `HybridPostMergeEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis)]
- `JMDiePostProcessorLearningEngine.ts` — brands=[Hurco, Haas, Okuma] · classes=[mill (3-axis), lathe]
- `LatheMasterPostAPIEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Mitsubishi] · classes=[mill (3-axis), lathe, swiss]
- `LatheMasterPostDeepReasoningEngine.ts` — brands=[Okuma] · classes=[mill (3-axis), lathe, swiss]
- `LatheMasterPostEnsembleCrossCheckEngine.ts` — brands=[Haas, Mazak, DMG Mori, Okuma, Fanuc (generic), Mitsubishi] · classes=[mill (3-axis), lathe, mill-turn, swiss]
- `LatheMasterPostRegressionMatrixEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LatheMasterPostRouterEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Mitsubishi] · classes=[mill (3-axis), lathe, mill-turn, swiss]
- `LatheMasterPostSelfAwarenessEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Mitsubishi] · classes=[lathe]
- `LatheMasterPostUnifiedOutputEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Mitsubishi] · classes=[lathe]
- `LathePostGeneratorActiveLearningEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LathePostGeneratorDialectEngine.ts` — brands=[Okuma, Fanuc (generic), Mitsubishi] · classes=[lathe]
- `LathePostGeneratorSpecIngestEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), lathe, swiss]
- `LathePostGeneratorUncertaintyEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LathePostGeneratorValidatorWiringEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LathePostKnowledgeGraphEngine.ts` — brands=[Haas, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), lathe]
- `LathePostProcessorAIEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Okuma, Fanuc (generic), Siemens (generic)] · classes=[lathe]
- `LathePostProcessorDialectValidatorEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LathePostProcessorEngine.ts` — brands=[Haas, Mazak, DMG Mori, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (3-axis), lathe]
- `LathePostRegressionTestGeneratorEngine.ts` — brands=[Okuma] · classes=[lathe]
- `LatheSwissPostGeneratorEngine.ts` — brands=[Okuma] · classes=[mill (3-axis), lathe, swiss]
- `MasterPostFineTuningEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (5-axis)]
- `MasterPostGeneratorEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (3-axis), mill (5-axis), lathe, mill-turn, swiss]
- `MasterPostProcessorAGIOrchestrationEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), mill (5-axis), lathe, wedm-wire]
- `MasterPostProcessorEngine.ts` — brands=[Haas, Okuma] · classes=[mill (3-axis), mill (5-axis), lathe]
- `MasterPostProcessorGeniusEngine.ts` — brands=[Mazak, DMG Mori, Okuma] · classes=[lathe, wedm-wire]
- `MasterPostProcessorUnifiedAGIEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi, Agie] · classes=[mill (3-axis)]
- `MitsubishiMV1200RWireEDMMasterPostEngine.ts` — brands=[Okuma, Mitsubishi] · classes=[mill (3-axis), lathe, wedm-wire]
- `MultiCAMPostEngine.ts` — brands=[Okuma, Siemens (generic)] · classes=[mill (3-axis), lathe, mill-turn]
- `NovelPostProcessorBridgeEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis), lathe]
- `OkumaB250LatheMasterPostEngine.ts` — brands=[Okuma] · classes=[mill (3-axis), lathe]
- `OkumaOSPMillMasterPostEngine.ts` — brands=[Hurco, Okuma, Fanuc (generic)] · classes=[mill (3-axis), mill (5-axis), lathe]
- `PostLibraryCatalogEngine.ts` — brands=[Okuma, Fanuc (generic)] · classes=[mill (3-axis), mill (5-axis), lathe, swiss]
- `PostLibraryConfiguratorEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorAGIContinuousLearningEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorAGIMasterRegistryEngine.ts` — brands=[?] · classes=[?]
- `PostProcessorAGIWiringIntegrationEngine.ts` — brands=[Okuma] · classes=[mill (3-axis)]
- `PostProcessorAISelfAwarenessIntegrationEngine.ts` — brands=[Hurco, Haas, Okuma, Fanuc (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorAnalysisEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorAnalyzerEngine.ts` — brands=[Okuma] · classes=[mill (3-axis), lathe]
- `PostProcessorAPIEngine.ts` — brands=[Okuma] · classes=[lathe]
- `PostProcessorAutopilotEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi, Sodick, Makino] · classes=[mill (3-axis), lathe]
- `PostProcessorCapabilityMatrixEngine.ts` — brands=[Okuma, Fanuc (generic)] · classes=[mill (3-axis), lathe]
- `PostProcessorCognitiveEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorComprehensiveKnowledgeEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Okuma, Makino] · classes=[mill (3-axis), wedm-wire]
- `PostProcessorCPSImplementationEngine.ts` — brands=[Hurco, Okuma] · classes=[mill (3-axis), lathe, mill-turn]
- `PostProcessorDeepAIHardeningEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), mill (5-axis), lathe, mill-turn]
- `PostProcessorDeepCognitionEngine.ts` — brands=[Hurco, Okuma] · classes=[?]
- `PostProcessorDeepIntelligenceEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi, Sodick, Makino] · classes=[mill (3-axis), mill (5-axis), lathe, swiss]
- `PostProcessorDeepLearningEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorDeepReasoningEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis), lathe]
- `PostProcessorFeedOptimizerEngine.ts` — brands=[Okuma] · classes=[mill (3-axis)]
- `PostProcessorGeneratorEngine.ts` — brands=[Okuma] · classes=[mill (3-axis), mill (5-axis), lathe]
- `PostProcessorHyperMillKnowledgeEngine.ts` — brands=[Hurco, Haas, Okuma] · classes=[mill (3-axis)]
- `PostProcessorIntelligenceOrchestratorEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), lathe]
- `PostProcessorKnowledgeEngine.ts` — brands=[Okuma] · classes=[mill (5-axis)]
- `PostProcessorKnowledgeGraphEngine.ts` — brands=[Okuma, Fanuc (generic)] · classes=[mill (5-axis)]
- `PostProcessorMachineKinematicsEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Okuma, Makino] · classes=[mill (3-axis), mill (5-axis), lathe]
- `PostProcessorMasterPostArchitectureEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Okuma, Mitsubishi, Makino] · classes=[mill (3-axis), mill (5-axis), lathe, mill-turn, swiss]
- `PostProcessorMetaLearningEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (5-axis)]
- `PostProcessorNeuralNetworkEngine.ts` — brands=[Hurco, Haas, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[?]
- `PostProcessorPhysicsAwareGeneratorEngine.ts` — brands=[Okuma, Fanuc (generic), Siemens (generic)] · classes=[mill (5-axis)]
- `PostProcessorPipelineEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorProductionPatternEngine.ts` — brands=[Hurco, Haas, Okuma, Fanuc (generic)] · classes=[?]
- `PostProcessorTelemetryEngine.ts` — brands=[Okuma] · classes=[lathe]
- `PostProcessorTrainerEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorTransformerEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorTribalKnowledgeIntegrationEngine.ts` — brands=[Haas, Okuma] · classes=[mill (3-axis), mill (5-axis), lathe, wedm-wire]
- `PostProcessorUltimateAIEngine.ts` — brands=[Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis)]
- `PostProcessorUnificationEngine.ts` — brands=[Hurco, Haas, Mazak, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), lathe, wedm-wire]
- `PostProcessorUnifiedDeepReasoningEngine.ts` — brands=[Hurco, Haas, Mazak, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), mill (5-axis)]
- `PostProcessorUnifiedPhysicsOrchestrationEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorVerificationEngine.ts` — brands=[Okuma] · classes=[?]
- `PostProcessorVideoKnowledgeNeuralEngine.ts` — brands=[Hurco, Haas, Mazak, DMG Mori, Brother, Okuma, Fanuc (generic), Siemens (generic), Mitsubishi] · classes=[mill (3-axis), mill (5-axis), lathe, mill-turn]
- `PPEndToEndPostGeneratorEngine.ts` — brands=[Okuma] · classes=[mill (5-axis), lathe]
- `PPMachineSpecificPostEngine.ts` — brands=[Hurco, Haas, Okuma, Mitsubishi] · classes=[mill (3-axis), lathe]
- `PPOkumaTurningPostEngine.ts` — brands=[Okuma] · classes=[lathe]
- `PPSinkerEDMPostEngine.ts` — brands=[Okuma, Mitsubishi] · classes=[mill (3-axis), lathe, wedm-sinker]
- `PPWireEDMPostEngine.ts` — brands=[Okuma, Mitsubishi] · classes=[mill (3-axis), lathe, wedm-wire]
- `RLPostProcessorEngine.ts` — brands=[Okuma] · classes=[lathe]
