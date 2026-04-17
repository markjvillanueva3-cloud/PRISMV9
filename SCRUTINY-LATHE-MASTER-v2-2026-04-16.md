# SCRUTINY — LATHE MASTER ROADMAP v2
## Pass 2: "Print to CNC Program in One Shot" Quality Gate

**Date:** 2026-04-16
**Subject:** `LATHE-MASTER-UNIFIED-ROADMAP.md` v1.0.0 (867 lines, 7 phases, 62 units)
**Reference standard:** `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (1827 lines, 25 sub-phases)
**Product promise:** "Print → validated CNC program in one shot" with extreme intelligence + coordination
**Verdict:** v1 is directionally correct but **INSUFFICIENT** for the promise. **Expand to v2.**

---

## METHOD

1. Read `PRISM-INVENTORY-2026-04-15.md` — 1,869 engines, 509 formulas, 53 algorithms, 6,372 materials, 95,608 tools, 910 machines, 4,493 tribal tips, 36,929 JM DIE programs, 1,255 tests.
2. Read `UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` — benchmark for quality (per-section "Leverage existing", "Anti-patterns", "Integration with prior", FORGE-TRIPLE, measurable exit gates, rollback blocks).
3. Re-read `LATHE-MASTER-UNIFIED-ROADMAP.md` v1.
4. Launch 5 parallel research agents: (a) LoRA pipeline on JM Die archive, (b) Formal G-code verification via Z3/SMT, (c) MTConnect/OPC-UA on Okuma OSP-P300L, (d) Bayesian + causal inference for CNC uncertainty, (e) Digital twin + predictive simulation.
5. Cross-reference findings against v1 coverage — enumerate gaps.

---

## TOP 10 GAP DOMAINS (each becomes a new sub-phase)

### GAP 1 — Formal Verification (Z3/SMT) of G-code
**v1 status:** absent.
**Why critical:** "print → program in one shot" requires a **proof**, not a test, that no collision / envelope breach / modal violation exists on any control-flow path. 43 `PP*ValidatorEngine`s today catch syntactic + runtime-simulated issues only. Runtime simulators cover the executed trajectory; they do not cover every feasible macro branch / every modal state.
**Existing PRISM assets:**
- `FormalVerificationEngine.ts` — Z3-WASM wrapper, already exposes `prove(constraints)` / `satisfy()` over `LinearConstraint[]`.
- `PPAxisTravelValidatorEngine.ts`, `PPArcValidatorEngine.ts`, `PPRapidMoveValidatorEngine.ts`, `PPModalStateTrackerEngine.ts`, `PPPhysicsConstraintValidatorEngine.ts`, `PPFeedRateReasonabilityValidatorEngine.ts`, `PPToolChangeValidatorEngine.ts`, `PPSafeStartBlockValidatorEngine.ts`, `PostProcessorMachineKinematicsEngine.ts`.
**Gap:** no encoder that lifts modal state + per-block constraints into SMT-LIB2; no proof orchestrator that runs the 7 properties (envelope, feedrate cap, spindle cap, stock collision, tool-change-at-safe-Z, G0-not-in-material, home-before-M30).
**Performance data (agent):** 500-block lathe program, LIA/LRA + BMC depth 500: sub-500 ms on Z3 4.12. Arcs push to 3–8 s using NRA; existing 5 s time-box in `FormalVerificationEngine` is fine. Caching by block-hash further reduces repeat cost.
**v2 proposal:** **P0.1 Formal G-Code Verification** (6 units). Deliver `LatheProgramSMTEncoderEngine`, `LatheFormalProofEngine`, `LatheDenotationalSemanticsEngine`, `LatheTemporalPropertyCheckerEngine` (bounded LTL-to-SMT), skill `/lathe-prove`, hook `post-lathe-emit-proof.mjs`.

### GAP 2 — Local LLM + LoRA on JM Die Archive
**v1 status:** absent. v1 assumes existing `Lathe*Engine` TS classes carry enough reasoning. They do not reproduce JM Die's programmer idioms.
**Why critical:** print-to-program needs a generative policy that has seen every lathe program JM Die has shipped. 5,297 `.MIN` Okuma programs from real production are the ground truth; ignoring them wastes the single largest proprietary advantage the shop has.
**Existing PRISM assets:**
- `LatheFullArchiveTrainingEngine.ts` — already scans the archive, parses per-customer, emits per-program scores (0–100) and anti-patterns.
- `LatheJMDieKnowledgeEngine.ts` — extracts `CustomerPattern`, `MaterialParameters`, `OperationSequence`, `GCodeUsage`, `ToolPattern`.
- `LatheAITrainingEngine.ts` — `ParsedProgram`/`ProgramAnalysis`.
- `LathePostProcessorEngine.ts` — Okuma syntax validator (compile-pass metric).
- `LatheQualityGateEngine.ts` — validator-pass metric.
**Gap:** nothing converts these assets into a LoRA training corpus, nothing serves the adapted model, nothing evaluates generated programs against the same gates.
**Research findings (agent):** QLoRA on Qwen2.5-Coder:7b, 4-bit NF4 base + FP16 adapters, `r=16`, `alpha=32`, dropout 0.05, target all linear modules (q/k/v/o/gate/up/down). `per_device_batch=1`, `grad_accum=8`, `seq_len=2048`, `paged_adamw_8bit`, `lr=2e-4`, cosine schedule. Expected footprint ~10 GB on RTX 4080 16 GB, leaving 6 GB for activations. 6–8 hours for 3 epochs on ~4,000 filtered high-score programs. Serve via `peft.merge_and_unload` → GGUF Q5_K_M → Ollama Modelfile with Qwen2 ChatML template + PRISM system prompt. Eval = compile-pass rate (`LathePostProcessorEngine` syntax), validator-pass rate (`LatheQualityGateEngine` + `LatheCoaxialityRunoutValidatorEngine`), CodeBLEU (not vanilla BLEU — reorderings).
**v2 proposal:** **P0.2 Local LLM + LoRA Policy** (8 units). `LatheLoRAPipelineEngine`, `LatheLoRADatasetBuilderEngine`, `LatheLoRAEvalHarnessEngine`, `LatheLocalPolicyEngine` (Ollama bridge), skill `/lathe-train-lora` + `/lathe-gen-policy`, hook `pre-lathe-gen-require-policy.mjs`.

### GAP 3 — Bayesian + Causal Rigor
**v1 status:** v1 P1-U-LTH07 mentions "Bayesian uncertainty" but does not formalize. v1 treats existing `BayesianToolLifeEngine`/`BayesianInferenceEngine`/`CausalReasoningEngine`/`CounterfactualReasoningEngine` as solved.
**Why critical:** every "one-shot" output must come with **P(meets tolerance) ≥ 0.90** and **P(tool survives) ≥ 0.90** — point estimates will be rejected by production. Strategy comparison today uses CAMX-MS12 E1203 `CpkPredictionGateEngine`, which uses point μ/σ, not posteriors.
**Existing PRISM assets:**
- `BayesianInferenceEngine.ts` — has Beta-Binomial, Normal-Normal, Gamma-Poisson conjugates.
- `BayesianToolLifeEngine.ts` — Taylor prior + GP; no joint (C, n) posterior.
- `CausalReasoningEngine.ts` — hand-curated DAG only; no PC-algorithm discovery.
- `CounterfactualReasoningEngine.ts` — template edge strengths; no real `do`-operator.
- `CpkPredictionGateEngine.ts` — point-estimate Cpk.
- `StochasticCuttingForceEngine.ts` — LHS Monte Carlo.
**Gap:** no Normal-Inverse-Gamma conjugate for joint (C, n); no PC-algorithm DAG discovery (Fisher-Z test) over 1000 historical programs; no back-door g-formula adjustment `P(scrap | do(feed=1.1f))`; no hierarchical partial-pooling for cutting force across material groups × tool-material pairs; no Bayesian Cpk using non-central t posterior predictive.
**Research findings (agent):** NIG gives closed-form joint (C, n) posterior — no MCMC needed. PC algorithm ~300 LOC of pure JS. Back-door adjustment ~50 LOC. Hierarchical Gibbs ~200 LOC. Pure TS — do not add `bayesjs`/`pomegranate`; both are abandoned or Python-only.
**v2 proposal:** **P0.3 Bayesian + Causal Depth** (7 units). Extend `BayesianInferenceEngine` with NIG conjugate + hierarchical Gibbs, extend `BayesianToolLifeEngine` with joint (C, n) posterior, extend `CausalReasoningEngine` with PC-algorithm discovery, extend `CounterfactualReasoningEngine` with true do-operator, extend `CpkPredictionGateEngine` with `gateBayesian()` returning `P(Cpk ≥ 1.33)`, new `HierarchicalBayesianCuttingForceEngine`. Forge-Triple: skill `/lathe-posterior-gate` + hook `post-strategy-require-posterior-gate.mjs` + action `lathe_posterior_gate`.

### GAP 4 — Cross-Asset Intelligence Wiring
**v1 status:** absent except 1 line in P0-U-LTH02. v1 proposes new engines but does not wire the 29,569 registry entries into every decision.
**Why critical:** the 1,869-engine / 509-formula / 53-algorithm / 95,608-tool / 6,372-material / 910-machine / 4,493-tip inventory is useless if a single print-to-program call does not route through it. The Universal plan's 0.23–0.24 sub-phases exist precisely to fix this; LATHE-MASTER-v1 does not.
**Existing PRISM assets:** all 24 registries; `PRISMSelfAwarenessEngine`; `FormulaRegistry`; `AlgorithmRegistry`.
**Gap:** no lathe-specific orchestrator that, for every print input, scans (material → tool candidates → machine envelope → historical tribal tips for this material × operation × customer → applicable formulas → applicable algorithms → relevant stochastic engines) and returns a **provenance chain** naming every asset consulted.
**v2 proposal:** **P0.4 Asset Utilization Maximization** (8 units). `LatheAssetCoordinatorEngine`, `LatheProvenanceChainEngine`, `LatheDecisionReasoningLogEngine` (every decision logs [engine, formula, algorithm, tip, registry entry] it consulted), `LatheCoverageAuditEngine`, skill `/lathe-coverage-audit`, hook `post-lathe-decision-require-provenance.mjs`, exit gate = ≥ 90% of relevant assets touched on a representative sample.

### GAP 5 — AGI Safety Containment
**v1 status:** v1 PX-U-LTH58 says "AGI substrate layer" but does not specify corrigibility / goal-stability / self-modification approval.
**Why critical:** the existing lathe stack already ships `LatheAGICoreEngine`, `LatheMasterOrchestratorFacadeEngine`, `LatheUnifiedAIOrchestrator`. Near-AGI orchestration that can propose changes to its own dispatcher wiring, hook list, or formula registry is a live safety risk. Universal 0.25 sub-phase handles this globally; LATHE-MASTER needs the lathe-local version.
**Existing PRISM assets:**
- `AGISafetyContainmentEngine.ts` (from Universal 0.25.1) — expected.
- `SelfModificationProposalEngine.ts` (Universal 0.18).
- `EmergentBehaviorMonitorEngine.ts` (Universal 0.18).
- `CognitiveBudgetEngine.ts` (Universal 0.18).
- `BeliefStateEngine.ts` (Universal 0.18).
**Gap:** no lathe-specific **corrigibility gate** (human-approval required before any LatheAGICoreEngine action mutates physics constants, shop profile, dispatcher wiring, or formula registry); no **goal-stability invariant** (lathe agent must not rewrite its own objective function mid-execution); no **containment audit** (periodic check that lathe AGI stack has not added unlogged capabilities).
**v2 proposal:** **P0.5 AGI Safety Containment (Lathe Scope)** (5 units). `LatheAgentCorrigibilityGateEngine`, `LatheGoalStabilityInvariantEngine`, `LatheSelfModificationApprovalEngine`, `LatheContainmentAuditEngine`, hooks `pre-lathe-agi-action-corrigibility.mjs` + `post-lathe-agi-self-mod-approval.mjs`, skill `/lathe-containment-audit`.

### GAP 6 — Live Machine Data (MTConnect / OPC-UA / THINC)
**v1 status:** absent. v1 has no live-telemetry phase.
**Why critical:** "print → program" without a closed feedback loop from the 7 Okuma lathes is an open-loop guess. Actual cutting force, feed-override usage, spindle load vs predicted, per-block cycle time, tool life counter — all of this is the **ground truth for online learning**. Every production run must auto-close an `OutcomeTrackingEngine` record.
**Existing PRISM assets:**
- `MTConnectAdapterEngine.ts` — probe/current/sample/assets implemented (~1043 LOC).
- `MTConnectLiveStatusEngine.ts` — stream parser.
- `DigitalTwinEngine.ts` / `DigitalTwinSyncEngine.ts` — twin state + sync.
- `LatheActualFeedbackTuningEngine.ts` — post-run Taylor C / kc_scale recalibration.
- `OutcomeTrackingEngine.ts` — JSONL append-only outcome store.
- `TelemetryEngine.ts`, `PostProcessorTelemetryEngine.ts`.
- `MachineLearningFeedbackEngine.ts`, `FeedbackCollectorEngine.ts`, `PredictionFeedbackOrchestratorEngine.ts`.
**Gap:** no `OkumaOPCUABridgeEngine` (node-opcua), no `OkumaTHINCBridgeEngine` (for the 4000+ OSP variables unreachable via MTConnect), no `LiveTelemetryIngestEngine` that streams 10 Hz spindle-load / path-feedrate / axis-load / tool-life-counter into the outcome record, no `OutcomeAutoCompleteHook` triggered on M30 detection. OutcomeTrackingEngine's outcome schema lacks `liveTelemetrySummary{peakSpindleLoadPct, avgFeedOverridePct, alarmCodes[], blockWhereScrapped}`.
**Research findings (agent):** Okuma OSP-P300L MTConnect via free on-control adapter (port 5000, ~8 Hz). OPC-UA via THINC-API — 10 Hz subscription-mode. THINC SDK gives 100 Hz critical signals but requires on-control compilation + license. Use `node-opcua` (mature, 2M+ downloads) — do NOT use `mtconnect-agent` (that hosts an agent, doesn't consume).
**v2 proposal:** **P0.6 Live Machine Data** (7 units). `OkumaOPCUABridgeEngine`, `OkumaTHINCBridgeEngine`, `LiveTelemetryIngestEngine`, `LatheTelemetrySummaryEngine` (extends outcome schema), hook `on-m30-auto-complete-outcome.mjs`, hook `on-alarm-scrap-flag.mjs`, skill `/lathe-live-telemetry`.

### GAP 7 — Predictive World Simulation (per-block, pre-emission)
**v1 status:** partial. v1 P4 mentions "simulation" but does not budget 60 s per program for a complete pre-play that boolean-subtracts stock per block + computes per-block force/thermal/deflection.
**Why critical:** a valid "one-shot" program must be **pre-played** against a digital twin of the specific machine × stock × tool before it leaves the server. Vericut-class simulation in ≤ 60 s per program is the gate.
**Existing PRISM assets:**
- `CNCSimulationPipelineEngine.ts` — Vericut-class orchestrator.
- `LatheBlockEngagementSimulatorEngine.ts` — per-block DoC/feed/MRR emitter.
- `DigitalTwinEngine.ts`, `ProcessDigitalTwinEngine.ts`, `DigitalTwinFormulasEngine.ts`, `DigitalTwinSyncEngine.ts`.
- `CuttingForceEngine.ts` (Kienzle), `StochasticCuttingForceEngine.ts`.
- `ThermalSimEngine.ts`, `CuttingThermalEngine.ts`, `ThermalWearCouplingEngine.ts` (RK4 ODE), `InverseThermalCompensationEngine.ts`.
- `PartDeflectionEngine.ts`, `BoringBarDeflectionEngine.ts`.
- `ChatterStabilityLobeEngine.ts`, `SurfaceFinishPredictorEngine.ts`, `SPCProcessCapabilityEngine.ts`.
- `BooleanKernelEngine.ts` — CadQuery bridge for truthful kernel ops.
- `PredictiveWorldSimulatorEngine.ts`, `PredictiveSimulationEngine.ts`, `PhysicsAwareSimulationEngine.ts`, `CalibratedSimulationEngine.ts`, `NovelToolpathSimulatorEngine.ts`, `ToolpathSimulationEngine.ts`, `SimulationReportEngine.ts`, `SimulationVisualizationBridgeEngine.ts`.
**Gap:** no **lathe-specific orchestrator** that drives these in sequence against a 2D XZ manifold polygon inside the 60 s budget. No per-block boolean subtraction using `manifold-3d` WASM (≤ 5 ms per op). No thermal 1 D FD + deflection + collision on every G1/G2/G3 block.
**Research findings (agent):** use `manifold-3d` Apache-2 WASM for fast path (2 ms per boolean), fall back to `BooleanKernelEngine` CadQuery for final truthful validation. Represent lathe as 2 D XZ polygon. Allocation per block: 2 ms polygon subtract + 1 ms force + 3 ms thermal FD + 2 ms deflection + 2 ms collision ≈ 10 ms. 1000 blocks = 10 s, leaves 50 s of margin.
**v2 proposal:** **P0.7 Predictive Twin (60 s Pre-Play)** (7 units). `LathePredictiveTwinOrchestratorEngine`, `LatheManifoldXZPolygonEngine` (manifold-3d wrapper), `LathePerBlockPhysicsEngine` (drives force/thermal/deflection/collision per block), `LatheTwinValidationReportEngine`, skill `/lathe-preplay`, hook `pre-lathe-emit-require-preplay.mjs`.

### GAP 8 — Multi-Agent Orchestration
**v1 status:** absent. v1 treats engines as synchronous function calls.
**Why critical:** print-to-program has 4 parallelizable domains (blueprint OCR, feature recognition, strategy selection, force/thermal/deflection sim). Single-threaded orchestration leaves 3× latency on the table. Universal 0.17 activates `claude-flow`, `queen-coordinator`, `SPARC`, `pr-swarm` — LATHE-MASTER needs the lathe-local orchestration pattern.
**Existing PRISM assets:**
- `MultiAgentCoordinatorEngine.ts` (from Universal 0.17).
- `AgentRegistryEngine.ts`.
- `SlashCommandRecommenderEngine.ts`.
- `LatheMasterOrchestratorFacadeEngine.ts`, `LatheUnifiedAIOrchestrator.ts`.
**Gap:** no BUILDER-SUPERVISOR pattern per print-to-program request (Blueprint-OCR-Agent + Feature-Recognition-Agent + Strategy-Advisor-Agent + Sim-Validator-Agent + Signoff-Agent, supervised by `LatheSupervisorAgent`); no token-budget shared across agents; no consensus / disagreement resolution when two agents propose conflicting strategies.
**v2 proposal:** **P0.8 Multi-Agent Lathe Orchestration** (6 units). `LatheSupervisorAgent`, `LatheAgentBudgetAllocatorEngine`, `LatheAgentConsensusEngine`, `LatheAgentDisagreementLogEngine`, skill `/lathe-swarm`, hook `pre-lathe-swarm-budget-check.mjs`, reuse `claude-flow` / `queen-coordinator`.

### GAP 9 — Scientific Simulation Depth
**v1 status:** insufficient. v1 references `LatheChipMechanicsEngine` / `LatheThermodynamicsEngine` but does not specify tribology, fatigue, fracture mechanics.
**Why critical:** "extreme intelligence" means every physics layer the Universal plan covers in 0.21 Scientific Simulation (FEA, Thermal, CuttingForce, ChipFormation, SurfaceRoughness, ToolWear, VibrationModal, GeometricKernel, ToleranceStackup, DimensionalStability). The lathe stack already has most of these; v1 does not force them into the decision path.
**Existing PRISM assets:** all 10 Universal 0.21 engines expected to exist; `CuttingForceEngine`, `ThermalSimEngine`, `ToolWearProgressionEngine`, `StochasticToolLifeEngine`, `PartDeflectionEngine`, `SurfaceFinishPredictorEngine`, `ChatterStabilityLobeEngine`, `ResidualStressEngine`.
**Gap:** no lathe-specific **tribology** model (adhesion vs abrasion vs diffusion wear dominance per material × tool pair) — current wear is lumped into Taylor. No **fatigue** check on tooling / spindle / chuck jaws. No **fracture mechanics** gate for thin-wall parts.
**v2 proposal:** **P0.9 Scientific Simulation Depth (Lathe)** (6 units). `LatheTribologyWearModelEngine`, `LatheFatigueGateEngine` (tool + spindle + jaw), `LatheFractureMechanicsGateEngine` (thin-wall), `LatheResidualStressGateEngine`, `LatheDimensionalStabilityGateEngine`, hook `post-lathe-strategy-require-science-gates.mjs`.

### GAP 10 — Math Depth (Information-Theoretic / Optimal Control)
**v1 status:** absent. v1 mentions Bayesian but not information gain, active inference, or optimal-control formulation.
**Why critical:** Universal 0.20 Mathematical Foundations includes `InformationTheoreticEngine`, `ActiveInferenceEngine`, `OptimalControlEngine`, `CalibratedEnsembleEngine`, `RegretMinimizationEngine`. Lathe print-to-program must use **optimal control** (min cost subject to Cpk ≥ 1.33 + tool survival ≥ 0.90 + cycle time ≤ budget) not heuristic enumeration.
**Existing PRISM assets:** all Universal 0.20 engines expected; `StrategyRobustOptimizationEngine`, `StrategyStochasticRiskEngine`, `StrategyWorstCaseSelectorEngine` (CAMX-MS12 E1201/E1202/E1203).
**Gap:** no lathe-specific **optimal-control formulation** that composes CAMX-MS12 outputs into an argmax search with explicit Lagrangian; no **expected information gain** when choosing which strategy to preview next; no **calibrated ensemble** across `LatheOpusReasoningEngine` + `LatheDeepReasoningEngine` + LoRA policy + rule-based baseline.
**v2 proposal:** **P0.10 Math Depth (Lathe)** (5 units). `LatheOptimalControlFormulationEngine`, `LatheExpectedInfoGainEngine`, `LatheCalibratedEnsembleEngine`, `LatheRegretMinimizationEngine`, skill `/lathe-optimal-control`.

---

## DELTA SUMMARY

| Domain | v1 unit count | v2 new units | v2 total |
|---|---|---|---|
| P0 Audit | 6 | 0 | 6 |
| **P0.1 Formal Verification** | 0 | 6 | 6 |
| **P0.2 Local LLM + LoRA** | 0 | 8 | 8 |
| **P0.3 Bayesian + Causal** | 0 | 7 | 7 |
| **P0.4 Asset Wiring** | 0 | 8 | 8 |
| **P0.5 AGI Safety** | 0 | 5 | 5 |
| **P0.6 Live Machine Data** | 0 | 7 | 7 |
| **P0.7 Predictive Twin** | 0 | 7 | 7 |
| **P0.8 Multi-Agent** | 0 | 6 | 6 |
| **P0.9 Science Depth** | 0 | 6 | 6 |
| **P0.10 Math Depth** | 0 | 5 | 5 |
| P1 Speed/Feed | 8 | 0 | 8 |
| P2 Post-Gen | 10 | 0 | 10 |
| P3 Master Post | 8 | 0 | 8 |
| P4 Print-to-Program | 15 | 0 | 15 |
| P5 ERP | 10 | 0 | 10 |
| PX AGI cross-cutting | 5 | 0 | 5 |
| **TOTAL** | **62** | **+65** | **127** |

**Expected lines of markdown:** v1 867 lines → v2 ~2,500 lines (each new unit contributes ~20 lines of build/knowledge/exit/rollback).

---

## ANTI-PATTERNS (to embed per-phase in v2)

1. **"Just use the existing engine"** without routing through it. Wiring is the work. Use `LatheDecisionReasoningLogEngine` to prove the engine was actually invoked.
2. **Point estimates on safety-critical outputs.** Every Cpk / tool-life / feed / speed output needs a posterior, not a scalar. Reject PRs that regress to `number` where `{ value, confidence, source }` is available.
3. **Inline physics constants.** Kienzle kc1.1, Taylor C/n, material ρ/E — all imported from `physics/constants.ts`. Hook `constants-checker.mjs` blocks this already; keep it on.
4. **Stub simulators.** "Returns 42" placeholders inside `simulate*` functions violate hook `stub-detector.mjs`.
5. **Non-enforced validators.** A `PPSomethingValidator` that can be skipped defeats "one-shot" — every validator must be `MANDATORY` in `LatheEmissionPipeline`.
6. **Python side-trips.** PRISM is pure JS/TS. `bayesjs`, `pomegranate`, `pgmpy`, `PyMC3` all rejected. Do not call Python via node-FFI.
7. **Training data leakage.** LoRA eval set must exclude the jobs we train on. Customer-level splits, not random.
8. **Twin without truth.** Any new simulation engine must be gated against `OutcomeTrackingEngine` historical records (MAPE ≤ 15% on cycle time, MAPE ≤ 20% on peak force).
9. **AGI action without logging.** Any `LatheAGICoreEngine` action must emit a containment record; hook `post-lathe-agi-self-mod-approval.mjs` blocks otherwise.
10. **Feature-bag orchestrators.** One more `Lathe*OrchestratorEngine` without clear responsibility is a smell. Supervisor pattern only — named sub-agents with scoped budgets.

---

## INTEGRATION WITH PRIOR PHASES

- **CAMX-MS12** (complete 2026-04-16) gives us E1112 `FeatureStrategyKnowledgeBaseEngine`, E1096 `StrategyBenchmarkEngine`, E1099 `StrategyComparisonEngine`, E1107 `MachineLearningStrategyRankerEngine`, E1111 `ContextualStrategyOverrideEngine`, E1097 `StrategySequencingEngine`, E1101 `FixtureAwareStrategyEngine`, E1100 `BatchSizeStrategyEngine`, E1201 `StrategyStochasticRiskEngine`, E1202 `StrategyWorstCaseSelectorEngine`, E1203 `CpkPredictionGateEngine`. P0.3 extends E1203 with Bayesian posterior; P0.4 wires all 11 into lathe provenance chains.
- **Universal-Skills-Scripts-Hooks 0.12–0.25** (in flight) provides the AGI-substrate engines (ActiveInference, OptimalControl, CausalDiscovery, CalibratedEnsemble, AGISafetyContainment, SelfModificationProposal, EmergentBehaviorMonitor, CognitiveBudget, BeliefState, PeerLearning, PredictiveWorldSimulator, SymbolicRegression, FormalGCodeSemantics, FormalVerification, Neurosymbolic, ComplexityRouter, RegretMinimization, ConcentrationInequality, InformationTheoretic, PAC, Kolmogorov, DynamicalSystems, GameTheoretic, Topological, CausalDiscovery). LATHE-MASTER v2 references these as prerequisites, does not rebuild.
- **WEDM Phase 4** complete — autonomy levels, RUL, drift baselines, RL policy, transfer registry. LATHE-MASTER P0.5 mirrors WEDM's autonomy gating pattern.
- **Context-Pipeline-Perfection CPP-MS2-S4** (last commit 2f21336a) gives ContextChain + ContextWindowMap + SessionEventLog. LATHE-MASTER P0.8 multi-agent orchestration uses these for cross-agent context.

---

## 3-LOOP SCRUTINY SCORECARD (v1 baseline → v2 target)

| Dimension | v1 score | v2 target |
|---|---|---|
| Protocol Structure | 90 | 92 |
| Unit Naming | 95 | 95 |
| SMART CONFIG | 88 | 95 |
| Exit Gate Rigor | 75 | 90 |
| Forge-Triple | 85 | 95 |
| Physics Rigor | 80 | 95 |
| Feature Cascade | 85 | 95 |
| Dependency Graph | 90 | 95 |
| MCP Utilization | 90 | 95 |
| Cross-Roadmap Coherence | 90 | 95 |
| **Formal Verification** | **0** | **85** |
| **Local LLM** | **0** | **85** |
| **Bayesian Depth** | **50** | **90** |
| **Cross-Asset Wiring** | **20** | **90** |
| **AGI Containment** | **40** | **90** |
| **Live Data** | **0** | **85** |
| **Predictive Twin** | **40** | **90** |
| **Multi-Agent** | **20** | **85** |
| **Science Depth** | **70** | **92** |
| **Math Depth** | **60** | **90** |
| **Average** | **57** | **91** |

Threshold ≥ 70 (RGS Stage 10). v1 fails; v2 passes.

---

## ACTION ITEMS (this commit)

1. Write v2 SCRUTINY doc (this file).
2. Expand `LATHE-MASTER-UNIFIED-ROADMAP.md` from 867 → ~2500 lines.
3. Insert "CRITICAL SCRUTINY FINDINGS" section at the top (summary of GAP 1–10).
4. Append P0.1 through P0.10 (65 new units U-LTH63..U-LTH127) before existing P1.
5. Each new unit carries: Build, Knowledge Sources (Engines + Tribal + Formulas + Reference), Exit Gate (measurable), 4-LOOP, Rollback Block, FORGE-TRIPLE row, Depends on.
6. Update `mcp-server/data/milestones/LATHE-MASTER.json` envelope to v2.0.0.
7. Run 3-loop scrutiny (10 reviewers, avg ≥ 70).
8. Commit as `LATHE-MASTER/v2: expand scrutiny — formal verification + local LLM + live data + Bayesian rigor + predictive twin + multi-agent + AGI safety — 65 new units for print-to-program in one shot`.

---

**End of SCRUTINY v2.**
