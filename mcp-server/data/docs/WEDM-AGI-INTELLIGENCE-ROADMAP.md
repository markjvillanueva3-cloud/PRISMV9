# Wire EDM AGI-Level Intelligence Roadmap

## Vision
Build Wire EDM AI that achieves AGI-level manufacturing intelligence:
- **Autonomous program generation** from drawings alone
- **Self-optimizing parameters** that improve with every cut
- **Predictive maintenance** that prevents failures before they occur
- **Cross-domain reasoning** that synthesizes physics, tribal knowledge, and real-time feedback
- **Explainable decisions** with full provenance chains

## Current State (WEDM-HARDEN-MS1 Complete)

### Engines Built (16 total)
| Engine | LOC | Purpose |
|--------|-----|---------|
| WEDMNeuralTrainingEngine | 900 | 10 mathematical models (Bayesian, GP, Neural, Klocke, Kunieda, Taylor, Weibull, Monte Carlo) |
| WEDMProgramNeuralAnalysisEngine | 1,600 | Neural pattern recognition, anti-pattern detection, operation order validation |
| WEDMProgramOptimizerEngine | 830 | Program optimization to max potential |
| WEDMBatchProgramAnalyzerEngine | 950 | Batch analysis, ML training data extraction |
| WEDMCalculatorAIEngine | 500 | AI calculator for PRISM app |
| WEDMCompleteOrchestrationEngine | 2,500+ | Full print-to-program pipeline |
| WEDMDeepAIHardeningEngine | 1,200 | Deep AI integration across all engines |
| WEDMFeedbackCalibrationEngine | 230 | Bayesian calibration from operator feedback |
| WEDMSchedulingEngine | 200 | Machine reservation + AI scheduling |
| + 7 more supporting engines | | |

### Mathematical Models Implemented
1. **Bayesian Parameter Estimation** — Conjugate Gaussian updates
2. **Gaussian Process Regression** — RBF kernel for uncertainty quantification
3. **Neural Network** — 3-layer MLP with Xavier initialization
4. **Klocke Ra Model** — `Ra = C × Ie^α × ton^β × f^γ`
5. **Kunieda MRR Model** — `MRR = (Ie × ton × fp) / (ρ × Ce)`
6. **Taylor Wire Life** — `L = C × v^(-n) × T^(-m)`
7. **Weibull Wire Break** — `P(break) = 1 - exp(-(t/λ)^k)`
8. **Monte Carlo Optimization** — Simulated annealing
9. **Gradient Descent** — Momentum-based training
10. **Cross-Entropy Loss** — Classification head

---

## Phase 1: Perception & Sensing (WEDM-AGI-P1)

### P1-MS1: Machine State Awareness
Build real-time awareness of machine state from all available signals.

**Engines to Create:**
- `WEDMMachineStateEngine` — Aggregate machine state from sensors
- `WEDMSensorFusionEngine` — Fuse multiple sensor streams
- `WEDMDigitalTwinEngine` — Maintain virtual machine state

**Signals to Integrate:**
| Signal | Source | Update Rate | Purpose |
|--------|--------|-------------|---------|
| Axis position | Controller | 1ms | Kinematics, collision avoidance |
| Wire tension | Tension sensor | 10ms | Break prediction |
| Spark gap voltage | Power supply | 100µs | Stability monitoring |
| Current waveform | Shunt sensor | 100µs | Discharge characterization |
| Water resistivity | DI unit | 1s | Dielectric quality |
| Tank level | Float sensor | 1s | Flushing adequacy |
| Wire speed | Encoder | 10ms | Consumption monitoring |
| Temperature | Thermocouples | 100ms | Thermal compensation |

**Deliverables:**
- [ ] Real-time machine state JSON schema
- [ ] Sensor fusion with Kalman filtering
- [ ] Anomaly detection using statistical process control
- [ ] Digital twin with <10ms latency

### P1-MS2: Part & Workholding Recognition
AI that understands what's being cut and how it's held.

**Engines to Create:**
- `WEDMPartRecognitionEngine` — Identify part from camera/drawing
- `WEDMWorkholdingAnalysisEngine` — Analyze fixture, clamps, locations
- `WEDMAccessibilityEngine` — Determine wire access paths

**Capabilities:**
- CAD feature extraction (pockets, slots, contours)
- DXF/STEP/IGES automatic interpretation
- Start hole detection and accessibility scoring
- Workholding interference prediction
- Multi-part nesting optimization

### P1-MS3: Material Characterization
Real-time material property sensing and database.

**Engines to Create:**
- `WEDMMaterialCharacterizationEngine` — Infer material from spark behavior
- `WEDMMaterialDatabaseEngine` — Comprehensive material property DB

**Properties to Track:**
| Property | Method | Impact |
|----------|--------|--------|
| Electrical conductivity | Spark gap voltage | MRR, Ra |
| Thermal conductivity | Temperature rise | Heat affected zone |
| Hardness | Crater morphology | Surface integrity |
| Carbide content | Spark spectrum | Wire wear |
| Grain structure | Anisotropic Ra | Finish uniformity |

---

## Phase 2: Reasoning & Planning (WEDM-AGI-P2)

### P2-MS1: Causal Reasoning Engine
Understand cause-effect relationships in Wire EDM physics.

**Engines to Create:**
- `WEDMCausalReasoningEngine` — Causal graph traversal
- `WEDMCounterfactualEngine` — "What if" analysis
- `WEDMRootCauseEngine` — Automatic fault diagnosis

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

### P2-MS2: Multi-Objective Optimization
Pareto-optimal solutions across competing objectives.

**Engines to Create:**
- `WEDMMultiObjectiveEngine` — NSGA-II implementation
- `WEDMParetoEngine` — Pareto frontier analysis
- `WEDMTradeoffEngine` — Interactive preference elicitation

**Objectives to Balance:**
| Objective | Unit | Weight (configurable) |
|-----------|------|----------------------|
| Minimize Ra | µm | 0.25 |
| Maximize MRR | mm²/min | 0.20 |
| Minimize wire breaks | count | 0.20 |
| Minimize cost | $/part | 0.15 |
| Minimize cycle time | min | 0.10 |
| Maximize tool life | parts/wire | 0.10 |

### P2-MS3: Hierarchical Task Planning
Break complex parts into optimal cutting sequences.

**Engines to Create:**
- `WEDMHierarchicalPlannerEngine` — HTN planning
- `WEDMSequencingEngine` — Optimal cut ordering
- `WEDMTabStrategyEngine` — Slug retention planning

**Planning Levels:**
1. **Strategic** — Which features, which order, rough vs skim grouping
2. **Tactical** — Start holes, lead-ins, glue points, tab placement
3. **Operational** — Per-pass E-codes, offsets, feeds, M-code sequences

### P2-MS4: Transfer Learning
Apply knowledge from one material/machine to another.

**Engines to Create:**
- `WEDMTransferLearningEngine` — Domain adaptation
- `WEDMAnalogicalReasoningEngine` — Similar case retrieval
- `WEDMKnowledgeDistillationEngine` — Compress tribal knowledge

**Transfer Dimensions:**
| From | To | Transfer Method |
|------|-----|-----------------|
| D2 steel | A2 steel | Linear scaling (chromium content) |
| 1" thickness | 2" thickness | Square root scaling (flushing) |
| Mitsubishi FA | Sodick VL | E-code mapping table |
| Plain brass wire | Zinc coated | Efficiency factor (1.3×) |

---

## Phase 3: Learning & Adaptation (WEDM-AGI-P3)

### P3-MS1: Continuous Learning Loop
Learn from every cut without human intervention.

**Engines to Create:**
- `WEDMContinuousLearningEngine` — Online learning
- `WEDMDriftDetectionEngine` — Concept drift detection
- `WEDMModelUpdateEngine` — Safe model updates

**Learning Sources:**
| Source | Signal | Learning |
|--------|--------|----------|
| Actual vs predicted Ra | Metrology | Klocke coefficient calibration |
| Actual vs predicted time | Controller | MRR model calibration |
| Wire break events | Machine alarm | Weibull parameter update |
| Operator adjustments | HMI logs | Preference learning |
| Scrap reasons | Quality system | Failure mode modeling |

### P3-MS2: Few-Shot Learning for New Materials
Adapt to new materials with minimal test cuts.

**Engines to Create:**
- `WEDMFewShotEngine` — Meta-learning for materials
- `WEDMPrototypicalNetworkEngine` — Material embedding space
- `WEDMActiveQueryEngine` — Optimal test cut selection

**Protocol:**
1. First cut: conservative parameters (70% nominal)
2. Measure Ra, MRR, record spark behavior
3. Update material embedding in latent space
4. Find nearest neighbors in known material database
5. Transfer parameters with uncertainty bounds
6. Second cut: optimized parameters
7. Validate and commit to production

### P3-MS3: Reinforcement Learning for Control
RL agent for adaptive parameter control during cutting.

**Engines to Create:**
- `WEDMRLControllerEngine` — PPO/SAC agent
- `WEDMRewardShapingEngine` — Multi-objective reward
- `WEDMSimulationEngine` — Physics-based simulator for training

**State Space:**
- Spark gap voltage (normalized)
- Current waveform features (peak, RMS, frequency)
- Wire tension deviation
- Axis velocity error
- Estimated remaining cut distance

**Action Space:**
- ON time adjustment (±10%)
- OFF time adjustment (±10%)
- Feed rate override (±20%)
- Wire speed adjustment (±10%)
- Flushing pressure adjustment (±15%)

**Reward Function:**
```
R = w1*Ra_error + w2*MRR_achieved + w3*stability + w4*no_break
```

---

## Phase 4: Autonomy & Safety (WEDM-AGI-P4)

### P4-MS1: Fully Autonomous Operation
Run entire jobs without human intervention.

**Engines to Create:**
- `WEDMAutonomyEngine` — Autonomy level management (SAE J3016 adapted)
- `WEDMExceptionHandlerEngine` — Automatic recovery from errors
- `WEDMHumanHandoffEngine` — Graceful escalation to operator

**Autonomy Levels:**
| Level | Description | Human Role |
|-------|-------------|------------|
| L0 | Manual | Full control |
| L1 | Assisted | Real-time parameter suggestions |
| L2 | Semi-auto | Auto-adjust within bounds |
| L3 | Supervised | Auto-run, human monitors |
| L4 | Full auto | Lights-out production |
| L5 | Self-improving | Autonomous optimization |

### P4-MS2: Safety & Collision Avoidance
Guarantee safe operation under all conditions.

**Engines to Create:**
- `WEDMCollisionAvoidanceEngine` — Real-time collision detection
- `WEDMSafetyEnvelopeEngine` — Operating envelope constraints
- `WEDMFailsafeEngine` — Graceful degradation

**Safety Constraints:**
| Constraint | Limit | Action if Violated |
|------------|-------|-------------------|
| Wire tension | 500-2000g | Pause, reduce feed |
| Spark gap voltage | 20-80V | Adjust servo |
| Water resistivity | >3 MΩ·cm | Warn, slow feed |
| Tank level | >min_level | Pause, wait for fill |
| Axis position | ±travel limits | Emergency stop |
| Wire break count | <3 per profile | Escalate to operator |

### P4-MS3: Predictive Maintenance
Predict failures before they happen.

**Engines to Create:**
- `WEDMPredictiveMaintenanceEngine` — RUL estimation
- `WEDMDegradationModelEngine` — Component wear models
- `WEDMMaintenanceSchedulerEngine` — Optimal maintenance scheduling

**Components to Monitor:**
| Component | Degradation Model | Maintenance Action |
|-----------|-------------------|-------------------|
| Wire guides | Abrasive wear (Archard) | Replace at 200h |
| Power contacts | Erosion (cumulative energy) | Clean at 50h |
| DI resin | Capacity (cumulative ions) | Replace at 3 MΩ·cm |
| Filters | Clogging (pressure drop) | Replace at ΔP>1 bar |
| Wire tensioner | Fatigue (cycles) | Inspect at 10M cycles |

---

## Phase 5: Explainability & Trust (WEDM-AGI-P5)

### P5-MS1: Decision Explainability
Every AI decision traceable to physics and data.

**Engines to Create:**
- `WEDMExplainabilityEngine` — Decision provenance
- `WEDMFeatureAttributionEngine` — SHAP/LIME integration
- `WEDMCounterfactualExplainerEngine` — "What would change if..."

**Explanation Levels:**
1. **Parameter level** — Why this E-code, this offset?
2. **Strategy level** — Why 4 passes not 5?
3. **Physics level** — Klocke model predicts Ra = f(Ie, ton, f)
4. **Tribal knowledge level** — "JM Die always uses H175 master offset"

### P5-MS2: Confidence & Uncertainty
Quantify what the AI knows and doesn't know.

**Engines to Create:**
- `WEDMUncertaintyQuantificationEngine` — Epistemic vs aleatoric
- `WEDMCalibrationEngine` — Probability calibration
- `WEDMOutOfDistributionEngine` — Detect novel situations

**Uncertainty Sources:**
| Source | Type | Quantification |
|--------|------|----------------|
| Material variation | Aleatoric | Measurement noise |
| Limited training data | Epistemic | Bayesian posterior |
| Model mismatch | Epistemic | Ensemble disagreement |
| Sensor noise | Aleatoric | Kalman filter covariance |
| Unknown unknowns | Epistemic | OOD detection score |

### P5-MS3: Operator Trust Calibration
Build appropriate trust through transparency.

**Engines to Create:**
- `WEDMTrustCalibrationEngine` — Track operator trust
- `WEDMRecommendationConfidenceEngine` — Communicate AI confidence
- `WEDMFeedbackIntegrationEngine` — Learn from operator overrides

**Trust Indicators:**
- AI confidence score (0-100%)
- Historical accuracy on similar jobs
- Data coverage for this material/thickness
- Number of tribal knowledge tips applied
- Similarity to validated production programs

---

## Implementation Priority

### Immediate (Next 2 Weeks)
1. **P2-MS1** Causal Reasoning Engine — Foundation for all reasoning
2. **P3-MS1** Continuous Learning Loop — Enable self-improvement
3. **P5-MS1** Decision Explainability — Build operator trust

### Short-term (1 Month)
4. **P1-MS2** Part Recognition — Enable autonomous interpretation
5. **P2-MS2** Multi-Objective Optimization — Better tradeoff handling
6. **P4-MS2** Safety & Collision Avoidance — Enable higher autonomy

### Medium-term (3 Months)
7. **P1-MS1** Machine State Awareness — Real-time digital twin
8. **P2-MS3** Hierarchical Task Planning — Complex part handling
9. **P3-MS2** Few-Shot Learning — Rapid new material adaptation

### Long-term (6 Months)
10. **P3-MS3** RL Control — Adaptive real-time control
11. **P4-MS1** Full Autonomy — Lights-out production
12. **P4-MS3** Predictive Maintenance — Zero unplanned downtime

---

## Success Metrics

| Metric | Current | Target (AGI) | Measurement |
|--------|---------|--------------|-------------|
| Ra prediction error | ±20% | ±5% | vs CMM measurement |
| Cycle time prediction | ±15% | ±3% | vs actual |
| Wire break prediction | 60% recall | 95% recall | pre-break warning |
| First-part success | 85% | 99% | no scrap on first part |
| Parameter selection | Manual | Autonomous | human intervention rate |
| New material adaptation | 5 test cuts | 1-2 test cuts | cuts to production quality |
| Explanation satisfaction | N/A | >90% operator approval | survey |

---

## Dependencies

### External
- Machine controller API access (Mitsubishi M800, Sodick LQ)
- Sensor data streaming (OPC-UA or MTConnect)
- Metrology integration (CMM, profilometer)
- CAD system integration (STEP AP242)

### Internal (PRISM)
- PRISMIntelligenceLayer — AI reasoning backbone
- Physics constants database — Canonical Klocke/Kunieda/Taylor
- JM Die tribal knowledge — 69 tips, 296 playbook rules
- JM Die program archive — 36,939 files for training

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Model overfit to JM Die | Include Sodick/Makino/AgieCharmilles tech tables |
| Sensor latency | Edge compute, <10ms requirement |
| Operator distrust | Explainability-first design, gradual autonomy |
| Catastrophic wire break | Safety envelope always active |
| Concept drift | Continuous monitoring, automatic retraining |

---

*Generated: 2026-04-15*
*Milestone: WEDM-AGI-ROADMAP-v1*
