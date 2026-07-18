# CAMX ROADMAP v21 — 62 Gap Fixes
## From Mathematical Completeness Agent (35 gaps) + Logic/Reasoning Agent (27 gaps)

---

## MATHEMATICAL GAP FIXES (35 gaps → 12 new units)

### U-MATH1: Fix 5 Physics Computation Gaps
```
/smart: OPUS/MAX | Role: cutting physics expert
FIXES:
  1. WEAR-STATE FORCE CORRECTION: When tool wear VB > 0.1mm,
     Fc_corrected = Fc × (1 + 0.5 × VB/VB_max). Wire ToolWearProgressionEngine
     into force computation at EVERY pipeline. Currently VB tracked in
     PostProcessorPipeline Phase 2 but NOT fed back to force model.

  2. SPINDLE POWER/TORQUE AT ACTUAL RPM: Check power AND torque against
     spindle curve at ACTUAL RPM, not nameplate max. SpindleTorqueCurveEngine
     has 8 spindle profiles. Wire: at Stage 9, query curve at computed RPM.
     Low RPM → torque limited. High RPM → power limited. Cross-over at knee speed.

  3. TEMPERATURE SCOPE: Compute temperature for EVERY operation when:
     - Material is ISO S (thermal conductivity < 15 W/mK)
     - Material is ISO H (hardness > 45 HRC)
     - Operation is grinding (always thermal-critical)
     - Cycle time > 10 minutes (cumulative heat buildup)
     NOT just "long programs."

  4. RUNOUT AS DEFLECTION SOURCE: Runout adds static radial offset δ_runout = TIR/2.
     Total effective deflection = δ_force + δ_runout. Wire holder TIR from
     ToolHolderDatabaseEngine (shrink-fit 3μm, collet 10μm, Weldon 15μm).
     Ra is already affected (SurfaceFinishPredictorEngine), but force-path
     deflection needs the offset too.

  5. PER-BLOCK MRR FOR CYCLE TIME: MRR_block = ae × ap × fz × z × RPM.
     Sum across all blocks for actual cycle time. CWEZBuffer computes
     instantaneous engagement → enables this. Wire into CycleTimeEstimatorEngine.

EXIT: All 5 physics gaps closed. /prism-review (physics reviewer) validates.
```

### U-MATH2: Add MC Uncertainty to ALL 9 Pipelines
```
/smart: OPUS/MAX | Role: uncertainty quantification
PROBLEM: Turning/milling/5-axis/mill-turn have ZERO MC uncertainty.
  Only grinding/EDM/laser/waterjet have 500-trial MC.

FIX: Add 500-trial MC to ALL 9 pipelines with these INPUT DISTRIBUTIONS:
  Material: kc1.1 ±10% (normal), mc ±7% (normal), HRC ±2 (uniform)
  Tool: runout 2-15μm (by holder type), diameter ±0.005mm, corner_radius ±0.01mm
  Machine: spindle_runout 2-8μm, thermal_growth 0-20μm, backlash 3-10μm
  Process: stock_size ±0.1mm, ambient_temp 15-30°C

OUTPUT per pipeline: CI95 on force, Ra, tool_life, cycle_time, cost_per_part.
  MANDATE: CI95 appears in EVERY pipeline output. Not optional.

SOBOL SENSITIVITY: After MC, compute Sobol indices (first-order + total).
  Output: "Top 3 variability contributors: material_hardness (31%),
  tool_runout (24%), thermal_growth (18%)"
  Wire UncertaintyPropagationPipelineEngine (has Sobol built in).

EXIT: All 9 pipelines output CI95. Sobol indices in output.
```

### U-MATH3: Add Taguchi Robustness to Strategy Selection
```
/smart: OPUS/HIGH
FIX: When OptimalStrategySelectionEngine evaluates top 3 strategies:
  Run DOETaguchEngine L9 array varying noise factors (material ±10%, runout, thermal).
  Compute S/N ratio per strategy.
  Strategy with best S/N = most ROBUST (least sensitive to variation).
  If robust strategy scores within 15% of top scorer → prefer robust.

EXIT: S/N ratio in strategy comparison output. Robust strategy flagged.
```

### U-MATH4: Define Cpk Trigger Threshold
```
FIX: Cpk prediction triggers when tolerance ≤ IT8 (approximately ±0.015mm for 25mm dim).
  Cpk ≥ 1.33 required (4-sigma process).
  Cpk ≥ 2.0 recommended for aerospace (6-sigma).
  If predicted Cpk < 1.33 → WARNING + recommend tighter process control
  If predicted Cpk < 1.0 → GATE: block program, recommend machine upgrade or strategy change.

EXIT: Cpk computed for every tolerance ≤ IT8. Clear threshold rules defined.
```

### U-MATH5: Add 5 Missing Mathematical Models
```
/smart: OPUS/MAX | Role: cutting science researcher
ADD TO FormulaRegistry + relevant engines:

  1. COLDING MODEL: Extended Taylor with economics.
     T = C_colding × Vc^(-1/n) × fz^(-1/m) × ap^(-1/p)
     Optimizes for MINIMUM COST, not just tool life.
     Wire into UltimateSpeedFeedEngine as "economic_optimization" mode.

  2. KRONENBERG: Fc = C × t^x × s^y (uses tensile strength not kc1.1).
     Alternative force model when kc1.1 unavailable for exotic alloys.
     Wire into KienzleForceModelEngine as fallback.

  3. ARCHARD WEAR: V_wear = K × F × L / H (abrasive flank wear volume).
     Complements Usui (crater wear). Wire into AdvancedWearPhysicsEngine.

  4. ZOREV STRESS: σ(x) = σ_max × (1 - x/lc)^n on rake face.
     Sticking zone length determines crater wear location.
     Wire into AdvancedWearPhysicsEngine.

  5. BRAMMERTZ KINEMATIC ROUGHNESS:
     Ra_brammertz accounts for previous revolution tooth marks.
     More accurate than fz²/32r for face milling and turning.
     Wire into SurfaceFinishPredictorEngine.

EXIT: 5 formulas in FormulaRegistry with evaluate(). Engines updated.
```

### U-MATH6: Add 7 Missing Statistical Methods
```
/smart: OPUS/MAX | Role: statistical methods expert
ADD TO relevant engines:

  1. BOOTSTRAP CI: In MonteCarloEngine, when sample_size < 30,
     use bootstrap resampling instead of normal CI.
     Critical for Bayesian updating with sparse shop data.

  2. SPRT (Sequential Probability Ratio Test): In StochasticToolLifeEngine,
     for real-time "change tool NOW vs keep cutting" decisions.
     Minimize observations needed for decision with controlled error.

  3. HMM (Hidden Markov Model): In ToolWearProgressionEngine,
     infer hidden wear state (fresh/moderate/severe/catastrophic)
     from observable signals (force trend, vibration, AE).

  4. HOTELLING T²: In SPCChartingEngine, for multivariate SPC
     when monitoring diameter + roundness + Ra simultaneously.
     Single T² chart replaces 3 correlated univariate charts.

  5. PCA: In GeneticOptimizer/ParticleSwarm, reduce 10+ dimensional
     parameter space to 3-4 principal components for faster search.

  6. ENTROPY/MUTUAL INFORMATION: In MachineLearningStrategyRankerEngine,
     model-agnostic feature importance ranking.

  7. COPULA DISTRIBUTIONS: In MonteCarloEngine, for correlated inputs.
     kc1.1 and mc are NOT independent — copula models the correlation.
     Without copula, MC overestimates uncertainty.

EXIT: 7 statistical methods implemented. Each has a vitest.
```

### U-MATH7: Name Specific Physics Models Per Machine Type
```
/smart: OPUS/HIGH
FIX: The roadmap currently says "engines exist" but never NAMES which
physics models each machine type uses. Explicitly specify:

  MILLING: Kienzle + ChipThinningCompensation + ToolDeflectionModel +
    SurfaceFinishPredictor + StabilityLobeDiagram + JaegerTempField
  TURNING: Kienzle(with approach angle) + NoseRadiusEngagement +
    RegenerativeChatter(1-DOF) + BarStockVibration + CSS speed model
  5-AXIS: Kienzle + D_eff variation + ScallopHeight(κ₁,κ₂) +
    SingularityAvoidance + RCSA assembly dynamics
  MILL-TURN: Turning physics + Milling physics + GripForceDuringTransfer +
    MultiChannelSync + BarStockVibration
  GRINDING: MalkinSpecificEnergy + JaegerBurnThreshold + VerkerkRoughness +
    GRatioWheelWear + DressingOverlapRatio
  WIRE EDM: SatoMRR + DiBitontoRecast + CarslawHAZ + WireLag(δ=FL²/8T) +
    WireBreakProbability
  SINKER EDM: KoenigMRR + ElectrodeWearRatio + RecastLayer + AdaptiveFlushing
  LASER: SchulzCuttingSpeed + BeerLambertAbsorption + YilbasRoughness +
    CarslawHAZ + SwiftHookWeldPenetration
  WATERJET: ZengKimSpeed + HashishRoughness + HashishTaper +
    BernoulliParticleVelocity + PierceFactorModel

EXIT: Every machine type has NAMED physics models, not just "engines exist."
```

---

## LOGIC GAP FIXES (27 gaps → 10 new units)

### U-LOGIC1: Unified Decision Trace Record
```
/smart: OPUS/HIGH
FIX: Define DecisionTraceRecord schema:
  { part_id, stages: [{
    stage_name, engine_used, input_summary, output_summary,
    decision_made, alternatives_considered: [{option, score, why_rejected}],
    override_applied, override_justification,
    tribal_tips_applied, playbook_rules_triggered,
    physics_validation: {force, power, deflection, Ra, Cpk},
    safety_check: {passed, margin_pct}
  }]}

Every pipeline outputs this record. Enables full traceability.
EXIT: Schema defined. Every pipeline populates it.
```

### U-LOGIC2: Edge Case Decision Protocols (10 scenarios)
```
/smart: OPUS/MAX | Role: manufacturing process planner
FIX: Define explicit protocols for each edge case:

  a. TIE-BREAKING: Score diff <5% → Taguchi S/N → tribal tip count →
     proven recipe history → simpler strategy → present both to user
  b. TOOL OUT OF STOCK: risk_score < 0.3 → substitute with warning.
     risk_score ≥ 0.3 → HALT + purchase recommendation + lead time
  c. PARTIAL OUTSOURCE: identify incapable features → group into outsource
     package → specify interface geometry (datum, allowance) → generate
     in-house program + outsource spec sheet
  d. PHYSICS DISAGREE: use MORE CONSERVATIVE for safety outcome. Log both.
     If >15% disagreement → flag for calibration data collection.
  e. HARDNESS UNKNOWN: use UPPER bound of grade range. Never default silently.
     If grade unknown → HALT, ask user with top-3 suggestions.
  f. COLD START (no recipe): 70% conservative derating. Flag as UNPROVEN.
     Generate test-cut program alongside production program.
  g. 6-SIDE PART: if >4 setups needed → recommend 5-axis/mill-turn with ROI.
     Datum chain Monte Carlo with cumulative tolerance per feature.
  h. DEADLINE EXCEEDED: aggressive params (within safety) → parallelize
     across machines → outsource → negotiate. Present options.
  i. TOOL LIFE < 1 PART: mid-part tool change at safe retract between features.
     Sister tool offset strategy. Re-approach probing.
  j. MULTI-PROCESS: ProcessSequenceEngine determines order (see U-LOGIC5).

EXIT: All 10 protocols defined. Each has a vitest edge case test.
```

### U-LOGIC3: Enforcement Agent Boundary Definition
```
/smart: OPUS/HIGH
FIX: Define explicit override scope:

  OVERRIDABLE (with justification):
    Strategy choice (within 20% of top score)
    Tool choice (must be in catalog or crib)
    S/F values (within ±30% of physics baseline)
    Machine choice (must be capable per Stage 4)
    Pass depth/width (within deflection/power limits)
    Setup sequence (must maintain datum chain)

  NON-OVERRIDABLE (Layer 3 expanded):
    Safety gates (collision, power, deflection, chatter, breakage, workholding)
    Material properties (published physical constants)
    Machine physical limits (RPM, power, travel, taper)
    Controller syntax rules (G-code grammar per dialect)
    Drawing tolerances (cannot be relaxed)
    Regulatory requirements (AS9100, ITAR, ISO 13485)

  JUSTIFICATION MINIMUM STANDARD:
    (1) original result, (2) override result, (3) quantitative delta,
    (4) reasoning source (tip ID, rule ID, or calculation),
    (5) confidence level

  QUALITY GATE ON OVERRIDES:
    If override is WORSE on ALL metrics → automatically blocked.
    If worse on some, better on others → tradeoff must be explicit.

  USER DISABLE:
    enforcementMode: 'full' | 'advisory' | 'disabled'
    Advisory: overrides logged but not applied
    Disabled: pure Layer 1 + Layer 3, no AI judgment

EXIT: Override scope matrix defined. Quality gate implemented. Disable flag works.
```

### U-LOGIC4: Pipeline Feedback Loops
```
/smart: OPUS/HIGH
FIX: Define explicit feedback arcs with retry limits:

  Stage 10 (Collision) FAIL → retry Stage 7 (max 3 alternative strategies)
    → if all fail → HALT with collision report
  Stage 9 (Deflection) FAIL → retry Stage 6 (stiffer tool) OR Stage 8 (reduce ap)
    → if both fail → flag for user with options
  Stage 9 (Power) FAIL → auto-reduce DOC at Stage 8 (no user intervention)
  Stage 9 (Chatter) FAIL → auto-shift RPM (StabilityRPMRewriter)
    → if no stable pocket → reduce ae, retry
  Stage 5 (Workholding RPM limit) → feed forward to Stage 8 as constraint

  MAX RETRIES PER FEEDBACK LOOP: 3
  TIMEOUT: 30 seconds per retry attempt
  FALLBACK: "best found so far" if timeout reached

EXIT: Feedback arcs defined. Each has max retry + timeout. Vitest for each.
```

### U-LOGIC5: ProcessSequenceEngine for Multi-Process Parts
```
/smart: OPUS/MAX | Role: process planning expert
BUILD: src/engines/ProcessSequenceEngine.ts (~600L)

  INPUT: all features with process assignments
  OUTPUT: ordered process sequence + datum chain + stock handoff + tolerance allocation

  LOGIC:
    1. Assign each feature to a process (mill/turn/grind/EDM/laser/waterjet)
    2. Determine sequence using manufacturing rules:
       - Datum surfaces first (turn OD for mill datum)
       - Rough before finish (across ALL processes)
       - Soft processes before hardening
       - EDM after heat treatment (hardened material)
       - Grinding last (final dimensions)
    3. Datum chain across processes:
       Process1.output_datum → Process2.input_datum → tolerance_transfer_error
    4. Stock model handoff:
       Each process outputs resulting stock model → next process uses as input
    5. Tolerance allocation (RSS or worst-case):
       Final tolerance = sqrt(Σ process_tolerance²)
       Allocate budget: turning gets 60%, grinding gets 40% (for turn+grind)

  WIRE: Into QuoteToShipOrchestratorEngine Stage 0 (before Stage 1).

EXIT: Multi-process parts get sequenced + datum chain + tolerance allocation.
```

### U-LOGIC6: Tool-Strategy Joint Optimization
```
/smart: OPUS/HIGH
FIX: Current pipeline runs tool selection (Stage 6) BEFORE strategy (Stage 7).
  But optimal tool depends on strategy and vice versa.

  SOLUTION: Iterative convergence loop:
    1. Initial tool selection (broad — top 10 candidates)
    2. Strategy selection using initial tools → top 3 strategies
    3. Refined tool selection using top strategies → top 3 tools per strategy
    4. Joint scoring: score each (tool × strategy) pair
    5. Select best pair with full physics validation
    6. If best pair was NOT the initial Stage 6 choice → update

  MAX ITERATIONS: 2 (initial + refinement)
  This avoids the chicken-and-egg problem without full exhaustive search.

EXIT: Joint tool×strategy optimization produces better results than sequential.
```

### U-LOGIC7: Split DFM into Pre-Material and Post-Material
```
/smart: SONNET/HIGH
FIX: Stage 2 (DFM) currently runs before Stage 3 (Material).
  Some DFM rules are material-dependent.

  Stage 2A: Geometry-only DFM (before material):
    - Aspect ratios, accessibility, general wall thickness
    - Feature interference, draft angles
  Stage 3: Material resolution
  Stage 3B: Material-dependent DFM (after material):
    - Material-specific wall thickness (Al=1mm, Ti=2mm, hardened=3mm)
    - Thread feasibility per material
    - Heat treatment constraints on machining sequence

EXIT: DFM split into 2A and 3B. Material-dependent rules get correct data.
```

### U-LOGIC8: Machine-Dependent Feature Rezoning
```
/smart: OPUS/HIGH
FIX: FeatureToZoneEngine runs at Stage 1 (before machine selection).
  But zones depend on machine axes (3-axis zones ≠ 5-axis zones).

  Stage 1: Produce MACHINE-INDEPENDENT zones
  Stage 4: Select machine
  Stage 4.5 (NEW): Re-zone features for selected machine
    - 5-axis machine: combine features accessible from multiple angles into single setup
    - 3-axis machine: split features into per-setup groups
    - Mill-turn: separate turning vs milling zones

EXIT: Zones reflect actual machine capability, not theoretical.
```

### U-LOGIC9: Safety Certification Object (not just pass/fail)
```
/smart: SONNET/HIGH
FIX: Stage 10 output must include positive safety statement:

  SafetyCertification: {
    collision_check: { result: "CLEAR", swept_volume_checks: 2341, margin_mm: 3.2 },
    power_utilization: { max_pct: 72, at_block: 847, margin_pct: 28 },
    deflection: { max_um: 8.3, tolerance_um: 25, margin_pct: 67 },
    chatter: { p_chatter: 0.03, stable_rpm: 4200, margin_to_unstable: 380_rpm },
    workholding: { safety_factor: 2.8, min_required: 1.5, margin: 87% },
    breakage: { p_breakage: 0.01, threshold: 0.05, margin: 80% },
    certified: true,
    certified_by: "PipelineSafetyOrchestratorEngine v1.0",
    timestamp: "2026-03-24T..."
  }

EXIT: Every program output includes quantitative safety certification.
```

### U-LOGIC10: Bayesian Feedback Data Pipeline
```
/smart: OPUS/HIGH
FIX: Define how actual shop floor measurements reach the Bayesian update.

  DATA FLOW:
    Machine (MTConnect/OPC-UA) → actual_force, actual_power, actual_vibration
    Operator (manual entry) → actual_Ra, actual_dims, actual_tool_life
    Quality (CMM/probe) → actual_measurements vs nominal

  PIPELINE:
    1. Raw data → KalmanFilter (noise reduction, state estimation)
    2. Filtered data → PredictionCalibrationEngine (compare predicted vs actual)
    3. Deltas → BayesianWearModel / ExtendedTaylorModel (update constants)
    4. Updated constants → PredictionFeedbackOrchestratorEngine (distribute)
    5. Next job → uses calibrated constants (tighter CI95)

  PERSISTENCE: ~/.prism/calibration/{machine_id}/{material_iso}.json
  FLEET: Share calibration across same machine model via FleetLearningEngine

EXIT: Data pipeline defined. Calibration persists. Next job is more accurate.
```

---

## UPDATED TOTALS

| Source | Units |
|---|---|
| v17 base roadmap | ~950 |
| v18 amendments | 14 |
| v19 amendments | 20 |
| v20 enforcement agent | 4 |
| v21 math gaps (U-MATH1 through U-MATH7) | 7 |
| v21 logic gaps (U-LOGIC1 through U-LOGIC10) | 10 |
| **Foundation subtotal** | **~1,005** |
| Per-machine roadmaps (8 × ~80 avg) | ~640 |
| **GRAND TOTAL** | **~1,645** |

---

## NEXT: Generate 8 Per-Machine Comprehensive Roadmaps
Each following the LATHE-COMPREHENSIVE-ROADMAP pattern:
  1. Current state (what engines exist)
  2. Critical architectural issues
  3. 10-12 milestones with units
  4. Machine-specific physics (NAMED models)
  5. Test matrix (parts × machines × controllers)
  6. Execution order
