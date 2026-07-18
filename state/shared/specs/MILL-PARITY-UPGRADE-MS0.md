# MILL-PARITY-UPGRADE-MS0 — scoping spec

**Slot:** foxtrot (claude-047e0a72) · **Date:** 2026-05-25 · **Trigger:** operator /goal directive
> "scope pipeline improvements, node linking, bridging and wiring to improve formulas, algorithms for print to program for lathe, mill and wire | compile completed work from chats working on lathe and wire wizard and all other data from the past few days for both domains, expand and improve milling utilizing the same task and unit upgrades for the other two domains"

## TL;DR

PRISM has built out **234 Lathe engines** + **169 WEDM/Wire engines** but only **72 Mill engines**. Mill is the under-developed leg of the print-to-program triad. This spec inventories every Lathe and WEDM engine that has NO Mill equivalent — **186 Lathe + 161 WEDM = 347 candidate parity-upgrade units** — and prioritizes the P0/P1/P2 tiers for /loop pickup.

## Engine counts per domain (2026-05-25)

| Domain | Engine count | Print-to-program engines | LoRA stack | AGI/AI orchestration |
|---|---|---|---|---|
| **Lathe** | 234 | 11 | 48 | ~20 |
| **WEDM/Wire** | 169 | ~10 | substantial | substantial |
| **Mill** | 72 | 1 (MillPrintToProgramEngine) | 0 | ~5 |

**Bridge engines** (cross-domain): 229 (Adapters, Orchestrators, Pipelines, Bridges)

## Gap inventory (full lists)

- **Lathe-only patterns** (186) — `MILL-PARITY-LATHE-GAPS-2026-05-25.txt`
- **WEDM-only patterns** (161) — `MILL-PARITY-WEDM-GAPS-2026-05-25.txt`

## Prioritized roadmap

### P0 — Print-to-Program pipeline backbone (highest leverage)

The Lathe domain has a full 11-engine print-to-program pipeline. Mill has 1 engine. Building the 10 missing Mill equivalents is the most direct route to satisfying the /goal "expand and improve milling utilizing the same task and unit upgrades".

Lathe pattern → Mill build target:
1. `LathePrintFeatureStrategySelectorEngine` → `MillPrintFeatureStrategySelectorEngine`
2. `LathePrintIngestPipelineEngine` → `MillPrintIngestPipelineEngine`
3. `LathePrintProgramEmitterEngine` → `MillPrintProgramEmitterEngine`
4. `LathePrintProgramSignoffEngine` → `MillPrintProgramSignoffEngine`
5. `LathePrintSequencePlannerEngine` → `MillPrintSequencePlannerEngine`
6. `LathePrintSetupSelectionEngine` → `MillPrintSetupSelectionEngine`
7. `LathePrintToProgramDLIntelligenceEngine` → `MillPrintToProgramDLIntelligenceEngine`
8. `LathePrintToProgramKnowledgeGraphEngine` → `MillPrintToProgramKnowledgeGraphEngine`
9. `LathePrintToProgramReasoningEngine` → `MillPrintToProgramReasoningEngine`
10. `LathePrintToleranceStackEngine` → `MillPrintToleranceStackEngine`
11. `LathePrintToolpathGeneratorEngine` → `MillPrintToolpathGeneratorEngine`

### P1 — AGI/AI orchestration parity (mill-side cognitive stack)

Lathe has ~20 AGI/AI orchestration engines covering: ContinuousLearning, FeatureBridge, KnowledgeUnification, SafetyContainment, FeatureRegistration, AIOrchestration, AIReasoning, AITraining, AIUltra, ActiveLearning, AttentionMechanism, BayesianOptimization, CausalInference, DeepLearningIntelligence, DeepReasoning, EnsembleLearning, FullArchiveTraining, GeneticAlgorithm. **Mill has 5 — gap of 15+.**

### P2 — LoRA stack parity (mill model lifecycle)

Lathe has **48 LoRA engines** — full model lifecycle (adapter, cadence, dataset, deployment, drift, ensemble, hyperparameter, inference, monitoring, registry, training, validation). **Mill has 1-2.** This stack underwrites Mill's print-to-program AI quality. Pickup priority order:
1. LatheLoRADatasetBuilderEngine → MillLoRADatasetBuilderEngine (foundation)
2. LatheLoRATrainingScriptEngine → MillLoRATrainingScriptEngine
3. LatheLoRADeploymentEngine → MillLoRADeploymentEngine
4. LatheLoRAInferenceGatewayEngine → MillLoRAInferenceGatewayEngine
5. LatheLoRAPipelineEngine → MillLoRAPipelineEngine
(remaining 43 follow as backbone solidifies)

### P3 — Post-processor parity

LatheMasterPost{API,DeepReasoning,EnsembleCrossCheck,RegressionMatrix,Router,SelfAwareness,UnifiedOutput} + LathePostGenerator{ActiveLearning,Dialect,SpecIngest,Uncertainty,ValidatorWiring} → Mill equivalents. 7 master-post + 10 post-generator engines = 17 P3 units.

### P4 — Operator/tribal parity (foxtrot-lane fit)

Lathe has: AnomalyDetection, BlockEngagementSimulator, BlockTimeProfiler, CSSOptimizer, ChangeoverBrief, ChuckJawSetup, CoaxialityRunoutValidator, CoolantAdvisor, DeviationMap, EnvelopeBreachReplay, ExpertAdvisor, FirstPieceApproval, TribalInjector. **13 P4 units** — most natural fit for foxtrot follow-on /loop fires.

### P5 — ERP/cost/lifecycle parity (hotel-lane fit)

LatheActualCostReconciliation, LatheActualFeedbackTuning, LatheCustomerOrderLifecycle, LatheERPOrchestrator, LatheInventoryIntelligence, LatheJMDieKnowledge, LatheJobProfitabilityAnalytics. **7 P5 units** — hotel slot owns this lane per JULIETT-12CHAT-ALLOCATION.

## WEDM parallel — applicable lifts for Mill + Lathe

The WEDM domain pioneered patterns absent from both Lathe and Mill:
- **WEDMBlackboardEngine** — multi-engine coordination substrate
- **WEDMCalibrationReportEngine** — calibration lifecycle
- **WEDMDriftDetectionEngine** — process drift detection
- **WEDMFewShotEngine** + **WEDMFewShotMaterialEngine** — few-shot learning bridge
- **WEDMCornerPhysicsEngine** — analogous: MillCornerPhysicsEngine (mill corner-engagement physics)
- **WEDMCurrentDensityGuardEngine** — analogous: MillSpindleTorqueDensityGuardEngine

These represent **second-domain-to-multi-domain promotion** opportunities — not just Mill-side gaps but also Lathe-side gaps for some.

## Cross-domain bridge gaps (high-leverage wiring)

The 229 bridge engines hint at heavy cross-domain wiring already done. New bridges to build:
- **BlueprintOCR → 3-domain router** — single entry point dispatching to Lathe/Mill/WEDM print-to-program based on blueprint feature classifier
- **DomainParityValidator** — runtime engine that detects "this Lathe operation has no Mill equivalent" and surfaces the gap
- **CrossDomainStrategySynthesizer** — when a part has both turning + milling + wire-cut features, synthesize the multi-process strategy

## Recent shipped work (compile from 2026-05-22..25)

From git log scan, these milestones touched the 3 domains directly:
- **MS-CRITWIRE** (slot:oscar, iter27 U-CW-05) — wire spindle_torque... bridge work
- **CAD-PIPELINE-WIRE-MS0** (slot:delta — 10+ commits) — CAD topology + corpus + closed-loop for downstream P2P routing
- **HURCO-VM30I-FULL-PSN-MS0** (multiple slots, echo/papa) — Hurco VM30I full PSN tie-in for mill
- **MIT-COURSE-INTEGRATION** (multiple) — CAD-CAM course distillation
- **PSN-ENHANCE-MS0** (alpha/bravo) — graphiti + hybrid-retrieval substrate for cross-domain knowledge
- **FIRST-PART-PERFECT-MS0** (foxtrot iter29-iter52) — quality envelope + tribal septet
- **DEA-MS0** (slot:november) — diamond/laser/thermal/precision dormant-engine activations
- **KILO-CAM-MASTERY-MS0** (slot:kilo) — CAM mastery, ESPRIT deep-learning, SFC bridge
- **TOKEN-SAVINGS-ROUTER-MS0** (alpha) — route audit + LS-CAT enforce

## Execution plan for follow-on /loop fires

Each /loop iter pulls 1 unit from the prioritized list:
1. **/loop foxtrot** picks from P4 (operator/tribal) — natural foxtrot-lane fit
2. **/loop bravo** picks from P0/P1 (physics + AI orchestration) — bravo's physics lane
3. **/loop charlie** picks from P3 (post-processor) — wire/critwire-adjacent
4. **/loop hotel** picks from P5 (ERP/cost) — hotel-lane fit per JULIETT-12CHAT
5. **/loop kilo** picks from P2 (LoRA stack) — CAM/AI mastery lane
6. **/loop lima** continues P0 print-pipeline + MIT-OCW distillation crossover

Each unit follows the proven foxtrot tribal-corpus pattern:
- ~600 LOC engine + ~20-30 tests + dispatcher wiring
- handbook-grade source attribution + confidence-weighted output
- entry-level escalation + material/process safety warnings
- `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MILL-PARITY-UPGRADE-MS0]/U-<NAME>` commit format

## Scope notes for the operator

- This spec is **scoping only** — no engines built this session iter. The 23-engine FIRST-PART-PERFECT-MS0 deliverable (iter29-iter52) is the current chat's existing ship.
- The full 347-unit gap list is durably saved at `state/shared/specs/MILL-PARITY-{LATHE,WEDM}-GAPS-2026-05-25.txt` — peer slots can `cat | head -N` to pick units.
- **Don't aim for full parity** — many Lathe engines are domain-idiosyncratic (chuck-jaw, parting-chip-clearance, etc.) that DO NOT translate to mill. Filter the 347-list through domain applicability before building.

## Cross-references

- [[reference_tribal_septet_capstone_2026_05_24]] — current chat's prior delivery (proven engine-build pattern)
- [[reference_juliett_12chat_allocation_2026_05_17]] — slot-lane assignments
- `state/shared/specs/MILL-PARITY-LATHE-GAPS-2026-05-25.txt` — full 186-Lathe-engine gap list
- `state/shared/specs/MILL-PARITY-WEDM-GAPS-2026-05-25.txt` — full 161-WEDM-engine gap list
