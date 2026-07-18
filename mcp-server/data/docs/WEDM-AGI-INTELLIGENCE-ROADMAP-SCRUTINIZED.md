# Wire EDM AGI-Level Intelligence Roadmap — SCRUTINIZED v2
**Date:** 2026-04-15 (Scrutinized 2026-04-16)
**Scope:** Complete AGI-grade Wire EDM intelligence — perception, reasoning, learning, autonomy, explainability
**Goal:** Autonomous program generation, self-optimizing parameters, predictive maintenance, cross-domain reasoning, explainable decisions

---

## Scope Snapshot

### Current Inventory (Production-Ready)
| Category | Count | LOC | Status |
|----------|-------|-----|--------|
| **WEDM Engines** | 47 | 78,618 | Production-ready |
| **Dispatcher Actions** | 175 | — | Production-ready |
| **Tribal Tips** | 80+ | 1,504 | Production-ready |
| **Controller Brands** | 6 | — | Production-ready |
| **Math Models** | 10 | — | Production-ready |
| **Safety Hooks** | 5 | ~500 | Partial |

### What Must Be Built (AGI Gap)
| Type | Count | Location |
|------|-------|----------|
| **Skills** | 8 | `~/.claude/commands/wedm-*.md` |
| **Scripts** | 12 | `mcp-server/scripts/wedm-*.ts` |
| **Hooks (new)** | 11 | `mcp-server/src/hooks/wedm-*.ts` |
| **AGI Engines (Phase 1-5)** | 32 | `mcp-server/src/engines/WEDM*.ts` |
| **State Files** | 8 | `data/state/WEDM_*.json` |
| **Playbooks** | 6 | `data/playbooks/wedm-*.json` |
| **Indexes** | 4 | `data/state/WEDM_*_INDEX.json` |
| **Total New Artifacts** | ~81 | |

### Coverage Targets After Full AGI Implementation
- **Ra prediction error**: ±20% → ±5%
- **Cycle time prediction**: ±15% → ±3%
- **Wire break prediction recall**: 60% → 95%
- **First-part success rate**: 85% → 99%
- **New material adaptation**: 5 cuts → 1-2 cuts
- **Operator explanation satisfaction**: N/A → >90%
- **Autonomy level**: L1 (assisted) → L4 (lights-out capable)

---

## CRITICAL SCRUTINY FINDINGS — READ FIRST

### Pass 1 — Inventory Analysis (2026-04-16)
- **47 production engines exist, 0 skills exist** — Claude cannot orchestrate what it cannot invoke
- **175 dispatcher actions exist, 0 workflow playbooks** — no guidance on action sequencing
- **5/16 hooks exist** — missing: calibration validation, neural sanity, injection guard, audit trails
- **Neural engines have no confidence bounds** — outputs not validated against physics limits
- **JM Die profile hardcoded** — no dynamic shop profile injection

### Pass 2 — Architecture Gaps
- **No sensor fusion layer** — Phase 1 assumes sensors exist but no integration path
- **No digital twin state persistence** — machine state is transient, not checkpointed
- **No causal graph persistence** — cause-effect relationships computed but not stored
- **No Pareto frontier caching** — multi-objective recomputed from scratch each time
- **No transfer learning registry** — material→material scaling factors not indexed

### Pass 3 — Learning Infrastructure
- **No feedback loop closure** — `WEDMFeedbackCalibrationEngine` receives input but has no automated trigger
- **No drift detection** — model parameters updated but never checked for concept drift
- **No OOD detector** — novel materials processed without flagging as out-of-distribution
- **RL state space undefined** — Phase 3 mentions RL but no state/action/reward formalization

### Pass 4 — Safety & Autonomy
- **No autonomy level state machine** — L0-L5 described but no transition logic
- **No collision detection mesh** — collision avoidance assumes geometry but no mesh generator
- **No predictive maintenance baseline** — component RUL requires historical baselines not collected
- **No safety envelope runtime enforcement** — constraints listed but no real-time guard

### Pass 5 — Explainability
- **No SHAP/LIME integration** — feature attribution mentioned but no implementation path
- **No counterfactual generator** — "what if" requires perturbation engine not present
- **No trust calibration feedback** — operator override reasons not captured

### Pass 6 — Operational Integrity
- **No bootstrap for AGI stack** — Phase 1-5 engines gate on each other with no cold-start path
- **No hook ordering for AGI hooks** — 11 new hooks with undefined execution order
- **No schema versioning for state files** — 8 new state files without migration strategy
- **No perf budget for SessionStart** — AGI awareness injection could exceed latency limits
- **No regression suite for AGI engines** — neural/causal/RL outputs not tested for stability

---

## Existing Assets — LEVERAGE, DO NOT REINVENT

### Production Engines (47 total, USE these)
| Engine | LOC | Leverage For |
|--------|-----|--------------|
| `WEDMNeuralTrainingEngine` | 2,436 | P3 learning — 10 models already implemented |
| `WEDMProgramNeuralAnalysisEngine` | 1,888 | P1 perception — pattern recognition |
| `WireEDMDeepAIHardeningEngine` | 1,718 | Cross-engine AI — hardening layer |
| `WireEDMAGIOrchestrator` | 1,011 | Orchestration — AGI coordination |
| `EDMQualityOrchestratorEngine` | 2,612 | P5 explainability — quality reasoning |
| `WEDMFeedbackCalibrationEngine` | 229 | P3 learning — Bayesian updates |
| `WireEDMKnowledgeSynthesisEngine` | 1,465 | P2 reasoning — knowledge integration |
| `EDMMaterialMachineWireEngine` | 1,753 | P2 planning — selection logic |
| `StochasticEDMEngine` | 349 | P5 uncertainty — Monte Carlo |

### Existing Math Models (10 total, USE these)
1. Bayesian Parameter Estimation — conjugate Gaussian
2. Gaussian Process Regression — RBF kernel
3. Neural Network — 3-layer MLP, Xavier init
4. Klocke Ra Model — `Ra = C × Ie^α × ton^β × f^γ`
5. Kunieda MRR Model — `MRR = (Ie × ton × fp) / (ρ × Ce)`
6. Taylor Wire Life — `L = C × v^(-n) × T^(-m)`
7. Weibull Wire Break — `P(break) = 1 - exp(-(t/λ)^k)`
8. Monte Carlo — simulated annealing
9. Gradient Descent — momentum-based
10. Cross-Entropy Loss — classification

### Existing Hooks (5 total, EXTEND these)
- `wedm_action_safety_gate` — extend for AGI action sequences
- `wedm_completeness_check` — extend for AGI state validation
- `wedm_physics_bounds` — extend for neural output validation
- `wedm_machine_capability` — extend for autonomy level checks
- `wedm_quality_gate` — extend for AGI confidence thresholds

### Existing Tribal Knowledge (USE, don't duplicate)
- `wedm-knowledge-tips.ts` — 80+ tips, confidence-scored
- Wire breakage prevention, surface finish, thick sections, taper, flushing, setup, safety

---

## Phase 0 — AGI Foundation Layer (PREREQUISITE)

### 0.1 — Skills Architecture (8 skills)

| Skill | Purpose | Actions Orchestrated | Line Budget |
|-------|---------|---------------------|-------------|
| `/wedm-program` | Drawing → complete program | 12 actions (parse→feasibility→select→toolpath→gcode) | 400 |
| `/wedm-feasibility` | Feasibility assessment | 4 actions (parse→assess→conductivity→thickness) | 200 |
| `/wedm-cost` | Cost estimation | 5 actions (estimate_time→wire_consumption→cost→doc) | 250 |
| `/wedm-batch` | Batch programming | 6 actions (batch_analyze→optimize→pattern→schedule) | 300 |
| `/wedm-controller` | Machine/controller selection | 4 actions (select_machine→select_wire→ecode_family) | 200 |
| `/wedm-troubleshoot` | Wire break diagnosis | 5 actions (diagnose→predict_break→recovery→tips) | 300 |
| `/wedm-ai-advisor` | Neural parameter optimization | 6 actions (neural_*→optimize→calibrate) | 350 |
| `/wedm-jm-die` | JM Die shop context | Profile injection + customer patterns | 150 |

**Exit Gate:** All 8 skills invokable from CLI, each executes correct action sequence.

### 0.2 — Scripts for Diagnostics (12 scripts)

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `wedm_geometry_diagnostic.ts` | Validate DXF/STEP geometry | file path | validation report |
| `wedm_ecode_selector.ts` | Select E-code family | material + machine | E-code recommendation |
| `wedm_param_comparison.ts` | Compare parameter sets | 2 parameter sets | diff table |
| `wedm_batch_orchestrator.ts` | Orchestrate batch jobs | job list | execution plan |
| `wedm_wire_calculator.ts` | Wire consumption estimate | contour + passes | wire meters + cost |
| `wedm_finish_troubleshoot.ts` | Surface finish diagnosis | Ra target + actual | root cause + fix |
| `wedm_capability_report.ts` | Controller capability matrix | controller list | capability table |
| `wedm_calibration_validator.ts` | Validate calibration data | feedback data | validity score |
| `wedm_setup_formatter.ts` | Format setup sheet | setup data | PDF/HTML |
| `wedm_similarity_scorer.ts` | Program similarity | 2 programs | similarity % |
| `wedm_utilization_report.ts` | Machine utilization | date range | utilization stats |
| `wedm_cost_sensitivity.ts` | Cost sensitivity analysis | base cost + vars | sensitivity matrix |

**Exit Gate:** All 12 scripts runnable, produce valid output for test inputs.

### 0.3 — Safety Hooks (11 new hooks)

| Hook | Trigger | Logic | Block Condition |
|------|---------|-------|-----------------|
| `hook_wedm_calibration_validate` | PreTool wedm_feedback_* | Validate feedback data quality | confidence < 0.5 |
| `hook_wedm_neural_sanity` | PostTool wedm_neural_* | Validate neural outputs in bounds | Ra < 0 OR Ra > 20 |
| `hook_wedm_gcode_injection` | PreTool wedm_generate_gcode | Scan for injection patterns | malicious G-code detected |
| `hook_wedm_quality_audit` | PostTool wedm_override_quality | Log override to audit trail | always log, never block |
| `hook_wedm_workflow_monitor` | PreTool wedm_* | Track multi-action progress | workflow timeout |
| `hook_wedm_ecode_consistency` | PreTool wedm_generate_gcode | Validate E-code matches machine | mismatch detected |
| `hook_wedm_taper_limits` | PreTool wedm_solve_taper | Validate UV angle ≤ machine max | angle > machine_max |
| `hook_wedm_tension_safety` | PreTool wedm_* | Wire tension in safe range | tension > 2000g OR < 500g |
| `hook_wedm_batch_deps` | PreTool wedm_batch_* | Check for circular dependencies | cycle detected |
| `hook_wedm_cost_confidence` | PostTool wedm_estimate_cost | Warn if confidence < 70% | warn only |
| `hook_wedm_schedule_conflict` | PreTool wedm_schedule | Check machine availability | double-booking |

**Exit Gate:** All 11 hooks registered, fire on correct triggers, block/warn as specified.

### 0.4 — Workflow Playbooks (6 playbooks)

| Playbook | Workflow | Steps | Triggers |
|----------|----------|-------|----------|
| `wedm_drawing_to_program.json` | Complete program generation | 12 steps | /wedm-program |
| `wedm_wire_break_diagnosis.json` | Wire break troubleshooting | 6 steps | /wedm-troubleshoot |
| `wedm_new_material_learning.json` | Adapt to new material | 8 steps | unknown material |
| `wedm_batch_optimization.json` | Batch job optimization | 5 steps | /wedm-batch |
| `wedm_quality_gate_review.json` | Quality gate override flow | 4 steps | quality gate fail |
| `wedm_parameter_tuning.json` | Neural parameter optimization | 7 steps | /wedm-ai-advisor |

**Exit Gate:** All 6 playbooks parse, execute in dry-run, produce expected action sequences.

### 0.5 — State Files & Indexes (12 files)

| File | Purpose | Schema |
|------|---------|--------|
| `WEDM_MACHINE_STATE.json` | Live machine state snapshot | axes, tension, voltage, water |
| `WEDM_DIGITAL_TWIN.json` | Digital twin checkpoint | full machine state + history |
| `WEDM_CAUSAL_GRAPH.json` | Cause-effect relationships | nodes + edges + weights |
| `WEDM_PARETO_CACHE.json` | Cached Pareto frontiers | objective sets → solutions |
| `WEDM_TRANSFER_REGISTRY.json` | Material transfer factors | from→to→scaling |
| `WEDM_AUTONOMY_STATE.json` | Current autonomy level + transitions | L0-L5 state machine |
| `WEDM_FEEDBACK_LEDGER.jsonl` | Feedback history (append-only) | calibration entries |
| `WEDM_DRIFT_BASELINE.json` | Concept drift baselines | model→baseline stats |
| `WEDM_PROGRAM_INDEX.json` | Index: program → features | fast lookup |
| `WEDM_MATERIAL_INDEX.json` | Index: material → programs | fast lookup |
| `WEDM_CONTROLLER_INDEX.json` | Index: controller → capabilities | fast lookup |
| `WEDM_TELEMETRY_RING.json` | Ring buffer: recent invocations | last 1000 calls |

**Exit Gate:** All 12 files have Zod schemas, versioned, load/save works.

---

## Phase 1 — Perception & Sensing (WEDM-AGI-P1)

### P1-MS1: Machine State Awareness (3 engines, 2 hooks)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P1-01 | `WEDMMachineStateEngine.ts` | 600 | Aggregate machine state from sensors |
| U-P1-02 | `WEDMSensorFusionEngine.ts` | 800 | Fuse sensor streams with Kalman filter |
| U-P1-03 | `WEDMDigitalTwinEngine.ts` | 1,000 | Maintain virtual machine state, <10ms latency |
| U-P1-04 | `hook_wedm_sensor_anomaly` | 100 | Detect sensor anomalies via SPC |
| U-P1-05 | `hook_wedm_twin_sync` | 100 | Sync digital twin on state change |

**Signals to Integrate:**
| Signal | Source | Rate | Purpose |
|--------|--------|------|---------|
| Axis position | Controller | 1ms | Kinematics, collision |
| Wire tension | Sensor | 10ms | Break prediction |
| Gap voltage | Power supply | 100µs | Stability |
| Current waveform | Shunt | 100µs | Discharge characterization |
| Water resistivity | DI unit | 1s | Dielectric quality |
| Wire speed | Encoder | 10ms | Consumption |
| Temperature | Thermocouples | 100ms | Thermal compensation |

**Leverage Existing:**
- `StochasticEDMEngine` for uncertainty propagation
- `WEDMNeuralTrainingEngine` Bayesian component for sensor fusion
- JM Die Mitsubishi FA-20S controller API (if available)

**Exit Gates:**
- [ ] `WEDM_MACHINE_STATE.json` updates within 10ms of sensor change
- [ ] Kalman filter reduces sensor noise by ≥50%
- [ ] Digital twin matches physical machine within 1mm position error
- [ ] Anomaly hook fires on simulated sensor failure (canary test)

### P1-MS2: Part & Workholding Recognition (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P1-06 | `WEDMPartRecognitionEngine.ts` | 700 | Identify part from DXF/STEP/camera |
| U-P1-07 | `WEDMWorkholdingAnalysisEngine.ts` | 500 | Analyze fixture, clamps, accessibility |
| U-P1-08 | `WEDMAccessibilityEngine.ts` | 400 | Wire access path planning |

**Leverage Existing:**
- `EDMDrawingInterpretationEngine` (886 LOC) — already parses DXF/STEP
- `EDMStartHoleSetupEngine` (1,349 LOC) — already plans start holes
- `EDMFeasibilityEngine` (938 LOC) — already checks accessibility

**Anti-Pattern:** Do NOT rebuild DXF parsing — extend `EDMDrawingInterpretationEngine`.

**Exit Gates:**
- [ ] Part recognition from DXF achieves ≥95% feature extraction accuracy
- [ ] Workholding analysis flags interference with ≥90% recall
- [ ] Accessibility scoring matches operator assessment on 10 JM Die test parts

### P1-MS3: Material Characterization (2 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P1-09 | `WEDMMaterialCharacterizationEngine.ts` | 600 | Infer material from spark behavior |
| U-P1-10 | `WEDMMaterialDatabaseEngine.ts` | 400 | Comprehensive material property DB |

**Leverage Existing:**
- `EDMMaterialMachineWireEngine` (1,753 LOC) — already has material selection
- `wedm-knowledge-tips.ts` — material-specific tips

**Properties to Track:**
| Property | Method | Impact |
|----------|--------|--------|
| Conductivity | Gap voltage | MRR, Ra |
| Thermal conductivity | Temperature rise | HAZ |
| Hardness | Crater morphology | Surface integrity |
| Carbide content | Spark spectrum | Wire wear |

**Exit Gates:**
- [ ] Material inference from spark behavior achieves ≥80% accuracy on known materials
- [ ] Database covers all JM Die materials (D2, A2, M2, S7, H13, WC, graphite)
- [ ] Unknown material triggers OOD flag (not silent classification)

---

## Phase 2 — Reasoning & Planning (WEDM-AGI-P2)

### P2-MS1: Causal Reasoning Engine (3 engines, 1 state file)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P2-01 | `WEDMCausalReasoningEngine.ts` | 1,200 | Causal graph traversal + intervention |
| U-P2-02 | `WEDMCounterfactualEngine.ts` | 800 | "What if" analysis |
| U-P2-03 | `WEDMRootCauseEngine.ts` | 600 | Automatic fault diagnosis |
| U-P2-04 | `WEDM_CAUSAL_GRAPH.json` | — | Persisted causal graph |

**Causal Relationships to Model:**
```
Discharge Energy → Crater Size → Ra
Discharge Energy → Temperature → HAZ
Wire Tension → Vibration → Ra uniformity
Flushing Pressure → Debris Evacuation → Stability
ON/OFF Ratio → Duty Cycle → MRR vs Ra tradeoff
Corner Radius → Wire Deflection → Accuracy
Taper Angle → Wire Lag → Dimensional error
```

**Leverage Existing:**
- `WireEDMDeepNeuralReasoningEngine` (1,029 LOC) — causal neural reasoning
- `WireEDMDeepReasoningEngine` (1,081 LOC) — complex scenario reasoning
- `TreeOfThoughtEngine` (if MIT 6.034 integrated) — CSP/Bayes

**Exit Gates:**
- [ ] Causal graph has ≥50 edges covering all key relationships
- [ ] Counterfactual queries return in <100ms
- [ ] Root cause diagnosis matches expert diagnosis on 10 test failures (≥80%)

### P2-MS2: Multi-Objective Optimization (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P2-05 | `WEDMMultiObjectiveEngine.ts` | 1,000 | NSGA-II implementation |
| U-P2-06 | `WEDMParetoEngine.ts` | 600 | Pareto frontier analysis + caching |
| U-P2-07 | `WEDMTradeoffEngine.ts` | 400 | Interactive preference elicitation |

**Objectives to Balance:**
| Objective | Unit | Weight |
|-----------|------|--------|
| Minimize Ra | µm | 0.25 |
| Maximize MRR | mm²/min | 0.20 |
| Minimize wire breaks | count | 0.20 |
| Minimize cost | $/part | 0.15 |
| Minimize cycle time | min | 0.10 |
| Maximize wire life | parts/wire | 0.10 |

**Leverage Existing:**
- `WEDMNeuralTrainingEngine` Monte Carlo component
- `WEDMProgramOptimizerEngine` (1,253 LOC) — program optimization

**Exit Gates:**
- [ ] NSGA-II produces Pareto frontier with ≥10 solutions
- [ ] Pareto cache hit rate ≥80% for repeated queries
- [ ] Tradeoff engine correctly adjusts weights based on user preference

### P2-MS3: Hierarchical Task Planning (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P2-08 | `WEDMHierarchicalPlannerEngine.ts` | 1,200 | HTN planning |
| U-P2-09 | `WEDMSequencingEngine.ts` | 600 | Optimal cut ordering |
| U-P2-10 | `WEDMTabStrategyEngine.ts` | 400 | Slug retention planning |

**Planning Levels:**
1. **Strategic** — Features, order, rough vs skim grouping
2. **Tactical** — Start holes, lead-ins, glue points, tabs
3. **Operational** — E-codes, offsets, feeds, M-codes

**Leverage Existing:**
- `EDMToolpathStrategyEngine` (1,224 LOC) — toolpath optimization
- `EDMWireSlugCornerTaperEngine` (961 LOC) — tab/slug planning
- `WEDMCompleteOrchestrationEngine` (3,465 LOC) — full orchestration

**Exit Gates:**
- [ ] HTN planner generates valid plans for 100% of JM Die test parts
- [ ] Sequencing reduces total travel by ≥15% vs naive order
- [ ] Tab strategy retains slugs on 100% of internal features

### P2-MS4: Transfer Learning (3 engines, 1 index)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P2-11 | `WEDMTransferLearningEngine.ts` | 800 | Domain adaptation |
| U-P2-12 | `WEDMAnalogicalReasoningEngine.ts` | 600 | Similar case retrieval |
| U-P2-13 | `WEDMKnowledgeDistillationEngine.ts` | 500 | Compress tribal knowledge |
| U-P2-14 | `WEDM_TRANSFER_REGISTRY.json` | — | Transfer factor index |

**Transfer Dimensions:**
| From | To | Method |
|------|-----|--------|
| D2 steel | A2 steel | Linear (Cr content) |
| 1" thickness | 2" thickness | sqrt (flushing) |
| Mitsubishi FA | Sodick VL | E-code mapping |
| Brass wire | Zinc coated | Efficiency 1.3× |

**Leverage Existing:**
- `WireEDMKnowledgeSynthesisEngine` (1,465 LOC) — knowledge synthesis
- `wedm-knowledge-tips.ts` — material-specific tips

**Exit Gates:**
- [ ] Transfer registry has ≥20 material→material mappings
- [ ] Analogical retrieval returns ≥5 similar cases in <50ms
- [ ] Knowledge distillation produces ≤100 actionable rules from 80 tips

---

## Phase 3 — Learning & Adaptation (WEDM-AGI-P3)

### P3-MS1: Continuous Learning Loop (4 engines, 2 hooks)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P3-01 | `WEDMContinuousLearningEngine.ts` | 1,000 | Online learning orchestration |
| U-P3-02 | `WEDMDriftDetectionEngine.ts` | 600 | Concept drift detection |
| U-P3-03 | `WEDMModelUpdateEngine.ts` | 500 | Safe model updates |
| U-P3-04 | `WEDM_DRIFT_BASELINE.json` | — | Drift baselines |
| U-P3-05 | `hook_wedm_learning_trigger` | 100 | Auto-trigger learning on feedback |
| U-P3-06 | `hook_wedm_drift_alert` | 100 | Alert on detected drift |

**Learning Sources:**
| Source | Signal | Learning |
|--------|--------|----------|
| Actual vs predicted Ra | CMM | Klocke calibration |
| Actual vs predicted time | Controller | MRR calibration |
| Wire break events | Alarm | Weibull update |
| Operator adjustments | HMI | Preference learning |

**Leverage Existing:**
- `WEDMFeedbackCalibrationEngine` (229 LOC) — Bayesian calibration
- `WEDMNeuralTrainingEngine` (2,436 LOC) — all 10 models

**Exit Gates:**
- [ ] Learning loop completes within 30s of feedback submission
- [ ] Drift detection fires on injected distribution shift (canary)
- [ ] Model updates preserve ≥95% of prior performance on held-out test set

### P3-MS2: Few-Shot Learning for New Materials (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P3-07 | `WEDMFewShotEngine.ts` | 800 | Meta-learning for materials |
| U-P3-08 | `WEDMPrototypicalNetworkEngine.ts` | 600 | Material embedding space |
| U-P3-09 | `WEDMActiveQueryEngine.ts` | 400 | Optimal test cut selection |

**Protocol:**
1. First cut: conservative (70% nominal)
2. Measure Ra, MRR, spark behavior
3. Update material embedding
4. Find nearest neighbors in DB
5. Transfer parameters with uncertainty
6. Second cut: optimized
7. Validate and commit

**Exit Gates:**
- [ ] New material adaptation achieves target Ra in ≤2 test cuts
- [ ] Embedding space clusters materials by ISO group
- [ ] Active query selects most informative test cut (info gain metric)

### P3-MS3: Reinforcement Learning for Control (4 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P3-10 | `WEDMRLControllerEngine.ts` | 1,200 | PPO/SAC agent |
| U-P3-11 | `WEDMRewardShapingEngine.ts` | 400 | Multi-objective reward |
| U-P3-12 | `WEDMSimulationEngine.ts` | 1,500 | Physics simulator for training |
| U-P3-13 | `WEDM_RL_POLICY.json` | — | Trained policy checkpoint |

**State Space:**
- Spark gap voltage (normalized)
- Current waveform features (peak, RMS, freq)
- Wire tension deviation
- Axis velocity error
- Remaining cut distance

**Action Space:**
- ON time ±10%
- OFF time ±10%
- Feed rate ±20%
- Wire speed ±10%
- Flushing pressure ±15%

**Reward:**
```
R = w1*Ra_error + w2*MRR + w3*stability + w4*no_break
```

**Exit Gates:**
- [ ] Simulator matches real machine within 10% on test scenarios
- [ ] RL agent improves Ra by ≥10% over rule-based baseline
- [ ] No safety constraint violations during RL rollout

---

## Phase 4 — Autonomy & Safety (WEDM-AGI-P4)

### P4-MS1: Fully Autonomous Operation (3 engines, 1 state file)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P4-01 | `WEDMAutonomyEngine.ts` | 800 | Autonomy level management |
| U-P4-02 | `WEDMExceptionHandlerEngine.ts` | 600 | Automatic recovery |
| U-P4-03 | `WEDMHumanHandoffEngine.ts` | 400 | Graceful escalation |
| U-P4-04 | `WEDM_AUTONOMY_STATE.json` | — | Autonomy state machine |

**Autonomy Levels:**
| Level | Description | Human Role |
|-------|-------------|------------|
| L0 | Manual | Full control |
| L1 | Assisted | Real-time suggestions |
| L2 | Semi-auto | Auto-adjust within bounds |
| L3 | Supervised | Auto-run, human monitors |
| L4 | Full auto | Lights-out production |
| L5 | Self-improving | Autonomous optimization |

**Exit Gates:**
- [ ] State machine transitions correctly on all trigger conditions
- [ ] Exception handler recovers from simulated wire break
- [ ] Human handoff completes within 5s with full context

### P4-MS2: Safety & Collision Avoidance (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P4-05 | `WEDMCollisionAvoidanceEngine.ts` | 1,000 | Real-time collision detection |
| U-P4-06 | `WEDMSafetyEnvelopeEngine.ts` | 600 | Operating envelope constraints |
| U-P4-07 | `WEDMFailsafeEngine.ts` | 400 | Graceful degradation |

**Safety Constraints:**
| Constraint | Limit | Action |
|------------|-------|--------|
| Wire tension | 500-2000g | Pause, reduce feed |
| Gap voltage | 20-80V | Adjust servo |
| Water resistivity | >3 MΩ·cm | Warn, slow |
| Tank level | >min | Pause, wait |
| Axis position | ±travel | E-stop |
| Wire breaks | <3/profile | Escalate |

**Exit Gates:**
- [ ] Collision detection fires on simulated collision path
- [ ] Safety envelope blocks parameter outside limits
- [ ] Failsafe engages within 100ms of limit violation

### P4-MS3: Predictive Maintenance (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P4-08 | `WEDMPredictiveMaintenanceEngine.ts` | 1,000 | RUL estimation |
| U-P4-09 | `WEDMDegradationModelEngine.ts` | 600 | Component wear models |
| U-P4-10 | `WEDMMaintenanceSchedulerEngine.ts` | 400 | Optimal scheduling |

**Components to Monitor:**
| Component | Model | Action |
|-----------|-------|--------|
| Wire guides | Archard wear | Replace at 200h |
| Power contacts | Cumulative energy | Clean at 50h |
| DI resin | Ion capacity | Replace at 3 MΩ |
| Filters | Pressure drop | Replace at ΔP>1 bar |
| Tensioner | Fatigue cycles | Inspect at 10M |

**Exit Gates:**
- [ ] RUL prediction within ±20% on historical failures
- [ ] Maintenance scheduler reduces unplanned downtime by ≥30%
- [ ] All 5 components have degradation models with validated parameters

---

## Phase 5 — Explainability & Trust (WEDM-AGI-P5)

### P5-MS1: Decision Explainability (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P5-01 | `WEDMExplainabilityEngine.ts` | 1,000 | Decision provenance |
| U-P5-02 | `WEDMFeatureAttributionEngine.ts` | 800 | SHAP/LIME integration |
| U-P5-03 | `WEDMCounterfactualExplainerEngine.ts` | 600 | "What would change if..." |

**Explanation Levels:**
1. Parameter — Why this E-code, this offset?
2. Strategy — Why 4 passes not 5?
3. Physics — Klocke model predicts Ra = f(Ie, ton, f)
4. Tribal — "JM Die always uses H175 master offset"

**Exit Gates:**
- [ ] Every parameter decision has traceable provenance
- [ ] Feature attribution highlights top-3 factors for Ra prediction
- [ ] Counterfactual explains how to achieve target Ra from current

### P5-MS2: Confidence & Uncertainty (3 engines)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P5-04 | `WEDMUncertaintyQuantificationEngine.ts` | 800 | Epistemic vs aleatoric |
| U-P5-05 | `WEDMCalibrationEngine.ts` | 400 | Probability calibration |
| U-P5-06 | `WEDMOutOfDistributionEngine.ts` | 500 | OOD detection |

**Uncertainty Sources:**
| Source | Type | Quantification |
|--------|------|----------------|
| Material variation | Aleatoric | Measurement noise |
| Limited data | Epistemic | Bayesian posterior |
| Model mismatch | Epistemic | Ensemble disagreement |
| Sensor noise | Aleatoric | Kalman covariance |
| Unknown unknowns | Epistemic | OOD score |

**Leverage Existing:**
- `StochasticEDMEngine` (349 LOC) — uncertainty propagation
- `WEDMNeuralTrainingEngine` GP component — confidence bounds

**Exit Gates:**
- [ ] Confidence intervals contain true value ≥95% of time (calibrated)
- [ ] OOD detector flags unseen materials with ≥90% recall
- [ ] Epistemic/aleatoric decomposition verified on synthetic data

### P5-MS3: Operator Trust Calibration (3 engines, 1 hook)

| Unit | Artifact | LOC | Purpose |
|------|----------|-----|---------|
| U-P5-07 | `WEDMTrustCalibrationEngine.ts` | 600 | Track operator trust |
| U-P5-08 | `WEDMRecommendationConfidenceEngine.ts` | 400 | Communicate AI confidence |
| U-P5-09 | `WEDMFeedbackIntegrationEngine.ts` | 400 | Learn from overrides |
| U-P5-10 | `hook_wedm_override_learn` | 100 | Capture override reasons |

**Trust Indicators:**
- AI confidence score (0-100%)
- Historical accuracy on similar jobs
- Data coverage for material/thickness
- Tribal knowledge tips applied
- Similarity to validated programs

**Exit Gates:**
- [ ] Operator satisfaction survey ≥90% "helpful explanations"
- [ ] Override reasons captured for 100% of overrides
- [ ] Trust score correlates with actual acceptance rate (r > 0.7)

---

## Implementation Priority

### Immediate (2 weeks)
1. **Phase 0** — Skills (8), Scripts (12), Hooks (11), Playbooks (6)
2. **P2-MS1** — Causal Reasoning Engine (foundation)
3. **P3-MS1** — Continuous Learning Loop (enables improvement)

### Short-term (1 month)
4. **P5-MS1** — Decision Explainability (trust building)
5. **P1-MS2** — Part Recognition (autonomous interpretation)
6. **P4-MS2** — Safety & Collision (enable higher autonomy)

### Medium-term (3 months)
7. **P1-MS1** — Machine State Awareness (real-time twin)
8. **P2-MS2** — Multi-Objective Optimization (better tradeoffs)
9. **P3-MS2** — Few-Shot Learning (new materials)

### Long-term (6 months)
10. **P3-MS3** — RL Control (adaptive real-time)
11. **P4-MS1** — Full Autonomy (lights-out)
12. **P4-MS3** — Predictive Maintenance (zero downtime)

---

## AGI Parity Test (MUST pass on any session)

1. **Query machine state** → Uses `WEDMDigitalTwinEngine`, not raw API (perception)
2. **Propose new program** → Auto-runs `/wedm-feasibility` before `/wedm-program` (reasoning)
3. **Hit quality gate fail** → Explains why via causal graph + suggests fix (explainability)
4. **Unknown material** → Flags OOD, proposes few-shot protocol (learning)
5. **Wire break during cut** → Auto-recovers within safe limits (autonomy)

All 5 must pass on any random session. **This is the WEDM AGI parity bar.**

---

## Anti-Patterns

- Do NOT rebuild DXF parsing — extend `EDMDrawingInterpretationEngine`
- Do NOT create new material DB — extend `EDMMaterialMachineWireEngine`
- Do NOT duplicate neural models — all 10 models are in `WEDMNeuralTrainingEngine`
- Do NOT add more tribal tips without `/dedup` check
- Do NOT train RL in production — use `WEDMSimulationEngine` first
- Do NOT skip OOD detection for new materials
- Do NOT emit explanations without provenance chain
- Do NOT allow L4 autonomy without L3 validation period

---

## Artifact Count Summary

| Phase | Engines | Hooks | Skills | Scripts | State Files | Total |
|-------|---------|-------|--------|---------|-------------|-------|
| Phase 0 | 0 | 11 | 8 | 12 | 12 | 43 |
| Phase 1 | 8 | 2 | 0 | 0 | 0 | 10 |
| Phase 2 | 12 | 0 | 0 | 0 | 2 | 14 |
| Phase 3 | 11 | 2 | 0 | 0 | 2 | 15 |
| Phase 4 | 9 | 0 | 0 | 0 | 1 | 10 |
| Phase 5 | 10 | 1 | 0 | 0 | 0 | 11 |
| **Total** | **50** | **16** | **8** | **12** | **17** | **103** |

---

*Scrutinized: 2026-04-16*
*Milestone: WEDM-AGI-ROADMAP-SCRUTINIZED-v2*
