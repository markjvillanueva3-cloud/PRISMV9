# Full-suite sweep [PARTIAL -- 16/32 shards; reaper+segfault+npx-127 limited on loaded machine; v3 pass continuing]

# Full-suite sweep -- failing-test inventory

Generated: 2026-06-23T02:26:31.203Z
Shards parsed: 16 | crashed shards: 20(exit 139)
Distinct failing files: **149**

## By failure nature
- assertion: 44
- other: 62
- type-error: 35
- timeout(env): 4
- load-error: 4

## By domain owner
- **unclassified**: 84
- **mike/wedm**: 22
- **delta/cad**: 9
- **whiskey/lathe**: 8
- **kilo/cam**: 7
- **oscar/speed-feed**: 5
- **india/ai-training**: 4
- **fleet-infra**: 3
- **echo/post-processor**: 2
- **hotel/business**: 2
- **xray/blueprint-vision**: 1
- **quality**: 1
- **charlie/quoting**: 1

## Failing files (by domain)

### unclassified (84)
- `src/__tests__/ActionsRouterAndRecommend.test.ts` -- assertion [shards 4]
- `src/__tests__/advanced-chip-engagement.test.ts` -- other [shards 3]
- `src/__tests__/aiReasoningDispatcher.test.ts` -- other [shards 4]
- `src/__tests__/algorithm-benchmarks.test.ts` -- assertion [shards 17]
- `src/__tests__/algorithm-calculate-audit.test.ts` -- assertion [shards 11]
- `src/__tests__/AlgorithmRegistryWiring.test.ts` -- assertion [shards 11]
- `src/__tests__/awarenessMiddleware-U-AWR12.test.ts` -- assertion [shards 16]
- `src/__tests__/batch25-engines.test.ts` -- type-error [shards 6]
- `src/__tests__/batch35-final-coverage.test.ts` -- other [shards 3]
- `src/__tests__/batch8-engines.test.ts` -- assertion [shards 9]
- `src/__tests__/BayesianAdaptiveEngine.test.ts` -- assertion [shards 8]
- `src/__tests__/cam-plugins/full-pipeline.integration.test.ts` -- other [shards 2]
- `src/__tests__/ck-ms13-exports.test.ts` -- timeout(env) [shards 6]
- `src/__tests__/ck-pipeline-wiring.test.ts` -- other [shards 12]
- `src/__tests__/edm-material-resolution.test.ts` -- other [shards 1]
- `src/__tests__/engines/AutonomousAIOrchestrationEngine.test.ts` -- assertion [shards 17]
- `src/__tests__/engines/CapacityPlanningEngine.test.ts` -- other [shards 2]
- `src/__tests__/engines/LearningLoopEngine.test.ts` -- type-error [shards 9]
- `src/__tests__/engines/ProgramLabelingPipelineEngine.test.ts` -- other [shards 1]
- `src/__tests__/error-context-engine.test.ts` -- assertion [shards 9]
- `src/__tests__/FeasibilityOrchestratorEngine.test.ts` -- type-error [shards 17]
- `src/__tests__/feedback-persistence.test.ts` -- other [shards 9]
- `src/__tests__/generalize-wiring.test.ts` -- assertion [shards 11]
- `src/__tests__/golf-hook-ordering.test.ts` -- type-error [shards 2]
- `src/__tests__/GrooveClassificationEngine.test.ts` -- other [shards 8]
- `src/__tests__/HookCreationGuardEngine.test.ts` -- type-error [shards 4]
- `src/__tests__/hooks/agentAutoUpdateHook.test.ts` -- other [shards 17]
- `src/__tests__/InboxPruneStale.test.ts` -- assertion [shards 16]
- `src/__tests__/input-validation.test.ts` -- type-error [shards 1]
- `src/__tests__/intelligence-engines-unit.test.ts` -- other [shards 6]
- `src/__tests__/kar-ms6-puoa-routes.test.ts` -- other [shards 8]
- `src/__tests__/kar-ms7-unified-orchestrator.test.ts` -- other [shards 1]
- `src/__tests__/learn-ingestion-pipeline.test.ts` -- other [shards 11]
- `src/__tests__/learn-knowledge-enrichment.test.ts` -- timeout(env) [shards 3]
- `src/__tests__/LocalAwarenessRouterEngine.test.ts` -- timeout(env) [shards 3]
- `src/__tests__/MachineLayerMerger.test.ts` -- assertion [shards 12]
- `src/__tests__/MasterIndexEngine.test.ts` -- other [shards 1]
- `src/__tests__/MaterialDatabaseEngine-U-AWR16.test.ts` -- other [shards 4]
- `src/__tests__/MemoryConsolidationEngine.test.ts` -- type-error [shards 11]
- `src/__tests__/MILL-AI-MS1.test.ts` -- other [shards 16]
- `src/__tests__/mill-cohesion.smoke.test.ts` -- other [shards 12]
- `src/__tests__/MILL-HARD-MS1.test.ts` -- other [shards 6]
- `src/__tests__/MILL-HARD-MS2.test.ts` -- other [shards 17]
- `src/__tests__/millDispatcher.test.ts` -- assertion [shards 3]
- `src/__tests__/MillingAILearningOrchestratorEngine.test.ts` -- other [shards 1]
- `src/__tests__/MultiAxisAggregatorEngine.test.ts` -- other [shards 12]
- `src/__tests__/MultiProcessCAMBridgeEngine.test.ts` -- other [shards 2]
- `src/__tests__/OllamaOffloadDashboard.test.ts` -- assertion [shards 16]
- `src/__tests__/operating-system-engines.test.ts` -- type-error [shards 17]
- `src/__tests__/PalletPoolOptimizerEngine.test.ts` -- type-error [shards 1]
- `src/__tests__/physics-fed-costing.test.ts` -- assertion [shards 16]
- `src/__tests__/pipeline-exec.test.ts` -- type-error [shards 8]
- `src/__tests__/PopulateTribalVault.test.ts` -- assertion [shards 3]
- `src/__tests__/post-pipeline-integrity-check.integration.test.ts` -- type-error [shards 12]
- `src/__tests__/pp-canned-cycles.test.ts` -- other [shards 2]
- `src/__tests__/pp-regression-pins.test.ts` -- other [shards 2]
- `src/__tests__/ppg-addin-e2e.test.ts` -- assertion [shards 16]
- `src/__tests__/ppg-physics-validation.test.ts` -- assertion [shards 8]
- `src/__tests__/QdrantEmbedderInjection.test.ts` -- assertion [shards 16]
- `src/__tests__/qt-regression-guard-hook.test.ts` -- other [shards 1]
- `src/__tests__/quality-dashboard-engine.test.ts` -- other [shards 8]
- `src/__tests__/read-optimizer-engine.test.ts` -- assertion [shards 4]
- `src/__tests__/realtime-dispatcher.test.ts` -- other [shards 9]
- `src/__tests__/resource-harvester-dispatcher.test.ts` -- assertion [shards 2]
- `src/__tests__/ResourcesWeeklyScan.test.ts` -- other [shards 8]
- `src/__tests__/safety-quality-handbook-integration.test.ts` -- load-error [shards 6]
- `src/__tests__/session-boot-truth.test.ts` -- type-error [shards 4]
- `src/__tests__/SessionConsolidateGraph.test.ts` -- other [shards 17]
- `src/__tests__/shop-floor-check-in-engine.test.ts` -- type-error [shards 9]
- `src/__tests__/skillLint.test.ts` -- assertion [shards 16]
- `src/__tests__/SkillMarketplaceScannerEngine.test.ts` -- other [shards 11]
- `src/__tests__/skillOrchBenchmark.test.ts` -- load-error [shards 1]
- `src/__tests__/sys-ms1-sub-dispatchers.test.ts` -- other [shards 2]
- `src/__tests__/tk-ms3-advisor.test.ts` -- other [shards 3]
- `src/__tests__/tk-ms7-llm-learning-loop.test.ts` -- type-error [shards 4]
- `src/__tests__/tool-catalog-vendor-fill.test.ts` -- assertion [shards 4]
- `src/__tests__/ToolCallHistogramEngineWiring.test.ts` -- assertion [shards 1]
- `src/__tests__/triple-model-engines.test.ts` -- type-error [shards 2]
- `src/__tests__/u-lsr23-stop-hooks-blocking.test.ts` -- assertion [shards 3]
- `src/__tests__/UnifiedSearchCoverage.test.ts` -- other [shards 1]
- `src/__tests__/unit/atomicWrite.test.ts` -- assertion [shards 3]
- `src/__tests__/v6-integration.test.ts` -- type-error [shards 17]
- `src/__tests__/WasteDetectorEngineWiring.test.ts` -- assertion [shards 3]
- `src/__tests__/WikiPrecheckBoostKeywords.test.ts` -- assertion [shards 17]

### mike/wedm (22)
- `src/__tests__/cwedm-full-chain-100.test.ts` -- other [shards 1]
- `src/__tests__/cwedm-launch-gate.test.ts` -- type-error [shards 9]
- `src/__tests__/cwedm-real-shop-programs.test.ts` -- type-error [shards 9]
- `src/__tests__/hooks/WEDMSafetyHooks.test.ts` -- other [shards 8]
- `src/__tests__/wedm-ai-macro-deep-integration.test.ts` -- assertion [shards 1]
- `src/__tests__/wedm-ai-macro-template.test.ts` -- other [shards 8]
- `src/__tests__/wedm-confidence-scoring.test.ts` -- type-error [shards 6]
- `src/__tests__/wedm-epack-validation.test.ts` -- type-error [shards 9]
- `src/__tests__/wedm-erp-routes-u07.test.ts` -- assertion [shards 1]
- `src/__tests__/wedm-feature-editor.test.ts` -- other [shards 2]
- `src/__tests__/wedm-full-pipeline-real.test.ts` -- other [shards 9]
- `src/__tests__/wedm-gauntlet.test.ts` -- type-error [shards 6]
- `src/__tests__/wedm-knowledge-base.test.ts` -- other [shards 8]
- `src/__tests__/wedm-live-output.test.ts` -- other [shards 6]
- `src/__tests__/wedm-pipeline-vs-shop.test.ts` -- assertion [shards 11]
- `src/__tests__/wedm-pulse-validation.test.ts` -- other [shards 11]
- `src/__tests__/wedm-setup-sheet.test.ts` -- assertion [shards 6]
- `src/__tests__/wedm-shop-inputs.test.ts` -- assertion [shards 16]
- `src/__tests__/wedm-thick-section-physics.test.ts` -- type-error [shards 8]
- `src/__tests__/wedm/wedm_hook_registration.test.ts` -- other [shards 3]
- `src/__tests__/WEDMBatchProgramAnalyzerEngine.test.ts` -- other [shards 1]
- `src/__tests__/WireEDMMasterAIEngine.test.ts` -- other [shards 3]

### delta/cad (9)
- `src/__tests__/cad-ai-deep.test.ts` -- assertion [shards 9]
- `src/__tests__/cadFileClassifier.test.ts` -- type-error [shards 8]
- `src/__tests__/cadRegressionDashboard.test.ts` -- type-error [shards 3]
- `src/__tests__/cadRegressionPipeline.test.ts` -- type-error [shards 2]
- `src/__tests__/cadTestCheckpoint.test.ts` -- type-error [shards 11]
- `src/__tests__/dispatchers/cadCamDeepAgiDispatcher.test.ts` -- type-error [shards 12]
- `src/__tests__/l4-hooks-cadences.test.ts` -- other [shards 8]
- `src/__tests__/remaining-cadences-unit.test.ts` -- other [shards 16]
- `src/__tests__/trilobe-eccentric.test.ts` -- type-error [shards 12]

### whiskey/lathe (8)
- `src/__tests__/lathe-gcode-completeness.test.ts` -- other [shards 1]
- `src/__tests__/LatheCriticalFixes.test.ts` -- type-error [shards 11]
- `src/__tests__/LathePostGeneratorUncertaintyEngine.test.ts` -- assertion [shards 6]
- `src/__tests__/LathePostgenForgeTriple.test.ts` -- assertion [shards 8]
- `src/__tests__/turning-full-production-plan.test.ts` -- other [shards 17]
- `src/__tests__/turning-insert-life-validation.test.ts` -- type-error [shards 1]
- `src/__tests__/turning-robust-optimizer.test.ts` -- type-error [shards 2]
- `src/__tests__/turning-stochastic-production-plan.test.ts` -- assertion [shards 4]

### kilo/cam (7)
- `src/__tests__/camDispatcher-StrategyValidation.test.ts` -- other [shards 17]
- `src/__tests__/CAMX-MS0.3-U08-IntelligentSequencingAdapter.test.ts` -- other [shards 2]
- `src/__tests__/ControllerStrategyValidatorEngine.test.ts` -- timeout(env) [shards 6]
- `src/__tests__/hypermill-kc-ms0-extraction.test.ts` -- load-error [shards 3]
- `src/__tests__/hypermill-ms7-millturn-medical.test.ts` -- assertion [shards 16]
- `src/__tests__/post-processor-strategy-validation.test.ts` -- type-error [shards 9]
- `src/__tests__/ppg-cross-cam.test.ts` -- other [shards 9]

### oscar/speed-feed (5)
- `src/__tests__/lathe-speed-feed-regression.test.ts` -- assertion [shards 17]
- `src/__tests__/MDOFStabilityEngine.test.ts` -- assertion [shards 11]
- `src/__tests__/process-damping-stability.test.ts` -- other [shards 12]
- `src/__tests__/TaylorToolLifeEngine.test.ts` -- other [shards 11]
- `src/__tests__/turning-wear-compensated-plan.test.ts` -- other [shards 3]

### india/ai-training (4)
- `src/__tests__/CADKnowledgeGraphEngine.test.ts` -- type-error [shards 3]
- `src/__tests__/dispatchers/businessDispatcherLoRAGate.test.ts` -- type-error [shards 9]
- `src/__tests__/p1-lora-pairs.test.ts` -- assertion [shards 8]
- `src/__tests__/tk-ms8-reinforcement-proactive.test.ts` -- other [shards 3]

### fleet-infra (3)
- `src/__tests__/perAgentHandoffWriterBan.test.ts` -- assertion [shards 1]
- `src/__tests__/sessionDispatcher.obsidian.test.ts` -- other [shards 9]
- `src/__tests__/WeeklySynthesisEngine.charlie-crashed.archive.2026-05-17.test.ts` -- type-error [shards 8]

### echo/post-processor (2)
- `src/__tests__/HurcoV11Aggressiveness.U-PPGH02.test.ts` -- other [shards 17]
- `src/__tests__/HurcoV11ProveOut.U-PPGH03.test.ts` -- other [shards 16]

### hotel/business (2)
- `src/__tests__/OntologyGrowthRegistryEngine.test.ts` -- load-error [shards 3]
- `src/__tests__/ToolCallThrottleEngineWiring.test.ts` -- assertion [shards 4]

### xray/blueprint-vision (1)
- `src/__tests__/blueprint-vision-ocr.test.ts` -- assertion [shards 11]

### quality (1)
- `src/__tests__/quality-dispatcher-spc-u-wire03.test.ts` -- other [shards 17]

### charlie/quoting (1)
- `src/__tests__/quote-routes.test.ts` -- other [shards 16]
