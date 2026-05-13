# /wire-unwired Lathe Sprint — Dry-Run Proposal (2026-05-13)

Generated via the `/wire-unwired` skill's default (dry-run) mode. Operator: claude-7361b856 (delta slot, session 2026-05-13 12:00-13:30Z).

## Headline finding

Regenerating `state/shared/ENGINE_WIRING_INDEX.json` via `node scripts/build-engine-index.mjs` **surfaced 62 engines as freshly-wired** that were previously stale-classified as unwired. The detector works correctly on the lazy-import patterns turningDispatcher uses; the index was simply ~24h stale relative to peer chats' commits.

**Before regen:**
- Total wired: 2226
- Total unwired: 945
- Lathe unwired: 89

**After regen (no source changes):**
- Total wired: **2288** (+62 from stale-cache refresh)
- Total unwired: **923** (-22)
- Lathe unwired: **73** (-16)

This is a **zero-cost wiring delta**. No engine source touched; the gap was purely indexing freshness. **Add `node scripts/build-engine-index.mjs` to every peer chat's post-commit hook** to prevent this drift from recurring.

## Lathe-unwired tier classification (73 engines)

### Tier-A — clean `getStats` / `getConfig` patterns (4 engines, ~30 min sprint)
Standard wiring pattern from BATCH2 commit `bf041d0f5` (6 engines wired in one commit). Add lazy import + ACTIONS enum entry + schema + case. No engine source changes.

| Engine | Suggested action | Method | Risk |
|--------|-----------------|--------|------|
| LatheKnowledgeGraphEngine | `lathe_kg_statistics` | `getStatistics()` | low |
| LatheKnowledgeGraphEngine | `lathe_kg_last_build` | `getLastBuildTime()` | low |
| LatheDeepLearningEngine | `lathe_deep_learning_stats` | `getLearningStats()` | low |
| LatheGeneticAlgorithmEngine | `lathe_ga_default_config` | `getDefaultConfig()` | low |

**Pattern to apply** (per `mcp-server/src/tools/dispatchers/CLAUDE.md`):
1. Add lazy import case in `engineForName()` switch
2. Add action names to `ACTIONS` const (snake_case)
3. Add schema entry in `mcp-server/src/schemas/turningActionSchemas.ts`
4. Add `case "lathe_kg_statistics": ...` in main switch
5. Verify with `npx tsx scripts/run-dev-audit-chain.ts --edited-file <dispatcher path>`

### Tier-B — AI/intelligence engines (6 engines, ~60 min sprint)
Sister pattern to U-WIRE-LATHE-BATCH2. These are reasoning/learning engines with `getStats()`/`recommendStrategy()` style methods.

- LatheAIFeatureRegistration *(registration-only engine; verify it has a queryable surface before wiring)*
- LatheAIUltraEngine
- LatheDeepAIHardeningEngine
- LatheDeepLearningIntelligenceEngine
- LatheDeepLogicEngine
- LatheIntelligenceEngine

### Tier-C — LoRA cadence/dataset engines (27 engines, ~3h sprint)
Sister pattern to recent `lathe_lora_*` actions (lines 105-160 of turningDispatcher). Many have `getStats()`, `getConfig()`, `getActiveVersion()` getters per the BATCH5+ pattern.

LatheLoRA{CadenceOrchestrator,DatasetValidator,ExampleGenerator,InferenceGateway,KnowledgeCurator,KnowledgeGraph,MergeStrategy,ModelOptimizer,ModelSelector,Monitoring,NeuralBridge,NeuralOrchestrator,OllamaDeployer,PhysicsEvaluator,PipelineCoordinator,ProgramMiner,ProgramParser,QuantizationOptimizer,ReasoningChainInference,ReasoningEvaluator,ResourceManager,RewardShaping,SafetyEvaluator,TrainingMonitor,TrainingScript,TransferStrategy,TribalAugmentation,TribalExtractor}Engine.

**Recommended sub-batches**: 6 engines per commit, 5 commits total. Each commit follows the BATCH5 template (commit message format already established in the codebase history).

### Tier-D — Operator-triage required (36 engines, multi-session)
These have ambiguous engineering surfaces (orchestrator facades, transformers, planners, RL coordinators, post-processor variants). Each needs a `/forge` brainstorm to decide the right action shape before wiring.

LatheAdvancedOperations, LatheCAMIntelligence, LatheCuttingChemistry, LatheFullArchiveTraining, LatheMasterOrchestratorFacade, LatheMasterPostSelfAwareness, LatheMetaLearning, LatheMultiOpPlanner, LatheOpTimeBreakdown, LatheOpusReasoning, LathePartClassifier, LathePartCostModel, LathePartFamilyPlanning, LathePartingChipClearance, LathePartoffSafetyRail, LathePerformanceSLORegistry, LathePostGeneratorActiveLearning, LathePostGeneratorValidatorWiring, LathePostKnowledgeGraph, LathePostProcessorAI, LathePostRegressionTestGenerator, LatheProgramBacktrace, LatheProgramCatalog, LatheProgrammingCost, LatheProgrammingStyleSelector, LatheQualityGate, LatheReinforcementLearning, LatheReplayFrameCompiler, LatheResourceKnowledge, LatheSafetySignal, LatheSelfAwarenessIntegration, LatheSequenceOptimizer, LatheShopAwareOptimization, LatheSubSpindleTransferPurge, LatheThermodynamics, LatheTransferLearning, LatheTransformer, LatheUnifiedAI, LatheUnifiedAIOrchestrator, LatheUnifiedPhysicsOrchestration, LatheWorkholdingEngine.

## Recommended execution order

1. **Now (this commit):** Land this proposal + regenerated wiring index. Zero source-code risk.
2. **Next session:** Tier-A (4 wirings, single commit, ~30 min). Establishes the pattern and adds tests.
3. **Session +2:** Tier-B (6 wirings, single commit). Inherits Tier-A's pattern.
4. **Sessions +3 to +7:** Tier-C in 5 batches of 6 (matching the BATCH5 historical cadence).
5. **Session +8 onward:** Tier-D, one engine at a time after `/forge` brainstorm.

## Cross-worktree firewall awareness

All proposed edits are in `mcp-server/src/tools/dispatchers/turningDispatcher.ts` + `mcp-server/src/schemas/turningActionSchemas.ts` — these are CODE files in the main repo, not the firewall-protected state/shared/* or settings.json. Worktree forking is OPTIONAL but recommended if Lathe-domain peers are active concurrently (check `state/shared/chat-bus/claims/` via `/peer-file-isolation` before claiming the dispatcher).

## Verification checklist (for each wiring batch)

- [ ] Engine method exists + returns the expected shape
- [ ] Action name is snake_case + unique across all dispatchers
- [ ] Schema entry added in `turningActionSchemas.ts`
- [ ] Lazy-import added in `engineForName()` switch
- [ ] Case statement added in main switch
- [ ] Affected test file (`<Engine>.test.ts`) exists and passes
- [ ] Anti-regression: total action count strictly increased
- [ ] `node scripts/build-engine-index.mjs` re-run; new engine moves from `unwired` to `wired`

## See also

- `state/shared/ENGINE_WIRING_INDEX.json` — regenerated this session; 2288 wired / 923 unwired / 73 Lathe-unwired
- `mcp-server/src/tools/dispatchers/turningDispatcher.ts` — target file
- `mcp-server/src/schemas/turningActionSchemas.ts` — sister schema file
- `.claude/commands/wire-unwired.md` — skill spec (this proposal is the skill's default `--dry-run` output)
- `.claude/commands/dispatcher-coverage.md` — sister skill for the dispatcher-axis view
- [[feedback_conflict_fork_rule]] — apply if peer chats claim turningDispatcher.ts
- Commit history: `bf041d0f5` (BATCH2 — pattern reference)
