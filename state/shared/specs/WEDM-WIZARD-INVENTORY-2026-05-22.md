# Wire-EDM Wizard Inventory & Finalization Plan — 2026-05-22

**Slot:** charlie · **Iter:** 18→19 of operator-queued /goal · **Mode:** integration ("use what exists, don't rebuild")

This inventory is the groundwork for the operator's 4-phase directive:

> *"compile all leftover wire edm units and tasks | utilize /system-viz to search all engines, algorithms, formulas, prism app features to finalize full build out of print to cnc programs for wire edm / wire edm wizard | use the finalized product to improve all existing wire edm programs in the jm die system then, utilize it as training then produce brand new programs from new prints"*

---

## 1. The wizard EXISTS — `WEDMCompleteOrchestrationEngine.generateCompleteProgram()`

`mcp-server/src/engines/WEDMCompleteOrchestrationEngine.ts` is a real, in-place 30-stage wire-EDM print-to-CNC pipeline. Every stage cites physics traceability. Reachable via `prism_edm`:

| Action | Engine method |
|---|---|
| `wedm_generate_complete_program` | `wedmCompleteOrchestrationEngine.generateCompleteProgram(WEDMOrchestrationInput)` |
| `wedm_generate_optimized_program` | same — `generateCompleteProgram` (alias case) |

The 30 stages, grouped:

| Block | Stages |
|---|---|
| Geometry & assessment (1-6) | geometryImport · featureRecognition · materialAssessment · machineSelection · wireSelection · feasibilityCheck |
| Physics core (7-13) | publishedConditionLookup (Klocke) · pulseParameterGen · offsetComputation (DiBitonto) · feedRateOptimization (Kunieda) · passCountOptimization · recastSafetyGate (Carslaw & Jaeger) · skimFeedOptimization |
| Machine interface (14-16) | epackCodeGeneration · flushingStrategy · wireTensionCalc |
| Toolpath & G-code (17-23) | toolpathStrategy · slugManagement · startHolePlanning · gcodeGeneration (Mitsubishi/Sodick/Makino/Agie/Fanuc) · arcReversal · uvTaper · wireBreakRecovery |
| Verification & output (24-30) | backplotGeneration · cycleTimeEstimation · costEstimation · setupSheetGeneration · confidenceScoring · surfaceIntegrityCheck · (30th — see engine) |

**Conclusion: the canonical wizard is `wedm_generate_complete_program`.** The "finalize" directive is NOT a wholesale rebuild — it's consolidation + gap-closure (sections 3-5 below).

---

## 2. Existing dispatcher surface (charlie's wedm/edm domain)

`prism_edm` exposes **115+ `wedm_*` actions** plus electrode/sinker/laser/waterjet/grinding peers — full action list embedded in the dispatcher tool description.

**Four orchestration entry points exist (potential consolidation):**

| Action | Routes to | Role |
|---|---|---|
| `wedm_generate_complete_program` / `wedm_generate_optimized_program` | `WEDMCompleteOrchestrationEngine.generateCompleteProgram` | **The canonical 30-stage wizard.** |
| `wedm_print_to_program` | `printToProgram.generate` (via `getEngine` helper) | Generic print-to-program facade — may route to the canonical engine or to a thinner pipeline. Needs verification. |
| `wedm_run_pipeline` | `qualityOrchestrator.run_pipeline` | Quality-orchestrator-flavored full run — likely shares the same engine under a different intent. |
| `wedm_studio_pipeline` | `EDMProgramAssemblerEngine.assembleWireEDM` | Studio-UI-flavored entry point — leaner, possibly older. |

**Finalization action item (FA-1):** Verify which of the 4 entry points routes to `WEDMCompleteOrchestrationEngine`. Designate `wedm_generate_complete_program` as the canonical wizard. Add deprecation comments to the other 3 (do NOT delete — reversibility rule). One spec doc note in the dispatcher header documents the canonical choice.

---

## 3. Still-orphan WEDM engines (post-U-WIRE-WEDM-OUTCOME-3, 2026-05-22)

After this session's wiring (commit `50a3bd3d80` absorbed `WEDMWireSpoolConsumptionEngine` + `WEDMTaperErrorBudgetEngine` + `WEDMSlugTabRetentionEngine`), **55 WEDM/WireEDM engines remain zero-dispatcher-reference.** The 2026-05-07 audit still lists 58, but 3 are now wired (audit is 15-day stale and needs regeneration).

### Tier-A (highest leverage for the operator's directive)

| Cluster | Engines | Wizard role |
|---|---|---|
| **Post-processor family** | `WEDMPostTypes`, `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}Engine` (6) | The 6 brand-specific post-processors. May be transitively wrapped by `wedm_post_*` (6 actions exist) — **needs WIRE-EXEMPT verification BEFORE wiring** (duplicate-action risk per the duplication guard). If they're not transitively reached, expose as `wedm_post_{vendor}_emit` (one action per brand). |
| **Program improvement loop** | `WEDMBatchProgramAnalyzerEngine`, `WEDMProgramComparisonEngine`, `WEDMProgramOptimizerEngine`, `WEDMProgramVerificationEngine`, `WEDMProductionReadinessEngine` (5) | **This is the JM Die corpus-improvement loop (Phase 3).** Batch-analyze every existing program in `JM DIE/WIRE EDM/`, diff against the wizard's output, optimize, verify. **Highest ROI Tier-A.** |
| **Neural training + research** | `WEDMNeuralTrainingEngine`, `WireEDMResearchAIEngine`, `WEDMLearningLoopEngine`, `WEDMJobPatternLearnerEngine` (4) | **Phase 4 — feed Phase-3 improvements as training corpus, produce new programs from new prints.** |
| **Machine tech data** | `WireEDMMachineTechDataEngine` (1) | Likely the machine-spec backing for the wizard's stage-4 machineSelection. If this engine has Mitsubishi/Sodick/etc. published tech tables, wiring it ungates parts of the corpus-improvement loop. |

### Tier-B (deepen wizard capability)

| Cluster | Engines | Role |
|---|---|---|
| Planning | `WEDMSchedulingEngine`, `WEDMStrategyLibraryEngine`, `WEDMPartRecognitionEngine`, `WEDMTabStrategyEngine`, `WEDMStartPointOptimizationEngine`, `WEDMSequencingEngine`, `WEDMMultiProfileBatchEngine`, `WEDMSetupSheetEngine`, `WEDMHierarchicalPlannerEngine`, `WEDMRecipeAdaptationEngine`, `WEDMPartFamilyMatcherEngine`, `WEDMPartFamilyTemplateExtractorEngine`, `WEDMDwgImportEngine`, `WEDMHumanHandoffEngine` (14) | Compose stage-2 (featureRecognition), stage-18 (slugManagement), stage-19 (startHolePlanning) more richly. |
| Physics (remaining) | `WEDMWireBreakRiskCostEngine`, `WEDMMaterialSparkDatabaseEngine` (2) | Wire-break risk + material spark DB — direct inputs to stages 7-13. |
| Other AI/ML | `WireEDMDeepReasoningEngine`, `WireEDMPredictiveIntelligenceEngine`, `WireEDMSelfAwarenessIntegrationEngine`, `WireEDMDeepAIHardeningEngine`, `WEDMMaterialCharacterizationEngine`, `WEDMProcessCausalityEngine`, `WEDMWhatIfSimulatorEngine`, `WEDMParetoFrontierSearchEngine`, `WEDMParetoCacheEngine`, `WEDMTradeoffElicitationEngine`, `WEDMKnowledgeDistillationEngine`, `WEDMModelUpdateEngine`, `WEDMRLControllerEngine`, `WEDMRewardShapingEngine`, `WEDMRolloutSimulatorEngine`, `WEDMRLPolicyPersistence`, `WEDMRULEngine`, `WEDMMaintenanceSchedulerEngine`, `WEDMFewShotEngine`, `WEDMLoRADatasetBuilderEngine`, `WEDMLoRACadenceEngine`, `WEDMWireThreadingMinEngine`, `WEDMSlugTabRetentionEngine`*, `WEDMWirePremiumROIEngine` (~24) | Many are research-flavored — wire only the ones the wizard composes; defer the rest with WIRE-EXEMPT tags as appropriate. |

*WEDMSlugTabRetentionEngine just wired (audit stale).

---

## 4. JM Die wire-EDM corpus — Phase-3 input

`H:/PRISM/JM DIE/WIRE EDM/` exists. Top-level structure:
- Customer folders: `ACME/`, `ACUMENT SPENCER/`, `AGRATI/`, `AIR INDUSTRIES/`, … plus their `*.zip` archives.
- Loose `.mcx-8` programs at root (`123.mcx-8`, `16-140.mcx-8`, `16-60.mcx-8`).

Phase-3 ingestion path:
1. `prismSelfAwarenessEngine.getJMDieProgramPaths("wedm")` (or the equivalent) → list of program files.
2. Per file: parse → run `WEDMCompleteOrchestrationEngine.generateCompleteProgram` on the recovered input → compare wizard output to existing program via `WEDMProgramComparisonEngine` → propose optimizations via `WEDMProgramOptimizerEngine`.
3. Persist the diff + optimization rationale as training samples for Phase 4.

---

## 5. Next-iter action plan (per the 4-phase /goal)

| Phase | Action | Required wiring | Output |
|---|---|---|---|
| 1 | Compile leftover units | (this doc) | ✅ This inventory. |
| 2a | Designate canonical wizard | FA-1: dispatcher header doc-comment | One source-of-truth wizard action (`wedm_generate_complete_program`). |
| 2b | Verify Post-* WIRE-EXEMPT | Read `wedm_post_*` engine code, grep for vendor engine references | Either WIRE-EXEMPT tags OR `wedm_post_<vendor>_emit` 5 actions. |
| 3a | Wire program-improvement loop | Wire 5 Tier-A engines (`WEDMBatchProgramAnalyzerEngine`, `WEDMProgramComparisonEngine`, `WEDMProgramOptimizerEngine`, `WEDMProgramVerificationEngine`, `WEDMProductionReadinessEngine`) into `prism_edm`. Each as a `wedm_program_*` action. | 5 new actions, ~20-25 tests, full per-file scrutiny + 3-of-3. |
| 3b | Wire `WireEDMMachineTechDataEngine` | 1 engine | Ungates the corpus-improvement loop's machine-selection step. |
| 3c | Run corpus improvement | `prism_edm:wedm_batch_program_analyze` over `JM DIE/WIRE EDM/` | Improvement proposals + diff training-data dump. |
| 4a | Wire training cluster | `WEDMNeuralTrainingEngine`, `WEDMLearningLoopEngine`, `WireEDMResearchAIEngine`, `WEDMJobPatternLearnerEngine` (4 engines) | 4 new actions for the training/retraining loop. |
| 4b | New-program generation from new prints | Use the canonical wizard (`wedm_generate_complete_program`) with Phase-4-trained adapters | Demonstrable: feed a brand-new blueprint → out comes a wizard-generated program informed by the JM Die corpus. |

**Time budget reality:** each "Tier-A wiring" pass is 1 /loop iter (template = U-WIRE-WEDM-OUTCOME-3 just shipped; ~5 engines + ~20 tests + per-file scrutiny + 3-of-3 + commit). The 4-phase /goal is a **multi-iter campaign** of ~6-8 iters at the current cadence.

**Risk note:** the 4 orchestration entry points (section 2) is a real consolidation hazard — choosing the canonical wizard wrong means the corpus loop runs against the wrong engine. **FA-1 (designate canonical) must precede Phase 3a.**

---

**This document is advisory + must-human-verify.** Generated 2026-05-22 in slot:charlie iter 19 from a live dispatcher source-scan + the (15-day-stale) 2026-05-07 unwired-engine audit. Re-run `node scripts/audit-unwired-engines.mjs` to refresh the orphan list before Phase-3a starts.

---

## Amendment — iter 20 / FA-1 verification (2026-05-22)

**The 4 orchestration entry points are NOT redundant aliases — they are 4 DISTINCT engines with different scopes.** Source-scan confirmed each maps to its own engine class:

| Action | Engine | Lines | True scope |
|---|---|---|---|
| `wedm_generate_complete_program` / `wedm_generate_optimized_program` | `WEDMCompleteOrchestrationEngine.generateCompleteProgram` | 1502 | 30-stage physics-cited reference pipeline. Takes `WEDMOrchestrationInput` (already-parsed). |
| `wedm_print_to_program` | `WEDMPrintToProgramEngine.generate` | 1041 | Production-integrated pipeline with `awareness_consulted` stage. Takes raw DXF/contour directly — operator-facing print-input semantics. |
| `wedm_run_pipeline` | `EDMQualityOrchestratorEngine.run_pipeline` | 2612 | **Post-program quality verification + learning loop** — MS19+MS20 capstone. NOT the wizard; it's the verifier/learner that runs AFTER program generation. |
| `wedm_studio_pipeline` | `EDMProgramAssemblerEngine.assembleWireEDM` | 701 | Progressive-die assembly facade (combines corner analysis + multi-pass + M-codes + G41/G42). Narrower scope. |

**The real finalization problem (revealed):** `WEDMCompleteOrchestrationEngine` and `WEDMPrintToProgramEngine` are **parallel independent implementations**. Grep confirms NEITHER references the other (`grep WEDMCompleteOrchestrationEngine` in `WEDMPrintToProgramEngine.ts` → no matches; reverse → no matches). Two ~1000-1500-line engines do overlapping print-to-program work with no shared code path. This is the duplication the operator's "finalize" call is pointing at.

**Revised FA-1 recommendation:**
- **`wedm_print_to_program` is the operator-facing wizard entry** (right semantic match: takes a print, returns a program; production-integrated with the awareness middleware).
- **`WEDMCompleteOrchestrationEngine`'s 30-stage pipeline is the canonical reference implementation** (physics-traceable, deepest scope).
- **Phase-2b architectural refactor (deferred to a dedicated unit, NOT a single /loop iter):** make `WEDMPrintToProgramEngine` delegate to `WEDMCompleteOrchestrationEngine` internally — OR converge by extracting a shared pipeline core. This is a multi-day spike, not a /loop unit.
- **`wedm_run_pipeline` is NOT a competing wizard** — it's the post-program quality+learning capstone. Leave it alone; document its role.
- **`wedm_studio_pipeline` is a feature-specific assembler** for progressive-die structural work — narrower, keep as-is.

**Phase 3 (corpus improvement) can proceed against `wedm_print_to_program` as the operator-facing wizard** while the Phase-2b refactor is scheduled separately. The 5 program-improvement engines (`WEDMBatchProgramAnalyzer/Comparison/Optimizer/Verification/ProductionReadiness`) wire cleanly under either canonical — they consume program outputs, not inputs.

**Next-loop kickoff target (when the user fires the queued /goal):** start with Phase-3a (wire the 5 program-improvement Tier-A engines) — Phase-2b refactor can run in parallel as a separate slot's spike if desired. The corpus-improvement loop does NOT block on the duplication question.
